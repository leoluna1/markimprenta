// db/db.js — Cliente de Base de Datos Híbrido (PostgreSQL con fallback a JSON)
// Permite migrar a PostgreSQL automáticamente cuando DATABASE_URL está definido.
'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logger = require('../lib/logger');

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;

function databaseSslConfig() {
  const value = String(process.env.DATABASE_SSL || '').toLowerCase();
  if (['false', '0', 'off', 'no'].includes(value)) return false;
  if (['true', '1', 'on', 'yes'].includes(value)) return { rejectUnauthorized: false };
  return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

// Rutas de archivos JSON locales (fallback)
const dataDir = path.join(__dirname, '..', 'data');
const JSON_FILES = {
  products:  path.join(dataDir, 'products.json'),
  pricing:   path.join(dataDir, 'pricing.json'),
  settings:  path.join(dataDir, 'settings.json'),
  contacts:  path.join(dataDir, 'contacts.json'),
  reviews:   path.join(dataDir, 'reviews.json'),
  portfolio: path.join(dataDir, 'portfolio.json'),
  auth:      path.join(dataDir, 'auth.json'),
  adminUsers: path.join(dataDir, 'admin-users.json'),
  auditEvents: path.join(dataDir, 'audit-events.json'),
  adminSessionRevocations: path.join(dataDir, 'admin-session-revocations.json'),
};

const SEED_FILES = {
  pricing:  path.join(__dirname, 'seeds', 'pricing.json'),
  settings: path.join(__dirname, 'seeds', 'settings.json'),
};

function stripHtml(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '');
}

function sanitizePricingData(value) {
  if (Array.isArray(value)) return value.map(sanitizePricingData);
  if (!value || typeof value !== 'object') return typeof value === 'string' ? stripHtml(value) : value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = sanitizePricingData(entry);
  }
  return out;
}

/** Inicializa la conexión y crea las tablas si es necesario. Se ejecuta al arrancar el servidor. */
async function connectDb() {
  if (!DATABASE_URL) {
    logger.info('[DB] DATABASE_URL no configurado. Utilizando almacenamiento local en archivos JSON.');
    return false;
  }

  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: databaseSslConfig(),
    });

    // Probar conexión
    await pool.query('SELECT NOW()');
    logger.info('[DB] Conexión establecida con PostgreSQL ✓');

    // Inicializar tablas
    await createTables();

    // Migración y sembrado inicial automático
    await seedFromLocalFiles();

    return true;
  } catch (err) {
    logger.error('[DB] Error al conectar a PostgreSQL. Activando fallback a JSON.', { err: err.message });
    pool = null;
    return false;
  }
}

