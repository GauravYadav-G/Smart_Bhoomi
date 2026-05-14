import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertyAPI } from '../services/api';
import { 
  FaSearch, 
  FaMapMarkerAlt, 
  FaHome,
  FaFilter,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaEye,
  FaChartArea,
  FaIdCard,
  FaShieldAlt
} from 'react-icons/fa';
import './PropertyList.css';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: '',
    city: '',
    state: '',
    verificationStatus: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0
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

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await propertyAPI.getAllProperties(filters);
      const fetchedProperties = response?.data?.properties || [];
      setProperties(fetchedProperties);

      setStats({
        total: fetchedProperties.length,
        verified: fetchedProperties.filter(p => p?.verification?.status === 'verified').length,
        pending: fetchedProperties.filter(p => p?.verification?.status === 'pending').length
      });
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({
      propertyType: '',
      city: '',
      state: '',
      verificationStatus: ''
    });
    setSearchTerm('');
  };

  const getStatusColor = (status) => {
    const colors = {
      verified: 'success',
      pending: 'warning',
      under_review: 'info',
      rejected: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      verified: <FaCheckCircle />,
      pending: <FaClock />,
      under_review: <FaClock />,
      rejected: <FaTimes />
    };
    return icons[status] || <FaClock />;
  };

  // Filter properties by search term (defensive access)
  const filteredProperties = properties.filter(property => {
    const title = property?.propertyDetails?.title || '';
    const pid = property?.propertyId || '';
    const city = property?.propertyDetails?.address?.city || '';
    const q = searchTerm.toLowerCase();
    return (
      title.toLowerCase().includes(q) ||
      pid.toLowerCase().includes(q) ||
      city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="property-list-page">
      {/* Header Section */}
      <div className={`page-hero${isScrolled ? ' scrolled' : ''}`} role="banner" aria-label="Property Registry">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Property Registry</h1>
            <p>Browse and manage registered properties</p>
          </div>
          <Link to="/register-property" className="btn-register-property" aria-label="Register new property">
            <FaHome aria-hidden="true" /> Register New Property
          </Link>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar" role="group" aria-label="Property statistics">
          <div className="stat-card" aria-label={`Total properties: ${stats.total}`}>
            <div className="stat-icon total" aria-hidden="true">
              <FaHome />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Properties</span>
            </div>
          </div>

          <div className="stat-card" aria-label={`Verified properties: ${stats.verified}`}>
            <div className="stat-icon verified" aria-hidden="true">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.verified}</span>
              <span className="stat-label">Verified</span>
            </div>
          </div>

          <div className="stat-card" aria-label={`Pending properties: ${stats.pending}`}>
            <div className="stat-icon pending" aria-hidden="true">
              <FaClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="controls-section" role="region" aria-label="Search and filters">
        <div className="search-bar">
          <FaSearch className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by property name, ID, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search properties"
          />
        </div>

        <button 
          className="btn-filter"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="filters-panel"
        >
          <FaFilter aria-hidden="true" /> Filters
          {Object.values(filters).some(v => v) && <span className="filter-badge" aria-hidden="true"></span>}
        </button>

        {Object.values(filters).some(v => v) && (
          <button className="btn-clear" onClick={clearFilters}>
            <FaTimes aria-hidden="true" /> Clear All
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div id="filters-panel" className="filters-panel" role="region" aria-label="Filter properties">
          <div className="filter-grid">
            <div className="filter-item">
              <label htmlFor="propertyType">Property Type</label>
              <select 
                id="propertyType"
                name="propertyType" 
                value={filters.propertyType} 
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All Types</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="agricultural">Agricultural</option>
                <option value="industrial">Industrial</option>
                <option value="land">Land</option>
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                name="city"
                placeholder="Enter city name"
                value={filters.city}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </div>

            <div className="filter-item">
              <label htmlFor="state">State</label>
              <input
                id="state"
                type="text"
                name="state"
                placeholder="Enter state name"
                value={filters.state}
                onChange={handleFilterChange}
                className="filter-input"
              />
            </div>

            <div className="filter-item">
              <label htmlFor="verificationStatus">Status</label>
              <select 
                id="verificationStatus"
                name="verificationStatus" 
                value={filters.verificationStatus} 
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="results-header">
        <p className="results-count" aria-live="polite">
          Showing <strong>{filteredProperties.length}</strong> {filteredProperties.length === 1 ? 'property' : 'properties'}
        </p>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading properties...</p>
        </div>
      ) : filteredProperties.length > 0 ? (
        <div className="properties-grid">
          {filteredProperties.map((property) => {
            const type = property?.propertyDetails?.propertyType || 'N/A';
            const title = property?.propertyDetails?.title || 'Untitled Property';
            const city = property?.propertyDetails?.address?.city || 'N/A';
            const state = property?.propertyDetails?.address?.state || 'N/A';
            const areaValue = property?.propertyDetails?.area?.value ?? '-';
            const areaUnit = property?.propertyDetails?.area?.unit ?? '';
            const pid = property?.propertyId || '-';
            const status = property?.verification?.status || 'pending';
            const statusClass = getStatusColor(status);

            return (
              <div key={property?._id || pid} className="property-card">
                <div className="card-header">
                  <div className="property-badge" title={type}>
                    <FaHome aria-hidden="true" />
                    <span>{type}</span>
                  </div>
                  <span className={`status-badge ${statusClass}`} title={status.replace('_', ' ')}>
                    {getStatusIcon(status)} {status.replace('_', ' ')}
                  </span>
                </div>

                <div className="card-body">
                  <h3 className="property-title">{title}</h3>

                  <div className="property-location">
                    <FaMapMarkerAlt aria-hidden="true" />
                    <span>{city}, {state}</span>
                  </div>

                  <div className="property-info">
                    <div className="info-item">
                      <FaIdCard className="info-icon" aria-hidden="true" />
                      <div>
                        <span className="info-label">Property ID</span>
                        <span className="info-value">{pid}</span>
                      </div>
                    </div>

                    <div className="info-item">
                      <FaChartArea className="info-icon" aria-hidden="true" />
                      <div>
                        <span className="info-label">Area</span>
                        <span className="info-value">{areaValue} {areaUnit}</span>
                      </div>
                    </div>
                  </div>

                  {property?.blockchainHash && (
                    <div className="blockchain-info" title="Government secured record">
                      <FaShieldAlt className="blockchain-icon" aria-hidden="true" />
                      <div className="blockchain-text">
                        <span className="blockchain-label">Secured ✓</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <Link 
                    to={`/properties/${pid}`} 
                    className="btn-view-details"
                    aria-label={`View details for property ${pid}`}
                  >
                    <FaEye aria-hidden="true" /> View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" role="status" aria-live="polite">
          <div className="empty-icon" aria-hidden="true">
            <FaHome />
          </div>
          <h3>No Properties Found</h3>
          <p>
            {searchTerm || Object.values(filters).some(v => v)
              ? 'Try adjusting your search or filters'
              : 'Start by registering your first property'}
          </p>
          <Link to="/register-property" className="btn-register-empty" aria-label="Register property">
            <FaHome aria-hidden="true" /> Register Property
          </Link>
        </div>
      )}
    </div>
  );
};

export default PropertyList;
