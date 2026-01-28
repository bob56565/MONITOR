import { useEffect, useState } from 'react';
import { authApi } from '../services/inferenceApi';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token already exists
        const token = localStorage.getItem('authToken');
        
        if (token) {
          // Token exists, we're authenticated
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // No token, auto-create a test user and login
        const testEmail = `testuser-${Date.now()}@monitor.local`;
        const testPassword = 'MonitorTestPass123!';

        try {
          // Try to signup
          const signupResult = await authApi.signup(testEmail, testPassword);
          if (signupResult.access_token) {
            setIsAuthenticated(true);
            setError(null);
          } else {
            setError('Signup failed, but login succeeded');
            setIsAuthenticated(true);
          }
        } catch (signupErr) {
          // Signup might fail if user exists, try login instead
          try {
            const loginResult = await authApi.login(testEmail, testPassword);
            if (loginResult.access_token) {
              setIsAuthenticated(true);
              setError(null);
            } else {
              setError('Login failed');
              setIsAuthenticated(false);
            }
          } catch (loginErr) {
            // If login also fails, we have a real problem
            setError(`Authentication failed: ${String(loginErr)}`);
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        setError(`Auth check failed: ${String(err)}`);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    logout,
  };
}
