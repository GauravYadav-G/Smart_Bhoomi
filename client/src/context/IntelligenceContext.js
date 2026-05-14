/**
 * AI Intelligence Context Provider
 * Fetches REAL data from /api/intelligence endpoints
 * P2P Architecture: All analytics accessible to all authenticated users
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { intelligenceAPI } from '../services/api';
import { useAuth } from './AuthContext';

const IntelligenceContext = createContext();

export const useIntelligence = () => {
  const context = useContext(IntelligenceContext);
  if (!context) {
    throw new Error('useIntelligence must be used within IntelligenceProvider');
  }
  // Signal that a consumer is mounted — triggers lazy data fetch
  if (!context._initialized && context._triggerInit) {
    context._triggerInit();
  }
  return context;
};

export const IntelligenceProvider = ({ children }) => {
  const { user } = useAuth();
  const [systemAnalytics, setSystemAnalytics] = useState(null);
  const [workflowSuggestions, setWorkflowSuggestions] = useState([]);
  const [priorityTasks, setPriorityTasks] = useState([]);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const isAuthenticated = !!user;

  // ─── FETCH SYSTEM ANALYTICS (all authenticated users) ───
  const fetchSystemAnalytics = useCallback(async () => {
    try {
      const response = await intelligenceAPI.getSystemAnalytics();
      if (response.data?.success) {
        setSystemAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Analytics:', error.message);
    }
  }, []);

  // ─── FETCH WORKFLOW SUGGESTIONS ───
  const fetchWorkflowSuggestions = useCallback(async () => {
    try {
      const response = await intelligenceAPI.getWorkflowSuggestions();
      if (response.data?.success) {
        setWorkflowSuggestions(response.data.suggestions || []);
      }
    } catch (error) {
      console.error('Suggestions:', error.message);
    }
  }, []);

  // ─── FETCH PRIORITY TASKS ───
  const fetchPriorityTasks = useCallback(async () => {
    try {
      const response = await intelligenceAPI.getPriorityTasks();
      if (response.data?.success) {
        setPriorityTasks(response.data.tasks || []);
      }
    } catch (error) {
      console.error('Tasks:', error.message);
    }
  }, []);

  // ─── FETCH RISK ALERTS ───
  const fetchRiskAlerts = useCallback(async () => {
    try {
      const response = await intelligenceAPI.getRiskAlerts();
      if (response.data?.success) {
        setRiskAlerts(response.data.alerts || []);
      }
    } catch (error) {
      console.error('Alerts:', error.message);
    }
  }, []);

  // ─── PREDICT APPROVAL TIME ───
  const predictApprovalTime = useCallback(async (propertyId) => {
    try {
      const response = await intelligenceAPI.predictApprovalTime(propertyId);
      if (response.data?.success) {
        return response.data.prediction;
      }
      return null;
    } catch (error) {
      console.error('Prediction failed:', error.message);
      return null;
    }
  }, []);

  // ─── CALCULATE RISK SCORE ───
  const calculateRiskScore = useCallback(async (entityType, entityId) => {
    try {
      const response = await intelligenceAPI.getPropertyRiskScore(entityId);
      if (response.data?.success) {
        return response.data.riskAssessment;
      }
      return null;
    } catch (error) {
      console.error('Risk score failed:', error.message);
      return null;
    }
  }, []);

  // ─── INVESTIGATE ALERT (available to all users) ───
  const investigateAlert = useCallback(async (alertType, entityId) => {
    try {
      const response = await intelligenceAPI.investigateAlert(alertType, entityId);
      if (response.data?.success) {
        return response.data.investigation;
      }
      return null;
    } catch (error) {
      console.error('Investigation failed:', error.message);
      return null;
    }
  }, []);

  // ─── PROPERTY ANALYSIS ───
  const getPropertyAnalysis = useCallback(async (propertyId) => {
    try {
      const response = await intelligenceAPI.getPropertyAnalysis(propertyId);
      if (response.data?.success) {
        return response.data.analysis;
      }
      return null;
    } catch (error) {
      console.error('Property analysis failed:', error.message);
      return null;
    }
  }, []);

  // ─── LAZY INITIALIZE ───
  useEffect(() => {
    if (!initialized || !isAuthenticated) {
      setSystemAnalytics(null);
      setWorkflowSuggestions([]);
      setPriorityTasks([]);
      setRiskAlerts([]);
      return;
    }

    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        fetchWorkflowSuggestions(),
        fetchSystemAnalytics(),
        fetchPriorityTasks(),
        fetchRiskAlerts()
      ]);
      setLoading(false);
    };

    initialize();

    // Refresh every 5 minutes — all data for all users
    const interval = setInterval(() => {
      fetchWorkflowSuggestions();
      fetchSystemAnalytics();
      fetchPriorityTasks();
      fetchRiskAlerts();
    }, 300000);

    return () => clearInterval(interval);
  }, [initialized, isAuthenticated, fetchWorkflowSuggestions, fetchSystemAnalytics, fetchPriorityTasks, fetchRiskAlerts]);

  const triggerInit = useCallback(() => {
    if (!initialized) setInitialized(true);
  }, [initialized]);

  const value = {
    systemAnalytics,
    workflowSuggestions,
    priorityTasks,
    riskAlerts,
    loading,

    _initialized: initialized,
    _triggerInit: triggerInit,

    predictApprovalTime,
    calculateRiskScore,
    investigateAlert,
    getPropertyAnalysis,
    refreshAnalytics: fetchSystemAnalytics,
    refreshSuggestions: fetchWorkflowSuggestions,
    refreshTasks: fetchPriorityTasks,
    refreshAlerts: fetchRiskAlerts
  };

  return (
    <IntelligenceContext.Provider value={value}>
      {children}
    </IntelligenceContext.Provider>
  );
};

export default IntelligenceContext;
