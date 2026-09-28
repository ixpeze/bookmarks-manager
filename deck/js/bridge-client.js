/**
 * Deck Desktop Bridge Client
 * ===========================
 * Communicates with localhost:8080 bridge daemon.
 * Manages adaptive telemetry polling, app execution, Everything 1.5 search,
 * and project drag-and-drop path resolution.
 * Includes offline resilience and local caching to prevent extension console error badges.
 */

const DEFAULT_DECK_CONFIG = {
  version: "1.0.0",
  apps: {
    unreal: {
      name: "Unreal Engine 5",
      tag: "UE5",
      color: "#0E1128",
      border: "#2c5282",
      icon: "box",
      path: "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe",
      args: ""
    },
    "3dsmax": {
      name: "3ds Max",
      tag: "MAX",
      color: "#112233",
      border: "#2b6cb0",
      icon: "layers",
      path: "C:\\Program Files\\Autodesk\\3ds Max 2026\\3dsmax.exe",
      args: ""
    },
    photoshop: {
      name: "Photoshop",
      tag: "PSD",
      color: "#001e36",
      border: "#3182ce",
      icon: "image",
      path: "C:\\Program Files\\Adobe\\Adobe Photoshop 2026\\Photoshop.exe",
      args: ""
    },
    blender: {
      name: "Blender",
      tag: "BLEND",
      color: "#2c1c0a",
      border: "#dd6b20",
      icon: "cube",
      path: "",
      args: ""
    },
    pureref: {
      name: "PureRef",
      tag: "REF",
      color: "#1a202c",
      border: "#718096",
      icon: "layout",
      path: "",
      args: ""
    },
    vscode: {
      name: "Antigravity IDE",
      tag: "AGY",
      color: "#0d1b2a",
      border: "#007acc",
      icon: "code",
      path: "C:\\Users\\xpeze\\AppData\\Local\\Programs\\Antigravity IDE\\Antigravity IDE.exe",
      args: ""
    }
  },
  quick_folders: [
    { id: "ai_projects", name: "AI Projects", path: "G:\\AI", icon: "cpu" },
    { id: "downloads", name: "Downloads", path: "C:\\Users\\xpeze\\Downloads", icon: "download" },
    { id: "assets", name: "Assets", path: "F:\\", icon: "folder" },
    { id: "scratch", name: "Scratch", path: "D:\\", icon: "hard-drive" },
    { id: "gdrive", name: "Google Drive", path: "H:\\", icon: "cloud" }
  ]
};

class DeckBridgeClient {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.isConnected = false;
    this.isEverythingConnected = false;
    this.telemetryTimer = null;
    this.pollInterval = 2500;
    this.statusCheckInterval = 5000;
    this.lastStats = null;
    this.config = this._loadCachedConfig();

