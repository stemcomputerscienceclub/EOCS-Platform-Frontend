import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

const Home = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Add visible class to elements for animation
    const elements = document.querySelectorAll('.section-title, .card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    });

    elements.forEach(element => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-logo-container">
          <div className="logo-shield">
            <div className="logo-grid">
              <div className="logo-quadrant">
                <span className="logo-symbol">E</span>
              </div>
              <div className="logo-quadrant">
                <span className="logo-symbol">O</span>
              </div>
              <div className="logo-quadrant">
                <span className="logo-symbol">C</span>
              </div>
              <div className="logo-quadrant">
                <span className="logo-symbol">S</span>
              </div>
            </div>
          </div>
          <span className="logo-text">EOCS</span>
        </div>
        <h1 className="section-title glowing-text">Welcome to the Competition Platform</h1>
        <p className="subtitle animated-link">
          A secure platform for participating in online competitions
        </p>
        <div className="hero-buttons">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">
                Get Started
              </Link>
              <Link to="/about" className="btn btn-secondary">
                Learn More
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3>Secure Environment</h3>
            <p>State-of-the-art security measures to ensure fair competition</p>
          </div>
          <div className="card">
            <h3>Real-time Feedback</h3>
            <p>Instant results and performance metrics</p>
          </div>
          <div className="card">
            <h3>Multiple Formats</h3>
            <p>Support for various competition types and question formats</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 