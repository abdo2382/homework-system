const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    order: {
      type: Number,
      required: true,
      default: 0,
    },

    published: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Chapter Status
    |--------------------------------------------------------------------------
    |
    | active  -> students can open the chapter
    |
    | pending -> students can see the chapter,
    |            but they cannot enter it
    |
    | locked  -> chapter is locked
    |
    */

    status: {
      type: String,
      enum: ["active", "pending", "locked"],
      default: "active",
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Chapter", chapterSchema);
