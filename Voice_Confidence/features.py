import numpy as np
import librosa
import parselmouth
from parselmouth.praat import call

def extract_features(audio_path=None, audio_array=None, sample_rate=22050):
    """
    Extracts 8 specific confidence markers.
    Accepts either a file path OR a raw numpy array (for live mode).
    """
    try:
        # 1. LOAD AUDIO for Librosa (Energy, Pauses)
        if audio_path:
            y, sr = librosa.load(audio_path, sr=sample_rate)
            # Create Parselmouth Sound object from file
            sound = parselmouth.Sound(audio_path)
        else:
            y = audio_array
            sr = sample_rate
            # Create Parselmouth Sound object from array
            sound = parselmouth.Sound(y, sampling_frequency=sr)

        # --- A. PITCH & JITTER (The "Shaky Voice" detectors) ---
        pitch = sound.to_pitch()
        f0_values = pitch.selected_array['frequency']
        f0_values = f0_values[f0_values != 0] # Remove unvoiced parts (silence)

        if len(f0_values) > 0:
            pitch_mean = np.mean(f0_values)
            pitch_var = np.var(f0_values)
        else:
            pitch_mean = 0
            pitch_var = 0

        # Jitter (Micro-fluctuations in pitch)
        pointProcess = call(sound, "To PointProcess (periodic, cc)", 75, 500)
        jitter = call(pointProcess, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)

        # --- B. ENERGY & SHIMMER (The "Volume Stability" detectors) ---
        rms = librosa.feature.rms(y=y)[0]
        energy_mean = np.mean(rms)
        energy_var = np.var(rms)

        # Shimmer (Micro-fluctuations in loudness)
        shimmer = call([sound, pointProcess], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)

        # --- C. HNR (Harmonics-to-Noise Ratio) ---
        # Low HNR = Breathy/Hoarse voice (often correlates with nervousness)
        harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        hnr = call(harmonicity, "Get mean", 0, 0)

        # --- D. SPEAKING RATE & PAUSES ---
        # We detect non-silent segments
        non_silent_intervals = librosa.effects.split(y, top_db=20)
        duration_of_speech = np.sum([end - start for start, end in non_silent_intervals]) / sr
        
        # Pause Frequency (Number of silences > 200ms)
        pause_count = len(non_silent_intervals) - 1
        
        # Speaking Rate (Approximate syllables / second)
        # This is a heuristic: counting "peaks" in energy envelope
        peaks = librosa.util.peak_pick(rms, pre_max=5, post_max=5, pre_avg=5, post_avg=5, delta=0.1, wait=10)
        speaking_rate = len(peaks) / (len(y) / sr) if len(y) > 0 else 0

        # Return vector of 8 features
        # [PitchMean, PitchVar, EnergyMean, EnergyVar, Jitter, Shimmer, HNR, SpeakingRate]
        return [pitch_mean, pitch_var, energy_mean, energy_var, jitter, shimmer, hnr, speaking_rate]

    except Exception as e:
        print(f"Feature Extraction Error: {e}")
        return [0]*8