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

const {
  createSession,
  isValidSession,
  invalidateSession,
  invalidateAllSessions,
} = require('./lib/jwt-session');
const logger = require('./lib/logger');
const { csrfCookie, csrfProtect, csrfTokenEndpoint } = require('./lib/csrf');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Rutas de datos ────────────────────────────
const DATA_FILE      = path.join(__dirname, 'data', 'products.json');
const PRICING_FILE   = path.join(__dirname, 'data', 'pricing.json');
const SETTINGS_FILE  = path.join(__dirname, 'data', 'settings.json');
const CONTACTS_FILE  = path.join(__dirname, 'data', 'contacts.json');
const AUTH_FILE      = path.join(__dirname, 'data', 'auth.json');
const REVIEWS_FILE   = path.join(__dirname, 'data', 'reviews.json');
const PORTFOLIO_FILE = path.join(__dirname, 'data', 'portfolio.json');
const UPLOADS_DIR    = path.join(__dirname, 'uploads');
const VIDEOS_DIR     = path.join(__dirname, 'uploads', 'videos');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ── Auth helpers ──────────────────────────────
function getAuthData() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      if (data.password) return data;
    }
  } catch {}
  if (!ADMIN_PASSWORD) {
    logger.error('[Auth] ADMIN_PASSWORD no configurado y no existe auth.json — login bloqueado');
    return null;
  }
  return { password: ADMIN_PASSWORD };
}

async function verifyPassword(input) {
  const auth = getAuthData();
  if (!auth) return false;
  if (auth.password.startsWith('$2')) {
    return bcrypt.compare(input, auth.password);
  }
  // Texto plano: verificar y migrar automáticamente a bcrypt
  if (input !== auth.password) return false;
  const hash = await bcrypt.hash(input, 12);
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ ...auth, password: hash }, null, 2), 'utf8');
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

function createResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, Date.now() + RESET_TTL_MS);
  return token;
}
function isValidResetToken(token) {
  if (!token || !resetTokens.has(token)) return false;
  if (Date.now() > resetTokens.get(token)) { resetTokens.delete(token); return false; }
  return true;
}

// ── 2FA challenge tokens (5 min, solo en memoria) ──
const challengeTokens = new Map();

function createChallengeToken() {
  const token = crypto.randomBytes(32).toString('hex');
  challengeTokens.set(token, Date.now() + 5 * 60 * 1000);
  return token;
}
function isValidChallengeToken(token) {
  if (!token || !challengeTokens.has(token)) return false;
  if (Date.now() > challengeTokens.get(token)) { challengeTokens.delete(token); return false; }
  return true;
}
function consumeChallengeToken(token) {
  challengeTokens.delete(token);
}

// ── Carpetas necesarias ────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR))  fs.mkdirSync(VIDEOS_DIR,  { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// ── Multer — imágenes ─────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const rand = crypto.randomBytes(12).toString('hex');
    cb(null, `${rand}${ext}`);
  },
});
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    ALLOWED_MIME_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Tipo no permitido. Acepta: JPG, PNG, WEBP, GIF, PDF'));
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
    const ok = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/ogg'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Solo videos MP4/WEBM/MOV/AVI'));
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ── Nodemailer ────────────────────────────────
function createMailTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS ||
      process.env.GMAIL_PASS.includes('xxxx')) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS.replace(/\s/g, ''),
    },
  });
}

// ── Rate limiters ─────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados mensajes enviados. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const reviewLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { error: 'Ya enviaste el máximo de reseñas por hoy. Intenta mañana.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Demasiados intentos. Espera 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
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

