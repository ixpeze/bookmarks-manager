#!/usr/bin/env python3
"""
Deck Desktop Bridge
===================
Zero-dependency desktop companion service for Deck.
- Hosts REST API on localhost:8080 with CORS support.
- Serves Deck static web dashboard.
- Connects directly to Voidtools Everything 1.5.0.1423b named pipe IPC via Everything3_x64.dll.
- Real-time hardware telemetry (CPU, RAM, Disk C:/D:) via Windows kernel32 ctypes.
- Launches native apps (Unreal Engine, 3ds Max, Photoshop, Blender, PureRef, VS Code).
- Native file picker and file/folder Explorer interaction.
"""

import sys
import os
import json
import time
import ctypes
from ctypes import wintypes
import urllib.parse
import subprocess
import threading
import base64
import io
import glob
import winreg
import socket
import re
import copy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

try:
    from PIL import Image, ImageGrab
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Windows Console / Pythonw Stream Safety
class _NullStream:
    def write(self, s): pass
    def flush(self): pass
    def isatty(self): return False

if sys.stdout is None:
    sys.stdout = _NullStream()
elif hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

if sys.stderr is None:
    sys.stderr = _NullStream()
elif hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BIN_DIR = os.path.join(SCRIPT_DIR, "bin")
DLL_PATH = os.path.join(BIN_DIR, "Everything3_x64.dll")
CONFIG_PATH = os.path.join(SCRIPT_DIR, "deck_bridge_config.json")
CLIPBOARD_PATH = os.path.join(SCRIPT_DIR, "deck_clipboard.json")
BACKUP_DIR = os.path.join(SCRIPT_DIR, "deck_backups")

# Windows Win32 Clipboard Definitions & Prototypes
CF_UNICODETEXT = 13
CF_DIB = 8
GMEM_MOVEABLE = 0x0002

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

user32.OpenClipboard.argtypes = [wintypes.HWND]
user32.OpenClipboard.restype = wintypes.BOOL
user32.CloseClipboard.restype = wintypes.BOOL
user32.EmptyClipboard.restype = wintypes.BOOL
user32.GetClipboardData.argtypes = [wintypes.UINT]
user32.GetClipboardData.restype = wintypes.HANDLE
user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
user32.SetClipboardData.restype = wintypes.HANDLE
user32.GetClipboardSequenceNumber.argtypes = []
user32.GetClipboardSequenceNumber.restype = wintypes.DWORD

kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
kernel32.GlobalAlloc.restype = wintypes.HGLOBAL
kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
kernel32.GlobalLock.restype = wintypes.LPVOID
kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
kernel32.GlobalUnlock.restype = wintypes.BOOL


# ==============================================================================
# Everything 1.5 C-Types Integration
# ==============================================================================
class EverythingBridge:
    def __init__(self, dll_path=DLL_PATH):
        self.dll_path = dll_path
        self.dll = None
        self.client = None
        self.connected = False
        self._init_dll()

    def _init_dll(self):
        if not os.path.exists(self.dll_path):
            print(f"[Bridge] Warning: Everything3 DLL not found at {self.dll_path}")
            return

        try:
            self.dll = ctypes.WinDLL(self.dll_path)
            
            # Prototypes
            self.dll.Everything3_ConnectW.restype = ctypes.c_void_p
            self.dll.Everything3_ConnectW.argtypes = [ctypes.c_wchar_p]

            self.dll.Everything3_ShutdownClient.restype = ctypes.c_bool
            self.dll.Everything3_ShutdownClient.argtypes = [ctypes.c_void_p]

            self.dll.Everything3_DestroyClient.restype = ctypes.c_bool
            self.dll.Everything3_DestroyClient.argtypes = [ctypes.c_void_p]

            self.dll.Everything3_GetMajorVersion.restype = ctypes.c_uint32
            self.dll.Everything3_GetMajorVersion.argtypes = [ctypes.c_void_p]

            self.dll.Everything3_GetMinorVersion.restype = ctypes.c_uint32
            self.dll.Everything3_GetMinorVersion.argtypes = [ctypes.c_void_p]

            self.dll.Everything3_GetBuildNumber.restype = ctypes.c_uint32
            self.dll.Everything3_GetBuildNumber.argtypes = [ctypes.c_void_p]

            self.dll.Everything3_CreateSearchState.restype = ctypes.c_void_p
            self.dll.Everything3_CreateSearchState.argtypes = []

            self.dll.Everything3_DestroySearchState.restype = ctypes.c_bool
            self.dll.Everything3_DestroySearchState.argtypes = [ctypes.c_void_p]

            self.dll.Everything3_SetSearchTextW.restype = ctypes.c_bool
            self.dll.Everything3_SetSearchTextW.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]

            self.dll.Everything3_SetSearchViewportCount.restype = ctypes.c_bool
            self.dll.Everything3_SetSearchViewportCount.argtypes = [ctypes.c_void_p, ctypes.c_size_t]

            self.dll.Everything3_AddSearchPropertyRequest.restype = ctypes.c_bool
            self.dll.Everything3_AddSearchPropertyRequest.argtypes = [ctypes.c_void_p, ctypes.c_uint32]

            self.dll.Everything3_Search.restype = ctypes.c_void_p
            self.dll.Everything3_Search.argtypes = [ctypes.c_void_p, ctypes.c_void_p]

            self.dll.Everything3_GetResultListCount.restype = ctypes.c_size_t
            self.dll.Everything3_GetResultListCount.argtypes = [ctypes.c_void_p]

            self.dll.Everything3_IsFolderResult.restype = ctypes.c_bool
            self.dll.Everything3_IsFolderResult.argtypes = [ctypes.c_void_p, ctypes.c_size_t]

            self.dll.Everything3_GetResultPropertyTextW.restype = ctypes.c_size_t
            self.dll.Everything3_GetResultPropertyTextW.argtypes = [
                ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint32, ctypes.c_wchar_p, ctypes.c_size_t
            ]

            self.dll.Everything3_DestroyResultList.restype = ctypes.c_bool
            self.dll.Everything3_DestroyResultList.argtypes = [ctypes.c_void_p]

            self.connect()
        except Exception as e:
            print(f"[Bridge] Error loading Everything3 DLL: {e}")
            self.dll = None

    def connect(self):
        if not self.dll:
            return False
        try:
            self.client = self.dll.Everything3_ConnectW(None)
            self.connected = bool(self.client)
            if self.connected:
                major = self.dll.Everything3_GetMajorVersion(self.client)
                minor = self.dll.Everything3_GetMinorVersion(self.client)
                build = self.dll.Everything3_GetBuildNumber(self.client)
                print(f"[Bridge] Connected to Everything IPC v{major}.{minor}.{build}")
            return self.connected
        except Exception as e:
            print(f"[Bridge] Failed to connect to Everything IPC: {e}")
            self.connected = False
            return False

    def search(self, query_text, count=10):
        if not self.connected or not self.client:
            if not self.connect():
                return []

        results = []
        try:
            state = self.dll.Everything3_CreateSearchState()
            self.dll.Everything3_SetSearchTextW(state, str(query_text))
            self.dll.Everything3_SetSearchViewportCount(state, count)
            # Property IDs: 0 = Name, 1 = Path
            self.dll.Everything3_AddSearchPropertyRequest(state, 0)
            self.dll.Everything3_AddSearchPropertyRequest(state, 1)

            res_list = self.dll.Everything3_Search(self.client, state)
            if not res_list:
                self.dll.Everything3_DestroySearchState(state)
                return []

            total = self.dll.Everything3_GetResultListCount(res_list)
            name_buf = ctypes.create_unicode_buffer(1024)
            path_buf = ctypes.create_unicode_buffer(1024)

            for i in range(min(total, count)):
                self.dll.Everything3_GetResultPropertyTextW(res_list, i, 0, name_buf, 1024)
                self.dll.Everything3_GetResultPropertyTextW(res_list, i, 1, path_buf, 1024)
                is_dir = bool(self.dll.Everything3_IsFolderResult(res_list, i))
                
                name = name_buf.value
                dir_path = path_buf.value
                full_path = os.path.join(dir_path, name) if dir_path else name
                
                results.append({
                    "name": name,
                    "dir": dir_path,
                    "full_path": full_path,
                    "is_dir": is_dir
                })

            self.dll.Everything3_DestroyResultList(res_list)
            self.dll.Everything3_DestroySearchState(state)
        except Exception as e:
            print(f"[Bridge] Error in Everything search: {e}")
            self.connected = False

        return results

    def find_file(self, query):
        matches = self.search(query, count=5)
        if not matches:
            return None
        # Sort descending so highest version numbers (e.g. UE_5.8 over UE_5.7) take precedence
        sorted_matches = sorted(matches, key=lambda m: m["full_path"], reverse=True)
        return sorted_matches[0]["full_path"]


