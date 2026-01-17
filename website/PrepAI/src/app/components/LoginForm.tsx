import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';
import axios from 'axios';

export function LoginForm() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // Basic Validation for Signup (Confirm Password)
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      let response;
      
      if (isLogin) {
        // --- LOGIN LOGIC ---
        response = await api.post('/auth/login', {
          email: email,
          password: password
        });
      } else {
        // --- SIGNUP LOGIC ---
        response = await api.post('/auth/signup', {
          name: fullName, 
          email: email,
          password: password
        });
      }
      console.log('Response:', response.data);
      // Success! Store the token
      localStorage.setItem('token', response.data.token);

      // Redirect to dashboard
      navigate('/home'); 
      
    } catch (err: any) {
      // Handle error
      setError(err.response?.data?.msg || (isLogin ? 'Login failed' : 'Signup failed'));
    }
  };

  return (
    <div>
      {/* Tab Toggle */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
            isLogin
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
            !isLogin
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Error Message Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-700">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-12"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-gray-700">Password</Label>
            {isLogin && (
              <button
                type="button"
                className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Forgot?
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={isLogin ? 'Enter your password' : 'Create a password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 text-base bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 transition-all"
        >
          {isLogin ? 'Sign In' : 'Create Account'}
        </Button>

        {!isLogin && (
          <p className="text-xs text-gray-500 text-center">
            By creating an account, you agree to our{' '}
            <button type="button" className="text-indigo-600 hover:underline">Terms</button>
            {' & '}
            <button type="button" className="text-indigo-600 hover:underline">Privacy Policy</button>
          </p>
        )}
      </form>
    </div>
  );
}