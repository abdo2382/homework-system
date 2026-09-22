const express = require('express');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users?status=pending|approved|rejected  (default: pending)
router.get('/users', asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  const users = await User.find({ status }).select('-passwordHash').sort({ createdAt: -1 });
  res.json(users);
}));

// POST /api/admin/users/:id/approve
router.post('/users/:id/approve', asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'approved' },
    { new: true }
  ).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
}));

// POST /api/admin/users/:id/reject
router.post('/users/:id/reject', asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected' },
    { new: true }
  ).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
}));

// GET /api/admin/submissions?status=pending_review|graded&homework=<id>&student=<id>
router.get('/submissions', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.homework) filter.homework = req.query.homework;
  if (req.query.student) filter.student = req.query.student;
  const submissions = await Submission.find(filter)
    .populate('student', 'name email avatar')
    .populate('homework', 'title')
    .sort({ submittedAt: -1 });
  res.json(submissions);
}));

// GET /api/admin/submissions/:id — full detail of one submission, for grading.
router.get('/submissions/:id', asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('student', 'name email avatar')
    .populate('homework');
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });
  res.json(submission);
}));

// POST /api/admin/submissions/:id/grade
// body: { grades: [{ questionId, points, feedback }] }  — one entry per essay question
router.post('/submissions/:id/grade', asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('homework');
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });

  const { grades } = req.body;
  if (!Array.isArray(grades)) {
    return res.status(400).json({ error: '"grades" must be an array.' });
  }

  const questionById = new Map(submission.homework.questions.map((q) => [String(q._id), q]));

  let manualScore = 0;
  submission.answers = submission.answers.map((answer) => {
    if (answer.type !== 'essay') {
      return answer;
    }
    const grade = grades.find((g) => String(g.questionId) === String(answer.question));
    if (grade) {
      const q = questionById.get(String(answer.question));
      const max = q ? q.points : 0;
      const points = Math.max(0, Math.min(Number(grade.points) || 0, max));
      answer.pointsAwarded = points;
      answer.isCorrect = points >= max;
      answer.teacherFeedback = grade.feedback || '';
    }
    manualScore += answer.pointsAwarded || 0;
    return answer;
  });

  submission.manualScore = manualScore;
  submission.status = 'graded';
  submission.gradedAt = new Date();
  await submission.save();

  res.json(submission);
}));

module.exports = router;
