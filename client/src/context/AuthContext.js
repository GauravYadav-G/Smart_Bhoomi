import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [biometricAuthEnabled, setBiometricAuthEnabled] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.user);
          setBiometricAuthEnabled(response.data.user.biometricAuthEnabled !== false);
        } catch (error) {
          console.error('Failed to load user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      // Check if biometric required
      if (response.data.requiresBiometric) {
        return {
          requiresBiometric: true,
          userId: response.data.userId,
          biometricSteps: response.data.biometricSteps,
          biometricSessionId: response.data.biometricSessionId
        };
      }
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginWithOtp = async (userId, otp) => {
    try {
      const response = await authAPI.verifyEmailOtp({ userId, otp });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('OTP login failed:', error);
      throw error;
    }
  };

  const nomineeLogin = async (originalEmail, nomineeEmail, passphrase) => {
    try {
      const response = await authAPI.nomineeLogin({ originalEmail, nomineeEmail, passphrase });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...user, isNomineeAccess: true }));
      setToken(token);
      setUser({ ...user, isNomineeAccess: true });
      return { success: true };
    } catch (error) {
      console.error('Nominee login failed:', error);
      throw error;
    }
  };

  const loginWithToken = (authToken, userData) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token: authToken, user: userData2 } = response.data;
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData2));
      setToken(authToken);
      setUser(userData2);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      const msg = error.response?.data?.message || error.message || 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setBiometricAuthEnabled(true);
  };

  const toggleBiometricAuth = async (enabled) => {
    try {
      const response = await authAPI.toggleBiometricAuth({ enabled });
      setBiometricAuthEnabled(response.data.biometricAuthEnabled);
      return response.data;
    } catch (error) {
      console.error('Failed to toggle biometric auth:', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithToken,
    loginWithOtp,
    nomineeLogin,
    register,
    logout,
    isAuthenticated: !!token,
    biometricAuthEnabled,
    toggleBiometricAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
