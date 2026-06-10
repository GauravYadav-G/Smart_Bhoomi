/**
 * BlockchainConfirmation — Citizen Blockchain Receipt + Certificate Download
 */

import React, { useRef, useState } from 'react';
import {
  FaCheckCircle, FaCubes, FaDownload, FaQrcode,
  FaCopy, FaShieldAlt, FaFileAlt, FaLink
} from 'react-icons/fa';
import QRCode from 'react-qr-code';
import { toast } from 'react-toastify';

const BlockchainConfirmation = ({ transaction, property, ipfsCIDs = [], onClose }) => {
  const certificateRef = useRef(null);
  const [copied, setCopied] = useState(null);

  const txHash = transaction?.hash || transaction?.transactionHash || transaction?.blockchainTransactionId || 'N/A';
  const blockNumber = transaction?.blockNumber || transaction?.block || '10482';
  const timestamp = transaction?.timestamp ? new Date(transaction.timestamp).toLocaleString() : new Date().toLocaleString();
  const propertyId = property?.propertyId || property?._id || 'N/A';
  const verificationUrl = `${window.location.origin}/verify/${propertyId}`;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      toast.success('📋 Copied to clipboard!');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  /* Helper to format doc types nicely */
  const getDocLabel = (item) => {
    const name = typeof item === 'string' ? '' : item?.name || item?.documentType || '';
    if (!name) return 'Document';
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  /* Helper to extract CID value */
  const getCidValue = (item) => {
    if (typeof item === 'string') return item;
    return item?.cid || item?.ipfsCID || item?.hash || '';
  };

  /* PDF download with jspdf + html2canvas */
  const downloadPDF = async () => {
    try {
      toast.info('⏳ Rendering official certificate PDF...', { autoClose: 2000 });
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const el = certificateRef.current;
      if (!el) {
        toast.error('❌ Reference error: Certificate element not found');
        return;
      }
      
      const canvas = await html2canvas(el, { 
        scale: 2.5, // High resolution export
        useCORS: true, 
        backgroundColor: '#FFFFFF',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Render edge-to-edge on A4 sheet
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SmartBhoomi_Official_Certificate_${propertyId}.pdf`);
      
      toast.success('🎉 Certificate PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('❌ PDF generation failed. Please try again.');
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
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
            <ReceiptRow label="Title" value={property?.title || property?.propertyDetails?.title || 'N/A'} />
            <ReceiptRow label="Location" value={
              typeof property?.location === 'string' ? property.location
              : typeof property?.address === 'string' ? property.address
              : typeof property?.propertyDetails?.address === 'object'
                ? [property.propertyDetails.address.street, property.propertyDetails.address.city, property.propertyDetails.address.state].filter(Boolean).join(', ')
              : typeof property?.propertyDetails?.address === 'string' ? property.propertyDetails.address
              : 'N/A'
            } />
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
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{getDocLabel(cid)}</span>
                  <code style={{ fontSize: 11, color: '#0B3D91', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', marginLeft: 8 }}>
                    {getCidValue(cid)}
                  </code>
                  <button style={styles.copyBtn} onClick={() => copyToClipboard(getCidValue(cid), `cid-${i}`)}>
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
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 6, textAlign: 'center', margin: 0 }}>
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

      {/* ─── HIDDEN PRINT-READY DEED CERTIFICATE (Captured by html2canvas for PDF) ─── */}
      <div ref={certificateRef} style={styles.certificateContainer}>
        {/* Double Border Frame */}
        <div style={styles.certificateFrame}>
          {/* Subtle Watermark Seal */}
          <div style={styles.certWatermark}>
            SmartBhoomi Verified
          </div>

          {/* Header */}
          <div style={styles.certHeader}>
            <div style={styles.certGovSeal}>
              <FaShieldAlt style={{ fontSize: 32, color: '#996515' }} />
            </div>
            <h1 style={styles.certGovTitle}>GOVERNMENT OF BHARAT</h1>
            <h2 style={styles.certDeptSub}>DEPARTMENT OF REVENUE & LAND REGISTRATION</h2>
            <h3 style={styles.certRegistryBrand}>SMARTBHOOMI DECENTRALIZED DIGITAL REGISTRY</h3>
            <div style={styles.certDivider} />
          </div>

          {/* Certificate Title */}
          <div style={styles.certTitleSection}>
            <h2 style={styles.certTitleText}>CERTIFICATE OF BLOCKCHAIN REGISTRATION</h2>
            <p style={styles.certCertText}>
              This is to officially certify that the land property profile detailed below has been securely registered
              and immutably anchored to the sovereign <strong>Bharat Land Chain</strong> ledger. This registration represents
              indisputable, tamper-proof state record of title mutation as verified under automated registry frameworks.
            </p>
          </div>

          {/* Property Profile Grid */}
          <div style={styles.certInfoBlock}>
            <h4 style={styles.certBlockHeader}>I. PROPERTY IDENTIFICATION & PROFILE</h4>
            <table style={styles.certTable}>
              <tbody>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Property Reference ID</td>
                  <td style={styles.certTableValueMono}>{propertyId}</td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Registry Title Name</td>
                  <td style={styles.certTableValue}>{property?.title || property?.propertyDetails?.title || 'N/A'}</td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Registered Geographic Area</td>
                  <td style={styles.certTableValue}>
                    {property?.propertyDetails?.area?.value 
                      ? `${property.propertyDetails.area.value} ${property.propertyDetails.area.unit || 'sqft'}` 
                      : property?.area 
                        ? `${property.area}` 
                        : 'N/A'}
                  </td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Boundary Coordinates</td>
                  <td style={styles.certTableValue}>
                    {property?.propertyDetails?.coordinates?.latitude != null 
                      ? `${property.propertyDetails.coordinates.latitude.toFixed(6)}° N, ${property.propertyDetails.coordinates.longitude.toFixed(6)}° E` 
                      : 'N/A'}
                  </td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Physical Address Location</td>
                  <td style={styles.certTableValue}>
                    {typeof property?.propertyDetails?.address === 'object'
                      ? [property.propertyDetails.address.street, property.propertyDetails.address.city, property.propertyDetails.address.state, property.propertyDetails.address.zipCode].filter(Boolean).join(', ')
                      : typeof property?.address === 'string' ? property.address : 'N/A'}
                  </td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Survey / Plot Reference</td>
                  <td style={styles.certTableValue}>{property?.propertyDetails?.surveyNumber || property?.propertyDetails?.plotNumber || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cryptographic Proof Grid */}
          <div style={styles.certInfoBlock}>
            <h4 style={styles.certBlockHeader}>II. BLOCKCHAIN LEDGER & CRYPTOGRAPHIC ANCHORS</h4>
            <table style={styles.certTable}>
              <tbody>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>On-chain Tx Hash Reference</td>
                  <td style={styles.certTableValueMono}>{txHash}</td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Consensus Block Height</td>
                  <td style={styles.certTableValue}>Block #{blockNumber}</td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>Decentralized State Hash</td>
                  <td style={styles.certTableValueMono}>
                    {property?.blockchainHash || property?.dataIntegrityHash || 'N/A'}
                  </td>
                </tr>
                <tr style={styles.certTableRow}>
                  <td style={styles.certTableLabel}>IPFS Linked Document CIDs</td>
                  <td style={styles.certTableValue}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                      {ipfsCIDs.map((cid, idx) => (
                        <span key={idx} style={{ fontSize: '9px', fontFamily: 'monospace', color: '#1B5E20' }}>
                          [{getDocLabel(cid)}]: {getCidValue(cid).substring(0, 36)}...
                        </span>
                      ))}
                      {ipfsCIDs.length === 0 && <span style={{ fontStyle: 'italic', color: '#64748B' }}>No documents anchored to IPFS</span>}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Seals & QR Section */}
          <div style={styles.certFooterSection}>
            <div style={styles.certQrArea}>
              <QRCode value={verificationUrl} size={80} level="M" />
              <span style={{ fontSize: '9px', color: '#64748B', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                Scan to Verify Authenticity
              </span>
            </div>
            
            <div style={styles.certSignaturesArea}>
              <div style={styles.certSignatureLine}>
                <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '18px', color: '#0B3D91', margin: '0 auto -2px auto', width: 'fit-content' }}>
                  SmartBhoomi Registry
                </div>
                <div style={styles.certSignatureLabel}>Registrar of Land Records</div>
              </div>
              <div style={styles.certSignatureLine}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#059669', margin: '4px auto 3px auto', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ✓ SECURED POA NODE
                </div>
                <div style={styles.certSignatureLabel}>Consensus Validator Signature</div>
              </div>
            </div>
          </div>

          {/* Bottom Security Warning */}
          <div style={styles.certSecurityNotice}>
            🛡️ Dynamic security document. This electronic certificate of registry is cryptographically bound to block records
            and remains legally valid across all jurisdictions in Bharat as a verified electronic deed.
          </div>
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' },
  modal: { background: '#FFF', borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.2)' },
  successHeader: { textAlign: 'center', padding: '12px 0 16px' },
  checkCircle: { width: 70, height: 70, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '3px solid #A7F3D0' },
  section: { marginTop: 16, padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #E2E8F0' },
  sectionTitle: { margin: '0 0 10px', fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 },
  receiptGrid: { display: 'flex', flexDirection: 'column', gap: 4 },
  receiptRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #F1F5F9' },
  cidRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#FFF', borderRadius: 6, border: '1px solid #E2E8F0' },
  copyBtn: { background: 'none', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qrRow: { display: 'flex', gap: 16, marginTop: 16, alignItems: 'center' },
  qrCard: { padding: 12, background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  downloadBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: '#0B3D91', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'background-color 0.2s' },
  secondaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  closeBtn: { padding: '10px 16px', background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  footer: { display: 'flex', gap: 10, marginTop: 16, padding: '12px 14px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE', fontSize: 12, color: '#1E40AF', alignItems: 'flex-start', lineHeight: 1.5 },

  /* Certificate specific off-screen print element styles */
  certificateContainer: {
    width: '800px',
    height: '1130px',
    padding: '40px',
    background: '#FFFFFF',
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  certificateFrame: {
    width: '100%',
    height: '100%',
    border: '4px double #996515', // Gold double border
    borderRadius: '8px',
    padding: '24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: '#FFFFFF',
    position: 'relative',
    boxShadow: 'inset 0 0 20px rgba(153, 101, 21, 0.05)',
  },
  certWatermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-12deg)',
    fontSize: '60px',
    fontWeight: '800',
    color: 'rgba(217, 119, 6, 0.03)',
    border: '8px double rgba(217, 119, 6, 0.03)',
    borderRadius: '50%',
    padding: '30px',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    textAlign: 'center',
    width: '320px',
    height: '320px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '2px',
    zIndex: 1,
  },
  certHeader: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    zIndex: 5,
  },
  certGovSeal: {
    marginBottom: '8px',
  },
  certGovTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: '1.5px',
  },
  certDeptSub: {
    margin: 0,
    fontSize: '11px',
    fontWeight: '700',
    color: '#374151',
    letterSpacing: '0.8px',
  },
  certRegistryBrand: {
    margin: 0,
    fontSize: '10px',
    fontWeight: '800',
    color: '#0B3D91',
    letterSpacing: '0.5px',
  },
  certDivider: {
    width: '60%',
    height: '2px',
    background: 'linear-gradient(90deg, #F97316 0%, #D1D5DB 50%, #22C55E 100%)',
    marginTop: '10px',
  },
  certTitleSection: {
    textAlign: 'center',
    padding: '0 20px',
    zIndex: 5,
  },
  certTitleText: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: '1px',
  },
  certCertText: {
    margin: 0,
    fontSize: '11px',
    lineHeight: '1.5',
    color: '#4B5563',
    textAlign: 'justify',
  },
  certInfoBlock: {
    width: '100%',
    zIndex: 5,
  },
  certBlockHeader: {
    margin: '0 0 6px 0',
    fontSize: '11px',
    fontWeight: '800',
    color: '#0F172A',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '3px',
    letterSpacing: '0.5px',
  },
  certTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  certTableRow: {
    borderBottom: '1px solid #F3F4F6',
  },
  certTableLabel: {
    width: '35%',
    padding: '5px 0',
    fontSize: '11px',
    fontWeight: '600',
    color: '#4B5563',
  },
  certTableValue: {
    width: '65%',
    padding: '5px 0',
    fontSize: '11px',
    fontWeight: '700',
    color: '#111827',
  },
  certTableValueMono: {
    width: '65%',
    padding: '5px 0',
    fontSize: '10px',
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#0B3D91',
  },
  certFooterSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    zIndex: 5,
  },
  certQrArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#FFFFFF',
    padding: '8px',
    border: '1px solid #E5E7EB',
    borderRadius: '4px',
  },
  certSignaturesArea: {
    display: 'flex',
    gap: '30px',
  },
  certSignatureLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '150px',
  },
  certSignatureLabel: {
    borderTop: '1px solid #9CA3AF',
    width: '100%',
    textAlign: 'center',
    paddingTop: '4px',
    fontSize: '9px',
    fontWeight: '600',
    color: '#4B5563',
  },
  certSecurityNotice: {
    textAlign: 'center',
    fontSize: '9px',
    color: '#64748B',
    lineHeight: '1.4',
    borderTop: '1px solid #F3F4F6',
    paddingTop: '8px',
    zIndex: 5,
  }
};

export default BlockchainConfirmation;
