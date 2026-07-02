import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Competition from './pages/Competition';
import Results from './pages/Results';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import ErrorBoundary from './components/ErrorBoundary';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />} errorElement={<ErrorBoundary />}>
      <Route
        index
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="competition"
        element={
          <PrivateRoute>
            <Competition />
          </PrivateRoute>
        }
      />
      <Route
        path="results"
        element={
          <PrivateRoute>
            <Results />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_normalizeFormMethod: true
    }
  }
);

export default router; 