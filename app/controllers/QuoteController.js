import QuoteView from '../views/QuoteView.js';

/**
 * QuoteController
 * Inicializa el cotizador con pestañas y precios reales
 */
export default class QuoteController {
  constructor() {
    this._view = new QuoteView();
  }

  init() {
    this._view.init();
  }
}
