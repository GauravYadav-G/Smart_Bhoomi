import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

// Session timeout configuration (in milliseconds)
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const INACTIVITY_CHECK_INTERVAL = 1000; // Check every 1 second

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
  const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_TIMEOUT);
  
  // Refs for tracking activity and timeouts
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.user);
          setBiometricAuthEnabled(response.data.user.biometricAuthEnabled !== false);
          // Reset last activity on successful user load
          lastActivityRef.current = Date.now();
        } catch (error) {
          console.error('Failed to load user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // ═══════════════════════════════════════════════════════════════════
  // SESSION TIMEOUT & INACTIVITY MONITORING
  // ═══════════════════════════════════════════════════════════════════
  
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    setSessionTimeoutWarning(false);
    setTimeRemaining(SESSION_TIMEOUT);
    
    // Clear existing timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    
    if (!token) return;
    
    // Show warning 1 minute before timeout (9 minutes of inactivity)
    warningTimerRef.current = setTimeout(() => {
      setSessionTimeoutWarning(true);
      console.warn('⏱️ Session timeout warning: 1 minute remaining');
    }, SESSION_TIMEOUT - 60000);
    
    // Logout after 10 minutes of inactivity
    inactivityTimerRef.current = setTimeout(() => {
      console.warn('⏱️ Session expired due to inactivity');
      logout();
    }, SESSION_TIMEOUT);
  };

  // Set up activity event listeners for user interactions
  useEffect(() => {
    if (!token) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      return;
    }

    // Track user activity on various events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // Only reset timer if at least 1 second has passed since last activity
      if (timeSinceLastActivity > 1000) {
        resetInactivityTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timer setup
    resetInactivityTimer();

    // Update time remaining every second for display
    const countdownInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, SESSION_TIMEOUT - elapsed);
      setTimeRemaining(remaining);
    }, 1000);

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      clearInterval(countdownInterval);
    };
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
    // Clear timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setBiometricAuthEnabled(true);
    setSessionTimeoutWarning(false);
    setTimeRemaining(SESSION_TIMEOUT);
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

  const extendSession = () => {
    setSessionTimeoutWarning(false);
    resetInactivityTimer();
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
    // Session timeout features
    sessionTimeoutWarning,
    timeRemaining,
    extendSession,
    SESSION_TIMEOUT,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
