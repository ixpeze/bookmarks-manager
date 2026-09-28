/**
 * dpdc.js
 * Deck — DPDC Smart Prepaid Meter Telemetry Service
 * 
 * Fetches real-time meter readings and recharge logs directly from the
 * dpdc-balance-tracker Firestore REST API (dpdc-balance-tracker-b2099).
 * Computes exact historical burn rates, elapsed consumption, live estimated balance,
 * and projected recharge dates with zero cloud dependencies.
 */

import { store } from '../core/store.js';

const FIREBASE_PROJECT_ID = 'dpdc-balance-tracker-b2099';
const FIRESTORE_BALANCE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/balance_history?pageSize=1000`;
const FIRESTORE_RECHARGE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/recharge_history?pageSize=1000`;

const CACHE_KEY = 'deck_dpdc_cloud_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

/**
 * Fetch and process live DPDC telemetry
 * @param {boolean} force - Skip cache TTL check if true
 * @returns {Promise<Object>} Processed DPDC metrics
 */
export async function fetchLiveDPDC(force = false) {
  // Check local cache if not forced
  if (!force) {
    const cached = getCachedDPDC();
    if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
      // Recompute real-time elapsed balance from cached baseline
      return recomputeRealtime(cached);
    }
  }

  try {
    const [balResponse, recResponse] = await Promise.all([
      fetch(FIRESTORE_BALANCE_URL, { cache: 'no-cache' }),
      fetch(FIRESTORE_RECHARGE_URL, { cache: 'no-cache' })
    ]);

    if (!balResponse.ok || !recResponse.ok) {
      throw new Error(`Firestore HTTP error: balance=${balResponse.status}, recharge=${recResponse.status}`);
    }

    const balData = await balResponse.json();
    const recData = await recResponse.json();

    const rawRecords = balData.documents || [];
    const rawRecharges = recData.documents || [];

    if (rawRecords.length === 0) {
      throw new Error('No balance documents returned from Firestore.');
    }

    const processed = processFirestoreData(rawRecords, rawRecharges);
    processed.cachedAt = Date.now();
    processed.status = 'live';

    // Persist to local cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(processed));
    } catch (_) {}

    // Update global store state for reactive subscribers
    store.saveDPDCMetrics(
      processed.rawBalance,
      processed.burnRate,
      store.state.dpdcFixed || 150,
      processed.fetchedAt.slice(0, 10)
    );
    store.emit('dpdc:updated', processed);

    return processed;
  } catch (err) {
    console.warn('[Deck DPDC] Live sync failed, falling back to cache:', err);
    const cached = getCachedDPDC();
    if (cached) {
      const fallback = recomputeRealtime(cached);
      fallback.status = 'cached';
      fallback.error = err.message;
      return fallback;
    }
    return {
      status: 'offline',
      error: err.message,
      rawBalance: store.state.dpdcBalance || 1484.26,
      liveBalance: store.state.dpdcBalance || 1484.26,
      burnRate: store.state.dpdcBurnRate || 99.4,
      daysRemaining: 14.3,
      fetchedAt: store.state.dpdcDate || new Date().toISOString(),
      accountInfo: { customer_number: '35348946', customer_name: 'MOHAMMED ANAR KHAN' }
    };
  }
}

/**
 * Read cached telemetry from localStorage
 */
export function getCachedDPDC() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Recompute real-time elapsed balance and days remaining on top of cached baseline
 */
function recomputeRealtime(cached) {
  if (!cached || !cached.fetchedAt) return cached;
  const now = new Date();
  const lastSync = new Date(cached.fetchedAt);
  const daysSince = Math.max(0, (now - lastSync) / (1000 * 60 * 60 * 24));
  const burn = cached.burnRate || 99.4;
  const liveBal = Math.max(0, Math.round((cached.rawBalance - (daysSince * burn)) * 100) / 100);
  const daysRem = burn > 0 ? Math.max(0, Math.round((liveBal / burn) * 10) / 10) : 0;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysRem);

  return {
    ...cached,
    daysSinceSync: Math.round(daysSince * 100) / 100,
    liveBalance: liveBal,
    daysRemaining: daysRem,
    projectedRechargeDate: targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
  };
}

/**
 * Parse and process raw balance & recharge Firestore collections
 */
