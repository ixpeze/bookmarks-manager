/**
 * command-center.js
 * Deck — Tab 1: Executive Desktop Cockpit & Daily Command Center
 * 
 * Includes:
 * 1. Dhaka Clock & Live Weather + Hardware Telemetry (CPU, RAM, C: & D: Disks, Bridge Status).
 * 2. Universal Omnibar Search with Everything 1.5 desktop file integration.
 * 3. Desktop Launch Deck: 1-click apps (UE5, 3ds Max, Photoshop, Blender, PureRef, VS Code).
 * 4. Quick Folders Jump List: 1-click Explorer access (Projects, Downloads, Assets, Drive, ComfyUI).
 * 5. Hot Projects Shelf: HTML5 Drag & Drop + Native File Dialog + Everything 1.5 auto-resolve.
 * 6. Pinned Daily Essentials & Quick Scratchpad.
 * 7. Bento Categories Grid.
 */

import { store } from '../core/store.js';
import { fetchDhakaWeather } from '../services/weather.js';
import { Omnibar } from '../services/omnibar.js';

export function renderCommandCenter(container) {
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
    <!-- Top Cockpit Header: Clock, Weather & Real-Time Hardware Telemetry -->
    <header class="hero-header cockpit-hero-header">
      <!-- Clock Card -->
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

      <!-- Live Hardware Telemetry Cockpit Pill -->
      <div class="telemetry-card" id="cockpit-telemetry">
        <div class="telemetry-header">
          <div class="telemetry-bridge-status" id="bridge-status-pill">
            <span class="status-dot offline" id="bridge-status-dot"></span>
            <span id="bridge-status-text">Bridge Offline</span>
          </div>
          <span class="telemetry-sub" id="telemetry-engine-sub">Connecting localhost:8080...</span>
        </div>

        <div class="telemetry-meters-row">
          <!-- CPU Meter -->
          <div class="meter-item">
            <div class="meter-label">
              <span>CPU</span>
              <span id="meter-cpu-val">--%</span>
            </div>
            <div class="meter-bar-track">
              <div class="meter-bar-fill" id="meter-cpu-bar" style="width: 0%;"></div>
            </div>
          </div>

          <!-- RAM Meter -->
          <div class="meter-item">
            <div class="meter-label">
              <span>RAM</span>
              <span id="meter-ram-val">--%</span>
            </div>
            <div class="meter-bar-track">
              <div class="meter-bar-fill" id="meter-ram-bar" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Disk C Meter -->
          <div class="meter-item">
            <div class="meter-label">
              <span>DISK C:</span>
              <span id="meter-disk-c-val">-- GB</span>
            </div>
            <div class="meter-bar-track">
              <div class="meter-bar-fill" id="meter-disk-c-bar" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Disk D Meter -->
          <div class="meter-item">
            <div class="meter-label">
              <span>DISK D:</span>
              <span id="meter-disk-d-val">-- GB</span>
            </div>
            <div class="meter-bar-track">
              <div class="meter-bar-fill" id="meter-disk-d-bar" style="width: 0%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Weather Card -->
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

    <!-- Desktop Apps Launch Deck & Quick Folders Jump List -->
    <section class="desktop-launch-section">
      <!-- 1. Desktop Apps Launch Deck -->
      <div class="bento-card launch-deck-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--cyan-primary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="m9 8 6 4-6 4Z"></path>
              </svg>
            </span>
            <span class="card-title">Desktop Apps Launch Deck</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="icon-tiny-btn" id="btn-configure-apps" title="Configure Executable Paths">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <span class="card-badge">1-Click Launch</span>
          </div>
        </div>

        <div class="launch-deck-grid" id="apps-launch-grid">
          <!-- Populated dynamically from bridge config -->
        </div>
      </div>

      <!-- 2. Quick Folders Jump List -->
      <div class="bento-card quick-folders-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--amber-primary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
              </svg>
            </span>
            <span class="card-title">Quick Folders Jump List</span>
          </div>
          <span class="card-badge">Explorer Jump</span>
        </div>

        <div class="quick-folders-list" id="quick-folders-grid">
          <!-- Populated dynamically from bridge config -->
        </div>
      </div>
    </section>

    <!-- Hot Projects Shelf (Drag-and-Drop + Native Picker) -->
    <section class="hot-projects-section">
      <div class="bento-card hot-projects-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--emerald-primary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
              </svg>
            </span>
            <span class="card-title">Hot Projects Shelf</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn-secondary" id="btn-add-hot-project" style="font-size: 11px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 5px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Project
            </button>
            <span class="card-badge" id="hot-projects-count">0 Projects</span>
          </div>
        </div>

        <!-- HTML5 Drag & Drop Zone -->
        <div class="hot-projects-dropzone" id="hot-projects-dropzone">
          <div class="dropzone-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="dropzone-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span class="dropzone-text">Drag & drop <code>.uproject</code>, <code>.max</code>, <code>.blend</code>, <code>.psd</code>, <code>.pur</code> files here to pin</span>
          </div>
        </div>

        <!-- Shelf Cards Grid -->
        <div class="hot-projects-grid" id="hot-projects-grid">
          <!-- Dynamically populated -->
        </div>
      </div>
    </section>

    <!-- Daily Essentials & Quick Scratchpad Grid -->
    <section class="command-hero-grid">
      <!-- Pinned Daily Essentials (Span 8) -->
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
      <div class="bento-card scratchpad-card">
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
        >${store.state.scratchpad || ''}</textarea>
        <div class="scratchpad-footer">
          <span id="scratchpad-status" style="color: var(--emerald-primary);">Saved locally</span>
          <div class="scratchpad-actions">
            <button class="btn-secondary" id="btn-copy-scratchpad">Copy</button>
            <button class="btn-secondary" id="btn-clear-scratchpad">Clear</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Bento Categories Grid -->
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="category-link-arrow">
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

    <!-- App Configuration Modal -->
    <div class="modal-overlay" id="bridge-config-modal">
      <div class="modal-box" style="max-width: 600px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="card-title" style="font-size: 16px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--cyan-primary);">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Desktop App & Folder Paths
          </div>
          <button id="btn-close-bridge-config" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
          Adjust executable paths or custom arguments for your installed 3D and design tools.
        </div>

        <div id="bridge-config-form" style="display: flex; flex-direction: column; gap: 10px; max-height: 420px; overflow-y: auto; padding-right: 4px;">
          <!-- Populated from config -->
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <button class="btn-secondary" id="btn-cancel-bridge-config">Cancel</button>
          <button class="btn-secondary" id="btn-save-bridge-config" style="background: var(--cyan-primary); color: #07090e; font-weight: 700; border: none;">Save Paths</button>
        </div>
      </div>
    </div>
  `;

  // 1. Initialize Dhaka Clock
  initDhakaClock(container);

  // 2. Fetch Live Weather
  fetchDhakaWeather((data) => {
    const tempEl = container.querySelector('#weather-temp');
    const condEl = container.querySelector('#weather-condition');
    if (tempEl) tempEl.textContent = `${data.temp}°C`;
    if (condEl) condEl.textContent = data.condition;
  });

  // 3. Initialize Omnibar Slot
  const omnibarSlot = container.querySelector('#omnibar-slot');
  if (omnibarSlot) {
    new Omnibar(omnibarSlot);
  }

  // 4. Initialize Desktop Bridge Telemetry & Status
  initBridgeTelemetry(container);

  // 5. Initialize Desktop Apps & Quick Folders
  initDesktopAppsAndFolders(container);

  // 6. Initialize Hot Projects Shelf
  initHotProjectsShelf(container);

  // 7. Initialize Scratchpad
  initScratchpad(container);
}

/**
 * Live Dhaka Clock & Hijri/Gregorian Date
 */
function initDhakaClock(container) {
  const hoursEl = container.querySelector('#clock-hours');
  const minsEl = container.querySelector('#clock-minutes');
  const secsEl = container.querySelector('#clock-seconds');
  const ampmEl = container.querySelector('#clock-ampm');
  const gregEl = container.querySelector('#date-gregorian');
  const hijriEl = container.querySelector('#date-hijri');

  function update() {
    const now = new Date();
    const options = { timeZone: 'Asia/Dhaka', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);

    let h = '--', m = '--', s = '--', ampm = '--';
    parts.forEach(p => {
      if (p.type === 'hour') h = p.value;
      if (p.type === 'minute') m = p.value;
      if (p.type === 'second') s = p.value;
      if (p.type === 'dayPeriod') ampm = p.value.toUpperCase();
    });

    if (hoursEl) hoursEl.textContent = h;
    if (minsEl) minsEl.textContent = m;
    if (secsEl) secsEl.textContent = `:${s}`;
    if (ampmEl) ampmEl.textContent = ampm;

    if (gregEl) {
      gregEl.textContent = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Dhaka',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    try {
      const hijriDate = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(now);
      if (hijriEl) hijriEl.textContent = `${hijriDate} AH • Dhaka`;
    } catch {
      if (hijriEl) hijriEl.textContent = 'Dhaka (UTC+6)';
    }
  }

  update();
  const timer = setInterval(update, 1000);
  container._clockTimer = timer;
}

/**
 * Hardware Telemetry & Bridge Status Handling
 */
function initBridgeTelemetry(container) {
  const dot = container.querySelector('#bridge-status-dot');
  const statusText = container.querySelector('#bridge-status-text');
  const subText = container.querySelector('#telemetry-engine-sub');

  const cpuVal = container.querySelector('#meter-cpu-val');
  const cpuBar = container.querySelector('#meter-cpu-bar');
  const ramVal = container.querySelector('#meter-ram-val');
  const ramBar = container.querySelector('#meter-ram-bar');
  const diskCVal = container.querySelector('#meter-disk-c-val');
  const diskCBar = container.querySelector('#meter-disk-c-bar');
  const diskDVal = container.querySelector('#meter-disk-d-val');
  const diskDBar = container.querySelector('#meter-disk-d-bar');

  function updateStatus(detail) {
    if (detail.connected) {
      dot.className = 'status-dot online';
      statusText.textContent = 'Bridge Online';
      subText.textContent = detail.everything ? '⚡ Everything 1.5 Active' : 'Bridge active (Everything offline)';
      subText.style.color = 'var(--emerald-primary)';
    } else {
      dot.className = 'status-dot offline';
      statusText.textContent = 'Bridge Offline';
      subText.textContent = 'Start launch_dashboard.bat';
      subText.style.color = 'var(--text-muted)';
    }
  }

  function updateTelemetry(stats) {
    if (!stats) return;
    // CPU
    if (cpuVal) cpuVal.textContent = `${stats.cpu_pct}%`;
    if (cpuBar) {
      cpuBar.style.width = `${Math.min(100, stats.cpu_pct)}%`;
      cpuBar.style.backgroundColor = stats.cpu_pct > 80 ? 'var(--nothing-red)' : 'var(--cyan-primary)';
    }

    // RAM
    if (stats.ram) {
      if (ramVal) ramVal.textContent = `${stats.ram.load_pct}% (${stats.ram.used_gb}G)`;
      if (ramBar) {
        ramBar.style.width = `${stats.ram.load_pct}%`;
        ramBar.style.backgroundColor = stats.ram.load_pct > 85 ? 'var(--amber-primary)' : 'var(--cyan-primary)';
      }
    }

    // Drives
    if (stats.drives) {
      stats.drives.forEach(d => {
        if (d.drive === 'C:' || d.drive === 'C') {
          if (diskCVal) diskCVal.textContent = `${d.free_gb} GB Free`;
          if (diskCBar) diskCBar.style.width = `${d.used_pct}%`;
        } else if (d.drive === 'D:' || d.drive === 'D') {
          if (diskDVal) diskDVal.textContent = `${d.free_gb} GB Free`;
          if (diskDBar) diskDBar.style.width = `${d.used_pct}%`;
        }
      });
    }
  }

  // Listeners
  window.addEventListener('deck:bridge-status', (e) => updateStatus(e.detail));
  window.addEventListener('deck:bridge-telemetry', (e) => updateTelemetry(e.detail));

  // Initial check
  if (window.deckBridge) {
    if (window.deckBridge.isConnected) {
      updateStatus({ connected: true, everything: window.deckBridge.isEverythingConnected });
      if (window.deckBridge.lastStats) updateTelemetry(window.deckBridge.lastStats);
    } else {
      window.deckBridge.checkStatus();
    }
  }
}

/**
 * Desktop Apps & Quick Folders
 */
function initDesktopAppsAndFolders(container) {
  const appsGrid = container.querySelector('#apps-launch-grid');
  const foldersGrid = container.querySelector('#quick-folders-grid');
  const btnConfig = container.querySelector('#btn-configure-apps');
  const configModal = container.querySelector('#bridge-config-modal');
  const btnCloseModal = container.querySelector('#btn-close-bridge-config');
  const btnCancelModal = container.querySelector('#btn-cancel-bridge-config');
  const btnSaveModal = container.querySelector('#btn-save-bridge-config');
  const configForm = container.querySelector('#bridge-config-form');

  function renderApps(config) {
    if (!appsGrid || !config || !config.apps) return;
    const apps = config.apps;

    appsGrid.innerHTML = Object.entries(apps).map(([id, app]) => {
      const isConfigured = app.path && app.path.trim().length > 0;
      return `
        <button class="launch-app-tile ${isConfigured ? 'available' : 'missing'}" data-app-id="${id}" title="${app.path || 'Click settings to configure path'}">
          <div class="app-tile-top">
            <span class="app-tile-tag" style="border-color: ${app.border || 'var(--border-subtle)'}; background: ${app.color || 'var(--bg-elevated)'};">${app.tag}</span>
            <span class="app-tile-dot ${isConfigured ? 'online' : 'offline'}"></span>
          </div>
          <div class="app-tile-name">${app.name}</div>
        </button>
      `;
    }).join('');

    appsGrid.querySelectorAll('.launch-app-tile').forEach(tile => {
      tile.addEventListener('click', async () => {
        const appId = tile.dataset.appId;
        tile.classList.add('launching');
        const success = await window.deckBridge.launchApp(appId);
        setTimeout(() => tile.classList.remove('launching'), 1000);
        if (!success) {
          tile.classList.add('error-shake');
          setTimeout(() => tile.classList.remove('error-shake'), 600);
        }
      });
    });
  }

  function renderFolders(config) {
    if (!foldersGrid || !config || !config.quick_folders) return;
    foldersGrid.innerHTML = config.quick_folders.map(qf => `
      <button class="quick-folder-btn" data-path="${escapeAttr(qf.path)}" title="${escapeAttr(qf.path)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
        </svg>
        <span>${qf.name}</span>
      </button>
    `).join('');

    foldersGrid.querySelectorAll('.quick-folder-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.path;
        if (window.deckBridge && path) {
          window.deckBridge.openInExplorer(path);
        }
      });
    });
  }

  window.addEventListener('deck:bridge-config', (e) => {
    renderApps(e.detail);
    renderFolders(e.detail);
  });

  if (window.deckBridge && window.deckBridge.config) {
    renderApps(window.deckBridge.config);
    renderFolders(window.deckBridge.config);
  } else if (window.deckBridge) {
    window.deckBridge.fetchConfig().then(cfg => {
      if (cfg) {
        renderApps(cfg);
        renderFolders(cfg);
      }
    });
  }

  // Modal handlers
  if (btnConfig) {
    btnConfig.addEventListener('click', () => {
      const cfg = window.deckBridge ? window.deckBridge.config : null;
      if (!cfg || !cfg.apps) {
        alert('Bridge is connecting. Please wait a moment.');
        return;
      }
      configForm.innerHTML = Object.entries(cfg.apps).map(([id, app]) => `
        <div class="config-field-row">
          <label style="font-weight: 600; font-size: 12px; color: var(--text-primary);">${app.name} (${app.tag})</label>
          <div style="display: flex; gap: 6px; margin-top: 4px;">
            <input type="text" class="input-text" id="config-path-${id}" value="${escapeAttr(app.path || '')}" style="flex: 1; font-family: monospace; font-size: 11px;" />
            <button class="btn-secondary btn-browse-exe" data-target="config-path-${id}" style="font-size: 11px; padding: 4px 10px;">Browse</button>
          </div>
        </div>
      `).join('');

      configForm.querySelectorAll('.btn-browse-exe').forEach(btn => {
        btn.addEventListener('click', async () => {
          const targetId = btn.dataset.target;
          const chosen = await window.deckBridge.pickFile('Select Application Executable');
          if (chosen) {
            const input = configForm.querySelector(`#${targetId}`);
            if (input) input.value = chosen;
          }
        });
      });

      configModal.classList.add('open');
    });
  }

  const closeModal = () => configModal.classList.remove('open');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  if (btnSaveModal) {
    btnSaveModal.addEventListener('click', async () => {
      const cfg = window.deckBridge ? window.deckBridge.config : null;
      if (!cfg) return;
      Object.keys(cfg.apps).forEach(id => {
        const inp = configForm.querySelector(`#config-path-${id}`);
        if (inp) cfg.apps[id].path = inp.value.trim();
      });
      await window.deckBridge.saveConfig(cfg);
      renderApps(cfg);
      closeModal();
    });
  }
}

