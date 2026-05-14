/**
 * haversineDistance.js
 * ─────────────────────────────────────────────────────────────────────
 * Pure-JS Haversine formula for geodesic distance between two lat/lng
 * points on the WGS-84 ellipsoid (mean Earth radius = 6 371 008.8 m).
 *
 * Why Haversine over Euclidean degree-diff?
 *   At 28.6°N (Delhi) one degree of longitude ≈ 97.4 km, but one
 *   degree of latitude ≈ 110.6 km.  A rectangular bounding-box query
 *   with RADIUS = 0.001° therefore treats ~97 m east-west the same as
 *   ~111 m north-south → up to ±12 % spatial error.  Haversine returns
 *   true surface-distance in metres irrespective of latitude.
 *
 * Reference:
 *   Sinnott, R. W., "Virtues of the Haversine", Sky and Telescope,
 *   vol. 68, no. 2, p. 159, 1984.
 *
 * @module utils/haversineDistance
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const EARTH_RADIUS_M = 6_371_008.8; // mean radius in metres (IUGG)

/**
 * Convert degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Compute the great-circle distance between two points on Earth.
 *
 * @param {number} lat1 - Latitude  of point A (decimal degrees, WGS-84)
 * @param {number} lng1 - Longitude of point A
 * @param {number} lat2 - Latitude  of point B
 * @param {number} lng2 - Longitude of point B
 * @returns {number} Distance in **metres**
 *
 * @example
 *   // India Gate, New Delhi → Qutub Minar
 *   haversineDistance(28.6129, 77.2295, 28.5245, 77.1855);
 *   // ≈ 10 331 m
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

module.exports = { haversineDistance, EARTH_RADIUS_M };
