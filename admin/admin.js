/* admin/admin.js — Lógica para el panel de administración */
'use strict';

const API = '';
let token = '';
let products = [];
let editingId = null;
let deletingId = null;
let selectedImageUrl = '';   // URL final que se guardará en el producto
let uploadedImages = [];     // cache de galería
let _challengeToken = null; // token temporal para verificación 2FA

function setupIconFallback() {
  document.documentElement.classList.add('fa-fallback');
}

setupIconFallback();

// ── Utilidad: escapar HTML para prevenir XSS ───
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Contactos ──────────────────────────────────
async function loadContacts() {
  const list  = document.getElementById('contacts-list');
  const badge = document.getElementById('contacts-badge');
  try {
    const res  = await fetch('/api/contacts', { headers: { 'x-admin-token': token } });
    const data = await res.json();
    if (!Array.isArray(data)) { list.innerHTML = '<p style="color:var(--muted)">Error al cargar mensajes.</p>'; return; }
    if (data.length === 0) { list.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center;">No hay mensajes aún.</p>'; return; }

    const unread = data.filter(c => !c.read).length;
    if (badge) { badge.textContent = unread || ''; badge.style.display = unread ? 'inline' : 'none'; }

    list.innerHTML = data.map(c => `
      <div id="contact-${c.id}" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;${!c.read ? 'border-left:3px solid #E30613;' : ''}transition:box-shadow .15s;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
              <strong style="font-size:.95rem;">${esc(c.name)}</strong>
              ${!c.read ? '<span style="background:#E30613;color:#fff;font-size:.62rem;font-weight:700;border-radius:99px;padding:1px 7px;letter-spacing:.3px;">NUEVO</span>' : '<span style="font-size:.72rem;color:var(--muted);">Leído</span>'}
            </div>
            <div style="font-size:.82rem;color:var(--muted);margin-top:3px;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;">
              <a href="mailto:${esc(c.email)}" style="color:var(--blue);">${esc(c.email)}</a>
              ${c.phone ? `<span>·</span><a href="tel:${esc(c.phone)}" style="color:var(--muted);">${esc(c.phone)}</a>` : ''}
              <span>·</span><span>${new Date(c.date).toLocaleString('es-EC')}</span>
            </div>
          </div>
          <div style="display:flex;gap:.5rem;flex-shrink:0;flex-wrap:wrap;align-items:center;">
            ${c.phone ? `<a href="https://wa.me/${esc(c.phone.replace(/\D/g,''))}" target="_blank" rel="noopener noreferrer" style="font-size:.75rem;padding:.3rem .75rem;border:1px solid #25d366;border-radius:6px;background:transparent;cursor:pointer;color:#25d366;text-decoration:none;display:inline-flex;align-items:center;gap:.3rem;"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
            <a href="mailto:${esc(c.email)}" style="font-size:.75rem;padding:.3rem .75rem;border:1px solid var(--blue);border-radius:6px;background:transparent;color:var(--blue);text-decoration:none;display:inline-flex;align-items:center;gap:.3rem;"><i class="fas fa-reply"></i> Email</a>
            ${!c.read ? `<button onclick="markRead(${c.id})" style="font-size:.75rem;padding:.3rem .75rem;border:1px solid var(--border);border-radius:6px;background:transparent;cursor:pointer;color:var(--text);font-family:inherit;"><i class="fas fa-check"></i> Leído</button>` : ''}
            <button onclick="deleteContact(${c.id})" style="font-size:.75rem;padding:.3rem .75rem;border:1px solid #fca5a5;border-radius:6px;background:transparent;cursor:pointer;color:#dc2626;font-family:inherit;"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div style="margin:1rem 0 0;padding:1rem;background:var(--bg);border-radius:8px;font-size:.9rem;line-height:1.65;white-space:pre-wrap;color:var(--text);">${esc(c.message)}</div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<p style="color:var(--muted)">Error de conexión.</p>';
  }
}

async function markRead(id) {
  await fetch(`/api/contacts/${id}/read`, { method: 'PATCH', headers: { 'x-admin-token': token } });
  loadContacts();
}

async function deleteContact(id) {
  if (!confirm('¿Eliminar este mensaje?')) return;
  await fetch(`/api/contacts/${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
  document.getElementById(`contact-${id}`)?.remove();
}

// ── Auth ──────────────────────────────────────
function getCsrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
function csrfH() {
  const t = getCsrfToken();
  return t ? { 'x-csrf-token': t } : {};
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail(value));
}

async function doLogin() {
  const email = cleanEmail(document.getElementById('login-email').value);
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  errEl.textContent = 'Correo o contraseña incorrectos';

  if (!isValidEmail(email) || !pass) {
    errEl.textContent = 'Ingresa correo y contraseña.';
    errEl.style.display = 'block';
    return;
  }

  try {
    const r = await fetch(API + '/api/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...csrfH() },
      body:    JSON.stringify({ email, password: pass }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Error');
    sessionStorage.setItem('adminEmail', email);
    if (data.twoFaRequired) {
      _challengeToken = data.challengeToken;
      showLoginCard('totp-form');
      setTimeout(() => document.getElementById('totp-code').focus(), 100);
      return;
    }
    token = data.token;
    sessionStorage.setItem('adminToken', token);
    showApp();
  } catch {
    errEl.style.display = 'block';
  }
}

// Vinculación de eventos por JS (se ejecuta en DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
  const savedEmail = sessionStorage.getItem('adminEmail') || '';
  if (savedEmail) document.getElementById('login-email').value = savedEmail;
  document.getElementById('login-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('login-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('forgot-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendResetLink(); });
});

async function doTotpVerify() {
  const code = document.getElementById('totp-code').value.replace(/\s/g, '');
  document.getElementById('totp-error').style.display = 'none';
  try {
    const r = await fetch(API + '/api/auth/2fa/challenge', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...csrfH() },
      body:    JSON.stringify({ challengeToken: _challengeToken, totpCode: code }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Error');
    _challengeToken = null;
    token = data.token;
    sessionStorage.setItem('adminToken', token);
    showApp();
  } catch (e) {
    document.getElementById('totp-error').textContent = e.message || 'Código incorrecto o expirado';
    document.getElementById('totp-error').style.display = 'block';
  }
}

async function logout() {
  try {
    await fetch(API + '/api/auth/logout', {
      method:  'POST',
      headers: { 'x-admin-token': token, ...csrfH() },
    });
  } catch {}
  sessionStorage.removeItem('adminToken');
  token = '';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
  showLoginCard('login-form');
}

async function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadAdminProfile();
  await loadDashboard();
  loadProducts();
  loadGallery();
  pollNotifications();
  setInterval(pollNotifications, 60000);
}

// ── Hamburger sidebar (mobile) ──────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ── Stats de mensajes en dashboard ─────────────
async function loadContactsStats() {
  try {
    const r = await fetch('/api/contacts', { headers: { 'x-admin-token': token } });
    const data = await r.json();
    if (!Array.isArray(data)) return;
    const unread = data.filter(c => !c.read).length;
    const el = document.getElementById('st-messages');
    if (el) el.textContent = unread;
    const badge = document.getElementById('contacts-badge');
    if (badge) { badge.textContent = unread || ''; badge.style.display = unread ? 'inline' : 'none'; }
  } catch {}
}

// ── Portfolio ─────────────────────────────────
async function loadPortfolioAdmin() {
  const grid  = document.getElementById('portfolio-admin-grid');
  const empty = document.getElementById('portfolio-admin-empty');
  if (!grid) return;
  try {
    const res  = await fetch('/api/portfolio', { headers: { 'x-admin-token': token } });
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) {
      if (empty) empty.style.display = 'block';
      grid.querySelectorAll('.portfolio-admin-card').forEach(c => c.remove());
      return;
    }
    if (empty) empty.style.display = 'none';
    grid.querySelectorAll('.portfolio-admin-card').forEach(c => c.remove());
    const catLabels = { impresion:'Impresión', 'gran-formato':'Gran formato', packaging:'Packaging', pop:'Material POP', personalizado:'Personalizado' };
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'portfolio-admin-card';
      card.innerHTML = `
        <img src="${esc(item.image)}" alt="${esc(item.title)}" onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'180\' height=\'140\'><rect fill=\'%23f3f4f6\' width=\'180\' height=\'140\'/></svg>'">
        <button class="pa-del" onclick="deletePortfolioItem(${item.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
        <div class="pa-info">
          <div class="pa-title">${esc(item.title)}</div>
          <div class="pa-cat">${catLabels[item.category] || item.category}</div>
        </div>`;
      grid.appendChild(card);
    });
  } catch(e) {
    if (grid) grid.innerHTML = '<div style="color:var(--muted);padding:2rem;text-align:center;">Error al cargar.</div>';
  }
}

async function addPortfolioItem() {
  const title    = document.getElementById('pf-title').value.trim();
  const category = document.getElementById('pf-category').value;
  const image    = document.getElementById('pf-image').value.trim();
  if (!title || !image) return showToast('Completa título e imagen.', 'orange');
  try {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-admin-token': token },
      body: JSON.stringify({ title, category, image }),
    });
    if (!res.ok) throw new Error();
    document.getElementById('pf-title').value = '';
    document.getElementById('pf-image').value = '';
    document.getElementById('pf-preview').style.display = 'none';
    showToast('Trabajo agregado al portfolio.', 'green');
    loadPortfolioAdmin();
  } catch { showToast('Error al agregar.', 'orange'); }
}

async function deletePortfolioItem(id) {
  if (!confirm('¿Eliminar este trabajo del portfolio?')) return;
  await fetch('/api/portfolio/' + id, { method: 'DELETE', headers: { 'x-admin-token': token } });
  loadPortfolioAdmin();
}

async function uploadPortfolioImage(input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('image', input.files[0]);
  try {
    const res  = await fetch('/api/upload', { method:'POST', headers:{'x-admin-token':token}, body:fd });
    const data = await res.json();
    if (data.url) {
      document.getElementById('pf-image').value = data.url;
      const prev = document.getElementById('pf-preview');
      document.getElementById('pf-preview-img').src = data.url;
      prev.style.display = 'block';
    }
  } catch { showToast('Error al subir imagen.', 'orange'); }
}

// ── Toast notifications ────────────────────────
function showToast(msg, type = 'blue', icon = null) {
  const container = document.getElementById('admin-toast');
  if (!container) return;
  const icons = { green:'fa-check-circle', blue:'fa-bell', orange:'fa-exclamation-circle' };
  const el = document.createElement('div');
  el.className = `admin-toast-item toast-${type === 'green' ? 'success' : 'info'}`;
  el.innerHTML = `
    <div class="t-icon ${type}"><i class="fas ${icon || icons[type] || 'fa-bell'}"></i></div>
    <div class="t-body"><strong>${msg}</strong></div>`;
  container.appendChild(el);
  setTimeout(() => { el.style.transition='opacity .4s'; el.style.opacity='0'; setTimeout(()=>el.remove(), 400); }, 4000);
}

// ── Auto-polling notificaciones ────────────────
let _lastUnreadContacts = -1;
let _lastPendingReviews = -1;

async function pollNotifications() {
  if (!token) return;
  try {
    const [rC, rR] = await Promise.all([
      fetch('/api/contacts',     { headers: { 'x-admin-token': token } }),
      fetch('/api/reviews/all',  { headers: { 'x-admin-token': token } }),
    ]);
    const contacts = await rC.json();
    const reviews  = await rR.json();

    if (Array.isArray(contacts)) {
      const unread = contacts.filter(c => !c.read).length;
      const badge  = document.getElementById('contacts-badge');
      const stEl   = document.getElementById('st-messages');
      if (badge) { badge.textContent = unread || ''; badge.style.display = unread ? 'inline' : 'none'; }
      if (stEl) stEl.textContent = unread;
      if (_lastUnreadContacts >= 0 && unread > _lastUnreadContacts) {
        showToast(`${unread - _lastUnreadContacts} nuevo${unread - _lastUnreadContacts > 1 ? 's' : ''} mensaje${unread - _lastUnreadContacts > 1 ? 's' : ''} de contacto`, 'blue', 'fa-envelope');
      }
      _lastUnreadContacts = unread;
    }

    if (Array.isArray(reviews)) {
      const pending = reviews.filter(r => !r.approved).length;
      const badge   = document.getElementById('reviews-badge');
      if (badge) { badge.textContent = pending || ''; badge.style.display = pending ? 'inline' : 'none'; }
      if (_lastPendingReviews >= 0 && pending > _lastPendingReviews) {
        showToast(`${pending - _lastPendingReviews} nueva${pending - _lastPendingReviews > 1 ? 's' : ''} reseña${pending - _lastPendingReviews > 1 ? 's' : ''} pendiente${pending - _lastPendingReviews > 1 ? 's' : ''}`, 'orange', 'fa-star');
      }
      _lastPendingReviews = pending;
    }
  } catch {}
}

async function loadReviewsBadge() {
  try {
    const r = await fetch('/api/reviews/all', { headers: { 'x-admin-token': token } });
    const data = await r.json();
    if (!Array.isArray(data)) return;
    const pending = data.filter(x => !x.approved).length;
    const badge = document.getElementById('reviews-badge');
    if (badge) { badge.textContent = pending || ''; badge.style.display = pending ? 'inline' : 'none'; }
  } catch(e) {}
}

async function loadReviewsAdmin() {
  const list  = document.getElementById('reviews-admin-list');
  const badge = document.getElementById('reviews-badge');
  if (!list) return;
  try {
    const res  = await fetch('/api/reviews/all', { headers: { 'x-admin-token': token } });
    const data = await res.json();
    if (!Array.isArray(data)) { list.innerHTML = '<p style="color:var(--muted)">Error al cargar reseñas.</p>'; return; }
    if (data.length === 0) { list.innerHTML = '<p style="color:var(--muted);padding:2rem;text-align:center;">No hay reseñas aún.</p>'; return; }

    const pending = data.filter(r => !r.approved).length;
    if (badge) { badge.textContent = pending || ''; badge.style.display = pending ? 'inline' : 'none'; }

    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    list.innerHTML = data.map(r => `
      <div id="review-${r.id}" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;${!r.approved ? 'border-left:3px solid var(--orange);' : 'border-left:3px solid var(--green);'}transition:box-shadow .15s;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
              <strong style="font-size:.95rem;">${esc(r.name)}</strong>
              <span style="color:#f9a825;letter-spacing:1px;">${stars(r.rating)}</span>
              ${!r.approved
                ? '<span style="background:var(--orange);color:#fff;font-size:.62rem;font-weight:700;border-radius:99px;padding:1px 7px;">PENDIENTE</span>'
                : '<span style="background:var(--green);color:#fff;font-size:.62rem;font-weight:700;border-radius:99px;padding:1px 7px;">APROBADA</span>'}
            </div>
            <div style="font-size:.8rem;color:var(--muted);margin-top:3px;">${new Date(r.date).toLocaleString('es-EC')}</div>
          </div>
          <div style="display:flex;gap:.5rem;flex-shrink:0;">
            ${!r.approved ? '<button onclick="approveReview(' + r.id + ')" style="font-size:.75rem;padding:.35rem .85rem;border:1px solid var(--green);border-radius:6px;background:transparent;cursor:pointer;color:var(--green);font-family:inherit;"><i class=\'fas fa-check\'></i> Aprobar</button>' : ''}
            <button onclick="deleteReview(${r.id})" style="font-size:.75rem;padding:.35rem .85rem;border:1px solid #fca5a5;border-radius:6px;background:transparent;cursor:pointer;color:#dc2626;font-family:inherit;"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div style="margin:.75rem 0 0;padding:1rem;background:var(--bg);border-radius:8px;font-size:.9rem;line-height:1.65;white-space:pre-wrap;font-style:italic;color:var(--text);">"${esc(r.comment)}"</div>
      </div>
    `).join('');
  } catch(e) {
    list.innerHTML = '<p style="color:var(--muted)">Error: ' + e.message + '</p>';
  }
}

async function approveReview(id) {
  await fetch('/api/reviews/' + id + '/approve', { method: 'PATCH', headers: { 'x-admin-token': token } });
  loadReviewsAdmin();
}

async function deleteReview(id) {
  if (!confirm('¿Eliminar esta reseña?')) return;
  await fetch('/api/reviews/' + id, { method: 'DELETE', headers: { 'x-admin-token': token } });
  loadReviewsAdmin();
}

// ── Navegación secciones ──────────────────────
function showSection(name) {
  document.querySelectorAll('.section-panel').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('section-' + name);
  const nav = document.getElementById('nav-' + name);
  if (panel) panel.classList.add('active');
  if (nav) nav.classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'gallery')   loadGallery();
  if (name === 'pricing')   loadPricing();
  if (name === 'videos')    loadVideos();
  if (name === 'social')    loadSocialMedia();
  if (name === 'reviews')   loadReviewsAdmin();
  if (name === 'contacts')  loadContacts();
  if (name === 'portfolio') loadPortfolioAdmin();
  if (name === 'security') {
    loadAdminProfile();
    loadTwoFaStatus();
  }
  closeSidebar();
}

// ── Dashboard global ──────────────────────────
async function loadDashboard() {
  const icon = document.getElementById('dash-refresh-icon');
  if (icon) icon.classList.add('fa-spin');
  try {
    const [rP, rC, rR, rPort] = await Promise.all([
      fetch('/api/products',    { headers: { 'x-admin-token': token } }),
      fetch('/api/contacts',    { headers: { 'x-admin-token': token } }),
      fetch('/api/reviews/all', { headers: { 'x-admin-token': token } }),
      fetch('/api/portfolio',   { headers: { 'x-admin-token': token } }),
    ]);

    const safeJson = async (res) => {
      const d = await res.json();
      return Array.isArray(d) ? d : [];
    };
    const [prods, contacts, reviews, portfolio] = await Promise.all([
      safeJson(rP), safeJson(rC), safeJson(rR), safeJson(rPort),
    ]);

    const unread  = contacts.filter(c => !c.read).length;
    const pending = reviews.filter(r => !r.approved).length;
    const popular = prods.filter(p => p.popular).length;
    const cats    = new Set(prods.map(p => p.category)).size;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('dash-products',   prods.length);
    set('dash-popular',    popular);
    set('dash-messages',   unread);
    set('dash-reviews',    pending);
    set('dash-portfolio',  Array.isArray(portfolio) ? portfolio.length : '—');
    set('dash-categories', cats);

    // Lista de mensajes (top 4, sin leer primero)
    const msgList = document.getElementById('dash-messages-list');
    if (msgList) {
      const sorted = [...contacts].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1)).slice(0, 4);
      msgList.innerHTML = sorted.length
        ? sorted.map(c => `
          <div class="dash-list-row">
            <div class="dash-row-icon ${c.read ? '' : 'unread'}"><i class="fas fa-envelope"></i></div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.name)}</div>
              <div style="font-size:.75rem;color:var(--muted);">${new Date(c.date||c.createdAt).toLocaleDateString('es-EC',{day:'numeric',month:'short'})}</div>
            </div>
            ${!c.read ? '<span class="badge" style="background:#fff0ef;color:#ff3b30;flex-shrink:0;">Nuevo</span>' : ''}
          </div>`).join('')
        : '<div class="dash-empty"><i class="fas fa-envelope"></i><span>Sin mensajes</span></div>';
    }

    // Lista de reseñas pendientes (top 4)
    const revList = document.getElementById('dash-reviews-list');
    if (revList) {
      const pend = reviews.filter(r => !r.approved).slice(0, 4);
      revList.innerHTML = pend.length
        ? pend.map(r => `
          <div class="dash-list-row">
            <div class="dash-row-icon pending"><i class="fas fa-star"></i></div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.name)}</div>
              <div style="font-size:.75rem;color:var(--muted);">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            </div>
            <button data-approve="${r.id}" class="dash-approve-btn">
              <i class="fas fa-check"></i> Aprobar
            </button>
          </div>`).join('')
        : '<div class="dash-empty"><i class="fas fa-star"></i><span>Sin reseñas pendientes</span></div>';
    }
  } catch(e) {
    showToast('Error cargando el dashboard: ' + (e.message || e), 'orange');
  } finally {
    if (icon) icon.classList.remove('fa-spin');
  }
}

// ── Productos ─────────────────────────────────
async function loadProducts() {
  try {
    const r = await fetch(API + '/api/products');
    products = await r.json();
    renderStats();
    renderTable();
  } catch { toast('Error cargando productos', 'error'); }
}

function renderStats() {
  const total   = products.length;
  const popular = products.filter(p => p.popular).length;
  const cats    = new Set(products.map(p => p.category)).size;
  const avg     = products.length
    ? (products.reduce((s, p) => s + (p.price || 0), 0) / products.length).toFixed(2)
    : '0.00';
  document.getElementById('st-total').textContent   = total;
  document.getElementById('st-popular').textContent = popular;
  document.getElementById('st-cats').textContent    = cats;
  document.getElementById('st-avg').textContent     = '$' + avg;
}

function isImg(val) {
  if (!val) return false;
  return val.startsWith('/uploads/') || val.startsWith('http') || val.startsWith('images/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(val);
}

function renderTable() {
  const q   = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('cat-filter').value;
  const filtered = products.filter(p => {
    const matchQ   = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    const matchCat = !cat || p.category === cat;
    return matchQ && matchCat;
  });
  const catLabel = { impresion:'Impresión', promocional:'Promocional', packaging:'Packaging', 'gran-formato':'Gran Formato' };
  const tbody = document.getElementById('products-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-box-open"></i>No se encontraron productos</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        <div class="product-cell">
          <div class="product-thumb">
            ${isImg(p.image)
              ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.name)}" onerror="this.parentElement.innerHTML='<span class=emoji>📦</span>'">`
              : `<span class="emoji">${escHtml(p.image || '📦')}</span>`}
          </div>
          <div><div class="product-name">${escHtml(p.name)}</div><div class="product-id">#${p.id}</div></div>
        </div>
      </td>
      <td><span class="badge badge-${p.category}">${catLabel[p.category] || p.category}</span></td>
      <td>$${(p.price||0).toFixed(2)} <small style="color:var(--muted)">${escHtml(p.priceUnit||'')}</small></td>
      <td>${p.minQuantity || 1}</td>
      <td><span class="popular-dot ${p.popular?'yes':'no'}">${p.popular?'Sí':'No'}</span></td>
      <td><div class="actions">
        <button class="btn-icon edit" onclick="openEditModal(${p.id})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn-icon del"  onclick="askDelete(${p.id})"    title="Eliminar"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('');
}

