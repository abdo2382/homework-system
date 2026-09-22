const express = require('express');
const Lesson = require('../models/Lesson');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/lessons?chapter=<chapterId> — any approved user
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (!req.query.chapter) return res.json([]);
  const filter = { chapter: req.query.chapter };
  if (req.user.role !== 'admin') filter.published = true;
  const lessons = await Lesson.find(filter).sort({ order: 1, createdAt: 1 });
  res.json(lessons);
}));

// POST /api/lessons — admin only
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { chapter, title, description, order, published } = req.body;
  if (!chapter || !title) {
    return res.status(400).json({ error: 'chapter and title are required.' });
  }
  const lesson = await Lesson.create({ chapter, title, description, order: order || 0, published });
  res.status(201).json(lesson);
}));

// PUT /api/lessons/:id — admin only
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  res.json(lesson);
}));

// DELETE /api/lessons/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByIdAndDelete(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
  res.json({ message: 'Lesson deleted.' });
}));

module.exports = router;
