const express = require("express");

const Chapter = require("../models/Chapter");

const { requireAuth, requireAdmin } = require("../middleware/auth");

const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /api/chapters
|--------------------------------------------------------------------------
| Any authenticated user
|
| Admin and normal users can see all chapters.
|
| The "status" field controls whether the chapter
| can be opened:
|
| active  -> can open
| pending -> locked
| locked  -> locked
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Show ALL chapters to authenticated users.
    // Do NOT filter by published.
    const chapters = await Chapter.find({}).sort({
      order: 1,
      createdAt: 1,
    });

    res.json(chapters);
  }),
);

/*
|--------------------------------------------------------------------------
| GET /api/chapters/:id
|--------------------------------------------------------------------------
| Any authenticated user
|
| Returns the chapter including its status:
| active / pending / locked
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const chapter = await Chapter.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        error: "Chapter not found.",
      });
    }

    res.json(chapter);
  }),
);

/*
|--------------------------------------------------------------------------
| POST /api/chapters
|--------------------------------------------------------------------------
| Admin only
|
| Valid statuses:
|   active
|   pending
|   locked
|
| If no valid status is provided, the chapter becomes active.
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { title, description, order, published, image, status } = req.body;

    if (!title) {
      return res.status(400).json({
        error: "Title is required.",
      });
    }

    // Only allow valid chapter statuses.
    const safeStatus = ["active", "pending", "locked"].includes(status)
      ? status
      : "active";

    const chapter = await Chapter.create({
      title,
      description,
      order: order || 0,

      // If frontend doesn't send published,
      // default to true.
      published: published ?? true,

      image,

      status: safeStatus,
    });

    res.status(201).json(chapter);
  }),
);

/*
|--------------------------------------------------------------------------
| PUT /api/chapters/:id
|--------------------------------------------------------------------------
| Admin only
|
| Allows:
|   active
|   pending
|   locked
|
| Invalid status values are ignored.
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const update = { ...req.body };

    // Only allow valid status values.
    if (
      update.status !== "active" &&
      update.status !== "pending" &&
      update.status !== "locked"
    ) {
      delete update.status;
    }

    const chapter = await Chapter.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!chapter) {
      return res.status(404).json({
        error: "Chapter not found.",
      });
    }

    res.json(chapter);
  }),
);

/*
|--------------------------------------------------------------------------
| DELETE /api/chapters/:id
|--------------------------------------------------------------------------
| Admin only
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const chapter = await Chapter.findByIdAndDelete(req.params.id);

    if (!chapter) {
      return res.status(404).json({
        error: "Chapter not found.",
      });
    }

    res.json({
      message: "Chapter deleted.",
    });
  }),
);

module.exports = router;
