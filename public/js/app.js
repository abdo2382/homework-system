/* ---------------------------------------------------------------------
   Eng. Abdelrahman Alaa — Homework System
   Small hash-router SPA. No build step, no framework.
--------------------------------------------------------------------- */

const state = { user: null };
const app = document.getElementById('app');
const topnav = document.getElementById('topnav');

/* ---------------- helpers ---------------- */

function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstElementChild;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function alertBox(message, kind = 'error') {
  return `<div class="alert alert-${kind}">${escapeHtml(message)}</div>`;
}

function go(hash) { window.location.hash = hash; }

/* ---------------- nav ---------------- */

function renderNav() {
  const path = location.hash.slice(1) || '/';
  const link = (href, label) =>
    `<a href="#${href}" class="${path === href ? 'active' : ''}">${label}</a>`;

  if (!state.user) {
    topnav.innerHTML = link('/login', 'Log in') + link('/register', 'Register');
    return;
  }

  let links = '';
  if (state.user.role === 'admin') {
    links += link('/admin', 'Pending') + link('/admin/content', 'Content') + link('/admin/grading', 'Grading') + link('/admin/results', 'Results');
  } else {
    links += link('/chapters', 'Chapters') + link('/results', 'My results');
  }
  links += link('/profile', 'Profile');
  const avatarImg = state.user.avatar
    ? `<img src="${escapeHtml(state.user.avatar)}" class="nav-avatar" alt="" />`
    : `<span class="nav-avatar nav-avatar-empty">${escapeHtml(state.user.name.slice(0, 1).toUpperCase())}</span>`;
  topnav.innerHTML = links + avatarImg + `<button id="logoutBtn">Log out</button>`;
  document.getElementById('logoutBtn').onclick = () => {
    Api.clearToken();
    state.user = null;
    go('/login');
  };
}

/* ---------------- auth views ---------------- */

function viewLogin() {
  app.innerHTML = '';
  app.appendChild(el(`
    <div class="view">
      <p class="eyebrow">Welcome back</p>
      <h1>Log in</h1>
      <div class="card">
        <div id="loginAlert"></div>
        <form id="loginForm">
          <div class="field"><label>Email</label><input type="email" name="email" required /></div>
          <div class="field"><label>Password</label><input type="password" name="password" required /></div>
          <button class="btn btn-accent" type="submit">Log in</button>
        </form>
      </div>
      <p class="muted">No account yet? <a href="#/register">Register here</a> — an admin will need to approve it first.</p>
    </div>
  `));

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const alertDiv = document.getElementById('loginAlert');
    alertDiv.innerHTML = '';
    try {
      const data = await Api.post('/auth/login', {
        email: fd.get('email'),
        password: fd.get('password'),
      });
      Api.setToken(data.token);
      state.user = data.user;
      go(data.user.role === 'admin' ? '/admin' : '/chapters');
      renderNav();
    } catch (err) {
      alertDiv.innerHTML = alertBox(err.message);
    }
  });
}

function viewRegister() {
  app.innerHTML = '';
  app.appendChild(el(`
    <div class="view">
      <p class="eyebrow">First time here</p>
      <h1>Create an account</h1>
      <div class="card">
        <div id="regAlert"></div>
        <form id="regForm">
          <div class="field"><label>Full name</label><input type="text" name="name" required /></div>
          <div class="field"><label>Email</label><input type="email" name="email" required /></div>
          <div class="field"><label>Password</label><input type="password" name="password" minlength="6" required /></div>
          <div class="field"><label>Grade / class (optional)</label><input type="text" name="grade" /></div>
          <button class="btn btn-accent" type="submit">Register</button>
        </form>
      </div>
      <p class="muted">Already have an account? <a href="#/login">Log in</a></p>
    </div>
  `));

  document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const alertDiv = document.getElementById('regAlert');
    alertDiv.innerHTML = '';
    try {
      await Api.post('/auth/register', {
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password'),
        grade: fd.get('grade'),
      });
      alertDiv.innerHTML = alertBox(
        'Registration received. You can log in once an admin approves your account.',
        'success'
      );
      e.target.reset();
    } catch (err) {
      alertDiv.innerHTML = alertBox(err.message);
    }
  });
}

/* ---------------- student: chapters / lessons / homework ---------------- */

async function viewChapters() {
  app.innerHTML = `<div class="view-wide"><h1>Chapters</h1><div id="list" class="chapter-grid"></div></div>`;
  const list = document.getElementById('list');
  try {
    const chapters = await Api.get('/chapters');
    if (!chapters.length) {
      list.innerHTML = `<div class="empty-state">No chapters have been posted yet.</div>`;
      return;
    }
    list.innerHTML = chapters.map((c) => `
      <a class="chapter-cover-card" href="#/chapters/${c._id}">
        ${c.image
          ? `<div class="chapter-cover" style="background-image:url('${escapeHtml(c.image)}')"></div>`
          : `<div class="chapter-cover chapter-cover-empty">${escapeHtml(c.title.slice(0, 1).toUpperCase())}</div>`}
        <div class="chapter-cover-body">
          <div class="item-title">${escapeHtml(c.title)}</div>
          ${c.description ? `<div class="item-meta">${escapeHtml(c.description)}</div>` : ''}
        </div>
      </a>
    `).join('');
  } catch (err) {
    list.innerHTML = alertBox(err.message);
  }
}

