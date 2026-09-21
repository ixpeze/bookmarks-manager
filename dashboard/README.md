# Aura — Personal Command Center & New Tab Dashboard

> A state-of-the-art **Cinematic Neumorphic Soft UI** browser start page, first tab, and daily workflow command center pre-seeded with your authentic curated bookmarks.

---

## 🌓 Dual Cinematic Themes

1. **Carbon Obsidian (Dark)**:
   - Pure neutral deep black / carbon graphite canvas (`#040405` to `#09090b`), surface `#111114`, card `#16161a`.
   - **Zero blueish or slate tint** — true neutral black backing with soft sculpted dual-shadows.
2. **Sculpted Alabaster (Light)**:
   - Soft, tactile alabaster and warm paper canvas (`#edf1f6` to `#f3f6fa`), card `#f3f6fa`, elevated `#ffffff`.
   - Pure light neumorphic dual-shadows (convex extrusion + concave inset wells).
3. **Instant Toggle**: Click the Sun/Moon icon in the top-right navigation bar anytime.

---

## ☁️ Google Drive Folder Sync & Data Hub

Zero complex cloud setup or API keys needed. Aura connects directly to your Google Drive desktop synced folder via the modern browser File System Access API:

1. Click the **Folder / Sync icon** in the top navigation bar.
2. Click **"Select Folder"** and choose your Google Drive folder (e.g. `G:\My Drive\Aura` or any synced folder).
3. **Auto-Sync Active**: Aura automatically saves and synchronizes `aura_sync.json` directly to your Google Drive!
4. On another computer or laptop, simply link the same folder and click **"Pull from Drive"** to restore your scratchpad, prompts, and settings.
5. **Manual Backups**: 1-click **Download JSON** and **Upload JSON** buttons are also available.

---

## 🌟 The 5 Dedicated Tab Views

### 1. 🧠 Tab 1: Command Center (Daily Home)
- **Cinematic Ambient Clock & Date**: Large soft-sculpted typography, seconds pulse, Dhaka timezone, Gregorian & Hijri calendar dates.
- **Live Dhaka Weather Card**: Real-time temperature, condition, humidity, and weather icon via free keyless Open-Meteo API.
- **Universal Omnibar Search**:
  - Engine switcher pills: **Google**, **Claude**, **ChatGPT**, **YouTube**, **TorrentBD**, **CGPeers**.
  - Engine quick prefixes: Type `!c <query>` for Claude, `!g` for Google, `!yt` for YouTube, `!cg` for CGPeers.
  - Instant live fuzzy search across all 500+ bookmarks with keyboard navigation (`↑`/`↓`/`Enter`/`Esc`).
  - Press `/` anywhere to immediately focus the search bar.
- **Curated Bento Grid**:
  - 9 tactile cards representing your 10 finalized toolbar zones (Web Apps, Google, AI, Social, Media, Torrents, 3D, ISP, Utilities).
  - Every card features high-contrast labels, embedded base64 favicons, and tactile hover/press states.
- **Quick Scratchpad**: Markdown-friendly notes drawer that automatically saves to `localStorage` on every keystroke.
- **Service & Network Latency Pings**: Real-time status indicators for Google, Cloudflare, and local Dhaka BDIX.

### 2. 🎮 Tab 2: Studio 3D & Archviz Hub
- Direct shortcuts for **Unreal Engine 5.5 Docs**, **AssetVault**, **ComfyUI Cloud**, **ArtStation**, **CGPeers**, **CGPersia**, and **Epic Games Dev**.
- **Aspect Ratio & Render Resolution Calculator**:
  - Instant calculations with megapixels for 4K UHD (16:9), 2K QHD, Full HD, Ultrawide (21:9), Square (1:1), and Mobile Reel (9:16).
  - 1-click "Copy W×H" for 3ds Max / V-Ray / Unreal Engine rendering.
- **Archviz Scale & Unit Converter**:
  - Convert between Meters, Centimeters, Millimeters, Feet/Inches, and Unreal Engine Units (1 uu = 1 cm).
  - 1-click "Copy uu".

### 3. ⚡ Tab 3: AI Prompt Workbench
- **Model Command Deck**: Instant launchers for **Claude 3.7**, **ChatGPT**, **Gemini 2.5**, **Google AI Studio**, **DeepSeek R1**, and **Maket AI**.
- **Prompt Snippet Vault**:
  - Curated initial templates for Architecture exteriors/interiors, Unreal Engine 5.5 C++ architecture, HLSL custom shaders, and ComfyUI Flux ControlNet passes.
  - 1-click "Copy Prompt" button with tactile copied feedback.
  - Category filters and live prompt search.
- **Custom Prompt Builder**: Save your own custom prompt templates directly to the vault.

### 4. 📁 Tab 4: Master Library Explorer
- Visual, hierarchical directory of all 7 master categories and 71 subfolders from your finalized Chrome export.
- Filter by category, live keyword search, direct launch (`↗`), and 1-click URL copying.

### 5. 📶 Tab 5: Utilities & Personal Tracker
- **DPDC Smart Prepaid Meter Estimator**:
  - Enter your current balance (৳) and daily burn rate (৳/day) to get estimated days remaining and exact recharge dates with urgency color coding.
- **ISP Self-Care Portals**: Direct access to MiME Internet and DotInternet customer portals.
- **Civic & Education**: IAB Portal, BRAC University, Ostad, Booky.io.
- **Daily Quran & Spiritual Reflection**: Verse of the day with English translation from Surah Ash-Sharh.

---

## 🚀 How to Launch

- **1-Click Launch**: Double-click [`launch_dashboard.bat`](file:///g:/AI/StandAlone/BookmarksManager/launch_dashboard.bat).
- Opens `http://localhost:8080/` in Chrome with zero lag.
