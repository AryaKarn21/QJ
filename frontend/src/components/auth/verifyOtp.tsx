import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie'; // Import js-cookie
import { MailCheck } from 'lucide-react'; // Icon for mail check

import { verifyOtp, resendOtp } from './authApi/authApi'; 

const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(60); // 60 seconds cooldown
  const [isResending, setIsResending] = useState<boolean>(false);
  // Removed isVerified state as we will redirect immediately

  // Effect to read email and name from cookies on component mount
  useEffect(() => {
    const emailFromCookie = Cookies.get('userEmail');
    const nameFromCookie = Cookies.get('userName');

    if (emailFromCookie) {
      setUserEmail(emailFromCookie);
      setUserName(nameFromCookie || 'User'); // Default to 'User' if name not found
    }

    // Start cooldown timer for resend OTP
    let timerId: NodeJS.Timeout;
    if (resendTimer > 0) {
      timerId = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(timerId); // Clean up timer on unmount
  }, [navigate, resendTimer]); // Added resendTimer to dependency array

  // Mutation for OTP verification
  const verifyOtpMutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      console.log('OTP Verification successful:', data);
      alert(data.message || 'Email verified successfully! You can now log in.');
      Cookies.remove('userName'); // Clear cookies after successful verification
      Cookies.remove('userEmail');
      navigate('/login'); // Immediately navigate to login page
    },
    onError: (error: any) => {
      console.error('OTP Verification failed:', error);
      alert(`OTP verification failed: ${error?.message || 'Invalid OTP or something went wrong.'}`);
    },
  });

  // Mutation for resending OTP
  const resendOtpMutation = useMutation({
    mutationFn: resendOtp, // Ensure this function exists in your auth.ts
    onSuccess: (data) => {
      console.log('Resend OTP successful:', data);
      alert(data.message || 'OTP sent again to your email.');
      setResendTimer(60); // Reset cooldown
      setIsResending(false);
    },
    onError: (error: any) => {
      console.error('Resend OTP failed:', error);
      alert(`Failed to resend OTP: ${error?.message || 'Please try again later.'}`);
      setIsResending(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      alert('Please enter the OTP.');
      return;
    }
    if (!userEmail) { // This check now triggers the alert and redirect
      alert('Email not found. Your session might have expired. Please register again.');
      navigate('/signup');
      return;
    }
    verifyOtpMutation.mutate({ email: userEmail, otp });
  };

  const handleResend = () => {
    if (resendTimer === 0 && !isResending && userEmail) {
      setIsResending(true);
      resendOtpMutation.mutate({ email: userEmail }); // Call resendOtp API
    } else if (!userEmail) { // Add this check for resend button as well
      alert('Email not found. Your session might have expired. Please register again.');
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-inter">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 sm:p-10 text-center">
        <MailCheck size={64} className="mx-auto mb-6 text-primary" />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Verify Your Email</h2>

        {userEmail ? (
          <p className="text-gray-600 mb-6">
            Hi <span className="font-semibold text-blue-700">{userName}</span>, a 6-digit OTP has been sent to your email address: <span className="font-semibold text-gray-800">{userEmail}</span>. Please enter it below.
          </p>
        ) : (
          <p className="text-red-500 mb-6">Loading email... If this persists, please try registering again.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="otp" className="sr-only">Enter OTP</label>
            <input
              type="text" id="otp" name="otp" value={otp} onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              pattern="\d{6}" // Ensures 6 digits
              inputMode="numeric" // Optimizes for numeric input on mobile
              placeholder="Enter 6-digit OTP"
              className="w-full px-4 py-2.5 text-center text-xl font-mono tracking-widest border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary transition-colors font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-lg"
            disabled={verifyOtpMutation.isPending || !userEmail}
          >
            {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
          </button>

          {verifyOtpMutation.isError && (
            <p className="text-red-500 text-sm mt-3">
              Error: {verifyOtpMutation.error.message || 'OTP verification failed.'}
            </p>
          )}
          {verifyOtpMutation.isSuccess && ( // This message will flash briefly before redirect
            <p className="text-green-600 text-center text-sm mt-3">
              OTP verified! Redirecting...
            </p>
          )}
        </form>

        <div className="mt-6 flex justify-center items-center gap-4 text-gray-600">
          <p className="text-sm">Didn't receive the OTP?</p>
          <button
            type="button"
            onClick={handleResend}
            className="text-blue-600 hover:text-blue-800 font-semibold disabled:text-gray-400 disabled:cursor-not-allowed"
            disabled={resendTimer > 0 || isResending || !userEmail}
          >
            {isResending ? 'Sending...' : (resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
