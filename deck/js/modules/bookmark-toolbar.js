/**
 * bookmark-toolbar.js
 * Deck — In-Page Bookmark Bar Component (Tab 1: Command Center)
 * 
 * Sits directly between the Universal Omnibar search and the Launch Deck.
 * Replaces the native browser bookmarks bar with an authentic, themed Deck strip:
 * - Pure direct bookmark icons & hairline separators (folders excluded per user spec).
 * - Full-width horizontal equal distribution, centered icon wells.
 * - Hybrid data adapter: Live Chrome extension Bookmarks Bar (id: '1') or store.state.toolbarZones fallback.
 * - Interactive favicon wells with 20px favicons, smooth hover lift, and rich tooltips.
 * - Automatic real-time re-rendering on Chrome bookmark modifications.
 */

import { store } from '../core/store.js';

let isChromeListenerAttached = false;

/**
 * Initializes and mounts the bookmark toolbar inside the provided container element.
 * @param {HTMLElement} containerEl 
 */
export async function initBookmarkToolbar(containerEl) {
  if (!containerEl) return;

  containerEl.innerHTML = `
    <div class="bookmark-toolbar-wrapper">
      <div class="bookmark-toolbar-card" id="deck-bookmark-bar" role="toolbar" aria-label="Bookmarks Bar">
        <div class="toolbar-loading-placeholder">Loading Bookmarks Bar...</div>
      </div>
    </div>
  `;

  const barEl = containerEl.querySelector('#deck-bookmark-bar');

  async function render() {
    try {
      const items = await loadToolbarItems();
      renderBar(barEl, items);
    } catch (err) {
      console.warn('[Deck Bookmark Toolbar] Load error, using store fallback:', err);
      const fallbackItems = loadFallbackItems();
      renderBar(barEl, fallbackItems);
    }
  }

  // Initial render
  await render();

  // Attach live Chrome bookmarks listeners if extension context is available
  if (!isChromeListenerAttached && typeof chrome !== 'undefined' && chrome.bookmarks) {
    isChromeListenerAttached = true;
    let debounceTimer = null;
    const triggerRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        render();
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
 * Fetches toolbar items from Chrome bookmarks (excluding folders) or falls back to stored dataset.
 */
async function loadToolbarItems() {
  if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => {
        if (!tree || !tree.length) {
          return resolve(loadFallbackItems());
        }

        // Find Bookmarks Bar root node (commonly id: '1' or named "Bookmarks bar" / "Bookmarks")
        const rootChildren = tree[0]?.children || [];
        const barNode = rootChildren.find(c => 
          c.id === '1' || 
          /bookmarks?\s*bar/i.test(c.title || '') ||
          c.title === 'Bookmarks' ||
          c.children?.length > 0
        ) || rootChildren[0];

        if (!barNode || !barNode.children || barNode.children.length === 0) {
          return resolve(loadFallbackItems());
        }

        const parsedItems = [];
        let prevWasSeparator = false;

        for (const node of barNode.children) {
          // Strictly exclude/skip all folders per user instruction
          if (node.children) {
            continue;
          }

          if (isSeparatorBookmark(node.url, node.title)) {
            // Avoid duplicate consecutive separators
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

        // Strip trailing separator if any
        if (parsedItems.length > 0 && parsedItems[parsedItems.length - 1].type === 'separator') {
          parsedItems.pop();
        }

        if (parsedItems.length > 0) {
          resolve(parsedItems);
        } else {
          resolve(loadFallbackItems());
        }
      });
    });
  }

  return loadFallbackItems();
}

/**
 * Loads default curated toolbar zones from Deck store as fallback.
 */
function loadFallbackItems() {
  const zones = store.state.toolbarZones || [];
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
 */
function getFaviconUrl(url) {
  try {
    const parsed = new URL(url);
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
    }
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
    barEl.innerHTML = '<div class="toolbar-empty-hint">No bookmarks in Bookmarks Bar.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'toolbar-separator';
      sep.setAttribute('role', 'separator');
      sep.setAttribute('aria-orientation', 'vertical');
      fragment.appendChild(sep);
      return;
    }

    // Regular Bookmark Link Item
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
    imgEl.parentNode.appendChild(svg);
  };
}
