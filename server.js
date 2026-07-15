// ================================================
// MARK PUBLICIDAD — SERVIDOR NODE.JS (producción)
// ================================================
'use strict';

require('dotenv').config();

const express      = require('express');
const fs           = require('fs');
const path         = require('path');
const cors         = require('cors');
const multer       = require('multer');
const nodemailer   = require('nodemailer');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const crypto       = require('crypto');
const bcrypt       = require('bcryptjs');
const compression  = require('compression');
const { body, validationResult } = require('express-validator');
const speakeasy    = require('speakeasy');
const QRCode       = require('qrcode');
const { v2: cloudinary } = require('cloudinary');

const db           = require('./db/db');
const {
  createSession,
  readSession,
  isValidSession,
  invalidateSession,
  invalidateAllSessions,
} = require('./lib/jwt-session');
const logger = require('./lib/logger');
const { csrfCookie, csrfProtect, csrfTokenEndpoint } = require('./lib/csrf');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_SESSION_COOKIE = 'admin_session';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CLOUDINARY_CONFIGURED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
const UPLOAD_STORAGE = String(process.env.UPLOAD_STORAGE || (CLOUDINARY_CONFIGURED ? 'cloudinary' : 'local')).toLowerCase();
const CLOUDINARY_ENABLED = UPLOAD_STORAGE === 'cloudinary' && CLOUDINARY_CONFIGURED;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'marka-publicidad';

// ── Rutas de directorios (medios y uploads locales/NAS) ──────────────────
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, 'uploads'));
const VIDEOS_DIR  = path.resolve(process.env.VIDEOS_DIR || path.join(UPLOADS_DIR, 'videos'));
const PUBLIC_UPLOADS_URL = String(process.env.PUBLIC_UPLOADS_URL || '/uploads').replace(/\/+$/, '') || '/uploads';

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

function publicUploadUrl(...segments) {
  const encoded = segments.map(s => encodeURIComponent(String(s).replace(/^\/+|\/+$/g, ''))).join('/');
  return `${PUBLIC_UPLOADS_URL}/${encoded}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function fallbackAdminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL || process.env.GMAIL_USER || '');
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

function withAuthDefaults(auth) {
  if (!auth) return null;
  return {
    ...auth,
    email: normalizeEmail(auth.email || fallbackAdminEmail()),
  };
}

function publicAdminUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name || '',
    email: normalizeEmail(user.email),
    role: user.role || 'admin',
    active: user.active !== false,
    totp_enabled: !!user.totp_enabled,
    created_at: user.created_at || null,
    updated_at: user.updated_at || null,
    last_login_at: user.last_login_at || null,
  };
}

function matchesAdminEmail(input, auth) {
  const expected = normalizeEmail(auth && auth.email);
  return Boolean(expected && normalizeEmail(input) === expected);
}

function maskEmail(email) {
  return normalizeEmail(email).replace(/^(.{2}).*(@.*)$/, '$1***$2');
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
}

function setAdminSessionCookie(res, token) {
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
}

function clearAdminSessionCookie(res) {
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    path: '/',
  });
}

function getAdminSessionToken(req) {
  return req.headers['x-admin-token'] || parseCookies(req)[ADMIN_SESSION_COOKIE];
}

// ── Auth helpers ──────────────────────────────
async function getAuthData() {
  try {
    const auth = await db.getAuth();
    if (auth && auth.password) return withAuthDefaults(auth);
  } catch {}
  if (!ADMIN_PASSWORD) {
    logger.error('[Auth] ADMIN_PASSWORD no configurado y no existe credenciales en BD — login bloqueado');
    return null;
  }
  return withAuthDefaults({ email: fallbackAdminEmail(), password: ADMIN_PASSWORD });
}

async function verifyPassword(input, authData = null) {
  const auth = authData || await getAuthData();
  if (!auth) return false;
  const candidate = String(input || '');
  const stored = String(auth.password || '');
  if (!candidate || !stored) return false;
  if (stored.startsWith('$2')) {
    return bcrypt.compare(candidate, stored);
  }
  // Texto plano: verificar y migrar automáticamente a bcrypt
  if (candidate !== stored) return false;
  const hash = await bcrypt.hash(candidate, 12);
  if (auth.id) {
    await db.updateAdminUserPassword(auth.id, hash);
  } else {
    await db.saveAuth({ ...auth, password: hash });
  }
  logger.info('[Auth] Contraseña migrada a bcrypt');
  return true;
}

// Mínimo 8 caracteres, al menos una letra y un número
function validatePasswordStrength(pwd) {
  if (!pwd || pwd.length < 8)     return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Za-z]/.test(pwd))      return 'La contraseña debe incluir al menos una letra.';
  if (!/[0-9!@#$%^&*]/.test(pwd)) return 'La contraseña debe incluir al menos un número o símbolo.';
  return null;
}

// ── Reset tokens (contraseña olvidada) ────────
const resetTokens = new Map();
const RESET_TTL_MS = 15 * 60 * 1000;

function createResetToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, {
    expiresAt: Date.now() + RESET_TTL_MS,
    userId: user?.id || null,
  });
  return token;
}
function isValidResetToken(token) {
  if (!token || !resetTokens.has(token)) return false;
  const entry = resetTokens.get(token);
  const expiresAt = typeof entry === 'number' ? entry : entry.expiresAt;
  if (Date.now() > expiresAt) { resetTokens.delete(token); return false; }
  return true;
}
function getResetTokenUserId(token) {
  const entry = resetTokens.get(token);
  return entry && typeof entry === 'object' ? entry.userId : null;
}

// ── 2FA challenge tokens (5 min, solo en memoria) ──
const challengeTokens = new Map();

function createChallengeToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  challengeTokens.set(token, {
    expiresAt: Date.now() + 5 * 60 * 1000,
    userId: user?.id || null,
  });
  return token;
}
function isValidChallengeToken(token) {
  if (!token || !challengeTokens.has(token)) return false;
  const entry = challengeTokens.get(token);
  const expiresAt = typeof entry === 'number' ? entry : entry.expiresAt;
  if (Date.now() > expiresAt) { challengeTokens.delete(token); return false; }
  return true;
}
function getChallengeUserId(token) {
  const entry = challengeTokens.get(token);
  return entry && typeof entry === 'object' ? entry.userId : null;
}
function consumeChallengeToken(token) {
  challengeTokens.delete(token);
}

// ── Carpetas necesarias ────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR))  fs.mkdirSync(VIDEOS_DIR,  { recursive: true });

// ── Multer — imágenes ─────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const rand = crypto.randomBytes(12).toString('hex');
    cb(null, `${rand}${ext}`);
  },
});
const ALLOWED_UPLOAD_TYPES = new Map([
  ['image/jpeg',      new Set(['.jpg', '.jpeg'])],
  ['image/jpg',       new Set(['.jpg', '.jpeg'])],
  ['image/png',       new Set(['.png'])],
  ['image/webp',      new Set(['.webp'])],
  ['image/gif',       new Set(['.gif'])],
  ['application/pdf', new Set(['.pdf'])],
]);
function isAllowedUploadFile(file, allowedTypes) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = allowedTypes.get(file.mimetype);
  return Boolean(allowedExts && allowedExts.has(ext));
}
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    isAllowedUploadFile(file, ALLOWED_UPLOAD_TYPES)
      ? cb(null, true)
      : cb(new Error('Tipo no permitido. Acepta: JPG, PNG, WEBP, GIF o PDF válidos.'));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── Multer — videos ───────────────────────────
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEOS_DIR),
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const rand = crypto.randomBytes(12).toString('hex');
      cb(null, `${rand}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ok = new Map([
      ['video/mp4',       new Set(['.mp4'])],
      ['video/webm',      new Set(['.webm'])],
      ['video/quicktime', new Set(['.mov'])],
      ['video/x-msvideo', new Set(['.avi'])],
      ['video/ogg',       new Set(['.ogv', '.ogg'])],
    ]);
    isAllowedUploadFile(file, ok) ? cb(null, true) : cb(new Error('Solo videos MP4, WEBM, MOV, AVI u OGV válidos.'));
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ── Nodemailer ────────────────────────────────
function normalizeMailPassword(value) {
  return String(value || '').replace(/\s/g, '');
}

function getMailFromAddress() {
  return process.env.MAIL_FROM || process.env.GMAIL_USER || process.env.ADMIN_EMAIL || '';
}

function createMailTransport() {
  const smtpHost = String(process.env.MAIL_HOST || '').trim();
  const smtpUser = String(process.env.MAIL_USER || '').trim();
  const smtpPass = normalizeMailPassword(process.env.MAIL_PASS);
  const smtpPort = parseInt(process.env.MAIL_PORT || '0', 10);
  const smtpSecure = String(process.env.MAIL_SECURE || '').toLowerCase();

  if (smtpHost && smtpUser && smtpPass && !smtpPass.includes('xxxx')) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 587,
      secure: smtpSecure === 'true' ? true : smtpSecure === 'false' ? false : (smtpPort === 465),
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS ||
      process.env.GMAIL_PASS.includes('xxxx')) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: normalizeMailPassword(process.env.GMAIL_PASS),
    },
  });
}

