// ================================================
// 🖥️  MARK PUBLICIDAD — SERVIDOR NODE.JS
// Admin + API productos + Subida imágenes + Contacto
// ================================================

require('dotenv').config();

const express    = require('express');
const fs         = require('fs');
const path       = require('path');
const cors       = require('cors');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const https      = require('https');

const app  = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE      = path.join(__dirname, 'data', 'products.json');
const UPLOADS_DIR    = path.join(__dirname, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mark2024';

// ── Crear carpeta uploads si no existe ────────
// En Railway el sistema de archivos es efímero, pero la carpeta debe existir
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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

// ── Middleware ────────────────────────────────
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── Helpers ───────────────────────────────────
function readProducts() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeProducts(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function authenticate(req, res, next) {
  if (req.headers['x-admin-token'] !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'No autorizado' });
  next();
}

// ════════════════════════════════════════════
//  RUTAS API
// ════════════════════════════════════════════

// ── Auth ──────────────────────────────────────
app.post('/api/auth', (req, res) => {
  req.body.password === ADMIN_PASSWORD
    ? res.json({ token: ADMIN_PASSWORD, success: true })
    : res.status(401).json({ error: 'Contraseña incorrecta' });
});

// ── Contacto ──────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  // Validación básica
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Nombre, email y mensaje son requeridos.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  const errors   = [];
  const results  = { email: false, whatsapp: false };

  // ── 1. Enviar email ──────────────────────────
  const transport = createMailTransport();
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
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.9rem;">Email</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><a href="mailto:${email}" style="color:#0071e3;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:0.9rem;">Teléfono</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${phone || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#6b7280;font-size:0.9rem;vertical-align:top;">Mensaje</td>
                  <td style="padding:10px 0;line-height:1.6;">${message.replace(/\n/g, '<br>')}</td>
                </tr>
              </table>
            </div>
            <div style="background:#f9fafb;padding:16px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;font-size:0.8rem;color:#9ca3af;text-align:center;">
              Enviado desde el sitio web de Mark Publicidad Impresa • ${new Date().toLocaleString('es-EC')}
            </div>
          </div>
        `,
      });
      results.email = true;
      console.log(`[Contacto] ✅ Email enviado a ${process.env.CONTACT_EMAIL}`);
    } catch (err) {
      errors.push(`Email: ${err.message}`);
      console.error('[Contacto] ❌ Error email:', err.message);
    }
  } else {
    console.warn('[Contacto] ⚠️  Gmail no configurado — revisa .env (GMAIL_USER / GMAIL_PASS)');
    errors.push('Email: credenciales no configuradas');
  }

  // ── 2. Notificación WhatsApp ──────────────────
  const waNumber = process.env.WHATSAPP_NUMBER;
  const waApiKey = process.env.WHATSAPP_APIKEY;

  if (waNumber && waApiKey && !waApiKey.includes('PEGA_')) {
    try {
      const waMsg =
        `📩 *Nuevo mensaje - Mark Publicidad*\n\n` +
        `👤 *Nombre:* ${name}\n` +
        `📧 *Email:* ${email}\n` +
        `📞 *Teléfono:* ${phone || 'No indicado'}\n\n` +
        `💬 *Mensaje:*\n${message}`;

      await sendWhatsApp(waNumber, waApiKey, waMsg);
      results.whatsapp = true;
      console.log(`[Contacto] ✅ WhatsApp enviado al ${waNumber}`);
    } catch (err) {
      errors.push(`WhatsApp: ${err.message}`);
      console.error('[Contacto] ❌ Error WhatsApp:', err.message);
    }
  } else {
    console.warn('[Contacto] ⚠️  WhatsApp no configurado — revisa .env (WHATSAPP_NUMBER / WHATSAPP_APIKEY)');
  }

  // ── Respuesta al cliente ──────────────────────
  const anySuccess = results.email || results.whatsapp;

  if (anySuccess) {
    return res.json({
      success: true,
      results,
      message: '¡Mensaje enviado correctamente!',
    });
  } else {
    return res.status(500).json({
      success: false,
      error: 'No se pudo enviar el mensaje. Por favor contáctanos directamente por WhatsApp.',
      details: errors,
    });
  }
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
  console.log(`  🔑  Contraseña:   ${ADMIN_PASSWORD}`);
  console.log('');
  console.log(`  📧  Email:        ${emailOk ? '✅ Configurado (' + process.env.GMAIL_USER + ')' : '⚠️  Pendiente — configura GMAIL_USER y GMAIL_PASS en .env'}`);
  console.log(`  💬  WhatsApp:     ${waOk    ? '✅ Configurado (+' + process.env.WHATSAPP_NUMBER + ')' : '⚠️  Pendiente — configura WHATSAPP_NUMBER y WHATSAPP_APIKEY en .env'}`);
  console.log('');
});