function processFirestoreData(rawRecords, rawRecharges) {
  // 1. Parse balance records
  const parsedBalance = rawRecords.map(doc => {
    const fields = doc.fields || {};
    const tsField = fields.fetched_at || {};
    return {
      fetched_at: tsField.timestampValue || tsField.stringValue || '',
      account_id: fields.account_id?.stringValue || '',
      customer_number: fields.customer_number?.stringValue || '',
      customer_name: fields.customer_name?.stringValue || '',
      customer_class: fields.customer_class?.stringValue || '',
      account_type: fields.account_type?.stringValue || '',
      balance_remaining: parseFloat(fields.balance_remaining?.doubleValue || fields.balance_remaining?.integerValue || 0),
      connection_status: fields.connection_status?.stringValue || 'Active',
      mobile_number: fields.mobile_number?.stringValue || '',
      email_id: fields.email_id?.stringValue || ''
    };
  }).sort((a, b) => new Date(a.fetched_at) - new Date(b.fetched_at));

  // 2. Filter out consecutive duplicate readings to isolate state changes
  const filteredTimeline = [];
  let lastSeen = null;
  parsedBalance.forEach(p => {
    if (!lastSeen || Math.abs(lastSeen.balance_remaining - p.balance_remaining) > 0.01) {
      filteredTimeline.push(p);
      lastSeen = p;
    }
  });

  if (parsedBalance.length > 0) {
    const lastRec = parsedBalance[parsedBalance.length - 1];
    if (filteredTimeline.length === 0 || filteredTimeline[filteredTimeline.length - 1].fetched_at !== lastRec.fetched_at) {
      filteredTimeline.push(lastRec);
    }
  }

  // 3. Parse recharge history
  const rechargeHistory = rawRecharges.map(doc => {
    const fields = doc.fields || {};
    return {
      date: fields.date?.stringValue || '',
      amount: parseFloat(fields.amount?.doubleValue || fields.amount?.integerValue || 0),
      mode: fields.mode?.stringValue || 'N/A',
      source: fields.source?.stringValue || 'N/A',
      txn_id: fields.txn_id?.stringValue || 'N/A',
      pay_id: fields.pay_id?.stringValue || 'N/A',
      energy_cost: parseFloat(fields.energy_cost?.doubleValue || fields.energy_cost?.integerValue || 0),
      vat: parseFloat(fields.vat?.doubleValue || fields.vat?.integerValue || 0),
      rebate: parseFloat(fields.rebate?.doubleValue || fields.rebate?.integerValue || 0)
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // 4. Calculate accurate historical daily burn rate
  let totalConsumption = 0;
  let totalDays = 0;

  for (let i = 1; i < filteredTimeline.length; i++) {
    const prev = filteredTimeline[i - 1];
    const curr = filteredTimeline[i];
    const daysDiff = (new Date(curr.fetched_at) - new Date(prev.fetched_at)) / (1000 * 60 * 60 * 24);

    if (daysDiff > 0) {
      let recharges = 0;
      const rechargesList = rechargeHistory.filter(r => {
        return new Date(r.date).toDateString() === new Date(curr.fetched_at).toDateString();
      });

      const balanceRose = curr.balance_remaining > prev.balance_remaining;
      const recovered = prev.balance_remaining < 0 && curr.balance_remaining > 0;
      if (balanceRose || recovered) {
        recharges = rechargesList.reduce((sum, r) => sum + r.amount, 0);
      }

      const netConsumption = prev.balance_remaining + recharges - curr.balance_remaining;
      if (netConsumption > 0.05) {
        totalConsumption += netConsumption;
        totalDays += daysDiff;
      }
    }
  }

  const burnRate = totalDays > 0 ? Math.round((totalConsumption / totalDays) * 100) / 100 : 99.4;

  // 5. Extract latest reading and project real-time balance
  const latest = filteredTimeline[filteredTimeline.length - 1] || {};
  const rawBalance = latest.balance_remaining || 0;
  const fetchedAt = latest.fetched_at || new Date().toISOString();

  const now = new Date();
  const lastSyncDate = new Date(fetchedAt);
  const daysSinceSync = Math.max(0, (now - lastSyncDate) / (1000 * 60 * 60 * 24));
  const liveBalance = Math.max(0, Math.round((rawBalance - (daysSinceSync * burnRate)) * 100) / 100);
  const daysRemaining = burnRate > 0 ? Math.max(0, Math.round((liveBalance / burnRate) * 10) / 10) : 0;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysRemaining);

  return {
    rawBalance,
    liveBalance,
    burnRate,
    daysSinceSync: Math.round(daysSinceSync * 100) / 100,
    daysRemaining,
    fetchedAt,
    projectedRechargeDate: targetDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }),
    accountInfo: {
      customer_number: latest.customer_number || '35348946',
      customer_name: latest.customer_name || 'MOHAMMED ANAR KHAN',
      account_id: latest.account_id || '4835412344',
      account_type: latest.account_type || 'Pre Paid',
      customer_class: latest.customer_class || 'Private',
      connection_status: latest.connection_status || 'Active',
      mobile_number: latest.mobile_number || ''
    },
    recentRecharges: rechargeHistory.slice(0, 3)
  };
}
