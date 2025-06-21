import React, { useState, useEffect, useCallback } from 'react';

const Timer = ({ endTime, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(null);

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

    let intervalId = null;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        clearInterval(intervalId);
        setTimeLeft('Time Up!');
        onTimeUp?.();
        return;
      }

      setTimeLeft(formatTime(remaining));

      // Switch to more frequent updates in the last 30 seconds
      if (remaining <= 30000 && intervalId) {
        clearInterval(intervalId);
        intervalId = setInterval(updateTimer, 100);
      }
    };

    // Initial update
    updateTimer();

    // Start with 1-second updates
    intervalId = setInterval(updateTimer, 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [endTime, formatTime, onTimeUp]);

  return (
    <div className="timer">
      <div className="label">Time Remaining</div>
      <div className="value">{timeLeft}</div>
    </div>
  );
};

export default Timer; 