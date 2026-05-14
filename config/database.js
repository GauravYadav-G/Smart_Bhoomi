const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    // Check if DATABASE_URI exists
    if (!process.env.MONGODB_URI && !process.env.DATABASE_URI) {
      console.error('❌ MONGODB_URI or DATABASE_URI is not defined in environment variables');
      console.error('📝 Set MONGODB_URI in Render environment variables or .env file');
      process.exit(1);
    }

    // Use MONGODB_URI (standard MongoDB connection string)
    const dbUri = process.env.MONGODB_URI || process.env.DATABASE_URI;
    
    console.log(`🔗 Connecting to MongoDB: ${dbUri.substring(0, 50)}...`);

    const conn = await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    console.error('Stack:', error.stack);
    // Don't exit immediately - allow server to start but with errors
    console.error('⚠️  Retrying connection in 5 seconds...');
    setTimeout(() => connectDatabase(), 5000);
  }
};

module.exports = connectDatabase;
