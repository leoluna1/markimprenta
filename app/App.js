/**
 * App.js — Bootstrap de la aplicación
 * Instancia y arranca todos los controladores y vistas
 */
import NavigationController from './controllers/NavigationController.js';
import CatalogController    from './controllers/CatalogController.js';
import QuoteController      from './controllers/QuoteController.js';
import ContactController    from './controllers/ContactController.js';
import HeroView             from './views/HeroView.js';
import SettingsController   from './controllers/SettingsController.js';

document.addEventListener('DOMContentLoaded', async () => {
  new NavigationController().init();
  new HeroView().init();
  new CatalogController().init();
  await new QuoteController().init();
  new ContactController().init();
  new SettingsController().init();

  console.info('✨ Mark Publicidad — App iniciada');
});
