import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminDashboardAPI, adminKycAPI, webAuthnHelpers } from '../services/adminApi';
import { toast } from 'react-toastify';
import InteractiveIndiaMap from '../components/InteractiveIndiaMap';
import AdminSmartIDCard from '../components/AdminSmartIDCard';
import IntelHub from '../components/IntelHub';
import AIMLPanel from '../components/AIMLPanel';
import IPFSAdminPanel from '../components/IPFSAdminPanel';
import BlockchainAdminPanel from '../components/BlockchainAdminPanel';
import {
  FaShieldAlt, FaSignOutAlt, FaSyncAlt, FaUserShield,
  FaExclamationTriangle, FaRedoAlt, FaCheckCircle, FaTimesCircle,
  FaMapMarkerAlt, FaFileAlt, FaClock, FaUser, FaChevronDown, FaChevronUp,
  FaBuilding, FaSearch, FaEye, FaTrashAlt, FaDownload,
  FaFilePdf, FaFingerprint, FaLock, FaTimes, FaHashtag,
  FaArrowLeft, FaRulerCombined,
  FaExchangeAlt, FaClipboardCheck, FaBan,
  FaArchive, FaHistory, FaCube,
  FaPhone, FaEnvelope, FaLayerGroup, FaChevronRight, FaIdCard,
  FaChartBar, FaGlobe, FaBell, FaCalendarAlt, FaCog,
  FaHome, FaList, FaTachometerAlt, FaUsers, FaCheckDouble,
  FaStamp, FaLink, FaShieldVirus,
  FaSnowflake, FaGavel, FaFileContract, FaFlag, FaUserCheck,
  FaUserPlus, FaPlusCircle, FaInfoCircle, FaCopy, FaChartLine,
  FaPrint, FaKey, FaBrain, FaDatabase, FaCubes
} from 'react-icons/fa';
import './AdminDashboard.css';

/* ── Helpers ── */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
const fmtCurrency = (v) => {
  if (!v) return '₹0';
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
};
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
const docTypeLabels = {
  ownership_deed: 'Ownership Deed', sale_deed: 'Sale Deed', tax_receipt: 'Tax Receipt',
  survey_document: 'Survey Document', legal_clearance: 'Legal Clearance', other: 'Other Document'
};

