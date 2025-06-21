import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CompetitionContext = createContext();

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

// Get competition length from environment variable or use default
const COMPETITION_LENGTH = import.meta.env.VITE_COMPETITION_LENGTH || 300; // seconds

export const CompetitionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [currentCompetition, setCurrentCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [hasActiveCompetition, setHasActiveCompetition] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [lastStatusCheck, setLastStatusCheck] = useState(null);

  // Memoize the status check function
  const checkStatus = useCallback(async () => {
    try {
      setError(null);

      // Check if there's an active participation
      const activeParticipation = localStorage.getItem('activeParticipation');
      
      const [statusResponse, configResponse] = await Promise.all([
        api.get('/competition/status'),
        api.get('/competition/config')
      ]);

      if (activeParticipation && statusResponse.data.status === 'not_started') {
        localStorage.removeItem('activeParticipation');
      }

      if (statusResponse.data.status === 'in_progress' && !activeParticipation) {
        setError('Another user is already participating in this competition');
        return false;
      }

      setLastStatusCheck(statusResponse.data);

      return {
        status: statusResponse.data.status,
        config: configResponse.data
      };
    } catch (error) {
      console.error('Error checking status:', error);
      setError(error.response?.data?.message || 'Failed to check competition status');
      return false;
    }
  }, []);

  // Memoize the fetch updates function
  const fetchUpdates = useCallback(async () => {
    if (!user || !hasActiveCompetition) return;

    try {
      const response = await api.get('/competition/progress');
      
      // Only update if there are actual changes
      setCurrentCompetition(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(response.data)) {
          return response.data;
        }
        return prev;
      });
      
      setLastUpdate(new Date());
      setIsConnected(true);
      setConnectionError(null);
      setLoading(false);
    } catch (error) {
      if (error.response?.status === 404) {
        setHasActiveCompetition(false);
      } else {
        console.error('Error fetching competition updates:', error);
        setConnectionError('Error fetching updates. Will retry...');
        setIsConnected(false);
      }
      setLoading(false);
    }
  }, [user, hasActiveCompetition]);

  // Set up polling with optimizations
  useEffect(() => {
    if (!user) return;

    let pollInterval;
    
    const poll = async () => {
      const isActive = await checkStatus();
      if (isActive) {
        await fetchUpdates();
      } else {
        setLoading(false);
      }
    };

    // Initial check
    poll();

    // Set up polling every 10 seconds instead of 5
    pollInterval = setInterval(poll, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [user, checkStatus, fetchUpdates]);

  // Memoize the start competition function
  const startCompetition = useCallback(async () => {
    try {
      const statusResponse = await api.get('/competition/status');
      if (statusResponse.data.status === 'in_progress') {
        throw new Error('You already have an active competition session');
      }

      const response = await api.post('/competition/start');
      
      if (response.data.questions && response.data.questions.length > 0) {
        setQuestions(response.data.questions);
        setCurrentCompetition(response.data.participation);
        setHasActiveCompetition(true);
        localStorage.setItem('activeParticipation', response.data.participation.id);
        return response.data;
      } else {
        throw new Error('No questions available');
      }
    } catch (error) {
      console.error('Error starting competition:', error);
      setError(error.response?.data?.message || error.message || 'Failed to start competition');
      throw error;
    }
  }, []);

  // Memoize the submit answer function
  const submitAnswer = useCallback(async (questionId, answer) => {
    try {
      const response = await api.post(`/competition/submit/${questionId}`, {
        answer,
        timestamp: new Date().toISOString()
      });
      
      // Only fetch updates if needed
      const shouldUpdate = await checkStatus();
      if (shouldUpdate) {
        await fetchUpdates();
      }
      
      return response.data;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }, [checkStatus, fetchUpdates]);

  // Memoize the context value
  const value = useMemo(() => ({
    isConnected,
    connectionError,
    currentCompetition,
    loading,
    error,
    lastUpdate,
    submitAnswer,
    fetchUpdates,
    startCompetition,
    hasActiveCompetition,
    questions
  }), [
    isConnected,
    connectionError,
    currentCompetition,
    loading,
    error,
    lastUpdate,
    submitAnswer,
    fetchUpdates,
    startCompetition,
    hasActiveCompetition,
    questions
  ]);

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error('useCompetition must be used within a CompetitionProvider');
  }
  return context;
};

export default CompetitionContext; 