// ================================================
// 🖥️  MARK PUBLICIDAD — SERVIDOR NODE.JS
// Admin + API productos + Subida imágenes + Contacto
// ================================================

require('dotenv').config();

const express      = require('express');
const fs           = require('fs');
const path         = require('path');
const cors         = require('cors');
const multer       = require('multer');
const nodemailer   = require('nodemailer');
const https        = require('https');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const crypto       = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE      = path.join(__dirname, 'data', 'products.json');
const PRICING_FILE   = path.join(__dirname, 'data', 'pricing.json');
const SETTINGS_FILE  = path.join(__dirname, 'data', 'settings.json');
const CONTACTS_FILE  = path.join(__dirname, 'data', 'contacts.json');
const AUTH_FILE      = path.join(__dirname, 'data', 'auth.json');
const REVIEWS_FILE   = path.join(__dirname, 'data', 'reviews.json');
const UPLOADS_DIR    = path.join(__dirname, 'uploads');
const VIDEOS_DIR     = path.join(__dirname, 'uploads', 'videos');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mark2024';

function getAdminPassword() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const { password } = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      if (password) return password;
    }
  } catch {}
  return ADMIN_PASSWORD;
}

// ── Crear carpeta uploads si no existe ────────
// En Railway el sistema de archivos es efímero, pero la carpeta debe existir
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR))  fs.mkdirSync(VIDEOS_DIR,  { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// ── Configuración Multer ──────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
                     .replace(/[^a-zA-Z0-9_-]/g, '-')
                     .substring(0, 40);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Solo imágenes JPG/PNG/WEBP/GIF'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── Nodemailer — Transporte Gmail ─────────────
function createMailTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS ||
      process.env.GMAIL_PASS.includes('xxxx')) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS.replace(/\s/g, ''), // quitar espacios si los pegó con espacios
    },
  });
}

// ── WhatsApp via CallMeBot ─────────────────────
async function sendWhatsApp(number, apikey, message) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${number}&text=${encoded}&apikey=${apikey}`;
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // CallMeBot devuelve "Message queued." si fue exitoso
        if (res.statusCode === 200) resolve(body);
        else reject(new Error(`CallMeBot HTTP ${res.statusCode}: ${body}`));
      });
    }).on('error', reject);
  });
}

// ── Sesiones activas (token → expiry) ─────────
const activeSessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}
function isValidSession(token) {
  if (!token || !activeSessions.has(token)) return false;
  if (Date.now() > activeSessions.get(token)) { activeSessions.delete(token); return false; }
  return true;
}
// Limpiar sesiones expiradas cada hora
setInterval(() => {
  const now = Date.now();
  for (const [t, exp] of activeSessions) if (now > exp) activeSessions.delete(t);
}, 60 * 60 * 1000);

// ── Rate limiters ─────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                   // máx 10 intentos de login
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,                   // máx 10 mensajes por IP por hora
  message: { error: 'Demasiados mensajes enviados. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const reviewLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 10,                         // máx 10 reseñas por IP por día
  message: { error: 'Ya enviaste el máximo de reseñas por hoy. Intenta mañana.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Helper: escapar HTML para emails ─────────
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Rate limiter: recuperar contraseña ────────
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: { error: 'Demasiados intentos. Espera 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Middleware ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,        // inline scripts en el frontend lo hacen incompatible
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: false,      // no forzar HTTPS en red local
  crossOriginResourcePolicy: false,    // permitir carga de fuentes/CDN externos
  crossOriginOpenerPolicy: false,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: false })); // solo mismo origen

// ── BLOQUEAR acceso directo a /data/ ──────────
// Crítico: data/ contiene auth.json (contraseña) y contacts.json (datos de clientes)
app.use('/data', (req, res) => res.status(403).end());

app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/uploads/videos', express.static(VIDEOS_DIR));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── Helpers ───────────────────────────────────
function readProducts() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeProducts(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function readPricing() {
  return JSON.parse(fs.readFileSync(PRICING_FILE, 'utf8'));
}
function writePricing(data) {
  fs.writeFileSync(PRICING_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return { videos: [], socialMedia: {} };
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}
function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function readContacts() {
  if (!fs.existsSync(CONTACTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); } catch { return []; }
}
function writeContacts(data) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function authenticate(req, res, next) {
  if (!isValidSession(req.headers['x-admin-token']))
    return res.status(401).json({ error: 'No autorizado' });
  next();
}

// ════════════════════════════════════════════
//  RUTAS API
// ════════════════════════════════════════════

// ── Auth ──────────────────────────────────────
app.post('/api/auth', authLimiter, (req, res) => {
  const pwd = getAdminPassword();
  if (req.body.password !== pwd)
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  res.json({ token: createSession(), success: true });
});

app.post('/api/auth/forgot', forgotLimiter, async (req, res) => {
  const transport = createMailTransport();
  if (!transport) return res.status(503).json({ error: 'Email no configurado en el servidor.' });
  const pwd = getAdminPassword();
  try {
    await transport.sendMail({
      from:    `"Mark Publicidad Admin" <${process.env.GMAIL_USER}>`,
      to:      process.env.GMAIL_USER,
      subject: '🔑 Contraseña del panel admin — Mark Publicidad',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <div style="background:#E30613;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h2 style="color:white;margin:0;">🔑 Recuperación de contraseña</h2>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p>La contraseña actual del panel admin es:</p>
            <div style="background:#f3f4f6;padding:16px;border-radius:8px;font-size:1.4rem;font-weight:700;letter-spacing:2px;text-align:center;margin:1rem 0;">${pwd}</div>
            <p style="color:#6b7280;font-size:.85rem;">Si no solicitaste esto, ignora este mensaje.</p>
          </div>
        </div>
      `,
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[Auth] Error enviando email de recuperación:', e.message);
    res.status(500).json({ error: 'Error enviando el email.' });
  }
});

