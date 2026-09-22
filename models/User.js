const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Optional context an admin can see when reviewing a registration
    grade: { type: String, trim: true, default: '' },
    avatar: { type: String, trim: true, default: '' }, // URL/path, e.g. /uploads/xyz.jpg
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