function auditLog(action, details, req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?';
  logger.warn(`[AUDIT] ${action}`, { ip, ...details });
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
  strictTransportSecurity: process.env.NODE_ENV === 'production'
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
app.use('/admin', (req, res, next) => {
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
  skip: (req) => req.method === 'GET' && req.path.startsWith('/uploads/'),
});
app.use(globalLimiter);

// 6. CSRF cookie (pública, genera cookie en cada visita)
app.use(csrfCookie);

// ── Bloquear archivos sensibles del servidor ──
// Previene que express.static exponga server.js, package.json, etc.
const PRIVATE_PATH_RE = /^\/(?:server\.js|package(?:-lock)?\.json|[^/]*\.md|lib\/|data\/|logs\/|node_modules\/|\.env|index\.html$|admin\/index\.html$)/i;
app.use((req, res, next) => {
  if (PRIVATE_PATH_RE.test(req.path)) return res.status(403).end();
  next();
});

// ── Archivos estáticos ────────────────────────
app.use(express.static(__dirname, { dotfiles: 'deny', index: false, redirect: false }));
app.use('/uploads',        express.static(UPLOADS_DIR));
app.use('/uploads/videos', express.static(VIDEOS_DIR));
app.use('/admin',          express.static(path.join(__dirname, 'admin'), { index: false, redirect: false }));

// ── Helpers de datos (JSON) ───────────────────
function readProducts()  { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeProducts(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8'); }
function readPricing()   { return JSON.parse(fs.readFileSync(PRICING_FILE, 'utf8')); }
function writePricing(d) { fs.writeFileSync(PRICING_FILE, JSON.stringify(d, null, 2), 'utf8'); }
function readSettings()  {
  if (!fs.existsSync(SETTINGS_FILE)) return { videos: [], socialMedia: {} };
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}
function writeSettings(d){ fs.writeFileSync(SETTINGS_FILE, JSON.stringify(d, null, 2), 'utf8'); }
function readContacts()  {
  if (!fs.existsSync(CONTACTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); } catch { return []; }
}
function writeContacts(d){ fs.writeFileSync(CONTACTS_FILE, JSON.stringify(d, null, 2), 'utf8'); }
function readReviews()   {
  if (!fs.existsSync(REVIEWS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')); } catch { return []; }
}
function writeReviews(d) { fs.writeFileSync(REVIEWS_FILE, JSON.stringify(d, null, 2), 'utf8'); }
function readPortfolio() {
  if (!fs.existsSync(PORTFOLIO_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PORTFOLIO_FILE, 'utf8')); } catch { return []; }
}
function writePortfolio(d){ fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(d, null, 2), 'utf8'); }

// ── Middleware de autenticación ───────────────
function authenticate(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!isValidSession(token))
    return res.status(401).json({ error: 'No autorizado' });
  req.adminToken = token; // para usarlo en logout/invalidar
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
  const { password, totpCode } = req.body;

  const ok = await verifyPassword(password);
  if (!ok) {
    auditLog('LOGIN_FAILED', {}, req);
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const auth = getAuthData();
  if (auth && auth.totp_enabled && auth.totp_secret) {
    // 2FA habilitado: verificar código TOTP
    if (!totpCode) {
      // Primera fase: contraseña correcta, pedir TOTP
      const challengeToken = createChallengeToken();
      auditLog('LOGIN_2FA_CHALLENGE', {}, req);
      return res.json({ twoFaRequired: true, challengeToken });
    }
    // Si ya viene con desafío y código en el mismo request
    const verified = speakeasy.totp.verify({
      secret:   auth.totp_secret,
      encoding: 'base32',
      token:    String(totpCode),
      window:   1,
    });
    if (!verified) {
      auditLog('LOGIN_2FA_FAILED', {}, req);
      return res.status(401).json({ error: 'Código 2FA incorrecto.' });
    }
  }

  auditLog('LOGIN_OK', {}, req);
  res.json({ token: createSession(), success: true });
});

// Segunda fase del login 2FA
app.post('/api/auth/2fa/challenge', authLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { challengeToken, totpCode } = req.body;

  if (!isValidChallengeToken(challengeToken))
    return res.status(401).json({ error: 'Sesión de verificación expirada. Inicia sesión de nuevo.' });

  const auth = getAuthData();
  if (!auth || !auth.totp_enabled || !auth.totp_secret)
    return res.status(400).json({ error: '2FA no está configurado.' });

  const verified = speakeasy.totp.verify({
    secret:   auth.totp_secret,
    encoding: 'base32',
    token:    String(totpCode || ''),
    window:   1,
  });

  if (!verified) {
    auditLog('LOGIN_2FA_FAILED', {}, req);
    return res.status(401).json({ error: 'Código 2FA incorrecto.' });
  }

  consumeChallengeToken(challengeToken);
  auditLog('LOGIN_OK_2FA', {}, req);
  res.json({ token: createSession(), success: true });
});

// ── Auth: logout ──────────────────────────────
app.post('/api/auth/logout', authenticate, (req, res) => {
  invalidateSession(req.adminToken);
  auditLog('LOGOUT', {}, req);
  res.json({ success: true });
});

// ── Auth: recuperar contraseña ─────────────────
app.post('/api/auth/forgot', forgotLimiter, async (req, res) => {
  const transport = createMailTransport();
  if (!transport) return res.status(503).json({ error: 'Email no configurado en el servidor.' });

  const token    = createResetToken();
  const siteUrl  = process.env.SITE_URL || `http://localhost:${PORT}`;
  const resetLink = `${siteUrl}/admin?reset_token=${token}`;

  try {
    await transport.sendMail({
      from:    `"Mark Publicidad Admin" <${process.env.GMAIL_USER}>`,
      to:      process.env.GMAIL_USER,
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
    auditLog('PASSWORD_RESET_REQUESTED', {}, req);
    res.json({ success: true });
  } catch (e) {
    logger.error('[Auth] Error enviando email de recuperación', { err: e.message });
    res.status(500).json({ error: 'Error enviando el email.' });
  }
});

app.get('/api/auth/reset-token', (req, res) => {
  res.json({ valid: isValidResetToken(req.query.token) });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!isValidResetToken(token))
    return res.status(400).json({ error: 'Enlace inválido o expirado. Solicita uno nuevo.' });

  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const hash = await bcrypt.hash(newPassword, 12);
    const auth = getAuthData() || {};
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ ...auth, password: hash }, null, 2), 'utf8');
    resetTokens.delete(token);
    invalidateAllSessions();
    auditLog('PASSWORD_RESET_OK', {}, req);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando la contraseña.' });
  }
});

