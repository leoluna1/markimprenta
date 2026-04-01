import BaseView from './BaseView.js';

/**
 * FaqView — Acordeón de preguntas frecuentes
 * Sin dependencias externas; solo manipula el DOM de la sección #faq.
 */
export default class FaqView extends BaseView {
  constructor() {
    super('#faq');
  }

  bind() {
    // Delegación de eventos en todos los botones .faq-trigger
    this.on('click', '.faq-trigger', (e, trigger) => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Opción: cerrar todos antes de abrir uno (comportamiento acordeón)
      // Comentar las 3 líneas siguientes si se prefiere que varios ítems
      // puedan estar abiertos al mismo tiempo.
      this.$$('.faq-trigger[aria-expanded="true"]').forEach(t => {
        if (t !== trigger) this._close(t);
      });

      isOpen ? this._close(trigger) : this._open(trigger);
    });

    // Abrir el primer ítem de cada columna por defecto (opcional)
    // Si no lo quieres, elimina estas líneas.
    this.$$('.faq-col').forEach(col => {
      const first = col.querySelector('.faq-trigger');
      if (first) this._open(first);
    });
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _open(trigger) {
    trigger.setAttribute('aria-expanded', 'true');
    const body = trigger.nextElementSibling;
    if (body) body.classList.add('open');
  }

  _close(trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    const body = trigger.nextElementSibling;
    if (body) body.classList.remove('open');
  }
}
