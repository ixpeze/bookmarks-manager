/**
 * app.js
 * Main Application Orchestrator, Theme Switcher & Google Drive Sync
 */

import { store } from './store.js';
import { googleDriveSync } from './sync.js';
import { renderCommandCenter } from './tabs/command-center.js';
import { renderStudio3D } from './tabs/studio-3d.js';
import { renderLibraryExplorer } from './tabs/library-explorer.js';
import { renderUtilities } from './tabs/utilities.js';

class App {
  constructor() {
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    this.renderedTabs = new Set();
    this.init();
  }

  init() {
    this.bindNavigation();
    this.bindThemeToggle();
    this.bindGoogleDriveModal();
    this.bindGlobalHotkeys();
    this.registerServiceWorker();

    // Restore or open initial tab
    const initialTab = store.state.activeTab || 'tab-command-center';
    this.switchTab(initialTab);
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

  switchTab(tabId) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (!this.renderedTabs.has(tabId)) {
      const targetPane = document.getElementById(tabId);
      if (targetPane) {
        this.renderTabContent(tabId, targetPane);
        this.renderedTabs.add(tabId);
      }
    }

    store.setActiveTab(tabId);
  }

  renderTabContent(tabId, paneEl) {
    switch (tabId) {
      case 'tab-command-center':
        renderCommandCenter(paneEl);
        break;
      case 'tab-studio-3d':
        renderStudio3D(paneEl);
        break;
      case 'tab-library-explorer':
        renderLibraryExplorer(paneEl);
        break;
      case 'tab-utilities':
        renderUtilities(paneEl);
        break;
      default:
        paneEl.innerHTML = `<div class="bento-card">Tab not found</div>`;
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed', err);
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
        btnToggle.style.background = 'var(--bg-card-elevated)';
        btnToggle.style.color = 'var(--rose-primary)';
        actionsRow.style.display = 'flex';
      } else {
        dot.style.background = 'var(--text-muted)';
        dot.style.boxShadow = 'none';
        title.textContent = 'No Folder Linked';
        meta.textContent = 'Click below to select Google Drive folder';
        btnToggle.textContent = 'Select Folder';
        btnToggle.style.background = 'var(--cyan-primary)';
        btnToggle.style.color = '#07090e';
        actionsRow.style.display = 'none';
      }
    };

    btnOpen.addEventListener('click', () => {
      updateFolderUI();
      modal.classList.add('open');
      feedback.textContent = '';
    });

    const closeModal = () => modal.classList.remove('open');
    if (btnClose) btnClose.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    btnToggle.addEventListener('click', async () => {
      if (googleDriveSync.isConnected()) {
        await googleDriveSync.disconnectFolder();
        updateFolderUI();
        feedback.textContent = 'Google Drive folder disconnected.';
        feedback.style.color = 'var(--text-muted)';
      } else {
        try {
          const res = await googleDriveSync.selectFolder();
          updateFolderUI();
          feedback.textContent = res.message;
          feedback.style.color = res.success ? 'var(--emerald-primary)' : 'var(--amber-primary)';
        } catch (err) {
          feedback.textContent = err.message;
          feedback.style.color = 'var(--rose-primary)';
        }
      }
    });

    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', async () => {
        feedback.textContent = 'Writing to Google Drive...';
        const res = await googleDriveSync.saveToFolder();
        feedback.textContent = res.message;
        feedback.style.color = res.success ? 'var(--emerald-primary)' : 'var(--rose-primary)';
      });
    }

    if (btnPullNow) {
      btnPullNow.addEventListener('click', async () => {
        feedback.textContent = 'Reading from Google Drive...';
        const res = await googleDriveSync.loadFromFolder();
        feedback.textContent = res.message;
        feedback.style.color = res.success ? 'var(--emerald-primary)' : 'var(--rose-primary)';
        // Refresh active tab
        const activeTab = store.state.activeTab;
        const targetPane = document.getElementById(activeTab);
        if (targetPane) this.renderTabContent(activeTab, targetPane);
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        googleDriveSync.exportFile();
        feedback.textContent = 'Backup JSON downloaded.';
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
          const activeTab = store.state.activeTab;
          const targetPane = document.getElementById(activeTab);
          if (targetPane) this.renderTabContent(activeTab, targetPane);
        } catch (err) {
          feedback.textContent = err.message;
          feedback.style.color = 'var(--rose-primary)';
        }
        fileInput.value = '';
      });
    }
  }

  bindGlobalHotkeys() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const tabs = ['tab-command-center', 'tab-studio-3d', 'tab-ai-workbench', 'tab-library-explorer', 'tab-utilities'];
        if (tabs[index]) {
          this.switchTab(tabs[index]);
        }
      }
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').then(() => {
        console.log('Aura Service Worker registered for offline capability');
      }).catch(err => {
        console.warn('SW registration skipped or failed', err);
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
