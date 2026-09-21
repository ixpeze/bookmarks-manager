/**
 * omnibar.js
 * Universal Search Omnibar & Instant Bookmark Filter
 */

import { store } from './store.js';
import { BOOKMARK_DATA } from './data.js';
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
    this.render();
    this.bindEvents();
  }

  indexAllBookmarks() {
    const list = [];
    // 1. Toolbar items
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
    // 2. Library items recursive
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
          placeholder="Search web or bookmarks... (Press '/' to focus)" 
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
    // Engine pill clicks
    this.container.querySelectorAll('.engine-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const eng = btn.dataset.engine;
        this.setEngine(eng);
        this.input.focus();
      });
    });

    // Input handler for instant fuzzy filter
    this.input.addEventListener('input', () => {
      this.handleInput(this.input.value.trim());
    });

    // Keydown for keyboard navigation & search submission
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
          if (selected.href) {
            window.open(selected.href, '_blank', 'noopener,noreferrer');
            this.closeDropdown();
          } else {
            this.performWebSearch(this.input.value.trim());
          }
        } else if (items.length > 0 && items[0].href) {
          window.open(items[0].href, '_blank', 'noopener,noreferrer');
          this.closeDropdown();
        } else {
          this.performWebSearch(this.input.value.trim());
        }
      } else if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Global hotkey '/'
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

    // Check for engine prefix shortcuts
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

    const searchResults = SearchEngine.search(this.allBookmarks, query, { limit: 10 });
    this.renderResults(searchResults, query);
  }

  renderResults(searchResults, query) {
    if (searchResults.length === 0) {
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
    let html = searchResults.map((res, idx) => {
      const m = res.item;
      let highRes = m.icon;
      try {
        if (m.url.startsWith('http://') || m.url.startsWith('https://')) {
          highRes = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(m.url).hostname)}&sz=128`;
        }
      } catch {}

      const displayTitle = res.highlightedTitle || this.escapeHTML(m.title);

      return `
        <a href="${m.url}" target="_blank" rel="noopener noreferrer" class="result-item" data-index="${idx}">
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
    }).join('');

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
    this.dropdown.querySelector('#web-search-action').addEventListener('click', () => {
      this.performWebSearch(query);
    });
    this.openDropdown();
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

  highlightMatch(text, query) {
    const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
    return this.escapeHTML(text).replace(regex, '<span style="color: var(--cyan-primary); font-weight: 700;">$1</span>');
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
