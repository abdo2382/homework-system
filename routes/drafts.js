const express = require('express');
const Draft = require('../models/Draft');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// GET /api/drafts/:homeworkId — the logged-in student's saved progress, or null
router.get('/:homeworkId', requireAuth, asyncHandler(async (req, res) => {
  const draft = await Draft.findOne({ student: req.user._id, homework: req.params.homeworkId });
  res.json(draft || null);
}));

// PUT /api/drafts/:homeworkId — upsert the student's in-progress answers
// body: { answers: [{ questionId, answerText }] }
router.put('/:homeworkId', requireAuth, asyncHandler(async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers[] is required.' });
  }
  const formatted = answers.map((a) => ({
    question: a.questionId,
    answerText: a.answerText || '',
    studentNote: a.studentNote || '',
  }));

  const draft = await Draft.findOneAndUpdate(
    { student: req.user._id, homework: req.params.homeworkId },
    { $set: { answers: formatted } },
    { new: true, upsert: true }
  );
  res.json(draft);
}));

module.exports = router;
