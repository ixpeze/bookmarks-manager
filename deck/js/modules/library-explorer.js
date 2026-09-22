/**
 * library-explorer.js
 * Tab 3: Interactive Master Bookmark Library Explorer with Dedicated Search Console & Global Fuzzy Search
 */

import { BOOKMARK_DATA } from '../data/bookmarks.js';
import { SearchEngine } from '../services/search.js';

export function renderLibraryExplorer(container) {
  const library = BOOKMARK_DATA.library;
  const allLibraryBookmarks = library.flatMap(cat => flattenCategory(cat));
  let activeCatIndex = 0;
  let activeScope = 'all'; // 'all' | 'category'

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Full-Width Dedicated Search Hero Console -->
      <section class="lib-search-hero" style="border: 1px solid var(--border-medium); border-radius: var(--radius-md); box-shadow: var(--shadow-recessed);">
        <div class="lib-search-bar-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted); flex-shrink: 0;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            id="lib-search-input" 
            class="lib-search-input-field" 
            placeholder="Search across all bookmarks with fuzzy matching... (e.g. 'yt', 'ue5', 'behance', 'sketchfab')" 
            autocomplete="off" 
            spellcheck="false" 
          />
          <span class="lib-search-kbd">/ to focus</span>
          <button class="lib-search-clear" id="lib-search-clear" title="Clear Search (Esc)" style="display: none;">✕</button>
        </div>

        <div class="lib-scope-bar">
          <div class="lib-scope-pills">
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-right: 4px;">Search Scope:</span>
            <button class="lib-scope-btn active" data-scope="all" id="btn-scope-all">All Library (${allLibraryBookmarks.length})</button>
            <button class="lib-scope-btn" data-scope="category" id="btn-scope-cat">Active Category Only</button>
          </div>
          <div style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted);" id="lib-results-counter">
            Showing all ${allLibraryBookmarks.length} bookmarks
          </div>
        </div>
      </section>

      <!-- Main Library Layout (Sidebar + Results/Category Panel) -->
      <div class="library-layout" style="border: 1px solid var(--border-medium); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-recessed); margin-bottom: 24px;">
        <!-- Category Nav Sidebar -->
        <aside class="library-sidebar">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 4px 8px; letter-spacing: 0.5px; font-family: var(--font-mono);">
            Master Categories
          </div>
          ${library.map((cat, idx) => {
            const totalLinks = countLinks(cat);
            return `
              <div class="lib-nav-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                <span>${cat.title}</span>
                <span class="card-badge">${totalLinks}</span>
              </div>
            `;
          }).join('')}
        </aside>

        <!-- Main Library Content Panel -->
        <section class="library-content-panel">
          <div class="lib-toolbar">
            <div>
              <div class="card-title" id="lib-category-title" style="display: flex; align-items: center; gap: 8px;">
                <span class="nothing-led"></span>
                <span>${library[0]?.title || 'Library'}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;" id="lib-category-meta">Loading items...</div>
            </div>
            <div id="lib-status-badge-slot"></div>
          </div>

          <!-- Bookmarks Cards List -->
          <div class="lib-items-list" id="lib-items-list"></div>
        </section>
      </div>
    </div>
  `;

  const sidebarItems = container.querySelectorAll('.lib-nav-item');
  const catTitle = container.querySelector('#lib-category-title span:last-child');
  const catMeta = container.querySelector('#lib-category-meta');
  const itemsList = container.querySelector('#lib-items-list');
  const searchInput = container.querySelector('#lib-search-input');
  const clearBtn = container.querySelector('#lib-search-clear');
  const counterEl = container.querySelector('#lib-results-counter');
  const btnScopeAll = container.querySelector('#btn-scope-all');
  const btnScopeCat = container.querySelector('#btn-scope-cat');

  const renderItems = (items) => {
    if (items.length === 0) {
      itemsList.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted); font-family: var(--font-mono); font-size: 13px;">
          No matching bookmarks found. Try another query or switch search scope.
        </div>
      `;
      return;
    }

    itemsList.innerHTML = items.map(item => {
      let highRes = item.icon;
      try {
        if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
          const host = new URL(item.href).hostname;
          highRes = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
        }
      } catch {}

      const displayTitle = item.highlightedTitle || escapeHTML(item.title);

      return `
        <div class="lib-item-card">
          <div class="lib-item-left">
            <img src="${highRes}" style="width: 22px; height: 22px; border-radius: 4px; object-fit: contain;" alt="" onerror="this.onerror=null; this.src='${item.icon || ''}';" loading="lazy" />
            <div style="overflow: hidden;">
              <a href="${item.href}" target="_blank" rel="noopener noreferrer" class="lib-item-title" title="${item.title}" style="text-decoration: none; display: block;">${displayTitle}</a>
              <div class="lib-item-url">${item.href}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <span class="card-badge" style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.folder}</span>
            <button class="btn-secondary btn-copy-url" data-url="${item.href}">Copy</button>
            <a href="${item.href}" class="btn-secondary" style="background: var(--bg-surface); color: var(--text-primary); text-decoration: none;" target="_blank" rel="noopener noreferrer">
              <span>Launch</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      `;
    }).join('');
  };

  const handleSearchOrCategory = () => {
    const query = searchInput.value.trim();

    if (query) {
      clearBtn.style.display = 'block';
    } else {
      clearBtn.style.display = 'none';
    }

    if (!query) {
      // Revert to active category view
      const cat = library[activeCatIndex];
      if (!cat) return;
      sidebarItems.forEach((btn, idx) => btn.classList.toggle('active', idx === activeCatIndex));
      catTitle.textContent = cat.title;
      const categoryItems = flattenCategory(cat);
      catMeta.textContent = `${categoryItems.length} bookmarks in this category`;
      counterEl.textContent = `Browsing "${cat.title}" (${categoryItems.length} items)`;
      renderItems(categoryItems);
      return;
    }

    // Determine target items pool based on scope
    const targetPool = activeScope === 'all' 
      ? allLibraryBookmarks 
      : flattenCategory(library[activeCatIndex] || library[0]);

    if (activeScope === 'all') {
      sidebarItems.forEach(btn => btn.classList.remove('active'));
      catTitle.textContent = `Global Fuzzy Search: "${query}"`;
    } else {
      catTitle.textContent = `Category Search in "${library[activeCatIndex]?.title}": "${query}"`;
    }

    const searchResults = SearchEngine.search(targetPool, query);
    const scored = searchResults.map(r => ({
      ...r.item,
      score: r.score,
      highlightedTitle: r.highlightedTitle
    }));
    const scopeLabel = activeScope === 'all' ? 'all library categories' : `"${library[activeCatIndex]?.title}"`;
    catMeta.textContent = `${scored.length} results found in ${scopeLabel}`;
    counterEl.textContent = `${scored.length} results for "${query}"`;
    renderItems(scored);
  };

  // Scope switcher
  btnScopeAll.addEventListener('click', () => {
    activeScope = 'all';
    btnScopeAll.classList.add('active');
    btnScopeCat.classList.remove('active');
    searchInput.placeholder = "Search across all bookmarks with fuzzy matching... (e.g. 'yt', 'ue5', 'behance')";
    handleSearchOrCategory();
  });

  btnScopeCat.addEventListener('click', () => {
    activeScope = 'category';
    btnScopeCat.classList.add('active');
    btnScopeAll.classList.remove('active');
    const catName = library[activeCatIndex]?.title || 'category';
    searchInput.placeholder = `Search inside "${catName}"...`;
    handleSearchOrCategory();
  });

  // Sidebar item click
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      activeCatIndex = parseInt(item.dataset.index, 10);
      if (activeScope === 'category') {
        const catName = library[activeCatIndex]?.title || 'category';
        searchInput.placeholder = `Search inside "${catName}"...`;
      }
      handleSearchOrCategory();
    });
  });

  // Search input events
  searchInput.addEventListener('input', handleSearchOrCategory);

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    handleSearchOrCategory();
  });

  // Global '/' hotkey to focus search bar
  const hotkeyHandler = (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.blur();
      handleSearchOrCategory();
    }
  };
  window.addEventListener('keydown', hotkeyHandler);

  // Copy button
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-copy-url');
    if (btn) {
      const url = btn.dataset.url;
      await navigator.clipboard.writeText(url);
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    }
  });

  // Initial render
  handleSearchOrCategory();
}

