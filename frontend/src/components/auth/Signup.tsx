import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Cookies from 'js-cookie';
import registerVisual from '../../assets/authImages/registerVisual.png';
import googleIcon from '../../assets/authImages/google.png';
import Logo from '../../assets/quickjobs.png';
import { registerUser } from './authApi/authApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

type RoleType = 'jobseeker' | 'employer';

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<RoleType>('jobseeker');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long.');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!formData.password) {
      setError('Please enter a password.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    if (!agreedToTerms) {
      setError('Please accept the Terms & Conditions and Privacy Policy to continue.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const dataToSend = new FormData();
      dataToSend.append('name', formData.name.trim());
      dataToSend.append('email', formData.email.trim().toLowerCase());
      dataToSend.append('password', formData.password);
      dataToSend.append('role', selectedRole);

      const response = await registerUser(dataToSend);

      // Set cookies for name and email with 10 minutes expiry matching existing OTP verification logic
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      Cookies.set('userName', formData.name.trim(), { expires, sameSite: 'Lax' });
      Cookies.set('userEmail', formData.email.trim().toLowerCase(), { expires, sameSite: 'Lax' });

      // Navigate to OTP verification page
      navigate('/signup/verify-otp', {
        state: {
          email: formData.email.trim().toLowerCase(),
          message: response?.message,
        },
      });
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
      const errorMessage =
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        (typeof err === 'string' ? err : 'Registration failed. Please try again.');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    window.location.href = `${API_BASE_URL}/api/auth/google?redirect_uri=${redirectUri}`;
  };

  // If user is already authenticated or returning with oauth tokens
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const role = urlParams.get('role');

    if (token && role) {
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('authChange'));

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
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-600/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Main Glassmorphism Card Container */}
      <div className="relative z-10 w-full max-w-5xl bg-[#0d131f]/90 backdrop-blur-2xl border border-slate-800/80 rounded-[28px] shadow-2xl shadow-black/80 overflow-hidden flex flex-col lg:flex-row my-auto">
        
        {/* Left Visual Column */}
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

        {/* Right Form Column */}
        <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-[#0d131f]/95">
          {/* Logo & Heading */}
          <div className="mb-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-3 shadow-sm">
              <img className="h-6 w-auto object-contain" src={Logo} alt="QuickJobs Logo" />
              <span className="text-xs font-bold text-white tracking-wide">QuickJobs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Join QuickJobs and start your career journey today.
            </p>
          </div>

          {/* Role Toggle Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800/90 rounded-2xl gap-1.5 mb-5 shadow-inner">
            {/* Job Seeker */}
            <button
              type="button"
              onClick={() => setSelectedRole('jobseeker')}
              className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-left focus:outline-none cursor-pointer ${
                selectedRole === 'jobseeker'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400/30'
                  : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <div
                className={`p-2 rounded-lg transition-colors ${
                  selectedRole === 'jobseeker'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                <User size={18} />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm leading-tight">Job Seeker</div>
                <div
                  className={`text-[11px] leading-tight mt-0.5 ${
                    selectedRole === 'jobseeker' ? 'text-orange-100' : 'text-slate-500'
                  }`}
                >
                  Find Jobs
                </div>
              </div>
            </button>

            {/* Job Provider */}
            <button
              type="button"
              onClick={() => setSelectedRole('employer')}
              className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-left focus:outline-none cursor-pointer ${
                selectedRole === 'employer'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400/30'
                  : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <div
                className={`p-2 rounded-lg transition-colors ${
                  selectedRole === 'employer'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                <Building2 size={18} />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm leading-tight">Job Provider</div>
                <div
                  className={`text-[11px] leading-tight mt-0.5 ${
                    selectedRole === 'employer' ? 'text-orange-100' : 'text-slate-500'
                  }`}
                >
                  Post Jobs
                </div>
              </div>
            </button>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <User size={17} />
                </div>
                <input
                  type="text"
                  name="name"
                  id="register-name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  required
                  autoComplete="name"
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 sm:py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  name="email"
                  id="register-email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  required
                  autoComplete="email"
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 sm:py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="register-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password (min. 6 characters)"
                  required
                  autoComplete="new-password"
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-10 pr-10 py-2.5 sm:py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={17} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  id="register-confirm-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  required
                  autoComplete="new-password"
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-10 pr-10 py-2.5 sm:py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="register-agree-terms"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (error) setError('');
                }}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 transition mt-0.5 cursor-pointer accent-orange-500"
              />
              <label
                htmlFor="register-agree-terms"
                className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none"
              >
                I agree to the{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-400 font-medium hover:underline"
                >
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-400 font-medium hover:underline"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-600/30 hover:shadow-orange-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer group mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-3.5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative px-3 bg-[#0d131f] text-[11px] font-medium text-slate-500">
                or continue with
              </div>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full bg-slate-950/80 hover:bg-slate-800/80 text-slate-200 font-medium py-2.5 sm:py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm shadow-sm active:scale-[0.99] focus:outline-none cursor-pointer"
            >
              <img src={googleIcon} alt="Google" className="h-4 w-4 object-contain" />
              <span>Sign in with Google</span>
            </button>
          </form>

          {/* Footer Link to Login */}
          <p className="mt-5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-orange-500 hover:text-orange-400 font-bold hover:underline transition-all ml-1"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;