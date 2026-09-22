const mongoose = require('mongoose');

const draftAnswerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, required: true },
    answerText: { type: String, trim: true, default: '' },
    studentNote: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const draftSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    homework: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true },
    answers: [draftAnswerSchema],
  },
  { timestamps: true }
);

draftSchema.index({ student: 1, homework: 1 }, { unique: true });

module.exports = mongoose.model('Draft', draftSchema);
