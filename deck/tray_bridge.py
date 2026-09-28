#!/usr/bin/env python3
"""
tray_bridge.py
==============
Silent Background System Tray Daemon for Deck Desktop Bridge.
Runs Deck HTTP Bridge silently on port 8080 with:
- Windows Notification Area (System Tray) icon.
- Context menu: Open Dashboard, Launch Everything, Toggle Windows Startup, Restart, Exit.
- 1-Click native Windows autostart registration via HKCU Run registry.
- Zero console window when launched via pythonw.exe.
"""

import sys
import os
import json
import time
import socket
import threading
import webbrowser
import subprocess
import winreg
import urllib.request
from http.server import ThreadingHTTPServer

import pystray
from pystray import MenuItem as item
from PIL import Image, ImageDraw

# Windows Console / Pythonw Stream Safety
class _NullStream:
    def write(self, s): pass
    def flush(self): pass
    def isatty(self): return False

if sys.stdout is None:
    sys.stdout = _NullStream()
if sys.stderr is None:
    sys.stderr = _NullStream()

# Ensure directory is on sys.path to import bridge
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import bridge

# Registry autostart key
REG_RUN_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
REG_RUN_KEY_NAME = "DeckDesktopBridge"
DEFAULT_PORT = 8080


def get_pythonw_path():
    """Locate pythonw.exe to run without a terminal window."""
    py_dir = os.path.dirname(sys.executable)
    pyw = os.path.join(py_dir, "pythonw.exe")
    if os.path.exists(pyw):
        return pyw
    return sys.executable


def is_autostart_enabled():
    """Check if Deck Bridge is registered in HKCU Run registry."""
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_RUN_PATH, 0, winreg.KEY_READ) as key:
            val, _ = winreg.QueryValueEx(key, REG_RUN_KEY_NAME)
            return bool(val)
    except (FileNotFoundError, OSError):
        return False


def set_autostart(enable: bool):
    """Register or unregister Deck Bridge in Windows HKCU Run."""
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_RUN_PATH, 0, winreg.KEY_SET_VALUE) as key:
            if enable:
                script_path = os.path.abspath(__file__)
                pyw = get_pythonw_path()
                cmd = f'"{pyw}" "{script_path}"'
                winreg.SetValueEx(key, REG_RUN_KEY_NAME, 0, winreg.REG_SZ, cmd)
                bridge.send_windows_toast("Deck Desktop Bridge", "Windows Startup enabled. Deck will run on boot.")
                return True
            else:
                try:
                    winreg.DeleteValue(key, REG_RUN_KEY_NAME)
                except FileNotFoundError:
                    pass
                bridge.send_windows_toast("Deck Desktop Bridge", "Windows Startup disabled.")
                return True
    except Exception as e:
        print(f"[Tray] Autostart error: {e}")
        return False


