import { useEffect, useState } from 'react';
import { authApi } from '../services/inferenceApi';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        await authApi.ensureDemoAuth();
        setIsAuthenticated(true);
        setError(null);
      } catch (err) {
        setError(`Authentication failed: ${String(err)}`);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
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