async function createTables() {
  const query = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT,
      image VARCHAR(255),
      price NUMERIC(10,2) DEFAULT 0,
      price_unit VARCHAR(100) DEFAULT 'por unidad',
      features TEXT[] DEFAULT '{}',
      popular BOOLEAN DEFAULT FALSE,
      min_quantity INTEGER DEFAULT 1,
      materials VARCHAR(255),
      delivery_time VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS pricing (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      CONSTRAINT pricing_singleton CHECK (id = 1)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      CONSTRAINT settings_singleton CHECK (id = 1)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(100),
      message TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id BIGINT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      image VARCHAR(255),
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth (
      id INT PRIMARY KEY DEFAULT 1,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      totp_secret VARCHAR(255),
      totp_enabled BOOLEAN DEFAULT FALSE,
      CONSTRAINT auth_singleton CHECK (id = 1)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120),
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'admin',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      totp_secret VARCHAR(255),
      totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      session_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_session_revocations (
      jti VARCHAR(120) PRIMARY KEY,
      user_id INTEGER,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER,
      user_email VARCHAR(255),
      action VARCHAR(80) NOT NULL,
      entity VARCHAR(80),
      entity_id VARCHAR(120),
      summary TEXT,
      details JSONB DEFAULT '{}'::jsonb,
      ip VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
  await pool.query('ALTER TABLE auth ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS materials VARCHAR(255)');
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(255)');
  await pool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name VARCHAR(120)');
  await pool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT \'admin\'');
  await pool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE');
  await pool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1');
  await pool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP');
  logger.info('[DB] Tablas de base de datos verificadas/creadas ✓');
}

/** Si las tablas están vacías, las puebla con la información de los archivos JSON */
async function seedFromLocalFiles() {
  try {
    // 1. Productos
    const countProds = await pool.query('SELECT COUNT(*) FROM products');
    const productSeed = readSeedJson('products');
    if (parseInt(countProds.rows[0].count) === 0 && Array.isArray(productSeed)) {
      for (const p of productSeed) {
        await pool.query(
          `INSERT INTO products (id, name, category, description, image, price, price_unit, features, popular, min_quantity, materials, delivery_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [p.id, p.name, p.category, p.description, p.image, p.price || 0, p.priceUnit || 'por unidad', p.features || [], p.popular || false, p.minQuantity || 1, p.materials || null, p.deliveryTime || null]
        );
      }
      // Ajustar secuencia serial de ids
      await pool.query("SELECT setval('products_id_seq', COALESCE((SELECT MAX(id)+1 FROM products), 1), false)");
      logger.info('[DB] Se sembraron productos desde JSON/semilla inicial.');
    }

    // 2. Precios del Cotizador
    const countPricing = await pool.query('SELECT COUNT(*) FROM pricing');
    const pricingSeed = readSeedJson('pricing');
    if (parseInt(countPricing.rows[0].count) === 0 && pricingSeed && typeof pricingSeed === 'object') {
      const data = pricingSeed;
      await pool.query('INSERT INTO pricing (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [data]);
      logger.info('[DB] Se sembraron precios desde JSON/semilla inicial.');
    }

    // 3. Ajustes / Configuración
    const countSettings = await pool.query('SELECT COUNT(*) FROM settings');
    const settingsSeed = readSeedJson('settings');
    if (parseInt(countSettings.rows[0].count) === 0 && settingsSeed && typeof settingsSeed === 'object') {
      const data = settingsSeed;
      await pool.query('INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [data]);
      logger.info('[DB] Se sembró configuración desde JSON/semilla inicial.');
    }

    // 4. Contactos
    const countContacts = await pool.query('SELECT COUNT(*) FROM contacts');
    if (parseInt(countContacts.rows[0].count) === 0 && fs.existsSync(JSON_FILES.contacts)) {
      const data = JSON.parse(fs.readFileSync(JSON_FILES.contacts, 'utf8'));
      for (const c of data) {
        await pool.query(
          `INSERT INTO contacts (id, name, email, phone, message, date, read)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [c.id, c.name, c.email, c.phone, c.message, c.date, c.read || false]
        );
      }
      logger.info('[DB] Se sembraron contactos desde archivo local JSON.');
    }

    // 5. Reseñas
    const countReviews = await pool.query('SELECT COUNT(*) FROM reviews');
    if (parseInt(countReviews.rows[0].count) === 0 && fs.existsSync(JSON_FILES.reviews)) {
      const data = JSON.parse(fs.readFileSync(JSON_FILES.reviews, 'utf8'));
      for (const r of data) {
        await pool.query(
          `INSERT INTO reviews (id, name, rating, comment, date, approved)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [r.id, r.name, r.rating, r.comment, r.date, r.approved || false]
        );
      }
      logger.info('[DB] Se sembraron reseñas desde archivo local JSON.');
    }

    // 6. Portfolio
    const countPortfolio = await pool.query('SELECT COUNT(*) FROM portfolio');
    if (parseInt(countPortfolio.rows[0].count) === 0 && fs.existsSync(JSON_FILES.portfolio)) {
      const data = JSON.parse(fs.readFileSync(JSON_FILES.portfolio, 'utf8'));
      for (const item of data) {
        await pool.query(
          `INSERT INTO portfolio (id, title, category, image, date)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.id, item.title, item.category, item.image, item.date]
        );
      }
      logger.info('[DB] Se sembró portfolio desde archivo local JSON.');
    }

    // 7. Auth (Credenciales)
    const countAuth = await pool.query('SELECT COUNT(*) FROM auth');
    if (parseInt(countAuth.rows[0].count) === 0 && fs.existsSync(JSON_FILES.auth)) {
      const data = JSON.parse(fs.readFileSync(JSON_FILES.auth, 'utf8'));
      await pool.query(
        'INSERT INTO auth (id, email, password, totp_secret, totp_enabled) VALUES (1, $1, $2, $3, $4)',
        [data.email || process.env.ADMIN_EMAIL || process.env.GMAIL_USER || null, data.password, data.totp_secret || null, data.totp_enabled || false]
      );
      logger.info('[DB] Se sembraron credenciales de autenticación desde archivo local JSON.');
    }

    // 8. Usuarios admin: migrar credencial singleton existente como primer usuario.
    const countUsers = await pool.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(countUsers.rows[0].count) === 0) {
      const authRes = await pool.query('SELECT email, password, totp_secret, totp_enabled FROM auth WHERE id=1');
      const auth = authRes.rows[0] || readLocalJson('auth', null) || null;
      const email = normalizeEmail(auth?.email || process.env.ADMIN_EMAIL || process.env.GMAIL_USER || '');
      const password = auth?.password || process.env.ADMIN_PASSWORD || null;
      if (email && password) {
        await pool.query(
          `INSERT INTO admin_users (name, email, password, role, active, totp_secret, totp_enabled)
           VALUES ($1, $2, $3, 'owner', TRUE, $4, $5)
           ON CONFLICT (email) DO NOTHING`,
          ['Administrador principal', email, password, auth?.totp_secret || null, !!auth?.totp_enabled]
        );
        logger.info('[DB] Se migró el administrador principal a admin_users.');
      }
    }

  } catch (err) {
    logger.error('[DB] Error sembrando base de datos inicial', { err: err.message });
  }
}

