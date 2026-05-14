const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    // Check if DATABASE_URI exists
    if (!process.env.MONGODB_URI && !process.env.DATABASE_URI) {
      console.error('❌ DATABASE_URI or MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    // Use either MONGODB_URI or DATABASE_URI (for consistency)
    const dbUri = process.env.MONGODB_URI || process.env.DATABASE_URI;

    const conn = await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDatabase;
