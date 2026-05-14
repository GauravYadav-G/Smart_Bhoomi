import React, { useState, useEffect, useCallback, useRef } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { transferAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMoneyBillWave,
  FaHome,
  FaUser,
  FaCalendar,
  FaExclamationTriangle,
  FaTimes,
  FaFilter,
  FaFingerprint,
  FaShieldAlt,
  FaLink,
  FaCamera,
  FaIdCard,
  FaUserShield,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import TransferIdentityCard from '../components/TransferIdentityCard';
import './TransferRequests.css';

const TransferRequests = () => {
  const { user, biometricAuthEnabled } = useAuth();
  const navigate = useNavigate();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');

  const [paymentReceived, setPaymentReceived] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);

  // KYC verification state for transfers
  const [kycStep, setKycStep] = useState('confirm'); // confirm | fingerprint | face | complete
  const [kycScanPhase, setKycScanPhase] = useState('idle');
  const [kycProgress, setKycProgress] = useState(0);
  const [kycScore, setKycScore] = useState(null);
  const [kycVideoStream, setKycVideoStream] = useState(null);
  const kycVideoRef = useRef(null);
  const kycCanvasRef = useRef(null);

  // Smooth sticky header scroll listener
  useEffect(() => {
    let rafId = null;
    let lastScrolled = false;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const scrolled = window.scrollY > 50;
        if (scrolled !== lastScrolled) {
          lastScrolled = scrolled;
          setIsScrolled(scrolled);
        }
        rafId = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await transferAPI.getAllTransfers();
      setTransfers(response.data.transfers || []);
    } catch (error) {
      console.error('❌ Fetch transfers error:', error);
      toast.error('Failed to fetch transfer requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchTransfers();
  }, [fetchTransfers, user]);

  const resetModalState = () => {
    setSelectedTransfer(null);
    setAction(null);
    setReason('');
    setPaymentReceived(false);
    setProcessing(false);
    setKycStep('confirm');
    setKycScanPhase('idle');
    setKycProgress(0);
    setKycScore(null);
    if (kycVideoStream) {
      kycVideoStream.getTracks().forEach(t => t.stop());
      setKycVideoStream(null);
    }
  };

  const handleOwnerAction = async (requestId, approved) => {
    if (!approved && !reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    if (approved && !paymentReceived) {
      toast.error('Please confirm payment has been received');
      return;
    }
    
    setProcessing(true);
    try {
      await transferAPI.ownerApprove(requestId, {
        approved,
        rejectionReason: approved ? null : reason.trim(),
        paymentReceived: approved ? paymentReceived : false,
      });
      toast.success(`Transfer ${approved ? 'approved' : 'rejected'} successfully!`);
      await fetchTransfers();
      resetModalState();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  // ─── KYC Camera helpers ───
  const startKycCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setKycVideoStream(stream);
      const attachVideo = () => {
        if (kycVideoRef.current) {
          kycVideoRef.current.srcObject = stream;
        } else {
          setTimeout(attachVideo, 100);
        }
      };
      attachVideo();
    } catch (err) {
      toast.error('Camera access denied. Please allow camera permission.');
    }
  }, []);

  const captureKycFrame = useCallback(() => {
    if (!kycVideoRef.current || !kycCanvasRef.current) return null;
    const video = kycVideoRef.current;
    const canvas = kycCanvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // ─── KYC Fingerprint scan for transfer ───
  const handleTransferFingerprint = useCallback(async (requestId, role) => {
    setKycScanPhase('scanning');
    setKycProgress(0);
    setKycScore(null);

    try {
      setKycProgress(20);

      // Get WebAuthn options
      const optionsRes = await transferAPI.getAuthOptions(requestId);
      const serverOptions = optionsRes.data.options;
      const { challengeId, ...webAuthnOptions } = serverOptions;
      setKycProgress(40);

      toast.info('🔐 Touch your fingerprint sensor now...', { autoClose: 10000 });

      // Trigger real sensor
      const credential = await startAuthentication({ optionsJSON: webAuthnOptions });
      setKycProgress(80);
      setKycScanPhase('processing');

      // Verify
      const endpoint = role === 'buyer' ? transferAPI.buyerBiometric : transferAPI.sellerConfirm;
      const response = await endpoint(requestId, {
        biometricData: {
          method: 'fingerprint',
          challengeId,
          credential,
        }
      });

      setKycProgress(100);
      setKycScanPhase('verified');
      setKycScore(response.data.biometricScore || 100);
      toast.success(`✅ Fingerprint verified! Score: ${response.data.biometricScore || 100}%`);

      // Move to face scan step
      setTimeout(() => {
        setKycStep('face');
        setKycScanPhase('idle');
        setKycProgress(0);
        setKycScore(null);
      }, 1500);
    } catch (err) {
      setKycScanPhase('failed');
      setKycScore(0);
      const msg = err.name === 'NotAllowedError'
        ? 'Fingerprint scan cancelled or timed out.'
        : err.response?.data?.message || err.message || 'Fingerprint verification failed';
      toast.error(msg);
    }
  }, []);

  // ─── KYC Face scan for transfer ───
  const handleTransferFaceScan = useCallback(async () => {
    setKycScanPhase('scanning');
    setKycProgress(0);
    setKycScore(null);

    try {
      if (!kycVideoStream) {
        await startKycCamera();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setKycProgress(10);
      toast.info('📸 Position your face within the frame...', { autoClose: 6000 });

      // Animate scanning over 3 seconds
      const scanDuration = 3000;
      const startTime = Date.now();

      await new Promise((resolve) => {
        const scanInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(10 + (elapsed / scanDuration) * 60, 70);
          setKycProgress(Math.round(progress));
          captureKycFrame();

          if (elapsed >= scanDuration) {
            clearInterval(scanInterval);
            resolve();
          }
        }, 300);
      });

      setKycProgress(75);
      setKycScanPhase('processing');

      const finalCapture = captureKycFrame();
      if (!finalCapture) throw new Error('Failed to capture face image');

      setKycProgress(85);

      // Send to server
      const verifyRes = await authAPI.verifyTransferFace({ faceCapture: finalCapture });

      // Stop camera
      if (kycVideoStream) {
        kycVideoStream.getTracks().forEach(t => t.stop());
        setKycVideoStream(null);
      }

      if (verifyRes.data.verified) {
        setKycProgress(100);
        setKycScanPhase('verified');
        setKycScore(verifyRes.data.score);
        toast.success(`✅ Face verified — ${verifyRes.data.score}% match`);

        setTimeout(async () => {
          setKycStep('complete');
          await fetchTransfers();
          toast.success('🎉 Full KYC verification complete!');
          setTimeout(() => resetModalState(), 2000);
        }, 1500);
      }
    } catch (err) {
      setKycScanPhase('failed');
      setKycScore(err.response?.data?.score || 0);
      toast.error(err.response?.data?.message || err.message || 'Face verification failed');
    }
  }, [kycVideoStream, startKycCamera, captureKycFrame, fetchTransfers]);

  // Auto-start camera when entering face step
  useEffect(() => {
    if (kycStep === 'face' && kycScanPhase === 'idle') {
      const timer = setTimeout(() => startKycCamera(), 300);
      return () => clearTimeout(timer);
    }
  }, [kycStep, kycScanPhase, startKycCamera]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (kycVideoStream) {
        kycVideoStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [kycVideoStream]);

  // KYC-only verification (when biometric is disabled) — sends request directly to server
  const handleKycOnlyVerify = useCallback(async (requestId, role) => {
    setKycScanPhase('scanning');
    setKycProgress(0);
    try {
      setKycProgress(30);
      await new Promise(r => setTimeout(r, 800));
      setKycProgress(60);

      const endpoint = role === 'buyer' ? transferAPI.buyerBiometric : transferAPI.sellerConfirm;
      await endpoint(requestId, {
        biometricData: { method: 'kyc_only' }
      });

      setKycProgress(100);
      setKycScanPhase('verified');
      setKycScore(100);
      toast.success('✅ KYC verification successful!');

      setTimeout(async () => {
        setKycStep('complete');
        await fetchTransfers();
        toast.success('🎉 Verification complete!');
        setTimeout(() => resetModalState(), 2000);
      }, 1500);
    } catch (err) {
      setKycScanPhase('failed');
      setKycScore(0);
      toast.error(err.response?.data?.message || err.message || 'KYC verification failed');
    }
  }, [fetchTransfers]);

  // P2P Biometric verification — buyer step (full KYC: fingerprint + face)
  const handleBuyerBiometric = async (requestId) => {
    if (!biometricAuthEnabled) {
      setKycStep('kyc-only');
      setKycScanPhase('idle');
      return;
    }
    setKycStep('fingerprint');
    setKycScanPhase('idle');
  };

  // P2P Biometric confirmation — seller step (full KYC: fingerprint + face → auto-execute)
  const handleSellerConfirm = async (requestId) => {
    if (!biometricAuthEnabled) {
      setKycStep('kyc-only');
      setKycScanPhase('idle');
      return;
    }
    setKycStep('fingerprint');
    setKycScanPhase('idle');
  };

  const closeModal = () => resetModalState();

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: <FaClock />, label: 'Pending', class: 'pending', color: '#fbbf24' },
      owner_approved: { icon: <FaCheckCircle />, label: 'Owner Approved', class: 'approved', color: '#22c55e' },
      buyer_biometric_verified: { icon: <FaFingerprint />, label: 'Buyer Verified', class: 'biometric', color: '#8b5cf6' },
      payment_pending: { icon: <FaClock />, label: 'Payment Pending', class: 'payment-pending', color: '#f59e0b' },
      payment_completed: { icon: <FaMoneyBillWave />, label: 'Payment Done', class: 'payment', color: '#3b82f6' },
      seller_biometric_confirmed: { icon: <FaShieldAlt />, label: 'Seller Confirmed', class: 'biometric', color: '#7c3aed' },
      completed: { icon: <FaCheckCircle />, label: 'Completed', class: 'completed', color: '#16a34a' },
      owner_rejected: { icon: <FaTimesCircle />, label: 'Rejected', class: 'rejected', color: '#ef4444' },
      cancelled: { icon: <FaTimesCircle />, label: 'Cancelled', class: 'cancelled', color: '#6b7280' },
      disputed: { icon: <FaExclamationTriangle />, label: 'Disputed', class: 'rejected', color: '#dc2626' },
    };
    return configs[status] || configs.pending;
  };

  const filteredTransfers = statusFilter === 'all'
    ? transfers
    : transfers.filter(t => t.status === statusFilter);

  if (!user) {
    return (
      <div className="transfers-page">
        <div className="transfers-loading"><p>Loading user data...</p></div>
      </div>
    );
  }

  return (
    <div className="transfers-page" role="main" aria-label="Property Transfer Requests">
      <div className={`page-hero${isScrolled ? ' scrolled' : ''}`} role="banner">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Transfer Requests</h1>
            <p>P2P biometric-secured property transfers</p>
          </div>
        </div>

        <div className="stats-bar" role="group" aria-label="Transfer statistics">
          <div className="stat-card">
            <div className="stat-icon total"><FaHome /></div>
            <div className="stat-info">
              <span className="stat-value">{transfers.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending"><FaClock /></div>
            <div className="stat-info">
              <span className="stat-value">{transfers.filter(t => t.status === 'pending').length}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon verified"><FaFingerprint /></div>
            <div className="stat-info">
              <span className="stat-value">{transfers.filter(t => ['buyer_biometric_verified', 'seller_biometric_confirmed'].includes(t.status)).length}</span>
              <span className="stat-label">Biometric</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon verified"><FaCheckCircle /></div>
            <div className="stat-info">
              <span className="stat-value">{transfers.filter(t => t.status === 'completed').length}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
      </div>

      <section className="transfers-container">
        <div className="filter-bar" role="search">
          <label className="filter-label" htmlFor="status-filter">
            <FaFilter /> Filter:
          </label>
          <select id="status-filter" className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="owner_approved">Owner Approved</option>
            <option value="buyer_biometric_verified">Buyer Verified</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="payment_completed">Payment Completed</option>
            <option value="seller_biometric_confirmed">Seller Confirmed</option>
            <option value="completed">Completed</option>
            <option value="owner_rejected">Rejected</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        {loading ? (
          <div className="transfers-loading" role="status">
            <div className="loading-spinner" />
            <p>Loading transfer requests...</p>
          </div>
        ) : filteredTransfers.length > 0 ? (
          <section className="transfers-grid" role="list">
            {filteredTransfers.map(transfer => {
              const statusConfig = getStatusConfig(transfer.status);
              const currentUserId = user?._id ? String(user._id) : null;
              const ownerId = transfer.currentOwner?._id ? String(transfer.currentOwner._id) : null;
              const buyerId = transfer.buyer?._id ? String(transfer.buyer._id) : null;
              const isOwner = currentUserId && ownerId && currentUserId === ownerId;
              const isBuyer = currentUserId && buyerId && currentUserId === buyerId;

              return (
                <article key={transfer._id} className="transfer-card" role="listitem">
                  <header className="card-header">
                    <div className="property-info">
                      <FaHome className="property-icon" />
                      <div>
                        <h3>{transfer.property?.propertyDetails?.title || 'Property'}</h3>
                        <span className="request-id">ID: {transfer.requestId}</span>
                      </div>
                    </div>
                    <span className={`status-badge ${statusConfig.class}`} style={{ borderColor: statusConfig.color }}>
                      {statusConfig.icon} <span>{statusConfig.label}</span>
                    </span>
                  </header>

                  <div className="card-body">
                    <div className="details-grid">
                      <div className="detail-item">
                        <FaUser className="detail-icon" />
                        <div>
                          <span className="detail-label">Owner</span>
                          <span className="detail-value">{transfer.currentOwner?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <FaUser className="detail-icon" />
                        <div>
                          <span className="detail-label">Buyer</span>
                          <span className="detail-value">{transfer.buyer?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <FaMoneyBillWave className="detail-icon" />
                        <div>
                          <span className="detail-label">Price</span>
                          <span className="detail-value">₹{transfer.proposedPrice?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <FaCalendar className="detail-icon" />
                        <div>
                          <span className="detail-label">Created</span>
                          <span className="detail-value">{transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Biometric verification indicators */}
                    {transfer.buyerBiometric?.verified && (
                      <div className="biometric-badge buyer">
                        <FaFingerprint /> Buyer biometric: {transfer.buyerBiometric.biometricScore}% match
                      </div>
                    )}
                    {transfer.sellerBiometric?.confirmed && (
                      <div className="biometric-badge seller">
                        <FaShieldAlt /> Seller confirmed: {transfer.sellerBiometric.biometricScore}% match
                      </div>
                    )}
                    {transfer.blockchainTransactionHash && (
                      <div className="biometric-badge blockchain">
                        <FaLink /> Blockchain: {transfer.blockchainTransactionHash.slice(0, 16)}...
                      </div>
                    )}
                  </div>

                  <footer className="card-footer">
                    {/* Step 1: Owner approves/rejects pending request */}
                    {isOwner && transfer.status === 'pending' && (
                      <>
                        <button className="btn-approve" onClick={() => { setSelectedTransfer(transfer); setAction('owner-approve'); }}>
                          <FaCheckCircle /> Approve
                        </button>
                        <button className="btn-reject" onClick={() => { setSelectedTransfer(transfer); setAction('owner-reject'); }}>
                          <FaTimesCircle /> Reject
                        </button>
                      </>
                    )}

                    {/* Step 2: Buyer verifies with biometrics */}
                    {isBuyer && ['owner_approved'].includes(transfer.status) && (
                      <button className="btn-biometric" onClick={() => { setSelectedTransfer(transfer); setAction('buyer-biometric'); }}>
                        <FaFingerprint /> Verify Identity
                      </button>
                    )}

                    {/* Step 3: Buyer makes payment */}
                    {isBuyer && ['buyer_biometric_verified', 'payment_pending'].includes(transfer.status) && (
                      <button className="btn-pay" onClick={() => navigate(`/payment/${transfer.requestId}`)}>
                        <FaMoneyBillWave /> Make Payment
                      </button>
                    )}

                    {/* Step 4: Seller confirms with biometric (auto-executes transfer) */}
                    {isOwner && transfer.status === 'payment_completed' && (
                      <button className="btn-biometric confirm" onClick={() => { setSelectedTransfer(transfer); setAction('seller-confirm'); }}>
                        <FaShieldAlt /> Confirm & Transfer
                      </button>
                    )}

                    {transfer.status === 'completed' && (
                      <span className="completed-label"><FaCheckCircle /> Transfer Complete</span>
                    )}
                  </footer>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-state" role="alert">
            <FaClock className="empty-icon" />
            <h2>No Transfer Requests</h2>
            <p>{statusFilter === 'all' ? 'No transfer requests at the moment.' : `No requests with status "${statusFilter}".`}</p>
          </section>
        )}
      </section>

      {/* ─── ACTION MODAL ─── */}
      {selectedTransfer && action && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="action-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {action === 'owner-approve' && <><FaCheckCircle className="modal-icon approve" /> Approve Transfer</>}
                {action === 'owner-reject' && <><FaTimesCircle className="modal-icon reject" /> Reject Transfer</>}
                {action === 'buyer-biometric' && <><FaFingerprint className="modal-icon biometric" /> Biometric Verification</>}
                {action === 'seller-confirm' && <><FaShieldAlt className="modal-icon biometric" /> Confirm Transfer</>}
              </h2>
              <button className="modal-close" onClick={closeModal}><FaTimes /></button>
            </div>

            <div className="modal-body">
              <div className="property-summary">
                <h3>{selectedTransfer.property?.propertyDetails?.title || 'Property Transfer'}</h3>
                <p><strong>Request ID:</strong> {selectedTransfer.requestId}</p>
                <p><strong>Buyer:</strong> {selectedTransfer.buyer?.name}</p>
                <p><strong>Price:</strong> ₹{selectedTransfer.proposedPrice?.toLocaleString()}</p>
              </div>

              {action === 'owner-approve' && (
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={paymentReceived} onChange={e => setPaymentReceived(e.target.checked)} />
                    <span>I confirm payment has been received</span>
                  </label>
                </div>
              )}

              {action === 'owner-reject' && (
                <div className="form-field">
                  <label htmlFor="rejection-reason">Reason for Rejection *</label>
                  <textarea id="rejection-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide a reason..." rows="4" required />
                </div>
              )}

              {action === 'buyer-biometric' && (
                <div className="biometric-prompt">
                  <TransferIdentityCard
                    person={selectedTransfer.buyer}
                    label="Your Identity Card"
                    transferInfo={{
                      requestId: selectedTransfer.requestId,
                      propertyTitle: selectedTransfer.property?.propertyDetails?.title,
                      price: selectedTransfer.proposedPrice,
                      blockchainHash: selectedTransfer.blockchainTransactionHash,
                    }}
                  />

                  {/* KYC Phase Indicator */}
                  <div className="kyc-phase-bar">
                    <div className={`kyc-phase-step ${kycStep === 'confirm' ? 'active' : kycStep !== 'confirm' ? 'done' : ''}`}>
                      <FaIdCard /> <span>KYC Info</span>
                    </div>
                    <div className="kyc-phase-line" />
                    {biometricAuthEnabled ? (
                      <>
                        <div className={`kyc-phase-step ${kycStep === 'fingerprint' ? 'active' : kycStep === 'face' || kycStep === 'complete' ? 'done' : ''}`}>
                          <FaFingerprint /> <span>Fingerprint</span>
                        </div>
                        <div className="kyc-phase-line" />
                        <div className={`kyc-phase-step ${kycStep === 'face' ? 'active' : kycStep === 'complete' ? 'done' : ''}`}>
                          <FaCamera /> <span>Face Scan</span>
                        </div>
                      </>
                    ) : (
                      <div className={`kyc-phase-step ${kycStep === 'kyc-only' ? 'active' : kycStep === 'complete' ? 'done' : ''}`}>
                        <FaIdCard /> <span>KYC Verify</span>
                      </div>
                    )}
                  </div>

                  {/* KYC Confirm Step */}
                  {kycStep === 'confirm' && (
                    <>
                      <div className="biometric-icon-large"><FaIdCard /></div>
                      {biometricAuthEnabled ? (
                        <>
                          <h3>Full KYC Verification Required</h3>
                          <p>Your complete KYC data will be scanned to authenticate this transfer.</p>
                          <ul className="biometric-checklist">
                            <li><FaCheckCircle className="check-green" /> Aadhaar / PAN KYC verified</li>
                            <li><FaFingerprint className="check-purple" /> FIDO2 fingerprint scan</li>
                            <li><FaCamera className="check-blue" /> Live face camera scan</li>
                            <li><FaShieldAlt className="check-blue" /> Liveness detection</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <h3>KYC Verification Required</h3>
                          <p>Biometric authentication is disabled. Only KYC identity verification will be used for this transfer.</p>
                          <ul className="biometric-checklist">
                            <li><FaCheckCircle className="check-green" /> Aadhaar / PAN KYC verified</li>
                            <li><FaIdCard className="check-blue" /> Identity document verification</li>
                            <li><FaUserShield className="check-blue" /> Account-level KYC check</li>
                          </ul>
                          <div className="kyc-only-notice">
                            <FaExclamationTriangle /> Fingerprint & face scan skipped — biometric auth is turned off in your profile settings.
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* KYC-Only Step (biometric disabled) */}
                  {kycStep === 'kyc-only' && (
                    <div className="transfer-biometric-scanner">
                      <div className="biometric-icon-large kyc-icon"><FaIdCard /></div>
                      <h3>KYC Identity Verification</h3>
                      <p>Verifying your identity using KYC documents only (biometric skipped)</p>

                      <div className={`transfer-fp-scanner ${kycScanPhase}`}>
                        <div className="transfer-fp-visual kyc-visual">
                          <FaUserShield style={{ fontSize: '4rem', color: kycScanPhase === 'verified' ? '#10b981' : '#3b82f6' }} />
                        </div>

                        {kycScanPhase !== 'idle' && (
                          <div className="transfer-progress-bar">
                            <div className="transfer-progress-fill" style={{ width: `${Math.min(kycProgress, 100)}%` }} />
                          </div>
                        )}

                        <div className="transfer-scan-status">
                          {kycScanPhase === 'idle' && 'Ready — tap button to verify KYC'}
                          {kycScanPhase === 'scanning' && 'Verifying KYC documents...'}
                          {kycScanPhase === 'verified' && '✅ KYC Verified Successfully'}
                          {kycScanPhase === 'failed' && '❌ KYC Verification Failed — Try Again'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KYC Fingerprint Step */}
                  {kycStep === 'fingerprint' && (
                    <div className="transfer-biometric-scanner">
                      <div className="biometric-icon-large fingerprint"><FaFingerprint /></div>
                      <h3>Fingerprint Scan</h3>
                      <p>Step 1 of 2 — Place your finger on the sensor</p>

                      <div className={`transfer-fp-scanner ${kycScanPhase}`}>
                        <div className="transfer-fp-visual">
                          <svg viewBox="0 0 200 200" className="transfer-fp-svg">
                            <ellipse cx="100" cy="100" rx="75" ry="90" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                            <ellipse cx="100" cy="100" rx="60" ry="75" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                            <ellipse cx="100" cy="100" rx="45" ry="60" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                            <ellipse cx="100" cy="100" rx="30" ry="45" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                          </svg>
                          {kycScanPhase === 'scanning' && <div className="transfer-fp-scanline" style={{ top: `${kycProgress}%` }} />}
                          {kycScanPhase === 'verified' && <div className="transfer-fp-check"><FaCheckCircle /></div>}
                          {kycScanPhase === 'failed' && <div className="transfer-fp-fail"><FaTimesCircle /></div>}
                        </div>

                        {kycScanPhase !== 'idle' && (
                          <div className="transfer-progress-bar">
                            <div className="transfer-progress-fill" style={{ width: `${Math.min(kycProgress, 100)}%` }} />
                          </div>
                        )}

                        <div className="transfer-scan-status">
                          {kycScanPhase === 'idle' && 'Ready — tap button to start'}
                          {kycScanPhase === 'scanning' && 'Reading fingerprint...'}
                          {kycScanPhase === 'processing' && 'Verifying biometric...'}
                          {kycScanPhase === 'verified' && `✅ Verified — ${kycScore}% match`}
                          {kycScanPhase === 'failed' && '❌ Failed — Try again'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KYC Face Step */}
                  {kycStep === 'face' && (
                    <div className="transfer-biometric-scanner">
                      <div className="biometric-icon-large face-icon"><FaCamera /></div>
                      <h3>Face Camera Scan</h3>
                      <p>Step 2 of 2 — Position your face within the frame</p>

                      <div className={`transfer-face-scanner ${kycScanPhase}`}>
                        <div className="transfer-face-container">
                          <video ref={kycVideoRef} autoPlay muted playsInline className="transfer-face-video" />
                          <canvas ref={kycCanvasRef} style={{ display: 'none' }} />
                          <div className="transfer-face-overlay">
                            <div className="transfer-face-guide">
                              <span className="t-corner tl" />
                              <span className="t-corner tr" />
                              <span className="t-corner bl" />
                              <span className="t-corner br" />
                            </div>
                            {kycScanPhase === 'scanning' && <div className="transfer-face-scanline" style={{ top: `${kycProgress}%` }} />}
                            {kycScanPhase === 'scanning' && (
                              <div className="transfer-scan-badge"><span className="t-dot" /> SCANNING</div>
                            )}
                            {kycScanPhase === 'processing' && (
                              <div className="transfer-scan-badge processing"><span className="t-dot" /> MATCHING</div>
                            )}
                          </div>
                          {kycScanPhase === 'verified' && <div className="transfer-face-result success"><FaCheckCircle /></div>}
                          {kycScanPhase === 'failed' && <div className="transfer-face-result fail"><FaTimesCircle /></div>}
                          {!kycVideoStream && kycScanPhase === 'idle' && (
                            <div className="transfer-face-placeholder"><FaCamera /><span>Starting camera...</span></div>
                          )}
                        </div>

                        {kycScanPhase !== 'idle' && (
                          <div className="transfer-progress-bar">
                            <div className="transfer-progress-fill face" style={{ width: `${Math.min(kycProgress, 100)}%` }} />
                          </div>
                        )}

                        <div className="transfer-scan-status">
                          {kycScanPhase === 'idle' && (kycVideoStream ? '📸 Camera active' : '⏳ Starting camera...')}
                          {kycScanPhase === 'scanning' && `Capturing... ${kycProgress}%`}
                          {kycScanPhase === 'processing' && 'Matching face...'}
                          {kycScanPhase === 'verified' && `✅ Face Verified — ${kycScore}% match`}
                          {kycScanPhase === 'failed' && `❌ Failed — ${kycScore}%`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KYC Complete */}
                  {kycStep === 'complete' && (
                    <div className="kyc-complete-banner">
                      <FaCheckCircle className="kyc-complete-icon" />
                      <h3>Full KYC Verification Complete</h3>
                      <p>Both fingerprint and face scan verified successfully.</p>
                    </div>
                  )}
                </div>
              )}

              {action === 'seller-confirm' && (
                <div className="biometric-prompt">
                  <TransferIdentityCard
                    person={selectedTransfer.buyer}
                    label="Buyer Identity Card"
                    transferInfo={{
                      requestId: selectedTransfer.requestId,
                      propertyTitle: selectedTransfer.property?.propertyDetails?.title,
                      price: selectedTransfer.proposedPrice,
                      blockchainHash: selectedTransfer.blockchainTransactionHash,
                    }}
                  />

                  {/* KYC Phase Indicator */}
                  <div className="kyc-phase-bar">
                    <div className={`kyc-phase-step ${kycStep === 'confirm' ? 'active' : kycStep !== 'confirm' ? 'done' : ''}`}>
                      <FaIdCard /> <span>Confirm</span>
                    </div>
                    <div className="kyc-phase-line" />
                    {biometricAuthEnabled ? (
                      <>
                        <div className={`kyc-phase-step ${kycStep === 'fingerprint' ? 'active' : kycStep === 'face' || kycStep === 'complete' ? 'done' : ''}`}>
                          <FaFingerprint /> <span>Fingerprint</span>
                        </div>
                        <div className="kyc-phase-line" />
                        <div className={`kyc-phase-step ${kycStep === 'face' ? 'active' : kycStep === 'complete' ? 'done' : ''}`}>
                          <FaCamera /> <span>Face Scan</span>
                        </div>
                      </>
                    ) : (
                      <div className={`kyc-phase-step ${kycStep === 'kyc-only' ? 'active' : kycStep === 'complete' ? 'done' : ''}`}>
                        <FaIdCard /> <span>KYC Verify</span>
                      </div>
                    )}
                  </div>

                  {kycStep === 'confirm' && (
                    <>
                      <div className="biometric-icon-large confirm"><FaShieldAlt /></div>
                      {biometricAuthEnabled ? (
                        <>
                          <h3>Final Confirmation — Full KYC Required</h3>
                          <p>Your biometric confirmation will <strong>permanently transfer ownership</strong> on the blockchain. This action cannot be undone.</p>
                          <ul className="biometric-checklist">
                            <li><FaFingerprint className="check-purple" /> Fingerprint confirmation</li>
                            <li><FaCamera className="check-blue" /> Face camera verification</li>
                            <li><FaLink className="check-blue" /> Blockchain recording</li>
                            <li><FaCheckCircle className="check-green" /> Ownership transfer</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <h3>Final Confirmation — KYC Verification</h3>
                          <p>Your KYC identity will be verified to <strong>permanently transfer ownership</strong> on the blockchain. This action cannot be undone.</p>
                          <ul className="biometric-checklist">
                            <li><FaCheckCircle className="check-green" /> KYC document verification</li>
                            <li><FaLink className="check-blue" /> Blockchain recording</li>
                            <li><FaCheckCircle className="check-green" /> Ownership transfer</li>
                          </ul>
                          <div className="kyc-only-notice">
                            <FaExclamationTriangle /> Fingerprint & face scan skipped — biometric auth is turned off in your profile settings.
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {kycStep === 'kyc-only' && (
                    <div className="transfer-biometric-scanner">
                      <div className="biometric-icon-large kyc-icon"><FaIdCard /></div>
                      <h3>KYC Identity Confirmation</h3>
                      <p>Confirming your identity using KYC documents only (biometric skipped)</p>

                      <div className={`transfer-fp-scanner ${kycScanPhase}`}>
                        <div className="transfer-fp-visual kyc-visual">
                          <FaUserShield style={{ fontSize: '4rem', color: kycScanPhase === 'verified' ? '#10b981' : '#3b82f6' }} />
                        </div>

                        {kycScanPhase !== 'idle' && (
                          <div className="transfer-progress-bar">
                            <div className="transfer-progress-fill" style={{ width: `${Math.min(kycProgress, 100)}%` }} />
                          </div>
                        )}

                        <div className="transfer-scan-status">
                          {kycScanPhase === 'idle' && 'Ready — tap button to verify KYC'}
                          {kycScanPhase === 'scanning' && 'Verifying KYC documents...'}
                          {kycScanPhase === 'verified' && '✅ KYC Verified — Transfer executing...'}
                          {kycScanPhase === 'failed' && '❌ KYC Verification Failed — Try Again'}
                        </div>
                      </div>
                    </div>
                  )}

                  {kycStep === 'fingerprint' && (
                    <div className="transfer-biometric-scanner">
                      <div className="biometric-icon-large fingerprint"><FaFingerprint /></div>
                      <h3>Fingerprint Confirmation</h3>
                      <p>Step 1 of 2 — Confirm ownership with fingerprint</p>
                      <div className={`transfer-fp-scanner ${kycScanPhase}`}>
                        <div className="transfer-fp-visual">
                          <svg viewBox="0 0 200 200" className="transfer-fp-svg">
                            <ellipse cx="100" cy="100" rx="75" ry="90" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                            <ellipse cx="100" cy="100" rx="60" ry="75" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                            <ellipse cx="100" cy="100" rx="45" ry="60" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                            <ellipse cx="100" cy="100" rx="30" ry="45" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                          </svg>
                          {kycScanPhase === 'scanning' && <div className="transfer-fp-scanline" style={{ top: `${kycProgress}%` }} />}
                          {kycScanPhase === 'verified' && <div className="transfer-fp-check"><FaCheckCircle /></div>}
                          {kycScanPhase === 'failed' && <div className="transfer-fp-fail"><FaTimesCircle /></div>}
                        </div>
                        {kycScanPhase !== 'idle' && (
                          <div className="transfer-progress-bar">
                            <div className="transfer-progress-fill" style={{ width: `${Math.min(kycProgress, 100)}%` }} />
                          </div>
                        )}
                        <div className="transfer-scan-status">
                          {kycScanPhase === 'idle' && 'Ready — tap button to start'}
                          {kycScanPhase === 'scanning' && 'Reading fingerprint...'}
                          {kycScanPhase === 'processing' && 'Verifying...'}
                          {kycScanPhase === 'verified' && `✅ Verified — ${kycScore}% match`}
                          {kycScanPhase === 'failed' && '❌ Failed — Try again'}
                        </div>
                      </div>
                    </div>
                  )}

                  {kycStep === 'face' && (
                    <div className="transfer-biometric-scanner">
                      <div className="biometric-icon-large face-icon"><FaCamera /></div>
                      <h3>Face Camera Confirmation</h3>
                      <p>Step 2 of 2 — Final face verification</p>
                      <div className={`transfer-face-scanner ${kycScanPhase}`}>
                        <div className="transfer-face-container">
                          <video ref={kycVideoRef} autoPlay muted playsInline className="transfer-face-video" />
                          <canvas ref={kycCanvasRef} style={{ display: 'none' }} />
                          <div className="transfer-face-overlay">
                            <div className="transfer-face-guide">
                              <span className="t-corner tl" />
                              <span className="t-corner tr" />
                              <span className="t-corner bl" />
                              <span className="t-corner br" />
                            </div>
                            {kycScanPhase === 'scanning' && <div className="transfer-face-scanline" style={{ top: `${kycProgress}%` }} />}
                            {kycScanPhase === 'scanning' && <div className="transfer-scan-badge"><span className="t-dot" /> SCANNING</div>}
                            {kycScanPhase === 'processing' && <div className="transfer-scan-badge processing"><span className="t-dot" /> MATCHING</div>}
                          </div>
                          {kycScanPhase === 'verified' && <div className="transfer-face-result success"><FaCheckCircle /></div>}
                          {kycScanPhase === 'failed' && <div className="transfer-face-result fail"><FaTimesCircle /></div>}
                          {!kycVideoStream && kycScanPhase === 'idle' && (
                            <div className="transfer-face-placeholder"><FaCamera /><span>Starting camera...</span></div>
                          )}
                        </div>
                        {kycScanPhase !== 'idle' && (
                          <div className="transfer-progress-bar">
                            <div className="transfer-progress-fill face" style={{ width: `${Math.min(kycProgress, 100)}%` }} />
                          </div>
                        )}
                        <div className="transfer-scan-status">
                          {kycScanPhase === 'idle' && (kycVideoStream ? '📸 Camera active' : '⏳ Starting camera...')}
                          {kycScanPhase === 'scanning' && `Capturing... ${kycProgress}%`}
                          {kycScanPhase === 'processing' && 'Matching face...'}
                          {kycScanPhase === 'verified' && `✅ Face Verified — ${kycScore}% match`}
                          {kycScanPhase === 'failed' && `❌ Failed — ${kycScore}%`}
                        </div>
                      </div>
                    </div>
                  )}

                  {kycStep === 'complete' && (
                    <div className="kyc-complete-banner">
                      <FaCheckCircle className="kyc-complete-icon" />
                      <h3>Transfer Complete!</h3>
                      <p>Full KYC verified. Ownership transferred on blockchain.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal} disabled={processing}>Cancel</button>
              <button
                className={action.includes('reject') ? 'btn-confirm-reject' : action.includes('biometric') || action.includes('confirm') ? 'btn-confirm-biometric' : 'btn-confirm-approve'}
                onClick={() => {
                  if (action === 'owner-approve') handleOwnerAction(selectedTransfer.requestId, true);
                  else if (action === 'owner-reject') handleOwnerAction(selectedTransfer.requestId, false);
                  else if (action === 'buyer-biometric') {
                    if (kycStep === 'confirm') handleBuyerBiometric(selectedTransfer.requestId);
                    else if (kycStep === 'kyc-only' && (kycScanPhase === 'idle' || kycScanPhase === 'failed'))
                      handleKycOnlyVerify(selectedTransfer.requestId, 'buyer');
                    else if (kycStep === 'fingerprint' && (kycScanPhase === 'idle' || kycScanPhase === 'failed'))
                      handleTransferFingerprint(selectedTransfer.requestId, 'buyer');
                    else if (kycStep === 'face' && (kycScanPhase === 'idle' || kycScanPhase === 'failed'))
                      handleTransferFaceScan();
                  }
                  else if (action === 'seller-confirm') {
                    if (kycStep === 'confirm') handleSellerConfirm(selectedTransfer.requestId);
                    else if (kycStep === 'kyc-only' && (kycScanPhase === 'idle' || kycScanPhase === 'failed'))
                      handleKycOnlyVerify(selectedTransfer.requestId, 'seller');
                    else if (kycStep === 'fingerprint' && (kycScanPhase === 'idle' || kycScanPhase === 'failed'))
                      handleTransferFingerprint(selectedTransfer.requestId, 'seller');
                    else if (kycStep === 'face' && (kycScanPhase === 'idle' || kycScanPhase === 'failed'))
                      handleTransferFaceScan();
                  }
                }}
                disabled={processing || kycStep === 'complete' || (kycScanPhase !== 'idle' && kycScanPhase !== 'failed' && kycStep !== 'confirm')}
              >
                {processing ? (
                  <><span className="btn-spinner" /> Processing...</>
                ) : kycStep === 'complete' ? (
                  <><FaCheckCircle /> Done</>
                ) : kycStep === 'kyc-only' ? (
                  <><FaIdCard /> {kycScanPhase === 'failed' ? 'Retry KYC Verification' : 'Verify KYC'}</>
                ) : kycStep === 'fingerprint' ? (
                  <><FaFingerprint /> {kycScanPhase === 'failed' ? 'Retry Scan' : 'Scan Fingerprint'}</>
                ) : kycStep === 'face' ? (
                  <><FaCamera /> {kycScanPhase === 'failed' ? 'Retry Face Scan' : 'Scan Face'}</>
                ) : action === 'buyer-biometric' ? (
                  <><FaFingerprint /> Start KYC Verification</>
                ) : action === 'seller-confirm' ? (
                  <><FaShieldAlt /> Start KYC Confirmation</>
                ) : action.includes('approve') ? (
                  <><FaCheckCircle /> Confirm Approval</>
                ) : (
                  <><FaTimesCircle /> Confirm Rejection</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferRequests;
