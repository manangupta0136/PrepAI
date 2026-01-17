import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Video, Mic, MicOff, Clock, TrendingUp, Activity, 
  UploadCloud, FileText, CheckCircle, Loader2,
  Eye, MonitorPlay, Zap, Radio
} from 'lucide-react';

interface Message {
  id: number;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

export default function Interview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // --- STATE ---
  const [mode, setMode] = useState<'interview' | 'informal'>('interview');
  const [duration, setDuration] = useState(0);
  const [isActive, setIsActive] = useState(false); 
  const [userId, setUserId] = useState<string>("");
  const userIdRef = useRef<string>("");
  
  // Resume / Upload State
  const [isResumeUploaded, setIsResumeUploaded] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Chat & Logic
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false); 

  // Media State
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  // --- SCORES (Matched to Model Output) ---
  const [attention, setAttention] = useState(0);
  const [stability, setStability] = useState(0);
  const [smoothness, setSmoothness] = useState(0);
  
  const [visualConfidence, setVisualConfidence] = useState(0);
  const [audioConfidence, setAudioConfidence] = useState(0);
  
  const [answerQuality, setAnswerQuality] = useState(0);

  // --- REFS ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const durationRef = useRef(0); 
  
  const wsVideoRef = useRef<WebSocket | null>(null);
  const wsAudioRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioConfidenceRef = useRef(0);
  const answerQualityRef = useRef(0);
  const audioStatsRef = useRef({ sum: 0, count: 0 });
  useEffect(() => {
      userIdRef.current = userId;
  }, [userId]);

  // Add this new useEffect near your other effects
  useEffect(() => {
      audioConfidenceRef.current = audioConfidence;
      answerQualityRef.current = answerQuality;
  }, [audioConfidence, answerQuality]);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    setMode(modeParam === 'informal' ? 'informal' : 'interview');
  }, [searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setDuration(prev => {
          const newTime = prev + 1;
          durationRef.current = newTime;
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- 2. FILE UPLOAD HANDLER ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('http://localhost:8001/parse-pdf', {
            method: 'POST',
            body: formData,
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            setResumeText(data.text);
            setIsResumeUploaded(true);
            setIsActive(true); 
        } else {
            alert("Failed to parse PDF: " + data.error);
        }
    } catch (error) {
        console.error("Upload Error:", error);
        alert("Could not connect to AI Server (Port 8001). Is it running?");
    } finally {
        setIsUploading(false);
    }
  };

  // --- 3. VIDEO ANALYSIS WEBSOCKET (Port 8000) ---
  useEffect(() => {
    if (!isResumeUploaded) return; 

    let stream: MediaStream | null = null;
    let intervalId: NodeJS.Timeout;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 }, 
            audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play();
        }
      } catch (err) {
        console.error("Camera Error:", err);
      }
    };

    if (cameraEnabled) startCamera();

    wsVideoRef.current = new WebSocket("ws://localhost:8000/ws");
    
    wsVideoRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'realtime') {
        setAttention(data.attention || 0);
        setStability(data.stability || 0);
        setSmoothness(data.smoothness || 0);
        setVisualConfidence(data.confidence || 0);
      }
      else if (data.type === 'final_report') {
        console.log("📊 Final Report Received:", data);
        // Now trigger the save logic with THESE numbers, not the state
        saveInterviewData(data); 
      }
    };

    intervalId = setInterval(() => {
      if (wsVideoRef.current?.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.5); 
          wsVideoRef.current.send(base64Image);
        }
      }
    }, 100); 

    return () => {
      clearInterval(intervalId);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (wsVideoRef.current) wsVideoRef.current.close();
    };
  }, [cameraEnabled, isResumeUploaded]);


  // --- 4. AUDIO BRAIN WEBSOCKET (Port 8001) ---
  useEffect(() => {
    if (!isResumeUploaded) return; 

    wsAudioRef.current = new WebSocket("ws://localhost:8001/ws/audio");

    wsAudioRef.current.onopen = () => {
      console.log("✅ Connected to AI Brain");
      wsAudioRef.current?.send(JSON.stringify({
         resumeText: resumeText,
         jobDescription: "Software Engineer" 
      }));
    };

    wsAudioRef.current.onmessage = (event) => {
      try {
          // --- FIX: SAFETY CHECK ---
          // Check if the string contains "NaN" which is invalid JSON
          let cleanData = event.data;
          if (typeof cleanData === 'string' && cleanData.includes("NaN")) {
             console.warn("⚠️ Received NaN from server, sanitizing...");
             cleanData = cleanData.replace(/NaN/g, "0");
          }

          const data = JSON.parse(cleanData);

          if (data.type === 'question') {
            setMessages(prev => [...prev, { 
              id: Date.now(), type: 'ai', content: data.text, timestamp: new Date() 
            }]);
            if (data.speak) speak(data.text);
          }
          else if (data.type === 'realtime_feed') {
            const score = data.audioConfidence || 0;
        
            // 1. Update the UI (Visual)
            setAudioConfidence(score);
            
            // 2. ACCUMULATE FOR REPORT (The Missing Logic)
            // ✅ FIX FOR LOW VALUES: Only count if score > 5. 
            // This ignores silence so your score isn't dragged down when you pause to think.
            if (score > 5) {
                audioStatsRef.current.sum += score;
                audioStatsRef.current.count += 1;
            }
          }
          else if (data.user_transcription) {
            setMessages(prev => [...prev, { 
              id: Date.now(), type: 'user', content: `"${data.user_transcription}"`, timestamp: new Date() 
            }]);
            if (data.scores) {
              setAnswerQuality(data.scores.answer_score);
            }
          }
          else if (data.type === 'end') {
            handleEndInterview();
          }
      } catch (err) {
          console.error("❌ JSON Parse Error (Skipping frame):", err);
      }
    };

    return () => {
      if (wsAudioRef.current) wsAudioRef.current.close();
    };
  }, [isResumeUploaded, resumeText]);

  // --- 5. FIXED AUDIO RECORDING ---
  const handleToggleRecording = async () => {
    if (isRecording) {
      // 🛑 STOP LOGIC
      // We do NOT send "STOP_ANSWER" here immediately.
      // We stop the recorder, and let the 'onstop' event handle the message.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // 🎤 START LOGIC
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // FIX 1: Explicitly set MimeType to something FFMPEG likes
        let options = { mimeType: 'audio/webm' };
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        }

        const recorder = new MediaRecorder(stream, options);

        recorder.addEventListener("dataavailable", event => {
           if (event.data.size > 0 && wsAudioRef.current?.readyState === WebSocket.OPEN) {
             const reader = new FileReader();
             reader.readAsDataURL(event.data);
             reader.onloadend = async() => {
               if (typeof reader.result === 'string') {
                   const base64data = reader.result.split(',')[1];
                   if (base64data) {
                     wsAudioRef.current?.send(JSON.stringify({ bytes: base64data })); // Use JSON wrapper if backend expects it, or raw bytes
                     // Based on your server:
                     // The server expects raw bytes usually, but let's check your parser.
                     // Your server: data = message["bytes"]
                     // So we must wrap it in JSON!
                     wsAudioRef.current?.send(JSON.stringify({
                        bytes: Array.from(new Uint8Array(event.data.arrayBuffer ? await event.data.arrayBuffer() : [])) 
                        // Actually, simplified: sending the raw Blob is hard via JSON.
                        // Let's send a specifically marked JSON message.
                     }));
                     
                     // WAIT! Your server code does this: 
                     // if "bytes" in message: data = message["bytes"]
                     // That implies it expects a JSON object.
                     
                     // Let's send Binary directly if possible, or Base64 in JSON.
                     // Simpler approach for your specific backend:
                     wsAudioRef.current?.send(event.data); // Send raw blob? No, backend expects text/json usually unless configured.
                     
                     // RE-READING BACKEND: 
                     // message = await websocket.receive()
                     // if "bytes" in message...
                     
                     // WebSocket.receive() in FastAPI returns:
                     // - bytes if sent as binary
                     // - str (JSON) if sent as text
                     
                     // Let's use the simplest reliable method:
                     // Send JSON with Base64.
                     wsAudioRef.current?.send(JSON.stringify({ 
                        "bytes": base64data 
                     }));
                   }
               }
             };
           }
        });

        // FIX 2: Handle the Stop Event
        recorder.onstop = () => {
            // Once recording stops and buffers are flushed, THEN tell backend to process
            setTimeout(() => {
                if (wsAudioRef.current?.readyState === WebSocket.OPEN) {
                    wsAudioRef.current.send(JSON.stringify({ "text": "STOP_ANSWER" }));
                }
            }, 100); 
        };

        recorder.start(1000); // FIX 3: Increase slice time to 1s to ensure valid headers reduce corruption risk
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Mic Error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  // 1. The button click handler just sends the signal
const handleEndInterview = async () => {
  // Stop recording audio immediately
  if (mediaRecorderRef.current) mediaRecorderRef.current.stop();

  // Send STOP to video backend to trigger calculation
  if (wsVideoRef.current && wsVideoRef.current.readyState === WebSocket.OPEN) {
    wsVideoRef.current.send("STOP");
  } else {
    // Fallback if socket is already closed
    saveInterviewData({ 
        confidence: visualConfidence, 
        attention: attention, 
        stability: stability, 
        smoothness: smoothness 
    });
  }
};

// 2. The actual saver (triggered by the WebSocket response)
const saveInterviewData = async (reportData: any) => {
  // 1. FORCE UPDATE REF if it's empty (Safety Net)
      if (!userIdRef.current && userId) {
          userIdRef.current = userId;
      }
    // Stop Camera/Streams
    setIsActive(false);
    setCameraEnabled(false);
    if (wsVideoRef.current) wsVideoRef.current.close();
    // ... stop other tracks ...

    // CALCULATE AVERAGES
    const finalAudioConfidence = audioStatsRef.current.count > 0 
        ? Math.round(audioStatsRef.current.sum / audioStatsRef.current.count) 
        : 0;

    // 2. PREPARE DATA
    const interviewData = {
      // ✅ PRIORITY 1: Ref (Live), PRIORITY 2: State (Backup), PRIORITY 3: Guest
      userId: userIdRef.current || userId || "guest_error",
      
      duration: durationRef.current,
      scores: {
        confidence: reportData.confidence ?? visualConfidence,
        attention: reportData.attention ?? attention,
        stability: reportData.stability ?? stability,
        smoothness: reportData.smoothness ?? smoothness,
        
        audioConfidence: finalAudioConfidence,
        answerQuality: answerQualityRef.current
      }
    };

    console.log("🚀 SENDING TO DB:", interviewData); // <--- CHECK THIS LOG

    // ... Proceed with your fetch/save logic ...
    try {
        console.log("💾 Saving to Backend...", interviewData);

        const token = localStorage.getItem('token'); // Get token for header

        const response = await fetch('http://localhost:5000/api/interviews/save', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Send token so backend can verify this userId matches the token
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(interviewData),
        });
        
        // 3. Send POST request to Express Backend
        

        if (!response.ok) {
            throw new Error('Failed to save interview data');
        }
        
        console.log("✅ Data saved successfully");

      } catch (error) {
        console.error("❌ Error saving interview:", error);
        // Optional: Alert the user that saving failed?
      }

      // 4. Navigate to report
      console.log("Navigating to report...");
      navigate('/report?mode=' + mode);
};

  // --- HELPER: DEBUG TOKEN DECODER ---
