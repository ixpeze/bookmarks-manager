#!/usr/bin/env python3
"""
generate_data_js.py
Parses bookmarks_9_22_26_mod.html to extract:
1. Curated toolbar bookmarks grouped into 10 semantic zones.
2. Complete hierarchical library (7 categories, 71 folders, 500+ bookmarks).
3. Pre-seeded prompts and 3D utilities.
Outputs: dashboard/js/data.js (ES6 module)
"""

import os
import re
import json

SOURCE_HTML = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "bookmarks_9_22_26_mod.html"))
OUTPUT_JS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "js", "data.js"))

ZONE_DEFINITIONS = [
    {
        "id": "quick-tools",
        "title": "Web Apps & Quick Tools",
        "icon": "zap",
        "color": "cyan",
        "domains": ["pages.dev", "web.app", "nosignups.net", "fmhy.net"]
    },
    {
        "id": "google-suite",
        "title": "Google Ecosystem",
        "icon": "globe",
        "color": "amber",
        "domains": ["google.com"]
    },
    {
        "id": "ai-suite",
        "title": "AI Assistants & Studios",
        "icon": "sparkles",
        "color": "violet",
        "domains": ["claude.ai", "chatgpt.com", "gemini.google.com", "aistudio.google.com", "deepseek.com"]
    },
    {
        "id": "social",
        "title": "Social & Messaging",
        "icon": "message-circle",
        "color": "emerald",
        "domains": ["facebook.com", "whatsapp.com"]
    },
    {
        "id": "media",
        "title": "Media & Audio",
        "icon": "play",
        "color": "rose",
        "domains": ["youtube.com", "spotify.com"]
    },
    {
        "id": "torrents",
        "title": "CG Trackers & Communities",
        "icon": "download-cloud",
        "color": "amber",
        "domains": ["torrentbd.net", "cgpeers.to", "cgpersia.com"]
    },
    {
        "id": "creative-3d",
        "title": "3D, VFX, Gaming & Cloud",
        "icon": "box",
        "color": "cyan",
        "domains": ["artstation.com", "steam.tv", "epicgames.com", "comfy.org"]
    },
    {
        "id": "isp",
        "title": "ISP Portals & Network",
        "icon": "wifi",
        "color": "blue",
        "domains": ["mimebd.com", "dotinternetbd.com"]
    },
    {
        "id": "utilities",
        "title": "Civic, Knowledge & Faith",
        "icon": "book-open",
        "color": "emerald",
        "domains": ["iab.com.bd", "quran.com", "ostad.app", "booky.io"]
    }
]

DEFAULT_PROMPTS = [
    {
        "id": "p-1",
        "category": "Architecture & Archviz",
        "title": "Photorealistic Architectural Exterior",
        "prompt": "Architectural photography of a modern minimalist concrete and timber villa in lush nature, dramatic overcast cinematic lighting, wet tarmac reflections, Hasselblad 50mm f/2.8 lens, 8k resolution, ultra-detailed architectural textures, photorealistic Lumen global illumination --ar 16:9 --style raw"
    },
    {
        "id": "p-2",
        "category": "Architecture & Archviz",
        "title": "Warm Nordic Interior Living Space",
        "prompt": "Modern Scandinavian open-plan living room with warm light-oak flooring, floor-to-ceiling glass windows facing a pine forest, soft diffused morning sunlight, tactile linen textiles, textured lime-wash walls, minimalist furniture, highly detailed, photorealistic interior rendering --ar 16:9"
    },
    {
        "id": "p-3",
        "category": "Unreal Engine & Technical",
        "title": "Unreal Engine 5 C++ Component Architecture",
        "prompt": "Explain the optimal C++ component architecture in Unreal Engine 5.5 for a modular interaction system. Include header definitions, UFUNCTION specifiers, delegates for state changes, and how to expose properties cleanly to Blueprints with zero memory leaks."
    },
    {
        "id": "p-4",
        "category": "Unreal Engine & Technical",
        "title": "HLSL Custom Shader Material Function",
        "prompt": "Write a custom HLSL code snippet for an Unreal Engine 5 material node that calculates a soft rim-light fresnel with variable roughness masking and world-position distance fade. Ensure mobile & desktop SM6 compatibility."
    },
    {
        "id": "p-5",
        "category": "ComfyUI & Generative AI",
        "title": "Flux ControlNet Depth Architecture Pass",
        "prompt": "Construct an optimal prompt for Flux Schnell with depth ControlNet: 'High-detail brutalist civic library interior with monumental concrete cantilever staircase, volumetric skylight rays hitting dust particles, architectural digest photoshoot, 8k, hyper-detailed materials'."
    },
    {
        "id": "p-6",
        "category": "Web & Code Engineering",
        "title": "High-Performance Clean Web Architecture",
        "prompt": "Review this implementation for performance bottlenecks, accessibility (WCAG AA), DOM paint thrashing, and memory leaks. Suggest strict refactorings with minimal dependencies and zero unnecessary re-renders."
    }
]