async function viewLessons(chapterId) {
  app.innerHTML = `<div class="view-wide"><p class="eyebrow"><a href="#/chapters">← Chapters</a></p><h1>Lessons</h1><div id="list" class="list"></div></div>`;
  const list = document.getElementById('list');
  try {
    const lessons = await Api.get('/lessons?chapter=' + chapterId);
    if (!lessons.length) {
      list.innerHTML = `<div class="empty-state">No lessons in this chapter yet.</div>`;
      return;
    }
    list.innerHTML = lessons.map((l) => `
      <a class="item-link" href="#/lessons/${l._id}">
        <div class="item-title">${escapeHtml(l.title)}</div>
        ${l.description ? `<div class="item-meta">${escapeHtml(l.description)}</div>` : ''}
      </a>
    `).join('');
  } catch (err) {
    list.innerHTML = alertBox(err.message);
  }
}

async function viewHomeworkList(lessonId) {
  app.innerHTML = `<div class="view-wide"><p class="eyebrow"><a href="#/chapters">← Chapters</a></p><h1>Homework</h1><div id="list" class="list"></div></div>`;
  const list = document.getElementById('list');
  try {
    const [homeworks, mine] = await Promise.all([
      Api.get('/homework?lesson=' + lessonId),
      Api.get('/submissions/mine'),
    ]);
    const doneIds = new Set(mine.map((s) => s.homework && (s.homework._id || s.homework)));
    if (!homeworks.length) {
      list.innerHTML = `<div class="empty-state">No homework posted for this lesson yet.</div>`;
      return;
    }
    list.innerHTML = homeworks.map((h) => {
      const done = doneIds.has(h._id);
      return `
        <a class="item-link" href="#/homework/${h._id}">
          <div class="card-row">
            <div>
              <div class="item-title">${escapeHtml(h.title)}</div>
              <div class="item-meta">${h.questions.length} question${h.questions.length === 1 ? '' : 's'} · ${h.totalPoints} point${h.totalPoints === 1 ? '' : 's'}</div>
            </div>
            ${done ? '<span class="badge badge-approved">Submitted</span>' : ''}
          </div>
        </a>`;
    }).join('');
  } catch (err) {
    list.innerHTML = alertBox(err.message);
  }
}

async function viewHomeworkTake(homeworkId) {
  app.innerHTML = `<div class="view"><div id="content">Loading…</div></div>`;
  const content = document.getElementById('content');

  try {
    const mine = await Api.get('/submissions/mine');
    const existing = mine.find((s) => (s.homework._id || s.homework) === homeworkId);
    if (existing) {
      return renderSubmissionResult(await Api.get('/submissions/' + existing._id));
    }

    const [hw, draft] = await Promise.all([
      Api.get('/homework/' + homeworkId),
      Api.get('/drafts/' + homeworkId).catch(() => null),
    ]);
    const savedAnswers = new Map((draft && draft.answers ? draft.answers : []).map((a) => [String(a.question), a.answerText]));
    const savedNotes = new Map((draft && draft.answers ? draft.answers : []).map((a) => [String(a.question), a.studentNote]));

    content.innerHTML = `
      <p class="eyebrow"><a href="#/chapters">← Chapters</a></p>
      <h1>${escapeHtml(hw.title)}</h1>
      ${hw.instructions ? `<p>${escapeHtml(hw.instructions)}</p>` : ''}
      ${draft ? `<div class="alert alert-success">Picking up where you left off — your saved answers are filled in below.</div>` : ''}
      <div id="hwAlert"></div>
      <form id="hwForm" class="card">
        ${hw.questions.map((q, i) => renderQuestionInput(q, i, savedAnswers.get(String(q._id)), savedNotes.get(String(q._id)))).join('')}
        <div class="mt-16" style="display:flex;gap:10px;">
          <button class="btn btn-secondary" type="button" id="saveProgressBtn">Save progress</button>
          <button class="btn btn-accent" type="submit">Submit homework</button>
        </div>
      </form>
    `;

    function collectAnswers() {
      const fd = new FormData(document.getElementById('hwForm'));
      return hw.questions.map((q) => ({
        questionId: q._id,
        answerText: fd.get('q_' + q._id) || '',
        studentNote: fd.get('note_' + q._id) || '',
      }));
    }

    document.getElementById('saveProgressBtn').addEventListener('click', async () => {
      const alertDiv = document.getElementById('hwAlert');
      try {
        await Api.put('/drafts/' + homeworkId, { answers: collectAnswers() });
        alertDiv.innerHTML = alertBox('Progress saved — come back anytime to finish.', 'success');
      } catch (err) {
        alertDiv.innerHTML = alertBox(err.message);
      }
    });

    document.getElementById('hwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const answers = collectAnswers();
      const unanswered = answers.filter((a) => !a.answerText.trim()).length;
      if (unanswered > 0 && !confirm(`${unanswered} question(s) are still blank. Submit anyway? You can't change answers after submitting.`)) {
        return;
      }
      const alertDiv = document.getElementById('hwAlert');
      try {
        const submission = await Api.post('/submissions', { homework: hw._id, answers });
        renderSubmissionResult(submission, hw);
      } catch (err) {
        alertDiv.innerHTML = alertBox(err.message);
      }
    });
  } catch (err) {
    content.innerHTML = alertBox(err.message);
  }
}

