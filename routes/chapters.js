const express = require("express");
const Chapter = require("../models/Chapter");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

// GET /api/chapters — any approved user
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "admin" ? {} : { published: true };
    const chapters = await Chapter.find(filter).sort({
      order: 1,
      createdAt: 1,
    });
    res.json(chapters);
  }),
);

// GET /api/chapters/:id — any approved user (used by the lessons page to show
// the parent chapter's title/status, e.g. to display a lock banner)
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ error: "Chapter not found." });
    res.json(chapter);
  }),
);

// POST /api/chapters — admin only
router.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { title, description, order, published, image, status } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required." });
    // Only ever lock a chapter if 'pending' was explicitly sent — anything else
    // (missing, null, empty string, a typo) falls back to 'active' instead of
    // silently creating a chapter nobody can enter.
    const safeStatus = status === "pending" ? "pending" : "active";
    const chapter = await Chapter.create({
      title,
      description,
      order: order || 0,
      published,
      image,
      status: safeStatus,
    });
    res.status(201).json(chapter);
  }),
);

// PUT /api/chapters/:id — admin only
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const update = { ...req.body };
    // Ignore an invalid/missing status instead of letting it overwrite a good
    // value with null (e.g. if a client sends an incomplete request body).
    if (update.status !== "active" && update.status !== "pending") {
      delete update.status;
    }
    const chapter = await Chapter.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!chapter) return res.status(404).json({ error: "Chapter not found." });
    res.json(chapter);
  }),
);

// DELETE /api/chapters/:id — admin only
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const chapter = await Chapter.findByIdAndDelete(req.params.id);
    if (!chapter) return res.status(404).json({ error: "Chapter not found." });
    res.json({ message: "Chapter deleted." });
  }),
);

module.exports = router;
