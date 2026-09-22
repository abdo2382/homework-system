# Eng. Abdelrahman Alaa — Homework System

A homework and auto-grading platform:

- **Chapters → Lessons → Homework.** Each lesson can have one or more homework sets.
- **Question types:** multiple choice, true/false, and short answer are graded automatically.
  Essay questions are always left for you to grade by hand.
- **Registration approval.** Anyone can register, but new accounts start as `pending` and
  cannot log in until you (the admin) approve them from the admin panel.
- **Single admin account**, created once via a seed script — there is no public "become admin" path.

Stack: Node.js + Express + MongoDB (Mongoose) on the backend, a small dependency-free
vanilla-JS single-page app on the frontend (no build step, no framework).

---

## 1. Local setup

```bash
cd homework-system
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `MONGODB_URI` — a MongoDB connection string. The free tier of
  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) works well; create a cluster,
  add a database user, allow access from anywhere (0.0.0.0/0) for simplicity, and copy the
  connection string it gives you.
- `JWT_SECRET` — any long random string. You can generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — the account you will log in with as admin.
  Only used the one time you run the seed script below.

Create your admin account:

```bash
npm run seed:admin
```

Run the server:

```bash
npm start
# or, for auto-restart while developing:
npm run dev
```

Visit **http://localhost:5000** — log in with the admin email/password you set in `.env`.

---

## 2. Using the system

**As admin:**
1. Log in → you land on **Pending** (registration requests). Approve or reject each one.
2. Go to **Content** → add a Chapter → add Lessons inside it → click **Manage homework**
   on a lesson → create a homework set → add questions to it (pick the type, points, and for
   auto-graded types, the exact correct answer).
3. As students submit, anything containing an essay question shows up under **Grading** —
   open it, enter points and optional feedback per essay question, and save.

**As a student:**
1. Register (name, email, password) → wait for approval.
2. Once approved, log in → **Chapters** → pick a chapter → a lesson → a homework set.
3. Submit once. Auto-graded questions are scored immediately; essay questions show
   "Waiting for teacher review" until you grade them.

Each student can submit a given homework set only once (enforced by the database).

---

## 3. Bulk-importing homework from a file

On the **Manage homework** page for a lesson (Admin → Content → a chapter → a lesson →
"Manage homework"), there's an **"Import questions from a file"** card. Upload a plain
`.txt` file and it's parsed straight into questions — no need to add each one by hand.

File format (blocks separated by a blank line):

```
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
```

- `TYPE` is one of `mcq`, `true_false`, `short_answer`, `essay`.
- `ANSWER` is required for every type except `essay` (essays are always graded by you).
- For `true_false`, `ANSWER` must be exactly `true` or `false`.
- For `mcq`, `ANSWER` must match one of the `OPTIONS` exactly (case doesn't matter).
- The `TITLE`/`INSTRUCTIONS` block at the top is optional — only used when creating a
  **new** homework. You can also import straight into an existing homework (pick it from
  the "Import into" dropdown) to add more questions to it.
- Malformed blocks are skipped with a clear message rather than failing the whole import.

## 4. Chapter images

When adding a chapter (Admin → Content), you can attach an image — it's uploaded to the
server and shown as a small thumbnail next to the chapter in both the admin and student
views. JPG/PNG/WEBP/GIF, up to 5 MB.

## 5. Adding the background music

Drop an MP3 named `study-music.mp3` into `public/audio/` (see the note already in that
folder) — the speaker icon in the top bar will play/pause it.

---

## 6. Deploying (Render — free tier)

Render is the simplest option for this project because it runs a persistent Node/Express
server (Vercel is built around serverless functions, which needs extra adaptation for an
app structured like this one).

1. Push this folder to a GitHub repository.
2. On [Render](https://render.com), create a **New Web Service** from that repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add the same environment variables from your `.env` (`MONGODB_URI`, `JWT_SECRET`,
   `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) in Render's dashboard under **Environment**.