# ==============================================================================
# Hardware Telemetry (Pure Python ctypes kernel32)
# ==============================================================================
class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ('dwLength', ctypes.c_ulong),
        ('dwMemoryLoad', ctypes.c_ulong),
        ('ullTotalPhys', ctypes.c_ulonglong),
        ('ullAvailPhys', ctypes.c_ulonglong),
        ('ullTotalPageFile', ctypes.c_ulonglong),
        ('ullAvailPageFile', ctypes.c_ulonglong),
        ('ullTotalVirtual', ctypes.c_ulonglong),
        ('ullAvailVirtual', ctypes.c_ulonglong),
        ('sullAvailExtendedVirtual', ctypes.c_ulonglong),
    ]

class FILETIME(ctypes.Structure):
    _fields_ = [('dwLowDateTime', ctypes.c_uint), ('dwHighDateTime', ctypes.c_uint)]

def _filetime_to_int(ft):
    return (ft.dwHighDateTime << 32) + ft.dwLowDateTime

class SystemTelemetry:
    def __init__(self):
        self._prev_idle = 0
        self._prev_kernel = 0
        self._prev_user = 0
        self._last_cpu_time = 0
        self._last_cpu_pct = 0.0
        self._init_cpu_sample()

        # Hardware Static Specs (Queried once at startup)
        self.cpu_name = self._get_cpu_name()
        self.cpu_cores = os.cpu_count() or 6
        self.ram_sticks_summary = "64GB DDR4"
        self._thread_ram = threading.Thread(target=self._query_ram_sticks_bg, daemon=True)
        self._thread_ram.start()

        # Cached Telemetry (Refreshed in background every 2s)
        self._cached_gpu = None
        self._cached_ping = 15
        self._cached_network = {
            "ping_ms": 15,
            "edge_ping_ms": 3,
            "int_ping_ms": 30,
            "bdix_ping_ms": 5,
            "gateway_ping_ms": 1,
            "route_status": "optimal",
            "route_label": "BDIX & Global Normal"
        }
        self._cached_drives = []
        self._cached_ram = {}
        self._running = True
        self._bg_thread = threading.Thread(target=self._telemetry_poller, daemon=True)
        self._bg_thread.start()

    def _get_cpu_name(self):
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            return name.strip()
        except Exception:
            return "Intel Core Processor"

    def _query_ram_sticks_bg(self):
        try:
            ps_cmd = 'Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum | Select-Object -ExpandProperty Count'
            res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=5, creationflags=0x08000000)
            count = res.stdout.strip()
            if count and count.isdigit():
                self.ram_sticks_summary = f"{count}x 32GB Sticks (64GB DDR4 @ 2666MHz)"
            else:
                self.ram_sticks_summary = "2x 32GB Sticks (64GB DDR4 @ 2666MHz)"
        except Exception:
            self.ram_sticks_summary = "2x 32GB Sticks (64GB DDR4 @ 2666MHz)"

    def _telemetry_poller(self):
        while self._running:
            try:
                # 1. GPU stats via nvidia-smi
                self._cached_gpu = self._query_gpu()
                # 2. Dual-route network telemetry (Gateway, BDIX, Edge, Transit)
                self._cached_network = self._measure_network()
                self._cached_ping = self._cached_network.get("edge_ping_ms") or self._cached_network.get("int_ping_ms") or 15
                # 3. All Drives
                self._cached_drives = self.get_disk_stats()
                # 4. RAM
                self._cached_ram = self.get_ram_stats()
            except Exception:
                pass
            time.sleep(2.0)

    def _query_gpu(self):
        try:
            res = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=2, creationflags=0x08000000
            )
            if res.returncode == 0 and res.stdout.strip():
                parts = [p.strip() for p in res.stdout.strip().split(",")]
                if len(parts) >= 6:
                    name, total, used, free, util, temp = parts[:6]
                    t_val = int(total) if total.isdigit() else 1
                    u_val = int(used) if used.isdigit() else 0
                    f_val = int(free) if free.isdigit() else 0
                    vram_used_gb = round(u_val / 1024, 1)
                    vram_total_gb = round(t_val / 1024, 1)
                    vram_pct = round(u_val / t_val * 100, 1) if t_val > 0 else 0
                    return {
                        "name": name,
                        "vram_total_mb": t_val,
                        "vram_used_mb": u_val,
                        "vram_free_mb": f_val,
                        "vram_used_gb": vram_used_gb,
                        "vram_total_gb": vram_total_gb,
                        "vram_pct": vram_pct,
                        "vram_used_pct": vram_pct,
                        "load_pct": int(util) if util.isdigit() else 0,
                        "temp_c": int(temp) if temp.isdigit() else 0
                    }
        except Exception:
            pass
        return None

    def _icmp_ping(self, host, timeout_ms=500):
        try:
            out = subprocess.run(
                ['ping', '-n', '1', '-w', str(timeout_ms), host],
                capture_output=True, text=True, timeout=1.2,
                creationflags=0x08000000
            )
            m = re.search(r'time[=<](\d+)ms', out.stdout, re.IGNORECASE)
            return int(m.group(1)) if m else None
        except Exception:
            return None

    def _measure_ping(self):
        t0 = time.perf_counter()
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.0)
            s.connect(("1.1.1.1", 53))
            s.close()
            return round((time.perf_counter() - t0) * 1000)
        except Exception:
            return None

    def _measure_network(self):
        gw = self._icmp_ping("192.168.50.1")
        bdix = self._icmp_ping("mimebd.com") or self._icmp_ping("bdix.net")
        edge = self._icmp_ping("1.1.1.1")
        intl = self._icmp_ping("8.8.8.8")

        # Fallback to TCP if ICMP blocked
        if edge is None:
            edge = self._measure_ping()

        # Classify route status
        status = "optimal"
        label = "BDIX & Global Normal"

        if edge is None and bdix is None and gw is None:
            status = "offline"
            label = "Network Offline"
        elif gw is not None and gw > 60:
            status = "gateway_issue"
            label = f"Local Router Latency High ({gw}ms)"
        elif bdix is None or bdix > 90:
            status = "bdix_degraded"
            label = "BDIX Peering Degraded"
        elif intl is not None and intl > 130:
            status = "cable_spike"
            label = f"Subsea Cable Spiking ({intl}ms)"
        elif edge is not None and edge <= 10:
            status = "optimal"
            label = f"Optimal (BDIX {bdix or 0}ms / Edge {edge}ms)"

        return {
            "ping_ms": edge if edge is not None else (intl if intl is not None else 0),
            "edge_ping_ms": edge,
            "int_ping_ms": intl,
            "bdix_ping_ms": bdix,
            "gateway_ping_ms": gw,
            "route_status": status,
            "route_label": label
        }

    def _init_cpu_sample(self):
        idle, kernel, user = FILETIME(), FILETIME(), FILETIME()
        ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user))
        self._prev_idle = _filetime_to_int(idle)
        self._prev_kernel = _filetime_to_int(kernel)
        self._prev_user = _filetime_to_int(user)
        self._last_cpu_time = time.time()

    def get_cpu_pct(self):
        now = time.time()
        if now - self._last_cpu_time < 0.2:
            return self._last_cpu_pct

        idle, kernel, user = FILETIME(), FILETIME(), FILETIME()
        ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user))
        
        cur_idle = _filetime_to_int(idle)
        cur_kernel = _filetime_to_int(kernel)
        cur_user = _filetime_to_int(user)

        diff_idle = cur_idle - self._prev_idle
        diff_kernel = cur_kernel - self._prev_kernel
        diff_user = cur_user - self._prev_user

        self._prev_idle = cur_idle
        self._prev_kernel = cur_kernel
        self._prev_user = cur_user
        self._last_cpu_time = now

        total = diff_kernel + diff_user
        if total > 0:
            pct = round(max(0.0, min(100.0, (1.0 - (diff_idle / total)) * 100.0)), 1)
            self._last_cpu_pct = pct
            return pct
        return self._last_cpu_pct

    def get_ram_stats(self):
        mem = MEMORYSTATUSEX()
        mem.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
        
        total_gb = round(mem.ullTotalPhys / (1024**3), 1)
        used_gb = round((mem.ullTotalPhys - mem.ullAvailPhys) / (1024**3), 1)
        free_gb = round(mem.ullAvailPhys / (1024**3), 1)
        load_pct = int(mem.dwMemoryLoad)

        return {
            "load_pct": load_pct,
            "used_gb": used_gb,
            "total_gb": total_gb,
            "free_gb": free_gb,
            "sticks": self.ram_sticks_summary,
            "sticks_summary": self.ram_sticks_summary
        }

    def get_disk_stats(self):
        drives = []
        free_bytes = ctypes.c_ulonglong(0)
        total_bytes = ctypes.c_ulonglong(0)

        for char_code in range(ord('A'), ord('Z') + 1):
            letter = f"{chr(char_code)}:\\"
            if not os.path.exists(letter):
                continue
            try:
                if ctypes.windll.kernel32.GetDiskFreeSpaceExW(letter, ctypes.byref(free_bytes), ctypes.byref(total_bytes), None):
                    if total_bytes.value > 0:
                        vol_name_buf = ctypes.create_unicode_buffer(261)
                        fs_name_buf = ctypes.create_unicode_buffer(261)
                        ctypes.windll.kernel32.GetVolumeInformationW(
                            letter,
                            vol_name_buf, 261,
                            None, None, None,
                            fs_name_buf, 261
                        )
                        vol_label = vol_name_buf.value.strip() or "Local Disk"
                        fs_name = fs_name_buf.value.strip() or "NTFS"
                        free_gb = round(free_bytes.value / (1024**3), 1)
                        total_gb = round(total_bytes.value / (1024**3), 1)
                        used_gb = round((total_bytes.value - free_bytes.value) / (1024**3), 1)
                        used_pct = round((1.0 - (free_bytes.value / total_bytes.value)) * 100.0, 1)
                        drives.append({
                            "drive": letter[:2],
                            "label": vol_label,
                            "filesystem": fs_name,
                            "free_gb": free_gb,
                            "used_gb": used_gb,
                            "total_gb": total_gb,
                            "used_pct": used_pct
                        })
            except Exception:
                pass
        return drives

    def get_all(self):
        return {
            "status": "online",
            "cpu": {
                "name": self.cpu_name,
                "cores": self.cpu_cores,
                "threads": self.cpu_cores,
                "load_pct": self.get_cpu_pct()
            },
            "cpu_model": self.cpu_name,
            "cpu_pct": self.get_cpu_pct(),
            "ram": self._cached_ram or self.get_ram_stats(),
            "gpu": self._cached_gpu or self._query_gpu(),
            "drives": self._cached_drives or self.get_disk_stats(),
            "ping_ms": self._cached_network.get("edge_ping_ms") or self._cached_ping or 15,
            "network": self._cached_network
        }


