import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import Navigation from '../components/Navigation';
import ParticleNetwork from '../components/ParticleNetwork';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Submitting login form with email:', formData.email);
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Failed to login';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        console.error('Server response:', err.response.data);
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-page flex items-center justify-center bg-bg-primary" style={{ position: 'relative' }}>
      <ParticleNetwork />
      <div className="flex flex-col items-center" style={{ position: 'relative', zIndex: 1 }}>
        <div className="text-center mb-8">
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#d4af37',
            textShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
            marginBottom: '0.5rem',
          }}>
            Welcome to EOCS
          </h1>
          <p style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.85rem',
            fontWeight: 400,
            color: '#b0b0b0',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            Egyptian Olympiad in Computational Science
          </p>
        </div>
        <div className="card max-w-md w-full p-8">

          <h2 className="login-form-title text-center glowing-text mb-8">
            Login to Your Account
          </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '2px solid rgb(220, 38, 38)', color: 'rgb(254, 226, 226)', padding: '0.75rem 1rem', borderRadius: '0.375rem' }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
              
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loading /> 
                <span className="ml-2">Logging in...</span>
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>

      </div>
      </div>
    </div>
  );
};

export default Login; 