const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    order: { type: Number, required: true, default: 0 },
    published: { type: Boolean, default: true },
    image: { type: String, trim: true, default: '' }, // URL/path, e.g. /uploads/xyz.jpg
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chapter', chapterSchema);