const AdminDashboard = () => {
  const { admin, logout, refreshProfile } = useAdminAuth();
  const navigate = useNavigate();

  /* ── State ── */
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState({});
  const [govProperties, setGovProperties] = useState([]);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [propertyCounts, setPropertyCounts] = useState({ total: 0, verified: 0, pending: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [activeView, setActiveView] = useState('overview');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [expandedProperty, setExpandedProperty] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const [biometricModal, setBiometricModal] = useState(null);
  const [biometricStep, setBiometricStep] = useState('idle');
  const [deleteReason, setDeleteReason] = useState('');
  const [statusChangeData, setStatusChangeData] = useState(null);
  const [docViewer, setDocViewer] = useState(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Admin Document Upload
  const [adminDocUpload, setAdminDocUpload] = useState({ file: null, type: 'ownership_deed', name: '' });
  const [adminDocUploading, setAdminDocUploading] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', category: 'announcement', priority: 'medium', links: [], isPinned: false, targetAudience: 'all' });
  const [announcementLinkForm, setAnnouncementLinkForm] = useState({ label: '', url: '' });
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // Authority Quick Action modals
  const [quickActionModal, setQuickActionModal] = useState(null); // { type: 'freeze'|'flag'|'audit'|'report'|'dispute'|'verify', propertyId, title }
  const [qaReason, setQaReason] = useState('');
  const [qaSeverity, setQaSeverity] = useState('medium');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaBiometricStep, setQaBiometricStep] = useState('idle'); // 'idle' | 'scanning' | 'verified' | 'failed'
  const [auditTrailData, setAuditTrailData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [ownerKycUpdate, setOwnerKycUpdate] = useState({ aadhaarVerified: false, panVerified: false, faceEnrolled: false, fingerprintEnrolled: false });
  const [disputeResolution, setDisputeResolution] = useState('');
  const [disputeNewStatus, setDisputeNewStatus] = useState('active');

  // Create Admin
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '', employeeId: '', rank: '', department: '', clearanceLevel: 1, jurisdictionLevel: 'district', jurisdictionState: '', jurisdictionDistrict: '' });
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [adminsList, setAdminsList] = useState([]);

  // KYC Profile
  const [kycData, setKycData] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycForm, setKycForm] = useState({ aadhaarNumber: '', panNumber: '', governmentIdType: 'aadhaar', governmentIdNumber: '' });
  const [kycEnrollLoading, setKycEnrollLoading] = useState(false);
  const [kycScanPhase, setKycScanPhase] = useState('idle'); // idle | scanning | processing | done | failed
  const [kycScanType, setKycScanType] = useState(null); // fingerprint | face
  const [kycScanProgress, setKycScanProgress] = useState(0);
  const [kycFaceCameraActive, setKycFaceCameraActive] = useState(false);
  const [kycFaceStream, setKycFaceStream] = useState(null);

  const searchTimeoutRef = useRef(null);
  const kycVideoRef = useRef(null);
  const kycCanvasRef = useRef(null);

  // Cleanup KYC face camera on unmount
  useEffect(() => {
    return () => {
      if (kycFaceStream) {
        kycFaceStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [kycFaceStream]);

  /* ── Live Clock ── */
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Data Fetching ── */
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const results = await Promise.allSettled([
        adminDashboardAPI.getStats(),
        adminDashboardAPI.getHeatmap(),
        adminDashboardAPI.getGovProperties(),
        adminDashboardAPI.getPendingProperties(),
        adminDashboardAPI.getAllProperties()
      ]);
      const [statsR, heatmapR, govR, pendingR, allR] = results;
      if (statsR.status === 'fulfilled') setStats(statsR.value.data.stats);
      else if (statsR.reason?.response?.status === 401) { toast.error('Session expired'); logout(); navigate('/admin/login'); return; }
      if (heatmapR.status === 'fulfilled') setHeatmap(heatmapR.value.data.heatmap || {});
      if (govR.status === 'fulfilled') setGovProperties(govR.value.data.properties || []);
      if (pendingR.status === 'fulfilled') setPendingProperties(pendingR.value.data.properties || []);
      if (allR.status === 'fulfilled') {
        setAllProperties(allR.value.data.properties || []);
        setPropertyCounts(allR.value.data.counts || { total: 0, verified: 0, pending: 0, rejected: 0 });
      }
      if (results.every(r => r.status === 'rejected')) setError('Unable to load dashboard data.');
    } catch (err) {
      setError('An unexpected error occurred.');
      if (err.response?.status === 401) { toast.error('Session expired'); logout(); navigate('/admin/login'); }
    } finally { setLoading(false); }
  }, [logout, navigate]);

  useEffect(() => { fetchData(); refreshProfile(); }, [fetchData, refreshProfile]);

  const fetchFilteredProperties = useCallback(async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (filterStatus) params.verificationStatus = filterStatus;
      if (filterType) params.propertyType = filterType;
      if (sortBy === 'oldest') params.sort = 'oldest';
      if (sortBy === 'title') params.sort = 'title';
      const res = await adminDashboardAPI.getAllProperties(params);
      setAllProperties(res.data.properties || []);
      setPropertyCounts(res.data.counts || propertyCounts);
    } catch (err) { console.error('Filter error:', err); }
  }, [searchQuery, filterStatus, filterType, sortBy, propertyCounts]);

  useEffect(() => {
    if (activeView !== 'properties') return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(fetchFilteredProperties, 400);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, filterStatus, filterType, sortBy, activeView, fetchFilteredProperties]);

  /* ── Actions ── */
  const handleRefresh = async () => { setRefreshing(true); await fetchData(); await refreshProfile(); setRefreshing(false); toast.success('Dashboard refreshed'); };
  const handleLogout = () => { logout(); navigate('/admin/login'); toast.info('Logged out'); };

  const handlePinProperty = async (data) => {
    try { await adminDashboardAPI.pinProperty(data); toast.success(`📍 ${data.title} pinned`); const r = await adminDashboardAPI.getGovProperties(); setGovProperties(r.data.properties || []); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleApproveProperty = async (propertyId) => {
    setActionLoading(propertyId);
    try {
      await adminDashboardAPI.approveProperty(propertyId, { adminNotes: 'Approved after manual review' });
      toast.success('✅ Property approved');
      setPendingProperties(prev => prev.filter(p => p._id !== propertyId));
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleRejectProperty = async () => {
    if (!rejectModal || !rejectionReason.trim()) { toast.warn('Provide a rejection reason'); return; }
    setActionLoading(rejectModal);
    try {
      await adminDashboardAPI.rejectProperty(rejectModal, { rejectionReason: rejectionReason.trim() });
      toast.success('❌ Property rejected');
      setPendingProperties(prev => prev.filter(p => p._id !== rejectModal));
      setRejectModal(null); setRejectionReason('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleViewProperty = async (propertyId) => {
    setDetailLoading(true); setActiveView('property-detail');
    try { const res = await adminDashboardAPI.getPropertyDetails(propertyId); setSelectedProperty(res.data.property); }
    catch (err) { toast.error('Failed to load property'); setActiveView('properties'); }
    finally { setDetailLoading(false); }
  };

  // ── Admin Document Upload ──
  const handleAdminDocUpload = async () => {
    if (!adminDocUpload.file || !selectedProperty) return;
    setAdminDocUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', adminDocUpload.file);
      formData.append('documentType', adminDocUpload.type);
      formData.append('documentName', adminDocUpload.name || adminDocUpload.file.name);
      const propId = selectedProperty._id || selectedProperty.propertyId;
      await adminDashboardAPI.uploadDocument(propId, formData);
      toast.success('📄 Document uploaded successfully');
      setAdminDocUpload({ file: null, type: 'ownership_deed', name: '' });
      // Refresh the property detail
      const res = await adminDashboardAPI.getPropertyDetails(propId);
      setSelectedProperty(res.data.property);
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setAdminDocUploading(false); }
  };

  // ── Announcements ──
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await adminDashboardAPI.getAnnouncements();
      setAnnouncements(res.data.announcements || []);
    } catch (err) { console.error('Announcements fetch error:', err); }
  }, []);

  useEffect(() => { if (activeView === 'announcements') fetchAnnouncements(); }, [activeView, fetchAnnouncements]);

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message) { toast.warn('Title and message required'); return; }
    setAnnouncementLoading(true);
    try {
      if (editingAnnouncement) {
        await adminDashboardAPI.updateAnnouncement(editingAnnouncement, announcementForm);
        toast.success('📢 Announcement updated');
      } else {
        await adminDashboardAPI.createAnnouncement(announcementForm);
        toast.success('📢 Announcement published');
      }
      setAnnouncementForm({ title: '', message: '', category: 'announcement', priority: 'medium', links: [], isPinned: false, targetAudience: 'all' });
      setShowAnnouncementForm(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAnnouncementLoading(false); }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await adminDashboardAPI.deleteAnnouncement(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err) { toast.error('Delete failed'); }
  };

  const handleToggleAnnouncementActive = async (id, isActive) => {
    try {
      await adminDashboardAPI.updateAnnouncement(id, { isActive: !isActive });
      toast.success(isActive ? 'Announcement deactivated' : 'Announcement activated');
      fetchAnnouncements();
    } catch (err) { toast.error('Update failed'); }
  };

  const handleEditAnnouncement = (ann) => {
    setEditingAnnouncement(ann._id);
    setAnnouncementForm({ title: ann.title, message: ann.message, category: ann.category, priority: ann.priority, links: ann.links || [], isPinned: ann.isPinned, targetAudience: ann.targetAudience || 'all' });
    setShowAnnouncementForm(true);
  };

  const addAnnouncementLink = () => {
    if (!announcementLinkForm.label || !announcementLinkForm.url) return;
    setAnnouncementForm(prev => ({ ...prev, links: [...prev.links, { ...announcementLinkForm }] }));
    setAnnouncementLinkForm({ label: '', url: '' });
  };

  const removeAnnouncementLink = (idx) => {
    setAnnouncementForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== idx) }));
  };

  const startBiometricVerification = (action, propertyId, title) => {
    setBiometricModal({ action, propertyId, title });
    setBiometricStep('idle');
    setDeleteReason('');
  };

  const simulateBiometricScan = () => {
    setBiometricStep('scanning');
    setTimeout(() => { setBiometricStep('verified'); toast.success('🔐 Biometric identity verified'); }, 3000);
  };

  const executeBiometricAction = async () => {
    if (biometricStep !== 'verified') return;
    const { action, propertyId } = biometricModal;
    setActionLoading(propertyId);
    try {
      if (action === 'delete') {
        if (!deleteReason.trim() || deleteReason.trim().length < 10) { toast.warn('Provide detailed reason (min 10 chars)'); return; }
        await adminDashboardAPI.deleteProperty(propertyId, { biometricVerified: true, reason: deleteReason.trim() });
        toast.success('🗑️ Property permanently deleted');
        setAllProperties(prev => prev.filter(p => p._id !== propertyId));
        if (selectedProperty?._id === propertyId) { setSelectedProperty(null); setActiveView('properties'); }
      } else if (action === 'status') {
        await adminDashboardAPI.changePropertyStatus(propertyId, {
          biometricVerified: true, newStatus: statusChangeData.newStatus, reason: statusChangeData.reason
        });
        toast.success(`✅ Status changed to ${capitalize(statusChangeData.newStatus)}`);
      }
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(null); setBiometricModal(null); setBiometricStep('idle'); setDeleteReason(''); setStatusChangeData(null); }
  };

  /* ── Authority Quick Actions ── */
  const openQuickAction = (type, propertyId, title) => {
    setQuickActionModal({ type, propertyId, title });
    setQaReason('');
    setQaSeverity('medium');
    setQaBiometricStep('idle');
    setDisputeResolution('');
    setDisputeNewStatus('active');
    setOwnerKycUpdate({ aadhaarVerified: false, panVerified: false, faceEnrolled: false, fingerprintEnrolled: false });
    if (type === 'audit') handleGetAuditTrail(propertyId);
    if (type === 'report') handleGenerateReport(propertyId);
  };

  const startQaBiometricScan = () => {
    setQaBiometricStep('scanning');
    // Simulate face + fingerprint scan (3 seconds)
    setTimeout(() => {
      setQaBiometricStep('verified');
      toast.success('🔐 Face & fingerprint verified successfully');
    }, 3000);
  };

  const handleFreezeProperty = async () => {
    if (qaBiometricStep !== 'verified') { toast.warn('Complete biometric verification first'); return; }
    if (!qaReason.trim() || qaReason.trim().length < 10) { toast.warn('Provide detailed reason (min 10 chars)'); return; }
    setQaLoading(true);
    try {
      await adminDashboardAPI.freezeProperty(quickActionModal.propertyId, { biometricVerified: true, reason: qaReason.trim() });
      toast.success('🧊 Property frozen successfully — status updated');
      setQuickActionModal(null); setQaBiometricStep('idle');
      fetchData();
      if (selectedProperty?._id === quickActionModal.propertyId) handleViewProperty(quickActionModal.propertyId);
    } catch (err) { toast.error(err.response?.data?.message || 'Freeze failed'); }
    finally { setQaLoading(false); }
  };

  const handleGetAuditTrail = async (propertyId) => {
    setAuditTrailData(null);
    try {
      const res = await adminDashboardAPI.getAuditTrail(propertyId);
      setAuditTrailData(res.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load audit trail'); }
  };

  const handleResolveDispute = async () => {
    if (qaBiometricStep !== 'verified') { toast.warn('Complete biometric verification first'); return; }
    if (!disputeResolution.trim() || disputeResolution.trim().length < 10) { toast.warn('Provide resolution details (min 10 chars)'); return; }
    setQaLoading(true);
    try {
      await adminDashboardAPI.resolveDispute(quickActionModal.propertyId, { biometricVerified: true, resolution: disputeResolution.trim(), newStatus: disputeNewStatus });
      toast.success('⚖️ Dispute resolved — property status updated');
      setQuickActionModal(null); setQaBiometricStep('idle');
      fetchData();
      if (selectedProperty?._id === quickActionModal.propertyId) handleViewProperty(quickActionModal.propertyId);
    } catch (err) { toast.error(err.response?.data?.message || 'Resolve failed'); }
    finally { setQaLoading(false); }
  };

  const handleGenerateReport = async (propertyId) => {
    setReportData(null);
    try {
      const res = await adminDashboardAPI.generateReport(propertyId);
      setReportData(res.data.report);
    } catch (err) { toast.error(err.response?.data?.message || 'Report generation failed'); }
  };

  const handleFlagSuspicious = async () => {
    if (qaBiometricStep !== 'verified') { toast.warn('Complete biometric verification first'); return; }
    if (!qaReason.trim() || qaReason.trim().length < 5) { toast.warn('Provide a reason'); return; }
    setQaLoading(true);
    try {
      await adminDashboardAPI.flagSuspicious(quickActionModal.propertyId, { reason: qaReason.trim(), severity: qaSeverity });
      toast.success('🚩 Property flagged — status changed to Disputed');
      setQuickActionModal(null); setQaBiometricStep('idle');
      fetchData();
      if (selectedProperty?._id === quickActionModal.propertyId) handleViewProperty(quickActionModal.propertyId);
    } catch (err) { toast.error(err.response?.data?.message || 'Flagging failed'); }
    finally { setQaLoading(false); }
  };

  const handleVerifyOwner = async () => {
    if (qaBiometricStep !== 'verified') { toast.warn('Complete biometric verification first'); return; }
    setQaLoading(true);
    try {
      const userId = selectedProperty?.owner?._id;
      if (!userId) { toast.error('Owner ID not found'); return; }
      await adminDashboardAPI.verifyOwner(userId, ownerKycUpdate);
      toast.success('✅ Owner KYC verification updated successfully');
      setQuickActionModal(null); setQaBiometricStep('idle');
      if (selectedProperty) handleViewProperty(selectedProperty._id);
    } catch (err) { toast.error(err.response?.data?.message || 'Verification failed'); }
    finally { setQaLoading(false); }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password || !newAdminForm.employeeId || !newAdminForm.rank || !newAdminForm.department) {
      toast.warn('Fill all required fields'); return;
    }
    if (newAdminForm.password.length < 12) { toast.warn('Password must be at least 12 characters'); return; }
    if (!/^\w+([\.-]?\w+)*@(gov\.in|nic\.in|\w+\.gov\.in)$/.test(newAdminForm.email)) { toast.warn('Must use .gov.in or .nic.in email'); return; }
    setCreateAdminLoading(true);
    try {
      const payload = {
        name: newAdminForm.name, email: newAdminForm.email, password: newAdminForm.password,
        employeeId: newAdminForm.employeeId, rank: newAdminForm.rank, department: newAdminForm.department,
        clearanceLevel: parseInt(newAdminForm.clearanceLevel),
        jurisdiction: { level: newAdminForm.jurisdictionLevel, state: newAdminForm.jurisdictionState, district: newAdminForm.jurisdictionDistrict }
      };
      await adminDashboardAPI.createAdmin(payload);
      toast.success('🎖️ New admin account created successfully');
      setNewAdminForm({ name: '', email: '', password: '', employeeId: '', rank: '', department: '', clearanceLevel: 1, jurisdictionLevel: 'district', jurisdictionState: '', jurisdictionDistrict: '' });
      fetchAdminsList();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create admin'); }
    finally { setCreateAdminLoading(false); }
  };

  const fetchAdminsList = async () => {
    try { const res = await adminDashboardAPI.getAllAdmins(); setAdminsList(res.data.admins || []); }
    catch (err) { console.error('Failed to fetch admins:', err); }
  };

  const handleCopyReport = () => {
    if (!reportData) return;
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    toast.success('📋 Report copied to clipboard');
  };

  const handlePrintReport = () => {
    if (!reportData) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Property Report - ${reportData.property?.propertyId || ''}</title>
      <style>body{font-family:'Inter',sans-serif;padding:40px;color:#1a1a1a} h1{color:#0B3D91;border-bottom:3px solid #FF9933;padding-bottom:10px}
      table{width:100%;border-collapse:collapse;margin:20px 0} td,th{border:1px solid #ddd;padding:10px;text-align:left}
      th{background:#0B3D91;color:white} .section{margin-top:30px} .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
      .header{display:flex;align-items:center;gap:15px;margin-bottom:30px}
      @media print{body{padding:20px}}</style></head><body>
      <div class="header"><h1>🏛️ Smart Bhoomi Property Report</h1></div>
      <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
      <p><strong>Property ID:</strong> ${reportData.property?.propertyId || 'N/A'}</p>
      <p><strong>Title:</strong> ${reportData.property?.title || 'N/A'}</p>
      <div class="section"><h2>Property Details</h2><table><tbody>
      <tr><th>Type</th><td>${reportData.property?.propertyType || 'N/A'}</td></tr>
      <tr><th>Area</th><td>${reportData.property?.area?.value || 'N/A'} ${reportData.property?.area?.unit || ''}</td></tr>
      <tr><th>Address</th><td>${[reportData.property?.address?.street, reportData.property?.address?.city, reportData.property?.address?.state, reportData.property?.address?.zipCode].filter(Boolean).join(', ') || 'N/A'}</td></tr>
      <tr><th>Status</th><td>${reportData.property?.status || 'N/A'}</td></tr>
      <tr><th>Survey Number</th><td>${reportData.property?.surveyNumber || 'N/A'}</td></tr>
      </tbody></table></div>
      <div class="section"><h2>Owner Information</h2><table><tbody>
      <tr><th>Name</th><td>${reportData.owner?.name || 'N/A'}</td></tr>
      <tr><th>Email</th><td>${reportData.owner?.email || 'N/A'}</td></tr>
      <tr><th>Government ID</th><td>${reportData.owner?.governmentId || 'N/A'}</td></tr>
      </tbody></table></div>
      <div class="section"><h2>Verification</h2><table><tbody>
      <tr><th>Status</th><td>${reportData.verification?.status || 'N/A'}</td></tr>
      <tr><th>Score</th><td>${reportData.verification?.checkScore || 0}%</td></tr>
      </tbody></table></div>
      <div class="section"><h2>Valuation</h2><table><tbody>
      <tr><th>Current Value</th><td>${fmtCurrency(reportData.valuation?.currentValue)}</td></tr>
      <tr><th>Government Value</th><td>${fmtCurrency(reportData.valuation?.governmentValue)}</td></tr>
      </tbody></table></div>
      <hr/><p style="text-align:center;color:#666;font-size:12px">Official Smart Bhoomi Report • Government of India • ${new Date().getFullYear()}</p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  /* ── Helpers ── */
  const getReviewReasons = (property) => {
    const reasons = [];
    if (Array.isArray(property.verification?.notes)) property.verification.notes.forEach(n => reasons.push(n));
    else if (property.verification?.autoVerificationNotes) property.verification.autoVerificationNotes.split('\n').forEach(n => { if (n.trim()) reasons.push(n.trim()); });
    if (property.verification?.coordinateConflictWith && !reasons.some(r => r.includes('conflict'))) reasons.push(`Coordinate conflict with: ${property.verification.coordinateConflictWith}`);
    return reasons;
  };

  const getVerificationBadge = (status) => {
    const cfg = {
      verified: { label: 'Verified', icon: <FaCheckCircle />, cls: 'badge-verified' },
      pending: { label: 'Pending', icon: <FaClock />, cls: 'badge-pending' },
      needs_review: { label: 'Needs Review', icon: <FaExclamationTriangle />, cls: 'badge-review' },
      rejected: { label: 'Rejected', icon: <FaTimesCircle />, cls: 'badge-rejected' },
      auto_verifying: { label: 'Auto Verifying', icon: <FaSyncAlt />, cls: 'badge-pending' }
    };
    const c = cfg[status] || cfg.pending;
    return <span className={`ad-badge ${c.cls}`}>{c.icon} {c.label}</span>;
  };

  const getPropertyStatusBadge = (status) => {
    const cfg = {
      frozen: { label: 'Frozen', icon: <FaSnowflake />, cls: 'badge-frozen' },
      disputed: { label: 'Disputed', icon: <FaBan />, cls: 'badge-disputed' },
      archived: { label: 'Archived', icon: <FaArchive />, cls: 'badge-archived' },
      transfer_pending: { label: 'Transfer Pending', icon: <FaExchangeAlt />, cls: 'badge-transfer' }
    };
    const c = cfg[status];
    return c ? <span className={`ad-badge ${c.cls}`}>{c.icon} {c.label}</span> : null;
  };

  if (loading) return (
    <div className="admin-dash-loading">
      <div className="admin-dash-spinner" />
      <p>Initializing Command Center...</p>
      <span className="ad-loading-sub">Connecting to Smart Bhoomi National Infrastructure</span>
    </div>
  );

  /* ══════════════════════════════════════════════════
     PROPERTY DETAIL VIEW
     ══════════════════════════════════════════════════ */
  const renderPropertyDetail = () => {
    if (detailLoading) return (
      <div className="ad-detail-loading">
        <div className="admin-dash-spinner" />
        <p>Loading property intelligence...</p>
      </div>
    );
    if (!selectedProperty) return null;
    const p = selectedProperty;
    const pd = p.propertyDetails || {};
    const v = p.verification || {};
    const checks = v.checks || {};
    const score = v.checkScore || 0;

    return (
      <div className="ad-detail-view">
        <button className="ad-back-btn" onClick={() => { setActiveView('properties'); setSelectedProperty(null); }}>
          <FaArrowLeft /> Back to Registry
        </button>

        {/* Detail Header */}
        <div className="ad-detail-header">
          <div className="ad-detail-header-left">
            <div className="ad-detail-icon-wrap"><FaBuilding /></div>
            <div className="ad-detail-header-info">
              <h2 className="ad-detail-title">{pd.title || 'Untitled Property'}</h2>
              <div className="ad-detail-meta-row">
                <span className="ad-detail-pid"><FaHashtag /> {p.propertyId}</span>
                {getVerificationBadge(v.status)}
                {getPropertyStatusBadge(p.status)}
                <span className="ad-detail-type">{capitalize(pd.propertyType)}</span>
                <span className="ad-detail-date"><FaCalendarAlt /> {fmtDate(p.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="ad-detail-header-actions">
            {v.status !== 'verified' && v.status !== 'rejected' && (
              <>
                <button className="ad-btn ad-btn-approve" onClick={() => handleApproveProperty(p._id)} disabled={actionLoading === p._id}>
                  <FaCheckCircle /> Approve
                </button>
                <button className="ad-btn ad-btn-reject" onClick={() => { setRejectModal(p._id); setRejectionReason(''); }}>
                  <FaTimesCircle /> Reject
                </button>
              </>
            )}
            <button className="ad-btn ad-btn-danger" onClick={() => startBiometricVerification('delete', p._id, pd.title)}>
              <FaTrashAlt /> Delete
            </button>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="ad-detail-grid">
          <div className="ad-detail-left">
            {/* Property Intelligence */}
            <div className="ad-card">
              <div className="ad-card-head">
                <div className="ad-card-head-icon-wrap blue"><FaClipboardCheck /></div>
                <div>
                  <h3>Property Intelligence</h3>
                  <span className="ad-card-head-sub">Complete property record</span>
                </div>
              </div>
              <div className="ad-card-body">
                <div className="ad-info-grid">
                  {[
                    { label: 'Property Type', value: capitalize(pd.propertyType), icon: <FaBuilding /> },
                    { label: 'Total Area', value: `${pd.area?.value || 'N/A'} ${pd.area?.unit || ''}`, icon: <FaRulerCombined /> },
                    { label: 'Survey Number', value: pd.surveyNumber || 'N/A', mono: true, icon: <FaHashtag /> },
                    { label: 'Plot Number', value: pd.plotNumber || 'N/A', mono: true, icon: <FaHashtag /> },
                    { label: 'Current Value', value: fmtCurrency(p.valuation?.currentValue), icon: <FaChartBar /> },
                    { label: 'Status', value: capitalize(p.status), icon: <FaShieldAlt /> },
                    { label: 'Address', value: [pd.address?.street, pd.address?.city, pd.address?.state, pd.address?.zipCode].filter(Boolean).join(', ') || 'N/A', full: true, icon: <FaMapMarkerAlt /> },
                    { label: 'Coordinates', value: pd.coordinates?.latitude ? `${pd.coordinates.latitude.toFixed(6)}, ${pd.coordinates.longitude.toFixed(6)}` : 'N/A', mono: true, icon: <FaGlobe /> },
                    { label: 'Boundary Points', value: `${pd.boundary?.length || 0} points`, icon: <FaLayerGroup /> },
                    { label: 'Registered On', value: fmtDateTime(p.createdAt), icon: <FaCalendarAlt /> },
                    { label: 'Blockchain Hash', value: p.blockchainHash ? p.blockchainHash.slice(0, 24) + '...' : 'Not recorded', mono: true, small: true, icon: <FaLink /> },
                    { label: 'Description', value: pd.description || 'No description provided', full: true, icon: <FaFileAlt /> }
                  ].map((item, i) => (
                    <div key={i} className={`ad-info-item ${item.full ? 'full' : ''}`}>
                      <div className="ad-info-icon">{item.icon}</div>
                      <div className="ad-info-content">
                        <span className="ad-info-label">{item.label}</span>
                        <span className={`ad-info-value ${item.mono ? 'mono' : ''} ${item.small ? 'small' : ''}`}>{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Property Location Map */}
            {pd.coordinates?.latitude && pd.coordinates?.longitude && (
              <div className="ad-card ad-map-card">
                <div className="ad-card-head">
                  <div className="ad-card-head-icon-wrap green"><FaGlobe /></div>
                  <div>
                    <h3>Property Location Map</h3>
                    <span className="ad-card-head-sub">Satellite view with boundary overlay</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${pd.coordinates.latitude},${pd.coordinates.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ad-map-external-link"
                    title="Open in Google Maps"
                  >
                    <FaExchangeAlt /> Open Maps
                  </a>
                </div>
                <div className="ad-card-body">
                  <div className="ad-property-map-container">
                    <iframe
                      title="Property Location"
                      width="100%"
                      height="280"
                      style={{ border: 0, borderRadius: '10px' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${(pd.coordinates.longitude - 0.005).toFixed(6)},${(pd.coordinates.latitude - 0.004).toFixed(6)},${(pd.coordinates.longitude + 0.005).toFixed(6)},${(pd.coordinates.latitude + 0.004).toFixed(6)}&layer=mapnik&marker=${pd.coordinates.latitude},${pd.coordinates.longitude}`}
                    />
                  </div>
                  <div className="ad-map-info-bar">
                    <div className="ad-map-coord">
                      <FaMapMarkerAlt />
                      <span>{pd.coordinates.latitude.toFixed(6)}°N, {pd.coordinates.longitude.toFixed(6)}°E</span>
                    </div>
                    <div className="ad-map-coord">
                      <FaLayerGroup />
                      <span>{pd.boundary?.length || 0} boundary points</span>
                    </div>
                    <div className="ad-map-coord">
                      <FaRulerCombined />
                      <span>{pd.area?.value || 'N/A'} {pd.area?.unit || ''}</span>
                    </div>
                  </div>
                  {pd.boundary?.length > 0 && (
                    <div className="ad-boundary-points-grid">
                      <span className="ad-boundary-title"><FaLayerGroup /> Boundary Coordinates</span>
                      <div className="ad-boundary-list">
                        {pd.boundary.map((pt, idx) => (
                          <div key={idx} className="ad-boundary-point">
                            <span className="ad-bp-num">{idx + 1}</span>
                            <span className="ad-bp-coords">{pt.latitude?.toFixed(6)}, {pt.longitude?.toFixed(6)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="ad-card">
              <div className="ad-card-head">
                <div className="ad-card-head-icon-wrap red"><FaFilePdf /></div>
                <div>
                  <h3>Uploaded Documents</h3>
                  <span className="ad-card-head-sub">User-submitted &amp; admin-uploaded documents</span>
                </div>
                <span className="ad-count-badge">{p.documents?.length || 0}</span>
              </div>
              <div className="ad-card-body">
                {(!p.documents || p.documents.length === 0) ? (
                  <div className="ad-empty-state">
                    <div className="ad-empty-icon-wrap"><FaFileAlt /></div>
                    <h4>No Documents Uploaded</h4>
                    <p>The property owner has not submitted any documents yet.</p>
                  </div>
                ) : (
                  <div className="ad-docs-list">
                    {p.documents.map((doc, i) => (
                      <div key={i} className="ad-doc-item">
                        <div className="ad-doc-icon-wrap"><FaFilePdf /></div>
                        <div className="ad-doc-info">
                          <span className="ad-doc-name">{doc.documentName || `Document ${i + 1}`}</span>
                          <span className="ad-doc-type">{docTypeLabels[doc.documentType] || capitalize(doc.documentType)}</span>
                          <div className="ad-doc-meta">
                            {doc.documentHash && <span className="ad-doc-hash" title={doc.documentHash}><FaCube /> SHA-256: {doc.documentHash.slice(0, 16)}...</span>}
                            <span className="ad-doc-date"><FaClock /> {fmtDate(doc.uploadedAt)}</span>
                          </div>
                        </div>
                        <div className="ad-doc-actions">
                          {doc.documentPath && (
                            <>
                              <button className="ad-doc-btn view" title="Preview Document" onClick={() => setDocViewer(`${API_URL}/${doc.documentPath}`)}>
                                <FaEye /> <span>View</span>
                              </button>
                              <a className="ad-doc-btn download" title="Download" href={`${API_URL}/${doc.documentPath}`} target="_blank" rel="noopener noreferrer" download>
                                <FaDownload /> <span>Download</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Document Upload Section */}
                <div className="ad-admin-upload-section">
                  <div className="ad-admin-upload-header">
                    <FaPlusCircle /> <span>Admin: Upload Document for this Property</span>
                  </div>
                  <div className="ad-admin-upload-form">
                    <div className="ad-upload-row">
                      <select
                        className="ad-upload-select"
                        value={adminDocUpload.type}
                        onChange={e => setAdminDocUpload(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="ownership_deed">Ownership Deed</option>
                        <option value="sale_deed">Sale Deed</option>
                        <option value="tax_receipt">Tax Receipt</option>
                        <option value="survey_document">Survey Document</option>
                        <option value="legal_clearance">Legal Clearance</option>
                        <option value="other">Other Document</option>
                      </select>
                      <input
                        type="text"
                        className="ad-upload-name-input"
                        placeholder="Document name (optional)"
                        value={adminDocUpload.name}
                        onChange={e => setAdminDocUpload(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="ad-upload-row">
                      <label className="ad-upload-file-label">
                        <FaFileAlt /> {adminDocUpload.file ? adminDocUpload.file.name : 'Choose file (PDF, DOC, JPG, PNG)'}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          style={{ display: 'none' }}
                          onChange={e => setAdminDocUpload(prev => ({ ...prev, file: e.target.files[0] || null }))}
                        />
                      </label>
                      <button
                        className="ad-upload-btn"
                        onClick={handleAdminDocUpload}
                        disabled={!adminDocUpload.file || adminDocUploading}
                      >
                        {adminDocUploading ? <><FaSyncAlt className="spin" /> Uploading...</> : <><FaDownload style={{ transform: 'rotate(180deg)' }} /> Upload</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ownership History */}
            {p.ownershipHistory?.length > 0 && (
              <div className="ad-card">
                <div className="ad-card-head">
                  <div className="ad-card-head-icon-wrap purple"><FaHistory /></div>
                  <div>
                    <h3>Ownership History</h3>
                    <span className="ad-card-head-sub">Transfer chain of custody</span>
                  </div>
                </div>
                <div className="ad-card-body">
                  <div className="ad-history-list">
                    {p.ownershipHistory.map((h, i) => (
                      <div key={i} className="ad-history-item">
                        <div className="ad-history-dot" />
                        <div className="ad-history-content">
                          <span className="ad-history-parties">{h.previousOwner?.name || 'Unknown'} → {h.newOwner?.name || 'Unknown'}</span>
                          <span className="ad-history-meta">{fmtDate(h.transferDate)} • {fmtCurrency(h.transferPrice)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="ad-detail-right">
            {/* Verification Score */}
            <div className="ad-card">
              <div className="ad-card-head">
                <div className="ad-card-head-icon-wrap green"><FaShieldAlt /></div>
                <div>
                  <h3>Verification Status</h3>
                  <span className="ad-card-head-sub">Automated integrity checks</span>
                </div>
              </div>
              <div className="ad-card-body">
                <div className="ad-verification-score">
                  <div className="ad-score-ring">
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#E2E8F0" strokeWidth="10" />
                      <circle cx="60" cy="60" r="52" fill="none"
                        stroke={score >= 80 ? '#138808' : score >= 50 ? '#FF9933' : '#DC2626'}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${score * 3.267} 326.7`}
                        transform="rotate(-90 60 60)" />
                    </svg>
                    <div className="ad-score-center">
                      <span className="ad-score-text">{score}%</span>
                      <span className="ad-score-sub">Score</span>
                    </div>
                  </div>
                </div>
                <div className="ad-checks-list">
                  {[
                    { label: 'Document Hash Integrity', done: checks.documentHashValid },
                    { label: 'Owner KYC Verified', done: checks.ownerKycVerified },
                    { label: 'Duplicate Property Check', done: checks.duplicateCheck },
                    { label: 'Survey Number Validation', done: checks.surveyNumberValid },
                    { label: 'Geo-Fence Boundary Check', done: checks.geoFenceValid }
                  ].map((c, i) => (
                    <div key={i} className={`ad-check-item ${c.done ? 'passed' : 'failed'}`}>
                      <div className="ad-check-icon">{c.done ? <FaCheckCircle /> : <FaTimesCircle />}</div>
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
                {v.adminNotes && (
                  <div className="ad-admin-notes">
                    <span className="ad-admin-notes-label"><FaFileAlt /> Admin Notes</span>
                    <p>{v.adminNotes}</p>
                  </div>
                )}
                {v.rejectionReason && (
                  <div className="ad-rejection-reason">
                    <span className="ad-rejection-label"><FaBan /> Rejection Reason</span>
                    <p>{v.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Property Owner */}
            <div className="ad-card">
              <div className="ad-card-head">
                <div className="ad-card-head-icon-wrap orange"><FaUser /></div>
                <div>
                  <h3>Property Owner</h3>
                  <span className="ad-card-head-sub">Owner identity & KYC status</span>
                </div>
              </div>
              <div className="ad-card-body">
                {p.owner ? (
                  <div className="ad-owner-section">
                    <div className="ad-owner-header">
                      <div className="ad-owner-avatar">{(p.owner.name || 'U').charAt(0).toUpperCase()}</div>
                      <div className="ad-owner-identity">
                        <h4>{p.owner.name}</h4>
                        <span className="ad-owner-id">{p.owner.governmentId || 'No Gov ID'}</span>
                      </div>
                    </div>
                    <div className="ad-owner-contact">
                      <div className="ad-owner-contact-item"><FaEnvelope /> <span>{p.owner.email}</span></div>
                      <div className="ad-owner-contact-item"><FaPhone /> <span>{p.owner.phoneNumber || 'N/A'}</span></div>
                      <div className="ad-owner-contact-item"><FaIdCard /> <span>{p.owner.governmentId || 'N/A'}</span></div>
                    </div>
                    <div className="ad-owner-kyc-grid">
                      {[
                        { label: 'Aadhaar', done: p.owner.kycStatus?.aadhaarVerified, icon: <FaIdCard /> },
                        { label: 'PAN Card', done: p.owner.kycStatus?.panVerified, icon: <FaFileAlt /> },
                        { label: 'Face ID', done: p.owner.kycStatus?.faceEnrolled, icon: <FaUser /> },
                        { label: 'Fingerprint', done: p.owner.kycStatus?.fingerprintEnrolled, icon: <FaFingerprint /> }
                      ].map((k, i) => (
                        <div key={i} className={`ad-kyc-card ${k.done ? 'verified' : 'unverified'}`}>
                          <div className="ad-kyc-card-icon">{k.icon}</div>
                          <span className="ad-kyc-card-label">{k.label}</span>
                          <span className="ad-kyc-card-status">{k.done ? <FaCheckCircle /> : <FaTimesCircle />}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ad-empty-state">
                    <div className="ad-empty-icon-wrap"><FaUser /></div>
                    <h4>Owner Information Unavailable</h4>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            <div className="ad-card ad-card-danger-zone">
              <div className="ad-card-head">
                <div className="ad-card-head-icon-wrap dark"><FaLock /></div>
                <div>
                  <h3>Administrative Actions</h3>
                  <span className="ad-card-head-sub">Requires biometric verification</span>
                </div>
              </div>
              <div className="ad-card-body">
                <div className="ad-actions-notice">
                  <FaFingerprint />
                  <div>
                    <strong>Biometric Security</strong>
                    <p>Destructive actions require face + fingerprint verification</p>
                  </div>
                </div>
                <div className="ad-admin-actions-grid">
                  {p.status === 'frozen' ? (
                    <button className="ad-action-btn dispute" onClick={() => openQuickAction('dispute', p._id, pd.title)}>
                      <FaRedoAlt /> <span>Unfreeze / Resolve</span>
                    </button>
                  ) : (
                    <button className="ad-action-btn freeze" onClick={() => openQuickAction('freeze', p._id, pd.title)}>
                      <FaSnowflake /> <span>Freeze Property</span>
                    </button>
                  )}
                  <button className="ad-action-btn audit" onClick={() => openQuickAction('audit', p._id, pd.title)}>
                    <FaHistory /> <span>Audit Trail</span>
                  </button>
                  <button className="ad-action-btn dispute" onClick={() => openQuickAction('dispute', p._id, pd.title)}>
                    <FaGavel /> <span>Resolve Dispute</span>
                  </button>
                  <button className="ad-action-btn report" onClick={() => openQuickAction('report', p._id, pd.title)}>
                    <FaFileContract /> <span>Generate Report</span>
                  </button>
                  <button className="ad-action-btn flag" onClick={() => openQuickAction('flag', p._id, pd.title)}>
                    <FaFlag /> <span>Flag Suspicious</span>
                  </button>
                  <button className="ad-action-btn verify" onClick={() => openQuickAction('verify', p._id, pd.title)}>
                    <FaUserCheck /> <span>Verify Owner</span>
                  </button>
                  <button className="ad-action-btn warning" onClick={() => { setStatusChangeData({ newStatus: 'disputed', reason: 'Flagged by admin' }); startBiometricVerification('status', p._id, pd.title); }}>
                    <FaBan /> <span>Flag as Disputed</span>
                  </button>
                  <button className="ad-action-btn archive" onClick={() => { setStatusChangeData({ newStatus: 'archived', reason: 'Archived by admin' }); startBiometricVerification('status', p._id, pd.title); }}>
                    <FaArchive /> <span>Archive Property</span>
                  </button>
                  <button className="ad-action-btn danger" onClick={() => startBiometricVerification('delete', p._id, pd.title)}>
                    <FaTrashAlt /> <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════
     PROPERTIES LIST VIEW
     ══════════════════════════════════════════════════ */
  const renderPropertiesList = () => (
    <div className="ad-properties-view">
      <button className="ad-back-btn" onClick={() => setActiveView('overview')}>
        <FaArrowLeft /> Back to Command Center
      </button>

      {/* Stats Bar */}
      <div className="ad-prop-stats-bar">
        {[
          { label: 'Total Registry', value: propertyCounts.total, icon: <FaBuilding />, color: '#0B3D91', bg: 'rgba(11, 61, 145,0.06)', border: 'rgba(11, 61, 145,0.18)' },
          { label: 'Verified', value: propertyCounts.verified, icon: <FaCheckCircle />, color: '#138808', bg: 'rgba(19,136,8,0.06)', border: 'rgba(19,136,8,0.18)' },
          { label: 'Pending Review', value: propertyCounts.pending, icon: <FaClock />, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Rejected', value: propertyCounts.rejected, icon: <FaTimesCircle />, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
        ].map((s, i) => (
          <div key={i} className="ad-prop-stat" style={{ background: s.bg, borderColor: s.border }}>
            <div className="ad-prop-stat-icon" style={{ color: s.color, background: `${s.color}15` }}>{s.icon}</div>
            <div className="ad-prop-stat-info">
              <span className="ad-prop-stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="ad-prop-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="ad-filters-bar">
        <div className="ad-search-wrap">
          <FaSearch className="ad-search-icon" />
          <input type="text" placeholder="Search properties by title, ID, city, owner..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ad-search-input" />
          {searchQuery && <button className="ad-search-clear" onClick={() => setSearchQuery('')}><FaTimes /></button>}
        </div>
        <div className="ad-filter-group">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="ad-filter-select">
            <option value="">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="needs_review">Needs Review</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="ad-filter-select">
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="agricultural">Agricultural</option>
            <option value="industrial">Industrial</option>
            <option value="land">Land</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="ad-filter-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">By Title</option>
          </select>
        </div>
      </div>

      {/* Property Cards Grid */}
      {allProperties.length === 0 ? (
        <div className="ad-empty-state-large">
          <div className="ad-empty-icon-wrap"><FaBuilding /></div>
          <h4>No Properties Found</h4>
          <p>Adjust your search or filters to find properties.</p>
        </div>
      ) : (
        <div className="ad-property-cards-grid">
          {allProperties.map((prop) => {
            const pScore = prop.verification?.checkScore || 0;
            return (
              <div key={prop._id} className="ad-prop-card">
                <div className="ad-prop-card-top">
                  <div className="ad-prop-card-type">{capitalize(prop.propertyDetails?.propertyType)}</div>
                  <div className="ad-prop-card-badges">
                    {getVerificationBadge(prop.verification?.status)}
                    {getPropertyStatusBadge(prop.status)}
                  </div>
                </div>
                <h4 className="ad-prop-card-title">{prop.propertyDetails?.title || 'Untitled Property'}</h4>
                <p className="ad-prop-card-id"><FaHashtag /> {prop.propertyId}</p>

                <div className="ad-prop-card-details">
                  <div className="ad-prop-card-detail">
                    <FaUser />
                    <div>
                      <span className="ad-pcd-label">Owner</span>
                      <span className="ad-pcd-value">{prop.owner?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="ad-prop-card-detail">
                    <FaMapMarkerAlt />
                    <div>
                      <span className="ad-pcd-label">Location</span>
                      <span className="ad-pcd-value">{prop.propertyDetails?.address?.city || 'N/A'}, {prop.propertyDetails?.address?.state || ''}</span>
                    </div>
                  </div>
                  <div className="ad-prop-card-detail">
                    <FaFileAlt />
                    <div>
                      <span className="ad-pcd-label">Documents</span>
                      <span className="ad-pcd-value">{prop.documents?.length || 0} files</span>
                    </div>
                  </div>
                  <div className="ad-prop-card-detail">
                    <FaShieldAlt />
                    <div>
                      <span className="ad-pcd-label">Score</span>
                      <span className={`ad-pcd-value score ${pScore >= 80 ? 'high' : pScore >= 50 ? 'mid' : 'low'}`}>{pScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="ad-prop-card-footer">
                  <span className="ad-prop-card-date"><FaCalendarAlt /> {fmtDate(prop.createdAt)}</span>
                  <div className="ad-prop-card-actions">
                    <button className="ad-pca-btn view" onClick={() => handleViewProperty(prop._id)} title="View Details"><FaEye /></button>
                    {(prop.verification?.status === 'pending' || prop.verification?.status === 'needs_review') && (
                      <button className="ad-pca-btn approve" onClick={() => handleApproveProperty(prop._id)} disabled={actionLoading === prop._id} title="Approve">
                        <FaCheckCircle />
                      </button>
                    )}
                    <button className="ad-pca-btn delete" onClick={() => startBiometricVerification('delete', prop._id, prop.propertyDetails?.title)} title="Delete">
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════
     KYC PROFILE MANAGEMENT
     ══════════════════════════════════════════════════ */
  const fetchKycData = async () => {
    setKycLoading(true);
    try {
      const res = await adminKycAPI.getKyc();
      setKycData(res.data.kyc);
    } catch { toast.error('Failed to load KYC data'); }
    finally { setKycLoading(false); }
  };

  const handleKycSubmit = async () => {
    setKycLoading(true);
    try {
      const payload = {};
      if (kycForm.aadhaarNumber && kycForm.aadhaarNumber.length === 12) payload.aadhaarNumber = kycForm.aadhaarNumber;
      if (kycForm.panNumber && kycForm.panNumber.length === 10) payload.panNumber = kycForm.panNumber.toUpperCase();
      if (kycForm.governmentIdNumber) { payload.governmentIdType = kycForm.governmentIdType; payload.governmentIdNumber = kycForm.governmentIdNumber; }
      if (!Object.keys(payload).length) { toast.error('Enter at least one valid ID'); setKycLoading(false); return; }
      const res = await adminKycAPI.updateKyc(payload);
      setKycData(prev => ({ ...prev, ...res.data.kyc }));
      toast.success('✅ KYC updated — Trust Score: ' + res.data.trustScore);
      refreshProfile();
    } catch (err) { toast.error(err.response?.data?.message || 'KYC update failed'); }
    finally { setKycLoading(false); }
  };

  const handleBiometricEnroll = async (type) => {
    setKycEnrollLoading(true);
    setKycScanType(type);
    setKycScanPhase('scanning');
    setKycScanProgress(0);

    try {
      if (type === 'fingerprint') {
        // ── FINGERPRINT: Use WebAuthn (real system sensor) ──
        const available = await webAuthnHelpers.isPlatformAvailable();
        if (!available) {
          throw new Error('No biometric sensor detected on this device. Please use a device with Touch ID, Windows Hello, or a FIDO2 security key.');
        }

        setKycScanProgress(15);

        const enrollAPI = adminKycAPI.enrollFingerprint;
        const optionsRes = await enrollAPI({ phase: 'options' });
        const { options } = optionsRes.data;

        setKycScanProgress(30);
        toast.info('🔐 Place your finger on the sensor', { autoClose: 8000 });

        const credential = await webAuthnHelpers.startRegistration(options);

        setKycScanProgress(75);
        setKycScanPhase('processing');

        const verifyRes = await enrollAPI({ phase: 'verify', credential });

        setKycScanProgress(100);
        setKycScanPhase('done');
        toast.success(`✅ Fingerprint enrolled via system sensor — KYC Level: ${verifyRes.data.kycLevel}`);
        setKycData(prev => ({
          ...prev,
          fingerprintEnrolled: true,
          fingerprintEnrolledAt: new Date().toISOString(),
          kycLevel: verifyRes.data.kycLevel
        }));
        refreshProfile();
      } else {
        // ── FACE: Use camera capture (real webcam) ──
        setKycScanProgress(5);
        toast.info('📸 Starting camera for face enrollment...', { autoClose: 6000 });

        // Open camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        setKycFaceStream(stream);
        setKycFaceCameraActive(true);

        // Wait for video element to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        if (kycVideoRef.current) {
          kycVideoRef.current.srcObject = stream;
        }

        setKycScanProgress(15);
        toast.info('📸 Position your face in the frame and hold still...', { autoClose: 8000 });

        // Animate face scanning — 3 second capture window
        const scanDuration = 3000;
        const startTime = Date.now();

        await new Promise((resolve) => {
          const scanInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(15 + (elapsed / scanDuration) * 50, 65);
            setKycScanProgress(Math.round(progress));
            if (elapsed >= scanDuration) {
              clearInterval(scanInterval);
              resolve();
            }
          }, 200);
        });

        setKycScanProgress(70);
        setKycScanPhase('processing');

        // Capture frame from camera
        let faceCapture = null;
        if (kycVideoRef.current && kycCanvasRef.current) {
          const video = kycVideoRef.current;
          const canvas = kycCanvasRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          faceCapture = canvas.toDataURL('image/jpeg', 0.85);
        }

        // Stop camera
        stream.getTracks().forEach(t => t.stop());
        setKycFaceStream(null);
        setKycFaceCameraActive(false);

        if (!faceCapture) {
          throw new Error('Failed to capture face image. Ensure camera is working.');
        }

        setKycScanProgress(85);

        // Send face capture to server for enrollment
        const verifyRes = await adminKycAPI.enrollFace({
          phase: 'verify',
          faceCapture
        });

        setKycScanProgress(100);
        setKycScanPhase('done');
        toast.success(`✅ Face enrolled via camera scan — KYC Level: ${verifyRes.data.kycLevel}`);
        setKycData(prev => ({
          ...prev,
          faceEnrolled: true,
          faceEnrolledAt: new Date().toISOString(),
          kycLevel: verifyRes.data.kycLevel
        }));
        refreshProfile();
      }
    } catch (err) {
      setKycScanPhase('failed');
      // Stop camera on error
      if (kycFaceStream) {
        kycFaceStream.getTracks().forEach(t => t.stop());
        setKycFaceStream(null);
        setKycFaceCameraActive(false);
      }
      const msg = err.name === 'NotAllowedError'
        ? 'Camera/sensor access was denied or timed out. Try again.'
        : err.response?.data?.message || err.message || `${capitalize(type)} enrollment failed`;
      toast.error(msg);
    } finally {
      setKycEnrollLoading(false);
      setTimeout(() => { setKycScanPhase('idle'); setKycScanType(null); setKycScanProgress(0); }, 2500);
    }
  };

  const handleSecurityModeChange = async (mode) => {
    try {
      const res = await adminKycAPI.updateLoginSecurityMode({ mode });
      setKycData(prev => ({ ...prev, loginSecurityMode: mode }));
      toast.success(`🔒 Login security set to ${mode}`);
      refreshProfile();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update security mode'); }
  };

  const kycLevelLabels = ['Not Started', 'Basic (1 ID)', 'Standard (2 IDs)', 'Biometric (1 Bio)', 'Full (2 Bio)', 'Maximum (All)'];
  const kycLevelColors = ['#94A3B8', '#FF9933', '#0891B2', '#7C3AED', '#138808', '#0B3D91'];

  const renderKycProfile = () => (
    <main className="admin-dash-main">
      <button className="ad-back-btn" onClick={() => setActiveView('overview')}>
        <FaArrowLeft /> Back to Command Center
      </button>

      <div className="kyc-profile-container">
        {/* KYC Header */}
        <div className="kyc-header-card">
          <div className="kyc-header-icon"><FaIdCard /></div>
          <div className="kyc-header-info">
            <h2>Admin KYC Profile</h2>
            <p>Identity verification & biometric enrollment for <strong>{admin?.name || 'Officer'}</strong></p>
          </div>
          <div className="kyc-level-badge" style={{ background: `${kycLevelColors[kycData?.kycLevel || 0]}18`, color: kycLevelColors[kycData?.kycLevel || 0], borderColor: `${kycLevelColors[kycData?.kycLevel || 0]}40` }}>
            <span className="kyc-level-num">Level {kycData?.kycLevel || 0}</span>
            <span className="kyc-level-label">{kycLevelLabels[kycData?.kycLevel || 0]}</span>
          </div>
        </div>

        {kycLoading && !kycData ? (
          <div className="kyc-loading"><div className="admin-spinner" /><span>Loading KYC data...</span></div>
        ) : (
          <div className="kyc-grid">
            {/* ─── Identity Documents ─── */}
            <div className="kyc-card">
              <div className="kyc-card-header">
                <FaFileAlt className="kyc-card-icon" />
                <h3>Identity Documents</h3>
              </div>
              <div className="kyc-card-body">
                {/* Aadhaar */}
                <div className="kyc-doc-row">
                  <div className="kyc-doc-info">
                    <span className="kyc-doc-label">Aadhaar Card</span>
                    {kycData?.aadhaarVerified ? (
                      <span className="kyc-doc-status verified"><FaCheckCircle /> Verified • {kycData.aadhaarLast4 || 'XXXX'}</span>
                    ) : (
                      <span className="kyc-doc-status pending">Not Verified</span>
                    )}
                  </div>
                  {!kycData?.aadhaarVerified && (
                    <div className="kyc-doc-input">
                      <input
                        type="text" placeholder="12-digit Aadhaar number"
                        value={kycForm.aadhaarNumber}
                        onChange={e => setKycForm(p => ({ ...p, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                        maxLength="12"
                      />
                    </div>
                  )}
                </div>

                {/* PAN */}
                <div className="kyc-doc-row">
                  <div className="kyc-doc-info">
                    <span className="kyc-doc-label">PAN Card</span>
                    {kycData?.panVerified ? (
                      <span className="kyc-doc-status verified"><FaCheckCircle /> Verified • {kycData.panMasked || 'XXXXX'}</span>
                    ) : (
                      <span className="kyc-doc-status pending">Not Verified</span>
                    )}
                  </div>
                  {!kycData?.panVerified && (
                    <div className="kyc-doc-input">
                      <input
                        type="text" placeholder="10-char PAN (e.g. ABCDE1234F)"
                        value={kycForm.panNumber}
                        onChange={e => setKycForm(p => ({ ...p, panNumber: e.target.value.toUpperCase().slice(0, 10) }))}
                        maxLength="10"
                      />
                    </div>
                  )}
                </div>

                {/* Government ID */}
                <div className="kyc-doc-row">
                  <div className="kyc-doc-info">
                    <span className="kyc-doc-label">Government ID</span>
                    {kycData?.governmentIdVerified ? (
                      <span className="kyc-doc-status verified"><FaCheckCircle /> Verified • {capitalize(kycData.governmentIdType)}</span>
                    ) : (
                      <span className="kyc-doc-status pending">Not Verified</span>
                    )}
                  </div>
                  {!kycData?.governmentIdVerified && (
                    <div className="kyc-doc-input govt-id-row">
                      <select value={kycForm.governmentIdType} onChange={e => setKycForm(p => ({ ...p, governmentIdType: e.target.value }))}>
                        <option value="aadhaar">Aadhaar</option>
                        <option value="passport">Passport</option>
                        <option value="voter_id">Voter ID</option>
                        <option value="driving_license">Driving License</option>
                      </select>
                      <input type="text" placeholder="ID Number" value={kycForm.governmentIdNumber}
                        onChange={e => setKycForm(p => ({ ...p, governmentIdNumber: e.target.value }))} />
                    </div>
                  )}
                </div>

                <button className="kyc-submit-btn" onClick={handleKycSubmit} disabled={kycLoading}>
                  {kycLoading ? <><span className="admin-spinner" /> Verifying...</> : <><FaCheckDouble /> Verify Documents</>}
                </button>
              </div>
            </div>

            {/* ─── Biometric Enrollment ─── */}
            <div className="kyc-card">
              <div className="kyc-card-header">
                <FaFingerprint className="kyc-card-icon" />
                <h3>Biometric Enrollment</h3>
              </div>
              <div className="kyc-card-body">
                {/* Fingerprint */}
                <div className="kyc-bio-row">
                  <div className="kyc-bio-icon-wrap fingerprint">
                    <FaFingerprint />
                  </div>
                  <div className="kyc-bio-info">
                    <span className="kyc-bio-label">Fingerprint</span>
                    {kycData?.fingerprintEnrolled ? (
                      <span className="kyc-bio-status enrolled"><FaCheckCircle /> Enrolled • {fmtDate(kycData.fingerprintEnrolledAt)}</span>
                    ) : (
                      <span className="kyc-bio-status not-enrolled">Not Enrolled</span>
                    )}
                  </div>
                  {!kycData?.fingerprintEnrolled && (
                    <button className="kyc-enroll-btn" onClick={() => handleBiometricEnroll('fingerprint')}
                      disabled={kycEnrollLoading}>
                      <FaFingerprint /> Enroll
                    </button>
                  )}
                </div>

                {/* Face */}
                <div className="kyc-bio-row">
                  <div className="kyc-bio-icon-wrap face">
                    <FaUserShield />
                  </div>
                  <div className="kyc-bio-info">
                    <span className="kyc-bio-label">Face Recognition</span>
                    {kycData?.faceEnrolled ? (
                      <span className="kyc-bio-status enrolled"><FaCheckCircle /> Enrolled • {fmtDate(kycData.faceEnrolledAt)}</span>
                    ) : (
                      <span className="kyc-bio-status not-enrolled">Not Enrolled</span>
                    )}
                  </div>
                  {!kycData?.faceEnrolled && (
                    <button className="kyc-enroll-btn face-enroll" onClick={() => handleBiometricEnroll('face')}
                      disabled={kycEnrollLoading}>
                      <FaUserShield /> Enroll
                    </button>
                  )}
                </div>

                {/* Scan Animation */}
                {kycScanPhase !== 'idle' && (
                  <div className={`kyc-scan-indicator ${kycScanPhase}`}>
                    {/* Camera preview for face enrollment */}
                    {kycScanType === 'face' && (kycScanPhase === 'scanning' || kycScanPhase === 'processing') && (
                      <div className="kyc-face-camera-wrap">
                        <video ref={kycVideoRef} autoPlay muted playsInline className="kyc-face-video" />
                        <canvas ref={kycCanvasRef} style={{ display: 'none' }} />
                        <div className="kyc-face-overlay">
                          <div className="kyc-face-frame">
                            <span className="kyc-fc top-left" />
                            <span className="kyc-fc top-right" />
                            <span className="kyc-fc bottom-left" />
                            <span className="kyc-fc bottom-right" />
                          </div>
                          {kycScanPhase === 'scanning' && <div className="kyc-face-scanline" style={{ top: `${kycScanProgress}%` }} />}
                          <div className={`kyc-face-label ${kycScanPhase}`}>
                            <span className="kyc-face-dot" />
                            {kycScanPhase === 'scanning' ? 'CAPTURING' : 'PROCESSING'}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="kyc-scan-icon-wrap">
                      {kycScanType === 'fingerprint' ? <FaFingerprint /> : <FaUserShield />}
                    </div>
                    <div className="kyc-scan-progress">
                      <div className="kyc-scan-bar"><div className="kyc-scan-fill" style={{ width: `${Math.min(kycScanProgress, 100)}%` }} /></div>
                      <span className="kyc-scan-text">
                        {kycScanPhase === 'scanning' && kycScanType === 'fingerprint' && 'Scanning fingerprint...'}
                        {kycScanPhase === 'scanning' && kycScanType === 'face' && `Capturing face... ${kycScanProgress}%`}
                        {kycScanPhase === 'processing' && 'Processing template...'}
                        {kycScanPhase === 'done' && '✅ Enrolled successfully!'}
                        {kycScanPhase === 'failed' && '❌ Enrollment failed'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Login Security Mode ─── */}
            <div className="kyc-card full-width">
              <div className="kyc-card-header">
                <FaLock className="kyc-card-icon" />
                <h3>Login Security Mode</h3>
              </div>
              <div className="kyc-card-body">
                <div className="kyc-security-modes">
                  {[
                    { mode: 'standard', label: 'Standard', desc: 'Password + TOTP Code', icon: <FaKey />, color: '#64748B', req: null },
                    { mode: 'biometric', label: 'Biometric', desc: 'Password + TOTP + Fingerprint OR Face', icon: <FaFingerprint />, color: '#7C3AED', req: 'Requires fingerprint or face enrolled' },
                    { mode: 'enhanced', label: 'Enhanced', desc: 'Password + TOTP + Fingerprint + Face', icon: <FaShieldAlt />, color: '#0B3D91', req: 'Requires both fingerprint and face enrolled' }
                  ].map(sm => {
                    const isActive = (kycData?.loginSecurityMode || 'standard') === sm.mode;
                    const canEnable = sm.mode === 'standard' ||
                      (sm.mode === 'biometric' && (kycData?.fingerprintEnrolled || kycData?.faceEnrolled)) ||
                      (sm.mode === 'enhanced' && kycData?.fingerprintEnrolled && kycData?.faceEnrolled);
                    return (
                      <div key={sm.mode} className={`kyc-mode-card ${isActive ? 'active' : ''} ${!canEnable ? 'disabled' : ''}`}
                        style={{ borderColor: isActive ? sm.color : undefined }}
                        onClick={() => canEnable && handleSecurityModeChange(sm.mode)}>
                        <div className="kyc-mode-icon" style={{ color: isActive ? sm.color : '#94A3B8', background: isActive ? `${sm.color}15` : 'rgba(0,0,0,0.04)' }}>
                          {sm.icon}
                        </div>
                        <div className="kyc-mode-info">
                          <strong>{sm.label}</strong>
                          <span>{sm.desc}</span>
                          {sm.req && !canEnable && <span className="kyc-mode-req">{sm.req}</span>}
                        </div>
                        {isActive && <div className="kyc-mode-active-badge" style={{ background: sm.color }}><FaCheckCircle /> Active</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── KYC Summary ─── */}
            <div className="kyc-card full-width">
              <div className="kyc-card-header">
                <FaChartBar className="kyc-card-icon" />
                <h3>Verification Summary</h3>
              </div>
              <div className="kyc-card-body">
                <div className="kyc-summary-grid">
                  {[
                    { label: 'Aadhaar', verified: kycData?.aadhaarVerified, icon: <FaIdCard /> },
                    { label: 'PAN Card', verified: kycData?.panVerified, icon: <FaFileAlt /> },
                    { label: 'Govt ID', verified: kycData?.governmentIdVerified, icon: <FaShieldAlt /> },
                    { label: 'Fingerprint', verified: kycData?.fingerprintEnrolled, icon: <FaFingerprint /> },
                    { label: 'Face Scan', verified: kycData?.faceEnrolled, icon: <FaUserShield /> }
                  ].map((item, i) => (
                    <div key={i} className={`kyc-summary-item ${item.verified ? 'verified' : 'pending'}`}>
                      <div className="kyc-summary-icon">{item.icon}</div>
                      <span className="kyc-summary-label">{item.label}</span>
                      {item.verified ? <FaCheckCircle className="kyc-summary-check" /> : <FaTimesCircle className="kyc-summary-x" />}
                    </div>
                  ))}
                </div>
                {kycData?.kycCompletedAt && (
                  <div className="kyc-completed-note">
                    <FaCheckDouble /> KYC Completed on {fmtDateTime(kycData.kycCompletedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );

  /* ══════════════════════════════════════════════════
     OVERVIEW
     ══════════════════════════════════════════════════ */
  const renderOverview = () => {
    return (
    <main className="admin-dash-main">
      {/* Quick Stats Row */}
      <div className="ad-quick-stats">
        {[
          { label: 'Total Properties', value: propertyCounts.total, icon: <FaBuilding />, color: '#0B3D91', bg: 'rgba(11, 61, 145,0.06)', border: 'rgba(11, 61, 145,0.15)' },
          { label: 'Verified', value: propertyCounts.verified, icon: <FaCheckCircle />, color: '#138808', bg: 'rgba(19,136,8,0.06)', border: 'rgba(19,136,8,0.15)' },
          { label: 'Pending Review', value: propertyCounts.pending, icon: <FaExclamationTriangle />, color: '#FF9933', bg: 'rgba(255,153,51,0.08)', border: 'rgba(255,153,51,0.2)' },
          { label: 'Rejected', value: propertyCounts.rejected, icon: <FaTimesCircle />, color: '#DC2626', bg: 'rgba(220,38,38,0.05)', border: 'rgba(220,38,38,0.15)' },
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: <FaUsers />, color: '#7C3AED', bg: 'rgba(124,58,237,0.05)', border: 'rgba(124,58,237,0.15)' },
          { label: 'Active Transfers', value: stats?.pendingTransfers || 0, icon: <FaExchangeAlt />, color: '#0891B2', bg: 'rgba(8,145,178,0.06)', border: 'rgba(8,145,178,0.15)' },
          { label: 'Completed Today', value: stats?.completedToday || 0, icon: <FaStamp />, color: '#138808', bg: 'rgba(19,136,8,0.06)', border: 'rgba(19,136,8,0.15)' },
          { label: 'Fraud Alerts', value: stats?.fraudAlerts?.length || 0, icon: <FaShieldVirus />, color: '#DC2626', bg: 'rgba(220,38,38,0.05)', border: 'rgba(220,38,38,0.15)' }
        ].map((s, i) => (
          <div key={i} className="ad-stat-card" style={{ background: s.bg, borderColor: s.border }}>
            <div className="ad-stat-icon" style={{ color: s.color, background: `${s.color}18` }}>{s.icon}</div>
            <div className="ad-stat-info">
              <span className="ad-stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="ad-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Buttons */}
      <div className="ad-quick-actions">
        <button className="ad-quick-action-btn primary" onClick={() => setActiveView('properties')}>
          <FaLayerGroup /> <span>View All Properties & Documents</span> <FaChevronRight />
        </button>
        <button className="ad-quick-action-btn ai-ml" onClick={() => setActiveView('ai-ml')}>
          <FaBrain /> <span>AI/ML Intelligence Center</span> <FaChevronRight />
        </button>
        <button className="ad-quick-action-btn blockchain" onClick={() => setActiveView('blockchain')}>
          <FaCubes /> <span>Bharat Land Chain Explorer</span> <FaChevronRight />
        </button>
        <button className="ad-quick-action-btn ipfs" onClick={() => setActiveView('ipfs')}>
          <FaDatabase /> <span>IPFS Document Storage</span> <FaChevronRight />
        </button>
        {admin?.isSuperAdmin && (
          <button className="ad-quick-action-btn primary" onClick={() => { setShowCreateAdmin(true); fetchAdminsList(); }}>
            <FaUserPlus /> <span>Create New Admin Account</span> <FaChevronRight />
          </button>
        )}
        <button className="ad-quick-action-btn secondary" onClick={handleRefresh} disabled={refreshing}>
          <FaSyncAlt className={refreshing ? 'spin' : ''} /> <span>{refreshing ? 'Refreshing...' : 'Force Refresh Data'}</span>
        </button>
        <button className="ad-quick-action-btn primary" onClick={() => { setActiveView('kyc-profile'); fetchKycData(); }}>
          <FaIdCard /> <span>My KYC Profile & Biometrics</span> <FaChevronRight />
        </button>
      </div>

      {/* Authority Quick Actions Grid */}
      <div className="ad-authority-actions">
        <div className="ad-authority-header">
          <div className="ad-authority-icon-wrap"><FaShieldAlt /></div>
          <div>
            <h2 className="ad-authority-title">Authority Quick Actions</h2>
            <span className="ad-authority-sub">Select a property from registry to perform administrative actions</span>
          </div>
        </div>
        <div className="ad-authority-grid">
          {[
            { type: 'freeze', label: 'Freeze Property', desc: 'Halt all transactions', icon: <FaSnowflake />, color: '#0891B2', bg: 'rgba(8,145,178,0.06)' },
            { type: 'audit', label: 'Audit Trail', desc: 'View complete history', icon: <FaHistory />, color: '#7C3AED', bg: 'rgba(124,58,237,0.05)' },
            { type: 'dispute', label: 'Resolve Dispute', desc: 'Settle property disputes', icon: <FaGavel />, color: '#FF9933', bg: 'rgba(255,153,51,0.08)' },
            { type: 'report', label: 'Generate Report', desc: 'Comprehensive report', icon: <FaFileContract />, color: '#0B3D91', bg: 'rgba(11, 61, 145,0.06)' },
            { type: 'flag', label: 'Flag Suspicious', desc: 'Mark for investigation', icon: <FaFlag />, color: '#DC2626', bg: 'rgba(220,38,38,0.05)' },
            { type: 'verify', label: 'Verify Owner', desc: 'Update KYC status', icon: <FaUserCheck />, color: '#138808', bg: 'rgba(19,136,8,0.06)' }
          ].map((action, i) => (
            <div key={i} className="ad-authority-card" style={{ background: action.bg, borderColor: `${action.color}30` }}
              onClick={() => { setActiveView('properties'); toast.info(`Select a property, then use ${action.label} from the detail view`); }}>
              <div className="ad-authority-card-icon" style={{ color: action.color, background: `${action.color}18` }}>{action.icon}</div>
              <h4 style={{ color: action.color }}>{action.label}</h4>
              <p>{action.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="admin-dash-grid">
        <div className="admin-dash-left">
          <InteractiveIndiaMap heatmapData={heatmap} pinnedProperties={govProperties} onPinProperty={handlePinProperty} propertyMarkers={allProperties} onViewProperty={handleViewProperty} />
          <IntelHub stats={stats} />
        </div>
        <div className="admin-dash-right">
          <AdminSmartIDCard admin={admin} />

          {/* Pending Approvals */}
          <div className="pending-approvals-panel">
            <div className="pending-approvals-header">
              <div className="pending-header-left">
                <div className="pending-icon-wrap"><FaExclamationTriangle /></div>
                <div>
                  <h2 className="pending-title">Pending Approvals</h2>
                  <span className="pending-subtitle">Properties requiring manual review & verification</span>
                </div>
              </div>
              {pendingProperties.length > 0 && <span className="pending-badge">{pendingProperties.length}</span>}
            </div>
            {pendingProperties.length === 0 ? (
              <div className="pending-empty">
                <FaCheckCircle className="pending-empty-icon" />
                <p>All Clear — No Pending Reviews</p>
                <span>All submitted properties have been processed</span>
              </div>
            ) : (
              <div className="pending-list">
                {pendingProperties.map((property) => {
                  const reasons = getReviewReasons(property);
                  const isExpanded = expandedProperty === property._id;
                  return (
                    <div key={property._id} className={`pending-card ${isExpanded ? 'expanded' : ''}`}>
                      <div className="pending-card-header" onClick={() => setExpandedProperty(isExpanded ? null : property._id)}>
                        <div className="pending-card-info">
                          <h4 className="pending-card-title">{property.propertyDetails?.title || 'Untitled'}</h4>
                          <div className="pending-card-meta">
                            <span><FaUser /> {property.owner?.name || 'Unknown'}</span>
                            <span><FaMapMarkerAlt /> {(property.propertyDetails?.address ? `${property.propertyDetails.address.city || 'Unknown'}` : 'No location')}</span>
                            <span><FaFileAlt /> {property.documents?.length || 0} docs</span>
                          </div>
                        </div>
                        <div className="pending-card-toggle">{isExpanded ? <FaChevronUp /> : <FaChevronDown />}</div>
                      </div>
                      {isExpanded && (
                        <div className="pending-card-details">
                          <div className="pending-detail-grid">
                            <div className="pending-detail-row"><span className="pending-detail-label"><FaClock /> Registered</span><span className="pending-detail-value">{fmtDate(property.createdAt)}</span></div>
                            <div className="pending-detail-row"><span className="pending-detail-label"><FaFileAlt /> Documents</span><span className="pending-detail-value">{property.documents?.length || 0} uploaded</span></div>
                            <div className="pending-detail-row"><span className="pending-detail-label"><FaRulerCombined /> Area</span><span className="pending-detail-value">{property.propertyDetails?.area?.value || 'N/A'} {property.propertyDetails?.area?.unit || ''}</span></div>
                            <div className="pending-detail-row"><span className="pending-detail-label"><FaBuilding /> Type</span><span className="pending-detail-value" style={{ textTransform: 'capitalize' }}>{property.propertyDetails?.propertyType || 'N/A'}</span></div>
                            <div className="pending-detail-row full"><span className="pending-detail-label"><FaHashtag /> Property ID</span><span className="pending-detail-value mono">{property.propertyId}</span></div>
                          </div>
                          {property.verification?.checkScore !== undefined && (
                            <div className="pending-score-bar">
                              <span className="pending-score-label">Verification Score</span>
                              <div className="pending-score-track">
                                <div className="pending-score-fill" style={{ width: `${property.verification.checkScore}%`, background: property.verification.checkScore >= 60 ? '#138808' : '#DC2626' }} />
                              </div>
                              <span className={`pending-score-value ${property.verification.checkScore >= 60 ? 'ok' : 'low'}`}>{property.verification.checkScore}%</span>
                            </div>
                          )}
                          {reasons.length > 0 && (
                            <div className="pending-reasons">
                              <span className="pending-reasons-label">⚠ Review Reasons:</span>
                              {reasons.map((r, i) => <div key={i} className="pending-reason-item">{r}</div>)}
                            </div>
                          )}
                          <div className="pending-card-actions">
                            <button className="pending-action-btn view" onClick={() => handleViewProperty(property._id)}><FaEye /> View Full Details</button>
                            <button className="pending-action-btn approve" onClick={() => handleApproveProperty(property._id)} disabled={actionLoading === property._id}>
                              <FaCheckCircle /> {actionLoading === property._id ? 'Processing...' : 'Approve'}
                            </button>
                            <button className="pending-action-btn reject" onClick={() => { setRejectModal(property._id); setRejectionReason(''); }} disabled={actionLoading === property._id}>
                              <FaTimesCircle /> Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
  };

  /* ══════════════════════════════════════════════════
     MAIN RETURN
     ══════════════════════════════════════════════════ */
  return (
    <div className="admin-dashboard">
      <div className="admin-dash-ambient" />

      {/* Error Banner */}
      {error && (
        <div className="admin-error-banner">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button onClick={handleRefresh} disabled={refreshing}><FaRedoAlt className={refreshing ? 'spin' : ''} /> Retry</button>
          <button className="admin-error-dismiss" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Top Bar */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-topbar-emblem-wrap">
            <FaShieldAlt className="admin-topbar-emblem" />
          </div>
          <div>
            <h1 className="admin-topbar-title">
              {{ overview: 'Command Center', properties: 'Property Registry', 'property-detail': 'Property Intelligence', 'kyc-profile': 'KYC Profile', announcements: 'Announcements & Guidelines', 'ai-ml': 'AI/ML Intelligence', ipfs: 'IPFS Document Storage', blockchain: 'Bharat Land Chain' }[activeView] || 'Command Center'}
            </h1>
            <span className="admin-topbar-sub">Smart Bhoomi National Land Infrastructure</span>
          </div>
        </div>
        <div className="admin-topbar-center">
          <div className="admin-topbar-clock">
            <FaClock />
            <span>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <div className="admin-topbar-date">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-topbar-btn" onClick={() => { setActiveView('announcements'); fetchAnnouncements(); }}>
            <FaBell /> Announcements
          </button>
          <button className="admin-topbar-btn kyc-topbar-btn" onClick={() => { setActiveView('kyc-profile'); fetchKycData(); }}>
            <FaIdCard /> KYC
          </button>
          <button className="admin-topbar-btn" onClick={handleRefresh} disabled={refreshing}>
            <FaSyncAlt className={refreshing ? 'spin' : ''} /> {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
          <div className="admin-topbar-user">
            <div className="admin-topbar-user-avatar">{(admin?.name || 'A').charAt(0)}</div>
            <div className="admin-topbar-user-info">
              <span className="admin-topbar-user-name">{admin?.name?.split(' ')[0] || 'Officer'}</span>
              <span className="admin-topbar-rank">{admin?.rank || 'Admin'}</span>
            </div>
          </div>
          <button className="admin-topbar-logout" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`ad-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="ad-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          {sidebarCollapsed ? <FaChevronRight /> : <FaChevronDown />}
        </div>
        <nav className="ad-sidebar-nav">
          {[
            { id: 'overview', label: 'Command Center', icon: <FaTachometerAlt /> },
            { id: 'properties', label: 'Property Registry', icon: <FaBuilding /> },
            { id: 'ai-ml', label: 'AI/ML Intelligence', icon: <FaBrain />, badge: stats?.fraudAlerts?.length || null },
            { id: 'blockchain', label: 'Blockchain', icon: <FaCubes /> },
            { id: 'ipfs', label: 'IPFS Storage', icon: <FaDatabase /> },
            { id: 'announcements', label: 'Announcements', icon: <FaBell /> },
            { id: 'kyc-profile', label: 'KYC Profile', icon: <FaIdCard /> },
          ].map(item => (
            <button
              key={item.id}
              className={`ad-sidebar-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveView(item.id);
                if (item.id === 'announcements') fetchAnnouncements();
                if (item.id === 'kyc-profile') fetchKycData();
              }}
              title={item.label}
            >
              <span className="ad-sidebar-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="ad-sidebar-label">{item.label}</span>}
              {item.badge && <span className="ad-sidebar-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className={`ad-content-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
        {activeView === 'overview' && renderOverview()}
        {activeView === 'properties' && renderPropertiesList()}
        {activeView === 'property-detail' && renderPropertyDetail()}
        {activeView === 'kyc-profile' && renderKycProfile()}
        {activeView === 'ai-ml' && (
          <main className="admin-dash-main">
            <AIMLPanel onInvestigate={(alertId) => { toast.info(`Investigating alert ${alertId}`); }} />
          </main>
        )}
        {activeView === 'ipfs' && (
          <main className="admin-dash-main">
            <IPFSAdminPanel />
          </main>
        )}
        {activeView === 'blockchain' && (
          <main className="admin-dash-main">
            <BlockchainAdminPanel />
          </main>
        )}
        {activeView === 'announcements' && (
          <div className="ad-announcements-view">
            <div className="ad-section-header-row">
              <button className="ad-back-btn" onClick={() => setActiveView('overview')}>
                <FaArrowLeft /> Back to Command Center
              </button>
              <h2><FaBell /> Announcements & Guidelines</h2>
              <button className="ad-create-btn" onClick={() => { setShowAnnouncementForm(true); setEditingAnnouncement(null); setAnnouncementForm({ title: '', message: '', category: 'announcement', priority: 'medium', links: [], isPinned: false, targetAudience: 'all' }); }}>
                <FaPlusCircle /> Create Announcement
              </button>
            </div>

            {/* Announcement Form Modal */}
            {showAnnouncementForm && (
              <div className="ad-modal-overlay" onClick={() => setShowAnnouncementForm(false)}>
                <div className="ad-modal ad-announcement-modal" onClick={e => e.stopPropagation()}>
                  <div className="ad-modal-header">
                    <div className="ad-modal-icon-wrap"><FaBell /></div>
                    <div>
                      <h3>{editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}</h3>
                      <span>Publish to all Smart Bhoomi users</span>
                    </div>
                    <button className="ad-modal-close" onClick={() => setShowAnnouncementForm(false)}><FaTimes /></button>
                  </div>
                  <div className="ad-modal-body">
                    <div className="ad-form-group">
                      <label>Title *</label>
                      <input type="text" placeholder="Announcement title..." value={announcementForm.title}
                        onChange={e => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))} className="ad-form-input" />
                    </div>
                    <div className="ad-form-group">
                      <label>Message *</label>
                      <textarea rows={4} placeholder="Announcement details..." value={announcementForm.message}
                        onChange={e => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))} className="ad-form-textarea" />
                    </div>
                    <div className="ad-form-row-2">
                      <div className="ad-form-group">
                        <label>Category</label>
                        <select value={announcementForm.category} onChange={e => setAnnouncementForm(prev => ({ ...prev, category: e.target.value }))} className="ad-form-select">
                          <option value="announcement">📢 Announcement</option>
                          <option value="guideline">📋 Guideline</option>
                          <option value="alert">🚨 Alert</option>
                          <option value="update">🔄 Update</option>
                          <option value="policy">📜 Policy</option>
                          <option value="maintenance">🔧 Maintenance</option>
                        </select>
                      </div>
                      <div className="ad-form-group">
                        <label>Priority</label>
                        <select value={announcementForm.priority} onChange={e => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value }))} className="ad-form-select">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                    <div className="ad-form-row-2">
                      <div className="ad-form-group">
                        <label>Target Audience</label>
                        <select value={announcementForm.targetAudience} onChange={e => setAnnouncementForm(prev => ({ ...prev, targetAudience: e.target.value }))} className="ad-form-select">
                          <option value="all">All Users</option>
                          <option value="property_owners">Property Owners</option>
                          <option value="buyers">Buyers</option>
                          <option value="verified_users">Verified Users</option>
                        </select>
                      </div>
                      <div className="ad-form-group">
                        <label className="ad-form-check-label">
                          <input type="checkbox" checked={announcementForm.isPinned} onChange={e => setAnnouncementForm(prev => ({ ...prev, isPinned: e.target.checked }))} />
                          📌 Pin this announcement
                        </label>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="ad-form-group">
                      <label>Links & Resources</label>
                      <div className="ad-ann-links-list">
                        {announcementForm.links.map((lnk, i) => (
                          <div key={i} className="ad-ann-link-item">
                            <FaLink /> <span>{lnk.label}</span> <a href={lnk.url} target="_blank" rel="noopener noreferrer">{lnk.url}</a>
                            <button onClick={() => removeAnnouncementLink(i)} className="ad-ann-link-remove"><FaTimes /></button>
                          </div>
                        ))}
                      </div>
                      <div className="ad-ann-add-link-row">
                        <input type="text" placeholder="Link label" value={announcementLinkForm.label}
                          onChange={e => setAnnouncementLinkForm(prev => ({ ...prev, label: e.target.value }))} className="ad-form-input" />
                        <input type="url" placeholder="https://..." value={announcementLinkForm.url}
                          onChange={e => setAnnouncementLinkForm(prev => ({ ...prev, url: e.target.value }))} className="ad-form-input" />
                        <button onClick={addAnnouncementLink} className="ad-ann-add-link-btn" disabled={!announcementLinkForm.label || !announcementLinkForm.url}>
                          <FaPlusCircle /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="ad-modal-footer">
                    <button className="ad-modal-cancel-btn" onClick={() => setShowAnnouncementForm(false)}>Cancel</button>
                    <button className="ad-modal-action-btn" onClick={handleCreateAnnouncement} disabled={announcementLoading || !announcementForm.title || !announcementForm.message}>
                      {announcementLoading ? 'Publishing...' : editingAnnouncement ? 'Update' : '📢 Publish Announcement'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Announcements List */}
            <div className="ad-announcements-list">
              {announcements.length === 0 ? (
                <div className="ad-empty-state">
                  <div className="ad-empty-icon-wrap"><FaBell /></div>
                  <h4>No Announcements Yet</h4>
                  <p>Create your first announcement to notify all Smart Bhoomi users.</p>
                </div>
              ) : (
                announcements.map(ann => (
                  <div key={ann._id} className={`ad-announcement-card ${ann.priority} ${ann.isActive ? '' : 'inactive'} ${ann.isPinned ? 'pinned' : ''}`}>
                    <div className="ad-ann-card-header">
                      <div className="ad-ann-badges">
                        {ann.isPinned && <span className="ad-ann-badge pinned">📌 Pinned</span>}
                        <span className={`ad-ann-badge cat-${ann.category}`}>
                          {ann.category === 'announcement' && '📢'}
                          {ann.category === 'guideline' && '📋'}
                          {ann.category === 'alert' && '🚨'}
                          {ann.category === 'update' && '🔄'}
                          {ann.category === 'policy' && '📜'}
                          {ann.category === 'maintenance' && '🔧'}
                          {' '}{capitalize(ann.category)}
                        </span>
                        <span className={`ad-ann-badge priority-${ann.priority}`}>{capitalize(ann.priority)}</span>
                        {!ann.isActive && <span className="ad-ann-badge inactive-badge">Inactive</span>}
                      </div>
                      <div className="ad-ann-actions">
                        <button onClick={() => handleToggleAnnouncementActive(ann._id, ann.isActive)} title={ann.isActive ? 'Deactivate' : 'Activate'}>
                          {ann.isActive ? <FaBan /> : <FaCheckCircle />}
                        </button>
                        <button onClick={() => handleEditAnnouncement(ann)} title="Edit"><FaCog /></button>
                        <button onClick={() => handleDeleteAnnouncement(ann._id)} title="Delete" className="danger"><FaTrashAlt /></button>
                      </div>
                    </div>
                    <h3 className="ad-ann-title">{ann.title}</h3>
                    <p className="ad-ann-message">{ann.message}</p>
                    {ann.links?.length > 0 && (
                      <div className="ad-ann-links">
                        {ann.links.map((lnk, i) => (
                          <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer" className="ad-ann-link-chip">
                            <FaLink /> {lnk.label}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="ad-ann-footer">
                      <span><FaUser /> {ann.createdBy?.name || 'Admin'}</span>
                      <span><FaClock /> {fmtDateTime(ann.createdAt)}</span>
                      <span><FaUsers /> {capitalize(ann.targetAudience || 'all')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Reject Modal ═══ */}
      {rejectModal && (
        <div className="ad-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header danger">
              <div className="ad-modal-icon-wrap"><FaTimesCircle /></div>
              <div>
                <h3>Reject Property Registration</h3>
                <p>This action will notify the property owner</p>
              </div>
              <button className="ad-modal-close" onClick={() => setRejectModal(null)}><FaTimes /></button>
            </div>
            <div className="ad-modal-body">
              <label className="ad-modal-label">Rejection Reason <span>(required)</span></label>
              <textarea
                className="ad-modal-textarea"
                placeholder="Provide a clear and detailed reason for rejecting this property registration..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
              />
            </div>
            <div className="ad-modal-footer">
              <button className="ad-modal-btn cancel" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="ad-modal-btn danger" onClick={handleRejectProperty} disabled={!rejectionReason.trim() || actionLoading}>
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Biometric Modal ═══ */}
      {biometricModal && (
        <div className="ad-modal-overlay" onClick={() => { setBiometricModal(null); setBiometricStep('idle'); }}>
          <div className="ad-modal bio-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header bio">
              <div className="ad-modal-icon-wrap bio"><FaFingerprint /></div>
              <div>
                <h3>Biometric Verification Required</h3>
                <p>Admin identity must be verified for this action</p>
              </div>
              <button className="ad-modal-close" onClick={() => { setBiometricModal(null); setBiometricStep('idle'); }}><FaTimes /></button>
            </div>
            <div className="ad-modal-body">
              <div className="bio-action-card">
                <span className="bio-action-label">Requested Action</span>
                <span className="bio-action-value">{biometricModal.action === 'delete' ? '🗑️ Delete Property Permanently' : '⚡ Change Property Status'}</span>
                <span className="bio-action-target">{biometricModal.title}</span>
              </div>

              {biometricModal.action === 'delete' && (
                <div className="bio-reason-section">
                  <label>Reason for deletion <span>(min 10 characters)</span></label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Provide detailed justification for permanent deletion..."
                    rows={3}
                    className="ad-modal-textarea"
                  />
                </div>
              )}

              <div className="bio-verification-zone">
                {biometricStep === 'idle' && (
                  <div className="bio-idle">
                    <div className="bio-scan-illustration">
                      <div className="bio-scan-icon-card"><FaFingerprint /></div>
                      <div className="bio-scan-plus">+</div>
                      <div className="bio-scan-icon-card face">👤</div>
                    </div>
                    <p>Place your finger on the biometric sensor and look at the camera</p>
                    <button className="bio-start-btn" onClick={simulateBiometricScan} disabled={biometricModal.action === 'delete' && deleteReason.trim().length < 10}>
                      <FaFingerprint /> Start Biometric Verification
                    </button>
                  </div>
                )}
                {biometricStep === 'scanning' && (
                  <div className="bio-scanning">
                    <div className="bio-scan-animation">
                      <div className="bio-scan-ring" />
                      <FaFingerprint className="bio-scan-fp" />
                    </div>
                    <p className="bio-scan-text">Scanning fingerprint & face...</p>
                    <div className="bio-scan-progress"><div className="bio-scan-progress-bar" /></div>
                  </div>
                )}
                {biometricStep === 'verified' && (
                  <div className="bio-verified">
                    <div className="bio-verified-check"><FaCheckCircle /></div>
                    <h4>Identity Verified</h4>
                    <p><strong>{admin?.name}</strong></p>
                    <span className="bio-verified-meta">ID: {admin?.employeeId} • {admin?.rank}</span>
                    <button className="bio-execute-btn" onClick={executeBiometricAction} disabled={actionLoading}>
                      {actionLoading ? 'Executing...' : biometricModal.action === 'delete' ? '🗑️ Confirm Permanent Deletion' : '✅ Confirm Status Change'}
                    </button>
                  </div>
                )}
                {biometricStep === 'failed' && (
                  <div className="bio-failed">
                    <div className="bio-failed-check"><FaTimesCircle /></div>
                    <h4>Verification Failed</h4>
                    <p>Could not verify your identity. Please try again.</p>
                    <button className="bio-retry-btn" onClick={() => setBiometricStep('idle')}><FaRedoAlt /> Try Again</button>
                  </div>
                )}
              </div>
            </div>
            <div className="ad-modal-footer">
              <button className="ad-modal-btn cancel" onClick={() => { setBiometricModal(null); setBiometricStep('idle'); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Document Viewer ═══ */}
      {docViewer && (
        <div className="ad-modal-overlay doc-overlay" onClick={() => setDocViewer(null)}>
          <div className="doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doc-viewer-header">
              <h3><FaFilePdf /> Document Preview</h3>
              <button onClick={() => setDocViewer(null)}><FaTimes /></button>
            </div>
            <div className="doc-viewer-body">
              <iframe src={docViewer} title="Document Preview" className="doc-viewer-iframe" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Authority Quick Action Modals ═══ */}
      {quickActionModal && (
        <div className="ad-modal-overlay" onClick={() => setQuickActionModal(null)}>
          <div className={`ad-modal qa-modal qa-modal-${quickActionModal.type}`} onClick={(e) => e.stopPropagation()}>
            {/* ── Freeze Property ── */}
            {quickActionModal.type === 'freeze' && (
              <>
                <div className="ad-modal-header freeze">
                  <div className="ad-modal-icon-wrap freeze"><FaSnowflake /></div>
                  <div>
                    <h3>Freeze Property</h3>
                    <p>Halt all transactions on this property</p>
                  </div>
                  <button className="ad-modal-close" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}><FaTimes /></button>
                </div>
                <div className="ad-modal-body">
                  <div className="qa-target-card">
                    <span className="qa-target-label">Target Property</span>
                    <span className="qa-target-value">{quickActionModal.title || 'Property'}</span>
                    <span className="qa-target-id">{quickActionModal.propertyId}</span>
                  </div>
                  <div className="qa-warning-notice">
                    <FaExclamationTriangle />
                    <div>
                      <strong>Warning</strong>
                      <p>Freezing will cancel all pending transfers and prevent any transactions until unfrozen.</p>
                    </div>
                  </div>
                  <label className="ad-modal-label">Reason for Freezing <span>(min 10 characters)</span></label>
                  <textarea className="ad-modal-textarea" placeholder="Provide detailed justification for freezing this property..." value={qaReason} onChange={(e) => setQaReason(e.target.value)} rows={4} disabled={qaBiometricStep === 'verified'} />

                  {/* Biometric Verification */}
                  <div className="qa-biometric-zone">
                    {qaBiometricStep === 'idle' && (
                      <div className="qa-bio-idle">
                        <div className="qa-bio-icons">
                          <div className="qa-bio-icon-card"><FaFingerprint /></div>
                          <span className="qa-bio-plus">+</span>
                          <div className="qa-bio-icon-card face">👤</div>
                        </div>
                        <p>Biometric verification required to freeze property</p>
                        <button className="qa-bio-start-btn" onClick={startQaBiometricScan} disabled={qaReason.trim().length < 10}>
                          <FaFingerprint /> Verify Identity to Proceed
                        </button>
                      </div>
                    )}
                    {qaBiometricStep === 'scanning' && (
                      <div className="qa-bio-scanning">
                        <div className="bio-scan-animation"><div className="bio-scan-ring" /><FaFingerprint className="bio-scan-fp" /></div>
                        <p>Scanning face & fingerprint...</p>
                        <div className="bio-scan-progress"><div className="bio-scan-progress-bar" /></div>
                      </div>
                    )}
                    {qaBiometricStep === 'verified' && (
                      <div className="qa-bio-verified">
                        <FaCheckCircle className="qa-bio-check" />
                        <span>Identity verified — <strong>{admin?.name}</strong> ({admin?.employeeId})</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-modal-btn cancel" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}>Cancel</button>
                  <button className="ad-modal-btn freeze" onClick={handleFreezeProperty} disabled={qaLoading || qaBiometricStep !== 'verified'}>
                    {qaLoading ? 'Freezing...' : '🧊 Confirm Freeze'}
                  </button>
                </div>
              </>
            )}

            {/* ── Audit Trail ── */}
            {quickActionModal.type === 'audit' && (
              <>
                <div className="ad-modal-header audit">
                  <div className="ad-modal-icon-wrap audit"><FaHistory /></div>
                  <div>
                    <h3>Audit Trail</h3>
                    <p>Complete activity history for this property</p>
                  </div>
                  <button className="ad-modal-close" onClick={() => setQuickActionModal(null)}><FaTimes /></button>
                </div>
                <div className="ad-modal-body">
                  <div className="qa-target-card">
                    <span className="qa-target-label">Property</span>
                    <span className="qa-target-value">{quickActionModal.title || 'Property'}</span>
                  </div>
                  {!auditTrailData ? (
                    <div className="qa-loading"><div className="admin-dash-spinner" /><p>Loading audit trail...</p></div>
                  ) : (
                    <div className="qa-audit-timeline">
                      {auditTrailData.trail?.length === 0 ? (
                        <div className="qa-empty"><FaInfoCircle /> No audit events found</div>
                      ) : auditTrailData.trail?.map((event, i) => (
                        <div key={i} className={`qa-audit-event qa-audit-${event.type}`}>
                          <div className="qa-audit-dot" />
                          <div className="qa-audit-content">
                            <div className="qa-audit-header">
                              <span className={`qa-audit-type-badge ${event.type}`}>{event.type?.replace('_', ' ')}</span>
                              <span className="qa-audit-date"><FaClock /> {fmtDateTime(event.date)}</span>
                            </div>
                            <p className="qa-audit-action">{event.action}</p>
                            {event.performedBy && <span className="qa-audit-by"><FaUser /> {event.performedBy}</span>}
                            {event.details && <span className="qa-audit-details">{event.details}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-modal-btn cancel" onClick={() => setQuickActionModal(null)}>Close</button>
                  <button className="ad-modal-btn primary" onClick={() => handleGetAuditTrail(quickActionModal.propertyId)}><FaSyncAlt /> Refresh</button>
                </div>
              </>
            )}

            {/* ── Resolve Dispute ── */}
            {quickActionModal.type === 'dispute' && (
              <>
                <div className="ad-modal-header dispute">
                  <div className="ad-modal-icon-wrap dispute"><FaGavel /></div>
                  <div>
                    <h3>Resolve Dispute</h3>
                    <p>Settle an ongoing property dispute</p>
                  </div>
                  <button className="ad-modal-close" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}><FaTimes /></button>
                </div>
                <div className="ad-modal-body">
                  <div className="qa-target-card">
                    <span className="qa-target-label">Disputed Property</span>
                    <span className="qa-target-value">{quickActionModal.title || 'Property'}</span>
                  </div>
                  <label className="ad-modal-label">Verification Outcome After Resolution</label>
                  <select className="ad-filter-select qa-select" value={disputeNewStatus} onChange={(e) => setDisputeNewStatus(e.target.value)} disabled={qaBiometricStep === 'verified'}>
                    <option value="active">Restore as Active & Verified</option>
                    <option value="pending">Restore as Pending Review</option>
                  </select>
                  <label className="ad-modal-label" style={{marginTop:16}}>Resolution Details <span>(min 10 characters)</span></label>
                  <textarea className="ad-modal-textarea" placeholder="Describe the resolution in detail..." value={disputeResolution} onChange={(e) => setDisputeResolution(e.target.value)} rows={5} disabled={qaBiometricStep === 'verified'} />

                  {/* Biometric Verification */}
                  <div className="qa-biometric-zone">
                    {qaBiometricStep === 'idle' && (
                      <div className="qa-bio-idle">
                        <div className="qa-bio-icons">
                          <div className="qa-bio-icon-card"><FaFingerprint /></div>
                          <span className="qa-bio-plus">+</span>
                          <div className="qa-bio-icon-card face">👤</div>
                        </div>
                        <p>Biometric verification required to resolve dispute</p>
                        <button className="qa-bio-start-btn" onClick={startQaBiometricScan} disabled={disputeResolution.trim().length < 10}>
                          <FaFingerprint /> Verify Identity to Proceed
                        </button>
                      </div>
                    )}
                    {qaBiometricStep === 'scanning' && (
                      <div className="qa-bio-scanning">
                        <div className="bio-scan-animation"><div className="bio-scan-ring" /><FaFingerprint className="bio-scan-fp" /></div>
                        <p>Scanning face & fingerprint...</p>
                        <div className="bio-scan-progress"><div className="bio-scan-progress-bar" /></div>
                      </div>
                    )}
                    {qaBiometricStep === 'verified' && (
                      <div className="qa-bio-verified">
                        <FaCheckCircle className="qa-bio-check" />
                        <span>Identity verified — <strong>{admin?.name}</strong> ({admin?.employeeId})</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-modal-btn cancel" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}>Cancel</button>
                  <button className="ad-modal-btn dispute" onClick={handleResolveDispute} disabled={qaLoading || qaBiometricStep !== 'verified'}>
                    {qaLoading ? 'Resolving...' : '⚖️ Confirm Resolution'}
                  </button>
                </div>
              </>
            )}

            {/* ── Generate Report ── */}
            {quickActionModal.type === 'report' && (
              <>
                <div className="ad-modal-header report">
                  <div className="ad-modal-icon-wrap report"><FaFileContract /></div>
                  <div>
                    <h3>Property Report</h3>
                    <p>Comprehensive official property report</p>
                  </div>
                  <button className="ad-modal-close" onClick={() => setQuickActionModal(null)}><FaTimes /></button>
                </div>
                <div className="ad-modal-body">
                  {!reportData ? (
                    <div className="qa-loading"><div className="admin-dash-spinner" /><p>Generating report...</p></div>
                  ) : (
                    <div className="qa-report-view">
                      <div className="qa-report-header-banner">
                        <FaShieldAlt />
                        <div>
                          <h4>Official Property Report</h4>
                          <span>Smart Bhoomi National Land Registry</span>
                        </div>
                        <span className="qa-report-date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className="qa-report-sections">
                        <div className="qa-report-section">
                          <h5><FaBuilding /> Property Details</h5>
                          <div className="qa-report-grid">
                            <div className="qa-report-item"><span>Property ID</span><strong>{reportData.property?.propertyId}</strong></div>
                            <div className="qa-report-item"><span>Title</span><strong>{reportData.property?.title}</strong></div>
                            <div className="qa-report-item"><span>Type</span><strong>{reportData.property?.propertyType}</strong></div>
                            <div className="qa-report-item"><span>Area</span><strong>{reportData.property?.area?.value || 'N/A'} {reportData.property?.area?.unit || ''}</strong></div>
                            <div className="qa-report-item"><span>Status</span><strong>{reportData.property?.status}</strong></div>
                            <div className="qa-report-item"><span>Survey No.</span><strong>{reportData.property?.surveyNumber || 'N/A'}</strong></div>
                            <div className="qa-report-item full"><span>Address</span><strong>{[reportData.property?.address?.street, reportData.property?.address?.city, reportData.property?.address?.state, reportData.property?.address?.zipCode].filter(Boolean).join(', ') || 'N/A'}</strong></div>
                          </div>
                        </div>
                        <div className="qa-report-section">
                          <h5><FaUser /> Owner Information</h5>
                          <div className="qa-report-grid">
                            <div className="qa-report-item"><span>Name</span><strong>{reportData.owner?.name}</strong></div>
                            <div className="qa-report-item"><span>Email</span><strong>{reportData.owner?.email}</strong></div>
                            <div className="qa-report-item"><span>Gov ID</span><strong>{reportData.owner?.governmentId || 'N/A'}</strong></div>
                            <div className="qa-report-item"><span>Phone</span><strong>{reportData.owner?.phone || 'N/A'}</strong></div>
                          </div>
                        </div>
                        <div className="qa-report-section">
                          <h5><FaShieldAlt /> Verification</h5>
                          <div className="qa-report-grid">
                            <div className="qa-report-item"><span>Status</span><strong>{reportData.verification?.status}</strong></div>
                            <div className="qa-report-item"><span>Score</span><strong>{reportData.verification?.checkScore}%</strong></div>
                          </div>
                        </div>
                        <div className="qa-report-section">
                          <h5><FaChartBar /> Valuation</h5>
                          <div className="qa-report-grid">
                            <div className="qa-report-item"><span>Current Value</span><strong>{fmtCurrency(reportData.valuation?.currentValue)}</strong></div>
                            <div className="qa-report-item"><span>Govt Value</span><strong>{fmtCurrency(reportData.valuation?.governmentValue)}</strong></div>
                          </div>
                        </div>
                        {reportData.transferHistory?.length > 0 && (
                          <div className="qa-report-section">
                            <h5><FaExchangeAlt /> Transfer History ({reportData.transferHistory.length})</h5>
                            {reportData.transferHistory.map((t, i) => (
                              <div key={i} className="qa-report-transfer">
                                <span>{t.from} → {t.to}</span>
                                <span>{fmtCurrency(t.price)} • {fmtDate(t.date)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="qa-report-footer-info">
                        <FaInfoCircle /> Generated by <strong>{reportData.generatedBy?.name}</strong> ({reportData.generatedBy?.employeeId}) on {fmtDateTime(reportData.generatedAt)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-modal-btn cancel" onClick={() => setQuickActionModal(null)}>Close</button>
                  {reportData && (
                    <>
                      <button className="ad-modal-btn secondary" onClick={handleCopyReport}><FaCopy /> Copy JSON</button>
                      <button className="ad-modal-btn primary" onClick={handlePrintReport}><FaPrint /> Print Report</button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Flag Suspicious ── */}
            {quickActionModal.type === 'flag' && (
              <>
                <div className="ad-modal-header flag">
                  <div className="ad-modal-icon-wrap flag"><FaFlag /></div>
                  <div>
                    <h3>Flag as Suspicious</h3>
                    <p>Mark property for investigation</p>
                  </div>
                  <button className="ad-modal-close" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}><FaTimes /></button>
                </div>
                <div className="ad-modal-body">
                  <div className="qa-target-card">
                    <span className="qa-target-label">Target Property</span>
                    <span className="qa-target-value">{quickActionModal.title || 'Property'}</span>
                  </div>
                  <label className="ad-modal-label">Severity Level</label>
                  <div className="qa-severity-group">
                    {['low', 'medium', 'high'].map(s => (
                      <button key={s} className={`qa-severity-btn ${s} ${qaSeverity === s ? 'active' : ''}`} onClick={() => setQaSeverity(s)} disabled={qaBiometricStep === 'verified'}>
                        {s === 'high' ? '🔴' : s === 'medium' ? '🟡' : '🟢'} {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <label className="ad-modal-label" style={{marginTop:16}}>Reason for Flagging <span>(required)</span></label>
                  <textarea className="ad-modal-textarea" placeholder="Describe why this property is suspicious..." value={qaReason} onChange={(e) => setQaReason(e.target.value)} rows={4} disabled={qaBiometricStep === 'verified'} />

                  {/* Biometric Verification */}
                  <div className="qa-biometric-zone">
                    {qaBiometricStep === 'idle' && (
                      <div className="qa-bio-idle">
                        <div className="qa-bio-icons">
                          <div className="qa-bio-icon-card"><FaFingerprint /></div>
                          <span className="qa-bio-plus">+</span>
                          <div className="qa-bio-icon-card face">👤</div>
                        </div>
                        <p>Biometric verification required to flag property</p>
                        <button className="qa-bio-start-btn" onClick={startQaBiometricScan} disabled={qaReason.trim().length < 5}>
                          <FaFingerprint /> Verify Identity to Proceed
                        </button>
                      </div>
                    )}
                    {qaBiometricStep === 'scanning' && (
                      <div className="qa-bio-scanning">
                        <div className="bio-scan-animation"><div className="bio-scan-ring" /><FaFingerprint className="bio-scan-fp" /></div>
                        <p>Scanning face & fingerprint...</p>
                        <div className="bio-scan-progress"><div className="bio-scan-progress-bar" /></div>
                      </div>
                    )}
                    {qaBiometricStep === 'verified' && (
                      <div className="qa-bio-verified">
                        <FaCheckCircle className="qa-bio-check" />
                        <span>Identity verified — <strong>{admin?.name}</strong> ({admin?.employeeId})</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-modal-btn cancel" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}>Cancel</button>
                  <button className="ad-modal-btn flag" onClick={handleFlagSuspicious} disabled={qaLoading || qaBiometricStep !== 'verified'}>
                    {qaLoading ? 'Flagging...' : '🚩 Confirm Flag'}
                  </button>
                </div>
              </>
            )}

            {/* ── Verify Owner ── */}
            {quickActionModal.type === 'verify' && (
              <>
                <div className="ad-modal-header verify">
                  <div className="ad-modal-icon-wrap verify"><FaUserCheck /></div>
                  <div>
                    <h3>Verify Owner Identity</h3>
                    <p>Update owner KYC verification status</p>
                  </div>
                  <button className="ad-modal-close" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}><FaTimes /></button>
                </div>
                <div className="ad-modal-body">
                  {selectedProperty?.owner ? (
                    <>
                      <div className="qa-owner-card">
                        <div className="qa-owner-avatar">{(selectedProperty.owner.name || 'U').charAt(0).toUpperCase()}</div>
                        <div>
                          <h4>{selectedProperty.owner.name}</h4>
                          <span>{selectedProperty.owner.email}</span>
                          <span>{selectedProperty.owner.governmentId || 'No Gov ID'}</span>
                        </div>
                      </div>
                      <label className="ad-modal-label">KYC Verification Status</label>
                      <div className="qa-kyc-toggles">
                        {[
                          { key: 'aadhaarVerified', label: 'Aadhaar Card', icon: <FaIdCard /> },
                          { key: 'panVerified', label: 'PAN Card', icon: <FaFileAlt /> },
                          { key: 'faceEnrolled', label: 'Face ID', icon: <FaUser /> },
                          { key: 'fingerprintEnrolled', label: 'Fingerprint', icon: <FaFingerprint /> }
                        ].map(item => (
                          <div key={item.key} className={`qa-kyc-toggle ${ownerKycUpdate[item.key] ? 'active' : ''}`}
                            onClick={() => { if (qaBiometricStep !== 'verified') setOwnerKycUpdate(prev => ({ ...prev, [item.key]: !prev[item.key] })); }}>
                            <div className="qa-kyc-toggle-icon">{item.icon}</div>
                            <span>{item.label}</span>
                            <div className="qa-kyc-toggle-switch">
                              <div className={`qa-kyc-switch-track ${ownerKycUpdate[item.key] ? 'on' : ''}`}>
                                <div className="qa-kyc-switch-thumb" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Biometric Verification */}
                      <div className="qa-biometric-zone">
                        {qaBiometricStep === 'idle' && (
                          <div className="qa-bio-idle">
                            <div className="qa-bio-icons">
                              <div className="qa-bio-icon-card"><FaFingerprint /></div>
                              <span className="qa-bio-plus">+</span>
                              <div className="qa-bio-icon-card face">👤</div>
                            </div>
                            <p>Biometric verification required to update owner KYC</p>
                            <button className="qa-bio-start-btn" onClick={startQaBiometricScan}>
                              <FaFingerprint /> Verify Identity to Proceed
                            </button>
                          </div>
                        )}
                        {qaBiometricStep === 'scanning' && (
                          <div className="qa-bio-scanning">
                            <div className="bio-scan-animation"><div className="bio-scan-ring" /><FaFingerprint className="bio-scan-fp" /></div>
                            <p>Scanning face & fingerprint...</p>
                            <div className="bio-scan-progress"><div className="bio-scan-progress-bar" /></div>
                          </div>
                        )}
                        {qaBiometricStep === 'verified' && (
                          <div className="qa-bio-verified">
                            <FaCheckCircle className="qa-bio-check" />
                            <span>Identity verified — <strong>{admin?.name}</strong> ({admin?.employeeId})</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="qa-empty"><FaInfoCircle /> Open a property detail first to verify its owner</div>
                  )}
                </div>
                <div className="ad-modal-footer">
                  <button className="ad-modal-btn cancel" onClick={() => { setQuickActionModal(null); setQaBiometricStep('idle'); }}>Cancel</button>
                  <button className="ad-modal-btn verify" onClick={handleVerifyOwner} disabled={qaLoading || !selectedProperty?.owner || qaBiometricStep !== 'verified'}>
                    {qaLoading ? 'Updating...' : '✅ Confirm Verification'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Create Admin Modal ═══ */}
      {showCreateAdmin && (
        <div className="ad-modal-overlay" onClick={() => setShowCreateAdmin(false)}>
          <div className="ad-modal create-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header create-admin">
              <div className="ad-modal-icon-wrap create-admin"><FaUserPlus /></div>
              <div>
                <h3>Create New Admin Account</h3>
                <p>Super Admin privilege required • Clearance Level 5</p>
              </div>
              <button className="ad-modal-close" onClick={() => setShowCreateAdmin(false)}><FaTimes /></button>
            </div>
            <div className="ad-modal-body">
              {/* Guide Section */}
              <div className="ca-guide">
                <div className="ca-guide-header"><FaInfoCircle /> <strong>Admin Creation Guide</strong></div>
                <div className="ca-guide-steps">
                  <div className="ca-guide-step"><span className="ca-step-num">1</span><div><strong>Government Email</strong><p>Must use .gov.in or .nic.in domain</p></div></div>
                  <div className="ca-guide-step"><span className="ca-step-num">2</span><div><strong>Strong Password</strong><p>Minimum 12 characters with complexity</p></div></div>
                  <div className="ca-guide-step"><span className="ca-step-num">3</span><div><strong>Employee ID</strong><p>Unique government employee identification</p></div></div>
                  <div className="ca-guide-step"><span className="ca-step-num">4</span><div><strong>Clearance Level</strong><p>1 (lowest) to 5 (highest access)</p></div></div>
                </div>
              </div>

              {/* Form */}
              <form className="ca-form" onSubmit={handleCreateAdmin}>
                <div className="ca-form-grid">
                  <div className="ca-form-group">
                    <label>Full Name <span>*</span></label>
                    <input type="text" placeholder="Dr. Rajesh Kumar" value={newAdminForm.name} onChange={(e) => setNewAdminForm(p => ({...p, name: e.target.value}))} required />
                  </div>
                  <div className="ca-form-group">
                    <label>Government Email <span>*</span></label>
                    <input type="email" placeholder="officer@revenue.gov.in" value={newAdminForm.email} onChange={(e) => setNewAdminForm(p => ({...p, email: e.target.value}))} required />
                  </div>
                  <div className="ca-form-group">
                    <label>Password <span>* (min 12 chars)</span></label>
                    <input type="password" placeholder="••••••••••••" value={newAdminForm.password} onChange={(e) => setNewAdminForm(p => ({...p, password: e.target.value}))} required minLength={12} />
                  </div>
                  <div className="ca-form-group">
                    <label>Employee ID <span>*</span></label>
                    <input type="text" placeholder="GOV-2024-001" value={newAdminForm.employeeId} onChange={(e) => setNewAdminForm(p => ({...p, employeeId: e.target.value}))} required />
                  </div>
                  <div className="ca-form-group">
                    <label>Rank <span>*</span></label>
                    <select value={newAdminForm.rank} onChange={(e) => setNewAdminForm(p => ({...p, rank: e.target.value}))} required>
                      <option value="">Select Rank</option>
                      {['Secretary','Joint Secretary','Director','Deputy Director','Under Secretary','Section Officer','Sub-Registrar','Tehsildar','District Collector','Commissioner','Superintendent'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="ca-form-group">
                    <label>Department <span>*</span></label>
                    <select value={newAdminForm.department} onChange={(e) => setNewAdminForm(p => ({...p, department: e.target.value}))} required>
                      <option value="">Select Department</option>
                      {['Revenue & Land Records','Registration & Stamps','Survey & Settlement','Urban Development','Rural Development','Housing & Urban Affairs','Land Acquisition','National Informatics Centre','Ministry of Electronics & IT'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="ca-form-group">
                    <label>Clearance Level</label>
                    <select value={newAdminForm.clearanceLevel} onChange={(e) => setNewAdminForm(p => ({...p, clearanceLevel: e.target.value}))}>
                      {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l} {l === 5 ? '(Highest)' : l === 1 ? '(Lowest)' : ''}</option>)}
                    </select>
                  </div>
                  <div className="ca-form-group">
                    <label>Jurisdiction Level</label>
                    <select value={newAdminForm.jurisdictionLevel} onChange={(e) => setNewAdminForm(p => ({...p, jurisdictionLevel: e.target.value}))}>
                      {['national','state','district','tehsil'].map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="ca-form-group">
                    <label>State</label>
                    <input type="text" placeholder="Maharashtra" value={newAdminForm.jurisdictionState} onChange={(e) => setNewAdminForm(p => ({...p, jurisdictionState: e.target.value}))} />
                  </div>
                  <div className="ca-form-group">
                    <label>District</label>
                    <input type="text" placeholder="Pune" value={newAdminForm.jurisdictionDistrict} onChange={(e) => setNewAdminForm(p => ({...p, jurisdictionDistrict: e.target.value}))} />
                  </div>
                </div>
                <button type="submit" className="ca-submit-btn" disabled={createAdminLoading}>
                  {createAdminLoading ? <><FaSyncAlt className="spin" /> Creating Account...</> : <><FaUserPlus /> Create Admin Account</>}
                </button>
              </form>

              {/* Existing Admins */}
              {adminsList.length > 0 && (
                <div className="ca-admins-list">
                  <h4><FaUsers /> Existing Admin Accounts ({adminsList.length})</h4>
                  <div className="ca-admins-grid">
                    {adminsList.map((a, i) => (
                      <div key={i} className="ca-admin-card">
                        <div className="ca-admin-avatar">{(a.name || 'A').charAt(0).toUpperCase()}</div>
                        <div className="ca-admin-info">
                          <strong>{a.name}</strong>
                          <span>{a.rank} • {a.department}</span>
                          <span className="ca-admin-email">{a.email}</span>
                        </div>
                        <div className="ca-admin-clearance">L{a.clearanceLevel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