function isLocalRequest(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
  return ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(ip) || ip.includes('127.0.0.1');
}

function canExposeResetLink(req) {
  return !IS_PRODUCTION && isLocalRequest(req);
}

function shouldBypassRateLimit(req) {
  return !IS_PRODUCTION && isLocalRequest(req);
}

// ── Rate limiters ─────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldBypassRateLimit,
});
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados mensajes enviados. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldBypassRateLimit,
});
const reviewLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { error: 'Ya enviaste el máximo de reseñas por hoy. Intenta mañana.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldBypassRateLimit,
});
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Demasiados intentos. Espera 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldBypassRateLimit,
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldBypassRateLimit,
});

// ── Helpers ───────────────────────────────────
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function auditLog(action, details = {}, req = {}, userOverride = null) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?';
  const user = userOverride || req.adminUser || null;
  const event = {
    user_id: user?.id || null,
    user_email: user?.email || details.user_email || null,
    action,
    entity: details.entity || null,
    entity_id: details.entity_id || details.id || null,
    summary: details.summary || null,
    details,
    ip,
  };
  logger.warn(`[AUDIT] ${action}`, {
    ip,
    user: event.user_email || 'anon',
    entity: event.entity,
    entity_id: event.entity_id,
    summary: event.summary,
  });
  db.createAuditEvent(event).catch(err => {
    logger.error('[AUDIT] Error guardando evento', { err: err.message, action });
  });
}

// Sirve archivos HTML inyectando el nonce CSP en todos los <script>
function serveHtmlWithNonce(filePath) {
  return (req, res) => {
    try {
      const html  = fs.readFileSync(filePath, 'utf8');
      const nonce = res.locals.cspNonce;
      const patched = html.replace(/<script\b/g, `<script nonce="${nonce}"`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(patched);
    } catch (e) {
      logger.error('Error sirviendo HTML', { file: filePath, err: e.message });
      res.status(500).send('Error interno del servidor');
    }
  };
}

// ── Middleware global ─────────────────────────

// 1. Generar nonce CSP por request (debe ir antes de helmet)
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// 2. Helmet + CSP con nonce (sin 'unsafe-inline' en scripts)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        "'strict-dynamic'",
      ],
      styleSrc: [
        "'self'", "'unsafe-inline'",       // unsafe-inline en estilos es bajo riesgo
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
      ],
      imgSrc:     ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'",
                   "https://www.youtube.com",
                   "https://i.ytimg.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com",
                   "https://cdnjs.cloudflare.com", "data:"],
      objectSrc:  ["'none'"],
      frameSrc: [
        "'self'",
        "https://maps.google.com",
        "https://www.google.com",
        "https://www.youtube.com",
        "https://www.youtube-nocookie.com",
      ],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: IS_PRODUCTION
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

// 3. Compresión gzip/brotli
app.use(compression());

// 4. Headers extra
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

function adminContentSecurityPolicy(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "script-src-attr 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://www.youtube.com https://i.ytimg.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
    "object-src 'none'",
    "frame-src 'self' https://maps.google.com https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'none'",
  ].join('; ');
}

app.use('/admin', (req, res, next) => {
  res.setHeader('Content-Security-Policy', adminContentSecurityPolicy(res.locals.cspNonce));
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: false }));

// 5. Rate limiter global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
  skip: (req) => (
    (req.method === 'GET' && req.path.startsWith('/uploads/')) ||
    (!IS_PRODUCTION && (req.headers['x-qa-browser'] === '1' || isLocalRequest(req)))
  ),
});
app.use(globalLimiter);

// 6. CSRF cookie (pública, genera cookie en cada visita)
app.use(csrfCookie);

// ── Bloquear archivos sensibles del servidor ──
const PRIVATE_PATH_RE = /^\/(?:server\.js|package(?:-lock)?\.json|railway\.json|[^/]*\.md|lib\/|db\/|data\/|logs\/|node_modules\/|\.env|index\.html$|admin\/index\.html$)/i;
app.use((req, res, next) => {
  if (PRIVATE_PATH_RE.test(req.path)) return res.status(403).end();
  next();
});

