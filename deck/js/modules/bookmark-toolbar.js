/**
 * bookmark-toolbar.js
 * Deck — In-Page Bookmark Bar Component (Tab 1: Command Center)
 * 
 * Replaces the native browser bookmarks bar with an authentic, themed Deck strip:
 * - Direct bookmark icons & hairline zone separators.
 * - Mode Switcher: ⚡ Deck Curated Zones (default, matching github.io) vs 🌐 Browser Bookmarks Bar.
 * - Local base64 favicon cache with zero-latency instant rendering.
 * - Support for folders via clean dark glass popovers.
 * - High-DPI 20px favicons with micro-hover lift and rich dark tooltips.
 * - Automatic real-time synchronization on Chrome bookmark modifications.
 */

import { store } from '../core/store.js';
import { BOOKMARK_DATA } from '../data/bookmarks.js';

let isChromeListenerAttached = false;
let currentSource = localStorage.getItem('deck_bookmark_bar_source') || 'curated';

// Local domain-to-base64 icon cache for instant zero-network rendering
const LOCAL_ICON_CACHE = new Map();

function buildLocalIconCache() {
  if (LOCAL_ICON_CACHE.size > 0) return;
  
  const scanItem = (item) => {
    if (!item || !item.icon || !item.href) return;
    try {
      const u = new URL(item.href);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      if (!LOCAL_ICON_CACHE.has(host)) {
        LOCAL_ICON_CACHE.set(host, item.icon);
      }
    } catch (_) {}
  };

  // 1. From toolbarZones
  if (BOOKMARK_DATA && BOOKMARK_DATA.toolbarZones) {
    BOOKMARK_DATA.toolbarZones.forEach(z => (z.items || []).forEach(scanItem));
  }

  // 2. From library folders
  if (BOOKMARK_DATA && BOOKMARK_DATA.library) {
    const walk = (folder) => {
      (folder.items || []).forEach(scanItem);
      (folder.subfolders || []).forEach(walk);
    };
    BOOKMARK_DATA.library.forEach(walk);
  }
}

/**
 * Initializes and mounts the bookmark toolbar inside the provided container element.
 * @param {HTMLElement} containerEl 
 */
export async function initBookmarkToolbar(containerEl) {
  if (!containerEl) return;
  buildLocalIconCache();

  containerEl.innerHTML = `
    <div class="bookmark-toolbar-wrapper">
      <div class="bookmark-toolbar-header-row">
        <div class="toolbar-source-toggle" role="group" aria-label="Bookmark Bar Source">
          <button class="toolbar-source-btn ${currentSource === 'curated' ? 'active' : ''}" data-source="curated" title="Deck Curated Semantic Zones (Matches GitHub.io)">
            <span class="source-icon">⚡</span> Curated Bar
          </button>
          <button class="toolbar-source-btn ${currentSource === 'browser' ? 'active' : ''}" data-source="browser" title="Live Browser Bookmarks Bar">
            <span class="source-icon">🌐</span> Browser Bar
          </button>
        </div>
      </div>
      <div class="bookmark-toolbar-card" id="deck-bookmark-bar" role="toolbar" aria-label="Bookmarks Bar">
        <div class="toolbar-loading-placeholder">Loading Bookmarks Bar...</div>
      </div>
    </div>
  `;

  const barEl = containerEl.querySelector('#deck-bookmark-bar');

  async function render() {
    try {
      const items = await loadToolbarItems(currentSource);
      renderBar(barEl, items);
    } catch (err) {
      console.warn('[Deck Bookmark Toolbar] Load error, using curated fallback:', err);
      const fallbackItems = loadCuratedItems();
      renderBar(barEl, fallbackItems);
    }
  }

  // Bind source toggle buttons
  containerEl.querySelectorAll('.toolbar-source-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const newSource = btn.dataset.source;
      if (newSource === currentSource) return;
      currentSource = newSource;
      localStorage.setItem('deck_bookmark_bar_source', currentSource);
      containerEl.querySelectorAll('.toolbar-source-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.source === currentSource);
      });
      await render();
    });
  });

  // Initial render
  await render();

  // Attach live Chrome bookmarks listeners if extension context is available
  if (!isChromeListenerAttached && typeof chrome !== 'undefined' && chrome.bookmarks) {
    isChromeListenerAttached = true;
    let debounceTimer = null;
    const triggerRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (currentSource === 'browser') {
          render();
        }
      }, 150);
    };

    chrome.bookmarks.onCreated?.addListener(triggerRefresh);
    chrome.bookmarks.onRemoved?.addListener(triggerRefresh);
    chrome.bookmarks.onChanged?.addListener(triggerRefresh);
    chrome.bookmarks.onMoved?.addListener(triggerRefresh);
    chrome.bookmarks.onChildrenReordered?.addListener(triggerRefresh);
  }

  // Also listen for store events (e.g. manual import / sync in Bookmarks tab)
  store.on('bookmarks:synced', render);
}

