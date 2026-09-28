/**
 * utilities.js
 * Tab 4: Utilities, Smart Meter & Network Management Hub
 * 
 * Features:
 * 1. Live DPDC Smart Prepaid Telemetry (Auto-sync from Firestore dpdc-balance-tracker-b2099):
 *    - Real meter logged balance (৳1,484.26) with sync timestamp.
 *    - Real-time estimated live balance accounting for elapsed hours.
 *    - Accurate historical daily burn rate (৳99.4/day derived from 126 records).
 *    - Days remaining countdown with Nothing Tech status LED.
 *    - Target recharge date projection and recent recharges strip.
 *    - 1-click cloud refresh with manual simulator fallback.
 * 2. Dual-Route Network & Infrastructure Console:
 *    - Real-time ping probes: Local ASUS Gateway (192.168.50.1), Dhaka BDIX (mimebd.com),
 *      Global Edge (1.1.1.1), and Subsea Transit (8.8.8.8).
 *    - Route integrity diagnostics (Optimal, BDIX Degraded, Subsea Spike).
 *    - Direct portals for MiME Fiber Self-Care and ASUS Router Admin.
 * 3. Daily Quran & Spiritual Reflection.
 */

import { store } from '../core/store.js';
import { fetchLiveDPDC, getCachedDPDC } from '../services/dpdc.js';

