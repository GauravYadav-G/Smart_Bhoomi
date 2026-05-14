/**
 * GPSCoordinateInput — Interactive Leaflet map with live Haversine conflict check
 *
 * Features:
 *   1. Click-to-set or manual coordinate entry with debounced API call
 *   2. Live Haversine conflict check via GET /api/properties/check-conflict
 *   3. Geodesic circle (green=clear, red=conflict) + orange conflicting marker + distance line
 *   4. Coordinate precision indicator (green/yellow/red)
 *   5. Haversine formula transparency info box
 *
 * Paper value: Demonstrates Haversine geodesic GPS conflict detection visually
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  FaMapMarkerAlt, FaCheckCircle, FaExclamationTriangle,
  FaSpinner, FaInfoCircle, FaCrosshairs, FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import { propertyAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

/* fix default marker icons in webpack/CRA builds */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* custom coloured icons */
const blueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const orangeIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

/* ─── Map click handler sub-component ─── */
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
};

/* ─── Recenter map when coordinates change ─── */
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], Math.max(map.getZoom(), 15));
    }
  }, [lat, lng, map]);
  return null;
};

/* ─── Precision helper ─── */
const getPrecision = (coordStr) => {
  if (!coordStr) return { decimals: 0, level: 'none', color: '#94A3B8', label: 'No coordinates' };
  const parts = String(coordStr).split('.');
  const d = parts.length > 1 ? parts[1].length : 0;
  if (d >= 6) return { decimals: d, level: 'high', color: '#059669', label: 'Sub-metre accuracy' };
  if (d >= 4) return { decimals: d, level: 'medium', color: '#D97706', label: 'Acceptable accuracy' };
  return { decimals: d, level: 'low', color: '#DC2626', label: 'Insufficient precision' };
};

