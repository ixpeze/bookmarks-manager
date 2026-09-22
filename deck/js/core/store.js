/**
 * store.js
 * Deck — Local-First Reactive State Store
 * Manages configuration, notes, metrics, prompts, and bookmarks state with deck_* persistence.
 */

import { BOOKMARK_DATA } from '../data/bookmarks.js';

export const STORAGE_KEYS = {
  ACTIVE_TAB: 'deck_active_tab',
  SEARCH_ENGINE: 'deck_search_engine',
  SCRATCHPAD: 'deck_scratchpad_notes',
  CUSTOM_PROMPTS: 'deck_custom_prompts',
  CUSTOM_BOOKMARKS: 'deck_custom_bookmarks',
  STARRED_BOOKMARKS: 'deck_starred_bookmarks',
  BOOKMARKS_VIEW_MODE: 'deck_bookmarks_view_mode',
  CLOUD_CONFIG: 'deck_cloud_config',
  DPDC_BALANCE: 'deck_dpdc_balance',
  DPDC_BURN_RATE: 'deck_dpdc_burn_rate',
  DPDC_FIXED: 'deck_dpdc_fixed',
  DPDC_DATE: 'deck_dpdc_date',
  THEME: 'deck_theme',
  GDRIVE_FOLDER: 'deck_gdrive_folder_name'
};

class Store {
  constructor() {
    this.listeners = new Map();
    this.state = {
      theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
      activeTab: localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) || 'tab-command-center',
      searchEngine: localStorage.getItem(STORAGE_KEYS.SEARCH_ENGINE) || 'google',
      scratchpad: localStorage.getItem(STORAGE_KEYS.SCRATCHPAD) || '',
      customPrompts: this.loadJSON(STORAGE_KEYS.CUSTOM_PROMPTS, []),
      customBookmarks: this.loadJSON(STORAGE_KEYS.CUSTOM_BOOKMARKS, []),
      starredBookmarks: new Set(this.loadJSON(STORAGE_KEYS.STARRED_BOOKMARKS, [])),
      bookmarksViewMode: localStorage.getItem(STORAGE_KEYS.BOOKMARKS_VIEW_MODE) || 'cards',
      cloudConfig: this.loadJSON(STORAGE_KEYS.CLOUD_CONFIG, { url: '', key: '', autoSync: false }),
      dpdcBalance: parseFloat(localStorage.getItem(STORAGE_KEYS.DPDC_BALANCE)) || 2500,
      dpdcBurnRate: parseFloat(localStorage.getItem(STORAGE_KEYS.DPDC_BURN_RATE)) || 95,
      dpdcFixed: parseFloat(localStorage.getItem(STORAGE_KEYS.DPDC_FIXED)) || 150,
      dpdcDate: localStorage.getItem(STORAGE_KEYS.DPDC_DATE) || new Date().toISOString().slice(0, 10),
      toolbarZones: BOOKMARK_DATA.toolbarZones,
      library: BOOKMARK_DATA.library,
      defaultPrompts: BOOKMARK_DATA.defaultPrompts
    };

    // Apply theme immediately to document
    document.documentElement.setAttribute('data-theme', this.state.theme);
  }

  loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('[Deck Store] Storage write failed', e);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Deck Store] Error in listener for "${event}":`, err);
        }
      });
    }
  }

  setActiveTab(tabId) {
    this.state.activeTab = tabId;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tabId);
    this.emit('tab:changed', tabId);
  }

  setSearchEngine(engine) {
    this.state.searchEngine = engine;
    localStorage.setItem(STORAGE_KEYS.SEARCH_ENGINE, engine);
    this.emit('engine:changed', engine);
  }

  saveScratchpad(text) {
    this.state.scratchpad = text;
    localStorage.setItem(STORAGE_KEYS.SCRATCHPAD, text);
    this.emit('scratchpad:updated', text);
  }

  addCustomPrompt(prompt) {
    this.state.customPrompts.unshift(prompt);
    this.saveJSON(STORAGE_KEYS.CUSTOM_PROMPTS, this.state.customPrompts);
    this.emit('prompts:updated', this.getAllPrompts());
  }

  getAllPrompts() {
    return [...this.state.customPrompts, ...this.state.defaultPrompts];
  }

  saveDPDCMetrics(balance, burnRate, fixedCharges = 150, date = new Date().toISOString().slice(0, 10)) {
    this.state.dpdcBalance = balance;
    this.state.dpdcBurnRate = burnRate;
    this.state.dpdcFixed = fixedCharges;
    this.state.dpdcDate = date;
    localStorage.setItem(STORAGE_KEYS.DPDC_BALANCE, balance.toString());
    localStorage.setItem(STORAGE_KEYS.DPDC_BURN_RATE, burnRate.toString());
    localStorage.setItem(STORAGE_KEYS.DPDC_FIXED, fixedCharges.toString());
    localStorage.setItem(STORAGE_KEYS.DPDC_DATE, date);
    this.emit('dpdc:updated', { balance, burnRate, fixedCharges, date });
  }

  addCustomBookmark(bookmark) {
    if (!bookmark.id) bookmark.id = 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    if (!bookmark.createdAt) bookmark.createdAt = new Date().toISOString();
    this.state.customBookmarks.unshift(bookmark);
    this.saveJSON(STORAGE_KEYS.CUSTOM_BOOKMARKS, this.state.customBookmarks);
    this.emit('bookmarks:updated', this.state.customBookmarks);
    return bookmark;
  }

  deleteCustomBookmark(id) {
    this.state.customBookmarks = this.state.customBookmarks.filter(b => b.id !== id);
    this.saveJSON(STORAGE_KEYS.CUSTOM_BOOKMARKS, this.state.customBookmarks);
    this.emit('bookmarks:updated', this.state.customBookmarks);
  }

  toggleStarred(url) {
    if (this.state.starredBookmarks.has(url)) {
      this.state.starredBookmarks.delete(url);
    } else {
      this.state.starredBookmarks.add(url);
    }
    this.saveJSON(STORAGE_KEYS.STARRED_BOOKMARKS, Array.from(this.state.starredBookmarks));
    this.emit('bookmarks:starred-changed', { url, starred: this.state.starredBookmarks.has(url) });
    return this.state.starredBookmarks.has(url);
  }

  isStarred(url) {
    return this.state.starredBookmarks.has(url);
  }

  setBookmarksViewMode(mode) {
    this.state.bookmarksViewMode = mode;
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS_VIEW_MODE, mode);
    this.emit('bookmarks:view-mode-changed', mode);
  }

  setTheme(theme) {
    this.state.theme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.emit('theme:changed', theme);
  }

  toggleTheme() {
    const next = this.state.theme === 'light' ? 'dark' : 'light';
    this.setTheme(next);
    return next;
  }
}

export const store = new Store();
