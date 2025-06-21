import axios from 'axios';

// Determine the API URL based on the environment
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'https://front-1-u2w0.onrender.com/api';
  }
  // For production on Vercel
  return `${process.env.NEXT_PUBLIC_API_URL}/api` || 'https://front-1-u2w0.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Increase timeout for development
  timeout: process.env.NODE_ENV === 'development' ? 10000 : 5000
});

// Add request interceptor for handling errors
api.interceptors.request.use(
  (config) => {
    // Add retry count to the config if it doesn't exist
    if (!config.retryCount) {
      config.retryCount = 0;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { config } = error;
    
    // Don't retry on 401 (unauthorized) or 403 (forbidden)
    if (error.response?.status === 401 || error.response?.status === 403) {
      return Promise.reject(error);
    }

    // Only retry if we haven't reached max retries
    if (config && !config.sent && config.retryCount < 3) {
      config.sent = true;
      config.retryCount += 1;

      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || 5;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return api.request(config);
      }

      // Handle network errors and other retryable errors
      if (!error.response || [500, 503].includes(error.response.status)) {
        const backoff = Math.min(Math.pow(2, config.retryCount) * 1000, 10000);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return api.request(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api; 