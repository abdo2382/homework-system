const express = require('express');
const Chapter = require('../models/Chapter');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/chapters — any approved user
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { published: true };
  const chapters = await Chapter.find(filter).sort({ order: 1, createdAt: 1 });
  res.json(chapters);
}));

// POST /api/chapters — admin only
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { title, description, order, published, image } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  const chapter = await Chapter.create({ title, description, order: order || 0, published, image });
  res.status(201).json(chapter);
}));

// PUT /api/chapters/:id — admin only
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const chapter = await Chapter.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' });
  res.json(chapter);
}));

// DELETE /api/chapters/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const chapter = await Chapter.findByIdAndDelete(req.params.id);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' });
  res.json({ message: 'Chapter deleted.' });
}));

module.exports = router;
