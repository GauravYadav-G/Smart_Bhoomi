/**
 * ═══════════════════════════════════════════════════════════════
 * SMARTBHOOMI — IPFS Storage Dashboard (Command Center)
 * ═══════════════════════════════════════════════════════════════
 *
 * Shows:
 *  • Total docs on IPFS, encrypted size, provider distribution
 *  • Integrity summary (intact / tampered / unverified)
 *  • Pending uploads & retry button
 *  • Batch integrity verification trigger
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCubes,
  FaShieldAlt,
  FaCloudUploadAlt,
  FaSyncAlt,
  FaCheckCircle,
  FaDatabase,
  FaLock,
  FaNetworkWired,
} from 'react-icons/fa';
import { documentAPI } from '../services/api';

const IPFSDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await documentAPI.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch IPFS stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Admin-only actions — silently check permission first
  const [isAdmin, setIsAdmin] = useState(false);

  // Detect admin status: try a lightweight admin call; if 401/403, user is not admin
  useEffect(() => {
    documentAPI.batchVerify && documentAPI.getStats()
      .then(() => {
        // If stats works, check if batch-verify is available by looking at user role
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const u = JSON.parse(storedUser);
            if (u.role === 'admin' || u.isAdmin) setIsAdmin(true);
          } catch (_) {}
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBatchVerify = async () => {
    setVerifying(true);
    setBatchResult(null);
    try {
      const res = await documentAPI.batchVerify();
      setBatchResult(res.data);
      fetchStats();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setIsAdmin(false); // hide buttons
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleRetryPending = async () => {
    setRetrying(true);
    try {
      await documentAPI.retryPending();
      fetchStats();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setIsAdmin(false);
      }
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <FaCubes style={{ color: '#06B6D4' }} /> IPFS Storage Dashboard
        </div>
        <p style={{ padding: 20, color: '#94A3B8' }}>Loading IPFS statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <FaCubes style={{ color: '#06B6D4' }} /> IPFS Storage Dashboard
        </div>
        <p style={{ padding: 20, color: '#94A3B8' }}>IPFS service unavailable. Ensure IPFS node or Pinata is configured.</p>
      </div>
    );
  }

  const { storage = {}, integrity = {} } = stats;

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaCubes style={{ color: '#06B6D4', fontSize: '1.2rem' }} />
          <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>IPFS Decentralised Storage</span>
        </div>
        <button onClick={fetchStats} style={styles.refreshBtn} title="Refresh stats">
          <FaSyncAlt />
        </button>
      </div>

      {/* Stats grid */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statBox, borderColor: '#06B6D4' }}>
          <FaDatabase style={{ color: '#06B6D4', fontSize: '1.4rem' }} />
          <div style={styles.statValue}>{storage?.totalDocumentsOnIPFS ?? 0}</div>
          <div style={styles.statLabel}>Documents on IPFS</div>
        </div>

        <div style={{ ...styles.statBox, borderColor: '#8B5CF6' }}>
          <FaLock style={{ color: '#8B5CF6', fontSize: '1.4rem' }} />
          <div style={styles.statValue}>{storage?.totalSizeMB ?? '0.00'} MB</div>
          <div style={styles.statLabel}>Encrypted Storage</div>
        </div>

        <div style={{ ...styles.statBox, borderColor: '#10B981' }}>
          <FaCheckCircle style={{ color: '#10B981', fontSize: '1.4rem' }} />
          <div style={styles.statValue}>{integrity?.intact ?? 0}</div>
          <div style={styles.statLabel}>Integrity Verified</div>
        </div>

        <div style={{ ...styles.statBox, borderColor: storage?.pendingUploads > 0 ? '#F59E0B' : '#CBD5E1' }}>
          <FaCloudUploadAlt style={{ color: storage?.pendingUploads > 0 ? '#F59E0B' : '#94A3B8', fontSize: '1.4rem' }} />
          <div style={styles.statValue}>{storage?.pendingUploads ?? 0}</div>
          <div style={styles.statLabel}>Pending Uploads</div>
        </div>
      </div>

      {/* Integrity summary */}
      <div style={styles.integritySection}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FaShieldAlt style={{ color: '#059669' }} /> Document Integrity
        </h4>
        <div style={styles.integrityBar}>
          {(integrity?.intact ?? 0) > 0 && (
            <div
              style={{
                ...styles.integritySegment,
                background: '#10B981',
                width: `${((integrity.intact / Math.max((integrity.intact + integrity.tampered + integrity.unverified), 1)) * 100)}%`,
              }}
              title={`${integrity.intact} intact`}
            />
          )}
          {(integrity?.tampered ?? 0) > 0 && (
            <div
              style={{
                ...styles.integritySegment,
                background: '#EF4444',
                width: `${((integrity.tampered / Math.max((integrity.intact + integrity.tampered + integrity.unverified), 1)) * 100)}%`,
              }}
              title={`${integrity.tampered} TAMPERED`}
            />
          )}
          {(integrity?.unverified ?? 0) > 0 && (
            <div
              style={{
                ...styles.integritySegment,
                background: '#94A3B8',
                width: `${((integrity.unverified / Math.max((integrity.intact + integrity.tampered + integrity.unverified), 1)) * 100)}%`,
              }}
              title={`${integrity.unverified} unverified`}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.72rem', color: '#64748B' }}>
          <span>🟢 Intact: {integrity?.intact ?? 0}</span>
          <span>🔴 Tampered: {integrity?.tampered ?? 0}</span>
          <span>⚪ Unverified: {integrity?.unverified ?? 0}</span>
        </div>
      </div>

      {/* Action buttons — admin only */}
      {isAdmin && (
        <div style={styles.actions}>
          <button
            onClick={handleBatchVerify}
            disabled={verifying}
            style={{ ...styles.actionBtn, background: verifying ? '#94A3B8' : '#0B3D91' }}
          >
            <FaNetworkWired /> {verifying ? 'Verifying...' : 'Batch Integrity Check'}
          </button>

          {(storage?.pendingUploads ?? 0) > 0 && (
            <button
              onClick={handleRetryPending}
              disabled={retrying}
              style={{ ...styles.actionBtn, background: retrying ? '#94A3B8' : '#F59E0B' }}
            >
              <FaSyncAlt /> {retrying ? 'Retrying...' : `Retry ${storage.pendingUploads} Pending`}
            </button>
          )}
        </div>
      )}

      {/* Batch verify result — admin only */}
      {isAdmin && batchResult && (
        <div style={{ padding: '12px 20px', fontSize: '0.78rem', color: batchResult.totalTampered > 0 ? '#DC2626' : '#059669', borderTop: '1px solid #E2E8F0' }}>
          <strong>
            {batchResult.totalTampered > 0
              ? `⚠️ ${batchResult.totalTampered} tampered document(s) detected!`
              : `✅ All ${batchResult.totalChecked} documents verified — integrity intact`}
          </strong>
          {batchResult.totalErrors > 0 && (
            <span style={{ color: '#94A3B8', marginLeft: 8 }}>({batchResult.totalErrors} unreachable)</span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Inline styles (no external CSS needed) ─────────────────
const styles = {
  card: {
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    marginBottom: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
    background: '#F8FAFC',
  },
  refreshBtn: {
    background: 'none',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    color: '#64748B',
    fontSize: '0.85rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    padding: '16px 20px',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '16px 12px',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    background: '#FAFAFA',
    borderTopWidth: 3,
  },
  statValue: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#0F172A',
    fontFamily: "'JetBrains Mono', monospace",
  },
  statLabel: {
    fontSize: '0.68rem',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'center',
  },
  integritySection: {
    padding: '12px 20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  integrityBar: {
    display: 'flex',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    background: '#E2E8F0',
  },
  integritySegment: {
    height: '100%',
    transition: 'width 0.3s ease',
    minWidth: 2,
  },
  actions: {
    display: 'flex',
    gap: 10,
    padding: '0 20px 16px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default IPFSDashboard;