// ── Modal producto ─────────────────────────────
function openModal(product = null) {
  editingId = product ? product.id : null;
  selectedImageUrl = '';
  document.getElementById('modal-title').textContent = product ? 'Editar producto' : 'Nuevo producto';
  document.getElementById('save-label').textContent  = product ? 'Actualizar' : 'Guardar';
  document.getElementById('f-name').value        = product?.name        || '';
  document.getElementById('f-category').value    = product?.category    || 'impresion';
  document.getElementById('f-price').value       = product?.price       || '';
  document.getElementById('f-priceUnit').value   = product?.priceUnit   || 'por unidad';
  document.getElementById('f-description').value  = product?.description  || '';
  document.getElementById('f-minQuantity').value  = product?.minQuantity  || 100;
  document.getElementById('f-popular').checked    = product?.popular      || false;
  document.getElementById('f-materials').value    = product?.materials    || '';
  document.getElementById('f-deliveryTime').value = product?.deliveryTime || '';
  document.getElementById('f-emoji').value       = isImg(product?.image) ? '' : (product?.image || '');
  updateEmojiPreview();

  // Imagen actual
  if (product?.image) {
    selectedImageUrl = product.image;
    showCurrentImg(product.image);
    if (isImg(product.image)) {
      switchImgTab('upload', null);
      showDropPreview(product.image);
    } else {
      switchImgTab('emoji', null);
      document.querySelectorAll('.img-tab')[2].classList.add('active');
    }
  } else {
    clearImage();
    switchImgTab('upload', document.querySelectorAll('.img-tab')[0]);
  }

  const fl = document.getElementById('features-list');
  fl.innerHTML = '';
  const features = product?.features || [''];
  features.forEach(f => addFeatureRow(f));

  document.getElementById('modal-overlay').classList.add('open');
}

