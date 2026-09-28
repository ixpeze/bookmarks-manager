# Design Specification: Executive Desktop Bridge 2.0 & System Automation

**Document ID**: `2026-09-23-desktop-bridge-2.0-and-system-automation`  
**Status**: Validated & Approved  
**Author**: Antigravity & User  
**Target Milestone**: Deck v2.2 (Executive Desktop Cockpit Expansion)

---

## 1. Executive Summary & Problem Statement

Deck has established a modern, 0ms new-tab dashboard and 3-pane bookmark management experience. However, Windows power users frequently require instant clipboard recall, zero-latency desktop file manipulation, deep disk capacity awareness, and resilient background backup synchronization that does not depend on an active browser tab or manual export buttons.

This specification defines the **Executive Desktop Bridge 2.0 Suite**: a unified, zero-external-dependency upgrade to Deck's Python daemon (`bridge.py`) and Web/Extension frontend. It delivers:
1. **Windows Clipboard Ring Buffer**: Low-overhead Win32 sequence-number-driven clipboard history with persistent storage, pin support, and search within the Universal Command Palette (`Ctrl+K` -> `[Clipboard]` / `Ctrl+Shift+V`).
2. **Instant Heavy File & Storage Visualizer**: Zero-wait disk storage inspection powered by Voidtools Everything 1.5 IPC, categorizing files >500MB/1GB across 3D Assets, Videos, Archives, and Installers with 1-click Explorer reveal.
3. **Hybrid Auto-Snapshot & Backup Daemon**: A background service retaining rolling snapshots (up to 10 timestamped revisions) in a configurable local or Google Drive folder, triggered by state changes and an automated 30-minute heartbeat.
4. **Everything 1.5 Split Action Bar & File Superpowers**: Expanded Command Palette file cards with size/type metadata badges and hotkeys (`Enter` to Open, `Shift+Enter` to Reveal in Explorer via `/select,`, `Alt+C` to Copy Path).

---

## 2. Requirements & YAGNI Classification

### Must-Have (v2.2)
- **Zero-Dependency Win32 Sequence Clipboard Engine**: Background thread checking `user32.GetClipboardSequenceNumber()` every 500ms; updates last 50 text clips in `deck_clipboard.json`.
- **Command Palette Clipboard Tab**: New `[Clipboard]` filter chip, `Ctrl+Shift+V` direct hotkey, search filtering, `Alt+C` copy shortcut, and pin favorites.
- **Everything 1.5 Heavy File Inspector**: REST endpoint querying Everything 1.5 IPC for files exceeding 500MB / 1GB; Cockpit Disk C: and D: meters open the storage breakdown modal.
- **Auto-Snapshot Backup Daemon**: Heartbeat + change-triggered snapshot writer to `deck_backups/`; Settings panel UI to list and restore snapshots.
- **Split Action Bar for Files**: File search cards in Command Palette with file size badge, Explorer reveal action, and path copy.

### Should-Have (v2.3)
- Clipboard image thumbnail preview (for screenshots/bitmaps).
- Windows Toast notifications for successful backup completion.

### Explicit Non-Goals
- Full-blown disk defragmentation or partition resizing.
- Cloud OAuth API integrations (Google Drive is synced natively via local file sync folder).
- Arbitrary terminal command execution from the web UI (security isolation strictly preserved).

---

## 3. Architecture & API Contracts

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DECK FRONTEND (Web / Extension)                 │
│                                                                        │
│  [Cockpit Telemetry]   [Command Palette (Ctrl+K)]   [Settings Panel]   │
│   - Disk C/D Click      - [Clipboard] Chip (Ctrl+Shift+V) - Snapshots  │
│   - Storage Modal       - Split Action Bar (Files)  - 1-Click Restore  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP REST (localhost:8080)
┌────────────────────────────────────▼───────────────────────────────────┐
│                     DECK DESKTOP BRIDGE 2.0 (bridge.py)                │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │   ClipboardManager   │  │   StorageInspector   │  │ BackupDaemon  │ │
│  │  - Win32 Sequence #  │  │  - Everything 1.5    │  │ - 30m Timer   │ │
│  │  - 50-Item Ring Buf  │  │  - IPC size:>500MB   │  │ - Rolling 10  │ │
│  │  - deck_clipboard    │  │  - File type groups  │  │ - Restore API │ │
│  └──────────────────────┘  └──────────────────────┘  └───────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### New REST Endpoints in `bridge.py`

#### 1. Clipboard Management
- `GET /api/clipboard`: Returns current clipboard items `{ items: [...], total: count }`.
- `POST /api/clipboard/copy`: Body: `{ text: "..." }`. Writes text to OS clipboard.
- `POST /api/clipboard/pin`: Body: `{ id: "..." }`. Toggles pinned status.
- `POST /api/clipboard/clear`: Clears non-pinned clipboard history.