app.post('/api/auth/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (currentPassword !== getAdminPassword())
    return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ password: newPassword }, null, 2), 'utf8');
    // Invalidar todas las sesiones antiguas y crear una nueva
    activeSessions.clear();
    const newToken = createSession();
    res.json({ success: true, token: newToken });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando la contraseña.' });
  }
});

// ── Contacto ──────────────────────────────────
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, phone, message } = req.body;

  // Validación básica
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Nombre, email y mensaje son requeridos.' });
  }
  if (name.length > 100 || email.length > 200 || (phone && phone.length > 30) || message.length > 5000) {
    return res.status(400).json({ error: 'Uno o más campos superan la longitud máxima permitida.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  // ── 1. Guardar contacto en historial ─────────
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
    console.error('[Contacto] ❌ Error guardando contacto:', e.message);
  }

  // ── 2. Enviar email ──────────────────────────
  const transport = createMailTransport();
  let emailOk = false;

  if (transport) {
    try {
      await transport.sendMail({
        from:    `"Mark Publicidad Web" <${process.env.GMAIL_USER}>`,
        to:      process.env.CONTACT_EMAIL || process.env.GMAIL_USER,
        replyTo: email,
        subject: `📩 Nuevo mensaje de ${name} — Mark Publicidad`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0071e3;padding:24px 32px;border-radius:12px 12px 0 0;">
              <h2 style="color:white;margin:0;font-size:1.4rem;">📩 Nuevo mensaje de contacto</h2>
              <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Mark Publicidad Impresa</p>
            </div>
            <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;width:120px;color:#6b7280;font-size:0.9rem;">Nombre</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${escapeHtml(name)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.9rem;">Email</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><a href="mailto:${escapeHtml(email)}" style="color:#0071e3;">${escapeHtml(email)}</a></td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.9rem;">Teléfono</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(phone) || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#6b7280;font-size:0.9rem;vertical-align:top;">Mensaje</td>
                  <td style="padding:10px 0;line-height:1.6;">${escapeHtml(message).replace(/\n/g, '<br>')}</td>
                </tr>
              </table>
            </div>
            <div style="background:#f9fafb;padding:16px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;font-size:0.8rem;color:#9ca3af;text-align:center;">
              Enviado desde el sitio web de Mark Publicidad Impresa • ${new Date().toLocaleString('es-EC')}
            </div>
          </div>
        `,
      });
      emailOk = true;
      console.log(`[Contacto] ✅ Email enviado a ${process.env.CONTACT_EMAIL}`);
    } catch (err) {
      console.error('[Contacto] ❌ Error email:', err.message);
    }
  } else {
    console.warn('[Contacto] ⚠️  Gmail no configurado — revisa .env');
  }

  // ── 3. Responder al cliente inmediatamente ────
  // El contacto ya fue guardado — respondemos éxito independientemente del email
  res.json({
    success: true,
    message: '¡Mensaje enviado correctamente!',
    results: { email: emailOk },
  });

  // ── 4. WhatsApp en background (no bloquea) ────
  const waNumber = process.env.WHATSAPP_NUMBER;
  const waApiKey = process.env.WHATSAPP_APIKEY;
  const waValida = waNumber && waApiKey && /^\d{4,10}$/.test(waApiKey);

  if (waValida) {
    const waMsg =
      `📩 *Nuevo mensaje - Mark Publicidad*\n\n` +
      `👤 *Nombre:* ${name}\n` +
      `📧 *Email:* ${email}\n` +
      `📞 *Teléfono:* ${phone || 'No indicado'}\n\n` +
      `💬 *Mensaje:*\n${message}`;

    sendWhatsApp(waNumber, waApiKey, waMsg)
      .then(() => console.log(`[Contacto] ✅ WhatsApp enviado al ${waNumber}`))
      .catch(err => console.warn('[Contacto] ⚠️  WhatsApp falló:', err.message));
  }

  // ── 5. Email de confirmación al usuario (background) ──
  if (transport && emailOk) {
    transport.sendMail({
      from:    `"Mark Publicidad Impresa" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: `✅ Recibimos tu mensaje — Mark Publicidad`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#E30613;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h2 style="color:white;margin:0;font-size:1.4rem;">¡Gracias por contactarnos, ${escapeHtml(name)}!</h2>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p>Recibimos tu mensaje y te responderemos a la brevedad posible.</p>
            <p style="color:#6b7280;font-size:0.9rem;border-left:3px solid #e5e7eb;padding-left:1rem;margin:1.5rem 0;">${escapeHtml(message).replace(/\n/g, '<br>')}</p>
            <p>Si tienes urgencia puedes contactarnos directamente por WhatsApp.</p>
            <p style="color:#9ca3af;font-size:0.8rem;margin-top:2rem;">— Equipo Mark Publicidad Impresa · Ibarra, Ecuador</p>
          </div>
        </div>
      `,
    }).catch(() => {});
  }
});

// ── Historial de contactos (admin) ────────────
app.get('/api/contacts', authenticate, (req, res) => {
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

// ── Multer para videos ────────────────────────
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEOS_DIR),
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '-').substring(0, 40);
      cb(null, `${Date.now()}-${base}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ok = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/ogg'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Solo videos MP4/WEBM/MOV/AVI'));
  },
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

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

// ── Subida de imagen ──────────────────────────
app.post('/api/upload', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename, size: req.file.size });
});