5. Deploy. Once it's live, run the admin seed once — either temporarily set Render's
   **start command** to `npm run seed:admin && npm start` for the first deploy, then change
   it back to `npm start`, or run it locally against the same `MONGODB_URI` (Atlas is
   reachable from anywhere, so `npm run seed:admin` on your own machine works too).

Your MongoDB Atlas cluster is separate from Render and keeps your data regardless of
where the server itself is hosted.

---

## 7. Project structure

```
homework-system/
  server.js                  Express app entrypoint + global error handler
  config/db.js               MongoDB connection
  models/                    User (+avatar), Chapter (+image), Lesson, Homework, Submission, Draft
  middleware/auth.js         JWT check + admin-only guard
  middleware/asyncHandler.js Wraps every route so errors can't crash the server
  utils/parseHomeworkText.js Parses an uploaded .txt file into homework questions
  utils/imageUpload.js       Shared multer config for chapter/avatar image uploads
  routes/                    auth, admin, chapters, lessons, homework, submissions, uploads, drafts
  scripts/seedAdmin.js       One-time admin account creation
  public/                    Frontend (index.html, css/, js/, audio/, uploads/)
```

## 8. API summary

| Method | Path                                   | Who          | Purpose                          |
|--------|-----------------------------------------|--------------|-----------------------------------|
| POST   | /api/auth/register                     | anyone       | create a pending account          |
| POST   | /api/auth/login                        | approved     | get a JWT                         |
| GET    | /api/auth/me                           | logged in    | current user info                 |
| GET    | /api/admin/users?status=pending        | admin        | list registrations                |
| POST   | /api/admin/users/:id/approve|reject    | admin        | decide a registration             |
| GET/POST/PUT/DELETE | /api/chapters, /api/lessons, /api/homework | admin writes, everyone approved reads | content management |
| POST   | /api/homework/import                   | admin        | parse a .txt file into questions (new or existing homework) |
| POST   | /api/uploads/image                     | admin        | upload a chapter image, returns its URL |
| POST   | /api/auth/avatar                       | any logged-in| upload your own profile picture   |
| GET/PUT| /api/drafts/:homeworkId                | student      | save/resume in-progress answers before submitting |
| POST   | /api/submissions                       | student      | submit answers, auto-grades       |
| GET    | /api/submissions/mine                  | student      | own submissions                   |
| GET    | /api/admin/submissions?status=          | admin        | list submissions (omit status for all) |
| POST   | /api/admin/submissions/:id/grade       | admin        | save/update essay grades          |

Every route above is wrapped so a bug or bad request returns a normal JSON error instead
of crashing the whole Node process — see `middleware/asyncHandler.js` and the global error
handler at the bottom of `server.js`.

---

## 9. Other things worth knowing

- **Save & resume homework.** Students can click "Save progress" any time while working on
  a homework set — their answers are stored and pre-filled next time they open it, so they
  don't have to finish in one sitting. Saving only creates a submission (and grades it) once
  they click "Submit homework".
- **All submissions, not just pending ones.** The admin **Grading** page has two tabs:
  "Needs grading" (submissions with an ungraded essay) and "All submissions" (everything,
  including already-graded ones — opening one lets you review or adjust the grade).
- **Profile pictures.** Every account (student or admin) can upload a profile photo from
  the **Profile** link in the top bar; it shows as a small avatar next to their name.
- **Study music playlist.** The player in the top bar cycles through up to 5 tracks
  (previous / play-pause / next, auto-advances when one ends) — see `public/audio/README.txt`.

## Notes / things worth hardening later

- Passwords are hashed with bcrypt; sessions use JWTs valid for 30 days.
- Short-answer auto-grading matches the student's text to the correct answer,
  case-insensitively and trimmed — it won't catch typos or synonyms.
- There's no password-reset flow yet (you'd add an email service for that).
- Homework answers and drafts are text only — no file/image upload for answers yet.
