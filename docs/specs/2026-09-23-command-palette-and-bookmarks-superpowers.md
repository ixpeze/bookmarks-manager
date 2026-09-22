# Deck — Command Palette & Bookmarks Superpowers Specification

---
date: 2026-09-23
status: Approved Specification
project: Deck
author: Antigravity & User (Pair Programming)
target_milestone: Phase 2 (Home Omnibar Upgrade & Karakeep Polish)
---

## 1. Executive Summary

This specification defines the architectural design, user interaction models, data flows, and technical implementation roadmap for two interconnected pillars in **Deck**:

1. **Universal Command Palette (Home Phase 2)**: Transforming the search experience into a Raycast / Spotlight-style universal keyboard command palette (`Ctrl+K` or `/`) featuring dual presence (embedded on Home dashboard + global floating modal accessible from any tab), tabbed filter sections switchable via `Tab`, and unified query routing across bookmarks, local desktop apps, Everything 1.5 files, and system actions.
2. **Bookmarks Manager Superpowers (Karakeep Polish)**: Elevating Tab 2 (*Bookmarks*) into a production-grade personal knowledge hub with:
   - Checkbox and `Shift+Click` multi-select triggering a sleek floating bottom action dock.
   - First-class tag hierarchy with counts in the sidebar, card badges, and inspector editing.
   - Dual-engine import/export supporting Netscape HTML, JSON backup, and 1-click Chrome native bookmarks API integration.
   - On-demand background link health telemetry with a broken links filter and Wayback Machine archive fallback.

---

## 2. Decision Log & Alignment Summary

| Dimension | Selected Approach | Rationale | Alternatives Evaluated |
|---|---|---|---|
| **Palette Trigger & Presence** | **Dual Presence** (Home search bar + Global `Ctrl+K` modal) | Seamless start-page feel for mouse-driven quick search, with power-user hotkey accessibility from any tab. | Global modal only; Embedded Home bar only. |
| **Palette Result Routing** | **Tabbed Sections** (`[All]`, `[Bookmarks]`, `[Apps]`, `[Files]`, `[Actions]`) | Instant category segmentation via `Tab` key without forcing the user to memorize cryptic command prefixes. | Flat auto-grouped list; Strict prefix-only mode. |
| **Batch Multi-Select UI** | **Floating Bottom Action Bar** | Familiar, distraction-free UX (Karakeep / Raindrop) that surfaces only when 2+ items are active. | Top toolbar morph/takeover; Right inspector panel takeover. |
| **Tag UX & Hierarchy** | **Left Sidebar Tags Section + Quick Filter Pills** | Visible taxonomy in the navigation tree with item counts, paired with fast click-to-filter pills. | Horizontal pill strip only; Modal-only tag manager. |
| **Import / Export Engine** | **Dual Engine** (HTML/JSON files + 1-Click Chrome API) | Maximum cross-platform resilience: works offline on any browser via files, plus 1-click native Chrome bar sync in extension mode. | File-only import/export; Real-time 2-way continuous Chrome sync. |
| **Link Health Telemetry** | **On-Demand Batch Health Audit** | Prevents unsolicited background network spam and battery drain while giving full visibility into dead links on request. | Passive check on inspect only; Deferral to v2. |

---

## 3. Pillar 1: Universal Command Palette Architecture

```
+-----------------------------------------------------------------------------------+
|  [Deck App Shell (Any Tab)]                                                       |
|                                                                                   |
|  Hotkey: Ctrl+K or /  ───────────────────────────────────► [Command Palette Modal]|
|                                                                                   |
|  [Tabbed Chips]:  [All]  [Bookmarks]  [Desktop Apps]  [PC Files]  [Actions]       |
|  [Search Input]:  "query string..."                        (Tab to switch chips)  |
|  +-----------------------------------------------------------------------------+  |
|  | [Item 1] Unreal Engine 5.5               [Desktop App]      Enter to Launch |  |
|  | [Item 2] Blender 4.3 LTS                 [Desktop App]      Enter to Launch |  |
|  | [Item 3] Three.js Documentation          [Bookmark]         Enter to Open   |  |
|  | [Item 4] G:\3D_Assets\Materials\Wood.max [Everything File]  Enter to Reveal |  |
|  | [Item 5] Switch Theme to Light           [Action]           Enter to Run    |  |
|  +-----------------------------------------------------------------------------+  |
|  [Footer]: ↑↓ Navigate  •  Enter Select  •  Tab Category  •  Esc Dismiss         |
+-----------------------------------------------------------------------------------+
```

### 3.1 Interaction Lifecycle & Hotkeys
- **Global Triggers**:
  - `Ctrl+K` or `Cmd+K`: Toggles the floating palette overlay from any tab (Home, Bookmarks, Studio 3D, Utilities).
  - `/` (when not focused on a form input): Focuses search instantly.
  - Clicking the Home dashboard search bar opens/focuses the input seamlessly.
