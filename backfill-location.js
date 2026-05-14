/**
 * One-time migration: Backfill GeoJSON `location` field for all properties
 * that have coordinates but are missing the location field.
 *
 * The Property model pre-save hook auto-populates `location` from
 * `propertyDetails.coordinates`, but seeded or bulk-inserted properties
 * may have skipped it.
 *
 * Run: node backfill-location.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');

(async () => {
  await connectDB();
  require('./models/User');
  const Property = require('./models/Property');

  // Find all properties that have coords but no GeoJSON location
  const props = await Property.find({
    'propertyDetails.coordinates.latitude': { $exists: true },
    $or: [
      { 'location.coordinates': { $exists: false } },
      { 'location.coordinates': null },
      { location: null }
    ]
  });

  console.log(`Found ${props.length} properties missing GeoJSON location field`);

  let updated = 0;
  for (const prop of props) {
    const lat = parseFloat(prop.propertyDetails?.coordinates?.latitude);
    const lng = parseFloat(prop.propertyDetails?.coordinates?.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;

    // Set GeoJSON location directly (bypass pre-save to avoid side effects)
    await Property.updateOne(
      { _id: prop._id },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [lng, lat]   // GeoJSON: [longitude, latitude]
          }
        }
      }
    );
    updated++;
    console.log(`  ✅ ${prop.propertyId}: [${lng}, ${lat}]`);
  }

  console.log(`\nDone. Updated ${updated} properties.`);

  // Verify
  const withLocation = await Property.countDocuments({ 'location.coordinates': { $exists: true, $ne: null } });
  const total = await Property.countDocuments({ 'propertyDetails.coordinates.latitude': { $exists: true } });
  console.log(`Properties with coords: ${total} | With GeoJSON location: ${withLocation}`);

  process.exit(0);
})();
