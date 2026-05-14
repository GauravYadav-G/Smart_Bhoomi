/**
 * SpatialConflictPanel — Admin map showing all registered parcels with Haversine conflict layers
 *
 * Features:
 *   1. Leaflet map with marker clustering (react-leaflet-markercluster)
 *   2. All registered properties rendered as coloured markers (green=verified, orange=pending, red=conflict)
 *   3. 100m geodesic circles on every parcel
 *   4. Click-to-inspect sidebar with conflict details + distance measurement
 *   5. Live statistics bar (total, verified, conflicts, avg distance)
 *
 * Paper value: Admin transparency layer for spatial integrity
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  FaMapMarkerAlt, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaSpinner, FaLayerGroup, FaRuler, FaExpandArrowsAlt, FaTimes,
  FaSatellite, FaMap
} from 'react-icons/fa';
import { propertyAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

/* fix default marker icons */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const orangeIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

/* FitBounds helper */
const FitBounds = ({ properties }) => {
  const map = useMap();
  useEffect(() => {
    if (properties.length === 0) return;
    const pts = properties.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
    if (pts.length > 0) map.fitBounds(pts, { padding: [40, 40] });
  }, [properties, map]);
  return null;
};

/* Custom clustered markers using leaflet.markercluster directly */
const ClusteredMarkers = ({ markers, onMarkerClick }) => {
  const map = useMap();
  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({ chunkedLoading: true, disableClusteringAtZoom: 15 });
    markers.forEach(m => {
      const marker = L.marker([m.lat, m.lng], { icon: m.icon })
        .bindPopup(`<strong>${m.title}</strong><br/>Status: ${m.status}<br/>${m.lat.toFixed(6)}°N, ${m.lng.toFixed(6)}°E`);
      marker.on('click', () => onMarkerClick(m.property));
      clusterGroup.addLayer(marker);
    });
    map.addLayer(clusterGroup);
    return () => { map.removeLayer(clusterGroup); };
  }, [map, markers, onMarkerClick]);
  return null;
};