/**
 * Hot Projects Shelf (Drag & Drop + Native File Dialog)
 */
function initHotProjectsShelf(container) {
  const shelfGrid = container.querySelector('#hot-projects-grid');
  const dropzone = container.querySelector('#hot-projects-dropzone');
  const btnAdd = container.querySelector('#btn-add-hot-project');
  const countBadge = container.querySelector('#hot-projects-count');

  let projects = [];
  try {
    const saved = localStorage.getItem('deck_hot_projects');
    projects = saved ? JSON.parse(saved) : [];
  } catch {
    projects = [];
  }

  function saveAndRender() {
    localStorage.setItem('deck_hot_projects', JSON.stringify(projects));
    render();
  }

  function getBadgeColor(ext) {
    switch (ext) {
      case 'uproject': return { bg: '#0E1128', border: '#2c5282', tag: 'UE5' };
      case 'max': return { bg: '#112233', border: '#2b6cb0', tag: 'MAX' };
      case 'blend': return { bg: '#2c1c0a', border: '#dd6b20', tag: 'BLEND' };
      case 'psd':
      case 'psb': return { bg: '#001e36', border: '#3182ce', tag: 'PSD' };
      case 'pur': return { bg: '#1a202c', border: '#718096', tag: 'PUR' };
      default: return { bg: '#151515', border: '#333333', tag: ext.toUpperCase() || 'FILE' };
    }
  }

  function render() {
    if (countBadge) countBadge.textContent = `${projects.length} Project${projects.length === 1 ? '' : 's'}`;
    if (!shelfGrid) return;

    if (projects.length === 0) {
      shelfGrid.innerHTML = `
        <div class="empty-shelf-hint">
          No hot projects pinned yet. Drag files from Explorer above or click "+ Add Project".
        </div>
      `;
      return;
    }

    shelfGrid.innerHTML = projects.map((p, idx) => {
      const ext = (p.name || p.path).split('.').pop().toLowerCase();
      const meta = getBadgeColor(ext);
      const dir = p.dir || (p.path ? p.path.substring(0, p.path.lastIndexOf('\\')) : '');

      return `
        <div class="hot-project-card" data-index="${idx}" title="${escapeAttr(p.path)}">
          <div class="project-card-header">
            <span class="project-card-badge" style="background: ${meta.bg}; border-color: ${meta.border};">${meta.tag}</span>
            <div class="project-card-actions">
              <button class="project-act-btn btn-open-card-folder" title="Open containing folder in Explorer" data-path="${escapeAttr(p.path)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                </svg>
              </button>
              <button class="project-act-btn btn-remove-card" title="Remove from shelf" data-index="${idx}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="project-card-name">${escapeHTML(p.name)}</div>
          <div class="project-card-path">${escapeHTML(dir)}</div>
          <button class="project-launch-btn" data-path="${escapeAttr(p.path)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Launch
          </button>
        </div>
      `;
    }).join('');

    // Bind card actions
    shelfGrid.querySelectorAll('.project-launch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.dataset.path;
        if (window.deckBridge && path) {
          window.deckBridge.openPath(path);
        }
      });
    });

    shelfGrid.querySelectorAll('.hot-project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.project-card-actions') || e.target.closest('.project-launch-btn')) return;
        const btn = card.querySelector('.project-launch-btn');
        if (btn) btn.click();
      });
    });

    shelfGrid.querySelectorAll('.btn-open-card-folder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.dataset.path;
        if (window.deckBridge && path) {
          window.deckBridge.openInExplorer(path);
        }
      });
    });

    shelfGrid.querySelectorAll('.btn-remove-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        projects.splice(idx, 1);
        saveAndRender();
      });
    });
  }

  // Native File Picker
  if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
      if (!window.deckBridge || !window.deckBridge.isConnected) {
        alert('Desktop Bridge is offline. Launch launch_dashboard.bat to use native file picking.');
        return;
      }
      const chosen = await window.deckBridge.pickFile('Select Project File (.uproject, .max, .blend, .psd, .pur)');
      if (chosen) {
        const name = chosen.split('\\').pop();
        projects.unshift({ name, path: chosen, addedAt: Date.now() });
        saveAndRender();
      }
    });
  }

  // HTML5 Drag & Drop
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fullPath = file.path; // Available in Electron / Chromium with native drag
        if (!fullPath && window.deckBridge) {
          // Resolve full path using Everything 1.5!
          fullPath = await window.deckBridge.resolveDroppedFile(file.name);
        }

        if (fullPath) {
          projects.unshift({ name: file.name, path: fullPath, addedAt: Date.now() });
        } else {
          alert(`Could not resolve native path for "${file.name}". Use "+ Add Project" to select it.`);
        }
      }
      saveAndRender();
    });
  }

  // Listen to pin events from Omnibar
  window.addEventListener('deck:pin-hot-project', (e) => {
    const { name, path } = e.detail;
    if (path && !projects.some(p => p.path === path)) {
      projects.unshift({ name, path, addedAt: Date.now() });
      saveAndRender();
    }
  });

  render();
}

