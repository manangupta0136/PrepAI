import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Video, BarChart3, TrendingUp, Calendar, Play, FileText, User, LogOut, LayoutDashboard, MessageCircle, Users, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import api from '../../api/axios';

// --- HELPERS ---
const formatDate = (dateInput: string | Date | undefined) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const getDateFromMongoId = (id: string) => {
  try {
    const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
    return new Date(timestamp);
  } catch (e) {
    return null;
  }
};

export default function Home() {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [mode, setMode] = useState<'interview' | 'informal'>('interview');
  const [jobProfile, setJobProfile] = useState('Software Engineer');

  // Dynamic Data Containers
  const [interviewStats, setInterviewStats] = useState({
    total: 0,
    avgConfidence: 0,
    avgSuccess: 0, // <--- CHANGED FROM bestScore
    lastDate: 'N/A',
    avgChange: '+0%', 
    totalChange: '+0'
  });
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<any[]>([]);

  // Placeholder for Informal Stats
  const [informalStats] = useState({
    total: 12,
    socialConfidence: 78,
    bestEngagement: 85,
    lastDate: 'Jan 12'
  });

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/'); 
        return;
      }

      try {
        const userRes = await api.get('/auth/me', { headers: { 'x-auth-token': token } });
        const userData = userRes.data;
        setUserName(userData.name);
        
        const userId = userData._id || userData.id || userData.userId;

        const historyRes = await api.get(`interviews/history/${userId}`, {
          headers: { 'x-auth-token': token }
        });

        const rawHistory = Array.isArray(historyRes.data) ? historyRes.data : [];

        if (rawHistory.length > 0) {
          const processed = rawHistory.map((session: any) => {
            // Score Normalization
            const normalize = (val: any) => {
              const num = parseFloat(val) || 0;
              return num <= 1 && num > 0 ? num * 100 : num;
            };

            const scores = session.scores || {};
            const vidConf = normalize(scores.confidence);
            const audConf = normalize(scores.audioConfidence);
            const avgConfidence = Math.round((vidConf + audConf) / 2);

            // Answer Score Logic
            let answerScore = 70; 
            if (session.answers && session.answers.length > 0) {
               const totalParams = session.answers.reduce((acc: number, curr: any) => {
                  let val = 70;
                  const r = curr.rating ? curr.rating.toLowerCase() : '';
                  if (r.includes('good') || r.includes('excellent')) val = 100;
                  else if (r.includes('improvement') || r.includes('bad')) val = 40;
                  return acc + val;
               }, 0);
               answerScore = totalParams / session.answers.length;
            }

            const successScore = Math.round((0.7 * answerScore) + (0.3 * avgConfidence));

            let finalDate = session.createdAt || session.created_at || session.date;
            if (!finalDate && session._id) finalDate = getDateFromMongoId(session._id);

            return {
              id: session._id,
              dateStr: formatDate(finalDate),
              fullDate: new Date(finalDate || Date.now()),
              confidenceScore: avgConfidence,
              successScore: successScore
            };
          });

          // Sorts
          const sortedNewest = [...processed].sort((a, b) => b.fullDate.getTime() - a.fullDate.getTime());
          const sortedOldest = [...processed].sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

          setRecentInterviews(sortedNewest.slice(0, 5)); 
          
          setChartData(sortedOldest.slice(-10).map(item => ({
            date: item.dateStr,
            score: item.confidenceScore
          })));

          // --- AGGREGATE CALCULATIONS ---
          const totalCount = processed.length;
          
          // 1. Avg Confidence
          const totalConf = processed.reduce((acc, curr) => acc + curr.confidenceScore, 0);
          
          // 2. Avg Success (CHANGED LOGIC HERE)
          const totalSuccess = processed.reduce((acc, curr) => acc + curr.successScore, 0);
          const avgSuccessCalc = Math.round(totalSuccess / totalCount);

          setInterviewStats({
            total: totalCount,
            avgConfidence: Math.round(totalConf / totalCount),
            avgSuccess: avgSuccessCalc, // Storing Avg instead of Max
            lastDate: sortedNewest[0].dateStr,
            avgChange: '+5%', 
            totalChange: `+${rawHistory.filter((i:any) => {
                const d = new Date(i.createdAt || getDateFromMongoId(i._id));
                const diff = Date.now() - d.getTime();
                return diff < 7 * 24 * 60 * 60 * 1000;
            }).length} this week`
          });
        }

      } catch (err) {
        console.error("Dashboard Data Error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    navigate('/');
  };

  const handleStartInterview = () => {
    navigate('/interview?mode=interview');
  };

  const handleStartInformalSession = () => {
    navigate('/interview?mode=informal');
  };

  const handleStartMeeting = () => {
    if (mode === 'interview') handleStartInterview();
    else handleStartInformalSession();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <Play className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">PrepAI</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <button className="flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 rounded-lg font-medium transition-colors">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button onClick={handleStartMeeting} className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors">
                <Video className="w-4 h-4" /> Start Meeting
              </button>
              <button onClick={() => navigate(`/report?mode=${mode}`)} className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors">
                <FileText className="w-4 h-4" /> Reports
              </button>
              <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors">
                <User className="w-4 h-4" /> Profile
              </button>
            </div>

            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
                <h1 className="text-4xl font-bold text-gray-900">Welcome back, {userName} 👋</h1>
                <p className="text-xl text-gray-600 mt-2">Ready to practice and improve your interview skills?</p>
            </div>
            <Select value={mode} onValueChange={(value: 'interview' | 'informal') => setMode(value)}>
              <SelectTrigger className="w-full md:w-[200px] h-12 bg-white border-gray-300 rounded-lg shadow-sm text-base font-medium px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interview" className="text-base py-2.5">Interview Mode</SelectItem>
                <SelectItem value="informal" className="text-base py-2.5">Informal Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === 'interview' && (
          <>
            <div className="mb-8 bg-gradient-to-r from-indigo-600 to-teal-600 rounded-3xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold text-white mb-3">Ready for Your Next Interview?</h2>
                  <p className="text-lg text-indigo-100 mb-6">Upload your resume, turn on camera and mic, and begin.</p>
                  <Button onClick={handleStartInterview} className="bg-white text-indigo-600 hover:bg-indigo-50 h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Video className="w-5 h-5 mr-2" /> Start New Interview
                  </Button>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto">
                  <label className="block text-white text-sm font-medium mb-2">Job Profile</label>
                  <Select value={jobProfile} onValueChange={setJobProfile}>
                    <SelectTrigger className="w-full md:w-[240px] h-14 bg-white border-0 rounded-lg shadow-lg text-base font-medium px-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                      <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                      <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                      <SelectItem value="Product Manager">Product Manager</SelectItem>
                      <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard icon={Video} color="indigo" label="Total Interviews" value={interviewStats.total} subtext={interviewStats.totalChange} />
              
              <StatCard icon={TrendingUp} color="purple" label="Avg Confidence" value={`${interviewStats.avgConfidence}%`} subtext={interviewStats.avgChange} />
              
              {/* UPDATED CARD: Avg Success */}
              <StatCard icon={BarChart3} color="teal" label="Avg Success" value={`${interviewStats.avgSuccess}%`} subtext="Based on all sessions" />
              
              <StatCard icon={Calendar} color="cyan" label="Last Interview" value={interviewStats.lastDate} subtext="Check Report" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Confidence Progress</h3>
                <div className="flex-1 min-h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                     <div className="h-full flex items-center justify-center text-gray-400">No data available yet</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Interviews</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Date</th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Confidence</th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Success</th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInterviews.length > 0 ? (
                        recentInterviews.map((interview) => (
                          <tr key={interview.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-2 text-sm text-gray-900">{interview.dateStr}</td>
                            <td className="py-4 px-2"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{interview.confidenceScore}%</span></td>
                            <td className="py-4 px-2"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${interview.successScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{interview.successScore}%</span></td>
                            <td className="py-4 px-2"><button onClick={() => navigate('/report?mode=interview')} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:underline">View Report</button></td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-500">No interviews recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'informal' && (
          <>
            <div className="mb-8 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-8 shadow-xl relative overflow-hidden">
               <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-3">Ready for a Friendly Chat?</h2>
                <p className="text-lg text-cyan-100 mb-6">Practice casual conversations and build social confidence.</p>
                <Button onClick={handleStartInformalSession} className="bg-white text-teal-600 hover:bg-cyan-50 h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                  <MessageCircle className="w-5 h-5 mr-2" /> Start New Chat Session
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
               <StatCard icon={MessageCircle} color="teal" label="Total Conversations" value={informalStats.total} subtext="+2 this week" />
               <StatCard icon={Smile} color="cyan" label="Social Confidence" value={`${informalStats.socialConfidence}%`} subtext="+15% improvement" />
               <StatCard icon={Users} color="emerald" label="Best Engagement" value={`${informalStats.bestEngagement}%`} subtext="Jan 12, 2026" />
               <StatCard icon={Calendar} color="sky" label="Last Session" value={informalStats.lastDate} subtext="1 day ago" />
            </div>
            
            <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-dashed border-gray-300">
                <p>Detailed informal analytics coming soon!</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, subtext }: any) {
    const colorClasses: Record<string, string> = {
        indigo: 'bg-indigo-100 text-indigo-600',
        purple: 'bg-purple-100 text-purple-600',
        teal: 'bg-teal-100 text-teal-600',
        cyan: 'bg-cyan-100 text-cyan-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        sky: 'bg-sky-100 text-sky-600',
    };
    
    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color] || 'bg-gray-100'}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{label}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-2">{subtext}</p>
        </div>
    );
}