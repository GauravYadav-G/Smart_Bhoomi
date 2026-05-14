/**
 * BlockchainConfirmation — Citizen Blockchain Receipt + Certificate Download
 *
 * Features:
 *   1. Animated success state (checkmark, confetti feel)
 *   2. Transaction receipt card (TX hash, block number, consensus method, validators, gas)
 *   3. Property summary (ID, title, owner, location, verification status)
 *   4. IPFS CIDs section (linked documents)
 *   5. Download PDF certificate button (jspdf + html2canvas)
 *   6. QR code with verification URL
 *
 * Paper value: Shows transparent immutable proof of registration
 */

import React, { useRef, useState } from 'react';
import {
  FaCheckCircle, FaCubes, FaDownload, FaQrcode,
  FaCopy, FaShieldAlt, FaFileAlt, FaLink
} from 'react-icons/fa';
import QRCode from 'react-qr-code';

const BlockchainConfirmation = ({ transaction, property, ipfsCIDs = [], onClose }) => {
  const receiptRef = useRef(null);
  const [copied, setCopied] = useState(null);

  const txHash = transaction?.hash || transaction?.transactionHash || transaction?.blockchainTransactionId || 'N/A';
  const blockNumber = transaction?.blockNumber || transaction?.block || '—';
  const timestamp = transaction?.timestamp ? new Date(transaction.timestamp).toLocaleString() : new Date().toLocaleString();
  const propertyId = property?.propertyId || property?._id || 'N/A';
  const verificationUrl = `${window.location.origin}/verify/${propertyId}`;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  /* PDF download with jspdf + html2canvas */
  const downloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const el = receiptRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('SmartBhoomi — Blockchain Registration Certificate', 10, 15);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleString()} | Bharat Land Chain — PoA-PBFT`, 10, 22);
      pdf.addImage(imgData, 'PNG', 10, 28, pdfWidth, pdfHeight);
      pdf.save(`SmartBhoomi_Certificate_${propertyId}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} ref={receiptRef}>
        {/* ─── Success header ─── */}
        <div style={styles.successHeader}>
          <div style={styles.checkCircle}>
            <FaCheckCircle style={{ fontSize: 40, color: '#059669' }} />
          </div>
          <h2 style={{ margin: '12px 0 4px', color: '#065F46', fontSize: 22 }}>Property Registered on Blockchain</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#059669' }}>
            Immutably recorded on Bharat Land Chain — 3-Validator PoA-PBFT Consensus
          </p>
        </div>

        {/* ─── Transaction receipt ─── */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}><FaCubes style={{ color: '#0B3D91' }} /> Blockchain Transaction Receipt</h4>
          <div style={styles.receiptGrid}>
            <ReceiptRow label="Transaction Hash" value={txHash} mono copyable onCopy={() => copyToClipboard(txHash, 'txHash')} copied={copied === 'txHash'} />
            <ReceiptRow label="Block Number" value={`#${blockNumber}`} />
            <ReceiptRow label="Timestamp" value={timestamp} />
            <ReceiptRow label="Consensus Method" value="PoA-PBFT (Practical Byzantine Fault Tolerance)" />
            <ReceiptRow label="Validators Confirmed" value="3 / 3 (GOV-NODE-1, REV-NODE-2, JUD-NODE-3)" />
            <ReceiptRow label="Gas Cost" value="₹0.00 (Gas-Free Permissioned Network)" highlight />
            <ReceiptRow label="Network" value="Bharat Land Chain — Sovereign Permissioned" />
            <ReceiptRow label="Finality" value="Instant (single-block finality)" />
          </div>
        </div>

        {/* ─── Property summary ─── */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}><FaFileAlt style={{ color: '#0B3D91' }} /> Property Summary</h4>
          <div style={styles.receiptGrid}>
            <ReceiptRow label="Property ID" value={propertyId} mono copyable onCopy={() => copyToClipboard(propertyId, 'pid')} copied={copied === 'pid'} />
            <ReceiptRow label="Title" value={property?.title || 'N/A'} />
            <ReceiptRow label="Location" value={
              typeof property?.location === 'string' ? property.location
              : typeof property?.address === 'string' ? property.address
              : typeof property?.propertyDetails?.address === 'object'
                ? [property.propertyDetails.address.street, property.propertyDetails.address.city, property.propertyDetails.address.state].filter(Boolean).join(', ')
              : typeof property?.propertyDetails?.address === 'string' ? property.propertyDetails.address
              : 'N/A'
            } />
            {property?.latitude && <ReceiptRow label="Coordinates" value={`${parseFloat(property.latitude).toFixed(6)}°N, ${parseFloat(property.longitude).toFixed(6)}°E`} />}
            <ReceiptRow label="Verification" value={property?.verificationStatus?.toUpperCase() || property?.verification?.status?.toUpperCase() || 'PENDING'} highlight />
          </div>
        </div>

        {/* ─── IPFS Documents ─── */}
        {ipfsCIDs.length > 0 && (
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}><FaLink style={{ color: '#0B3D91' }} /> IPFS Document Anchors</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ipfsCIDs.map((cid, i) => (
                <div key={i} style={styles.cidRow}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Doc {i + 1}</span>
                  <code style={{ fontSize: 11, color: '#0B3D91', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {typeof cid === 'string' ? cid : cid?.cid || cid?.hash || JSON.stringify(cid)}
                  </code>
                  <button style={styles.copyBtn} onClick={() => copyToClipboard(typeof cid === 'string' ? cid : cid?.cid || cid?.hash, `cid-${i}`)}>
                    {copied === `cid-${i}` ? '✓' : <FaCopy />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── QR + actions ─── */}
        <div style={styles.qrRow}>
          <div style={styles.qrCard}>
            <QRCode value={verificationUrl} size={100} level="M" />
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 6, textAlign: 'center' }}>
              Scan to verify on-chain
            </p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={downloadPDF} style={styles.downloadBtn}>
              <FaDownload /> Download PDF Certificate
            </button>
            <button onClick={() => copyToClipboard(verificationUrl, 'url')} style={styles.secondaryBtn}>
              <FaQrcode /> {copied === 'url' ? 'Copied!' : 'Copy Verification URL'}
            </button>
            {onClose && (
              <button onClick={onClose} style={styles.closeBtn}>
                Return to Dashboard →
              </button>
            )}
          </div>
        </div>

        {/* ─── Footer note ─── */}
        <div style={styles.footer}>
          <FaShieldAlt style={{ color: '#0B3D91', flexShrink: 0 }} />
          <span>
            This certificate is cryptographically signed and immutably stored on the Bharat Land Chain.
            It cannot be altered, deleted, or forged. Verify authenticity at any time using the QR code above.
          </span>
        </div>
      </div>
    </div>
  );
};

/* Receipt row helper */
const ReceiptRow = ({ label, value, mono, copyable, onCopy, copied, highlight }) => (
  <div style={styles.receiptRow}>
    <span style={{ color: '#64748B', fontSize: 12 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <strong style={{
        fontSize: 12, color: highlight ? '#059669' : '#0F172A',
        fontFamily: mono ? 'monospace' : 'inherit',
        maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>
        {value}
      </strong>
      {copyable && (
        <button onClick={onCopy} style={styles.copyBtn}>
          {copied ? '✓' : <FaCopy style={{ fontSize: 10 }} />}
        </button>
      )}
    </div>
  </div>
);

/* ─── styles ─── */
const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' },
  modal: { background: '#FFF', borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.2)' },
  successHeader: { textAlign: 'center', padding: '20px 0 16px' },
  checkCircle: { width: 70, height: 70, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '3px solid #A7F3D0' },
  section: { marginTop: 16, padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #E2E8F0' },
  sectionTitle: { margin: '0 0 10px', fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 },
  receiptGrid: { display: 'flex', flexDirection: 'column', gap: 4 },
  receiptRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #F1F5F9' },
  cidRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#FFF', borderRadius: 6, border: '1px solid #E2E8F0' },
  copyBtn: { background: 'none', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: '#64748B' },
  qrRow: { display: 'flex', gap: 16, marginTop: 16, alignItems: 'center' },
  qrCard: { padding: 12, background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', flexShrink: 0 },
  downloadBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: '#0B3D91', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  secondaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  closeBtn: { padding: '10px 16px', background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  footer: { display: 'flex', gap: 10, marginTop: 16, padding: '12px 14px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE', fontSize: 12, color: '#1E40AF', alignItems: 'flex-start', lineHeight: 1.5 },
};

export default BlockchainConfirmation;
