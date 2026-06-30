import { useState, useCallback, useRef, useEffect } from 'react';

export default function ProctoringOverlay({ webcamRef, cameraActive, audioActive, error, audioError }) {
  const [pos, setPos] = useState({ x: null, y: null });
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    offsetRef.current = {
      x: e.clientX - (dragRef.current?.offsetLeft || 0),
      y: e.clientY - (dragRef.current?.offsetTop || 0),
    };
    const onMove = (ev) => {
      setPos({ x: ev.clientX - offsetRef.current.x, y: ev.clientY - offsetRef.current.y });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div
      ref={dragRef}
      style={{
        position: 'fixed',
        bottom: pos ? undefined : '1rem',
        right: pos ? undefined : '1rem',
        left: pos ? pos.x : undefined,
        top: pos ? pos.y : undefined,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        cursor: 'grab',
      }}
    >
      {error && (
        <div style={{
          background: '#dc2626',
          color: 'white',
          fontSize: '0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        }}>
          {error}
        </div>
      )}

      {audioError && (
        <div style={{
          background: '#f59e0b',
          color: 'white',
          fontSize: '0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        }}>
          {audioError}
        </div>
      )}

      {/* Camera panel */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          background: '#111827',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
          border: cameraActive ? '2px solid rgba(59, 130, 246, 0.5)' : '2px solid transparent',
          width: '12rem',
          opacity: cameraActive ? 1 : 0.4,
          transition: 'opacity 0.3s',
        }}
      >
        <div style={{
          background: '#1f2937',
          padding: '0.25rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            background: cameraActive ? '#22c55e' : '#6b7280',
          }} />
          <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 500 }}>Camera</span>
        </div>
        <video
          ref={webcamRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '9rem',
            objectFit: 'cover',
            display: cameraActive ? 'block' : 'none',
          }}
        />
        {!cameraActive && (
          <div style={{
            height: '9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '0.75rem',
          }}>
            Camera inactive
          </div>
        )}
      </div>

      {/* Audio panel */}
      <div style={{
        background: '#111827',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        border: audioActive ? '2px solid rgba(139, 92, 246, 0.5)' : '2px solid transparent',
        width: '12rem',
        opacity: audioActive ? 1 : 0.4,
        transition: 'opacity 0.3s',
      }}>
        <div style={{
          background: '#1f2937',
          padding: '0.375rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            background: audioActive ? '#ef4444' : '#6b7280',
            animation: audioActive ? 'pulse 1s infinite' : 'none',
          }} />
          <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 500 }}>Audio</span>
        </div>
        <div style={{
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: audioActive ? '#22c55e' : '#6b7280',
          fontSize: '0.75rem',
        }}>
          {audioActive ? 'Recording...' : 'Off'}
        </div>
      </div>
    </div>
  );
}