function renderQuestionInput(q, i, savedValue, savedNote) {
  const saved = savedValue || '';
  const note = savedNote || '';
  const points = `<span class="question-points">${q.points} pt${q.points === 1 ? '' : 's'}</span>`;
  let input = '';
  if (q.type === 'mcq') {
    input = q.options.map((opt) => `
      <label class="option-row">
        <input type="radio" name="q_${q._id}" value="${escapeHtml(opt)}" ${opt === saved ? 'checked' : ''} />
        ${escapeHtml(opt)}
      </label>`).join('');
  } else if (q.type === 'true_false') {
    input = `
      <label class="option-row"><input type="radio" name="q_${q._id}" value="true" ${saved === 'true' ? 'checked' : ''} /> True</label>
      <label class="option-row"><input type="radio" name="q_${q._id}" value="false" ${saved === 'false' ? 'checked' : ''} /> False</label>`;
  } else if (q.type === 'short_answer') {
    input = `<div class="field"><input type="text" name="q_${q._id}" value="${escapeHtml(saved)}" /></div>`;
  } else {
    input = `<div class="field"><textarea name="q_${q._id}" placeholder="Write your answer…">${escapeHtml(saved)}</textarea></div>`;
  }
  return `
    <div class="question">
      <div class="question-head">
        <strong>${i + 1}. ${escapeHtml(q.text)}</strong>
        ${points}
      </div>
      ${input}
      <details class="note-field">
        <summary>Have a note or issue with this question? (optional)</summary>
        <textarea name="note_${q._id}" placeholder="e.g. this question seems unclear, or two options look correct…">${escapeHtml(note)}</textarea>
      </details>
    </div>`;
}

function renderSubmissionResult(submission, hwFallback) {
  const hw = submission.homework && submission.homework.questions ? submission.homework : hwFallback;
  const scoreLine = submission.status === 'graded'
    ? `<strong>${submission.autoScore + submission.manualScore} / ${submission.totalPoints}</strong> points`
    : `Auto-graded so far: <strong>${submission.autoScore} / ${submission.totalPoints}</strong> — an essay question is waiting for the teacher's review.`;

  const rows = (hw && hw.questions ? hw.questions : []).map((q) => {
    const ans = submission.answers.find((a) => String(a.question) === String(q._id));
    if (!ans) return '';
    let mark = '';
    if (ans.type === 'essay') {
      mark = ans.isCorrect === null
        ? `<div class="result-mark result-pending">Waiting for teacher review</div>`
        : `<div class="result-mark result-correct">Graded: ${ans.pointsAwarded}/${q.points}${ans.teacherFeedback ? ' — ' + escapeHtml(ans.teacherFeedback) : ''}</div>`;
    } else {
      mark = ans.isCorrect
        ? `<div class="result-mark result-correct">Correct (${ans.pointsAwarded}/${q.points})</div>`
        : `<div class="result-mark result-incorrect">Incorrect (0/${q.points})${q.correctAnswer ? ' — correct answer: ' + escapeHtml(q.correctAnswer) : ''}</div>`;
    }
    return `
      <div class="question">
        <div class="question-head"><strong>${escapeHtml(q.text)}</strong></div>
        <div class="muted">Your answer: ${escapeHtml(ans.answerText) || '<em>(blank)</em>'}</div>
        ${mark}
        ${ans.studentNote ? `<div class="student-note-box">📝 Your note: ${escapeHtml(ans.studentNote)}</div>` : ''}
      </div>`;
  }).join('');

  app.innerHTML = `
    <div class="view">
      <p class="eyebrow"><a href="#/chapters">← Chapters</a></p>
      <h1>${hw ? escapeHtml(hw.title) : 'Submission'}</h1>
      <div class="card">
        <p>${scoreLine}</p>
        ${rows}
      </div>
    </div>`;
}

async function viewResults() {
  app.innerHTML = `<div class="view-wide"><h1>My results</h1><div id="list" class="list"></div></div>`;
  const list = document.getElementById('list');
  try {
    const subs = await Api.get('/submissions/mine');
    if (!subs.length) {
      list.innerHTML = `<div class="empty-state">You haven't submitted any homework yet.</div>`;
      return;
    }
    list.innerHTML = subs.map((s) => `
      <a class="item-link" href="#/homework/${s.homework._id || s.homework}">
        <div class="card-row">
          <div class="item-title">${escapeHtml(s.homework.title || 'Homework')}</div>
          <span class="badge badge-${s.status === 'graded' ? 'graded' : 'pending'}">
            ${s.status === 'graded' ? (s.autoScore + s.manualScore) + '/' + s.totalPoints : 'Pending review'}
          </span>
        </div>
      </a>`).join('');
  } catch (err) {
    list.innerHTML = alertBox(err.message);
  }
}

/* ---------------- admin: pending users ---------------- */

async function viewAdminPending() {
  app.innerHTML = `<div class="view-wide"><h1>Pending registrations</h1><div id="list" class="list"></div></div>`;
  const list = document.getElementById('list');
  await loadPendingUsers(list);
}

