const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, required: true }, // question._id inside Homework.questions
    type: { type: String, enum: ['mcq', 'true_false', 'short_answer', 'essay'], required: true },
    answerText: { type: String, trim: true, default: '' },

    // Filled automatically for mcq / true_false / short_answer
    isCorrect: { type: Boolean, default: null },
    pointsAwarded: { type: Number, default: 0 },

    // Filled by the teacher only for essay questions
    teacherFeedback: { type: String, trim: true, default: '' },

    // Optional note the student can leave on a question ("this seems unclear", etc.)
    studentNote: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    homework: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true },
    answers: [answerSchema],

    autoScore: { type: Number, default: 0 }, // sum of auto-graded points
    manualScore: { type: Number, default: 0 }, // sum of essay points given by teacher
    totalPoints: { type: Number, default: 0 }, // total points possible in the homework

    // "pending_review": contains essay question(s) not yet graded by the teacher
    // "graded": everything (including essays) has been graded
    status: { type: String, enum: ['pending_review', 'graded'], default: 'pending_review' },

    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A student can submit each homework only once
submissionSchema.index({ student: 1, homework: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
