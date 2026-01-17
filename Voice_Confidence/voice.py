import pyaudio
import numpy as np
import joblib
import librosa
import speech_recognition as sr
import time

# --- CONFIGURATION ---
SAMPLE_RATE = 22050
CHUNK_DURATION = 0.5    
CONFIDENCE_WINDOW = 5   
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION) 

# 🔥 UPDATED: Wait for 3 seconds of silence
SILENCE_THRESHOLD = 0.01
SILENCE_DURATION_TO_STOP = 3.0 

class VoiceAnalyzer:
    def __init__(self):
        print("🎧 Initializing Voice & Confidence Model...")
        self.recognizer = sr.Recognizer()
        try:
            self.model = joblib.load("Voice_Confidence\confidence_rf_model.pkl")
            self.has_model = True
            print("✅ Confidence Model Loaded.")
        except:
            self.has_model = False
            print("⚠️ Model not found. Running in Text-Only mode.")

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
        p = pyaudio.PyAudio()
        stream = p.open(format=pyaudio.paFloat32,
                        channels=1,
                        rate=SAMPLE_RATE,
                        input=True,
                        frames_per_buffer=CHUNK_SIZE)

        rolling_buffer = np.zeros(SAMPLE_RATE * CONFIDENCE_WINDOW, dtype=np.float32)
        full_audio_frames = []
        confidence_scores = [] # To calculate average later

        print(f"\n🎤 LISTENING... (Speak now)")
        
        silence_start = None
        is_speaking = False

        try:
            while True:
                # 1. Read Audio
                data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
                new_audio = np.frombuffer(data, dtype=np.float32)
                full_audio_frames.append(data)
                
                # 2. Check Volume
                volume = np.mean(np.abs(new_audio))
                
                if volume < SILENCE_THRESHOLD:
                    # --- SILENCE LOGIC ---
                    if is_speaking:
                        # Only start counting silence if we have previously spoken
                        if silence_start is None:
                            silence_start = time.time()
                        
                        # Check if 3 seconds have passed
                        elapsed = time.time() - silence_start
                        remaining = SILENCE_DURATION_TO_STOP - elapsed
                        
                        if remaining <= 0:
                            print("\n🛑 Silence limit reached. Processing...")
                            break
                        
                        # 🔥 CRITICAL: Do NOT update the bar during silence.
                        # Just print a static message so the bar doesn't "jitter"
                        print(f"\r⏳ Waiting for silence... ({remaining:.1f}s)   ", end="")
                    else:
                        print(f"\rWaiting for speech...", end="")
                    
                    continue # Skip the confidence update below

                else:
                    # --- SPEAKING LOGIC ---
                    is_speaking = True
                    silence_start = None # Reset timer
                    
                    # Update Rolling Buffer
                    rolling_buffer = np.roll(rolling_buffer, -len(new_audio))
                    rolling_buffer[-len(new_audio):] = new_audio

                    # 3. CONFIDENCE VISUALIZATION (Only runs when speaking)
                    if self.has_model:
                        # Extract features strictly from your local `features.py` (ensure it's present)
                        from features import extract_features 
                        feats = extract_features(audio_array=rolling_buffer, sample_rate=SAMPLE_RATE)
                        
                        if not np.isnan(feats).any():
                            raw_score = self.model.predict_proba([feats])[0][1] * 100
                            penalty = self.get_linguistic_penalty(rolling_buffer)
                            final_score = raw_score * penalty
                            
                            confidence_scores.append(final_score)

                            # Visualization
                            label = "CONFIDENT" if final_score > 50 else "NERVOUS  "
                            color = "\033[92m" if final_score > 50 else "\033[91m"
                            bar_length = int(final_score / 5)
                            bar = "█" * bar_length
                            space = " " * (20 - bar_length)
                            
                            print(f"\r{color}Score: {final_score:.1f}% | {bar}{space} | {label}\033[0m", end="")

        except KeyboardInterrupt:
            print("\nStopped.")
        
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()

        # --- FINAL SUMMARY ---
        if confidence_scores:
            avg_conf = sum(confidence_scores) / len(confidence_scores)
            print(f"\n📊 Average Confidence for this answer: {avg_conf:.1f}%")

        # --- CONVERT TO TEXT ---
        print("📝 Converting speech to text...")
        raw_data = b''.join(full_audio_frames)
        audio_np = np.frombuffer(raw_data, dtype=np.float32)
        audio_int16 = (audio_np * 32767).astype(np.int16)
        audio_data = sr.AudioData(audio_int16.tobytes(), SAMPLE_RATE, 2)

        try:
            text = self.recognizer.recognize_google(audio_data)
            print(f"🗣️  YOU SAID: \"{text}\"")
            return text
        except sr.UnknownValueError:
            print("❌ Could not understand audio.")
            return ""
        except sr.RequestError:
            print("❌ Internet error for STT.")
            return ""