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

      // Escape to close Command Palette
      if (e.key === 'Escape') {
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
