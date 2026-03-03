/**
 * =====================================================
 * MARK PUBLICIDAD — WhatsApp Chat Widget
 * 3 preguntas → abre WhatsApp con el pedido listo
 * =====================================================
 */
(function () {
  'use strict';

  /* ── CONFIGURACIÓN ───────────────────────────────── */
  const CONFIG = {
    phone:      '593996884150',
    agentName:  'Mark Publicidad',
    agentRole:  'Respondemos en minutos',
    openDelay:  5000,              // ms para auto-abrir (0 = desactivado)
    hintText:   '¿Necesitas un presupuesto? Escríbenos.',
  };

  /* ── PASOS ──────────────────────────────────────── */
  const STEPS = [
    { bot: 'Hola, soy el asistente de *Mark Publicidad*.\n¿Cuál es tu nombre?',
      placeholder: 'Escribe tu nombre...', key: 'name' },
    { bot: 'Mucho gusto, {name}.\n¿Cuál es tu número de teléfono?',
      placeholder: 'Ej: 0987 654 321', key: 'phone', tel: true },
    { bot: '¿Qué necesitas? Cuéntame brevemente.',
      placeholder: 'Ej: 500 flyers tamaño A5...', key: 'need' },
  ];

  /* ── ESTADO ─────────────────────────────────────── */
  const st = { open: false, step: 0, data: {} };

  /* ── HELPERS ─────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  function fill(s) {
    return s.replace(/\{(\w+)\}/g, (_, k) => st.data[k] || '');
  }

  function waURL() {
    const d = st.data;
    const msg =
      `Hola ${CONFIG.agentName}.\n\n` +
      `Nombre: ${d.name   || '–'}\n` +
      `Teléfono: ${d.phone || '–'}\n` +
      `Necesita: ${d.need  || '–'}\n\n` +
      `Por favor, envíenme más información y precio.`;
    return `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;
  }

  function scrollBot() {
    const b = $('ww-body');
    if (b) b.scrollTop = b.scrollHeight;
  }

  function addBubble(text, who) {
    const d = document.createElement('div');
    d.className = `ww-bbl ww-bbl--${who}`;
    d.innerHTML = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    $('ww-body').appendChild(d);
    scrollBot();
  }

  function showTyping() {
    const t = document.createElement('div');
    t.className = 'ww-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    $('ww-body').appendChild(t);
    scrollBot();
    return t;
  }

  /* ── LÓGICA DE PASOS ─────────────────────────────── */
  function renderStep() {
    const idx = st.step;
    if (idx >= STEPS.length) return showFinal();
    const step = STEPS[idx];

    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addBubble(fill(step.bot), 'bot');

      const row = document.createElement('div');
      row.className = 'ww-row';

      const inp = document.createElement('input');
      inp.type = step.tel ? 'tel' : 'text';
      inp.className = 'ww-inp';
      inp.placeholder = step.placeholder;
      inp.maxLength = 120;

      const btn = document.createElement('button');
      btn.className = 'ww-sbtn';
      btn.setAttribute('aria-label', 'Enviar');
      btn.innerHTML = SVG_SEND;

      function submit() {
        const val = inp.value.trim();
        if (!val) { inp.focus(); return; }
        row.style.pointerEvents = 'none';
        row.style.opacity = '0.5';
        addBubble(val, 'user');
        st.data[step.key] = val;
        st.step++;
        setTimeout(renderStep, 500);
      }

      btn.addEventListener('click', submit);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

      row.appendChild(inp);
      row.appendChild(btn);
      $('ww-body').appendChild(row);
      scrollBot();
      setTimeout(() => inp.focus(), 80);
    }, 700);
  }

  function showFinal() {
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addBubble(`Gracias, ${st.data.name || ''}. Te conectamos ahora con nuestro equipo.`, 'bot');

      setTimeout(() => {
        const a = document.createElement('a');
        a.className = 'ww-cta';
        a.href = waURL();
        a.target = '_blank';
        a.rel = 'noopener';
        a.innerHTML = `${SVG_WA}<span>Abrir WhatsApp ahora</span>`;
        a.addEventListener('click', () => setTimeout(() => toggle(false), 300));
        $('ww-body').appendChild(a);

        const redo = document.createElement('button');
        redo.className = 'ww-restart';
        redo.textContent = '↩ Empezar de nuevo';
        redo.addEventListener('click', () => {
          st.step = 0; st.data = {};
          $('ww-body').innerHTML = '';
          renderStep();
        });
        $('ww-body').appendChild(redo);
        scrollBot();
      }, 300);
    }, 700);
  }

  /* ── TOGGLE ──────────────────────────────────────── */
  function toggle(forceOpen) {
    const root = $('ww-root');
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !st.open;
    st.open = shouldOpen;
    root.classList.toggle('ww-open', shouldOpen);

    const badge = $('ww-badge');
    if (badge) badge.style.display = shouldOpen ? 'none' : '';

    if (shouldOpen && $('ww-body').children.length === 0) {
      renderStep();
    }
  }

  /* ── SVGs ────────────────────────────────────────── */
  const SVG_WA = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  const SVG_SEND = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  /* ── CSS ─────────────────────────────────────────── */
  function injectStyles() {
    if ($('ww-styles')) return;
    const s = document.createElement('style');
    s.id = 'ww-styles';
    s.textContent = `
/* ══ WhatsApp Widget Mark Publicidad ══════════════ */
#ww-root {
  position: fixed !important;
  bottom: 1.5rem !important;
  right: 1.5rem !important;
  z-index: 999999 !important;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: .5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Burbuja hint */
#ww-hint {
  background: white;
  color: #1d1d1f;
  font-size: .82rem;
  font-weight: 500;
  padding: .5rem .9rem;
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0 4px 18px rgba(0,0,0,.15);
  cursor: pointer;
  white-space: nowrap;
  animation: wwSlide .35s ease;
  transition: opacity .4s;
}
@keyframes wwSlide {
  from { opacity:0; transform:translateX(10px); }
  to   { opacity:1; transform:translateX(0); }
}

/* FAB */
#ww-fab {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #25d366;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(37,211,102,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform .2s, box-shadow .2s;
  flex-shrink: 0;
}
#ww-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 26px rgba(37,211,102,.6);
}
#ww-badge {
  position: absolute;
  top: -4px; right: -4px;
  width: 19px; height: 19px;
  border-radius: 50%;
  background: #e74c3c;
  color: white;
  font-size: .65rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid white;
  animation: wwPulse 2s infinite;
}
@keyframes wwPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }

/* Iconos del FAB */
.ww-ico-open  { display:flex; }
.ww-ico-close { display:none; }
#ww-root.ww-open .ww-ico-open  { display:none; }
#ww-root.ww-open .ww-ico-close { display:flex; }

/* Panel */
#ww-panel {
  width: 320px;
  max-width: calc(100vw - 2rem);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 12px 44px rgba(0,0,0,.2);
  background: white;
  transform: scale(.88) translateY(16px);
  transform-origin: bottom right;
  opacity: 0;
  pointer-events: none;
  transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .22s ease;
  order: -1;
}
#ww-root.ww-open #ww-panel {
  transform: scale(1) translateY(0);
  opacity: 1;
  pointer-events: all;
}

/* Header */
#ww-header {
  background: #075e54;
  padding: .9rem 1.1rem;
  display: flex;
  align-items: center;
  gap: .75rem;
  color: white;
}
#ww-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
#ww-header strong { display:block; font-size:.9rem; font-weight:600; }
#ww-header .ww-role { font-size:.72rem; opacity:.85; display:flex; align-items:center; gap:.3rem; }
.ww-dot {
  width:7px; height:7px; border-radius:50%; background:#4ade80;
  animation: wwPulse 2s infinite;
}
#ww-close-btn {
  background: none; border: none; cursor: pointer;
  padding: 4px; opacity: .7; transition: opacity .2s;
  display: flex; align-items: center; margin-left: auto;
}
#ww-close-btn:hover { opacity: 1; }

/* Body */
#ww-body {
  height: 290px;
  overflow-y: auto;
  padding: .85rem;
  display: flex;
  flex-direction: column;
  gap: .4rem;
  scroll-behavior: smooth;
  background: #ece5dd;
}
#ww-body::-webkit-scrollbar { width:3px; }
#ww-body::-webkit-scrollbar-thumb { background:rgba(0,0,0,.15); border-radius:2px; }

/* Burbujas */
.ww-bbl {
  max-width: 82%;
  padding: .5rem .8rem;
  border-radius: 12px;
  font-size: .84rem;
  line-height: 1.5;
  word-break: break-word;
  animation: wwPop .22s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.1);
}
@keyframes wwPop {
  from { opacity:0; transform:scale(.94) translateY(5px); }
  to   { opacity:1; transform:scale(1)   translateY(0); }
}
.ww-bbl--bot  { background:white;   color:#1d1d1f; align-self:flex-start; border-top-left-radius:2px; }
.ww-bbl--user { background:#dcf8c6; color:#1d1d1f; align-self:flex-end;   border-top-right-radius:2px; }

/* Typing */
.ww-typing {
  display:flex; gap:4px; align-items:center;
  background:white; padding:.55rem .8rem;
  border-radius:12px; border-top-left-radius:2px;
  align-self:flex-start; box-shadow:0 1px 2px rgba(0,0,0,.1);
}
.ww-typing span {
  width:6px; height:6px; border-radius:50%; background:#aaa;
  animation: wwDot 1.1s ease infinite;
}
.ww-typing span:nth-child(2){ animation-delay:.18s; }
.ww-typing span:nth-child(3){ animation-delay:.36s; }
@keyframes wwDot {
  0%,80%,100%{ transform:translateY(0);   opacity:.4; }
  40%         { transform:translateY(-5px); opacity:1;  }
}

/* Input */
.ww-row {
  display:flex; gap:.35rem; align-self:stretch;
  animation: wwPop .22s ease;
}
.ww-inp {
  flex:1; padding:.48rem .8rem;
  border:1.5px solid #ddd; border-radius:20px;
  font-size:.84rem; outline:none;
  transition:border-color .2s;
  background:white; color:#1d1d1f;
  font-family: inherit;
}
.ww-inp:focus { border-color:#25d366; }
.ww-sbtn {
  width:36px; height:36px; border-radius:50%;
  background:#25d366; color:white; border:none;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:background .2s, transform .15s;
}
.ww-sbtn:hover { background:#1ebe5a; transform:scale(1.06); }

/* CTA final */
.ww-cta {
  display:flex; align-items:center; justify-content:center; gap:.5rem;
  background:#25d366; color:white; text-decoration:none;
  border-radius:10px; padding:.7rem; font-size:.87rem; font-weight:600;
  align-self:stretch; margin-top:.2rem;
  transition:background .2s, transform .15s;
  animation: wwPop .25s ease;
}
.ww-cta:hover { background:#1ebe5a; color:white; transform:scale(1.01); }

/* Reiniciar */
.ww-restart {
  align-self:center; background:none; border:none;
  color:#999; font-size:.74rem; cursor:pointer;
  text-decoration:underline; padding:.25rem;
  font-family: inherit;
}

/* Footer */
#ww-footer {
  background:#f0f0f0; text-align:center;
  font-size:.68rem; color:#aaa; padding:.4rem;
}

/* Responsive */
@media (max-width:480px) {
  #ww-root { right:.75rem; bottom:.75rem; }
  #ww-panel { width: calc(100vw - 1.5rem); }
  #ww-body { height:250px; }
}
    `;
    document.head.appendChild(s);
  }

  /* ── DOM ─────────────────────────────────────────── */
  function createDOM() {
    const root = document.createElement('div');
    root.id = 'ww-root';

    /* Panel de chat */
    const panel = document.createElement('div');
    panel.id = 'ww-panel';
    panel.innerHTML = `
      <div id="ww-header">
        <div id="ww-avatar">
          <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <strong>${CONFIG.agentName}</strong>
          <div class="ww-role"><span class="ww-dot"></span>${CONFIG.agentRole}</div>
        </div>
        <button id="ww-close-btn" aria-label="Cerrar">${SVG_CLOSE}</button>
      </div>
      <div id="ww-body"></div>
      <div id="ww-footer">Tus datos solo se usan para contactarte · WhatsApp</div>
    `;

    /* FAB + hint */
    const hint = document.createElement('div');
    hint.id = 'ww-hint';
    hint.textContent = CONFIG.hintText;

    const fab = document.createElement('button');
    fab.id = 'ww-fab';
    fab.setAttribute('aria-label', 'Abrir chat WhatsApp');
    fab.innerHTML = `
      <span id="ww-badge">1</span>
      <span class="ww-ico-open">
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </span>
      <span class="ww-ico-close">${SVG_CLOSE}</span>
    `;

    root.appendChild(panel);
    root.appendChild(hint);
    root.appendChild(fab);
    document.body.appendChild(root);

    /* Eventos */
    fab.addEventListener('click', () => toggle());
    hint.addEventListener('click', () => toggle(true));
    document.getElementById('ww-close-btn').addEventListener('click', () => toggle(false));

    /* Ocultar hint tras 7s */
    setTimeout(() => {
      hint.style.opacity = '0';
      setTimeout(() => hint.remove(), 500);
    }, 7000);

    /* Auto-abrir */
    if (CONFIG.openDelay > 0) {
      setTimeout(() => { if (!st.open) toggle(true); }, CONFIG.openDelay);
    }
  }

  /* ── INIT ─────────────────────────────────────────── */
  function init() {
    if ($('ww-root')) return;
    injectStyles();
    createDOM();
    console.log('✅ WhatsApp Widget — Mark Publicidad cargado');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
