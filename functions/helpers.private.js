// Shared helpers (PRIVATE function — not reachable by URL)
const LIST_NAME = 'bf-entries';

const LOCATIONS = {
  PV: 'Paradise Valley',
  CH: 'Chandler',
  SR: 'Salt River',
};

// Anything a staffer might type -> location code
const ALIASES = {
  pv: 'PV', paradise: 'PV', paradisevalley: 'PV', tatum: 'PV', tatumshea: 'PV',
  ch: 'CH', chan: 'CH', chandler: 'CH', ray: 'CH',
  sr: 'SR', salt: 'SR', saltriver: 'SR', river: 'SR', scottsdale: 'SR', scotts: 'SR',
};

const MAX_PER_TEXT = 20; // guards against typos like "+100 PV"

function matchLocation(raw) {
  const key = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
  return ALIASES[key] || null;
}

// Accepts "+1 PV", "+2 chandler", "PV +1", "-1 salt river", "+3sr"
function parseEntry(body) {
  const t = String(body || '').trim().replace(/\s+/g, ' ');
  let m = t.match(/^([+-]?\s*\d{1,3})\s*([a-z].*)$/i);
  let num, loc;
  if (m) { num = m[1]; loc = m[2]; }
  else {
    m = t.match(/^([a-z].*?)\s*([+-]?\s*\d{1,3})$/i);
    if (!m) return null;
    loc = m[1]; num = m[2];
  }
  const n = parseInt(num.replace(/\s/g, ''), 10);
  const code = matchLocation(loc);
  if (!code || !n || Math.abs(n) > MAX_PER_TEXT) return { error: true, n, code };
  return { n, code };
}

// Manager corrections: a bare number like "153" sets your own studio's total.
// Admins (or anyone setting a specific studio) use "SET PV 153" / "SET 153 PV".
const MAX_TOTAL = 5000;
function parseSetTotal(body) {
  const t = String(body || '').trim().replace(/\s+/g, ' ');
  let m = t.match(/^=?\s*(\d{1,4})$/);
  if (m) return { total: parseInt(m[1], 10), code: null };
  m = t.match(/^set\s+(.+)$/i);
  if (!m) return null;
  const rest = m[1];
  m = rest.match(/^(\d{1,4})$/);
  if (m) return { total: parseInt(m[1], 10), code: null };
  m = rest.match(/^(\d{1,4})\s*(.+)$/);
  if (m && matchLocation(m[2])) return { total: parseInt(m[1], 10), code: matchLocation(m[2]) };
  m = rest.match(/^(.+?)\s*(\d{1,4})$/);
  if (m && matchLocation(m[1])) return { total: parseInt(m[2], 10), code: matchLocation(m[1]) };
  return null;
}

