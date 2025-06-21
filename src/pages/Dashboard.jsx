import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://eocs-platform-backend.onrender.com/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      const response = await api({
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
      const configResponse = await fetchWithRetry('/competition/config');
      console.log('Config response:', configResponse);
      
      if (!configResponse || !configResponse.success) {
        throw new Error('Invalid config response format');
      }
      
      const configData = configResponse.data;
      
      // Then get the user's status
      const statusResponse = await fetchWithRetry('/competition/status');
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
      const configResponse = await fetchWithRetry('/competition/config');
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
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading competition status...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-message" role="alert">
          <strong>Error: </strong>
          <span>{error}</span>
        </div>
      );
    }

    switch (competition.status) {
      case 'upcoming':
        return (
          <div className="status-card">
            <h3 className="status-title">Competition Starts In</h3>
            <div className="status-timer">{timeLeft}</div>
            <p className="status-info">
              Competition starts at {formatDateTime(competition.startTime)}
            </p>
          </div>
        );

      case 'in_progress_can_enter':
        return (
          <div className="status-card">
            <h3 className="status-title">Competition In Progress</h3>
            <div className="status-info">
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
          <div className="status-card">
            <h3 className="status-title">Entry Period Ended</h3>
            <p className="status-info">
              The competition is in progress but the entry period has ended.
              Next competition starts at {formatDateTime(competition.nextStartTime)}
            </p>
          </div>
        );

      case 'completed':
        return (
          <div className="status-card">
            <h3 className="status-title">Competition Completed</h3>
            <p className="status-info">
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
          <div className="status-card">
            <h3 className="status-title">Status Unavailable</h3>
            <p className="status-info">
              Unable to determine competition status. Please try again later.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">{competition.title}</h1>
        <p className="dashboard-welcome">Welcome, {user?.username || 'user'}</p>
      </div>

      {/* Status Card */}
      <div className="dashboard-section">
        {renderStatus()}
      </div>

      {/* Instructions Section */}
      <div className="dashboard-section">
        <h2 className="section-header">INSTRUCTIONS</h2>
        <div className="instructions-container">
          {/* Date & Time */}
          <div className="instruction-group">
            <h3 className="instruction-group-title">Exam Date & Time</h3>
            <ul className="instruction-list">
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Exam Date & Time: Saturday, June 21 at 5:00 PM (Duration: 2 hours)</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>You must begin the exam between 5:00 PM and 5:30 PM</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>If you join late, you will only have the remaining time until 7:00 PM</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>The form will automatically close and submit at 7:30 PM</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Any responses received after that time will not be accepted under any circumstances</span>
              </li>
            </ul>
          </div>

          {/* Format */}
          <div className="instruction-group">
            <h3 className="instruction-group-title">Exam Format</h3>
            <ul className="instruction-list">
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>30 questions total: 6 each in Physics, Math, Chemistry, Biology, and Programming</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Each subject includes:</span>
                <ul className="instruction-list nested">
                  <li className="instruction-item">
                    <span className="instruction-bullet">◦</span>
                    <span>3 easy questions – 1 point each</span>
                  </li>
                  <li className="instruction-item">
                    <span className="instruction-bullet">◦</span>
                    <span>2 moderate questions – 2 points each</span>
                  </li>
                  <li className="instruction-item">
                    <span className="instruction-bullet">◦</span>
                    <span>1 advanced question – 3 points</span>
                  </li>
                </ul>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Science questions are multiple choice</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Programming questions require code submission in Python or C++</span>
              </li>
            </ul>
          </div>

          {/* Rules */}
          <div className="instruction-group">
            <h3 className="instruction-group-title">Important Rules</h3>
            <ul className="instruction-list">
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Your screen will be monitored throughout the exam</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>You may only keep one browser tab open. Any tab switching will be logged and may result in disqualification</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>You must use a computer, laptop, or tablet. Phones are not recommended</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>You must have a stable internet connection and work from a quiet, distraction-free environment</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Use of AI tools or external help is prohibited</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>You may use a calculator</span>
              </li>
            </ul>
          </div>

          {/* Advice */}
          <div className="instruction-group">
            <h3 className="instruction-group-title">Advice for Participants</h3>
            <ul className="instruction-list">
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>You are not expected to solve all 30 questions. The exam is designed for a wide range of students, from early high school to undergraduate levels</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Focus on the subjects you're strongest in and manage your time carefully</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>Expect a mix of question difficulties—that's intentional!</span>
              </li>
            </ul>
          </div>

          {/* Additional Information */}
          <div className="instruction-group">
            <h3 className="instruction-group-title">Additional Information</h3>
            <ul className="instruction-list">
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>After the exam, top-performing students will be invited to the EOCS Training Round, a 10-day guided program to prepare for the next competition phases</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>If selected, you'll also be assigned to a team for the remaining rounds</span>
              </li>
              <li className="instruction-item">
                <span className="instruction-bullet">•</span>
                <span>If you face technical issues, please contact us immediately at: <a href="mailto:contact@eocs.net">contact@eocs.net</a></span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Competition Details Section */}
      <div className="dashboard-section">
        <h2 className="section-header">COMPETITION DETAILS</h2>
        <div className="competition-details">
          <div className="detail-item">
            <span className="detail-label">Start Time:</span>
            <span className="detail-value">{formatDateTime(competition.startTime)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Entry Deadline:</span>
            <span className="detail-value">{formatDateTime(competition.entranceDeadline)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">End Time:</span>
            <span className="detail-value">{formatDateTime(competition.absoluteEndTime)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Duration:</span>
            <span className="detail-value">
              {competition.competitionLength ? `${competition.competitionLength / 60} minutes` : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        © 2025 EOCS Competition Platform. All rights reserved.
      </div>
    </div>
  );
};

export default Dashboard; 