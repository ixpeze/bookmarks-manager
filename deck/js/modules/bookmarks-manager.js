/**
 * bookmarks-manager.js
 * Deck — Tab 2: Bookmarks (Karakeep & Raindrop.io Inspired Architecture)
 * 
 * Features:
 * 1. 3-Pane Hybrid Layout:
 *    - Left: Collections, Quick Filters (All, Starred, Recent, Broken Links), and First-Class Tags Tree
 *    - Center: Rich Bookmark Stream with Cards/List switcher, live search, sorting, select-all, and inline checkboxes
 *    - Right: Slide-out Inspector Drawer with live website preview, metadata, broken link warning, and tag editor
 * 2. Multi-Select & Floating Action Dock:
 *    - Checkbox & Shift+Click range selection
 *    - Floating dock: Star All, Add Tag, Copy URLs, Open All, Delete Selected
 * 3. First-Class Tag Taxonomy:
 *    - Dynamic tag extraction and frequency counting in left sidebar
 *    - Tag editor in inspector (add tag on Enter, delete tag)
 * 4. Dual-Engine Import & Export:
 *    - Netscape HTML & JSON export / import with deduplication
 *    - 1-Click Chrome Native Bookmarks API sync (chrome.bookmarks)
 * 5. On-Demand Link Health Telemetry:
 *    - Concurrent batch scanner (chunks of 5, 5s timeout)
 *    - Dedicated Broken Links filter with badge
 *    - 1-Click Wayback Machine archive lookup fallback
 * 6. Strict Zero-Emoji UI: Clean SVG icons throughout
 */

import { BOOKMARK_DATA } from '../data/bookmarks.js';
import { store } from '../core/store.js';

