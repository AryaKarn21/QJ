import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Logo from '../../assets/quickjobs.png';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary px-4 text-center">
      <Link to="/" className="mb-8">
        <img src={Logo} alt="QuickJob" className="h-10" />
      </Link>

      <ShieldAlert className="h-14 w-14 text-red-500 mb-4" />
      <h1 className="text-2xl font-semibold text-gray-900">You don't have access to this page</h1>
      <p className="mt-2 text-gray-600 max-w-md">
        Your account doesn't have permission to view this section. If you think this is a
        mistake, contact support or sign in with a different account.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
          Go back
        </button>
        <Link
          to="/"
          className="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;