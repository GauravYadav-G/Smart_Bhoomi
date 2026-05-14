import React, { useEffect, useRef, useState, useCallback } from 'react';
import './BoundaryMap.css';

const BoundaryMap = ({ 
  centerLat, 
  centerLng, 
  boundaryPoints = [],
  height = '500px',
  title = 'Property Boundary'
}) => {
  const canvasRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const allPoints = centerLat && centerLng 
    ? [
        { lat: centerLat, lng: centerLng },
        ...boundaryPoints.map(p => ({ lat: p.latitude, lng: p.longitude }))
      ]
    : [];

  const lats = allPoints.length > 0 ? allPoints.map(p => p.lat) : [0];
  const lngs = allPoints.length > 0 ? allPoints.map(p => p.lng) : [0];

  const padding = 0.003;
  const minLat = Math.min(...lats) - padding;
  const maxLat = Math.max(...lats) + padding;
  const minLng = Math.min(...lngs) - padding;
  const maxLng = Math.max(...lngs) + padding;

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const osmUrl = centerLat && centerLng 
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`
    : '';
  const googleMapsLink = centerLat && centerLng 
    ? `https://www.google.com/maps?q=${centerLat},${centerLng}`
    : '';

  const latLngToPixel = useCallback((lat, lng, width, height) => {
    if ((maxLng - minLng) === 0 || (maxLat - minLat) === 0) {
      return { x: width / 2, y: height / 2 };
    }
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return { x, y };
  }, [minLat, maxLat, minLng, maxLng]);

  useEffect(() => {
    if (!mapLoaded || !canvasRef.current || !centerLat || !centerLng) return;

    const drawBoundary = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (boundaryPoints.length >= 3) {
        ctx.save();
        ctx.beginPath();
        
        boundaryPoints.forEach((point, index) => {
          const { x, y } = latLngToPixel(point.latitude, point.longitude, canvas.width, canvas.height);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(255, 127, 0, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#ff7f00';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        boundaryPoints.forEach((point, index) => {
          const { x, y } = latLngToPixel(point.latitude, point.longitude, canvas.width, canvas.height);

          if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff7f00';
            ctx.shadowColor = 'rgba(0,0,0,0.25)';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(index + 1, x, y);
            ctx.restore();
          }
        });
      }

      const centerPx = latLngToPixel(centerLat, centerLng, canvas.width, canvas.height);
      
      if (centerPx.x >= 0 && centerPx.x <= canvas.width && centerPx.y >= 0 && centerPx.y <= canvas.height) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerPx.x, centerPx.y, 9, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
    };

    drawBoundary();
    const timer = setTimeout(drawBoundary, 1000);
    return () => clearTimeout(timer);
  }, [mapLoaded, boundaryPoints, centerLat, centerLng, latLngToPixel]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) setMapLoaded(prev => !prev);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!centerLat || !centerLng) {
    return (
      <div className="boundary-map-wrapper" style={{ height }}>
        <div className="map-error">📍 No location data available</div>
      </div>
    );
  }

  return (
    <div className="boundary-map-wrapper" style={{ height }}>
      <div className="map-container-with-boundary">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={osmUrl}
          title={title}
          className="boundary-map-iframe"
          onLoad={() => setMapLoaded(true)}
        />

        <canvas ref={canvasRef} className="boundary-canvas-overlay" />

        {boundaryPoints.length > 0 && (
          <div className="static-boundary-badge">
            🔒 {boundaryPoints.length} Point{boundaryPoints.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="map-info-bar">
        <div className="map-stats">
          <span className="stat-item">
            📍 {centerLat.toFixed(6)}, {centerLng.toFixed(6)}
          </span>
          {boundaryPoints.length > 0 && (
            <span className="stat-item">
              🔷 {boundaryPoints.length} boundary point{boundaryPoints.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <a 
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="open-maps-link"
        >
          🗺️ Open in Google Maps
        </a>
      </div>

      {/* ONLY ONE LEGEND HERE */}
      <div className="map-legend-single">
        <div className="legend-item">
          <span className="legend-icon legend-center-blue"></span>
          <span>Property Center</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon legend-boundary-orange"></span>
          <span>Boundary Points ({boundaryPoints.length || 0})</span>
        </div>
      </div>
    </div>
  );
};

export default BoundaryMap;
