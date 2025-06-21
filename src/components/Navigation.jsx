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
    <nav className="nav">
      {/* Logo */}
      <Link to="/" className="nav-brand">
        <span className="nav-logo">EOCS</span>
      </Link>

      {/* Navigation Links */}
      <div className="nav-links">
       
      {/* Auth Controls */}
      <div className="nav-auth">
        {user ? (
          <>
            <span className="nav-user">
              {user.username || user.email}
            </span>
            |
            <button onClick={handleLogout} className="nav-logout">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-logout">
            Login
          </Link>
        )}
      </div>
        </div>
    </nav>
  );
} 