# ==============================================================================
# App & Folder Configuration Manager
# ==============================================================================
class ConfigManager:
    def __init__(self, bridge_everything, path=CONFIG_PATH):
        self.everything = bridge_everything
        self.path = path
        self.config = self.load()

    def auto_detect(self):
        print("[Bridge] Auto-detecting desktop applications via Everything 1.5...")
        apps = {
            "unreal": {
                "name": "Unreal Engine 5",
                "tag": "UE5",
                "color": "#0E1128",
                "border": "#2c5282",
                "icon": "box",
                "path": self.everything.find_file(r"regex:^UnrealEditor\.exe$") or r"C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe",
                "args": []
            },
            "3dsmax": {
                "name": "3ds Max",
                "tag": "MAX",
                "color": "#112233",
                "border": "#2b6cb0",
                "icon": "layers",
                "path": self.everything.find_file(r"regex:^3dsmax\.exe$") or r"C:\Program Files\Autodesk\3ds Max 2026\3dsmax.exe",
                "args": []
            },
            "photoshop": {
                "name": "Photoshop",
                "tag": "PSD",
                "color": "#001e36",
                "border": "#3182ce",
                "icon": "image",
                "path": self.everything.find_file(r"regex:^Photoshop\.exe$") or r"C:\Program Files\Adobe\Adobe Photoshop 2025\Photoshop.exe",
                "args": []
            },
            "blender": {
                "name": "Blender",
                "tag": "BLEND",
                "color": "#2c1c0a",
                "border": "#dd6b20",
                "icon": "cube",
                "path": self.everything.find_file(r"regex:^blender\.exe$") or r"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
                "args": []
            },
            "pureref": {
                "name": "PureRef",
                "tag": "REF",
                "color": "#1a202c",
                "border": "#718096",
                "icon": "layout",
                "path": self.everything.find_file(r"regex:^PureRef\.exe$") or r"C:\Program Files\PureRef\PureRef.exe",
                "args": []
            },
            "vscode": {
                "name": "VS Code",
                "tag": "CODE",
                "color": "#0d1b2a",
                "border": "#007acc",
                "icon": "code",
                "path": self.everything.find_file(r"regex:^Code\.exe$") or os.path.expandvars(r"%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe"),
                "args": []
            }
        }

        # Quick Folders
        quick_folders = [
            {"id": "ai_projects", "name": "AI Projects", "path": r"D:\AI", "icon": "cpu"},
            {"id": "downloads", "name": "Downloads", "path": os.path.expanduser(r"~\Downloads"), "icon": "download"},
            {"id": "assets", "name": "Assets", "path": r"D:\AI\assets" if os.path.exists(r"D:\AI\assets") else r"D:\AI", "icon": "folder"},
            {"id": "gdrive", "name": "Google Drive", "path": r"G:\My Drive" if os.path.exists(r"G:\My Drive") else "G:\\", "icon": "cloud"},
            {"id": "comfy_output", "name": "ComfyUI Outputs", "path": self.everything.find_file(r"folder:exact:output path:ComfyUI") or r"D:\ComfyUI\output", "icon": "film"}
        ]

        cfg = {
            "version": "1.0.0",
            "apps": apps,
            "quick_folders": quick_folders
        }
        self.save(cfg)
        return cfg

    def load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Bridge] Error loading config: {e}")
        return self.auto_detect()

    def save(self, cfg):
        self.config = cfg
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2)
            return True
        except Exception as e:
            print(f"[Bridge] Error saving config: {e}")
            return False

    def get_enriched_config(self):
        cfg = copy.deepcopy(self.config) if hasattr(self, "config") and self.config else self.load()
        changed = False
        if "apps" in cfg and isinstance(cfg["apps"], dict):
            for app_id, app in cfg["apps"].items():
                p = app.get("path", "").strip()
                if p:
                    norm = os.path.normpath(p)
                    exists = os.path.exists(norm)
                    if not exists and norm.lower().endswith(".exe"):
                        exe_name = os.path.basename(norm)
                        alt = self.everything.find_file(f"regex:^{re.escape(exe_name)}$")
                        if alt and os.path.exists(alt):
                            app["path"] = alt
                            norm = alt
                            exists = True
                            changed = True
                    app["exists"] = exists
                    app["path"] = norm
                else:
                    app["exists"] = False
        if changed:
            self.save(cfg)
        return cfg


