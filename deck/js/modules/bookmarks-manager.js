/**
 * bookmarks-manager.js
 * Deck — Tab 2: Bookmarks (Karakeep & Raindrop.io Inspired Architecture)
 * 
 * Features:
 * 1. 3-Pane Hybrid Layout:
 *    - Left: Collections & Quick Filters (All, Starred, Recent, Tags, Master Categories)
 *    - Center: Rich Bookmark Stream with Cards/List view switcher, live search, sorting, and inline actions
 *    - Right: Slide-out Inspector Drawer with metadata, domain badge, tags, notes, and 1-click copy/open
 * 2. Full interactive suite: Star/favorite, custom bookmark creation, editing, deletion
 * 3. Bidirectional persistence with LocalStorage, chrome.storage.local, and Google Drive sync hooks
 * 4. Strict Zero-Emoji UI: clean SVG icons throughout
 */

import { BOOKMARK_DATA } from '../data/bookmarks.js';
import { store } from '../core/store.js';

export function renderBookmarksManager(container) {
  // State
  let activeFilter = 'all'; // 'all' | 'starred' | 'recent' | 'cat:<idx>' | 'tag:<tag>'
  let searchQuery = '';
  let sortBy = 'title-asc'; // 'title-asc' | 'title-desc' | 'domain' | 'category'
  let viewMode = store.state.bookmarksViewMode || 'cards'; // 'cards' | 'list'
  let selectedBookmark = null; // for live preview inspector
  let userClosedInspector = false;
  let currentFiltered = [];

  // 1. Compile all library bookmarks + custom user bookmarks
  function getAllBookmarks() {
    const libraryItems = BOOKMARK_DATA.library.flatMap((cat, idx) => flattenCategory(cat, '', idx));
    const customItems = (store.state.customBookmarks || []).map(b => ({
      name: b.title || b.name,
      href: b.url || b.href,
      icon: b.favicon || b.icon || '',
      folder: b.category || 'Custom Bookmarks',
      tags: b.tags || [],
      notes: b.notes || '',
      id: b.id,
      isCustom: true,
      createdAt: b.createdAt || new Date().toISOString()
    }));

    return [...customItems, ...libraryItems];
  }

  function getCleanTitle(rawTitle) {
    if (!rawTitle) return '';
    return rawTitle.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/, '').replace(/^[^\w\s]+\s*/, '').trim();
  }

  function flattenCategory(folder, currentPath = '', catIndex = 0) {
    let list = [];
    const cleanFolderTitle = getCleanTitle(folder.title);
    const folderName = currentPath ? `${currentPath} > ${cleanFolderTitle}` : cleanFolderTitle;

    if (folder.items) {
      folder.items.forEach(it => {
        list.push({
          name: it.name,
          href: it.href,
          icon: it.icon,
          folder: folderName,
          categoryIndex: catIndex,
          isCustom: false,
          tags: inferTags(it.name, it.href, folderName),
          createdAt: null
        });
      });
    }

    if (folder.subfolders) {
      folder.subfolders.forEach(sub => {
        list = list.concat(flattenCategory(sub, folderName, catIndex));
      });
    }

    return list;
  }

  function inferTags(name, url, folder) {
    const tags = [];
    const lower = `${name} ${url} ${folder}`.toLowerCase();
    if (lower.includes('unreal') || lower.includes('ue5')) tags.push('UE5');
    if (lower.includes('blender')) tags.push('Blender');
    if (lower.includes('3ds max') || lower.includes('3dsmax')) tags.push('3dsMax');
    if (lower.includes('shader') || lower.includes('material')) tags.push('Shaders');
    if (lower.includes('texture') || lower.includes('pbr')) tags.push('PBR');
    if (lower.includes('github')) tags.push('Code');
    if (lower.includes('ai') || lower.includes('llm') || lower.includes('gpt')) tags.push('AI');
    if (lower.includes('asset') || lower.includes('model')) tags.push('Assets');
    return tags.slice(0, 3);
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function getHighResFavicon(url, inlineIcon) {
    if (inlineIcon && inlineIcon.startsWith('data:')) {
      return inlineIcon;
    }
    const domain = getDomain(url);
    if (domain) {
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    }
    return '';
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

  // Shell Layout
  container.innerHTML = `
    <div class="bm-shell">
      <!-- Left Sidebar: Collections & Quick Filters -->
      <aside class="bm-sidebar">
        <!-- Sidebar Header / Add Trigger -->
        <div class="bm-sidebar-header">
          <div class="bm-sidebar-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--nothing-red);">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
            </svg>
            <span>Collections</span>
          </div>
          <button class="btn-secondary bm-quick-add-btn" id="btn-open-add-modal" title="Add New Bookmark">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add</span>
          </button>
        </div>

        <!-- Quick Filters -->
        <div class="bm-section-label">Filters</div>
        <div class="bm-filter-group">
          <button class="bm-filter-btn active" data-filter="all">
            <div class="bm-filter-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                <rect width="7" height="7" x="3" y="14" rx="1"></rect>
              </svg>
              <span>All Bookmarks</span>
            </div>
            <span class="bm-count-badge" id="badge-count-all">0</span>
          </button>

          <button class="bm-filter-btn" data-filter="starred">
            <div class="bm-filter-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--amber-primary);">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span>Favorites & Starred</span>
            </div>
            <span class="bm-count-badge" id="badge-count-starred">0</span>
          </button>

          <button class="bm-filter-btn" data-filter="recent">
            <div class="bm-filter-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--cyan-primary);">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Recently Added</span>
            </div>
            <span class="bm-count-badge" id="badge-count-recent">0</span>
          </button>
        </div>

        <!-- Master Categories -->
        <div class="bm-section-label" style="margin-top: 14px;">Master Library</div>
        <div class="bm-category-tree" id="bm-category-tree">
          ${BOOKMARK_DATA.library.map((cat, idx) => {
            const count = countLinks(cat);
            const clean = getCleanTitle(cat.title);
            return `
              <button class="bm-cat-btn" data-filter="cat:${idx}">
                <div class="bm-filter-left">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                  </svg>
                  <span>${escapeHTML(clean)}</span>
                </div>
                <span class="bm-count-badge">${count}</span>
              </button>
            `;
          }).join('')}
        </div>
      </aside>

      <!-- Center Feed Area -->
      <main class="bm-center-feed">
        <!-- Top Toolbar -->
        <div class="bm-feed-toolbar">
          <div class="bm-toolbar-left">
            <div class="bm-feed-title" id="bm-feed-title">All Bookmarks</div>
            <span class="bm-feed-counter" id="bm-feed-counter">Loading...</span>
          </div>

          <!-- Live Search Input -->
          <div class="bm-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="bm-search-input" class="bm-search-field" placeholder="Filter bookmarks, tags, domains..." autocomplete="off" spellcheck="false" />
            <button class="bm-search-clear" id="btn-clear-search" style="display: none;">✕</button>
          </div>

          <!-- Controls: Sort & View Switcher -->
          <div class="bm-toolbar-right">
            <!-- Sort Selector -->
            <div class="bm-sort-select-wrap">
              <select id="bm-sort-select" class="bm-select-input">
                <option value="title-asc">Sort: Name (A-Z)</option>
                <option value="title-desc">Sort: Name (Z-A)</option>
                <option value="domain">Sort: Domain</option>
                <option value="category">Sort: Category</option>
              </select>
            </div>

            <!-- View Switcher -->
            <div class="bm-view-switch-pills">
              <button class="bm-view-btn ${viewMode === 'cards' ? 'active' : ''}" id="btn-view-cards" title="Visual Cards View">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                  <rect width="7" height="7" x="3" y="14" rx="1"></rect>
                </svg>
              </button>
              <button class="bm-view-btn ${viewMode === 'list' ? 'active' : ''}" id="btn-view-list" title="Compact List View">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Bookmarks Stream Container -->
        <div class="bm-stream-container ${viewMode === 'cards' ? 'view-cards' : 'view-list'}" id="bm-stream-list">
          <!-- Populated dynamically -->
        </div>
      </main>

      <!-- Right Live Preview Inspector (3rd Panel) -->
      <aside class="bm-inspector-drawer" id="bm-inspector-drawer">
        <div class="bm-inspector-body" id="bm-inspector-body">
          <div class="bm-inspector-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 8px;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px; font-size: 13px;">Live Webpage Preview</div>
            <div style="max-width: 240px; margin: 0 auto; line-height: 1.4; color: var(--text-muted);">Select any bookmark from the list to preview the website live in this panel.</div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Modal: Add New Bookmark -->
    <div class="modal-overlay" id="add-bookmark-modal">
      <div class="modal-box" style="max-width: 480px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="card-title" style="font-size: 15px; display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--cyan-primary);">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
            </svg>
            Add Bookmark
          </div>
          <button id="btn-close-add-modal" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="add-bookmark-form" style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Page Title *</label>
            <input type="text" class="input-text" id="add-bm-title" placeholder="e.g. PureRef Official Reference Tool" required style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">URL Link *</label>
            <input type="url" class="input-text" id="add-bm-url" placeholder="https://www.pureref.com/" required style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Collection / Category</label>
            <input type="text" class="input-text" id="add-bm-category" placeholder="3D Tools, Reference, AI, etc." value="Custom Bookmarks" style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Tags (Comma-separated)</label>
            <input type="text" class="input-text" id="add-bm-tags" placeholder="reference, design, software" style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Notes (Optional)</label>
            <textarea class="input-text" id="add-bm-notes" placeholder="Quick workflow note or prompt idea..." style="width: 100%; height: 60px; resize: vertical;"></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
            <button type="button" class="btn-secondary" id="btn-cancel-add-modal">Cancel</button>
            <button type="submit" class="btn-secondary" style="background: var(--cyan-primary); color: #07090e; font-weight: 700; border: none;">Save to Deck</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Elements
  const feedTitle = container.querySelector('#bm-feed-title');
  const feedCounter = container.querySelector('#bm-feed-counter');
  const streamList = container.querySelector('#bm-stream-list');
  const searchInput = container.querySelector('#bm-search-input');
  const clearSearchBtn = container.querySelector('#btn-clear-search');
  const sortSelect = container.querySelector('#bm-sort-select');
  const btnViewCards = container.querySelector('#btn-view-cards');
  const btnViewList = container.querySelector('#btn-view-list');
  const filterButtons = container.querySelectorAll('.bm-filter-btn, .bm-cat-btn');
  const countBadgeAll = container.querySelector('#badge-count-all');
  const countBadgeStarred = container.querySelector('#badge-count-starred');
  const countBadgeRecent = container.querySelector('#badge-count-recent');
  const inspectorDrawer = container.querySelector('#bm-inspector-drawer');
  const inspectorBody = container.querySelector('#bm-inspector-body');
  const btnCloseInspector = container.querySelector('#btn-close-inspector');

  const addModal = container.querySelector('#add-bookmark-modal');
  const btnOpenAddModal = container.querySelector('#btn-open-add-modal');
  const btnCloseAddModal = container.querySelector('#btn-close-add-modal');
  const btnCancelAddModal = container.querySelector('#btn-cancel-add-modal');
  const addForm = container.querySelector('#add-bookmark-form');

  // Filter & Render logic
  function render() {
    const all = getAllBookmarks();
    const starredSet = store.state.starredBookmarks || new Set();

    // Update Badges
    if (countBadgeAll) countBadgeAll.textContent = all.length;
    if (countBadgeStarred) countBadgeStarred.textContent = starredSet.size;
    const recentCount = (store.state.customBookmarks || []).length;
    if (countBadgeRecent) countBadgeRecent.textContent = recentCount;

    // Filter
    let filtered = all;

    if (activeFilter === 'starred') {
      filtered = filtered.filter(b => starredSet.has(b.href));
      if (feedTitle) feedTitle.textContent = 'Starred & Favorite Bookmarks';
    } else if (activeFilter === 'recent') {
      filtered = (store.state.customBookmarks || []).map(b => ({
        name: b.title || b.name,
        href: b.url || b.href,
        icon: b.favicon || b.icon || '',
        folder: b.category || 'Custom Bookmarks',
        tags: b.tags || [],
        notes: b.notes || '',
        id: b.id,
        isCustom: true,
        createdAt: b.createdAt
      }));
      if (feedTitle) feedTitle.textContent = 'Recently Added Bookmarks';
    } else if (activeFilter.startsWith('cat:')) {
      const idx = parseInt(activeFilter.split(':')[1], 10);
      const cat = BOOKMARK_DATA.library[idx];
      const cleanCat = cat ? getCleanTitle(cat.title) : 'Category';
      filtered = filtered.filter(b => b.categoryIndex === idx);
      if (feedTitle) feedTitle.textContent = cleanCat;
    } else {
      if (feedTitle) feedTitle.textContent = 'All Library Bookmarks';
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => {
        const nameMatch = (b.name || '').toLowerCase().includes(q);
        const urlMatch = (b.href || '').toLowerCase().includes(q);
        const folderMatch = (b.folder || '').toLowerCase().includes(q);
        const tagMatch = (b.tags || []).some(t => t.toLowerCase().includes(q));
        return nameMatch || urlMatch || folderMatch || tagMatch;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'title-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'title-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'domain') return getDomain(a.href).localeCompare(getDomain(b.href));
      if (sortBy === 'category') return (a.folder || '').localeCompare(b.folder || '');
      return 0;
    });

    if (feedCounter) {
      feedCounter.textContent = `${filtered.length} bookmark${filtered.length === 1 ? '' : 's'}`;
    }

    // Render Items
    if (!streamList) return;

    if (filtered.length === 0) {
      streamList.innerHTML = `
        <div class="bm-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <div class="bm-empty-text">No matching bookmarks found</div>
          <div class="bm-empty-sub">Try changing your search query, selecting another category, or add a new bookmark.</div>
        </div>
      `;
      return;
    }

    currentFiltered = filtered;

    streamList.innerHTML = filtered.map((b, idx) => {
      const domain = getDomain(b.href);
      const favicon = getHighResFavicon(b.href, b.icon);
      const isStarred = starredSet.has(b.href);
      const tags = b.tags || [];
      const isSelected = selectedBookmark && selectedBookmark.href === b.href;

      if (viewMode === 'cards') {
        return `
          <div class="bm-card ${isSelected ? 'selected' : ''}" data-index="${idx}">
            <div class="bm-card-top">
              <div class="bm-card-source">
                <img src="${favicon}" class="bm-card-icon" alt="" loading="lazy" onerror="this.style.display='none';" />
                <span class="bm-domain-badge">${escapeHTML(domain)}</span>
              </div>
              <button class="bm-star-btn ${isStarred ? 'active' : ''}" data-url="${escapeAttr(b.href)}" title="${isStarred ? 'Remove from favorites' : 'Add to favorites'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${isStarred ? 'var(--amber-primary)' : 'none'}" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
            </div>

            <div class="bm-card-title" title="${escapeAttr(b.name)}">${escapeHTML(b.name)}</div>
            <div class="bm-card-category">${escapeHTML(b.folder)}</div>

            ${tags.length > 0 ? `
              <div class="bm-card-tags">
                ${tags.map(t => `<span class="bm-tag-pill">${escapeHTML(t)}</span>`).join('')}
              </div>
            ` : ''}

            <div class="bm-card-footer">
              <a href="${escapeAttr(b.href)}" target="_blank" rel="noopener noreferrer" class="bm-card-open-btn" title="Open ${escapeAttr(b.name)}">
                <span>Visit Link</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
              <button class="bm-card-info-btn" title="Live Preview & Details">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="15" x="2" y="3" rx="2"></rect>
                  <line x1="2" y1="8" x2="22" y2="8"></line>
                  <circle cx="6" cy="5.5" r="0.75" fill="currentColor"></circle>
                  <circle cx="9" cy="5.5" r="0.75" fill="currentColor"></circle>
                </svg>
              </button>
            </div>
          </div>
        `;
      } else {
        // List View
        return `
          <div class="bm-row ${isSelected ? 'selected' : ''}" data-index="${idx}">
            <div class="bm-row-left">
              <button class="bm-star-btn ${isStarred ? 'active' : ''}" data-url="${escapeAttr(b.href)}" title="Star">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${isStarred ? 'var(--amber-primary)' : 'none'}" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
              <img src="${favicon}" class="bm-row-icon" alt="" loading="lazy" onerror="this.style.display='none';" />
              <div class="bm-row-name-wrap">
                <span class="bm-row-name" title="${escapeAttr(b.name)}">${escapeHTML(b.name)}</span>
                <span class="bm-row-category">${escapeHTML(b.folder)}</span>
              </div>
            </div>

            <div class="bm-row-mid">
              <span class="bm-domain-badge">${escapeHTML(domain)}</span>
              ${tags.map(t => `<span class="bm-tag-pill">${escapeHTML(t)}</span>`).join('')}
            </div>

            <div class="bm-row-right">
              <a href="${escapeAttr(b.href)}" target="_blank" rel="noopener noreferrer" class="bm-row-open-btn" title="Open Link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
              <button class="bm-card-info-btn" title="Live Preview & Details">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="15" x="2" y="3" rx="2"></rect>
                  <line x1="2" y1="8" x2="22" y2="8"></line>
                  <circle cx="6" cy="5.5" r="0.75" fill="currentColor"></circle>
                  <circle cx="9" cy="5.5" r="0.75" fill="currentColor"></circle>
                </svg>
              </button>
            </div>
          </div>
        `;
      }
    }).join('');

    // Bind item click to open inspector
    streamList.querySelectorAll('.bm-card, .bm-row').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.bm-star-btn') || e.target.closest('.bm-card-open-btn') || e.target.closest('.bm-row-open-btn')) {
          return;
        }
        const idx = parseInt(card.dataset.index, 10);
        if (currentFiltered[idx]) {
          openInspector(currentFiltered[idx]);
        }
      });
    });

    // Bind star toggles
    streamList.querySelectorAll('.bm-star-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        store.toggleStarred(url);
        render();
      });
    });

    // Auto-preview first bookmark on wide desktop screens if none selected
    if (!selectedBookmark && filtered.length > 0 && window.innerWidth >= 1280 && !userClosedInspector) {
      openInspector(filtered[0]);
    }
  }

  function openInspector(bm) {
    if (!bm) return;
    selectedBookmark = bm;
    userClosedInspector = false;
    inspectorDrawer.classList.add('open');

    // Update active highlight across cards and rows
    streamList.querySelectorAll('.bm-card, .bm-row').forEach(card => {
      const idx = parseInt(card.dataset.index, 10);
      if (currentFiltered[idx] && currentFiltered[idx].href === bm.href) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    const domain = getDomain(bm.href);
    const favicon = getHighResFavicon(bm.href, bm.icon);
    const isStarred = store.isStarred(bm.href);
    const tags = bm.tags || [];

    inspectorBody.innerHTML = `
      <div class="bm-preview-shell">
        <!-- Mini Browser Bar -->
        <div class="bm-preview-browser-bar">
          <div class="bm-browser-url-island">
            <img src="${favicon}" class="bm-browser-fav" alt="" onerror="this.style.display='none';" />
            <div class="bm-browser-url-text">
              <span class="bm-browser-title" title="${escapeAttr(bm.name)}">${escapeHTML(bm.name)}</span>
              <span class="bm-browser-domain">${escapeHTML(domain)}</span>
            </div>
          </div>

          <div class="bm-browser-actions">
            <button class="bm-browser-btn" id="btn-reload-preview" title="Reload live preview">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"></path>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>

            <button class="bm-browser-btn" id="btn-copy-preview-url" title="Copy website link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="13" height="13" x="9" y="9" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>

            <a href="${escapeAttr(bm.href)}" target="_blank" rel="noopener noreferrer" class="bm-browser-btn" title="Open in new window">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>

            <button class="bm-browser-btn ${isStarred ? 'starred' : ''}" id="btn-toggle-inspector-star" title="${isStarred ? 'Remove from favorites' : 'Add to favorites'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${isStarred ? 'var(--amber-primary)' : 'none'}" stroke="${isStarred ? 'var(--amber-primary)' : 'currentColor'}" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>

            <button class="bm-browser-btn" id="btn-toggle-meta-details" title="Toggle collection & tags panel">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>

            <button class="bm-browser-btn" id="btn-close-inspector-panel" title="Close live preview">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Live Website Preview Viewport -->
        <div class="bm-preview-viewport">
          <!-- Loading Overlay -->
          <div class="bm-preview-loader" id="bm-preview-loader">
            <div class="bm-preview-spinner"></div>
            <span class="bm-preview-loading-domain">${escapeHTML(domain)}</span>
            <span class="bm-preview-loading-hint">Connecting to live website...</span>
          </div>

          <!-- Embedded Webpage Iframe -->
          <iframe
            id="bm-live-iframe"
            class="bm-live-iframe"
            src="${escapeAttr(bm.href)}"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
            allow="fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
            loading="eager"
          ></iframe>

          <!-- Fallback Floating Chip -->
          <div class="bm-live-overlay-pill">
            <span class="bm-live-dot"></span>
            <span>Live Preview</span>
            <a href="${escapeAttr(bm.href)}" target="_blank" rel="noopener noreferrer" class="bm-live-open-link">
              Open direct ↗
            </a>
          </div>
        </div>

        <!-- Collapsible Details Bar (Collection, Tags, Notes, Delete) -->
        <div class="bm-preview-meta-panel" id="bm-meta-panel">
          <div class="bm-meta-chips-row">
            <div class="bm-meta-chip">
              <span class="bm-meta-chip-label">Collection:</span>
              <span class="bm-meta-chip-val">${escapeHTML(bm.folder)}</span>
            </div>
            ${tags.map(t => `<span class="bm-tag-pill">${escapeHTML(t)}</span>`).join('')}
          </div>
          ${bm.notes ? `
            <div class="bm-meta-notes-box">
              ${escapeHTML(bm.notes)}
            </div>
          ` : ''}
          ${bm.isCustom ? `
            <div style="margin-top: 6px; display: flex; justify-content: flex-end;">
              <button class="btn-secondary" id="btn-delete-custom-bm" style="font-size: 11px; padding: 3px 8px; color: var(--nothing-red); border-color: rgba(215, 25, 32, 0.3);">
                Delete Bookmark
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const iframe = inspectorBody.querySelector('#bm-live-iframe');
    const loader = inspectorBody.querySelector('#bm-preview-loader');
    const reloadBtn = inspectorBody.querySelector('#btn-reload-preview');
    const copyBtn = inspectorBody.querySelector('#btn-copy-preview-url');
    const starBtn = inspectorBody.querySelector('#btn-toggle-inspector-star');
    const toggleMetaBtn = inspectorBody.querySelector('#btn-toggle-meta-details');
    const closeBtn = inspectorBody.querySelector('#btn-close-inspector-panel');
    const metaPanel = inspectorBody.querySelector('#bm-meta-panel');
    const deleteBtn = inspectorBody.querySelector('#btn-delete-custom-bm');

    if (iframe && loader) {
      iframe.addEventListener('load', () => {
        loader.classList.add('hidden');
      });
      // Dismiss spinner after 6 seconds in case page is slow or blocks load event
      setTimeout(() => {
        if (loader) loader.classList.add('hidden');
      }, 6000);
    }

    if (reloadBtn && iframe && loader) {
      reloadBtn.addEventListener('click', () => {
        loader.classList.remove('hidden');
        iframe.src = bm.href;
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(bm.href);
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 1500);
      });
    }

    if (starBtn) {
      starBtn.addEventListener('click', () => {
        store.toggleStarred(bm.href);
        openInspector(bm);
        render();
      });
    }

    if (toggleMetaBtn && metaPanel) {
      toggleMetaBtn.addEventListener('click', () => {
        metaPanel.classList.toggle('hidden');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        userClosedInspector = true;
        selectedBookmark = null;
        inspectorDrawer.classList.remove('open');
        streamList.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete bookmark "${bm.name}"?`)) {
          store.deleteCustomBookmark(bm.id);
          selectedBookmark = null;
          inspectorDrawer.classList.remove('open');
          render();
        }
      });
    }
  }

  // Event Listeners
  if (btnCloseInspector) {
    btnCloseInspector.addEventListener('click', () => inspectorDrawer.classList.remove('open'));
  }

  // Search input live
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      render();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      render();
    });
  }

  // Sort selector
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      render();
    });
  }

  // View mode switcher
  if (btnViewCards) {
    btnViewCards.addEventListener('click', () => {
      viewMode = 'cards';
      store.setBookmarksViewMode('cards');
      btnViewCards.classList.add('active');
      if (btnViewList) btnViewList.classList.remove('active');
      if (streamList) {
        streamList.classList.remove('view-list');
        streamList.classList.add('view-cards');
      }
      render();
    });
  }

  if (btnViewList) {
    btnViewList.addEventListener('click', () => {
      viewMode = 'list';
      store.setBookmarksViewMode('list');
      btnViewList.classList.add('active');
      if (btnViewCards) btnViewCards.classList.remove('active');
      if (streamList) {
        streamList.classList.remove('view-cards');
        streamList.classList.add('view-list');
      }
      render();
    });
  }

  // Filter clicks
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  // Modal Handlers
  const openModal = () => {
    if (addModal) addModal.classList.add('open');
  };
  const closeModal = () => {
    if (addModal) addModal.classList.remove('open');
    if (addForm) addForm.reset();
  };

  if (btnOpenAddModal) btnOpenAddModal.addEventListener('click', openModal);
  if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeModal);
  if (btnCancelAddModal) btnCancelAddModal.addEventListener('click', closeModal);

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector('#add-bm-title').value.trim();
      const url = container.querySelector('#add-bm-url').value.trim();
      const category = container.querySelector('#add-bm-category').value.trim() || 'Custom Bookmarks';
      const tagsRaw = container.querySelector('#add-bm-tags').value.trim();
      const notes = container.querySelector('#add-bm-notes').value.trim();

      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

      store.addCustomBookmark({
        title,
        url,
        category,
        tags,
        notes
      });

      closeModal();
      render();
    });
  }

  // Reactive store updates
  store.on('bookmarks:updated', () => render());
  store.on('bookmarks:starred-changed', () => render());

  // Initial render
  render();
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

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}

export default {
  id: 'tab-bookmarks',
  title: 'Bookmarks',
  icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
  </svg>`,
  async mount(container) {
    renderBookmarksManager(container);
  }
};