async function loadPendingUsers(list) {
  try {
    const users = await Api.get('/admin/users?status=pending');
    if (!users.length) {
      list.innerHTML = `<div class="empty-state">No pending registrations right now.</div>`;
      return;
    }
    list.innerHTML = users.map((u) => `
      <div class="card card-row">
        <div>
          <div class="item-title">${escapeHtml(u.name)}</div>
          <div class="item-meta">${escapeHtml(u.email)}${u.grade ? ' · ' + escapeHtml(u.grade) : ''}</div>
        </div>
        <div>
          <button class="btn btn-secondary btn-small" data-action="reject" data-id="${u._id}">Reject</button>
          <button class="btn btn-accent btn-small" data-action="approve" data-id="${u._id}">Approve</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await Api.post(`/admin/users/${btn.dataset.id}/${btn.dataset.action}`);
          await loadPendingUsers(list);
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    list.innerHTML = alertBox(err.message);
  }
}

/* ---------------- admin: content management ---------------- */

async function viewAdminContent() {
  app.innerHTML = `
    <div class="view-wide">
      <h1>Content</h1>
      <p class="muted">Add chapters, then lessons inside each chapter, then homework inside each lesson.</p>
      <div class="card">
        <h3>New chapter</h3>
        <form id="chapterForm">
          <div class="field"><label>Title</label><input type="text" name="title" required /></div>
          <div class="field"><label>Description</label><input type="text" name="description" /></div>
          <div class="field">
            <label>Chapter image (optional)</label>
            <input type="file" name="imageFile" accept="image/*" id="chapterImageInput" />
            <img id="chapterImagePreview" class="image-preview" style="display:none" />
          </div>
          <div id="chapterFormAlert"></div>
          <button class="btn btn-accent btn-small" type="submit">Add chapter</button>
        </form>
      </div>
      <div id="chapterList" class="list"></div>
    </div>`;

  const imgInput = document.getElementById('chapterImageInput');
  const imgPreview = document.getElementById('chapterImagePreview');
  imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (!file) { imgPreview.style.display = 'none'; return; }
    imgPreview.src = URL.createObjectURL(file);
    imgPreview.style.display = 'block';
  });

  document.getElementById('chapterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const alertDiv = document.getElementById('chapterFormAlert');
    alertDiv.innerHTML = '';
    try {
      let image = '';
      const file = imgInput.files[0];
      if (file) {
        const uploaded = await Api.uploadFile('/uploads/image', file, 'image');
        image = uploaded.url;
      }
      await Api.post('/chapters', { title: fd.get('title'), description: fd.get('description'), image });
      e.target.reset();
      imgPreview.style.display = 'none';
      loadAdminChapters();
    } catch (err) {
      alertDiv.innerHTML = alertBox(err.message);
    }
  });

  loadAdminChapters();
}

async function loadAdminChapters() {
  const box = document.getElementById('chapterList');
  const chapters = await Api.get('/chapters');
  if (!chapters.length) {
    box.innerHTML = `<div class="empty-state">No chapters yet — add one above.</div>`;
    return;
  }
  box.innerHTML = chapters.map((c) => `
    <div class="card">
      <div class="card-row">
        <div style="display:flex;align-items:center;gap:14px;">
          ${c.image ? `<img class="chapter-thumb" src="${escapeHtml(c.image)}" alt="" />` : ''}
          <h3 style="margin:0">${escapeHtml(c.title)}</h3>
        </div>
        <button class="btn btn-danger btn-small" data-del-chapter="${c._id}">Delete chapter</button>
      </div>
      ${c.description ? `<p>${escapeHtml(c.description)}</p>` : ''}
      <div id="lessons-${c._id}"></div>
      <details class="mt-16">
        <summary class="muted">Add a lesson to this chapter</summary>
        <form class="lesson-form mt-16" data-chapter="${c._id}">
          <div class="field"><label>Lesson title</label><input type="text" name="title" required /></div>
          <button class="btn btn-secondary btn-small" type="submit">Add lesson</button>
        </form>
      </details>
    </div>`).join('');

  chapters.forEach((c) => loadAdminLessons(c._id));

  box.querySelectorAll('.lesson-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      await Api.post('/lessons', { chapter: form.dataset.chapter, title: fd.get('title') });
      form.reset();
      loadAdminLessons(form.dataset.chapter);
    });
  });

  box.querySelectorAll('[data-del-chapter]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this chapter and its content reference? Lessons inside it will be orphaned.')) return;
      await Api.del('/chapters/' + btn.dataset.delChapter);
      loadAdminChapters();
    });
  });
}

async function loadAdminLessons(chapterId) {
  const box = document.getElementById('lessons-' + chapterId);
  if (!box) return;
  const lessons = await Api.get('/lessons?chapter=' + chapterId);
  box.innerHTML = lessons.length
    ? `<div class="list mt-16">` + lessons.map((l) => `
        <div class="item-link" style="display:flex;justify-content:space-between;align-items:center;">
          <span>${escapeHtml(l.title)}</span>
          <span>
            <a class="btn btn-secondary btn-small" href="#/admin/lessons/${l._id}">Manage homework</a>
            <button class="btn btn-danger btn-small" data-del-lesson="${l._id}" data-chapter="${chapterId}">Delete</button>
          </span>
        </div>`).join('') + `</div>`
    : `<p class="muted">No lessons yet.</p>`;

  box.querySelectorAll('[data-del-lesson]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this lesson?')) return;
      await Api.del('/lessons/' + btn.dataset.delLesson);
      loadAdminLessons(btn.dataset.chapter);
    });
  });
}

const HOMEWORK_FILE_FORMAT_HELP = `Write one block per question, separated by a blank line. Example:

TITLE: Lesson 3 Homework
INSTRUCTIONS: Answer every question.

TYPE: mcq
POINTS: 2
TEXT: What is the capital of Egypt?
OPTIONS: Cairo | Alexandria | Giza
ANSWER: Cairo

TYPE: true_false
POINTS: 1
TEXT: The sun rises in the west.
ANSWER: false

TYPE: short_answer
POINTS: 2
TEXT: What does HTML stand for?
ANSWER: HyperText Markup Language

TYPE: essay
POINTS: 5
TEXT: Explain the importance of semantic HTML.

TYPE must be mcq, true_false, short_answer or essay. ANSWER is skipped for essay questions — those are always graded by you. TITLE/INSTRUCTIONS at the top are optional and only used when creating a brand-new homework.`;

async function viewAdminLesson(lessonId) {
  app.innerHTML = `
    <div class="view-wide">
      <p class="eyebrow"><a href="#/admin/content">← Content</a></p>
      <h1>Homework in this lesson</h1>

      <div class="card">
        <h3>New homework (manual)</h3>
        <form id="hwMetaForm">
          <div class="field"><label>Title</label><input type="text" name="title" required /></div>
          <div class="field"><label>Instructions (optional)</label><input type="text" name="instructions" /></div>
          <button class="btn btn-accent btn-small" type="submit">Create homework</button>
        </form>
      </div>

      <div class="card">
        <h3>Import questions from a file</h3>
        <p class="muted">Upload a plain-text (.txt) file and the questions inside it — multiple choice, true/false, short answer, or essay — get turned into a homework automatically. No need to add each question by hand.</p>
        <details>
          <summary class="muted">File format (click to see an example)</summary>
          <pre style="white-space:pre-wrap;font-size:0.85rem;background:var(--paper);padding:12px;border-radius:8px;margin-top:10px;">${escapeHtml(HOMEWORK_FILE_FORMAT_HELP)}</pre>
        </details>
        <form id="importForm" class="mt-16">
          <div class="field"><label>Choose file (.txt)</label><input type="file" name="file" accept=".txt,text/plain" id="importFileInput" required /></div>
          <div class="field">
            <label>Import into</label>
            <select name="target" id="importTarget">
              <option value="new">A new homework</option>
            </select>
          </div>
          <div class="field" id="newTitleField"><label>New homework title (used if the file has no TITLE:)</label><input type="text" name="title" placeholder="e.g. Lesson 3 Homework" /></div>
          <div id="importAlert"></div>
          <button class="btn btn-secondary btn-small" type="submit">Import</button>
        </form>
      </div>

      <div id="hwList" class="list"></div>
    </div>`;

  document.getElementById('hwMetaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await Api.post('/homework', { lesson: lessonId, title: fd.get('title'), instructions: fd.get('instructions'), questions: [] });
    e.target.reset();
    loadAdminHomeworkList(lessonId);
  });

  document.getElementById('importForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const alertDiv = document.getElementById('importAlert');
    alertDiv.innerHTML = '';
    const file = document.getElementById('importFileInput').files[0];
    if (!file) return;

    try {
      const content = await file.text();
      const target = fd.get('target');
      const payload = { content };
      if (target === 'new') {
        payload.lesson = lessonId;
        payload.title = fd.get('title');
      } else {
        payload.homeworkId = target;
      }
      const result = await Api.post('/homework/import', payload);
      let msg = `Imported ${result.imported} question${result.imported === 1 ? '' : 's'}.`;
      if (result.warnings && result.warnings.length) {
        msg += ' Some lines needed attention: ' + result.warnings.join(' ');
      }
      alertDiv.innerHTML = alertBox(msg, 'success');
      e.target.reset();
      loadAdminHomeworkList(lessonId);
    } catch (err) {
      alertDiv.innerHTML = alertBox(err.message + (err.details ? ' ' + err.details.join(' ') : ''));
    }
  });

  loadAdminHomeworkList(lessonId);
}

async function loadAdminHomeworkList(lessonId) {
  const box = document.getElementById('hwList');
  const list = await Api.get('/homework?lesson=' + lessonId);

  const targetSelect = document.getElementById('importTarget');
  if (targetSelect) {
    const current = targetSelect.value;
    targetSelect.innerHTML = `<option value="new">A new homework</option>` +
      list.map((h) => `<option value="${h._id}">Add to: ${escapeHtml(h.title)}</option>`).join('');
    if ([...targetSelect.options].some((o) => o.value === current)) targetSelect.value = current;
    targetSelect.onchange = () => {
      document.getElementById('newTitleField').style.display = targetSelect.value === 'new' ? '' : 'none';
    };
  }

  box.innerHTML = list.length
    ? list.map((h) => `
        <div class="card">
          <div class="card-row">
            <div>
              <div class="item-title">${escapeHtml(h.title)}</div>
              <div class="item-meta">${h.questions.length} question${h.questions.length === 1 ? '' : 's'}</div>
            </div>
            <div>
              <button class="btn btn-danger btn-small" data-del-hw="${h._id}">Delete</button>
            </div>
          </div>
          <div id="q-${h._id}"></div>
          <details class="mt-16">
            <summary class="muted">Add a question</summary>
            <form class="q-form mt-16" data-hw="${h._id}">
              <div class="field">
                <label>Type</label>
                <select name="type">
                  <option value="mcq">Multiple choice (auto-graded)</option>
                  <option value="true_false">True / False (auto-graded)</option>
                  <option value="short_answer">Short answer (auto-graded)</option>
                  <option value="essay">Essay (graded by you)</option>
                </select>
              </div>
              <div class="field"><label>Question text</label><textarea name="text" required></textarea></div>
              <div class="field"><label>Points</label><input type="number" name="points" value="1" min="0" required /></div>
              <div class="field"><label>Options (for multiple choice — one per line)</label><textarea name="options" placeholder="Option A&#10;Option B&#10;Option C"></textarea></div>
              <div class="field"><label>Correct answer (skip for essay)</label><input type="text" name="correctAnswer" placeholder="e.g. Option A, true/false, or exact short answer" /></div>
              <button class="btn btn-secondary btn-small" type="submit">Add question</button>
            </form>
          </details>
        </div>`).join('')
    : `<div class="empty-state">No homework yet — create one above.</div>`;

  list.forEach((h) => renderAdminQuestions(h));

  box.querySelectorAll('.q-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const hwId = form.dataset.hw;
      const hw = await Api.get('/homework/' + hwId);
      const options = String(fd.get('options') || '').split('\n').map((s) => s.trim()).filter(Boolean);
      hw.questions.push({
        type: fd.get('type'),
        text: fd.get('text'),
        points: Number(fd.get('points')) || 1,
        options,
        correctAnswer: fd.get('correctAnswer') || '',
      });
      await Api.put('/homework/' + hwId, { questions: hw.questions });
      form.reset();
      loadAdminHomeworkList(lessonId);
    });
  });

  box.querySelectorAll('[data-del-hw]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this homework?')) return;
      await Api.del('/homework/' + btn.dataset.delHw);
      loadAdminHomeworkList(lessonId);
    });
  });
}

function renderAdminQuestions(hw) {
  const box = document.getElementById('q-' + hw._id);
  if (!box) return;
  if (!hw.questions.length) {
    box.innerHTML = `<p class="muted">No questions yet.</p>`;
    return;
  }
  box.innerHTML = hw.questions.map((q, i) => `
    <div class="question">
      <div class="question-head">
        <span>${i + 1}. ${escapeHtml(q.text)} <span class="muted">(${q.type.replace('_', ' ')})</span></span>
        <span class="question-points">${q.points} pt${q.points === 1 ? '' : 's'}</span>
      </div>
      ${q.type !== 'essay' ? `<div class="muted">Correct answer: ${escapeHtml(q.correctAnswer)}</div>` : ''}
    </div>`).join('');
}

/* ---------------- admin: essay grading ---------------- */

async function viewAdminGrading(filter = 'pending') {
  app.innerHTML = `
    <div class="view-wide">
      <h1>Submissions</h1>
      <div class="topnav" style="margin-bottom:16px;justify-content:flex-start;gap:8px;">
        <button class="btn btn-small ${filter === 'pending' ? 'btn-accent' : 'btn-secondary'}" id="tabPending">Needs grading</button>
        <button class="btn btn-small ${filter === 'all' ? 'btn-accent' : 'btn-secondary'}" id="tabAll">All submissions</button>
      </div>
      <div id="list" class="list"></div>
    </div>`;
  document.getElementById('tabPending').onclick = () => viewAdminGrading('pending');
  document.getElementById('tabAll').onclick = () => viewAdminGrading('all');

  const list = document.getElementById('list');
  try {
    const query = filter === 'pending' ? '?status=pending_review' : '';
    const submissions = await Api.get('/admin/submissions' + query);
    if (!submissions.length) {
      list.innerHTML = `<div class="empty-state">${filter === 'pending' ? 'Nothing waiting for review right now.' : 'No submissions yet.'}</div>`;
      return;
    }
    list.innerHTML = submissions.map((s) => `
      <a class="item-link" href="#/admin/grading/${s._id}">
        <div class="card-row">
          <div>
            <div class="item-title">${escapeHtml(s.student.name)} — ${escapeHtml(s.homework.title)}</div>
            <div class="item-meta">Submitted ${new Date(s.submittedAt).toLocaleString()}</div>
          </div>
          <span class="badge badge-${s.status === 'graded' ? 'graded' : 'pending'}">
            ${s.status === 'graded' ? (s.autoScore + s.manualScore) + '/' + s.totalPoints : 'Needs grading'}
          </span>
        </div>
      </a>`).join('');
  } catch (err) {
    list.innerHTML = alertBox(err.message);
  }
}

async function viewAdminGradeSubmission(submissionId) {
  app.innerHTML = `<div class="view"><p class="eyebrow"><a href="#/admin/grading">← Grading queue</a></p><div id="content">Loading…</div></div>`;
  const content = document.getElementById('content');
  try {
    const s = await Api.get('/admin/submissions/' + submissionId);
    const hw = s.homework;

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
        ${s.student.avatar ? `<img src="${escapeHtml(s.student.avatar)}" class="nav-avatar" style="width:44px;height:44px;" alt="" />` : `<span class="nav-avatar nav-avatar-empty" style="width:44px;height:44px;font-size:1.1rem;">${escapeHtml(s.student.name.slice(0, 1).toUpperCase())}</span>`}
        <div>
          <h1 style="margin-bottom:0">${escapeHtml(s.student.name)}</h1>
          <p class="muted" style="margin:0">${escapeHtml(s.student.email)}</p>
        </div>
      </div>
      <p class="muted">${escapeHtml(hw.title)}</p>
      <form id="gradeForm" class="card">
        ${hw.questions.map((q) => {
          const ans = s.answers.find((a) => String(a.question) === String(q._id));
          const noteHtml = ans && ans.studentNote ? `<div class="student-note-box">📝 Student's note: ${escapeHtml(ans.studentNote)}</div>` : '';
          if (q.type !== 'essay') {
            return `
              <div class="question">
                <div class="question-head"><strong>${escapeHtml(q.text)}</strong><span class="question-points">${q.points} pt</span></div>
                <div class="muted">Answer: ${escapeHtml(ans ? ans.answerText : '')}</div>
                <div class="result-mark ${ans && ans.isCorrect ? 'result-correct' : 'result-incorrect'}">
                  Auto-graded: ${ans ? ans.pointsAwarded : 0}/${q.points}
                </div>
                ${noteHtml}
              </div>`;
          }
          return `
            <div class="question">
              <div class="question-head"><strong>${escapeHtml(q.text)}</strong><span class="question-points">${q.points} pt max</span></div>
              <div class="muted">Answer: ${escapeHtml(ans ? ans.answerText : '')}</div>
              ${noteHtml}
              <div class="field mt-16">
                <label>Points to award</label>
                <input type="number" min="0" max="${q.points}" name="points_${q._id}" value="${ans ? ans.pointsAwarded : 0}" />
              </div>
              <div class="field">
                <label>Feedback (optional)</label>
                <textarea name="feedback_${q._id}">${escapeHtml(ans ? ans.teacherFeedback : '')}</textarea>
              </div>
            </div>`;
        }).join('')}
        <div id="gradeAlert"></div>
        <button class="btn btn-accent mt-16" type="submit">Save grade</button>
      </form>`;

    document.getElementById('gradeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const grades = hw.questions
        .filter((q) => q.type === 'essay')
        .map((q) => ({
          questionId: q._id,
          points: Number(fd.get('points_' + q._id)) || 0,
          feedback: fd.get('feedback_' + q._id) || '',
        }));
      try {
        await Api.post('/admin/submissions/' + submissionId + '/grade', { grades });
        go('/admin/grading');
      } catch (err) {
        document.getElementById('gradeAlert').innerHTML = alertBox(err.message);
      }
    });
  } catch (err) {
    content.innerHTML = alertBox(err.message);
  }
}

/* ---------------- profile ---------------- */

function viewProfile() {
  const u = state.user;
  const avatarImg = u.avatar
    ? `<img src="${escapeHtml(u.avatar)}" class="avatar-large" alt="" />`
    : `<span class="avatar-large avatar-large-empty">${escapeHtml(u.name.slice(0, 1).toUpperCase())}</span>`;

  app.innerHTML = `
    <div class="view">
      <h1>Profile</h1>
      <div class="card" style="display:flex;align-items:center;gap:20px;">
        <div id="avatarPreviewWrap">${avatarImg}</div>
        <div>
          <div class="item-title">${escapeHtml(u.name)}</div>
          <div class="item-meta">${escapeHtml(u.email)} · ${u.role === 'admin' ? 'Admin' : 'Student'}</div>
          <form id="avatarForm" class="mt-16">
            <input type="file" name="avatar" id="avatarInput" accept="image/*" />
            <div id="avatarAlert" class="mt-16"></div>
            <button class="btn btn-accent btn-small mt-16" type="submit">Upload photo</button>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('avatarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('avatarInput').files[0];
    const alertDiv = document.getElementById('avatarAlert');
    if (!file) { alertDiv.innerHTML = alertBox('Choose an image first.'); return; }
    try {
      const result = await Api.uploadFile('/auth/avatar', file, 'avatar');
      state.user.avatar = result.avatar;
      viewProfile();
      renderNav();
    } catch (err) {
      alertDiv.innerHTML = alertBox(err.message);
    }
  });
}

