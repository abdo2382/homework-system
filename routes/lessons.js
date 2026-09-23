const express = require("express");
const Lesson = require("../models/Lesson");
const Chapter = require("../models/Chapter");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// GET /api/lessons?chapter=<chapterId> — any approved user.
// Non-admins get a 403 if the parent chapter itself is locked ('pending').
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.query.chapter) return res.json([]);

    if (req.user.role !== "admin") {
      const chapter = await Chapter.findById(req.query.chapter);
      if (!chapter || chapter.status !== "active") {
        return res
          .status(403)
          .json({
            error:
              "This chapter is locked and not open yet. Please check back later.",
          });
      }
    }

    const filter = { chapter: req.query.chapter };
    if (req.user.role !== "admin") filter.published = true;
    const lessons = await Lesson.find(filter).sort({ order: 1, createdAt: 1 });
    res.json(lessons);
  }),
);

// GET /api/lessons/:id — a single lesson (used to check/show its status)
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found." });
    res.json(lesson);
  }),
);

// POST /api/lessons — admin only
router.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { chapter, title, description, order, published, status } = req.body;
    if (!chapter || !title) {
      return res.status(400).json({ error: "chapter and title are required." });
    }
    const safeStatus = status === "pending" ? "pending" : "active";
    const lesson = await Lesson.create({
      chapter,
      title,
      description,
      order: order || 0,
      published,
      status: safeStatus,
    });
    res.status(201).json(lesson);
  }),
);

// PUT /api/lessons/:id — admin only
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const update = { ...req.body };
    if (update.status !== "active" && update.status !== "pending") {
      delete update.status;
    }
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!lesson) return res.status(404).json({ error: "Lesson not found." });
    res.json(lesson);
  }),
);

// DELETE /api/lessons/:id — admin only
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found." });
    res.json({ message: "Lesson deleted." });
  }),
);

module.exports = router;