function openEditModal(id) {
  const p = products.find(p => p.id === id);
  if (p) openModal(p);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
  clearDropZone();
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ── Tabs de imagen ─────────────────────────────
function switchImgTab(name, btn) {
  document.querySelectorAll('.img-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('img-tab-upload').style.display  = name === 'upload'  ? 'block' : 'none';
  document.getElementById('img-tab-gallery').style.display = name === 'gallery' ? 'block' : 'none';
  document.getElementById('img-tab-emoji').style.display   = name === 'emoji'   ? 'block' : 'none';
  if (name === 'gallery') renderModalGallery();
}

// ── Drop zone ──────────────────────────────────
function onDragOver(e) { e.preventDefault(); document.getElementById('drop-zone').classList.add('dragover'); }
function onDragLeave()  { document.getElementById('drop-zone').classList.remove('dragover'); }
function onDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
}
function onFileSelected(input) { if (input.files[0]) handleFile(input.files[0]); }

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => showDropPreview(e.target.result);
  reader.readAsDataURL(file);
  uploadFile(file);
}

function showDropPreview(src) {
  const dz = document.getElementById('drop-zone');
  dz.classList.add('has-image');
  dz.innerHTML = `
    <input type="file" id="file-input" accept="image/*,.pdf,.svg" onchange="onFileSelected(this)" style="display:none">
    <div class="dz-preview">
      <img src="${src}" alt="preview">
      <button class="dz-remove" onclick="clearDropZone(event)" title="Quitar"><i class="fas fa-times"></i></button>
    </div>`;
}

function clearDropZone(e) {
  if (e) e.stopPropagation();
  const dz = document.getElementById('drop-zone');
  dz.classList.remove('has-image');
  dz.innerHTML = `
    <input type="file" id="file-input" accept="image/*,.pdf,.svg" onchange="onFileSelected(this)" style="display:none">
    <div class="dz-prompt" id="dz-prompt">
      <div class="dz-icon"><i class="fas fa-cloud-upload-alt"></i></div>
      <div class="dz-text">Arrastra una imagen aquí o haz clic para seleccionar</div>
      <div class="dz-hint">JPG, PNG, WEBP — máx. 5 MB</div>
    </div>`;
  dz.onclick = () => document.getElementById('file-input').click();
  dz.ondragover = onDragOver;
  dz.ondragleave = onDragLeave;
  dz.ondrop = onDrop;
  clearImage();
}

async function uploadFile(file) {
  const progress = document.getElementById('upload-progress');
  const bar      = document.getElementById('progress-bar');
  const txt      = document.getElementById('progress-text');
  progress.classList.add('show');
  bar.style.width = '0%';
  txt.textContent = 'Subiendo...';

  let pct = 0;
  const interval = setInterval(() => {
    pct = Math.min(pct + Math.random() * 15, 90);
    bar.style.width = pct + '%';
  }, 200);

  try {
    const formData = new FormData();
    formData.append('image', file);
    const r = await fetch(API + '/api/upload', {
      method: 'POST',
      headers: { 'x-admin-token': token },
      body: formData
    });
    clearInterval(interval);
    if (!r.ok) throw new Error();
    const data = await r.json();
    bar.style.width = '100%';
    txt.textContent = '¡Imagen subida!';
    setTimeout(() => progress.classList.remove('show'), 1500);
    selectedImageUrl = data.url;
    showCurrentImg(data.url);
    uploadedImages = []; // reset cache para recargar galería
  } catch {
    clearInterval(interval);
    progress.classList.remove('show');
    toast('Error subiendo la imagen', 'error');
  }
}

function showCurrentImg(url) {
  const el = document.getElementById('current-img-info');
  const lb = document.getElementById('current-img-label');
  el.style.display = 'flex';
  lb.textContent = isImg(url)
    ? 'Imagen: ' + url.split('/').pop()
    : 'Emoji: ' + url;
}

function clearImage() {
  selectedImageUrl = '';
  document.getElementById('current-img-info').style.display = 'none';
}

// ── Galería en modal ───────────────────────────
async function renderModalGallery() {
  const container = document.getElementById('modal-gallery-select');
  if (uploadedImages.length === 0) {
    try {
      const r = await fetch(API + '/api/uploads', { headers: { 'x-admin-token': token } });
      uploadedImages = await r.json();
    } catch { uploadedImages = []; }
  }
  if (uploadedImages.length === 0) {
    container.innerHTML = '<div class="gs-empty">No hay imágenes subidas aún.<br>Ve a la pestaña "Subir imagen" primero.</div>';
    return;
  }
  container.innerHTML = uploadedImages.map(img => `
    <div class="gs-item ${selectedImageUrl === img.url ? 'selected' : ''}" onclick="selectFromGallery('${img.url}', this)">
      <img src="${img.url}" alt="${img.filename}" loading="lazy">
    </div>`).join('');
}

