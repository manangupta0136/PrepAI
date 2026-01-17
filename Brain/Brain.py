import os
import sys
import json
import time
import PyPDF2
import requests  # ✅ For Webhook
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai import errors

# --- 🔧 FIX IMPORT PATH ---
# 1. Get the current folder where this script is
current_dir = os.path.dirname(os.path.abspath(__file__))
# 2. Get the parent folder (one level up)
parent_dir = os.path.dirname(current_dir)
# 3. Define path to the 'Voice_Confidence' folder
voice_folder_path = os.path.join(parent_dir, "Voice_Confidence")

# 4. Add that FOLDER to the system path so Python can find voice.py
sys.path.append(voice_folder_path)

# 🔥 NOW IMPORT THE VOICE FILE
import voice

# Load environment variables
load_dotenv()

# --- 1. CONFIGURATION ---
key_1 = os.getenv("GEMINI_KEY_TOPICS")
key_2 = os.getenv("GEMINI_KEY_ASKER")
key_3 = os.getenv("GEMINI_KEY_GRADER")

# ✅ Webhook Configuration
WEBHOOK_URL = "https://vgamai.app.n8n.cloud/webhook-test/b1bd00ca-d5a8-4cb9-af5c-e9e11fee4410" 

if not key_1 or not key_2 or not key_3:
    print("❌ ERROR: Please ensure you have 3 keys in your .env file")
    exit()

# Initialize Clients
client_topics = genai.Client(api_key=key_1)
client_asker  = genai.Client(api_key=key_2)
client_grader = genai.Client(api_key=key_3)

TARGET_JOB_DESCRIPTION = """
File clerk
"""

# --- 2. SCHEMAS ---
class AnswerGrade(BaseModel):
    is_correct: bool = Field(description="True if correct")
    feedback: str = Field(description="Reason")

class TopicGenerator(BaseModel):
    topics: list[str] = Field(description="List of 1 technical topic.")

