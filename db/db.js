// db/db.js — Cliente de Base de Datos Híbrido (PostgreSQL con fallback a JSON)
// Permite migrar a PostgreSQL automáticamente cuando DATABASE_URL está definido.
'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logger = require('../lib/logger');

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;

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
};

/** Inicializa la conexión y crea las tablas si es necesario. Se ejecuta al arrancar el servidor. */
async function connectDb() {
  if (!DATABASE_URL) {
    logger.info('[DB] DATABASE_URL no configurado. Utilizando almacenamiento local en archivos JSON.');
    return false;
  }

  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
  `;
  await pool.query(query);
  await pool.query('ALTER TABLE auth ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
  logger.info('[DB] Tablas de base de datos verificadas/creadas ✓');
}

/** Si las tablas están vacías, las puebla con la información de los archivos JSON */
async function seedFromLocalFiles() {
  try {
    // 1. Productos
    const countProds = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(countProds.rows[0].count) === 0 && fs.existsSync(JSON_FILES.products)) {
      const data = JSON.parse(fs.readFileSync(JSON_FILES.products, 'utf8'));
      for (const p of data) {
        await pool.query(
          `INSERT INTO products (id, name, category, description, image, price, price_unit, features, popular, min_quantity, materials, delivery_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [p.id, p.name, p.category, p.description, p.image, p.price || 0, p.priceUnit || 'por unidad', p.features || [], p.popular || false, p.minQuantity || 1, p.materials || null, p.deliveryTime || null]
        );
      }
      // Ajustar secuencia serial de ids
      await pool.query("SELECT setval('products_id_seq', COALESCE((SELECT MAX(id)+1 FROM products), 1), false)");
      logger.info('[DB] Se sembraron productos desde archivo local JSON.');
    }

    // 2. Precios del Cotizador
    const countPricing = await pool.query('SELECT COUNT(*) FROM pricing');
    if (parseInt(countPricing.rows[0].count) === 0 && fs.existsSync(JSON_FILES.pricing)) {
      const data = JSON.parse(fs.readFileSync(JSON_FILES.pricing, 'utf8'));
      await pool.query('INSERT INTO pricing (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [data]);
      logger.info('[DB] Se sembraron precios desde archivo local JSON.');
    }

    // 3. Ajustes / Configuración
    const countSettings = await pool.query('SELECT COUNT(*) FROM settings');
    if (parseInt(countSettings.rows[0].count) === 0 && fs.existsSync(JSON_FILES.settings)) {
      const data = JSON.parse(fs.readFileSync(JSON_FILES.settings, 'utf8'));
      await pool.query('INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [data]);
      logger.info('[DB] Se sembró configuración desde archivo local JSON.');
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
function writeLocalJson(key, data) {
  try {
    fs.writeFileSync(JSON_FILES[key], JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logger.error(`[DB-JSON] Error escribiendo en ${key}.json`, { err: err.message });
  }
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
  return readLocalJson('pricing', {});
}

async function savePricing(data) {
  if (pool) {
    await pool.query(
      'INSERT INTO pricing (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
      [data]
    );
    return true;
  }
  writeLocalJson('pricing', data);
  return true;
}

// ── 3. CONFIGURACIÓN (SETTINGS) ─────────────
async function getSettings() {
  if (pool) {
    const res = await pool.query('SELECT data FROM settings WHERE id=1');
    return res.rows.length ? res.rows[0].data : { videos: [], socialMedia: {} };
  }
  return readLocalJson('settings', { videos: [], socialMedia: {} });
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

// ── 7. CREDENCIALES (AUTH) ──────────────────
async function getAuth() {
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
  if (pool) {
    await pool.query(
      `INSERT INTO auth (id, email, password, totp_secret, totp_enabled)
       VALUES (1, $1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET 
         email = EXCLUDED.email,
         password = EXCLUDED.password,
         totp_secret = EXCLUDED.totp_secret,
         totp_enabled = EXCLUDED.totp_enabled`,
      [auth.email || null, auth.password, auth.totp_secret || null, auth.totp_enabled || false]
    );
    return true;
  }
  writeLocalJson('auth', auth);
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
  getAuth,
  saveAuth,
};
