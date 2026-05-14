/**
 * spatialConflict.js
 * ─────────────────────────────────────────────────────────────────────
 * MongoDB 2dsphere-powered spatial conflict detection.
 *
 * Strategy (two-tier):
 *   1. **Fast path** — MongoDB $nearSphere + $maxDistance (uses 2dsphere
 *      index on `location` GeoJSON field) to get candidate set.
 *   2. **Precise path** — Haversine re-check on candidates to confirm
 *      true geodesic distance (filters false positives from MongoDB's
 *      spherical approximation on short arcs).
 *
 * Default conflict radius: 100 metres (configurable).
 *
 * @module utils/spatialConflict
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const Property = require('../models/Property');
const { haversineDistance } = require('./haversineDistance');

const DEFAULT_RADIUS_M = 100; // metres

/**
 * Find properties whose coordinates conflict with a given point.
 *
 * @param {number}  latitude       Latitude  (decimal degrees, WGS-84)
 * @param {number}  longitude      Longitude (decimal degrees, WGS-84)
 * @param {Object}  [options]
 * @param {number}  [options.radiusMetres=100]  Conflict radius in metres
 * @param {string}  [options.excludePropertyId] Property ID to exclude (self)
 * @param {string[]} [options.statuses]         Verification statuses to include
 * @returns {Promise<{conflict: boolean, conflictingProperty: Object|null, distanceMetres: number|null, candidatesChecked: number}>}
 */
async function checkSpatialConflict(latitude, longitude, options = {}) {
  const {
    radiusMetres = DEFAULT_RADIUS_M,
    excludePropertyId = null,
    statuses = ['verified', 'pending', 'needs_review']
  } = options;

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return { conflict: false, conflictingProperty: null, distanceMetres: null, candidatesChecked: 0 };
  }

  // ─── Tier 1: MongoDB 2dsphere $nearSphere query ───
  const query = {
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat] // GeoJSON: [longitude, latitude]
        },
        $maxDistance: radiusMetres // metres
      }
    },
    'verification.status': { $in: statuses }
  };

  if (excludePropertyId) {
    query.propertyId = { $ne: excludePropertyId };
  }

  let candidates;
  try {
    candidates = await Property.find(query)
      .populate('owner', 'name email')
      .limit(10);
  } catch (err) {
    // Fallback if 2dsphere index not yet created — use Haversine scan
    console.warn('⚠️  2dsphere query failed, falling back to Haversine scan:', err.message);
    return _fallbackHaversineScan(lat, lng, radiusMetres, excludePropertyId, statuses);
  }

  if (candidates.length === 0) {
    return { conflict: false, conflictingProperty: null, distanceMetres: null, candidatesChecked: 0 };
  }

  // ─── Tier 2: Haversine re-check for precision ───
  let closestProperty = null;
  let closestDistance = Infinity;

  for (const prop of candidates) {
    const pLat = prop.propertyDetails?.coordinates?.latitude;
    const pLng = prop.propertyDetails?.coordinates?.longitude;
    if (pLat == null || pLng == null) continue;

    const dist = haversineDistance(lat, lng, pLat, pLng);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestProperty = prop;
    }
  }

  if (closestProperty && closestDistance <= radiusMetres) {
    return {
      conflict: true,
      conflictingProperty: closestProperty,
      distanceMetres: Math.round(closestDistance * 100) / 100,
      candidatesChecked: candidates.length
    };
  }

  return { conflict: false, conflictingProperty: null, distanceMetres: null, candidatesChecked: candidates.length };
}

/**
 * Fallback: full-collection Haversine scan (used when 2dsphere index
 * is missing or location field not populated).
 */
async function _fallbackHaversineScan(lat, lng, radiusMetres, excludePropertyId, statuses) {
  const filter = {
    'propertyDetails.coordinates.latitude': { $exists: true },
    'propertyDetails.coordinates.longitude': { $exists: true },
    'verification.status': { $in: statuses }
  };

  if (excludePropertyId) {
    filter.propertyId = { $ne: excludePropertyId };
  }

  const allProps = await Property.find(filter)
    .populate('owner', 'name email')
    .select('propertyId propertyDetails.title propertyDetails.coordinates owner verification');

  let closestProperty = null;
  let closestDistance = Infinity;

  for (const prop of allProps) {
    const pLat = prop.propertyDetails.coordinates.latitude;
    const pLng = prop.propertyDetails.coordinates.longitude;
    const dist = haversineDistance(lat, lng, pLat, pLng);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestProperty = prop;
    }
  }

  if (closestProperty && closestDistance <= radiusMetres) {
    return {
      conflict: true,
      conflictingProperty: closestProperty,
      distanceMetres: Math.round(closestDistance * 100) / 100,
      candidatesChecked: allProps.length
    };
  }

  return { conflict: false, conflictingProperty: null, distanceMetres: null, candidatesChecked: allProps.length };
}

module.exports = { checkSpatialConflict, DEFAULT_RADIUS_M };