// ── Archivos estáticos ────────────────────────
app.use(express.static(__dirname, { dotfiles: 'deny', index: false, redirect: false }));
app.use('/uploads',        express.static(UPLOADS_DIR));
app.use('/uploads/videos', express.static(VIDEOS_DIR));
app.use('/admin',          express.static(path.join(__dirname, 'admin'), { index: false, redirect: false }));

// ── Middleware de autenticación ───────────────
async function authenticate(req, res, next) {
  const token = getAdminSessionToken(req);
  const session = readSession(token);
  if (!session)
    return res.status(401).json({ error: 'No autorizado' });

  let user = null;
  if (session.sub) user = await db.getAdminUserById(session.sub);
  if (!user && session.email) user = await db.getAdminUserByEmail(session.email);
  if (!user || user.active === false)
    return res.status(401).json({ error: 'Usuario no autorizado o inactivo.' });

  req.adminToken = token;
  req.adminSession = session;
  req.adminUser = user;
  next();
}

// ════════════════════════════════════════════
//  RUTAS API
// ════════════════════════════════════════════

// ── CSRF token público ────────────────────────
app.get('/api/csrf-token', csrfTokenEndpoint);

// ── Auth: login ───────────────────────────────
app.post('/api/auth', authLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { email, password, totpCode } = req.body || {};

  const user = await db.getAdminUserByEmail(email);
  const ok = user && user.active !== false && await verifyPassword(password, user);
  if (!ok) {
    auditLog('LOGIN_FAILED', { summary: `Intento fallido para ${normalizeEmail(email)}` }, req);
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  if (user.totp_enabled && user.totp_secret) {
    if (!totpCode) {
      const challengeToken = createChallengeToken(user);
      auditLog('LOGIN_2FA_CHALLENGE', { summary: 'Login requiere verificacion 2FA' }, req, user);
      return res.json({ twoFaRequired: true, challengeToken });
    }
    const verified = speakeasy.totp.verify({
      secret:   user.totp_secret,
      encoding: 'base32',
      token:    String(totpCode),
      window:   1,
    });
    if (!verified) {
      auditLog('LOGIN_2FA_FAILED', { summary: 'Codigo 2FA incorrecto' }, req, user);
      return res.status(401).json({ error: 'Código 2FA incorrecto.' });
    }
  }

  await db.markAdminUserLogin(user.id);
  auditLog('LOGIN_OK', { summary: 'Inicio de sesion correcto' }, req, user);
  setAdminSessionCookie(res, createSession(user));
  res.json({ success: true, user: publicAdminUser(user) });
});

// Segunda fase del login 2FA
app.post('/api/auth/2fa/challenge', authLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { challengeToken, totpCode } = req.body;

  if (!isValidChallengeToken(challengeToken))
    return res.status(401).json({ error: 'Sesión de verificación expirada. Inicia sesión de nuevo.' });

  const userId = getChallengeUserId(challengeToken);
  const user = userId ? await db.getAdminUserById(userId) : null;
  if (!user || user.active === false || !user.totp_enabled || !user.totp_secret)
    return res.status(400).json({ error: '2FA no está configurado.' });

  const verified = speakeasy.totp.verify({
    secret:   user.totp_secret,
    encoding: 'base32',
    token:    String(totpCode || ''),
    window:   1,
  });

  if (!verified) {
    auditLog('LOGIN_2FA_FAILED', { summary: 'Codigo 2FA incorrecto' }, req, user);
    return res.status(401).json({ error: 'Código 2FA incorrecto.' });
  }

  consumeChallengeToken(challengeToken);
  await db.markAdminUserLogin(user.id);
  auditLog('LOGIN_OK_2FA', { summary: 'Inicio de sesion con 2FA correcto' }, req, user);
  setAdminSessionCookie(res, createSession(user));
  res.json({ success: true, user: publicAdminUser(user) });
});

// ── Auth: logout ──────────────────────────────
app.post('/api/auth/logout', authenticate, (req, res) => {
  invalidateSession(req.adminToken);
  clearAdminSessionCookie(res);
  auditLog('LOGOUT', {}, req);
  res.json({ success: true });
});

app.get('/api/auth/profile', authenticate, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(publicAdminUser(req.adminUser));
});

