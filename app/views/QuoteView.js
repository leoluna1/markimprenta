import BaseView from './BaseView.js';
import { loadQuotePricing } from '../config/loadQuotePricing.js';

/** Precios y tiempos de entrega (cargados desde quote-prices.json / localStorage) */
let PRICING = {};
let DELIVERY = {};

// Íconos por tab
const ICONS = {
  volantes:    { type: 'fa', cls: 'fas fa-file-alt' },
  tarjetas:    { type: 'fa', cls: 'fas fa-id-card' },
  tazas:       { type: 'fa', cls: 'fas fa-mug-hot' },
  granformato: { type: 'fa', cls: 'fas fa-ruler-combined' },
  pop:         { type: 'fa', cls: 'fas fa-gift' },
  etiquetas:   { type: 'fa', cls: 'fas fa-tags' },
  packaging:   { type: 'fa', cls: 'fas fa-box' },
  diseno:      { type: 'fa', cls: 'fas fa-palette' },
};

// ── Estado reactivo del cotizador ─────────────────
const QS = {
  tab:        'volantes',
  vol:        { model: 'a6-1c', tierIdx: 0, qty: 1000, material: 'couche115', acabado: 'brillante' },
  tarjeta:    'brillo-uv',
  tarjetaQty: 1000,
  taza:       { tipo: 'Clásica Blanca', tierIdx: 0 },
  granformato:{ tipo: 'banner', sqm: 1, ancho: 1, alto: 1, qty: 1 },
  pop:        { tipo: 'gorras',   tierIdx: 0 },
  etiquetas:  { tipo: 'adhesiva', tierIdx: 0 },
  packaging:  { tipo: 'cajas',    tierIdx: 0 },
  diseno:     'logo',
};

// ── QuoteView ──────────────────────────────────────
export default class QuoteView extends BaseView {
  constructor() { super('#cotizador'); }

  async init() {
    const cfg = await loadQuotePricing();
    PRICING = cfg.pricing;
    DELIVERY = cfg.delivery;

    this._renderTarjetas();
    this._renderDiseno();
    this._renderVolTiers();
    this._renderTazaTiers();
    this._renderPopTiers();
    this._renderEtiqTiers();
    this._renderPackTiers();
    this._bindTabs();
    this._bindInputs();
    this._updateResult();
  }

