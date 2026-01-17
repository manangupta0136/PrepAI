import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Database, LogOut, Camera, Save, ArrowLeft, Video, MessageCircle, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import api from '../../api/axios'; 

// --- HELPER: ROBUST DATE FORMATTER ---
const formatDate = (dateInput: string | Date | undefined) => {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  
  if (isNaN(date.getTime())) return 'Invalid Date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short', 
    day: 'numeric', 
    year: 'numeric'
  }).format(date);
};

// --- HELPER: EXTRACT DATE FROM MONGO ID ---
const getDateFromMongoId = (id: string) => {
  try {
    const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
    return new Date(timestamp);
  } catch (e) {
    return null;
  }
};

export default function Profile() {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User'); 
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [allowAIData, setAllowAIData] = useState(true);
  const [historyTab, setHistoryTab] = useState<'interview' | 'informal'>('interview');

  // Data State
  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);

  // --- 1. FETCH DATA (CHAINED) ---
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn("⚠️ No token found, redirecting to login.");
        navigate('/login');
        return;
      }

      try {
        // STEP 1: Fetch Profile First
        const profileRes = await api.get('/auth/me', {
            headers: { 'x-auth-token': token } 
        });
        
        const userData = profileRes.data;
        setFullName(userData.name);
        setEmail(userData.email);

        const realUserId = userData._id || userData.id || userData.userId; 

        if (!realUserId) {
            console.error("❌ CRITICAL: Could not find user ID in /auth/me response", userData);
            setLoading(false);
            return;
        }

        // STEP 2: Fetch History
        const historyRes = await api.get(`interviews/history/${realUserId}`, {
          headers: { 'x-auth-token': token }
        });
        
        const historyData = historyRes.data;

        // DEBUG: Log the first item to see what fields are actually there
        if (Array.isArray(historyData) && historyData.length > 0) {
           console.log("🔍 INSPECTING FIRST SESSION:", historyData[0]);
           console.log("Keys available:", Object.keys(historyData[0]));
        }

        if (Array.isArray(historyData)) {
          const processedHistory = historyData.map((session: any) => {
            
            // --- SCORING LOGIC ---
            const normalize = (val: any) => {
              const num = parseFloat(val) || 0;
              return num <= 1 && num > 0 ? num * 100 : num;
            };

            const scores = session.scores || {};
            const vidConf = normalize(scores.confidence);
            const audConf = normalize(scores.audioConfidence);
            const avgConfidence = (vidConf + audConf) / 2;

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
            
            // --- FIX: DATE EXTRACTION STRATEGY ---
            // 1. Try standard fields
            let finalDate = session.createdAt || session.created_at || session.date || session.timestamp;
            
            // 2. If missing, extract from MongoDB _id (Reliable Fallback)
            if (!finalDate && session._id) {
                finalDate = getDateFromMongoId(session._id);
            }

            return {
              id: session._id,
              date: formatDate(finalDate), // Uses robust formatter
              duration: session.duration ? `${session.duration}s` : 'N/A',
              confidence: Math.round(avgConfidence),
              success: successScore
            };
          });

          // Sort Newest First
          processedHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setInterviewHistory(processedHistory);
        }
        
      } catch (err: any) {
        console.error("❌ DEBUG: Error during fetch sequence.", err);
        if (err.response && err.response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // --- 2. UPDATE PROFILE ---
  const handleSaveProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.put('/auth/update', 
        { name: fullName, email: email },
        { headers: { 'x-auth-token': token } }
      );
      alert("Profile updated successfully!");
      setIsEditingProfile(false);
    } catch (err) {
      alert("Failed to update profile.");
    }
  };

  const handleLogoutAllDevices = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const informalHistory = [
    { id: 1, date: 'Jan 12, 2026', duration: '18:30', socialConfidence: 85, engagement: 88 },
    { id: 2, date: 'Jan 09, 2026', duration: '16:20', socialConfidence: 80, engagement: 82 },
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* PROFILE INFO */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-indigo-600" /> Profile Information
            </h2>
            {!isEditingProfile && (
              <Button onClick={() => setIsEditingProfile(true)} className="bg-indigo-600 hover:bg-indigo-700">Edit Profile</Button>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-indigo-200 flex items-center justify-center hover:bg-indigo-50 transition-colors shadow-md">
                  <Camera className="w-4 h-4 text-indigo-600" />
                </button>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{fullName}</h3>
                <p className="text-gray-600">{email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">{role}</span>
              </div>
            </div>

            {isEditingProfile && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div><Label htmlFor="fullName">Full Name</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="profileEmail">Email Address</Label><Input id="profileEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
                  <Button onClick={() => setIsEditingProfile(false)} variant="outline">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PRACTICE HISTORY */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" /> Practice History
            </h2>

            <div className="mb-6 flex justify-center">
              <div className="bg-gray-100 rounded-lg p-1 inline-flex gap-1">
                <button onClick={() => setHistoryTab('interview')} className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${historyTab === 'interview' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Video className="w-4 h-4 inline mr-2" /> Interview Mode
                </button>
                <button onClick={() => setHistoryTab('informal')} className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${historyTab === 'informal' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}>
                  <MessageCircle className="w-4 h-4 inline mr-2" /> Informal Mode
                </button>
              </div>
            </div>

            {historyTab === 'interview' && (
              <div className="overflow-x-auto">
                {interviewHistory.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Date</th>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Duration</th>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Avg Confidence</th>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Overall Success</th>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviewHistory.map((session) => (
                        <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-3 text-sm text-gray-900">{session.date}</td>
                          <td className="py-4 px-3 text-sm text-gray-600">{session.duration}</td>
                          <td className="py-4 px-3"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{session.confidence}%</span></td>
                          <td className="py-4 px-3"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${session.success >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{session.success}%</span></td>
                          <td className="py-4 px-3">
                            <button onClick={() => navigate('/report?mode=interview')} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:underline">View Latest</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 mb-2 text-gray-300"/>
                    <p>No interview sessions found.</p>
                  </div>
                )}
              </div>
            )}

            {historyTab === 'informal' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Date</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Duration</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Social</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Engagement</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informalHistory.map((session) => (
                      <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-3 text-sm text-gray-900">{session.date}</td>
                        <td className="py-4 px-3 text-sm text-gray-600">{session.duration}</td>
                        <td className="py-4 px-3"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">{session.socialConfidence}%</span></td>
                        <td className="py-4 px-3"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">{session.engagement}%</span></td>
                        <td className="py-4 px-3"><button onClick={() => navigate('/report?mode=informal')} className="text-teal-600 hover:text-teal-700 text-sm font-medium hover:underline">View Report</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* ACCOUNT & PRIVACY */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-600" /> Account Settings</h2>
          <div className="space-y-6">
            <div className="pb-6 border-b border-gray-200 flex justify-between">
              <div><h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3><p className="text-sm text-gray-600">Coming Soon</p></div>
              <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2"><LogOut className="w-5 h-5 text-red-600" /> Logout from All Devices</h3>
              <Button onClick={handleLogoutAllDevices} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400">Logout Now</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}