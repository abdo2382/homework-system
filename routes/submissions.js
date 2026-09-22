const express = require('express');
const Homework = require('../models/Homework');
const Submission = require('../models/Submission');
const Draft = require('../models/Draft');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

// POST /api/submissions
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { homework: homeworkId, answers } = req.body;
  if (!homeworkId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'homework and answers[] are required.' });
  }

  const hw = await Homework.findById(homeworkId);
  if (!hw) return res.status(404).json({ error: 'Homework not found.' });

  const existing = await Submission.findOne({ student: req.user._id, homework: hw._id });
  if (existing) {
    return res.status(409).json({ error: 'You already submitted this homework.' });
  }

  const answerByQuestion = new Map(answers.map((a) => [String(a.questionId), a.answerText]));
  const noteByQuestion = new Map(answers.map((a) => [String(a.questionId), a.studentNote || '']));

  let autoScore = 0;
  let totalPoints = 0;
  let hasUngradedEssay = false;

  const gradedAnswers = hw.questions.map((q) => {
    totalPoints += q.points || 0;
    const answerText = answerByQuestion.get(String(q._id)) ?? '';
    const studentNote = noteByQuestion.get(String(q._id)) ?? '';

    if (q.type === 'essay') {
      hasUngradedEssay = true;
      return {
        question: q._id,
        type: q.type,
        answerText,
        isCorrect: null,
        pointsAwarded: 0,
        teacherFeedback: '',
        studentNote,
      };
    }

    const isCorrect = normalize(answerText) === normalize(q.correctAnswer);
    const pointsAwarded = isCorrect ? q.points || 0 : 0;
    autoScore += pointsAwarded;

    return {
      question: q._id,
      type: q.type,
      answerText,
      isCorrect,
      pointsAwarded,
      teacherFeedback: '',
      studentNote,
    };
  });

  try {
    const submission = await Submission.create({
      student: req.user._id,
      homework: hw._id,
      answers: gradedAnswers,
      autoScore,
      manualScore: 0,
      totalPoints,
      status: hasUngradedEssay ? 'pending_review' : 'graded',
      gradedAt: hasUngradedEssay ? null : new Date(),
    });
    // Submitted for real now — the saved draft (if any) is no longer needed.
    await Draft.deleteOne({ student: req.user._id, homework: hw._id });
    res.status(201).json(submission);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You already submitted this homework.' });
    }
    throw err;
  }
}));

// GET /api/submissions/mine
router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const list = await Submission.find({ student: req.user._id })
    .populate('homework', 'title')
    .sort({ submittedAt: -1 });
  res.json(list);
}));

// GET /api/submissions/:id — owner or admin only
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('homework');
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });
  const isOwner = String(submission.student) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not allowed.' });
  }
  res.json(submission);
}));

module.exports = router;
