/**
 * BaseView — Clase base para todas las vistas
 * Provee helpers de DOM y binding de eventos
 */
export default class BaseView {
  /** @param {string|Element} selector */
  constructor(selector) {
    this.$el = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;
  }

  /** querySelector relativo al elemento raíz */
  $(sel) { return this.$el?.querySelector(sel) ?? null; }

  /** querySelectorAll relativo al elemento raíz */
  $$(sel) { return Array.from(this.$el?.querySelectorAll(sel) ?? []); }

  /**
   * Delegación de eventos sobre el elemento raíz.
   * @param {string} evt   Tipo de evento ('click', 'input', …)
   * @param {string} sel   Selector CSS del delegado
   * @param {Function} fn  Callback (event, matchedElement)
   */
  on(evt, sel, fn) {
    this.$el?.addEventListener(evt, e => {
      const target = e.target.closest(sel);
      if (target && this.$el.contains(target)) fn(e, target);
    });
    return this;
  }

  /** Escapa HTML para evitar XSS */
  esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }

  /** Limpia el contenido del elemento raíz */
  clear() {
    if (this.$el) this.$el.innerHTML = '';
  }
}
