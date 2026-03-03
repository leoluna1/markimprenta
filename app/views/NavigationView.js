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
    // ── Modo oscuro ─────────────────────────────────────────────────────────────────
    this._initTheme();

    // Links del menú superior
    this.on('click', '.nav-link', (e, el) => {
      e.preventDefault();
      const id = el.getAttribute('href')?.slice(1);
      if (id) EventBus.emit('nav:go', { id });
    });

    // Bottom nav links (móvil)
    document.querySelectorAll('.bnav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const id = item.dataset.section;
        if (id) EventBus.emit('nav:go', { id });
      });
    });

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

  /** Actualiza el link activo en el menú (top nav + bottom nav) */
  setActive(sectionId) {
    // Top nav
    this.$('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + sectionId);
    });
    // Bottom nav
    document.querySelectorAll('.bnav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
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
      { threshold: 0.15, rootMargin: '-56px 0px 0px 0px' } // 56px = altura del nav fijo
    );
    document.querySelectorAll('section[id]').forEach(s => obs.observe(s));
  }

  _initTheme() {
    const html = document.documentElement;
    const btn  = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');
    if (!btn || !icon) return;

    // Cargar preferencia guardada o del sistema
    const saved       = localStorage.getItem('mp-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const startDark   = saved ? saved === 'dark' : prefersDark;

    this._applyTheme(startDark, html, icon);

    // Toggle al hacer clic
    btn.addEventListener('click', () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      this._applyTheme(!isDark, html, icon);
      localStorage.setItem('mp-theme', !isDark ? 'dark' : 'light');
    });
  }

  _applyTheme(dark, html, icon) {
    if (dark) {
      html.setAttribute('data-theme', 'dark');
      icon.className = 'fas fa-sun';
    } else {
      html.removeAttribute('data-theme');
      icon.className = 'fas fa-moon';
    }
  }
}
