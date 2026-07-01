import React, { useState, useEffect, useCallback, useRef } from 'react';

const Timer = ({ endTime, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  const formatTime = useCallback((milliseconds) => {
    if (milliseconds <= 0) return 'Time Up!';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (!endTime) return;

    let animationFrameId = null;
    let lastTimestamp = Date.now();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - lastTimestamp;
      lastTimestamp = now;

      const remaining = endTime - now;

      if (remaining <= 0) {
        setTimeLeft('Time Up!');
        onTimeUpRef.current?.();
        return;
      }

      setTimeLeft(formatTime(remaining));
      
      // Use requestAnimationFrame for smoother updates
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    // Initial update
    updateTimer();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [endTime, formatTime]);

  return (
    <div className="timer">
      <div className="label">Time Remaining</div>
      <div className="value">{timeLeft}</div>
    </div>
  );
};

export default Timer; 