/* Simple Haversine for client-side distance */
const haversineDist = (lat1, lng1, lat2, lng2) => {
  const R = 6371008.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const SpatialConflictPanel = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCircles, setShowCircles] = useState(true);
  const [showConflictLines, setShowConflictLines] = useState(true);
  const [measurePair, setMeasurePair] = useState([]); // [id1, id2]
  const [measuredDist, setMeasuredDist] = useState(null);
  const [error, setError] = useState(null);

  /* Fetch all properties with coords */
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await propertyAPI.getAllWithCoords();
      setProperties(res.data || []);
    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Failed to load property data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  /* Detect conflicts (pairs within 100m) */
  const conflicts = useMemo(() => {
    const pairs = [];
    const validProps = properties.filter(p => p.lat && p.lng);
    for (let i = 0; i < validProps.length; i++) {
      for (let j = i + 1; j < validProps.length; j++) {
        const dist = haversineDist(validProps[i].lat, validProps[i].lng, validProps[j].lat, validProps[j].lng);
        if (dist <= 100) {
          pairs.push({ a: validProps[i], b: validProps[j], distance: Math.round(dist) });
        }
      }
    }
    return pairs;
  }, [properties]);

  /* Stats */
  const stats = useMemo(() => {
    const verified = properties.filter(p => p.verificationStatus === 'verified').length;
    const pending = properties.filter(p => p.verificationStatus === 'pending').length;
    const conflictPropIds = new Set();
    conflicts.forEach(c => { conflictPropIds.add(c.a._id); conflictPropIds.add(c.b._id); });
    return { total: properties.length, verified, pending, conflictCount: conflicts.length, involvedParcels: conflictPropIds.size };
  }, [properties, conflicts]);

  /* Measurement mode */
  const handleMarkerClick = (property) => {
    if (measurePair.length === 0) {
      setMeasurePair([property]);
      setMeasuredDist(null);
      setSelected(property);
    } else if (measurePair.length === 1 && measurePair[0]._id !== property._id) {
      const d = haversineDist(measurePair[0].lat, measurePair[0].lng, property.lat, property.lng);
      setMeasuredDist(Math.round(d * 100) / 100);
      setMeasurePair([measurePair[0], property]);
      setSelected(property);
    } else {
      setMeasurePair([property]);
      setMeasuredDist(null);
      setSelected(property);
    }
  };

  const clearMeasure = () => { setMeasurePair([]); setMeasuredDist(null); };

  const iconFor = (p) => {
    if (conflicts.some(c => c.a._id === p._id || c.b._id === p._id)) return redIcon;
    if (p.verificationStatus === 'verified') return greenIcon;
    return orangeIcon;
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <FaSpinner className="fa-spin" style={{ fontSize: 32, color: '#0B3D91' }} />
        <p>Loading property map...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ─── Header ─── */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}><FaSatellite style={{ color: '#0B3D91' }} /> Spatial Conflict Monitor</h3>
          <p style={styles.subtitle}>Haversine Geodesic Conflict Detection — Live Admin Map</p>
        </div>
        <div style={styles.toggleRow}>
          <button style={{ ...styles.toggleBtn, background: showCircles ? '#0B3D91' : '#E2E8F0', color: showCircles ? '#FFF' : '#334155' }} onClick={() => setShowCircles(!showCircles)}>
            <FaLayerGroup /> Circles
          </button>
          <button style={{ ...styles.toggleBtn, background: showConflictLines ? '#DC2626' : '#E2E8F0', color: showConflictLines ? '#FFF' : '#334155' }} onClick={() => setShowConflictLines(!showConflictLines)}>
            <FaRuler /> Conflict Lines
          </button>
          <button style={{ ...styles.toggleBtn, background: measurePair.length > 0 ? '#D97706' : '#E2E8F0', color: measurePair.length > 0 ? '#FFF' : '#334155' }} onClick={measurePair.length > 0 ? clearMeasure : () => setMeasurePair([])}>
            <FaExpandArrowsAlt /> {measurePair.length > 0 ? 'Clear Measure' : 'Measure'}
          </button>
        </div>
      </div>

      {/* ─── Stats bar ─── */}
      <div style={styles.statsBar}>
        <StatBox label="Total Parcels" value={stats.total} color="#0B3D91" icon={<FaMapMarkerAlt />} />
        <StatBox label="Verified" value={stats.verified} color="#059669" icon={<FaCheckCircle />} />
        <StatBox label="Pending" value={stats.pending} color="#D97706" icon={<FaClock />} />
        <StatBox label="Conflicts" value={stats.conflictCount} color="#DC2626" icon={<FaExclamationTriangle />} />
        <StatBox label="Affected" value={stats.involvedParcels} color="#9333EA" icon={<FaLayerGroup />} />
      </div>

      {error && (
        <div style={{ padding: 12, background: '#FEF2F2', borderRadius: 8, color: '#991B1B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaExclamationTriangle /> {error} <button onClick={fetchProperties} style={styles.retryBtn}>Retry</button>
        </div>
      )}

      {/* ─── Measurement banner ─── */}
      {measuredDist !== null && measurePair.length === 2 && (
        <div style={styles.measureBanner}>
          <FaRuler style={{ color: '#D97706' }} />
          <span>Distance: <strong>{measuredDist} m</strong> (Haversine geodesic) between "{measurePair[0].title}" and "{measurePair[1].title}"</span>
          <button onClick={clearMeasure} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes /></button>
        </div>
      )}

      <div style={styles.mapRow}>
        {/* ─── Map ─── */}
        <div style={styles.mapWrap}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ width: '100%', height: 480, borderRadius: 12 }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds properties={properties} />

            <ClusteredMarkers
              markers={properties.filter(p => p.lat && p.lng).map(p => ({
                lat: p.lat, lng: p.lng, icon: iconFor(p),
                title: p.title, status: p.verificationStatus,
                property: p
              }))}
              onMarkerClick={handleMarkerClick}
            />

            {/* 100m circles */}
            {showCircles && properties.filter(p => p.lat && p.lng).map(p => {
              const hasConflict = conflicts.some(c => c.a._id === p._id || c.b._id === p._id);
              return (
                <Circle key={`c-${p._id}`} center={[p.lat, p.lng]} radius={100}
                  pathOptions={{
                    color: hasConflict ? '#DC2626' : p.verificationStatus === 'verified' ? '#059669' : '#D97706',
                    fillOpacity: 0.06, weight: 1.5
                  }}
                />
              );
            })}

            {/* Conflict lines */}
            {showConflictLines && conflicts.map((c, i) => (
              <Polyline key={`cl-${i}`} positions={[[c.a.lat, c.a.lng], [c.b.lat, c.b.lng]]}
                pathOptions={{ color: '#DC2626', weight: 2, dashArray: '8 6' }}
              />
            ))}

            {/* Measurement line */}
            {measurePair.length === 2 && (
              <Polyline positions={[[measurePair[0].lat, measurePair[0].lng], [measurePair[1].lat, measurePair[1].lng]]}
                pathOptions={{ color: '#D97706', weight: 3, dashArray: '4 4' }}
              />
            )}
          </MapContainer>
        </div>

        {/* ─── Sidebar ─── */}
        <div style={styles.sidebar}>
          <h4 style={styles.sideTitle}><FaExclamationTriangle style={{ color: '#DC2626' }} /> Active Conflicts ({conflicts.length})</h4>
          {conflicts.length === 0 && <p style={{ fontSize: 13, color: '#64748B' }}>No boundary conflicts detected.</p>}
          {conflicts.map((c, i) => (
            <div key={i} style={styles.conflictCard} onClick={() => setSelected(c.a)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <strong>{c.a.title}</strong>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>{c.distance}m</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>↔ {c.b.title}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>Haversine geodesic distance</div>
            </div>
          ))}

          {selected && (
            <>
              <h4 style={{ ...styles.sideTitle, marginTop: 16 }}><FaMap /> Selected Property</h4>
              <div style={styles.selectedCard}>
                <div style={styles.selRow}><span>Title</span><strong>{selected.title}</strong></div>
                <div style={styles.selRow}><span>Location</span><span>{selected.lat?.toFixed(6)}°N, {selected.lng?.toFixed(6)}°E</span></div>
                <div style={styles.selRow}><span>Status</span><span style={{ color: selected.verificationStatus === 'verified' ? '#059669' : '#D97706', fontWeight: 600 }}>{selected.verificationStatus?.toUpperCase()}</span></div>
                <div style={styles.selRow}><span>Type</span><span>{selected.propertyType || 'N/A'}</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* Stat box helper */
const StatBox = ({ label, value, color, icon }) => (
  <div style={{ ...styles.statBox, borderLeft: `3px solid ${color}` }}>
    <div style={{ color, fontSize: 18 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748B' }}>{label}</div>
    </div>
  </div>
);

/* ─── styles ─── */
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 14 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: '#0B3D91' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 18, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 },
  subtitle: { margin: '2px 0 0', fontSize: 13, color: '#64748B' },
  toggleRow: { display: 'flex', gap: 6 },
  toggleBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .2s' },
  statsBar: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  statBox: { display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA', padding: '10px 14px', borderRadius: 8, flex: '1 1 130px' },
  retryBtn: { marginLeft: 'auto', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 },
  measureBanner: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 8, fontSize: 13 },
  mapRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  mapWrap: { flex: '1 1 55%', minWidth: 300, border: '1.5px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' },
  sidebar: { flex: '1 1 240px', maxHeight: 500, overflowY: 'auto', padding: '12px 14px', background: '#FAFAFA', borderRadius: 12, border: '1px solid #E2E8F0' },
  sideTitle: { margin: '0 0 8px', fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 },
  conflictCard: { padding: '10px 12px', background: '#FFF', borderRadius: 8, border: '1px solid #FEE2E2', marginBottom: 8, cursor: 'pointer' },
  selectedCard: { padding: '10px 12px', background: '#FFF', borderRadius: 8, border: '1px solid #BFDBFE' },
  selRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #F1F5F9' },
};

export default SpatialConflictPanel;
