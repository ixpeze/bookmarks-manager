# Specification: Workstation Status, Universal Search Engines & Cockpit Add-ons

**Document ID**: `2026-09-26-workstation-status-search-and-cockpit-addons`  
**Status**: Approved & In Implementation  
**Author**: Antigravity & User  
**Target Milestone**: Deck v2.4 (Executive Telemetry & Daily Driver Expansion)  

---

## 1. Executive Summary

This specification defines the architectural enhancements to Deck's desktop integration and Home Cockpit experience across three core pillars:

1. **Search Engine Expansion & Dual-Trigger Filters**: Integrating Google, Bing, Claude, ChatGPT, Facebook, YouTube, GitHub, and Reddit with 1-click visual pills and zero-friction keyboard prefixes (`g `, `b `, `c `, `gpt `, `fb `, `yt `, `gh `, `r `).
2. **Workstation Status Hardware Cockpit**: Redesigning the "Bridge Online" pill into a multi-tier hardware HUD displaying CPU (Intel i7-8700), physical RAM sticks (64GB DDR4), NVIDIA GeForce RTX 3060 (live VRAM, load %, temperature), and all 6 mounted drives (`C: OS`, `D: Scratch`, `E: Work`, `F: Assets`, `G: Programs`, `H: Google Drive`) with split-action click targets (Windows Explorer reveal & Everything 1.5 Heavy File Inspector).
3. **Cockpit Productivity Add-ons**: A real-time Network & Gateway Latency Pill in the cockpit header, paired with a dual-tab Quick Todo & Markdown Scratchpad Bento card.

---

## 2. Architecture & Data Contracts

### 2.1 Backend Hardware Telemetry Schema (`GET /api/system`)

```json
{
  "status": "online",
  "cpu": {
    "name": "Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz",
    "cores": 6,
    "threads": 12,
    "load_pct": 14.2
  },
  "ram": {
    "load_pct": 38,
    "used_gb": 24.3,
    "total_gb": 63.9,
    "free_gb": 39.6,
    "sticks_summary": "2x 32GB (64GB DDR4 @ 2666MHz)"
  },
  "gpu": {
    "name": "NVIDIA GeForce RTX 3060",
    "vram_total_mb": 12288,
    "vram_used_mb": 9070,
    "vram_free_mb": 3218,
    "vram_used_pct": 73.8,
    "load_pct": 64,
    "temp_c": 51
  },
  "drives": [
    { "drive": "C:", "label": "OS", "filesystem": "NTFS", "total_gb": 930.5, "free_gb": 399.0, "used_gb": 531.5, "used_pct": 57.1 },
    { "drive": "D:", "label": "Scratch", "filesystem": "NTFS", "total_gb": 3726.0, "free_gb": 531.8, "used_gb": 3194.2, "used_pct": 85.7 },
    { "drive": "E:", "label": "Work", "filesystem": "NTFS", "total_gb": 931.5, "free_gb": 96.3, "used_gb": 835.2, "used_pct": 89.7 },
    { "drive": "F:", "label": "Assets", "filesystem": "NTFS", "total_gb": 5589.0, "free_gb": 646.5, "used_gb": 4942.5, "used_pct": 88.4 },
    { "drive": "G:", "label": "Programs", "filesystem": "NTFS", "total_gb": 476.9, "free_gb": 77.0, "used_gb": 399.9, "used_pct": 83.9 },
    { "drive": "H:", "label": "Google Drive", "filesystem": "FAT32", "total_gb": 3726.0, "free_gb": 505.2, "used_gb": 3220.8, "used_pct": 86.4 }
  ],
  "ping_ms": 18
}
```

### 2.2 Search Engine Registry & Prefix Map

| Key | Name | Prefix | Aliases | Mode / Target URL |
|---|---|---|---|---|
| `everything` | ⚡ Everything | `e` | `ev`, `local`, `pc`, `\`, `>` | Local PC Search (Everything 1.5 IPC named pipe / GUI fallback) |
| `google` | Google | `g` | - | `https://www.google.com/search?q=` |
| `bing` | Bing | `b` | - | `https://www.bing.com/search?q=` |
| `claude` | Claude | `c` | - | `https://claude.ai/new?q=` |
| `chatgpt` | ChatGPT | `gpt` | - | `https://chatgpt.com/?q=` |
| `facebook` | Facebook | `fb` | - | `https://www.facebook.com/search/top?q=` |
| `youtube` | YouTube | `yt` | - | `https://www.youtube.com/results?search_query=` |
| `github` | GitHub | `gh` | - | `https://github.com/search?q=` |
| `reddit` | Reddit | `r` | - | `https://www.reddit.com/search/?q=` |
| `cgpeers` | CGPeers | `cgp` | - | `https://cgpeers.to/torrents.php?searchstr=` |
| `torrentbd` | TorrentBD | `tbd` | - | `https://www.torrentbd.net/torrents-search.php?search=` |

---

## 3. UI/UX Interaction Models

1. **Search Bar & Local Everything Filter**:
   - Visual scrollable pill cluster inside the Omnibar with dedicated electric cyan `⚡ Everything` pill.
   - Dual-mode architecture: switches between Web Search (Google, Claude, ChatGPT, etc.) and Local Desktop Search (Everything 1.5 IPC).
   - Typing prefix + space (e.g. `e `, `ev `, `c `, `gpt `, `\`, `>`) immediately activates that engine's pill and renders dynamic placeholder.
   - When `Everything` is active:
     - Directly queries Everything 1.5 IPC for up to 14 file/folder matches with sub-millisecond response.
     - Displays file action buttons (Open file, Reveal containing folder in Explorer, Pin to Hot Projects Shelf, Copy full path).
     - Enter key opens the top matching file result directly, or opens the Everything desktop GUI (`Everything.exe -s <query>`).
     - Never triggers external web queries when local file search mode is engaged.
2. **Workstation Status Card**:
   - Replaces the legacy compact telemetry bar with an executive 2-tier HUD.
   - Tier 1: Chip metrics for CPU, RAM, and GPU (NVIDIA RTX 3060).
   - Tier 2: 6 interactive drive cards.
     - Clicking Drive Icon/Letter: Invokes `/api/open-dir` to open Windows Explorer.
     - Clicking the Storage Gauge: Opens Everything 1.5 Heavy File Inspector modal for that drive.
3. **Network Latency Pill**:
   - Sits in Cockpit Header. Colors: Emerald (<30ms), Amber (30-90ms), Rose (>90ms).
4. **Quick Scratchpad & Todo Bento**:
   - Mounted in Home Cockpit.
   - Tab 1: Todos with checkboxes, strike-through, inline delete, and Enter to add.
   - Tab 2: Markdown scratchpad with word count and auto-saving.

---

## 4. Verification Plan

1. Run `python deck/bridge.py --test` to confirm all 6 test suites pass with the expanded hardware telemetry.
2. Verify `/api/system` returns CPU, RAM sticks, GPU (RTX 3060), and all 6 drives with volume names.
3. Validate Omnibar prefix triggers (`c `, `gpt `, `b `, `fb `) and visual pills.
4. Verify clicking drive icons opens Windows Explorer and clicking storage bars opens the Everything 1.5 modal.
5. Validate Todo and Scratchpad persistence across page reloads.
