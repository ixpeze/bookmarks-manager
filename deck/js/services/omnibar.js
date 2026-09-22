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
