/**
 * Seed a demo admin account for the Command Center
 * Run: node seed-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDatabase = require('./config/database');

async function seedAdmin() {
  await connectDatabase();

  const existing = await Admin.findOne({ email: 'admin@gov.in' });
  if (existing) {
    console.log('✅ Demo admin already exists:', existing.email);
    console.log('   Employee ID:', existing.employeeId);
    console.log('   Rank:', existing.rank);
    console.log('   MFA Setup:', existing.mfaSetupCompleted ? 'Complete' : 'Pending (will be prompted on first login)');
    process.exit(0);
  }

  const admin = await Admin.create({
    name: 'Dr. Rajesh Kumar Sharma',
    email: 'admin@gov.in',
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
    trustScore: 85,
    stats: {
      propertiesVerified: 142,
      transfersApproved: 67,
      fraudsFlagged: 8,
      loginCount: 0
    }
  });

  console.log('\n🏛️  ════════════════════════════════════');
  console.log('   ADMIN ACCOUNT CREATED');
  console.log('   ════════════════════════════════════');
  console.log(`   Name:        ${admin.name}`);
  console.log(`   Email:       ${admin.email}`);
  console.log(`   Password:    Admin@12345678`);
  console.log(`   Employee ID: ${admin.employeeId}`);
  console.log(`   Rank:        ${admin.rank}`);
  console.log(`   Clearance:   Level ${admin.clearanceLevel}`);
  console.log(`   MFA:         Will be set up on first login`);
  console.log('   ════════════════════════════════════\n');

  process.exit(0);
}

seedAdmin().catch(err => { console.error(err); process.exit(1); });
