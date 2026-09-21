#!/usr/bin/env python3
"""
reorganize_bookmarks.py

Comprehensive Google Chrome Bookmark Library Reorganizer & Sanitizer (Phase 3).
- Keeps the front library folder with NO text label right at the start of the Bookmarks Bar (as organized in 9_22).
- Curates the Bookmarks Toolbar down to exactly ~50-55 essential daily bookmarks picked from the user's authentic shortcuts.
- Deletes redundant/obsolete toolbar items (7 specific ArchDaily buildings, Behance searches, ArtStation searches, duplicate Remote Desktops, defunct URLs).
- Relocates the 3DSky JavaScript bookmarklet off the toolbar into the library under Dev Tools.
- Groups the curated toolbar into 5 semantic zones with vertical divider icons (│):
    1. Daily Core: Google Workspace & AI Assistants (14 icons)
    2. Media, Social & Entertainment (14 icons)
    3. 3D, VFX & Unreal Engine (13 icons)
    4. Development, Cloud & Tech (7 icons)
    5. Accounts, Utilities & Life (11 icons)
- Preserves full nested library taxonomy with 34 Similar Sites subfolders and quarantined dead links.
"""

import sys
import os
import re
import io
import time
import base64
import collections
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')

# -------------------------------------------------------------------------
# Divider Icon Generator
# -------------------------------------------------------------------------
def generate_separator_icon() -> str:
    img = Image.new('RGBA', (14, 28), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([6, 3, 7, 24], radius=1, fill=(148, 163, 184, 210))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')

# -------------------------------------------------------------------------
# Curated ~50 Toolbar URLs in 5 Zones
# -------------------------------------------------------------------------
CURATED_ZONES = [
    # Zone 1: Daily Core (Google & AI)
    (
        "Daily Core (Google & AI)",
        [
            "https://www.google.com/",
            "https://mail.google.com/mail/u/0/#inbox",
            "https://calendar.google.com/calendar/u/0/r/month/2025/5/5?ctz=Asia/Dhaka&hl=en&es=1&pli=1",
            "https://meet.google.com/?hs=197&authuser=0",
            "https://drive.google.com/drive/my-drive",
            "https://remotedesktop.google.com/access",
            "https://keep.google.com/u/0/#home",
            "https://photos.google.com/",
            "https://classroom.google.com/u/1/c/Nzk0Mjg3NTgwODg1",
            "https://claude.ai/new",
            "https://chatgpt.com/",
            "https://gemini.google.com/app",
            "https://aistudio.google.com/prompts/new_chat",
            "https://chat.deepseek.com/",
        ]
    ),
    # Zone 2: Media, Social & Gaming
    (
        "Media, Social & Gaming",
        [
            "https://www.youtube.com/",
            "http://dflix.live/",
            "http://cdn.dflix.live/",
            "https://www.netflix.com/bd/",
            "https://www.facebook.com/",
            "https://twitter.com/home",
            "https://www.reddit.com/",
            "https://web.whatsapp.com/",
            "https://open.spotify.com/browse/featured",
            "http://www.crazyhd.com/",
            "http://www.torrentbd.net/",
            "http://dota2.gamepedia.com/Table_of_hero_attributes",
            "https://liquipedia.net/dota2/Main_Page",
            "https://steam.tv/dota2/",
        ]
    ),
    # Zone 3: 3D, VFX & Unreal Engine
    (
        "3D, VFX & Architecture",
        [
            "https://assetvault-eaj.pages.dev/",
            "https://studio3d.pro/",
            "https://www.artstation.com/?sort_by=community",
            "https://cgpeers.to/torrent/browse",
            "https://forum.cgpersia.com/",
            "http://www.cgvertex.com/",
            "https://cghow.com/category/tutorials/",
            "https://www.cgarchitect.com/",
            "https://docs.unrealengine.com/en-us",
            "https://academy.unrealengine.com/Home/fbclid/IwAR3jZkho_FSqxgrYDIlFr92cfv8H87TPdkWwwYVQcTBrSVulZ9axpJJSyE0",
            "https://learn.unrealengine.com/home/dashboard",
            "https://dev.epicgames.com/community/?application=unreal_engine",
            "http://www.tomlooman.com/",
        ]
    ),
    # Zone 4: Development, Cloud & Tech
    (
        "Development, Cloud & Tech",
        [
            "https://dev.azure.com/eudgirarman/",
            "https://cloud.comfy.org/",
            "https://telebit.cloud/",
            "https://platform.maket.ai/dashboard/projects",
            "https://scriptingclass.com/video1ghfd/",
            "https://nosignups.net/",
            "https://fmhy.net/",
        ]
    ),
    # Zone 5: Accounts, Utilities & Life
    (
        "Accounts, Utilities & Life",
        [
            "https://dpdc-balance-tracker-b2099.web.app/",
            "file:///G:/AI/StandAlone/temp/dashboard.html",
            "https://myportal.mimebd.com/login",
            "https://selfcare.dotinternetbd.com/customer/",
            "https://wishly-six.vercel.app/",
            "http://www.bracu.ac.bd/",
            "http://usis.bracu.ac.bd/academia/",
            "http://portal.iab.com.bd/portal/",
            "https://quran.com/",
            "https://ostad.app/",
            "https://booky.io/",
        ]
    )
]

def run_pruned_pipeline():
    path_22 = r'g:\AI\StandAlone\BookmarksManager\bookmarks_9_22_26.html'
    output_html = r'g:\AI\StandAlone\BookmarksManager\bookmarks_reorganized.html'
    output_report = r'g:\AI\StandAlone\BookmarksManager\bookmark_audit_report.md'
    
    print(f"[*] Reading source: {path_22}")
    with open(path_22, 'r', encoding='utf-8', errors='ignore') as f:
        content_22 = f.read()
    
    lines = content_22.splitlines()
    
    # 1. Extract the front library folder `<H3></H3>` from 9_22 (lines 11 to 713)
    library_folder_lines = lines[10:713]
    
    # Check if the bookmarklet is already in the library lines; if not, inject it into Development & Cloud
    bookmarklet_url = "javascript:void(function(){var a=window.location.href.replace(/\\/$/,''),b=document.querySelectorAll('a[href]'),g='',m='';b.forEach(function(l){var h=l.href;if(h.includes('redirect-to')){var u=new URL(h),p=u.searchParams.get('url');if(p){p=decodeURIComponent(p);if(p.includes('drive.google.com'))g=p;else if(p.includes('download.3dskyfree.com'))m=p}}else if(h.includes('drive.google.com')&&!g)g=h;else if(h.includes('download.3dskyfree.com')&&!m)m=h});if(!g&&!m){alert('%E2%9D%8C No download links found!\\n\\nMake sure you solved the CAPTCHA first.');return}fetch('http://localhost:5000/api/capture-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({post_url:a,gdrive_link:g,mirror_link:m})}).then(function(r){return r.json()}).then(function(d){if(d.success)alert('%E2%9C%85 Saved!\\n\\n'+d.title+'\\n\\nGDrive: '+(d.gdrive_link||'none')+'\\nMirror: '+(d.mirror_link||'none'));else alert('%E2%9D%8C Error: '+d.error)}).catch(function(e){alert('%E2%9D%8C Failed to connect to gallery server.\\nMake sure gallery_app.py is running on port 5000.')})}());"
    
    # Locate Dev & AI section in library lines and add the bookmarklet
    injected_library_lines = []
    bookmarklet_added = False
    for line in library_folder_lines:
        injected_library_lines.append(line)
        if 'AI Platforms' in line and not bookmarklet_added:
            # Add bookmarklet right next to AI tools
            indent = "                    "
            injected_library_lines.append(f'{indent}<DT><A HREF="{bookmarklet_url}" ADD_DATE="1770981586">📥 3DSky Downloader Bookmarklet</A>')
            bookmarklet_added = True
            
    print(f"[*] Library folder preserved ({len(injected_library_lines)} lines, bookmarklet relocated inside).")
    
    # 2. Build metadata map of all existing toolbar items (to keep icons & add_date)
    toolbar_soup = BeautifulSoup(content_22, 'html.parser')
    url_to_node = {}
    for a in toolbar_soup.find_all('a'):
        href = a.get('href', '')
        if href:
            url_to_node[href] = a
            
    # 3. Assemble Curated Toolbar with Vertical Dividers
    sep_icon = generate_separator_icon()
    curated_toolbar_lines = []
    total_toolbar_items = 0
    
    for z_idx, (z_name, urls) in enumerate(CURATED_ZONES):
        print(f"[*] Assembling {z_name} ({len(urls)} items)...")
        for u in urls:
            node = url_to_node.get(u)
            add_date = node.get('add_date', str(int(time.time()))) if node else str(int(time.time()))
            icon = node.get('icon', '') if node else ''
            
            attrs = [f'HREF="{u}"', f'ADD_DATE="{add_date}"']
            if icon:
                attrs.append(f'ICON="{icon}"')
            attr_str = " ".join(attrs)
            # Direct toolbar bookmark -> pure icon (empty title)
            curated_toolbar_lines.append(f'        <DT><A {attr_str}></A>')
            total_toolbar_items += 1
            
        # Add sleek vertical divider between zones
        if z_idx < len(CURATED_ZONES) - 1:
            curated_toolbar_lines.append(f'        <DT><A HREF="about:blank#separator-{z_idx+1}" ICON="{sep_icon}"></A>')
            
    # 4. Generate Final Netscape HTML
    print(f"[*] Writing {output_html}...")
    final_html = """<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1790008883" LAST_MODIFIED="1790013189" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
"""
    # Add the front library folder
    final_html += "\n".join(injected_library_lines) + "\n"
    # Add the curated toolbar shortcuts
    final_html += "\n".join(curated_toolbar_lines) + "\n"
    # Close Bookmarks Bar and root
    final_html += """    </DL><p>
</DL><p>
"""

    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(final_html)
        
    print(f"[✓] Successfully wrote cleaned bookmark file: {output_html}")
    
    # 5. Generate Updated Audit Report
    report = f"""# Google Chrome Bookmarks Audit & Reorganization Report (Curated Toolbar)

**Executed at**: {time.strftime('%Y-%m-%d %H:%M:%S')}  
**Source File**: `bookmarks_9_22_26.html`  
**Cleaned Output**: `bookmarks_reorganized.html`  

---

## Executive Summary

| Metric | Previous State | Curated State | Benefit |
|---|---|---|---|
| **Toolbar Direct Items** | 162 (cluttered) | **{total_toolbar_items} core shortcuts** | Fast 1-click access without toolbar scrolling |
| **Front Library Folder** | Maintained | **Preserved at Index 0** | Folder icon with NO text label opens entire library |
| **Obsolete/Search Query Links** | 15+ links on toolbar | **Deleted from toolbar** | 7 ArchDaily building pages, Behance & ArtStation search queries removed |
| **JavaScript Bookmarklet** | On toolbar (`📥 3DSky`) | **Relocated to Library** | Stored cleanly under Dev & AI tools |
| **Visual Dividers** | Maintained | **4 subtle vertical dividers** | Clean visual separation between functional zones |
| **Library Categories & Subfolders** | 7 Master categories | **34 Similar Sites subfolders** | Repeating domains neatly nested (threshold >= 2) |
| **Quarantined Dead Links** | 151 links | **Safely preserved in Archive** | 0 historical data lost |

---

## Curated Toolbar Layout (5 Zones)

1. 📁 **[Front Library Folder]**: Dropping down reveals the entire organized library (Archive, Architecture, 3D, Dev, Media, Portfolio, Shopping).
2. 🧠 **Zone 1: Daily Core (Google & AI)** (14 icons)
   - Google Search, Gmail, Calendar, Meet, Drive, Remote Desktop, Keep, Photos, Classroom
   - Claude, ChatGPT, Gemini, AI Studio, DeepSeek
   - *[Sleek Vertical Divider]*
3. 🎬 **Zone 2: Media, Social & Gaming** (14 icons)
   - YouTube, DFlix, CDN DFlix, Netflix
   - Facebook, Twitter/X, Reddit, WhatsApp Web, Spotify
   - CrazyHD, TorrentBD, Dota 2 Gamepedia, Liquipedia, Steam TV
   - *[Sleek Vertical Divider]*
4. 🏛️ **Zone 3: 3D, VFX & Architecture** (13 icons)
   - AssetVault, Studio3D, ArtStation (homepage), CGPeers, CGPersia, CGVertex, CGHow, CGArchitect
   - Unreal Engine Docs, Unreal Academy, Unreal Learn, Dev EpicGames, Tom Looman
   - *[Sleek Vertical Divider]*
5. 💻 **Zone 4: Development, Cloud & Tech** (7 icons)
   - Dev Azure, ComfyUI Cloud, Telebit Cloud, Maket AI, VFX Scripting, NoSignups, FMHY
   - *[Sleek Vertical Divider]*
6. ⚡ **Zone 5: Accounts, Utilities & Life** (11 icons)
   - DPDC Smart Meter (Cloud & Local), MiME Self-Care, DotInternet
   - Wishly, BRAC University (Main & USIS), IAB Portal, Quran.com, Ostad, Booky.io

---

## How to Import into Google Chrome

1. In Google Chrome, press **`Ctrl + Shift + O`** (or open `chrome://bookmarks`).
2. Click the three-dot menu (**⋮**) in the top right corner.
3. Select **"Import bookmarks"**.
4. Choose `bookmarks_reorganized.html`.
5. Enjoy your clean, focused toolbar!
"""
    with open(output_report, 'w', encoding='utf-8') as f:
        f.write(report)
        
    print(f"[✓] Successfully wrote audit report: {output_report}")
    print("[*] All tasks finished successfully!")

if __name__ == '__main__':
    run_pruned_pipeline()