def create_tray_icon_image():
    """Generate or load high-DPI 64x64 system tray icon."""
    icon_path = os.path.join(SCRIPT_DIR, "deck_tray_icon.png")
    if os.path.exists(icon_path):
        try:
            return Image.open(icon_path)
        except Exception:
            pass

    # Dynamic procedural icon: Dark squircle + cyan neon outline + live emerald dot
    img = Image.new("RGBA", (64, 64), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([3, 3, 61, 61], radius=16, fill=(10, 15, 24, 255), outline=(6, 182, 212, 255), width=3)
    # Monogram D
    draw.rectangle([18, 16, 25, 48], fill=(255, 255, 255, 255))
    draw.arc([16, 16, 46, 48], start=270, end=90, fill=(6, 182, 212, 255), width=7)
    # Emerald online dot
    draw.ellipse([42, 42, 56, 56], fill=(16, 185, 129, 255), outline=(10, 15, 24, 255), width=2)
    return img


class DeckTrayDaemon:
    def __init__(self, port=DEFAULT_PORT):
        self.port = port
        self.server = None
        self.server_thread = None
        self.icon = None
        self.running = False

    def is_port_in_use(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(("127.0.0.1", self.port)) == 0

    def is_bridge_healthy(self):
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{self.port}/api/status", headers={"User-Agent": "DeckTray/1.0"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data.get("status") == "ok"
        except Exception:
            return False
        return False

    def start_http_server(self):
        ThreadingHTTPServer.allow_reuse_address = True
        try:
            self.server = ThreadingHTTPServer(("127.0.0.1", self.port), bridge.DeckBridgeHandler)
        except OSError as e:
            print(f"[Tray] Error binding port {self.port}: {e}")
            return False

        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()
        self.running = True
        print(f"[Tray] Deck Desktop Bridge running silently on http://127.0.0.1:{self.port}/")
        return True

    def open_dashboard(self, icon=None, item=None):
        webbrowser.open(f"http://localhost:{self.port}/")

    def open_everything(self, icon=None, item=None):
        exe_candidates = [
            r"C:\Program Files\Everything\Everything.exe",
            r"C:\Program Files\Everything 1.5a\Everything.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Everything\Everything.exe")
        ]
        exe = next((p for p in exe_candidates if os.path.exists(p)), None)
        if not exe and bridge.EVERYTHING.connected:
            exe = bridge.EVERYTHING.find_file(r"regex:^Everything\.exe$")

        if exe and os.path.exists(exe):
            try:
                os.startfile(exe)
            except Exception:
                subprocess.Popen([exe], close_fds=True)
        else:
            bridge.send_windows_toast("Everything 1.5", "Everything.exe not found on disk.")

    def open_workspace_folder(self, icon=None, item=None):
        workspace_dir = os.path.dirname(SCRIPT_DIR)
        try:
            os.startfile(workspace_dir)
        except Exception:
            subprocess.Popen(["explorer.exe", workspace_dir], close_fds=True)

    def toggle_autostart(self, icon=None, item=None):
        current = is_autostart_enabled()
        set_autostart(not current)

    def restart_bridge(self, icon=None, item=None):
        """Restart bridge daemon cleanly."""
        pyw = get_pythonw_path()
        script_path = os.path.abspath(__file__)
        self.stop(icon, item)
        subprocess.Popen([pyw, script_path], close_fds=True)
        sys.exit(0)

    def stop(self, icon=None, item=None):
        self.running = False
        if self.server:
            try:
                self.server.shutdown()
                self.server.server_close()
            except Exception:
                pass
        if self.icon:
            self.icon.stop()

    def run(self):
        # 1. Check if bridge is already running
        if self.is_port_in_use():
            if self.is_bridge_healthy():
                print("[Tray] Deck Bridge is already running and healthy.")
                self.open_dashboard()
                sys.exit(0)
            else:
                print(f"[Tray] Port {self.port} occupied by unresponsive process. Retrying...")

        # 2. Start HTTP server thread
        if not self.start_http_server():
            bridge.send_windows_toast("Deck Desktop Bridge", f"Failed to bind to port {self.port}.")
            sys.exit(1)

        # 3. Create Tray Icon
        img = create_tray_icon_image()
        menu = pystray.Menu(
            item("🌐 Open Dashboard", self.open_dashboard, default=True),
            item("⚡ Everything 1.5 Search", self.open_everything),
            item("📁 Open Workspace Folder", self.open_workspace_folder),
            pystray.Menu.SEPARATOR,
            item("🚀 Start with Windows", self.toggle_autostart, checked=lambda it: is_autostart_enabled()),
            item("🔄 Restart Bridge", self.restart_bridge),
            pystray.Menu.SEPARATOR,
            item("❌ Exit Deck Bridge", self.stop)
        )

        self.icon = pystray.Icon(
            name="DeckBridge",
            icon=img,
            title=f"Deck Desktop Bridge (Port {self.port}) — Online",
            menu=menu
        )

        # 4. Optional startup toast
        bridge.send_windows_toast(
            "Deck Desktop Bridge",
            f"Bridge is online in system tray on port {self.port}. Double-click icon to open."
        )

        # 5. Run pystray mainloop (blocks until exit)
        self.icon.run()


if __name__ == "__main__":
    port = DEFAULT_PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    daemon = DeckTrayDaemon(port=port)
    daemon.run()