/* ---------------- admin: results ---------------- */

async function viewAdminResults() {
  app.innerHTML = `
    <div class="view-wide">
      <h1>Results</h1>
      <div class="card">
        <div class="field">
          <label>Chapter</label>
          <select id="resultsChapter"><option value="">Choose a chapter</option></select>
        </div>
        <div class="field">
          <label>Lesson / homework</label>
          <select id="resultsHomework" disabled><option value="">Choose a chapter first</option></select>
        </div>
      </div>
      <div id="resultsTable"></div>
    </div>`;

  const chapterSelect = document.getElementById('resultsChapter');
  const homeworkSelect = document.getElementById('resultsHomework');
  const table = document.getElementById('resultsTable');

  const chapters = await Api.get('/chapters');
  chapterSelect.innerHTML = '<option value="">Choose a chapter</option>' +
    chapters.map((c) => `<option value="${c._id}">${escapeHtml(c.title)}</option>`).join('');

  chapterSelect.addEventListener('change', async () => {
    table.innerHTML = '';
    homeworkSelect.innerHTML = '<option value="">Loading…</option>';
    homeworkSelect.disabled = true;
    if (!chapterSelect.value) {
      homeworkSelect.innerHTML = '<option value="">Choose a chapter first</option>';
      return;
    }
    const lessons = await Api.get('/lessons?chapter=' + chapterSelect.value);
    const options = [];
    for (const lesson of lessons) {
      const hwList = await Api.get('/homework?lesson=' + lesson._id);
      hwList.forEach((h) => options.push({ id: h._id, label: `${lesson.title} — ${h.title}` }));
    }
    if (!options.length) {
      homeworkSelect.innerHTML = '<option value="">No homework in this chapter yet</option>';
      return;
    }
    homeworkSelect.disabled = false;
    homeworkSelect.innerHTML = '<option value="">Choose homework</option>' +
      options.map((o) => `<option value="${o.id}">${escapeHtml(o.label)}</option>`).join('');
  });

  homeworkSelect.addEventListener('change', async () => {
    if (!homeworkSelect.value) { table.innerHTML = ''; return; }
    table.innerHTML = '<p class="muted">Loading…</p>';
    const submissions = await Api.get('/admin/submissions?homework=' + homeworkSelect.value);
    if (!submissions.length) {
      table.innerHTML = `<div class="empty-state">No one has submitted this yet.</div>`;
      return;
    }
    table.innerHTML = `
      <div class="card">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;">
              <th style="padding:8px 10px;border-bottom:1px solid var(--line);color:var(--ink-faint);font-weight:500;">Student</th>
              <th style="padding:8px 10px;border-bottom:1px solid var(--line);color:var(--ink-faint);font-weight:500;">Status</th>
              <th style="padding:8px 10px;border-bottom:1px solid var(--line);color:var(--ink-faint);font-weight:500;">Score</th>
              <th style="padding:8px 10px;border-bottom:1px solid var(--line);"></th>
            </tr>
          </thead>
          <tbody>
            ${submissions.map((s) => `
              <tr>
                <td style="padding:10px;border-bottom:1px solid var(--line);">
                  <div style="display:flex;align-items:center;gap:10px;">
                    ${s.student.avatar ? `<img src="${escapeHtml(s.student.avatar)}" class="nav-avatar" alt="" />` : `<span class="nav-avatar nav-avatar-empty">${escapeHtml(s.student.name.slice(0, 1).toUpperCase())}</span>`}
                    <div>
                      <div>${escapeHtml(s.student.name)}</div>
                      <div class="muted" style="font-size:0.8rem;">${escapeHtml(s.student.email)}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:10px;border-bottom:1px solid var(--line);">
                  <span class="badge badge-${s.status === 'graded' ? 'graded' : 'pending'}">${s.status === 'graded' ? 'Graded' : 'Needs grading'}</span>
                </td>
                <td style="padding:10px;border-bottom:1px solid var(--line);">${s.autoScore + s.manualScore}/${s.totalPoints}</td>
                <td style="padding:10px;border-bottom:1px solid var(--line);"><a class="btn btn-secondary btn-small" href="#/admin/grading/${s._id}">View</a></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  });
}

