import EventBus    from '../core/EventBus.js';
import ReviewsView from '../views/ReviewsView.js';

/**
 * ReviewsController
 * Carga reseñas aprobadas y gestiona el envío de nuevas reseñas
 */
export default class ReviewsController {
  constructor() {
    this._view = new ReviewsView();
  }

  init() {
    this._view.bind();
    this._load();
    EventBus.on('reviews:submit', data => this._send(data));
  }

  // ── Privados ─────────────────────────────────────────────────────────────

  async _load() {
    try {
      const res  = await fetch('/api/reviews');
      const list = await res.json();
      EventBus.emit('reviews:loaded', Array.isArray(list) ? list : []);
    } catch {
      EventBus.emit('reviews:loaded', []);
    }
  }

  async _send(data) {
    this._view.setLoading(true);
    try {
      const res    = await fetch('/api/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok || !result.success) throw new Error(result.error || 'Error desconocido');

      EventBus.emit('reviews:success', { msg: result.message });
      await this._load(); // refrescar la lista
    } catch (err) {
      EventBus.emit('reviews:error', { msg: err.message });
    }
  }
}