// ── Helpers de acceso JSON (local fallback) ──────────────────────────────────
function readLocalJson(key, defaultVal = []) {
  try {
    if (fs.existsSync(JSON_FILES[key])) {
      return JSON.parse(fs.readFileSync(JSON_FILES[key], 'utf8'));
    }
  } catch {}
  return defaultVal;
}

function readSeedJson(key) {
  const candidates = [JSON_FILES[key], SEED_FILES[key]].filter(Boolean);
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      logger.error(`[DB] Error leyendo semilla ${key}`, { file, err: err.message });
    }
  }
  return null;
}

function readLocalOrSeedJson(key, defaultVal = []) {
  const data = readSeedJson(key);
  return data === null ? defaultVal : data;
}

function writeLocalJson(key, data) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(JSON_FILES[key], JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logger.error(`[DB-JSON] Error escribiendo en ${key}.json`, { err: err.message });
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function publicAdminUser(user) {
  if (!user) return null;
  const { password, totp_secret, ...safe } = user;
  return {
    ...safe,
    totp_enabled: !!user.totp_enabled,
    active: user.active !== false,
  };
}

// ── IMPLEMENTACIÓN DE OPERACIONES ─────────────────────────────────────────────

// ── 1. PRODUCTOS ────────────────────────────
const mapProductFromDb = (r) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  description: r.description,
  image: r.image,
  price: parseFloat(r.price),
  priceUnit: r.price_unit,
  features: r.features || [],
  popular: r.popular,
  minQuantity: r.min_quantity,
  materials: r.materials,
  deliveryTime: r.delivery_time
});

async function getProducts() {
  if (pool) {
    const res = await pool.query('SELECT * FROM products ORDER BY id ASC');
    return res.rows.map(mapProductFromDb);
  }
  return readLocalJson('products');
}