/* ---------------- home ---------------- */

function viewHome() {
  if (!state.user) return viewLogin();
  if (state.user.role === 'admin') return viewAdminPending();
  return viewChapters();
}

/* ---------------- router ---------------- */

const routes = [
  { pattern: /^\/$/, view: () => viewHome() },
  { pattern: /^\/login$/, view: () => viewLogin() },
  { pattern: /^\/register$/, view: () => viewRegister() },
  { pattern: /^\/chapters$/, view: () => guardStudent(viewChapters) },
  { pattern: /^\/chapters\/([^/]+)$/, view: (id) => guardStudent(() => viewLessons(id)) },
  { pattern: /^\/lessons\/([^/]+)$/, view: (id) => guardStudent(() => viewHomeworkList(id)) },
  { pattern: /^\/homework\/([^/]+)$/, view: (id) => guardStudent(() => viewHomeworkTake(id)) },
  { pattern: /^\/results$/, view: () => guardStudent(viewResults) },
  { pattern: /^\/profile$/, view: () => guardStudent(viewProfile) },
  { pattern: /^\/admin$/, view: () => guardAdmin(viewAdminPending) },
  { pattern: /^\/admin\/content$/, view: () => guardAdmin(viewAdminContent) },
  { pattern: /^\/admin\/lessons\/([^/]+)$/, view: (id) => guardAdmin(() => viewAdminLesson(id)) },
  { pattern: /^\/admin\/grading$/, view: () => guardAdmin(viewAdminGrading) },
  { pattern: /^\/admin\/grading\/([^/]+)$/, view: (id) => guardAdmin(() => viewAdminGradeSubmission(id)) },
  { pattern: /^\/admin\/results$/, view: () => guardAdmin(viewAdminResults) },
];