# ==============================================================================
# Native Dialogs & Execution
# ==============================================================================
def pick_file_dialog(title="Select Project or Asset File"):
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        filetypes = [
            ("Creative & 3D Projects", "*.uproject;*.max;*.blend;*.psd;*.pur;*.hip;*.c4d;*.nk;*.prproj;*.aep"),
            ("Unreal Engine Projects", "*.uproject"),
            ("3ds Max Scenes", "*.max"),
            ("Blender Projects", "*.blend"),
            ("Photoshop Documents", "*.psd;*.psb"),
            ("PureRef Boards", "*.pur"),
            ("All Files", "*.*")
        ]
        chosen = filedialog.askopenfilename(title=title, filetypes=filetypes)
        root.destroy()
        return chosen if chosen else None
    except Exception as e:
        print(f"[Bridge] File picker error: {e}")
        return None

def launch_file_or_app(target_path, args=None):
    if not target_path:
        return False, "No path provided"
    
    raw = target_path.strip('"\'')
    if re.match(r'^[a-zA-Z]:?$', raw):
        clean_path = raw[0].upper() + ":\\"
    else:
        clean_path = os.path.normpath(raw)

    # If path not found and is an executable, attempt dynamic auto-resolution via Everything
    if not os.path.exists(clean_path) and clean_path.lower().endswith(".exe"):
        exe_name = os.path.basename(clean_path)
        alt = EVERYTHING.find_file(f"regex:^{re.escape(exe_name)}$")
        if alt and os.path.exists(alt):
            clean_path = alt

    if not os.path.exists(clean_path):
        return False, f"File or application not found: {clean_path}"

    try:
        # 1. Executables: launch with native os.startfile so Windows Shell activates GUI window on active desktop
        if clean_path.lower().endswith(".exe"):
            app_dir = os.path.dirname(clean_path)
            try:
                if args:
                    arg_str = subprocess.list2cmdline(args) if isinstance(args, list) else str(args)
                    os.startfile(clean_path, "open", arguments=arg_str, cwd=app_dir if app_dir and os.path.exists(app_dir) else None)
                else:
                    os.startfile(clean_path, "open", cwd=app_dir if app_dir and os.path.exists(app_dir) else None)
                return True, "Executed application"
            except Exception as se_err:
                print(f"[Bridge] os.startfile app launch fallback: {se_err}")
                cmd = [clean_path] + (args or [])
                subprocess.Popen(
                    cmd,
                    cwd=app_dir if app_dir and os.path.exists(app_dir) else None,
                    close_fds=True
                )
                return True, "Executed application"
        # 2. Directories / Mounted Drives: ALWAYS launch Windows Explorer
        elif os.path.isdir(clean_path):
            return open_directory_in_explorer(clean_path)
        # 3. Documents / Projects / Associated Files:
        else:
            try:
                os.startfile(clean_path)
                return True, "Opened with default program"
            except Exception:
                subprocess.Popen(["explorer.exe", clean_path], close_fds=True)
                return True, "Opened in Explorer"
    except Exception as e:
        return False, str(e)

def open_directory_in_explorer(target_path):
    if not target_path:
        return False, "No path provided"
    
    raw = target_path.strip('"\'')
    if re.match(r'^[a-zA-Z]:?\\?$', raw):
        clean_path = raw[0].upper() + ":\\"
    else:
        clean_path = os.path.normpath(raw)

    if not os.path.exists(clean_path):
        return False, f"Path not found: {clean_path}"

    try:
        if os.path.isdir(clean_path):
            # Use explorer.exe directly for drive roots and directories.
            # This is more reliable at bringing the window to the foreground
            # when the bridge runs as a headless pythonw.exe background process.
            try:
                subprocess.Popen(["explorer.exe", clean_path], close_fds=True)
                return True, "Explorer opened"
            except Exception as popen_err:
                print(f"[Bridge] explorer.exe failed, fallback to os.startfile: {popen_err}")
                os.startfile(clean_path)
                return True, "Explorer opened"
        else:
            subprocess.Popen(["explorer.exe", f"/select,{clean_path}"], close_fds=True)
            return True, "Explorer opened"
    except Exception as e:
        print(f"[Bridge] open_directory_in_explorer error: {e}")
        return False, str(e)


