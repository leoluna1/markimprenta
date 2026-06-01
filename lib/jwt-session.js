// lib/jwt-session.js — Sesiones JWT con soporte de invalidación
// Reemplaza el Map en memoria por tokens JWT firmados (sobreviven reinicios)
// Invalidación inmediata mediante "generación de sesión" y denylist.
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

// ── Número de generación ─────────────────────────────────────────────────────
// Incrementarlo invalida TODOS los tokens existentes (usado al cambiar contraseña).
let SESSION_GEN = 1;

// ── Denylist ─────────────────────────────────────────────────────────────────
// Tokens individuales invalidados (logout). Mucho más pequeño que un session Map.
const _denylist = new Set();

// Limpiar tokens expirados del denylist cada hora
setInterval(() => {
  for (const token of _denylist) {
    try { jwt.verify(token, JWT_SECRET); }
    catch (e) { if (e.name === 'TokenExpiredError') _denylist.delete(token); }
  }
}, 60 * 60 * 1000).unref();

// ── API pública ───────────────────────────────────────────────────────────────

function createSession() {
  return jwt.sign({ type: 'admin', gen: SESSION_GEN }, JWT_SECRET, {
    expiresIn: SESSION_TTL_SECS,
  });
}

function isValidSession(token) {
  if (!token || _denylist.has(token)) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.type === 'admin' && decoded.gen === SESSION_GEN;
  } catch {
    return false;
  }
}

/** Invalida un token individual (logout) */
function invalidateSession(token) {
  if (token) _denylist.add(token);
}

/** Invalida TODOS los tokens existentes (cambio de contraseña) */
function invalidateAllSessions(currentToken) {
  SESSION_GEN++;
  _denylist.clear(); // Tokens viejos ya no son válidos por generación
}

module.exports = { createSession, isValidSession, invalidateSession, invalidateAllSessions };
