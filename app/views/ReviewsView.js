import BaseView from './BaseView.js';
import EventBus  from '../core/EventBus.js';

const AVATAR_COLORS = ['#0071e3','#34c759','#ff9500','#5856d6','#ff3b30','#30b0c7','#E30613'];

/**
 * ReviewsView — Sección de reseñas de clientes
 * Emite:   reviews:submit { name, rating, comment }
 * Escucha: reviews:success { msg }
 *          reviews:error   { msg }
 *          reviews:loaded  [array]
 */
export default class ReviewsView extends BaseView {
  constructor() {
    super('#testimonios');
    this._form      = document.getElementById('reviewForm');
    this._submitBtn = document.getElementById('reviewSubmitBtn');
    this._feedback  = document.getElementById('reviewFeedback');
    this._grid      = document.getElementById('reviews-grid');
    this._empty     = document.getElementById('reviews-empty');
    this._ratingIn  = document.getElementById('reviewRating');
  }

  bind() {
    this._bindStars();
    this._bindForm();
    EventBus.on('reviews:success', ({ msg }) => this._onSuccess(msg));
    EventBus.on('reviews:error',   ({ msg }) => this._onError(msg));
    EventBus.on('reviews:loaded',  list      => this._renderList(list));
  }

  // ── Estrellas interactivas ───────────────────────────────────────────────

  _bindStars() {
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach(btn => {
      btn.addEventListener('mouseenter', () => this._highlight(+btn.dataset.v));
      btn.addEventListener('mouseleave', () => this._highlight(+(this._ratingIn?.value ?? 0)));
      btn.addEventListener('click', () => {
        if (this._ratingIn) this._ratingIn.value = btn.dataset.v;
        this._highlight(+btn.dataset.v);
      });
    });
  }

  _highlight(value) {
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.classList.toggle('active', +btn.dataset.v <= value);
    });
  }

  // ── Formulario ───────────────────────────────────────────────────────────

  _bindForm() {
    this._form?.addEventListener('submit', e => {
      e.preventDefault();
      const name    = document.getElementById('reviewName')?.value.trim()    ?? '';
      const rating  = +(this._ratingIn?.value ?? 0);
      const comment = document.getElementById('reviewComment')?.value.trim() ?? '';

      if (!name || !comment) return this._showFeedback('Por favor completa nombre y comentario.', false);
      if (!rating)            return this._showFeedback('Selecciona una calificación con las estrellas.', false);

      EventBus.emit('reviews:submit', { name, rating, comment });
    });
  }

  setLoading(on) {
    if (!this._submitBtn) return;
    this._submitBtn.disabled = on;
    this._submitBtn.innerHTML = on
      ? '<i class="fas fa-spinner fa-spin"></i> Enviando...'
      : '<i class="fas fa-paper-plane"></i> Enviar reseña';
  }

  _onSuccess(msg) {
    this.setLoading(false);
    this._form?.reset();
    if (this._ratingIn) this._ratingIn.value = 0;
    this._highlight(0);
    this._showFeedback(msg, true);
    setTimeout(() => { if (this._feedback) this._feedback.hidden = true; }, 7000);
  }

  _onError(msg) {
    this.setLoading(false);
    this._showFeedback(msg, false);
    setTimeout(() => { if (this._feedback) this._feedback.hidden = true; }, 7000);
  }

  _showFeedback(msg, ok) {
    if (!this._feedback) return;
    this._feedback.textContent = msg;
    this._feedback.className = 'contact-feedback ' + (ok ? 'contact-feedback--success' : 'contact-feedback--error');
    this._feedback.hidden = false;
  }

  // ── Listado de reseñas aprobadas ─────────────────────────────────────────

  _renderList(reviews) {
    if (!this._grid) return;
    this._grid.querySelectorAll('.resena-card').forEach(c => c.remove());

    if (!reviews.length) {
      if (this._empty) this._empty.style.display = 'block';
      return;
    }
    if (this._empty) this._empty.style.display = 'none';

    reviews.forEach(r => {
      const stars    = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const initials = r.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
      const color    = AVATAR_COLORS[r.id % AVATAR_COLORS.length];
      const date     = new Date(r.date).toLocaleDateString('es-EC', { year:'numeric', month:'short', day:'numeric' });

      const card = document.createElement('div');
      card.className = 'resena-card';
      card.innerHTML = `
        <div class="resena-stars">${stars}</div>
        <p class="resena-texto">"${this.esc(r.comment)}"</p>
        <div class="resena-autor">
          <div class="autor-avatar" style="background:${color};">${this.esc(initials)}</div>
          <div>
            <strong>${this.esc(r.name)}</strong>
            <span>${date}</span>
          </div>
        </div>`;
      this._grid.appendChild(card);
    });
  }
}
