// lib/csrf.js — Protección CSRF mediante Double-Submit Cookie Pattern
// Funciona sin sesión de servidor, compatible con APIs JSON.
'use strict';

const crypto = require('crypto');

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Middleware: genera un token CSRF y lo almacena en cookie + respuesta JSON.
 * El frontend DEBE leer el token de la cookie o del header y enviarlo
 * como header "X-CSRF-Token" en POST/PATCH/DELETE.
 */
function csrfCookie(req, res, next) {
  if (req.path === '/api/csrf-token') return next();
  // Si ya existe un token válido en cookie, reutilizarlo
  if (req.headers.cookie?.includes(CSRF_COOKIE)) return next();
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,            // El JS del frontend lo necesita leer
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CSRF_TTL_MS,
  });
  next();
}

/**
 * Middleware de validación: compara header vs cookie.
 * Aplica solo a endpoints mutantes (POST/PATCH/DELETE) públicos.
 */
function csrfProtect(req, res, next) {
  // GET y HEAD no necesitan CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${CSRF_COOKIE}=([^;]+)`));
  const cookieToken = match ? match[1] : null;
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'Token CSRF faltante.' });
  }

  // Comparación en tiempo constante para prevenir timing attacks
  if (!timingSafeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'Token CSRF inválido.' });
  }

  next();
}

function timingSafeEqual(a, b) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false; // longitudes distintas
  }
}

/** Endpoint GET /api/csrf-token — el frontend lo llama al cargar */
function csrfTokenEndpoint(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${CSRF_COOKIE}=([^;]+)`));
  let token = match ? match[1] : null;

  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: CSRF_TTL_MS,
    });
  }

  res.json({ token });
}

module.exports = { csrfCookie, csrfProtect, csrfTokenEndpoint };