  // ── Tabs ──────────────────────────────────────────
  _bindTabs() {
    document.querySelectorAll('.qtab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.qtab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.qform').forEach(f => f.classList.remove('active'));
        btn.classList.add('active');
        QS.tab = btn.dataset.tab;
        const form = document.getElementById('form-' + QS.tab);
        if (form) form.classList.add('active');
        this._updateResult();
      });
    });
  }

  // ── Todos los inputs/selects ──────────────────────
  _bindInputs() {
    // ─ Volantes ─
    document.getElementById('vol-model')?.addEventListener('change', e => {
      QS.vol.model = e.target.value;
      this._renderVolTiers();
      this._updateResult();
    });
    document.getElementById('vol-material')?.addEventListener('change', e => {
      QS.vol.material = e.target.value; this._updateResult();
    });
    document.getElementById('vol-acabado')?.addEventListener('change', e => {
      QS.vol.acabado = e.target.value; this._updateResult();
    });
    document.getElementById('vol-qty-input')?.addEventListener('input', e => {
      const m = PRICING.volantes[QS.vol.model];
      QS.vol.qty = Math.max(m.minQty || 1000, parseInt(e.target.value) || 1000);
      this._updateResult();
    });

    // ─ Tazas ─
    document.getElementById('taza-tipo')?.addEventListener('change', e => {
      QS.taza.tipo = e.target.value; this._updateResult();
    });

    // ─ Tarjetas qty ─
    document.getElementById('tar-qty')?.addEventListener('change', e => {
      QS.tarjetaQty = parseInt(e.target.value) || 1000;
      this._updateResult();
    });

    // ─ Gran Formato ─
    document.getElementById('gf-tipo')?.addEventListener('change', e => {
      QS.granformato.tipo = e.target.value;
      this._updateGFFields();
      this._updateResult();
    });
    document.getElementById('gf-ancho')?.addEventListener('input', () => this._updateGFSqm());
    document.getElementById('gf-alto')?.addEventListener('input',  () => this._updateGFSqm());
    document.getElementById('gf-qty')?.addEventListener('input', e => {
      QS.granformato.qty = Math.max(1, parseInt(e.target.value) || 1);
      this._updateResult();
    });

    // ─ Material POP ─
    document.getElementById('pop-tipo')?.addEventListener('change', e => {
      QS.pop.tipo    = e.target.value;
      QS.pop.tierIdx = 0;
      this._renderPopTiers();
      this._updateResult();
    });

    // ─ Etiquetas ─
    document.getElementById('etiq-tipo')?.addEventListener('change', e => {
      QS.etiquetas.tipo    = e.target.value;
      QS.etiquetas.tierIdx = 0;
      this._renderEtiqTiers();
      this._updateResult();
    });

    // ─ Packaging ─
    document.getElementById('pack-tipo')?.addEventListener('change', e => {
      QS.packaging.tipo    = e.target.value;
      QS.packaging.tierIdx = 0;
      this._renderPackTiers();
      this._updateResult();
    });
  }

  // ── Gran Formato: actualizar campos según tipo ────
  _updateGFFields() {
    const tipo    = QS.granformato.tipo;
    const isRollup = tipo === 'rollup-lona' || tipo === 'rollup-pet';
    const sqmW = document.getElementById('gf-sqm-wrapper');
    const qtyW = document.getElementById('gf-qty-wrapper');
    const specs = document.getElementById('gf-specs');

    if (sqmW) sqmW.style.display = isRollup ? 'none' : 'block';
    if (qtyW) qtyW.style.display = isRollup ? 'block' : 'none';

    if (specs) {
      const specMap = {
        'banner':      ['Lona frontlit resistente','Ojales incluidos','Impresión UV · Full color','Material exterior/interior'],
        'rollup-lona': ['80×200 cm · Estructura aluminio','Sistema retráctil enrollable','Bolsa de transporte incluida','Impresión full color 300dpi'],
        'rollup-pet':  ['80×200 cm · Pet Banner premium','Imagen nítida y de alto contraste','Bolsa de transporte incluida','Impresión HD full color'],
        'vinilo':      ['Vinil de alta calidad','Resistente a UV y humedad','Varios acabados: mate, brillante','Instalación disponible'],
        'giganto':     ['Hasta 3.20m de ancho','Impresión HD gran escala','Material resistente intemperie','Instalación disponible'],
      };
      const items = specMap[tipo] || [];
      specs.innerHTML = items.map(s => `<div class="qspec-item"><i class="fas fa-check"></i> ${s}</div>`).join('');
    }
  }

  _updateGFSqm() {
    const a   = parseFloat(document.getElementById('gf-ancho')?.value) || 0;
    const h   = parseFloat(document.getElementById('gf-alto')?.value)  || 0;
    const sqm = Math.max(0.01, a * h);
    QS.granformato.ancho = a;
    QS.granformato.alto  = h;
    QS.granformato.sqm   = sqm;
    const hint = document.getElementById('gf-sqm-hint');
    if (hint) hint.textContent = `= ${sqm.toFixed(2)} m²`;
    this._updateResult();
  }

  // ── Render: tiers de volantes ─────────────────────
  _renderVolTiers() {
    const m       = PRICING.volantes[QS.vol.model];
    const tiersW  = document.getElementById('vol-tiers-wrapper');
    const customW = document.getElementById('vol-custom-wrapper');
    const c       = document.getElementById('vol-tier-buttons');
    if (!tiersW || !c) return;

    if (m.type === 'tiers') {
      tiersW.style.display  = 'block';
      customW.style.display = 'none';
      c.innerHTML = m.tiers.map((t, i) =>
        `<button class="qtier-btn${i === QS.vol.tierIdx ? ' active' : ''}" data-tiridx="${i}">
           <span class="tier-qty">${t.qty.toLocaleString()} uds.</span>
           <span class="tier-price">$${t.total}</span>
         </button>`
      ).join('');
      c.querySelectorAll('.qtier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          QS.vol.tierIdx = +btn.dataset.tiridx;
          c.querySelectorAll('.qtier-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._updateResult();
        });
      });
    } else {
      tiersW.style.display  = 'none';
      customW.style.display = 'block';
      const min    = m.minQty || 1000;
      const minLbl = document.getElementById('vol-min-label');
      const hint   = document.getElementById('vol-price-hint');
      const inp    = document.getElementById('vol-qty-input');
      if (minLbl) minLbl.textContent = min.toLocaleString();
      if (hint)   hint.textContent   = `Precio: $${m.unitPer1000.toFixed(2)} por cada 1000 unidades`;
      if (inp)  { inp.min = min; inp.value = Math.max(QS.vol.qty, min); QS.vol.qty = +inp.value; }
    }
  }

  // ── Render: tiers de tazas ───────────────────────
  _renderTazaTiers() {
    const c = document.getElementById('taza-tier-buttons');
    if (!c) return;
    c.innerHTML = PRICING.tazas.map((t, i) =>
      `<button class="qtier-btn${i === QS.taza.tierIdx ? ' active' : ''}" data-tazaidx="${i}">
         <span class="tier-qty">${t.label}</span>
         <span class="tier-price">$${t.ppu.toFixed(2)} c/u</span>
       </button>`
    ).join('');
    c.querySelectorAll('.qtier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        QS.taza.tierIdx = +btn.dataset.tazaidx;
        c.querySelectorAll('.qtier-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateResult();
      });
    });
  }

  // ── Render: tarjetas ─────────────────────────────
  _renderTarjetas() {
    const c = document.getElementById('tarjetas-options');
    if (!c) return;
    c.innerHTML = PRICING.tarjetas.map(t =>
      `<button class="qtarjeta-option${t.id === QS.tarjeta ? ' active' : ''}" data-tid="${t.id}">
         <div class="qtarjeta-info">
           <div class="name">${t.label}</div>
           <div class="desc">${t.desc}</div>
         </div>
         <div class="qtarjeta-price">$${t.price}</div>
       </button>`
    ).join('');
    c.querySelectorAll('.qtarjeta-option').forEach(btn => {
      btn.addEventListener('click', () => {
        QS.tarjeta = btn.dataset.tid;
        c.querySelectorAll('.qtarjeta-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateResult();
      });
    });
  }

  // ── Render: diseño ───────────────────────────────
  _renderDiseno() {
    const c = document.getElementById('diseno-options');
    if (!c) return;
    c.innerHTML = PRICING.diseno.map(d =>
      `<button class="qtarjeta-option${d.id === QS.diseno ? ' active' : ''}" data-did="${d.id}">
         <div class="qtarjeta-info">
           <div class="name">${d.label}</div>
           <div class="desc">${d.desc}</div>
         </div>
         <div class="qtarjeta-price">$${d.price}</div>
       </button>`
    ).join('');
    c.querySelectorAll('.qtarjeta-option').forEach(btn => {
      btn.addEventListener('click', () => {
        QS.diseno = btn.dataset.did;
        c.querySelectorAll('.qtarjeta-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateResult();
      });
    });
  }

  // ── Render genérico de tiers ──────────────────────
  _renderTierGroup(containerId, tiers, stateKey) {
    const c = document.getElementById(containerId);
    if (!c) return;
    const tierIdx = QS[stateKey].tierIdx;
    c.innerHTML = tiers.map((t, i) =>
      `<button class="qtier-btn${i === tierIdx ? ' active' : ''}" data-gidx="${i}">
         <span class="tier-qty">${t.label}</span>
         <span class="tier-price">$${t.ppu.toFixed(2)} c/u</span>
       </button>`
    ).join('');
    c.querySelectorAll('.qtier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        QS[stateKey].tierIdx = +btn.dataset.gidx;
        c.querySelectorAll('.qtier-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateResult();
      });
    });
  }

  _renderPopTiers()  { this._renderTierGroup('pop-tier-buttons',  PRICING.pop[QS.pop.tipo].tiers,             'pop'); }
  _renderEtiqTiers() { this._renderTierGroup('etiq-tier-buttons', PRICING.etiquetas[QS.etiquetas.tipo].tiers, 'etiquetas'); }
  _renderPackTiers() { this._renderTierGroup('pack-tier-buttons', PRICING.packaging[QS.packaging.tipo].tiers, 'packaging'); }

  // ── Cálculo extendido ─────────────────────────────
  // Retorna: { total, detail, desc, productName, specs[], stats[], delivery, waMsg }
  _calc() {
    const matLabel = { couche115: 'Couché 115g', couche150: 'Couché 150g', bond90: 'Bond 90g' };

    switch (QS.tab) {

      case 'volantes': {
        const m   = PRICING.volantes[QS.vol.model];
        const mat = matLabel[QS.vol.material];
        const aca = QS.vol.acabado.charAt(0).toUpperCase() + QS.vol.acabado.slice(1);

        if (m.type === 'tiers') {
          const t     = m.tiers[Math.min(QS.vol.tierIdx, m.tiers.length - 1)];
          const ppu   = t.total / t.qty;
          return {
            total: t.total,
            detail: `${t.qty.toLocaleString()} unidades`,
            productName: `Volantes / Flyers`,
            specs: [
              { label: 'Tamaño',    value: m.label.split('·')[0].trim(), hi: false },
              { label: 'Papel',     value: mat,                 hi: false },
              { label: 'Terminado', value: aca,                 hi: false },
              { label: 'Cantidad',  value: `${t.qty.toLocaleString()} unidades`, hi: true },
            ],
            stats: [
              { label: 'Por unidad',  value: `$${ppu.toFixed(4)}`,   cls: 'blue' },
              { label: 'Por millar',  value: `$${(ppu*1000).toFixed(2)}`, cls: '' },
            ],
            delivery: DELIVERY.volantes,
            desc: `Volante ${m.label} · ${mat} · ${aca} · ${t.qty.toLocaleString()} unidades`,
          };
        } else {
          const qty   = Math.max(QS.vol.qty, m.minQty);
          const total = (qty / 1000) * m.unitPer1000;
          const ppu   = total / qty;
          return {
            total,
            detail: `$${m.unitPer1000.toFixed(2)} × 1 millar`,
            productName: `Volantes / Flyers`,
            specs: [
              { label: 'Tamaño',    value: m.label.split('·')[0].trim(), hi: false },
              { label: 'Papel',     value: mat,                         hi: false },
              { label: 'Terminado', value: aca,                         hi: false },
              { label: 'Cantidad',  value: `${qty.toLocaleString()} unidades`, hi: true },
            ],
            stats: [
              { label: 'Por unidad', value: `$${ppu.toFixed(4)}`, cls: 'blue' },
              { label: 'Por millar', value: `$${m.unitPer1000.toFixed(2)}`, cls: '' },
            ],
            delivery: DELIVERY.volantes,
            desc: `Volante ${m.label} · ${mat} · ${aca} · ${qty.toLocaleString()} unidades`,
          };
        }
      }

      case 'tarjetas': {
        const t      = PRICING.tarjetas.find(x => x.id === QS.tarjeta);
        const qty    = QS.tarjetaQty || 1000;
        const factor = qty / 1000;
        const total  = t.price * factor;
        const ppu    = total / qty;
        return {
          total,
          detail: `${qty.toLocaleString()} tarjetas`,
          productName: 'Tarjetas de Presentación',
          specs: [
            { label: 'Tamaño',    value: '8.5 × 5.2 cm',         hi: false },
            { label: 'Papel',     value: 'Cartulina Couché 300g',  hi: false },
            { label: 'Acabado',   value: t.label,                  hi: false },
            { label: 'Cantidad',  value: `${qty.toLocaleString()} tarjetas`, hi: true },
          ],
          stats: [
            { label: 'Por unidad', value: `$${ppu.toFixed(3)}`, cls: 'blue' },
            { label: 'Cantidad',   value: `${qty.toLocaleString()} uds.`, cls: '' },
          ],
          delivery: DELIVERY.tarjetas,
          desc: `Tarjetas ${t.label} · 8.5×5.2 cm · Couché 300g · ${qty.toLocaleString()} unidades`,
        };
      }

      case 'tazas': {
        const t     = PRICING.tazas[QS.taza.tierIdx];
        const total = t.ppu * t.qty;
        return {
          total,
          detail: `$${t.ppu.toFixed(2)} c/u × ${t.qty}`,
          productName: `Tazas Sublimadas`,
          specs: [
            { label: 'Tipo',      value: QS.taza.tipo,          hi: false },
            { label: 'Técnica',   value: 'Sublimación',          hi: false },
            { label: 'Material',  value: 'Cerámica',             hi: false },
            { label: 'Cantidad',  value: `${t.qty} unidad${t.qty > 1 ? 'es' : ''}`, hi: true },
          ],
          stats: [
            { label: 'Por unidad', value: `$${t.ppu.toFixed(2)}`, cls: 'blue' },
            { label: 'Total',      value: `$${total.toFixed(2)}`,  cls: 'green' },
          ],
          delivery: DELIVERY.tazas,
          desc: `Taza ${QS.taza.tipo} · ${t.qty} unidad${t.qty > 1 ? 'es' : ''}`,
        };
      }

      case 'granformato': {
        const gf  = PRICING.granformato[QS.granformato.tipo];
        const del = typeof DELIVERY.granformato === 'object'
          ? DELIVERY.granformato[QS.granformato.tipo]
          : DELIVERY.granformato;

        if (gf.unit === 'm2') {
          const sqm   = Math.max(0.01, QS.granformato.sqm);
          const total = gf.ppm2 * sqm;
          return {
            total,
            detail: `$${gf.ppm2}/m² × ${sqm.toFixed(2)} m²`,
            productName: gf.label,
            specs: [
              { label: 'Ancho',     value: `${QS.granformato.ancho.toFixed(1)} m`, hi: false },
              { label: 'Alto',      value: `${QS.granformato.alto.toFixed(1)} m`,  hi: false },
              { label: 'Superficie',value: `${sqm.toFixed(2)} m²`,                 hi: true  },
            ],
            stats: [
              { label: 'Por m²', value: `$${gf.ppm2}`,           cls: 'blue' },
              { label: 'Total m²', value: `${sqm.toFixed(2)} m²`, cls: '' },
            ],
            delivery: del,
            desc: `${gf.label} · ${sqm.toFixed(2)} m² · ${gf.specs}`,
          };
        } else {
          const qty   = QS.granformato.qty;
          const total = gf.ppu * qty;
          return {
            total,
            detail: qty > 1 ? `$${gf.ppu} × ${qty} uds.` : 'Unidad completa',
            productName: gf.label,
            specs: [
              { label: 'Dimensiones', value: '80 × 200 cm',    hi: false },
              { label: 'Material',    value: gf.specs.split('·')[0].trim(), hi: false },
              { label: 'Incluye',     value: 'Estructura + bolsa', hi: false },
              { label: 'Cantidad',    value: `${qty} unidad${qty > 1 ? 'es' : ''}`, hi: true },
            ],
            stats: [
              { label: 'Por unidad', value: `$${gf.ppu}`,           cls: 'blue' },
              { label: 'Cantidad',   value: `${qty} unidad${qty > 1 ? 'es' : ''}`, cls: '' },
            ],
            delivery: del,
            desc: `${gf.label} · ${qty} unidad${qty > 1 ? 'es' : ''} · ${gf.specs}`,
          };
        }
      }

      case 'pop': {
        const data  = PRICING.pop[QS.pop.tipo];
        const t     = data.tiers[Math.min(QS.pop.tierIdx, data.tiers.length - 1)];
        const total = t.ppu * t.qty;
        const del   = DELIVERY.pop[QS.pop.tipo];
        return {
          total,
          detail: `$${t.ppu.toFixed(2)} c/u × ${t.qty}`,
          productName: data.label,
          specs: [
            { label: 'Producto',   value: data.label,    hi: false },
            { label: 'Logo',       value: 'Personalizado', hi: false },
            { label: 'Cantidad',   value: `${t.qty.toLocaleString()} unidades`, hi: true },
          ],
          stats: [
            { label: 'Por unidad', value: `$${t.ppu.toFixed(2)}`, cls: 'blue' },
            { label: 'Total',      value: `$${total.toFixed(2)}`, cls: 'green' },
          ],
          delivery: del,
          desc: `${data.label} · ${t.qty} unidades · Logo personalizado`,
        };
      }

      case 'etiquetas': {
        const data  = PRICING.etiquetas[QS.etiquetas.tipo];
        const t     = data.tiers[Math.min(QS.etiquetas.tierIdx, data.tiers.length - 1)];
        const total = t.ppu * t.qty;
        return {
          total,
          detail: `$${t.ppu.toFixed(2)} c/u × ${t.qty.toLocaleString()}`,
          productName: data.label,
          specs: [
            { label: 'Tipo',     value: data.label,    hi: false },
            { label: 'Corte',    value: 'Personalizado', hi: false },
            { label: 'Cantidad', value: `${t.qty.toLocaleString()} unidades`, hi: true },
          ],
          stats: [
            { label: 'Por unidad', value: `$${t.ppu.toFixed(2)}`, cls: 'blue' },
            { label: 'Total',      value: `$${total.toFixed(2)}`, cls: 'green' },
          ],
          delivery: DELIVERY.etiquetas,
          desc: `${data.label} · ${t.qty.toLocaleString()} unidades · Corte personalizado`,
        };
      }

      case 'packaging': {
        const data  = PRICING.packaging[QS.packaging.tipo];
        const t     = data.tiers[Math.min(QS.packaging.tierIdx, data.tiers.length - 1)];
        const total = t.ppu * t.qty;
        return {
          total,
          detail: `$${t.ppu.toFixed(2)} c/u × ${t.qty.toLocaleString()}`,
          productName: data.label,
          specs: [
            { label: 'Tipo',       value: data.label,          hi: false },
            { label: 'Impresión',  value: 'Full color',         hi: false },
            { label: 'Acabado',    value: 'Troquelado',         hi: false },
            { label: 'Cantidad',   value: `${t.qty.toLocaleString()} unidades`, hi: true },
          ],
          stats: [
            { label: 'Por unidad', value: `$${t.ppu.toFixed(2)}`, cls: 'blue' },
            { label: 'Total',      value: `$${total.toFixed(2)}`, cls: 'green' },
          ],
          delivery: DELIVERY.packaging,
          desc: `${data.label} · ${t.qty.toLocaleString()} unidades · Full color · Troquelado`,
        };
      }

      case 'diseno': {
        const d = PRICING.diseno.find(x => x.id === QS.diseno);
        return {
          total: d.price,
          detail: 'Precio por proyecto',
          productName: d.label,
          specs: [
            { label: 'Servicio',  value: d.label,    hi: false },
            { label: 'Incluye',   value: d.desc.split('·')[0].trim(), hi: false },
            { label: 'Formatos',  value: 'Vectorial · PDF · PNG', hi: false },
          ],
          stats: [
            { label: 'Entrega', value: d.delivery, cls: '' },
            { label: 'Tipo',    value: 'Proyecto', cls: '' },
          ],
          delivery: d.delivery,
          desc: `${d.label} · ${d.desc}`,
        };
      }
    }
  }

  // ── Actualizar panel de resultado ─────────────────
  _updateResult() {
    const r = this._calc();
    if (!r) return;

    const placeholder = document.querySelector('.qresult-placeholder');
    const content     = document.getElementById('qresultContent');
    const priceVal    = document.getElementById('qPriceValue');
    const priceDetail = document.getElementById('qPriceDetail');
    const waBtn       = document.getElementById('qWhatsappBtn');

    if (!priceVal) return;

    if (placeholder) placeholder.style.display = 'none';
    if (content)     content.style.display      = 'block';

    // ── Cabecera ──
    const icon = ICONS[QS.tab];
    const iconEl = document.getElementById('qrProductIcon');
    const nameEl = document.getElementById('qrProductName');
    if (iconEl) iconEl.innerHTML = `<i class="${icon.cls}"></i>`;
    if (nameEl) nameEl.textContent = r.productName;

    // ── Especificaciones ──
    const specsEl = document.getElementById('qrSpecs');
    if (specsEl) {
      specsEl.innerHTML = r.specs.map(s =>
        `<div class="qr-spec-row">
           <span class="qr-spec-label">${s.label}</span>
           <span class="qr-spec-value${s.hi ? ' highlight' : ''}">${s.value}</span>
         </div>`
      ).join('');
    }

    // ── Precio ──
    this._animatePrice(priceVal, r.total);
    priceDetail.textContent = r.detail;

    // ── IVA ──
    const ivaWrap  = document.getElementById('qIvaWrap');
    const ivaNote  = document.getElementById('qIvaNote');
    const ivaAmtEl = document.getElementById('qIvaAmount');
    const ivaTotal = document.getElementById('qTotalIva');
    if (ivaWrap) {
      const iva   = r.total * 0.15;
      const total = r.total + iva;
      ivaWrap.style.display  = 'block';
      if (ivaNote) ivaNote.style.display = 'none';
      if (ivaAmtEl) ivaAmtEl.textContent = `+$${iva.toFixed(2)}`;
      if (ivaTotal) ivaTotal.textContent = `$${total.toFixed(2)}`;
    }

    // Stats ocultos — demasiado técnicos para clientes
    const statsEl = document.getElementById('qrStats');
    if (statsEl) statsEl.style.display = 'none';

    // ── Tiempo de entrega ──
    const delivEl = document.getElementById('qrDelivery');
    if (delivEl && r.delivery) {
      delivEl.style.display = 'flex';
      delivEl.innerHTML = `<i class="fas fa-clock"></i> Tiempo estimado: <strong style="margin-left:4px;">${r.delivery}</strong>`;
    }

    // ── WhatsApp ──
    const msg = `Hola! Me interesa cotizar:\n${r.desc}\nPrecio estimado: $${r.total.toFixed(2)} + IVA\n¿Me pueden confirmar disponibilidad y tiempo de entrega?`;
    if (waBtn) waBtn.href = 'https://wa.me/593996884150?text=' + encodeURIComponent(msg);
  }

  // ── Animación de precio ───────────────────────────
  _animatePrice(el, target) {
    if (this._priceRaf) { cancelAnimationFrame(this._priceRaf); this._priceRaf = null; }
    const steps = 40;
    const inc   = target / steps;
    let cur = 0, n = 0;
    const tick = () => {
      cur += inc; n++;
      el.textContent = '$' + cur.toFixed(2);
      if (n < steps) {
        this._priceRaf = requestAnimationFrame(tick);
      } else {
        el.textContent = '$' + target.toFixed(2);
        this._priceRaf = null;
      }
    };
    this._priceRaf = requestAnimationFrame(tick);
  }

  // Stub de compatibilidad
  bind() {}
}
