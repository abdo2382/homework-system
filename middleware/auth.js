const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the JWT and attaches the current user to req.user
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not logged in.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Your account is not approved yet.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Use after requireAuth to restrict a route to admins only
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
