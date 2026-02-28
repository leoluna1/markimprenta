/**
 * =====================================================
 * MARK PUBLICIDAD — WhatsApp Chat Widget (Simple)
 * 3 preguntas → abre WhatsApp con el pedido listo
 * =====================================================
 * CONFIGURACIÓN: edita el objeto CONFIG.
 * =====================================================
 */
(function () {
  'use strict';

  /* ── CONFIGURA AQUÍ ─────────────────────────────── */
  const CONFIG = {
    phone:      '593996884150',   // Tu número sin + ni espacios
    agentName:  'Mark Publicidad',
    agentRole:  'Respondemos en minutos',
    openDelay:  5000,             // ms hasta auto-abrir (0 = desactivado)
    hintText:   '¿Necesitas un presupuesto? ¡Escríbenos! 👋',
  };

  /* ── PASOS (nombre → teléfono → necesidad) ─────── */
  const STEPS = [
    {
      bot:         '¡Hola! 👋 Soy el asistente de *Mark Publicidad*.\n¿Cuál es tu nombre?',
      type:        'input',
      placeholder: 'Escribe tu nombre...',
      key:         'name',
    },
    {
      bot:         '¡Mucho gusto, {name}! 😊\n¿Cuál es tu número de teléfono o WhatsApp?',
      type:        'input',
      placeholder: 'Ej: 0987 654 321',
      key:         'phone',
    },
    {
      bot:         '¿Qué necesitas? Cuéntame brevemente.',
      type:        'input',
      placeholder: 'Ej: 500 flyers tamaño A5...',
      key:         'need',
    },
  ];

  /* ─────────────────────────────────────────────────
     Estado
  ───────────────────────────────────────────────── */
  const state = { open: false, step: 0, data: {} };

  /* ── Helpers ── */
  function fill(str) {
    return str.replace(/\{(\w+)\}/g, (_, k) => state.data[k] || '');
  }

  function buildWAMsg() {
    const d = state.data;
    return (
      `Hola ${CONFIG.agentName}! 👋\n\n` +
      `📛 *Nombre:* ${d.name || '–'}\n` +
      `📱 *Teléfono:* ${d.phone || '–'}\n` +
      `📋 *Necesita:* ${d.need || '–'}\n\n` +
      `Por favor, envíenme más información y precio. ¡Gracias!`
    );
  }

  function waURL() {
    return `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(buildWAMsg())}`;
  }

  /* ── Render ── */
  function body() { return document.getElementById('ww-body'); }

  function addBubble(text, who) {
    const d = document.createElement('div');
    d.className = `ww-bubble ww-bubble--${who}`;
    // bold con *texto*
    d.innerHTML = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    body().appendChild(d);
    scrollBot();
    return d;
  }

  function showTyping() {
    const t = document.createElement('div');
    t.className = 'ww-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    body().appendChild(t);
    scrollBot();
    return t;
  }

  function scrollBot() {
    const b = body();
    if (b) b.scrollTop = b.scrollHeight;
  }

  /* ── Mostrar paso actual ── */
  function renderStep() {
    const idx = state.step;
    if (idx >= STEPS.length) return showFinal();
    const step = STEPS[idx];

    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addBubble(fill(step.bot), 'bot');

      // Campo de texto
      const row = document.createElement('div');
      row.className = 'ww-input-row';

      const inp = document.createElement('input');
      inp.type = step.key === 'phone' ? 'tel' : 'text';
      inp.className = 'ww-text-input';
      inp.placeholder = step.placeholder;
      inp.maxLength = 100;

      const btn = document.createElement('button');
      btn.className = 'ww-send-btn';
      btn.setAttribute('aria-label', 'Enviar');
      btn.innerHTML = SVG_SEND;

      function submit() {
        const val = inp.value.trim();
        if (!val) { inp.focus(); return; }
        row.style.pointerEvents = 'none';
        row.style.opacity = '0.5';
        addBubble(val, 'user');
        state.data[step.key] = val;
        state.step++;
        setTimeout(renderStep, 500);
      }

      btn.addEventListener('click', submit);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

      row.appendChild(inp);
      row.appendChild(btn);
      body().appendChild(row);
      scrollBot();
      setTimeout(() => inp.focus(), 80);
    }, 700);
  }

  /* ── Pantalla final ── */
  function showFinal() {
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addBubble(`¡Perfecto, ${state.data.name || ''}! 🎉\nTe conectamos con nuestro equipo ahora mismo.`, 'bot');

      setTimeout(() => {
        const a = document.createElement('a');
        a.className = 'ww-wa-cta';
        a.href = waURL();
        a.target = '_blank';
        a.rel = 'noopener';
        a.innerHTML = `${SVG_WA}<span>Abrir WhatsApp ahora</span>`;
        a.addEventListener('click', () => setTimeout(() => toggleWidget(false), 300));
        body().appendChild(a);

        const redo = document.createElement('button');
        redo.className = 'ww-restart';
        redo.textContent = '↩ Empezar de nuevo';
        redo.addEventListener('click', () => {
          state.step = 0; state.data = {};
          body().innerHTML = '';
          renderStep();
        });
        body().appendChild(redo);
        scrollBot();
      }, 300);
    }, 700);
  }

  /* ── Abrir / cerrar ── */
  function toggleWidget(forceOpen) {
    const widget = document.getElementById('ww-widget');
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !state.open;
    state.open = shouldOpen;

    widget.classList.toggle('ww-open', shouldOpen);
    document.getElementById('ww-badge').style.display = shouldOpen ? 'none' : '';

    if (shouldOpen && body().children.length === 0) {
      renderStep();
    }
  }

  /* ── SVG inline ── */
  const SVG_SEND = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
  const SVG_WA   = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  const SVG_CLOSE = `<svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  /* ── CSS ── */
  function injectStyles() {
    document.head.insertAdjacentHTML('beforeend', `<style id="ww-styles">
