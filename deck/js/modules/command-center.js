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
import { initBookmarkToolbar } from './bookmark-toolbar.js';
import { fetchLiveDPDC, getCachedDPDC } from '../services/dpdc.js';

export function renderCommandCenter(container) {
  container.innerHTML = `
    <!-- 1. Full-Width Workstation Hardware Ticker (Above Clock, Below Top Nav) -->
    <section class="workstation-ticker-section" id="workstation-ticker-slot">
      <div class="workstation-ticker-card">
        <div class="ticker-left">
          <div class="telemetry-bridge-status" id="bridge-status-pill">
            <span class="status-dot offline" id="bridge-status-dot"></span>
            <span id="bridge-status-text">Workstation</span>
          </div>
          <span class="ticker-divider">/</span>
          <span class="ticker-specs" id="telemetry-specs-sub">Intel Core i7-8700 12T · 64GB DDR4</span>
        </div>

        <div class="ticker-metrics">
          <!-- CPU -->
          <div class="ticker-metric-item" title="CPU Load">
            <span class="ticker-metric-label">CPU</span>
            <span class="ticker-metric-val" id="meter-cpu-val">--%</span>
            <div class="ticker-bar-track">
              <div class="ticker-bar-fill" id="meter-cpu-bar" style="width: 0%;"></div>
            </div>
          </div>

          <span class="ticker-divider">/</span>

          <!-- RAM -->
          <div class="ticker-metric-item" title="RAM Load & Usage">
            <span class="ticker-metric-label">RAM</span>
            <span class="ticker-metric-val" id="meter-ram-val">--%</span>
            <div class="ticker-bar-track">
              <div class="ticker-bar-fill" id="meter-ram-bar" style="width: 0%;"></div>
            </div>
          </div>

          <span class="ticker-divider">/</span>

          <!-- GPU -->
          <div class="ticker-metric-item" title="NVIDIA RTX 3060">
            <span class="ticker-metric-label" id="meter-gpu-title">GPU</span>
            <span class="ticker-metric-val" id="meter-gpu-val">--°C · --%</span>
            <div class="ticker-bar-track">
              <div class="ticker-bar-fill" id="meter-gpu-bar" style="width: 0%;"></div>
            </div>
          </div>

          <span class="ticker-divider">/</span>

          <!-- Network Latency -->
          <div class="latency-pill" id="network-latency-pill" title="Gateway Ping (Cloudflare 1.1.1.1)">
            <span class="latency-dot" id="latency-dot"></span>
            <span id="network-latency-val">-- ms</span>
          </div>

          <!-- Ambient DPDC Alert Pill -->
          <span class="ticker-divider" id="ticker-dpdc-divider" style="display: none;">/</span>
          <div class="ticker-metric-item" id="ticker-dpdc-pill" style="display: none; cursor: pointer; align-items: center; gap: 4px;" title="DPDC Smart Prepaid Meter • Click to open Utilities">
            <span class="nothing-led" style="width: 7px; height: 7px;"></span>
            <span class="ticker-metric-label" style="color: var(--nothing-red);">DPDC</span>
            <span class="ticker-metric-val" id="ticker-dpdc-val" style="color: var(--text-primary); font-family: var(--font-mono); font-size: 11px;">--</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Centered Hero Clock with Integrated Weather Badge -->
    <header class="hero-header cockpit-hero-header centered-clock-header">
      <div class="clock-card centered-clock-card">
        <div class="clock-time">
          <span class="nothing-led" style="margin-right: 6px;"></span>
          <span id="clock-hours">--</span>:<span id="clock-minutes">--</span><span class="clock-seconds" id="clock-seconds">--</span>
          <span class="clock-ampm" id="clock-ampm">--</span>
        </div>
        <div class="clock-meta">
          <div class="date-gregorian" id="date-gregorian">Loading date...</div>
          <div class="date-secondary" id="date-hijri">Dhaka, Bangladesh (UTC+6)</div>
        </div>

        <!-- Integrated Compact Weather Pill -->
        <div class="weather-pill-badge" id="weather-card">
          <div class="weather-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="weather-svg">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
            </svg>
          </div>
          <div class="weather-pill-text">
            <span class="weather-temp" id="weather-temp">--°C</span>
            <span class="weather-condition" id="weather-condition">Checking sky...</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 3. Universal Omnibar Search Slot -->
    <div class="omnibar-container" id="omnibar-slot"></div>

    <!-- 4. In-Page Quick Bookmarks Bar (Replaces hidden browser bar) -->
    <section class="bookmark-toolbar-section" id="bookmark-toolbar-slot"></section>

    <!-- 5. Full-Width Horizontal Disk Drives Bar (Below Bookmarks Bar, Above Launch Deck) -->
    <section class="drives-toolbar-section" id="drives-toolbar-slot">
      <div class="drives-toolbar-card" id="cockpit-drives-strip">
        <div class="drives-loading-placeholder">Scanning mounted drives...</div>
      </div>
    </section>

    <!-- Full-Width Horizontal Launch Deck & Quick Folders Jump List -->
    <section class="launch-deck-section" style="margin-bottom: 20px;">
      <div class="bento-card launch-deck-card" style="width: 100%;">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--cyan-primary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="m9 8 6 4-6 4Z"></path>
              </svg>
            </span>
            <span class="card-title">Launch Deck</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="icon-tiny-btn" id="btn-quick-clipboard" title="Win32 Clipboard Ring Buffer (Ctrl+Shift+V)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              </svg>
            </button>
            <button class="icon-tiny-btn" id="btn-configure-apps" title="Configure Executable Paths">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <span class="card-badge">1-Click Launch</span>
          </div>
        </div>

        <!-- 1 Horizontal Deck for Apps -->
        <div class="launch-deck-grid" id="apps-launch-grid">
          <!-- Populated dynamically from bridge config -->
        </div>

        <!-- Compact Quick Folders Jump Strip Below Launch Deck -->
        <div class="quick-folders-strip" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px;">Jump:</span>
          <div id="quick-folders-grid" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <!-- Populated dynamically from bridge config -->
          </div>
        </div>
      </div>
    </section>

    <!-- Shelf (Hot Projects Shelf with HTML5 Drag & Drop + Native Picker) -->
    <section class="shelf-section" style="margin-bottom: 24px;">
      <div class="bento-card shelf-card" style="width: 100%;">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--emerald-primary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
              </svg>
            </span>
            <span class="card-title">Shelf</span>
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="dropzone-icon">
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
    </section>

    <!-- Quick Scratchpad & Daily Todo Bento Card -->
    <section class="scratchpad-todo-section" style="margin-bottom: 24px;">
      <div class="bento-card scratchpad-todo-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--amber-primary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </span>
            <span class="card-title">Quick Scratchpad & Tasks</span>
          </div>
          <div class="scratchpad-tab-header">
            <button class="scratchpad-tab-btn active" id="tab-btn-todos" data-tab="todos">Todos (<span id="todo-count-badge">0</span>)</button>
            <button class="scratchpad-tab-btn" id="tab-btn-notes" data-tab="notes">Notes Scratchpad</button>
          </div>
        </div>

        <div class="scratchpad-body">
          <!-- Tab 1: Todos View -->
          <div id="view-todos">
            <div class="todo-input-row">
              <input type="text" class="todo-input" id="todo-input-field" placeholder="Add a quick task for today... (Press Enter)" autocomplete="off" />
            </div>
            <div class="todo-items-list" id="todo-items-list">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Tab 2: Notes Scratchpad View -->
          <div id="view-notes" style="display: none;">
            <textarea class="scratchpad-notes-area" id="scratchpad-textarea" placeholder="Jot down quick thoughts, code snippets, or draft ideas here... Automatically saves in real-time."></textarea>
            <div class="scratchpad-footer">
              <span id="scratchpad-stats">0 words · 0 chars</span>
              <span id="scratchpad-status" style="color: var(--emerald-primary);">Saved locally</span>
            </div>
          </div>
        </div>
      </div>
    </section>

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
  fetchDhakaWeather().then(data => {
    if (!data) return;
    const tempEl = container.querySelector('#weather-temp');
    const condEl = container.querySelector('#weather-condition');
    const locEl = container.querySelector('#weather-location');
    if (tempEl) tempEl.textContent = `${data.temp}°C`;
    if (condEl) condEl.textContent = data.condition;
    if (locEl) locEl.textContent = data.city || 'Dhaka';
  }).catch(err => {
    console.warn('[Deck Cockpit] Weather load error:', err);
  });

  // 3. Initialize Omnibar Slot
  const omnibarSlot = container.querySelector('#omnibar-slot');
  if (omnibarSlot) {
    new Omnibar(omnibarSlot);
  }

  // 3b. Initialize In-Page Bookmark Toolbar Slot
  const bookmarkToolbarSlot = container.querySelector('#bookmark-toolbar-slot');
  if (bookmarkToolbarSlot) {
    initBookmarkToolbar(bookmarkToolbarSlot);
  }

  // 4. Initialize Desktop Bridge Telemetry & Status
  initBridgeTelemetry(container);

  // 5. Initialize Desktop Apps & Quick Folders
  initDesktopAppsAndFolders(container);

  // 6. Initialize Shelf (Hot Projects)
  initHotProjectsShelf(container);

  // 7. Initialize Quick Scratchpad & Daily Todos
  initScratchpadAndTodos(container);

  // 8. Initialize Ambient DPDC Alert Pill
  initAmbientDPDC(container);
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
 * Hardware Telemetry & Workstation Status Handling
 */
function initBridgeTelemetry(container) {
  const dot = container.querySelector('#bridge-status-dot');
  const statusText = container.querySelector('#bridge-status-text');
  const specsSub = container.querySelector('#telemetry-specs-sub');
  const latencyPill = container.querySelector('#network-latency-pill');
  const latencyVal = container.querySelector('#network-latency-val');

  const cpuTitle = container.querySelector('#meter-cpu-title');
  const cpuVal = container.querySelector('#meter-cpu-val');
  const cpuBar = container.querySelector('#meter-cpu-bar');

  const ramTitle = container.querySelector('#meter-ram-title');
  const ramVal = container.querySelector('#meter-ram-val');
  const ramBar = container.querySelector('#meter-ram-bar');

  const gpuTitle = container.querySelector('#meter-gpu-title');
  const gpuVal = container.querySelector('#meter-gpu-val');
  const gpuBar = container.querySelector('#meter-gpu-bar');

  const drivesStrip = container.querySelector('#cockpit-drives-strip');

  // Delegated click handler: attached once, survives innerHTML re-renders during telemetry polling
  if (drivesStrip) {
    drivesStrip.addEventListener('click', async (e) => {
      const btn = e.target.closest('.drive-pill-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const targetDrive = btn.getAttribute('data-drive');
      if (targetDrive && window.deckBridge) {
        const drivePath = targetDrive.endsWith('\\') ? targetDrive : `${targetDrive}\\`;
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 500);
        try {
          await window.deckBridge.openInExplorer(drivePath);
        } catch (err) {
          console.error('[Deck] Drive open failed:', err);
        }
      }
    });
  }

  function updateStatus(detail) {
    if (detail.connected) {
      if (dot) dot.className = 'status-dot online';
      if (statusText) statusText.textContent = 'Workstation Online';
      if (latencyPill) latencyPill.style.display = 'inline-flex';
    } else {
      if (dot) dot.className = 'status-dot offline';
      if (statusText) statusText.textContent = 'Workstation Offline';
      if (specsSub) specsSub.textContent = 'Desktop bridge disconnected';
      if (latencyPill) latencyPill.style.display = 'none';
      if (drivesStrip) {
        drivesStrip.innerHTML = '<div class="drives-loading-placeholder">Desktop bridge offline — drives unavailable</div>';
      }
    }
  }

  function updateTelemetry(stats) {
    if (!stats) return;

    // Specs line (CPU model & RAM sticks with thread count)
    if (specsSub) {
      let parts = [];
      const cpuRaw = (stats.cpu && stats.cpu.name) || stats.cpu_model || '';
      if (cpuRaw) {
        const cpuClean = cpuRaw.replace(/\s*CPU\s*@\s*[\d.]+GHz/i, '').replace(/\(R\)|\(TM\)/g, '').trim();
        const threadCount = stats.cpu && (stats.cpu.threads || stats.cpu.cores);
        parts.push(threadCount ? `${cpuClean} (${threadCount}T)` : cpuClean);
      }
      const ramSticks = (stats.ram && (stats.ram.sticks || stats.ram.sticks_summary)) || (stats.ram ? `${stats.ram.total_gb}GB RAM` : '');
      if (ramSticks) {
        parts.push(ramSticks);
      }
      if (parts.length > 0) {
        specsSub.textContent = parts.join(' · ');
      }
    }

    // Network / Gateway Latency Pill (Dual-Route BDIX & International Telemetry)
    if (latencyVal) {
      if (stats.network) {
        const net = stats.network;
        const edgePing = net.edge_ping_ms !== undefined && net.edge_ping_ms !== null ? net.edge_ping_ms : stats.ping_ms;
        const bdixPing = net.bdix_ping_ms;
        
        if (bdixPing !== undefined && bdixPing !== null) {
          latencyVal.textContent = `${edgePing}ms · BDIX ${bdixPing}ms`;
        } else if (edgePing !== undefined && edgePing !== null) {
          latencyVal.textContent = `${edgePing} ms`;
        } else {
          latencyVal.textContent = 'Offline';
        }

        if (latencyPill) {
          latencyPill.style.display = 'inline-flex';
          latencyPill.title = `Route: ${net.route_label || 'Normal'}\nRouter Gateway: ${net.gateway_ping_ms || '--'}ms\nBDIX Dhaka Node: ${net.bdix_ping_ms || '--'}ms\nGlobal Edge DNS: ${net.edge_ping_ms || stats.ping_ms || '--'}ms\nSubsea Transit: ${net.int_ping_ms || '--'}ms`;
          
          if (net.route_status === 'optimal') {
            latencyPill.className = 'latency-pill';
          } else if (net.route_status === 'bdix_degraded' || net.route_status === 'cable_spike') {
            latencyPill.className = 'latency-pill warning';
          } else {
            latencyPill.className = 'latency-pill alert';
          }
        }
      } else if (stats.ping_ms !== undefined && stats.ping_ms !== null) {
        if (stats.ping_ms > 0) {
          latencyVal.textContent = `${stats.ping_ms} ms`;
          if (latencyPill) {
            latencyPill.style.display = 'inline-flex';
            if (stats.ping_ms <= 40) {
              latencyPill.className = 'latency-pill';
            } else if (stats.ping_ms <= 120) {
              latencyPill.className = 'latency-pill warning';
            } else {
              latencyPill.className = 'latency-pill alert';
            }
          }
        } else {
          latencyVal.textContent = 'Offline';
          if (latencyPill) latencyPill.className = 'latency-pill alert';
        }
      }
    }

    // CPU Meter
    const cpuPct = stats.cpu_pct !== undefined ? stats.cpu_pct : (stats.cpu && stats.cpu.load_pct !== undefined ? stats.cpu.load_pct : null);
    if (cpuPct !== null) {
      if (cpuVal) cpuVal.textContent = `${Math.round(cpuPct)}%`;
      if (cpuBar) {
        cpuBar.style.width = `${Math.min(100, Math.max(0, cpuPct))}%`;
        cpuBar.style.backgroundColor = cpuPct > 85 ? 'var(--nothing-red)' : (cpuPct > 65 ? 'var(--amber-primary)' : 'var(--cyan-primary)');
      }
    }

    // RAM Meter
    if (stats.ram) {
      if (ramVal) ramVal.textContent = `${stats.ram.load_pct}% (${stats.ram.used_gb}/${stats.ram.total_gb}G)`;
      if (ramBar) {
        ramBar.style.width = `${Math.min(100, Math.max(0, stats.ram.load_pct))}%`;
        ramBar.style.backgroundColor = stats.ram.load_pct > 85 ? 'var(--nothing-red)' : (stats.ram.load_pct > 70 ? 'var(--amber-primary)' : 'var(--cyan-primary)');
      }
    }

    // GPU Meter
    if (stats.gpu) {
      const gName = stats.gpu.name ? stats.gpu.name.replace(/NVIDIA\s+GeForce\s+/i, '').replace(/NVIDIA\s+/i, '') : 'GPU';
      if (gpuTitle) gpuTitle.textContent = `GPU (${gName})`;

      const tempStr = stats.gpu.temp_c ? `${stats.gpu.temp_c}°C` : '--°C';
      const vramUsed = stats.gpu.vram_used_gb !== undefined ? stats.gpu.vram_used_gb : (stats.gpu.vram_used_mb ? (stats.gpu.vram_used_mb / 1024).toFixed(1) : null);
      const vramTotal = stats.gpu.vram_total_gb !== undefined ? stats.gpu.vram_total_gb : (stats.gpu.vram_total_mb ? Math.round(stats.gpu.vram_total_mb / 1024) : null);
      const vramStr = (vramUsed && vramTotal) ? `${vramUsed}/${vramTotal}G` : (stats.gpu.load_pct !== undefined ? `${stats.gpu.load_pct}%` : '');
      if (gpuVal) gpuVal.textContent = `${tempStr} · ${vramStr}`;

      const gPct = stats.gpu.vram_pct !== undefined ? stats.gpu.vram_pct : (stats.gpu.vram_used_pct !== undefined ? stats.gpu.vram_used_pct : (stats.gpu.load_pct || 0));
      if (gpuBar) {
        gpuBar.style.width = `${Math.min(100, Math.max(0, gPct))}%`;
        gpuBar.style.backgroundColor = (stats.gpu.temp_c && stats.gpu.temp_c > 80) ? 'var(--nothing-red)' : (stats.gpu.temp_c > 70 ? 'var(--amber-primary)' : 'var(--emerald-primary)');
      }
    }

    // Full-Width Minimalist Drives Strip: Letter + Storage Percentage Count
    if (drivesStrip && stats.drives && Array.isArray(stats.drives) && stats.drives.length > 0) {
      drivesStrip.innerHTML = stats.drives.map(d => {
        const isCrit = d.used_pct >= 90;
        const isWarn = d.used_pct >= 80;
        const statusClass = isCrit ? 'critical' : (isWarn ? 'warning' : '');
        const title = `${escapeHTML(d.drive)} [${escapeHTML(d.label || 'Volume')}] — ${d.free_gb} GB Free / ${d.total_gb} GB (${escapeHTML(d.filesystem || 'NTFS')}) · Click to open in Explorer`;
        return `
          <button class="drive-pill-btn ${statusClass}" data-drive="${escapeHTML(d.drive)}" title="${title}" aria-label="Open ${escapeHTML(d.drive)} in Explorer">
            <span class="drive-pill-letter">${escapeHTML(d.drive)}</span>
            <span class="drive-pill-pct">${Math.round(d.used_pct)}%</span>
          </button>
        `;
      }).join('');

      // Drive pill click handlers are delegated on drivesStrip (attached once above)
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
 * Quick Scratchpad & Daily Todos Controller
 */
function initScratchpadAndTodos(container) {
  const tabTodos = container.querySelector('#scratchpad-tab-todos');
  const tabNotes = container.querySelector('#scratchpad-tab-notes');
  const panelTodos = container.querySelector('#scratchpad-todos-panel');
  const panelNotes = container.querySelector('#scratchpad-notes-panel');
  const todoList = container.querySelector('#scratchpad-todos-list');
  const todoInput = container.querySelector('#scratchpad-todo-input');
  const btnAddTodo = container.querySelector('#btn-add-todo');
  const textarea = container.querySelector('#scratchpad-textarea');
  const statsEl = container.querySelector('#scratchpad-stats');
  const statusEl = container.querySelector('#scratchpad-status');
  const btnClear = container.querySelector('#btn-scratchpad-clear');
  const btnCopy = container.querySelector('#btn-scratchpad-copy');

  if (!panelTodos || !panelNotes) return;

  // Active tab state: 'todos' or 'notes'
  let activeTab = 'todos';

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'todos') {
      if (tabTodos) tabTodos.classList.add('active');
      if (tabNotes) tabNotes.classList.remove('active');
      panelTodos.style.display = 'flex';
      panelNotes.style.display = 'none';
      updateTodosStats();
    } else {
      if (tabNotes) tabNotes.classList.add('active');
      if (tabTodos) tabTodos.classList.remove('active');
      panelNotes.style.display = 'flex';
      panelTodos.style.display = 'none';
      updateNotesStats();
      if (textarea) textarea.focus();
    }
  }

  if (tabTodos) tabTodos.addEventListener('click', () => switchTab('todos'));
  if (tabNotes) tabNotes.addEventListener('click', () => switchTab('notes'));

  // --- TODOS LOGIC ---
  const DEFAULT_TODOS = [
    { id: '1', text: 'Daily 3D render checkpoint & bake test', done: false },
    { id: '2', text: 'Bookmark project references in Deck', done: true },
    { id: '3', text: 'Inspect scratch storage disk usage', done: false }
  ];

  function loadTodos() {
    try {
      const raw = localStorage.getItem('deck_scratchpad_todos');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_TODOS;
  }

  function saveTodos(todosArr) {
    try {
      localStorage.setItem('deck_scratchpad_todos', JSON.stringify(todosArr));
    } catch (_) {}
  }

  let todos = loadTodos();

  function updateTodosStats() {
    if (activeTab !== 'todos' || !statsEl) return;
    const total = todos.length;
    const completed = todos.filter(t => t.done).length;
    statsEl.textContent = `${completed} / ${total} completed`;
    if (statusEl) {
      statusEl.textContent = total > 0 && completed === total ? 'All tasks done 🎉' : 'Saved locally';
      statusEl.style.color = total > 0 && completed === total ? 'var(--cyan-primary)' : 'var(--emerald-primary)';
    }
  }

  function renderTodos() {
    if (!todoList) return;
    if (todos.length === 0) {
      todoList.innerHTML = '<div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); text-align: center; padding: 18px 0;">No tasks yet. Type above and press Enter to add!</div>';
      updateTodosStats();
      return;
    }

    todoList.innerHTML = todos.map(t => `
      <div class="scratchpad-todo-item ${t.done ? 'completed' : ''}" data-id="${t.id}">
        <input type="checkbox" class="scratchpad-todo-check" ${t.done ? 'checked' : ''} />
        <span class="scratchpad-todo-text">${escapeHtml(t.text)}</span>
        <button class="scratchpad-todo-del" title="Delete task">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');

    // Wire listeners
    todoList.querySelectorAll('.scratchpad-todo-item').forEach(itemEl => {
      const id = itemEl.getAttribute('data-id');
      const check = itemEl.querySelector('.scratchpad-todo-check');
      const del = itemEl.querySelector('.scratchpad-todo-del');

      if (check) {
        check.addEventListener('change', () => {
          const item = todos.find(t => t.id === id);
          if (item) {
            item.done = check.checked;
            if (item.done) {
              itemEl.classList.add('completed');
            } else {
              itemEl.classList.remove('completed');
            }
            saveTodos(todos);
            updateTodosStats();
          }
        });
      }

      if (del) {
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          todos = todos.filter(t => t.id !== id);
          saveTodos(todos);
          renderTodos();
        });
      }
    });

    updateTodosStats();
  }

  function addTodoFromInput() {
    if (!todoInput) return;
    const text = todoInput.value.trim();
    if (!text) return;
    const newItem = {
      id: Date.now().toString(),
      text,
      done: false
    };
    todos.unshift(newItem);
    saveTodos(todos);
    todoInput.value = '';
    renderTodos();
  }

  if (btnAddTodo) btnAddTodo.addEventListener('click', addTodoFromInput);
  if (todoInput) {
    todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTodoFromInput();
      }
    });
  }

  // --- NOTES LOGIC ---
  function updateNotesStats() {
    if (activeTab !== 'notes' || !statsEl || !textarea) return;
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = textarea.value.length;
    statsEl.textContent = `${words} words · ${chars} chars`;
    if (statusEl) {
      statusEl.textContent = 'Saved locally';
      statusEl.style.color = 'var(--emerald-primary)';
    }
  }

  if (textarea) {
    textarea.value = localStorage.getItem('deck_scratchpad_notes') || '';
    let saveTimeout = null;

    textarea.addEventListener('input', () => {
      if (statusEl) {
        statusEl.textContent = 'Saving...';
        statusEl.style.color = 'var(--amber-primary)';
      }
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        try {
          localStorage.setItem('deck_scratchpad_notes', textarea.value);
        } catch (_) {}
        updateNotesStats();
      }, 300);
    });
  }

  // --- TOP ACTION BUTTONS: CLEAR & COPY ---
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (activeTab === 'todos') {
        const completedCount = todos.filter(t => t.done).length;
        if (completedCount > 0) {
          todos = todos.filter(t => !t.done);
          saveTodos(todos);
          renderTodos();
        } else if (todos.length > 0) {
          if (confirm('Clear all tasks from the todo list?')) {
            todos = [];
            saveTodos(todos);
            renderTodos();
          }
        }
      } else {
        if (textarea && textarea.value.trim()) {
          if (confirm('Clear scratchpad notes?')) {
            textarea.value = '';
            localStorage.setItem('deck_scratchpad_notes', '');
            updateNotesStats();
          }
        }
      }
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      let copyText = '';
      if (activeTab === 'todos') {
        copyText = todos.map(t => `- [${t.done ? 'x' : ' '}] ${t.text}`).join('\n');
      } else if (textarea) {
        copyText = textarea.value;
      }
      if (!copyText) return;

      try {
        await navigator.clipboard.writeText(copyText);
        if (statusEl) {
          const prev = statusEl.textContent;
          statusEl.textContent = 'Copied to clipboard!';
          statusEl.style.color = 'var(--cyan-primary)';
          setTimeout(() => {
            if (activeTab === 'todos') updateTodosStats();
            else updateNotesStats();
          }, 1800);
        }
      } catch (err) {
        console.warn('Clipboard copy failed:', err);
      }
    });
  }

  // Initial render
  renderTodos();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

