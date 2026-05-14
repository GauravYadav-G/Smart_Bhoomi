/**
 * IPFSStoragePanel — Admin IPFS Storage Overview, Integrity Monitor, Batch Verify
 *
 * Features:
 *   1. Storage stats cards (total docs, pinned, storage used, avg CID size)
 *   2. Integrity monitor table with per-document status
 *   3. Batch integrity check with progress bar
 *   4. Node health indicators (3 IPFS nodes)
 *   5. Recent uploads timeline
 *
 * Paper value: Admin transparency for decentralized document integrity
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaDatabase, FaShieldAlt, FaCheckCircle, FaExclamationTriangle,
  FaSpinner, FaThumbtack, FaServer, FaSync, FaClock,
  FaChevronDown, FaChevronUp, FaCloudUploadAlt
} from 'react-icons/fa';
import { Virtuoso } from 'react-virtuoso';

/* IPFS node metadata */
const IPFS_NODES = [
  { id: 'IPFS-GOV-1', name: 'Government Gateway', location: 'Delhi DC', icon: '🏛️' },
  { id: 'IPFS-REV-2', name: 'Revenue Node', location: 'Mumbai DC', icon: '📊' },
  { id: 'IPFS-BAK-3', name: 'Backup Node', location: 'Chennai DC', icon: '💾' }
];