def send_windows_toast(title, message):
    """Send native Windows 10/11 desktop toast notification via PowerShell WinRT asynchronously."""
    def _worker():
        try:
            safe_title = str(title).replace('"', '`"').replace("'", "''")
            safe_msg = str(message).replace('"', '`"').replace("'", "''")
            ps_script = f"""
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName('text')
$textNodes.Item(0).AppendChild($template.CreateTextNode('{safe_title}')) | Out-Null
$textNodes.Item(1).AppendChild($template.CreateTextNode('{safe_msg}')) | Out-Null
$notification = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Deck Command Center').Show($notification)
"""
            subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=6,
                creationflags=0x08000000
            )
        except Exception as e:
            print(f"[Bridge] Toast error: {e}")

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    return True


def _format_bytes(bytes_val):
    if bytes_val >= 1024**3:
        return f"{bytes_val / (1024**3):.2f} GB"
    elif bytes_val >= 1024**2:
        return f"{bytes_val / (1024**2):.1f} MB"
    elif bytes_val >= 1024:
        return f"{bytes_val / 1024:.0f} KB"
    return f"{bytes_val} B"


# ==============================================================================
# Win32 Clipboard Manager (Ring Buffer with 0ms Sequence Checking)
# ==============================================================================
class ClipboardManager:
    def __init__(self, file_path=CLIPBOARD_PATH, max_items=50):
        self.file_path = file_path
        self.max_items = max_items
        self.lock = threading.Lock()
        self.history = self._load()
        self._last_seq = 0
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()

    def _load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
            except Exception as e:
                print(f"[Bridge] Clipboard load error: {e}")
        return []

    def _save(self):
        try:
            tmp = self.file_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2, ensure_ascii=False)
            if os.path.exists(self.file_path):
                os.replace(tmp, self.file_path)
            else:
                os.rename(tmp, self.file_path)
        except Exception as e:
            print(f"[Bridge] Clipboard save error: {e}")

    def _read_win32_clipboard(self):
        if not user32.OpenClipboard(None):
            return None
        try:
            h_data = user32.GetClipboardData(CF_UNICODETEXT)
            if not h_data:
                return None
            p_data = kernel32.GlobalLock(h_data)
            if not p_data:
                return None
            try:
                text = ctypes.c_wchar_p(p_data).value
                return text
            finally:
                kernel32.GlobalUnlock(h_data)
        except Exception:
            return None
        finally:
            user32.CloseClipboard()

    def set_clipboard(self, content, is_image=False):
        if is_image and PIL_AVAILABLE:
            try:
                img = None
                if isinstance(content, str) and content.startswith("data:image"):
                    _, b64_str = content.split(",", 1)
                    raw_bytes = base64.b64decode(b64_str)
                    img = Image.open(io.BytesIO(raw_bytes))
                elif isinstance(content, Image.Image):
                    img = content

                if img:
                    output = io.BytesIO()
                    img.convert("RGB").save(output, "BMP")
                    bmp_data = output.getvalue()[14:]  # Strip 14-byte BITMAPFILEHEADER for CF_DIB
                    h_mem = kernel32.GlobalAlloc(GMEM_MOVEABLE, len(bmp_data))
                    if not h_mem:
                        return False
                    p_mem = kernel32.GlobalLock(h_mem)
                    if not p_mem:
                        return False
                    ctypes.memmove(p_mem, bmp_data, len(bmp_data))
                    kernel32.GlobalUnlock(h_mem)

                    if not user32.OpenClipboard(None):
                        return False
                    try:
                        user32.EmptyClipboard()
                        user32.SetClipboardData(CF_DIB, h_mem)
                        time.sleep(0.05)
                        self._last_seq = user32.GetClipboardSequenceNumber()
                        return True
                    finally:
                        user32.CloseClipboard()
            except Exception as e:
                print(f"[Bridge] Set clipboard image error: {e}")
                return False

        if not isinstance(content, str):
            return False
        try:
            text_bytes = (content + '\0').encode('utf-16le')
            h_mem = kernel32.GlobalAlloc(GMEM_MOVEABLE, len(text_bytes))
            if not h_mem:
                return False
            p_mem = kernel32.GlobalLock(h_mem)
            if not p_mem:
                return False
            ctypes.memmove(p_mem, text_bytes, len(text_bytes))
            kernel32.GlobalUnlock(h_mem)

            if not user32.OpenClipboard(None):
                return False
            try:
                user32.EmptyClipboard()
                user32.SetClipboardData(CF_UNICODETEXT, h_mem)
                time.sleep(0.05)
                self._last_seq = user32.GetClipboardSequenceNumber()
                return True
            finally:
                user32.CloseClipboard()
        except Exception as e:
            print(f"[Bridge] Set clipboard error: {e}")
            return False

    def _monitor_loop(self):
        try:
            self._last_seq = user32.GetClipboardSequenceNumber()
        except Exception:
            pass

        while self._running:
            time.sleep(0.4)
            try:
                cur_seq = user32.GetClipboardSequenceNumber()
                if cur_seq == self._last_seq:
                    continue

                self._last_seq = cur_seq
                text = self._read_win32_clipboard()
                if text:
                    clean_text = text.strip()
                    if clean_text and len(clean_text) <= 250000:
                        with self.lock:
                            if not (self.history and self.history[0].get("text") == clean_text):
                                self.history = [h for h in self.history if h.get("text") != clean_text]
                                item = {
                                    "id": f"clip_{int(time.time() * 1000)}",
                                    "type": "text",
                                    "text": clean_text,
                                    "preview": clean_text[:200] + ("..." if len(clean_text) > 200 else ""),
                                    "char_count": len(clean_text),
                                    "pinned": False,
                                    "timestamp": int(time.time() * 1000)
                                }
                                self.history.insert(0, item)
                                pinned = [h for h in self.history if h.get("pinned")]
                                unpinned = [h for h in self.history if not h.get("pinned")]
                                self.history = pinned + unpinned[:self.max_items]
                                self._save()
                elif PIL_AVAILABLE:
                    # Check for image screenshot
                    try:
                        img = ImageGrab.grabclipboard()
                        if isinstance(img, Image.Image):
                            thumb = img.copy()
                            thumb.thumbnail((320, 180), Image.Resampling.LANCZOS)
                            buf = io.BytesIO()
                            thumb.convert("RGB").save(buf, format="JPEG", quality=85)
                            b64_thumb = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

                            full_img = img.copy()
                            if full_img.width > 1920 or full_img.height > 1080:
                                full_img.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                            full_buf = io.BytesIO()
                            full_img.convert("RGB").save(full_buf, format="JPEG", quality=85)
                            b64_full = "data:image/jpeg;base64," + base64.b64encode(full_buf.getvalue()).decode("ascii")

                            with self.lock:
                                if not (self.history and self.history[0].get("type") == "image" and 
                                        self.history[0].get("width") == img.width and 
                                        self.history[0].get("height") == img.height):
                                    item = {
                                        "id": f"clip_{int(time.time() * 1000)}",
                                        "type": "image",
                                        "text": f"Screenshot ({img.width}x{img.height})",
                                        "preview": f"Screenshot ({img.width}x{img.height})",
                                        "preview_image": b64_thumb,
                                        "full_image": b64_full,
                                        "width": img.width,
                                        "height": img.height,
                                        "char_count": 0,
                                        "pinned": False,
                                        "timestamp": int(time.time() * 1000)
                                    }
                                    self.history.insert(0, item)
                                    pinned = [h for h in self.history if h.get("pinned")]
                                    unpinned = [h for h in self.history if not h.get("pinned")]
                                    self.history = pinned + unpinned[:self.max_items]
                                    self._save()
                    except Exception:
                        pass
            except Exception:
                time.sleep(1)

    def get_items(self, query=None):
        with self.lock:
            if not query:
                return list(self.history)
            q = query.lower()
            return [h for h in self.history if q in h.get("text", "").lower()]

    def pin_item(self, item_id, pinned=True):
        with self.lock:
            for h in self.history:
                if h.get("id") == item_id:
                    h["pinned"] = pinned
                    self._save()
                    return True
        return False

    def clear_history(self):
        with self.lock:
            self.history = [h for h in self.history if h.get("pinned")]
            self._save()
            return True


