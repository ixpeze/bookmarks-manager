/**
 * deck.js
 * Deck — Micro-Kernel & Application Orchestrator
 * Bootstraps the application, registers pluggable modules, and manages global lifecycle.
 */

import { store } from './core/store.js';
import { registry } from './core/registry.js';
import { googleDriveSync } from './core/sync.js';
import { bus } from './core/events.js';

// Import Feature Modules
import commandCenterModule from './modules/command-center.js';
import bookmarksManagerModule from './modules/bookmarks-manager.js';
import studio3DModule from './modules/studio-3d.js';
import utilitiesModule from './modules/utilities.js';

// Import Services
import { CommandPaletteModal } from './services/omnibar.js';

class DeckApp {
  constructor() {
    window.deckApp = this;
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    this.init();
  }

  async init() {
    // 1. Register Feature Modules
    registry.register(commandCenterModule);
    registry.register(bookmarksManagerModule);
    registry.register(studio3DModule);
    registry.register(utilitiesModule);

    // 2. Initialize Command Palette
    this.commandPalette = new CommandPaletteModal();
    window.commandPalette = this.commandPalette;

    // 3. Bind UI Controls & Hotkeys
    this.bindNavigation();
    this.bindThemeToggle();
    this.bindGoogleDriveModal();
    this.bindGlobalHotkeys();
    this.registerServiceWorker();

    // 4. Mount Initial Tab
    let initialTab = store.state.activeTab || 'tab-command-center';
    if (initialTab === 'tab-library-explorer') {
      initialTab = 'tab-bookmarks';
    }
    await this.switchTab(initialTab);
  }