/**
 * Fetches toolbar items based on selected source mode.
 * @param {'curated' | 'browser'} source
 */
async function loadToolbarItems(source = 'curated') {
  if (source === 'browser' && typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
    try {
      // 600ms safety timeout in case getTree hangs
      const browserItems = await Promise.race([
        fetchChromeBookmarksBar(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 600))
      ]);
      if (browserItems && browserItems.length > 0) {
        return browserItems;
      }
    } catch (err) {
      console.warn('[Deck Bookmark Toolbar] Browser bookmarks retrieval bypassed:', err);
    }
  }

  return loadCuratedItems();
}

/**
 * Fetches live items from Chrome Bookmarks Bar.
 */
function fetchChromeBookmarksBar() {
  return new Promise((resolve) => {
    try {
      chrome.bookmarks.getTree((tree) => {
        if (!tree || !tree.length) {
          return resolve([]);
        }

        const rootChildren = tree[0]?.children || [];
        const barNode = rootChildren.find(c => 
          c.id === '1' || 
          /bookmarks?\s*bar|favorites?\s*bar/i.test(c.title || '') ||
          c.title === 'Bookmarks' ||
          c.title === 'Favorites'
        ) || rootChildren[0];

        if (!barNode || !barNode.children || barNode.children.length === 0) {
          return resolve([]);
        }

        const parsedItems = [];
        let prevWasSeparator = false;

        for (const node of barNode.children) {
          // Folder item with child bookmarks
          if (node.children) {
            const folderChildren = (node.children || [])
              .filter(ch => ch.url && !isSeparatorBookmark(ch.url, ch.title))
              .map(ch => ({
                id: ch.id,
                title: ch.title || getDomain(ch.url),
                url: ch.url,
                icon: getFaviconUrl(ch.url)
              }));

            if (folderChildren.length > 0) {
              parsedItems.push({
                type: 'folder',
                id: node.id,
                title: node.title || 'Folder',
                children: folderChildren
              });
              prevWasSeparator = false;
            }
            continue;
          }

          // Separator
          if (isSeparatorBookmark(node.url, node.title)) {
            if (!prevWasSeparator && parsedItems.length > 0) {
              parsedItems.push({ type: 'separator' });
              prevWasSeparator = true;
            }
          } else if (node.url) {
            parsedItems.push({
              type: 'link',
              id: node.id,
              title: node.title || getDomain(node.url),
              url: node.url,
              icon: getFaviconUrl(node.url)
            });
            prevWasSeparator = false;
          }
        }

        // Clean up trailing separator
        if (parsedItems.length > 0 && parsedItems[parsedItems.length - 1].type === 'separator') {
          parsedItems.pop();
        }

        resolve(parsedItems);
      });
    } catch (_) {
      resolve([]);
    }
  });
}

/**
 * Loads the curated 9 toolbar zones from Deck store / data (matches github.io).
 */
function loadCuratedItems() {
  const zones = (store.state && store.state.toolbarZones) || (BOOKMARK_DATA && BOOKMARK_DATA.toolbarZones) || [];
  const items = [];

  zones.forEach((zone, zIdx) => {
    if (!zone.items || !zone.items.length) return;

    zone.items.forEach(item => {
      if (item.is_separator || isSeparatorBookmark(item.href, item.name)) {
        if (items.length > 0 && items[items.length - 1].type !== 'separator') {
          items.push({ type: 'separator' });
        }
      } else if (item.href) {
        items.push({
          type: 'link',
          title: item.name || getDomain(item.href),
          url: item.href,
          icon: item.icon || getFaviconUrl(item.href),
          zone: zone.title
        });
      }
    });

    // Add crisp separator between distinct semantic zones
    if (zIdx < zones.length - 1 && items.length > 0 && items[items.length - 1].type !== 'separator') {
      items.push({ type: 'separator' });
    }
  });

  return items;
}

/**
 * Detects whether a bookmark is a visual separator.
 */
function isSeparatorBookmark(url, title) {
  if (!url) return false;
  if (url.startsWith('about:blank#separator')) return true;
  if (url.includes('separator.mayastudios.com')) return true;
  if (url.startsWith('about:blank') && (!title || title.trim() === '' || /^[\|\-—│\s]+$/.test(title))) return true;
  if (title === '|' || title === '│' || title === '—' || title === '---') return true;
  return false;
}

