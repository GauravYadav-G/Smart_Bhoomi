const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    // Check environment variables - MONGODB_URI is required
    const dbUri = process.env.MONGODB_URI;
    
    // If no MONGODB_URI, show detailed error
    if (!dbUri) {
      console.error('\n❌ CRITICAL: MONGODB_URI is not configured!');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('\n📝 For Render Production (THIS IS WHAT YOU NEED):');
      console.error('   1. Go to: https://render.com/dashboard');
      console.error('   2. Click: Smart Bhoomi service');
      console.error('   3. Click: Environment tab');
      console.error('   4. Add variable:');
      console.error('      Key: MONGODB_URI');
      console.error('      Value: mongodb+srv://user:pass@cluster.mongodb.net/smart_bhoomi');
      console.error('\n📝 For Local Development:');
      console.error('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
      console.error('   2. Start MongoDB: mongod');
      console.error('   3. In .env, uncomment: MONGODB_URI=mongodb://localhost:27017/property_registry');
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // For production (Render), this is critical
      if (process.env.NODE_ENV === 'production') {
        console.error('⚠️  Application cannot start in production without MONGODB_URI');
        process.exit(1);
      }
      
      // For development, retry after delay
      console.error('⚠️  Retrying connection in 5 seconds...');
      setTimeout(() => connectDatabase(), 5000);
      return;
    }
    
    console.log(`🔗 Connecting to MongoDB: ${dbUri.substring(0, 60)}...`);

    const conn = await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5
    });

    console.log(`✅ MongoDB Connected!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   State: Connected\n`);

    // Auto-seed default admin account if not present
    try {
      const Admin = require('../models/Admin');
      const adminEmail = 'admin@gov.in';
      const existing = await Admin.findOne({ email: adminEmail });
      if (!existing) {
        console.log('📝 Seeding default admin account into database...');
        await Admin.create({
          name: 'Dr. Rajesh Kumar Sharma',
          email: adminEmail,
          password: 'Admin@12345678',
          employeeId: 'GOV-2024-001',
          rank: 'Secretary',
          department: 'Revenue & Land Records',
          jurisdiction: {
            state: 'All India',
            district: '',
            level: 'national'
          },
          clearanceLevel: 5,
          isSuperAdmin: true,
          stats: {
            propertiesVerified: 142,
            transfersApproved: 67,
            fraudsFlagged: 8,
            loginCount: 0
          }
        });
        console.log('✅ Default admin account seeded successfully.');
      }
    } catch (seedError) {
      console.error('⚠️ Failed to auto-seed default admin:', seedError.message);
    }
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack:', error.stack);
    }
    console.error('⚠️  Retrying connection in 5 seconds...');
    setTimeout(() => connectDatabase(), 5000);
  }
};

module.exports = connectDatabase;
