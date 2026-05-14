const mongoose = require('mongoose');
const User = require('./models/User');
const crypto = require('crypto');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/property_registry');
  
  const user = await User.findOne({}).select('+biometricReEnrollOtp +biometricReEnrollOtpExpires +biometricReEnrollOtpAttempts +biometricReEnrollType');
  
  if (user) {
    console.log('User:', user.email);
    console.log('OTP hash exists:', !!user.biometricReEnrollOtp);
    
    // Simulate what verifyBiometricReEnrollOtp does after OTP match
    try {
      user.biometricReEnrollOtp = undefined;
      user.biometricReEnrollOtpExpires = undefined;
      user.biometricReEnrollOtpAttempts = 0;
      
      const reEnrollToken = crypto.randomBytes(32).toString('hex');
      user.biometricReEnrollSessionToken = reEnrollToken;
      user.biometricReEnrollSessionType = 'face';
      user.biometricReEnrollSessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      user.biometricReEnrollSessionVerified = true;
      await user.save();
      console.log('✅ Save succeeded! Token:', reEnrollToken.slice(0, 16) + '...');
    } catch (err) {
      console.error('❌ Save failed:', err.message);
    }
  } else {
    console.log('No users found');
  }
  
  await mongoose.disconnect();
}
test();
