import pyaudio
import numpy as np
import joblib
import librosa
import speech_recognition as sr
import time
import os

# --- CONFIGURATION ---
SAMPLE_RATE = 22050
CHUNK_DURATION = 0.5    
CONFIDENCE_WINDOW = 3   
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION) 
SILENCE_THRESHOLD = 0.01
SILENCE_DURATION_TO_STOP = 3.0 

class VoiceAnalyzer:
    def __init__(self):
        print("🎧 Initializing Voice & Confidence Model...")
        self.recognizer = sr.Recognizer()
        
        # --- 🔍 SMART PATH FINDER ---
        # 1. Get current folder (e.g., .../brainwave/brain)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # 2. Get parent folder (e.g., .../brainwave)
        parent_dir = os.path.dirname(current_dir)
        
        # Define the two possible places the model could be
        path_option_1 = os.path.join(current_dir, "Voice_Confidence", "confidence_rf_model.pkl")
        path_option_2 = os.path.join(parent_dir, "Voice_Confidence", "confidence_rf_model.pkl")

        # Check which one actually exists
        if os.path.exists(path_option_1):
            valid_path = path_option_1
        elif os.path.exists(path_option_2):
            valid_path = path_option_2
        else:
            valid_path = None

        if valid_path:
            print(f"🔍 Found model at: {valid_path}")
            try:
                self.model = joblib.load(valid_path)
                self.has_model = True
                print("✅ Confidence Model Loaded Successfully.")
            except Exception as e:
                self.has_model = False
                print(f"⚠️ Model found but failed to load: {e}")
        else:
            self.has_model = False
            print("⚠️ Model NOT found in 'brain/' or 'brainwave/' folders.")
            print(f"   Checked: {path_option_1}")
            print(f"   Checked: {path_option_2}")
            print("   Running in Text-Only mode.")

    # ... (Rest of the file remains exactly the same) ...
    def get_linguistic_penalty(self, audio_chunk):
        try:
            flatness = librosa.feature.spectral_flatness(y=audio_chunk)
            avg_flatness = np.mean(flatness)
            if avg_flatness < 0.01:
                return 0.5
        except:
            pass
        return 1.0

    def listen(self):
        # (Your existing listen code goes here...)
        # If you need me to paste the full listen() function again, let me know!
        pass