async function createProduct(p) {
  if (pool) {
    const res = await pool.query(
      `INSERT INTO products (name, category, description, image, price, price_unit, features, popular, min_quantity, materials, delivery_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [p.name, p.category, p.description, p.image, p.price || 0, p.priceUnit || 'por unidad', p.features || [], p.popular || false, p.minQuantity || 1, p.materials || null, p.deliveryTime || null]
    );
    return mapProductFromDb(res.rows[0]);
  }
  const prods = readLocalJson('products');
  const maxId = prods.reduce((m, x) => Math.max(m, x.id), 0);
  const newProd = { ...p, id: maxId + 1 };
  prods.push(newProd);
  writeLocalJson('products', prods);
  return newProd;
}

async function updateProduct(id, p) {
  if (pool) {
    const res = await pool.query(
      `UPDATE products 
       SET name=$1, category=$2, description=$3, image=$4, price=$5, price_unit=$6, features=$7, popular=$8, min_quantity=$9, materials=$10, delivery_time=$11
       WHERE id=$12 RETURNING *`,
      [p.name, p.category, p.description, p.image, p.price || 0, p.priceUnit || 'por unidad', p.features || [], p.popular || false, p.minQuantity || 1, p.materials || null, p.deliveryTime || null, id]
    );
    if (res.rowCount === 0) return null;
    return mapProductFromDb(res.rows[0]);
  }
  const prods = readLocalJson('products');
  const idx = prods.findIndex(x => x.id === id);
  if (idx === -1) return null;
  const updated = { ...prods[idx], ...p, id };
  prods[idx] = updated;
  writeLocalJson('products', prods);
  return updated;
}

async function deleteProduct(id) {
  if (pool) {
    const res = await pool.query('DELETE FROM products WHERE id=$1 RETURNING id', [id]);
    return res.rowCount > 0;
  }
  const prods = readLocalJson('products');
  const filtered = prods.filter(x => x.id !== id);
  const ok = filtered.length !== prods.length;
  writeLocalJson('products', filtered);
  return ok;
}

// ── 2. PRECIOS DEL COTIZADOR ────────────────
async function getPricing() {
  if (pool) {
    const res = await pool.query('SELECT data FROM pricing WHERE id=1');
    return res.rows.length ? res.rows[0].data : {};
  }
  return readLocalOrSeedJson('pricing', {});
}

async function savePricing(data) {
  const cleanData = sanitizePricingData(data);
  if (pool) {
    await pool.query(
      'INSERT INTO pricing (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
      [cleanData]
    );
    return true;
  }
  writeLocalJson('pricing', cleanData);
  return true;
}

// ── 3. CONFIGURACIÓN (SETTINGS) ─────────────
async function getSettings() {
  if (pool) {
    const res = await pool.query('SELECT data FROM settings WHERE id=1');
    return res.rows.length ? res.rows[0].data : { videos: [], socialMedia: {} };
  }
  return readLocalOrSeedJson('settings', { videos: [], socialMedia: {} });
}

async function saveSettings(data) {
  if (pool) {
    await pool.query(
      'INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
      [data]
    );
    return true;
  }
  writeLocalJson('settings', data);
  return true;
}

// ── 4. CONTACTOS ────────────────────────────
async function getContacts() {
  if (pool) {
    const res = await pool.query('SELECT * FROM contacts ORDER BY id DESC');
    return res.rows.map(r => ({ ...r, id: parseInt(r.id), read: r.read }));
  }
  return readLocalJson('contacts');
}

async function createContact(c) {
  if (pool) {
    const id = c.id || Date.now();
    await pool.query(
      `INSERT INTO contacts (id, name, email, phone, message, date, read)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, c.name, c.email, c.phone || null, c.message, c.date, c.read || false]
    );
    return { ...c, id };
  }
  const list = readLocalJson('contacts');
  list.unshift(c);
  writeLocalJson('contacts', list);
  return c;
}

async function markContactRead(id) {
  if (pool) {
    const res = await pool.query('UPDATE contacts SET read=true WHERE id=$1', [id]);
    return res.rowCount > 0;
  }
  const list = readLocalJson('contacts');
  const c = list.find(x => x.id === id);
  if (!c) return false;
  c.read = true;
  writeLocalJson('contacts', list);
  return true;
}

async function deleteContact(id) {
  if (pool) {
    const res = await pool.query('DELETE FROM contacts WHERE id=$1', [id]);
    return res.rowCount > 0;
  }
  const list = readLocalJson('contacts');
  const filtered = list.filter(x => x.id !== id);
  writeLocalJson('contacts', filtered);
  return true;
}

// ── 5. RESEÑAS ──────────────────────────────
async function getReviews() {
  if (pool) {
    const res = await pool.query('SELECT * FROM reviews ORDER BY id DESC');
    return res.rows.map(r => ({ ...r, id: parseInt(r.id), approved: r.approved }));
  }
  return readLocalJson('reviews');
}

