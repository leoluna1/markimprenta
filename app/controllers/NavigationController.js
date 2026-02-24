import EventBus       from '../core/EventBus.js';
import NavigationView from '../views/NavigationView.js';

/**
 * NavigationController
 * Coordina la navegación suave entre secciones y el botón scroll-top.
 */
export default class NavigationController {
  constructor() {
    this._view = new NavigationView();
  }

  init() {
    this._view.bind();

    // Scroll suave al emitir nav:go
    EventBus.on('nav:go', ({ id }) => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this._view.setActive(id);
    });

    // Botón "volver arriba"
    const scrollTopBtn = document.getElementById('scrollTop');

    window.addEventListener('scroll', () => {
      scrollTopBtn?.classList.toggle('visible', window.pageYOffset > 500);
    }, { passive: true });

    scrollTopBtn?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}
