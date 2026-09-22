/**
 * popup.js
 * Deck Chrome Extension Action Popup
 * 1-Click active tab bookmarking with category, tags, and favorites
 */

document.addEventListener('DOMContentLoaded', async () => {
  const faviconEl = document.getElementById('tab-favicon');
  const domainEl = document.getElementById('tab-domain');
  const titleInput = document.getElementById('bm-title');
  const urlInput = document.getElementById('bm-url');
  const categoryInput = document.getElementById('bm-category');
  const tagsInput = document.getElementById('bm-tags');
  const starBtn = document.getElementById('star-btn');
  const starRow = document.getElementById('toggle-star-row');
  const starSvg = document.getElementById('star-svg');
  const form = document.getElementById('save-form');
  const statusMsg = document.getElementById('status-msg');

  let isStarred = false;
  let currentTab = null;

  // 1. Query Active Tab
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        currentTab = tabs[0];
        titleInput.value = currentTab.title || '';
        urlInput.value = currentTab.url || '';

        try {
          const domain = new URL(currentTab.url).hostname.replace(/^www\./, '');
          domainEl.textContent = domain;
          faviconEl.src = currentTab.favIconUrl || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
        } catch {
          domainEl.textContent = currentTab.url || '';
        }
      }
    } catch (e) {
      console.warn('Could not query active tab:', e);
    }
  }

  // Fallback if testing in standard tab
  if (!urlInput.value) {
    urlInput.value = window.location.href;
    titleInput.value = document.title || 'New Bookmark';
    domainEl.textContent = window.location.hostname || 'localhost';
    faviconEl.src = 'https://www.google.com/s2/favicons?domain=google.com&sz=128';
  }

  // Check if current URL is already starred
  const checkStarredState = async (url) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get('deck_starred_bookmarks');
      const list = data.deck_starred_bookmarks || [];
      if (list.includes(url)) {
        setStarred(true);
      }
    } else {
      try {
        const raw = localStorage.getItem('deck_starred_bookmarks');
        if (raw && JSON.parse(raw).includes(url)) setStarred(true);
      } catch (_) {}
    }
  };

  const setStarred = (starred) => {
    isStarred = starred;
    if (isStarred) {
      starBtn.classList.add('active');
      starSvg.setAttribute('fill', 'var(--amber-primary)');
    } else {
      starBtn.classList.remove('active');
      starSvg.setAttribute('fill', 'none');
    }
  };

  checkStarredState(urlInput.value);

  starRow.addEventListener('click', () => {
    setStarred(!isStarred);
  });

  // 2. Handle Save
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const category = categoryInput.value.trim() || 'Custom Bookmarks';
    const tagsRaw = tagsInput.value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const favicon = faviconEl.src;

    const newBookmark = {
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title,
      name: title,
      url,
      href: url,
      category,
      folder: category,
      tags,
      icon: favicon,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    // Save to chrome.storage.local and localStorage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const storeData = await chrome.storage.local.get(['deck_custom_bookmarks', 'deck_starred_bookmarks']);
        const customList = storeData.deck_custom_bookmarks || [];
        customList.unshift(newBookmark);

        const starredList = storeData.deck_starred_bookmarks || [];
        if (isStarred && !starredList.includes(url)) {
          starredList.push(url);
        } else if (!isStarred && starredList.includes(url)) {
          const idx = starredList.indexOf(url);
          starredList.splice(idx, 1);
        }

        await chrome.storage.local.set({
          deck_custom_bookmarks: customList,
          deck_starred_bookmarks: starredList
        });

        // Also mirror to localStorage if possible
        try {
          localStorage.setItem('deck_custom_bookmarks', JSON.stringify(customList));
          localStorage.setItem('deck_starred_bookmarks', JSON.stringify(starredList));
        } catch (_) {}

        statusMsg.style.color = 'var(--emerald-primary)';
        statusMsg.textContent = '✓ Saved to Deck!';

        setTimeout(() => window.close(), 750);
      } catch (err) {
        statusMsg.style.color = 'var(--nothing-red)';
        statusMsg.textContent = 'Error saving bookmark.';
      }
    } else {
      // LocalStorage fallback
      try {
        const raw = localStorage.getItem('deck_custom_bookmarks');
        const customList = raw ? JSON.parse(raw) : [];
        customList.unshift(newBookmark);
        localStorage.setItem('deck_custom_bookmarks', JSON.stringify(customList));

        statusMsg.style.color = 'var(--emerald-primary)';
        statusMsg.textContent = '✓ Saved locally!';
        setTimeout(() => window.close(), 750);
      } catch (err) {
        statusMsg.style.color = 'var(--nothing-red)';
        statusMsg.textContent = 'Error saving locally.';
      }
    }
  });
});
