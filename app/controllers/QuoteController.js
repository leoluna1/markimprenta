import EventBus  from '../core/EventBus.js';
import QuoteModel from '../models/QuoteModel.js';
import QuoteView  from '../views/QuoteView.js';

/**
 * QuoteController
 * Coordina QuoteModel ↔ QuoteView
 */
export default class QuoteController {
  constructor() {
    this._model = new QuoteModel();
    this._view  = new QuoteView();
  }

  init() {
    this._view.bind();

    EventBus.on('quote:submit', params => {
      try {
        const result = this._model.calculate(params);
        EventBus.emit('quote:result', result);
      } catch (err) {
        EventBus.emit('quote:error', { msg: err.message });
      }
    });
  }
}