export function renderBookmarksManager(container) {
  // State
  let activeFilter = 'all'; // 'all' | 'starred' | 'recent' | 'broken' | 'cat:<idx>' | 'tag:<tag>'
  let searchQuery = '';
  let sortBy = 'title-asc'; // 'title-asc' | 'title-desc' | 'domain' | 'category'
  let viewMode = store.state.bookmarksViewMode || 'cards'; // 'cards' | 'list'
  let selectedBookmark = null; // for live preview inspector
  let userClosedInspector = false;
  let currentFiltered = [];
  const selectedSet = new Set(); // URLs of selected items for batch operations
  let lastClickedIndex = -1; // for Shift+Click range selection
  let isAuditing = false;

  // 1. Compile all library bookmarks + custom user bookmarks + overlay metadata
  function getAllBookmarks() {
    const overlay = store.state.overlayMetadata || {};
    const deletedSet = store.state.deletedBookmarks || new Set();
    const libraryItems = BOOKMARK_DATA.library.flatMap((cat, idx) => flattenCategory(cat, '', idx));
    const customItems = (store.state.customBookmarks || [])
      .filter(b => !deletedSet.has(b.url || b.href))
      .map(b => {
        const url = b.url || b.href;
        const meta = overlay[url] || {};
        return {
          name: meta.title || b.title || b.name,
          href: url,
          icon: b.favicon || b.icon || '',
          folder: b.category || 'Custom Bookmarks',
          tags: meta.tags || b.tags || [],
          notes: meta.notes || b.notes || '',
          id: b.id,
          isCustom: true,
          createdAt: b.createdAt || new Date().toISOString()
        };
      });

    const libraryMerged = libraryItems
      .filter(it => !deletedSet.has(it.href))
      .map(it => {
        const meta = overlay[it.href] || {};
        return {
          ...it,
          name: meta.title || it.name,
          tags: meta.tags || it.tags || [],
          notes: meta.notes || it.notes || ''
        };
      });

    return [...customItems, ...libraryMerged];
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
    if (lower.includes('github') || lower.includes('code')) tags.push('Code');
    if (lower.includes('ai') || lower.includes('llm') || lower.includes('gpt')) tags.push('AI');
    if (lower.includes('asset') || lower.includes('model')) tags.push('Assets');
    return tags.slice(0, 3);
  }

  function extractAllTags(bookmarks) {
    const counts = new Map();
    bookmarks.forEach(b => {
      (b.tags || []).forEach(t => {
        const clean = t.trim();
        if (clean) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
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
      <!-- Left Sidebar: Collections, Quick Filters & Tags -->
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

          <button class="bm-filter-btn" data-filter="broken" id="btn-filter-broken">
            <div class="bm-filter-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--rose-primary);">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <span>Broken Links</span>
            </div>
            <span class="bm-count-badge" id="badge-count-broken">0</span>
          </button>
        </div>

        <!-- Tags Cloud Navigation -->
        <div class="bm-section-label" style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
          <span>Tags</span>
          <span id="bm-tags-total-count" style="font-size: 10px; color: var(--text-muted);">0</span>
        </div>
        <div class="bm-category-tree" id="bm-tags-tree" style="max-height: 160px; overflow-y: auto;">
          <div style="padding: 8px; font-size: 11px; color: var(--text-muted);">Loading tags...</div>
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
          <div class="bm-toolbar-left" style="display: flex; align-items: baseline; gap: 10px;">
            <div>
              <div class="bm-feed-title" id="bm-feed-title">All Bookmarks</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="bm-feed-counter" id="bm-feed-counter">Loading...</span>
                <button class="bm-btn-select-all" id="btn-toggle-select-all" title="Select / Deselect all visible bookmarks">Select All</button>
              </div>
            </div>
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

          <!-- Controls: Actions, Sort & View Switcher -->
          <div class="bm-toolbar-right">
            <!-- Scan Links Button -->
            <button class="bm-toolbar-btn" id="btn-scan-links" title="Audit links for 404s, timeouts, and broken domains">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              <span>Scan Links</span>
            </button>

            <!-- Import / Export Menu -->
            <div class="bm-import-export-wrap">
              <button class="bm-toolbar-btn" id="btn-import-export-toggle" title="Import and Export Bookmarks">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Import / Export</span>
              </button>
              <div class="bm-import-export-menu" id="bm-import-export-menu">
                <button class="bm-menu-item" id="btn-menu-export-html">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Export HTML Bookmarks</span>
                </button>
                <button class="bm-menu-item" id="btn-menu-export-json">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <span>Export JSON Backup</span>
                </button>
                <div class="bm-menu-divider"></div>
                <button class="bm-menu-item" id="btn-menu-import-file">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Upload HTML / JSON</span>
                </button>
                <button class="bm-menu-item" id="btn-menu-sync-chrome">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--cyan-primary);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" y1="8" x2="12" y2="8"></line><line x1="3.95" y1="6.06" x2="8.54" y2="14"></line><line x1="10.88" y1="21.94" x2="15.46" y2="14"></line></svg>
                  <span>Sync from Chrome Bar</span>
                </button>
              </div>
              <input type="file" id="bm-file-import-input" accept=".html,.htm,.json" style="display: none;" />
            </div>

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
          <div class="bm-loading-state">Loading bookmarks stream...</div>
        </div>

        <!-- Floating Bottom Action Dock for Batch Operations -->
        <div class="bm-floating-dock" id="bm-floating-dock">
          <div class="bm-dock-count-badge">
            <span id="bm-selected-count">0</span>&nbsp;selected
          </div>
          <button class="bm-dock-btn" id="btn-dock-star" title="Star all selected">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>Star All</span>
          </button>
          <button class="bm-dock-btn" id="btn-dock-tag" title="Add tag to selected">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>
            <span>Add Tag</span>
          </button>
          <button class="bm-dock-btn" id="btn-dock-copy" title="Copy all URLs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
            <span>Copy URLs</span>
          </button>
          <button class="bm-dock-btn" id="btn-dock-open" title="Open all in new tabs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            <span>Open All</span>
          </button>
          <button class="bm-dock-btn danger" id="btn-dock-delete" title="Delete custom bookmarks in selection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            <span>Delete</span>
          </button>
          <div class="bm-dock-divider"></div>
          <button class="bm-dock-btn" id="btn-dock-clear" title="Clear selection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </main>

      <!-- Right 3rd Panel: Live Webpage Preview & Inspector -->
      <aside class="bm-inspector-drawer" id="bm-inspector-drawer">
        <div class="bm-resizer-handle" id="bm-resizer-handle" title="Drag to resize live preview pane"></div>
        <div class="bm-inspector-body" id="bm-inspector-body">
          <div class="bm-inspector-empty">Select a bookmark to inspect details & live webpage preview</div>
        </div>
      </aside>
    </div>

    <!-- Modal: Add New Bookmark -->
    <div class="modal-overlay" id="add-bookmark-modal">
      <div class="modal-box" style="max-width: 480px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="card-title" style="font-size: 15px; display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--amber-primary);">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Custom Bookmark
          </div>
          <button id="btn-close-add-modal" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer;" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="add-bookmark-form">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Title</label>
              <input type="text" id="add-bm-title" class="prompt-input" required placeholder="e.g. Poly Haven HDRIs" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">URL</label>
              <input type="url" id="add-bm-url" class="prompt-input" required placeholder="https://polyhaven.com" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Collection / Category</label>
              <input type="text" id="add-bm-category" class="prompt-input" placeholder="e.g. 3D & Textures" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Tags (comma separated)</label>
              <input type="text" id="add-bm-tags" class="prompt-input" placeholder="e.g. HDRI, PBR, Assets" />
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Notes / Scratchpad</label>
              <textarea id="add-bm-notes" class="prompt-input" style="height: 60px; resize: vertical;" placeholder="Optional personal notes..."></textarea>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px;">
            <button type="button" class="btn-secondary" id="btn-cancel-add-modal" style="font-size: 12px; padding: 6px 14px;">Cancel</button>
            <button type="submit" class="btn-secondary" style="font-size: 12px; padding: 6px 16px; background: var(--amber-primary); color: #080808; font-weight: 700; border: none;">Save Bookmark</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Elements
  const streamList = container.querySelector('#bm-stream-list');
  const feedTitle = container.querySelector('#bm-feed-title');
  const feedCounter = container.querySelector('#bm-feed-counter');
  const searchInput = container.querySelector('#bm-search-input');
  const clearSearchBtn = container.querySelector('#btn-clear-search');
  const sortSelect = container.querySelector('#bm-sort-select');
  const btnViewCards = container.querySelector('#btn-view-cards');
  const btnViewList = container.querySelector('#btn-view-list');
  const filterButtons = container.querySelectorAll('.bm-filter-btn, .bm-cat-btn');
  const countBadgeAll = container.querySelector('#badge-count-all');
  const countBadgeStarred = container.querySelector('#badge-count-starred');
  const countBadgeRecent = container.querySelector('#badge-count-recent');
  const countBadgeBroken = container.querySelector('#badge-count-broken');
  const tagsTree = container.querySelector('#bm-tags-tree');
  const tagsTotalCount = container.querySelector('#bm-tags-total-count');

  const inspectorDrawer = container.querySelector('#bm-inspector-drawer');
  const inspectorBody = container.querySelector('#bm-inspector-body');
  const resizerHandle = container.querySelector('#bm-resizer-handle');

  // Load persisted inspector width
  const savedInspectorWidth = localStorage.getItem('deck_inspector_width');
  if (savedInspectorWidth) {
    document.documentElement.style.setProperty('--inspector-width', `${savedInspectorWidth}px`);
  }

  // Draggable Inspector Resizer
  if (resizerHandle && inspectorDrawer) {
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    resizerHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startWidth = inspectorDrawer.getBoundingClientRect().width;
      resizerHandle.classList.add('dragging');
      document.body.classList.add('bm-resizing');

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        // Drawer is anchored on the right edge; dragging left (smaller clientX) widens inspector
        const deltaX = startX - moveEvent.clientX;
        let newWidth = startWidth + deltaX;
        const minW = 380;
        const maxW = Math.floor(window.innerWidth * 0.72);
        newWidth = Math.max(minW, Math.min(maxW, newWidth));
        document.documentElement.style.setProperty('--inspector-width', `${newWidth}px`);
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        resizerHandle.classList.remove('dragging');
        document.body.classList.remove('bm-resizing');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        localStorage.setItem('deck_inspector_width', Math.round(inspectorDrawer.getBoundingClientRect().width));
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // Multi-Select Elements
  const btnToggleSelectAll = container.querySelector('#btn-toggle-select-all');
  const floatingDock = container.querySelector('#bm-floating-dock');
  const selectedCountEl = container.querySelector('#bm-selected-count');
  const btnDockStar = container.querySelector('#btn-dock-star');
  const btnDockTag = container.querySelector('#btn-dock-tag');
  const btnDockCopy = container.querySelector('#btn-dock-copy');
  const btnDockOpen = container.querySelector('#btn-dock-open');
  const btnDockDelete = container.querySelector('#btn-dock-delete');
  const btnDockClear = container.querySelector('#btn-dock-clear');

  // Toolbar action elements
  const btnScanLinks = container.querySelector('#btn-scan-links');
  const btnImportExportToggle = container.querySelector('#btn-import-export-toggle');
  const importExportMenu = container.querySelector('#bm-import-export-menu');
  const btnMenuExportHtml = container.querySelector('#btn-menu-export-html');
  const btnMenuExportJson = container.querySelector('#btn-menu-export-json');
  const btnMenuImportFile = container.querySelector('#btn-menu-import-file');
  const btnMenuSyncChrome = container.querySelector('#btn-menu-sync-chrome');
  const fileImportInput = container.querySelector('#bm-file-import-input');

  const addModal = container.querySelector('#add-bookmark-modal');
  const btnOpenAddModal = container.querySelector('#btn-open-add-modal');
  const btnCloseAddModal = container.querySelector('#btn-close-add-modal');
  const btnCancelAddModal = container.querySelector('#btn-cancel-add-modal');
  const addForm = container.querySelector('#add-bookmark-form');

  // Update Floating Action Dock state
  function updateDock() {
    if (!floatingDock) return;
    const count = selectedSet.size;
    if (selectedCountEl) selectedCountEl.textContent = count;

    if (count > 0) {
      floatingDock.classList.add('visible');
    } else {
      floatingDock.classList.remove('visible');
    }

    if (btnToggleSelectAll) {
      if (currentFiltered.length > 0 && selectedSet.size === currentFiltered.length) {
        btnToggleSelectAll.textContent = 'Deselect All';
      } else {
        btnToggleSelectAll.textContent = 'Select All';
      }
    }
  }

  // Render Tags in Left Sidebar
  function renderTagsSidebar(all) {
    if (!tagsTree) return;
    const tagPairs = extractAllTags(all);
    if (tagsTotalCount) tagsTotalCount.textContent = tagPairs.length;

    if (tagPairs.length === 0) {
      tagsTree.innerHTML = `<div style="padding: 8px; font-size: 11px; color: var(--text-muted);">No tags yet</div>`;
      return;
    }

    tagsTree.innerHTML = tagPairs.map(([tag, count]) => {
      const isActive = activeFilter === `tag:${tag}`;
      return `
        <button class="bm-tag-sidebar-btn ${isActive ? 'active' : ''}" data-tag="${escapeAttr(tag)}">
          <span>#${escapeHTML(tag)}</span>
          <span class="bm-count-badge">${count}</span>
        </button>
      `;
    }).join('');

    tagsTree.querySelectorAll('.bm-tag-sidebar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.bm-filter-btn, .bm-cat-btn').forEach(b => b.classList.remove('active'));
        tagsTree.querySelectorAll('.bm-tag-sidebar-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = `tag:${btn.dataset.tag}`;
        render();
      });
    });
  }

  // Filter & Render logic
  function render() {
    const all = getAllBookmarks();
    const starredSet = store.state.starredBookmarks || new Set();
    const healthCache = store.state.linkHealthCache || {};

    // Count broken links
    let brokenCount = 0;
    Object.values(healthCache).forEach(h => {
      if (h && h.status === 'broken') brokenCount++;
    });

    // Update Badges
    if (countBadgeAll) countBadgeAll.textContent = all.length;
    if (countBadgeStarred) countBadgeStarred.textContent = starredSet.size;
    const recentCount = (store.state.customBookmarks || []).length;
    if (countBadgeRecent) countBadgeRecent.textContent = recentCount;
    if (countBadgeBroken) countBadgeBroken.textContent = brokenCount;

    // Render tags
    renderTagsSidebar(all);

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
    } else if (activeFilter === 'broken') {
      filtered = filtered.filter(b => healthCache[b.href] && healthCache[b.href].status === 'broken');
      if (feedTitle) feedTitle.textContent = `Broken / Unreachable Links (${filtered.length})`;
    } else if (activeFilter.startsWith('tag:')) {
      const targetTag = activeFilter.slice(4).toLowerCase();
      filtered = filtered.filter(b => (b.tags || []).some(t => t.toLowerCase() === targetTag));
      if (feedTitle) feedTitle.textContent = `Tagged with #${activeFilter.slice(4)}`;
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
      currentFiltered = [];
      updateDock();
      return;
    }

    currentFiltered = filtered;

    streamList.innerHTML = filtered.map((b, idx) => {
      const domain = getDomain(b.href);
      const favicon = getHighResFavicon(b.href, b.icon);
      const isStarred = starredSet.has(b.href);
      const tags = b.tags || [];
      const isSelected = selectedBookmark && selectedBookmark.href === b.href;
      const isItemChecked = selectedSet.has(b.href);
      const health = healthCache[b.href];

      if (viewMode === 'cards') {
        return `
          <div class="bm-card ${isSelected ? 'selected' : ''} ${isItemChecked ? 'item-selected' : ''}" data-index="${idx}" data-url="${escapeAttr(b.href)}">
            <div class="bm-card-top">
              <div class="bm-card-source">
                <img src="${favicon}" class="bm-card-icon" alt="" loading="lazy" onerror="this.style.display='none';" />
                <span class="bm-domain-badge">${escapeHTML(domain)}</span>
                ${health && health.status === 'broken' ? `<span class="bm-health-badge broken">Dead Link</span>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <button class="bm-quick-delete-btn" data-url="${escapeAttr(b.href)}" data-id="${b.id || ''}" title="Quick Delete (Zero Prompts)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
                <button class="bm-star-btn ${isStarred ? 'active' : ''}" data-url="${escapeAttr(b.href)}" title="${isStarred ? 'Remove from favorites' : 'Add to favorites'}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="${isStarred ? 'var(--amber-primary)' : 'none'}" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>

            <div class="bm-card-title" title="${escapeAttr(b.name)}">${escapeHTML(b.name)}</div>
            <div class="bm-card-category">${escapeHTML(b.folder)}</div>

            ${tags.length > 0 ? `
              <div class="bm-card-tags">
                ${tags.map(t => `<span class="bm-tag-pill" data-tag="${escapeAttr(t)}">#${escapeHTML(t)}</span>`).join('')}
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
          <div class="bm-row ${isSelected ? 'selected' : ''} ${isItemChecked ? 'item-selected' : ''}" data-index="${idx}" data-url="${escapeAttr(b.href)}">
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
              ${health && health.status === 'broken' ? `<span class="bm-health-badge broken">Dead Link</span>` : ''}
              ${tags.map(t => `<span class="bm-tag-pill" data-tag="${escapeAttr(t)}">#${escapeHTML(t)}</span>`).join('')}
            </div>

            <div class="bm-row-right">
              <button class="bm-quick-delete-btn" data-url="${escapeAttr(b.href)}" data-id="${b.id || ''}" title="Quick Delete (Zero Prompts)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
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

    // Bind item click (Normal click opens inspector; Ctrl/Cmd/Shift click selects)
    streamList.querySelectorAll('.bm-card, .bm-row').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.bm-quick-delete-btn') || e.target.closest('.bm-star-btn') || e.target.closest('.bm-card-open-btn') || e.target.closest('.bm-row-open-btn')) {
          return;
        }
        if (e.target.closest('.bm-tag-pill')) {
          const tag = e.target.closest('.bm-tag-pill').dataset.tag;
          if (tag) {
            activeFilter = `tag:${tag}`;
            render();
            return;
          }
        }
        const idx = parseInt(card.dataset.index, 10);
        const bm = currentFiltered[idx];
        if (!bm) return;

        // Multi-selection with Ctrl/Cmd or Shift
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          e.preventDefault();
          if (e.shiftKey && lastClickedIndex >= 0 && lastClickedIndex !== idx) {
            const start = Math.min(lastClickedIndex, idx);
            const end = Math.max(lastClickedIndex, idx);
            for (let i = start; i <= end; i++) {
              if (currentFiltered[i]) selectedSet.add(currentFiltered[i].href);
            }
          } else {
            if (selectedSet.has(bm.href)) {
              selectedSet.delete(bm.href);
            } else {
              selectedSet.add(bm.href);
            }
          }
          lastClickedIndex = idx;
          render();
          updateDock();
          return;
        }

        // Normal click: open inspector
        lastClickedIndex = idx;
        openInspector(bm);
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    // Bind Quick Delete buttons (Instant, zero prompt)
    streamList.querySelectorAll('.bm-quick-delete-btn').forEach(delBtn => {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = delBtn.dataset.url;
        const id = delBtn.dataset.id;
        store.deleteBookmark(url, id);
        selectedSet.delete(url);
        if (selectedBookmark && selectedBookmark.href === url) {
          selectedBookmark = null;
          inspectorDrawer.classList.remove('open');
        }
        render();
      });
    });

    // Bind star toggles
    streamList.querySelectorAll('.bm-star-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        store.toggleStarred(url);
        render();
        if (selectedBookmark && selectedBookmark.href === url) {
          openInspector(selectedBookmark);
        }
      });
    });

    // Auto-open first bookmark in desktop view if not closed by user
    if (!selectedBookmark && filtered.length > 0 && window.innerWidth >= 1280 && !userClosedInspector) {
      openInspector(filtered[0]);
    }

    updateDock();
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
    const health = store.getLinkHealth(bm.href);

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

            <button class="bm-browser-btn" id="btn-toggle-theater" title="Maximize / Theater Mode (Full Viewport)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-theater-btn">
                <path d="M15 3h6v6"></path>
                <path d="M9 21H3v-6"></path>
                <path d="M21 3l-7 7"></path>
                <path d="M3 21l7-7"></path>
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

        <!-- Broken Link Warning Banner (Phase 5) -->
        ${health && health.status === 'broken' ? `
          <div class="bm-broken-banner">
            <div class="bm-broken-banner-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Dead or Unreachable Link</span>
            </div>
            <a href="https://web.archive.org/web/*/${encodeURI(bm.href)}" target="_blank" rel="noopener noreferrer" class="bm-wayback-btn">
              <span>Wayback Machine ↗</span>
            </a>
          </div>
        ` : ''}

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

        <!-- Collapsible Details Bar (Collection, Tag Editor, Notes, Delete) -->
        <div class="bm-preview-meta-panel" id="bm-meta-panel">
          <div class="bm-meta-chips-row">
            <div class="bm-meta-chip">
              <span class="bm-meta-chip-label">Collection:</span>
              <span class="bm-meta-chip-val">${escapeHTML(bm.folder)}</span>
            </div>
          </div>

          <!-- Interactive Tag Editor -->
          <div class="bm-tag-editor-row" id="bm-tag-editor-row">
            ${tags.map((t, tIdx) => `
              <span class="bm-tag-pill">
                #${escapeHTML(t)}
                <button class="bm-tag-del-btn" data-tag-idx="${tIdx}" title="Remove tag">×</button>
              </span>
            `).join('')}
            <input type="text" class="bm-inspector-new-tag-input" id="bm-inspector-new-tag" placeholder="+ Add tag..." />
          </div>

          ${bm.notes ? `
            <div class="bm-meta-notes-box" style="margin-top: 8px;">
              ${escapeHTML(bm.notes)}
            </div>
          ` : ''}

          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <a href="https://web.archive.org/web/*/${encodeURI(bm.href)}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: var(--text-muted); text-decoration: none; display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Wayback Machine</span>
            </a>
            <button class="btn-secondary" id="btn-delete-inspector-bm" style="font-size: 11px; padding: 3px 8px; color: var(--rose-primary); border-color: rgba(229, 62, 62, 0.3); display: flex; align-items: center; gap: 4px;" title="Delete bookmark immediately (no prompt)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              <span>Delete Bookmark</span>
            </button>
          </div>
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
    const theaterBtn = inspectorBody.querySelector('#btn-toggle-theater');
    const metaPanel = inspectorBody.querySelector('#bm-meta-panel');
    const deleteBtn = inspectorBody.querySelector('#btn-delete-inspector-bm');
    const tagEditorInput = inspectorBody.querySelector('#bm-inspector-new-tag');

    if (theaterBtn) {
      // Restore theater icon state if drawer is already in theater mode
      const isTheaterActive = inspectorDrawer.classList.contains('theater-mode');
      updateTheaterIcon(theaterBtn, isTheaterActive);

      theaterBtn.addEventListener('click', () => {
        const isNowTheater = inspectorDrawer.classList.toggle('theater-mode');
        updateTheaterIcon(theaterBtn, isNowTheater);
      });
    }

    if (iframe && loader) {
      iframe.addEventListener('load', () => {
        loader.classList.add('hidden');
      });
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
        inspectorDrawer.classList.remove('theater-mode');
        inspectorDrawer.classList.remove('open');
        streamList.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      });
    }

    // Tag Editor: Remove Tag
    inspectorBody.querySelectorAll('.bm-tag-del-btn').forEach(delBtn => {
      delBtn.addEventListener('click', () => {
        const tIdx = parseInt(delBtn.dataset.tagIdx, 10);
        const updatedTags = tags.filter((_, idx) => idx !== tIdx);
        store.updateBookmarkMetadata(bm.href, { tags: updatedTags });
        bm.tags = updatedTags;
        openInspector(bm);
        render();
      });
    });

    // Tag Editor: Add Tag on Enter
    if (tagEditorInput) {
      tagEditorInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = tagEditorInput.value.trim().replace(/^#/, '');
          if (val && !tags.includes(val)) {
            const updatedTags = [...tags, val];
            store.updateBookmarkMetadata(bm.href, { tags: updatedTags });
            bm.tags = updatedTags;
            openInspector(bm);
            render();
          }
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        store.deleteBookmark(bm.href, bm.id);
        selectedSet.delete(bm.href);
        selectedBookmark = null;
        inspectorDrawer.classList.remove('open');
        render();
      });
    }
  }

  // Multi-Select Toggle All Action
  if (btnToggleSelectAll) {
    btnToggleSelectAll.addEventListener('click', () => {
      if (currentFiltered.length === 0) return;
      if (selectedSet.size === currentFiltered.length) {
        selectedSet.clear();
      } else {
        currentFiltered.forEach(b => selectedSet.add(b.href));
      }
      render();
      updateDock();
    });
  }

  // Keyboard Shortcuts: Ctrl+A / Cmd+A and Esc for Theater Mode
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (inspectorDrawer && inspectorDrawer.classList.contains('theater-mode')) {
        inspectorDrawer.classList.remove('theater-mode');
        const tBtn = inspectorDrawer.querySelector('#btn-toggle-theater');
        if (tBtn) updateTheaterIcon(tBtn, false);
      }
      return;
    }
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (currentFiltered.length > 0) {
        if (selectedSet.size === currentFiltered.length) {
          selectedSet.clear();
        } else {
          currentFiltered.forEach(b => selectedSet.add(b.href));
        }
        render();
        updateDock();
      }
    }
  });

  if (btnDockClear) {
    btnDockClear.addEventListener('click', () => {
      selectedSet.clear();
      render();
      updateDock();
    });
  }

  if (btnDockStar) {
    btnDockStar.addEventListener('click', () => {
      const urls = Array.from(selectedSet);
      store.batchToggleStarred(urls, true);
      render();
    });
  }

  if (btnDockTag) {
    btnDockTag.addEventListener('click', () => {
      const tag = prompt('Enter tag to add to selected bookmarks:');
      if (tag && tag.trim()) {
        const cleanTag = tag.trim().replace(/^#/, '');
        const urls = Array.from(selectedSet);
        const all = getAllBookmarks();
        urls.forEach(url => {
          const item = all.find(b => b.href === url);
          const existingTags = item ? (item.tags || []) : [];
          if (!existingTags.includes(cleanTag)) {
            store.updateBookmarkMetadata(url, { tags: [...existingTags, cleanTag] });
          }
        });
        render();
      }
    });
  }

  if (btnDockCopy) {
    btnDockCopy.addEventListener('click', async () => {
      const urls = Array.from(selectedSet);
      await navigator.clipboard.writeText(urls.join('\n'));
      const orig = btnDockCopy.innerHTML;
      btnDockCopy.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--emerald-primary);"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Copied!</span>`;
      setTimeout(() => btnDockCopy.innerHTML = orig, 1400);
    });
  }

  if (btnDockOpen) {
    btnDockOpen.addEventListener('click', () => {
      const urls = Array.from(selectedSet);
      if (urls.length > 10) {
        if (!confirm(`Open ${urls.length} tabs at once?`)) return;
      }
      urls.forEach(url => window.open(url, '_blank'));
    });
  }

  if (btnDockDelete) {
    btnDockDelete.addEventListener('click', () => {
      const urls = Array.from(selectedSet);
      if (urls.length > 0) {
        store.batchDeleteBookmarks(urls);
        selectedSet.clear();
        if (selectedBookmark && urls.includes(selectedBookmark.href)) {
          selectedBookmark = null;
          inspectorDrawer.classList.remove('open');
        }
        render();
        updateDock();
      }
    });
  }

  // Import / Export Engine
  if (btnImportExportToggle && importExportMenu) {
    btnImportExportToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      importExportMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!importExportMenu.contains(e.target) && e.target !== btnImportExportToggle) {
        importExportMenu.classList.remove('open');
      }
    });
  }

  // Export HTML (Netscape Bookmark file)
  if (btnMenuExportHtml) {
    btnMenuExportHtml.addEventListener('click', () => {
      const all = getAllBookmarks();
      let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<!-- This is an automatically generated file. It will be read and overwritten. DO NOT EDIT! -->\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Deck Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n`;
      all.forEach(b => {
        const title = escapeHTML(b.name || b.title);
        const url = escapeAttr(b.href);
        const icon = b.icon && b.icon.startsWith('data:') ? ` ICON="${escapeAttr(b.icon)}"` : '';
        html += `    <DT><A HREF="${url}"${icon}>${title}</A>\n`;
      });
      html += `</DL><p>\n`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `deck_bookmarks_${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      importExportMenu.classList.remove('open');
    });
  }

  // Export JSON Backup
  if (btnMenuExportJson) {
    btnMenuExportJson.addEventListener('click', () => {
      const payload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        customBookmarks: store.state.customBookmarks || [],
        starredBookmarks: Array.from(store.state.starredBookmarks || []),
        overlayMetadata: store.state.overlayMetadata || {},
        linkHealthCache: store.state.linkHealthCache || {}
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `deck_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      importExportMenu.classList.remove('open');
    });
  }

  // File Upload Trigger
  if (btnMenuImportFile && fileImportInput) {
    btnMenuImportFile.addEventListener('click', () => {
      fileImportInput.click();
      importExportMenu.classList.remove('open');
    });

    fileImportInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      let importedCount = 0;

      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          const list = Array.isArray(data) ? data : (data.customBookmarks || []);
          list.forEach(item => {
            const url = item.url || item.href;
            if (url && !(store.state.customBookmarks || []).some(b => (b.url || b.href) === url)) {
              store.addCustomBookmark({
                title: item.title || item.name || url,
                url,
                category: item.category || 'Imported Bookmarks',
                tags: item.tags || [],
                notes: item.notes || ''
              });
              importedCount++;
            }
          });
          alert(`Imported ${importedCount} bookmarks from JSON!`);
        } catch (err) {
          alert('Failed to parse JSON file: ' + err.message);
        }
      } else {
        // Parse HTML Netscape bookmarks
        const linkRegex = /<A\s+HREF="([^"]+)"[^>]*>(.*?)<\/A>/gi;
        let match;
        const existingUrls = new Set(getAllBookmarks().map(b => b.href));

        while ((match = linkRegex.exec(text)) !== null) {
          const url = match[1];
          const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
          if (url && !url.startsWith('javascript:') && !existingUrls.has(url)) {
            existingUrls.add(url);
            store.addCustomBookmark({
              title: rawTitle || url,
              url,
              category: 'Imported Bookmarks',
              tags: ['Imported'],
              notes: ''
            });
            importedCount++;
          }
        }
        alert(`Imported ${importedCount} bookmarks from HTML!`);
      }

      fileImportInput.value = '';
      render();
    });
  }

  // 1-Click Sync from Chrome Bookmarks Bar
  if (btnMenuSyncChrome) {
    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
      btnMenuSyncChrome.addEventListener('click', () => {
        importExportMenu.classList.remove('open');
        chrome.bookmarks.getTree((tree) => {
          let count = 0;
          const existing = new Set(getAllBookmarks().map(b => b.href));

          const walk = (nodes, folderName) => {
            nodes.forEach(node => {
              if (node.url && !existing.has(node.url)) {
                existing.add(node.url);
                store.addCustomBookmark({
                  title: node.title || node.url,
                  url: node.url,
                  category: folderName || 'Chrome Bookmarks',
                  tags: ['Chrome'],
                  notes: ''
                });
                count++;
              }
              if (node.children) {
                walk(node.children, node.title || folderName);
              }
            });
          };

          walk(tree, 'Chrome Bar');
          alert(`Synced ${count} bookmarks directly from Chrome!`);
          render();
        });
      });
    } else {
      btnMenuSyncChrome.addEventListener('click', () => {
        alert('Chrome Bookmarks API is available when loaded as an unpacked extension in Developer Mode (chrome://extensions). For web mode, please use Upload HTML / JSON.');
        importExportMenu.classList.remove('open');
      });
    }
  }

  // On-Demand Link Health Telemetry
  async function runLinkAudit() {
    if (isAuditing) return;
    isAuditing = true;

    if (btnScanLinks) {
      btnScanLinks.classList.add('scanning');
      btnScanLinks.innerHTML = `<div class="bm-preview-spinner" style="width: 12px; height: 12px; border-width: 1.5px;"></div> <span>Scanning...</span>`;
    }

    const all = getAllBookmarks();
    const batchSize = 5;

    for (let i = 0; i < all.length; i += batchSize) {
      const chunk = all.slice(i, i + batchSize);
      await Promise.all(chunk.map(async (bm) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(bm.href, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          clearTimeout(timer);
          store.saveLinkHealth(bm.href, { status: 'healthy', code: res.status });
        } catch (err) {
          // If network failure or abort
          const isTimeout = err.name === 'AbortError';
          store.saveLinkHealth(bm.href, {
            status: isTimeout ? 'broken' : 'healthy', // no-cors opaque resolves as healthy if completed
            error: err.message
          });
        }
      }));
    }

    isAuditing = false;
    if (btnScanLinks) {
      btnScanLinks.classList.remove('scanning');
      btnScanLinks.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg> <span>Scan Links</span>`;
    }
    render();
  }

  if (btnScanLinks) {
    btnScanLinks.addEventListener('click', runLinkAudit);
  }

  // Global event listener for link audit
  window.addEventListener('deck:trigger-link-audit', runLinkAudit);

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
      if (tagsTree) tagsTree.querySelectorAll('.bm-tag-sidebar-btn').forEach(b => b.classList.remove('active'));
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
  store.on('bookmarks:metadata-updated', () => render());
  store.on('bookmarks:health-updated', () => render());

  // Initial render
  render();
}

function updateTheaterIcon(btn, isTheater) {
  if (!btn) return;
  if (isTheater) {
    btn.title = 'Exit Theater Mode (Esc)';
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 14h6v6"></path>
        <path d="M20 10h-6V4"></path>
        <path d="M14 10l7-7"></path>
        <path d="M10 14L3 21"></path>
      </svg>
    `;
  } else {
    btn.title = 'Maximize / Theater Mode (Full Viewport)';
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h6v6"></path>
        <path d="M9 21H3v-6"></path>
        <path d="M21 3l-7 7"></path>
        <path d="M3 21l7-7"></path>
      </svg>
    `;
  }
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
