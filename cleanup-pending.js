/**
 * One-time cleanup: remove duplicate pending document entries
 * where an uploaded version (with CID) already exists
 */
require('dotenv').config();
const mongoose = require('mongoose');
const DB = process.env.MONGODB_URI || 'mongodb://localhost:27017/property_registry';

mongoose.connect(DB).then(async () => {
  const Property = require('./models/Property');

  // 1. Find properties with pending docs
  const props = await Property.find({ 'documents.ipfsStatus': 'pending_ipfs_upload' });
  let cleaned = 0;

  for (const prop of props) {
    const uploadedTypes = new Set(
      prop.documents
        .filter(d => d.ipfsCID && d.ipfsStatus === 'uploaded')
        .map(d => d.documentType)
    );

    const beforeLen = prop.documents.length;
    prop.documents = prop.documents.filter(d => {
      if (d.ipfsCID) return true;              // has CID → keep
      if (uploadedTypes.has(d.documentType)) return false; // duplicate pending → remove
      return true;                              // no uploaded version → keep
    });

    if (prop.documents.length < beforeLen) {
      cleaned += beforeLen - prop.documents.length;
      await prop.save();
      console.log('Cleaned', beforeLen - prop.documents.length, 'duplicates from', prop.propertyId);
    }
  }

  // 2. Clean dummy docs with no CID and no status (seed data artefacts)
  const dummyProps = await Property.find({
    'documents': { $elemMatch: { ipfsCID: null, ipfsStatus: null } }
  });
  for (const prop of dummyProps) {
    const beforeLen = prop.documents.length;
    prop.documents = prop.documents.filter(d => d.ipfsCID !== null && d.ipfsCID !== undefined);
    if (prop.documents.length < beforeLen) {
      cleaned += beforeLen - prop.documents.length;
      await prop.save();
      console.log('Cleaned', beforeLen - prop.documents.length, 'dummy docs from', prop.propertyId);
    }
  }

  console.log('\nTotal cleaned:', cleaned);

  // 3. Final state
  console.log('\n=== Final document state ===');
  const all = await Property.find({ 'documents.0': { $exists: true } }).select('propertyId documents.documentType documents.ipfsCID documents.ipfsStatus documents.ipfsProvider');
  let total = 0;
  for (const p of all) {
    for (const d of p.documents) {
      total++;
      console.log(p.propertyId, '|', d.documentType, '| status:', d.ipfsStatus, '| provider:', d.ipfsProvider, '| cid:', d.ipfsCID ? d.ipfsCID.substring(0, 30) + '...' : 'null');
    }
  }
  console.log('\nTotal IPFS documents:', total);

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