function loadRoster() {
  try {
    const raw = Runtime.getAssets()['/roster.json'].open();
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function getList(context) {
  const svc = context.getTwilioClient().sync.v1.services(context.SYNC_SERVICE_SID);
  try {
    await svc.syncLists(LIST_NAME).fetch();
  } catch (e) {
    if (e.status === 404) await svc.syncLists.create({ uniqueName: LIST_NAME });
    else throw e;
  }
  return svc.syncLists(LIST_NAME);
}

async function allItems(listCtx) {
  return listCtx.syncListItems.list({ pageSize: 1000, order: 'asc' });
}

function goals(context) {
  return {
    PV: parseInt(context.GOAL_PV || '0', 10),
    CH: parseInt(context.GOAL_CH || '0', 10),
    SR: parseInt(context.GOAL_SR || '0', 10),
  };
}

function summarize(items, context) {
  const totals = { PV: 0, CH: 0, SR: 0 };
  const people = {};
  for (const it of items) {
    const d = it.data || {};
    if (!totals.hasOwnProperty(d.code)) continue;
    totals[d.code] += d.n;
    if (d.adjust) continue; // manager corrections change the studio total only
    const key = `${d.name}|${d.code}`;
    people[key] = people[key] || { name: d.name, code: d.code, total: 0 };
    people[key].total += d.n;
  }
  const g = goals(context);
  const locations = Object.keys(LOCATIONS)
    .map((code) => ({ code, name: LOCATIONS[code], total: totals[code], goal: g[code] }))
    .sort((a, b) => b.total - a.total);
  const leaders = Object.values(people)
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  const feed = items.filter((it) => !it.data.adjust).slice(-15).reverse().map((it) => ({
    name: it.data.name, code: it.data.code, n: it.data.n, ts: it.data.ts,
  }));
  return { locations, leaders, feed, updated: new Date().toISOString() };
}

function standingsLine(summary) {
  const medals = ['🥇', '🥈', '🥉'];
  return summary.locations.map((l, i) => `${medals[i]} ${l.name} ${l.total}`).join(' · ');
}

module.exports = {
  LOCATIONS, MAX_TOTAL, parseEntry, parseSetTotal, loadRoster, getList, allItems, summarize, standingsLine,
};
// Shared helpers (PRIVATE function — not reachable by URL)
const LIST_NAME = 'bf-entries';

const LOCATIONS = {
  PV: 'Paradise Valley',
  CH: 'Chandler',
  SR: 'Salt River',
};

// Anything a staffer might type -> location code
const ALIASES = {
  pv: 'PV', paradise: 'PV', paradisevalley: 'PV', tatum: 'PV', tatumshea: 'PV',
  ch: 'CH', chan: 'CH', chandler: 'CH', ray: 'CH',
  sr: 'SR', salt: 'SR', saltriver: 'SR', river: 'SR', scottsdale: 'SR', scotts: 'SR',
};

const MAX_PER_TEXT = 20; // guards against typos like "+100 PV"

function matchLocation(raw) {
  const key = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
  return ALIASES[key] || null;
}

// Accepts "+1 PV", "+2 chandler", "PV +1", "-1 salt river", "+3sr"
function parseEntry(body) {
  const t = String(body || '').trim().replace(/\s+/g, ' ');
  let m = t.match(/^([+-]\s*\d{1,3})\s*(.+)$/);
  let num, loc;
  if (m) { num = m[1]; loc = m[2]; }
  else {
    m = t.match(/^(.+?)\s*([+-]\s*\d{1,3})$/);
    if (!m) return null;
    loc = m[1]; num = m[2];
  }
  const n = parseInt(num.replace(/\s/g, ''), 10);
  const code = matchLocation(loc);
  if (!code || !n || Math.abs(n) > MAX_PER_TEXT) return { error: true, n, code };
  return { n, code };
}

function loadRoster() {
  try {
    const raw = Runtime.getAssets()['/roster.json'].open();
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function getList(context) {
  const svc = context.getTwilioClient().sync.v1.services(context.SYNC_SERVICE_SID);
  try {
    await svc.syncLists(LIST_NAME).fetch();
  } catch (e) {
    if (e.status === 404) await svc.syncLists.create({ uniqueName: LIST_NAME });
    else throw e;
  }
  return svc.syncLists(LIST_NAME);
}

async function allItems(listCtx) {
  return listCtx.syncListItems.list({ pageSize: 1000, order: 'asc' });
}

function goals(context) {
  return {
    PV: parseInt(context.GOAL_PV || '0', 10),
    CH: parseInt(context.GOAL_CH || '0', 10),
    SR: parseInt(context.GOAL_SR || '0', 10),
  };
}

function summarize(items, context) {
  const totals = { PV: 0, CH: 0, SR: 0 };
  const people = {};
  for (const it of items) {
    const d = it.data || {};
    if (!totals.hasOwnProperty(d.code)) continue;
    totals[d.code] += d.n;
    const key = `${d.name}|${d.code}`;
    people[key] = people[key] || { name: d.name, code: d.code, total: 0 };
    people[key].total += d.n;
  }
  const g = goals(context);
  const locations = Object.keys(LOCATIONS)
    .map((code) => ({ code, name: LOCATIONS[code], total: totals[code], goal: g[code] }))
    .sort((a, b) => b.total - a.total);
  const leaders = Object.values(people)
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  const feed = items.slice(-15).reverse().map((it) => ({
    name: it.data.name, code: it.data.code, n: it.data.n, ts: it.data.ts,
  }));
  return { locations, leaders, feed, updated: new Date().toISOString() };
}

function standingsLine(summary) {
  const medals = ['🥇', '🥈', '🥉'];
  return summary.locations.map((l, i) => `${medals[i]} ${l.name} ${l.total}`).join(' · ');
}

module.exports = {
  LOCATIONS, parseEntry, loadRoster, getList, allItems, summarize, standingsLine,
};
