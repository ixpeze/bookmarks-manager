# Specification: Workstation Ticker & Full-Width Minimalist Drives Strip

**Document ID**: `2026-09-26-workstation-ticker-and-horizontal-drives-design`  
**Status**: Approved (Proceed Confirmed by User)  
**Author**: Antigravity & User  
**Target Milestone**: Deck v2.5 (Cockpit Layout Re-Architecture)  

---

## 1. Executive Summary

This specification re-architects Deck's Home Cockpit layout to prioritize visual harmony, vertical compactness, and clean spatial hierarchy:

1. **Full-Width Workstation Ticker** *(Position: Below Top Nav Bar, Above Clock)*:
   - Ultra-compact, single-line horizontal ticker (~34–36px height).
   - Real-time hardware telemetry: Bridge status dot, Host & CPU specs (`Intel i7-8700 12T · X%`), RAM (`15.3/64GB · 24%`), GPU (`RTX 3060 · 45°C · 6.9/12GB VRAM · X% load`), and Gateway Ping (`2ms`).
   - Micro horizontal meter tracks for instant visual scanning.

2. **Hero Clock & Compact Weather Bar** *(Position: Below Workstation Ticker)*:
   - Centered Clock as the primary hero focal point.
   - Dhaka Weather cleanly integrated alongside as a compact badge/pill.

3. **Full-Width Horizontal Disk Drives Bar** *(Position: Below Bookmarks Bar, Above Launch Deck)*:
   - Full-width horizontal strip sharing the exact visual container styling as the Bookmarks Bar (`min-height: 44px`, elevated surface, subtle border).
   - **Ultra-Minimalist Text Pills**: Evenly distributed horizontal pills displaying only Drive Letter + Storage Percentage (e.g., `C: 57%`, `D: 86%`, `E: 90%`, `F: 88%`, `G: 84%`, `H: 86%`).
   - **1-Click Explorer Access**: Clicking any drive pill launches that drive root directly in Windows Explorer (`C:\`, `D:\`, etc.) via Desktop Bridge (`/api/open-dir` or `/api/launch`).
   - **Explicit Non-Goals**: Removal of legacy heavy file inspector modal triggers, sub-action buttons, filesystem labels, and complex progress bars.

---

## 2. Component Hierarchy & DOM Structure

```text
[Top Nav Bar (Pinned/Sticky)]
   │
   ├──> 1. <section class="workstation-ticker-section">
   │       └── [Status Dot] [Host & CPU Specs] [CPU Meter] [RAM Stats & Meter] [GPU Stats & Meter] [Ping Pill]
   │
   ├──> 2. <header class="cockpit-hero-header centered-clock-header">
   │       └── [Centered Clock Card with Integrated Weather Pill]
   │
   ├──> 3. <div class="omnibar-container" id="omnibar-slot">
   │       └── [Universal Omnibar with Everything 1.5 Local Filter]
   │
   ├──> 4. <section class="bookmark-toolbar-section" id="bookmark-toolbar-slot">
   │       └── [In-Page Bookmarks Bar]
   │
   ├──> 5. <section class="drives-toolbar-section" id="drives-toolbar-slot">
   │       └── [Full-Width Horizontal Drives Strip: C: 57% | D: 86% | E: 90% | F: 88% | G: 84% | H: 86%]
   │
   └──> 6. <section class="launch-deck-section">
           └── [Launch Deck Apps Grid & Quick Folders Jump List]
```

---

## 3. Data Flow & Event Integration

1. `bridge.py` broadcasts `GET /api/system` hardware statistics every 2 seconds via `BridgeClient.fetchTelemetry()`.
2. `BridgeClient` dispatches `deck:bridge-telemetry` with CPU, RAM, GPU, Drives, and Ping payload.
3. `command-center.js`:
   - Updates the Workstation Ticker DOM elements (`#ticker-cpu-val`, `#ticker-ram-val`, `#ticker-gpu-val`, `#ticker-ping-val`, etc.).
   - Dynamically renders `#drives-toolbar-slot` with `drive-pill-btn` elements for all detected drives.
   - Attaches 1-click event listeners to open the drive path in Windows Explorer.

---

## 4. Verification Plan

1. Verify JavaScript syntax via `node --check deck/js/modules/command-center.js`.
2. Confirm live endpoint responsiveness (`http://127.0.0.1:8080/api/system`).
3. Verify Workstation Ticker displays CPU, RAM, GPU, and Ping in an ultra-compact single line.
4. Verify Clock is centered with integrated Weather pill.
5. Verify Drives strip renders below the Bookmarks bar with clean `X: Y%` pills.
6. Verify clicking a drive pill invokes `window.deckBridge.openPath(drivePath)` to open Windows Explorer.
