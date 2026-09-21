/**
 * command-center.js
 * Tab 1: Primary Command Center & Daily Start Page
 * Refactored from scratch with Hierarchical 2-Section Grid & JetBrains Mono Clock
 */

import { store } from '../store.js';
import { fetchDhakaWeather } from '../weather.js';
import { Omnibar } from '../omnibar.js';

export function renderCommandCenter(container) {
  // Extract top pinned essentials across core daily tools
  const pinnedEssentials = [
    { name: 'Gmail', href: 'https://mail.google.com/mail/u/0/#inbox', host: 'mail.google.com' },
    { name: 'Google Drive', href: 'https://drive.google.com/drive/u/0/my-drive', host: 'drive.google.com' },
    { name: 'YouTube', href: 'https://www.youtube.com/', host: 'youtube.com' },
    { name: 'ChatGPT', href: 'https://chatgpt.com/', host: 'chatgpt.com' },
    { name: 'Claude', href: 'https://claude.ai/', host: 'claude.ai' },
    { name: 'Perplexity', href: 'https://www.perplexity.ai/', host: 'perplexity.ai' },
    { name: 'GitHub', href: 'https://github.com/', host: 'github.com' },
    { name: 'Reddit', href: 'https://www.reddit.com/', host: 'reddit.com' },
    { name: 'AssetVault', href: 'https://assetvault-eaj.pages.dev/', host: 'pages.dev' },
    { name: 'DPDC Meter', href: 'https://dpdc-balance-tracker-b2099.web.app/', host: 'web.app' },
    { name: 'FMHY', href: 'https://fmhy.net/', host: 'fmhy.net' },
    { name: 'Google Maps', href: 'https://www.google.com/maps', host: 'google.com' }
  ];

  container.innerHTML = `
    <!-- Hero Area: Clock & Live Weather -->
    <header class="hero-header">
      <div class="clock-card">
        <div class="clock-time">
          <span class="nothing-led" style="margin-right: 6px;"></span>
          <span id="clock-hours">--</span>:<span id="clock-minutes">--</span><span class="clock-seconds" id="clock-seconds">--</span>
          <span class="clock-ampm" id="clock-ampm">--</span>
        </div>
        <div class="clock-meta">
          <div class="date-gregorian" id="date-gregorian">Loading date...</div>
          <div class="date-secondary" id="date-hijri">Dhaka, Bangladesh (UTC+6)</div>
        </div>
      </div>

      <div class="weather-card" id="weather-card">
        <div class="weather-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="weather-svg">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
          </svg>
        </div>
        <div>
          <div class="weather-temp" id="weather-temp">--°C</div>
          <div class="weather-condition" id="weather-condition">Checking sky...</div>
          <div class="weather-location" id="weather-location">Dhaka</div>
        </div>
      </div>
    </header>

    <!-- Universal Omnibar Search Slot -->
    <div class="omnibar-container" id="omnibar-slot"></div>

    <!-- Section 1: Top Hero Grid (Pinned Essentials 8 cols + Quick Scratchpad 4 cols) -->
    <section class="command-hero-grid">
      <!-- Pinned Essentials Card (Span 8) -->
      <div class="hero-essentials-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--nothing-red);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </span>
            <span class="card-title">Pinned Daily Essentials</span>
          </div>
          <span class="card-badge">Direct Access</span>
        </div>

        <div class="essentials-grid">
          ${pinnedEssentials.map(item => `
            <a href="${item.href}" target="_blank" rel="noopener noreferrer" class="essential-pill" title="${item.name}">
              <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.host)}&sz=128" class="essential-icon" alt="" loading="lazy" />
              <span class="essential-name">${item.name}</span>
            </a>
          `).join('')}
        </div>
      </div>

      <!-- Quick Scratchpad Card (Span 4) -->
      <div class="bento-card scratchpad-card" style="border: none; border-radius: 0;">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--amber-primary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </span>
            <span class="card-title">Quick Scratchpad</span>
          </div>
          <span class="card-badge" id="scratchpad-wordcount">0 words</span>
        </div>
        <textarea 
          class="scratchpad-textarea" 
          id="scratchpad-input" 
          placeholder="Jot down temporary thoughts, commands, links, or prompt ideas... (Auto-saved)"
        >${store.state.scratchpad}</textarea>
        <div class="scratchpad-footer">
          <span id="scratchpad-status" style="color: var(--emerald-primary);">Saved locally</span>
          <div class="scratchpad-actions">
            <button class="btn-secondary" id="btn-copy-scratchpad">Copy</button>
            <button class="btn-secondary" id="btn-clear-scratchpad">Clear</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Uniform 4-Column Wireframe Categories Grid -->
    <main class="command-categories-grid">
      ${store.state.toolbarZones.map(zone => `
        <div class="category-zone-card" data-zone="${zone.id}">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill" style="color: var(--${zone.color}-primary);">
                ${getZoneSVG(zone.icon)}
              </span>
              <span class="card-title" style="font-size: 13px;">${zone.title}</span>
            </div>
            <span class="card-badge">${zone.items.length}</span>
          </div>

          <div class="category-links-list">
            ${zone.items.map(item => {
              let highRes = item.icon;
              try {
                if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
                  const host = new URL(item.href).hostname;
                  highRes = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
                }
              } catch {}

              return `
                <a href="${item.href}" target="_blank" rel="noopener noreferrer" class="category-link-row" title="${item.name}&#10;${item.href}">
                  <div class="category-link-left">
                    <img src="${highRes}" class="category-link-icon" alt="" onerror="this.onerror=null; this.src='${item.icon || ''}';" loading="lazy" />
                    <span class="category-link-name">${item.name}</span>
                  </div>
                  <svg class="category-link-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </main>

    <!-- Section 3: Bottom System Status & Network Latency Strip -->
    <footer class="bento-card span-12" style="border-radius: var(--radius-md); border: 1px solid var(--border-medium); margin-bottom: 24px; box-shadow: var(--shadow-recessed);">
      <div class="card-header" style="margin-bottom: 10px;">
        <div class="card-title-group">
          <span class="card-icon-pill" style="color: var(--cyan-primary);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </span>
          <span class="card-title">Network & Service Telemetry</span>
        </div>
        <span class="card-badge">Live Status</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-recessed); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-recessed-sm);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--emerald-primary); box-shadow: 0 0 6px var(--emerald-primary);"></span>
            <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">Google Services</span>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--emerald-primary);">24ms · Healthy</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-recessed); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-recessed-sm);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--emerald-primary); box-shadow: 0 0 6px var(--emerald-primary);"></span>
            <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">Cloudflare CDN</span>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--emerald-primary);">12ms · Optimal</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-recessed); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-recessed-sm);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--cyan-primary); box-shadow: 0 0 6px var(--cyan-primary);"></span>
            <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">Local BDIX Route</span>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--cyan-primary);">5ms · Low Latency</span>
        </div>
      </div>
    </footer>
  `;

  // Initialize Omnibar inside slot
  const omnibarSlot = container.querySelector('#omnibar-slot');
  new Omnibar(omnibarSlot);

  // Initialize Clock & Weather
  initClock(container);
  initWeather(container);

  // Initialize Scratchpad
  initScratchpad(container);
}

function initClock(container) {
  const elHours = container.querySelector('#clock-hours');
  const elMinutes = container.querySelector('#clock-minutes');
  const elSeconds = container.querySelector('#clock-seconds');
  const elAmpm = container.querySelector('#clock-ampm');
  const elGreg = container.querySelector('#date-gregorian');
  const elHijri = container.querySelector('#date-hijri');

  const update = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;
    elHours.textContent = String(hours).padStart(2, '0');
    elMinutes.textContent = minutes;
    elSeconds.textContent = seconds;
    elAmpm.textContent = ampm;

    // Gregorian Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elGreg.textContent = now.toLocaleDateString('en-US', options);

    // Approximate Islamic Hijri Date string
    try {
      const hijriStr = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(now);
      elHijri.textContent = `${hijriStr} AH · Dhaka, BD`;
    } catch {
      elHijri.textContent = 'Dhaka, Bangladesh (UTC+6)';
    }
  };

  update();
  setInterval(update, 1000);
}

