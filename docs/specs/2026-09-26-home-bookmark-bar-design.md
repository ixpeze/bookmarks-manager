# Specification: Home Tab Bookmark Bar Integration (Phase 4)

**Date**: 2026-09-26  
**Status**: Approved & Ready for Planning  
**Target Module**: `deck/js/modules/bookmark-toolbar.js` & `deck/js/modules/command-center.js`  
**Associated Issues/Requests**: In-page replacement for hidden Chrome/Edge default bookmark bar  

---

## 1. Overview & Objective
The user hides their browser's default native Bookmarks Bar (`Ctrl+Shift+B`) to maximize vertical screen real estate. This feature introduces an authentic, high-density in-page Bookmark Bar directly onto the **Deck Home Tab (Cockpit)** positioned between the **Universal Omnibar Search** (`#omnibar-slot`) and the **Launch Deck** (`.launch-deck-section`).

The bar faithfully presents the user's curated icons and semantic zones with sleek vertical hairline separators in Deck’s signature **Obsidian / Industrial Carbon** theme, complete with folder flyouts and live Chrome extension bookmark synchronization.

---

## 2. Architecture & Component Boundaries

```
+-----------------------------------------------------------------------------------+
|                        Deck Home Tab (command-center.js)                          |
|                                                                                   |
|  [ 1. Dhaka Clock & Hardware Telemetry Cockpit ]                                  |
|                                                                                   |
|  [ 2. Universal Omnibar Search Slot (#omnibar-slot) ]                             |
|                                                                                   |
|  +=============================================================================+  |
|  |   NEW: Bookmark Toolbar Slot (#bookmark-toolbar-slot)                       |  |
|  |   Component: deck/js/modules/bookmark-toolbar.js                           |  |
|  |                                                                             |  |
|  |   [Folder] [Favicon] [Favicon] [Favicon] | [Favicon] [Favicon] | ...         |  |
|  +=============================================================================+  |
|                                                                                   |
|  [ 3. Launch Deck & Quick Folders Jump List (.launch-deck-section) ]               |
|                                                                                   |
|  [ 4. Hot Projects Shelf & Scratchpad Grid ]                                      |
+-----------------------------------------------------------------------------------+
```

### Component Roles
1. **`deck/js/modules/bookmark-toolbar.js`**:
   - `initBookmarkToolbar(containerEl)`: Main entry point.
   - `loadToolbarData()`: Hybrid data adapter querying `chrome.bookmarks.getTree()` with automatic fallback to `store.state.toolbarZones`.
   - `renderToolbar(items, containerEl)`: Generates the DOM with item wells, dividers, folder popovers, and tooltips.
   - `attachListeners()`: Handles folder popover toggling, outside-click dismissal, and Chrome bookmark event listeners (`chrome.bookmarks.onCreated`, `onRemoved`, `onChanged`).
2. **`deck/js/modules/command-center.js`**:
   - Injects the `<section class="bookmark-toolbar-section" id="bookmark-toolbar-slot"></section>` between `#omnibar-slot` and `.launch-deck-section`.
   - Calls `initBookmarkToolbar(...)` during cockpit bootstrap.
3. **`deck/css/components.css`**:
   - Styles the `.bookmark-toolbar-card`, `.toolbar-item-btn`, `.toolbar-separator`, and `.toolbar-folder-popover`.

---

## 3. Data Flow

```
                  +--------------------------------+
                  |  chrome.bookmarks.getTree()?   |
                  +---------------+----------------+
                                  |
                 +----------------+----------------+
                 | YES                             | NO (or error)
                 v                                 v
   +---------------------------+     +---------------------------+
   | Find "Bookmarks bar" node |     | Read store.state.         |
   | (id: '1' or title match)  |     | toolbarZones (9 zones,    |
   +-------------+-------------+     | 35 curated bookmarks)     |
                 |                   +-------------+-------------+
                 v                                 v
   +-------------------------------------------------------------+
   |                   Normalize to Toolbar Nodes:               |
   |  - Bookmark item: { type: 'link', url, title, icon }        |
   |  - Separator:     { type: 'separator' }                     |
   |  - Folder:        { type: 'folder', title, children: [...] }|
   +-----------------------------+-------------------------------+
                                 |
                                 v
   +-------------------------------------------------------------+
   | Render .bookmark-toolbar-card with CSS Industrial Styling:  |
   |  - Link well with 16x16 / 18x18 favicon & rich tooltip      |
   |  - Hairline 1px vertical divider for separators             |
   |  - Clickable folder pill with dark flyout popover           |
   +-------------------------------------------------------------+
```

