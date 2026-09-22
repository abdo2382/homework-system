const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const imageUpload = require('../utils/imageUpload');

const router = express.Router();

function handleUpload(req, res, next) {
  imageUpload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

// POST /api/uploads/image — admin only (used for chapter cover images).
router.post('/image', requireAuth, requireAdmin, handleUpload, asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file received.' });
  res.status(201).json({ url: '/uploads/' + req.file.filename });
}));

module.exports = router;