async function createReview(r) {
  if (pool) {
    const id = r.id || Date.now();
    await pool.query(
      `INSERT INTO reviews (id, name, rating, comment, date, approved)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, r.name, r.rating, r.comment, r.date, r.approved || false]
    );
    return { ...r, id };
  }
  const list = readLocalJson('reviews');
  list.unshift(r);
  writeLocalJson('reviews', list);
  return r;
}

async function approveReview(id) {
  if (pool) {
    const res = await pool.query('UPDATE reviews SET approved=true WHERE id=$1', [id]);
    return res.rowCount > 0;
  }
  const list = readLocalJson('reviews');
  const r = list.find(x => x.id === id);
  if (!r) return false;
  r.approved = true;
  writeLocalJson('reviews', list);
  return true;
}

async function deleteReview(id) {
  if (pool) {
    const res = await pool.query('DELETE FROM reviews WHERE id=$1', [id]);
    return res.rowCount > 0;
  }
  const list = readLocalJson('reviews');
  const filtered = list.filter(x => x.id !== id);
  writeLocalJson('reviews', filtered);
  return true;
}

// ── 6. PORTFOLIO ────────────────────────────
async function getPortfolio() {
  if (pool) {
    const res = await pool.query('SELECT * FROM portfolio ORDER BY id DESC');
    return res.rows.map(r => ({ ...r, id: parseInt(r.id) }));
  }
  return readLocalJson('portfolio');
}

async function createPortfolioItem(p) {
  if (pool) {
    const id = p.id || Date.now();
    await pool.query(
      `INSERT INTO portfolio (id, title, category, image, date)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, p.title, p.category, p.image, p.date]
    );
    return { ...p, id };
  }
  const list = readLocalJson('portfolio');
  list.unshift(p);
  writeLocalJson('portfolio', list);
  return p;
}

async function deletePortfolioItem(id) {
  if (pool) {
    const res = await pool.query('DELETE FROM portfolio WHERE id=$1', [id]);
    return res.rowCount > 0;
  }
  const list = readLocalJson('portfolio');
  const filtered = list.filter(x => x.id !== id);
  writeLocalJson('portfolio', filtered);
  return true;
}

// ── 7. USUARIOS ADMIN Y AUDITORIA ───────────
const mapAdminUserFromDb = (r) => ({
  id: r.id,
  name: r.name || '',
  email: normalizeEmail(r.email),
  password: r.password,
  role: r.role || 'admin',
  active: r.active !== false,
  totp_secret: r.totp_secret || null,
  totp_enabled: !!r.totp_enabled,
  session_version: parseInt(r.session_version, 10) || 1,
  created_at: r.created_at,
  updated_at: r.updated_at,
  last_login_at: r.last_login_at,
});

function legacyAdminUser() {
  const auth = readLocalJson('auth', null);
  const email = normalizeEmail(auth?.email || process.env.ADMIN_EMAIL || process.env.GMAIL_USER || '');
  const password = auth?.password || process.env.ADMIN_PASSWORD || null;
  if (!email || !password) return null;
  return {
    id: 1,
    name: 'Administrador principal',
    email,
    password,
    role: 'owner',
    active: true,
    totp_secret: auth?.totp_secret || null,
    totp_enabled: !!auth?.totp_enabled,
    session_version: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
    last_login_at: null,
  };
}

function readLocalAdminUsers() {
  const users = readLocalJson('adminUsers', null);
  if (Array.isArray(users) && users.length) {
    let changed = false;
    const normalized = users.map(u => {
      if (u.session_version) return u;
      changed = true;
      return { ...u, session_version: 1 };
    });
    if (changed) writeLocalJson('adminUsers', normalized);
    return normalized;
  }
  const legacy = legacyAdminUser();
  if (!legacy) return [];
  writeLocalJson('adminUsers', [legacy]);
  return [legacy];
}

function writeLocalAdminUsers(users) {
  writeLocalJson('adminUsers', users);
}

async function getAdminUserByEmail(email) {
  const clean = normalizeEmail(email);
  if (pool) {
    const res = await pool.query('SELECT * FROM admin_users WHERE lower(email)=lower($1) LIMIT 1', [clean]);
    return res.rows.length ? mapAdminUserFromDb(res.rows[0]) : null;
  }
  return readLocalAdminUsers().find(u => normalizeEmail(u.email) === clean) || null;
}

async function getAdminUserById(id) {
  const userId = parseInt(id, 10);
  if (!Number.isFinite(userId)) return null;
  if (pool) {
    const res = await pool.query('SELECT * FROM admin_users WHERE id=$1 LIMIT 1', [userId]);
    return res.rows.length ? mapAdminUserFromDb(res.rows[0]) : null;
  }
  return readLocalAdminUsers().find(u => parseInt(u.id, 10) === userId) || null;
}

async function listAdminUsers() {
  if (pool) {
    const res = await pool.query('SELECT * FROM admin_users ORDER BY active DESC, role DESC, email ASC');
    return res.rows.map(mapAdminUserFromDb).map(publicAdminUser);
  }
  return readLocalAdminUsers().map(publicAdminUser);
}