/**
 * Returns a high-res favicon URL for a given target URL.
 * Prioritizes local pre-cached base64 icons, then extension API, then Google fallback.
 */
function getFaviconUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    // 1. Check local base64 cache for instant offline rendering
    if (LOCAL_ICON_CACHE.has(host)) {
      return LOCAL_ICON_CACHE.get(host);
    }

    // 2. Extension context: use official Chrome favicon endpoint
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
    }

    // 3. Fallback: Google Favicon service
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=32`;
  } catch {
    return '';
  }
}

/**
 * Extracts clean domain name from URL.
 */
function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url || '';
  }
}

/**
 * Renders the toolbar items into the container element.
 */
function renderBar(barEl, items) {
  barEl.innerHTML = '';

  if (!items || items.length === 0) {
    barEl.innerHTML = '<div class="toolbar-empty-hint">No bookmarks found. Click "⚡ Curated Bar" above to view curated zones.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    // 1. Separator
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'toolbar-separator';
      sep.setAttribute('role', 'separator');
      sep.setAttribute('aria-orientation', 'vertical');
      fragment.appendChild(sep);
      return;
    }

    // 2. Folder with Popover
    if (item.type === 'folder') {
      const folderWrap = document.createElement('div');
      folderWrap.className = 'toolbar-folder-wrapper';

      const folderBtn = document.createElement('button');
      folderBtn.type = 'button';
      folderBtn.className = 'toolbar-item-btn toolbar-folder-btn';
      folderBtn.setAttribute('aria-label', item.title);
      folderBtn.setAttribute('data-tooltip-title', item.title);
      folderBtn.setAttribute('data-tooltip-sub', `${item.children.length} bookmarks`);
      folderBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toolbar-folder-svg">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
        </svg>
      `;

      const popover = document.createElement('div');
      popover.className = 'toolbar-folder-popover';
      popover.innerHTML = `
        <div class="popover-header">${escapeHTML(item.title)}</div>
        <div class="popover-items">
          ${item.children.map(ch => `
            <a href="${ch.url}" target="_self" class="popover-item-link" title="${escapeHTML(ch.title)}">
              <img src="${ch.icon}" class="popover-item-favicon" alt="" loading="lazy" />
              <span class="popover-item-title">${escapeHTML(ch.title)}</span>
            </a>
          `).join('')}
        </div>
      `;

      // Handle folder popover open/close
      folderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = popover.classList.contains('open');
        document.querySelectorAll('.toolbar-folder-popover.open').forEach(p => p.classList.remove('open'));
        if (!isOpen) {
          popover.classList.add('open');
        }
      });

      folderWrap.appendChild(folderBtn);
      folderWrap.appendChild(popover);
      fragment.appendChild(folderWrap);
      return;
    }

    // 3. Regular Bookmark Link Item
    const link = document.createElement('a');
    link.className = 'toolbar-item-btn';
    link.href = item.url;
    link.target = '_self';
    const domain = getDomain(item.url);
    link.setAttribute('aria-label', item.title || domain);
    link.setAttribute('data-tooltip-title', item.title || domain);
    link.setAttribute('data-tooltip-sub', domain);

    const img = document.createElement('img');
    img.className = 'toolbar-item-favicon';
    img.src = item.icon || getFaviconUrl(item.url);
    img.alt = item.title || '';
    img.loading = 'lazy';
    attachFaviconFallback(img, item.url);

    link.appendChild(img);
    fragment.appendChild(link);
  });

  barEl.appendChild(fragment);

  // Close folder popovers on outside click or Escape
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.toolbar-folder-wrapper')) {
      document.querySelectorAll('.toolbar-folder-popover.open').forEach(p => p.classList.remove('open'));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.toolbar-folder-popover.open').forEach(p => p.classList.remove('open'));
    }
  });
}

/**
 * Attaches a robust two-stage fallback handler for favicon images.
 */
function attachFaviconFallback(imgEl, originalUrl) {
  let fallbackAttempted = false;

  imgEl.onerror = () => {
    if (!fallbackAttempted) {
      fallbackAttempted = true;
      try {
        const u = new URL(originalUrl);
        imgEl.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=32`;
        return;
      } catch {
        // Fall through to SVG
      }
    }

    // Permanent fallback: replace with clean inline SVG globe
    imgEl.style.display = 'none';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'toolbar-item-fallback-svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>';
    if (imgEl.parentNode) {
      imgEl.parentNode.appendChild(svg);
    }
  };
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