app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ok = await verifyPassword(currentPassword);
  if (!ok)
    return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });

  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const hash = await bcrypt.hash(newPassword, 12);
    const auth = getAuthData() || {};
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ ...auth, password: hash }, null, 2), 'utf8');
    invalidateAllSessions();
    const newToken = createSession();
    auditLog('PASSWORD_CHANGED', {}, req);
    res.json({ success: true, token: newToken });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando la contraseña.' });
  }
});

// ── 2FA: configurar TOTP ──────────────────────
app.get('/api/auth/2fa/setup', authenticate, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name:   'Mark Publicidad Admin',
    length: 20,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    // Guardamos el secreto temporalmente (no habilitado hasta verificar)
    const auth = getAuthData() || {};
    fs.writeFileSync(AUTH_FILE, JSON.stringify({
      ...auth,
      totp_secret:  secret.base32,
      totp_enabled: false,
    }, null, 2), 'utf8');
    res.json({ qrCode: qrDataUrl, secret: secret.base32 });
  } catch (e) {
    res.status(500).json({ error: 'Error generando código QR.' });
  }
});

app.post('/api/auth/2fa/enable', authenticate, (req, res) => {
  const { code } = req.body;
  const auth = getAuthData();
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

  fs.writeFileSync(AUTH_FILE, JSON.stringify({ ...auth, totp_enabled: true }, null, 2), 'utf8');
  auditLog('2FA_ENABLED', {}, req);
  res.json({ success: true });
});

app.post('/api/auth/2fa/disable', authenticate, async (req, res) => {
  const { password } = req.body;
  const ok = await verifyPassword(password);
  if (!ok)
    return res.status(401).json({ error: 'Contraseña incorrecta.' });

  const auth = getAuthData() || {};
  const { totp_secret: _s, totp_enabled: _e, ...rest } = auth;
  fs.writeFileSync(AUTH_FILE, JSON.stringify(rest, null, 2), 'utf8');
  auditLog('2FA_DISABLED', {}, req);
  res.json({ success: true });
});

app.get('/api/auth/2fa/status', authenticate, (req, res) => {
  const auth = getAuthData();
  res.json({ enabled: !!(auth && auth.totp_enabled) });
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
    const contacts = readContacts();
    contacts.unshift({
      id:      Date.now(),
      name, email, phone: phone || '',
      message,
      date:    new Date().toISOString(),
      read:    false,
    });
    writeContacts(contacts);
  } catch (e) {
    logger.error('[Contacto] Error guardando contacto', { err: e.message });
  }

  const transport = createMailTransport();
  let emailOk = false;

  if (transport) {
    try {
      await transport.sendMail({
        from:    `"Mark Publicidad Web" <${process.env.GMAIL_USER}>`,
        to:      process.env.CONTACT_EMAIL || process.env.GMAIL_USER,
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
      from:    `"Mark Publicidad Impresa" <${process.env.GMAIL_USER}>`,
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
app.get('/api/contacts', authenticate, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(readContacts());
});

app.patch('/api/contacts/:id/read', authenticate, (req, res) => {
  const contacts = readContacts();
  const c = contacts.find(x => x.id === +req.params.id);
  if (!c) return res.status(404).json({ error: 'No encontrado' });
  c.read = true;
  writeContacts(contacts);
  res.json({ success: true });
});

app.delete('/api/contacts/:id', authenticate, (req, res) => {
  const contacts = readContacts().filter(x => x.id !== +req.params.id);
  writeContacts(contacts);
  res.json({ success: true });
});

// ── Subida archivos ───────────────────────────
app.post('/api/upload/video', authenticate, videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  res.json({ url: `/uploads/videos/${req.file.filename}`, filename: req.file.filename, size: req.file.size });
});

app.delete('/api/upload/video/:filename', authenticate, (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('/') || filename.includes('..'))
    return res.status(400).json({ error: 'Nombre inválido' });
  const filepath = path.join(VIDEOS_DIR, filename);
  if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); res.json({ success: true }); }
  else res.status(404).json({ error: 'Archivo no encontrado' });
});