function guardStudent(fn) {
  if (!state.user) return go('/login');
  return fn();
}
function guardAdmin(fn) {
  if (!state.user || state.user.role !== 'admin') return go('/login');
  return fn();
}

function router() {
  renderNav();
  const path = location.hash.slice(1) || '/';
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) return r.view(...m.slice(1));
  }
  app.innerHTML = `<div class="empty-state">Page not found. <a href="#/">Go home</a></div>`;
}

window.addEventListener('hashchange', router);

/* ---------------- music player (playlist) ---------------- */

const PLAYLIST = [
  { file: '/audio/study-1.mp3', name: 'Track 1' },
  { file: '/audio/study-2.mp3', name: 'Track 2' },
  { file: '/audio/study-3.mp3', name: 'Track 3' },
  { file: '/audio/study-4.mp3', name: 'Track 4' },
  { file: '/audio/study-5.mp3', name: 'Track 5' },
];

const audio = document.getElementById('studyAudio');
const musicBtn = document.getElementById('musicToggle');
const musicIconPlay = document.getElementById('musicIconPlay');
const musicIconPause = document.getElementById('musicIconPause');
const musicTrackName = document.getElementById('musicTrackName');
let currentTrack = Number(localStorage.getItem('musicTrack')) || 0;
if (currentTrack < 0 || currentTrack >= PLAYLIST.length) currentTrack = 0;

