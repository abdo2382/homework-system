const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const imageUpload = require('../utils/imageUpload');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

// POST /api/auth/register
// Creates a new account in "pending" status. It cannot log in until an admin approves it.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, grade } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      grade: grade || '',
      role: 'student',
      status: 'pending',
    });

    res.status(201).json({
      message: 'Registration received. An admin needs to approve your account before you can log in.',
      user: { id: user._id, name: user.name, email: user.email, status: user.status },
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is still waiting for admin approval.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your registration was not approved.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
});

// GET /api/auth/me — returns the logged-in user's info
router.get('/me', requireAuth, (req, res) => {
  const { _id, name, email, role, status, avatar } = req.user;
  res.json({ id: _id, name, email, role, status, avatar });
});

// POST /api/auth/avatar — any logged-in (approved) user uploads their own profile picture
router.post(
  '/avatar',
  requireAuth,
  (req, res, next) => {
    imageUpload.single('avatar')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image file received.' });
    const url = '/uploads/' + req.file.filename;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: url }, { new: true });
    res.json({ avatar: user.avatar });
  })
);

module.exports = router;