/**
 * Quick Scratchpad
 */
function initScratchpad(container) {
  const textarea = container.querySelector('#scratchpad-input');
  const wordCount = container.querySelector('#scratchpad-wordcount');
  const status = container.querySelector('#scratchpad-status');
  const btnCopy = container.querySelector('#btn-copy-scratchpad');
  const btnClear = container.querySelector('#btn-clear-scratchpad');

  if (!textarea) return;

  function updateCount() {
    const words = textarea.value.trim() ? textarea.value.trim().split(/\s+/).length : 0;
    if (wordCount) wordCount.textContent = `${words} word${words === 1 ? '' : 's'}`;
  }

  updateCount();

  let timeout;
  textarea.addEventListener('input', () => {
    updateCount();
    if (status) status.textContent = 'Saving...';
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      store.setScratchpad(textarea.value);
      if (status) status.textContent = 'Saved locally';
    }, 400);
  });

  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(textarea.value);
      btnCopy.textContent = 'Copied!';
      setTimeout(() => btnCopy.textContent = 'Copy', 1200);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Clear scratchpad text?')) {
        textarea.value = '';
        store.setScratchpad('');
        updateCount();
      }
    });
  }
}

function getZoneSVG(iconName) {
  switch (iconName) {
    case 'flame': return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`;
    case 'cpu': return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="16" x="4" y="4" rx="2"></rect><rect width="6" height="6" x="9" y="9" rx="1"></rect><path d="M15 2v2m-6-2v2m6 16v2m-6-2v2M2 15h2m-2-6h2m16 6h2m-2-6h2"></path></svg>`;
    case 'box': return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>`;
    case 'wrench': return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
    default: return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;');
}

export default {
  id: 'tab-command-center',
  title: 'Command Center',
  async mount(container) {
    renderCommandCenter(container);
  },
  render: renderCommandCenter
};