/**
 * Fuzzy score single substring
 */
function singleFuzzyScore(str, query) {
  if (!query) return { match: true, score: 0, highlighted: escapeHTML(str) };
  const s = str.toLowerCase();
  const q = query.toLowerCase().trim();
  let sIdx = 0;
  let qIdx = 0;
  let score = 0;
  let consecutive = 0;
  const highlightIndices = new Set();

  while (sIdx < s.length && qIdx < q.length) {
    if (s[sIdx] === q[qIdx]) {
      highlightIndices.add(sIdx);
      score += 10;
      if (consecutive > 0) score += consecutive * 8;
      consecutive++;
      if (sIdx === 0) score += 25;
      else if (/[\s\-_.\/\\>]/.test(str[sIdx - 1])) score += 20;
      qIdx++;
    } else {
      consecutive = 0;
      score -= 1;
    }
    sIdx++;
  }

  if (qIdx < q.length) return null;
  score -= (s.length - q.length) * 0.4;

  let highlighted = '';
  for (let i = 0; i < str.length; i++) {
    if (highlightIndices.has(i)) {
      highlighted += `<span class="fuzzy-match">${escapeHTML(str[i])}</span>`;
    } else {
      highlighted += escapeHTML(str[i]);
    }
  }

  return { match: true, score, highlighted };
}