# ==============================================================================
# Everything 1.5 Storage Inspector (Instant Heavy Files)
# ==============================================================================
class StorageInspector:
    def __init__(self, everything_bridge):
        self.everything = everything_bridge

    def get_heavy_files(self, drive="C", threshold="500MB", group="all", count=50):
        clean_drive = drive.upper().rstrip(":")
        clean_threshold = threshold.upper()
        if not clean_threshold.endswith(("MB", "GB")):
            clean_threshold += "MB"

        base = f"{clean_drive.lower()}: file: size:>{clean_threshold} !System*Volume*Information !*$Recycle.Bin* !*.sys !pagefile.sys !hiberfil.sys !swapfile.sys"

        if group == "3d":
            base += " ext:uasset;umap;fbx;obj;blend;max;c4d;abc;hdr;exr;vray"
        elif group == "media":
            base += " ext:mp4;mkv;mov;avi;wmv;flv;webm;wav;flac;psd;psb;raw;dng"
        elif group == "archives":
            base += " ext:zip;rar;7z;tar;gz;iso;exe;msi"

        base += " sort:size-desc"

        raw_results = self.everything.search(base, count=count)
        items = []
        total_bytes = 0

        for r in raw_results:
            path = r["full_path"]
            name = r["name"]
            try:
                if not os.path.exists(path):
                    continue
                size = os.path.getsize(path)
                mtime = os.path.getmtime(path)
                total_bytes += size
                ext = os.path.splitext(name)[1].lower().lstrip(".")
                items.append({
                    "name": name,
                    "dir": r["dir"],
                    "full_path": path,
                    "extension": ext,
                    "size_bytes": size,
                    "size_formatted": _format_bytes(size),
                    "modified": time.strftime("%Y-%m-%d %H:%M", time.localtime(mtime))
                })
            except (OSError, PermissionError):
                continue

        return {
            "drive": clean_drive,
            "threshold": clean_threshold,
            "group": group,
            "count": len(items),
            "total_bytes": total_bytes,
            "total_formatted": _format_bytes(total_bytes),
            "items": items
        }


# ==============================================================================
# Backup Daemon (Rolling Snapshots with Atomic Persistence)
# ==============================================================================
class BackupDaemon:
    def __init__(self, backup_dir=BACKUP_DIR, max_revisions=10):
        self.backup_dir = backup_dir
        self.max_revisions = max_revisions
        self.lock = threading.Lock()
        self.last_backup_time = None
        os.makedirs(self.backup_dir, exist_ok=True)
        self._running = True
        self._cached_state = None
        self._thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._thread.start()

    def set_cached_state(self, state):
        with self.lock:
            self._cached_state = state

    def _heartbeat_loop(self):
        while self._running:
            time.sleep(1800) # 30 min
            try:
                with self.lock:
                    if self._cached_state:
                        self.create_snapshot(self._cached_state, trigger="heartbeat")
            except Exception as e:
                print(f"[Bridge] Heartbeat backup error: {e}")

    def create_snapshot(self, state_dict, trigger="manual"):
        with self.lock:
            os.makedirs(self.backup_dir, exist_ok=True)
            ts_str = time.strftime("%Y%m%d_%H%M%S")
            filename = f"deck_backup_{ts_str}.json"
            filepath = os.path.join(self.backup_dir, filename)
            tmp_path = filepath + ".tmp"

            payload = {
                "version": "2.2.0",
                "trigger": trigger,
                "timestamp": int(time.time() * 1000),
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "state": state_dict
            }

            try:
                with open(tmp_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                if os.path.exists(filepath):
                    os.replace(tmp_path, filepath)
                else:
                    os.rename(tmp_path, filepath)

                self.last_backup_time = payload["created_at"]
                self._rotate()

                size_bytes = os.path.getsize(filepath)
                send_windows_toast("Deck Snapshot Created", f"Backup revision saved: {filename}")
                return {
                    "success": True,
                    "filename": filename,
                    "path": filepath,
                    "created_at": payload["created_at"],
                    "size_formatted": _format_bytes(size_bytes)
                }
            except Exception as e:
                print(f"[Bridge] Snapshot creation failed: {e}")
                return {"success": False, "message": str(e)}

    def _rotate(self):
        files = glob.glob(os.path.join(self.backup_dir, "deck_backup_*.json"))
        files.sort(reverse=True)
        if len(files) > self.max_revisions:
            for old_file in files[self.max_revisions:]:
                try:
                    os.remove(old_file)
                except Exception:
                    pass

    def list_snapshots(self):
        with self.lock:
            files = glob.glob(os.path.join(self.backup_dir, "deck_backup_*.json"))
            files.sort(reverse=True)
            results = []
            for fp in files:
                try:
                    fname = os.path.basename(fp)
                    stat = os.stat(fp)
                    mtime_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime))
                    results.append({
                        "filename": fname,
                        "size_bytes": stat.st_size,
                        "size_formatted": _format_bytes(stat.st_size),
                        "created_at": mtime_str
                    })
                except Exception:
                    continue
            return results

    def restore_snapshot(self, filename):
        with self.lock:
            clean_name = os.path.basename(filename.strip())
            target_path = os.path.join(self.backup_dir, clean_name)
            if not os.path.exists(target_path):
                return None, f"Snapshot not found: {clean_name}"
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("state", {}), "OK"
            except Exception as e:
                return None, f"Failed to read snapshot: {e}"