// ── Auth: recuperar contraseña ─────────────────
app.post('/api/auth/forgot', forgotLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { email } = req.body || {};
  const genericOk = {
    success: true,
    message: 'Si el correo coincide con un usuario registrado, se enviará un enlace de recuperación.',
  };
  const user = await db.getAdminUserByEmail(email);

  if (!user || user.active === false || !isValidEmailFormat(user.email)) {
    auditLog('PASSWORD_RESET_EMAIL_MISMATCH', {}, req);
    return res.json(genericOk);
  }

  const token    = createResetToken(user);
  const siteUrl  = process.env.SITE_URL || `http://localhost:${PORT}`;
  const resetLink = `${siteUrl}/admin?reset_token=${token}`;
  const devPayload = canExposeResetLink(req) ? { devResetLink: resetLink } : {};
  const transport = createMailTransport();
  if (!transport) {
    auditLog('PASSWORD_RESET_EMAIL_NOT_CONFIGURED', { summary: 'Email de recuperacion no configurado' }, req, user);
    return res.status(canExposeResetLink(req) ? 200 : 503).json({
      ...genericOk,
      ...devPayload,
      warning: 'Email no configurado. Configura MAIL_HOST/MAIL_USER/MAIL_PASS o GMAIL_USER/GMAIL_PASS.',
    });
  }

  try {
    await transport.sendMail({
      from:    `"Mark Publicidad Admin" <${getMailFromAddress()}>`,
      to:      user.email,
      subject: 'Recuperación de contraseña — Mark Publicidad',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <div style="background:#E30613;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h2 style="color:white;margin:0;">Recuperación de contraseña</h2>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p>Haz clic en el botón para establecer una nueva contraseña. El enlace expira en <strong>15 minutos</strong>.</p>
            <div style="text-align:center;margin:2rem 0;">
              <a href="${resetLink}" style="background:#E30613;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Restablecer contraseña</a>
            </div>
            <p style="color:#6b7280;font-size:.85rem;">Si no solicitaste esto, ignora este mensaje.</p>
          </div>
        </div>
      `,
    });
    auditLog('PASSWORD_RESET_REQUESTED', { summary: 'Solicitud de recuperacion de contraseña' }, req, user);
    res.json(genericOk);
  } catch (e) {
    logger.error('[Auth] Error enviando email de recuperación', { err: e.message });
    auditLog('PASSWORD_RESET_EMAIL_FAILED', { summary: 'Error enviando email de recuperacion' }, req, user);
    res.status(canExposeResetLink(req) ? 200 : 502).json({
      ...genericOk,
      ...devPayload,
      warning: 'No se pudo enviar el email. Revisa SMTP o usa una contraseña de aplicación en GMAIL_PASS.',
      error: canExposeResetLink(req) ? undefined : 'No se pudo enviar el email de recuperación.',
    });
  }
});

app.get('/api/auth/reset-token', resetLimiter, (req, res) => {
  res.json({ valid: isValidResetToken(req.query.token) });
});

app.post('/api/auth/reset-password', resetLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!isValidResetToken(token))
    return res.status(400).json({ error: 'Enlace inválido o expirado. Solicita uno nuevo.' });

  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const userId = getResetTokenUserId(token);
    const user = userId ? await db.getAdminUserById(userId) : null;
    if (!user || user.active === false)
      return res.status(400).json({ error: 'Usuario no encontrado o inactivo.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await db.updateAdminUserPassword(user.id, hash);
    resetTokens.delete(token);
    invalidateAllSessions();
    clearAdminSessionCookie(res);
    auditLog('PASSWORD_RESET_OK', { summary: 'Contraseña restablecida por email' }, req, user);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando la contraseña.' });
  }
});

app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body || {};
  const auth = req.adminUser;
  const ok = await verifyPassword(currentPassword, auth);
  if (!ok)
    return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });

  const latestAuth = await db.getAdminUserById(auth.id) || auth;
  const nextEmail = normalizeEmail(email || latestAuth.email || fallbackAdminEmail());
  if (!isValidEmailFormat(nextEmail))
    return res.status(400).json({ error: 'Ingresa un correo de administrador válido.' });

  const wantsPasswordChange = typeof newPassword === 'string' && newPassword.length > 0;
  const emailChanged = nextEmail !== normalizeEmail(latestAuth.email);
  if (!wantsPasswordChange && !emailChanged)
    return res.status(400).json({ error: 'No hay cambios para guardar.' });

  if (wantsPasswordChange) {
    const pwErr = validatePasswordStrength(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });
  }

  try {
    if (emailChanged) {
      await db.updateAdminUser(latestAuth.id, { email: nextEmail });
    }
    if (wantsPasswordChange) {
      const nextPassword = await bcrypt.hash(newPassword, 12);
      await db.updateAdminUserPassword(latestAuth.id, nextPassword);
    }
    invalidateAllSessions();
    const updatedUser = await db.getAdminUserById(latestAuth.id);
    const newToken = createSession(updatedUser);
    setAdminSessionCookie(res, newToken);
    auditLog(wantsPasswordChange ? 'PASSWORD_CHANGED' : 'ADMIN_EMAIL_CHANGED', {
      summary: wantsPasswordChange && emailChanged
        ? 'Correo y contraseña actualizados'
        : wantsPasswordChange ? 'Contraseña actualizada' : 'Correo actualizado',
    }, req, updatedUser);
    res.json({ success: true, email: nextEmail, user: publicAdminUser(updatedUser) });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando la contraseña.' });
  }
});

// ── 2FA: configurar TOTP ──────────────────────
app.get('/api/auth/2fa/setup', authenticate, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name:   `Mark Publicidad Admin (${req.adminUser.email})`,
    length: 20,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    await db.updateAdminUserTotp(req.adminUser.id, {
      totp_secret:  secret.base32,
      totp_enabled: false,
    });
    res.json({ qrCode: qrDataUrl, secret: secret.base32 });
  } catch (e) {
    res.status(500).json({ error: 'Error generando código QR.' });
  }
});

app.post('/api/auth/2fa/enable', authenticate, async (req, res) => {
  const { code } = req.body;
  const auth = await db.getAdminUserById(req.adminUser.id);
  if (!auth || !auth.totp_secret)
    return res.status(400).json({ error: 'Primero genera el código QR desde /api/auth/2fa/setup' });

  const verified = speakeasy.totp.verify({
    secret:   auth.totp_secret,
    encoding: 'base32',
    token:    String(code || ''),
    window:   1,
  });

  if (!verified)
    return res.status(400).json({ error: 'Código incorrecto. Escanea de nuevo el QR e inténtalo.' });

  await db.updateAdminUserTotp(auth.id, { totp_secret: auth.totp_secret, totp_enabled: true });
  auditLog('2FA_ENABLED', { summary: '2FA activado' }, req);
  res.json({ success: true });
});

app.post('/api/auth/2fa/disable', authenticate, async (req, res) => {
  const { password } = req.body;
  const ok = await verifyPassword(password, req.adminUser);
  if (!ok)
    return res.status(401).json({ error: 'Contraseña incorrecta.' });

  await db.updateAdminUserTotp(req.adminUser.id, { totp_secret: null, totp_enabled: false });
  auditLog('2FA_DISABLED', { summary: '2FA desactivado' }, req);
  res.json({ success: true });
});

app.get('/api/auth/2fa/status', authenticate, async (req, res) => {
  const auth = await db.getAdminUserById(req.adminUser.id);
  res.json({ enabled: !!(auth && auth.totp_enabled) });
});

// ── Usuarios admin y auditoria ────────────────
function requireAdminRole(req, res, next) {
  if (!['owner', 'admin'].includes(req.adminUser?.role || ''))
    return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
  next();
}

app.get('/api/admin/users', authenticate, requireAdminRole, async (req, res) => {
  try {
    res.json(await db.listAdminUsers());
  } catch (e) {
    res.status(500).json({ error: 'Error cargando usuarios.' });
  }
});

app.post('/api/admin/users', authenticate, requireAdminRole, async (req, res) => {
  try {
    const name = cleanText(req.body?.name || '', 120);
    const email = normalizeEmail(req.body?.email);
    const role = 'editor';
    const password = String(req.body?.password || '');
    if (!name) return res.status(400).json({ error: 'Ingresa el nombre del usuario.' });
    if (!isValidEmailFormat(email)) return res.status(400).json({ error: 'Ingresa un correo válido.' });
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const exists = await db.getAdminUserByEmail(email);
    if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    const hash = await bcrypt.hash(password, 12);
    const user = await db.createAdminUser({ name, email, role, password: hash });
    auditLog('ADMIN_USER_CREATED', {
      entity: 'admin_user',
      entity_id: user.id,
      summary: `Creo usuario ${user.email}`,
      user_email_created: user.email,
      role,
    }, req);
    res.status(201).json(user);
  } catch (e) {
    logger.error('[AdminUsers] Error creando usuario', { err: e.message });
    res.status(500).json({ error: 'Error creando usuario.' });
  }
});

app.patch('/api/admin/users/:id', authenticate, requireAdminRole, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const current = await db.getAdminUserById(id);
    if (!current) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const patch = {};
    if (req.body.name !== undefined) patch.name = cleanText(req.body.name, 120);
    if (req.body.email !== undefined) {
      patch.email = normalizeEmail(req.body.email);
      if (!isValidEmailFormat(patch.email)) return res.status(400).json({ error: 'Correo inválido.' });
    }
    if (req.body.role !== undefined) {
      patch.role = ['owner', 'admin', 'editor'].includes(req.body.role) ? req.body.role : current.role;
    }
    if (req.body.active !== undefined) {
      if (id === req.adminUser.id && req.body.active === false)
        return res.status(400).json({ error: 'No puedes desactivar tu propio usuario.' });
      patch.active = !!req.body.active;
    }
    if (patch.email && patch.email !== current.email) {
      const exists = await db.getAdminUserByEmail(patch.email);
      if (exists && exists.id !== id) return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    }
    const updated = await db.updateAdminUser(id, patch);
    auditLog('ADMIN_USER_UPDATED', {
      entity: 'admin_user',
      entity_id: id,
      summary: `Actualizo usuario ${updated.email}`,
      changes: patch,
    }, req);
    res.json(updated);
  } catch (e) {
    logger.error('[AdminUsers] Error actualizando usuario', { err: e.message });
    res.status(500).json({ error: 'Error actualizando usuario.' });
  }
});

app.post('/api/admin/users/:id/password', authenticate, requireAdminRole, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await db.getAdminUserById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const password = String(req.body?.password || '');
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const hash = await bcrypt.hash(password, 12);
    await db.updateAdminUserPassword(id, hash);
    if (id === req.adminUser.id) invalidateAllSessions();
    auditLog('ADMIN_USER_PASSWORD_CHANGED', {
      entity: 'admin_user',
      entity_id: id,
      summary: `Cambio contraseña de usuario ${user.email}`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error actualizando contraseña.' });
  }
});

app.get('/api/admin/audit', authenticate, requireAdminRole, async (req, res) => {
  try {
    res.json(await db.listAuditEvents(req.query.limit || 150));
  } catch (e) {
    res.status(500).json({ error: 'Error cargando historial.' });
  }
});

// ── Contacto ──────────────────────────────────
const contactValidators = [
  body('name').trim().notEmpty().withMessage('Nombre requerido.').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('message').trim().notEmpty().withMessage('Mensaje requerido.').isLength({ max: 5000 }),
];

app.post('/api/contact', contactLimiter, csrfProtect, contactValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ error: errors.array()[0].msg });

  const { name, email, phone, message } = req.body;

  try {
    await db.createContact({
      id:      Date.now(),
      name, email, phone: phone || '',
      message,
      date:    new Date().toISOString(),
      read:    false,
    });
  } catch (e) {
    logger.error('[Contacto] Error guardando contacto', { err: e.message });
  }

  const transport = createMailTransport();
  let emailOk = false;

  if (transport) {
    try {
      await transport.sendMail({
        from:    `"Mark Publicidad Web" <${getMailFromAddress()}>`,
        to:      process.env.CONTACT_EMAIL || getMailFromAddress(),
        replyTo: email,
        subject: `Nuevo mensaje de ${name} — Mark Publicidad`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0071e3;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h2 style="color:white;margin:0;font-size:1.4rem;">Nuevo mensaje de contacto</h2>
              <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Mark Publicidad Impresa</p>
            </div>
            <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;width:120px;color:#6b7280;font-size:0.9rem;">Nombre</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.9rem;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.9rem;">Teléfono</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(phone) || '—'}</td></tr>
                <tr><td style="padding:10px 0;color:#6b7280;font-size:0.9rem;vertical-align:top;">Mensaje</td><td style="padding:10px 0;line-height:1.6;">${escapeHtml(message).replace(/\n/g, '<br>')}</td></tr>
              </table>
            </div>
            <div style="background:#f9fafb;padding:16px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;font-size:0.8rem;color:#9ca3af;text-align:center;">
              Enviado desde el sitio web de Mark Publicidad Impresa • ${new Date().toLocaleString('es-EC')}
            </div>
          </div>
        `,
      });
      emailOk = true;
    } catch (err) {
      logger.error('[Contacto] Error email', { err: err.message });
    }
  }

  res.json({ success: true, message: '¡Mensaje enviado correctamente!', results: { email: emailOk } });

  if (transport && emailOk) {
    transport.sendMail({
      from:    `"Mark Publicidad Impresa" <${getMailFromAddress()}>`,
      to:      email,
      subject: `Recibimos tu mensaje — Mark Publicidad`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#E30613;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h2 style="color:white;margin:0;font-size:1.4rem;">¡Gracias por contactarnos, ${escapeHtml(name)}!</h2>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p>Recibimos tu mensaje y te responderemos a la brevedad posible.</p>
            <p style="color:#6b7280;font-size:0.9rem;border-left:3px solid #e5e7eb;padding-left:1rem;margin:1.5rem 0;">${escapeHtml(message).replace(/\n/g, '<br>')}</p>
            <p style="color:#9ca3af;font-size:0.8rem;margin-top:2rem;">— Equipo Mark Publicidad Impresa · Ibarra, Ecuador</p>
          </div>
        </div>
      `,
    }).catch(() => {});
  }
});

// ── Historial de contactos (admin) ────────────
app.get('/api/contacts', authenticate, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await db.getContacts());
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo contactos' });
  }
});

app.patch('/api/contacts/:id/read', authenticate, async (req, res) => {
  try {
    const ok = await db.markContactRead(+req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    auditLog('CONTACT_MARK_READ', {
      entity: 'contact',
      entity_id: req.params.id,
      summary: `Marco contacto ${req.params.id} como leido`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

app.delete('/api/contacts/:id', authenticate, async (req, res) => {
  try {
    const ok = await db.deleteContact(+req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    auditLog('CONTACT_DELETE', {
      entity: 'contact',
      entity_id: req.params.id,
      summary: `Elimino contacto ${req.params.id}`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

async function uploadToCloudinary(filePath, resourceType) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder:        CLOUDINARY_FOLDER,
    resource_type: resourceType,
    use_filename:  false,
    unique_filename: true,
    overwrite:     false,
  });
  return {
    url:      result.secure_url,
    publicId: result.public_id,
    filename: result.public_id.split('/').pop(),
    size:     result.bytes,
    date:     result.created_at,
  };
}

function removeTempUpload(filePath) {
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => {});
}

async function listCloudinaryImages() {
  const result = await cloudinary.api.resources({
    type:          'upload',
    resource_type: 'image',
    prefix:        `${CLOUDINARY_FOLDER}/`,
    max_results:   100,
  });
  return (result.resources || []).map(r => ({
    filename: r.public_id.split('/').pop(),
    deleteId: r.public_id,
    url:      r.secure_url,
    size:     r.bytes,
    date:     r.created_at,
    storage:  'cloudinary',
  }));
}

function isCloudinaryUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

function localUploadPathFromUrl(value) {
  const raw = String(value || '');
  if (!raw || raw.includes('..')) return null;
  try {
    const baseIsAbsolute = /^https?:\/\//i.test(PUBLIC_UPLOADS_URL);
    const rawIsAbsolute = /^https?:\/\//i.test(raw);
    if (!baseIsAbsolute && rawIsAbsolute) return null;
    const publicBase = new URL(PUBLIC_UPLOADS_URL, 'http://local.invalid');
    const candidate = new URL(raw, publicBase.origin);
    if (baseIsAbsolute && candidate.origin !== publicBase.origin) return null;
    const basePath = publicBase.pathname.replace(/\/+$/, '');
    if (candidate.pathname.startsWith(`${basePath}/`)) {
      const relativePath = decodeURIComponent(candidate.pathname.slice(basePath.length + 1));
      if (!relativePath || relativePath.includes('..')) return null;
      return path.join(UPLOADS_DIR, relativePath);
    }
  } catch {}
  if (raw.startsWith('/uploads/') && !raw.includes('..')) {
    return path.join(UPLOADS_DIR, decodeURIComponent(raw.slice('/uploads/'.length)));
  }
  return null;
}

// ── Subida archivos ───────────────────────────
app.post('/api/upload/video', authenticate, videoUpload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  if (!CLOUDINARY_ENABLED) {
    auditLog('VIDEO_UPLOAD', {
      entity: 'upload',
      entity_id: req.file.filename,
      summary: `Subio video ${req.file.filename}`,
      size: req.file.size,
      storage: 'local',
    }, req);
    return res.json({ url: publicUploadUrl('videos', req.file.filename), filename: req.file.filename, size: req.file.size, storage: 'local' });
  }
  try {
    const uploaded = await uploadToCloudinary(req.file.path, 'video');
    removeTempUpload(req.file.path);
    auditLog('VIDEO_UPLOAD', {
      entity: 'upload',
      entity_id: uploaded.publicId,
      summary: `Subio video ${uploaded.filename}`,
      size: uploaded.size,
      storage: 'cloudinary',
    }, req);
    res.json({ ...uploaded, storage: 'cloudinary' });
  } catch (e) {
    removeTempUpload(req.file.path);
    logger.error('[Uploads] Error subiendo video a Cloudinary', { err: e.message });
    res.status(500).json({ error: 'Error subiendo video.' });
  }
});

app.delete('/api/upload/video/cloudinary', authenticate, async (req, res) => {
  if (!CLOUDINARY_ENABLED) return res.status(400).json({ error: 'Cloudinary no configurado.' });
  if (!req.query.public_id) return res.status(400).json({ error: 'public_id requerido.' });
  try {
    await cloudinary.uploader.destroy(String(req.query.public_id), { resource_type: 'video' });
    auditLog('VIDEO_DELETE', {
      entity: 'upload',
      entity_id: req.query.public_id,
      summary: `Elimino video Cloudinary ${req.query.public_id}`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    logger.error('[Uploads] Error eliminando video Cloudinary', { err: e.message });
    res.status(500).json({ error: 'Error eliminando video.' });
  }
});

app.delete('/api/upload/video/:filename', authenticate, async (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('/') || filename.includes('..')) return res.status(400).json({ error: 'Nombre inválido' });
  const filepath = path.join(VIDEOS_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    auditLog('VIDEO_DELETE', {
      entity: 'upload',
      entity_id: filename,
      summary: `Elimino video ${filename}`,
    }, req);
    res.json({ success: true });
  }
  else res.status(404).json({ error: 'Archivo no encontrado' });
});

app.post('/api/upload', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  if (!CLOUDINARY_ENABLED) {
    auditLog('IMAGE_UPLOAD', {
      entity: 'upload',
      entity_id: req.file.filename,
      summary: `Subio imagen ${req.file.filename}`,
      size: req.file.size,
      storage: 'local',
    }, req);
    return res.json({ url: publicUploadUrl(req.file.filename), filename: req.file.filename, size: req.file.size, storage: 'local' });
  }
  try {
    const uploaded = await uploadToCloudinary(req.file.path, 'image');
    removeTempUpload(req.file.path);
    auditLog('IMAGE_UPLOAD', {
      entity: 'upload',
      entity_id: uploaded.publicId,
      summary: `Subio imagen ${uploaded.filename}`,
      size: uploaded.size,
      storage: 'cloudinary',
    }, req);
    res.json({ ...uploaded, storage: 'cloudinary' });
  } catch (e) {
    removeTempUpload(req.file.path);
    logger.error('[Uploads] Error subiendo imagen a Cloudinary', { err: e.message });
    res.status(500).json({ error: 'Error subiendo imagen.' });
  }
});

app.delete('/api/upload/cloudinary', authenticate, async (req, res) => {
  if (!CLOUDINARY_ENABLED) return res.status(400).json({ error: 'Cloudinary no configurado.' });
  if (!req.query.public_id) return res.status(400).json({ error: 'public_id requerido.' });
  try {
    await cloudinary.uploader.destroy(String(req.query.public_id), { resource_type: 'image' });
    auditLog('IMAGE_DELETE', {
      entity: 'upload',
      entity_id: req.query.public_id,
      summary: `Elimino imagen Cloudinary ${req.query.public_id}`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    logger.error('[Uploads] Error eliminando imagen Cloudinary', { err: e.message });
    res.status(500).json({ error: 'Error eliminando imagen.' });
  }
});

app.delete('/api/upload/:filename', authenticate, async (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('/') || filename.includes('..')) return res.status(400).json({ error: 'Nombre inválido' });
  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    auditLog('IMAGE_DELETE', {
      entity: 'upload',
      entity_id: filename,
      summary: `Elimino imagen ${filename}`,
    }, req);
    res.json({ success: true });
  }
  else res.status(404).json({ error: 'Archivo no encontrado' });
});

app.get('/api/uploads', authenticate, async (req, res) => {
  try {
    if (CLOUDINARY_ENABLED) return res.json(await listCloudinaryImages());

    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => ({
        filename: f,
        deleteId: f,
        url:  publicUploadUrl(f),
        size: fs.statSync(path.join(UPLOADS_DIR, f)).size,
        date: fs.statSync(path.join(UPLOADS_DIR, f)).mtime,
        storage: 'local',
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: 'Error listando archivos' });
  }
});

// ── Reseñas ───────────────────────────────────
app.get('/api/reviews', async (req, res) => {
  try {
    const list = await db.getReviews();
    res.json(list.filter(r => r.approved));
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo reseñas' });
  }
});

app.get('/api/reviews/all', authenticate, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await db.getReviews());
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo reseñas' });
  }
});

const reviewValidators = [
  body('name').trim().notEmpty().withMessage('Nombre requerido.').isLength({ max: 80 }),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Calificación inválida (1–5 estrellas).'),
  body('comment').trim().notEmpty().withMessage('Comentario requerido.').isLength({ max: 1000 }),
];

app.post('/api/reviews', reviewLimiter, csrfProtect, reviewValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ error: errors.array()[0].msg });

  const { name, rating, comment } = req.body;
  const review = {
    id:       Date.now(),
    name:     name.trim(),
    rating:   parseInt(rating),
    comment:  comment.trim(),
    date:     new Date().toISOString(),
    approved: false,
  };
  try {
    await db.createReview(review);
    res.status(201).json({ success: true, message: '¡Gracias! Tu reseña está pendiente de aprobación.' });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando reseña' });
  }
});

app.patch('/api/reviews/:id/approve', authenticate, async (req, res) => {
  try {
    const ok = await db.approveReview(+req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrada' });
    auditLog('REVIEW_APPROVE', {
      entity: 'review',
      entity_id: req.params.id,
      summary: `Aprobo reseña ${req.params.id}`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

app.delete('/api/reviews/:id', authenticate, async (req, res) => {
  try {
    await db.deleteReview(+req.params.id);
    auditLog('REVIEW_DELETE', {
      entity: 'review',
      entity_id: req.params.id,
      summary: `Elimino reseña ${req.params.id}`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// ── Portfolio ─────────────────────────────────
app.get('/api/portfolio', async (req, res) => {
  try { res.json(await db.getPortfolio()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo portfolio' }); }
});

app.post('/api/portfolio', authenticate, async (req, res) => {
  const { title, category, image } = req.body;
  if (!title || !image) return res.status(400).json({ error: 'Título e imagen son requeridos.' });
  const localPath = localUploadPathFromUrl(image);
  const localUpload = Boolean(localPath);
  const cloudUpload = isCloudinaryUrl(image);
  if (!localUpload && !cloudUpload)
    return res.status(400).json({ error: 'La imagen debe provenir de uploads o Cloudinary.' });
  if (localUpload) {
    if (!fs.existsSync(localPath))
      return res.status(400).json({ error: 'El archivo de imagen no existe en el servidor.' });
  }

  const item = {
    id:       Date.now(),
    title:    title.trim().substring(0, 120),
    category: (category || 'general').trim().substring(0, 60),
    image,
    date:     new Date().toISOString(),
  };

  try {
    await db.createPortfolioItem(item);
    auditLog('PORTFOLIO_CREATE', {
      entity: 'portfolio',
      entity_id: item.id,
      summary: `Creo item de portfolio ${item.title}`,
      title: item.title,
    }, req);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ error: 'Error guardando item de portfolio' });
  }
});

app.delete('/api/portfolio/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await db.deletePortfolioItem(id);
    auditLog('PORTFOLIO_DELETE', {
      entity: 'portfolio',
      entity_id: id,
      summary: `Elimino item de portfolio ${id}`,
    }, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// ── Productos ─────────────────────────────────
app.get('/api/products', async (req, res) => {
  try { res.json(await db.getProducts()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo productos' }); }
});

const PRODUCT_FIELDS = [
  'name',
  'category',
  'description',
  'image',
  'features',
  'price',
  'priceUnit',
  'priceNote',
  'deliveryTime',
  'materials',
  'minQuantity',
  'popular',
  'active',
];

function cleanText(value, max = 240) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, max);
}

function sanitizeProductImage(value) {
  const image = cleanText(value, 500);
  if (!image) return '📦';

  if (image.startsWith('/uploads/') && !image.includes('..')) return image;
  if (image.startsWith('images/') && !image.includes('..')) return image;

  try {
    const url = new URL(image);
    if (url.protocol === 'https:') return url.href;
  } catch {}

  return cleanText(image, 16) || '📦';
}

function sanitizeProduct(body) {
  const p = {};
  for (const key of PRODUCT_FIELDS) {
    if (key in body) p[key] = body[key];
  }
  if (typeof p.features === 'string')
    p.features = p.features.split('\n').map(f => f.trim()).filter(Boolean);
  if (Array.isArray(p.features))
    p.features = p.features.map(f => cleanText(f, 120)).filter(Boolean).slice(0, 12);
  if (p.name        && typeof p.name        === 'string') p.name        = cleanText(p.name, 120);
  if (p.category    && typeof p.category    === 'string') p.category    = cleanText(p.category, 60);
  if (p.description && typeof p.description === 'string') p.description = cleanText(p.description, 2000);
  if (p.priceUnit   && typeof p.priceUnit   === 'string') p.priceUnit   = cleanText(p.priceUnit, 80);
  if (p.materials   && typeof p.materials   === 'string') p.materials   = cleanText(p.materials, 160);
  if (p.deliveryTime && typeof p.deliveryTime === 'string') p.deliveryTime = cleanText(p.deliveryTime, 120);
  if ('image' in p) p.image = sanitizeProductImage(p.image);
  if ('price' in p) p.price = Number.isFinite(Number(p.price)) ? Number(p.price) : 0;
  if ('minQuantity' in p) p.minQuantity = Math.max(1, parseInt(p.minQuantity, 10) || 1);
  if ('popular' in p) p.popular = Boolean(p.popular);
  return p;
}

app.post('/api/products', authenticate, async (req, res) => {
  try {
    const p = sanitizeProduct(req.body);
    const product = await db.createProduct(p);
    auditLog('PRODUCT_CREATE', {
      entity: 'product',
      entity_id: product.id,
      summary: `Creo producto ${product.name}`,
      name: product.name,
    }, req);
    res.status(201).json(product);
  } catch (e) { res.status(500).json({ error: 'Error creando producto' }); }
});

app.put('/api/products/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const p = sanitizeProduct(req.body);
    const updated = await db.updateProduct(id, p);
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    auditLog('PRODUCT_UPDATE', {
      entity: 'product',
      entity_id: id,
      summary: `Actualizo producto ${updated.name || id}`,
      fields: Object.keys(p),
    }, req);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Error actualizando' }); }
});

app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const ok = await db.deleteProduct(id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    auditLog('PRODUCT_DELETE', {
      entity: 'product',
      entity_id: id,
      summary: `Elimino producto ${id}`,
    }, req);
    res.json({ success: true, deleted: id });
  } catch (e) { res.status(500).json({ error: 'Error eliminando' }); }
});

// ── Precios del cotizador ─────────────────────
app.get('/api/pricing', async (req, res) => {
  try { res.json(await db.getPricing()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo precios' }); }
});

app.put('/api/pricing', authenticate, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
      return res.status(400).json({ error: 'Formato de precios inválido.' });
    await db.savePricing(req.body);
    auditLog('PRICING_UPDATE', {
      entity: 'pricing',
      entity_id: 'singleton',
      summary: 'Actualizo precios del cotizador',
      sections: Object.keys(req.body.pricing || {}),
    }, req);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error guardando precios' }); }
});

// ── Configuración ─────────────────────────────
app.get('/api/settings', async (req, res) => {
  try { res.json(await db.getSettings()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo configuración' }); }
});

app.put('/api/settings', authenticate, async (req, res) => {
  try {
    const body    = req.body;
    const current = await db.getSettings();
    const allowed = { ...current };
    if (Array.isArray(body.videos)) allowed.videos = body.videos.slice(0, 20);
    if (body.socialMedia && typeof body.socialMedia === 'object' && !Array.isArray(body.socialMedia)) {
      const SM_KEYS = ['facebook','instagram','twitter','tiktok','youtube','whatsapp'];
      allowed.socialMedia = { ...(allowed.socialMedia || {}) };
      for (const k of SM_KEYS) {
        if (body.socialMedia[k] !== undefined)
          allowed.socialMedia[k] = String(body.socialMedia[k]).substring(0, 200);
      }
    }
    await db.saveSettings(allowed);
    auditLog('SETTINGS_UPDATE', {
      entity: 'settings',
      entity_id: 'singleton',
      summary: 'Actualizo configuracion del sitio',
      sections: Object.keys(body || {}),
    }, req);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error guardando configuración' }); }
});

// ── Rutas HTML (con inyección de nonce CSP) ───
app.get('/',        serveHtmlWithNonce(path.join(__dirname, 'index.html')));
app.get('/admin',   serveHtmlWithNonce(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/',  serveHtmlWithNonce(path.join(__dirname, 'admin', 'index.html')));

// ── Inicio ────────────────────────────────────
app.listen(PORT, async () => {
  // Conectar e inicializar Base de Datos (PostgreSQL o local fallback JSON)
  const isPostgres = await db.connectDb();
  const authConfig = await getAuthData();

  const emailOk    = process.env.GMAIL_USER && process.env.GMAIL_PASS && !process.env.GMAIL_PASS.includes('xxxx');
  const smtpOk     = process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS && !String(process.env.MAIL_PASS).includes('xxxx');
  const jwtOk      = !!process.env.JWT_SECRET;
  const passwordOk = !!(authConfig && authConfig.password);
  const adminEmailOk = !!(authConfig && authConfig.email);
  const uploadStorageOk = ['local', 'cloudinary'].includes(UPLOAD_STORAGE);
  const localUploadsExplicit = !!process.env.UPLOADS_DIR;
  let localUploadsWritable = false;
  try {
    fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
    fs.accessSync(VIDEOS_DIR, fs.constants.W_OK);
    localUploadsWritable = true;
  } catch {}

  // En producción, forzar variables críticas
  if (IS_PRODUCTION) {
    if (!isPostgres) {
      logger.error('[Fatal] DATABASE_URL/PostgreSQL es obligatorio en producción. Abortando arranque.');
      process.exit(1);
    }
    if (!jwtOk) {
      logger.error('[Fatal] JWT_SECRET es obligatorio en producción. Abortando arranque.');
      process.exit(1);
    }
    if (!passwordOk) {
      logger.error('[Fatal] Contraseña de administrador obligatoria en producción. Abortando arranque.');
      process.exit(1);
    }
    if (!adminEmailOk) {
      logger.error('[Fatal] Correo de administrador obligatorio en producción. Configura ADMIN_EMAIL o guarda un email admin.');
      process.exit(1);
    }
    if (!uploadStorageOk) {
      logger.error('[Fatal] UPLOAD_STORAGE inválido. Usa "local" para NAS o "cloudinary".');
      process.exit(1);
    }
    if (UPLOAD_STORAGE === 'cloudinary' && !CLOUDINARY_CONFIGURED) {
      logger.error('[Fatal] UPLOAD_STORAGE=cloudinary requiere CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.');
      process.exit(1);
    }
    if (UPLOAD_STORAGE === 'local' && (!localUploadsExplicit || !localUploadsWritable)) {
      logger.error('[Fatal] UPLOAD_STORAGE=local requiere UPLOADS_DIR explícito y escribible en producción.', {
        uploadsDir: UPLOADS_DIR,
        videosDir: VIDEOS_DIR,
      });
      process.exit(1);
    }
  }

  const emailDisplay = smtpOk
    ? 'OK (SMTP ' + String(process.env.MAIL_HOST).trim() + ')'
    : emailOk
      ? 'OK (' + maskEmail(process.env.GMAIL_USER) + ')'
      : 'PENDIENTE — configura MAIL_HOST/MAIL_USER/MAIL_PASS o GMAIL_USER/GMAIL_PASS en .env';
  const adminEmailDisplay = adminEmailOk
    ? 'OK (' + maskEmail(authConfig.email) + ')'
    : 'FALTA ADMIN_EMAIL o email guardado en credenciales';

  logger.info(`Servidor Mark Publicidad iniciado en puerto ${PORT}`);

  console.log('');
  console.log('  Mark Publicidad — servidor corriendo');
  console.log(`  Sitio web:   http://localhost:${PORT}`);
  console.log(`  Panel admin: http://localhost:${PORT}/admin`);
  console.log('');
  console.log(`  Database:    ${isPostgres ? 'POSTGRESQL (Producción)' : 'JSON LOCAL (Desarrollo / Fallback)'}`);
  console.log(`  Email:       ${emailDisplay}`);
  console.log(`  Admin email: ${adminEmailDisplay}`);
  console.log(`  Admin pass:  ${passwordOk ? 'OK' : 'FALTA ADMIN_PASSWORD en .env'}`);
  console.log(`  JWT_SECRET:  ${jwtOk ? 'OK' : 'NO CONFIGURADO — sesiones no sobreviviran reinicios'}`);
  console.log(`  Uploads:     ${UPLOAD_STORAGE === 'cloudinary' ? 'Cloudinary' : 'Local/NAS'} (${UPLOADS_DIR})`);
  console.log(`  Upload URL:  ${PUBLIC_UPLOADS_URL}`);
  console.log('');
});