/**
 * Fuzzy matcher across title, href, and folder
 */
function fuzzyMatchItem(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return { match: true, score: 0, titleHtml: escapeHTML(item.title) };

  // Multi-word query (e.g. "ue docs")
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    let totalScore = 0;
    const combined = `${item.title} ${item.href} ${item.folder}`.toLowerCase();
    for (const t of tokens) {
      if (!combined.includes(t)) {
        const sub = singleFuzzyScore(combined, t);
        if (!sub) return null;
        totalScore += sub.score;
      } else {
        totalScore += 40;
      }
    }
    const titleScore = singleFuzzyScore(item.title, tokens[0]);
    return {
      match: true,
      score: totalScore,
      titleHtml: titleScore ? titleScore.highlighted : escapeHTML(item.title)
    };
  }

  // Match title first
  const titleRes = singleFuzzyScore(item.title, q);
  if (titleRes) {
    return { match: true, score: titleRes.score + 50, titleHtml: titleRes.highlighted };
  }

  // Match URL hostname / path
  const urlRes = singleFuzzyScore(item.href, q);
  if (urlRes) {
    return { match: true, score: urlRes.score + 15, titleHtml: escapeHTML(item.title) };
  }

  // Match folder name
  const folderRes = singleFuzzyScore(item.folder, q);
  if (folderRes) {
    return { match: true, score: folderRes.score, titleHtml: escapeHTML(item.title) };
  }

  return null;
}

function countLinks(folder) {
  let count = (folder.items || []).length;
  if (folder.subfolders) {
    folder.subfolders.forEach(sub => {
      count += countLinks(sub);
    });
  }
  return count;
}

function flattenCategory(folder, currentPath = '') {
  let list = [];
  const folderName = currentPath ? `${currentPath} > ${folder.title}` : folder.title;

  if (folder.items) {
    folder.items.forEach(it => {
      list.push({
        ...it,
        folder: folderName
      });
    });
  }

  if (folder.subfolders) {
    folder.subfolders.forEach(sub => {
      list = list.concat(flattenCategory(sub, folderName));
    });
  }

  return list;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}


export default {
  id: 'tab-library-explorer',
  title: 'Master Library',
  icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
  </svg>`,
  async mount(container) {
    renderLibraryExplorer(container);
  }
};
