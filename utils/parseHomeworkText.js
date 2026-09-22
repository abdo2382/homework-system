// Parses a plain-text homework file into { title, instructions, questions[] }.
//
// Format (see public's "Homework file format" help text for the teacher-facing version):
//
//   TITLE: Lesson 3 Homework
//   INSTRUCTIONS: Answer every question.
//
//   TYPE: mcq
//   POINTS: 2
//   TEXT: What is the capital of Egypt?
//   OPTIONS: Cairo | Alexandria | Giza
//   ANSWER: Cairo
//
//   TYPE: true_false
//   POINTS: 1
//   TEXT: The sun rises in the west.
//   ANSWER: false
//
//   TYPE: essay
//   POINTS: 5
//   TEXT: Explain the importance of semantic HTML.
//
// Question blocks are separated by one or more blank lines. TEXT/OPTIONS/ANSWER
// values may wrap onto following lines as long as those lines don't start with
// a recognized KEY: — they're joined with a space.

const KNOWN_KEYS = ['TYPE', 'POINTS', 'TEXT', 'OPTIONS', 'ANSWER', 'TITLE', 'INSTRUCTIONS'];
const VALID_TYPES = ['mcq', 'true_false', 'short_answer', 'essay'];

function parseKeyValueBlock(block) {
  const lines = block.split('\n');
  const data = {};
  let currentKey = null;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (match && KNOWN_KEYS.includes(match[1].toUpperCase())) {
      currentKey = match[1].toUpperCase();
      data[currentKey] = (data[currentKey] ? data[currentKey] + ' ' : '') + match[2].trim();
    } else if (currentKey) {
      // Continuation line for the current key
      data[currentKey] += ' ' + line;
    }
  }
  return data;
}

function parseHomeworkText(rawText) {
  const text = String(rawText || '').replace(/\r\n/g, '\n').trim();
  if (!text) {
    return { title: '', instructions: '', questions: [], errors: ['The file is empty.'] };
  }

  const blocks = text.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const errors = [];
  let title = '';
  let instructions = '';
  const questions = [];

  blocks.forEach((block, blockIndex) => {
    const data = parseKeyValueBlock(block);

    // A header block (only TITLE / INSTRUCTIONS, no TYPE) sets the homework's title
    if (!data.TYPE && (data.TITLE || data.INSTRUCTIONS)) {
      if (data.TITLE) title = data.TITLE;
      if (data.INSTRUCTIONS) instructions = data.INSTRUCTIONS;
      return;
    }

    if (!data.TYPE) {
      errors.push(`Block ${blockIndex + 1}: missing "TYPE:" line — skipped.`);
      return;
    }

    const type = data.TYPE.toLowerCase().trim();
    if (!VALID_TYPES.includes(type)) {
      errors.push(`Block ${blockIndex + 1}: unknown TYPE "${data.TYPE}" — skipped.`);
      return;
    }
    if (!data.TEXT) {
      errors.push(`Block ${blockIndex + 1}: missing "TEXT:" line — skipped.`);
      return;
    }

    const points = data.POINTS ? Number(data.POINTS) : 1;
    const question = {
      type,
      text: data.TEXT,
      points: Number.isFinite(points) && points >= 0 ? points : 1,
      options: [],
      correctAnswer: '',
    };

    if (type === 'mcq') {
      if (!data.OPTIONS) {
        errors.push(`Block ${blockIndex + 1} ("${data.TEXT.slice(0, 40)}…"): mcq needs an "OPTIONS:" line — skipped.`);
        return;
      }
      question.options = data.OPTIONS.split('|').map((o) => o.trim()).filter(Boolean);
      if (question.options.length < 2) {
        errors.push(`Block ${blockIndex + 1}: mcq needs at least 2 options — skipped.`);
        return;
      }
      if (!data.ANSWER) {
        errors.push(`Block ${blockIndex + 1}: mcq needs an "ANSWER:" line — skipped.`);
        return;
      }
      question.correctAnswer = data.ANSWER.trim();
      if (!question.options.some((o) => o.toLowerCase() === question.correctAnswer.toLowerCase())) {
        errors.push(`Block ${blockIndex + 1}: ANSWER "${data.ANSWER}" doesn't match any OPTIONS — added anyway, please check it.`);
      }
    } else if (type === 'true_false') {
      const ans = (data.ANSWER || '').trim().toLowerCase();
      if (ans !== 'true' && ans !== 'false') {
        errors.push(`Block ${blockIndex + 1}: true_false ANSWER must be exactly "true" or "false" — skipped.`);
        return;
      }
      question.correctAnswer = ans;
    } else if (type === 'short_answer') {
      if (!data.ANSWER) {
        errors.push(`Block ${blockIndex + 1}: short_answer needs an "ANSWER:" line — skipped.`);
        return;
      }
      question.correctAnswer = data.ANSWER.trim();
    }
    // essay: no correctAnswer needed

    questions.push(question);
  });

  return { title, instructions, questions, errors };
}

module.exports = { parseHomeworkText };