### Separator Detection Rules
A bookmark item is classified as a separator (`type: 'separator'`) if:
1. `url` starts with `about:blank#separator`
2. `url` includes `separator.mayastudios.com`
3. `is_separator === true`
4. Title is empty or purely divider glyphs (e.g. `|`, `│`, `-`) and URL is blank/placeholder.

---

## 4. UI/UX Design System & Theme Alignment

### Container Card (`.bookmark-toolbar-card`)
- **Background**: `var(--bg-surface)` (`#111111` in Dark Carbon / `#e5e5e5` in Light Alabaster)
- **Border**: `1px solid var(--border-subtle)` (`rgba(255, 255, 255, 0.08)`)
- **Border Radius**: `var(--radius-md)` (`10px`)
- **Shadow**: `var(--shadow-recessed-sm)` (subtle recessed hardware well)
- **Padding**: `6px 12px`
- **Display**: Flex with `align-items: center`, `flex-wrap: wrap`, and `gap: 4px`

### Bookmark Icon Item (`.toolbar-item-btn`)
- **Dimensions**: `26px × 26px` touch target with `16px × 16px` or `18px × 18px` favicon image
- **Border Radius**: `var(--radius-xs)` (`4px`)
- **States**:
  - **Hover**: Background `var(--bg-card-elevated)` (`#1a1a1a`), subtle transform `translateY(-1px)`, rim border `1px solid var(--border-medium)`
  - **Active**: Transform `translateY(0)` with instant tactile feedback
- **Tooltip**: Built-in CSS `::after` or micro-flyout displaying the bookmark title, with hostname in muted font.

### Hairline Vertical Separator (`.toolbar-separator`)
- **Width**: `1px`
- **Height**: `16px`
- **Background**: `var(--border-medium)` (`rgba(255, 255, 255, 0.14)`)
- **Margin**: `0 4px`
- **Glow**: Subtle ambient highlight matching Deck's industrial hardware look.

### Folder Popover (`.toolbar-folder-popover`)
- **Trigger**: Folder pill with Lucide folder SVG icon and title (or pure folder icon if title is empty).
- **Popover**: Floating menu with `var(--bg-glass)`, backdrop blur (`blur(12px)`), hairline border, and z-index 100.
- Lists folder items with favicon + title, opening on click and dismissing on outside click or `Esc`.

---

## 5. Error Handling & Edge Cases
1. **Broken/Missing Favicons**:
   - If `item.icon` is empty or fails to load (`onerror`), automatically fall back to Google's favicon service (`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`) or a clean Lucide `globe` SVG icon.
2. **Offline Mode**:
   - When offline, cached base64 favicons from `store.state.toolbarZones` are rendered without any network requests.
3. **Empty Folder**:
   - Folder popover gracefully displays a muted text `"Empty folder"`.
4. **Extreme Window Resizing**:
   - Uses `flex-wrap: wrap` with consistent baseline alignment; never clips or forces horizontal document scrollbars.

---

## 6. Testing & Empirical Verification Strategy
1. **Terminal Syntax & Import Verification**:
   - Lint check on `bookmark-toolbar.js` and `command-center.js`.
2. **DOM Integration Check**:
   - Verify `#bookmark-toolbar-slot` is rendered with `children.length > 0` directly before `.launch-deck-section`.
3. **Separators & Zones Verification**:
   - Ensure separators correctly divide the zones without double-dividers or trailing dangling dividers.
4. **Theme Toggle Verification**:
   - Verify appearance and contrast in both `data-theme="dark"` (Obsidian) and `data-theme="light"` (Alabaster).

---

## 7. Decision Log

- **Decision 1: Hybrid Extension / Local Store Data Provider**
  - *Alternatives Evaluated*: Hardcoding static JSON vs strictly requiring Chrome extension context.
  - *Rationale*: Allows Deck to work seamlessly both when deployed as a local start page / preview server and when installed as a packed Chrome extension.
  - *Trade-offs*: Requires fallback code branch, but guarantees zero downtime or blank states.

- **Decision 2: Dedicated Component Module (`bookmark-toolbar.js`)**
  - *Alternatives Evaluated*: Inlining 200+ lines directly into `command-center.js`.
  - *Rationale*: Keeps `command-center.js` clean and maintainable.
  - *Trade-offs*: Adds one new import file.

- **Decision 3: Recessed Surface Card with Vertical Dividers**
  - *Alternatives Evaluated*: Plain borderless icons floating on canvas.
  - *Rationale*: Matches the exact visual language of the Dhaka Clock, Omnibar Box, and Launch Deck Card, establishing visual cohesion.
