import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { Tooltip } from 'react-tooltip';
import {
  FaMapMarkerAlt, FaDrawPolygon, FaTimes, FaSave,
  FaSearchPlus, FaSearchMinus, FaExpand, FaBuilding,
  FaLandmark, FaShieldAlt, FaExclamationTriangle, FaRedo,
  FaCheckCircle, FaClock, FaTimesCircle, FaEye, FaRulerCombined,
  FaUser, FaChevronRight, FaLayerGroup
} from 'react-icons/fa';
import './InteractiveIndiaMap.css';

// Reliable India TopoJSON — using a well-known CDN source
const INDIA_TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

// Inline India GeoJSON with all states/UTs for fallback
const INDIA_STATES_GEOJSON_URL = 'https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson';

// State name mapping for heatmap overlay
const STATE_COLORS = {
  high: '#DC2626',
  medium: '#F59E0B',
  low: '#138808',
  none: '#CBD5E1'
};

const PIN_TYPES = [
  { value: 'police_station', label: 'Police Station', icon: <FaShieldAlt />, color: '#3B82F6' },
  { value: 'admin_building', label: 'Admin Building', icon: <FaLandmark />, color: '#8B5CF6' },
  { value: 'government', label: 'Government Office', icon: <FaBuilding />, color: '#138808' },
  { value: 'public_building', label: 'Public Building', icon: <FaBuilding />, color: '#F59E0B' },
  { value: 'court', label: 'Court/Tribunal', icon: <FaLandmark />, color: '#DC2626' },
  { value: 'registry_office', label: 'Sub-Registrar Office', icon: <FaBuilding />, color: '#0B3D91' },
];

