import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyAPI, transferAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useIntelligence } from '../context/IntelligenceContext';
import { toast } from 'react-toastify';
import { 
  FaCheckCircle, 
  FaMapMarkerAlt, 
  FaHistory,
  FaArrowLeft,
  FaUser,
  FaShieldAlt,
  FaExchangeAlt,
  FaHome,
  FaTimes,
  FaDollarSign,
  FaClock,
  FaFileAlt,
  FaMapPin,

  FaLink,
  FaRulerCombined,
  FaChevronRight,
  FaLandmark,
  FaFingerprint,
  FaClipboardCheck,
  FaRegCalendarAlt,
  FaStar,
  FaLayerGroup,
  FaInfoCircle,
  FaExclamationTriangle,
  FaGavel,
  FaLock,
  FaBrain,
  FaSnowflake,
  FaBan,
  FaArchive
} from 'react-icons/fa';
import { 
  ApprovalTimeEstimator, 
  RiskScoreIndicator,
  AIPropertyDNA,
  DocumentAnalysisCard,
  MarketComparisonWidget,
  AnomalyTimeline 
} from '../components/PredictiveIndicators';
import BoundaryMap from '../components/BoundaryMap';
import './PropertyDetails.css';

const PropertyDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { predictApprovalTime, calculateRiskScore, getPropertyAnalysis } = useIntelligence();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalPrediction, setApprovalPrediction] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [propertyAnalysis, setPropertyAnalysis] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState('details');
  const heroRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Show property name in breadcrumb when hero scrolls out of view
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [property]);

  const fetchProperty = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await propertyAPI.getPropertyById(id);
      setProperty(response?.data?.property || null);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to fetch property details');
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  // Fetch AI predictions when property loads
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!property || !id) return;
      
      try {
        // Predict approval time for pending/under_review properties
        if (property.verification?.status === 'pending' || 
            property.verification?.status === 'under_review') {
          const prediction = await predictApprovalTime(id);
          setApprovalPrediction(prediction);
        }

        // Calculate risk score for all properties
        const risk = await calculateRiskScore('property', id);
        setRiskScore(risk);

        // Fetch comprehensive AI analysis
        const analysis = await getPropertyAnalysis(id);
        setPropertyAnalysis(analysis);
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
      }
    };

    fetchPredictions();
  }, [property, id, predictApprovalTime, calculateRiskScore, getPropertyAnalysis]);

  const getMarkerPosition = () => {
    const lat = property?.propertyDetails?.coordinates?.latitude;
    const lng = property?.propertyDetails?.coordinates?.longitude;
    if (lat && lng) {
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    return null;
  };

  const handleInitiateTransfer = async () => {
    if (!proposedPrice || parseFloat(proposedPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!property || !property.propertyId) {
      toast.error('Property information is missing');
      return;
    }
    setSubmitting(true);
    try {
      await transferAPI.createTransfer({
        propertyId: property.propertyId,
        proposedPrice: parseFloat(proposedPrice)
      });
      toast.success('Transfer request submitted successfully!');
      setShowTransferModal(false);
      setProposedPrice('');
      navigate('/transfers');
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error(error?.response?.data?.message || 'Failed to create transfer request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      verified: { class: 'status-verified', label: 'Verified', icon: <FaCheckCircle /> },
      pending: { class: 'status-pending', label: 'Pending', icon: <FaClock /> },
      under_review: { class: 'status-review', label: 'Under Review', icon: <FaClipboardCheck /> },
      rejected: { class: 'status-rejected', label: 'Rejected', icon: <FaTimes /> },
      needs_review: { class: 'status-needs-review', label: 'Needs Review', icon: <FaExclamationTriangle /> },
      auto_verifying: { class: 'status-pending', label: 'Auto Verifying', icon: <FaClock /> }
    };
    return configs[status] || { class: 'status-default', label: status || 'Unknown', icon: <FaInfoCircle /> };
  };

  const getPropertyStatusBadge = (status) => {
    const configs = {
      frozen: { class: 'pd-prop-status-badge frozen', label: 'Frozen', icon: <FaSnowflake /> },
      disputed: { class: 'pd-prop-status-badge disputed', label: 'Disputed', icon: <FaBan /> },
      archived: { class: 'pd-prop-status-badge archived', label: 'Archived', icon: <FaArchive /> },
      transfer_pending: { class: 'pd-prop-status-badge transfer', label: 'Transfer Pending', icon: <FaExchangeAlt /> }
    };
    return configs[status] || null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="pd-loading" role="status" aria-live="polite">
        <div className="pd-loading-card">
          <div className="pd-loader"></div>
          <p className="pd-loading-text">Loading property details...</p>
          <div className="pd-loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="pd-error-page">
        <div className="pd-error-card">
          <div className="pd-error-icon-wrap"><FaHome /></div>
          <h2>Property Not Found</h2>
          <p>The property you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <button onClick={() => navigate('/properties')} className="pd-error-btn">
            <FaArrowLeft /> Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const isOwner = property?.owner && user && property.owner._id === user.id;
  const propertyTitle = property?.propertyDetails?.title || 'Property';
  const verificationStatus = property?.verification?.status || 'pending';
  const statusConfig = getStatusConfig(verificationStatus);
  const propStatusBadge = getPropertyStatusBadge(property?.status);
  const propertyType = property?.propertyDetails?.propertyType || 'N/A';
  const city = property?.propertyDetails?.address?.city || 'N/A';
  const state = property?.propertyDetails?.address?.state || 'N/A';
  const street = property?.propertyDetails?.address?.street || '';
  const zipCode = property?.propertyDetails?.address?.zipCode || '';
  const country = property?.propertyDetails?.address?.country || 'India';
  const areaValue = property?.propertyDetails?.area?.value ?? 'N/A';
  const areaUnit = property?.propertyDetails?.area?.unit || '';
  const hasBlockchain = !!property?.blockchainHash;
  const hasBoundary = Array.isArray(property?.propertyDetails?.boundary) && property.propertyDetails.boundary.length > 0;

  return (
    <div className="pd-page">
      {/* Breadcrumb Navigation */}
      <div className={`pd-breadcrumb${isScrolled ? ' pd-breadcrumb-scrolled' : ''}`}>
        <div className="pd-breadcrumb-inner">
          <button onClick={() => navigate('/properties')} className="pd-breadcrumb-link" aria-label="Back to properties">
            <FaArrowLeft />
            <span>Properties</span>
          </button>
          <FaChevronRight className="pd-breadcrumb-sep" />
          <span className="pd-breadcrumb-current">{propertyTitle}</span>
          {isScrolled && (
            <div className="pd-breadcrumb-title">
              <h2>{propertyTitle}</h2>
              <span className="pd-breadcrumb-loc"><FaMapMarkerAlt /> {city}, {state}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── HERO SECTION ─── */}
      <section className="pd-hero" ref={heroRef}>
        <div className="pd-hero-tricolor"></div>
        <div className="pd-hero-bg-pattern"></div>
        <div className="pd-hero-inner">
          <div className="pd-hero-content">
            <div className="pd-hero-left">
              <div className="pd-hero-badges">
                <span className={`pd-status-badge ${statusConfig.class}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                <span className="pd-type-badge">
                  <FaHome /> {propertyType}
                </span>
                {hasBlockchain && (
                  <span className="pd-chain-badge">
                    <FaShieldAlt /> Secured
                  </span>
                )}
                {propStatusBadge && (
                  <span className={propStatusBadge.class}>
                    {propStatusBadge.icon} {propStatusBadge.label}
                  </span>
                )}
              </div>

              <h1 className="pd-hero-title">{propertyTitle}</h1>

              <div className="pd-hero-location">
                <FaMapMarkerAlt />
                <span>{street ? `${street}, ` : ''}{city}, {state}</span>
              </div>

              <div className="pd-hero-id">
                <FaFingerprint />
                <span>Property ID: <code>{property?.propertyId || 'N/A'}</code></span>
              </div>
            </div>

            <div className="pd-hero-right">
              {property?.valuation?.currentValue && (
                <div className="pd-hero-valuation">
                  <span className="pd-val-label">Current Valuation</span>
                  <span className="pd-val-amount">₹{property.valuation.currentValue.toLocaleString('en-IN')}</span>
                  {property?.valuation?.lastUpdated && (
                    <span className="pd-val-date">
                      Updated {formatDate(property.valuation.lastUpdated)}
                    </span>
                  )}
                </div>
              )}

              {isOwner ? (
                <div className="pd-owner-tag">
                  <FaStar /> Your Property
                </div>
              ) : (
                verificationStatus === 'verified' && property?.status === 'active' && (
                  <button className="pd-transfer-cta" onClick={() => setShowTransferModal(true)}>
                    <FaExchangeAlt /> Request Transfer
                  </button>
                )
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="pd-hero-stats">
            <div className="pd-stat-card">
              <div className="pd-stat-icon"><FaRulerCombined /></div>
              <div className="pd-stat-content">
                <span className="pd-stat-value">{areaValue} {areaUnit}</span>
                <span className="pd-stat-label">Total Area</span>
              </div>
            </div>
            <div className="pd-stat-card">
              <div className="pd-stat-icon"><FaLandmark /></div>
              <div className="pd-stat-content">
                <span className="pd-stat-value">{propertyType}</span>
                <span className="pd-stat-label">Property Type</span>
              </div>
            </div>
            <div className="pd-stat-card">
              <div className="pd-stat-icon"><FaFileAlt /></div>
              <div className="pd-stat-content">
                <span className="pd-stat-value">{property?.propertyDetails?.surveyNumber || 'N/A'}</span>
                <span className="pd-stat-label">Survey No.</span>
              </div>
            </div>
            <div className="pd-stat-card">
              <div className="pd-stat-icon"><FaLayerGroup /></div>
              <div className="pd-stat-content">
                <span className="pd-stat-value">{property?.ownershipHistory?.length || 0}</span>
                <span className="pd-stat-label">Transfers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <div className="pd-layout">
        <main className="pd-main">
          {/* Tab Navigation */}
          <div className="pd-tabs">
            <button
              className={`pd-tab ${activeInfoTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('details')}
            >
              <FaFileAlt /> Details
            </button>
            <button
              className={`pd-tab ${activeInfoTab === 'location' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('location')}
            >
              <FaMapMarkerAlt /> Location
            </button>
            <button
              className={`pd-tab ${activeInfoTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveInfoTab('history')}
            >
              <FaHistory /> History
            </button>
          </div>

          {/* Details Tab */}
          {activeInfoTab === 'details' && (
            <div className="pd-section pd-fade-in">
              <div className="pd-section-header">
                <div className="pd-section-icon"><FaFileAlt /></div>
                <div>
                  <h2>Property Information</h2>
                  <p>Comprehensive details about this property</p>
                </div>
              </div>

              <div className="pd-info-grid">
                <div className="pd-info-item">
                  <div className="pd-info-icon"><FaHome /></div>
                  <div className="pd-info-body">
                    <span className="pd-info-label">Property Type</span>
                    <span className="pd-info-value">{propertyType}</span>
                  </div>
                </div>
                <div className="pd-info-item">
                  <div className="pd-info-icon"><FaFileAlt /></div>
                  <div className="pd-info-body">
                    <span className="pd-info-label">Survey Number</span>
                    <span className="pd-info-value">{property?.propertyDetails?.surveyNumber || 'N/A'}</span>
                  </div>
                </div>
                <div className="pd-info-item">
                  <div className="pd-info-icon"><FaGavel /></div>
                  <div className="pd-info-body">
                    <span className="pd-info-label">Plot Number</span>
                    <span className="pd-info-value">{property?.propertyDetails?.plotNumber || 'N/A'}</span>
                  </div>
                </div>
                <div className="pd-info-item">
                  <div className="pd-info-icon"><FaRulerCombined /></div>
                  <div className="pd-info-body">
                    <span className="pd-info-label">Total Area</span>
                    <span className="pd-info-value">{areaValue} {areaUnit}</span>
                  </div>
                </div>
                <div className="pd-info-item">
                  <div className="pd-info-icon"><FaClipboardCheck /></div>
                  <div className="pd-info-body">
                    <span className="pd-info-label">Status</span>
                    <span className="pd-info-value">{property?.status || 'N/A'}</span>
                  </div>
                </div>
                {hasBoundary && (
                  <div className="pd-info-item">
                    <div className="pd-info-icon"><FaMapPin /></div>
                    <div className="pd-info-body">
                      <span className="pd-info-label">Boundary Points</span>
                      <span className="pd-info-value">{property.propertyDetails.boundary.length} marked</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Intelligence Hub Section */}
              {(approvalPrediction || riskScore || propertyAnalysis) && (
                <div className="pd-ai-insights">
                  <div className="pd-section-header">
                    <div className="pd-section-icon pd-ai-icon"><FaBrain /></div>
                    <div>
                      <h2>AI Intelligence Hub</h2>
                      <p>Neural analysis • Trust DNA • Market intelligence</p>
                    </div>
                    <div className="pd-ai-live-badge">
                      <span className="pd-ai-live-dot" />
                      LIVE
                    </div>
                  </div>

                  {/* Trust DNA + Market row */}
                  {propertyAnalysis && (
                    <div className="pd-ai-grid-2col">
                      <AIPropertyDNA trustDNA={propertyAnalysis.trustDNA} />
                      <MarketComparisonWidget marketComparison={propertyAnalysis.marketComparison} />
                    </div>
                  )}

                  {/* Existing predictions row */}
                  <div className="pd-ai-grid">
                    {approvalPrediction && (
                      <ApprovalTimeEstimator 
                        estimatedHours={approvalPrediction.estimatedHours}
                        confidence={approvalPrediction.confidence}
                        factors={approvalPrediction.factors}
                      />
                    )}
                    {riskScore && (
                      <RiskScoreIndicator 
                        score={riskScore.overallScore}
                        riskLevel={riskScore.riskLevel}
                        factors={riskScore.factors?.map(f => `${f.category}: ${f.detail || f.score}`) || riskScore.recommendations || []}
                      />
                    )}
                  </div>

                  {/* Document Intelligence + Anomalies row */}
                  {propertyAnalysis && (
                    <div className="pd-ai-grid-2col">
                      <DocumentAnalysisCard documentAnalysis={propertyAnalysis.documentAnalysis} />
                      <AnomalyTimeline 
                        anomalies={propertyAnalysis.anomalies} 
                        insights={propertyAnalysis.insights} 
                      />
                    </div>
                  )}
                </div>
              )}

              {property?.propertyDetails?.description && (
                <div className="pd-description">
                  <h3><FaInfoCircle /> Description</h3>
                  <p>{property.propertyDetails.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Location Tab */}
          {activeInfoTab === 'location' && (
            <div className="pd-section pd-fade-in">
              <div className="pd-section-header">
                <div className="pd-section-icon"><FaMapMarkerAlt /></div>
                <div>
                  <h2>Property Location</h2>
                  <p>Address and geographic coordinates</p>
                </div>
              </div>

              <div className="pd-location-card">
                <div className="pd-address-block">
                  <div className="pd-address-row">
                    <span className="pd-address-label">Street</span>
                    <span className="pd-address-value">{street || 'N/A'}</span>
                  </div>
                  <div className="pd-address-row">
                    <span className="pd-address-label">City</span>
                    <span className="pd-address-value">{city}</span>
                  </div>
                  <div className="pd-address-row">
                    <span className="pd-address-label">State</span>
                    <span className="pd-address-value">{state}</span>
                  </div>
                  <div className="pd-address-row">
                    <span className="pd-address-label">Zip Code</span>
                    <span className="pd-address-value">{zipCode || 'N/A'}</span>
                  </div>
                  <div className="pd-address-row">
                    <span className="pd-address-label">Country</span>
                    <span className="pd-address-value">{country}</span>
                  </div>
                  {getMarkerPosition() && (
                    <div className="pd-address-row pd-coords-row">
                      <span className="pd-address-label">GPS Coordinates</span>
                      <span className="pd-address-value pd-coords-value">
                        <FaMapPin />
                        {property.propertyDetails.coordinates.latitude}, {property.propertyDetails.coordinates.longitude}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {getMarkerPosition() && (
                <div className="pd-map-section">
                  <button
                    type="button"
                    className="pd-map-toggle"
                    onClick={() => setShowMap(!showMap)}
                    aria-expanded={showMap}
                  >
                    <FaMapPin /> {showMap ? 'Hide Map' : 'Show Property Map'}
                    <FaChevronRight className={`pd-map-chevron ${showMap ? 'open' : ''}`} />
                  </button>

                  {showMap && (
                    <div className="pd-map-wrapper pd-fade-in">
                      <div className="pd-map-container">
                        <BoundaryMap
                          centerLat={getMarkerPosition().lat}
                          centerLng={getMarkerPosition().lng}
                          boundaryPoints={property?.propertyDetails?.boundary || []}
                          height="450px"
                          title={propertyTitle}
                        />
                      </div>
                      {hasBoundary && (
                        <div className="pd-map-legend">
                          <div className="pd-legend-item">
                            <span className="pd-legend-dot center"></span>
                            <span>Property Center</span>
                          </div>
                          <div className="pd-legend-item">
                            <span className="pd-legend-dot boundary"></span>
                            <span>Boundary ({property.propertyDetails.boundary.length} pts)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeInfoTab === 'history' && (
            <div className="pd-section pd-fade-in">
              <div className="pd-section-header">
                <div className="pd-section-icon"><FaHistory /></div>
                <div>
                  <h2>Ownership History</h2>
                  <p>Complete chain of property ownership</p>
                </div>
              </div>

              {Array.isArray(property?.ownershipHistory) && property.ownershipHistory.length > 0 ? (
                <div className="pd-timeline">
                  {property.ownershipHistory.map((transfer, index) => (
                    <div key={index} className={`pd-timeline-item ${index === 0 ? 'latest' : ''}`}>
                      <div className="pd-timeline-marker">
                        <div className="pd-timeline-dot"></div>
                        {index < property.ownershipHistory.length - 1 && <div className="pd-timeline-line"></div>}
                      </div>
                      <div className="pd-timeline-card">
                        <div className="pd-timeline-header">
                          <div className="pd-timeline-date">
                            <FaRegCalendarAlt />
                            <span>{formatDate(transfer.transferDate)}</span>
                          </div>
                          <div className="pd-timeline-price">
                            ₹{transfer?.transferPrice ? transfer.transferPrice.toLocaleString('en-IN') : '0'}
                          </div>
                        </div>
                        <div className="pd-timeline-parties">
                          <div className="pd-party">
                            <span className="pd-party-label">From</span>
                            <span className="pd-party-name">{transfer?.previousOwner?.name || 'Unknown'}</span>
                          </div>
                          <div className="pd-party-arrow"><FaChevronRight /></div>
                          <div className="pd-party">
                            <span className="pd-party-label">To</span>
                            <span className="pd-party-name">{transfer?.newOwner?.name || 'Unknown'}</span>
                          </div>
                        </div>
                        {transfer?.transferHash && (
                          <div className="pd-timeline-hash">
                            <FaLink />
                            <code>{String(transfer.transferHash).substring(0, 32)}...</code>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pd-empty">
                  <div className="pd-empty-icon"><FaHistory /></div>
                  <h3>No Transfer History</h3>
                  <p>This is the original registration — no transfers have occurred yet.</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ─── SIDEBAR ─── */}
        <aside className="pd-sidebar">
          {/* Owner Card */}
          {property?.owner && (
            <div className="pd-sidebar-card pd-owner-card">
              <div className="pd-sidebar-label">
                <FaUser /> Property Owner
              </div>
              <div className="pd-owner-info">
                <div className="pd-owner-avatar">
                  {property.owner?.name ? String(property.owner.name).charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="pd-owner-details">
                  <span className="pd-owner-name">{property.owner?.name || 'Unknown'}</span>
                  <span className="pd-owner-email">{property.owner?.email || 'N/A'}</span>
                </div>
              </div>
              {isOwner && (
                <div className="pd-owner-self-tag">
                  <FaStar /> This is your property
                </div>
              )}
            </div>
          )}

          {/* Security Status */}
          {hasBlockchain && (
            <div className="pd-sidebar-card pd-security-card">
              <div className="pd-security-header">
                <div className="pd-security-icon"><FaShieldAlt /></div>
                <div>
                  <h3>Digitally Secured</h3>
                  <p>Record verified &amp; tamper-proof</p>
                </div>
                <div className="pd-verified-pulse"></div>
              </div>

              <div className="pd-security-checks">
                <div className="pd-security-item verified">
                  <FaCheckCircle />
                  <span>Identity Verified</span>
                </div>
                <div className="pd-security-item verified">
                  <FaCheckCircle />
                  <span>Document Authenticated</span>
                </div>
                <div className="pd-security-item verified">
                  <FaCheckCircle />
                  <span>Registry Confirmed</span>
                </div>
                <div className="pd-security-item verified">
                  <FaLock />
                  <span>Immutable Record</span>
                </div>
              </div>

              <div className="pd-security-footer">
                <span><FaShieldAlt /> Government Secured</span>
                <span><FaLock /> Tamper-Proof</span>
              </div>
            </div>
          )}

          {/* Verification Card */}
          {property?.verification?.status === 'verified' && property?.verification?.verifiedBy && (
            <div className="pd-sidebar-card pd-verify-card">
              <div className="pd-sidebar-label">
                <FaClipboardCheck /> Verification Details
              </div>
              <div className="pd-verify-details">
                <div className="pd-verify-row">
                  <span className="pd-verify-label">Verified By</span>
                  <span className="pd-verify-value">{property.verification.verifiedBy?.name || 'Unknown'}</span>
                </div>
                <div className="pd-verify-row">
                  <span className="pd-verify-label">Date</span>
                  <span className="pd-verify-value">{formatDate(property.verification?.verifiedAt)}</span>
                </div>
                {property.verification?.inspectorNotes && (
                  <div className="pd-verify-notes">
                    <FaInfoCircle />
                    <p>{property.verification.inspectorNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ─── TRANSFER MODAL ─── */}
      {showTransferModal && (
        <div className="pd-modal-overlay" onClick={() => setShowTransferModal(false)} role="dialog" aria-modal="true">
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div className="pd-modal-title-group">
                <div className="pd-modal-icon"><FaExchangeAlt /></div>
                <div>
                  <h2>Request Transfer</h2>
                  <p>Submit an ownership transfer request</p>
                </div>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="pd-modal-close" aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <div className="pd-modal-body">
              <div className="pd-modal-property-card">
                <div className="pd-modal-prop-icon"><FaHome /></div>
                <div className="pd-modal-prop-info">
                  <h3>{propertyTitle}</h3>
                  <p><FaFingerprint /> ID: {property?.propertyId || 'N/A'}</p>
                  <p><FaMapMarkerAlt /> {city}, {state}</p>
                </div>
              </div>

              <div className="pd-modal-form">
                <label>
                  <FaDollarSign /> Proposed Price (₹)
                </label>
                <div className="pd-price-input">
                  <span className="pd-price-symbol">₹</span>
                  <input
                    type="number"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="Enter your offer"
                    min="0"
                    step="1000"
                    aria-label="Proposed price in rupees"
                  />
                </div>
                <p className="pd-form-hint">Enter the amount you wish to offer for this property</p>
              </div>

              {property?.valuation?.currentValue && (
                <div className="pd-modal-valuation">
                  <span>Current Valuation</span>
                  <strong>₹{property.valuation.currentValue.toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>

            <div className="pd-modal-footer">
              <button onClick={() => setShowTransferModal(false)} className="pd-btn-cancel">
                Cancel
              </button>
              <button 
                onClick={handleInitiateTransfer}
                disabled={!proposedPrice || submitting}
                className="pd-btn-submit"
              >
                {submitting ? (
                  <>
                    <span className="pd-btn-spinner"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaExchangeAlt /> Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;
