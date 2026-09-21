/**
 * studio-3d.js
 * Tab 2: Studio 3D & Archviz Hub with Curated 3D Asset Search Engine & Production Calculators
 */

export function renderStudio3D(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Header for 3D Hub -->
      <div class="hero-header" style="margin-bottom: 0;">
        <div style="padding: 18px 26px; display: flex; align-items: center; gap: 14px;">
          <span class="nothing-led"></span>
          <div>
            <div class="card-title" style="font-size: 16px; letter-spacing: 0.5px;">Studio 3D & Archviz Pipeline Console</div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
              Unreal Engine 5.5 · 3ds Max · V-Ray · ComfyUI · 3D Asset Repositories
            </div>
          </div>
        </div>
        <div style="padding: 18px 26px; display: flex; align-items: center; border-left: 1px solid var(--border-subtle);">
          <span class="card-badge" style="color: var(--text-primary);">Production Toolset</span>
        </div>
      </div>

      <!-- Section 1: Curated 3D Asset & Material Search Engine -->
      <section class="asset-search-hero">
        <div class="card-header" style="margin-bottom: 4px;">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--nothing-red);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <span class="card-title">Curated 3D Asset, Texture & HDRI Search Engine</span>
          </div>
          <span class="card-badge">Multi-Repo Query</span>
        </div>

        <div class="asset-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted); flex-shrink: 0;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            id="asset-search-query" 
            class="asset-search-input" 
            placeholder="Type query to launch searches across Poly Haven, ambientCG, 3Dsky, CGPeers... (e.g. 'concrete', 'sofa', 'overcast sky')" 
            autocomplete="off" 
            spellcheck="false" 
          />
          <button class="lib-search-clear" id="asset-search-clear" style="display: none;">✕</button>
        </div>

        <!-- 1-Click Multi-Repository Launcher Buttons -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
            1-Click Direct Launchers:
          </div>
          <div class="asset-repo-launchers" id="asset-repo-links">
            <a href="https://polyhaven.com/all" target="_blank" rel="noopener noreferrer" class="asset-repo-btn" data-base="https://polyhaven.com/all?s=">
              <img src="https://www.google.com/s2/favicons?domain=polyhaven.com&sz=128" class="asset-repo-icon" alt="" />
              <span>Poly Haven</span>
            </a>
            <a href="https://ambientcg.com/list" target="_blank" rel="noopener noreferrer" class="asset-repo-btn" data-base="https://ambientcg.com/list?q=">
              <img src="https://www.google.com/s2/favicons?domain=ambientcg.com&sz=128" class="asset-repo-icon" alt="" />
              <span>ambientCG</span>
            </a>
            <a href="https://3dsky.org/" target="_blank" rel="noopener noreferrer" class="asset-repo-btn" data-base="https://3dsky.org/search?query=">
              <img src="https://www.google.com/s2/favicons?domain=3dsky.org&sz=128" class="asset-repo-icon" alt="" />
              <span>3Dsky</span>
            </a>
            <a href="https://cgpeers.to/torrent/browse" target="_blank" rel="noopener noreferrer" class="asset-repo-btn" data-base="https://cgpeers.to/torrents.php?search=">
              <img src="https://www.google.com/s2/favicons?domain=cgpeers.to&sz=128" class="asset-repo-icon" alt="" />
              <span>CGPeers</span>
            </a>
            <a href="https://www.artstation.com/search?sort_by=relevance&query=" target="_blank" rel="noopener noreferrer" class="asset-repo-btn" data-base="https://www.artstation.com/search?sort_by=relevance&query=">
              <img src="https://www.google.com/s2/favicons?domain=artstation.com&sz=128" class="asset-repo-icon" alt="" />
              <span>ArtStation</span>
            </a>
            <a href="https://sketchfab.com/search?type=models&q=" target="_blank" rel="noopener noreferrer" class="asset-repo-btn" data-base="https://sketchfab.com/search?type=models&q=">
              <img src="https://www.google.com/s2/favicons?domain=sketchfab.com&sz=128" class="asset-repo-icon" alt="" />
              <span>Sketchfab</span>
            </a>
          </div>
        </div>

        <!-- Quick Filter Category Chips -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
          <span style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Filter Presets:</span>
          <div class="asset-filter-chips">
            <button class="asset-chip" data-preset="3D Models">3D Models</button>
            <button class="asset-chip" data-preset="PBR Textures">PBR Textures</button>
            <button class="asset-chip" data-preset="Overcast Sky HDRI">HDRIs & Skies</button>
            <button class="asset-chip" data-preset="Foliage Grass Vegetation">Foliage & Nature</button>
            <button class="asset-chip" data-preset="Unreal Engine 5 Architecture">UE5 Archviz</button>
            <button class="asset-chip" data-preset="V-Ray Materials">V-Ray Materials</button>
          </div>
        </div>
      </section>

      <!-- Section 2: Direct Pipelines & Quick Launch Bento Card -->
      <div class="bento-grid">
        <div class="bento-card span-12">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </span>
              <span class="card-title">Production Pipelines & Repositories</span>
            </div>
            <span class="card-badge">Direct Access</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;" id="studio-direct-grid">
            <a href="https://docs.unrealengine.com/en-us" class="essential-pill" target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=unrealengine.com&sz=128" class="essential-icon" alt="" />
              <span class="essential-name">UE Docs</span>
            </a>
            <a href="https://assetvault-eaj.pages.dev/" class="essential-pill" target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=pages.dev&sz=128" class="essential-icon" alt="" />
              <span class="essential-name">AssetVault</span>
            </a>
            <a href="https://cloud.comfy.org/" class="essential-pill" target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=comfy.org&sz=128" class="essential-icon" alt="" />
              <span class="essential-name">ComfyUI</span>
            </a>
            <a href="https://www.artstation.com/?sort_by=community" class="essential-pill" target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=artstation.com&sz=128" class="essential-icon" alt="" />
              <span class="essential-name">ArtStation</span>
            </a>
            <a href="https://cgpeers.to/torrent/browse" class="essential-pill" target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=cgpeers.to&sz=128" class="essential-icon" alt="" />
              <span class="essential-name">CGPeers</span>
            </a>
            <a href="https://forum.cgpersia.com/" class="essential-pill" target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=cgpersia.com&sz=128" class="essential-icon" alt="" />
              <span class="essential-name">CGPersia</span>
            </a>
            <a href="https://dev.epicgames.com/community/" class="essential-pill" target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=epicgames.com&sz=128" class="essential-icon" alt="" />
              <span class="essential-name">Epic Dev</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Section 3: Production Calculators Grid (2-Column Wireframe) -->
      <div class="bento-grid">
        <!-- Tool 1: Aspect Ratio & Render Resolution Calculator -->
        <div class="bento-card span-6">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill" style="color: var(--cyan-primary);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </span>
              <span class="card-title">Aspect Ratio & Resolution Calc</span>
            </div>
            <span class="card-badge">Render Pass</span>
          </div>

          <div class="calc-box">
            <div class="preset-pills">
              <button class="preset-pill" data-w="3840" data-h="2160">4K UHD (16:9)</button>
              <button class="preset-pill" data-w="2560" data-h="1440">2K QHD (16:9)</button>
              <button class="preset-pill" data-w="1920" data-h="1080">Full HD (16:9)</button>
              <button class="preset-pill" data-w="3440" data-h="1440">Ultrawide (21:9)</button>
              <button class="preset-pill" data-w="2048" data-h="2048">Square (1:1)</button>
              <button class="preset-pill" data-w="1080" data-h="1920">Story / Reel (9:16)</button>
            </div>

            <div class="calc-row">
              <input type="number" id="calc-width" class="calc-input" placeholder="Width (px)" value="3840" />
              <span style="color: var(--text-muted); font-weight: 700;">×</span>
              <input type="number" id="calc-height" class="calc-input" placeholder="Height (px)" value="2160" />
            </div>

            <div class="calc-output-box">
              <div>
                <div style="font-size: 11px; color: var(--text-muted);">Calculated Aspect Ratio & Megapixels</div>
                <div class="calc-output-val" id="calc-ratio-out">16:9 · 8.29 MP</div>
              </div>
              <button class="btn-secondary" id="btn-copy-res">Copy W×H</button>
            </div>
          </div>
        </div>

        <!-- Tool 2: Archviz Unit & Unreal Engine Scale Converter -->
        <div class="bento-card span-6">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill" style="color: var(--amber-primary);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"></path>
                  <line x1="14.5" y1="5.5" x2="18.5" y2="9.5"></line>
                </svg>
              </span>
              <span class="card-title">Archviz Scale & Unit Converter</span>
            </div>
            <span class="card-badge">UE5 Metric</span>
          </div>

          <div class="calc-box">
            <div style="font-size: 12px; color: var(--text-muted);">
              Unreal Engine standard unit is centimeters (1 uu = 1 cm). Convert architectural dimensions accurately:
            </div>

            <div class="calc-row">
              <input type="number" id="unit-val" class="calc-input" value="3.5" step="0.1" />
              <select id="unit-type" class="calc-input" style="flex: 0.8; background: var(--bg-card);">
                <option value="meters" selected>Meters (m)</option>
                <option value="feet">Feet (ft)</option>
                <option value="inches">Inches (in)</option>
                <option value="mm">Millimeters (mm)</option>
              </select>
            </div>

            <div class="calc-output-box" style="border-color: var(--amber-primary);">
              <div>
                <div style="font-size: 11px; color: var(--text-muted);">Unreal Engine Units (uu)</div>
                <div class="calc-output-val" id="unit-uu-out" style="color: var(--amber-primary);">350 uu (350 cm)</div>
              </div>
              <button class="btn-secondary" id="btn-copy-uu">Copy uu</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind 3D Asset Search events
  const assetQuery = container.querySelector('#asset-search-query');
  const assetClear = container.querySelector('#asset-search-clear');
  const repoBtns = container.querySelectorAll('.asset-repo-btn');
  const chipBtns = container.querySelectorAll('.asset-chip');

  const updateRepoLinks = () => {
    const q = assetQuery.value.trim();
    if (q) {
      assetClear.style.display = 'block';
    } else {
      assetClear.style.display = 'none';
    }

    repoBtns.forEach(btn => {
      const base = btn.dataset.base;
      if (q) {
        btn.href = base + encodeURIComponent(q);
      } else {
        // Default clean url
        if (base.includes('polyhaven')) btn.href = 'https://polyhaven.com/all';
        else if (base.includes('ambientcg')) btn.href = 'https://ambientcg.com/list';
        else if (base.includes('3dsky')) btn.href = 'https://3dsky.org/';
        else if (base.includes('cgpeers')) btn.href = 'https://cgpeers.to/torrent/browse';
        else if (base.includes('artstation')) btn.href = 'https://www.artstation.com/';
        else if (base.includes('sketchfab')) btn.href = 'https://sketchfab.com/';
      }
    });
  };

  assetQuery.addEventListener('input', updateRepoLinks);

  assetClear.addEventListener('click', () => {
    assetQuery.value = '';
    assetQuery.focus();
    updateRepoLinks();
  });

  chipBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      assetQuery.value = chip.dataset.preset;
      updateRepoLinks();
      assetQuery.focus();
    });
  });

  // Bind Resolution Calc events
  const inputW = container.querySelector('#calc-width');
  const inputH = container.querySelector('#calc-height');
  const outRatio = container.querySelector('#calc-ratio-out');
  const btnCopyRes = container.querySelector('#btn-copy-res');

  const updateRes = () => {
    const w = parseFloat(inputW.value) || 0;
    const h = parseFloat(inputH.value) || 0;
    if (w <= 0 || h <= 0) {
      outRatio.textContent = 'Invalid dimensions';
      return;
    }
    const mp = ((w * h) / 1000000).toFixed(2);
    // gcd
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const d = gcd(Math.round(w), Math.round(h));
    const rW = Math.round(w / d);
    const rH = Math.round(h / d);
    outRatio.textContent = `${rW}:${rH} · ${mp} MP`;
  };

  inputW.addEventListener('input', updateRes);
  inputH.addEventListener('input', updateRes);

  container.querySelectorAll('.preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      inputW.value = btn.dataset.w;
      inputH.value = btn.dataset.h;
      updateRes();
    });
  });

  btnCopyRes.addEventListener('click', async () => {
    await navigator.clipboard.writeText(`${inputW.value}x${inputH.value}`);
    btnCopyRes.textContent = 'Copied!';
    setTimeout(() => { btnCopyRes.textContent = 'Copy W×H'; }, 1500);
  });

  // Bind Unit Converter events
  const inputUnitVal = container.querySelector('#unit-val');
  const selectUnitType = container.querySelector('#unit-type');
  const outUU = container.querySelector('#unit-uu-out');
  const btnCopyUU = container.querySelector('#btn-copy-uu');

  const updateUnit = () => {
    const val = parseFloat(inputUnitVal.value) || 0;
    const type = selectUnitType.value;
    let cm = 0;
    if (type === 'meters') cm = val * 100;
    else if (type === 'feet') cm = val * 30.48;
    else if (type === 'inches') cm = val * 2.54;
    else if (type === 'mm') cm = val / 10;

    const uu = Math.round(cm * 100) / 100;
    outUU.textContent = `${uu} uu (${uu} cm)`;
  };

  inputUnitVal.addEventListener('input', updateUnit);
  selectUnitType.addEventListener('change', updateUnit);

  btnCopyUU.addEventListener('click', async () => {
    const text = outUU.textContent.split(' ')[0];
    await navigator.clipboard.writeText(text);
    btnCopyUU.textContent = 'Copied!';
    setTimeout(() => { btnCopyUU.textContent = 'Copy uu'; }, 1500);
  });
}
