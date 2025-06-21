import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from './context/AuthContext';
import { CompetitionProvider } from './context/CompetitionContext';
import router from './router';
import './index.css';

// Configure axios defaults
const isProduction = import.meta.env.PROD;
axios.defaults.baseURL = isProduction 
  ? 'https://eocs-competition-platform.vercel.app/api'
  : 'https://front-1-u2w0.onrender.com';
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CompetitionProvider>
        <RouterProvider router={router} />
      </CompetitionProvider>
    </AuthProvider>
  </React.StrictMode>
);
