import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import axios from 'axios';

// Add throttle utility
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

const formatDateTime = (isoString) => {
  if (!isoString) {
    return 'Not set';
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', isoString);
      return 'Invalid date';
    }

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTimeZone,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const { startCompetition, hasActiveCompetition, currentCompetition } = useCompetition();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(null);
  const [competition, setCompetition] = useState({
    title: "EOCS Programming Competition 2024",
    startTime: null,
    entranceDeadline: null,
    absoluteEndTime: null,
    competitionLength: null,
    status: 'loading',
    instructions: [
      "Please read all instructions carefully before starting",
      "Once you start, your timer begins immediately",
      "You cannot pause the timer once you start",
      "Make sure you have a stable internet connection",
      "All code must be your own work",
      "Submit your solutions before your time runs out"
    ],
    debug: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add retry mechanism for API calls
  const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.data || undefined,
        ...options
      });
      return response.data;
    } catch (error) {
      if (retries > 0) {
        if (error.response?.status === 429) {
          // If rate limited, wait longer before retry
          await new Promise(resolve => setTimeout(resolve, delay * 2));
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  // Define loadDashboard outside of effects so it can be used by both
  const loadDashboard = async () => {
    setLoading(true);
    try {
      console.log('Loading dashboard...'); // Debug log
      
      // First get the competition config
      const configResponse = await fetchWithRetry('/api/competition/config');
      console.log('Config response:', configResponse);
      
      if (!configResponse || !configResponse.success) {
        throw new Error('Invalid config response format');
      }
      
      const configData = configResponse.data;
      
      // Then get the user's status
      const statusResponse = await fetchWithRetry('/api/competition/status');
      console.log('Status response:', statusResponse);
      
      // Update competition state with both config and status
      setCompetition(prev => ({
        ...prev,
        startTime: configData.startTime,
        entranceDeadline: configData.entranceDeadline,
        absoluteEndTime: configData.absoluteEndTime,
        competitionLength: configData.competitionLength,
        status: statusResponse.status === 'active' || statusResponse.status === 'completed' 
          ? statusResponse.status 
          : configData.status,
        currentServerTime: configData.currentServerTime,
        debug: configData.debug
      }));
      
      // Handle redirects based on status
      if (statusResponse.status === 'completed') {
        navigate('/results');
      } else if (statusResponse.status === 'active') {
        navigate('/competition');
      }
      
      setError(null);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Failed to load competition data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Add throttled version for timer updates
  const throttledLoadDashboard = React.useCallback(
    throttle(() => {
      if (user) {
        loadDashboard();
      }
    }, 5000), // Throttle to once every 5 seconds
    [user]
  );

  useEffect(() => {
    if (user) {
      loadDashboard();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!competition.startTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      let targetTime;

      switch (competition.status) {
        case 'upcoming':
          targetTime = new Date(competition.startTime).getTime();
          break;
        case 'in_progress_can_enter':
          targetTime = new Date(competition.entranceDeadline).getTime();
          break;
        default:
          clearInterval(timer);
          return;
      }

      const distance = targetTime - now;

      if (distance <= 0) {
        setTimeLeft(null);
        // Refresh competition status
        throttledLoadDashboard();
        clearInterval(timer);
      } else {
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [competition.startTime, competition.status, competition.entranceDeadline]);

  const handleStartCompetition = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if we're still allowed to enter
      const configResponse = await fetchWithRetry('/api/competition/config');
      if (!configResponse.success || configResponse.data.status !== 'in_progress_can_enter') {
        setError('Competition entry period has ended');
        setLoading(false);
        return;
      }

      // Start the competition using the context
      const response = await startCompetition();
      console.log('Competition start response:', response);
      
      if (response.questions && response.questions.length > 0) {
        // Clear any existing competition data from localStorage
        localStorage.removeItem('competition_answers');
        localStorage.removeItem('competition_answers_final');
        localStorage.removeItem('mock_results');
        
        // Wait for the competition context to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigate to competition page
        navigate('/competition');
      } else {
        setError('Failed to start competition: No questions available');
      }
    } catch (err) {
      console.error('Failed to start competition:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to start competition');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <div className="loading-spinner"></div>
          <p className="text-text-secondary">Loading competition status...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      );
    }

    switch (competition.status) {
      case 'upcoming':
        return (
          <div className="bg-bg-secondary rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-egyptian-gold mb-4">Competition Starts In</h3>
            <div className="text-4xl font-bold text-text-primary mb-4">{timeLeft}</div>
            <p className="text-text-secondary">
              Competition starts at {formatDateTime(competition.startTime)}
            </p>
          </div>
        );

      case 'in_progress_can_enter':
        return (
          <div className="bg-bg-secondary rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-egyptian-gold mb-4">Competition In Progress</h3>
            <div className="text-text-secondary mb-4">
              <p>Time remaining to enter: {timeLeft}</p>
              <p>Entry deadline: {formatDateTime(competition.entranceDeadline)}</p>
            </div>
            <button
              onClick={handleStartCompetition}
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Starting...' : 'Start Competition'}
            </button>
          </div>
        );

      case 'in_progress_cannot_enter':
        return (
          <div className="bg-bg-secondary rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-egyptian-gold mb-4">Entry Period Ended</h3>
            <p className="text-text-secondary">
              The competition is in progress but the entry period has ended.
              Next competition starts at {formatDateTime(competition.nextStartTime)}
            </p>
          </div>
        );

      case 'completed':
        return (
          <div className="bg-bg-secondary rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-egyptian-gold mb-4">Competition Completed</h3>
            <p className="text-text-secondary mb-4">
              You have completed the competition. View your results below.
            </p>
            <button
              onClick={() => navigate('/results')}
              className="btn btn-primary w-full"
            >
              View Results
            </button>
          </div>
        );

      default:
        return (
          <div className="bg-bg-secondary rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-egyptian-gold mb-4">Status Unavailable</h3>
            <p className="text-text-secondary">
              Unable to determine competition status. Please try again later.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-egyptian-gold mb-2">{competition.title}</h1>
          <p className="text-text-secondary">Welcome, {user?.username || 'Participant'}</p>
        </div>

        {/* Status Card */}
        <div className="mb-8">
          {renderStatus()}
        </div>

        {/* Instructions Card */}
        <div className="bg-bg-secondary rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-egyptian-gold mb-4">Instructions</h2>
          <ul className="space-y-3">
            {competition.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="text-egyptian-gold mr-2">•</span>
                <span className="text-text-secondary">{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Competition Details Card */}
        <div className="bg-bg-secondary rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-egyptian-gold mb-4">Competition Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-text-secondary">
                <span className="font-semibold">Start Time:</span>
                <br />
                {formatDateTime(competition.startTime)}
              </p>
            </div>
            <div>
              <p className="text-text-secondary">
                <span className="font-semibold">Entry Deadline:</span>
                <br />
                {formatDateTime(competition.entranceDeadline)}
              </p>
            </div>
            <div>
              <p className="text-text-secondary">
                <span className="font-semibold">End Time:</span>
                <br />
                {formatDateTime(competition.absoluteEndTime)}
              </p>
            </div>
            <div>
              <p className="text-text-secondary">
                <span className="font-semibold">Duration:</span>
                <br />
                {competition.competitionLength ? `${competition.competitionLength / 60} minutes` : 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 