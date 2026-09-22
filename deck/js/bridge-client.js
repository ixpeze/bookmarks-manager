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
      path: "C:\\Program Files\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe",
      args: ""
    },
    blender: {
      name: "Blender",
      tag: "BLEND",
      color: "#2c1c0a",
      border: "#dd6b20",
      icon: "cube",
      path: "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe",
      args: ""
    },
    pureref: {
      name: "PureRef",
      tag: "REF",
      color: "#1a202c",
      border: "#718096",
      icon: "layout",
      path: "C:\\Program Files\\PureRef\\PureRef.exe",
      args: ""
    },
    vscode: {
      name: "VS Code",
      tag: "CODE",
      color: "#0d1b2a",
      border: "#007acc",
      icon: "code",
      path: "C:\\Users\\eudgi\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
      args: ""
    }
  },
  quick_folders: [
    { id: "ai_projects", name: "AI Projects", path: "D:\\AI", icon: "cpu" },
    { id: "downloads", name: "Downloads", path: "C:\\Users\\eudgi\\Downloads", icon: "download" },
    { id: "assets", name: "Assets", path: "D:\\AI", icon: "folder" },
    { id: "gdrive", name: "Google Drive", path: "G:\\", icon: "cloud" },
    { id: "comfy_output", name: "ComfyUI Outputs", path: "E:\\_AI\\ComfyUI\\Instances\\C_UI\\CUI\\ComfyUI\\output", icon: "film" }
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
    if (!this.isConnected) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/open-dir`, {
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
}

// Global Bridge Client Singleton
window.deckBridge = new DeckBridgeClient();
