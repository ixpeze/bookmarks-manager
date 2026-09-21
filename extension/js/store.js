/**
 * store.js
 * Local-First Reactive State Management for Aura Command Center
 */

import { BOOKMARK_DATA } from './data.js';

const STORAGE_KEYS = {
  ACTIVE_TAB: 'aura_active_tab',
  SEARCH_ENGINE: 'aura_search_engine',
  SCRATCHPAD: 'aura_scratchpad_notes',
  CUSTOM_PROMPTS: 'aura_custom_prompts',
  CLOUD_CONFIG: 'aura_cloud_config',
  DPDC_BALANCE: 'aura_dpdc_balance',
  DPDC_BURN_RATE: 'aura_dpdc_burn_rate',
  DPDC_FIXED: 'aura_dpdc_fixed',
  DPDC_DATE: 'aura_dpdc_date',
  THEME: 'aura_theme'
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
      console.warn('Storage write failed', e);
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
      this.listeners.get(event).forEach(cb => cb(data));
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