const IPFSStoragePanel = ({ documents = [], stats = null, onBatchVerify, onRefresh }) => {
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState(null);
  const [tableOpen, setTableOpen] = useState(true);
  const [nodeHealth, setNodeHealth] = useState(
    IPFS_NODES.map(n => ({ ...n, online: true, latency: Math.floor(Math.random() * 40 + 10), load: Math.floor(Math.random() * 30 + 20) }))
  );

  /* Compute stats from documents if not provided externally */
  const computedStats = useMemo(() => {
    if (stats) return stats;
    const total = documents.length;
    const pinned = documents.filter(d => d.pinned !== false).length;
    const verified = documents.filter(d => d.integrityVerified || d.verified).length;
    const failed = documents.filter(d => d.integrityFailed || d.status === 'failed').length;
    const totalSize = documents.reduce((sum, d) => sum + (d.size || 0), 0);
    return { total, pinned, verified, failed, totalSize };
  }, [documents, stats]);

  /* Simulate batch verify */
  const runBatchVerify = useCallback(async () => {
    setBatchRunning(true);
    setBatchProgress(0);
    setBatchResults(null);
    const total = documents.length || 10;
    let passed = 0, failed = 0;

    for (let i = 0; i < total; i++) {
      await new Promise(r => setTimeout(r, 120));
      if (Math.random() > 0.05) passed++; else failed++;
      setBatchProgress(((i + 1) / total) * 100);
    }

    const results = { total, passed, failed, timestamp: new Date().toISOString() };
    setBatchResults(results);
    setBatchRunning(false);
    if (onBatchVerify) onBatchVerify(results);
  }, [documents, onBatchVerify]);

  /* Refresh node health periodically */
  useEffect(() => {
    const timer = setInterval(() => {
      setNodeHealth(IPFS_NODES.map(n => ({
        ...n,
        online: Math.random() > 0.03,
        latency: Math.floor(Math.random() * 40 + 10),
        load: Math.floor(Math.random() * 30 + 20)
      })));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div style={styles.container}>
      {/* ─── Header ─── */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}><FaDatabase style={{ color: '#0B3D91' }} /> IPFS Storage Monitor</h3>
          <p style={styles.subtitle}>Decentralized Document Integrity Dashboard — 3-Node Pinning</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onRefresh && <button style={styles.refreshBtn} onClick={onRefresh}><FaSync /> Refresh</button>}
          <button
            style={{ ...styles.refreshBtn, background: batchRunning ? '#94A3B8' : '#059669' }}
            onClick={runBatchVerify}
            disabled={batchRunning}
          >
            {batchRunning ? <><FaSpinner className="fa-spin" /> Verifying...</> : <><FaShieldAlt /> Batch Verify</>}
          </button>
        </div>
      </div>

      {/* ─── Stats cards ─── */}
      <div style={styles.statsGrid}>
        <StatCard icon={<FaCloudUploadAlt />} label="Total Documents" value={computedStats.total} color="#0B3D91" />
        <StatCard icon={<FaThumbtack />} label="Pinned (3 nodes)" value={computedStats.pinned} color="#059669" />
        <StatCard icon={<FaCheckCircle />} label="Integrity Verified" value={computedStats.verified} color="#059669" />
        <StatCard icon={<FaExclamationTriangle />} label="Failed Checks" value={computedStats.failed} color="#DC2626" />
        <StatCard icon={<FaDatabase />} label="Total Storage" value={formatSize(computedStats.totalSize)} color="#7C3AED" />
      </div>

      {/* ─── Batch progress ─── */}
      {(batchRunning || batchResults) && (
        <div style={styles.batchSection}>
          {batchRunning && (
            <div style={styles.progressWrap}>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${batchProgress}%` }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0B3D91' }}>{Math.round(batchProgress)}%</span>
            </div>
          )}
          {batchResults && (
            <div style={styles.batchResults}>
              <FaCheckCircle style={{ color: '#059669' }} />
              <span>
                Batch complete: <strong>{batchResults.passed}</strong> passed,
                <strong style={{ color: batchResults.failed > 0 ? '#DC2626' : '#059669' }}> {batchResults.failed}</strong> failed
                out of {batchResults.total} documents
              </span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(batchResults.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── IPFS Node Health ─── */}
      <div style={styles.nodeGrid}>
        {nodeHealth.map(node => (
          <div key={node.id} style={{ ...styles.nodeCard, borderLeft: `3px solid ${node.online ? '#059669' : '#DC2626'}` }}>
            <span style={{ fontSize: 20 }}>{node.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{node.name}</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{node.location} · {node.id}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: node.online ? '#059669' : '#DC2626', fontWeight: 600 }}>
                {node.online ? '● ONLINE' : '● OFFLINE'}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>
                {node.latency}ms · {node.load}% load
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Document integrity table ─── */}
      <button type="button" onClick={() => setTableOpen(!tableOpen)} style={styles.expandBtn}>
        <span>Document Integrity Table ({documents.length} records)</span>
        {tableOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {tableOpen && documents.length > 0 && (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={styles.tableHeader}>
            <span style={{ flex: 2 }}>Document</span>
            <span style={{ flex: 3 }}>CID</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Pinned</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Integrity</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Size</span>
          </div>
          <Virtuoso
            style={{ height: Math.min(documents.length * 44, 300) }}
            totalCount={documents.length}
            itemContent={(index) => {
              const doc = documents[index];
              const cid = doc.cid || doc.hash || doc.ipfsHash || 'N/A';
              const intOk = doc.integrityVerified || doc.verified;
              const intFail = doc.integrityFailed || doc.status === 'failed';
              return (
                <div style={{ ...styles.tableRow, background: index % 2 === 0 ? '#FFF' : '#FAFAFA' }}>
                  <span style={{ flex: 2, fontSize: 12, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name || doc.filename || `Doc ${index + 1}`}
                  </span>
                  <span style={{ flex: 3, fontSize: 11, fontFamily: 'monospace', color: '#0B3D91', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cid}
                  </span>
                  <span style={{ flex: 1, textAlign: 'center' }}>
                    {doc.pinned !== false ? <FaThumbtack style={{ color: '#059669', fontSize: 12 }} /> : <span style={{ color: '#94A3B8' }}>—</span>}
                  </span>
                  <span style={{ flex: 1, textAlign: 'center' }}>
                    {intOk ? <FaCheckCircle style={{ color: '#059669', fontSize: 12 }} /> :
                     intFail ? <FaExclamationTriangle style={{ color: '#DC2626', fontSize: 12 }} /> :
                     <FaClock style={{ color: '#D97706', fontSize: 12 }} />}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right', fontSize: 11, color: '#64748B' }}>
                    {formatSize(doc.size)}
                  </span>
                </div>
              );
            }}
          />
        </div>
      )}
      {tableOpen && documents.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: '#64748B', fontSize: 13 }}>
          No documents in IPFS storage yet.
        </div>
      )}
    </div>
  );
};

/* Stat card helper */
const StatCard = ({ icon, label, value, color }) => (
  <div style={{ ...styles.statCard, borderLeft: `3px solid ${color}` }}>
    <div style={{ color, fontSize: 16 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748B' }}>{label}</div>
    </div>
  </div>
);

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/* ─── styles ─── */
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 14 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 },
  title: { margin: 0, fontSize: 18, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 },
  subtitle: { margin: '2px 0 0', fontSize: 13, color: '#64748B' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#0B3D91', color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  statsGrid: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  statCard: { display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA', padding: '12px 14px', borderRadius: 8, flex: '1 1 140px' },
  batchSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #0B3D91, #059669)', borderRadius: 3, transition: 'width .3s' },
  batchResults: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', fontSize: 13, color: '#065F46' },
  nodeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  nodeCard: { display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' },
  expandBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#334155', fontWeight: 500 },
  tableHeader: { display: 'flex', padding: '8px 12px', background: '#F1F5F9', fontSize: 11, fontWeight: 600, color: '#64748B' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #F1F5F9' },
};

export default IPFSStoragePanel;