#### 2. Storage Inspection
- `GET /api/storage/heavy?drive=C&threshold=500MB&group=all`: Queries Everything 1.5 IPC and returns `{ drive: "C", count: n, total_bytes: b, items: [{ name, path, size, size_formatted, extension, modified }] }`.

#### 3. Backup & Snapshot Daemon
- `GET /api/backup/list`: Returns list of available snapshot files with timestamps and sizes.
- `POST /api/backup/create`: Body: `{ state: {...} }`. Writes timestamped snapshot `deck_backup_YYYYMMDD_HHMMSS.json`.
- `POST /api/backup/restore`: Body: `{ filename: "..." }`. Returns snapshot JSON content to restore store state.

#### 4. File Actions
- `POST /api/reveal`: Body: `{ path: "..." }`. Executes `explorer.exe /select,"<path>"`.

---

## 4. User Interaction & UX Specifications

1. **Command Palette (`Ctrl+K`)**:
   - Filter chips: `[All]`, `[Bookmarks]`, `[Apps]`, `[Files]`, and new `[Clipboard]`.
   - Global shortcut `Ctrl+Shift+V`: Instantly opens Command Palette with `[Clipboard]` filter preselected.
   - Clipboard Card: Displays snippet preview, character count, timestamp, `[Pin]` icon button, and `[Copy]` button.
   - File Card: Enhanced with file size pill, path, and split action buttons (`[Open]`, `[Folder]`, `[Copy Path]`).
2. **Cockpit Disk Meters (Tab 1)**:
   - Hovering over Disk C: or Disk D: displays a subtle border highlight and "Click to inspect large files".
   - Clicking opens the **Storage Heavy-Hitter Inspector** modal:
     - Header: Drive capacity, free/used gauge, total scanned items.
     - Filter tabs: `All (>500MB)`, `3D & Assets` (`.uasset`, `.fbx`, `.blend`, `.max`), `Media` (`.mp4`, `.mov`, `.mkv`), `Archives & Installers` (`.zip`, `.iso`, `.exe`, `.msi`).
     - File rows: File icon, name, path, human-readable size, and 1-click "Reveal in Explorer" button.
3. **Settings Panel**:
   - "Rolling Backups & Snapshots" card: Shows target folder (`deck_backups/`), last snapshot time, "Create Backup Now" button, and table of recent snapshots with "Restore" button.

---

## 5. Security, Resilience & Privacy

- **Data Privacy**: Clipboard buffer monitors plain-text formats only. Password manager patterns or clips >250KB are rejected to prevent memory bloat.
- **Atomic File Writes**: Snapshots are written to a temporary file before atomic renaming, preventing corrupted backups during crashes.
- **CORS & Host Binding**: Bridge remains bound strictly to `127.0.0.1` / `localhost` with explicit CORS headers.

---

## 6. Implementation Phases

- **Phase 1: Backend Bridge Core Expansion (`bridge.py`)**:
  - Implement `ClipboardManager` with `GetClipboardSequenceNumber`.
  - Implement `StorageInspector` using Everything 1.5 IPC search state for sizes and extensions.
  - Implement `BackupDaemon` with rolling snapshot rotation and atomic writes.
  - Add `/api/reveal`, `/api/clipboard/*`, `/api/storage/*`, and `/api/backup/*` endpoints.
- **Phase 2: Bridge Client Integration (`deck/js/bridge-client.js`)**:
  - Add async API wrappers for all new endpoints with graceful offline fallbacks.
- **Phase 3: Command Palette Clipboard & File Actions (`omnibar.js` & `components.css`)**:
  - Add `[Clipboard]` chip filter and `Ctrl+Shift+V` hotkey listener.
  - Render clipboard items with Pin, Copy, and search.
  - Add Split Action Bar (`Shift+Enter` reveal, `Alt+C` copy path) to File results.
- **Phase 4: Cockpit Storage Inspector Modal (`command-center.js` & `layout.css`)**:
  - Wire click handlers on Disk C: and D: meters.
  - Build Storage Inspector modal with type filters and 1-click Explorer reveal.
- **Phase 5: Rolling Backup & Restore UI (`deck.js` & `index.html`)**:
  - Add Backup & Snapshot manager card in Settings modal.
  - Wire periodic heartbeat and data-change snapshot triggers.
- **Phase 6: Empirical Verification & Validation**:
  - Verify bridge CLI self-test and endpoints via `curl` / Python requests.
  - Test hotkeys, clipboard capture, disk queries, and snapshot restoration.
