import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

const axiosRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    // Don't retry on 401 unauthorized - user is simply not logged in
    if (error.response?.status === 401) {
      throw error;
    }
    
    if (retries > 0) {
      console.log(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    try {
      const response = await axiosRetry(() => api.get('/auth/me'));
      setUser(response.data);
      setError(null);
    } catch (error) {
      // Only log error if it's not a 401
      if (error.response?.status !== 401) {
        console.error('Auth check error:', error);
      }
      setUser(null);
      if (error.response?.status !== 401) {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axiosRetry(() => 
        api.post('/auth/login', { username, password })
      );
      
      // Store the token in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      
      setUser(response.data.user);
      setError(null);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.get('/auth/logout');
      // Clear token from localStorage
      localStorage.removeItem('token');
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server request fails, clear the local state
      localStorage.removeItem('token');
      setUser(null);
      setError(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    // Only check auth if we don't have a user
    if (!user) {
      checkAuth();
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 