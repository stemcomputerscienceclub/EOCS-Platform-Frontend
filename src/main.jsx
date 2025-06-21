import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from './context/AuthContext';
import { CompetitionProvider } from './context/CompetitionContext';
import router from './router';

// Import styles
import './styles/main.css';
import './index.css';

// Configure axios defaults
const isProduction = import.meta.env.PROD;
axios.defaults.baseURL = isProduction 
  ? 'https://eocs-platform-backend.onrender.com'
  : 'http://localhost:5000';
axios.defaults.withCredentials = true;

// Add request interceptor for authorization
axios.interceptors.request.use(
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

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the app
root.render(
  <React.StrictMode>
    <AuthProvider>
      <CompetitionProvider>
        <RouterProvider router={router} />
      </CompetitionProvider>
    </AuthProvider>
  </React.StrictMode>
);