async function countActiveOwners() {
  if (pool) {
    const res = await pool.query("SELECT COUNT(*) FROM admin_users WHERE active=true AND role='owner'");
    return parseInt(res.rows[0]?.count, 10) || 0;
  }
  return readLocalAdminUsers().filter(u => u.active !== false && u.role === 'owner').length;
}

async function createAdminUser(user) {
  const cleanEmail = normalizeEmail(user.email);
  if (pool) {
    const res = await pool.query(
      `INSERT INTO admin_users (name, email, password, role, active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [user.name || '', cleanEmail, user.password, user.role || 'admin']
    );
    return publicAdminUser(mapAdminUserFromDb(res.rows[0]));
  }
  const users = readLocalAdminUsers();
  if (users.some(u => normalizeEmail(u.email) === cleanEmail)) {
    const err = new Error('Email duplicado');
    err.code = 'DUPLICATE_EMAIL';
    throw err;
  }
  const id = users.reduce((max, u) => Math.max(max, parseInt(u.id, 10) || 0), 0) + 1;
  const newUser = {
    id,
    name: user.name || '',
    email: cleanEmail,
    password: user.password,
    role: user.role || 'admin',
    active: true,
    totp_secret: null,
    totp_enabled: false,
    session_version: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
    last_login_at: null,
  };
  users.push(newUser);
  writeLocalAdminUsers(users);
  return publicAdminUser(newUser);
}

async function updateAdminUser(id, patch) {
  const userId = parseInt(id, 10);
  const cleanEmail = patch.email !== undefined ? normalizeEmail(patch.email) : undefined;
  if (pool) {
    const current = await getAdminUserById(userId);
    if (!current) return null;
    const res = await pool.query(
      `UPDATE admin_users
       SET name=$1, email=$2, role=$3, active=$4, updated_at=CURRENT_TIMESTAMP
       WHERE id=$5
       RETURNING *`,
      [
        patch.name !== undefined ? patch.name : current.name,
        cleanEmail !== undefined ? cleanEmail : current.email,
        patch.role !== undefined ? patch.role : current.role,
        patch.active !== undefined ? !!patch.active : current.active,
        userId,
      ]
    );
    return res.rows.length ? publicAdminUser(mapAdminUserFromDb(res.rows[0])) : null;
  }
  const users = readLocalAdminUsers();
  const idx = users.findIndex(u => parseInt(u.id, 10) === userId);
  if (idx === -1) return null;
  if (cleanEmail && users.some(u => parseInt(u.id, 10) !== userId && normalizeEmail(u.email) === cleanEmail)) {
    const err = new Error('Email duplicado');
    err.code = 'DUPLICATE_EMAIL';
    throw err;
  }
  users[idx] = {
    ...users[idx],
    name: patch.name !== undefined ? patch.name : users[idx].name,
    email: cleanEmail !== undefined ? cleanEmail : users[idx].email,
    role: patch.role !== undefined ? patch.role : users[idx].role,
    active: patch.active !== undefined ? !!patch.active : users[idx].active,
    updated_at: nowIso(),
  };
  writeLocalAdminUsers(users);
  return publicAdminUser(users[idx]);
}

async function updateAdminUserPassword(id, passwordHash) {
  const userId = parseInt(id, 10);
  if (pool) {
    const res = await pool.query(
      'UPDATE admin_users SET password=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [passwordHash, userId]
    );
    return res.rows.length ? mapAdminUserFromDb(res.rows[0]) : null;
  }
  const users = readLocalAdminUsers();
  const idx = users.findIndex(u => parseInt(u.id, 10) === userId);
  if (idx === -1) return null;
  users[idx].password = passwordHash;
  users[idx].updated_at = nowIso();
  writeLocalAdminUsers(users);
  return users[idx];
}

async function updateAdminUserTotp(id, patch) {
  const userId = parseInt(id, 10);
  if (pool) {
    const current = await getAdminUserById(userId);
    if (!current) return null;
    const res = await pool.query(
      `UPDATE admin_users
       SET totp_secret=$1, totp_enabled=$2, updated_at=CURRENT_TIMESTAMP
       WHERE id=$3
       RETURNING *`,
      [
        patch.totp_secret !== undefined ? patch.totp_secret : current.totp_secret,
        patch.totp_enabled !== undefined ? !!patch.totp_enabled : current.totp_enabled,
        userId,
      ]
    );
    return res.rows.length ? mapAdminUserFromDb(res.rows[0]) : null;
  }
  const users = readLocalAdminUsers();
  const idx = users.findIndex(u => parseInt(u.id, 10) === userId);
  if (idx === -1) return null;
  users[idx].totp_secret = patch.totp_secret !== undefined ? patch.totp_secret : users[idx].totp_secret;
  users[idx].totp_enabled = patch.totp_enabled !== undefined ? !!patch.totp_enabled : !!users[idx].totp_enabled;
  users[idx].updated_at = nowIso();
  writeLocalAdminUsers(users);
  return users[idx];
}

async function markAdminUserLogin(id) {
  const userId = parseInt(id, 10);
  if (pool) {
    await pool.query('UPDATE admin_users SET last_login_at=CURRENT_TIMESTAMP WHERE id=$1', [userId]);
    return true;
  }
  const users = readLocalAdminUsers();
  const user = users.find(u => parseInt(u.id, 10) === userId);
  if (!user) return false;
  user.last_login_at = nowIso();
  writeLocalAdminUsers(users);
  return true;
}

async function incrementAdminUserSessionVersion(id) {
  const userId = parseInt(id, 10);
  if (!Number.isFinite(userId)) return null;
  if (pool) {
    const res = await pool.query(
      `UPDATE admin_users
       SET session_version = COALESCE(session_version, 1) + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id=$1
       RETURNING *`,
      [userId]
    );
    return res.rows.length ? mapAdminUserFromDb(res.rows[0]) : null;
  }
  const users = readLocalAdminUsers();
  const idx = users.findIndex(u => parseInt(u.id, 10) === userId);
  if (idx === -1) return null;
  users[idx].session_version = (parseInt(users[idx].session_version, 10) || 1) + 1;
  users[idx].updated_at = nowIso();
  writeLocalAdminUsers(users);
  return users[idx];
}

async function revokeAdminSession(jti, userId, expiresAt) {
  const tokenId = String(jti || '').trim();
  if (!tokenId) return false;
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(exp.getTime())) return false;
  if (pool) {
    await pool.query(
      `INSERT INTO admin_session_revocations (jti, user_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (jti) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [tokenId, Number.isFinite(parseInt(userId, 10)) ? parseInt(userId, 10) : null, exp]
    );
    return true;
  }
  const list = readLocalJson('adminSessionRevocations', []);
  const active = list.filter(x => new Date(x.expires_at).getTime() > Date.now() && x.jti !== tokenId);
  active.push({
    jti: tokenId,
    user_id: Number.isFinite(parseInt(userId, 10)) ? parseInt(userId, 10) : null,
    expires_at: exp.toISOString(),
    created_at: nowIso(),
  });
  writeLocalJson('adminSessionRevocations', active);
  return true;
}

async function isAdminSessionRevoked(jti) {
  const tokenId = String(jti || '').trim();
  if (!tokenId) return false;
  if (pool) {
    await pool.query('DELETE FROM admin_session_revocations WHERE expires_at <= CURRENT_TIMESTAMP');
    const res = await pool.query(
      'SELECT 1 FROM admin_session_revocations WHERE jti=$1 AND expires_at > CURRENT_TIMESTAMP LIMIT 1',
      [tokenId]
    );
    return res.rows.length > 0;
  }
  const list = readLocalJson('adminSessionRevocations', []);
  const now = Date.now();
  const active = list.filter(x => new Date(x.expires_at).getTime() > now);
  if (active.length !== list.length) writeLocalJson('adminSessionRevocations', active);
  return active.some(x => x.jti === tokenId);
}

async function createAuditEvent(event) {
  const data = {
    user_id: event.user_id || null,
    user_email: normalizeEmail(event.user_email || ''),
    action: String(event.action || '').slice(0, 80),
    entity: event.entity ? String(event.entity).slice(0, 80) : null,
    entity_id: event.entity_id != null ? String(event.entity_id).slice(0, 120) : null,
    summary: event.summary ? String(event.summary).slice(0, 1000) : null,
    details: event.details && typeof event.details === 'object' ? event.details : {},
    ip: event.ip ? String(event.ip).slice(0, 120) : null,
  };
  if (pool) {
    const res = await pool.query(
      `INSERT INTO audit_events (user_id, user_email, action, entity, entity_id, summary, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.user_id, data.user_email || null, data.action, data.entity, data.entity_id, data.summary, data.details, data.ip]
    );
    return res.rows[0];
  }
  const events = readLocalJson('auditEvents', []);
  const id = events.reduce((max, e) => Math.max(max, parseInt(e.id, 10) || 0), 0) + 1;
  const saved = { id, ...data, created_at: nowIso() };
  events.unshift(saved);
  writeLocalJson('auditEvents', events.slice(0, 1000));
  return saved;
}

async function listAuditEvents(limit = 100) {
  const capped = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 300);
  if (pool) {
    const res = await pool.query('SELECT * FROM audit_events ORDER BY created_at DESC, id DESC LIMIT $1', [capped]);
    return res.rows.map(r => ({ ...r, id: parseInt(r.id, 10), user_id: r.user_id == null ? null : parseInt(r.user_id, 10) }));
  }
  return readLocalJson('auditEvents', []).slice(0, capped);
}

// ── 8. CREDENCIALES LEGACY (AUTH) ────────────
async function getAuth() {
  const users = pool
    ? (await pool.query('SELECT * FROM admin_users WHERE active=true ORDER BY id ASC LIMIT 1')).rows
    : [];
  if (users.length) {
    const user = mapAdminUserFromDb(users[0]);
    return {
      email: user.email,
      password: user.password,
      totp_secret: user.totp_secret,
      totp_enabled: user.totp_enabled,
    };
  }
  if (!pool) {
    const localUser = readLocalAdminUsers().find(u => u.active !== false);
    if (localUser) {
      return {
        email: localUser.email,
        password: localUser.password,
        totp_secret: localUser.totp_secret || null,
        totp_enabled: !!localUser.totp_enabled,
      };
    }
  }
  if (pool) {
    const res = await pool.query('SELECT email, password, totp_secret, totp_enabled FROM auth WHERE id=1');
    if (res.rows.length) {
      const r = res.rows[0];
      return { email: r.email, password: r.password, totp_secret: r.totp_secret, totp_enabled: r.totp_enabled };
    }
    return null;
  }
  return readLocalJson('auth', null);
}

async function saveAuth(auth) {
  const cleanEmail = normalizeEmail(auth.email || process.env.ADMIN_EMAIL || process.env.GMAIL_USER || '');
  if (cleanEmail && auth.password) {
    const existing = await getAdminUserByEmail(cleanEmail);
    if (existing) {
      await updateAdminUserPassword(existing.id, auth.password);
      await updateAdminUserTotp(existing.id, {
        totp_secret: auth.totp_secret || null,
        totp_enabled: !!auth.totp_enabled,
      });
    } else {
      await createAdminUser({
        name: 'Administrador principal',
        email: cleanEmail,
        password: auth.password,
        role: 'owner',
      });
      const created = await getAdminUserByEmail(cleanEmail);
      if (created) {
        await updateAdminUserTotp(created.id, {
          totp_secret: auth.totp_secret || null,
          totp_enabled: !!auth.totp_enabled,
        });
      }
    }
  }
  if (pool) {
    await pool.query(
      `INSERT INTO auth (id, email, password, totp_secret, totp_enabled)
       VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET 
         email = EXCLUDED.email,
       password = EXCLUDED.password,
       totp_secret = EXCLUDED.totp_secret,
       totp_enabled = EXCLUDED.totp_enabled`,
      [cleanEmail || null, auth.password, auth.totp_secret || null, auth.totp_enabled || false]
    );
    return true;
  }
  writeLocalJson('auth', { ...auth, email: cleanEmail });
  return true;
}

module.exports = {
  connectDb,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getPricing,
  savePricing,
  getSettings,
  saveSettings,
  getContacts,
  createContact,
  markContactRead,
  deleteContact,
  getReviews,
  createReview,
  approveReview,
  deleteReview,
  getPortfolio,
  createPortfolioItem,
  deletePortfolioItem,
  getAdminUserByEmail,
  getAdminUserById,
  listAdminUsers,
  countActiveOwners,
  createAdminUser,
  updateAdminUser,
  updateAdminUserPassword,
  updateAdminUserTotp,
  markAdminUserLogin,
  incrementAdminUserSessionVersion,
  revokeAdminSession,
  isAdminSessionRevoked,
  createAuditEvent,
  listAuditEvents,
  getAuth,
  saveAuth,
};
