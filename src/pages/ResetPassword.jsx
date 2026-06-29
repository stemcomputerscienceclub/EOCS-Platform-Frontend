import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Loading from '../components/Loading';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/resetpassword/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-page flex items-center justify-center bg-bg-primary">
      <div className="card max-w-md w-full p-8">
        <h2 className="section-title text-center glowing-text mb-8">Reset Password</h2>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-green-400">Password reset successfully! Redirecting to login...</p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error bg-opacity-10 border border-error text-error px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="password" className="form-label">New Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loading />
                  <span className="ml-2">Resetting...</span>
                </div>
              ) : 'Reset Password'}
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

export default ResetPassword;
