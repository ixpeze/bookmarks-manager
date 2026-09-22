# Deck

> Ultra-minimalist, modular command center, browser start page, and daily workflow dashboard pre-seeded with your curated bookmarks.

---

## Dual Cinematic Themes

1. **Carbon Obsidian (Dark)**:
   - Pure neutral deep black / carbon graphite canvas (`#000000` to `#080808`), surface `#111111`, card `#121212`.
   - Inverted tactile debossed card wells with technical borders and Nothing Tech signature red accent.
2. **Sculpted Alabaster (Light)**:
   - Architectural concrete and matte silver canvas (`#cecece` to `#dcdcdc`), surface `#e5e5e5`.
   - Darker inset shadows for high tactile contrast.
3. **Instant Toggle**: Click the Sun/Moon icon in the navigation bar.

---

## Google Drive Sync & Local Hub

Zero complex cloud setup or API keys needed. Deck connects directly to your Google Drive desktop synced folder via the modern browser File System Access API:

1. Click the **Folder / Settings icon** in the top navigation bar.
2. Click **"Select Folder"** and choose your Google Drive folder (e.g. `G:\My Drive\Deck`).
3. **Auto-Sync Active**: Deck automatically saves and synchronizes `deck_sync.json` directly to your Google Drive.
4. On another computer or laptop, link the same folder and click **"Pull from Drive"** to restore your scratchpad, prompts, and settings.
5. **Manual Backups**: 1-click **Download JSON** and **Upload JSON** buttons are also available.

---

## The 4 Dedicated Tabs

### 1. Command Center
- **Dhaka Ambient Clock & Date**: Large soft-sculpted typography, seconds pulse, Dhaka timezone (UTC+6), Gregorian & Hijri calendar dates.
- **Live Weather**: Real-time temperature, condition, humidity via keyless Open-Meteo API.
- **Universal Omnibar Search**:
  - Engine switcher pills: **Google**, **Claude**, **ChatGPT**, **YouTube**, **TorrentBD**, **CGPeers**.
  - Quick prefixes: `!c <query>` for Claude, `!g` for Google, `!yt` for YouTube, `!cg` for CGPeers.
  - Instant live fuzzy search across all bookmarks with keyboard navigation (`↑`/`↓`/`Enter`/`Esc`).
  - Press `/` anywhere to focus search.
- **Pinned Daily Essentials**: Instant 1-click pills for top daily websites.
- **Curated Bento Grid**: Toolbar zones with embedded high-DPI favicons and tactile hover/press states.
- **Quick Scratchpad**: Markdown-friendly notes with automatic local debounced saving.
- **Telemetry Indicators**: Latency status for Google, Cloudflare, and local Dhaka BDIX.

### 2. Studio 3D Hub
- Multi-repository 3D asset and material search engine (Poly Haven, ambientCG, 3Dsky, CGPeers, ArtStation, Sketchfab).
- **Aspect Ratio & Resolution Calculator**: Instant calculations for 4K UHD, 2K QHD, Full HD, Ultrawide, Square, and Mobile Reel with 1-click dimension copying.
- **Archviz Unit Converter**: Convert between Meters, Centimeters, Millimeters, Feet/Inches, and Unreal Engine Units (1 uu = 1 cm).

### 3. Master Library
- Visual hierarchical directory of all master categories and 71 subfolders.
- Filter by category, live keyword search, direct launch, and 1-click URL copying.

### 4. Utilities & Life
- **DPDC Smart Prepaid Meter Estimator**: Balance and daily burn rate calculator with days remaining and recharge dates.
- **ISP Self-Care Portals**: Direct access to MiME Internet and DotInternet customer portals.
- **Civic & Education**: IAB Portal, BRAC University, Ostad, Booky.io.
- **Spiritual Reflection**: Verse of the day with English translation.

---

## Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right.
3. Click **"Load unpacked"**.
4. Select the `d:\AI\bookmarks-manager\deck` directory.
5. Whenever you open a new tab (`Ctrl+T`), Deck will launch instantly in 0ms with complete offline capability!
