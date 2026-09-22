const express = require("express");
const Chapter = require("../models/Chapter");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const ALLOWED_STATUSES = ["active", "locked"];

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

    // If the frontend didn't send a status, don't silently fall back to the
    // schema default (locked). Explicitly resolve it here so the value we
    // send is always what we intend.
    let resolvedStatus = "active";
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res
          .status(400)
          .json({
            error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
          });
      }
      resolvedStatus = status;
    }

    const chapter = await Chapter.create({
      title,
      description,
      order: order || 0,
      published,
      image,
      status: resolvedStatus,
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
    const { status } = req.body;

    // Guard against an invalid status value overwriting a good one, and
    // avoid blindly trusting req.body for fields we care about.
    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({
          error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
        });
    }

    const chapter = await Chapter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
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
