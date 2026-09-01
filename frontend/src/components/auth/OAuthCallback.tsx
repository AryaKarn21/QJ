import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');

    if (token && role) {
      // Store the token in local storage
      localStorage.setItem('token', token);
      
      // Dispatch auth change event to update the app state
      window.dispatchEvent(new Event('authChange'));

      // Redirect based on role
      if (role === 'jobseeker') {
        navigate('/');
      } else if (role === 'employer') {
        navigate('/employer/profile');
      } else if (role === 'admin' || role === 'superadmin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } else {
      // If no token or role, redirect to login
      navigate('/login');
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Completing Sign In...</h2>
        <p>Please wait while we sign you in with Google.</p>
      </div>
    </div>
  );
};

export default OAuthCallback;