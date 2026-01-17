import cv2
import mediapipe as mp
import numpy as np
import base64
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from collections import deque

app = FastAPI()

# --- SETUP MEDIAPIPE ---
mp_holistic = mp.solutions.holistic
holistic = mp_holistic.Holistic(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# --- HELPER CLASS ---
class BodyLanguageProcessor:
    def process(self, frame):
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = holistic.process(image)
        
        if results.pose_landmarks and results.face_landmarks:
            left_wrist = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.LEFT_WRIST]
            right_wrist = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.RIGHT_WRIST]
            wrist_x = (left_wrist.x + right_wrist.x) / 2
            wrist_y = (left_wrist.y + right_wrist.y) / 2
            
            nose = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.NOSE]
            stab_x, stab_y = nose.x, nose.y
            
            left_ear = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.LEFT_EAR]
            right_ear = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.RIGHT_EAR]
            ear_mid_x = (left_ear.x + right_ear.x) / 2
            ear_mid_y = (left_ear.y + right_ear.y) / 2
            offset_x = abs(nose.x - ear_mid_x)
            offset_y = abs(nose.y - ear_mid_y)
            dist_from_center = (offset_x**2 + offset_y**2)**0.5
            
            attn_score = max(0, 1.0 - (dist_from_center * 5.0))
            
            return {
                "wrist": [wrist_x, wrist_y],
                "stability": [stab_x, stab_y],
                "attention": attn_score
            }
        return None

processor = BodyLanguageProcessor()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🟢 Client Connected!")

    # Live Rolling Buffers (For real-time bars)
    BUFFER_SIZE = 30 
    wrist_buffer = deque(maxlen=BUFFER_SIZE)
    stab_buffer = deque(maxlen=BUFFER_SIZE)
    attn_buffer = deque(maxlen=BUFFER_SIZE)

    # --- SESSION ACCUMULATORS (For Database Storage) ---
    session_attention = []
    session_stability = []
    session_smoothness = []

    try:
        while True:
            data = await websocket.receive_text()

            # --- 1. CHECK FOR STOP COMMAND ---
            if data == "STOP":
                print("🛑 End of Interview Detected. Generating Report...")
                
                final_response = {"type": "final_report"}
                
                if len(session_attention) > 0:
                    avg_attn = np.mean(session_attention)
                    avg_stab = np.mean(session_stability)
                    avg_smooth = np.mean(session_smoothness)
                    
                    # FINAL FORMULA
                    final_conf = (0.4 * avg_attn) + (0.4 * avg_stab) + (0.2 * avg_smooth)
                    
                    final_response = {
                        "type": "final_report",
                        "attention": int(avg_attn),
                        "stability": int(avg_stab),
                        "smoothness": int(avg_smooth),
                        "confidence": int(final_conf)
                    }
                
                await websocket.send_text(json.dumps(final_response))
                break # Exit the loop to close connection cleanly

            # --- 2. PROCESS FRAME ---
            try:
                if "base64," in data:
                    data = data.split("base64,")[1]
                image_data = base64.b64decode(data)
                np_arr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            except Exception:
                continue

            if frame is None: continue

            metrics = processor.process(frame)
            response = {"type": "realtime", "attention": 0, "stability": 0, "smoothness": 0, "confidence": 0}

            if metrics:
                wrist_buffer.append(metrics['wrist'])
                stab_buffer.append(metrics['stability'])
                attn_buffer.append(metrics['attention'])

                if len(wrist_buffer) > 5:
                    # Calc Realtime Stats
                    stab_arr = np.array(stab_buffer)
                    var_stab = np.std(stab_arr, axis=0).mean()
                    disp_stability = max(0, min(100, 100 - (var_stab * 1000)))

                    wrist_arr = np.array(wrist_buffer)
                    velocity = np.diff(wrist_arr, axis=0)
                    accel = np.diff(velocity, axis=0)
                    jerk = np.diff(accel, axis=0)
                    jerk_score = np.linalg.norm(jerk, axis=1).mean() if len(jerk) > 0 else 0
                    disp_smoothness = max(0, min(100, 100 - (jerk_score * 100)))

                    attn_mean = np.mean(attn_buffer)
                    disp_attention = min(100, attn_mean * 100)

                    confidence_score = (0.4 * disp_attention) + (0.4 * disp_stability) + (0.2 * disp_smoothness)

                    # --- ADD TO SESSION HISTORY ---
                    session_attention.append(disp_attention)
                    session_stability.append(disp_stability)
                    session_smoothness.append(disp_smoothness)

                    response = {
                        "type": "realtime",
                        "attention": int(disp_attention),
                        "stability": int(disp_stability),
                        "smoothness": int(disp_smoothness),
                        "confidence": int(confidence_score)
                    }

            await websocket.send_text(json.dumps(response))

    except WebSocketDisconnect:
        print("🔴 Client Disconnected")