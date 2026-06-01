const { chromium } = require('/Users/leito/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);
  // Screenshot del login
  await page.screenshot({ path: 'ss-admin-login.png' });
  // Simular reset token en la URL
  await page.goto('http://localhost:3000/admin?reset_token=faketoken123', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'ss-admin-reset.png' });
  await browser.close();
  console.log('listo');
})();
