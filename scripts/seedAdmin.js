// Run once with: npm run seed:admin
// Creates (or updates) the single admin account, using values from .env
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

async function run() {
  await connectDB();

  const name = process.env.ADMIN_NAME || 'Admin';
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = 'admin';
    existing.status = 'approved';
    existing.name = name;
    await existing.save();
    console.log(`Admin account updated: ${email}`);
  } else {
    await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      status: 'approved',
    });
    console.log(`Admin account created: ${email}`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
