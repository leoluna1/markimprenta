/**
 * SettingsController
 * Carga videos y redes sociales desde /api/settings
 * y los renderiza en el frontend.
 */
export default class SettingsController {

  async init() {
    try {
      const r = await fetch('/api/settings', { cache: 'no-store' });
      if (!r.ok) return;
      const settings = await r.json();
      this._applySocialMedia(settings.socialMedia || {});
      this._renderVideos(settings.videos || []);
    } catch (e) {
      console.warn('[Settings] No se pudo cargar /api/settings:', e);
    }
  }

  // ── Redes sociales ──────────────────────────────
  _applySocialMedia(social) {
    const map = {
      youtube:   '#sl-youtube',
      instagram: '#sl-instagram',
      tiktok:    '#sl-tiktok',
      facebook:  '#sl-facebook',
      whatsapp:  '#sl-whatsapp',
      twitter:   '#sl-twitter',
      linkedin:  '#sl-linkedin',
    };
    Object.entries(map).forEach(([key, selector]) => {
      if (!social[key]) return;
      const el = document.querySelector(selector);
      if (el) el.href = social[key];
    });
    // Botón CTA "Ver canal completo"
    if (social.youtube) {
      const cta = document.getElementById('cta-youtube-btn');
      if (cta) cta.href = social.youtube;
    }
  }

  // ── Videos ──────────────────────────────────────
  _renderVideos(videos) {
    const grid = document.getElementById('videos-grid-dynamic');
    if (!grid) return;

    const activos = videos.filter(v => {
      if (v.active === false) return false;
      if (v.type === 'local') return !!v.url;
      return v.youtubeId && !v.youtubeId.startsWith('REEMPLAZA');
    });

    if (!activos.length) { grid.innerHTML = ''; return; }

    grid.innerHTML = activos.map(v => this._videoCard(v)).join('');
    this._bindPlayButtons();
  }

  _videoCard(v) {
    const icon = v.tagIcon || 'fa-video';
    const info = `
      <div class="video-info">
        ${v.tag ? `<span class="video-tag"><i class="fas ${icon}"></i> ${this._esc(v.tag)}</span>` : ''}
        <h4>${this._esc(v.title || '')}</h4>
        ${v.description ? `<p class="video-desc">${this._esc(v.description)}</p>` : ''}
      </div>`;

    if (v.type === 'local') {
      return `
        <div class="video-card">
          <div class="video-wrapper local-video-wrapper" data-url="${this._esc(v.url)}">
            <video class="local-video" src="${this._esc(v.url)}" preload="metadata"
              style="width:100%;height:100%;object-fit:cover;display:none;"
              playsinline></video>
            <div class="video-overlay"></div>
            <button class="play-btn" aria-label="Reproducir">
              <i class="fas fa-play"></i>
            </button>
          </div>
          ${info}
        </div>`;
    }

    const thumb     = `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`;
    const thumbFall = `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`;
    return `
      <div class="video-card">
        <div class="video-wrapper" data-id="${this._esc(v.youtubeId)}">
          <img class="video-thumb"
            src="${thumb}"
            onerror="this.src='${thumbFall}'"
            alt="${this._esc(v.title || '')}">
          <div class="video-overlay"></div>
          <button class="play-btn" aria-label="Reproducir">
            <i class="fab fa-youtube"></i>
          </button>
          <iframe
            title="${this._esc(v.title || '')}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
        ${info}
      </div>`;
  }

  _bindPlayButtons() {
    // YouTube
    document.querySelectorAll('#videos-grid-dynamic .video-wrapper[data-id]').forEach(wrapper => {
      const videoId = wrapper.dataset.id;
      if (!videoId) return;
      wrapper.addEventListener('click', () => {
        if (wrapper.classList.contains('playing')) return;
        const iframe = wrapper.querySelector('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        wrapper.classList.add('playing');
      });
    });

    // Videos locales
    document.querySelectorAll('#videos-grid-dynamic .local-video-wrapper').forEach(wrapper => {
      wrapper.addEventListener('click', () => {
        const video   = wrapper.querySelector('video');
        const overlay = wrapper.querySelector('.video-overlay');
        const btn     = wrapper.querySelector('.play-btn');
        if (wrapper.classList.contains('playing')) {
          video.paused ? video.play() : video.pause();
          return;
        }
        video.style.display = 'block';
        if (overlay) overlay.style.display = 'none';
        if (btn)     btn.style.display     = 'none';
        wrapper.classList.add('playing');
        video.play();
      });
    });
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
