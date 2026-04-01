import EventBus     from '../core/EventBus.js';
import ProductModel from '../models/ProductModel.js';
import CatalogView  from '../views/CatalogView.js';
import ModalView    from '../views/ModalView.js';

/**
 * CatalogController
 * Coordina ProductModel ↔ CatalogView ↔ ModalView
 * ProductModel ahora es async (lee desde la API Node.js)
 */
export default class CatalogController {
  constructor() {
    this._model = new ProductModel();
    this._view  = new CatalogView();
    this._modal = new ModalView();

    this._state = {
      filter:   'todos',
      page:     1,
      perPage:  12,
      search:   '',
      priceMin: null,
      priceMax: null,
    };
  }

  async init() {
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

    // Búsqueda por texto
    EventBus.on('catalog:search', ({ query }) => {
      this._state.search = query;
      this._state.page   = 1;
      this._load();
    });

    // Filtro por precio
    EventBus.on('catalog:price', ({ min, max }) => {
      this._state.priceMin = min;
      this._state.priceMax = max;
      this._state.page     = 1;
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

    // Carga inicial desde la API
    this._view.showSkeleton();
    await this._model.load();
    this._load();
  }

  // ── Privados ────────────────────────────────────────────────────────────

  _load() {
    const { filter, page, perPage, search, priceMin, priceMax } = this._state;
    let items = this._model.getByCategory(filter);
    items = this._model.getBySearch(items, search);
    items = this._model.getByPriceRange(items, priceMin, priceMax);
    const total  = items.length;
    const result = this._model.paginate(items, page, perPage);
    this._view.renderGrid({ ...result, total });
  }
}
