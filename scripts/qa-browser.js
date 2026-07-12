#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'qa-artifacts');

function overlap(a, b) {
  return Boolean(a && b && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom));
}

async function collectMessages(page) {
  const messages = [];
  const failed = [];

  page.on('console', msg => {
    if (['error', 'warning'].includes(msg.type())) {
      messages.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => messages.push(`pageerror: ${err.message}`));
  page.on('requestfailed', req => {
    failed.push(`${req.resourceType()}: ${req.url()} (${req.failure()?.errorText || 'failed'})`);
  });

  return { messages, failed };
}

async function addLocalQaHeader(page) {
  await page.route(`${BASE_URL}/**`, route => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'x-qa-browser': '1',
      },
    });
  });
}

async function checkPublic(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  await addLocalQaHeader(page);
  const logs = await collectMessages(page);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('#cotizador').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const metrics = await page.evaluate(() => {
    const rect = el => (el ? el.getBoundingClientRect().toJSON() : null);
    const finishLabel = [...document.querySelectorAll('label')].find(el => /terminado/i.test(el.textContent));
    const finishSelect = finishLabel?.parentElement?.querySelector('select') || null;
    const fab = document.querySelector('#ww-fab');
    const hint = document.querySelector('#ww-hint');

    return {
      title: document.title,
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      quoteVisible: !!document.querySelector('#cotizador'),
      activeQuoteTab: document.querySelector('.qtab.active')?.textContent?.trim() || null,
      finishSelect: rect(finishSelect),
      whatsappFab: rect(fab),
      whatsappHintDisplay: hint ? getComputedStyle(hint).display : 'missing',
    };
  });

  metrics.whatsappOverlapsFinishSelect = overlap(metrics.finishSelect, metrics.whatsappFab);

  const screenshot = path.join(OUT_DIR, `${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();

  const failures = [];
  if (!metrics.quoteVisible) failures.push('cotizador no visible');
  if (metrics.scrollWidth > metrics.width) failures.push(`overflow horizontal ${metrics.scrollWidth}/${metrics.width}`);
  if (viewport.name === 'mobile' && metrics.whatsappOverlapsFinishSelect) {
    failures.push('WhatsApp tapa el selector de terminado');
  }
  if (logs.failed.length) failures.push(`requests fallidos: ${logs.failed.length}`);
  if (logs.messages.length) failures.push(`mensajes consola: ${logs.messages.length}`);

  return { name: viewport.name, screenshot, metrics, logs, failures };
}

async function checkAdminLogin(browser) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await addLocalQaHeader(page);
  const logs = await collectMessages(page);

  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => ({
    title: document.title,
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    loginVisible: !!document.querySelector('#login-screen') &&
      getComputedStyle(document.querySelector('#login-screen')).display !== 'none',
    logoFound: !!document.querySelector('.brand-logo, .logo-mark, .mob-logo'),
  }));

  const screenshot = path.join(OUT_DIR, 'admin-login.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.close();

  const failures = [];
  if (!metrics.loginVisible) failures.push('login admin no visible');
  if (!metrics.logoFound) failures.push('logo admin no encontrado');
  if (metrics.scrollWidth > metrics.width) failures.push(`overflow horizontal ${metrics.scrollWidth}/${metrics.width}`);
  if (logs.failed.length) failures.push(`requests fallidos: ${logs.failed.length}`);

  return { name: 'admin-login', screenshot, metrics, logs, failures };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    results.push(await checkPublic(browser, { name: 'desktop', width: 1440, height: 1000 }));
    results.push(await checkPublic(browser, { name: 'mobile', width: 390, height: 844 }));
    results.push(await checkAdminLogin(browser));
  } finally {
    await browser.close();
  }

  const failures = results.flatMap(result => result.failures.map(failure => `${result.name}: ${failure}`));
  for (const result of results) {
    const status = result.failures.length ? 'FAIL' : 'OK';
    console.log(`${status} ${result.name} -> ${path.relative(process.cwd(), result.screenshot)}`);
    if (result.failures.length) {
      for (const failure of result.failures) console.log(`  - ${failure}`);
    }
  }

  if (failures.length) {
    console.error('\nBrowser QA failed.');
    process.exit(1);
  }

  console.log('\nBrowser QA passed.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
