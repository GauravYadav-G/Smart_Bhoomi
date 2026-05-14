const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { propertyValidation, validate } = require('../middleware/security');
const {
  registerProperty,
  getProperties,
  getPropertyById,
  verifyProperty,
  getMyProperties,
  updateProperty,
  getPropertyHistory
} = require('../controllers/propertyController');

const { checkSpatialConflict, DEFAULT_RADIUS_M } = require('../utils/spatialConflict');
const { haversineDistance } = require('../utils/haversineDistance');

// All routes require authentication
router.use(protect);

// ─── GPS Conflict Check (citizen-facing) ───
router.get('/check-conflict', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng required' });
    }
    const result = await checkSpatialConflict(lat, lng, {
      radiusMetres: DEFAULT_RADIUS_M,
      statuses: ['verified', 'pending', 'needs_review']
    });
    if (result.conflict) {
      const cp = result.conflictingProperty;
      const dist = result.distanceMetres;
      const overlapType = dist < 30 ? 'MAJOR' : dist < 70 ? 'MODERATE' : 'MINOR';
      return res.json({
        success: true,
        conflict: true,
        conflictingParcel: {
          id: cp.propertyId,
          title: cp.propertyDetails?.title || 'Unknown',
          owner: cp.owner?.name || 'Unknown',
          distance: dist,
          lat: cp.propertyDetails?.coordinates?.latitude,
          lng: cp.propertyDetails?.coordinates?.longitude
        },
        overlapType,
        nearestParcel: dist
      });
    }
    // No conflict — find nearest parcel distance anyway
    const Property = require('../models/Property');
    const nearby = await Property.find({
      'propertyDetails.coordinates.latitude': { $exists: true },
      'propertyDetails.coordinates.longitude': { $exists: true }
    }).select('propertyDetails.coordinates').limit(200);
    let minDist = Infinity;
    for (const p of nearby) {
      const pLat = p.propertyDetails?.coordinates?.latitude;
      const pLng = p.propertyDetails?.coordinates?.longitude;
      if (pLat && pLng) {
        const d = haversineDistance(lat, lng, pLat, pLng);
        if (d < minDist) minDist = d;
      }
    }
    return res.json({
      success: true,
      conflict: false,
      nearestParcel: minDist === Infinity ? null : Math.round(minDist),
      candidatesChecked: result.candidatesChecked
    });
  } catch (error) {
    console.error('Check-conflict error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── All properties with coordinates (for admin map) ───
router.get('/all-with-coords', async (req, res) => {
  try {
    const Property = require('../models/Property');
    const props = await Property.find({
      'propertyDetails.coordinates.latitude': { $exists: true }
    }).populate('owner', 'name')
      .select('propertyId propertyDetails.title propertyDetails.coordinates propertyDetails.address propertyDetails.propertyType verification documents owner createdAt')
      .lean();
    const flat = props.map(p => ({
      _id: p._id,
      propertyId: p.propertyId,
      title: p.propertyDetails?.title || 'Untitled',
      lat: parseFloat(p.propertyDetails?.coordinates?.latitude) || null,
      lng: parseFloat(p.propertyDetails?.coordinates?.longitude) || null,
      address: typeof p.propertyDetails?.address === 'object'
        ? [p.propertyDetails.address.street, p.propertyDetails.address.city, p.propertyDetails.address.state].filter(Boolean).join(', ')
        : (p.propertyDetails?.address || ''),
      propertyType: p.propertyDetails?.propertyType || 'N/A',
      verificationStatus: p.verification?.status || 'pending',
      ownerName: p.owner?.name || 'Unknown',
      createdAt: p.createdAt
    }));
    res.json(flat);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Property registration (any authenticated user can register)
router.post(
  '/register',
  propertyValidation,
  validate,
  registerProperty
);

// Get properties
router.get('/', getProperties);
router.get('/my-properties', getMyProperties);
router.get('/:id', getPropertyById);
router.get('/:propertyId/history', getPropertyHistory);

// Update property
router.put('/:propertyId', updateProperty);

// Auto-verification (owner triggers, system verifies automatically)
router.put('/:propertyId/verify', verifyProperty);

module.exports = router;