- **Keyboard Navigation Engine**:
  - `ArrowDown` (`↓`) / `ArrowUp` (`↑`): Cycles selection with automatic scroll anchoring.
  - `Tab` / `Shift+Tab`: Cycles through the section filter chips (`All` -> `Bookmarks` -> `Apps` -> `Files` -> `Actions`).
  - `Enter`: Executes the primary action (open link in tab, launch desktop app via bridge, reveal file in Windows Explorer, or toggle setting).
  - `Escape` (`Esc`): Closes the modal and restores focus.

### 3.2 Result Categorization & Data Sources

1. **`[Bookmarks]` Source**:
   - Queries both `BOOKMARK_DATA.library` (71 curated categories) and `store.state.customBookmarks`.
   - Indexed fields: `name`, `title`, `href`, `folder`, `tags`, and domain.
   - Fuzzy scoring with high weighting on prefix matches and domain names.
2. **`[Apps]` Source (Desktop Bridge)**:
   - Queries configured desktop applications (Blender, Unreal Engine, PureRef, VS Code, Photoshop, etc.).
   - Action: `BridgeClient.launchApp(appId)`.
3. **`[Files]` Source (Everything 1.5 Desktop Bridge)**:
   - Fast debounced query to Everything 1.5 via `BridgeClient.searchEverything(query)`.
   - Action: `BridgeClient.openFile(path)` or `BridgeClient.revealInExplorer(path)`.
4. **`[Actions]` Source**:
   - Navigation: Go to Bookmarks tab, Go to Studio 3D, Go to Utilities.
   - System: Toggle Theme (`Carbon Obsidian` / `Sculpted Alabaster`), Trigger Link Health Scan, Open Sync Settings.
   - Quick Calculator: Typing math expressions (e.g., `2500 - 150`, `1920 / 1080`) evaluates dynamically.

---

## 4. Pillar 2: Bookmarks Manager Superpowers

```
+-------------------+------------------------------------------+-----------------------+
| LEFT: TAXONOMY    | CENTER: BOOKMARK STREAM                  | RIGHT: INSPECTOR      |
|                   |                                          |                       |
| [Quick Filters]   | [Search & Sort Bar]                      | [Mini Browser Bar]    |
| • All Bookmarks   | [Cards / List Toggle]  [Select All Check]| • Reload, Star, Open  |
| • Starred         |                                          |                       |
| • Recent          | [Card 1] [x] Selected                    | [Live Website Iframe] |
| • Broken Links    | [Card 2] [x] Selected                    | Sandbox preview with  |
|                   | [Card 3] [ ] Unselected                  | clean header bypass   |
| [Tags] (Expandable|                                          |                       |
| #UE5 (24)         | +--------------------------------------+ | [Metadata & Tags]     |
| #Blender (18)     | | 2 Selected  | ⭐ Star  🏷️ Tag         | | • Editable Title    |
| #Shaders (12)     | | 📋 Copy URLs | 🌐 Open All | 🗑️ Delete | | • Category Selector |
|                   | +--------------------------------------+ | • Tag Cloud / Chips   |
| [Categories (71)] | [Floating Bottom Action Dock]            | • Notes Scratchpad    |
+-------------------+------------------------------------------+-----------------------+
```

### 4.1 Batch Multi-Select & Floating Action Dock
- **Selection Triggers**:
  - Hovering a card or row reveals a geometric selection checkbox.
  - `Shift+Click` selects contiguous ranges between the last selected item and clicked item.
  - "Select All" checkbox in the stream header toggles all currently filtered items.
- **Floating Action Dock**:
  - Appears smoothly with slide-up micro-interaction (200ms cubic bezier) whenever `selectedCount >= 1`.
  - Displays: `N items selected`.
  - Actions:
    1. **Star / Unstar All**: Batches `store.toggleStarred(url)` for all selected items.
    2. **Tag All**: Opens an inline popover to assign or remove tags across selected items.
    3. **Copy All URLs**: Joins URLs with newlines and copies to clipboard with toast confirmation.
    4. **Open All in Tabs**: Opens all selected URLs in new background tabs (`chrome.tabs.create` or `window.open`).
    5. **Delete Selected**: Prompts confirmation before removing custom bookmarks.
    6. **Clear Selection**: Dismisses selection state and hides the dock.

### 4.2 First-Class Tag Taxonomy
- **Left Sidebar Integration**:
  - Dedicated "Tags" section beneath Quick Filters with an expand/collapse toggle.
  - Lists all unique tags sorted by frequency with badge counts (e.g. `#UE5 (42)`).
  - Clicking any tag sets active filter to `tag:<tagName>` with instant stream rendering.
- **Card & Inspector Tag Interactions**:
  - Bookmark cards display up to 3 interactive tag pills; clicking a tag applies the filter.
  - Inspector pane includes a tag token field allowing quick tag addition (type + Enter) and removal.

### 4.3 Dual-Engine Import & Export Hub
- **File-Based Import/Export**:
  - **Netscape HTML**: Parses standard browser bookmark exports (folders, bookmarks, `ADD_DATE`, `ICON`), deduplicating against existing URLs.
  - **JSON Backup**: Full lossless dump including custom bookmarks, tags, notes, starred states, and DPDC configurations.
  - **Export Trigger**: One-click download of `deck_bookmarks_export.html` and `deck_backup.json`.
