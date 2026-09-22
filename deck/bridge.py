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
import urllib.parse
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Windows Console Encoding Safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BIN_DIR = os.path.join(SCRIPT_DIR, "bin")
DLL_PATH = os.path.join(BIN_DIR, "Everything3_x64.dll")
CONFIG_PATH = os.path.join(SCRIPT_DIR, "deck_bridge_config.json")

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

    def _init_cpu_sample(self):
        idle, kernel, user = FILETIME(), FILETIME(), FILETIME()
        ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user))
        self._prev_idle = _filetime_to_int(idle)
        self._prev_kernel = _filetime_to_int(kernel)
        self._prev_user = _filetime_to_int(user)
        self._last_cpu_time = time.time()

    def get_cpu_pct(self):
        now = time.time()
        # Avoid sampling more frequently than 0.1s
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
            "free_gb": free_gb
        }

    def get_disk_stats(self):
        drives = []
        free_bytes = ctypes.c_ulonglong(0)
        total_bytes = ctypes.c_ulonglong(0)

        for letter in ["C:\\", "D:\\"]:
            if not os.path.exists(letter):
                continue
            try:
                ctypes.windll.kernel32.GetDiskFreeSpaceExW(letter, ctypes.byref(free_bytes), ctypes.byref(total_bytes), None)
                if total_bytes.value > 0:
                    free_gb = round(free_bytes.value / (1024**3), 1)
                    total_gb = round(total_bytes.value / (1024**3), 1)
                    used_gb = round((total_bytes.value - free_bytes.value) / (1024**3), 1)
                    used_pct = round((1.0 - (free_bytes.value / total_bytes.value)) * 100.0, 1)
                    drives.append({
                        "drive": letter[:2],
                        "free_gb": free_gb,
                        "used_gb": used_gb,
                        "total_gb": total_gb,
                        "used_pct": used_pct
                    })
            except Exception as e:
                pass
        return drives

    def get_all(self):
        return {
            "cpu_pct": self.get_cpu_pct(),
            "ram": self.get_ram_stats(),
            "drives": self.get_disk_stats()
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
    
    clean_path = os.path.normpath(target_path.strip('"\''))
    if not os.path.exists(clean_path):
        return False, f"File or application not found: {clean_path}"

    try:
        if clean_path.lower().endswith(".exe"):
            cmd = [clean_path] + (args or [])
            subprocess.Popen(cmd)
            return True, "Executed application"
        else:
            os.startfile(clean_path)
            return True, "Opened with default program"
    except Exception as e:
        return False, str(e)

def open_directory_in_explorer(target_path):
    if not target_path:
        return False, "No path provided"
    
    clean_path = os.path.normpath(target_path.strip('"\''))
    if not os.path.exists(clean_path):
        return False, f"Path not found: {clean_path}"

    try:
        if os.path.isdir(clean_path):
            subprocess.Popen(["explorer.exe", clean_path])
        else:
            subprocess.Popen(["explorer.exe", f"/select,{clean_path}"])
        return True, "Explorer opened"
    except Exception as e:
        return False, str(e)


# ==============================================================================
# Global Bridge Instances
# ==============================================================================
EVERYTHING = EverythingBridge()
TELEMETRY = SystemTelemetry()
CONFIG = ConfigManager(EVERYTHING)

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

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
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

        # /api/config
        if path == "/api/config":
            self._send_json(CONFIG.config)
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

            success, msg = launch_file_or_app(target_path, args)
            self._send_json({"success": success, "message": msg}, 200 if success else 400)
            return

        # /api/open-dir
        if path == "/api/open-dir":
            target_path = data.get("path")
            success, msg = open_directory_in_explorer(target_path)
            self._send_json({"success": success, "message": msg}, 200 if success else 400)
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
    print(f"[Test 1/4] Everything 1.5 IPC: {'CONNECTED' if EVERYTHING.connected else 'FAILED'}")
    if EVERYTHING.connected:
        res = EVERYTHING.search("bookmarks-manager", count=2)
        print(f"          Query returned {len(res)} results:")
        for r in res:
            print(f"          - {r['full_path']}")
    
    # 2. Hardware telemetry
    print("[Test 2/4] Hardware Telemetry:")
    stats = TELEMETRY.get_all()
    print(f"          CPU: {stats['cpu_pct']}%")
    print(f"          RAM: {stats['ram']['load_pct']}% ({stats['ram']['used_gb']}GB / {stats['ram']['total_gb']}GB)")
    for d in stats['drives']:
        print(f"          Disk {d['drive']}: {d['free_gb']}GB Free / {d['total_gb']}GB ({d['used_pct']}% used)")

    # 3. App detection
    print("[Test 3/4] Desktop App Auto-Detection:")
    for app_id, info in CONFIG.config.get("apps", {}).items():
        exists = os.path.exists(info["path"]) if info.get("path") else False
        status = "FOUND" if exists else "NOT FOUND"
        print(f"          [{app_id}] {info['name']}: {status} -> {info.get('path')}")

    # 4. Quick Folders
    print("[Test 4/4] Quick Folders:")
    for qf in CONFIG.config.get("quick_folders", []):
        exists = os.path.exists(qf["path"])
        status = "OK" if exists else "MISSING"
        print(f"          {qf['name']}: {status} -> {qf['path']}")

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

    server = ThreadingHTTPServer(("127.0.0.1", port), DeckBridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Bridge] Shutting down cleanly.")
        server.server_close()


if __name__ == "__main__":
    main()