/* ═══ WhatsApp Widget ═══════════════════════════════ */
#ww-launcher {
  position: fixed; bottom: 1.5rem; right: 1.5rem;
  z-index: 9990; display: flex; flex-direction: column;
  align-items: flex-end; gap: 0.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Burbuja hint */
#ww-hint {
  background: white; color: #1d1d1f;
  font-size: 0.82rem; font-weight: 500;
  padding: 0.5rem 0.9rem;
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.13);
  cursor: pointer; white-space: nowrap;
  animation: wwSlide .35s ease;
  transition: opacity .4s ease;
}
@keyframes wwSlide {
  from { opacity:0; transform: translateX(10px); }
  to   { opacity:1; transform: translateX(0); }
}

/* FAB */
#ww-fab {
  width: 56px; height: 56px; border-radius: 50%;
  background: #25d366; border: none; cursor: pointer;
  box-shadow: 0 4px 18px rgba(37,211,102,.45);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  transition: transform .2s ease, box-shadow .2s ease;
}
#ww-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(37,211,102,.55); }
#ww-badge {
  position: absolute; top: -4px; right: -4px;
  width: 19px; height: 19px; border-radius: 50%;
  background: #e74c3c; color: white;
  font-size: .65rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid white;
  animation: wwPulse 2s ease infinite;
}
@keyframes wwPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }

#ww-fab-open  { display: flex; }
#ww-fab-close { display: none; align-items:center; justify-content:center; }
#ww-widget.ww-open #ww-fab-open  { display: none; }
#ww-widget.ww-open #ww-fab-close { display: flex; }

/* Panel */
#ww-panel {
  position: fixed; bottom: 5.25rem; right: 1.5rem;
  width: 320px; max-width: calc(100vw - 2rem);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 12px 44px rgba(0,0,0,.18);
  z-index: 9991;
  transform: scale(.88) translateY(16px);
  transform-origin: bottom right;
  opacity: 0; pointer-events: none;
  transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .22s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
#ww-widget.ww-open #ww-panel {
  transform: scale(1) translateY(0);
  opacity: 1; pointer-events: all;
}

/* Header */
#ww-header {
  background: #075e54; padding: .9rem 1.1rem;
  display: flex; align-items: center; gap: .75rem; color: white;
}
#ww-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; flex-shrink: 0;
}
#ww-header strong { display: block; font-size: .9rem; font-weight: 600; }
#ww-header span   { font-size: .72rem; opacity: .85; display:flex; align-items:center; gap:.3rem; }
.ww-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #4ade80;
  animation: wwPulse 2s ease infinite;
}

/* Body */
#ww-body {
  height: 290px; overflow-y: auto; padding: .85rem;
  display: flex; flex-direction: column; gap: .4rem;
  scroll-behavior: smooth;
  background: #ece5dd url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23b8a99a' fill-opacity='.1'%3E%3Ccircle cx='20' cy='20' r='3'/%3E%3C/g%3E%3C/svg%3E");
}
#ww-body::-webkit-scrollbar { width: 3px; }
#ww-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 2px; }