const InteractiveIndiaMap = ({ heatmapData = {}, pinnedProperties = [], onPinProperty, propertyMarkers = [], onViewProperty }) => {
  const [tooltipContent, setTooltipContent] = useState('');
  const [position, setPosition] = useState({ coordinates: [82, 22], zoom: 1 });
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [pinForm, setPinForm] = useState({ title: '', type: 'police_station', state: '', description: '' });
  const [clickedCoords, setClickedCoords] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [geoUrl, setGeoUrl] = useState(INDIA_STATES_GEOJSON_URL);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showPropertyList, setShowPropertyList] = useState(false);
  const [markerFilter, setMarkerFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'rejected'

  // Filter properties that have valid coordinates
  const geoProperties = useMemo(() => {
    return propertyMarkers.filter(p =>
      p.propertyDetails?.coordinates?.latitude && p.propertyDetails?.coordinates?.longitude
    );
  }, [propertyMarkers]);

  // Filtered by status
  const filteredGeoProperties = useMemo(() => {
    if (markerFilter === 'all') return geoProperties;
    return geoProperties.filter(p => {
      const vs = p.verification?.status || 'pending';
      if (markerFilter === 'verified') return vs === 'verified';
      if (markerFilter === 'pending') return vs === 'pending' || vs === 'needs_review' || vs === 'auto_verifying';
      if (markerFilter === 'rejected') return vs === 'rejected';
      return true;
    });
  }, [geoProperties, markerFilter]);

  // Marker color based on verification status
  const getMarkerColor = (property) => {
    const vs = property.verification?.status || 'pending';
    if (vs === 'verified') return '#138808';
    if (vs === 'rejected') return '#DC2626';
    if (vs === 'needs_review') return '#F59E0B';
    return '#FF9933'; // pending / auto_verifying
  };

  const getStatusLabel = (property) => {
    const vs = property.verification?.status || 'pending';
    return vs.charAt(0).toUpperCase() + vs.slice(1).replace(/_/g, ' ');
  };

  // Heatmap intensity by state
  const getStateColor = useCallback((stateName) => {
    if (!stateName) return STATE_COLORS.none;
    const properties = heatmapData?.properties || [];
    const transfers = heatmapData?.transfers || [];
    const sLower = stateName.toLowerCase().trim();

    // Find property data for this state (fuzzy match)
    const pData = properties.find(p =>
      p._id && sLower && (
        p._id.toLowerCase().trim() === sLower ||
        p._id.toLowerCase().trim().includes(sLower) ||
        sLower.includes(p._id.toLowerCase().trim()) ||
        p._id.toLowerCase().substring(0, 5) === sLower.substring(0, 5)
      )
    );
    const tData = transfers.find(t =>
      t._id && sLower && (
        t._id.toLowerCase().trim() === sLower ||
        t._id.toLowerCase().trim().includes(sLower) ||
        sLower.includes(t._id.toLowerCase().trim()) ||
        t._id.toLowerCase().substring(0, 5) === sLower.substring(0, 5)
      )
    );

    const propCount = pData?.count || 0;
    const transferCount = tData?.totalTransfers || 0;
    const total = propCount + transferCount;

    if (total > 10) return STATE_COLORS.high;
    if (total > 3) return STATE_COLORS.medium;
    if (total > 0) return STATE_COLORS.low;
    return STATE_COLORS.none;
  }, [heatmapData]);

  const getStateStats = useCallback((stateName) => {
    if (!stateName) return { transfers: 0, completed: 0, pending: 0, value: 0, properties: 0, totalArea: 0, residential: 0, commercial: 0, agricultural: 0, industrial: 0, land: 0, verified: 0, pendingProps: 0, totalPropValue: 0 };
    const transfers = heatmapData?.transfers || [];
    const properties = heatmapData?.properties || [];
    const sLower = stateName.toLowerCase().trim();

    // Better fuzzy matching: exact → contains → prefix
    const findMatch = (arr) => arr.find(item =>
      item._id && sLower && (
        item._id.toLowerCase().trim() === sLower ||
        item._id.toLowerCase().trim().includes(sLower) ||
        sLower.includes(item._id.toLowerCase().trim()) ||
        item._id.toLowerCase().substring(0, 5) === sLower.substring(0, 5)
      )
    );

    const tData = findMatch(transfers);
    const pData = findMatch(properties);

    return {
      transfers: tData?.totalTransfers || 0,
      completed: tData?.completedTransfers || 0,
      pending: tData?.pendingCount || 0,
      value: tData?.totalValue || 0,
      properties: pData?.count || 0,
      totalArea: pData?.totalArea || 0,
      totalPropValue: pData?.totalValue || 0,
      residential: pData?.residential || 0,
      commercial: pData?.commercial || 0,
      agricultural: pData?.agricultural || 0,
      industrial: pData?.industrial || 0,
      land: pData?.land || 0,
      verified: pData?.verified || 0,
      pendingProps: pData?.pending || 0
    };
  }, [heatmapData]);

  const handleZoomIn = () => {
    setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }));
  };

  const handleZoomOut = () => {
    setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }));
  };

  const handleReset = () => {
    setPosition({ coordinates: [82, 22], zoom: 1 });
    setSelectedState(null);
  };

  const handleMoveEnd = (pos) => {
    setPosition(pos);
  };

  const handleGeographyClick = (geo) => {
    const name = geo.properties.ST_NM || geo.properties.NAME_1 || geo.properties.name || geo.properties.st_nm || 'Unknown';
    setSelectedState(name);
  };

  const handleMapClick = (e) => {
    if (!pinMode) return;
    setClickedCoords(position.coordinates);
  };

  const handlePinSubmit = () => {
    if (!pinForm.title || !pinForm.type) return;
    onPinProperty?.({
      title: pinForm.title,
      type: pinForm.type,
      coordinates: clickedCoords || position.coordinates,
      state: selectedState || pinForm.state,
      description: pinForm.description
    });
    setPinMode(false);
    setPinForm({ title: '', type: 'police_station', state: '', description: '' });
    setClickedCoords(null);
  };

  const handleDrawClick = (e) => {
    if (!drawMode) return;
    setDrawPoints(prev => [...prev, position.coordinates]);
  };

  const clearDraw = () => {
    setDrawPoints([]);
    setDrawMode(false);
  };

  const handleRetryMap = () => {
    setMapError(false);
    // Try fallback source
    if (geoUrl === INDIA_STATES_GEOJSON_URL) {
      setGeoUrl(INDIA_TOPO);
    } else {
      setGeoUrl(INDIA_STATES_GEOJSON_URL);
    }
  };

  if (mapError) {
    return (
      <div className="india-map-container">
        <div className="map-toolbar">
          <div className="map-toolbar-left">
            <h3 className="map-title">🇮🇳 National Land Registry — Geospatial View</h3>
          </div>
        </div>
        <div className="map-error-state">
          <FaExclamationTriangle />
          <h4>Map Data Unavailable</h4>
          <p>Unable to load geographic data. This may be due to network connectivity. Please retry or check your connection.</p>
          <button onClick={handleRetryMap}><FaRedo /> Retry Loading</button>
        </div>
      </div>
    );
  }

  return (
    <div className="india-map-container">
      {/* Toolbar */}
      <div className="map-toolbar">
        <div className="map-toolbar-left">
          <h3 className="map-title">🇮🇳 National Land Registry — Geospatial View</h3>
        </div>
        <div className="map-toolbar-right">
          <button
            className={`map-tool-btn ${pinMode ? 'active' : ''}`}
            onClick={() => { setPinMode(!pinMode); setDrawMode(false); }}
            title="Pin Government Property"
          >
            <FaMapMarkerAlt /> Pin
          </button>
          <button
            className={`map-tool-btn ${drawMode ? 'active' : ''}`}
            onClick={() => { setDrawMode(!drawMode); setPinMode(false); }}
            title="Draw Boundary"
          >
            <FaDrawPolygon /> Draw
          </button>
          <div className="map-tool-divider" />
          <button className="map-tool-btn" onClick={handleZoomIn} title="Zoom In"><FaSearchPlus /></button>
          <button className="map-tool-btn" onClick={handleZoomOut} title="Zoom Out"><FaSearchMinus /></button>
          <button className="map-tool-btn" onClick={handleReset} title="Reset View"><FaExpand /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <span className="legend-title">Registry Activity:</span>
        <div className="legend-items">
          <span className="legend-item"><span className="legend-dot" style={{ background: STATE_COLORS.high }} /> High (&gt;10)</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: STATE_COLORS.medium }} /> Medium (3-10)</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: STATE_COLORS.low }} /> Low (1-3)</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: STATE_COLORS.none }} /> None</span>
        </div>
      </div>

      {/* Map */}
      <div className="map-canvas" onClick={pinMode ? handleMapClick : drawMode ? handleDrawClick : undefined}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 1000, center: [82, 22] }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            maxZoom={8}
          >
            <Geographies
              geography={geoUrl}
              parseGeographies={(geos) => {
                // Filter for India if using world atlas
                if (geoUrl.includes('world-atlas')) {
                  return geos.filter(g => g.properties.name === 'India' || g.id === '356');
                }
                return geos;
              }}
            >
              {({ geographies, error }) => {
                if (error) {
                  setTimeout(() => setMapError(true), 100);
                  return null;
                }
                return geographies.map((geo) => {
                  const name = geo.properties.ST_NM || geo.properties.NAME_1 || geo.properties.name || geo.properties.st_nm || '';
                  const stats = getStateStats(name);
                  const fillColor = getStateColor(name);
                  const isSelected = selectedState === name;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isSelected ? '#0B3D91' : fillColor}
                      stroke="#94A3B8"
                      strokeWidth={isSelected ? 1.5 : 0.5}
                      onClick={() => handleGeographyClick(geo)}
                      onMouseEnter={() => {
                        const typesArr = [];
                        if (stats.residential) typesArr.push(`🏠 ${stats.residential}`);
                        if (stats.commercial) typesArr.push(`🏢 ${stats.commercial}`);
                        if (stats.agricultural) typesArr.push(`🌾 ${stats.agricultural}`);
                        if (stats.industrial) typesArr.push(`🏭 ${stats.industrial}`);
                        if (stats.land) typesArr.push(`📐 ${stats.land}`);
                        const typeLine = typesArr.length > 0 ? `<br/>${typesArr.join(' | ')}` : '';
                        setTooltipContent(
                          `<strong>${name}</strong><br/>` +
                          `📋 Properties: <b>${stats.properties}</b> | ✅ Verified: <b>${stats.verified}</b>` +
                          typeLine +
                          `<br/>📊 Transfers: <b>${stats.transfers}</b> (Done: ${stats.completed} | Pending: ${stats.pending})` +
                          (stats.totalArea ? `<br/>📏 Total Area: <b>${stats.totalArea.toLocaleString()}</b>` : '') +
                          (stats.totalPropValue ? `<br/>💰 Value: <b>₹${(stats.totalPropValue / 10000000).toFixed(1)}Cr</b>` : '') +
                          (stats.value ? `<br/>🔄 Transfer Value: ₹${(stats.value / 10000000).toFixed(1)}Cr` : '')
                        );
                      }}
                      onMouseLeave={() => setTooltipContent('')}
                      data-tooltip-id="map-tooltip"
                      data-tooltip-html={tooltipContent}
                      style={{
                        default: { outline: 'none', cursor: 'pointer', transition: 'fill 0.2s' },
                        hover: { fill: '#3B82F6', outline: 'none', opacity: 0.85 },
                        pressed: { fill: '#1D4ED8', outline: 'none' }
                      }}
                    />
                  );
                });
              }}
            </Geographies>

            {/* Pinned Government Properties */}
            {pinnedProperties.map((pin, i) => (
              <Marker
                key={pin._id || i}
                coordinates={pin.propertyDetails?.location?.coordinates || [78.9, 20.5]}
              >
                <g transform="translate(-8, -20)">
                  <path
                    d="M8 0C3.6 0 0 3.6 0 8c0 6 8 14 8 14s8-8 8-14c0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"
                    fill={PIN_TYPES.find(p => p.value === pin.propertyDetails?.propertyType)?.color || '#3B82F6'}
                    stroke="#fff"
                    strokeWidth="0.5"
                  />
                </g>
                <text
                  textAnchor="middle"
                  y={6}
                  style={{ fontFamily: 'system-ui', fill: '#0F172A', fontSize: '6px', fontWeight: 700 }}
                >
                  {pin.propertyDetails?.title?.substring(0, 12)}
                </text>
              </Marker>
            ))}

            {/* Draw polygon points */}
            {drawPoints.map((pt, i) => (
              <Marker key={`draw-${i}`} coordinates={pt}>
                <circle r={3} fill="#DC2626" stroke="#fff" strokeWidth={0.5} />
              </Marker>
            ))}

            {/* Property Markers from Registry */}
            {filteredGeoProperties.map((prop) => {
              const lat = prop.propertyDetails.coordinates.latitude;
              const lng = prop.propertyDetails.coordinates.longitude;
              const color = getMarkerColor(prop);
              const isSelected = selectedMarker?._id === prop._id;
              const title = prop.propertyDetails?.title || 'Untitled';
              return (
                <Marker
                  key={`prop-${prop._id}`}
                  coordinates={[lng, lat]}
                  onClick={(e) => { e.stopPropagation(); setSelectedMarker(prop); setSelectedState(null); }}
                >
                  {/* Pulse ring for selected */}
                  {isSelected && (
                    <circle r={8} fill="none" stroke={color} strokeWidth={0.8} opacity={0.4}>
                      <animate attributeName="r" from="5" to="12" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Marker dot */}
                  <circle
                    r={isSelected ? 4 : 2.5}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={isSelected ? 1 : 0.5}
                    style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                  />
                  {/* Label on zoom */}
                  {position.zoom >= 3 && (
                    <text
                      textAnchor="middle"
                      y={-6}
                      style={{
                        fontFamily: 'system-ui', fill: '#0F172A', fontSize: `${Math.max(4, 6 / position.zoom * 2)}px`,
                        fontWeight: 700, pointerEvents: 'none',
                        textShadow: '0 0 3px white, 0 0 3px white'
                      }}
                    >
                      {title.length > 15 ? title.substring(0, 14) + '…' : title}
                    </text>
                  )}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Pin mode crosshair */}
        {pinMode && <div className="map-crosshair">+</div>}
      </div>

      <Tooltip id="map-tooltip" className="map-tooltip-popup" />

      {/* Property Markers Stats Bar */}
      {geoProperties.length > 0 && (
        <div className="prop-markers-bar">
          <div className="prop-markers-bar-left">
            <FaLayerGroup className="prop-markers-bar-icon" />
            <span className="prop-markers-bar-count">{filteredGeoProperties.length}</span>
            <span className="prop-markers-bar-label">of {geoProperties.length} properties plotted</span>
          </div>
          <div className="prop-markers-filters">
            {[
              { key: 'all', label: 'All', count: geoProperties.length },
              { key: 'verified', label: 'Verified', count: geoProperties.filter(p => p.verification?.status === 'verified').length, color: '#138808' },
              { key: 'pending', label: 'Pending', count: geoProperties.filter(p => ['pending', 'needs_review', 'auto_verifying'].includes(p.verification?.status || 'pending')).length, color: '#FF9933' },
              { key: 'rejected', label: 'Rejected', count: geoProperties.filter(p => p.verification?.status === 'rejected').length, color: '#DC2626' }
            ].map(f => (
              <button
                key={f.key}
                className={`prop-marker-filter-btn ${markerFilter === f.key ? 'active' : ''}`}
                onClick={() => setMarkerFilter(f.key)}
                style={markerFilter === f.key && f.color ? { borderColor: f.color, color: f.color, background: `${f.color}10` } : {}}
              >
                {f.color && <span className="filter-dot" style={{ background: f.color }} />}
                {f.label} <span className="filter-count">{f.count}</span>
              </button>
            ))}
          </div>
          <button
            className={`prop-list-toggle-btn ${showPropertyList ? 'active' : ''}`}
            onClick={() => setShowPropertyList(!showPropertyList)}
            title="Toggle property list"
          >
            <FaBuilding /> List
          </button>
        </div>
      )}

      {/* Selected Property Marker Popup */}
      {selectedMarker && (
        <div className="prop-marker-popup">
          <div className="prop-marker-popup-header">
            <div className="prop-marker-popup-dot" style={{ background: getMarkerColor(selectedMarker) }} />
            <h4>{selectedMarker.propertyDetails?.title || 'Untitled Property'}</h4>
            <button className="prop-marker-popup-close" onClick={() => setSelectedMarker(null)}><FaTimes /></button>
          </div>
          <div className="prop-marker-popup-body">
            <div className="prop-marker-popup-row">
              <FaUser className="popup-row-icon" />
              <span className="popup-row-label">Owner</span>
              <span className="popup-row-value">{selectedMarker.owner?.name || 'N/A'}</span>
            </div>
            <div className="prop-marker-popup-row">
              <FaBuilding className="popup-row-icon" />
              <span className="popup-row-label">Type</span>
              <span className="popup-row-value" style={{ textTransform: 'capitalize' }}>{selectedMarker.propertyDetails?.propertyType || 'N/A'}</span>
            </div>
            <div className="prop-marker-popup-row">
              <FaRulerCombined className="popup-row-icon" />
              <span className="popup-row-label">Area</span>
              <span className="popup-row-value">{selectedMarker.propertyDetails?.area?.value || 'N/A'} {selectedMarker.propertyDetails?.area?.unit || ''}</span>
            </div>
            <div className="prop-marker-popup-row">
              <FaMapMarkerAlt className="popup-row-icon" />
              <span className="popup-row-label">Coords</span>
              <span className="popup-row-value mono">
                {selectedMarker.propertyDetails.coordinates.latitude.toFixed(5)}°N, {selectedMarker.propertyDetails.coordinates.longitude.toFixed(5)}°E
              </span>
            </div>
            <div className="prop-marker-popup-row">
              <FaCheckCircle className="popup-row-icon" style={{ color: getMarkerColor(selectedMarker) }} />
              <span className="popup-row-label">Status</span>
              <span className="popup-row-value" style={{ color: getMarkerColor(selectedMarker), fontWeight: 700 }}>{getStatusLabel(selectedMarker)}</span>
            </div>
            {selectedMarker.propertyDetails?.address && (
              <div className="prop-marker-popup-row">
                <FaLandmark className="popup-row-icon" />
                <span className="popup-row-label">Location</span>
                <span className="popup-row-value">
                  {[selectedMarker.propertyDetails.address.city, selectedMarker.propertyDetails.address.state].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
            )}
          </div>
          {onViewProperty && (
            <button className="prop-marker-popup-action" onClick={() => { onViewProperty(selectedMarker._id); setSelectedMarker(null); }}>
              <FaEye /> View Full Details <FaChevronRight />
            </button>
          )}
        </div>
      )}

      {/* Property List Sidebar */}
      {showPropertyList && geoProperties.length > 0 && (
        <div className="prop-list-sidebar">
          <div className="prop-list-sidebar-header">
            <h4><FaLayerGroup /> Registry Properties</h4>
            <button onClick={() => setShowPropertyList(false)}><FaTimes /></button>
          </div>
          <div className="prop-list-sidebar-body">
            {filteredGeoProperties.map(p => {
              const isActive = selectedMarker?._id === p._id;
              return (
                <div
                  key={p._id}
                  className={`prop-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMarker(p);
                    // Zoom to the property
                    setPosition({
                      coordinates: [p.propertyDetails.coordinates.longitude, p.propertyDetails.coordinates.latitude],
                      zoom: 5
                    });
                  }}
                >
                  <div className="prop-list-item-dot" style={{ background: getMarkerColor(p) }} />
                  <div className="prop-list-item-info">
                    <span className="prop-list-item-name">{p.propertyDetails?.title || 'Untitled'}</span>
                    <span className="prop-list-item-meta">
                      {p.propertyDetails.coordinates.latitude.toFixed(3)}°N, {p.propertyDetails.coordinates.longitude.toFixed(3)}°E
                    </span>
                  </div>
                  <FaChevronRight className="prop-list-item-arrow" />
                </div>
              );
            })}
            {filteredGeoProperties.length === 0 && (
              <div className="prop-list-empty">No properties match the current filter</div>
            )}
          </div>
        </div>
      )}

      {/* State Info Panel */}
      {selectedState && (
        <div className="state-info-panel">
          <div className="state-info-header">
            <h4>{selectedState}</h4>
            <button className="state-info-close" onClick={() => setSelectedState(null)}><FaTimes /></button>
          </div>
          <div className="state-info-stats">
            {(() => {
              const s = getStateStats(selectedState);
              return (
                <>
                  <div className="state-stat"><span className="state-stat-v">{s.properties}</span><span className="state-stat-l">Properties</span></div>
                  <div className="state-stat"><span className="state-stat-v">{s.verified}</span><span className="state-stat-l">Verified</span></div>
                  <div className="state-stat"><span className="state-stat-v">{s.transfers}</span><span className="state-stat-l">Transfers</span></div>
                  <div className="state-stat"><span className="state-stat-v">{s.completed}</span><span className="state-stat-l">Completed</span></div>
                  <div className="state-stat"><span className="state-stat-v">{s.pending}</span><span className="state-stat-l">Pending</span></div>
                  <div className="state-stat"><span className="state-stat-v">₹{(s.totalPropValue / 10000000).toFixed(1)}Cr</span><span className="state-stat-l">Total Value</span></div>
                  {s.totalArea > 0 && <div className="state-stat"><span className="state-stat-v">{s.totalArea.toLocaleString()}</span><span className="state-stat-l">Total Area</span></div>}
                  {s.residential > 0 && <div className="state-stat"><span className="state-stat-v">{s.residential}</span><span className="state-stat-l">Residential</span></div>}
                  {s.commercial > 0 && <div className="state-stat"><span className="state-stat-v">{s.commercial}</span><span className="state-stat-l">Commercial</span></div>}
                  {s.agricultural > 0 && <div className="state-stat"><span className="state-stat-v">{s.agricultural}</span><span className="state-stat-l">Agricultural</span></div>}
                  {s.industrial > 0 && <div className="state-stat"><span className="state-stat-v">{s.industrial}</span><span className="state-stat-l">Industrial</span></div>}
                  {s.land > 0 && <div className="state-stat"><span className="state-stat-v">{s.land}</span><span className="state-stat-l">Land</span></div>}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Pin Form Panel */}
      {pinMode && (
        <div className="pin-form-panel">
          <h4><FaMapMarkerAlt /> Pin Government Property</h4>
          <p className="pin-form-hint">Click on the map to place the pin, then fill details below.</p>
          <div className="pin-form-fields">
            <input
              type="text"
              placeholder="Property Name"
              value={pinForm.title}
              onChange={e => setPinForm({ ...pinForm, title: e.target.value })}
            />
            <select value={pinForm.type} onChange={e => setPinForm({ ...pinForm, type: e.target.value })}>
              {PIN_TYPES.map(pt => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="State"
              value={selectedState || pinForm.state}
              onChange={e => setPinForm({ ...pinForm, state: e.target.value })}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={pinForm.description}
              onChange={e => setPinForm({ ...pinForm, description: e.target.value })}
            />
          </div>
          <div className="pin-form-actions">
            <button className="pin-save-btn" onClick={handlePinSubmit} disabled={!pinForm.title}>
              <FaSave /> Save Pin
            </button>
            <button className="pin-cancel-btn" onClick={() => { setPinMode(false); setClickedCoords(null); }}>
              <FaTimes /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Draw mode instructions */}
      {drawMode && (
        <div className="draw-panel">
          <h4><FaDrawPolygon /> Draw Boundary</h4>
          <p>Click on map to add polygon points ({drawPoints.length} points)</p>
          <button className="pin-cancel-btn" onClick={clearDraw}><FaTimes /> Clear & Exit</button>
        </div>
      )}
    </div>
  );
};

export default memo(InteractiveIndiaMap);
