# The Social Skill Developer  
### AI-Powered Interview Simulator

An adaptive AI system that simulates real interview environments by analyzing **what you say** and **how you say it**, providing objective feedback on both **knowledge** and **confidence**.

---

##  Problem Statement
Job interviews often induce anxiety, lack structured feedback, and fail to objectively measure confidence and communication skills alongside technical knowledge.

---

##  Solution
The Social Skill Developer acts as a **real-time AI interview coach**.  
It dynamically generates interview questions from a user's **resume only**, evaluates responses, analyzes behavioral cues, and predicts the user's **chance of cracking an interview**.

---

##  Core Inputs
- **Resume (Primary Input)**  
  Used to extract skills and generate personalized interview questions  
- *(Job description input intentionally removed for a streamlined and focused system)*

---

##  Two Pillars of Analysis

### 1️ Interview Intelligence
- Technical correctness
- Depth of understanding
- Skill-wise performance tracking

### 2️ Confidence Analysis
- Voice-based nervousness detection
- Face and body language analysis (privacy-first)

---

##  Adaptive Questioning Engine (The “Brain”)

###  Skill-Based Flow
- The AI evaluates **one skill at a time**
- Each new skill starts at **Difficulty Level 2**

###  The “3-to-5 Rule”
- The AI continues asking questions on a skill until:
  -  **3 correct answers** are achieved  
  **OR**
  -  **5 attempts** are exhausted (forced move to next skill)

---

###  Adaptive Difficulty System
| Difficulty | Level | Points |
|----------|------|--------|
| Easy | 1 | 30 |
| Medium | 2 | 32 |
| Hard | 3 | 34 |

- Correct answer → **Level Up**
- Wrong answer → **Level Down**

---

###  Scoring Logic
- Each skill is normalized to a score out of **100**
- **Final Knowledge Score** = Average of all individual skill scores

---

##  Voice Intelligence — The “Bucket” Method

###  Why Buckets?
Frame-by-frame audio analysis causes unstable and flickering predictions.  
Instead, audio is processed in **1.4-second buckets** for stability.

###  4-Step Acoustic Pipeline
1. **Collector** – Buffers 30 audio frames  
2. **Gatekeeper** – Filters silence & background noise  
3. **Translator** – Extracts acoustic features:
   - Pitch
   - Jitter (vocal tremors → nervousness)
   - Speech speed  
4. **Judge** – Custom **Random Forest ML model**  
   - Outputs confidence levels (e.g., *85% Confident*)

---

##  Visual Intelligence — Physics & Privacy

###  Privacy-First Design
- **No video recordings**
- Only skeletal geometry is processed

###  Tracking
- Uses **MediaPipe**
- Tracks **33 body landmarks** at 30 FPS

###  Physics-Based Metrics
- **Jerk** → Sudden hand tremors  
- **Variance** → Body sway & fidgeting  
- **Head Yaw** → Eye contact stability  

###  Model
- Custom **XGBoost ML model**
- Trained on **100+ interview clips**
- Predicts psychological traits and provides live coaching signals

---

##  System Architecture

###  End-to-End Workflow
1. User speaks an answer  
2. Speech-to-Text (STT)  
3. Brain evaluates response & selects next difficulty  
4. Question sent via **Webhook** to an **n8n agent**  
5. AI generates realistic spoken question  
6. Frontend plays AI voice output  

---

##  Final Verdict

###  Outcome Formula
A holistic percentage combining:
- Knowledge score
- Voice confidence
- Body language stability

 **Final Output:**  
A single readiness score predicting the user's **chance of cracking the interview**

---

##  Tech Stack (High-Level)
- Python (ML & Signal Processing)
- Random Forest & XGBoost
- MediaPipe (Computer Vision)
- n8n (Agent orchestration)
- Speech-to-Text & Text-to-Speech
- Webhooks & API-based architecture

---

## Project Goal
To replicate a **real interview experience**, provide **objective feedback**, and help users improve both **skills** and **confidence**—not just answers.
