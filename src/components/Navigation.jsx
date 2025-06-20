import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Don't show navigation on login page
  if ('/login' === location.pathname) {
    return null;
  }

  return (
    <nav className="bg-bg-secondary border-b border-border-primary sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold text-egyptian-gold">EOCS</span>
          </Link>

          {/* Auth Controls */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-text-secondary px-3 py-2 rounded-md bg-bg-tertiary">
                  {user.username || user.email}
                </span>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 