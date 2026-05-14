const mongoose = require('mongoose');
require('dotenv').config();
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/property_registry';

mongoose.connect(DB_URI).then(async () => {
  const Admin = require('./models/Admin');
  const admin = await Admin.findOne({});
  if (!admin) { console.log('No admin found'); process.exit(1); }
  const jwt = require('jsonwebtoken');
  const secret = (process.env.JWT_SECRET || 'default_secret') + '_ADMIN_PORTAL';
  const token = jwt.sign({ id: admin._id, portalType: 'admin' }, secret, { expiresIn: '4h' });
  console.log('ADMIN_TOKEN=' + token);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
