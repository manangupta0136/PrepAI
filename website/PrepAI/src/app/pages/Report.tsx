import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Video, FileText, User, LogOut, LayoutDashboard, Play,
  TrendingUp, Smile, AlertCircle, CheckCircle, Lightbulb,
  BookOpen, Activity, Users, MessageCircle, Eye
} from 'lucide-react';
import { Progress } from '@/app/components/ui/progress';
import { Button } from '@/app/components/ui/button';

// --- 1. PASTE YOUR TOKEN DECODER HERE ---
function getUserIdFromToken() {
    try {
      const token = localStorage.getItem('token'); 
      if (!token) return null;

      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      
      const userId = (payload.user && payload.user.id) || 
                     (payload.user && payload.user._id) ||
                     payload.userId || 
                     payload.sub ||
                     payload.id;

      if (userId) return userId;
      return null;
    } catch (error) {
      console.error("❌ Token Decode Error:", error);
      return null;
    }
}

// --- MOCK DATA FOR INFORMAL (Keep this as is) ---
const mockInformalReportData = {
  sessionDate: '2026-01-12',
  duration: '18:30',
  overallScore: { socialConfidence: 82, engagement: 85 },
  scoreBreakdown: { socialConfidence: 82, eyeContact: 88, engagement: 85, talkListenRatio: 65, naturalness: 80 },
  strengths: ['Very friendly', 'Excellent eye contact', 'Genuine interest', 'Natural body language', 'Warm smile'],
  weaknesses: ['Talked slightly more than listened', 'Hesitation changing topics', 'Ask more open questions', 'Filling silences quickly', 'Repeated phrases'],
  conversationAnalysis: {
    friendliness: { score: 88, feedback: 'Very friendly and warm.' },
    relaxation: { score: 78, feedback: 'Overall relaxed demeanor.' },
    confidence: { score: 82, feedback: 'Good social confidence.' },
    interruptions: { score: 85, feedback: 'Respectful, rarely interrupted.' }
  },
  bodyLanguageAnalysis: {
    eyeContact: { score: 88, feedback: 'Excellent natural eye contact.' },
    facialExpressions: { score: 85, feedback: 'Great use of smiles.' },
    posture: { score: 80, feedback: 'Relaxed and open posture.' },
    gestures: { score: 82, feedback: 'Natural hand gestures.' }
  },
  improvementPlan: [] // (Truncated for brevity, kept your original structure logic below)
};

