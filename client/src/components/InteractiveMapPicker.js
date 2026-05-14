import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaUndo, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import './InteractiveMapPicker.css';

const InteractiveMapPicker = ({ 
  isOpen, 
  onClose, 
  onSave, 
  centerLat, 
  centerLng,
  initialPoints = [] 
}) => {
  const [points, setPoints] = useState(initialPoints);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const canvasRef = useRef(null);
  const mapRef = useRef(null);

  // Calculate map bounds
  const allCoords = [
    ...(centerLat && centerLng ? [{ lat: centerLat, lng: centerLng }] : []),
    ...points.map(p => ({ lat: p.lat, lng: p.lng }))
  ];

  const lats = allCoords.length > 0 ? allCoords.map(c => c.lat) : [centerLat || 0];
  const lngs = allCoords.length > 0 ? allCoords.map(c => c.lng) : [centerLng || 0];

  const padding = 0.004;
  const minLat = Math.min(...lats) - padding;
  const maxLat = Math.max(...lats) + padding;
  const minLng = Math.min(...lngs) - padding;
  const maxLng = Math.max(...lngs) + padding;

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const mapUrl = centerLat && centerLng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`
    : '';

  // Coordinate conversion functions
  const latLngToPixel = useCallback((lat, lng, width, height) => {
    if (!lat || !lng) return { x: width / 2, y: height / 2 };
    if (maxLng - minLng === 0 || maxLat - minLat === 0) {
      return { x: width / 2, y: height / 2 };
    }
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return { x, y };
  }, [minLat, maxLat, minLng, maxLng]);

  const pixelToLatLng = useCallback((x, y, width, height) => {
    const lng = minLng + (x / width) * (maxLng - minLng);
    const lat = maxLat - (y / height) * (maxLat - minLat);
    return { lat, lng };
  }, [minLat, maxLat, minLng, maxLng]);

  // Check if mouse is over a point
  const getPointAtPosition = (x, y, width, height) => {
    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i];
      const { x: px, y: py } = latLngToPixel(point.lat, point.lng, width, height);
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (distance <= 20) { // 20px click radius
        return i;
      }
    }
    return -1;
  };

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const width = rect.width || 0;
    const height = rect.height || 0;

    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw polygon
    if (points.length >= 3) {
      ctx.save();
      ctx.beginPath();
      points.forEach((point, idx) => {
        const { x, y } = latLngToPixel(point.lat, point.lng, width, height);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 127, 0, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#ff7f00';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Draw connecting lines (2 points)
    if (points.length === 2) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      const p1 = latLngToPixel(points[0].lat, points[0].lng, width, height);
      const p2 = latLngToPixel(points[1].lat, points[1].lng, width, height);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#ff7f00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.restore();
    }

    // Draw boundary points
    points.forEach((point, i) => {
      const { x, y } = latLngToPixel(point.lat, point.lng, width, height);

      ctx.save();
      
      // Glow on hover/drag
      if (i === hoveredIndex || i === draggingIndex) {
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 127, 0, 0.25)';
        ctx.fill();
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff7f00';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = i === draggingIndex ? '#10b981' : '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, x, y);
      ctx.restore();
    });

    // Draw center GPS marker
    if (centerLat && centerLng) {
      const { x, y } = latLngToPixel(centerLat, centerLng, width, height);

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }, [points, hoveredIndex, draggingIndex, centerLat, centerLng, latLngToPixel]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Mouse down - check if clicking on existing point or adding new one
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoords(e);
    const pointIndex = getPointAtPosition(x, y, canvas.width, canvas.height);

    if (pointIndex >= 0) {
      // Start dragging existing point
      e.preventDefault();
      setDraggingIndex(pointIndex);
      setHoveredIndex(null);
    }
  };

  // Click - add new point if not dragging
  const handleCanvasClick = (e) => {
    if (draggingIndex !== null) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoords(e);
    
    // Don't add point if clicking on existing point
    const pointIndex = getPointAtPosition(x, y, canvas.width, canvas.height);
    if (pointIndex >= 0) return;

    const { lat, lng } = pixelToLatLng(x, y, canvas.width, canvas.height);
    setPoints(prev => [...prev, { lat, lng }]);
  };

  // Mouse move - update dragging point or hover state
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoords(e);

    // Update dragging point position
    if (draggingIndex !== null) {
      const cx = Math.min(Math.max(x, 0), canvas.width);
      const cy = Math.min(Math.max(y, 0), canvas.height);
      const { lat, lng } = pixelToLatLng(cx, cy, canvas.width, canvas.height);

      setPoints(prev => {
        const pts = [...prev];
        pts[draggingIndex] = { lat, lng };
        return pts;
      });
    } else {
      // Update hover state
      const pointIndex = getPointAtPosition(x, y, canvas.width, canvas.height);
      setHoveredIndex(pointIndex >= 0 ? pointIndex : null);
    }
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const undo = () => setPoints(prev => prev.slice(0, -1));
  const clear = () => setPoints([]);

  const saveMap = () => {
    const formattedPoints = points.map(p => ({
      latitude: p.lat,
      longitude: p.lng
    }));
    if (onSave) onSave(formattedPoints);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="interactive-map-picker" role="dialog" aria-modal="true">
      <div className="picker-header">
        <div>
          <h3>Mark Property Boundary</h3>
          <p className="picker-hint">
            Click to add points • Drag points to reposition • Min 3 points
          </p>
        </div>
        <button className="btn-close-picker" onClick={onClose} type="button">
          <FaTimes />
        </button>
      </div>

      <div className="picker-content">
        <div className="map-wrapper" ref={mapRef}>
          {mapUrl && (
            <iframe
              title="Base Map"
              className="base-map"
              src={mapUrl}
              frameBorder="0"
              scrolling="no"
            />
          )}
          
          <canvas
            className="drawing-canvas"
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              cursor: draggingIndex !== null ? 'grabbing' : (hoveredIndex !== null ? 'move' : 'crosshair')
            }}
          />

          {points.length > 0 && (
            <div className="point-count-badge">
              🔒 {points.length} Point{points.length > 1 ? 's' : ''}
            </div>
          )}

          {points.length > 0 && points.length < 3 && (
            <div className="map-hint-overlay">
              Add {3 - points.length} more point{3 - points.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="picker-controls">
          <div className="controls-left">
            <div className="point-count">
              <div className="count-number">{points.length}</div>
              <div className="count-label">{points.length === 1 ? 'Point' : 'Points'}</div>
            </div>
          </div>
          <div className="controls-right">
            <button type="button" className="btn-control btn-undo" onClick={undo} disabled={points.length === 0}>
              <FaUndo /> Undo
            </button>
            <button type="button" className="btn-control btn-clear" onClick={clear} disabled={points.length === 0}>
              <FaTrash /> Clear
            </button>
            <button 
              type="button" 
              className="btn-control btn-save-map" 
              onClick={saveMap} 
              disabled={points.length < 3}
            >
              <FaSave /> Save Boundary
            </button>
          </div>
        </div>

        <div className="map-legend-inline">
          <div className="legend-item">
            <span className="legend-dot legend-center-blue"></span>
            <span>Property Center</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-boundary-orange"></span>
            <span>Boundary Points ({points.length})</span>
          </div>
        </div>

        <div className="picker-instructions">
          <h4>📋 How to Mark Boundary</h4>
          <ol>
            <li><strong>Add Points:</strong> Click on map corners (min. 3 points)</li>
            <li><strong>Drag Points:</strong> Click and drag any orange point to move it</li>
            <li><strong>Edit:</strong> Use Undo to remove last point or Clear to restart</li>
            <li><strong>Save:</strong> Click "Save Boundary" when done</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMapPicker;
