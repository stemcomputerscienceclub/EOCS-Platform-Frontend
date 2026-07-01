import React from 'react';
import ParticleNetwork from '../components/ParticleNetwork';

const Results = () => {
  return (
    <div style={{ background: '#1c1c1c', minHeight: 'calc(100vh - 3rem)', position: 'relative' }}>
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
              Thank you for being part of EOCS {new Date().getFullYear()}.
            </p>
            <p style={{ color: 'gray' }}>
              Your participation has been recorded. Results will be announced soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
