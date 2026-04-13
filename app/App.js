/**
 * App.js — Bootstrap de la aplicación
 * Instancia y arranca todos los controladores y vistas
 */
import NavigationController from './controllers/NavigationController.js';
import CatalogController    from './controllers/CatalogController.js';
import QuoteController      from './controllers/QuoteController.js';
import ContactController    from './controllers/ContactController.js';
import HeroView             from './views/HeroView.js';
import FaqView              from './views/FaqView.js';
import SettingsController   from './controllers/SettingsController.js';
import ReviewsController    from './controllers/ReviewsController.js';
import PortfolioController  from './controllers/PortfolioController.js';

document.addEventListener('DOMContentLoaded', async () => {
  new NavigationController().init();
  new HeroView().init();
  new CatalogController().init();
  await new QuoteController().init();
  new ContactController().init();
  new FaqView().bind();
  new SettingsController().init();
  new ReviewsController().init();
  new PortfolioController().init();

  console.info('✨ Mark Publicidad — App iniciada');
});