# --- 3. THE BRAIN CLASS ---
class AdaptiveInterviewer:
    def __init__(self, resume_text, job_description):
        self.job_description = job_description
        
        # 🔥 Initialize Voice System
        # Assuming your voice.py has a class named VoiceAnalyzer based on your snippet
        # If it is named VoiceSystem, change this to voice.VoiceSystem()
        try:
            print(f"\n 🎤 Initializing Voice System...")
            self.voice_bot = voice.VoiceSystem() 
        except AttributeError:
            # Fallback if the class is named differently
            self.voice_bot = voice.VoiceAnalyzer()
        
        # Scoring Storage
        self.skill_scores = [] 
        self.current_skill_score = 0 
        
        print(f"\n  Reading Resume...")
        self.topics = self._get_topics_from_resume(resume_text)
        print(f"✅ Topic Locked: {self.topics}")
        
        self.current_topic_index = 0
        self.difficulty_level = 2 
        self.current_question_text = ""
        self.questions_asked_in_current_topic = 0
        self.correct_answers_in_current_topic = 0

    def _safe_api_call(self, client_instance, model, contents, config=None):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if config:
                    return client_instance.models.generate_content(model=model, contents=contents, config=config)
                return client_instance.models.generate_content(model=model, contents=contents)
            except Exception as e:
                if "429" in str(e) or "503" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    time.sleep(2)
                else:
                    return None
        return None

    def _get_topics_from_resume(self, text):
        prompt = f"""
        You are a Technical Recruiter.
        RESUME: {text[:2000]}...
        TARGET JOB: {self.job_description}
        TASK: Identify the TOP 1 single most important technical skill.
        """
        response = self._safe_api_call(
            client_instance=client_topics, 
            model="gemini-flash-latest",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TopicGenerator
            )
        )
        if response and response.text:
            try:
                return json.loads(response.text)['topics'][:1]
            except:
                pass
        return ["General Skills"]

    def generate_question(self):
        topic = self.topics[self.current_topic_index]
        prompt = f"""
        You are a technical interviewer.
        CONTEXT:
        - Job Role: {self.job_description}
        - Topic: {topic}
        - Difficulty: {self.difficulty_level}/3 (1=Easy, 3=Hard)
        - Question Count: {self.questions_asked_in_current_topic + 1}
        TASK:
        Ask ONE direct interview question about {topic}.
        - STRICTLY 1 or 2 sentences max.
        """
        response = self._safe_api_call(
            client_instance=client_asker,
            model="gemini-flash-latest", 
            contents=prompt
        )
        if response and response.text:
            self.current_question_text = response.text.strip()
        else:
            self.current_question_text = f"Tell me about {topic}."
            
        # 🔥 SEND TO WEBHOOK (Brain Speaks)
        try:
            webhook_payload = {"text": self.current_question_text}
            requests.post(WEBHOOK_URL, json=webhook_payload)
        except Exception as e:
            print(f"⚠️ Webhook Error: {e}")

        return self.current_question_text

    def evaluate_answer(self, user_answer):
        prompt = f"""
        Question: "{self.current_question_text}"
        User Answer: "{user_answer}"
        Task: Check if factually correct.
        """
        response = self._safe_api_call(
            client_instance=client_grader,
            model="gemini-flash-latest",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AnswerGrade
            )
        )
        
        is_correct = True
        if response and response.text:
            try:
                is_correct = json.loads(response.text)['is_correct']
            except:
                pass

        self.questions_asked_in_current_topic += 1
        
        if is_correct:
            points = 30 + (self.difficulty_level * 2)
            self.current_skill_score += points
            self.correct_answers_in_current_topic += 1 
            print(f"   ✅ Correct! (+{points} pts)")
            self.difficulty_level = min(3, self.difficulty_level + 1)
        else:
            print(f"   ❌ Wrong. (+0 pts)")
            self.difficulty_level = max(1, self.difficulty_level - 1)

        if self.correct_answers_in_current_topic >= 3 or self.questions_asked_in_current_topic >= 5:
            self._move_next_topic()
            return "SWITCHED_TOPIC"
            
        return "CONTINUE"

    def _move_next_topic(self):
        print(f"   📝 Section Score Locked: {self.current_skill_score}")
        self.skill_scores.append(self.current_skill_score)
        self.current_topic_index += 1
        self.current_skill_score = 0
        self.questions_asked_in_current_topic = 0
        self.correct_answers_in_current_topic = 0
        self.difficulty_level = 2 

    # 🔥 Method for Voice Input
    def get_human_input(self):
        # Calls the listen method from your voice.py
        return self.voice_bot.listen()

# --- 4. MAIN EXECUTION ---
def extract_text_from_pdf(pdf_path):
    try:
        text = ""
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages: text += page.extract_text() + "\n"
        return text
    except: return "Experience with Python."

if __name__ == "__main__":
    resume_path = "brain/Alex_Taylor_Resume.pdf"
    content = extract_text_from_pdf(resume_path) if os.path.exists(resume_path) else "Python Skills"

    bot = AdaptiveInterviewer(content, TARGET_JOB_DESCRIPTION)
    
    print("\n" + "="*40 + "\n🤖 INTERVIEW STARTED\n" + "="*40)
    
    while bot.current_topic_index < len(bot.topics):
        print(f"\n[Diff: {bot.difficulty_level}] Question:")
        q = bot.generate_question()
        print(f"🤖 {q}") 
        
        # 🔥 CALL VOICE LISTENER HERE
        ans = bot.get_human_input()
        
        if not ans:
            print("   (No answer detected, retrying...)")
            continue

        status = bot.evaluate_answer(ans)
        
        if status == "SWITCHED_TOPIC" and bot.current_topic_index >= len(bot.topics):
            break

    print("\n📊 INTERVIEW COMPLETE")
    if bot.skill_scores:
        avg = sum(bot.skill_scores) / len(bot.skill_scores)
        print(f"Final Score: {avg:.2f}")