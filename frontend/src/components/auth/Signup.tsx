import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Building, ArrowRight, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Signup: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'jobseeker' | 'employer' | null>(null);
  const navigate = useNavigate();

  const handleSignup = () => {
    if (selectedType === 'jobseeker') {
      navigate('/signup/jobseeker');
    } else if (selectedType === 'employer') {
      navigate('/signup/employer');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-[0_0_50px_-12px_rgba(59,130,246,0.12)] relative z-10"
      >
        {/* Header Badge */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-medium text-slate-400">
            <Sparkles size={13} className="text-indigo-400" />
            <span>Get Started</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-white tracking-tight mb-2">
          Create Your Account
        </h1>
        <p className="text-center text-slate-400 text-sm mb-8">
          Choose how you would like to use the platform to continue
        </p>

        {/* Selection Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          
          {/* Job Seeker Card */}
          <div 
            onClick={() => setSelectedType('jobseeker')}
            className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border backdrop-blur-md flex flex-col justify-between overflow-hidden group ${
              selectedType === 'jobseeker' 
                ? 'bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-slate-900/80 border-indigo-500 shadow-[0_0_25px_-5px_rgba(99,102,241,0.25)]' 
                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
            }`}
          >
            {/* Selection indicator badge */}
            <div className="absolute top-4 right-4">
              <CheckCircle2 
                size={20} 
                className={`transition-colors ${
                  selectedType === 'jobseeker' ? 'text-indigo-400 opacity-100' : 'text-slate-700 opacity-40'
                }`} 
              />
            </div>

            <div>
              <div className="flex justify-start mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                  selectedType === 'jobseeker' 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200'
                }`}>
                  <User size={26} />
                </div>
              </div>

              <h3 className={`text-lg font-bold mb-2 transition-colors ${
                selectedType === 'jobseeker' ? 'text-white' : 'text-slate-200'
              }`}>
                Job Seeker
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Advance your career by exploring curated job opportunities matching your skills and goals.
              </p>
            </div>
          </div>

          {/* Employer / Job Provider Card */}
          <div 
            onClick={() => setSelectedType('employer')}
            className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border backdrop-blur-md flex flex-col justify-between overflow-hidden group ${
              selectedType === 'employer' 
                ? 'bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-slate-900/80 border-indigo-500 shadow-[0_0_25px_-5px_rgba(99,102,241,0.25)]' 
                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
            }`}
          >
            {/* Selection indicator badge */}
            <div className="absolute top-4 right-4">
              <CheckCircle2 
                size={20} 
                className={`transition-colors ${
                  selectedType === 'employer' ? 'text-indigo-400 opacity-100' : 'text-slate-700 opacity-40'
                }`} 
              />
            </div>

            <div>
              <div className="flex justify-start mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                  selectedType === 'employer' 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200'
                }`}>
                  <Building size={26} />
                </div>
              </div>

              <h3 className={`text-lg font-bold mb-2 transition-colors ${
                selectedType === 'employer' ? 'text-white' : 'text-slate-200'
              }`}>
                Job Provider
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                Streamline hiring, attract top technical talent, and build your dream team with powerful tools.
              </p>
            </div>
          </div>

        </div>

        {/* CTA Button */}
        <button
          onClick={handleSignup}
          disabled={!selectedType}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            selectedType 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.99] cursor-pointer' 
              : 'bg-slate-800/50 border border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span>Continue Registration</span>
          <ArrowRight size={16} />
        </button>

        {/* Footer Navigation Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-slate-800/60 gap-4 text-xs text-slate-400">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Link>

          <p className="text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors ml-1">
              Sign in
            </Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}; 

export default Signup;