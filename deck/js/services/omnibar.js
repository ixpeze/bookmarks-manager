/**
 * omnibar.js
 * Deck — Universal Search Omnibar & Instant Bookmark + Everything 1.5 Filter
 */

import { store } from '../core/store.js';
import { BOOKMARK_DATA } from '../data/bookmarks.js';
import { SearchEngine } from './search.js';

const ENGINES = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q='
  },
  claude: {
    name: 'Claude',
    url: 'https://claude.ai/new?q='
  },
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/?q='
  },
  youtube: {
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query='
  },
  torrentbd: {
    name: 'TorrentBD',
    url: 'https://www.torrentbd.net/torrents-search.php?search='
  },
  cgpeers: {
    name: 'CGPeers',
    url: 'https://cgpeers.to/torrents.php?searchstr='
  }
};

export class Omnibar {
  constructor(containerEl) {
    this.container = containerEl;
    this.currentEngine = store.state.searchEngine || 'google';
    this.allBookmarks = this.indexAllBookmarks();
    this.selectedIndex = -1;
    this.everythingDebounceTimer = null;
    this.render();
    this.bindEvents();
  }

  indexAllBookmarks() {
    const list = [];
    BOOKMARK_DATA.toolbarZones.forEach(zone => {
      zone.items.forEach(item => {
        list.push({
          title: item.name,
          url: item.href,
          icon: item.icon,
          category: zone.title
        });
      });
    });
    const walk = (folder, path) => {
      if (folder.items) {
        folder.items.forEach(item => {
          list.push({
            title: item.title,
            url: item.href,
            icon: item.icon,
            category: path
          });
        });
      }
      if (folder.subfolders) {
        folder.subfolders.forEach(sub => {
          walk(sub, `${path} > ${sub.title}`);
        });
      }
    };
    BOOKMARK_DATA.library.forEach(cat => walk(cat, cat.title));
    return list;
  }