export function renderUtilities(container) {
  // Read initial cached state for 0ms instant display
  const cached = getCachedDPDC();
  const initialBalance = cached ? cached.liveBalance : (store.state.dpdcBalance || 1484.26);
  const initialRawBalance = cached ? cached.rawBalance : (store.state.dpdcBalance || 1484.26);
  const initialBurn = cached ? cached.burnRate : (store.state.dpdcBurnRate || 99.4);
  const initialFixed = store.state.dpdcFixed || 150;
  const initialDate = cached ? cached.fetchedAt.slice(0, 10) : (store.state.dpdcDate || new Date().toISOString().slice(0, 10));

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Header -->
      <div class="hero-header" style="margin-bottom: 0;">
        <div style="padding: 16px 24px; display: flex; align-items: center; gap: 14px;">
          <span class="nothing-led"></span>
          <div>
            <div class="card-title" style="font-size: 16px; letter-spacing: 0.5px;">Utilities, Smart Meter & Network Console</div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
              DPDC Smart Prepaid Cloud Sync · MiME Fiber · Dual-Route BDIX Telemetry
            </div>
          </div>
        </div>
        <div style="padding: 16px 24px; display: flex; align-items: center; border-left: 1px solid var(--border-subtle);">
          <span class="card-badge" style="color: var(--text-primary);">Network & Energy</span>
        </div>
      </div>

      <!-- Edge-to-Edge Bento Grid -->
      <div class="bento-grid">
        <!-- 1. DPDC Smart Prepaid Cloud Monitor (Span-6) -->
        <div class="bento-card span-6">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill" style="color: var(--amber-primary);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </span>
              <span class="card-title">DPDC Prepaid Meter Telemetry</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="card-badge" id="dpdc-cloud-status" style="font-size: 10px; display: inline-flex; align-items: center; gap: 5px;">
                <span class="status-dot online" id="dpdc-sync-dot"></span>
                <span id="dpdc-sync-label">Cloud Live</span>
              </span>
              <button class="icon-tiny-btn" id="btn-dpdc-refresh" title="Sync Live Balance from Cloud Tracker">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="icon-dpdc-spin">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
              </button>
              <a href="https://dpdc-balance-tracker-b2099.web.app/" target="_blank" rel="noopener noreferrer" class="icon-tiny-btn" title="Open Full CAD Tracker Web App">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>

          <!-- Account Meta Strip -->
          <div style="padding: 6px 12px; margin-bottom: 12px; background: var(--bg-recessed); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 11px;">
            <span style="color: var(--text-primary); font-weight: 600;" id="dpdc-account-title">Account: 35348946 · MOHAMMED ANAR KHAN</span>
            <span style="color: var(--text-muted);" id="dpdc-meter-meta">Pre Paid · Active</span>
          </div>

          <!-- Main DPDC Metrics Display -->
          <div class="dpdc-calculator" style="gap: 12px;">
            <!-- Primary Live Balance & Days Remaining -->
            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px;">
              <div class="metric-card" style="padding: 14px 16px;">
                <div class="metric-label" style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Estimated Live Balance</span>
                  <span style="font-size: 9px; font-family: var(--font-mono); color: var(--emerald-primary); background: rgba(14, 184, 126, 0.1); padding: 1px 6px; border-radius: 3px;">Real-Time</span>
                </div>
                <div class="metric-val" id="dpdc-live-out" style="font-size: 26px; font-weight: 800; color: var(--text-primary); margin-top: 4px;">৳${Math.round(initialBalance).toLocaleString()}</div>
                <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 4px;" id="dpdc-raw-reading-sub">
                  Reading Logged: ৳${initialRawBalance.toFixed(2)}
                </div>
              </div>

              <div class="metric-card" style="padding: 14px 16px;">
                <div class="metric-label" style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Days Remaining</span>
                  <span id="dpdc-status-led" class="nothing-led" style="display: none;"></span>
                </div>
                <div class="metric-val" id="dpdc-days-out" style="font-size: 26px; font-weight: 800; color: var(--emerald-primary); margin-top: 4px;">-- days</div>
                <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 4px;" id="dpdc-recharge-date-out">
                  Recharge: --
                </div>
              </div>
            </div>

            <!-- Secondary Metrics: Effective Daily Burn & Last Reading Timestamp -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="metric-card" style="padding: 10px 14px;">
                <div class="metric-label">Historical Daily Burn</div>
                <div style="font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: var(--text-primary); margin-top: 3px;" id="dpdc-effective-out">৳${initialBurn.toFixed(1)} / day</div>
                <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 2px;">Derived from meter logs</div>
              </div>
              <div class="metric-card" style="padding: 10px 14px;">
                <div class="metric-label">Last Cloud Sync</div>
                <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 4px;" id="dpdc-elapsed-info">Checking cloud...</div>
                <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 2px;" id="dpdc-exact-timestamp">--</div>
              </div>
            </div>

            <!-- Recent Recharges Mini-Strip -->
            <div style="background: var(--bg-recessed); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 8px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 10px; font-family: var(--font-mono); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Recent Recharges:</span>
                <span style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted);" id="dpdc-recharges-count">3 Logged</span>
              </div>
              <div id="dpdc-recent-recharges-list" style="display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 11px;">
                <div style="color: var(--text-muted); font-size: 10px;">Loading recharge records...</div>
              </div>
            </div>

            <!-- Collapsible Simulator Toggle -->
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 2px;">
              <button id="btn-toggle-dpdc-sim" style="background: transparent; border: none; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 2px 0;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="icon-sim-caret"><path d="m9 18 6-6-6-6"/></svg>
                <span>Manual Adjustment & Simulator Mode</span>
              </button>

              <div id="dpdc-sim-panel" style="display: none; flex-direction: column; gap: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-subtle);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Override Balance (৳)</label>
                    <input type="number" id="dpdc-balance-input" class="calc-input" value="${initialRawBalance}" step="10" style="width: 100%;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Override Burn (৳/day)</label>
                    <input type="number" id="dpdc-burn-input" class="calc-input" value="${initialBurn}" step="1" style="width: 100%;" />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Fixed Monthly Charges (৳)</label>
                    <input type="number" id="dpdc-fixed-input" class="calc-input" value="${initialFixed}" step="10" style="width: 100%;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Reading Timestamp</label>
                    <input type="date" id="dpdc-date-input" class="calc-input" value="${initialDate}" style="width: 100%;" />
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button class="btn-secondary" id="btn-dpdc-log-today" style="font-size: 10px; padding: 4px 10px;">Log Today's Reading</button>
                  <button class="btn-secondary" id="btn-dpdc-reset-cloud" style="font-size: 10px; padding: 4px 10px; color: var(--cyan-primary);">Reset to Cloud Sync</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Broadband ISP & Dual-Route Network Gateway (Span-6) -->
        <div class="bento-card span-6">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill" style="color: var(--cyan-primary);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                  <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
              </span>
              <span class="card-title">Broadband ISP & Network Telemetry</span>
            </div>
            <span class="card-badge" id="net-route-status-badge">Dual-Route Probed</span>
          </div>

          <!-- Dual-Route Latency Diagnostic Matrix -->
          <div style="background: var(--bg-recessed); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 12px 14px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 10px; font-family: var(--font-mono); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Live Route Diagnostics:</span>
              <span id="net-route-label" style="font-size: 10px; font-family: var(--font-mono); color: var(--emerald-primary); font-weight: 600;">Optimal (BDIX & Global Normal)</span>
            </div>

            <!-- 4-Node Latency Strip -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
              <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 6px 8px; text-align: center;">
                <div style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">Router</div>
                <div style="font-size: 14px; font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); margin-top: 2px;" id="node-latency-gw">1 ms</div>
                <div style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">192.168.50.1</div>
              </div>

              <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 6px 8px; text-align: center;">
                <div style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">Dhaka BDIX</div>
                <div style="font-size: 14px; font-family: var(--font-mono); font-weight: 700; color: var(--emerald-primary); margin-top: 2px;" id="node-latency-bdix">2 ms</div>
                <div style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">mimebd.com</div>
              </div>

              <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 6px 8px; text-align: center;">
                <div style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">Global Edge</div>
                <div style="font-size: 14px; font-family: var(--font-mono); font-weight: 700; color: var(--cyan-primary); margin-top: 2px;" id="node-latency-edge">3 ms</div>
                <div style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">1.1.1.1 DNS</div>
              </div>

              <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 6px 8px; text-align: center;">
                <div style="font-size: 9px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">Subsea Transit</div>
                <div style="font-size: 14px; font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); margin-top: 2px;" id="node-latency-intl">30 ms</div>
                <div style="font-size: 8px; color: var(--text-muted); font-family: var(--font-mono);">8.8.8.8 Google</div>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- MiME Fiber Internet Portal -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: var(--bg-recessed); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-recessed-sm);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="https://www.google.com/s2/favicons?domain=mimebd.com&sz=128" style="width: 28px; height: 28px; border-radius: 4px; object-fit: contain;" alt="" />
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); letter-spacing: 0.3px;">MiME Internet Self-Care</div>
                  <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">myportal.mimebd.com · BDIX Peered</div>
                </div>
              </div>
              <a href="https://myportal.mimebd.com/login" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="border-color: var(--border-medium);">
                <span>Login Portal</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>

            <!-- ASUS Router Admin Gateway (192.168.50.1) -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: var(--bg-recessed); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-recessed-sm);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 28px; height: 28px; border-radius: 4px; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-subtle);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6.01" y2="6"></line>
                    <line x1="6" y1="18" x2="6.01" y2="18"></line>
                  </svg>
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); letter-spacing: 0.3px; display: flex; align-items: center; gap: 6px;">
                    <span>ASUS Router Gateway</span>
                    <span class="card-badge" style="font-size: 9px; padding: 1px 5px;">Port 80</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">192.168.50.1 · router.asus.com</div>
                </div>
              </div>
              <a href="http://192.168.50.1/" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="border-color: var(--nothing-red); color: var(--text-primary);">
                <span>Router Admin</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- 3. Daily Quran & Spiritual Reflection (Span-12) -->
        <div class="bento-card span-12">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </span>
              <span class="card-title">Daily Quran & Reflections</span>
            </div>
            <a href="https://quran.com/" target="_blank" rel="noopener noreferrer" class="btn-secondary">
              <span>Quran.com</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          <div style="background: var(--bg-recessed); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 18px 20px; box-shadow: var(--shadow-recessed);">
            <div style="font-family: 'Amiri', serif, var(--font-display); font-size: 22px; line-height: 1.8; color: var(--text-primary); text-align: right; margin-bottom: 8px;">
              فَإِنَّ مَعَ الْعُسْرِ يُسْرًا · إِنَّ مَعَ الْعُسْرِ يُسْرًا
            </div>
            <div style="font-size: 13px; font-style: italic; color: var(--text-secondary); line-height: 1.5;">
              "For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease."
            </div>
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 6px; text-transform: uppercase;">
              Surah Ash-Sharh (94:5-6)
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // UI Element Selectors
  const outLive = container.querySelector('#dpdc-live-out');
  const outDays = container.querySelector('#dpdc-days-out');
  const outRawReading = container.querySelector('#dpdc-raw-reading-sub');
  const outRechargeDate = container.querySelector('#dpdc-recharge-date-out');
  const outEffective = container.querySelector('#dpdc-effective-out');
  const outElapsedInfo = container.querySelector('#dpdc-elapsed-info');
  const outExactTimestamp = container.querySelector('#dpdc-exact-timestamp');
  const statusLed = container.querySelector('#dpdc-status-led');
  const syncLabel = container.querySelector('#dpdc-sync-label');
  const syncDot = container.querySelector('#dpdc-sync-dot');
  const spinIcon = container.querySelector('#icon-dpdc-spin');
  const btnRefresh = container.querySelector('#btn-dpdc-refresh');
  const accountTitle = container.querySelector('#dpdc-account-title');
  const rechargesListEl = container.querySelector('#dpdc-recent-recharges-list');

  // Simulator Inputs
  const btnToggleSim = container.querySelector('#btn-toggle-dpdc-sim');
  const simPanel = container.querySelector('#dpdc-sim-panel');
  const inputBal = container.querySelector('#dpdc-balance-input');
  const inputBurn = container.querySelector('#dpdc-burn-input');
  const inputFixed = container.querySelector('#dpdc-fixed-input');
  const inputDate = container.querySelector('#dpdc-date-input');
  const btnLogToday = container.querySelector('#btn-dpdc-log-today');
  const btnResetCloud = container.querySelector('#btn-dpdc-reset-cloud');

  // Network Telemetry Elements
  const nodeGw = container.querySelector('#node-latency-gw');
  const nodeBdix = container.querySelector('#node-latency-bdix');
  const nodeEdge = container.querySelector('#node-latency-edge');
  const nodeIntl = container.querySelector('#node-latency-intl');
  const netLabel = container.querySelector('#net-route-label');
  const netBadge = container.querySelector('#net-route-status-badge');

  /**
   * Render metrics from processed DPDC data object
   */
  function applyDPDCMetrics(data) {
    if (!data) return;

    // 1. Live Estimated Balance
    const liveVal = data.liveBalance !== undefined ? data.liveBalance : data.rawBalance;
    if (outLive) outLive.textContent = `৳${Math.round(liveVal).toLocaleString()}`;
    if (outRawReading) {
      outRawReading.textContent = `Meter Reading Logged: ৳${(data.rawBalance || 0).toFixed(2)}`;
    }

    // 2. Days Remaining & LED Status
    const days = data.daysRemaining !== undefined ? data.daysRemaining : 0;
    if (outDays) {
      outDays.textContent = `${days.toFixed(1)} days`;
      if (days < 5) {
        outDays.style.color = 'var(--nothing-red)';
        if (statusLed) statusLed.style.display = 'inline-block';
      } else if (days < 10) {
        outDays.style.color = 'var(--amber-primary)';
        if (statusLed) statusLed.style.display = 'none';
      } else {
        outDays.style.color = 'var(--emerald-primary)';
        if (statusLed) statusLed.style.display = 'none';
      }
    }

    // 3. Recharge Date
    if (outRechargeDate && data.projectedRechargeDate) {
      outRechargeDate.textContent = `Target Recharge: ${data.projectedRechargeDate}`;
    }

    // 4. Burn Rate
    if (outEffective && data.burnRate) {
      outEffective.textContent = `৳${data.burnRate.toFixed(1)} / day`;
    }

    // 5. Elapsed Time & Timestamp
    if (data.fetchedAt) {
      const syncDate = new Date(data.fetchedAt);
      const now = new Date();
      const hoursDiff = Math.max(0, Math.round((now - syncDate) / (1000 * 60 * 60)));
      if (outElapsedInfo) {
        if (hoursDiff === 0) {
          outElapsedInfo.textContent = 'Synced just now';
        } else if (hoursDiff < 24) {
          outElapsedInfo.textContent = `Synced ${hoursDiff} hour${hoursDiff === 1 ? '' : 's'} ago`;
        } else {
          const daysAgo = Math.floor(hoursDiff / 24);
          outElapsedInfo.textContent = `Synced ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
        }
      }
      if (outExactTimestamp) {
        outExactTimestamp.textContent = syncDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    // 6. Account Information
    if (accountTitle && data.accountInfo) {
      accountTitle.textContent = `Account: ${data.accountInfo.customer_number || '35348946'} · ${data.accountInfo.customer_name || 'MOHAMMED ANAR KHAN'}`;
    }

    // 7. Recent Recharges
    if (rechargesListEl && data.recentRecharges && data.recentRecharges.length > 0) {
      rechargesListEl.innerHTML = data.recentRecharges.map(r => `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding: 3px 0;">
          <span style="color: var(--text-primary); font-weight: 600;">৳${r.amount.toLocaleString()}</span>
          <span style="color: var(--text-muted); font-size: 10px;">${r.date.slice(0, 10)} · ${r.mode || 'bKash'}</span>
        </div>
      `).join('');
    }

    // 8. Update Simulator Inputs
    if (inputBal) inputBal.value = data.rawBalance || 1484.26;
    if (inputBurn) inputBurn.value = data.burnRate || 99.4;
    if (inputDate && data.fetchedAt) inputDate.value = data.fetchedAt.slice(0, 10);
  }

  // Load from cache first
  if (cached) {
    applyDPDCMetrics(cached);
  }

  // Trigger live cloud sync
  async function performCloudSync(force = false) {
    if (syncLabel) syncLabel.textContent = 'Syncing...';
    if (syncDot) syncDot.className = 'status-dot yellow';
    if (spinIcon) spinIcon.style.animation = 'spin 1s linear infinite';

    try {
      const liveData = await fetchLiveDPDC(force);
      applyDPDCMetrics(liveData);
      if (syncLabel) syncLabel.textContent = liveData.status === 'live' ? 'Cloud Live' : 'Cached Data';
      if (syncDot) syncDot.className = liveData.status === 'live' ? 'status-dot online' : 'status-dot yellow';
    } catch (err) {
      console.warn('[Deck Utilities] Sync error:', err);
      if (syncLabel) syncLabel.textContent = 'Sync Failed';
      if (syncDot) syncDot.className = 'status-dot offline';
    } finally {
      if (spinIcon) spinIcon.style.animation = 'none';
    }
  }

  // Initial cloud fetch
  performCloudSync(false);

  // Manual refresh button listener
  if (btnRefresh) {
    btnRefresh.addEventListener('click', (e) => {
      e.preventDefault();
      performCloudSync(true);
    });
  }

  // Simulator Toggle
  if (btnToggleSim && simPanel) {
    btnToggleSim.addEventListener('click', () => {
      const isVisible = simPanel.style.display === 'flex';
      simPanel.style.display = isVisible ? 'none' : 'flex';
      const caret = btnToggleSim.querySelector('#icon-sim-caret');
      if (caret) caret.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
    });
  }

  // Manual Calculation Simulator Logic
  const updateManualSim = () => {
    const bal = parseFloat(inputBal.value) || 0;
    const burn = parseFloat(inputBurn.value) || 1;
    const fixed = parseFloat(inputFixed.value) || 0;
    const readingDateStr = inputDate.value || new Date().toISOString().slice(0, 10);

    const dailyFixed = fixed / 30;
    const effectiveBurn = Math.round((burn + dailyFixed) * 100) / 100;

    const readingDate = new Date(readingDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - readingDate.getTime();
    const daysSince = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const liveBal = Math.max(0, Math.round(bal - (daysSince * effectiveBurn)));
    const daysRem = Math.max(0, Math.floor(liveBal / effectiveBurn));

    if (outLive) outLive.textContent = `৳${liveBal.toLocaleString()}`;
    if (outDays) {
      outDays.textContent = `${daysRem} days`;
      outDays.style.color = daysRem < 5 ? 'var(--nothing-red)' : (daysRem < 10 ? 'var(--amber-primary)' : 'var(--emerald-primary)');
    }
    if (outEffective) outEffective.textContent = `৳${effectiveBurn.toFixed(1)} / day`;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRem);
    if (outRechargeDate) {
      outRechargeDate.textContent = `Target Recharge: ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}`;
    }

    store.saveDPDCMetrics(bal, burn, fixed, readingDateStr);
  };

  if (inputBal) inputBal.addEventListener('input', updateManualSim);
  if (inputBurn) inputBurn.addEventListener('input', updateManualSim);
  if (inputFixed) inputFixed.addEventListener('input', updateManualSim);
  if (inputDate) inputDate.addEventListener('change', updateManualSim);

  if (btnLogToday) {
    btnLogToday.addEventListener('click', () => {
      inputDate.value = new Date().toISOString().slice(0, 10);
      updateManualSim();
    });
  }

  if (btnResetCloud) {
    btnResetCloud.addEventListener('click', () => {
      performCloudSync(true);
    });
  }

  // Network Telemetry Listener (From bridge.py)
  function handleNetworkTelemetry(stats) {
    if (!stats) return;
    const net = stats.network;
    if (net) {
      if (nodeGw) nodeGw.textContent = net.gateway_ping_ms !== null && net.gateway_ping_ms !== undefined ? `${net.gateway_ping_ms} ms` : '--';
      if (nodeBdix) nodeBdix.textContent = net.bdix_ping_ms !== null && net.bdix_ping_ms !== undefined ? `${net.bdix_ping_ms} ms` : '--';
      if (nodeEdge) nodeEdge.textContent = net.edge_ping_ms !== null && net.edge_ping_ms !== undefined ? `${net.edge_ping_ms} ms` : (stats.ping_ms ? `${stats.ping_ms} ms` : '--');
      if (nodeIntl) nodeIntl.textContent = net.int_ping_ms !== null && net.int_ping_ms !== undefined ? `${net.int_ping_ms} ms` : '--';

      if (netLabel && net.route_label) {
        netLabel.textContent = net.route_label;
        if (net.route_status === 'optimal') {
          netLabel.style.color = 'var(--emerald-primary)';
        } else if (net.route_status === 'bdix_degraded' || net.route_status === 'cable_spike') {
          netLabel.style.color = 'var(--amber-primary)';
        } else {
          netLabel.style.color = 'var(--nothing-red)';
        }
      }

      if (netBadge) {
        netBadge.textContent = net.route_status === 'optimal' ? 'All Routes Optimal' : (net.route_status === 'bdix_degraded' ? 'BDIX Degraded' : 'Network Alert');
        netBadge.style.color = net.route_status === 'optimal' ? 'var(--emerald-primary)' : 'var(--amber-primary)';
      }
    }
  }

  // Subscribe to live bridge telemetry
  const telemetryHandler = (e) => {
    handleNetworkTelemetry(e.detail);
  };
  window.addEventListener('deck:bridge-telemetry', telemetryHandler);

  // Initial populate if bridge has last stats
  if (window.deckBridge && window.deckBridge.lastStats) {
    handleNetworkTelemetry(window.deckBridge.lastStats);
  }

  // Cleanup on unmount
  container._cleanup = () => {
    window.removeEventListener('deck:bridge-telemetry', telemetryHandler);
  };
}

export default {
  id: 'tab-utilities',
  title: 'Utilities & Life',
  icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>`,
  async mount(container) {
    renderUtilities(container);
  },
  async unmount(container) {
    if (container._cleanup) container._cleanup();
  }
};
