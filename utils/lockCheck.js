const Lesson = require("../models/Lesson");
const Chapter = require("../models/Chapter");
const Homework = require("../models/Homework");

// A lesson is unlocked for students only when BOTH its own status and its
// parent chapter's status are 'active'. A pending chapter locks everything
// inside it, regardless of the individual lessons' own status.
async function checkLessonLock(lessonId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return { locked: true, reason: "Lesson not found." };

  const chapter = await Chapter.findById(lesson.chapter);
  if (!chapter) return { locked: true, reason: "Chapter not found." };

  if (chapter.status !== "active") {
    return {
      locked: true,
      reason:
        "This chapter is locked and not open yet. Please check back later.",
    };
  }
  if (lesson.status !== "active") {
    return {
      locked: true,
      reason:
        "This lesson is locked and not open yet. Please check back later.",
    };
  }
  return { locked: false, reason: null };
}

async function checkHomeworkLock(homeworkId) {
  const hw = await Homework.findById(homeworkId);
  if (!hw) return { locked: true, reason: "Homework not found." };
  return checkLessonLock(hw.lesson);
}

module.exports = { checkLessonLock, checkHomeworkLock };
