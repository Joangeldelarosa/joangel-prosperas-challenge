import { useState, useCallback } from 'react';
import { authApi } from '../services/api';

interface AuthState {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => ({
    token: localStorage.getItem('token'),
    userId: localStorage.getItem('user_id'),
    isAuthenticated: !!localStorage.getItem('token'),
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login({ username, password });
      localStorage.setItem('token', response.token);
      setAuthState({ token: response.token, userId: null, isAuthenticated: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.register({ username, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user_id', response.user_id);
      setAuthState({ token: response.token, userId: response.user_id, isAuthenticated: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    setAuthState({ token: null, userId: null, isAuthenticated: false });
  }, []);

  return {
    ...authState,
    loading,
    error,
    login,
    register,
    logout,
    clearError: () => setError(null),
  };
}