/**
 * Storage Heavy-Hitter Inspector Modal Controller
 */
function openStorageInspector(initialDrive = 'C') {
  const modal = document.getElementById('storage-inspector-modal');
  if (!modal) return;

  const driveLabel = document.getElementById('storage-drive-label');
  const statsEl = document.getElementById('storage-drive-stats');
  const barEl = document.getElementById('storage-drive-bar');
  const stream = document.getElementById('storage-files-stream');
  const summaryEl = document.getElementById('storage-footer-summary');
  const threshSelect = document.getElementById('storage-threshold-select');
  const chips = modal.querySelectorAll('.storage-chip');
  const btnClose = document.getElementById('btn-close-storage-modal');
  const btnRefresh = document.getElementById('btn-refresh-storage');

  let currentDrive = initialDrive;
  let currentGroup = 'all';
  let currentThreshold = threshSelect ? threshSelect.value : '500MB';

  const updateDriveOverview = () => {
    if (driveLabel) driveLabel.textContent = `DRIVE ${currentDrive}:`;
    if (window.deckBridge && window.deckBridge.lastStats && window.deckBridge.lastStats.drives) {
      const d = window.deckBridge.lastStats.drives.find(dr => dr.drive.toUpperCase().startsWith(currentDrive));
      if (d) {
        if (statsEl) statsEl.textContent = `${d.free_gb} GB Free of ${d.total_gb} GB (${d.used_pct}% used)`;
        if (barEl) {
          barEl.style.width = `${d.used_pct}%`;
          barEl.style.backgroundColor = d.used_pct > 85 ? 'var(--nothing-red)' : 'var(--amber-primary)';
        }
      }
    }
  };

  const loadFiles = async () => {
    if (!stream) return;
    stream.innerHTML = `
      <div class="storage-loading-state">
        <div style="width: 24px; height: 24px; border: 2px solid var(--border-subtle); border-top-color: var(--amber-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <div>Querying Everything 1.5 IPC index for Drive ${currentDrive}: (> ${currentThreshold})...</div>
      </div>
    `;
    if (summaryEl) summaryEl.textContent = 'Querying Everything index...';

    if (!window.deckBridge || !window.deckBridge.isConnected) {
      stream.innerHTML = `
        <div class="storage-loading-state">
          <div style="color: var(--rose-primary);">Desktop Bridge is offline</div>
          <div>Start the bridge to inspect heavy files via Everything 1.5 IPC</div>
        </div>
      `;
      if (summaryEl) summaryEl.textContent = 'Bridge offline';
      return;
    }

    const data = await window.deckBridge.getHeavyStorage(currentDrive, currentThreshold, currentGroup);
    if (!data || !data.items || data.items.length === 0) {
      stream.innerHTML = `
        <div class="storage-loading-state">
          <div>No files found exceeding ${currentThreshold} for category "${currentGroup}"</div>
          <div style="font-size: 11px;">Try selecting a smaller threshold or different group</div>
        </div>
      `;
      if (summaryEl) summaryEl.textContent = '0 heavy files detected';
      return;
    }

    if (summaryEl) summaryEl.textContent = `Found ${data.count} heavy items (${data.total_formatted || ''}) on Drive ${currentDrive}:`;

    stream.innerHTML = data.items.map((it) => {
      let iconColor = 'var(--amber-primary)';
      if (['uasset', 'umap', 'blend', 'max', 'fbx', 'obj'].includes(it.extension)) {
        iconColor = 'var(--cyan-primary)';
      } else if (['mp4', 'mkv', 'mov', 'avi'].includes(it.extension)) {
        iconColor = 'var(--emerald-primary)';
      } else if (['zip', 'rar', '7z', 'iso'].includes(it.extension)) {
        iconColor = 'var(--purple-primary)';
      }

      const safeName = it.name.replace(/"/g, '&quot;');
      const safePath = it.full_path.replace(/"/g, '&quot;');
      const safeDir = (it.dir || '').replace(/"/g, '&quot;');

      return `
        <div class="storage-file-row">
          <div class="storage-file-left">
            <div class="storage-file-icon" style="color: ${iconColor};">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="storage-file-info">
              <div class="storage-file-name" title="${safePath}">${safeName}</div>
              <div class="storage-file-path" title="${safeDir}">${safeDir} • ${it.modified}</div>
            </div>
          </div>
          <div class="storage-file-right">
            <span class="storage-file-size">${it.size_formatted}</span>
            <button class="palette-action-icon-btn btn-storage-reveal" data-path="${safePath}" title="Reveal in File Explorer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            <button class="palette-action-icon-btn btn-storage-copy" data-path="${safePath}" title="Copy Full Path">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    stream.querySelectorAll('.btn-storage-reveal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.dataset.path;
        if (p && window.deckBridge) window.deckBridge.revealInExplorer(p);
      });
    });

    stream.querySelectorAll('.btn-storage-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.dataset.path;
        if (p && window.deckBridge) {
          window.deckBridge.copyToClipboard(p);
          btn.style.borderColor = 'var(--emerald-primary)';
          btn.style.color = 'var(--emerald-primary)';
          setTimeout(() => {
            btn.style.borderColor = '';
            btn.style.color = '';
          }, 1000);
        }
      });
    });
  };

  chips.forEach(chip => {
    chip.onclick = () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentGroup = chip.dataset.group;
      loadFiles();
    };
  });

  if (threshSelect) {
    threshSelect.onchange = () => {
      currentThreshold = threshSelect.value;
      loadFiles();
    };
  }

  if (btnRefresh) btnRefresh.onclick = () => loadFiles();

  const closeModal = () => modal.classList.remove('open');
  if (btnClose) btnClose.onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };

  updateDriveOverview();
  loadFiles();
  modal.classList.add('open');
}

/**
 * Desktop Apps & Quick Folders
 */
function initDesktopAppsAndFolders(container) {
  const appsGrid = container.querySelector('#apps-launch-grid');
  const foldersGrid = container.querySelector('#quick-folders-grid');
  const btnConfig = container.querySelector('#btn-configure-apps');
  const btnQuickClip = container.querySelector('#btn-quick-clipboard');
  const configModal = container.querySelector('#bridge-config-modal');
  const btnCloseModal = container.querySelector('#btn-close-bridge-config');
  const btnCancelModal = container.querySelector('#btn-cancel-bridge-config');
  const btnSaveModal = container.querySelector('#btn-save-bridge-config');
  const configForm = container.querySelector('#bridge-config-form');

  if (btnQuickClip) {
    btnQuickClip.addEventListener('click', () => {
      if (window.commandPalette) {
        window.commandPalette.open('', 'clipboard');
      }
    });
  }

  function renderApps(config) {
    if (!appsGrid || !config || !config.apps) return;
    const apps = config.apps;

    appsGrid.innerHTML = Object.entries(apps).map(([id, app]) => {
      const isConfigured = app.path && app.path.trim().length > 0;
      const isAvailable = isConfigured && (app.exists !== false);
      const titleHint = isAvailable 
        ? `Launch ${app.name} (${app.path})` 
        : (isConfigured 
            ? `${app.name} not found at: ${app.path}. Click gear to reconfigure.` 
            : `${app.name} not configured. Click to configure path.`);
      return `
        <button class="launch-app-tile ${isAvailable ? 'available' : 'missing'}" data-app-id="${id}" title="${escapeAttr(titleHint)}">
          <div class="app-tile-top">
            <span class="app-tile-tag" style="border-color: ${app.border || 'var(--border-subtle)'}; background: ${app.color || 'var(--bg-elevated)'};">${app.tag}</span>
            <span class="app-tile-dot ${isAvailable ? 'online' : 'offline'}"></span>
          </div>
          <div class="app-tile-name">${app.name}</div>
        </button>
      `;
    }).join('');

    appsGrid.querySelectorAll('.launch-app-tile').forEach(tile => {
      tile.addEventListener('click', async () => {
        const appId = tile.dataset.appId;
        const app = apps[appId];
        if (!app || !app.path || !app.path.trim() || app.exists === false) {
          tile.classList.add('error-shake');
          setTimeout(() => tile.classList.remove('error-shake'), 600);
          if (btnConfig) btnConfig.click();
          return;
        }
        tile.classList.add('launching');
        const success = await window.deckBridge.launchApp(appId);
        setTimeout(() => tile.classList.remove('launching'), 800);
        if (!success) {
          tile.classList.add('error-shake');
          setTimeout(() => tile.classList.remove('error-shake'), 600);
          if (btnConfig) btnConfig.click();
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

function initAmbientDPDC(container) {
  const pill = container.querySelector('#ticker-dpdc-pill');
  const divider = container.querySelector('#ticker-dpdc-divider');
  const valEl = container.querySelector('#ticker-dpdc-val');

  if (!pill) return;

  pill.addEventListener('click', () => {
    store.setActiveTab('tab-utilities');
  });

  function updatePill(data) {
    if (!data) return;
    const days = data.daysRemaining !== undefined ? data.daysRemaining : 14;
    const bal = data.liveBalance !== undefined ? data.liveBalance : data.rawBalance;

    // Show ambient alert pill if days < 5 or balance < 300
    if (days < 5 || bal < 300) {
      if (pill) pill.style.display = 'inline-flex';
      if (divider) divider.style.display = 'inline-block';
      if (valEl) valEl.textContent = `৳${Math.round(bal)} (${days.toFixed(1)}d)`;
    } else {
      if (pill) pill.style.display = 'none';
      if (divider) divider.style.display = 'none';
    }
  }

  const cached = getCachedDPDC();
  if (cached) updatePill(cached);

  fetchLiveDPDC().then(data => {
    updatePill(data);
  }).catch(() => {});

  store.on('dpdc:updated', (data) => updatePill(data));
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

