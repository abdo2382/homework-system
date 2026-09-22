require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const chapterRoutes = require('./routes/chapters');
const lessonRoutes = require('./routes/lessons');
const homeworkRoutes = require('./routes/homework');
const submissionRoutes = require('./routes/submissions');
const uploadRoutes = require('./routes/uploads');
const draftRoutes = require('./routes/drafts');

const app = express();

app.use(cors());
app.use(express.json());

// Basic protection against brute-force login/register attempts
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/drafts', draftRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the static frontend (this also serves public/uploads/* for images)
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Global error handler — every route is wrapped in asyncHandler, so any error
// (a bad ObjectId, a dropped DB connection, a bug) lands here as a normal
// JSON response instead of crashing the whole server.
app.use((err, req, res, next) => {
  console.error('Request error:', err);
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id.' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on the server.' });
});

// Extra safety net: log instead of letting the process die on a stray error
// that somehow wasn't caught above (e.g. outside a request, in a timer).
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection (server stays up):', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server stays up):', err);
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
