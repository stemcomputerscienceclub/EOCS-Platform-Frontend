import React from 'react';
import { useNavigate } from 'react-router-dom';
import ParticleNetwork from '../components/ParticleNetwork';

const Results = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#1c1c1c', minHeight: 'calc(100vh - 4rem)', position: 'relative' }}>
      <ParticleNetwork />
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1rem', position: 'relative', zIndex: 1 }}>
        <div style={{
          background: '#2a2a2a',
          borderRadius: '0.75rem',
          border: '2px solid #404040',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{
            color: '#d4af37',
            fontSize: '1.875rem',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
          }}>
            Thank You for Participating!
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '1.25rem', color: '#b0b0b0' }}>
              Thank you for being part of EOCS 2026.
            </p>
            <p style={{ color: 'gray' }}>
              Your participation has been recorded. Results will be announced soon.
            </p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#d4af37',
                color: '#1c1c1c',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