function loadTrack(index, autoplay) {
  currentTrack = ((index % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
  localStorage.setItem('musicTrack', currentTrack);
  audio.src = PLAYLIST[currentTrack].file;
  musicTrackName.textContent = PLAYLIST[currentTrack].name;
  if (autoplay) audio.play().catch(() => {});
}

function setPlayingUI(playing) {
  musicBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  musicIconPlay.style.display = playing ? 'none' : '';
  musicIconPause.style.display = playing ? '' : 'none';
}

loadTrack(currentTrack, false);

musicBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
});
audio.addEventListener('play', () => setPlayingUI(true));
audio.addEventListener('pause', () => setPlayingUI(false));
let musicSkipAttempts = 0;
audio.addEventListener('playing', () => { musicSkipAttempts = 0; });
audio.addEventListener('ended', () => loadTrack(currentTrack + 1, true));
audio.addEventListener('error', () => {
  // A track file is missing/broken — move on, but stop after a full lap
  // through the playlist so we never loop forever with no valid files.
  musicSkipAttempts++;
  if (musicSkipAttempts < PLAYLIST.length) {
    loadTrack(currentTrack + 1, true);
  }
});

document.getElementById('musicNext').addEventListener('click', () => loadTrack(currentTrack + 1, !audio.paused));
document.getElementById('musicPrev').addEventListener('click', () => loadTrack(currentTrack - 1, !audio.paused));

/* ---------------- boot ---------------- */

(async function boot() {
  if (Api.token()) {
    try {
      state.user = await Api.get('/auth/me');
    } catch (_) {
      Api.clearToken();
    }
  }
  router();
})();