app.post('/api/upload', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename, size: req.file.size });
});

app.delete('/api/upload/:filename', authenticate, (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('/') || filename.includes('..'))
    return res.status(400).json({ error: 'Nombre inválido' });
  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); res.json({ success: true }); }
  else res.status(404).json({ error: 'Archivo no encontrado' });
});

app.get('/api/uploads', authenticate, (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => ({
        filename: f,
        url:  `/uploads/${f}`,
        size: fs.statSync(path.join(UPLOADS_DIR, f)).size,
        date: fs.statSync(path.join(UPLOADS_DIR, f)).mtime,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: 'Error listando archivos' });
  }
});

// ── Reseñas ───────────────────────────────────
app.get('/api/reviews', (req, res) => {
  res.json(readReviews().filter(r => r.approved));
});

app.get('/api/reviews/all', authenticate, (req, res) => {
  res.json(readReviews());
});

const reviewValidators = [
  body('name').trim().notEmpty().withMessage('Nombre requerido.').isLength({ max: 80 }),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Calificación inválida (1–5 estrellas).'),
  body('comment').trim().notEmpty().withMessage('Comentario requerido.').isLength({ max: 1000 }),
];

app.post('/api/reviews', reviewLimiter, csrfProtect, reviewValidators, (req, res) => {
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
  const reviews = readReviews();
  reviews.unshift(review);
  writeReviews(reviews);
  res.status(201).json({ success: true, message: '¡Gracias! Tu reseña está pendiente de aprobación.' });
});

app.patch('/api/reviews/:id/approve', authenticate, (req, res) => {
  const reviews = readReviews();
  const r = reviews.find(x => x.id === +req.params.id);
  if (!r) return res.status(404).json({ error: 'No encontrada' });
  r.approved = true;
  writeReviews(reviews);
  res.json({ success: true });
});

app.delete('/api/reviews/:id', authenticate, (req, res) => {
  writeReviews(readReviews().filter(x => x.id !== +req.params.id));
  res.json({ success: true });
});

// ── Portfolio ─────────────────────────────────
app.get('/api/portfolio', (req, res) => {
  res.json(readPortfolio());
});

app.post('/api/portfolio', authenticate, (req, res) => {
  const { title, category, image } = req.body;
  if (!title || !image) return res.status(400).json({ error: 'Título e imagen son requeridos.' });
  if (typeof image !== 'string' || !image.startsWith('/uploads/') || image.includes('..'))
    return res.status(400).json({ error: 'La imagen debe provenir de /uploads/.' });
  const imagePath = path.join(__dirname, image);
  if (!fs.existsSync(imagePath))
    return res.status(400).json({ error: 'El archivo de imagen no existe en el servidor.' });
  const item = {
    id:       Date.now(),
    title:    title.trim().substring(0, 120),
    category: (category || 'general').trim().substring(0, 60),
    image,
    date:     new Date().toISOString(),
  };
  const items = readPortfolio();
  items.unshift(item);
  writePortfolio(items);
  auditLog('PORTFOLIO_CREATE', { id: item.id, title: item.title }, req);
  res.status(201).json(item);
});

app.delete('/api/portfolio/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  writePortfolio(readPortfolio().filter(x => x.id !== id));
  auditLog('PORTFOLIO_DELETE', { id }, req);
  res.json({ success: true });
});