app.delete('/api/upload/:filename', authenticate, (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('/') || filename.includes('..'))
    return res.status(400).json({ error: 'Nombre inválido' });
  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Archivo no encontrado' });
  }
});

app.get('/api/uploads', authenticate, (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map(f => ({
        filename: f,
        url: `/uploads/${f}`,
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
function readReviews() {
  if (!fs.existsSync(REVIEWS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')); } catch { return []; }
}
function writeReviews(data) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Reseñas aprobadas (público)
app.get('/api/reviews', (req, res) => {
  const approved = readReviews().filter(r => r.approved);
  res.json(approved);
});

// Todas las reseñas (admin)
app.get('/api/reviews/all', authenticate, (req, res) => {
  res.json(readReviews());
});

// Enviar nueva reseña (público, con rate limit)
app.post('/api/reviews', reviewLimiter, (req, res) => {
  const { name, rating, comment } = req.body;
  if (!name || !rating || !comment)
    return res.status(400).json({ error: 'Nombre, calificación y comentario son requeridos.' });
  const stars = parseInt(rating);
  if (isNaN(stars) || stars < 1 || stars > 5)
    return res.status(400).json({ error: 'Calificación inválida (1–5 estrellas).' });
  if (name.length > 80 || comment.length > 1000)
    return res.status(400).json({ error: 'Nombre o comentario demasiado largos.' });

  const reviews = readReviews();
  const review = {
    id:       Date.now(),
    name:     name.trim(),
    rating:   stars,
    comment:  comment.trim(),
    date:     new Date().toISOString(),
    approved: false,
  };
  reviews.unshift(review);
  writeReviews(reviews);
  res.status(201).json({ success: true, message: '¡Gracias! Tu reseña está pendiente de aprobación.' });
});

// Aprobar reseña (admin)
app.patch('/api/reviews/:id/approve', authenticate, (req, res) => {
  const reviews = readReviews();
  const r = reviews.find(x => x.id === +req.params.id);
  if (!r) return res.status(404).json({ error: 'No encontrada' });
  r.approved = true;
  writeReviews(reviews);
  res.json({ success: true });
});

// Eliminar reseña (admin)
app.delete('/api/reviews/:id', authenticate, (req, res) => {
  const filtered = readReviews().filter(x => x.id !== +req.params.id);
  writeReviews(filtered);
  res.json({ success: true });
});

// ── Productos ─────────────────────────────────
app.get('/api/products', (req, res) => {
  try { res.json(readProducts()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo productos' }); }
});

app.post('/api/products', authenticate, (req, res) => {
  try {
    const data    = readProducts();
    const maxId   = data.reduce((m, p) => Math.max(m, p.id), 0);
    const product = { ...req.body, id: maxId + 1 };
    if (typeof product.features === 'string')
      product.features = product.features.split('\n').map(f => f.trim()).filter(Boolean);
    data.push(product);
    writeProducts(data);
    res.status(201).json(product);
  } catch (e) { res.status(500).json({ error: 'Error creando producto' }); }
});

app.put('/api/products/:id', authenticate, (req, res) => {
  try {
    const data  = readProducts();
    const id    = parseInt(req.params.id);
    const index = data.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'No encontrado' });
    const updated = { ...data[index], ...req.body, id };
    if (typeof updated.features === 'string')
      updated.features = updated.features.split('\n').map(f => f.trim()).filter(Boolean);
    data[index] = updated;
    writeProducts(data);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Error actualizando' }); }
});

app.delete('/api/products/:id', authenticate, (req, res) => {
  try {
    const data     = readProducts();
    const id       = parseInt(req.params.id);
    const filtered = data.filter(p => p.id !== id);
    if (filtered.length === data.length)
      return res.status(404).json({ error: 'No encontrado' });
    writeProducts(filtered);
    res.json({ success: true, deleted: id });
  } catch (e) { res.status(500).json({ error: 'Error eliminando' }); }
});

// ── Precios del cotizador ────────────────────
app.get('/api/pricing', (req, res) => {
  try { res.json(readPricing()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo precios' }); }
});

app.put('/api/pricing', authenticate, (req, res) => {
  try {
    writePricing(req.body);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error guardando precios' }); }
});

// ── Configuración (videos + redes sociales) ──
app.get('/api/settings', (req, res) => {
  try { res.json(readSettings()); }
  catch (e) { res.status(500).json({ error: 'Error leyendo configuración' }); }
});

app.put('/api/settings', authenticate, (req, res) => {
  try {
    writeSettings(req.body);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error guardando configuración' }); }
});

// ── Rutas HTML ────────────────────────────────
app.get('/',      (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Inicio ────────────────────────────────────
app.listen(PORT, () => {
  const emailOk = process.env.GMAIL_USER && process.env.GMAIL_PASS && !process.env.GMAIL_PASS.includes('xxxx');
  const waOk    = process.env.WHATSAPP_NUMBER && process.env.WHATSAPP_APIKEY && !process.env.WHATSAPP_APIKEY.includes('PEGA_');

  console.log('');
  console.log('  ✅  Servidor Mark Publicidad corriendo');
  console.log(`  🌐  Sitio web:    http://localhost:${PORT}`);
  console.log(`  🔧  Panel admin:  http://localhost:${PORT}/admin`);
  console.log('');
  console.log(`  📧  Email:        ${emailOk ? '✅ Configurado (' + process.env.GMAIL_USER + ')' : '⚠️  Pendiente — configura GMAIL_USER y GMAIL_PASS en .env'}`);
  console.log(`  💬  WhatsApp:     ${waOk    ? '✅ Configurado (+' + process.env.WHATSAPP_NUMBER + ')' : '⚠️  Pendiente — configura WHATSAPP_NUMBER y WHATSAPP_APIKEY en .env'}`);
  console.log('');
});
