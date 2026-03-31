/**
 * Carga precios del cotizador desde el backend:
 * - GET `/api/pricing`
 * - fallback a valores por defecto
 * - override opcional desde localStorage (para pruebas)
 */
import { getDefaultConfig } from './quotePricingDefaults.js';

const STORAGE_KEY = 'mp-quote-pricing-v1';
const PRICING_API_URL = '/api/pricing';

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (Array.isArray(source)) return source.slice();
  const out = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = out[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      out[k] = deepMerge(tv, sv);
    } else {
      out[k] = Array.isArray(sv) ? sv.slice() : sv;
    }
  }
  return out;
}

async function tryFetchFromApi() {
  try {
    const r = await fetch(PRICING_API_URL, { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch (_) { /* ignore */ }
  return null;
}

/**
 * @returns {Promise<{ pricing: object, delivery: object }>}
 */
export async function loadQuotePricing() {
  let base = getDefaultConfig();
  const fetched = await tryFetchFromApi();
  const apiOk = fetched && fetched.pricing;
  if (fetched && fetched.pricing) {
    base = deepMerge(base, fetched);
  } else if (fetched && fetched.volantes) {
    // Compatibilidad con formatos antiguos
    base.pricing.volantes = fetched.volantes?.models ?? base.pricing.volantes;
    if (Array.isArray(fetched.tarjetas)) base.pricing.tarjetas = fetched.tarjetas;
    if (Array.isArray(fetched.tazas)) {
      base.pricing.tazas = fetched.tazas.map(t => ({
        qty: t.qty,
        label: t.label,
        ppu: t.pricePerUnit,
      }));
    }
    if (Array.isArray(fetched.rollup) && base.pricing.granformato) {
      for (const rl of fetched.rollup) {
        if (rl.id === 'lona') base.pricing.granformato['rollup-lona'].ppu = rl.price;
        if (rl.id === 'pet')  base.pricing.granformato['rollup-pet'].ppu  = rl.price;
      }
    }
  }

  // Solo usar localStorage si el backend no devolvió configuración válida.
  if (!apiOk) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        base = deepMerge(base, parsed);
      }
    } catch (_) { /* ignorar */ }
  }

  return {
    pricing: base.pricing,
    delivery: base.delivery,
  };
}

export { STORAGE_KEY };
