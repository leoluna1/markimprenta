import BaseView from './BaseView.js';

/**
 * HeroView — Sección hero
 * Maneja: contador animado, partículas, parallax, loader, scroll indicator
 */
export default class HeroView extends BaseView {
  constructor() {
    super('#inicio');
  }

  init() {
    this._initCounters();
    this._initParticles();
    this._initParallax();
    this._initLoader();
    this._initScrollIndicator();
    this._initServiceCards();
  }

  // ── Contadores animados ─────────────────────────────────────────────────

  _initCounters() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (entry.target._counted) return; // flag booleano: evita condición frágil con textContent
        entry.target._counted = true;
        obs.unobserve(entry.target);
        this._animateCounter(entry.target);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number')
      .forEach(el => obs.observe(el));
  }

  _animateCounter(el) {
    const target = +el.dataset.count;
    const steps  = 60;
    const inc    = target / steps;
    let cur = 0, n = 0;

    const tick = () => {
      cur += inc; n++;
      el.textContent = Math.floor(cur) + '+';
      if (n < steps) requestAnimationFrame(tick);
      else el.textContent = target + '+';
    };
    tick();
  }

  // ── Partículas de fondo ─────────────────────────────────────────────────

  _initParticles() {
    const container = document.getElementById('particles-background');
    if (!container) return;

    // Inyectar keyframe solo una vez
    if (!document.getElementById('particle-kf')) {
      const style = document.createElement('style');
      style.id = 'particle-kf';
      style.textContent = `
        @keyframes pFloat {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: .3; }
          90%  { opacity: .3; }
          100% { transform: translateY(-100vh) translateX(15px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    for (let i = 0; i < 28; i++) {
      const el  = document.createElement('div');
      const sz  = Math.random() * 4 + 1;
      const op  = Math.random() * 0.10 + 0.03;
      const dur = Math.random() * 20 + 30;
      const del = Math.random() * 10;

      el.style.cssText = `
        position: absolute;
        width: ${sz}px; height: ${sz}px;
        background: radial-gradient(circle, rgba(0,113,227,${op}) 0%, transparent 70%);
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        bottom: -10%;
        animation: pFloat ${dur}s linear ${del}s infinite;
        pointer-events: none;
      `;
      container.appendChild(el);
    }
  }

  // ── Parallax en hero ────────────────────────────────────────────────────

  _initParallax() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrolled = window.pageYOffset;
        const vh       = window.innerHeight;
        const content  = document.querySelector('.hero-content');

        if (content && scrolled < vh) {
          content.style.opacity   = Math.max(1 - (scrolled / vh) * 0.65, 0);
          content.style.transform = `translateY(${scrolled * 0.22}px)`;
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // ── Ocultar loader ──────────────────────────────────────────────────────

  _initLoader() {
    const hide = () => {
      const loader = document.getElementById('pageLoader');
      if (!loader) return;
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 500);
    };

    if (document.readyState === 'complete') {
      // La página ya está cargada: ocultar de inmediato
      hide();
    } else {
      window.addEventListener('load', () => {
        // Reducimos el retraso para no bloquear la primera impresión
        setTimeout(hide, 300);
      }, { once: true });
    }
  }

  // ── Scroll indicator ────────────────────────────────────────────────────

  _initScrollIndicator() {
    const el = document.getElementById('scrollIndicator');
    if (!el) return;
    window.addEventListener('scroll', () => {
      el.style.opacity = window.pageYOffset > 250 ? '0' : '1';
    }, { passive: true });
  }

  // ── Animación de entrada en service cards ──────────────────────────────

  _initServiceCards() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.service-card').forEach((card, i) => {
      // Aplicar color de acento como variable CSS
      const accent = card.dataset.accent;
      if (accent) card.style.setProperty('--card-accent', accent);

      card.style.opacity    = '0';
      card.style.transform  = 'translateY(44px)';
      card.style.transition = `opacity .55s ease ${i * 0.1}s, transform .55s ease ${i * 0.1}s`;
      obs.observe(card);
    });
  }
}