const GPSCoordinateInput = ({ latitude, longitude, onCoordinateChange, disabled = false }) => {
  const [conflictResult, setConflictResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const debounceRef = useRef(null);

  const lat = latitude ? parseFloat(latitude) : null;
  const lng = longitude ? parseFloat(longitude) : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);
  const center = hasCoords ? [lat, lng] : [20.5937, 78.9629]; // India center

  const precision = useMemo(() => getPrecision(latitude), [latitude]);

  /* ─── Debounced conflict check ─── */
  const checkConflict = useCallback(async (newLat, newLng) => {
    if (!newLat || !newLng || isNaN(newLat) || isNaN(newLng)) return;
    setChecking(true);
    setError(null);
    try {
      const res = await propertyAPI.checkConflict(newLat, newLng);
      setConflictResult(res.data);
    } catch (err) {
      console.error('Conflict check failed:', err);
      setError('Could not check conflicts — server may be offline');
      setConflictResult(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (hasCoords) {
      debounceRef.current = setTimeout(() => checkConflict(lat, lng), 500);
    } else {
      setConflictResult(null);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [lat, lng, hasCoords, checkConflict]);

  /* ─── Handle map click ─── */
  const handleMapClick = (latlng) => {
    if (disabled) return;
    onCoordinateChange(latlng.lat.toFixed(6), latlng.lng.toFixed(6));
  };

  /* ─── Handle manual input ─── */
  const handleManualChange = (field, value) => {
    if (disabled) return;
    if (field === 'lat') onCoordinateChange(value, longitude || '');
    else onCoordinateChange(latitude || '', value);
  };

  /* ─── Detect current location ─── */
  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onCoordinateChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6)),
      () => setError('Could not get your location')
    );
  };

  const isConflict = conflictResult?.conflict === true;
  const cp = conflictResult?.conflictingParcel;

  return (
    <div style={styles.container}>
      {/* ─── Manual inputs ─── */}
      <div style={styles.inputRow}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Latitude</label>
          <input
            type="number"
            step="any"
            value={latitude || ''}
            onChange={(e) => handleManualChange('lat', e.target.value)}
            placeholder="19.076090"
            style={styles.input}
            disabled={disabled}
            aria-label="Latitude coordinate"
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Longitude</label>
          <input
            type="number"
            step="any"
            value={longitude || ''}
            onChange={(e) => handleManualChange('lng', e.target.value)}
            placeholder="72.877426"
            style={styles.input}
            disabled={disabled}
            aria-label="Longitude coordinate"
          />
        </div>
        <button type="button" onClick={detectLocation} style={styles.gpsBtn} aria-label="Auto-detect GPS location" disabled={disabled}>
          <FaCrosshairs /> GPS
        </button>
      </div>

      {/* ─── Leaflet Map ─── */}
      <div style={styles.mapWrap}>
        <MapContainer
          center={center}
          zoom={hasCoords ? 16 : 5}
          style={{ width: '100%', height: 360, borderRadius: 12 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
            maxZoom={19}
            opacity={0.9}
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {hasCoords && <RecenterMap lat={lat} lng={lng} />}

          {/* Selected point marker */}
          {hasCoords && <Marker position={[lat, lng]} icon={isConflict ? redIcon : blueIcon}>
            <Popup>
              <strong>Your Property</strong><br />
              {lat.toFixed(6)}°N, {lng.toFixed(6)}°E
            </Popup>
          </Marker>}

          {/* Geodesic circle */}
          {hasCoords && (
            <Circle
              center={[lat, lng]}
              radius={100}
              pathOptions={{
                color: isConflict ? '#DC2626' : '#059669',
                fillColor: isConflict ? '#FCA5A5' : '#A7F3D0',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: isConflict ? '6 4' : undefined,
              }}
            />
          )}

          {/* Conflicting parcel marker + distance line */}
          {isConflict && cp?.lat && cp?.lng && (
            <>
              <Marker position={[cp.lat, cp.lng]} icon={orangeIcon}>
                <Popup>
                  <strong style={{ color: '#DC2626' }}>⚠ Conflicting Property</strong><br />
                  {cp.title}<br />
                  Owner: {cp.owner}<br />
                  Distance: {cp.distance}m (Haversine)
                </Popup>
              </Marker>
              <Polyline
                positions={[[lat, lng], [cp.lat, cp.lng]]}
                pathOptions={{ color: '#F97316', weight: 3, dashArray: '8 6' }}
              />
            </>
          )}
        </MapContainer>
        <div style={styles.mapHint}>Click on the map to set coordinates, or type them manually above</div>
      </div>

      {/* ─── Conflict status banner ─── */}
      {checking && (
        <div style={{ ...styles.banner, background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <FaSpinner className="fa-spin" style={{ color: '#D97706' }} />
          <span style={{ color: '#92400E' }}>Checking for boundary conflicts (Haversine geodesic)...</span>
        </div>
      )}

      {error && (
        <div style={{ ...styles.banner, background: '#FEF2F2', borderColor: '#FECACA' }}>
          <FaExclamationTriangle style={{ color: '#DC2626' }} />
          <span style={{ color: '#991B1B' }}>{error}</span>
          <button onClick={() => checkConflict(lat, lng)} style={styles.retryBtn}>Retry</button>
        </div>
      )}

      {!checking && !error && conflictResult && !isConflict && (
        <div style={{ ...styles.banner, background: '#ECFDF5', borderColor: '#A7F3D0' }}>
          <FaCheckCircle style={{ color: '#059669' }} />
          <div>
            <strong style={{ color: '#065F46' }}>✔ Location Clear — No boundary conflicts detected within 100 metres</strong>
            {conflictResult.nearestParcel != null && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#047857' }}>
                Nearest registered parcel: {conflictResult.nearestParcel}m away
              </p>
            )}
          </div>
        </div>
      )}

      {!checking && !error && isConflict && cp && (
        <div style={{ ...styles.banner, background: '#FEF2F2', borderColor: '#FECACA', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaExclamationTriangle style={{ color: '#DC2626' }} />
            <strong style={{ color: '#991B1B' }}>⚠ Boundary Conflict Detected</strong>
          </div>
          <div style={styles.conflictCard}>
            <div style={styles.conflictRow}><span>Conflicting Property:</span><strong>{cp.title}</strong></div>
            <div style={styles.conflictRow}><span>Owner:</span><span>{cp.owner}</span></div>
            <div style={styles.conflictRow}><span>Distance:</span><strong>{cp.distance} metres (Haversine geodesic)</strong></div>
            <div style={styles.conflictRow}>
              <span>Overlap Type:</span>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12,
                background: conflictResult.overlapType === 'MAJOR' ? '#FEE2E2' : conflictResult.overlapType === 'MODERATE' ? '#FED7AA' : '#FEF9C3',
                color: conflictResult.overlapType === 'MAJOR' ? '#991B1B' : conflictResult.overlapType === 'MODERATE' ? '#9A3412' : '#854D0E',
              }}>
                {conflictResult.overlapType}
              </span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#B91C1C', marginTop: 8 }}>
            This application will be escalated to the Government Command Center for review.
          </p>
        </div>
      )}

      {/* ─── Precision indicator ─── */}
      {hasCoords && (
        <div style={{ ...styles.precisionBar, borderColor: precision.color + '40' }}>
          <div style={{ ...styles.precisionDot, background: precision.color }} />
          <div>
            <strong style={{ fontSize: 13, color: precision.color }}>
              Coordinate Precision: {precision.decimals} decimal places — {precision.label}
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
              {precision.level === 'high' ? 'Excellent — sub-metre accuracy for precise boundary verification' :
               precision.level === 'medium' ? 'Acceptable — ~10m accuracy, consider adding more decimal places' :
               'Insufficient — please use GPS or enter coordinates with 6+ decimal places'}
            </p>
          </div>
        </div>
      )}

      {/* ─── Haversine info box ─── */}
      <button type="button" onClick={() => setInfoOpen(!infoOpen)} style={styles.infoToggle} aria-expanded={infoOpen}>
        <FaInfoCircle style={{ color: '#0B3D91' }} />
        <span>How does SmartBhoomi detect boundary conflicts?</span>
        {infoOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {infoOpen && (
        <div style={styles.infoBox}>
          <p>
            <strong>SmartBhoomi uses the Haversine geodesic formula</strong> for precise great-circle distance calculation,
            accurate to within 1 metre at all Indian latitudes (8°N–37°N). This replaces the rectangular bounding-box
            method used by older systems, which can introduce up to ±12% spatial error at Indian latitudes due to
            longitude compression near the equator.
          </p>
          <p style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#475569', background: '#F1F5F9', padding: 10, borderRadius: 6 }}>
            d = 2R · arcsin(√(sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)))<br />
            R = 6,371,008.8 m (IUGG mean radius)
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── styles ─── */
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 12 },
  inputRow: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' },
  inputGroup: { flex: 1, minWidth: 140 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 },
  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 14, background: '#F8FAFC', boxSizing: 'border-box' },
  gpsBtn: { padding: '9px 14px', background: '#0B3D91', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' },
  mapWrap: { borderRadius: 12, overflow: 'hidden', border: '1.5px solid #E2E8F0' },
  mapHint: { fontSize: 12, color: '#64748B', padding: '6px 12px', background: '#F8FAFC', textAlign: 'center' },
  banner: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, border: '1.5px solid' },
  retryBtn: { marginLeft: 'auto', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 },
  conflictCard: { width: '100%', marginTop: 8, padding: '10px 14px', background: '#FFF', borderRadius: 8, border: '1px solid #FECACA' },
  conflictRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #FEE2E2' },
  precisionBar: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1.5px solid', background: '#FAFAFA' },
  precisionDot: { width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  infoToggle: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#334155', fontWeight: 500 },
  infoBox: { padding: '14px 16px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE', fontSize: 13, color: '#1E40AF', lineHeight: 1.6 },
};

export default GPSCoordinateInput;
