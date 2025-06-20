import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Results = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading for a better user experience
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Thank You for Participating!</h1>
        <div className="space-y-4">
          <p className="text-xl text-gray-300">
            Thank you for being part of EOCS 2025.
          </p>
          <p className="text-gray-400">
            Your participation has been recorded. Results will be announced soon.
          </p>
          <p className="text-gray-400">
            Stay tuned for more updates and future competitions!
          </p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results; 