// ── Productos ─────────────────────────────────
app.get('/api/products', (req, res) => {
  try { res.json(readProducts()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo productos' }); }
});

const PRODUCT_FIELDS = ['name','category','description','image','features','price','priceNote','deliveryTime','materials','active'];

function sanitizeProduct(body) {
  const p = {};
  for (const key of PRODUCT_FIELDS) {
    if (key in body) p[key] = body[key];
  }
  if (typeof p.features === 'string')
    p.features = p.features.split('\n').map(f => f.trim()).filter(Boolean);
  if (p.name        && typeof p.name        === 'string') p.name        = p.name.trim().substring(0, 120);
  if (p.category    && typeof p.category    === 'string') p.category    = p.category.trim().substring(0, 60);
  if (p.description && typeof p.description === 'string') p.description = p.description.substring(0, 2000);
  return p;
}

app.post('/api/products', authenticate, (req, res) => {
  try {
    const data    = readProducts();
    const maxId   = data.reduce((m, p) => Math.max(m, p.id), 0);
    const product = { ...sanitizeProduct(req.body), id: maxId + 1 };
    data.push(product);
    writeProducts(data);
    auditLog('PRODUCT_CREATE', { id: product.id, name: product.name }, req);
    res.status(201).json(product);
  } catch (e) { res.status(500).json({ error: 'Error creando producto' }); }
});

app.put('/api/products/:id', authenticate, (req, res) => {
  try {
    const data  = readProducts();
    const id    = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const index = data.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'No encontrado' });
    const updated = { ...data[index], ...sanitizeProduct(req.body), id };
    data[index] = updated;
    writeProducts(data);
    auditLog('PRODUCT_UPDATE', { id }, req);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Error actualizando' }); }
});

app.delete('/api/products/:id', authenticate, (req, res) => {
  try {
    const data     = readProducts();
    const id       = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const filtered = data.filter(p => p.id !== id);
    if (filtered.length === data.length)
      return res.status(404).json({ error: 'No encontrado' });
    writeProducts(filtered);
    auditLog('PRODUCT_DELETE', { id }, req);
    res.json({ success: true, deleted: id });
  } catch (e) { res.status(500).json({ error: 'Error eliminando' }); }
});

// ── Precios del cotizador ─────────────────────
app.get('/api/pricing', (req, res) => {
  try { res.json(readPricing()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo precios' }); }
});

app.put('/api/pricing', authenticate, (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
      return res.status(400).json({ error: 'Formato de precios inválido.' });
    writePricing(req.body);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error guardando precios' }); }
});

// ── Configuración ─────────────────────────────
app.get('/api/settings', (req, res) => {
  try { res.json(readSettings()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo configuración' }); }
});

app.put('/api/settings', authenticate, (req, res) => {
  try {
    const body    = req.body;
    const allowed = { ...readSettings() };
    if (Array.isArray(body.videos)) allowed.videos = body.videos.slice(0, 20);
    if (body.socialMedia && typeof body.socialMedia === 'object' && !Array.isArray(body.socialMedia)) {
      const SM_KEYS = ['facebook','instagram','twitter','tiktok','youtube','whatsapp'];
      allowed.socialMedia = { ...(allowed.socialMedia || {}) };
      for (const k of SM_KEYS) {
        if (body.socialMedia[k] !== undefined)
          allowed.socialMedia[k] = String(body.socialMedia[k]).substring(0, 200);
      }
    }
    writeSettings(allowed);
    auditLog('SETTINGS_UPDATE', {}, req);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error guardando configuración' }); }
});

// ── Rutas HTML (con inyección de nonce CSP) ───
app.get('/',        serveHtmlWithNonce(path.join(__dirname, 'index.html')));
app.get('/admin',   serveHtmlWithNonce(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/',  serveHtmlWithNonce(path.join(__dirname, 'admin', 'index.html')));

// ── Inicio ────────────────────────────────────
app.listen(PORT, () => {
  const emailOk    = process.env.GMAIL_USER && process.env.GMAIL_PASS && !process.env.GMAIL_PASS.includes('xxxx');
  const passwordOk = process.env.ADMIN_PASSWORD || fs.existsSync(AUTH_FILE);
  const jwtOk      = !!process.env.JWT_SECRET;

  const emailDisplay = emailOk
    ? 'OK (' + process.env.GMAIL_USER.replace(/^(.{3}).*(@.*)$/, '$1***$2') + ')'
    : 'PENDIENTE — configura GMAIL_USER y GMAIL_PASS en .env';

  logger.info(`Servidor Mark Publicidad iniciado en puerto ${PORT}`);

  console.log('');
  console.log('  Mark Publicidad — servidor corriendo');
  console.log(`  Sitio web:   http://localhost:${PORT}`);
  console.log(`  Panel admin: http://localhost:${PORT}/admin`);
  console.log('');
  console.log(`  Email:       ${emailDisplay}`);
  console.log(`  Admin pass:  ${passwordOk ? 'OK' : 'FALTA ADMIN_PASSWORD en .env'}`);
  console.log(`  JWT_SECRET:  ${jwtOk ? 'OK' : 'NO CONFIGURADO — sesiones no sobreviviran reinicios'}`);
  console.log('');
});
