import BaseView  from './BaseView.js';
import EventBus  from '../core/EventBus.js';

/**
 * NavigationView — Barra de navegación
 * Emite: nav:go { id }
 */
export default class NavigationView extends BaseView {
  constructor() {
    super('#mainNav');
    this._menuOpen = false;
  }

  bind() {
    // Links del menú
    this.on('click', '.nav-link', (e, el) => {
      e.preventDefault();
      const id = el.getAttribute('href')?.slice(1);
      if (id) {
        EventBus.emit('nav:go', { id });
        this._closeMobile();
      }
    });

    // Botón hamburguesa
    document.getElementById('mobileToggle')
      ?.addEventListener('click', () => this._toggleMobile());

    // Logo → ir a inicio
    document.getElementById('logoHome')
      ?.addEventListener('click', () => EventBus.emit('nav:go', { id: 'inicio' }));

    // Botones con data-nav en cualquier parte del documento
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-nav]');
      if (btn) EventBus.emit('nav:go', { id: btn.dataset.nav });
    });

    // Scroll → clase .scrolled en el nav
    window.addEventListener('scroll', () => {
      this.$el?.classList.toggle('scrolled', window.pageYOffset > 80);
    }, { passive: true });

    // Observer para marcar link activo según sección visible
    this._observeSections();
  }

  /** Actualiza el link activo en el menú */
  setActive(sectionId) {
    this.$$('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + sectionId);
    });
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _toggleMobile() {
    this._menuOpen = !this._menuOpen;
    this._applyMobile(this._menuOpen);
  }

  _closeMobile() {
    this._menuOpen = false;
    this._applyMobile(false);
  }

  _applyMobile(open) {
    document.getElementById('navMenu')?.classList.toggle('active', open);

    const toggle = document.getElementById('mobileToggle');
    if (!toggle) return;
    toggle.classList.toggle('active', open);

    const [s1, s2, s3] = toggle.querySelectorAll('span');
    if (open) {
      s1 && (s1.style.transform = 'rotate(45deg) translateY(7px)');
      s2 && (s2.style.opacity   = '0');
      s3 && (s3.style.transform = 'rotate(-45deg) translateY(-7px)');
    } else {
      [s1, s2, s3].forEach(s => s && (s.style.transform = s.style.opacity = ''));
    }
  }

  _observeSections() {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) this.setActive(e.target.id); }),
      { threshold: 0.4 }
    );
    document.querySelectorAll('section[id]').forEach(s => obs.observe(s));
  }
}