- **Chrome Native Bookmarks API (Extension Mode)**:
  - If `chrome.bookmarks` API is detected:
    - Provides a 1-click **"Sync from Chrome Bookmarks Bar"** button.
    - Recursively imports folders and links directly into Deck's custom library without overwriting existing metadata.

### 4.4 On-Demand Link Health Telemetry
- **Scan Trigger**: "Scan Links" button in Bookmarks toolbar.
- **Batch Auditor Engine**:
  - Asynchronous queue checking bookmarks in batches of 5 concurrent requests with a 5-second timeout.
  - Head/Get request checking HTTP status:
    - `200-399`: Healthy (Green indicator).
    - `404 / 410 / DNS Fail / Timeout`: Flagged as Broken.
- **"Broken Links" Quick Filter**:
  - Adds a dedicated counter badge in the left sidebar: `Broken Links (N)`.
  - For each dead bookmark, provides:
    - 🏛️ **Wayback Machine**: Generates 1-click archive lookup: `https://web.archive.org/web/*/${url}`.
    - ✏️ **Edit URL**: Correct broken permalinks.
    - 🗑️ **Prune**: 1-click remove.

---

## 5. State Management & Storage Schema

All new state integrates into `deck/js/core/store.js` following local-first reactive principles:

```javascript
// New Storage Keys
export const STORAGE_KEYS = {
  // Existing keys...
  CUSTOM_BOOKMARKS: 'deck_custom_bookmarks',
  STARRED_BOOKMARKS: 'deck_starred_bookmarks',
  BOOKMARKS_VIEW_MODE: 'deck_bookmarks_view_mode',
  
  // New Superpower Keys
  BOOKMARKS_TAGS: 'deck_bookmark_tags',           // Array of user-managed tags
  LINK_HEALTH_CACHE: 'deck_link_health_cache',     // Map<url, { status, checkedAt, code }>
  COMMAND_PALETTE_RECENTS: 'deck_palette_recents'  // Array of recently executed commands
};
```

### Event Bus Contract
- `palette:open` / `palette:close`: Controls modal state.
- `bookmarks:batch-select`: Broadcasts array of currently selected bookmark IDs/URLs.
- `bookmarks:tags-updated`: Emitted when tags are created, renamed, or deleted.
- `bookmarks:health-progress`: Broadcasts `{ scanned, total, brokenCount }`.
- `bookmarks:health-complete`: Emitted when link audit completes.

---

## 6. Visual Design & Accessibility Specifications

1. **Design System & Aesthetics**:
   - Adheres strictly to **Carbon Obsidian** (Dark) and **Sculpted Alabaster** (Light) design tokens.
   - Neumorphic depth, 1px border highlights, and refined shadows (`--shadow-neu-inset`, `--shadow-glass`).
   - Zero-Emoji Policy: 100% clean SVG icons (Lucide line icon style, 1.5–2px stroke).
2. **Micro-Interactions**:
   - Floating Action Dock: `translateY(0)` with spring damping on select, `translateY(120%)` on dismiss.
   - Command Palette: Modal backdrop blur (`backdrop-filter: blur(12px)`) with instant 100ms fade-in.
   - Selection checkbox: Smooth scale-in transition with SVG checkmark.
3. **Accessibility (WCAG AA)**:
   - High contrast ratios (≥4.5:1) for all search result text and tag chips.
   - Full keyboard operability: Palette and Batch actions operable without a mouse.
   - Visible focus rings (`--amber-glow`) for keyboard focus indicators.

---

## 7. Implementation Roadmap & Execution Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Command Palette & Global Keyboard Engine                           │
│ • Modal shell & backdrop in index.html                                      │
│ • Universal hotkey listeners (Ctrl+K, /, Esc, Arrows, Tab)                  │
│ • Tabbed chips filter UI & dynamic result grouping                          │
│ • BridgeClient & Everything 1.5 integration                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Bookmarks Multi-Select & Floating Action Dock                      │
│ • Checkbox and Shift-click selection engine                                 │
│ • Floating dock DOM component & slide-up CSS                                │
│ • Batch actions: Star All, Copy URLs, Open in Tabs, Delete Selected         │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Tag Taxonomy & Sidebar Navigation                                  │
│ • Dynamic tag extraction and frequency counting                             │
│ • Expandable "Tags" section in left sidebar                                 │
│ • Tag filter routing and inspector tag editor                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Dual-Engine Import & Export Hub                                    │
│ • Netscape HTML parser & JSON exporter                                      │
│ • Chrome Extension `chrome.bookmarks` API integration                       │
│ • Deduplication and status reporting modal                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: On-Demand Link Health Telemetry                                    │
│ • Asynchronous batch fetcher engine (with CORS bypass via extension/bridge) │
│ • Progress bar overlay & "Broken Links" left sidebar badge                  │
│ • Wayback Machine archive fallback buttons                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*This specification is durable and ready for implementation upon session resumption.*
