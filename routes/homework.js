const express = require("express");
const Homework = require("../models/Homework");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { parseHomeworkText } = require("../utils/parseHomeworkText");
const { checkLessonLock } = require("../utils/lockCheck");

const router = express.Router();

// Strips correct answers before sending a homework to a student
function sanitizeForStudent(homeworkDoc) {
  const hw = homeworkDoc.toObject({ virtuals: true });
  hw.questions = hw.questions.map((q) => {
    const { correctAnswer, ...rest } = q;
    return rest;
  });
  return hw;
}

// GET /api/homework?lesson=<lessonId>
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.query.lesson) return res.json([]);

    if (req.user.role !== "admin") {
      const { locked, reason } = await checkLessonLock(req.query.lesson);
      if (locked) return res.status(403).json({ error: reason });
    }

    const filter = { lesson: req.query.lesson };
    if (req.user.role !== "admin") filter.published = true;
    const list = await Homework.find(filter).sort({ createdAt: 1 });
    const out = req.user.role === "admin" ? list : list.map(sanitizeForStudent);
    res.json(out);
  }),
);

// GET /api/homework/:id — one homework set
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const hw = await Homework.findById(req.params.id);
    if (!hw) return res.status(404).json({ error: "Homework not found." });

    if (req.user.role !== "admin") {
      const { locked, reason } = await checkLessonLock(hw.lesson);
      if (locked) return res.status(403).json({ error: reason });
    }

    res.json(req.user.role === "admin" ? hw : sanitizeForStudent(hw));
  }),
);

// POST /api/homework — admin only
router.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { lesson, title, instructions, questions, published } = req.body;
    if (!lesson || !title) {
      return res.status(400).json({ error: "lesson and title are required." });
    }
    const hw = await Homework.create({
      lesson,
      title,
      instructions,
      questions: questions || [],
      published,
    });
    res.status(201).json(hw);
  }),
);

// PUT /api/homework/:id — admin only
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const hw = await Homework.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!hw) return res.status(404).json({ error: "Homework not found." });
    res.json(hw);
  }),
);

// DELETE /api/homework/:id — admin only
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const hw = await Homework.findByIdAndDelete(req.params.id);
    if (!hw) return res.status(404).json({ error: "Homework not found." });
    res.json({ message: "Homework deleted." });
  }),
);

// POST /api/homework/import — admin only.
// body: { content: "<the text file's contents>", lesson, homeworkId? }
// If homeworkId is given, parsed questions are appended to that homework.
// Otherwise a new homework is created under "lesson", using the file's own
// TITLE/INSTRUCTIONS header if present (falling back to req.body.title).
router.post(
  "/import",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { content, lesson, homeworkId, title: fallbackTitle } = req.body;
    if (!content)
      return res.status(400).json({ error: "No file content received." });

    const parsed = parseHomeworkText(content);
    if (!parsed.questions.length) {
      return res.status(400).json({
        error: "No valid questions were found in this file.",
        details: parsed.errors,
      });
    }

    let hw;
    if (homeworkId) {
      hw = await Homework.findById(homeworkId);
      if (!hw)
        return res.status(404).json({ error: "Target homework not found." });
      hw.questions.push(...parsed.questions);
      await hw.save();
    } else {
      if (!lesson)
        return res
          .status(400)
          .json({ error: "lesson is required when creating a new homework." });
      hw = await Homework.create({
        lesson,
        title: parsed.title || fallbackTitle || "Imported homework",
        instructions: parsed.instructions || "",
        questions: parsed.questions,
      });
    }

    res
      .status(201)
      .json({
        homework: hw,
        imported: parsed.questions.length,
        warnings: parsed.errors,
      });
  }),
);

module.exports = router;
