const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Admin JWT uses a different secret + shorter expiry
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || (process.env.JWT_SECRET + '_ADMIN_PORTAL');
const ADMIN_JWT_EXPIRE = '4h'; // Shorter session for security

// Generate admin-specific JWT with role claim
const generateAdminToken = (adminId) => {
  return jwt.sign(
    { id: adminId, portalType: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_JWT_EXPIRE }
  );
};

// Protect admin routes — verify admin JWT + portalType claim
const protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    // Enforce portalType claim
    if (decoded.portalType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Invalid portal access' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Admin account deactivated' });
    }

    if (admin.isLocked()) {
      return res.status(423).json({ success: false, message: 'Account locked due to failed attempts. Try after 30 minutes.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Admin session expired. Please re-authenticate.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
};

/**
 * Dual-auth middleware: accepts EITHER a regular user JWT or an admin JWT.
 * Sets req.user (User model) or req.admin (Admin model) accordingly.
 * Use on routes that both citizen and admin portals need access to.
 */
const protectDual = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // 1️⃣ Try admin token first (signed with ADMIN_JWT_SECRET)
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.portalType === 'admin') {
      const Admin = require('../models/Admin');
      const admin = await Admin.findById(decoded.id);
      if (admin && admin.isActive) {
        req.admin = admin;
        // Also set req.user so downstream code that reads req.user still works
        req.user = { _id: admin._id, name: admin.name, email: admin.email, role: 'admin' };
        return next();
      }
    }
  } catch (_) {
    // Not an admin token — fall through to regular user check
  }

  // 2️⃣ Try regular user token (signed with JWT_SECRET)
  try {
    const User = require('../models/User');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
      return next();
    }
    return res.status(401).json({ success: false, message: 'User not found or deactivated' });
  } catch (_) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Clearance level gate
const requireClearance = (minLevel) => {
  return (req, res, next) => {
    if (!req.admin || req.admin.clearanceLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Clearance Level ${minLevel} required. Your level: ${req.admin?.clearanceLevel || 0}`
      });
    }
    next();
  };
};

module.exports = { protectAdmin, protectDual, generateAdminToken, requireClearance, ADMIN_JWT_SECRET };