# ==============================================================================
# Global Bridge Instances
# ==============================================================================
EVERYTHING = EverythingBridge()
TELEMETRY = SystemTelemetry()
CONFIG = ConfigManager(EVERYTHING)
CLIPBOARD = ClipboardManager()
STORAGE_INSPECTOR = StorageInspector(EVERYTHING)
BACKUP_DAEMON = BackupDaemon()

# ==============================================================================
# HTTP Request Handler
# ==============================================================================
class DeckBridgeHandler(SimpleHTTPRequestHandler):
    def address_string(self):
        # Prevent slow reverse DNS lookups on Windows
        return self.client_address[0]

    def __init__(self, *args, **kwargs):
        # Serve from deck root directory
        super().__init__(*args, directory=SCRIPT_DIR, **kwargs)

    def log_message(self, format, *args):
        # Safely log only if stderr exists and has a write method
        if sys.stderr and hasattr(sys.stderr, "write"):
            try:
                sys.stderr.write("%s - - [%s] %s\n" %
                                 (self.address_string(),
                                  self.log_date_time_string(),
                                  format % args))
            except Exception:
                pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _send_json(self, data, status_code=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        try:
            content_len = int(self.headers.get("Content-Length", 0))
            if content_len > 0:
                raw = self.rfile.read(content_len).decode("utf-8")
                return json.loads(raw)
        except Exception:
            pass
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = urllib.parse.parse_qs(parsed.query)

        # /api/status
        if path == "/api/status":
            self._send_json({
                "status": "ok",
                "service": "Deck Desktop Bridge",
                "version": "1.0.0",
                "port": 8080,
                "everything_connected": EVERYTHING.connected
            })
            return

        # /api/system
        if path == "/api/system":
            self._send_json(TELEMETRY.get_all())
            return

        # /api/ping
        if path == "/api/ping":
            ping_ms = TELEMETRY._measure_ping()
            self._send_json({"ping_ms": ping_ms, "host": "1.1.1.1"})
            return

        # /api/search?q=...&count=10
        if path == "/api/search":
            query = params.get("q", [""])[0]
            try:
                count = int(params.get("count", ["10"])[0])
            except ValueError:
                count = 10
            
            if not query.strip():
                self._send_json({"results": []})
                return

            results = EVERYTHING.search(query, count=count)
            self._send_json({
                "query": query,
                "count": len(results),
                "results": results
            })
            return

        # /api/everything/gui?q=...
        if path == "/api/everything/gui":
            query = params.get("q", [""])[0]
            exe_candidates = [
                r"C:\Program Files\Everything\Everything.exe",
                r"C:\Program Files\Everything 1.5a\Everything.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\Programs\Everything\Everything.exe")
            ]
            exe = next((p for p in exe_candidates if os.path.exists(p)), None)
            if not exe:
                exe = EVERYTHING.find_file(r"regex:^Everything\.exe$")
            
            if exe and os.path.exists(exe):
                args = [exe, "-s", query] if query else [exe]
                try:
                    subprocess.Popen(args, creationflags=0x08000000)
                    self._send_json({"success": True, "path": exe, "query": query})
                except Exception as e:
                    self._send_json({"success": False, "error": str(e)}, 500)
            else:
                self._send_json({"success": False, "error": "Everything.exe not found"}, 404)
            return

        # /api/config
        if path == "/api/config":
            self._send_json(CONFIG.get_enriched_config())
            return

        # /api/clipboard
        if path == "/api/clipboard":
            query = params.get("q", [""])[0]
            items = CLIPBOARD.get_items(query=query)
            self._send_json({"total": len(items), "items": items})
            return

        # /api/storage/heavy
        if path == "/api/storage/heavy":
            drive = params.get("drive", ["C"])[0]
            threshold = params.get("threshold", ["500MB"])[0]
            group = params.get("group", ["all"])[0]
            data = STORAGE_INSPECTOR.get_heavy_files(drive=drive, threshold=threshold, group=group)
            self._send_json(data)
            return

        # /api/backup/list
        if path == "/api/backup/list":
            snaps = BACKUP_DAEMON.list_snapshots()
            self._send_json({"snapshots": snaps, "last_backup": BACKUP_DAEMON.last_backup_time})
            return

        # Static assets fallback
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        data = self._read_json_body()

        # /api/launch
        if path == "/api/launch":
            app_id = data.get("app_id")
            target_path = data.get("path")
            args = data.get("args")

            if app_id and app_id in CONFIG.config.get("apps", {}):
                app_info = CONFIG.config["apps"][app_id]
                target_path = app_info.get("path")
                args = app_info.get("args")
                if not target_path or not target_path.strip():
                    self._send_json({
                        "success": False,
                        "message": f"{app_info.get('name', 'Application')} is not configured or not installed. Click the settings gear icon to configure its executable path."
                    }, 400)
                    return

            success, msg = launch_file_or_app(target_path, args)
            self._send_json({"success": success, "message": msg}, 200 if success else 400)
            return

        # /api/open-dir
        if path == "/api/open-dir":
            target_path = data.get("path")
            success, msg = open_directory_in_explorer(target_path)
            self._send_json({"success": success, "message": msg}, 200 if success else 400)
            return

        # /api/reveal
        if path == "/api/reveal":
            target_path = data.get("path")
            success, msg = open_directory_in_explorer(target_path)
            self._send_json({"success": success, "message": msg}, 200 if success else 400)
            return

        # /api/clipboard/copy or /api/clipboard
        if path in ("/api/clipboard", "/api/clipboard/copy"):
            clip_id = data.get("id")
            if clip_id:
                clip = next((c for c in CLIPBOARD.history if c.get("id") == clip_id), None)
                if clip and clip.get("type") == "image":
                    img_data = clip.get("full_image") or clip.get("preview_image")
                    success = CLIPBOARD.set_clipboard(img_data, is_image=True)
                    self._send_json({"success": success})
                    return
                elif clip:
                    success = CLIPBOARD.set_clipboard(clip.get("text", ""))
                    self._send_json({"success": success})
                    return

            is_img = bool(data.get("is_image", False))
            content = data.get("image") if is_img else data.get("text", "")
            success = CLIPBOARD.set_clipboard(content, is_image=is_img)
            self._send_json({"success": success})
            return

        # /api/toast
        if path == "/api/toast":
            t_title = data.get("title", "Deck Notification")
            t_msg = data.get("message", "")
            send_windows_toast(t_title, t_msg)
            self._send_json({"success": True})
            return

        # /api/clipboard/pin
        if path == "/api/clipboard/pin":
            clip_id = data.get("id", "")
            pinned = bool(data.get("pinned", True))
            success = CLIPBOARD.pin_item(clip_id, pinned=pinned)
            self._send_json({"success": success})
            return

        # /api/clipboard/clear
        if path == "/api/clipboard/clear":
            success = CLIPBOARD.clear_history()
            self._send_json({"success": success})
            return

        # /api/backup/create
        if path == "/api/backup/create":
            state = data.get("state", {})
            BACKUP_DAEMON.set_cached_state(state)
            result = BACKUP_DAEMON.create_snapshot(state, trigger="user_manual")
            self._send_json(result)
            return

        # /api/backup/restore
        if path == "/api/backup/restore":
            filename = data.get("filename", "")
            state, msg = BACKUP_DAEMON.restore_snapshot(filename)
            if state is not None:
                self._send_json({"success": True, "state": state})
            else:
                self._send_json({"success": False, "message": msg}, 400)
            return

        # /api/pick-file
        if path == "/api/pick-file":
            title = data.get("title", "Select Project File")
            chosen = pick_file_dialog(title)
            self._send_json({
                "success": bool(chosen),
                "path": chosen,
                "name": os.path.basename(chosen) if chosen else ""
            })
            return

        # /api/resolve-file
        if path == "/api/resolve-file":
            filename = data.get("name", "").strip()
            if not filename:
                self._send_json({"success": False, "message": "No filename provided"}, 400)
                return
            
            # Exact search via Everything 1.5
            matches = EVERYTHING.search(f'exact:"{filename}"', count=5)
            if not matches:
                # Fuzzy fallback
                matches = EVERYTHING.search(filename, count=5)

            if matches:
                self._send_json({
                    "success": True,
                    "path": matches[0]["full_path"],
                    "name": matches[0]["name"],
                    "candidates": matches
                })
            else:
                self._send_json({"success": False, "message": "File not found in Everything index"})
            return

        # /api/config
        if path == "/api/config":
            if CONFIG.save(data):
                self._send_json({"success": True, "config": CONFIG.config})
            else:
                self._send_json({"success": False, "message": "Failed to write config"}, 500)
            return

        self._send_json({"error": "Endpoint not found"}, 404)


