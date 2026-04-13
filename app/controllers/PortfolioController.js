import EventBus      from '../core/EventBus.js';
import PortfolioView from '../views/PortfolioView.js';

export default class PortfolioController {
  constructor() {
    this._view = new PortfolioView();
  }

  async init() {
    this._view.bind();
    try {
      const res   = await fetch('/api/portfolio');
      const items = await res.json();
      EventBus.emit('portfolio:loaded', Array.isArray(items) ? items : []);
    } catch {
      EventBus.emit('portfolio:loaded', []);
    }
  }
}