    this._init();
  }

  _loadCachedConfig() {
    try {
      const raw = localStorage.getItem('deck_bridge_config_cache');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_DECK_CONFIG;
  }

  _saveCachedConfig(cfg) {
    if (!cfg) return;
    try {
      localStorage.setItem('deck_bridge_config_cache', JSON.stringify(cfg));
    } catch (_) {}
  }

  async _init() {
    await this.checkStatus();
    this._startAdaptiveTelemetry();

    // Pause polling when tab is inactive to achieve zero CPU load
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._stopTelemetry();
      } else {
        this.checkStatus();
        this._startAdaptiveTelemetry();
      }
    });

    // Periodically re-check bridge status if offline
    setInterval(() => {
      if (!this.isConnected && !document.hidden) {
        this.checkStatus();
      }
    }, this.statusCheckInterval);
  }

  async checkStatus() {
    try {
      const res = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const wasConnected = this.isConnected;
        this.isConnected = true;
        this.isEverythingConnected = !!data.everything_connected;

        window.dispatchEvent(new CustomEvent('deck:bridge-status', {
          detail: {
            connected: true,
            everything: this.isEverythingConnected,
            version: data.version
          }
        }));

        if (!wasConnected) {
          this.fetchConfig();
          this.fetchTelemetry();
        }
        return true;
      }
    } catch (e) {
      // Bridge is offline — expected when companion script is not running
    }

    if (this.isConnected) {
      this.isConnected = false;
      this.isEverythingConnected = false;
      window.dispatchEvent(new CustomEvent('deck:bridge-status', {
        detail: { connected: false, everything: false }
      }));
    }
    return false;
  }

  _startAdaptiveTelemetry() {
    this._stopTelemetry();
    if (this.isConnected && !document.hidden) {
      this.fetchTelemetry();
      this.telemetryTimer = setInterval(() => {
        if (!document.hidden && this.isConnected) {
          this.fetchTelemetry();
        }
      }, this.pollInterval);
    }
  }

  _stopTelemetry() {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }

  async fetchTelemetry() {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/system`, { cache: 'no-store' });
      if (res.ok) {
        const stats = await res.json();
        this.lastStats = stats;
        window.dispatchEvent(new CustomEvent('deck:bridge-telemetry', { detail: stats }));
        return stats;
      }
    } catch (e) {
      this.isConnected = false;
    }
    return null;
  }

  async fetchConfig() {
    if (!this.isConnected) {
      return this.config || this._loadCachedConfig();
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/config`, { cache: 'no-store' });
      if (res.ok) {
        this.config = await res.json();
        this._saveCachedConfig(this.config);
        window.dispatchEvent(new CustomEvent('deck:bridge-config', { detail: this.config }));
        return this.config;
      }
    } catch (e) {
      // Bridge connection interrupted or offline; graceful fallback without console.warn error badges
      this.isConnected = false;
    }
    return this.config || this._loadCachedConfig();
  }

  async saveConfig(cfg) {
    this._saveCachedConfig(cfg);
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
      if (res.ok) {
        const data = await res.json();
        this.config = data.config;
        this._saveCachedConfig(this.config);
        return true;
      }
    } catch (e) {
      // Graceful offline failure
    }
    return false;
  }

  /**
   * Search Everything 1.5 index via C-types bridge
   */
  async searchEverything(query, count = 10) {
    if (!this.isConnected || !query.trim()) return [];
    try {
      const url = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}&count=${count}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch (e) {
      // Bridge disconnected or query interrupted
    }
    return [];
  }

  /**
   * Launch Everything desktop GUI with search query
   */
  async openEverythingGUI(query = '') {
    if (!this.isConnected) return false;
    try {
      const url = `${this.baseUrl}/api/everything/gui?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { cache: 'no-store' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Launch application by ID or custom executable path
   */
  async launchApp(appId, customPath = null) {
    if (!this.isConnected) {
      alert('Desktop Bridge is offline. Run launch_dashboard.bat to launch applications.');
      return false;
    }
    try {
      const body = customPath ? { path: customPath } : { app_id: appId };
      const res = await fetch(`${this.baseUrl}/api/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
    } catch (e) {
      // Graceful failure
    }
    return false;
  }

  /**
   * Open file or folder in Explorer / associated program
   */
  async openPath(path) {
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Open directory or highlight file in Windows Explorer
   */
  async openInExplorer(path) {
    if (!this.isConnected) {
      alert('Desktop Bridge is offline. Double-click launch_dashboard.bat on your desktop to enable Windows Explorer and native application launching.');
      return false;
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/open-dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (res.ok) {
        this.isConnected = true;
        return true;
      }
      const errData = await res.json().catch(() => ({}));
      console.warn('[DeckBridge] openInExplorer failed:', res.status, errData.message || '');
      return false;
    } catch (e) {
      console.error('[DeckBridge] openInExplorer network error:', e.message);
      // Don't flip isConnected — a single fetch failure shouldn't mark bridge offline.
      // The periodic status check handles real disconnections.
      return false;
    }
  }

  /**
   * Launch native Windows Open File dialog to pick projects/files
   */
  async pickFile(title = 'Select Project File') {
    if (!this.isConnected) {
      alert('Desktop Bridge is offline. Start the bridge to pick files.');
      return null;
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/pick-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const data = await res.json();
        return data.success ? data.path : null;
      }
    } catch (e) {
      // Graceful failure
    }
    return null;
  }

  /**
   * Fetch Clipboard History items with optional query filter
   */
  async getClipboardHistory(query = '') {
    if (!this.isConnected) return { items: [], total: 0 };
    try {
      const q = encodeURIComponent(query);
      const res = await fetch(`${this.baseUrl}/api/clipboard?q=${q}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return { items: [], total: 0 };
  }

  /**
   * Set text or image onto Windows OS clipboard via bridge & browser fallback
   */
  async copyToClipboard(payload) {
    const isImage = typeof payload === 'object' && (payload.is_image || (payload.id && payload.id.startsWith('clip_') && payload.type === 'image'));
    if (!isImage) {
      const text = typeof payload === 'string' ? payload : (payload.text || '');
      try {
        if (navigator.clipboard && navigator.clipboard.writeText && text) {
          await navigator.clipboard.writeText(text);
        }
      } catch (_) {}
    }

    if (!this.isConnected) return true;
    try {
      const body = typeof payload === 'string' ? { text: payload } : payload;
      const res = await fetch(`${this.baseUrl}/api/clipboard/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Send a native Windows 10/11 desktop toast notification
   */
  async sendToast(title = 'Deck Command Center', message = '') {
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/toast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message })
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Pin or unpin clipboard item
   */
  async pinClipboardItem(id, pinned = true) {
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/clipboard/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pinned })
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Clear unpinned clipboard items
   */
  async clearClipboardHistory() {
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/clipboard/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Query heavy files >500MB/1GB via Everything 1.5 IPC
   */
  async getHeavyStorage(drive = 'C', threshold = '500MB', group = 'all') {
    if (!this.isConnected) return { items: [], count: 0, total_formatted: '0 B' };
    try {
      const params = new URLSearchParams({ drive, threshold, group });
      const res = await fetch(`${this.baseUrl}/api/storage/heavy?${params.toString()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return { items: [], count: 0, total_formatted: '0 B' };
  }

  /**
   * List available rolling backup snapshots
   */
  async listSnapshots() {
    if (!this.isConnected) return { snapshots: [], last_backup: null };
    try {
      const res = await fetch(`${this.baseUrl}/api/backup/list`, {
        cache: 'no-store'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return { snapshots: [], last_backup: null };
  }

  /**
   * Create rolling backup snapshot
   */
  async createSnapshot(state = {}) {
    if (!this.isConnected) return { success: false, message: 'Bridge offline' };
    try {
      const res = await fetch(`${this.baseUrl}/api/backup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
    return { success: false, message: 'Bridge request failed' };
  }

  /**
   * Restore a snapshot by filename
   */
  async restoreSnapshot(filename) {
    if (!this.isConnected) return { success: false, message: 'Bridge offline' };
    try {
      const res = await fetch(`${this.baseUrl}/api/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
    return { success: false, message: 'Bridge request failed' };
  }

  /**
   * Highlight/select file in Windows Explorer
   */
  async revealInExplorer(path) {
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Resolve dropped file from Explorer via Everything 1.5
   */
  async resolveDroppedFile(filename) {
    if (!this.isConnected) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/resolve-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: filename })
      });
      if (res.ok) {
        const data = await res.json();
        return data.success ? data.path : null;
      }
    } catch (e) {
      // Graceful failure
    }
    return null;
  }

  /**
   * Fetch Win32 Clipboard Ring Buffer history
   */
  async getClipboardHistory(query = '') {
    if (!this.isConnected) return { total: 0, items: [] };
    try {
      const url = `${this.baseUrl}/api/clipboard${query ? `?q=${encodeURIComponent(query)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[DeckBridge] Clipboard query error:', e);
    }
    return { total: 0, items: [] };
  }

  /**
   * Set text or image to Win32 & browser clipboard
   */
  async copyToClipboard(payload) {
    let body = {};
    if (typeof payload === 'string') {
      body = { text: payload };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(payload);
        }
      } catch (_) {}
    } else if (payload && typeof payload === 'object') {
      body = payload;
      if (payload.text) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(payload.text);
          }
        } catch (_) {}
      }
    }

    if (!this.isConnected) return true;

    try {
      const res = await fetch(`${this.baseUrl}/api/clipboard/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.success;
      }
    } catch (e) {
      console.warn('[DeckBridge] Set clipboard error:', e);
    }
    return false;
  }

  /**
   * Pin or unpin a clipboard history item
   */
  async pinClipboardItem(id, pinned = true) {
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/clipboard/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pinned })
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.success;
      }
    } catch (e) {
      console.warn('[DeckBridge] Pin clipboard error:', e);
    }
    return false;
  }

  /**
   * Clear all unpinned clipboard items
   */
  async clearClipboardHistory() {
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/clipboard/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.success;
      }
    } catch (e) {
      console.warn('[DeckBridge] Clear clipboard error:', e);
    }
    return false;
  }
}

// Global Bridge Client Singleton
window.deckBridge = new DeckBridgeClient();

