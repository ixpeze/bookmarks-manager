# Deck

> An ultra-minimalist, modular personal command center, Chrome new tab dashboard, and curated bookmarks hub.

---

## Highlights

- **Dual Cinematic Themes**: Carbon Obsidian (Dark) & Sculpted Alabaster (Light).
- **Instant 0ms Chrome New Tab**: Load `deck/` as an unpacked extension in Chrome (`Ctrl+T`).
- **Unified Single Directory**: The `deck/` directory serves both as an unpacked Chrome Extension and as a local web server with zero code duplication.
- **Micro-Kernel & Pluggable Architecture**:
  - `core/deck.js`: Central orchestrator, theme manager, and hotkey coordinator.
  - `core/registry.js`: Modular `mount/unmount` lifecycle management.
  - `core/store.js`: Reactive state store with `deck_*` persistence.
  - `core/sync.js`: Google Drive sync via File System Access API (`deck_sync.json`).
- **4 Dedicated Functional Tabs**:
  1. **Command Center**: Dhaka ambient clock, live Open-Meteo weather, universal omnibar search, pinned essentials, bento grid, scratchpad, network telemetry.
  2. **Studio 3D Hub**: 3D asset & material search, aspect ratio/resolution calculator, archviz scale unit converter.
  3. **Master Library**: Hierarchical taxonomy explorer across 71 categories.
  4. **Utilities & Life**: DPDC smart prepaid meter estimator, ISP portals, spiritual reflection.

---

## Getting Started

### 1. Chrome Extension (Recommended for 0ms New Tab)
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **"Load unpacked"** and select the `deck` directory.
4. Press `Ctrl+T` to launch **Deck** instantly.

### 2. Standalone Local Web Server
1. Double-click [`launch_dashboard.bat`](file:///d:/AI/bookmarks-manager/launch_dashboard.bat).
2. Deck opens automatically at `http://localhost:8080/`.

---

## Directory Architecture

```
deck/
├── index.html               # Clean HTML shell (Deck layout, nav, modal)
├── manifest.json            # Manifest V3 for Chrome Extension (newtab override)
├── deck.webmanifest         # PWA Manifest for Standalone Web App
├── sw.js                    # Service Worker with deck-cache-v1
├── css/
│   ├── tokens.css           # Design tokens (Carbon Obsidian & Sculpted Alabaster)
│   ├── layout.css           # Bento grid, app shell, modal
│   └── components.css       # Neumorphic cards, buttons, omnibar
└── js/
    ├── deck.js              # Micro-Kernel orchestrator
    ├── core/
    │   ├── store.js         # Reactive State Store (`deck_*` storage keys)
    │   ├── registry.js      # Pluggable Module Registry & Lifecycle
    │   ├── sync.js          # Google Drive sync (deck_sync.json)
    │   └── events.js        # Global Event Bus
    ├── data/
    │   └── bookmarks.js     # Curated bookmarks dataset
    ├── services/
    │   ├── search.js        # Fuzzy bookmark search engine
    │   ├── weather.js       # Dhaka Open-Meteo live weather client
    │   └── omnibar.js       # Search bar and engine selector
    └── modules/
        ├── command-center.js
        ├── studio-3d.js
        ├── library-explorer.js
        └── utilities.js
```