function selectFromGallery(url, el) {
  document.querySelectorAll('.gs-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  selectedImageUrl = url;
  showCurrentImg(url);
}

// ── Galería principal ──────────────────────────
async function loadGallery() {
  try {
    const r = await fetch(API + '/api/uploads', { headers: { 'x-admin-token': token } });
    uploadedImages = await r.json();
    renderGallery();
  } catch { toast('Error cargando galería', 'error'); }
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (uploadedImages.length === 0) {
    grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-images" style="font-size:2rem;display:block;margin-bottom:1rem;opacity:.3;"></i>No hay imágenes aún</div>';
    return;
  }
  grid.innerHTML = uploadedImages.map(img => `
    <div class="gallery-item">
      <img src="${img.url}" alt="${img.filename}" loading="lazy">
      <div class="gallery-item-info">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px">${img.filename}</span>
        <button class="gallery-item-del" onclick="deleteImage('${img.filename}', event)" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
}

async function uploadFromGallery(input) {
  if (!input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('image', file);
  try {
    const r = await fetch(API + '/api/upload', {
      method: 'POST',
      headers: { 'x-admin-token': token },
      body: formData
    });
    if (!r.ok) throw new Error();
    toast('Imagen subida correctamente ✓', 'success');
    uploadedImages = [];
    await loadGallery();
  } catch { toast('Error subiendo imagen', 'error'); }
}

async function deleteImage(filename, e) {
  e.stopPropagation();
  if (!confirm('¿Eliminar esta imagen del servidor?')) return;
  try {
    await fetch(`${API}/api/upload/${filename}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
    uploadedImages = uploadedImages.filter(i => i.filename !== filename);
    renderGallery();
    toast('Imagen eliminada', 'success');
  } catch { toast('Error eliminando imagen', 'error'); }
}

// ── Emoji ─────────────────────────────────────
function updateEmojiPreview() {
  const val = document.getElementById('f-emoji').value;
  const preview = document.getElementById('emoji-preview');
  if (preview) preview.textContent = val || '🖨️';
  if (val) { selectedImageUrl = val; showCurrentImg(val); }
}

// ── Features ──────────────────────────────────
function addFeatureRow(value = '') {
  const list = document.getElementById('features-list');
  if (!list) return;
  const row  = document.createElement('div');
  row.className = 'feature-row';
  row.innerHTML = `
    <input type="text" placeholder="Ej: Impresión a full color" value="${escHtml(value)}">
    <button class="btn-rm-feature" onclick="this.parentElement.remove()"><i class="fas fa-minus"></i></button>`;
  list.appendChild(row);
  row.querySelector('input').focus();
}

// ── Guardar producto ───────────────────────────
async function saveProduct() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true;

  const features = Array.from(document.querySelectorAll('#features-list .feature-row input'))
    .map(i => i.value.trim()).filter(Boolean);

  let finalImage = selectedImageUrl;
  if (!finalImage) {
    const emoji = document.getElementById('f-emoji').value.trim();
    finalImage = emoji || '📦';
  }

  const payload = {
    name:        document.getElementById('f-name').value.trim(),
    category:    document.getElementById('f-category').value,
    image:       finalImage,
    price:       parseFloat(document.getElementById('f-price').value) || 0,
    priceUnit:   document.getElementById('f-priceUnit').value.trim() || 'por unidad',
    description:  document.getElementById('f-description').value.trim(),
    minQuantity:  parseInt(document.getElementById('f-minQuantity').value) || 1,
    popular:      document.getElementById('f-popular').checked,
    materials:    document.getElementById('f-materials').value.trim()    || undefined,
    deliveryTime: document.getElementById('f-deliveryTime').value.trim() || undefined,
    features
  };

  if (!payload.name) { toast('El nombre es obligatorio', 'error'); btn.disabled = false; return; }

  try {
    const url    = editingId ? `${API}/api/products/${editingId}` : `${API}/api/products`;
    const method = editingId ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error();
    closeModal();
    await loadProducts();
    toast(editingId ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success');
  } catch { toast('Error guardando producto', 'error'); }
  btn.disabled = false;
}

// ── Eliminar producto ──────────────────────────
function askDelete(id) {
  const p = products.find(p => p.id === id);
  deletingId = id;
  document.getElementById('confirm-text').textContent =
    `¿Estás seguro de eliminar "${p?.name}"? Esta acción no se puede deshacer.`;
  document.getElementById('confirm-overlay').classList.add('open');
}
function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('open'); deletingId = null; }
async function confirmDelete() {
  if (!deletingId) return;
  try {
    await fetch(`${API}/api/products/${deletingId}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
    closeConfirm();
    await loadProducts();
    toast('Producto eliminado', 'success');
  } catch { toast('Error eliminando producto', 'error'); }
}

// ── Toast ─────────────────────────────────────
let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Auto-login + Dashboard event delegation (CSP-safe) ─────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Auto-login
  const saved = sessionStorage.getItem('adminToken');
  if (saved) { token = saved; showApp(); }

  // Nav sidebar delegation — todos los items usan data-goto (CSP-safe)
  document.querySelector('.sidebar-nav')?.addEventListener('click', e => {
    const item = e.target.closest('[data-goto]');
    if (item) { showSection(item.dataset.goto); return; }
    if (e.target.closest('#nav-view-site')) window.open('/', '_blank');
  });

  // Dashboard panel: navegación, actualizar y aprobar reseñas
  document.getElementById('dash-refresh-btn')?.addEventListener('click', loadDashboard);
  document.getElementById('dash-view-site-btn')?.addEventListener('click', () => window.open('/', '_blank'));

  document.getElementById('section-pricing')?.addEventListener('input', e => {
    if (e.target.closest('[data-key]')) setPricingDirty(true);
  });

  document.getElementById('section-dashboard')?.addEventListener('click', e => {
    const goTo = e.target.closest('[data-goto]')?.dataset.goto;
    if (goTo) { showSection(goTo); return; }

    const approveId = e.target.closest('[data-approve]')?.dataset.approve;
    if (approveId) {
      fetch('/api/reviews/' + approveId + '/approve', {
        method: 'PATCH',
        headers: { 'x-admin-token': token },
      }).then(loadDashboard);
    }
  });

  // Portfolio image preview listener
  document.getElementById('pf-image')?.addEventListener('input', function() {
    const prev = document.getElementById('pf-preview');
    if (this.value) {
      document.getElementById('pf-preview-img').src = this.value;
      prev.style.display = 'block';
    } else { prev.style.display = 'none'; }
  });
});

// ── COTIZADOR: carga y edición de precios ──────
let pricingData = null;
let pricingDirty = false;

async function loadPricing() {
  try {
    setPricingStatus('loading', 'Cargando precios', 'Consultando la configuración actual del cotizador.');
    const r = await fetch(API + '/api/pricing');
    if (!r.ok) throw new Error();
    pricingData = await r.json();
    renderPricingForms();
    renderPricingOverview();
    setPricingDirty(false);
  } catch {
    setPricingStatus('error', 'No se pudieron cargar los precios', 'Revisa el servidor e intenta recargar.');
    toast('Error cargando precios del cotizador', 'error');
  }
}

function setPricingStatus(mode, title, text) {
  const el = document.getElementById('pricing-status');
  if (!el) return;
  const icon = mode === 'dirty' ? 'exclamation-circle' : mode === 'error' ? 'times-circle' : mode === 'loading' ? 'sync-alt fa-spin' : 'check-circle';
  el.className = `pricing-status ${mode}`;
  el.innerHTML = `<i class="fas fa-${icon}"></i><div><strong>${escHtml(title)}</strong><span>${escHtml(text)}</span></div>`;
}

function setPricingDirty(isDirty) {
  pricingDirty = Boolean(isDirty);
  if (pricingDirty) {
    setPricingStatus('dirty', 'Cambios sin guardar', 'Guarda para actualizar el cotizador público.');
  } else {
    setPricingStatus('clean', 'Sin cambios pendientes', 'Los precios cargados coinciden con el servidor.');
  }
}

function countPricingTiers(value) {
  if (!value) return 0;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + (item && typeof item === 'object' && 'qty' in item ? 1 : countPricingTiers(item)), 0);
  }
  if (typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => {
      if (Array.isArray(item?.tiers)) return sum + item.tiers.length;
      return sum + countPricingTiers(item);
    }, 0);
  }
  return 0;
}

function countDeliveryValues(value) {
  if (!value) return 0;
  if (typeof value === 'string') return value.trim() ? 1 : 0;
  if (typeof value === 'object') return Object.values(value).reduce((sum, item) => sum + countDeliveryValues(item), 0);
  return 0;
}

function renderPricingOverview() {
  const p = pricingData?.pricing || {};
  const products = [
    ...Object.keys(p.volantes || {}),
    ...(p.tarjetas || []),
    ...(p.tazas || []),
    ...Object.keys(p.granformato || {}),
    ...Object.keys(p.pop || {}),
    ...Object.keys(p.etiquetas || {}),
    ...Object.keys(p.packaging || {}),
    ...(p.diseno || []),
    ...Object.keys(p.letreros || {}),
  ].length;
  const tiers = countPricingTiers(p);
  const delivery = countDeliveryValues(pricingData?.delivery || {});
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('pricing-kpi-products', products.toLocaleString());
  setText('pricing-kpi-tiers', tiers.toLocaleString());
  setText('pricing-kpi-delivery', delivery.toLocaleString());
}

function switchPricingTab(name, btn) {
  document.querySelectorAll('#pricing-tabs-bar .pricing-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pricing-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('pp-' + name);
  if (el) el.classList.add('active');
}

function renderPricingForms() {
  if (!pricingData?.pricing) { toast('Estructura de precios inválida', 'error'); return; }
  const p = pricingData.pricing;

  // ── VOLANTES ──
  const volCont = document.getElementById('pp-volantes');
  if (volCont && p.volantes) {
    let html = '';
    ['a6-1c', 'a6-2c'].forEach(key => {
      const m = p.volantes[key];
      if (!m || m.type !== 'tiers') return;
      html += `<div class="pricing-card">
        <div class="pricing-card-header"><i class="fas fa-layer-group"></i> ${escHtml(m.label)} &middot; ${escHtml(m.dims || '')} &mdash; precio total por cantidad</div>
        <div style="display:grid;grid-template-columns:160px 1fr;gap:.75rem;padding:.5rem 1.25rem;background:var(--bg);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)"><span>Cantidad</span><span>Precio total ($)</span></div>
        ${(m.tiers || []).map((t, i) => `<div style="display:grid;grid-template-columns:160px 1fr;gap:.75rem;padding:.625rem 1.25rem;border-bottom:1px solid var(--border);align-items:center;">
          <input type="number" class="price-input price-input-sm" step="100" min="100" data-key="pricing.volantes.${key}.tiers.${i}.qty" value="${t.qty}">
          <input type="number" class="price-input" step="0.01" min="0" data-key="pricing.volantes.${key}.tiers.${i}.total" value="${t.total}">
        </div>`).join('')}
      </div>`;
    });
    const per1kRows = ['a5-1c','a5-2c','a4-1c','a4-2c'].map(key => {
      const m = p.volantes[key];
      if (!m || m.type !== 'per1k') return '';
      return `<div class="perunit-row">
        <div><div class="pricing-label">${escHtml(m.label)}</div><div class="pricing-sub">${escHtml(m.dims || '')}</div></div>
        <input type="number" class="price-input" step="0.01" min="0" data-key="pricing.volantes.${key}.unitPer1000" value="${m.unitPer1000}">
        <input type="number" class="price-input" step="100" min="100" data-key="pricing.volantes.${key}.minQty" value="${m.minQty}">
      </div>`;
    }).join('');
    html += `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-calculator"></i> Formatos A5 y A4 &mdash; precio por cada 1000 unidades + cantidad mínima</div>
      <div class="perunit-row header"><span>Formato</span><span>$ por 1000 uds.</span><span>Mínimo uds.</span></div>
      ${per1kRows}
    </div>`;
    volCont.innerHTML = html;
  }

  // ── TARJETAS ──
  const tarCont = document.getElementById('pp-tarjetas');
  if (tarCont && p.tarjetas) {
    tarCont.innerHTML = `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-id-card"></i> Precio por 1000 tarjetas de presentación (por acabado)</div>
      <div class="pricing-row header"><span>Acabado</span><span>Precio ($)</span><span></span><span></span></div>
      ${p.tarjetas.map((t, i) => `<div class="pricing-row">
        <div><div class="pricing-label">${escHtml(t.label)}</div><div class="pricing-sub">${escHtml(t.desc || '')}</div></div>
        <input type="number" class="price-input" step="0.50" min="0" data-key="pricing.tarjetas.${i}.price" value="${t.price}">
        <span></span><span></span>
      </div>`).join('')}
    </div>`;
  }

  // ── TAZAS ──
  const tazCont = document.getElementById('pp-tazas');
  if (tazCont && p.tazas) {
    tazCont.innerHTML = `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-mug-hot"></i> Precio por unidad según cantidad de pedido</div>
      <div class="tier-row header"><span>Etiqueta</span><span>Cantidad</span><span>Precio c/u ($)</span></div>
      ${p.tazas.map((t, i) => `<div class="tier-row">
        <input type="text" class="price-input" data-key="pricing.tazas.${i}.label" value="${escHtml(t.label)}">
        <input type="number" class="price-input" step="1" min="1" data-key="pricing.tazas.${i}.qty" value="${t.qty}">
        <input type="number" class="price-input" step="0.01" min="0" data-key="pricing.tazas.${i}.ppu" value="${t.ppu}">
      </div>`).join('')}
    </div>`;
  }

  // ── GRAN FORMATO ──
  const gfCont = document.getElementById('pp-granformato');
  if (gfCont && p.granformato) {
    gfCont.innerHTML = `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-image"></i> Impresión en gran formato</div>
      <div class="pricing-row header"><span>Producto</span><span>Precio ($)</span><span>Unidad</span><span></span></div>
      ${Object.entries(p.granformato).map(([key, v]) => `<div class="pricing-row">
        <div><div class="pricing-label">${escHtml(v.label)}</div><div class="pricing-sub">${escHtml(v.specs || '')}</div></div>
        <input type="number" class="price-input" step="0.01" min="0"
          data-key="pricing.granformato.${key}.${v.unit === 'm2' ? 'ppm2' : 'ppu'}"
          value="${v.ppm2 ?? v.ppu ?? 0}">
        <span class="pricing-sub">por ${escHtml(v.unit)}</span>
        <span></span>
      </div>`).join('')}
    </div>`;
  }

  // ── MATERIAL POP ──
  const popCont = document.getElementById('pp-pop');
  if (popCont && p.pop) {
    popCont.innerHTML = Object.entries(p.pop).map(([key, cat]) => `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-gift"></i> ${escHtml(cat.label)}</div>
      <div class="tier-row header"><span>Cantidad</span><span>Precio c/u ($)</span><span></span></div>
      <div id="pop-tiers-${key}">
      ${(cat.tiers || []).map((t, i) => `<div class="tier-row">
        <input type="number" class="price-input" step="1" min="1" data-key="pricing.pop.${key}.tiers.${i}.qty" value="${t.qty}">
        <input type="number" class="price-input" step="0.01" min="0" data-key="pricing.pop.${key}.tiers.${i}.ppu" value="${t.ppu}">
        <button class="btn-icon del" onclick="removeTierRow(this)" title="Eliminar"><i class="fas fa-minus"></i></button>
      </div>`).join('')}
      </div>
      <div style="padding:.5rem 1.25rem;">
        <button class="btn-add-feature" onclick="addTierRow('pricing.pop.${key}.tiers')"><i class="fas fa-plus"></i> Agregar nivel de precio</button>
      </div>
    </div>`).join('');
  }

  // ── ETIQUETAS ──
  const etqCont = document.getElementById('pp-etiquetas');
  if (etqCont && p.etiquetas) {
    etqCont.innerHTML = Object.entries(p.etiquetas).map(([key, cat]) => `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-tags"></i> ${escHtml(cat.label)}</div>
      <div class="tier-row header"><span>Cantidad</span><span>Precio c/u ($)</span><span></span></div>
      <div id="etq-tiers-${key}">
      ${(cat.tiers || []).map((t, i) => `<div class="tier-row">
        <input type="number" class="price-input" step="1" min="1" data-key="pricing.etiquetas.${key}.tiers.${i}.qty" value="${t.qty}">
        <input type="number" class="price-input" step="0.001" min="0" data-key="pricing.etiquetas.${key}.tiers.${i}.ppu" value="${t.ppu}">
        <button class="btn-icon del" onclick="removeTierRow(this)" title="Eliminar"><i class="fas fa-minus"></i></button>
      </div>`).join('')}
      </div>
      <div style="padding:.5rem 1.25rem;">
        <button class="btn-add-feature" onclick="addTierRow('pricing.etiquetas.${key}.tiers')"><i class="fas fa-plus"></i> Agregar nivel de precio</button>
      </div>
    </div>`).join('');
  }

  // ── PACKAGING ──
  const pkgCont = document.getElementById('pp-packaging');
  if (pkgCont && p.packaging) {
    pkgCont.innerHTML = Object.entries(p.packaging).map(([key, cat]) => `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-box"></i> ${escHtml(cat.label)}</div>
      <div class="tier-row header"><span>Cantidad</span><span>Precio c/u ($)</span><span></span></div>
      <div id="pkg-tiers-${key}">
      ${(cat.tiers || []).map((t, i) => `<div class="tier-row">
        <input type="number" class="price-input" step="1" min="1" data-key="pricing.packaging.${key}.tiers.${i}.qty" value="${t.qty}">
        <input type="number" class="price-input" step="0.01" min="0" data-key="pricing.packaging.${key}.tiers.${i}.ppu" value="${t.ppu}">
        <button class="btn-icon del" onclick="removeTierRow(this)" title="Eliminar"><i class="fas fa-minus"></i></button>
      </div>`).join('')}
      </div>
      <div style="padding:.5rem 1.25rem;">
        <button class="btn-add-feature" onclick="addTierRow('pricing.packaging.${key}.tiers')"><i class="fas fa-plus"></i> Agregar nivel de precio</button>
      </div>
    </div>`).join('');
  }

  // ── DISEÑO ──
  const disCont = document.getElementById('pp-diseno');
  if (disCont && p.diseno) {
    disCont.innerHTML = `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-palette"></i> Servicios de diseño gráfico</div>
      <div style="display:grid;grid-template-columns:1fr 120px 160px;gap:.75rem;padding:.5rem 1.25rem;background:var(--bg);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)"><span>Servicio</span><span>Precio ($)</span><span>Tiempo entrega</span></div>
      ${p.diseno.map((t, i) => `<div style="display:grid;grid-template-columns:1fr 120px 160px;gap:.75rem;padding:.625rem 1.25rem;border-bottom:1px solid var(--border);align-items:center;">
        <div><div class="pricing-label">${escHtml(t.label)}</div><div class="pricing-sub">${escHtml(t.desc || '')}</div></div>
        <input type="number" class="price-input" step="1" min="0" data-key="pricing.diseno.${i}.price" value="${t.price}">
        <input type="text" class="price-input" placeholder="Ej: 3-5 días" data-key="pricing.diseno.${i}.delivery" value="${escHtml(t.delivery || '')}">
      </div>`).join('')}
    </div>`;
  }

  // ── TIEMPOS DE ENTREGA ──
  const d = pricingData.delivery || {};
  const delivCont = document.getElementById('pp-tiempos');
  if (delivCont) {
    delivCont.innerHTML = `<div class="pricing-card">
      <div class="pricing-card-header"><i class="fas fa-clock"></i> Tiempos de entrega por categoría</div>
      <div style="padding:.75rem 1.25rem;display:grid;gap:.625rem;">
        ${[
          ['volantes','Volantes / Flyers'],
          ['tarjetas','Tarjetas de presentación'],
          ['tazas','Tazas personalizadas'],
          ['etiquetas','Etiquetas'],
          ['packaging','Packaging'],
        ].map(([key, label]) => `<div style="display:grid;grid-template-columns:1fr 200px;gap:.75rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--border);">
          <div class="pricing-label">${label}</div>
          <input type="text" class="price-input" placeholder="Ej: 3-5 días hábiles" data-key="delivery.${key}" value="${escHtml(d[key] || '')}">
        </div>`).join('')}
        <div style="margin-top:.5rem;font-size:.8rem;color:var(--muted)"><i class="fas fa-info-circle"></i> Gran formato y material POP tienen tiempos por subtipo — edítalos directamente en los JSON si es necesario.</div>
      </div>
    </div>`;
  }
}

function setNestedPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = isNaN(keys[i]) ? keys[i] : parseInt(keys[i]);
    if (cur[k] == null) cur[k] = {};
    cur = cur[k];
  }
  const lastKey = keys[keys.length - 1];
  const k = isNaN(lastKey) ? lastKey : parseInt(lastKey);
  const parsed = parseFloat(value);
  cur[k] = isNaN(parsed) ? value : parsed;
}

async function savePricing() {
  if (!pricingData) { toast('Carga primero la sección Cotizador', 'error'); return; }
  const btn = document.getElementById('btn-save-pricing');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  setPricingStatus('loading', 'Guardando precios', 'Actualizando el cotizador público.');

  const updated = JSON.parse(JSON.stringify(pricingData));
  document.querySelectorAll('#section-pricing [data-key]').forEach(input => {
    setNestedPath(updated, input.dataset.key, input.value);
  });

  try {
    const r = await fetch(API + '/api/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(updated)
    });
    if (!r.ok) throw new Error();
    pricingData = updated;
    renderPricingOverview();
    setPricingDirty(false);
    toast('Precios guardados ✓ Los cambios ya son visibles en el sitio', 'success');
  } catch {
    setPricingDirty(pricingDirty);
    toast('Error guardando precios en el servidor', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Guardar precios';
}

function addTierRow(basePath) {
  const allInputs = document.querySelectorAll(`[data-key^="${basePath}."]`);
  let maxIdx = -1;
  allInputs.forEach(el => {
    const m = el.dataset.key.match(new RegExp(basePath.replace(/\./g, '\\.') + '\\.(\\d+)\\.'));
    if (m) maxIdx = Math.max(maxIdx, parseInt(m[1]));
  });
  const newIdx = maxIdx + 1;

  const existing = document.querySelector(`[data-key="${basePath}.0.qty"], [data-key="${basePath}.0.ppu"]`);
  if (!existing) return;
  const container = existing.closest('div[id]') || existing.parentElement.parentElement;

  const row = document.createElement('div');
  row.className = 'tier-row';
  row.innerHTML = `
    <input type="number" class="price-input" step="1" min="1" data-key="${basePath}.${newIdx}.qty" placeholder="Cantidad" value="1000">
    <input type="number" class="price-input" step="0.01" min="0" data-key="${basePath}.${newIdx}.ppu" placeholder="Precio" value="0.00">
    <button class="btn-icon del" onclick="removeTierRow(this)" title="Eliminar"><i class="fas fa-minus"></i></button>
  `;
  container.appendChild(row);
  setPricingDirty(true);
}

function removeTierRow(btn) {
  const row = btn.closest('.tier-row');
  if (row) {
    row.remove();
    setPricingDirty(true);
  }
}

// ════════════════════════════════════════════
//  VIDEOS
// ════════════════════════════════════════════
let videosData = [];
let editingVideoId = null;
let _currentVideoType = 'youtube';
let _existingLocalUrl = '';

async function loadVideos() {
  try {
    const r = await fetch(API + '/api/settings', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const s = await r.json();
    videosData = s.videos || [];
    renderVideosAdmin();
  } catch {
    toast('Error cargando videos', 'error');
  }
}

function renderVideosAdmin() {
  const container = document.getElementById('videos-admin-list');
  if (!container) return;
  if (!videosData.length) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--muted);">
      <i class="fas fa-video" style="font-size:2rem;display:block;margin-bottom:1rem;opacity:.3;"></i>
      No hay videos. Haz clic en <strong>Agregar video</strong> para empezar.
    </div>`;
    return;
  }
  container.innerHTML = videosData.map(v => {
    const isLocal  = v.type === 'local';
    const hasYtId  = !isLocal && v.youtubeId && !v.youtubeId.startsWith('REEMPLAZA');
    const thumbSrc = hasYtId ? `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg` : '';
    const thumbEl  = isLocal
      ? `<div class="video-thumb-placeholder" style="background:#1a1a2e;"><i class="fas fa-film" style="color:#6366f1;"></i></div>`
      : (hasYtId ? `<img class="video-thumb-preview" src="${thumbSrc}" alt="thumb">` : `<div class="video-thumb-placeholder"><i class="fas fa-play-circle"></i></div>`);
    const metaText = isLocal
      ? `<span style="color:#6366f1;font-size:.75rem;"><i class="fas fa-hdd"></i> Local</span> · ${escHtml(v.url?.split('/').pop() || '—')}`
      : `<span style="color:#ff0000;font-size:.75rem;"><i class="fab fa-youtube"></i> YouTube</span> · ${escHtml(v.youtubeId || '—')}`;
    return `<div class="video-admin-card ${v.active ? '' : 'video-inactive'}">
      ${thumbEl}
      <div class="video-admin-info">
        <div class="video-admin-title">${escHtml(v.title || '(Sin título)')}</div>
        <div class="video-admin-meta">${metaText}${v.tag ? ` &nbsp;·&nbsp; ${escHtml(v.tag)}` : ''}</div>
      </div>
      <span class="badge ${v.active ? 'active' : 'inactive'}">${v.active ? 'Visible' : 'Oculto'}</span>
      <div class="video-admin-actions">
        <button class="btn-icon" onclick="moveVideoUp(${v.id})" title="Subir" style="color:var(--muted)"><i class="fas fa-chevron-up"></i></button>
        <button class="btn-icon" onclick="moveVideoDown(${v.id})" title="Bajar" style="color:var(--muted)"><i class="fas fa-chevron-down"></i></button>
        <button class="btn-icon edit" onclick="editVideo(${v.id})" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="btn-icon del" onclick="deleteVideo(${v.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function setVideoType(type) {
  _currentVideoType = type;
  const ytBtn    = document.getElementById('vtype-youtube');
  const localBtn = document.getElementById('vtype-local');
  const ytSec    = document.getElementById('vf-youtube-section');
  const localSec = document.getElementById('vf-local-section');

  if (type === 'local') {
    ytBtn.style.border    = '2px solid var(--border)';
    ytBtn.style.background = 'transparent';
    ytBtn.style.color      = 'var(--muted)';
    localBtn.style.border    = '2px solid var(--blue)';
    localBtn.style.background = 'var(--blue-light)';
    localBtn.style.color      = 'var(--blue)';
    ytSec.style.display    = 'none';
    localSec.style.display = 'block';
  } else {
    ytBtn.style.border    = '2px solid var(--blue)';
    ytBtn.style.background = 'var(--blue-light)';
    ytBtn.style.color      = 'var(--blue)';
    localBtn.style.border    = '2px solid var(--border)';
    localBtn.style.background = 'transparent';
    localBtn.style.color      = 'var(--muted)';
    ytSec.style.display    = 'block';
    localSec.style.display = 'none';
  }
}

function previewLocalVideo() {
  const file = document.getElementById('vf-video-file').files[0];
  const preview = document.getElementById('vf-local-preview');
  const videoEl = document.getElementById('vf-local-video-el');
  if (!file) { preview.style.display = 'none'; return; }
  const url = URL.createObjectURL(file);
  videoEl.src = url;
  preview.style.display = 'block';
}

function openVideoModal(id) {
  editingVideoId = id || null;
  _existingLocalUrl = '';
  const modal = document.getElementById('video-modal-overlay');
  document.getElementById('video-modal-title').textContent = id ? 'Editar video' : 'Agregar video';

  document.getElementById('vf-title').value  = '';
  document.getElementById('vf-desc').value   = '';
  document.getElementById('vf-tag').value    = '';
  document.getElementById('vf-icon').value   = 'fa-video';
  document.getElementById('vf-active').value = 'true';
  document.getElementById('vf-video-file').value = '';
  document.getElementById('vf-local-preview').style.display  = 'none';
  document.getElementById('vf-local-existing').style.display = 'none';
  document.getElementById('vf-upload-progress').style.display = 'none';
  document.getElementById('vf-yt-url').value = '';

  if (id) {
    const v = videosData.find(x => x.id === id);
    if (!v) return;
    document.getElementById('vf-title').value  = v.title || '';
    document.getElementById('vf-desc').value   = v.description || '';
    document.getElementById('vf-tag').value    = v.tag || '';
    document.getElementById('vf-icon').value   = v.tagIcon || 'fa-video';
    document.getElementById('vf-active').value = String(v.active !== false);

    if (v.type === 'local') {
      setVideoType('local');
      _existingLocalUrl = v.url || '';
      if (_existingLocalUrl) {
        const existing = document.getElementById('vf-local-existing');
        existing.textContent = 'Archivo actual: ' + _existingLocalUrl.split('/').pop();
        existing.style.display = 'block';
      }
    } else {
      setVideoType('youtube');
      document.getElementById('vf-yt-url').value = v.youtubeId || '';
      previewYtThumb();
    }
  } else {
    setVideoType('youtube');
    previewYtThumb();
  }

  modal.classList.add('open');
}

function editVideo(id) { openVideoModal(id); }

function closeVideoModal() {
  document.getElementById('video-modal-overlay').classList.remove('open');
  editingVideoId = null;
}

function handleVideoOverlayClick(e) {
  if (e.target === document.getElementById('video-modal-overlay')) closeVideoModal();
}

function extractYoutubeId(input) {
  input = (input || '').trim();
  let m = input.match(/youtu\.be\/([a-zA-Z0-9_-]{8,15})/);
  if (m) return m[1];
  m = input.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{8,15})/);
  if (m) return m[1];
  m = input.match(/[?&]v=([a-zA-Z0-9_-]{8,15})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{8,15}$/.test(input)) return input;
  return null;
}

function previewYtThumb() {
  const raw = document.getElementById('vf-yt-url').value;
  const ytId = extractYoutubeId(raw);
  const preview = document.getElementById('yt-preview');
  const img = document.getElementById('yt-thumb-img');
  const detected = document.getElementById('yt-id-detected');
  const idVal = document.getElementById('yt-id-val');
  if (ytId) {
    img.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    preview.style.display = 'block';
    detected.style.display = 'block';
    idVal.textContent = ytId;
  } else {
    preview.style.display = 'none';
    detected.style.display = 'none';
  }
}

async function saveVideo() {
  const title = document.getElementById('vf-title').value.trim();
  if (!title) { toast('Ingresa el título del video', 'error'); return; }

  let videoObj = {
    id:      editingVideoId || Date.now(),
    title,
    description: document.getElementById('vf-desc').value.trim(),
    tag:         document.getElementById('vf-tag').value.trim(),
    tagIcon:     document.getElementById('vf-icon').value,
    active:      document.getElementById('vf-active').value === 'true',
  };

  if (_currentVideoType === 'local') {
    const file = document.getElementById('vf-video-file').files[0];
    if (!file && !_existingLocalUrl) {
      toast('Selecciona un archivo de video', 'error'); return;
    }
    if (file) {
      const uploadedUrl = await uploadVideoFile(file);
      if (!uploadedUrl) return;
      videoObj.type = 'local';
      videoObj.url  = uploadedUrl;
    } else {
      videoObj.type = 'local';
      videoObj.url  = _existingLocalUrl;
    }
  } else {
    const rawUrl = document.getElementById('vf-yt-url').value.trim();
    const ytId   = extractYoutubeId(rawUrl);
    if (!ytId) { toast('URL de YouTube inválida. Pega la URL completa del video.', 'error'); return; }
    videoObj.type      = 'youtube';
    videoObj.youtubeId = ytId;
  }

  if (editingVideoId) {
    const idx = videosData.findIndex(v => v.id === editingVideoId);
    if (idx !== -1) videosData[idx] = videoObj;
  } else {
    videosData.push(videoObj);
  }

  await persistSettings();
  closeVideoModal();
  renderVideosAdmin();
  toast(editingVideoId ? 'Video actualizado ✓' : 'Video agregado ✓', 'success');
}

function uploadVideoFile(file) {
  return new Promise((resolve) => {
    const progressWrap = document.getElementById('vf-upload-progress');
    const progressBar  = document.getElementById('vf-progress-bar');
    progressWrap.style.display = 'block';
    progressBar.style.width    = '0%';

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API + '/api/upload/video');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        progressBar.style.width = Math.round((e.loaded / e.total) * 100) + '%';
      }
    };

    xhr.onload = () => {
      progressWrap.style.display = 'none';
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url || null);
        } catch {
          toast('Error procesando respuesta del servidor', 'error');
          resolve(null);
        }
      } else {
        toast('Error al subir el video (' + xhr.status + ')', 'error');
        resolve(null);
      }
    };

    xhr.onerror = () => {
      progressWrap.style.display = 'none';
      toast('Error de conexión al subir el video', 'error');
      resolve(null);
    };

    xhr.send(formData);
  });
}

async function deleteVideo(id) {
  if (!confirm('¿Eliminar este video del sitio web?')) return;
  const v = videosData.find(x => x.id === id);
  videosData = videosData.filter(x => x.id !== id);
  await persistSettings();
  if (v && v.type === 'local' && v.url) {
    const filename = v.url.split('/').pop();
    fetch(API + '/api/upload/video/' + encodeURIComponent(filename), { method: 'DELETE' })
      .catch(() => {});
  }
  renderVideosAdmin();
  toast('Video eliminado', 'success');
}

async function moveVideoUp(id) {
  const idx = videosData.findIndex(v => v.id === id);
  if (idx <= 0) return;
  [videosData[idx - 1], videosData[idx]] = [videosData[idx], videosData[idx - 1]];
  await persistSettings();
  renderVideosAdmin();
}

async function moveVideoDown(id) {
  const idx = videosData.findIndex(v => v.id === id);
  if (idx < 0 || idx >= videosData.length - 1) return;
  [videosData[idx], videosData[idx + 1]] = [videosData[idx + 1], videosData[idx]];
  await persistSettings();
  renderVideosAdmin();
}

// ── REDES SOCIALES ──
let socialData = {};

async function loadSocialMedia() {
  try {
    const r = await fetch(API + '/api/settings', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const s = await r.json();
    socialData = s.socialMedia || {};
    populateSocialFields();
  } catch {
    toast('Error cargando redes sociales', 'error');
  }
}

function populateSocialFields() {
  const fields = ['youtube', 'instagram', 'tiktok', 'facebook', 'whatsapp', 'twitter', 'linkedin'];
  fields.forEach(key => {
    const el = document.getElementById('social-' + key);
    if (el) el.value = socialData[key] || '';
  });
}

async function saveSocialMedia() {
  const fields = ['youtube', 'instagram', 'tiktok', 'facebook', 'whatsapp', 'twitter', 'linkedin'];
  fields.forEach(key => {
    const el = document.getElementById('social-' + key);
    if (el) socialData[key] = el.value.trim();
  });
  await persistSettings();
  toast('Redes sociales guardadas ✓ Los cambios ya son visibles en el sitio', 'success');
}

async function persistSettings() {
  try {
    const currentSettings = await (await fetch(API + '/api/settings', { cache: 'no-store' })).json();
    const updated = { ...currentSettings, videos: videosData, socialMedia: socialData };
    const r = await fetch(API + '/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(updated),
    });
    if (!r.ok) throw new Error();
  } catch {
    toast('Error guardando en el servidor', 'error');
  }
}

// ── Reset de contraseña via token ─────────────
(async function checkResetToken() {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('reset_token');
  if (!resetToken) return;
  try {
    const r = await fetch(`${API}/api/auth/reset-token?token=${encodeURIComponent(resetToken)}`);
    const d = await r.json();
    if (d.valid) {
      document.getElementById('login-form').style.display  = 'none';
      document.getElementById('reset-form').style.display  = 'block';
    } else {
      const err = document.getElementById('login-error');
      err.textContent    = 'El enlace de recuperación expiró o ya fue usado. Solicita uno nuevo.';
      err.style.display  = 'block';
    }
  } catch {}
})();

async function doResetPassword() {
  const params     = new URLSearchParams(window.location.search);
  const resetToken = params.get('reset_token');
  const newPass    = document.getElementById('reset-new').value;
  const confirm    = document.getElementById('reset-confirm').value;
  const errEl      = document.getElementById('reset-error');
  const okEl       = document.getElementById('reset-success');
  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  if (!newPass || !confirm) { errEl.textContent = 'Completa ambos campos.'; errEl.style.display = 'block'; return; }
  if (newPass !== confirm)  { errEl.textContent = 'Las contraseñas no coinciden.'; errEl.style.display = 'block'; return; }
  if (newPass.length < 8)  { errEl.textContent = 'Mínimo 8 caracteres.'; errEl.style.display = 'block'; return; }

  try {
    const r = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: newPass }),
    });
    const d = await r.json();
    if (d.success) {
      okEl.textContent   = '¡Contraseña actualizada! Redirigiendo al login...';
      okEl.style.display = 'block';
      setTimeout(() => { window.location.href = '/admin'; }, 2000);
    } else {
      errEl.textContent   = d.error || 'Error al guardar la contraseña.';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent   = 'Error de conexión.';
    errEl.style.display = 'block';
  }
}

// ── Utilidades de login ───────────────────────
function showLoginCard(id) {
  ['login-form','forgot-form','totp-form','reset-form'].forEach(c => {
    const el = document.getElementById(c);
    if (el) el.style.display = c === id ? 'block' : 'none';
  });

  if (id === 'forgot-form') {
    const email = cleanEmail(document.getElementById('login-email')?.value || sessionStorage.getItem('adminEmail'));
    const emailEl = document.getElementById('forgot-email');
    const sentEl = document.getElementById('forgot-sent');
    const actionsEl = document.getElementById('forgot-actions');
    const descEl = document.getElementById('forgot-desc');
    const errEl = document.getElementById('forgot-error');
    const btn = document.getElementById('btn-send-link');
    if (emailEl && email) emailEl.value = email;
    if (sentEl) sentEl.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'block';
    if (descEl) descEl.style.display = 'block';
    if (errEl) errEl.style.display = 'none';
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar enlace';
    }
  }
}

function togglePw(inputId, btn) {
  const el = document.getElementById(inputId);
  const showing = el.type === 'text';
  el.type = showing ? 'password' : 'text';
  btn.querySelector('i').className = showing ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function checkStrength(val, fillId, labelId) {
  const fill  = document.getElementById(fillId);
  const label = document.getElementById(labelId);
  if (!fill || !label) return;
  let score = 0;
  if (val.length >= 8)  score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { w:'0%',   bg:'var(--border)',  txt:'' },
    { w:'25%',  bg:'var(--red)',     txt:'Muy débil' },
    { w:'50%',  bg:'var(--orange)',  txt:'Débil' },
    { w:'65%',  bg:'var(--orange)',  txt:'Aceptable' },
    { w:'85%',  bg:'var(--blue)',    txt:'Buena' },
    { w:'100%', bg:'var(--green)',   txt:'Excelente' },
  ];
  const lvl = val.length === 0 ? levels[0] : levels[Math.min(score, 5)];
  fill.style.width      = lvl.w;
  fill.style.background = lvl.bg;
  label.textContent     = lvl.txt;
  label.style.color     = lvl.bg;
}

// ── Recuperar contraseña ──────────────────────
async function sendResetLink() {
  const btn      = document.getElementById('btn-send-link');
  const errEl    = document.getElementById('forgot-error');
  const sentEl   = document.getElementById('forgot-sent');
  const actionsEl = document.getElementById('forgot-actions');
  const descEl   = document.getElementById('forgot-desc');
  const email     = cleanEmail(document.getElementById('forgot-email').value);
  errEl.style.display = 'none';

  if (!isValidEmail(email)) {
    errEl.textContent = 'Ingresa un correo válido.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  try {
    const r = await fetch(API + '/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfH() },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    if (d.success) {
      actionsEl.style.display = 'none';
      descEl.style.display    = 'none';
      sentEl.style.display    = 'block';
    } else {
      errEl.textContent   = d.error || 'Error al enviar el enlace.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar enlace';
    }
  } catch {
    errEl.textContent   = 'Error de conexión. Intenta de nuevo.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar enlace';
  }
}

async function loadAdminProfile() {
  if (!token) return;
  try {
    const r = await fetch(API + '/api/auth/profile', {
      headers: { 'x-admin-token': token },
      cache: 'no-store',
    });
    if (!r.ok) return;
    const d = await r.json();
    if (d.email) {
      const email = cleanEmail(d.email);
      sessionStorage.setItem('adminEmail', email);
      const secEmail = document.getElementById('sec-email');
      const loginEmail = document.getElementById('login-email');
      if (secEmail) secEmail.value = email;
      if (loginEmail) loginEmail.value = email;
    }
  } catch {}
}

async function changePassword() {
  const email    = cleanEmail(document.getElementById('sec-email').value);
  const current  = document.getElementById('sec-current').value;
  const newPass  = document.getElementById('sec-new').value;
  const confirm  = document.getElementById('sec-confirm').value;
  const msgEl    = document.getElementById('sec-msg');

  const show = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'var(--green-light)' : 'var(--red-light)';
    msgEl.style.color      = ok ? 'var(--green)'       : 'var(--red)';
  };

  if (!isValidEmail(email))             return show('Ingresa un correo de administrador válido.', false);
  if (!current)                         return show('Ingresa tu contraseña actual para confirmar.', false);
  if (newPass || confirm) {
    if (!newPass || !confirm)           return show('Completa ambos campos de la nueva contraseña.', false);
    if (newPass !== confirm)            return show('Las contraseñas no coinciden.', false);
    if (newPass.length < 8)             return show('Mínimo 8 caracteres.', false);
  }

  try {
    const payload = { email, currentPassword: current };
    if (newPass) payload.newPassword = newPass;
    const r = await fetch(API + '/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, ...csrfH() },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success) {
      token = d.token;
      sessionStorage.setItem('adminToken', d.token);
      if (d.email) {
        document.getElementById('sec-email').value = d.email;
        sessionStorage.setItem('adminEmail', d.email);
      }
      show(newPass ? '¡Acceso actualizado correctamente!' : '¡Correo actualizado correctamente!', true);
      document.getElementById('sec-current').value = '';
      document.getElementById('sec-new').value     = '';
      document.getElementById('sec-confirm').value = '';
    } else {
      show(d.error || 'Error al cambiar la contraseña.', false);
    }
  } catch {
    show('Error de conexión.', false);
  }
}

// ── 2FA / TOTP ────────────────────────────────
async function loadTwoFaStatus() {
  try {
    const r = await fetch(API + '/api/auth/2fa/status', { headers: { 'x-admin-token': token } });
    const d = await r.json();
    renderTwoFaState(d.enabled);
  } catch {
    document.getElementById('twofa-status-text').textContent = 'Error al obtener estado';
  }
}

function renderTwoFaState(enabled) {
  document.getElementById('twofa-status-text').textContent = enabled ? 'Activo — tu cuenta está protegida' : 'Desactivado — te recomendamos activarlo';
  document.getElementById('twofa-status-text').style.color = enabled ? 'var(--green)' : 'var(--muted)';
  document.getElementById('twofa-setup-section').style.display   = enabled ? 'none' : 'flex';
  document.getElementById('twofa-qr-section').style.display      = 'none';
  document.getElementById('twofa-enabled-section').style.display = enabled ? 'flex' : 'none';
}

async function initTwoFaSetup() {
  try {
    const r = await fetch(API + '/api/auth/2fa/setup', { headers: { 'x-admin-token': token } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    document.getElementById('twofa-qr-img').src = d.qrCode;
    document.getElementById('twofa-secret-text').textContent = 'Clave manual: ' + d.secret;
    document.getElementById('twofa-setup-section').style.display = 'none';
    document.getElementById('twofa-qr-section').style.display    = 'flex';
    document.getElementById('twofa-verify-code').value           = '';
    document.getElementById('twofa-verify-msg').style.display    = 'none';
    setTimeout(() => document.getElementById('twofa-verify-code').focus(), 100);
  } catch (e) {
    alert('Error al generar el QR: ' + e.message);
  }
}

function cancelTwoFaSetup() {
  document.getElementById('twofa-qr-section').style.display    = 'none';
  document.getElementById('twofa-setup-section').style.display = 'flex';
}

async function confirmTwoFa() {
  const code   = document.getElementById('twofa-verify-code').value.replace(/\s/g, '');
  const msgEl  = document.getElementById('twofa-verify-msg');
  const showMsg = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'var(--green-light)' : 'var(--red-light)';
    msgEl.style.color      = ok ? 'var(--green)'       : 'var(--red)';
  };
  try {
    const r = await fetch(API + '/api/auth/2fa/enable', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, ...csrfH() },
      body:    JSON.stringify({ code }),
    });
    const d = await r.json();
    if (!r.ok) return showMsg(d.error || 'Código incorrecto', false);
    renderTwoFaState(true);
  } catch {
    showMsg('Error de conexión', false);
  }
}

async function disableTwoFa() {
  const password = document.getElementById('twofa-disable-pass').value;
  const msgEl    = document.getElementById('twofa-disable-msg');
  const showMsg  = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'var(--green-light)' : 'var(--red-light)';
    msgEl.style.color      = ok ? 'var(--green)'       : 'var(--red)';
  };
  if (!password) return showMsg('Ingresa tu contraseña actual para confirmar', false);
  try {
    const r = await fetch(API + '/api/auth/2fa/disable', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token, ...csrfH() },
      body:    JSON.stringify({ password }),
    });
    const d = await r.json();
    if (!r.ok) return showMsg(d.error || 'Error', false);
    document.getElementById('twofa-disable-pass').value = '';
    renderTwoFaState(false);
  } catch {
    showMsg('Error de conexión', false);
  }
}

// ── Exportación de funciones globales para uso inline en HTML ─────────────────────
// Al extraer el JS a un módulo/archivo diferido, necesitamos exponer las funciones 
// referenciadas por los onclick inline en el HTML para evitar errores de ámbito.
window.doLogin = doLogin;
window.doTotpVerify = doTotpVerify;
window.logout = logout;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.markRead = markRead;
window.deleteContact = deleteContact;
window.addPortfolioItem = addPortfolioItem;
window.deletePortfolioItem = deletePortfolioItem;
window.uploadPortfolioImage = uploadPortfolioImage;
window.approveReview = approveReview;
window.deleteReview = deleteReview;
window.openModal = openModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.handleOverlayClick = handleOverlayClick;
window.switchImgTab = switchImgTab;
window.onFileSelected = onFileSelected;
window.clearDropZone = clearDropZone;
window.clearImage = clearImage;
window.selectFromGallery = selectFromGallery;
window.uploadFromGallery = uploadFromGallery;
window.deleteImage = deleteImage;
window.updateEmojiPreview = updateEmojiPreview;
window.addFeatureRow = addFeatureRow;
window.saveProduct = saveProduct;
window.askDelete = askDelete;
window.closeConfirm = closeConfirm;
window.confirmDelete = confirmDelete;
window.switchPricingTab = switchPricingTab;
window.savePricing = savePricing;
window.addTierRow = addTierRow;
window.removeTierRow = removeTierRow;
window.editVideo = editVideo;
window.deleteVideo = deleteVideo;
window.moveVideoUp = moveVideoUp;
window.moveVideoDown = moveVideoDown;
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;
window.handleVideoOverlayClick = handleVideoOverlayClick;
window.setVideoType = setVideoType;
window.previewLocalVideo = previewLocalVideo;
window.previewYtThumb = previewYtThumb;
window.saveVideo = saveVideo;
window.saveSocialMedia = saveSocialMedia;
window.doResetPassword = doResetPassword;
window.showLoginCard = showLoginCard;
window.togglePw = togglePw;
window.checkStrength = checkStrength;
window.sendResetLink = sendResetLink;
window.changePassword = changePassword;
window.initTwoFaSetup = initTwoFaSetup;
window.cancelTwoFaSetup = cancelTwoFaSetup;
window.confirmTwoFa = confirmTwoFa;
window.disableTwoFa = disableTwoFa;
