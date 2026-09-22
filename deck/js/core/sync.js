/**
 * sync.js
 * Deck — Google Drive Folder Sync & Local JSON Backup
 * Uses browser File System Access API (showDirectoryPicker) to sync directly
 * with your Google Drive desktop synced folder.
 */

import { store, STORAGE_KEYS } from './store.js';

const IDB_NAME = 'deck_drive_db';
const IDB_STORE = 'handles';
const HANDLE_KEY = 'gdrive_dir_handle';
const SYNC_FILENAME = 'deck_sync.json';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDirHandle(handle) {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('[Deck Sync] Could not save handle to IDB', e);
    return false;
  }
}

async function getDirHandle() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export class GoogleDriveSync {
  constructor() {
    this.dirHandle = null;
    this.folderName = localStorage.getItem(STORAGE_KEYS.GDRIVE_FOLDER) || '';
    this.init();
  }

  async init() {
    this.dirHandle = await getDirHandle();
    if (this.dirHandle) {
      try {
        const perm = await this.dirHandle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          console.log('[Deck Sync] Google Drive folder permission active:', this.folderName);
        }
      } catch (e) {
        console.warn('[Deck Sync] Folder permission check', e);
      }
    }
  }

  isSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  isConnected() {
    return Boolean(this.dirHandle && this.folderName);
  }

  async selectFolder() {
    if (!this.isSupported()) {
      throw new Error('Your browser does not support folder selection. Please use manual JSON backup.');
    }

    try {
      const handle = await window.showDirectoryPicker({
        id: 'deck_gdrive_sync',
        mode: 'readwrite',
        startIn: 'documents'
      });

      this.dirHandle = handle;
      this.folderName = handle.name;
      localStorage.setItem(STORAGE_KEYS.GDRIVE_FOLDER, handle.name);
      await saveDirHandle(handle);

      // Immediately perform initial sync
      await this.saveToFolder();

      return {
        success: true,
        folderName: handle.name,
        message: `Connected to "${handle.name}". Auto-sync active.`
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Folder selection cancelled.' };
      }
      throw err;
    }
  }

  async disconnectFolder() {
    this.dirHandle = null;
    this.folderName = '';
    localStorage.removeItem(STORAGE_KEYS.GDRIVE_FOLDER);
    try {
      const db = await openIDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(HANDLE_KEY);
    } catch (e) {
      console.warn('[Deck Sync] Failed to clear handle', e);
    }
    return { success: true, message: 'Disconnected Google Drive folder.' };
  }

  getPayload() {
    return {
      version: '1.0',
      timestamp: Date.now(),
      dateISO: new Date().toISOString(),
      scratchpad: store.state.scratchpad,
      customPrompts: store.state.customPrompts,
      dpdcBalance: store.state.dpdcBalance,
      dpdcBurnRate: store.state.dpdcBurnRate,
      activeTab: store.state.activeTab,
      searchEngine: store.state.searchEngine
    };
  }

  async saveToFolder() {
    if (!this.dirHandle) {
      return { success: false, message: 'No Google Drive folder linked.' };
    }

    try {
      const perm = await this.dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        return { success: false, message: 'Permission denied to write to folder.' };
      }

      const fileHandle = await this.dirHandle.getFileHandle(SYNC_FILENAME, { create: true });
      const writable = await fileHandle.createWritable();
      const payload = this.getPayload();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();

      return {
        success: true,
        message: `Synced to ${this.folderName}/${SYNC_FILENAME} at ${new Date().toLocaleTimeString()}`
      };
    } catch (err) {
      console.warn('[Deck Sync] Folder save error', err);
      return { success: false, message: `Sync failed: ${err.message}` };
    }
  }

  async loadFromFolder() {
    if (!this.dirHandle) {
      return { success: false, message: 'No Google Drive folder linked.' };
    }

    try {
      const perm = await this.dirHandle.requestPermission({ mode: 'read' });
      if (perm !== 'granted') {
        return { success: false, message: 'Permission denied to read folder.' };
      }

      const fileHandle = await this.dirHandle.getFileHandle(SYNC_FILENAME, { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);

      this.applyData(data);
      return { success: true, message: `Restored sync from ${this.folderName}` };
    } catch (err) {
      if (err.name === 'NotFoundError') {
        return await this.saveToFolder();
      }
      return { success: false, message: `Read failed: ${err.message}` };
    }
  }

  applyData(data) {
    if (data.scratchpad !== undefined) store.saveScratchpad(data.scratchpad);
    if (data.customPrompts && Array.isArray(data.customPrompts)) {
      data.customPrompts.forEach(p => store.addCustomPrompt(p));
    }
    if (data.dpdcBalance !== undefined) {
      store.saveDPDCMetrics(data.dpdcBalance, data.dpdcBurnRate || 95);
    }
    if (data.searchEngine) {
      store.setSearchEngine(data.searchEngine);
    }
  }

  exportFile() {
    const payload = this.getPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.applyData(data);
          resolve({ success: true, message: 'Imported backup successfully!' });
        } catch (err) {
          reject(new Error('Invalid backup JSON file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  }
}

export const googleDriveSync = new GoogleDriveSync();
