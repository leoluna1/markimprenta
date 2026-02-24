import EventBus     from '../core/EventBus.js';
import ProductModel from '../models/ProductModel.js';
import CatalogView  from '../views/CatalogView.js';
import ModalView    from '../views/ModalView.js';

/**
 * CatalogController
 * Coordina ProductModel ↔ CatalogView ↔ ModalView
 */
export default class CatalogController {
  constructor() {
    this._model = new ProductModel();
    this._view  = new CatalogView();
    this._modal = new ModalView();

    this._state = {
      filter:  'todos',
      page:    1,
      perPage: 12,
    };
  }

  init() {
    this._view.bind();
    this._modal.bind();

    // Cambio de filtro → resetear página y recargar
    EventBus.on('catalog:filter', ({ filter }) => {
      this._state.filter = filter;
      this._state.page   = 1;
      this._load();
    });

    // Cambio de página
    EventBus.on('catalog:page', ({ page }) => {
      this._state.page = page;
      this._load();
    });

    // Abrir modal de producto
    EventBus.on('catalog:open', ({ id }) => {
      const product = this._model.getById(id);
      if (product) EventBus.emit('modal:show', { product });
    });

    // Desde el modal → ir al cotizador
    EventBus.on('modal:quote', () => {
      EventBus.emit('nav:go', { id: 'cotizador' });
    });

    // Carga inicial
    this._load();
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _load() {
    const { filter, page, perPage } = this._state;
    const items  = this._model.getByCategory(filter);
    const result = this._model.paginate(items, page, perPage);
    this._view.renderGrid(result);
  }
}
