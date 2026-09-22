const mongoose = require("mongoose");

// One question inside a homework set.
// type "mcq" / "true_false" / "short_answer" are auto-graded.
// type "essay" is always left for the teacher (Eng. Abdelrahman) to grade manually.
const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "true_false", "short_answer", "essay"],
      required: true,
    },
    text: { type: String, required: true, trim: true },
    points: { type: Number, required: true, default: 1, min: 0 },

    // Used only for "mcq": list of choices shown to the student
    options: [{ type: String, trim: true }],

    // Correct answer, used for auto-grading only:
    // - mcq: exact text of the correct option
    // - true_false: "true" or "false"
    // - short_answer: expected text (matched case-insensitively, trimmed)
    // - essay: not used, always null
    correctAnswer: { type: String, trim: true, default: "" },
  },
  { _id: true },
);

const homeworkSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, trim: true, default: "" },
    questions: [questionSchema],
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Total points available in this homework, computed on the fly
homeworkSchema.virtual("totalPoints").get(function () {
  return (this.questions || []).reduce((sum, q) => sum + (q.points || 0), 0);
});
homeworkSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Homework", homeworkSchema);
