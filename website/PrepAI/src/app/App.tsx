import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/app/pages/Login';
import Home from '@/app/pages/Home';
import Profile from '@/app/pages/Profile';
import Interview from '@/app/pages/Interview';
import Report from '@/app/pages/Report';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}