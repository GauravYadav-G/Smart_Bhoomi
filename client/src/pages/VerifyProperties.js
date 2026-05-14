import React, { useState, useEffect, useCallback } from 'react';
import { propertyAPI } from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaEye, 
  FaClock, 
  FaBan,
  FaHome,
  FaMapMarkerAlt,
  FaUser,
  FaShieldAlt,
  FaTimes,
  FaChartArea,
  FaIdCard
} from 'react-icons/fa';
import './VerifyProperties.css';

const VerifyProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [processing, setProcessing] = useState(false);
  const [tabCounts, setTabCounts] = useState({
    pending: 0,
    verified: 0,
    rejected: 0
  });
  const [isScrolled, setIsScrolled] = useState(false);

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

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      let verificationStatus;
      
      if (activeTab === 'pending') {
        verificationStatus = 'pending,under_review';
      } else if (activeTab === 'verified') {
        verificationStatus = 'verified';
      } else if (activeTab === 'rejected') {
        verificationStatus = 'rejected';
      }

      const response = await propertyAPI.getAllProperties({
        verificationStatus
      });
      setProperties(response.data.properties || []);
      
      // Update counts
      setTabCounts(prev => ({
        ...prev,
        [activeTab]: response.data.properties?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleVerification = async (propertyId, status) => {
    if (status === 'rejected' && !notes) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      await propertyAPI.verifyProperty(propertyId, {
        status,
        rejectionReason: status === 'rejected' ? notes : null,
        inspectorNotes: notes || undefined
      });
      toast.success(`✅ Property ${status === 'verified' ? 'verified' : 'rejected'} successfully!`);
      fetchProperties();
      closeModal();
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setSelectedProperty(null);
    setNotes('');
    setAction(null);
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: <FaClock />, class: 'pending', color: '#f59e0b' },
      under_review: { icon: <FaClock />, class: 'review', color: '#3b82f6' },
      verified: { icon: <FaCheckCircle />, class: 'verified', color: '#10b981' },
      rejected: { icon: <FaTimesCircle />, class: 'rejected', color: '#ef4444' }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="verify-loading">
        <div className="loading-spinner"></div>
        <p>Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="verify-page">
      {/* Header */}
      <div className={`page-hero${isScrolled ? ' scrolled' : ''}`} role="banner" aria-label="Property Verification">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Property Verification</h1>
            <p>Review and manage property registrations</p>
          </div>
        </div>

        <div className="stats-bar" role="group" aria-label="Verification statistics">
          <div className="stat-card" aria-label={`Pending: ${tabCounts.pending}`}>
            <div className="stat-icon pending" aria-hidden="true">
              <FaClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">{tabCounts.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card" aria-label={`Verified: ${tabCounts.verified}`}>
            <div className="stat-icon verified" aria-hidden="true">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{tabCounts.verified}</span>
              <span className="stat-label">Verified</span>
            </div>
          </div>
          <div className="stat-card" aria-label={`Rejected: ${tabCounts.rejected}`}>
            <div className="stat-icon total" aria-hidden="true">
              <FaBan />
            </div>
            <div className="stat-info">
              <span className="stat-value">{tabCounts.rejected}</span>
              <span className="stat-label">Rejected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="verify-container">
        {/* Tabs */}
        <div className="verification-tabs">
          <button
            className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <FaClock className="tab-icon" />
            <div className="tab-content">
              <span className="tab-label">Pending</span>
              <span className="tab-count">{tabCounts.pending}</span>
            </div>
          </button>

          <button
            className={`tab-button ${activeTab === 'verified' ? 'active' : ''}`}
            onClick={() => setActiveTab('verified')}
          >
            <FaCheckCircle className="tab-icon" />
            <div className="tab-content">
              <span className="tab-label">Verified</span>
              <span className="tab-count">{tabCounts.verified}</span>
            </div>
          </button>

          <button
            className={`tab-button ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <FaBan className="tab-icon" />
            <div className="tab-content">
              <span className="tab-label">Rejected</span>
              <span className="tab-count">{tabCounts.rejected}</span>
            </div>
          </button>
        </div>

        {/* Properties List */}
        {properties.length > 0 ? (
          <div className="properties-grid">
            {properties.map(property => {
              const statusConfig = getStatusConfig(property.verification?.status);
              
              return (
                <div key={property._id} className="property-card">
                  <div className="card-header">
                    <div className="property-title-section">
                      <FaHome className="property-icon" />
                      <div>
                        <h3>{property.propertyDetails?.title || 'Property'}</h3>
                        <span className="property-id">ID: {property.propertyId}</span>
                      </div>
                    </div>
                    <div 
                      className={`status-badge ${statusConfig.class}`}
                      style={{ borderColor: statusConfig.color }}
                    >
                      {statusConfig.icon}
                      <span>{property.verification?.status || 'pending'}</span>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="info-grid">
                      <div className="info-item">
                        <FaIdCard className="info-icon" />
                        <div>
                          <span className="info-label">Type</span>
                          <span className="info-value">{property.propertyDetails?.propertyType || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="info-item">
                        <FaChartArea className="info-icon" />
                        <div>
                          <span className="info-label">Area</span>
                          <span className="info-value">
                            {property.propertyDetails?.area?.value || 'N/A'} {property.propertyDetails?.area?.unit || ''}
                          </span>
                        </div>
                      </div>

                      <div className="info-item">
                        <FaUser className="info-icon" />
                        <div>
                          <span className="info-label">Owner</span>
                          <span className="info-value">{property.owner?.name || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="info-item">
                        <FaMapMarkerAlt className="info-icon" />
                        <div>
                          <span className="info-label">Location</span>
                          <span className="info-value">
                            {property.propertyDetails?.address?.city || 'N/A'}, {property.propertyDetails?.address?.state || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {property.blockchainHash && (
                      <div className="blockchain-badge">
                        <FaShieldAlt className="blockchain-icon" />
                        <span>Secured ✓</span>
                      </div>
                    )}

                    {/* Verification Info for verified/rejected */}
                    {(activeTab === 'verified' || activeTab === 'rejected') && property.verification?.verifiedBy && (
                      <div className="verification-details">
                        <p><strong>Verified By:</strong> {property.verification.verifiedBy.name}</p>
                        <p><strong>Date:</strong> {new Date(property.verification.verifiedAt).toLocaleDateString('en-IN')}</p>
                        {property.verification.inspectorNotes && (
                          <p className="notes"><strong>Notes:</strong> {property.verification.inspectorNotes}</p>
                        )}
                        {property.verification.rejectionReason && (
                          <p className="rejection"><strong>Reason:</strong> {property.verification.rejectionReason}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <button
                      className="btn-view"
                      onClick={() => {
                        setSelectedProperty(property);
                        setAction('view');
                      }}
                    >
                      <FaEye /> View Details
                    </button>
                    
                    {activeTab === 'pending' && (
                      <>
                        <button
                          className="btn-verify"
                          onClick={() => {
                            setSelectedProperty(property);
                            setAction('approve');
                          }}
                        >
                          <FaCheckCircle /> Verify
                        </button>
                        <button
                          className="btn-reject-action"
                          onClick={() => {
                            setSelectedProperty(property);
                            setAction('reject');
                          }}
                        >
                          <FaTimesCircle /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            {activeTab === 'pending' && <FaClock className="empty-icon" />}
            {activeTab === 'verified' && <FaCheckCircle className="empty-icon" />}
            {activeTab === 'rejected' && <FaBan className="empty-icon" />}
            <h3>No Properties Found</h3>
            <p>
              {activeTab === 'pending' && 'No properties pending verification at the moment.'}
              {activeTab === 'verified' && 'No verified properties yet.'}
              {activeTab === 'rejected' && 'No rejected properties.'}
            </p>
            {activeTab === 'pending' && (
              <p className="hint">💡 Properties will appear here after owners register them.</p>
            )}
          </div>
        )}
      </div>

      {/* Action Modal (Approve/Reject) */}
      {selectedProperty && action && action !== 'view' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="action-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {action === 'approve' ? (
                  <>
                    <FaCheckCircle className="modal-icon approve" />
                    Verify Property
                  </>
                ) : (
                  <>
                    <FaTimesCircle className="modal-icon reject" />
                    Reject Property
                  </>
                )}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <div className="property-summary">
                <h3>{selectedProperty.propertyDetails?.title}</h3>
                <p className="summary-item">
                  <strong>Owner:</strong> {selectedProperty.owner?.name}
                </p>
                <p className="summary-item">
                  <strong>ID:</strong> {selectedProperty.propertyId}
                </p>
              </div>

              <div className="form-field">
                <label>
                  {action === 'approve' ? 'Verification Notes (Optional)' : 'Reason for Rejection *'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={action === 'approve' ? 'Add verification notes...' : 'Explain why you are rejecting...'}
                  rows="4"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal} disabled={processing}>
                Cancel
              </button>
              <button
                className={action === 'approve' ? 'btn-confirm-verify' : 'btn-confirm-reject'}
                onClick={() => handleVerification(
                  selectedProperty.propertyId,
                  action === 'approve' ? 'verified' : 'rejected'
                )}
                disabled={processing || (action === 'reject' && !notes)}
              >
                {processing ? (
                  <>
                    <span className="btn-spinner"></span>
                    Processing...
                  </>
                ) : (
                  action === 'approve' ? 'Verify Property' : 'Reject Property'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedProperty && action === 'view' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FaHome className="modal-icon" />
                Property Details
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <div className="details-section">
                <h3>Property Information</h3>
                <div className="details-content">
                  <p><strong>Property ID:</strong> {selectedProperty.propertyId}</p>
                  <p><strong>Title:</strong> {selectedProperty.propertyDetails?.title}</p>
                  <p><strong>Type:</strong> {selectedProperty.propertyDetails?.propertyType}</p>
                  <p><strong>Description:</strong> {selectedProperty.propertyDetails?.description}</p>
                  <p><strong>Area:</strong> {selectedProperty.propertyDetails?.area?.value} {selectedProperty.propertyDetails?.area?.unit}</p>
                  {selectedProperty.propertyDetails?.surveyNumber && (
                    <p><strong>Survey Number:</strong> {selectedProperty.propertyDetails.surveyNumber}</p>
                  )}
                </div>
              </div>

              <div className="details-section">
                <h3>Owner Details</h3>
                <div className="details-content">
                  <p><strong>Name:</strong> {selectedProperty.owner?.name}</p>
                  <p><strong>Email:</strong> {selectedProperty.owner?.email}</p>
                </div>
              </div>

              <div className="details-section">
                <h3>Location</h3>
                <div className="details-content">
                  <p>{selectedProperty.propertyDetails?.address?.street}</p>
                  <p>{selectedProperty.propertyDetails?.address?.city}, {selectedProperty.propertyDetails?.address?.state}</p>
                  <p>{selectedProperty.propertyDetails?.address?.zipCode}, {selectedProperty.propertyDetails?.address?.country}</p>
                </div>
              </div>

              <div className="details-section">
                <h3>Security Status</h3>
                <div className="details-content">
                  <p><strong>Record Status:</strong> Digitally Secured ✓</p>
                  <p><strong>Integrity:</strong> Verified &amp; Tamper-Proof</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-close-modal" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyProperties;