/* Burbujas */
.ww-bubble {
  max-width: 82%; padding: .5rem .8rem;
  border-radius: 12px; font-size: .84rem; line-height: 1.5;
  word-break: break-word;
  animation: wwPop .22s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.1);
}
@keyframes wwPop {
  from { opacity:0; transform: scale(.94) translateY(5px); }
  to   { opacity:1; transform: scale(1)   translateY(0); }
}
.ww-bubble--bot  { background: white;   color:#1d1d1f; align-self:flex-start; border-top-left-radius:2px;  }
.ww-bubble--user { background: #dcf8c6; color:#1d1d1f; align-self:flex-end;   border-top-right-radius:2px; }

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

/* Input row */
.ww-input-row {
  display:flex; gap:.35rem; align-self:stretch;
  animation: wwPop .22s ease; margin-top:.15rem;
}
.ww-text-input {
  flex:1; padding:.48rem .8rem;
  border:1.5px solid #ddd; border-radius:20px;
  font-size:.84rem; outline:none;
  transition:border-color .2s; background:white; color:#1d1d1f;
}
.ww-text-input:focus { border-color:#25d366; }
.ww-send-btn {
  width:36px; height:36px; border-radius:50%;
  background:#25d366; color:white; border:none;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:background .2s, transform .15s;
}
.ww-send-btn:hover { background:#1ebe5a; transform:scale(1.06); }

/* CTA final */
.ww-wa-cta {
  display:flex; align-items:center; justify-content:center; gap:.5rem;
  background:#25d366; color:white; text-decoration:none;
  border-radius:10px; padding:.7rem; font-size:.87rem; font-weight:600;
  align-self:stretch; margin-top:.2rem;
  transition:background .2s, transform .15s;
  animation: wwPop .25s ease;
}
.ww-wa-cta:hover { background:#1ebe5a; color:white; transform:scale(1.01); }

/* Reiniciar */
.ww-restart {
  align-self:center; background:none; border:none;
  color:#999; font-size:.74rem; cursor:pointer; text-decoration:underline;
  padding:.25rem; transition:color .2s;
}
.ww-restart:hover { color:#555; }

/* Footer */
#ww-footer {
  background:#f0f0f0; text-align:center;
  font-size:.68rem; color:#aaa; padding:.35rem;
}

/* Responsive */
@media (max-width:480px) {
  #ww-panel { right:.75rem; width:calc(100vw - 1.5rem); bottom:4.75rem; }
  #ww-launcher { right:.75rem; bottom:.75rem; }
  #ww-body { height:260px; }
}

/* Dark mode */
[data-theme="dark"] #ww-body        { background-color:#1c1c1e; background-image:none; }
[data-theme="dark"] .ww-bubble--bot { background:#2c2c2e; color:#f5f5f7; }
[data-theme="dark"] .ww-typing      { background:#2c2c2e; }
[data-theme="dark"] .ww-text-input  { background:#2c2c2e; color:#f5f5f7; border-color:#444; }
[data-theme="dark"] #ww-footer      { background:#1a1a1a; color:#666; }
</style>`);
  }

  /* ── DOM ── */
  function createDOM() {
    // Launcher
    const launcher = document.createElement('div');
    launcher.id = 'ww-launcher';
    launcher.innerHTML = `
      <div id="ww-hint">${CONFIG.hintText}</div>
      <button id="ww-fab" aria-label="Abrir chat">
        <span id="ww-badge">1</span>
        <span id="ww-fab-open">
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </span>
        <span id="ww-fab-close">${SVG_CLOSE}</span>
      </button>`;

    // Panel
    const panel = document.createElement('div');
    panel.id = 'ww-panel';
    panel.innerHTML = `
      <div id="ww-header">
        <div id="ww-avatar">🖨️</div>
        <div>
          <strong>${CONFIG.agentName}</strong>
          <span><span class="ww-dot"></span>${CONFIG.agentRole}</span>
        </div>
      </div>
      <div id="ww-body"></div>
      <div id="ww-footer">Tus datos solo se usan para contactarte · WhatsApp</div>`;

    const widget = document.createElement('div');
    widget.id = 'ww-widget';
    widget.appendChild(panel);

    document.body.appendChild(widget);
    document.body.appendChild(launcher);

    // Eventos
    document.getElementById('ww-fab').addEventListener('click', () => toggleWidget());
    document.getElementById('ww-hint').addEventListener('click', () => toggleWidget(true));

    // Ocultar hint tras 7s
    setTimeout(() => {
      const h = document.getElementById('ww-hint');
      if (h) { h.style.opacity = '0'; setTimeout(() => h.remove(), 500); }
    }, 7000);

    // Auto-abrir
    if (CONFIG.openDelay > 0) {
      setTimeout(() => { if (!state.open) toggleWidget(true); }, CONFIG.openDelay);
    }
  }

  /* ── Init ── */
  function init() {
    if (document.getElementById('ww-launcher')) return;
    injectStyles();
    createDOM();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