  bindNavigation() {
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = btn.dataset.tab;
        this.switchTab(tabId);
      });
    });

    const btnFullscreen = document.querySelector('#btn-toggle-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    const btnClipboard = document.querySelector('#btn-open-clipboard');
    if (btnClipboard) {
      btnClipboard.addEventListener('click', () => {
        if (this.commandPalette) {
          this.commandPalette.open('', 'clipboard');
        }
      });
    }
  }

  bindThemeToggle() {
    const btn = document.querySelector('#btn-toggle-theme');
    if (!btn) return;

    const sunSVG = `<path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path><circle cx="12" cy="12" r="5"></circle>`;
    const moonSVG = `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>`;

    const updateThemeIcon = (theme) => {
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.innerHTML = theme === 'light' ? sunSVG : moonSVG;
        btn.setAttribute('title', theme === 'light' ? 'Switch to Dark Carbon Theme' : 'Switch to Light Alabaster Theme');
      }
    };

    updateThemeIcon(store.state.theme);

    btn.addEventListener('click', () => {
      const nextTheme = store.toggleTheme();
      updateThemeIcon(nextTheme);
    });

    store.on('theme:changed', (theme) => {
      updateThemeIcon(theme);
    });
  }

  async switchTab(tabId) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    const targetPane = document.getElementById(tabId);
    if (targetPane) {
      await registry.activate(tabId, targetPane, { store, bus });
    }

    store.setActiveTab(tabId);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('[Deck] Fullscreen request failed', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  bindGoogleDriveModal() {
    const btnOpen = document.querySelector('#btn-open-settings');
    const modal = document.querySelector('#settings-modal');
    const btnClose = document.querySelector('#btn-close-settings');
    const dot = document.querySelector('#gdrive-status-dot');
    const title = document.querySelector('#gdrive-folder-title');
    const meta = document.querySelector('#gdrive-sync-meta');
    const btnToggle = document.querySelector('#btn-toggle-folder');
    const actionsRow = document.querySelector('#gdrive-actions-row');
    const btnSyncNow = document.querySelector('#btn-sync-now');
    const btnPullNow = document.querySelector('#btn-pull-now');
    const feedback = document.querySelector('#gdrive-feedback');
    const btnExport = document.querySelector('#btn-export-json');
    const btnImportTrigger = document.querySelector('#btn-import-json-trigger');
    const fileInput = document.querySelector('#file-import-input');

    if (!btnOpen || !modal) return;

    const updateFolderUI = () => {
      if (googleDriveSync.isConnected()) {
        dot.style.background = 'var(--emerald-primary)';
        dot.style.boxShadow = '0 0 8px var(--emerald-primary)';
        title.textContent = googleDriveSync.folderName;
        meta.textContent = 'Active Google Drive sync linked';
        btnToggle.textContent = 'Disconnect';
        btnToggle.style.background = 'transparent';
        btnToggle.style.color = 'var(--text-muted)';
        btnToggle.style.border = '1px solid var(--border-subtle)';
        if (actionsRow) actionsRow.style.display = 'flex';
      } else {
        dot.style.background = 'var(--text-muted)';
        dot.style.boxShadow = 'none';
        title.textContent = 'No Folder Linked';
        meta.textContent = 'Click below to select Google Drive folder';
        btnToggle.textContent = 'Select Folder';
        btnToggle.style.background = 'var(--cyan-primary)';
        btnToggle.style.color = '#07090e';
        btnToggle.style.border = 'none';
        if (actionsRow) actionsRow.style.display = 'none';
      }
    };

    btnOpen.addEventListener('click', () => {
      updateFolderUI();
      loadBridgeSnapshots();
      feedback.textContent = '';
      modal.classList.add('open');
    });

    const closeModal = () => modal.classList.remove('open');
    if (btnClose) btnClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    btnToggle.addEventListener('click', async () => {
      if (googleDriveSync.isConnected()) {
        if (confirm('Disconnect Google Drive folder sync?')) {
          await googleDriveSync.disconnectFolder();
          updateFolderUI();
          feedback.textContent = 'Disconnected folder.';
          feedback.style.color = 'var(--text-muted)';
        }
      } else {
        try {
          feedback.textContent = 'Opening folder picker...';
          const res = await googleDriveSync.selectFolder();
          if (res.success) {
            updateFolderUI();
            feedback.textContent = res.message;
            feedback.style.color = 'var(--emerald-primary)';
          } else {
            feedback.textContent = res.message || 'Cancelled.';
            feedback.style.color = 'var(--text-muted)';
          }
        } catch (err) {
          feedback.textContent = err.message;
          feedback.style.color = 'var(--rose-primary)';
        }
      }
    });

    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', async () => {
        feedback.textContent = 'Syncing...';
        const res = await googleDriveSync.saveToFolder();
        feedback.textContent = res.message;
        feedback.style.color = res.success ? 'var(--emerald-primary)' : 'var(--rose-primary)';
      });
    }

    if (btnPullNow) {
      btnPullNow.addEventListener('click', async () => {
        if (confirm('Pull latest data from Google Drive? This will update local scratchpad and settings.')) {
          feedback.textContent = 'Reading from Drive...';
          const res = await googleDriveSync.loadFromFolder();
          feedback.textContent = res.message;
          feedback.style.color = res.success ? 'var(--emerald-primary)' : 'var(--rose-primary)';
        }
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        googleDriveSync.exportFile();
        feedback.textContent = 'Backup file downloaded!';
        feedback.style.color = 'var(--emerald-primary)';
      });
    }

    if (btnImportTrigger && fileInput) {
      btnImportTrigger.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const res = await googleDriveSync.importFile(file);
          feedback.textContent = res.message;
          feedback.style.color = 'var(--emerald-primary)';
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          feedback.textContent = err.message;
          feedback.style.color = 'var(--rose-primary)';
        }
      });
    }

    // Bridge Rolling Snapshots Section
    const btnCreateSnap = document.querySelector('#btn-create-snapshot');
    const btnRefreshSnaps = document.querySelector('#btn-refresh-snapshots');
    const snapsContainer = document.querySelector('#bridge-snapshots-container');
    const snapStatusPill = document.querySelector('#bridge-backup-status-pill');

    const loadBridgeSnapshots = async () => {
      if (!snapsContainer) return;
      if (!window.deckBridge || !window.deckBridge.isConnected) {
        snapsContainer.innerHTML = `<div style="padding: 10px; font-size: 11px; color: var(--text-muted); text-align: center;">Desktop Bridge offline</div>`;
        if (snapStatusPill) snapStatusPill.textContent = 'Offline';
        return;
      }

      const res = await window.deckBridge.listSnapshots();
      const list = res.snapshots || [];
      if (snapStatusPill) snapStatusPill.textContent = `${list.length} / 10`;

      if (list.length === 0) {
        snapsContainer.innerHTML = `<div style="padding: 10px; font-size: 11px; color: var(--text-muted); text-align: center;">No snapshots created yet</div>`;
        return;
      }

      snapsContainer.innerHTML = list.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--border-subtle); font-size: 11px;">
          <div>
            <div style="font-weight: 600; color: var(--text-primary); font-family: var(--font-mono); font-size: 10.5px;">${s.filename}</div>
            <div style="color: var(--text-muted); font-size: 10px;">${s.created_at} • ${s.size_formatted}</div>
          </div>
          <button class="btn-restore-snap" data-filename="${s.filename}" style="padding: 3px 8px; font-size: 10px; background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--cyan-primary); border-radius: 4px; cursor: pointer;">
            Restore
          </button>
        </div>
      `).join('');

      snapsContainer.querySelectorAll('.btn-restore-snap').forEach(b => {
        b.onclick = async () => {
          const fname = b.dataset.filename;
          if (confirm(`Restore Deck state from snapshot ${fname}?\nYour current browser state will be overwritten.`)) {
            const restored = await window.deckBridge.restoreSnapshot(fname);
            if (restored && restored.success && restored.state) {
              Object.entries(restored.state).forEach(([k, v]) => {
                try {
                  localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
                } catch (_) {}
              });
              feedback.textContent = `State restored from ${fname}! Reloading...`;
              feedback.style.color = 'var(--emerald-primary)';
              setTimeout(() => location.reload(), 1000);
            } else {
              feedback.textContent = `Restore failed: ${restored.message || 'Unknown error'}`;
              feedback.style.color = 'var(--rose-primary)';
            }
          }
        };
      });
    };

    if (btnCreateSnap) {
      btnCreateSnap.addEventListener('click', async () => {
        btnCreateSnap.disabled = true;
        btnCreateSnap.textContent = 'Saving...';
        const dump = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('deck_')) {
            dump[k] = localStorage.getItem(k);
          }
        }
        const res = await window.deckBridge.createSnapshot(dump);
        btnCreateSnap.disabled = false;
        btnCreateSnap.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Create Snapshot Now
        `;
        if (res && res.success) {
          feedback.textContent = `Snapshot created: ${res.filename}`;
          feedback.style.color = 'var(--emerald-primary)';
          loadBridgeSnapshots();
        } else {
          feedback.textContent = `Snapshot failed: ${res.message || 'Unknown error'}`;
          feedback.style.color = 'var(--rose-primary)';
        }
      });
    }

    if (btnRefreshSnaps) {
      btnRefreshSnaps.addEventListener('click', loadBridgeSnapshots);
    }
  }

  bindGlobalHotkeys() {
    document.addEventListener('keydown', (e) => {
      // Toggle Command Palette with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (this.commandPalette) this.commandPalette.toggle();
        return;
      }

      // Quick slash / to open search palette when not typing in an input
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        if (this.commandPalette) this.commandPalette.open();
        return;
      }

      // Ctrl+Shift+V directly opens Command Palette in Clipboard mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (this.commandPalette) this.commandPalette.open('', 'clipboard');
        return;
      }

      // Escape to close Command Palette or Storage Inspector
      if (e.key === 'Escape') {
        const storageModal = document.getElementById('storage-inspector-modal');
        if (storageModal && storageModal.classList.contains('open')) {
          e.preventDefault();
          storageModal.classList.remove('open');
          return;
        }

        if (this.commandPalette && this.commandPalette.modal && this.commandPalette.modal.classList.contains('open')) {
          e.preventDefault();
          this.commandPalette.close();
          return;
        }
      }

      // Toggle Fullscreen with 'F' key if not typing in an input or textarea
      if (e.key.toLowerCase() === 'f' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.toggleFullscreen();
      }

      // Quick numbers 1-4 for direct tab navigation
      if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const tabMap = {
          '1': 'tab-command-center',
          '2': 'tab-bookmarks',
          '3': 'tab-studio-3d',
          '4': 'tab-utilities'
        };
        if (tabMap[e.key]) {
          e.preventDefault();
          this.switchTab(tabMap[e.key]);
        }
      }
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('[Deck] Service Worker registered for offline capability');
          })
          .catch(err => {
            console.warn('[Deck] Service Worker registration failed', err);
          });
      });
    }
  }
}

// Bootstrap application on DOM ready or immediately if already interactive
function bootstrapDeck() {
  new DeckApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapDeck);
} else {
  bootstrapDeck();
}