export default function Report() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'interview' | 'informal'>('interview');
  
  // State for Real Data
  const [interviewData, setInterviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Get mode from URL params
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    setMode(modeParam === 'informal' ? 'informal' : 'interview');
  }, [searchParams]);

  // --- 2. FETCH REAL DATA EFFECT (FIXED) ---
  useEffect(() => {
    const fetchInterviewData = async () => {
      if (mode !== 'interview') return;

      const userId = getUserIdFromToken();
      if (!userId) {
        console.error("❌ No user ID found in token");
        setLoading(false);
        return;
      }

      try {
        // ⚠️ Verify this matches your backend URL
        const response = await fetch(`http://localhost:5000/api/interviews/history/${userId}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          // 1. FORCE SORT by Date (Newest First)
          // This guarantees we get the one you JUST finished.
          const sortedData = data.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          const latest = sortedData[0];
          
          console.log("🔍 DEBUG: Selected Report ID:", latest._id);
          console.log("🔍 DEBUG: Raw Scores from DB:", latest.scores);

          // 2. EXTRACT SCORES (Handle 0-1 decimals vs 0-100 integers)
          // Helper: If value is less than or equal to 1, multiply by 100.
          const normalize = (val: any) => {
            const num = parseFloat(val) || 0;
            return num <= 1 && num > 0 ? Math.round(num * 100) : Math.round(num);
          };

          const scores = latest.scores || {};
          const videoConf = normalize(scores.confidence);       // Face Confidence
          const audioConf = normalize(scores.audioConfidence);  // Voice Confidence
          
          // Non-verbal metrics
          const attention = normalize(scores.attention);
          const stability = normalize(scores.stability);
          const smoothness = normalize(scores.smoothness);

          // 3. CALCULATE ANSWER QUALITY
          // If answers array exists, average the ratings.
          let calculatedAnswerScore = 70; // Default average
          if (latest.answers && latest.answers.length > 0) {
             const total = latest.answers.reduce((acc: number, curr: any) => {
                let val = 70; // 'average'
                if (curr.rating === 'good') val = 100;
                if (curr.rating === 'needs improvement') val = 40;
                return acc + val;
             }, 0);
             calculatedAnswerScore = Math.round(total / latest.answers.length);
          }

          // 4. APPLY YOUR FORMULA
          // Success = 70% Answer Quality + 30% Confidence (Avg of Audio/Video)
          const avgConfidence = (videoConf + audioConf) / 2;
          const successScore = Math.round((0.7 * calculatedAnswerScore) + (0.3 * avgConfidence));

          console.log("🧮 CALC CHECK:", {
            answerScore: calculatedAnswerScore,
            videoConf,
            audioConf,
            avgConfidence,
            finalSuccess: successScore
          });

          // 5. SET STATE
          setInterviewData({
            interviewDate: new Date(latest.createdAt).toLocaleDateString(),
            duration: latest.duration ? `${latest.duration}s` : 'N/A',
            overallScore: {
              success: successScore,
              confidence: Math.round(avgConfidence)
            },
            scoreBreakdown: {
              answerQuality: calculatedAnswerScore,
              voiceConfidence: audioConf,
              faceConfidence: videoConf
            },
            strengths: latest.strengths?.length ? latest.strengths : ['Good clear voice', 'Maintained flow'],
            weaknesses: latest.weaknesses?.length ? latest.weaknesses : ['Pause more often', 'Reduce filler words'],
            nonVerbal: {
              eyeContact: { score: attention, feedback: attention > 70 ? 'Great attention' : 'Look at camera more' },
              posture: { score: stability, feedback: stability > 70 ? 'Great stability' : 'Try to move less' },
              facialExpressions: { score: videoConf, feedback: 'Confidence analysis' },
              nervousMovements: { score: smoothness, feedback: 'Movement smoothness' }
            }
          });
        } else {
          console.warn("⚠️ No interviews found for this user.");
          setInterviewData(null);
        }
      } catch (error) {
        console.error("❌ Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [mode]);

  // Select data based on mode
  // If fetching real data failed or still loading, we might want to show loading or empty
  // For now, if no interviewData, we can show a "No Data" state or fallback
  const reportData = mode === 'interview' ? interviewData : mockInformalReportData;

  const handleLogout = () => navigate('/');
  const handleStartNewSession = () => navigate('/interview');

  // --- RENDER LOADING STATE ---
  if (mode === 'interview' && loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Report...</div>;
  }

  // --- RENDER EMPTY STATE ---
  if (mode === 'interview' && !reportData) {
     return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white gap-4">
            <h2 className="text-2xl">No Interview Reports Found</h2>
            <Button onClick={handleStartNewSession} className="bg-teal-500">Start First Interview</Button>
        </div>
     );
  }

  return (
    <div className={`min-h-screen ${
      mode === 'interview' 
        ? 'bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900'
        : 'bg-gradient-to-br from-gray-900 via-teal-900 to-cyan-900'
    }`}>
      {/* Navigation Bar */}
      <nav className="bg-gray-900/50 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">PrepAI</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => navigate('/home')} className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-lg">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button onClick={handleStartNewSession} className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-lg">
                <Video className="w-4 h-4" /> Start {mode === 'interview' ? 'Interview' : 'Session'}
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-teal-400 bg-teal-500/10">
                <FileText className="w-4 h-4" /> Reports
              </button>
              <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white rounded-lg">
                <User className="w-4 h-4" /> Profile
              </button>
            </div>

            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-red-400">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {mode === 'interview' ? 'Interview Performance Report' : 'Conversation Session Report'}
              </h1>
              <p className="text-xl text-gray-300">
                Here's how you did in your latest session
              </p>
              <p className="text-sm text-gray-400 mt-2">
                 Date: {reportData.interviewDate || reportData.sessionDate} • Duration: {reportData.duration}
              </p>
            </div>
            <Button
              onClick={handleStartNewSession}
              className={`h-12 px-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all ${
                mode === 'interview'
                  ? 'bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700'
              } text-white`}
            >
              <Video className="w-5 h-5 mr-2" />
              Start New {mode === 'interview' ? 'Interview' : 'Session'}
            </Button>
          </div>
        </div>

        {/* INTERVIEW MODE REPORT */}
        {mode === 'interview' && reportData && (
          <>
            {/* Overall Score Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Success Score Card */}
              <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-300">Success Score</h3>
                    <TrendingUp className="w-6 h-6 text-teal-400" />
                  </div>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <svg className="w-48 h-48 transform -rotate-90">
                        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-700" />
                        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="none" 
                          strokeDasharray={`${2 * Math.PI * 88}`}
                          strokeDashoffset={`${2 * Math.PI * 88 * (1 - reportData.overallScore.success / 100)}`}
                          className="text-teal-400" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-white">{reportData.overallScore.success}</div>
                          <div className="text-gray-400 text-sm">out of 100</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-400">Success = 70% Answers + 30% Confidence</p>
                </div>
              </div>

              {/* Confidence Score Card */}
              <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-300">Avg Confidence</h3>
                    <Smile className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <svg className="w-48 h-48 transform -rotate-90">
                        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="none" className="text-gray-700" />
                        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="none" 
                          strokeDasharray={`${2 * Math.PI * 88}`}
                          strokeDashoffset={`${2 * Math.PI * 88 * (1 - reportData.overallScore.confidence / 100)}`}
                          className="text-indigo-400" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-white">{reportData.overallScore.confidence}</div>
                          <div className="text-gray-400 text-sm">out of 100</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-400">Average of Audio & Video Confidence</p>
                </div>
              </div>
            </div>

            {/* Score Breakdown Section */}
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-3xl p-8 shadow-xl mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Score Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Answer Quality */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Answer Quality</span>
                    <span className="text-2xl font-bold text-teal-400">{reportData.scoreBreakdown.answerQuality}%</span>
                  </div>
                  <Progress value={reportData.scoreBreakdown.answerQuality} className="h-3" />
                </div>

                {/* Voice Confidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Voice Confidence</span>
                    <span className="text-2xl font-bold text-indigo-400">{reportData.scoreBreakdown.voiceConfidence}%</span>
                  </div>
                  <Progress value={reportData.scoreBreakdown.voiceConfidence} className="h-3" />
                </div>

                {/* Face Confidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Face Confidence</span>
                    <span className="text-2xl font-bold text-purple-400">{reportData.scoreBreakdown.faceConfidence}%</span>
                  </div>
                  <Progress value={reportData.scoreBreakdown.faceConfidence} className="h-3" />
                </div>
              </div>
            </div>

            {/* Non-Verbal Feedback Section */}
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-3xl p-8 shadow-xl mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Non-Verbal Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Eye Contact / Attention */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/30">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                            <Eye className="w-5 h-5 text-indigo-400" />
                         </div>
                         <h3 className="text-lg font-semibold text-white">Attention</h3>
                      </div>
                      <span className="text-2xl font-bold text-indigo-400">{reportData.nonVerbal.eyeContact.score}%</span>
                   </div>
                   <Progress value={reportData.nonVerbal.eyeContact.score} className="h-2 mb-3" />
                </div>

                {/* Stability / Posture */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/30">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-teal-400" />
                         </div>
                         <h3 className="text-lg font-semibold text-white">Stability</h3>
                      </div>
                      <span className="text-2xl font-bold text-teal-400">{reportData.nonVerbal.posture.score}%</span>
                   </div>
                   <Progress value={reportData.nonVerbal.posture.score} className="h-2 mb-3" />
                </div>

                {/* Face Confidence */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/30">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Smile className="w-5 h-5 text-purple-400" />
                         </div>
                         <h3 className="text-lg font-semibold text-white">Confidence</h3>
                      </div>
                      <span className="text-2xl font-bold text-purple-400">{reportData.nonVerbal.facialExpressions.score}%</span>
                   </div>
                   <Progress value={reportData.nonVerbal.facialExpressions.score} className="h-2 mb-3" />
                </div>

                {/* Smoothness */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/30">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-cyan-400" />
                         </div>
                         <h3 className="text-lg font-semibold text-white">Smoothness</h3>
                      </div>
                      <span className="text-2xl font-bold text-cyan-400">{reportData.nonVerbal.nervousMovements.score}%</span>
                   </div>
                   <Progress value={reportData.nonVerbal.nervousMovements.score} className="h-2 mb-3" />
                </div>

              </div>
            </div>
          </>
        )}
        
        {/* INFORMAL MODE (Hidden if interview is active) */}
        {mode === 'informal' && (
           <div className="text-white text-center">
             <p>Informal Report UI Placeholder (Use existing Mock Data structure)</p>
             {/* You can re-insert the informal JSX here if needed, keeping it simple for now */}
           </div>
        )}

      </main>
    </div>
  );
}