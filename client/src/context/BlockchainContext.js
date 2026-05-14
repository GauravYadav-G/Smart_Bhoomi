import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { blockchainAPI } from '../services/api';
import { useAuth } from './AuthContext';

const BlockchainContext = createContext();

const SOCKET_URL = 'http://localhost:5001';

export const BlockchainProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  
  const [connected, setConnected] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [validators, setValidators] = useState([]);
  const [chainIntegrity, setChainIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);

  // Connect WebSocket
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      // Request initial data
      socket.emit('request:networkStatus');
      socket.emit('request:recentBlocks');
      socket.emit('request:recentTransactions');
      socket.emit('request:validators');
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => {
      setConnected(false);
      setError('WebSocket connection failed');
    });

    // Real-time events
    socket.on('block:new', (block) => {
      setRecentBlocks(prev => [block, ...prev].slice(0, 20));
      addLiveEvent({ type: 'block', data: block, timestamp: new Date() });
    });

    socket.on('transaction:new', (tx) => {
      setRecentTransactions(prev => [tx, ...prev].slice(0, 50));
      addLiveEvent({ type: 'transaction', data: tx, timestamp: new Date() });
    });

    socket.on('network:status', (status) => setNetworkStatus(status));
    socket.on('network:heartbeat', (status) => setNetworkStatus(status));
    socket.on('blocks:recent', (blocks) => setRecentBlocks(blocks));
    socket.on('validators:list', (vals) => setValidators(Array.isArray(vals) ? vals : []));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const addLiveEvent = useCallback((event) => {
    setLiveEvents(prev => [event, ...prev].slice(0, 100));
  }, []);

  // Initial data fetch via REST API
  const fetchBlockchainData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [statusRes, blocksRes, txRes] = await Promise.all([
        blockchainAPI.getNetworkStatus(),
        blockchainAPI.getRecentBlocks(10),
        blockchainAPI.getRecentTransactions(20)
      ]);
      setNetworkStatus(statusRes.data.network || statusRes.data.data || statusRes.data);
      setRecentBlocks(blocksRes.data.blocks || blocksRes.data.data || (Array.isArray(blocksRes.data) ? blocksRes.data : []));
      setRecentTransactions(txRes.data.transactions || txRes.data.data || (Array.isArray(txRes.data) ? txRes.data : []));

      if (user) {
        try {
          const [intRes, valRes] = await Promise.all([
            blockchainAPI.getChainIntegrity(),
            blockchainAPI.getValidators()
          ]);
          setChainIntegrity(intRes.data.data || intRes.data);
          const valPayload = valRes.data.data || valRes.data.validators || valRes.data;
          setValidators(Array.isArray(valPayload) ? valPayload : []);
        } catch (e) { /* Non-critical */ }
      }
    } catch (err) {
      setError('Failed to fetch blockchain data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBlockchainData();
  }, [fetchBlockchainData]);

  // API helpers
  const verifyProperty = useCallback(async (propertyId) => {
    const res = await blockchainAPI.verifyProperty(propertyId);
    return res.data;
  }, []);

  const getTransaction = useCallback(async (hash) => {
    const res = await blockchainAPI.getTransaction(hash);
    return res.data;
  }, []);

  const getBlock = useCallback(async (index) => {
    const res = await blockchainAPI.getBlock(index);
    return res.data;
  }, []);

  const getExplorerData = useCallback(async (page, limit) => {
    const res = await blockchainAPI.getExplorerData(page, limit);
    return res.data;
  }, []);

  const value = {
    connected,
    networkStatus,
    recentBlocks,
    recentTransactions,
    validators,
    chainIntegrity,
    liveEvents,
    loading,
    error,
    verifyProperty,
    getTransaction,
    getBlock,
    getExplorerData,
    refreshData: fetchBlockchainData
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
};

export const useBlockchain = () => {
  return useContext(BlockchainContext);
};
