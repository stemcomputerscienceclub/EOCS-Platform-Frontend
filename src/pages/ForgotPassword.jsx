import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgotpassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset email');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-page flex items-center justify-center bg-bg-primary">
      <div className="card max-w-md w-full p-8">
        <h2 className="section-title text-center glowing-text mb-8">Forgot Password</h2>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-gray-300">Check your email for a password reset link.</p>
            <Link to="/" className="text-blue-400 hover:text-blue-300">Back to Login</Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error bg-opacity-10 border border-error text-error px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                required
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loading />
                  <span className="ml-2">Sending...</span>
                </div>
              ) : 'Send Reset Link'}
            </button>

            <p className="text-center text-gray-400 mt-4">
              <Link to="/" className="text-blue-400 hover:text-blue-300">Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
