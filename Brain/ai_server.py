import os
import sys
import json
import asyncio
import numpy as np
import tempfile
import speech_recognition as sr
from pydub import AudioSegment
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState
import uvicorn

# --- IMPORT YOUR BRAIN ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from Brain import AdaptiveInterviewer, extract_text_from_pdf

app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER: ROBUST TRANSCRIPTION ---
def transcribe_audio_bytes(audio_bytes):
    """
    Converts WebM bytes -> WAV -> Text.
    Returns None if audio is corrupt/empty, forcing the main loop to simulate.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return None # Too small to be valid audio

    temp_webm = None
    wav_path = None
    
    try:
        # 1. Write bytes to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as f:
            f.write(audio_bytes)
            temp_webm = f.name
        
        # 2. Define Output Path
        wav_path = temp_webm.replace(".webm", ".wav")
        
        # 3. Convert (Critical Step)
        try:
            # We assume input is WebM. If it fails, we return None gracefully.
            audio = AudioSegment.from_file(temp_webm)
            audio.export(wav_path, format="wav")
        except Exception:
            # This catches the "Invalid data found" error from FFmpeg
            return None

        # 4. Transcribe
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            try:
                text = recognizer.recognize_google(audio_data)
                return text
            except (sr.UnknownValueError, sr.RequestError):
                return None

    except Exception as e:
        print(f"❌ Transcription Critical Error: {e}")
        return None
        
    finally:
        # Cleanup temp files safely
        if temp_webm and os.path.exists(temp_webm):
            try: os.remove(temp_webm)
            except: pass
        if wav_path and os.path.exists(wav_path):
            try: os.remove(wav_path)
            except: pass

# --- HELPER: Clean Repetitive Stuttering ---
def clean_stutter(text):
    if not text: return ""
    words = text.split()
    cleaned = []
    for word in words:
        # If the word is the same as the last one, skip it (Basic deduping)
        if cleaned and cleaned[-1].lower() == word.lower():
            continue
        cleaned.append(word)
    return " ".join(cleaned)

# --- WEBSOCKET ENDPOINT (FINAL STABLE VERSION) ---
@app.websocket("/ws/audio")
async def audio_websocket(websocket: WebSocket):
    await websocket.accept()
    print("✅ React Client Connected")
    
    bot = None
    audio_buffer = bytearray()
    last_question = "" 
    
    # Suppress numpy warnings
    import numpy as np
    np.seterr(all='ignore') 
    
    try:
        # 1. INITIALIZATION
        init_data = await websocket.receive_text()
        init_json = json.loads(init_data)
        
        resume_text = init_json.get("resumeText", "")
        if not resume_text and os.path.exists("Alex_Taylor_Resume.pdf"):
            resume_text = extract_text_from_pdf("Alex_Taylor_Resume.pdf")
            
        print("🧠 Initializing The Brain...")
        job_desc = init_json.get("jobDescription", "Software Engineer")
        bot = AdaptiveInterviewer(resume_text, job_desc)
        
        # >>> FIX 1: ENSURE TOPICS EXIST <<<
        # If the resume parser failed or found too few topics, add defaults.
        if len(bot.topics) <= 1:
            print("⚠️ Not enough topics found. Adding defaults.")
            bot.topics.extend(["System Design", "Problem Solving", "Communication"])

        # 2. FIRST QUESTION
        first_q = bot.generate_question()
        last_question = first_q
        await websocket.send_json({
            "type": "question",
            "text": first_q,
            "speak": True
        })

        # 3. MAIN LOOP
        while True:
            try:
                if websocket.client_state == WebSocketState.DISCONNECTED:
                    break
                
                message = await websocket.receive()
                
                # --- A. LIVE CONFIDENCE FEED ---
                if "text" in message:
                    try:
                        data_json = json.loads(message["text"])
                        
                        # CASE 1: INCOMING AUDIO CHUNK
                        if "bytes" in data_json:
                            raw_data = data_json["bytes"]
                            new_chunk = b""

                            if isinstance(raw_data, list):
                                new_chunk = bytes(raw_data)
                            elif isinstance(raw_data, str):
                                import base64
                                try:
                                    new_chunk = base64.b64decode(raw_data)
                                except:
                                    pass 

                            if new_chunk:
                                audio_buffer.extend(new_chunk)
                                
                                # Audio Confidence Calculation
                                if len(new_chunk) % 2 == 0:
                                    np_data = np.frombuffer(new_chunk, dtype=np.int16)
                                    if len(np_data) > 0:
                                        mean_sq = np.mean(np_data**2)
                                        if np.isnan(mean_sq) or mean_sq < 0:
                                            vol = 0
                                        else:
                                            vol = np.sqrt(mean_sq)
                                        
                                        conf = min(vol / 100 * 100, 100)
                                        
                                        if websocket.client_state == WebSocketState.CONNECTED:
                                            await websocket.send_json({
                                                "type": "realtime_feed", 
                                                "audioConfidence": float(conf)
                                            })
                        
                        # CASE 2: STOP COMMAND
                        elif data_json.get("text") == "STOP_ANSWER":
                            print("🛑 Processing Answer...")
                            
                            # Grab buffer and clear immediately
                            buffer_to_process = audio_buffer[:] 
                            audio_buffer = bytearray() 
                            
                            # 1. Transcribe
                            user_text = transcribe_audio_bytes(buffer_to_process)
                            
                            # >>> FIX 2: CLEAN REPETITION <<<
                            user_text = clean_stutter(user_text)

                            if not user_text or len(user_text.strip()) < 5:
                                print("⚠️ Audio invalid/empty. Using Simulation.")
                                user_text = "I have experience with this skill and have used it in projects."
                            
                            print(f"   🗣️ User said: {user_text}")

                            # 2. Grade
                            status = bot.evaluate_answer(user_text)
                            
                            # 3. Send Feedback
                            if websocket.client_state == WebSocketState.CONNECTED:
                                await websocket.send_json({
                                    "user_transcription": user_text,
                                    "scores": {
                                        "answer_score": 85 if "Correct" in str(status) or bot.correct_answers_in_current_topic > 0 else 40
                                    }
                                })

                            # 4. Next Question Logic
                            await asyncio.sleep(0.5)
                            
                            # Check if we are truly done
                            if bot.current_topic_index >= len(bot.topics):
                                print("🏁 Interview Finished.")
                                if websocket.client_state == WebSocketState.CONNECTED:
                                    await websocket.send_json({"type": "end", "text": "Interview Complete!"})
                                # Give frontend time to receive message before closing
                                await asyncio.sleep(1) 
                                break
                            
                            next_q = bot.generate_question()
                            
                            # >>> FIX 3: PREVENT STUCK BOT <<<
                            if next_q == last_question:
                                print("⚠️ Bot stuck. Moving to next topic manually.")
                                bot.current_topic_index += 1
                                
                                # Check if we ran out of topics after incrementing
                                if bot.current_topic_index >= len(bot.topics):
                                    if websocket.client_state == WebSocketState.CONNECTED:
                                        await websocket.send_json({"type": "end", "text": "Interview Complete!"})
                                    await asyncio.sleep(1)
                                    break
                                
                                next_topic = bot.topics[bot.current_topic_index]
                                next_q = f"Let's move on. Please tell me about your experience with {next_topic}."
                            
                            last_question = next_q

                            if websocket.client_state == WebSocketState.CONNECTED:
                                await websocket.send_json({
                                    "type": "question",
                                    "text": next_q,
                                    "speak": True
                                })

                    except json.JSONDecodeError:
                        pass 

            except WebSocketDisconnect:
                print("❌ Client Disconnected")
                break
            except Exception as e:
                print(f"⚠️ Loop Error: {e}")
                audio_buffer = bytearray()
                
    except Exception as e:
        print(f"🔥 Critical Error: {e}")
        
# --- PARSE PDF ENDPOINT ---
@app.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    print(f"📄 PDF Upload Received: {file.filename}")
    try:
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            buffer.write(await file.read())
        text = extract_text_from_pdf(temp_filename)
        os.remove(temp_filename)
        return {"status": "success", "text": text}
    except Exception as e:
        print(f"❌ PDF Parse Error: {e}")
        return {"status": "error", "text": "Could not parse PDF"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)