const mongoose = require('mongoose');

async function resetAdmin() {
  await mongoose.connect('mongodb://localhost:27017/property_registry');
  const Admin = require('./models/Admin');
  
  const admin = await Admin.findOne({ email: 'admin@gov.in' });
  if (!admin) { console.log('Admin not found'); process.exit(1); }
  
  console.log('BEFORE RESET:');
  console.log('  Email:', admin.email);
  console.log('  MFA Enabled:', admin.mfaEnabled);
  console.log('  MFA Setup Completed:', admin.mfaSetupCompleted);
  console.log('  Login Security Mode:', admin.loginSecurityMode);
  console.log('  Biometric Credentials:', admin.biometricCredentials?.length || 0);
  console.log('  KYC Level:', admin.kyc?.kycLevel);
  console.log('  Fingerprint Enrolled:', admin.kyc?.fingerprintEnrolled);
  console.log('  Face Enrolled:', admin.kyc?.faceEnrolled);
  
  // Reset biometric credentials
  admin.biometricCredentials = [];
  
  // Reset KYC biometric fields
  if (admin.kyc) {
    admin.kyc.fingerprintEnrolled = false;
    admin.kyc.fingerprintEnrolledAt = null;
    admin.kyc.fingerprintTemplateHash = null;
    admin.kyc.faceEnrolled = false;
    admin.kyc.faceEnrolledAt = null;
    admin.kyc.faceTemplateHash = null;
    admin.kyc.faceCaptures = [];
    
    // Recalculate KYC level without biometrics
    let level = 0;
    if (admin.kyc.aadhaarVerified || admin.kyc.panVerified) level = 1;
    if (admin.kyc.aadhaarVerified && admin.kyc.panVerified) level = 2;
    admin.kyc.kycLevel = level;
  }
  
  // Reset login security mode to standard (no biometric required to login)
  admin.loginSecurityMode = 'standard';
  
  // Reset MFA for fresh setup
  admin.mfaEnabled = false;
  admin.mfaSetupCompleted = false;
  admin.mfaSecret = null;
  
  // Clear challenge
  admin.currentChallenge = null;
  
  // Reset failed attempts
  admin.failedLoginAttempts = 0;
  admin.lockUntil = null;
  
  await admin.save();
  
  console.log('');
  console.log('AFTER RESET:');
  console.log('  MFA Enabled:', admin.mfaEnabled);
  console.log('  MFA Setup Completed:', admin.mfaSetupCompleted);
  console.log('  Login Security Mode:', admin.loginSecurityMode);
  console.log('  Biometric Credentials:', admin.biometricCredentials?.length || 0);
  console.log('  KYC Level:', admin.kyc?.kycLevel);
  console.log('  Fingerprint Enrolled:', admin.kyc?.fingerprintEnrolled);
  console.log('  Face Enrolled:', admin.kyc?.faceEnrolled);
  console.log('');
  console.log('Admin admin@gov.in fully reset. Login with credentials, fresh MFA setup will begin.');
  
  await mongoose.disconnect();
}

resetAdmin().catch(err => { console.error(err); process.exit(1); });