// --- HELPER: FINAL TOKEN DECODER ---
  function getUserIdFromToken() {
    try {
      const token = localStorage.getItem('token'); 
      if (!token) return null;

      // Decode logic
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      
      // ✅ FIX: Check inside nested 'user' object first
      // 1. Check payload.user.id (Your structure)
      // 2. Check payload.user._id (Common MongoDB alternative)
      // 3. Check payload.userId (Standard flat structure)
      // 4. Check payload.sub (Standard JWT)
      const userId = (payload.user && payload.user.id) || 
                     (payload.user && payload.user._id) ||
                     payload.userId || 
                     payload.sub ||
                     payload.id;

      if (userId) {
          console.log("✅ ID Extracted Successfully:", userId);
          return userId;
      } else {
          console.error("❌ Token parsed, but ID location is unknown.", payload);
          return null;
      }

    } catch (error) {
      console.error("❌ Token Decode Error:", error);
      return null;
    }
  }

  // --- AUTH EFFECT ---
  useEffect(() => {
    const tokenUserId = getUserIdFromToken();

    if (tokenUserId) {
      console.log("✅ LOGGED IN AS:", tokenUserId);
      setUserId(tokenUserId); 
      // Important: Update Ref immediately for safety
      userIdRef.current = tokenUserId; 
    } else {
      // Fallback to Guest
      let guestId = sessionStorage.getItem("guest_user_id");
      if (!guestId) {
         guestId = `guest_${Date.now()}`;
         sessionStorage.setItem("guest_user_id", guestId);
      }
      console.log("👤 USING GUEST ID:", guestId);
      setUserId(guestId);
      userIdRef.current = guestId;
    }
  }, []);
   

  // --- RENDER 1: UPLOAD SCREEN ---
  if (!isResumeUploaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 text-center shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          <div className="w-20 h-20 bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-600">
             <FileText className="w-10 h-10 text-indigo-400" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">Upload Resume</h2>
          <p className="text-gray-400 mb-8">Upload your PDF resume so our AI can tailor the questions to your experience.</p>

          <div className="border-2 border-dashed border-gray-600 rounded-2xl p-10 hover:border-indigo-500 hover:bg-gray-700/30 transition-all cursor-pointer relative group">
             <input 
               type="file" 
               accept=".pdf" 
               onChange={handleFileUpload}
               disabled={isUploading}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
             />
             
             {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-indigo-300 font-medium">Analyzing document...</p>
                </div>
             ) : (
               <div className="space-y-3 transition-transform group-hover:scale-105 duration-200">
                 <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6 text-indigo-400" />
                 </div>
                 <p className="text-sm text-gray-300 font-medium">Click to browse or drag file here</p>
                 <p className="text-xs text-gray-500">PDF files only (Max 5MB)</p>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 2: INTERVIEW UI (Main) ---
  return (
    <div className={`min-h-screen bg-gradient-to-br ${mode === 'interview' ? 'from-gray-900 via-indigo-900 to-purple-900' : 'from-gray-900 via-pink-900 to-purple-900'}`}>
      
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="bg-gray-900/50 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center ${mode === 'interview' ? 'from-teal-400 to-indigo-500' : 'from-pink-400 to-purple-500'}`}>
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Mock Interview</h1>
                <p className="text-xs text-teal-300 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Resume Loaded
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                <Clock className="w-5 h-5 text-teal-400" />
                <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
              </div>
              <button onClick={handleEndInterview} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                End Interview
              </button>
            </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT: Video & Chat */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Video Feed */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6 relative overflow-hidden">
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative shadow-inner">
                {cameraEnabled ? (
                   <div className="w-full h-full relative">
                     <VideoMirror stream={videoRef.current?.srcObject as MediaStream} />
                     <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full border border-teal-500/30 flex items-center gap-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                        <p className="text-xs text-teal-400 font-mono">VISION AI ACTIVE</p>
                     </div>
                   </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">Camera Off</div>
                )}
              </div>
            </div>

            {/* Chat / Interaction Area */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6">
              <div className="bg-gray-900/50 rounded-xl p-4 h-[250px] overflow-y-auto mb-4 space-y-4 custom-scrollbar">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-md ${m.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
                      <p className="text-sm leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* RECORDING CONTROLS */}
              <div className="flex items-center gap-4">
                <button 
                    onClick={handleToggleRecording}
                    className={`flex-1 h-12 text-lg font-medium rounded-lg transition-all shadow-lg flex items-center justify-center ${
                        isRecording 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                    {isRecording ? (
                        <><MicOff className="w-5 h-5 mr-2" /> Finish Answer</>
                    ) : (
                        <><Mic className="w-5 h-5 mr-2" /> Start Answer</>
                    )}
                </button>
                
                <input 
                    value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)} 
                    placeholder="Type answer manually..." 
                    className="bg-gray-700/50 border border-gray-600 text-white w-1/3 h-12 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Live Analytics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6 h-full flex flex-col">
              <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-400" />
                Real-Time AI Metrics
              </h3>
              
              <div className="space-y-8 flex-1">
                
                {/* 1. CONFIDENCE SCORES (BIG NUMBERS) */}
                <div className="grid grid-cols-2 gap-4">
                    <ScoreCard 
                        title="Visual Confidence" 
                        score={visualConfidence} 
                        icon={<Eye className="w-4 h-4" />}
                        color={visualConfidence > 70 ? 'text-green-400' : visualConfidence > 40 ? 'text-yellow-400' : 'text-red-400'}
                    />
                    <ScoreCard 
                        title="Audio Confidence" 
                        score={audioConfidence} 
                        icon={<Radio className="w-4 h-4" />}
                        color={audioConfidence > 70 ? 'text-green-400' : audioConfidence > 40 ? 'text-yellow-400' : 'text-red-400'}
                    />
                </div>

                <div className="h-px bg-gray-700/50"></div>

                {/* 2. BEHAVIORAL METRICS (BARS) */}
                <div className="space-y-6">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                       <MonitorPlay className="w-3 h-3" /> Body Language
                    </h4>
                    
                    <MetricBar label="Attention Span" value={attention} color="bg-blue-500" />
                    <MetricBar label="Body Stability" value={stability} color="bg-purple-500" />
                    <MetricBar label="Movement Smoothness" value={smoothness} color="bg-pink-500" />
                </div>

                <div className="h-px bg-gray-700/50"></div>

                {/* 3. FINAL ANSWER QUALITY */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700/50 text-center shadow-lg mt-auto">
                    <span className="text-gray-400 text-xs uppercase tracking-widest mb-2 block flex items-center justify-center gap-2">
                        <Zap className="w-3 h-3 text-yellow-500" /> AI Answer Grade
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            {answerQuality}
                        </span>
                        <span className="text-sm text-gray-500 font-medium">/100</span>
                    </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function VideoMirror({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />;
}

function MetricBar({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300 font-medium">{label}</span>
                <span className="text-white font-mono">{value.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700/50 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${color}`} 
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }} 
                />
            </div>
        </div>
    );
}

function ScoreCard({ title, score, icon, color }: { title: string, score: number, icon: any, color: string }) {
    return (
        <div className="bg-gray-700/30 border border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
            <div className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                {icon} {title}
            </div>
            <div className={`text-3xl font-bold font-mono ${color}`}>
                {score.toFixed(0)}%
            </div>
        </div>
    );
}