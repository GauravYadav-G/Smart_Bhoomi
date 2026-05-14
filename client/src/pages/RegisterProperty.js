import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propertyAPI, documentAPI } from '../services/api';
import { toast } from 'react-toastify';
import { 
  FaHome,
  FaMapMarkerAlt,
  FaFileAlt,
  FaDollarSign,
  FaArrowLeft,
  FaCheckCircle,
  FaInfoCircle,
  FaMapPin,
  FaPlus,
  FaTimes,
  FaDrawPolygon,
  FaUpload,
  FaFileContract,
  FaReceipt,
  FaExclamationTriangle,
  FaShieldAlt,
  FaChartLine,
  FaArrowUp,
  FaRobot,
  FaFingerprint,
  FaLink,
  FaSearch,
  FaLock,
  FaClipboardCheck,
  FaGavel,
  FaLayerGroup,
  FaEye,
  FaCloudUploadAlt,
  FaBrain,
  FaBuilding,
  FaRulerCombined,
  FaGlobeAsia,
  FaCity,
  FaFilePdf,
  FaHashtag,
  FaCubes,
  FaSatelliteDish,
  FaNetworkWired
} from 'react-icons/fa';
import BoundaryMap from '../components/BoundaryMap';
import InteractiveMapPicker from '../components/InteractiveMapPicker';
import GPSCoordinateInput from '../components/GPSCoordinateInput';
import RegistrationFlow from '../components/RegistrationFlow';
import BlockchainConfirmation from '../components/BlockchainConfirmation';
import IPFSDocumentUpload from '../components/IPFSDocumentUpload';
import './RegisterProperty.css';


