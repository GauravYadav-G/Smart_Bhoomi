import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { adminAuthAPI } from '../services/adminApi';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider');
  return ctx;
};

export const AdminAuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdmin = async () => {
      if (token) {
        try {
          const res = await adminAuthAPI.getProfile();
          setAdmin(res.data.admin);
          localStorage.setItem('admin_user', JSON.stringify(res.data.admin));
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    loadAdmin();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loginSuccess = useCallback((tkn, adminData) => {
    localStorage.setItem('admin_token', tkn);
    localStorage.setItem('admin_user', JSON.stringify(adminData));
    setToken(tkn);
    setAdmin(adminData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setAdmin(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await adminAuthAPI.getProfile();
      setAdmin(res.data.admin);
      localStorage.setItem('admin_user', JSON.stringify(res.data.admin));
    } catch { /* ignore */ }
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      admin, token, loading,
      isAuthenticated: !!token,
      loginSuccess, logout, refreshProfile
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
