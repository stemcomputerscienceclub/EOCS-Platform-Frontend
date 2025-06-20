import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home">
      <section className="hero">
        <h1>Welcome to the Competition Platform</h1>
        <p className="subtitle">
          A secure platform for participating in online competitions
        </p>
      </section>
    </div>
  );
};

export default Home; 