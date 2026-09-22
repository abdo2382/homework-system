const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    order: { type: Number, required: true, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lesson', lessonSchema);