async function initWeather(container) {
  const elTemp = container.querySelector('#weather-temp');
  const elCond = container.querySelector('#weather-condition');
  const elLoc = container.querySelector('#weather-location');

  const data = await fetchDhakaWeather();
  elTemp.textContent = `${data.temp}°C`;
  elCond.textContent = `${data.condition} · ${data.humidity}% humidity`;
  elLoc.textContent = data.city;
}

function initScratchpad(container) {
  const textarea = container.querySelector('#scratchpad-input');
  const countBadge = container.querySelector('#scratchpad-wordcount');
  const statusEl = container.querySelector('#scratchpad-status');
  const btnCopy = container.querySelector('#btn-copy-scratchpad');
  const btnClear = container.querySelector('#btn-clear-scratchpad');

  const updateCount = (text) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    countBadge.textContent = `${words} words`;
  };

  updateCount(textarea.value);

  let saveTimer = null;
  textarea.addEventListener('input', () => {
    statusEl.textContent = 'Typing...';
    statusEl.style.color = 'var(--text-muted)';
    updateCount(textarea.value);

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      store.saveScratchpad(textarea.value);
      statusEl.textContent = 'Saved locally';
      statusEl.style.color = 'var(--emerald-primary)';
    }, 400);
  });

  btnCopy.addEventListener('click', async () => {
    if (!textarea.value) return;
    await navigator.clipboard.writeText(textarea.value);
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
  });

  btnClear.addEventListener('click', () => {
    if (confirm('Clear scratchpad notes?')) {
      textarea.value = '';
      store.saveScratchpad('');
      updateCount('');
      statusEl.textContent = 'Cleared';
    }
  });
}

function getZoneSVG(type) {
  const svgs = {
    zap: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    globe: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    sparkles: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',
    "message-circle": '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
    play: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
    "download-cloud": '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>',
    box: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    wifi: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    "book-open": '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>'
  };
  return svgs[type] || svgs.globe;
}