SITE_NAMES = {
    "pages.dev": "AssetVault",
    "web.app": "DPDC Meter",
    "nosignups.net": "NoSignups",
    "fmhy.net": "FMHY",
    "www.google.com": "Google Search",
    "mail.google.com": "Gmail",
    "calendar.google.com": "Google Calendar",
    "meet.google.com": "Google Meet",
    "drive.google.com": "Google Drive",
    "remotedesktop.google.com": "Remote Desktop",
    "keep.google.com": "Google Keep",
    "photos.google.com": "Google Photos",
    "classroom.google.com": "Classroom",
    "claude.ai": "Claude",
    "chatgpt.com": "ChatGPT",
    "gemini.google.com": "Gemini",
    "aistudio.google.com": "AI Studio",
    "chat.deepseek.com": "DeepSeek",
    "www.facebook.com": "Facebook",
    "web.whatsapp.com": "WhatsApp",
    "www.youtube.com": "YouTube",
    "open.spotify.com": "Spotify",
    "www.torrentbd.net": "TorrentBD",
    "cgpeers.to": "CGPeers",
    "forum.cgpersia.com": "CGPersia",
    "www.artstation.com": "ArtStation",
    "steam.tv": "Steam Dota 2",
    "dev.epicgames.com": "Epic Dev",
    "cloud.comfy.org": "ComfyUI Cloud",
    "myportal.mimebd.com": "MiME Portal",
    "selfcare.dotinternetbd.com": "DotInternet",
    "portal.iab.com.bd": "IAB Portal",
    "quran.com": "Quran.com",
    "ostad.app": "Ostad",
    "booky.io": "Booky.io"
}

def parse_html():
    with open(SOURCE_HTML, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    # 1. Parse toolbar items (lines 714-760)
    toolbar_raw = lines[714:760]
    toolbar_items = []
    
    for line in toolbar_raw:
        m = re.search(r'<DT><A\s+HREF="([^"]*)"(?:[^>]*ICON="([^"]*)")?[^>]*>(.*?)</A>', line)
        if m:
            href = m.group(1)
            icon = m.group(2) or ""
            title = m.group(3) or ""
            is_sep = "separator.mayastudios.com" in href
            
            # Determine friendly name
            name = title
            if not name:
                for domain_key, friendly in SITE_NAMES.items():
                    if domain_key in href:
                        name = friendly
                        break
            if not name and not is_sep:
                from urllib.parse import urlparse
                name = urlparse(href).netloc.replace("www.", "")
            
            toolbar_items.append({
                "href": href,
                "icon": icon,
                "name": name,
                "is_separator": is_sep
            })
    
    # Cluster toolbar items into zones separated by separators
    zones = []
    current_items = []
    zone_idx = 0
    
    for item in toolbar_items:
        if item["is_separator"]:
            if current_items:
                zone_def = ZONE_DEFINITIONS[zone_idx] if zone_idx < len(ZONE_DEFINITIONS) else {
                    "id": f"zone-{zone_idx+1}",
                    "title": f"Zone {zone_idx+1}",
                    "icon": "folder",
                    "color": "slate"
                }
                zones.append({
                    **zone_def,
                    "items": current_items
                })
                current_items = []
                zone_idx += 1
        else:
            current_items.append(item)
            
    if current_items:
        zone_def = ZONE_DEFINITIONS[zone_idx] if zone_idx < len(ZONE_DEFINITIONS) else {
            "id": f"zone-{zone_idx+1}",
            "title": f"Zone {zone_idx+1}",
            "icon": "folder",
            "color": "slate"
        }
        zones.append({
            **zone_def,
            "items": current_items
        })
    
    # 2. Parse master library tree (lines 11 to 714)
    # Walk line by line tracking folder hierarchy
    library_categories = []
    stack = []  # items: {title, items: [], subfolders: []}
    
    for line in lines[10:714]:
        s = line.strip()
        if "<DL" in s:
            pass
        elif "</DL" in s:
            if len(stack) > 1:
                child = stack.pop()
                stack[-1]["subfolders"].append(child)
            elif len(stack) == 1:
                child = stack.pop()
                if child["title"]:
                    library_categories.append(child)
                elif child["subfolders"]:
                    library_categories.extend(child["subfolders"])
        else:
            m_h3 = re.search(r'<DT><H3[^>]*>(.*?)</H3>', line)
            if m_h3:
                title = m_h3.group(1).replace("&amp;", "&")
                new_folder = {
                    "title": title,
                    "items": [],
                    "subfolders": []
                }
                stack.append(new_folder)
            else:
                m_a = re.search(r'<DT><A\s+HREF="([^"]*)"(?:[^>]*ICON="([^"]*)")?[^>]*>(.*?)</A>', line)
                if m_a and stack:
                    href = m_a.group(1)
                    icon = m_a.group(2) or ""
                    title = m_a.group(3) or href
                    title = title.replace("&amp;", "&").replace("&quot;", '"')
                    stack[-1]["items"].append({
                        "href": href,
                        "title": title,
                        "icon": icon
                    })
    
    while stack:
        child = stack.pop()
        if len(stack) > 0:
            stack[-1]["subfolders"].append(child)
        else:
            if child["title"]:
                library_categories.append(child)
            elif child["subfolders"]:
                # The root folder was the front folder with empty title; promote its subfolders
                library_categories.extend(child["subfolders"])
            
    return zones, library_categories

def main():
    os.makedirs(os.path.dirname(OUTPUT_JS), exist_ok=True)
    zones, library = parse_html()
    
    total_toolbar_items = sum(len(z["items"]) for z in zones)
    print(f"Parsed {len(zones)} toolbar zones with {total_toolbar_items} total shortcuts.")
    print(f"Parsed {len(library)} master library root categories.")
    
    data_payload = {
        "toolbarZones": zones,
        "library": library,
        "defaultPrompts": DEFAULT_PROMPTS
    }
    
    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write("// Aura Command Center — Master Pre-Seeded Bookmarks & Config Dataset\n")
        f.write("// Auto-generated from bookmarks_9_22_26_mod.html\n")
        f.write("export const BOOKMARK_DATA = ")
        json.dump(data_payload, f, indent=2, ensure_ascii=False)
        f.write(";\n")
        
    print(f"Successfully generated: {OUTPUT_JS} ({os.path.getsize(OUTPUT_JS)} bytes)")

if __name__ == "__main__":
    main()
