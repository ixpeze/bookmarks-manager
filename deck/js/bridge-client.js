/**
 * Deck Desktop Bridge Client
 * ===========================
 * Communicates with localhost:8080 bridge daemon.
 * Manages adaptive telemetry polling, app execution, Everything 1.5 search,
 * and project drag-and-drop path resolution.
 */

class DeckBridgeClient {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.isConnected = false;
    this.isEverythingConnected = false;
    this.telemetryTimer = null;
    this.pollInterval = 2500;
    this.statusCheckInterval = 5000;
    this.lastStats = null;
    this.config = null;

    this._init();
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
      // Bridge is offline
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
    try {
      const res = await fetch(`${this.baseUrl}/api/config`, { cache: 'no-store' });
      if (res.ok) {
        this.config = await res.json();
        window.dispatchEvent(new CustomEvent('deck:bridge-config', { detail: this.config }));
        return this.config;
      }
    } catch (e) {
      console.warn('[BridgeClient] Failed to fetch config:', e);
    }
    return null;
  }

  async saveConfig(cfg) {
    try {
      const res = await fetch(`${this.baseUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
      if (res.ok) {
        const data = await res.json();
        this.config = data.config;
        return true;
      }
    } catch (e) {
      console.error('[BridgeClient] Failed to save config:', e);
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
      console.error('[BridgeClient] Everything search failed:', e);
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
      const data = await res.json();
      return data.success;
    } catch (e) {
      console.error('[BridgeClient] Launch error:', e);
      return false;
    }
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
      console.error('[BridgeClient] File picker error:', e);
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
      console.error('[BridgeClient] Resolve file error:', e);
    }
    return null;
  }
}

// Global Bridge Client Singleton
window.deckBridge = new DeckBridgeClient();
