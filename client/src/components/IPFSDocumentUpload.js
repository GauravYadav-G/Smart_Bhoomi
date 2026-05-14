/**
 * IPFSDocumentUpload — 5-Stage IPFS Upload Pipeline with CID Display
 *
 * Features:
 *   1. 5-stage progress: Receive → Encrypt → Upload to IPFS → Pin → Blockchain Anchor
 *   2. Per-document CID display with copy button
 *   3. Integrity verification (re-hash check)
 *   4. Educational tooltip explaining IPFS + CID
 *   5. Batch upload support with overall progress
 *
 * Paper value: Demonstrates decentralized document storage pipeline
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FaFileAlt, FaLock, FaCloudUploadAlt, FaThumbtack, FaCubes,
  FaCheckCircle, FaSpinner, FaExclamationTriangle, FaCopy,
  FaInfoCircle, FaChevronDown, FaChevronUp, FaShieldAlt
} from 'react-icons/fa';

const STAGES = [
  { key: 'receive', label: 'Receive', icon: <FaFileAlt />, desc: 'Document received and validated' },
  { key: 'encrypt', label: 'AES-256', icon: <FaLock />, desc: 'Encrypted with AES-256-GCM' },
  { key: 'upload', label: 'IPFS Upload', icon: <FaCloudUploadAlt />, desc: 'Uploaded to IPFS network' },
  { key: 'pin', label: 'Pin', icon: <FaThumbtack />, desc: 'Pinned for persistence (3 nodes)' },
  { key: 'anchor', label: 'Blockchain', icon: <FaCubes />, desc: 'CID anchored on Bharat Land Chain' }
];

const IPFSDocumentUpload = ({
  files = [],         // Array of { name, size, type } or File objects
  uploading = false,
  progress = 0,       // 0-100 overall
  stageName = '',     // current stage key
  results = [],       // Array of { name, cid, status, error }
  onVerify            // callback(cid) to verify integrity
}) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const [verifying, setVerifying] = useState({});
  const [verified, setVerified] = useState({});

  /* Current stage index */
  const currentStageIdx = useMemo(() => {
    const idx = STAGES.findIndex(s => s.key === stageName);
    if (!uploading && results.length > 0) return STAGES.length; // all done
    return idx >= 0 ? idx : (uploading ? 0 : -1);
  }, [stageName, uploading, results]);

  /* Per-stage progress (simulate intra-stage) */
  const [stageProgress, setStageProgress] = useState({});
  useEffect(() => {
    if (!uploading) {
      if (results.length > 0) {
        const done = {};
        STAGES.forEach(s => { done[s.key] = 100; });
        setStageProgress(done);
      }
      return;
    }
    const sp = {};
    STAGES.forEach((s, i) => {
      if (i < currentStageIdx) sp[s.key] = 100;
      else if (i === currentStageIdx) sp[s.key] = Math.min(95, (progress % 20) * 5);
      else sp[s.key] = 0;
    });
    setStageProgress(sp);
  }, [uploading, currentStageIdx, progress, results]);

  const handleVerify = async (cid) => {
    if (!onVerify) return;
    setVerifying(prev => ({ ...prev, [cid]: true }));
    try {
      await onVerify(cid);
      setVerified(prev => ({ ...prev, [cid]: true }));
    } catch {
      setVerified(prev => ({ ...prev, [cid]: false }));
    } finally {
      setVerifying(prev => ({ ...prev, [cid]: false }));
    }
  };

  const allDone = !uploading && results.length > 0;
  const hasErrors = results.some(r => r.error || r.status === 'error');

  return (
    <div style={styles.container}>
      {/* ─── Header ─── */}
      <div style={styles.header}>
        <h4 style={styles.title}>
          <FaCloudUploadAlt style={{ color: '#0B3D91' }} />
          IPFS Decentralized Document Storage
        </h4>
        {allDone && !hasErrors && (
          <span style={styles.doneBadge}><FaCheckCircle /> All Documents Stored</span>
        )}
        {uploading && (
          <span style={styles.uploadingBadge}><FaSpinner className="fa-spin" /> Uploading...</span>
        )}
      </div>

      {/* ─── 5-Stage Pipeline ─── */}
      <div style={styles.pipeline}>
        {STAGES.map((stage, i) => {
          const prog = stageProgress[stage.key] || 0;
          const done = prog >= 100;
          const active = i === currentStageIdx && uploading;
          return (
            <div key={stage.key} style={styles.stageItem}>
              <div style={{
                ...styles.stageCircle,
                background: done ? '#059669' : active ? '#0B3D91' : '#E2E8F0',
                color: (done || active) ? '#FFF' : '#94A3B8',
                boxShadow: active ? '0 0 0 4px rgba(11,61,145,0.2)' : 'none'
              }}>
                {done ? <FaCheckCircle /> : active ? <FaSpinner className="fa-spin" style={{ fontSize: 12 }} /> : stage.icon}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: done ? '#059669' : active ? '#0B3D91' : '#94A3B8' }}>
                  {stage.label}
                </div>
                {active && <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{stage.desc}</div>}
              </div>
              {/* connector line */}
              {i < STAGES.length - 1 && (
                <div style={{ ...styles.connector, background: done ? '#059669' : '#E2E8F0' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Overall progress bar ─── */}
      {uploading && (
        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0B3D91' }}>{Math.round(progress)}%</span>
        </div>
      )}

      {/* ─── File list / results ─── */}
      {(files.length > 0 || results.length > 0) && (
        <div style={styles.fileSection}>
          <h5 style={{ margin: '0 0 8px', fontSize: 13, color: '#0F172A' }}>
            Documents ({results.length > 0 ? results.length : files.length})
          </h5>
          {(results.length > 0 ? results : files.map(f => ({ name: f.name || f, status: uploading ? 'uploading' : 'queued' }))).map((item, i) => {
            const name = item.name || `Document ${i + 1}`;
            const cid = item.cid || item.hash;
            const isError = item.error || item.status === 'error';
            const isDone = cid && !isError;
            return (
              <div key={i} style={{ ...styles.fileRow, borderLeft: `3px solid ${isError ? '#DC2626' : isDone ? '#059669' : '#D97706'}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                  {cid && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <code style={{ fontSize: 11, color: '#0B3D91', overflow: 'hidden', textOverflow: 'ellipsis' }}>CID: {cid}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(cid)}
                        style={styles.copyBtn}
                        title="Copy CID"
                      >
                        <FaCopy />
                      </button>
                    </div>
                  )}
                  {isError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>Error: {item.error || 'Upload failed'}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {isDone && (
                    <button
                      onClick={() => handleVerify(cid)}
                      disabled={verifying[cid]}
                      style={{
                        ...styles.verifyBtn,
                        background: verified[cid] === true ? '#ECFDF5' : verified[cid] === false ? '#FEF2F2' : '#F1F5F9',
                        color: verified[cid] === true ? '#059669' : verified[cid] === false ? '#DC2626' : '#334155',
                        borderColor: verified[cid] === true ? '#A7F3D0' : verified[cid] === false ? '#FECACA' : '#E2E8F0'
                      }}
                    >
                      {verifying[cid] ? <FaSpinner className="fa-spin" /> :
                        verified[cid] === true ? <><FaCheckCircle /> Verified</> :
                        verified[cid] === false ? <><FaExclamationTriangle /> Failed</> :
                        <><FaShieldAlt /> Verify</>
                      }
                    </button>
                  )}
                  {isDone && <FaCheckCircle style={{ color: '#059669' }} />}
                  {!isDone && !isError && <FaSpinner className="fa-spin" style={{ color: '#D97706' }} />}
                  {isError && <FaExclamationTriangle style={{ color: '#DC2626' }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Educational info ─── */}
      <button type="button" onClick={() => setInfoOpen(!infoOpen)} style={styles.infoToggle}>
        <FaInfoCircle style={{ color: '#0B3D91' }} />
        <span>How does IPFS decentralized storage work?</span>
        {infoOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {infoOpen && (
        <div style={styles.infoBox}>
          <p><strong>IPFS (InterPlanetary File System)</strong> is a content-addressed storage protocol.
            Each document is identified by its <strong>CID (Content Identifier)</strong> — a SHA-256 hash of the file content.</p>
          <p style={{ marginTop: 6 }}>SmartBhoomi's 5-stage pipeline:</p>
          <ol style={{ marginTop: 4, paddingLeft: 20, fontSize: 12, lineHeight: 1.8 }}>
            <li><strong>Receive:</strong> Document validated (type, size, format)</li>
            <li><strong>Encrypt:</strong> AES-256-GCM encryption with owner-specific key</li>
            <li><strong>Upload:</strong> Encrypted blob uploaded to IPFS network</li>
            <li><strong>Pin:</strong> CID pinned across 3 IPFS nodes for persistence</li>
            <li><strong>Anchor:</strong> CID written to Bharat Land Chain for immutable proof</li>
          </ol>
          <p style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, background: '#F1F5F9', padding: 8, borderRadius: 6 }}>
            CID = base58(SHA-256(AES-256-GCM(document)))<br />
            Tamper detection: any byte change → completely different CID
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── styles ─── */
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { margin: 0, fontSize: 15, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 },
  doneBadge: { display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#ECFDF5', color: '#059669', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #A7F3D0' },
  uploadingBadge: { display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#FFFBEB', color: '#D97706', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #FDE68A' },
  pipeline: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0, padding: '10px 0', position: 'relative' },
  stageItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', flex: 1 },
  stageCircle: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all .3s' },
  connector: { position: 'absolute', top: 16, left: '60%', width: '80%', height: 3, borderRadius: 2 },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #0B3D91, #059669)', borderRadius: 3, transition: 'width .3s' },
  fileSection: { background: '#FAFAFA', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0' },
  fileRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#FFF', borderRadius: 8, marginBottom: 6 },
  copyBtn: { background: 'none', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10, color: '#64748B' },
  verifyBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500, background: '#F1F5F9' },
  infoToggle: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#334155', fontWeight: 500 },
  infoBox: { padding: '14px 16px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE', fontSize: 13, color: '#1E40AF', lineHeight: 1.6 },
};

export default IPFSDocumentUpload;