  render() {
    this.container.innerHTML = `
      <div class="omnibar-box">
        <span class="omnibar-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input 
          type="text" 
          class="omnibar-input" 
          id="omnibar-search-input"
          placeholder="Search bookmarks, web, or Everything 1.5 PC files (prefix \\ or >)..." 
          autocomplete="off"
          spellcheck="false"
        />
        <div class="engine-selector">
          ${Object.entries(ENGINES).map(([key, eng]) => `
            <button class="engine-pill ${key === this.currentEngine ? 'active' : ''}" data-engine="${key}">
              ${eng.name}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="omnibar-results" id="omnibar-dropdown"></div>
    `;

    this.input = this.container.querySelector('#omnibar-search-input');
    this.dropdown = this.container.querySelector('#omnibar-dropdown');
  }

  bindEvents() {
    this.container.querySelectorAll('.engine-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const eng = btn.dataset.engine;
        this.setEngine(eng);
        this.input.focus();
      });
    });

    this.input.addEventListener('input', () => {
      this.handleInput(this.input.value.trim());
    });

    this.input.addEventListener('keydown', (e) => {
      const items = this.dropdown.querySelectorAll('.result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % items.length;
          this.updateSelection(items);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
          this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
          this.updateSelection(items);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
          const selected = items[this.selectedIndex];
          this.activateResultItem(selected);
        } else if (items.length > 0) {
          this.activateResultItem(items[0]);
        } else {
          this.performWebSearch(this.input.value.trim());
        }
      } else if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.input && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.input.focus();
        this.input.select();
      }
    });
  }

  setEngine(engKey) {
    if (ENGINES[engKey]) {
      this.currentEngine = engKey;
      store.setSearchEngine(engKey);
      this.container.querySelectorAll('.engine-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.engine === engKey);
      });
    }
  }

  handleInput(query) {
    if (!query) {
      this.closeDropdown();
      return;
    }

    // Engine prefix shortcuts
    if (query.startsWith('!c ')) {
      this.setEngine('claude');
      this.input.value = query.slice(3);
      return;
    } else if (query.startsWith('!g ')) {
      this.setEngine('google');
      this.input.value = query.slice(3);
      return;
    } else if (query.startsWith('!yt ')) {
      this.setEngine('youtube');
      this.input.value = query.slice(4);
      return;
    } else if (query.startsWith('!cg ')) {
      this.setEngine('cgpeers');
      this.input.value = query.slice(4);
      return;
    }

    // Exclusive Everything 1.5 mode if starts with \ or >
    const isExclusivePC = query.startsWith('\\') || query.startsWith('>');
    const cleanQuery = isExclusivePC ? query.slice(1).trim() : query;

    const bookmarkResults = isExclusivePC ? [] : SearchEngine.search(this.allBookmarks, cleanQuery, { limit: 5 });

    // Initial render with bookmarks
    this.renderUnifiedResults(bookmarkResults, [], cleanQuery, isExclusivePC);

    // Fetch Everything results if bridge is connected
    if (window.deckBridge && window.deckBridge.isConnected && cleanQuery.length >= 2) {
      if (this.everythingDebounceTimer) clearTimeout(this.everythingDebounceTimer);
      this.everythingDebounceTimer = setTimeout(async () => {
        const fileLimit = isExclusivePC ? 10 : 5;
        const fileResults = await window.deckBridge.searchEverything(cleanQuery, fileLimit);
        // Only update if current query still matches
        if (this.input.value.trim().endsWith(cleanQuery)) {
          this.renderUnifiedResults(bookmarkResults, fileResults, cleanQuery, isExclusivePC);
        }
      }, 120);
    }
  }

  renderUnifiedResults(bookmarkResults, fileResults, query, isExclusivePC) {
    if (bookmarkResults.length === 0 && fileResults.length === 0) {
      this.dropdown.innerHTML = `
        <div class="result-item" id="web-search-action">
          <div class="result-left">
            <span class="result-title">Search <strong>${ENGINES[this.currentEngine].name}</strong> for "<em>${this.escapeHTML(query)}</em>"</span>
          </div>
          <span class="result-badge">Press Enter ↵</span>
        </div>
      `;
      this.dropdown.querySelector('#web-search-action').addEventListener('click', () => {
        this.performWebSearch(query);
      });
      this.openDropdown();
      return;
    }

    this.selectedIndex = -1;
    let html = '';

    // 1. Bookmark matches
    if (bookmarkResults.length > 0) {
      html += `<div class="omnibar-group-header">Bookmarks & Web</div>`;
      bookmarkResults.forEach((res) => {
        const m = res.item;
        let highRes = m.icon;
        try {
          if (m.url.startsWith('http://') || m.url.startsWith('https://')) {
            highRes = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(m.url).hostname)}&sz=128`;
          }
        } catch {}

        const displayTitle = res.highlightedTitle || this.escapeHTML(m.title);
        html += `
          <a href="${m.url}" target="_blank" rel="noopener noreferrer" class="result-item" data-type="url" data-url="${m.url}">
            <div class="result-left">
              <img src="${highRes}" class="result-icon" alt="" onerror="this.onerror=null; this.src='${m.icon || ''}';" loading="lazy" />
              <div>
                <div class="result-title">${displayTitle}</div>
                <div class="result-url">${m.url.replace(/^https?:\/\//, '').slice(0, 60)}</div>
              </div>
            </div>
            <span class="result-badge">${m.category.split('>').pop().trim() || 'Link'}</span>
          </a>
        `;
      });
    }

    // 2. Everything 1.5 Desktop Files
    if (fileResults.length > 0) {
      html += `
        <div class="omnibar-group-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span>⚡ Everything 1.5 Desktop Files</span>
          <span style="font-size: 10px; color: var(--emerald-primary); text-transform: none; letter-spacing: normal;">Sub-millisecond IPC</span>
        </div>
      `;

      fileResults.forEach((f) => {
        const ext = f.name.split('.').pop().toLowerCase();
        const iconSvg = this.getFileIconSvg(ext, f.is_dir);

        html += `
          <div class="result-item file-result-item" data-type="file" data-path="${this.escapeHTML(f.full_path)}" data-name="${this.escapeHTML(f.name)}" title="${this.escapeHTML(f.full_path)}">
            <div class="result-left">
              <span class="file-icon-badge file-badge-${ext}">${iconSvg}</span>
              <div>
                <div class="result-title">${this.highlightMatch(f.name, query)}</div>
                <div class="result-url">${this.escapeHTML(f.dir || f.full_path)}</div>
              </div>
            </div>
            <div class="file-action-bar">
              <button class="file-act-btn btn-open-folder" title="Open containing folder in Explorer" data-path="${this.escapeHTML(f.full_path)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                </svg>
              </button>
              <button class="file-act-btn btn-pin-shelf" title="Pin to Hot Projects Shelf" data-name="${this.escapeHTML(f.name)}" data-path="${this.escapeHTML(f.full_path)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                </svg>
              </button>
              <button class="file-act-btn btn-copy-path" title="Copy Full Path" data-path="${this.escapeHTML(f.full_path)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                </svg>
              </button>
            </div>
          </div>
        `;
      });
    }

    // 3. Web search action footer
    html += `
      <div class="result-item" id="web-search-action" style="border-top: 1px solid var(--border-subtle); margin-top: 4px;">
        <div class="result-left">
          <span class="result-title" style="color: var(--cyan-primary); display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            Search ${ENGINES[this.currentEngine].name} for "<em>${this.escapeHTML(query)}</em>"
          </span>
        </div>
        <span class="result-badge">Web Search ↗</span>
      </div>
    `;

    this.dropdown.innerHTML = html;
    this.bindResultItemEvents(query);
    this.openDropdown();
  }

  bindResultItemEvents(query) {
    // Web search click
    const webBtn = this.dropdown.querySelector('#web-search-action');
    if (webBtn) {
      webBtn.addEventListener('click', () => this.performWebSearch(query));
    }

    // File result primary click (launch)
    this.dropdown.querySelectorAll('.file-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.file-action-bar')) return; // handled by action buttons
        const path = item.dataset.path;
        if (window.deckBridge && path) {
          window.deckBridge.openPath(path);
          this.closeDropdown();
        }
      });
    });

    // Reveal in Explorer
    this.dropdown.querySelectorAll('.btn-open-folder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.dataset.path;
        if (window.deckBridge && path) {
          window.deckBridge.openInExplorer(path);
        }
      });
    });

    // Pin to Shelf
    this.dropdown.querySelectorAll('.btn-pin-shelf').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = btn.dataset.name;
        const path = btn.dataset.path;
        window.dispatchEvent(new CustomEvent('deck:pin-hot-project', {
          detail: { name, path }
        }));
        btn.style.color = 'var(--emerald-primary)';
      });
    });

    // Copy Path
    this.dropdown.querySelectorAll('.btn-copy-path').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const path = btn.dataset.path;
        if (path) {
          await navigator.clipboard.writeText(path);
          const orig = btn.innerHTML;
          btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--emerald-primary);"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => btn.innerHTML = orig, 1200);
        }
      });
    });
  }

  activateResultItem(el) {
    if (!el) return;
    if (el.id === 'web-search-action') {
      this.performWebSearch(this.input.value.trim());
    } else if (el.dataset.type === 'file') {
      const path = el.dataset.path;
      if (window.deckBridge && path) {
        window.deckBridge.openPath(path);
      }
      this.closeDropdown();
    } else if (el.href) {
      window.open(el.href, '_blank', 'noopener,noreferrer');
      this.closeDropdown();
    }
  }

  getFileIconSvg(ext, isDir) {
    if (isDir) {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>`;
    }
    switch (ext) {
      case 'uproject':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #63b3ed;"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 9h6v6H9z"></path></svg>`;
      case 'max':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #4299e1;"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;
      case 'blend':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ed8936;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line></svg>`;
      case 'psd':
      case 'psb':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3182ce;"><rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
      case 'pur':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #a0aec0;"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>`;
      default:
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    }
  }

  highlightMatch(text, query) {
    if (!query) return this.escapeHTML(text);
    const escaped = this.escapeHTML(text);
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark class="search-match">$1</mark>');
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  updateSelection(items) {
    items.forEach((it, idx) => {
      it.classList.toggle('selected', idx === this.selectedIndex);
      if (idx === this.selectedIndex) {
        it.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  performWebSearch(query) {
    if (!query) return;
    const base = ENGINES[this.currentEngine].url;
    window.open(base + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
  }

  openDropdown() {
    this.dropdown.classList.add('open');
  }

  closeDropdown() {
    this.dropdown.classList.remove('open');
    this.selectedIndex = -1;
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}

/**
 * CommandPaletteModal
 * Deck — Universal Raycast/Spotlight-Style Command Palette (Ctrl+K / /)
 * Supports tabbed filtering (All, Bookmarks, Apps, Files, Actions), keyboard navigation,
 * math calculations, Everything 1.5 search, and system actions.
 */
export class CommandPaletteModal {
  constructor() {
    this.modal = document.getElementById('command-palette-modal');
    if (!this.modal) return;

    this.input = document.getElementById('palette-search-input');
    this.tabsStrip = this.modal.querySelector('.palette-tabs-strip');
    this.chips = this.modal.querySelectorAll('.palette-tab-chip');
    this.stream = document.getElementById('palette-results-stream');
    this.btnClose = document.getElementById('btn-close-palette');

    this.activeCategory = 'all';
    this.selectedIndex = -1;
    this.categories = ['all', 'bookmarks', 'apps', 'files', 'actions'];
    this.debounceTimer = null;
    this.currentResults = [];

    this.bindEvents();
  }

  bindEvents() {
    if (!this.modal) return;

    // Close on click outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    // Category chip clicks
    this.chips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.setCategory(chip.dataset.category);
        if (this.input) this.input.focus();
      });
    });

    // Input listener
    if (this.input) {
      this.input.addEventListener('input', () => {
        this.handleInput(this.input.value.trim());
      });

      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          this.cycleCategory(e.shiftKey ? -1 : 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      });
    }
  }

  open(initialQuery = '', category = 'all') {
    if (!this.modal) return;
    this.modal.classList.add('open');
    this.setCategory(category, false);
    if (this.input) {
      this.input.value = initialQuery;
      this.input.focus();
      this.input.select();
    }
    this.handleInput(initialQuery);
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('open');
    this.selectedIndex = -1;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  toggle() {
    if (!this.modal) return;
    if (this.modal.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  setCategory(cat, triggerRender = true) {
    if (!this.categories.includes(cat)) cat = 'all';
    this.activeCategory = cat;
    this.chips.forEach(c => {
      c.classList.toggle('active', c.dataset.category === cat);
    });
    if (triggerRender) {
      this.handleInput(this.input ? this.input.value.trim() : '');
    }
  }

  cycleCategory(direction = 1) {
    const curIdx = this.categories.indexOf(this.activeCategory);
    let nextIdx = (curIdx + direction + this.categories.length) % this.categories.length;
    this.setCategory(this.categories[nextIdx], true);
  }

  handleInput(query) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // Immediate local render
    this.renderResults(query, []);

    // Async Everything search if needed
    if ((this.activeCategory === 'all' || this.activeCategory === 'files') && query.length >= 2 && window.deckBridge && window.deckBridge.isConnected) {
      this.debounceTimer = setTimeout(async () => {
        const fileLimit = this.activeCategory === 'files' ? 12 : 5;
        const fileResults = await window.deckBridge.searchEverything(query, fileLimit);
        if (this.input && this.input.value.trim() === query) {
          this.renderResults(query, fileResults || []);
        }
      }, 100);
    }
  }

  evaluateMath(expr) {
    if (!expr || expr.length < 3) return null;
    const sanitized = expr.replace(/\s+/g, '');
    if (!/^[\d+\-*/.()]+$/.test(sanitized)) return null;
    if (!/[+\-*/]/.test(sanitized)) return null; // must contain an operator
    try {
      const res = Function(`'use strict'; return (${sanitized})`)();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return Number(res.toFixed(4)).toString();
      }
    } catch {}
    return null;
  }

  getAllBookmarks() {
    const list = [];
    BOOKMARK_DATA.toolbarZones.forEach(zone => {
      (zone.items || []).forEach(item => {
        list.push({
          title: item.name || item.title,
          url: item.href || item.url,
          icon: item.icon,
          category: zone.title
        });
      });
    });

    const walk = (folder, path) => {
      if (folder.items) {
        folder.items.forEach(item => {
          list.push({
            title: item.name || item.title,
            url: item.href || item.url,
            icon: item.icon,
            category: path
          });
        });
      }
      if (folder.subfolders) {
        folder.subfolders.forEach(sub => {
          walk(sub, `${path} > ${sub.title}`);
        });
      }
    };
    BOOKMARK_DATA.library.forEach(cat => walk(cat, cat.title));

    // Custom bookmarks from store
    (store.state.customBookmarks || []).forEach(b => {
      list.unshift({
        title: b.title || b.name,
        url: b.url || b.href,
        icon: b.favicon || b.icon,
        category: b.category || 'Custom Bookmarks'
      });
    });

    return list;
  }

  getSystemActions() {
    return [
      {
        id: 'act_home',
        title: 'Switch to Home Cockpit',
        subtitle: 'Tab 1 • Ambient clock, weather, launch deck',
        badge: 'Tab 1',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>`,
        action: () => window.location.hash = '#tab-command-center' || (window.deckApp && window.deckApp.switchTab('tab-command-center'))
      },
      {
        id: 'act_bookmarks',
        title: 'Switch to Bookmarks Manager',
        subtitle: 'Tab 2 • 3-Pane stream, tags, live inspector',
        badge: 'Tab 2',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>`,
        action: () => (window.deckApp && window.deckApp.switchTab('tab-bookmarks'))
      },
      {
        id: 'act_studio',
        title: 'Switch to Studio 3D Hub',
        subtitle: 'Tab 3 • 3D models, aspect ratios, archviz unit calculators',
        badge: 'Tab 3',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`,
        action: () => (window.deckApp && window.deckApp.switchTab('tab-studio-3d'))
      },
      {
        id: 'act_utils',
        title: 'Switch to Utilities & Life',
        subtitle: 'Tab 4 • DPDC smart meter estimator, ISP portals',
        badge: 'Tab 4',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
        action: () => (window.deckApp && window.deckApp.switchTab('tab-utilities'))
      },
      {
        id: 'act_theme',
        title: 'Toggle Color Theme',
        subtitle: `Switch between Carbon Obsidian & Sculpted Alabaster (Current: ${store.state.theme})`,
        badge: 'Action',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`,
        action: () => store.toggleTheme()
      },
      {
        id: 'act_fullscreen',
        title: 'Toggle Fullscreen Mode',
        subtitle: 'Press F or Enter to toggle immersive view',
        badge: 'F Key',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
        action: () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
          }
        }
      },
      {
        id: 'act_sync',
        title: 'Google Drive Sync & Backups',
        subtitle: 'Configure local folder sync and download/upload JSON backup',
        badge: 'Settings',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"></path></svg>`,
        action: () => {
          const btn = document.getElementById('btn-open-settings');
          if (btn) btn.click();
        }
      },
      {
        id: 'act_scan_health',
        title: 'Scan Bookmark Link Health',
        subtitle: 'Audit all links for 404s, timeouts, and broken domains',
        badge: 'Audit',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
        action: () => {
          window.dispatchEvent(new CustomEvent('deck:trigger-link-audit'));
          if (window.deckApp) window.deckApp.switchTab('tab-bookmarks');
        }
      }
    ];
  }

  getDesktopApps() {
    const configured = (window.deckBridge && window.deckBridge.config && window.deckBridge.config.apps) ? window.deckBridge.config.apps : {
      ue5: { name: 'Unreal Engine 5.5', tag: 'UE5', color: '#1a365d' },
      blender: { name: 'Blender 4.3 LTS', tag: '3D', color: '#7b341e' },
      '3dsmax': { name: '3ds Max 2025', tag: 'MAX', color: '#234e52' },
      photoshop: { name: 'Adobe Photoshop', tag: 'PS', color: '#1a202c' },
      pureref: { name: 'PureRef', tag: 'REF', color: '#2d3748' },
      vscode: { name: 'Visual Studio Code', tag: 'DEV', color: '#2b6cb0' }
    };

    return Object.entries(configured).map(([id, app]) => ({
      id,
      title: app.name,
      subtitle: app.path ? `Desktop App • ${app.path}` : 'Desktop App • Configured in Bridge',
      badge: app.tag || 'App',
      appId: id,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
      action: async () => {
        if (window.deckBridge) {
          await window.deckBridge.launchApp(id);
        }
      }
    }));
  }

  renderResults(query, fileResults = []) {
    if (!this.stream) return;

    const items = [];
    const lowerQuery = query.toLowerCase();

    // 0. Safe Math Calculation check
    const mathResult = this.evaluateMath(query);
    if (mathResult !== null) {
      items.push({
        type: 'calc',
        title: `${query} = ${mathResult}`,
        subtitle: 'Math Calculation • Press Enter to copy result',
        badge: 'Calc',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--amber-primary);"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>`,
        action: async () => {
          await navigator.clipboard.writeText(mathResult);
        }
      });
    }

    // 1. Actions
    if (this.activeCategory === 'all' || this.activeCategory === 'actions') {
      const actions = this.getSystemActions();
      const matchedActions = !lowerQuery ? actions.slice(0, 4) : actions.filter(a => 
        a.title.toLowerCase().includes(lowerQuery) || a.subtitle.toLowerCase().includes(lowerQuery)
      );
      items.push(...matchedActions.map(a => ({ ...a, type: 'action' })));
    }

    // 2. Apps
    if (this.activeCategory === 'all' || this.activeCategory === 'apps') {
      const apps = this.getDesktopApps();
      const matchedApps = !lowerQuery ? (this.activeCategory === 'apps' ? apps : apps.slice(0, 3)) : apps.filter(a =>
        a.title.toLowerCase().includes(lowerQuery) || a.subtitle.toLowerCase().includes(lowerQuery) || a.badge.toLowerCase().includes(lowerQuery)
      );
      items.push(...matchedApps.map(a => ({ ...a, type: 'app' })));
    }

    // 3. Bookmarks
    if (this.activeCategory === 'all' || this.activeCategory === 'bookmarks') {
      const allBm = this.getAllBookmarks();
      const matchedBm = !lowerQuery ? (this.activeCategory === 'bookmarks' ? allBm.slice(0, 10) : allBm.slice(0, 4)) : allBm.filter(b =>
        b.title.toLowerCase().includes(lowerQuery) || b.url.toLowerCase().includes(lowerQuery) || b.category.toLowerCase().includes(lowerQuery)
      ).slice(0, this.activeCategory === 'bookmarks' ? 25 : 6);

      matchedBm.forEach(bm => {
        let domain = '';
        try { domain = new URL(bm.url).hostname.replace(/^www\./, ''); } catch {}
        let favicon = bm.icon;
        if (!favicon && domain) {
          favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
        }

        items.push({
          type: 'bookmark',
          title: bm.title,
          subtitle: `${domain || bm.url} • ${bm.category.split('>').pop().trim()}`,
          badge: 'Link',
          url: bm.url,
          favicon,
          icon: favicon ? `<img src="${favicon}" alt="" onerror="this.style.display='none';" />` : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>`,
          action: () => window.open(bm.url, '_blank', 'noopener,noreferrer')
        });
      });
    }

    // 4. Everything 1.5 Desktop Files
    if (fileResults && fileResults.length > 0) {
      fileResults.forEach(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        items.push({
          type: 'file',
          title: f.name,
          subtitle: f.dir || f.full_path,
          badge: ext.toUpperCase(),
          path: f.full_path,
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
          action: () => {
            if (window.deckBridge) window.deckBridge.openPath(f.full_path);
          }
        });
      });
    }

    // Fallback: Web Search
    if (query.trim().length > 0) {
      items.push({
        type: 'web',
        title: `Search Web for "${query}"`,
        subtitle: `Open in default search engine (${store.state.searchEngine || 'Google'})`,
        badge: 'Web ↗',
        icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--cyan-primary);"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
        action: () => {
          const engKey = store.state.searchEngine || 'google';
          const url = (ENGINES[engKey] ? ENGINES[engKey].url : ENGINES.google.url) + encodeURIComponent(query);
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });
    }

    this.currentResults = items;

    if (items.length === 0) {
      this.stream.innerHTML = `
        <div class="palette-empty-state">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <div class="palette-empty-title">No matching results</div>
          <div class="palette-empty-sub">Try another search term or switch filter category via Tab</div>
        </div>
      `;
      this.selectedIndex = -1;
      return;
    }

    this.stream.innerHTML = items.map((item, idx) => `
      <div class="palette-result-item ${idx === 0 ? 'selected' : ''}" data-index="${idx}">
        <div class="palette-result-left">
          <div class="palette-result-icon">${item.icon}</div>
          <div class="palette-result-info">
            <div class="palette-result-title">${this.escapeHTML(item.title)}</div>
            <div class="palette-result-subtitle">${this.escapeHTML(item.subtitle)}</div>
          </div>
        </div>
        <span class="palette-result-badge">${item.badge}</span>
      </div>
    `).join('');

    this.selectedIndex = 0;

    // Click handlers
    this.stream.querySelectorAll('.palette-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index, 10);
        if (this.currentResults[idx]) {
          this.currentResults[idx].action();
          this.close();
        }
      });
      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.dataset.index, 10);
        this.selectedIndex = idx;
        this.updateSelection();
      });
    });
  }

  moveSelection(dir) {
    if (this.currentResults.length === 0) return;
    this.selectedIndex = (this.selectedIndex + dir + this.currentResults.length) % this.currentResults.length;
    this.updateSelection();
  }

  updateSelection() {
    const items = this.stream.querySelectorAll('.palette-result-item');
    items.forEach((it, idx) => {
      it.classList.toggle('selected', idx === this.selectedIndex);
      if (idx === this.selectedIndex) {
        it.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  executeSelected() {
    if (this.selectedIndex >= 0 && this.currentResults[this.selectedIndex]) {
      this.currentResults[this.selectedIndex].action();
      this.close();
    }
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}

