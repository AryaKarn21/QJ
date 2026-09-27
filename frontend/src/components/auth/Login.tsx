import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
} from 'lucide-react';
import registerVisual from '../../assets/authImages/registerVisual.png';
import googleIcon from '../../assets/authImages/google.png';
import Logo from '../../assets/quickjobs.png';
import { loginUser } from './authApi/authApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await loginUser(formData);

      localStorage.setItem('token', response.token);
      if (response.email) localStorage.setItem('adminEmail', response.email);
      if (response.name) localStorage.setItem('adminName', response.name);
      window.dispatchEvent(new Event('authChange'));

      const role = response.role;
      if (role === 'jobseeker') {
        navigate('/community');
      } else if (role === 'employer') {
        navigate('/employer/profile');
      } else if (role === 'admin' || role === 'superadmin') {
        navigate('/admin/dashboard');
      } else {
        setError('Unknown role');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleSignIn = () => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    window.location.href = `${API_BASE_URL}/api/auth/google?redirect_uri=${redirectUri}`;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const role = urlParams.get('role');

    if (token && role) {
      localStorage.setItem('token', token);

      if (role === 'jobseeker') {
        navigate('/community');
      } else if (role === 'employer') {
        navigate('/employer/profile');
      } else if (role === 'admin' || role === 'superadmin') {
        navigate('/admin/dashboard');
      }
    }
  }, [navigate]);

  return (
    <div className="relative min-h-[calc(100dvh-80px)] w-full bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden select-none">
      
      {/* Subtle Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-600/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Main Glassmorphism Form Card */}
      <div className="relative z-10 w-full max-w-5xl bg-[#0d131f]/90 backdrop-blur-2xl border border-slate-800/80 rounded-[28px] shadow-2xl shadow-black/80 overflow-hidden flex flex-col lg:flex-row my-auto">
        
        {/* Left Column (Exact Same Image as Registration Page) */}
        <div className="w-full lg:w-1/2 relative bg-[#070b12] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-7 border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div className="relative w-full max-w-[480px] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl group">
            <img
              src={registerVisual}
              alt="Join QuickJobs - Unlock Career Opportunities"
              className="w-full h-auto object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.01]"
              loading="eager"
            />
            {/* Ambient backlight glow */}
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-transparent blur-xl pointer-events-none -z-10" />
          </div>
        </div>

        {/* Right Column (Form Details) */}
        <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-[#0d131f]/95">
          
          {/* Logo & Subtitle */}
          <div className="mb-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-3 shadow-sm">
              <img className="h-6 w-auto object-contain" src={Logo} alt="QuickJobs Logo" />
              <span className="text-xs font-bold text-white tracking-wide">QuickJobs</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Please enter your credentials to access your account.
            </p>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 sm:py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-10 pr-10 py-2.5 sm:py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label htmlFor="remember" className="flex items-center cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 transition cursor-pointer"
                />
                <span className="ml-2">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="font-medium text-orange-400 hover:text-orange-300 hover:underline transition-all focus:outline-none cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative group w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-500 text-white font-bold py-2.5 sm:py-3 px-4 text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative px-3 bg-[#0d131f] text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                or continue with
              </div>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full bg-slate-950/90 hover:bg-slate-900 text-slate-200 font-medium py-2.5 sm:py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm shadow-sm active:scale-[0.99] focus:outline-none cursor-pointer"
            >
              <img src={googleIcon} alt="Google Logo" className="h-4 w-4 object-contain" />
              <span>Sign in with Google</span>
            </button>
          </form>

          {/* Footer Signup Link */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-400 hover:text-orange-300 font-semibold hover:underline transition-all">
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;