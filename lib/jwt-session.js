// lib/jwt-session.js — Sesiones JWT firmadas.
// La invalidación persistente se valida en server.js contra admin_users.session_version
// y admin_session_revocations.
'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

// ── Secreto JWT ──────────────────────────────────────────────────────────────
// OBLIGATORIO en producción: definir JWT_SECRET en .env (64 bytes hex)
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const s = crypto.randomBytes(64).toString('hex');
  console.warn('[Auth] ADVERTENCIA: JWT_SECRET no configurado en .env — generando secreto temporal.');
  console.warn('[Auth]    Las sesiones NO sobrevivirán reinicios del servidor.');
  console.warn('[Auth]    Agrega JWT_SECRET=' + s + ' a tu .env');
  return s;
})();

const SESSION_TTL_SECS = 8 * 60 * 60; // 8 horas

// ── API pública ───────────────────────────────────────────────────────────────

function createSession(user = {}) {
  return jwt.sign({
    type: 'admin',
    jti: crypto.randomBytes(24).toString('hex'),
    sv: parseInt(user.session_version, 10) || 1,
    sub: user.id != null ? String(user.id) : undefined,
    email: user.email || undefined,
    name: user.name || undefined,
    role: user.role || 'admin',
  }, JWT_SECRET, {
    expiresIn: SESSION_TTL_SECS,
  });
}

function readSession(token) {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'admin' || !decoded.jti) return false;
    return decoded;
  } catch {
    return false;
  }
}

function isValidSession(token) {
  return !!readSession(token);
}

function sessionExpiryDate(session) {
  return session && session.exp ? new Date(session.exp * 1000) : new Date(Date.now() + SESSION_TTL_SECS * 1000);
}

module.exports = { createSession, readSession, isValidSession, sessionExpiryDate };
