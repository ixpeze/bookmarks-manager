/**
 * utilities.js
 * Tab 4: Utilities, Smart Meter & Network Management Hub
 */

import { store } from '../store.js';

export function renderUtilities(container) {
  const currentBalance = store.state.dpdcBalance || 2500;
  const currentBurnRate = store.state.dpdcBurnRate || 95;
  const currentFixed = store.state.dpdcFixed || 150;
  const currentReadingDate = store.state.dpdcDate || new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Hero Header -->
      <div class="hero-header" style="margin-bottom: 0;">
        <div style="padding: 16px 24px; display: flex; align-items: center; gap: 14px;">
          <span class="nothing-led"></span>
          <div>
            <div class="card-title" style="font-size: 16px; letter-spacing: 0.5px;">Utilities, Smart Meter & Network Console</div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
              DPDC Smart Prepaid Telemetry · MiME Fiber Selfcare · ASUS Gateway Admin
            </div>
          </div>
        </div>
        <div style="padding: 16px 24px; display: flex; align-items: center; border-left: 1px solid var(--border-subtle);">
          <span class="card-badge" style="color: var(--text-primary);">Network & Energy</span>
        </div>
      </div>

      <!-- Edge-to-Edge Bento Grid -->
      <div class="bento-grid">
        <!-- DPDC Smart Prepaid Meter Burn Rate Monitor (Span-6) -->
        <div class="bento-card span-6">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </span>
              <span class="card-title">DPDC Prepaid Meter Estimator</span>
            </div>
            <a href="https://dpdc-balance-tracker-b2099.web.app/" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="color: var(--text-primary);">
              <span>Open Tracker</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>

          <div class="dpdc-calculator">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Last Logged Balance (৳)</label>
                <input type="number" id="dpdc-balance-input" class="calc-input" value="${currentBalance}" step="50" style="width: 100%;" />
              </div>
              <div>
                <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Daily Burn (৳/day)</label>
                <input type="number" id="dpdc-burn-input" class="calc-input" value="${currentBurnRate}" step="5" style="width: 100%;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Fixed Monthly Charges (৳)</label>
                <input type="number" id="dpdc-fixed-input" class="calc-input" value="${currentFixed}" step="10" title="Meter Rent (৳40) + Demand Charge (৳70) + VAT" style="width: 100%;" />
              </div>
              <div>
                <label style="display: block; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Reading Timestamp</label>
                <input type="date" id="dpdc-date-input" class="calc-input" value="${currentReadingDate}" style="width: 100%;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px;">
              <div class="metric-card">
                <div class="metric-label" style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Days Remaining</span>
                  <span id="dpdc-status-led" class="nothing-led" style="display: none;"></span>
                </div>
                <div class="metric-val" id="dpdc-days-out">-- days</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Estimated Live Balance</div>
                <div class="metric-val" id="dpdc-live-out">--</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="metric-card" style="padding: 10px 14px;">
                <div class="metric-label">Effective Daily Cost</div>
                <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--text-primary); margin-top: 3px;" id="dpdc-effective-out">-- ৳/day</div>
              </div>
              <div class="metric-card" style="padding: 10px 14px;">
                <div class="metric-label">Target Recharge Date</div>
                <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--text-primary); margin-top: 3px;" id="dpdc-recharge-date-out">--</div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted);" id="dpdc-elapsed-info">Last logged today</span>
              <button class="btn-secondary" id="btn-dpdc-log-today" style="font-size: 10px; padding: 4px 10px;">Log Today's Reading</button>
            </div>
          </div>
        </div>

        <!-- Broadband ISP & Router Gateway (Span-6) -->
        <div class="bento-card span-6">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-icon-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                  <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                  <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
              </span>
              <span class="card-title">Broadband ISP & Network Gateway</span>
            </div>
            <span class="card-badge">Infrastructure</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- MiME Fiber Internet Portal -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: var(--bg-recessed); border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-recessed-sm);">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="https://www.google.com/s2/favicons?domain=mimebd.com&sz=128" style="width: 28px; height: 28px; border-radius: 4px; object-fit: contain;" alt="" />
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); letter-spacing: 0.3px;">MiME Internet Self-Care</div>
                  <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">myportal.mimebd.com</div>
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

        <!-- Daily Quran & Spiritual Reflection (Span-12) -->
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

  // Bind DPDC Calculation logic
  const inputBal = container.querySelector('#dpdc-balance-input');
  const inputBurn = container.querySelector('#dpdc-burn-input');
  const inputFixed = container.querySelector('#dpdc-fixed-input');
  const inputDate = container.querySelector('#dpdc-date-input');
  const btnLogToday = container.querySelector('#btn-dpdc-log-today');

  const outDays = container.querySelector('#dpdc-days-out');
  const outLive = container.querySelector('#dpdc-live-out');
  const outEffective = container.querySelector('#dpdc-effective-out');
  const outRechargeDate = container.querySelector('#dpdc-recharge-date-out');
  const outElapsedInfo = container.querySelector('#dpdc-elapsed-info');
  const statusLed = container.querySelector('#dpdc-status-led');

  const updateDPDC = () => {
    const bal = parseFloat(inputBal.value) || 0;
    const burn = parseFloat(inputBurn.value) || 1;
    const fixed = parseFloat(inputFixed.value) || 0;
    const readingDateStr = inputDate.value || new Date().toISOString().slice(0, 10);

    // Fixed charges per day (Meter Rent + Demand Charge + VAT / 30)
    const dailyFixed = fixed / 30;
    const effectiveBurn = Math.round((burn + dailyFixed) * 100) / 100;
    outEffective.textContent = `৳${effectiveBurn.toFixed(1)} / day`;

    // Calculate days elapsed since logged reading
    const readingDate = new Date(readingDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - readingDate.getTime();
    const daysSinceReading = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (daysSinceReading === 0) {
      outElapsedInfo.textContent = 'Reading logged today';
    } else if (daysSinceReading === 1) {
      outElapsedInfo.textContent = 'Reading logged 1 day ago';
    } else {
      outElapsedInfo.textContent = `Reading logged ${daysSinceReading} days ago`;
    }

    // Live estimated balance after elapsed burn
    const liveBal = Math.max(0, Math.round(bal - (daysSinceReading * effectiveBurn)));
    outLive.textContent = `৳${liveBal.toLocaleString()}`;

    // Days remaining from live estimated balance
    const daysRemaining = Math.max(0, Math.floor(liveBal / effectiveBurn));
    outDays.textContent = `${daysRemaining} days`;

    if (daysRemaining < 5) {
      outDays.style.color = 'var(--nothing-red)';
      statusLed.style.display = 'inline-block';
    } else if (daysRemaining < 10) {
      outDays.style.color = 'var(--amber-primary)';
      statusLed.style.display = 'none';
    } else {
      outDays.style.color = 'var(--emerald-primary)';
      statusLed.style.display = 'none';
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);
    outRechargeDate.textContent = targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });

    store.saveDPDCMetrics(bal, burn, fixed, readingDateStr);
  };

  inputBal.addEventListener('input', updateDPDC);
  inputBurn.addEventListener('input', updateDPDC);
  inputFixed.addEventListener('input', updateDPDC);
  inputDate.addEventListener('change', updateDPDC);

  btnLogToday.addEventListener('click', () => {
    inputDate.value = new Date().toISOString().slice(0, 10);
    updateDPDC();
  });

  updateDPDC();
}