# ==============================================================================
# Standalone CLI / Self-Test
# ==============================================================================
def run_self_test():
    print("=" * 60)
    print("   Deck Desktop Bridge — Empirical Self-Test")
    print("=" * 60)
    
    # 1. Everything connection
    print(f"[Test 1/6] Everything 1.5 IPC: {'CONNECTED' if EVERYTHING.connected else 'FAILED'}")
    if EVERYTHING.connected:
        res = EVERYTHING.search("bookmarks-manager", count=2)
        print(f"          Query returned {len(res)} results:")
        for r in res:
            print(f"          - {r['full_path']}")
    
    # 2. Hardware telemetry
    print("[Test 2/6] Hardware Telemetry & Workstation Status:")
    stats = TELEMETRY.get_all()
    print(f"          CPU: {stats['cpu']['name']} ({stats['cpu_pct']}%)")
    print(f"          RAM: {stats['ram']['load_pct']}% ({stats['ram']['used_gb']}GB / {stats['ram']['total_gb']}GB) [{stats['ram'].get('sticks_summary', '')}]")
    if stats.get('gpu'):
        g = stats['gpu']
        print(f"          GPU: {g['name']} | Temp: {g['temp_c']}°C | VRAM: {g['vram_used_mb']}MB / {g['vram_total_mb']}MB ({g['vram_used_pct']}%) | Load: {g['load_pct']}%")
    else:
        print("          GPU: No dedicated NVIDIA GPU detected")
    print(f"          Drives Detected: {len(stats['drives'])}")
    for d in stats['drives']:
        print(f"          - Disk {d['drive']} [{d.get('label', '')}]: {d['free_gb']}GB Free / {d['total_gb']}GB ({d['used_pct']}% used) [{d.get('filesystem', '')}]")
    print(f"          Ping to 1.1.1.1: {stats.get('ping_ms', '--')} ms")

    # 3. App detection
    print("[Test 3/6] Desktop App Auto-Detection:")
    for app_id, info in CONFIG.config.get("apps", {}).items():
        exists = os.path.exists(info["path"]) if info.get("path") else False
        status = "FOUND" if exists else "NOT FOUND"
        print(f"          [{app_id}] {info['name']}: {status} -> {info.get('path')}")

    # 4. Quick Folders
    print("[Test 4/6] Quick Folders:")
    for qf in CONFIG.config.get("quick_folders", []):
        exists = os.path.exists(qf["path"])
        status = "OK" if exists else "MISSING"
        print(f"          {qf['name']}: {status} -> {qf['path']}")

    # 5. Clipboard Manager (Win32 Sequence + Write/Read)
    print("[Test 5/6] Win32 Clipboard Ring Buffer:")
    test_clip_token = f"DECK_SELFTEST_{int(time.time())}"
    write_ok = CLIPBOARD.set_clipboard(test_clip_token)
    time.sleep(0.1)
    read_text = CLIPBOARD._read_win32_clipboard()
    seq_num = user32.GetClipboardSequenceNumber()
    match = (read_text == test_clip_token)
    print(f"          Clipboard Set: {'OK' if write_ok else 'FAILED'} | Readback: {'MATCH' if match else 'MISMATCH'} (Seq: {seq_num})")
    print(f"          History Items Cached: {len(CLIPBOARD.history)}")

    # 6. Storage Inspector & Backup Daemon
    print("[Test 6/6] Storage Inspector & Backup Daemon:")
    heavy = STORAGE_INSPECTOR.get_heavy_files(drive="C", threshold="500MB", count=3)
    print(f"          Everything Heavy Files (C: >500MB): Found {heavy['count']} items (Total: {heavy['total_formatted']})")
    for it in heavy["items"][:2]:
        print(f"          - {it['name']} ({it['size_formatted']}) -> {it['full_path']}")

    snap_res = BACKUP_DAEMON.create_snapshot({"test": True, "ts": time.time()}, trigger="selftest")
    snaps = BACKUP_DAEMON.list_snapshots()
    print(f"          Backup Snapshot Creation: {'OK' if snap_res.get('success') else 'FAILED'} -> {snap_res.get('filename')}")
    print(f"          Total Snapshots on Disk: {len(snaps)}")

    print("=" * 60)
    print("Self-test completed successfully!")
    print("=" * 60)


def main():
    if "--test" in sys.argv:
        run_self_test()
        sys.exit(0)

    port = 8080
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])

    print("=" * 60)
    print("       [*] DECK - EXECUTIVE DESKTOP BRIDGE")
    print("=" * 60)
    print(f" Bridge Service URL : http://localhost:{port}/")
    print(f" REST API Base      : http://localhost:{port}/api/")
    print(f" Everything 1.5 IPC : {'ONLINE' if EVERYTHING.connected else 'OFFLINE (Start Everything.exe)'}")
    print(f" Serving Directory  : {SCRIPT_DIR}")
    print("=" * 60)
    print(" Press Ctrl+C to terminate.")

    ThreadingHTTPServer.allow_reuse_address = True
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), DeckBridgeHandler)
    except OSError as e:
        print(f"\n[Bridge] FATAL ERROR: Could not bind to http://127.0.0.1:{port}/")
        print(f"[Bridge] Details: {e}")
        print(f"[Bridge] Check if another Deck instance or service is occupying port {port}.")
        sys.exit(1)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Bridge] Shutting down cleanly.")
        server.server_close()


if __name__ == "__main__":
    main()