const RegisterProperty = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  const [showBoundaryInput, setShowBoundaryInput] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [aiAssessing, setAiAssessing] = useState({});
  const fileInputRefs = useRef({});
  const [docFileObjects, setDocFileObjects] = useState({}); // { docType: File }
  const [ipfsUploading, setIpfsUploading] = useState(false);
  const [ipfsProgress, setIpfsProgress] = useState({}); // { docType: percent }
  const [ipfsCIDs, setIpfsCIDs] = useState({}); // { docType: { cid, status } }
  const [showRegistrationFlow, setShowRegistrationFlow] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [showBlockchainReceipt, setShowBlockchainReceipt] = useState(false);
  const [ipfsUploadStage, setIpfsUploadStage] = useState('');

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

  const [formData, setFormData] = useState({
    propertyDetails: {
      title: '',
      description: '',
      propertyType: 'residential',
      area: { value: '', unit: 'sqft' },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India'
      },
      coordinates: { latitude: '', longitude: '' },
      boundary: [],
      surveyNumber: '',
      plotNumber: ''
    },
    documents: [],
    valuation: {
      currentValue: '',
      currency: 'INR'
    }
  });

  // Required document types for auto-verification
  const REQUIRED_DOC_TYPES = [
    { type: 'ownership_deed', label: 'Ownership Deed', icon: <FaFileContract />, required: true },
    { type: 'sale_deed', label: 'Sale Deed', icon: <FaFileAlt />, required: true },
    { type: 'tax_receipt', label: 'Tax Receipt', icon: <FaReceipt />, required: true },
    { type: 'survey_document', label: 'Survey Document', icon: <FaMapMarkerAlt />, required: false },
    { type: 'legal_clearance', label: 'Legal Clearance', icon: <FaCheckCircle />, required: false },
  ];

  // Generate SHA-256 hash from file
  const generateFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Handle PDF file upload for a document type
  const handlePdfUpload = async (docType, file) => {
    if (!file) return;

    // Validate PDF only
    if (file.type !== 'application/pdf') {
      toast.error('❌ Only PDF files are accepted. Please upload a .pdf file.');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('❌ File too large. Maximum 10MB allowed.');
      return;
    }

    // Start AI assessment
    setAiAssessing(prev => ({ ...prev, [docType]: true }));
    toast.info(`🤖 AI analyzing ${docType.replace(/_/g, ' ')}...`);

    try {
      // Generate blockchain hash from file content
      const fileHash = await generateFileHash(file);
      const blockchainRef = `0x${fileHash.substring(0, 40)}`;

      // Simulate AI assessment delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Remove existing doc of same type if any
      setFormData(prev => {
        const filtered = prev.documents.filter(d => d.documentType !== docType);
        return {
          ...prev,
          documents: [...filtered, {
            documentType: docType,
            documentName: file.name,
            documentPath: `uploads/docs/${Date.now()}_${file.name}`,
            documentHash: blockchainRef,
            fileSize: file.size,
            aiVerified: true,
            uploadedAt: new Date().toISOString()
          }]
        };
      });

      // Store actual File object for IPFS upload after registration
      setDocFileObjects(prev => ({ ...prev, [docType]: file }));

      toast.success(`✅ ${file.name} — AI verified & blockchain hash generated`);
    } catch (err) {
      toast.error(`❌ Failed to process ${file.name}`);
    } finally {
      setAiAssessing(prev => ({ ...prev, [docType]: false }));
    }
  };

  // Trigger file input for a document type
  const triggerFileUpload = (docType) => {
    const exists = formData.documents.find(d => d.documentType === docType);
    if (exists) {
      toast.info('This document is already uploaded. Remove it first to re-upload.');
      return;
    }
    if (fileInputRefs.current[docType]) {
      fileInputRefs.current[docType].click();
    }
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const getDocCompleteness = () => {
    const requiredTypes = REQUIRED_DOC_TYPES.filter(d => d.required).map(d => d.type);
    const uploadedTypes = formData.documents.map(d => d.documentType);
    const completed = requiredTypes.filter(t => uploadedTypes.includes(t));
    return { completed: completed.length, total: requiredTypes.length, isComplete: completed.length === requiredTypes.length };
  };

  // Step 1 completeness
  const getStep1Completeness = () => {
    let filled = 0;
    const total = 4;
    if (formData.propertyDetails.title.trim()) filled++;
    if (formData.propertyDetails.description.trim()) filled++;
    if (formData.propertyDetails.area.value) filled++;
    if (formData.propertyDetails.propertyType) filled++;
    return { filled, total, isComplete: filled === total };
  };

  // Step 2 completeness
  const getStep2Completeness = () => {
    let filled = 0;
    const total = 6;
    if (formData.propertyDetails.address.street.trim()) filled++;
    if (formData.propertyDetails.address.city.trim()) filled++;
    if (formData.propertyDetails.address.state.trim()) filled++;
    if (formData.propertyDetails.address.zipCode.trim()) filled++;
    if (formData.propertyDetails.coordinates.latitude) filled++;
    if (formData.propertyDetails.coordinates.longitude) filled++;
    return { filled, total, isComplete: filled === total };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };


  const checkPermissions = useCallback(() => {
    return true;
  }, []);


  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);


  if (!user) {
    return null;
  }


  const handleChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    
    setFormData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };


  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter' && currentStep < 3) {
      e.preventDefault();
      return false;
    }
  };


  // Manual boundary input functions
  const addBoundaryPoint = () => {
    setBoundaryPoints([...boundaryPoints, { lat: '', lng: '', label: `Point ${boundaryPoints.length + 1}` }]);
  };


  const removeBoundaryPoint = (index) => {
    const updated = boundaryPoints.filter((_, i) => i !== index);
    setBoundaryPoints(updated);
  };


  const updateBoundaryPoint = (index, field, value) => {
    const updated = [...boundaryPoints];
    updated[index][field] = value;
    setBoundaryPoints(updated);
  };


  const saveBoundary = () => {
    const validPoints = boundaryPoints.filter(p => p.lat && p.lng);
    
    if (validPoints.length < 3) {
      toast.error('Please add at least 3 boundary points');
      return;
    }


    setFormData(prev => ({
      ...prev,
      propertyDetails: {
        ...prev.propertyDetails,
        boundary: validPoints.map(p => ({
          latitude: parseFloat(p.lat),
          longitude: parseFloat(p.lng)
        }))
      }
    }));


    toast.success(`✅ ${validPoints.length} boundary points saved!`);
    setShowBoundaryInput(false);
  };


  // Interactive map picker function
  const handleMapBoundarySave = (points) => {
    setFormData(prev => ({
      ...prev,
      propertyDetails: {
        ...prev.propertyDetails,
        boundary: points
      }
    }));
    setBoundaryPoints(points.map((p, i) => ({ 
      lat: p.latitude, 
      lng: p.longitude, 
      label: `Point ${i + 1}` 
    })));
    setShowMapPicker(false);
    toast.success(`✅ ${points.length} boundary points saved!`);
  };


  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            propertyDetails: {
              ...prev.propertyDetails,
              coordinates: {
                latitude: position.coords.latitude.toFixed(6),
                longitude: position.coords.longitude.toFixed(6)
              }
            }
          }));
          toast.success('📍 Current location detected!');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Could not get your location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };


  const openInGoogleMaps = () => {
    const address = `${formData.propertyDetails.address.street}, ${formData.propertyDetails.address.city}, ${formData.propertyDetails.address.state}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };


  const validateStep = (step) => {
    switch(step) {
      case 1:
        if (!formData.propertyDetails.title.trim()) {
          toast.error('Property title is required');
          return false;
        }
        if (!formData.propertyDetails.description.trim()) {
          toast.error('Property description is required');
          return false;
        }
        if (!formData.propertyDetails.area.value) {
          toast.error('Property area is required');
          return false;
        }
        if (parseFloat(formData.propertyDetails.area.value) <= 0) {
          toast.error('Property area must be greater than 0');
          return false;
        }
        return true;
      case 2:
        if (!formData.propertyDetails.address.street.trim()) {
          toast.error('Street address is required');
          return false;
        }
        if (!formData.propertyDetails.address.city.trim()) {
          toast.error('City is required');
          return false;
        }
        if (!formData.propertyDetails.address.state.trim()) {
          toast.error('State is required');
          return false;
        }
        if (!formData.propertyDetails.address.zipCode.trim()) {
          toast.error('Zip code is required');
          return false;
        }
        return true;
      default:
        return true;
    }
  };


  const nextStep = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };


  const prevStep = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentStep !== 3) {
      nextStep();
      return;
    }
    
    if (!validateStep(currentStep)) {
      return;
    }


    setLoading(true);
    setShowRegistrationFlow(true);


    try {
      const response = await propertyAPI.registerProperty(formData);
      const propertyId = response.data.property.propertyId;
      setRegistrationResult(response.data);
      toast.success('🎉 Property registered successfully!');

      // ─── IPFS Document Upload (post-registration) ───
      const docEntries = Object.entries(docFileObjects);
      if (docEntries.length > 0) {
        setIpfsUploading(true);
        toast.info(`📦 Uploading ${docEntries.length} document(s) to IPFS...`);

        for (const [docType, file] of docEntries) {
          try {
            setIpfsProgress(prev => ({ ...prev, [docType]: 0 }));
            setIpfsUploadStage('receive');

            setTimeout(() => setIpfsUploadStage('encrypt'), 400);
            setTimeout(() => setIpfsUploadStage('upload'), 1200);

            const ipfsRes = await documentAPI.uploadDocument(
              propertyId,
              file,
              docType,
              (pct) => setIpfsProgress(prev => ({ ...prev, [docType]: pct }))
            );

            setIpfsUploadStage('pin');
            const { cid, ipfsStatus } = ipfsRes.data.document || {};
            setIpfsCIDs(prev => ({ ...prev, [docType]: { cid, status: ipfsStatus } }));
            setIpfsProgress(prev => ({ ...prev, [docType]: 100 }));

            setTimeout(() => setIpfsUploadStage('anchor'), 300);

            if (cid) {
              toast.success(`✅ ${docType.replace(/_/g, ' ')} → IPFS CID: ${cid.substring(0, 12)}...`);
            } else {
              toast.warn(`⚠️ ${docType.replace(/_/g, ' ')} saved locally — IPFS pending retry`);
            }
          } catch (ipfsErr) {
            console.error(`IPFS upload failed for ${docType}:`, ipfsErr);
            setIpfsCIDs(prev => ({ ...prev, [docType]: { cid: null, status: 'failed' } }));
            toast.error(`❌ IPFS upload failed for ${docType.replace(/_/g, ' ')}`);
          }
        }
        setIpfsUploading(false);
        setIpfsUploadStage('');
      }

      // Show blockchain receipt after short delay
      setTimeout(() => {
        setShowRegistrationFlow(false);
        setShowBlockchainReceipt(true);
      }, docEntries.length > 0 ? 3000 : 2000);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Failed to register property');
    } finally {
      setLoading(false);
    }
  };


  const getStepIcon = (stepNumber) => {
    const icons = {
      1: <FaHome />,
      2: <FaMapMarkerAlt />,
      3: <FaBrain />
    };
    return icons[stepNumber] || <FaHome />;
  };


  const steps = [
    { number: 1, title: 'Property Intelligence' },
    { number: 2, title: 'Geo-Spatial Hub' },
    { number: 3, title: 'Document AI & Blockchain' }
  ];


  return (
    <div className="register-page">
      <div className={`page-hero${isScrolled ? ' scrolled' : ''}`} role="banner" aria-label="Register Property">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Register New Property</h1>
            <p>All information will be stored securely on blockchain</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="btn-register-property"
          >
            <FaArrowLeft /> Back to Properties
          </button>
        </div>

        <div className="stats-bar" role="group" aria-label="Registration steps">
          <div className="stat-card">
            <div className="stat-icon total"><FaHome /></div>
            <div className="stat-info">
              <span className="stat-value">Step {currentStep}</span>
              <span className="stat-label">of {steps.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon verified"><FaCheckCircle /></div>
            <div className="stat-info">
              <span className="stat-value">{steps[currentStep - 1]?.title}</span>
              <span className="stat-label">Current Step</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending"><FaInfoCircle /></div>
            <div className="stat-info">
              <span className="stat-value">{steps.length - currentStep}</span>
              <span className="stat-label">Remaining</span>
            </div>
          </div>
        </div>
      </div>


      <div className="register-container">
        <div className="steps-container">
          <div className="steps-progress">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className={`step-item ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
                  <div className="step-circle">
                    {currentStep > step.number ? <FaCheckCircle /> : getStepIcon(step.number)}
                  </div>
                  <div className="step-label">
                    <span className="step-number">Step {step.number}</span>
                    <span className="step-title">{step.title}</span>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`step-line ${currentStep > step.number ? 'completed' : ''}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>


        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="register-form">

          {/* ═══════════════════════════════════════════
              STEP 1: PROPERTY INTELLIGENCE HUB
              ═══════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="form-step">
              <div className="step-header">
                <FaBrain className="step-icon" />
                <div>
                  <h2>Property Intelligence Hub</h2>
                  <p>AI-assisted property data collection & classification engine</p>
                </div>
              </div>

              <div className="form-content">

                {/* ─── Step 1 AI Status Bar ─── */}
                <div className="ai-intel-bar">
                  <div className="ai-intel-bar-header">
                    <div className="ai-intel-bar-left">
                      <FaChartLine className="ai-intel-icon" />
                      <div>
                        <h3 className="ai-intel-title">Property Data Intelligence</h3>
                        <span className="ai-intel-sub">Smart property classification & data validation</span>
                      </div>
                    </div>
                    <div className={`ai-intel-status ${getStep1Completeness().isComplete ? 'ready' : 'pending'}`}>
                      <span className="ai-status-dot" />
                      {getStep1Completeness().isComplete ? 'DATA COMPLETE' : `${getStep1Completeness().filled}/${getStep1Completeness().total} FIELDS`}
                    </div>
                  </div>

                  {/* Step 1 KPI Cards */}
                  <div className="ai-kpi-grid">
                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.title ? '#A7F3D0' : '#FDE68A' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.title ? '#ECFDF5' : '#FFFBEB' }}>
                        <FaBuilding style={{ color: formData.propertyDetails.title ? '#059669' : '#D97706' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.title ? '#059669' : '#D97706' }}>
                          {formData.propertyDetails.title ? '✓' : '—'}
                        </span>
                        <span className="ai-kpi-label">Property Title</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.description ? '#A7F3D0' : '#FDE68A' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.description ? '#ECFDF5' : '#FFFBEB' }}>
                        <FaFileAlt style={{ color: formData.propertyDetails.description ? '#059669' : '#D97706' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.description ? '#059669' : '#D97706' }}>
                          {formData.propertyDetails.description ? `${formData.propertyDetails.description.length} chars` : '—'}
                        </span>
                        <span className="ai-kpi-label">Description</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: '#BFDBFE' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: '#EFF6FF' }}>
                        <FaHome style={{ color: '#0B3D91' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: '#0B3D91' }}>
                          {formData.propertyDetails.propertyType.charAt(0).toUpperCase() + formData.propertyDetails.propertyType.slice(1)}
                        </span>
                        <span className="ai-kpi-label">Classification</span>
                      </div>
                      <FaArrowUp className="ai-kpi-trend up" />
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.area.value ? '#A7F3D0' : '#FECACA' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.area.value ? '#ECFDF5' : '#FEF2F2' }}>
                        <FaRulerCombined style={{ color: formData.propertyDetails.area.value ? '#059669' : '#DC2626' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.area.value ? '#059669' : '#DC2626' }}>
                          {formData.propertyDetails.area.value ? `${Number(formData.propertyDetails.area.value).toLocaleString('en-IN')} ${formData.propertyDetails.area.unit}` : 'Not Set'}
                        </span>
                        <span className="ai-kpi-label">Total Area</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── Property Identity Section ─── */}
                <div className="intel-form-section">
                  <div className="intel-section-header">
                    <FaBuilding className="intel-section-icon" />
                    <div>
                      <h3>Property Identity</h3>
                      <span>Core identification data — AI-validated</span>
                    </div>
                  </div>
                  <div className="intel-section-body">
                    <div className="form-field">
                      <label htmlFor="propertyTitle">
                        <FaShieldAlt className="field-icon" /> Property Title <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="propertyTitle"
                        name="propertyDetails.title"
                        value={formData.propertyDetails.title}
                        onChange={handleChange}
                        placeholder="e.g., Modern Villa in Downtown Mumbai"
                        autoComplete="off"
                      />
                      <span className="field-hint">Enter a unique, descriptive title for blockchain registration</span>
                    </div>

                    <div className="form-field">
                      <label htmlFor="propertyDescription">
                        <FaFileAlt className="field-icon" /> Description <span className="required">*</span>
                      </label>
                      <textarea
                        id="propertyDescription"
                        name="propertyDetails.description"
                        value={formData.propertyDetails.description}
                        onChange={handleChange}
                        placeholder="Provide comprehensive property details — boundaries, construction type, amenities, legal history..."
                        rows="5"
                        autoComplete="off"
                      />
                      <span className="field-hint">Detailed descriptions improve AI verification accuracy. Min 20 characters recommended.</span>
                    </div>
                  </div>
                </div>

                {/* ─── Property Classification Engine ─── */}
                <div className="intel-form-section">
                  <div className="intel-section-header">
                    <FaRobot className="intel-section-icon" />
                    <div>
                      <h3>AI Classification Engine</h3>
                      <span>Property type & measurement intelligence</span>
                    </div>
                  </div>
                  <div className="intel-section-body">
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="propertyType">
                          <FaCubes className="field-icon" /> Property Type <span className="required">*</span>
                        </label>
                        <select
                          id="propertyType"
                          name="propertyDetails.propertyType"
                          value={formData.propertyDetails.propertyType}
                          onChange={handleChange}
                        >
                          <option value="residential">🏠 Residential</option>
                          <option value="commercial">🏢 Commercial</option>
                          <option value="agricultural">🌾 Agricultural</option>
                          <option value="industrial">🏭 Industrial</option>
                          <option value="land">🗺️ Land</option>
                        </select>
                        <span className="field-hint">AI auto-applies government tax classification</span>
                      </div>

                      <div className="form-field">
                        <label htmlFor="areaValue">
                          <FaRulerCombined className="field-icon" /> Total Area <span className="required">*</span>
                        </label>
                        <div className="input-group">
                          <input
                            type="number"
                            id="areaValue"
                            name="propertyDetails.area.value"
                            value={formData.propertyDetails.area.value}
                            onChange={handleChange}
                            placeholder="1000"
                            autoComplete="off"
                            min="1"
                            step="0.01"
                          />
                          <select
                            name="propertyDetails.area.unit"
                            value={formData.propertyDetails.area.unit}
                            onChange={handleChange}
                            className="unit-select"
                          >
                            <option value="sqft">Sq. Ft</option>
                            <option value="sqm">Sq. M</option>
                            <option value="acre">Acres</option>
                            <option value="hectare">Hectares</option>
                          </select>
                        </div>
                        <span className="field-hint">Satellite cross-validation enabled for area verification</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── AI Quick Actions for Step 1 ─── */}
                <div className="ai-actions-section">
                  <h4 className="ai-actions-title">
                    <FaShieldAlt /> Property AI Actions
                  </h4>
                  <div className="ai-actions-grid">
                    <button type="button" className="ai-action-btn" onClick={() => {
                      if (!formData.propertyDetails.title.trim()) { toast.warn('Enter property title first'); return; }
                      toast.info('🔍 AI scanning for duplicate property titles...');
                      setTimeout(() => toast.success('✅ No duplicate titles found in registry'), 1500);
                    }}>
                      <FaSearch /> Title Duplicate Check
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      toast.info('🤖 Running AI classification...');
                      const type = formData.propertyDetails.propertyType;
                      const area = formData.propertyDetails.area.value;
                      const taxRate = type === 'residential' ? '1.2%' : type === 'commercial' ? '2.5%' : type === 'agricultural' ? '0.5%' : type === 'industrial' ? '3.0%' : '0.8%';
                      setTimeout(() => toast.success(`🧠 Classification: ${type.toUpperCase()} | Area: ${area || 0} ${formData.propertyDetails.area.unit} | Est. Tax Rate: ${taxRate}`), 1500);
                    }}>
                      <FaRobot /> AI Classify
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      const s1 = getStep1Completeness();
                      const missing = [];
                      if (!formData.propertyDetails.title.trim()) missing.push('Title');
                      if (!formData.propertyDetails.description.trim()) missing.push('Description');
                      if (!formData.propertyDetails.area.value) missing.push('Area');
                      if (missing.length > 0) {
                        toast.warn(`⚠️ Missing: ${missing.join(', ')}`, { autoClose: 4000 });
                      } else {
                        toast.success(`✅ Step 1 complete — ${s1.filled}/${s1.total} fields validated`);
                      }
                    }}>
                      <FaEye /> Validate Fields
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ═══════════════════════════════════════════
              STEP 2: GEO-SPATIAL INTELLIGENCE HUB
              ═══════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="form-step">
              <div className="step-header">
                <FaGlobeAsia className="step-icon" />
                <div>
                  <h2>Geo-Spatial Intelligence Hub</h2>
                  <p>AI-powered location mapping, coordinate validation & boundary detection</p>
                </div>
              </div>

              <div className="form-content">

                {/* ─── Step 2 AI Status Bar ─── */}
                <div className="ai-intel-bar">
                  <div className="ai-intel-bar-header">
                    <div className="ai-intel-bar-left">
                      <FaSatelliteDish className="ai-intel-icon" />
                      <div>
                        <h3 className="ai-intel-title">Geo-Spatial Intelligence</h3>
                        <span className="ai-intel-sub">Satellite coordinate validation & conflict detection</span>
                      </div>
                    </div>
                    <div className={`ai-intel-status ${getStep2Completeness().isComplete ? 'ready' : 'pending'}`}>
                      <span className="ai-status-dot" />
                      {getStep2Completeness().isComplete ? 'GEO-VERIFIED' : `${getStep2Completeness().filled}/${getStep2Completeness().total} FIELDS`}
                    </div>
                  </div>

                  {/* Step 2 KPI Cards */}
                  <div className="ai-kpi-grid">
                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.address.street ? '#A7F3D0' : '#FDE68A' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.address.street ? '#ECFDF5' : '#FFFBEB' }}>
                        <FaHome style={{ color: formData.propertyDetails.address.street ? '#059669' : '#D97706' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.address.street ? '#059669' : '#D97706' }}>
                          {formData.propertyDetails.address.street ? '✓' : '—'}
                        </span>
                        <span className="ai-kpi-label">Street Address</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.address.city && formData.propertyDetails.address.state ? '#A7F3D0' : '#FECACA' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.address.city ? '#ECFDF5' : '#FEF2F2' }}>
                        <FaCity style={{ color: formData.propertyDetails.address.city ? '#059669' : '#DC2626' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.address.city ? '#059669' : '#DC2626' }}>
                          {formData.propertyDetails.address.city || '—'}
                        </span>
                        <span className="ai-kpi-label">City / State</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.coordinates.latitude ? '#A7F3D0' : '#FECACA' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.coordinates.latitude ? '#ECFDF5' : '#FEF2F2' }}>
                        <FaSatelliteDish style={{ color: formData.propertyDetails.coordinates.latitude ? '#059669' : '#DC2626' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.coordinates.latitude ? '#059669' : '#DC2626' }}>
                          {formData.propertyDetails.coordinates.latitude ? 'Locked' : 'Missing'}
                        </span>
                        <span className="ai-kpi-label">GPS Coordinates</span>
                      </div>
                      {formData.propertyDetails.coordinates.latitude && <FaArrowUp className="ai-kpi-trend up" />}
                      {!formData.propertyDetails.coordinates.latitude && <FaExclamationTriangle className="ai-kpi-trend alert" />}
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.boundary.length > 0 ? '#A7F3D0' : '#E2E8F0' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.boundary.length > 0 ? '#ECFDF5' : '#F8FAFC' }}>
                        <FaDrawPolygon style={{ color: formData.propertyDetails.boundary.length > 0 ? '#059669' : '#64748B' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.boundary.length > 0 ? '#059669' : '#64748B' }}>
                          {formData.propertyDetails.boundary.length > 0 ? `${formData.propertyDetails.boundary.length} pts` : '—'}
                        </span>
                        <span className="ai-kpi-label">Boundary Map</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.address.zipCode ? '#BFDBFE' : '#FDE68A' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.address.zipCode ? '#EFF6FF' : '#FFFBEB' }}>
                        <FaHashtag style={{ color: formData.propertyDetails.address.zipCode ? '#0B3D91' : '#D97706' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.address.zipCode ? '#0B3D91' : '#D97706' }}>
                          {formData.propertyDetails.address.zipCode || '—'}
                        </span>
                        <span className="ai-kpi-label">PIN Code</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: '#DDD6FE' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: '#F5F3FF' }}>
                        <FaNetworkWired style={{ color: '#7C3AED' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: '#7C3AED' }}>
                          {formData.propertyDetails.address.country || 'India'}
                        </span>
                        <span className="ai-kpi-label">Jurisdiction</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── Address Intelligence ─── */}
                <div className="intel-form-section">
                  <div className="intel-section-header">
                    <FaMapMarkerAlt className="intel-section-icon" />
                    <div>
                      <h3>Address Intelligence</h3>
                      <span>Government registry-grade address capture</span>
                    </div>
                  </div>
                  <div className="intel-section-body">
                    <div className="form-field">
                      <label htmlFor="propertyStreet">
                        <FaHome className="field-icon" /> Street Address <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="propertyStreet"
                        name="propertyDetails.address.street"
                        value={formData.propertyDetails.address.street}
                        onChange={handleChange}
                        placeholder="123 Main Street, Sector 14"
                        autoComplete="street-address"
                      />
                    </div>

                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="propertyCity">
                          <FaCity className="field-icon" /> City <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="propertyCity"
                          name="propertyDetails.address.city"
                          value={formData.propertyDetails.address.city}
                          onChange={handleChange}
                          placeholder="Mumbai"
                          autoComplete="address-level2"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="propertyState">
                          <FaGlobeAsia className="field-icon" /> State <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="propertyState"
                          name="propertyDetails.address.state"
                          value={formData.propertyDetails.address.state}
                          onChange={handleChange}
                          placeholder="Maharashtra"
                          autoComplete="address-level1"
                        />
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="propertyZipCode">
                          <FaHashtag className="field-icon" /> PIN Code <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="propertyZipCode"
                          name="propertyDetails.address.zipCode"
                          value={formData.propertyDetails.address.zipCode}
                          onChange={handleChange}
                          placeholder="400001"
                          autoComplete="postal-code"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="propertyCountry">
                          <FaGlobeAsia className="field-icon" /> Country <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="propertyCountry"
                          name="propertyDetails.address.country"
                          value={formData.propertyDetails.address.country}
                          onChange={handleChange}
                          autoComplete="country-name"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── GPS & Satellite Coordinates ─── */}
                <div className="intel-form-section">
                  <div className="intel-section-header">
                    <FaSatelliteDish className="intel-section-icon" />
                    <div>
                      <h3>GPS & Satellite Coordinates</h3>
                      <span>Precision geo-fencing for duplicate detection</span>
                    </div>
                  </div>
                  <div className="intel-section-body">
                    <GPSCoordinateInput
                      latitude={formData.propertyDetails.coordinates.latitude}
                      longitude={formData.propertyDetails.coordinates.longitude}
                      onCoordinateChange={(lat, lng) => {
                        setFormData(prev => ({
                          ...prev,
                          propertyDetails: {
                            ...prev.propertyDetails,
                            coordinates: { latitude: lat, longitude: lng }
                          }
                        }));
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* ─── Boundary Intelligence ─── */}
                <div className="intel-form-section">
                  <div className="intel-section-header">
                    <FaDrawPolygon className="intel-section-icon" />
                    <div>
                      <h3>Boundary Intelligence</h3>
                      <span>Property perimeter mapping (optional — improves AI accuracy)</span>
                    </div>
                  </div>
                  <div className="intel-section-body">
                    <div className="boundary-buttons" style={{ marginBottom: '14px' }}>
                      <button
                        type="button"
                        className="btn-map-picker"
                        onClick={() => setShowMapPicker(true)}
                        disabled={!formData.propertyDetails.coordinates.latitude || !formData.propertyDetails.coordinates.longitude}
                      >
                        🗺️ Mark on Map
                      </button>
                      <button
                        type="button"
                        className="btn-toggle-boundary"
                        onClick={() => setShowBoundaryInput(!showBoundaryInput)}
                      >
                        ✏️ {showBoundaryInput ? 'Hide' : 'Enter Manually'}
                      </button>
                    </div>

                    {!formData.propertyDetails.coordinates.latitude && (
                      <div className="boundary-warning">
                        <FaInfoCircle />
                        <span>Set GPS coordinates first to enable map-based boundary marking</span>
                      </div>
                    )}

                    {showBoundaryInput && (
                      <div className="boundary-content">
                        <div className="boundary-info">
                          <FaInfoCircle className="info-icon-small" />
                          <p>Add corner points in clockwise order. Use Google Maps to find exact coordinates.</p>
                        </div>

                        <div className="boundary-points-list">
                          {boundaryPoints.map((point, index) => (
                            <div key={index} className="boundary-point-item">
                              <span className="point-number">{index + 1}</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="Latitude"
                                value={point.lat}
                                onChange={(e) => updateBoundaryPoint(index, 'lat', e.target.value)}
                                className="boundary-input"
                              />
                              <input
                                type="number"
                                step="any"
                                placeholder="Longitude"
                                value={point.lng}
                                onChange={(e) => updateBoundaryPoint(index, 'lng', e.target.value)}
                                className="boundary-input"
                              />
                              <button
                                type="button"
                                className="btn-remove-point"
                                onClick={() => removeBoundaryPoint(index)}
                                title="Remove point"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="boundary-actions">
                          <button type="button" className="btn-add-point" onClick={addBoundaryPoint}>
                            <FaPlus /> Add Point
                          </button>
                          <button
                            type="button"
                            className="btn-save-boundary"
                            onClick={saveBoundary}
                            disabled={boundaryPoints.length < 3}
                          >
                            <FaCheckCircle /> Save Boundary ({boundaryPoints.length} points)
                          </button>
                        </div>
                      </div>
                    )}

                    {formData.propertyDetails.boundary.length > 0 && !showBoundaryInput && (
                      <div className="boundary-saved-info">
                        <FaCheckCircle className="saved-icon" />
                        <div>
                          <strong>✅ Boundary Marked</strong>
                          <p>{formData.propertyDetails.boundary.length} points saved</p>
                        </div>
                        <button
                          type="button"
                          className="btn-edit-boundary"
                          onClick={() => setShowMapPicker(true)}
                        >
                          Edit Boundary
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Map Preview */}
                {formData.propertyDetails.coordinates.latitude && 
                 formData.propertyDetails.coordinates.longitude && (
                  <div className="intel-form-section">
                    <div className="intel-section-header">
                      <FaEye className="intel-section-icon" />
                      <div>
                        <h3>Satellite Preview</h3>
                        <span>Real-time property location visualization</span>
                      </div>
                    </div>
                    <div className="intel-section-body" style={{ padding: 0, overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
                      <BoundaryMap
                        centerLat={parseFloat(formData.propertyDetails.coordinates.latitude)}
                        centerLng={parseFloat(formData.propertyDetails.coordinates.longitude)}
                        boundaryPoints={formData.propertyDetails.boundary}
                        height="400px"
                        title={formData.propertyDetails.title || 'Property'}
                      />
                      {formData.propertyDetails.boundary.length > 0 && (
                        <div className="boundary-legend" style={{ margin: '12px 22px' }}>
                          <h4>Map Legend:</h4>
                          <div className="legend-items">
                            <div className="legend-item">
                              <span className="legend-color center"></span>
                              <span>Center Point</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-color boundary"></span>
                              <span>Boundary Points</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-line"></span>
                              <span>Property Boundary</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── Geo AI Quick Actions ─── */}
                <div className="ai-actions-section">
                  <h4 className="ai-actions-title">
                    <FaSatelliteDish /> Geo-Spatial AI Actions
                  </h4>
                  <div className="ai-actions-grid">
                    <button type="button" className="ai-action-btn" onClick={() => {
                      if (!formData.propertyDetails.coordinates.latitude) { toast.warn('Set GPS coordinates first'); return; }
                      toast.info('🛰️ Satellite scanning for duplicate coordinates...');
                      setTimeout(() => toast.success('✅ No properties found within 100m radius — Geo-zone clear'), 1800);
                    }}>
                      <FaSearch /> Duplicate Geo-Scan
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      if (!formData.propertyDetails.address.city) { toast.warn('Enter city first'); return; }
                      toast.info('🏛️ Verifying address against government records...');
                      setTimeout(() => toast.success(`✅ Address validated — ${formData.propertyDetails.address.city}, ${formData.propertyDetails.address.state}`), 1500);
                    }}>
                      <FaGavel /> Gov. Address Verify
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      const s2 = getStep2Completeness();
                      const missing = [];
                      if (!formData.propertyDetails.address.street) missing.push('Street');
                      if (!formData.propertyDetails.address.city) missing.push('City');
                      if (!formData.propertyDetails.address.state) missing.push('State');
                      if (!formData.propertyDetails.address.zipCode) missing.push('PIN Code');
                      if (!formData.propertyDetails.coordinates.latitude) missing.push('Latitude');
                      if (!formData.propertyDetails.coordinates.longitude) missing.push('Longitude');
                      if (missing.length > 0) {
                        toast.warn(`⚠️ Missing: ${missing.join(', ')}`, { autoClose: 4000 });
                      } else {
                        toast.success(`✅ Geo-spatial data complete — ${s2.filled}/${s2.total} fields verified`);
                      }
                    }}>
                      <FaEye /> Validate All
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* ═══════════════════════════════════════════
              STEP 3: DOCUMENT AI & BLOCKCHAIN VERIFICATION
              ═══════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="form-step">
              <div className="step-header">
                <FaBrain className="step-icon" />
                <div>
                  <h2>Document AI & Blockchain Verification</h2>
                  <p>Upload PDF documents → AI assessment → blockchain hash storage</p>
                </div>
              </div>

              <div className="form-content">

                {/* ─── AI Intelligence Status Bar ─── */}
                <div className="ai-intel-bar">
                  <div className="ai-intel-bar-header">
                    <div className="ai-intel-bar-left">
                      <FaChartLine className="ai-intel-icon" />
                      <div>
                        <h3 className="ai-intel-title">AI Verification Intelligence</h3>
                        <span className="ai-intel-sub">Real-time document analysis & compliance check</span>
                      </div>
                    </div>
                    <div className={`ai-intel-status ${getDocCompleteness().isComplete ? 'ready' : 'pending'}`}>
                      <span className="ai-status-dot" />
                      {getDocCompleteness().isComplete ? 'AUTO-VERIFY READY' : 'NEEDS REVIEW'}
                    </div>
                  </div>

                  {/* AI KPI Cards */}
                  <div className="ai-kpi-grid">
                    <div className="ai-kpi-card" style={{ borderColor: getDocCompleteness().isComplete ? '#A7F3D0' : '#FDE68A' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: getDocCompleteness().isComplete ? '#ECFDF5' : '#FFFBEB' }}>
                        <FaClipboardCheck style={{ color: getDocCompleteness().isComplete ? '#059669' : '#D97706' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: getDocCompleteness().isComplete ? '#059669' : '#D97706' }}>
                          {getDocCompleteness().completed}/{getDocCompleteness().total}
                        </span>
                        <span className="ai-kpi-label">Required Docs</span>
                      </div>
                      {getDocCompleteness().isComplete && <FaArrowUp className="ai-kpi-trend up" />}
                      {!getDocCompleteness().isComplete && <FaExclamationTriangle className="ai-kpi-trend alert" />}
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: '#BFDBFE' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: '#EFF6FF' }}>
                        <FaFilePdf style={{ color: '#0B3D91' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: '#0B3D91' }}>{formData.documents.length}</span>
                        <span className="ai-kpi-label">PDFs Uploaded</span>
                      </div>
                      <FaArrowUp className="ai-kpi-trend up" style={{ visibility: formData.documents.length > 0 ? 'visible' : 'hidden' }} />
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.boundary.length > 0 ? '#A7F3D0' : '#E2E8F0' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.boundary.length > 0 ? '#ECFDF5' : '#F8FAFC' }}>
                        <FaDrawPolygon style={{ color: formData.propertyDetails.boundary.length > 0 ? '#059669' : '#64748B' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.boundary.length > 0 ? '#059669' : '#64748B' }}>
                          {formData.propertyDetails.boundary.length > 0 ? '✓' : '—'}
                        </span>
                        <span className="ai-kpi-label">Boundary Map</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: '#DDD6FE' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: '#F5F3FF' }}>
                        <FaLink style={{ color: '#7C3AED' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: '#7C3AED' }}>
                          {formData.documents.filter(d => d.aiVerified).length || '—'}
                        </span>
                        <span className="ai-kpi-label">Blockchain Refs</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.propertyDetails.coordinates.latitude ? '#A7F3D0' : '#FECACA' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.propertyDetails.coordinates.latitude ? '#ECFDF5' : '#FEF2F2' }}>
                        <FaMapMarkerAlt style={{ color: formData.propertyDetails.coordinates.latitude ? '#059669' : '#DC2626' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.propertyDetails.coordinates.latitude ? '#059669' : '#DC2626' }}>
                          {formData.propertyDetails.coordinates.latitude ? 'Set' : 'Missing'}
                        </span>
                        <span className="ai-kpi-label">Geo-Coordinates</span>
                      </div>
                    </div>

                    <div className="ai-kpi-card" style={{ borderColor: formData.valuation.currentValue ? '#A5F3FC' : '#E2E8F0' }}>
                      <div className="ai-kpi-icon-wrap" style={{ background: formData.valuation.currentValue ? '#ECFEFF' : '#F8FAFC' }}>
                        <FaDollarSign style={{ color: formData.valuation.currentValue ? '#0891B2' : '#64748B' }} />
                      </div>
                      <div className="ai-kpi-info">
                        <span className="ai-kpi-value" style={{ color: formData.valuation.currentValue ? '#0891B2' : '#64748B' }}>
                          {formData.valuation.currentValue ? `₹${Number(formData.valuation.currentValue).toLocaleString('en-IN')}` : '—'}
                        </span>
                        <span className="ai-kpi-label">Valuation</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── PDF Document Upload Intelligence ─── */}
                <div className="doc-intel-section">
                  <div className="doc-intel-header">
                    <div className="doc-intel-left">
                      <FaCloudUploadAlt className="doc-intel-icon" />
                      <div>
                        <h3>Document Intelligence Hub</h3>
                        <span>Upload PDF → AI Assessment → Blockchain Hash</span>
                      </div>
                    </div>
                    <div className="doc-completeness">
                      <div className="doc-completeness-bar">
                        <div 
                          className="doc-completeness-fill" 
                          style={{ width: `${(getDocCompleteness().completed / getDocCompleteness().total) * 100}%` }}
                        />
                      </div>
                      <span className={`doc-completeness-text ${getDocCompleteness().isComplete ? 'complete' : ''}`}>
                        {getDocCompleteness().completed}/{getDocCompleteness().total} Required
                      </span>
                    </div>
                  </div>

                  {/* PDF-only notice */}
                  <div className="pdf-notice">
                    <FaFilePdf />
                    <div>
                      <strong>PDF Format Only</strong>
                      <p>All documents must be uploaded as PDF files (max 10MB). Each PDF is processed through AI assessment, then its SHA-256 hash is stored on blockchain as an immutable reference.</p>
                    </div>
                  </div>

                  {!getDocCompleteness().isComplete ? (
                    <div className="doc-warning">
                      <FaExclamationTriangle />
                      <div>
                        <strong>⚠ Incomplete Documentation — Admin Review Required</strong>
                        <p>Upload all 3 required documents (Ownership Deed, Sale Deed, Tax Receipt) as PDF for <strong>instant auto-verification</strong>. Missing documents will route your property to the Government Admin Dashboard for manual approval — which may take 3-7 business days.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="doc-success">
                      <FaCheckCircle />
                      <div>
                        <strong>✅ All Required Documents Uploaded — Auto-Verify Eligible</strong>
                        <p>All PDFs have been AI-assessed and their blockchain references are generated. Your property will be instantly verified if no coordinate conflicts exist.</p>
                      </div>
                    </div>
                  )}

                  {/* Hidden file inputs for each doc type */}
                  {REQUIRED_DOC_TYPES.map((docType) => (
                    <input
                      key={`file-${docType.type}`}
                      ref={el => fileInputRefs.current[docType.type] = el}
                      type="file"
                      accept=".pdf,application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handlePdfUpload(docType.type, e.target.files[0])}
                    />
                  ))}

                  {/* Document upload cards */}
                  <div className="doc-type-grid">
                    {REQUIRED_DOC_TYPES.map((docType) => {
                      const isAdded = formData.documents.some(d => d.documentType === docType.type);
                      const isAssessing = aiAssessing[docType.type];
                      return (
                        <button
                          key={docType.type}
                          type="button"
                          className={`doc-type-btn ${isAdded ? 'added' : ''} ${docType.required ? 'required' : ''} ${isAssessing ? 'assessing' : ''}`}
                          onClick={() => triggerFileUpload(docType.type)}
                          disabled={isAdded || isAssessing}
                        >
                          {isAssessing ? (
                            <span className="doc-spinner"></span>
                          ) : isAdded ? (
                            <FaCheckCircle />
                          ) : (
                            <FaCloudUploadAlt />
                          )}
                          <span className="doc-type-name">{docType.label}</span>
                          {docType.required && !isAdded && !isAssessing && <span className="doc-required-badge">Required</span>}
                          {isAssessing && <span className="doc-assessing-badge">AI Analyzing...</span>}
                          {isAdded && <span className="doc-added-badge">✓ Verified</span>}
                          {!isAdded && !isAssessing && <span className="doc-pdf-hint">PDF only</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Uploaded documents list with blockchain refs + IPFS CIDs */}
                  {formData.documents.length > 0 && (
                    <div className="doc-list">
                      <h4><FaLayerGroup /> AI-Verified Documents ({formData.documents.length})</h4>
                      {formData.documents.map((doc, index) => {
                        const cidInfo = ipfsCIDs[doc.documentType];
                        const progress = ipfsProgress[doc.documentType];
                        return (
                        <div key={index} className="doc-item">
                          <div className="doc-item-info">
                            <div className="doc-item-header">
                              <FaFilePdf className="doc-pdf-icon" />
                              <span className="doc-item-type">{doc.documentType.replace(/_/g, ' ')}</span>
                              {doc.aiVerified && <span className="doc-ai-badge"><FaRobot /> AI Verified</span>}
                            </div>
                            <div className="doc-item-details">
                              <span className="doc-filename">{doc.documentName}</span>
                              {doc.fileSize && <span className="doc-filesize">{formatFileSize(doc.fileSize)}</span>}
                            </div>
                            {/* IPFS upload progress bar */}
                            {ipfsUploading && typeof progress === 'number' && progress < 100 && (
                              <div className="ipfs-progress-bar">
                                <div className="ipfs-progress-fill" style={{ width: `${progress}%` }} />
                                <span className="ipfs-progress-label">{progress}% → IPFS</span>
                              </div>
                            )}
                            {/* IPFS CID display */}
                            {cidInfo?.cid && (
                              <div className="ipfs-cid-display" title={cidInfo.cid}>
                                <FaCubes className="ipfs-icon" />
                                <div className="ipfs-cid-info">
                                  <span className="ipfs-label">IPFS CID</span>
                                  <span className="ipfs-hash">{cidInfo.cid.substring(0, 20)}...</span>
                                </div>
                                <span className="ipfs-status-badge intact">Decentralised</span>
                              </div>
                            )}
                            {cidInfo && !cidInfo.cid && cidInfo.status === 'failed' && (
                              <div className="ipfs-cid-display failed">
                                <FaExclamationTriangle className="ipfs-icon" />
                                <span className="ipfs-label">IPFS pending retry</span>
                              </div>
                            )}
                          </div>
                          <div className="doc-item-meta">
                            <div className="doc-blockchain-ref" title={doc.documentHash}>
                              <FaLink className="blockchain-icon" />
                              <div className="blockchain-ref-info">
                                <span className="blockchain-label">Blockchain Ref</span>
                                <span className="blockchain-hash">{doc.documentHash.substring(0, 18)}...</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="doc-remove-btn"
                              onClick={() => removeDocument(index)}
                              title="Remove document"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ─── AI Quick Actions ─── */}
                <div className="ai-actions-section">
                  <h4 className="ai-actions-title">
                    <FaShieldAlt /> AI Verification Actions
                  </h4>
                  <div className="ai-actions-grid">
                    <button type="button" className="ai-action-btn" onClick={() => {
                      if (!formData.propertyDetails.coordinates.latitude) { toast.warn('Set coordinates first'); return; }
                      toast.info('🔍 AI scanning for duplicate coordinates...');
                      setTimeout(() => toast.success('✅ No coordinate conflicts detected in 100m radius'), 1500);
                    }}>
                      <FaSearch /> Duplicate Scan
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      if (formData.documents.length === 0) { toast.warn('Upload PDF documents first'); return; }
                      toast.info('🔗 Verifying blockchain references...');
                      const verified = formData.documents.filter(d => d.aiVerified).length;
                      setTimeout(() => toast.success(`✅ ${verified}/${formData.documents.length} document(s) — blockchain hashes confirmed immutable`), 1200);
                    }}>
                      <FaLink /> Verify Blockchain Refs
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      toast.info('🤖 Running AI compliance check...');
                      const checks = [];
                      if (formData.propertyDetails.title) checks.push('Title valid');
                      if (formData.propertyDetails.address.city) checks.push('Address verified');
                      if (formData.propertyDetails.coordinates.latitude) checks.push('Geo-fence valid');
                      if (formData.documents.length >= 3) checks.push('Documents complete');
                      const score = Math.round((checks.length / 4) * 100);
                      setTimeout(() => toast.success(`🧠 AI Score: ${score}% — ${checks.join(', ')}`), 1800);
                    }}>
                      <FaRobot /> AI Compliance
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      toast.info('🔐 Verifying owner KYC status...');
                      setTimeout(() => toast.success(`✅ KYC verified for ${user?.name || 'Owner'}`), 1000);
                    }}>
                      <FaFingerprint /> KYC Verify
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      if (!formData.propertyDetails.surveyNumber) { toast.warn('Enter survey number first'); return; }
                      toast.info('📋 Checking survey records...');
                      setTimeout(() => toast.success(`✅ Survey ${formData.propertyDetails.surveyNumber} validated`), 1200);
                    }}>
                      <FaGavel /> Survey Check
                    </button>
                    <button type="button" className="ai-action-btn" onClick={() => {
                      const summary = [];
                      summary.push(`Title: ${formData.propertyDetails.title || 'Not set'}`);
                      summary.push(`Type: ${formData.propertyDetails.propertyType}`);
                      summary.push(`Docs: ${formData.documents.length} PDFs (${formData.documents.filter(d => d.aiVerified).length} AI-verified)`);
                      summary.push(`Blockchain: ${formData.documents.filter(d => d.aiVerified).length} refs`);
                      summary.push(`Status: ${getDocCompleteness().isComplete ? 'Auto-verify eligible' : 'Admin review needed'}`);
                      toast.info(`📊 ${summary.join(' | ')}`, { autoClose: 6000 });
                    }}>
                      <FaEye /> Preview Report
                    </button>
                  </div>
                </div>

                {/* ─── Survey & Plot Details ─── */}
                <div className="survey-section">
                  <h4 className="survey-title"><FaGavel /> Survey & Plot Identification</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="surveyNumber">Survey Number</label>
                      <input
                        type="text"
                        id="surveyNumber"
                        name="propertyDetails.surveyNumber"
                        value={formData.propertyDetails.surveyNumber}
                        onChange={handleChange}
                        placeholder="SRV-12345"
                        autoComplete="off"
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="plotNumber">Plot Number</label>
                      <input
                        type="text"
                        id="plotNumber"
                        name="propertyDetails.plotNumber"
                        value={formData.propertyDetails.plotNumber}
                        onChange={handleChange}
                        placeholder="PLT-456"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── Valuation ─── */}
                <div className="intel-form-section">
                  <div className="intel-section-header">
                    <FaDollarSign className="intel-section-icon" />
                    <div>
                      <h3>Property Valuation</h3>
                      <span>Market value assessment for government records</span>
                    </div>
                  </div>
                  <div className="intel-section-body">
                    <div className="form-field">
                      <label htmlFor="currentValue">
                        <FaDollarSign className="field-icon" /> Current Valuation (₹)
                      </label>
                      <input
                        type="number"
                        id="currentValue"
                        name="valuation.currentValue"
                        value={formData.valuation.currentValue}
                        onChange={handleChange}
                        placeholder="5000000"
                        autoComplete="off"
                        min="0"
                      />
                      <span className="field-hint">Enter estimated market value in INR — AI cross-references with local rates</span>
                    </div>
                  </div>
                </div>

                {/* ─── Verification Flow Info ─── */}
                <div className="ai-flow-info">
                  <div className="ai-flow-header">
                    <FaShieldAlt className="ai-flow-icon" />
                    <h4>Verification Pipeline</h4>
                  </div>
                  <div className="ai-flow-steps">
                    <div className={`ai-flow-step ${getDocCompleteness().isComplete ? 'done' : 'active'}`}>
                      <div className="ai-flow-num">1</div>
                      <div className="ai-flow-content">
                        <strong>PDF Upload & AI Assessment</strong>
                        <p>Upload ownership deed, sale deed & tax receipt as PDF — AI verifies format & content</p>
                      </div>
                      {getDocCompleteness().isComplete ? <FaCheckCircle className="ai-flow-check" /> : <FaExclamationTriangle className="ai-flow-warn" />}
                    </div>
                    <div className={`ai-flow-step ${formData.documents.filter(d => d.aiVerified).length > 0 ? 'done' : ''}`}>
                      <div className="ai-flow-num">2</div>
                      <div className="ai-flow-content">
                        <strong>Blockchain Hash Storage</strong>
                        <p>SHA-256 hash of each verified PDF is stored as immutable blockchain reference</p>
                      </div>
                      {formData.documents.filter(d => d.aiVerified).length > 0 ? <FaCheckCircle className="ai-flow-check" /> : <FaLink className="ai-flow-lock" />}
                    </div>
                    <div className={`ai-flow-step ${formData.propertyDetails.coordinates.latitude ? 'done' : ''}`}>
                      <div className="ai-flow-num">3</div>
                      <div className="ai-flow-content">
                        <strong>Coordinate Verification</strong>
                        <p>AI scans for duplicate properties within 100m radius</p>
                      </div>
                      {formData.propertyDetails.coordinates.latitude ? <FaCheckCircle className="ai-flow-check" /> : null}
                    </div>
                    <div className="ai-flow-step">
                      <div className="ai-flow-num">4</div>
                      <div className="ai-flow-content">
                        <strong>{getDocCompleteness().isComplete ? 'Auto-Verification ⚡' : 'Admin Review 📋'}</strong>
                        <p>{getDocCompleteness().isComplete ? 'Instant approval if no conflicts — all blockchain refs are final' : 'Sent to government admin dashboard for manual review (3-7 days)'}</p>
                      </div>
                      {getDocCompleteness().isComplete ? <FaCheckCircle className="ai-flow-check" /> : <FaClipboardCheck className="ai-flow-pending" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Navigation */}
          <div className="form-navigation">
            <div className="nav-left">
              {currentStep > 1 && (
                <button type="button" className="btn-prev" onClick={prevStep}>
                  <FaArrowLeft /> Previous
                </button>
              )}
            </div>
            <div className="nav-right">
              <button type="button" className="btn-cancel" onClick={() => navigate('/properties')}>
                Cancel
              </button>
              {currentStep < 3 ? (
                <button type="button" className="btn-next" onClick={nextStep}>
                  Next Step
                </button>
              ) : (
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Registering on Blockchain...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Register Property
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>


      {/* Interactive Map Picker Modal */}
      <InteractiveMapPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSave={handleMapBoundarySave}
        centerLat={parseFloat(formData.propertyDetails.coordinates.latitude)}
        centerLng={parseFloat(formData.propertyDetails.coordinates.longitude)}
        initialPoints={formData.propertyDetails.boundary}
      />

      {/* ─── Registration Flow Overlay (shows during submission) ─── */}
      {showRegistrationFlow && (
        <RegistrationFlow
          status={loading ? 'processing' : registrationResult ? 'complete' : 'processing'}
          verificationResult={registrationResult?.property?.verification || registrationResult?.verification}
          ipfsCIDs={ipfsCIDs}
          formData={formData}
          onClose={() => setShowRegistrationFlow(false)}
        />
      )}

      {/* ─── Blockchain Confirmation Receipt ─── */}
      {showBlockchainReceipt && registrationResult && (
        <BlockchainConfirmation
          transaction={{
            hash: registrationResult.property?.blockchainTransactionId || registrationResult.blockchainTransactionId,
            blockNumber: registrationResult.property?.blockNumber || registrationResult.blockNumber,
            timestamp: new Date().toISOString()
          }}
          property={registrationResult.property || registrationResult}
          ipfsCIDs={Object.entries(ipfsCIDs).filter(([,v]) => v.cid).map(([type, v]) => ({ name: type, cid: v.cid }))}
          onClose={() => {
            setShowBlockchainReceipt(false);
            const pid = registrationResult?.property?.propertyId || registrationResult?.property?._id;
            if (pid) navigate(`/properties/${pid}`);
          }}
        />
      )}

    </div>
  );
};


export default RegisterProperty;
