import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '1rem', color: '#b0b0b0' }}>Loading...</p>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : children;
};

export default PublicRoute; 