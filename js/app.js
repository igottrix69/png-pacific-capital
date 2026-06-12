/* ═══════════════════════════════════════════════════════════
   PNG PACIFIC CAPITAL — Application Layer
   Views · Charts · Forms · Alerts · Reports · Administration
   ═══════════════════════════════════════════════════════════ */
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const S = {
  view: 'dashboard', charts: [], pages: {}, pin: '', showPin: false,
  fails: 0, lockUntil: 0, purchTrend: 'M', lastActivity: Date.now(), timer: null,
};
const TBL = {};

/* ───── theming / chart palette ───── */
function cssVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }
function chartTheme() {
  return {
    text: cssVar('--muted'), grid: cssVar('--chart-grid'),
    accent: cssVar('--accent'), accent2: cssVar('--accent-2'),
    good: cssVar('--good'), warn: cssVar('--warn'), bad: cssVar('--bad'),
  };
}
function applyTheme() {
  document.body.dataset.theme = DB.settings.theme;
  $('#themeBtn').textContent = DB.settings.theme === 'dark' ? '🌙' : '☀️';
}
function kAbbr(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e6) return 'K' + (n / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return 'K' + (n / 1e3).toFixed(0) + 'k';
  return 'K' + n.toFixed(0);
}
function tAbbr(kg) { return ((Number(kg) || 0) / 1000).toFixed(0) + 't'; }

function destroyCharts() { S.charts.forEach(c => { try { c.destroy(); } catch (e) {} }); S.charts = []; }
function newChart(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return null;
  const th = chartTheme();
  cfg.options = cfg.options || {};
  cfg.options.responsive = true;
  cfg.options.maintainAspectRatio = false;
  cfg.options.plugins = Object.assign({ legend: { labels: { color: th.text, boxWidth: 12, font: { size: 11 } } } }, cfg.options.plugins || {});
  cfg.options.scales = cfg.options.scales || {};
  ['x', 'y'].forEach(ax => {
    if (cfg.options.scales[ax] === false) { delete cfg.options.scales[ax]; return; }
    cfg.options.scales[ax] = Object.assign({ ticks: { color: th.text, font: { size: 10.5 } }, grid: { color: th.grid } }, cfg.options.scales[ax] || {});
  });
  if (cfg.type === 'doughnut' || cfg.type === 'pie') delete cfg.options.scales;
  const ch = new Chart(el, cfg);
  S.charts.push(ch);
  return ch;
}
function grad(id, color) {
  const el = document.getElementById(id);
  if (!el) return color;
  const ctx = el.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 280);
  g.addColorStop(0, color + '55'); g.addColorStop(1, color + '03');
  return g;
}

/* ───── toast / modal ───── */
function toast(msg, kind = 'good') {
  const el = document.createElement('div');
  el.className = 'toast t-' + kind;
  el.innerHTML = (kind === 'good' ? '✅' : kind === 'bad' ? '⛔' : 'ℹ️') + '<span>' + msg + '</span>';
  $('#toastRoot').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3400);
}
function openModal(title, bodyHtml, onMount) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modalRoot').classList.remove('hidden');
  if (onMount) onMount();
}
function closeModal() { $('#modalRoot').classList.add('hidden'); $('#modalBody').innerHTML = ''; }

/* ───── generic paginated table ───── */
function tableShell(key, headers) {
  return `<div class="table-wrap"><table class="data"><thead><tr>${headers.map(h => `<th class="${h.num ? 'num' : ''}">${h.label}</th>`).join('')}</tr></thead><tbody id="tb-${key}"></tbody></table></div><div class="pager" id="pg-${key}"></div>`;
}
function bindTable(key, rowsFn, pageSize = 12) {
  TBL[key] = {
    refresh() {
      const rows = rowsFn();
      const page = Math.min(S.pages[key] || 0, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
      S.pages[key] = page;
      const slice = rows.slice(page * pageSize, page * pageSize + pageSize);
      const tb = document.getElementById('tb-' + key);
      if (!tb) return;
      tb.innerHTML = slice.join('') || `<tr><td colspan="20" class="t-muted" style="text-align:center;padding:22px">No records match.</td></tr>`;
      const pages = Math.max(1, Math.ceil(rows.length / pageSize));
      const pg = document.getElementById('pg-' + key);
      if (pg) pg.innerHTML = `<span>${rows.length.toLocaleString()} records</span>
        <button onclick="App.pg('${key}',-1)" ${page === 0 ? 'disabled' : ''}>‹ Prev</button>
        <span>Page ${page + 1} / ${pages}</span>
        <button onclick="App.pg('${key}',1)" ${page >= pages - 1 ? 'disabled' : ''}>Next ›</button>`;
    }
  };
  TBL[key].refresh();
}

/* ───── chips ───── */
function statusChip(status) {
  const map = {
    'Operational': 'good', 'Good': 'good', 'Completed': 'good', 'Delivered': 'good', 'Paid': 'good', 'Active': 'good', 'Success': 'good',
    'Maintenance Due': 'warn', 'Packed': 'warn', 'Loaded': 'warn', 'Processing': 'warn', 'Preparing': 'muted', 'Pending': 'warn', 'Inspection due': 'warn', 'Roof repair scheduled': 'warn',
    'Under Repair': 'bad', 'Out of Service': 'bad', 'Overdue': 'bad', 'Failed': 'bad', 'Inactive': 'muted',
    'In Transit': 'info',
  };
  const k = map[status] || 'info';
  return `<span class="chip chip-${k}"><i></i>${esc(status)}</span>`;
}

/* ═══════════ LOGIN ═══════════ */
function renderPin() {
  $$('#pinDots .pin-dot').forEach((d, i) => d.classList.toggle('filled', i < S.pin.length));
  $('#pinPlain').textContent = S.pin.padEnd(0, '');
  $('#pinPlain').classList.toggle('hidden', !S.showPin);
  $('#pinDots').classList.toggle('hidden', S.showPin);
}
function pinKey(k) {
  if (Date.now() < S.lockUntil) return;
  if (S.pin.length >= 4) return;
  S.pin += k; renderPin();
  if (S.pin.length === 4) setTimeout(tryLogin, 160);
}
function tryLogin() {
  const msg = $('#pinMsg');
  if (S.pin === DB.settings.pin) {
    msg.textContent = 'Access granted — welcome back';
    msg.classList.add('ok');
    DB.loginHistory.unshift({ time: new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }), user: 'Jarrod Hulo', result: 'Success' });
    if (DB.loginHistory.length > 60) DB.loginHistory.length = 60;
    audit('Logged in via PIN');
    sessionStorage.setItem('pngpc_auth', '1');
    setTimeout(() => { $('#loginScreen').classList.add('hidden'); $('#app').classList.remove('hidden'); startSession(); go('dashboard'); }, 420);
  } else {
    S.fails++;
    DB.loginHistory.unshift({ time: new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }), user: 'Unknown', result: 'Failed' });
    saveDB();
    msg.classList.remove('ok');
    if (S.fails >= 5) {
      S.lockUntil = Date.now() + 30000;
      msg.textContent = 'Too many attempts — locked for 30 seconds';
      setTimeout(() => { S.fails = 0; msg.textContent = ''; }, 30000);
    } else {
      msg.textContent = 'Incorrect PIN — ' + (5 - S.fails) + ' attempts remaining';
    }
    $('.login-card').classList.add('shake');
    setTimeout(() => $('.login-card').classList.remove('shake'), 450);
  }
  S.pin = ''; setTimeout(renderPin, 420);
}
function initLogin() {
  $$('.pin-key[data-key]').forEach(b => b.addEventListener('click', () => pinKey(b.dataset.key)));
  $('#pinBackBtn').addEventListener('click', () => { S.pin = S.pin.slice(0, -1); renderPin(); });
  $('#pinShowBtn').addEventListener('click', () => { S.showPin = !S.showPin; renderPin(); });
  $('#forgotPinBtn').addEventListener('click', () => {
    if (confirm('Reset PIN to the factory default (0000)?\n\nThis action is recorded in the audit trail.')) {
      DB.settings.pin = '0000'; audit('PIN reset to factory default via Forgot PIN');
      $('#pinMsg').classList.add('ok'); $('#pinMsg').textContent = 'PIN reset — default is 0000';
    }
  });
  document.addEventListener('keydown', e => {
    if (!$('#loginScreen').classList.contains('hidden')) {
      if (/^[0-9]$/.test(e.key)) pinKey(e.key);
      if (e.key === 'Backspace') { S.pin = S.pin.slice(0, -1); renderPin(); }
    }
  });
}
function logout(reason) {
  sessionStorage.removeItem('pngpc_auth');
  audit('Logged out' + (reason ? ' — ' + reason : ''));
  clearInterval(S.timer);
  $('#app').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  $('#pinMsg').textContent = reason || '';
  $('#pinMsg').classList.remove('ok');
  S.pin = ''; renderPin();
}
function startSession() {
  S.lastActivity = Date.now();
  ['click', 'keydown', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, () => S.lastActivity = Date.now(), { passive: true }));
  clearInterval(S.timer);
  S.timer = setInterval(() => {
    const limit = (DB.settings.timeoutMin || 15) * 60000;
    if (Date.now() - S.lastActivity > limit) logout('Session timed out after ' + DB.settings.timeoutMin + ' min of inactivity');
  }, 15000);
}

/* ═══════════ SHELL ═══════════ */
function initShell() {
  $('#homeLogo').addEventListener('click', () => go('dashboard'));
  $$('.nav-item').forEach(b => b.addEventListener('click', () => { go(b.dataset.view); closeSidebar(); }));
  $('#settingsBtn').addEventListener('click', () => go('admin'));
  $('#logoutBtn').addEventListener('click', () => logout());
  $('#userChip').addEventListener('click', () => go('admin'));
  $('#menuBtn').addEventListener('click', () => { $('#sidebar').classList.toggle('open'); $('#sidebarScrim').classList.toggle('hidden'); });
  $('#sidebarScrim').addEventListener('click', closeSidebar);
  $('#themeBtn').addEventListener('click', () => {
    DB.settings.theme = DB.settings.theme === 'dark' ? 'light' : 'dark';
    saveDB(); applyTheme(); render();
  });
  $('#modalClose').addEventListener('click', closeModal);
  $('.modal-scrim').addEventListener('click', closeModal);

  /* notifications */
  $('#notifBtn').addEventListener('click', e => { e.stopPropagation(); renderNotifPanel(); $('#notifPanel').classList.toggle('hidden'); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.notif-wrap')) $('#notifPanel').classList.add('hidden');
    if (!e.target.closest('.topbar-search')) $('#searchResults').classList.add('hidden');
  });

  /* global search */
  $('#globalSearch').addEventListener('input', e => globalSearch(e.target.value));
}
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#sidebarScrim').classList.add('hidden'); }
function refreshBadge() {
  const n = buildAlerts().length;
  const b = $('#notifBadge');
  b.textContent = n; b.classList.toggle('hidden', n === 0);
}
function renderNotifPanel() {
  const A = buildAlerts().slice(0, 12);
  $('#notifPanel').innerHTML = `<div class="notif-head">Notifications <span class="t-muted" style="font-weight:500;font-size:11px">${A.length} active</span></div>` +
    (A.length ? A.map(a => `<div class="notif-item" style="cursor:pointer" onclick="App.go('${a.view}')">
      <span class="n-ico">${a.ico}</span><div><div class="n-title">${esc(a.title)}</div><div class="n-sub">${esc(a.sub)}</div></div></div>`).join('')
    : '<div class="alert-empty">All clear — no active alerts 🎉</div>');
}
function globalSearch(q) {
  const box = $('#searchResults');
  q = q.trim().toLowerCase();
  if (q.length < 2) { box.classList.add('hidden'); return; }
  const hits = [];
  DB.suppliers.forEach(s => { if ((s.name + s.village + s.province).toLowerCase().includes(q)) hits.push({ tag: 'SUPPLIER', main: s.name, sub: s.village + ' · ' + s.province, view: 'suppliers' }); });
  DB.customers.forEach(c => { if ((c.name + c.country + c.contact).toLowerCase().includes(q)) hits.push({ tag: 'CUSTOMER', main: c.name, sub: c.country, view: 'customers' }); });
  DB.shipments.forEach(s => { if ((s.id + s.vessel + s.destination + s.container).toLowerCase().includes(q)) hits.push({ tag: 'SHIPMENT', main: s.id + ' → ' + s.destination, sub: s.vessel + ' · ' + s.status, view: 'exports' }); });
  DB.assets.forEach(a => { if (a.name.toLowerCase().includes(q)) hits.push({ tag: 'ASSET', main: a.name, sub: a.location + ' · ' + a.status, view: 'assets' }); });
  DB.contracts.forEach(c => { if (c.number.toLowerCase().includes(q)) hits.push({ tag: 'CONTRACT', main: c.number, sub: customerById(c.customer).name, view: 'contracts' }); });
  DB.vehicles.forEach(v => { if ((v.rego + v.driver + v.model).toLowerCase().includes(q)) hits.push({ tag: 'FLEET', main: v.rego + ' · ' + v.model, sub: 'Driver: ' + v.driver, view: 'fleet' }); });
  box.innerHTML = hits.slice(0, 9).map(h => `<button class="search-result" onclick="App.go('${h.view}');document.getElementById('searchResults').classList.add('hidden');document.getElementById('globalSearch').value=''">
    <span class="sr-tag">${h.tag}</span><span><span class="sr-main">${esc(h.main)}</span><br><span class="sr-sub">${esc(h.sub)}</span></span></button>`).join('')
    || '<div class="alert-empty" style="padding:16px">No matches</div>';
  box.classList.remove('hidden');
}

/* ═══════════ ROUTER ═══════════ */
function go(view) {
  S.view = view;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function render() {
  destroyCharts();
  const v = VIEWS[S.view] || VIEWS.dashboard;
  $('#view').innerHTML = v.html();
  if (v.init) v.init();
  refreshBadge();
}
function pageHead(crumb, title, sub, actions = '') {
  return `<div class="page-head"><div><div class="crumb">${crumb}</div><h1>${title}</h1>${sub ? `<div class="page-sub">${sub}</div>` : ''}</div><div class="head-actions">${actions}</div></div>`;
}
function kpiCard(label, value, sub, cls = '', hero = false) {
  return `<div class="kpi ${cls} ${hero ? 'kpi-hero' : ''}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
}

/* ═══════════ VIEWS ═══════════ */
const VIEWS = {};

/* ───────── DASHBOARD ───────── */
VIEWS.dashboard = {
  html() {
    const k = kpiPack();
    const A = buildAlerts();
    return pageHead('Pacific Capital', 'COCOA OPERATIONS OVERVIEW',
      'Executive snapshot · ' + new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      `<button class="btn btn-primary" onclick="App.formPurchase()">＋ New Purchase</button>
       <button class="btn" onclick="App.formShipment()">🚢 New Shipment</button>`)
      + `<div class="kpi-grid">
        ${kpiCard('🌱 Purchased Today', fmtKg(k.boughtToday), 'across all buying points', '', true)}
        ${kpiCard('📅 Purchased This Week', fmtT(k.boughtWeek), 'rolling 7 days', '', true)}
        ${kpiCard('🗓️ Purchased This Month', fmtT(k.boughtMonth), monthLabel(), '', true)}
        ${kpiCard('📆 Purchased This Year', fmtT(k.boughtYear), 'YTD ' + new Date().getFullYear(), '', true)}
      </div>
      <div class="kpi-grid" style="margin-top:13px">
        ${kpiCard('Current Inventory', fmtT(k.invKg), Object.entries(k.types).map(([t, v]) => t.replace(' Bean', '') + ' ' + tAbbr(v)).join(' · '))}
        ${kpiCard('Inventory Value', kAbbr(k.invVal), 'at average landed cost')}
        ${kpiCard('Revenue This Month', kAbbr(k.revMonth), 'FOB + domestic sales')}
        ${kpiCard('Revenue This Year', kAbbr(k.revYear), 'YTD ' + new Date().getFullYear())}
        ${kpiCard('Gross Profit YTD', kAbbr(k.grossProfit), 'revenue − cocoa cost', k.grossProfit >= 0 ? 'k-good' : 'k-bad')}
        ${kpiCard('Net Profit YTD', kAbbr(k.netProfit), 'after operating expenses', k.netProfit >= 0 ? 'k-good' : 'k-bad')}
        ${kpiCard('Cash Available', kAbbr(k.cash), 'all accounts', k.cash > 500000 ? 'k-good' : 'k-warn')}
        ${kpiCard('Accounts Receivable', kAbbr(k.ar), 'export invoices unpaid')}
        ${kpiCard('Accounts Payable', kAbbr(k.ap), 'incl. supplier balances')}
        ${kpiCard('Outstanding Supplier Pay', kAbbr(k.outstandingSup), DB.purchases.filter(p => !p.paid).length + ' unpaid dockets', k.outstandingSup > 400000 ? 'k-warn' : '')}
        ${kpiCard('Active Export Contracts', k.activeContracts, 'with volume remaining')}
        ${kpiCard('Active Buying Locations', k.activeLoc, 'traded in last 90 days')}
        ${kpiCard('Active Suppliers', k.activeSup, 'delivered in last 90 days')}
        ${kpiCard('Export Containers Pending', k.pendingContainers, 'preparing / packing', k.pendingContainers > 6 ? 'k-warn' : '')}
        ${kpiCard('Shipments In Transit', k.inTransit, 'on the water now')}
      </div>

      <div class="sec-title">⚡ Executive Alerts Centre &nbsp;·&nbsp; Live Analytics</div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Executive Alerts Centre <span class="sub">${A.length} active · rule-driven</span></div>
          <div class="alert-list" style="max-height:330px;overflow:auto">${A.length ? A.slice(0, 10).map(alertRow).join('') : '<div class="alert-empty">✅ All business rules passing — no alerts</div>'}</div>
        </div>
        <div class="card">
          <div class="card-title">Cocoa Purchasing Trend
            <span class="seg">
              ${['D', 'W', 'M', 'Y'].map(p => `<button class="${S.purchTrend === p ? 'active' : ''}" onclick="App.setTrend('${p}')">${{ D: 'Daily', W: 'Weekly', M: 'Monthly', Y: 'Annual' }[p]}</button>`).join('')}
            </span>
          </div>
          <div class="chart-box"><canvas id="chPurch"></canvas></div>
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:14px">
        <div class="card"><div class="card-title">Revenue & Profit Trend <span class="sub">monthly</span></div><div class="chart-box"><canvas id="chRev"></canvas></div></div>
        <div class="card"><div class="card-title">Inventory Trend <span class="sub">total tonnes on hand</span></div><div class="chart-box"><canvas id="chInv"></canvas></div></div>
        <div class="card"><div class="card-title">Cash Flow Trend <span class="sub">closing balance</span></div><div class="chart-box"><canvas id="chCash"></canvas></div></div>
        <div class="card"><div class="card-title">Export Volume Trend <span class="sub">tonnes shipped</span></div><div class="chart-box"><canvas id="chExp"></canvas></div></div>
      </div>
      <div class="grid grid-2" style="margin-top:14px">
        <div class="card"><div class="card-title">Top Buying Location Performance <span class="sub">last 12 months</span></div><div class="chart-box"><canvas id="chLoc"></canvas></div></div>
        <div class="card"><div class="card-title">Customer Revenue Breakdown <span class="sub">all time</span></div><div class="chart-box"><canvas id="chCust"></canvas></div></div>
      </div>`;
  },
  init() {
    const th = chartTheme();
    drawPurchTrend();
    const rev = seriesMonthly(12, (f, t) => revenueIn(f, t));
    const gp = seriesMonthly(12, (f, t) => revenueIn(f, t) - cogsIn(f, t));
    const np = seriesMonthly(12, (f, t) => revenueIn(f, t) - cogsIn(f, t) - opexIn(f, t));
    newChart('chRev', {
      type: 'bar',
      data: { labels: rev.map(s => s.label), datasets: [
        { label: 'Revenue', data: rev.map(s => s.value), backgroundColor: th.accent + 'cc', borderRadius: 6 },
        { label: 'Gross Profit', type: 'line', data: gp.map(s => s.value), borderColor: th.good, backgroundColor: th.good, tension: .35, pointRadius: 2 },
        { label: 'Net Profit', type: 'line', data: np.map(s => s.value), borderColor: th.warn, backgroundColor: th.warn, tension: .35, pointRadius: 2, borderDash: [5, 4] },
      ] },
      options: { scales: { y: { ticks: { callback: v => kAbbr(v) } } } },
    });
    const inv = inventorySeries(14);
    newChart('chInv', {
      type: 'line',
      data: { labels: inv.map(s => s.label), datasets: [{ label: 'Inventory (t)', data: inv.map(s => s.value / 1000), borderColor: th.accent2, backgroundColor: grad('chInv', th.accent2), fill: true, tension: .4, pointRadius: 0, borderWidth: 2.4 }] },
    });
    const cash = cashSeries(14);
    newChart('chCash', {
      type: 'line',
      data: { labels: cash.map(s => s.label), datasets: [{ label: 'Cash balance', data: cash.map(s => s.value), borderColor: th.good, backgroundColor: grad('chCash', th.good), fill: true, tension: .35, pointRadius: 0, borderWidth: 2.4 }] },
      options: { scales: { y: { ticks: { callback: v => kAbbr(v) } } } },
    });
    const exp = seriesMonthly(12, (f, t) => DB.shipments.filter(s => !['Preparing', 'Processing'].includes(s.status) && s.etd >= f && s.etd <= t).reduce((a, s) => a + s.tonnes, 0));
    newChart('chExp', {
      type: 'bar',
      data: { labels: exp.map(s => s.label), datasets: [{ label: 'Tonnes shipped', data: exp.map(s => s.value), backgroundColor: th.accent2 + 'cc', borderRadius: 6 }] },
    });
    const yearAgo = iso(addDays(NOW, -365));
    const locAgg = {};
    DB.purchases.filter(p => p.date >= yearAgo).forEach(p => locAgg[p.buyingPoint] = (locAgg[p.buyingPoint] || 0) + p.kg);
    const locs = Object.entries(locAgg).sort((a, b) => b[1] - a[1]);
    newChart('chLoc', {
      type: 'bar',
      data: { labels: locs.map(l => l[0]), datasets: [{ label: 'Tonnes purchased', data: locs.map(l => l[1] / 1000), backgroundColor: th.accent + 'cc', borderRadius: 6 }] },
      options: { indexAxis: 'y' },
    });
    const cs = customerStats().filter(c => c.revenue > 0);
    newChart('chCust', {
      type: 'doughnut',
      data: { labels: cs.map(c => c.name), datasets: [{ data: cs.map(c => c.revenue), backgroundColor: ['#1b88ff', '#19c3e6', '#22c55e', '#f5a623', '#8b5cf6', '#ef4444', '#14b8a6', '#eab308', '#64748b'], borderWidth: 0 }] },
      options: { plugins: { legend: { position: 'right' } } },
    });
  },
};
function monthLabel() { return new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }); }
function alertRow(a) {
  return `<div class="alert-row sev-${a.sev}" style="cursor:pointer" onclick="App.go('${a.view}')">
    <span class="a-ico">${a.ico}</span>
    <div class="a-body"><div class="a-title">${esc(a.title)}</div><div class="a-sub">${esc(a.sub)}</div></div>
    <span class="a-tag t-${a.sev}">${a.sev === 'bad' ? 'CRITICAL' : 'WARNING'}</span></div>`;
}
function drawPurchTrend() {
  const th = chartTheme();
  const old = S.charts.find(c => c.canvas && c.canvas.id === 'chPurch');
  if (old) { old.destroy(); S.charts = S.charts.filter(c => c !== old); }
  let s;
  if (S.purchTrend === 'D') s = seriesDaily(30, (f, t) => sumKg(purchasesIn(f, t)));
  else if (S.purchTrend === 'W') s = seriesWeekly(16, (f, t) => sumKg(purchasesIn(f, t)));
  else if (S.purchTrend === 'Y') s = seriesYearly((f, t) => sumKg(purchasesIn(f, t)));
  else s = seriesMonthly(14, (f, t) => sumKg(purchasesIn(f, t)));
  newChart('chPurch', {
    type: S.purchTrend === 'Y' ? 'bar' : 'line',
    data: { labels: s.map(x => x.label), datasets: [{ label: 'Cocoa purchased (t)', data: s.map(x => x.value / 1000), borderColor: th.accent, backgroundColor: S.purchTrend === 'Y' ? th.accent + 'cc' : grad('chPurch', th.accent), fill: true, tension: .35, pointRadius: 0, borderWidth: 2.4, borderRadius: 8 }] },
  });
}

/* ───────── PURCHASING ───────── */
VIEWS.purchasing = {
  html() {
    const t = todayISO(), moFrom = t.slice(0, 7) + '-01';
    const today = purchasesIn(t, t), mo = purchasesIn(moFrom, t);
    const dryRecent = DB.purchases.filter(p => p.beanType === 'Dry Bean').slice(-150);
    const avgP = dryRecent.length ? dryRecent.reduce((a, p) => a + p.pricePerKg, 0) / dryRecent.length : 0;
    const locAgg = {};
    DB.purchases.filter(p => p.date >= iso(addDays(NOW, -90))).forEach(p => locAgg[p.buyingPoint] = (locAgg[p.buyingPoint] || 0) + p.kg);
    return pageHead('Cocoa Purchasing', '🌱 PURCHASING OPERATIONS', 'Wet · dry · fermented bean procurement across PNG buying points',
      `<button class="btn btn-primary" onclick="App.formPurchase()">＋ Record Purchase</button>
       <button class="btn" onclick="App.exportCSV('purchases')">⬇ Export CSV</button>`)
      + `<div class="kpi-grid">
        ${kpiCard('Today', fmtKg(sumKg(today)), today.length + ' dockets · ' + money(sumVal(today)))}
        ${kpiCard('This Month', fmtT(sumKg(mo)), money(sumVal(mo)) + ' spent')}
        ${kpiCard('Avg Dry Bean Price', money(avgP, 2) + '/kg', 'last 150 dockets')}
        ${kpiCard('Unpaid To Suppliers', kAbbr(outstandingSupplier()), DB.purchases.filter(p => !p.paid).length + ' dockets pending', 'k-warn')}
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Buying Locations <span class="sub">volume last 90 days</span></div>
        <div class="mini-row">${LOCATIONS.map(l => `<div class="mini-stat"><b>${fmtT(locAgg[l.name] || 0)}</b><span>${l.name} · ${l.province}</span></div>`).join('')}</div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Purchase Register</div>
        <div class="table-tools">
          <input id="fPq" placeholder="Search supplier / docket…" style="flex:1;min-width:160px">
          <select id="fPloc"><option value="">All locations</option>${LOCATIONS.map(l => `<option>${l.name}</option>`).join('')}</select>
          <select id="fPtype"><option value="">All bean types</option><option>Wet Bean</option><option>Dry Bean</option><option>Fermented Bean</option></select>
          <select id="fPpaid"><option value="">Paid + unpaid</option><option value="1">Paid</option><option value="0">Unpaid</option></select>
        </div>
        ${tableShell('pur', [{ label: 'Docket' }, { label: 'Date' }, { label: 'Supplier' }, { label: 'Buying Point' }, { label: 'Type' }, { label: 'Grade' }, { label: 'Moist %', num: 1 }, { label: 'Weight', num: 1 }, { label: 'K/kg', num: 1 }, { label: 'Total', num: 1 }, { label: 'Status' }, { label: '' }])}
      </div>`;
  },
  init() {
    const rows = () => {
      const q = ($('#fPq').value || '').toLowerCase();
      const loc = $('#fPloc').value, ty = $('#fPtype').value, pd = $('#fPpaid').value;
      return DB.purchases.slice().reverse()
        .filter(p => (!q || (supplierById(p.supplier).name + p.id).toLowerCase().includes(q)) && (!loc || p.buyingPoint === loc) && (!ty || p.beanType === ty) && (pd === '' || String(p.paid ? 1 : 0) === pd))
        .map(p => `<tr><td class="t-strong">${p.id}</td><td>${fmtDate(p.date)}</td><td>${esc(supplierById(p.supplier).name)}</td><td>${p.buyingPoint}<br><span class="t-muted" style="font-size:11px">${p.province}</span></td>
          <td>${p.beanType.replace(' Bean', '')}</td><td>${p.grade}</td><td class="num">${p.moisture}</td><td class="num t-strong">${fmtKg(p.kg)}</td><td class="num">${p.pricePerKg.toFixed(2)}</td><td class="num t-strong">${money(p.total)}</td>
          <td>${p.paid ? statusChip('Paid') : statusChip('Pending')}</td>
          <td>${p.paid ? '' : `<button class="btn btn-sm" onclick="App.payPurchase('${p.id}')">Pay</button>`}</td></tr>`);
    };
    bindTable('pur', rows, 14);
    ['fPq', 'fPloc', 'fPtype', 'fPpaid'].forEach(id => $('#' + id).addEventListener('input', () => { S.pages.pur = 0; TBL.pur.refresh(); }));
  },
};

/* ───────── INVENTORY ───────── */
VIEWS.inventory = {
  html() {
    const t = typeTotals();
    return pageHead('Inventory', '📦 INVENTORY MANAGEMENT', 'Live stock derived from the movement register — auto-updates with every purchase, transfer & export',
      `<button class="btn btn-primary" onclick="App.formMovement()">＋ Record Movement</button>
       <button class="btn" onclick="App.exportCSV('movements')">⬇ Export CSV</button>`)
      + `<div class="kpi-grid">
        ${kpiCard('Wet Beans', fmtT(t['Wet Bean']), 'awaiting drying')}
        ${kpiCard('Dry Beans', fmtT(t['Dry Bean']), 'in storage')}
        ${kpiCard('Fermented Beans', fmtT(t['Fermented Bean']), 'premium stock')}
        ${kpiCard('Export Ready', fmtT(t['Export Ready']), 'graded & bagged', 'k-good')}
        ${kpiCard('Total Inventory Value', kAbbr(invValue()), 'at landed cost')}
      </div>
      <div class="grid grid-2" style="margin-top:14px">
        <div class="card"><div class="card-title">Stock by Warehouse <span class="sub">tonnes by bean type</span></div><div class="chart-box tall"><canvas id="chWh"></canvas></div></div>
        <div class="card">
          <div class="card-title">Warehouse Utilisation</div>
          ${DB.warehouses.map(w => {
            const s = whStock(w.id);
            const u = (s.total / w.capacityKg) * 100;
            const cls = u > DB.settings.capacityWarnPct ? 'b-bad' : u > 70 ? 'b-warn' : '';
            return `<div style="margin-bottom:13px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><b>${w.name}</b><span class="t-muted">${fmtT(s.total)} / ${fmtT(w.capacityKg)} · ${u.toFixed(0)}%</span></div>
              <div class="bar ${cls}"><i style="width:${Math.min(100, u)}%"></i></div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Inventory Movement Register</div>
        <div class="table-tools">
          <select id="fMty"><option value="">All movement types</option><option>Received</option><option>Transferred</option><option>Exported</option><option>Damaged</option><option>Adjustment</option><option>Processed</option></select>
          <select id="fMwh"><option value="">All warehouses</option>${DB.warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select>
        </div>
        ${tableShell('mov', [{ label: 'Ref' }, { label: 'Date' }, { label: 'Type' }, { label: 'Warehouse' }, { label: 'Bean' }, { label: 'Qty', num: 1 }, { label: 'Linked / Note' }])}
      </div>`;
  },
  init() {
    const th = chartTheme();
    const colors = { 'Wet Bean': th.warn, 'Dry Bean': th.accent, 'Fermented Bean': '#8b5cf6', 'Export Ready': th.good };
    newChart('chWh', {
      type: 'bar',
      data: {
        labels: DB.warehouses.map(w => w.name.replace(' Warehouse', '').replace(' Facility', '')),
        datasets: BEAN_TYPES.map(t => ({ label: t, data: DB.warehouses.map(w => whStock(w.id)[t] / 1000), backgroundColor: colors[t] + 'cc', borderRadius: 4, stack: 's' })),
      },
      options: { scales: { x: { stacked: true }, y: { stacked: true } } },
    });
    const rows = () => {
      const ty = $('#fMty').value, wh = $('#fMwh').value;
      return DB.movements.slice().reverse()
        .filter(m => (!ty || m.type === ty) && (!wh || m.wh === wh))
        .map(m => `<tr><td class="t-strong">${m.id}</td><td>${fmtDate(m.date)}</td><td>${statusChip(m.type === 'Damaged' ? 'Out of Service' : m.type === 'Received' ? 'Active' : m.type)}</td>
          <td>${warehouseById(m.wh).name}</td><td>${m.beanType.replace(' Bean', '')}</td>
          <td class="num ${m.deltaKg >= 0 ? 't-good' : 't-bad'}">${m.deltaKg >= 0 ? '+' : ''}${fmtKg(m.deltaKg)}</td>
          <td class="t-muted">${esc(m.ref)} ${esc(m.note)}</td></tr>`);
    };
    bindTable('mov', rows, 14);
    ['fMty', 'fMwh'].forEach(id => $('#' + id).addEventListener('input', () => { S.pages.mov = 0; TBL.mov.refresh(); }));
  },
};

/* ───────── WAREHOUSES ───────── */
VIEWS.warehouses = {
  html() {
    const c = avgDryCost();
    return pageHead('Warehouses', '🏭 WAREHOUSE MANAGEMENT', 'Capacity, utilisation and stock value across the national network')
      + `<div class="wh-grid">
        ${DB.warehouses.map(w => {
          const s = whStock(w.id);
          const u = (s.total / w.capacityKg) * 100;
          const val = s['Dry Bean'] * c + s['Fermented Bean'] * c * 1.08 + s['Export Ready'] * c * 1.15 + s['Wet Bean'] * c * 0.3;
          return `<div class="card wh-card">
            <div class="card-title">${w.name} ${u > DB.settings.capacityWarnPct ? statusChip('Overdue').replace('Overdue', 'OVER CAPACITY') : statusChip(w.maintenance)}</div>
            <div class="wh-mgr">👤 ${w.manager} · ${w.province}</div>
            <div class="mini-row">
              <div class="mini-stat"><b>${fmtT(s.total)}</b><span>Current stock</span></div>
              <div class="mini-stat"><b>${fmtT(w.capacityKg)}</b><span>Capacity</span></div>
              <div class="mini-stat"><b>${kAbbr(val)}</b><span>Stock value</span></div>
            </div>
            <div class="wh-meter"><i style="width:${Math.min(100, u)}%;${u > DB.settings.capacityWarnPct ? 'background:var(--bad)' : u > 70 ? 'background:var(--warn)' : ''}"></i></div>
            <div class="wh-stats"><span>Utilisation ${u.toFixed(1)}%</span><span>${BEAN_TYPES.filter(t => s[t] > 0).map(t => t.replace(' Bean', '') + ' ' + tAbbr(s[t])).join(' · ') || 'Empty'}</span></div>
          </div>`;
        }).join('')}
      </div>
      <div class="card" style="margin-top:14px"><div class="card-title">Network Capacity Overview</div><div class="chart-box"><canvas id="chWhCap"></canvas></div></div>`;
  },
  init() {
    const th = chartTheme();
    newChart('chWhCap', {
      type: 'bar',
      data: {
        labels: DB.warehouses.map(w => w.name),
        datasets: [
          { label: 'Current stock (t)', data: DB.warehouses.map(w => whStock(w.id).total / 1000), backgroundColor: th.accent + 'cc', borderRadius: 6 },
          { label: 'Capacity (t)', data: DB.warehouses.map(w => w.capacityKg / 1000), backgroundColor: th.grid, borderRadius: 6 },
        ],
      },
    });
  },
};

/* ───────── EXPORTS ───────── */
VIEWS.exports = {
  html() {
    const ships = DB.shipments.slice().reverse();
    const ytd = DB.shipments.filter(s => s.etd >= todayISO().slice(0, 4) + '-01-01' && !['Preparing', 'Processing'].includes(s.status));
    return pageHead('Exports', '🚢 EXPORT MANAGEMENT', 'Shipments, containers and global destinations',
      `<button class="btn btn-primary" onclick="App.formShipment()">＋ New Shipment</button>
       <button class="btn" onclick="App.exportCSV('shipments')">⬇ Export CSV</button>`)
      + `<div class="kpi-grid">
        ${kpiCard('Shipped YTD', ytd.reduce((a, s) => a + s.tonnes, 0).toFixed(0) + ' t', ytd.length + ' shipments')}
        ${kpiCard('FOB Value YTD', kAbbr(ytd.reduce((a, s) => a + s.fob, 0)), 'free on board')}
        ${kpiCard('In Transit', DB.shipments.filter(s => s.status === 'In Transit').length, 'vessels on the water')}
        ${kpiCard('Pending Containers', DB.shipments.filter(s => ['Preparing', 'Processing', 'Packed'].includes(s.status)).reduce((a, s) => a + (s.containers || 1), 0), 'preparing / packing', 'k-warn')}
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">🌏 Global Export Map <span class="sub">live shipment destinations</span></div>
        ${exportMapSVG()}
        <div class="map-legend">${Object.keys(DEST).map(d => {
          const tn = DB.shipments.filter(s => s.destination === d && !['Preparing', 'Processing'].includes(s.status)).reduce((a, s) => a + s.tonnes, 0);
          return tn ? `<span>● <b>${d}</b> ${tn.toFixed(0)} t</span>` : '';
        }).join('')}</div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Shipment Register</div>
        <div class="table-tools">
          <select id="fSst"><option value="">All statuses</option>${['Preparing', 'Processing', 'Packed', 'Loaded', 'In Transit', 'Delivered', 'Completed'].map(s => `<option>${s}</option>`).join('')}</select>
        </div>
        ${tableShell('shp', [{ label: 'Shipment' }, { label: 'Container' }, { label: 'Customer' }, { label: 'Destination' }, { label: 'Vessel' }, { label: 'ETD' }, { label: 'ETA' }, { label: 'Tonnes', num: 1 }, { label: 'FOB Value', num: 1 }, { label: 'Status' }, { label: '' }])}
      </div>`;
  },
  init() {
    const rows = () => {
      const st = $('#fSst').value;
      return DB.shipments.slice().reverse().filter(s => !st || s.status === st).map(s => `<tr>
        <td class="t-strong">${s.id}</td><td>${esc(s.container)}</td><td>${esc(customerById(s.customer).name)}</td>
        <td>${s.destination}<br><span class="t-muted" style="font-size:11px">${s.port}</span></td><td>${esc(s.vessel)}</td>
        <td>${fmtDate(s.etd)}</td><td>${fmtDate(s.eta)}</td><td class="num t-strong">${s.tonnes}</td><td class="num t-strong">${money(s.fob)}</td>
        <td>${statusChip(s.status)}${s.paid ? ' ' + statusChip('Paid') : ''}</td>
        <td style="white-space:nowrap">${s.status !== 'Completed' ? `<button class="btn btn-sm" onclick="App.advanceShipment('${s.id}')">Advance ➜</button>` : ''}
        ${!s.paid && ['Delivered', 'Completed', 'In Transit'].includes(s.status) ? ` <button class="btn btn-sm" onclick="App.payShipment('${s.id}')">💰 Receive</button>` : ''}</td></tr>`);
    };
    bindTable('shp', rows, 12);
    $('#fSst').addEventListener('input', () => { S.pages.shp = 0; TBL.shp.refresh(); });
  },
};
function exportMapSVG() {
  const W = 1000, H = 430;
  const px = lon => ((lon + 180) / 360) * W;
  const py = lat => ((78 - lat) / 150) * H;
  const ox = px(ORIGIN.lon), oy = py(ORIGIN.lat);
  let grid = '';
  for (let lon = -150; lon <= 180; lon += 30) grid += `<line x1="${px(lon)}" y1="0" x2="${px(lon)}" y2="${H}" stroke="currentColor" stroke-opacity=".07"/>`;
  for (let lat = -60; lat <= 75; lat += 30) grid += `<line x1="0" y1="${py(lat)}" x2="${W}" y2="${py(lat)}" stroke="currentColor" stroke-opacity=".07"/>`;
  const arcs = Object.entries(DEST).map(([name, d]) => {
    const t = DB.shipments.filter(s => s.destination === name && !['Preparing', 'Processing'].includes(s.status)).reduce((a, s) => a + s.tonnes, 0);
    if (!t) return '';
    const x = px(d.lon), y = py(d.lat);
    const mx = (ox + x) / 2, my = Math.min(oy, y) - 60 - Math.abs(ox - x) * 0.06;
    const r = Math.max(4, Math.min(13, Math.sqrt(t) / 2.2));
    return `<path d="M ${ox} ${oy} Q ${mx} ${my} ${x} ${y}" fill="none" stroke="url(#arcGrad)" stroke-width="1.6" stroke-dasharray="5 5" opacity=".8"/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="#1b88ff" fill-opacity=".25" stroke="#1b88ff" stroke-width="1.5"/>
      <circle cx="${x}" cy="${y}" r="2.6" fill="#19c3e6"/>
      <text x="${x}" y="${y - r - 6}" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">${name}</text>
      <text x="${x}" y="${y + r + 14}" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".65">${d.port} · ${t.toFixed(0)} t</text>`;
  }).join('');
  return `<div class="map-wrap"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="color:var(--text)">
    <defs><linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#19c3e6"/><stop offset="1" stop-color="#1b88ff"/></linearGradient></defs>
    ${grid}${arcs}
    <circle cx="${ox}" cy="${oy}" r="16" fill="#22c55e" fill-opacity=".15" stroke="#22c55e" stroke-width="1.5"><animate attributeName="r" values="12;20;12" dur="3s" repeatCount="indefinite"/></circle>
    <circle cx="${ox}" cy="${oy}" r="5" fill="#22c55e"/>
    <text x="${ox}" y="${oy + 30}" text-anchor="middle" font-size="12.5" fill="currentColor" font-weight="800">PAPUA NEW GUINEA</text>
    <text x="${ox}" y="${oy + 44}" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".65">Origin · Lae & Rabaul ports</text>
  </svg></div>`;
}

/* ───────── SUPPLIERS ───────── */
VIEWS.suppliers = {
  html() {
    const stats = supplierStats();
    return pageHead('Suppliers', '👥 SUPPLIER MANAGEMENT', 'Grower co-operatives, plantations & family estates',
      `<button class="btn btn-primary" onclick="App.formSupplier()">＋ Add Supplier</button>
       <button class="btn" onclick="App.exportCSV('suppliers')">⬇ Export CSV</button>`)
      + `<div class="grid grid-2">
        <div class="card">
          <div class="card-title">🏆 Top Supplier Leaderboard <span class="sub">by volume delivered</span></div>
          ${stats.slice(0, 6).map((s, i) => `<div class="leader-row">
            <div class="leader-rank r${i + 1}">${i + 1}</div>
            <div class="leader-main"><div class="l-name">${esc(s.name)}</div><div class="l-sub">${s.village} · ${s.province} · ${s.deliveries} deliveries</div></div>
            <div style="text-align:right"><div class="leader-val">${fmtT(s.kg)}</div><div class="t-muted" style="font-size:11px">${kAbbr(s.val)}</div></div>
          </div>`).join('')}
        </div>
        <div class="card"><div class="card-title">Supplier Performance <span class="sub">volume vs quality score</span></div><div class="chart-box tall"><canvas id="chSup"></canvas></div></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Supplier Database</div>
        <div class="table-tools"><input id="fSq" placeholder="Search name / village / province…" style="flex:1;min-width:180px"></div>
        ${tableShell('sup', [{ label: 'ID' }, { label: 'Supplier' }, { label: 'Village / Province' }, { label: 'Phone' }, { label: 'Bank' }, { label: 'Deliveries', num: 1 }, { label: 'Volume', num: 1 }, { label: 'Value', num: 1 }, { label: 'Quality', num: 1 }, { label: 'Unpaid', num: 1 }, { label: 'Status' }, { label: '' }])}
      </div>`;
  },
  init() {
    const th = chartTheme();
    const top = supplierStats().slice(0, 8);
    newChart('chSup', {
      type: 'bar',
      data: {
        labels: top.map(s => s.name.split(' ').slice(0, 2).join(' ')),
        datasets: [
          { label: 'Volume (t)', data: top.map(s => s.kg / 1000), backgroundColor: th.accent + 'cc', borderRadius: 6, yAxisID: 'y' },
          { label: 'Quality score', type: 'line', data: top.map(s => s.quality), borderColor: th.good, backgroundColor: th.good, yAxisID: 'y1', tension: .35 },
        ],
      },
      options: { scales: { y: { position: 'left' }, y1: { position: 'right', min: 50, max: 100, grid: { display: false } } } },
    });
    const rows = () => {
      const q = ($('#fSq').value || '').toLowerCase();
      return supplierStats().filter(s => !q || (s.name + s.village + s.province).toLowerCase().includes(q))
        .map(s => `<tr><td class="t-strong">${s.id}</td><td class="t-strong">${esc(s.name)}</td><td>${s.village}<br><span class="t-muted" style="font-size:11px">${s.province}</span></td>
        <td>${s.phone}</td><td class="t-muted" style="font-size:11px">${esc(s.bank)}</td>
        <td class="num">${s.deliveries}</td><td class="num t-strong">${fmtT(s.kg)}</td><td class="num">${kAbbr(s.val)}</td>
        <td class="num">${s.quality ? s.quality.toFixed(0) + '<span class="t-muted">/100</span>' : '—'}</td>
        <td class="num ${s.unpaid ? 't-warn' : ''}">${s.unpaid ? money(s.unpaid) : '—'}</td>
        <td>${statusChip(s.active ? 'Active' : 'Inactive')}</td>
        <td><button class="btn btn-sm" onclick="App.supplierProfile('${s.id}')">Scorecard</button></td></tr>`);
    };
    bindTable('sup', rows, 10);
    $('#fSq').addEventListener('input', () => { S.pages.sup = 0; TBL.sup.refresh(); });
  },
};

/* ───────── CUSTOMERS ───────── */
VIEWS.customers = {
  html() {
    const cs = customerStats();
    return pageHead('Customers', '🤝 CUSTOMER MANAGEMENT', 'International buyers, domestic buyers & export clients',
      `<button class="btn btn-primary" onclick="App.formCustomer()">＋ Add Customer</button>`)
      + `<div class="grid grid-2">
        <div class="card">
          <div class="card-title">💎 Revenue Leaderboard</div>
          ${cs.filter(c => c.revenue > 0).slice(0, 6).map((c, i) => `<div class="leader-row">
            <div class="leader-rank r${i + 1}">${i + 1}</div>
            <div class="leader-main"><div class="l-name">${esc(c.name)}</div><div class="l-sub">${c.country} · ${c.shipments} shipments · ${c.tonnes.toFixed(0)} t</div></div>
            <div class="leader-val">${kAbbr(c.revenue)}</div>
          </div>`).join('')}
        </div>
        <div class="card"><div class="card-title">Customer Revenue Share</div><div class="chart-box tall"><canvas id="chCustRev"></canvas></div></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Customer Database</div>
        ${tableShell('cus', [{ label: 'ID' }, { label: 'Company' }, { label: 'Country' }, { label: 'Contact' }, { label: 'Type' }, { label: 'Active Contracts', num: 1 }, { label: 'Shipments', num: 1 }, { label: 'Volume', num: 1 }, { label: 'Revenue', num: 1 }, { label: '' }])}
      </div>`;
  },
  init() {
    const cs = customerStats().filter(c => c.revenue > 0);
    newChart('chCustRev', {
      type: 'doughnut',
      data: { labels: cs.map(c => c.name), datasets: [{ data: cs.map(c => c.revenue), backgroundColor: ['#1b88ff', '#19c3e6', '#22c55e', '#f5a623', '#8b5cf6', '#ef4444', '#14b8a6', '#eab308', '#64748b'], borderWidth: 0 }] },
      options: { plugins: { legend: { position: 'right' } } },
    });
    bindTable('cus', () => customerStats().map(c => `<tr><td class="t-strong">${c.id}</td><td class="t-strong">${esc(c.name)}</td><td>${c.country}</td>
      <td>${esc(c.contact)}<br><span class="t-muted" style="font-size:11px">${esc(c.email)}</span></td><td>${c.type}</td>
      <td class="num">${c.activeContracts}</td><td class="num">${c.shipments}</td><td class="num">${c.tonnes.toFixed(0)} t</td><td class="num t-strong">${money(c.revenue)}</td>
      <td><button class="btn btn-sm" onclick="App.customerProfile('${c.id}')">History</button></td></tr>`), 10);
  },
};

/* ───────── CONTRACTS ───────── */
VIEWS.contracts = {
  html() {
    return pageHead('Contracts', '📑 CONTRACT MANAGEMENT', 'Cocoa supply contracts with completion tracking & expiry alerts',
      `<button class="btn btn-primary" onclick="App.formContract()">＋ New Contract</button>`)
      + `<div class="grid grid-2">
      ${DB.contracts.map(c => {
        const cs = contractStats(c);
        const cust = customerById(c.customer);
        const barCls = cs.expired && cs.remaining > 0 ? 'b-bad' : cs.pct >= 100 ? 'b-good' : !cs.expired && cs.daysLeft <= 45 && cs.remaining > 0 ? 'b-warn' : '';
        return `<div class="card contract-card">
          <div class="cc-head">
            <div><div class="cc-num">${c.number}</div><div class="cc-cust">${esc(cust.name)} · ${cust.country}</div></div>
            ${cs.expired ? (cs.remaining > 0 ? statusChip('Overdue').replace('Overdue', 'EXPIRED — SHORT') : statusChip('Completed')) : cs.daysLeft <= 45 && cs.remaining > 0 ? statusChip('Pending').replace('Pending', cs.daysLeft + 'd LEFT') : statusChip('Active')}
          </div>
          <div class="mini-row" style="margin-bottom:11px">
            <div class="mini-stat"><b>${c.volumeT} t</b><span>Contract volume</span></div>
            <div class="mini-stat"><b>${cs.delivered.toFixed(0)} t</b><span>Delivered</span></div>
            <div class="mini-stat"><b>${cs.remaining.toFixed(0)} t</b><span>Remaining</span></div>
            <div class="mini-stat"><b>${kAbbr(c.valueK)}</b><span>Contract value</span></div>
          </div>
          <div class="bar ${barCls}"><i style="width:${cs.pct.toFixed(1)}%"></i></div>
          <div class="wh-stats" style="margin-top:6px"><span>${cs.pct.toFixed(1)}% complete</span><span>${fmtDate(c.start)} → ${fmtDate(c.end)}</span></div>
        </div>`;
      }).join('')}
    </div>`;
  },
};

/* ───────── FINANCE ───────── */
VIEWS.finance = {
  html() {
    const t = todayISO(), yrFrom = t.slice(0, 4) + '-01-01';
    const rev = revenueIn(yrFrom, t), cogs = cogsIn(yrFrom, t), opex = opexIn(yrFrom, t);
    const gp = rev - cogs, np = gp - opex;
    const expCats = {};
    DB.transactions.filter(x => x.dir === 'out' && x.date >= yrFrom).forEach(x => expCats[x.category] = (expCats[x.category] || 0) + x.amount);
    const revCats = {};
    DB.transactions.filter(x => x.dir === 'in' && x.date >= yrFrom).forEach(x => revCats[x.category] = (revCats[x.category] || 0) + x.amount);
    const fobYtd = DB.shipments.filter(s => s.etd >= yrFrom && !['Preparing', 'Processing'].includes(s.status)).reduce((a, s) => a + s.fob, 0);
    const assetsVal = DB.assets.reduce((a, x) => a + x.value, 0);
    const cash = cashBalance(), ar = accountsReceivable(), ap = accountsPayable(), inv = invValue();
    const equity = cash + ar + inv + assetsVal - ap;
    const cf = seriesMonthly(6, (f, tt) => DB.transactions.filter(x => x.date >= f && x.date <= tt).reduce((a, x) => a + (x.dir === 'in' ? x.amount : -x.amount), 0));
    return pageHead('Finance', '💰 FINANCE DASHBOARD', 'P&L · balance sheet · cash flow — fully derived from operational data',
      `<button class="btn" onclick="App.exportCSV('transactions')">⬇ Export Ledger CSV</button>`)
      + `<div class="kpi-grid">
        ${kpiCard('Revenue YTD', kAbbr(rev), 'invoiced FOB ' + kAbbr(fobYtd))}
        ${kpiCard('Cocoa Purchases YTD', kAbbr(cogs), 'cost of goods')}
        ${kpiCard('Gross Profit', kAbbr(gp), pc(rev ? (gp / rev) * 100 : 0) + ' margin', gp >= 0 ? 'k-good' : 'k-bad')}
        ${kpiCard('Operating Expenses', kAbbr(opex), 'payroll · fuel · logistics')}
        ${kpiCard('Net Profit', kAbbr(np), pc(rev ? (np / rev) * 100 : 0) + ' margin', np >= 0 ? 'k-good' : 'k-bad')}
        ${kpiCard('Cash Available', kAbbr(cash), 'bank + cash on hand', 'k-good')}
        ${kpiCard('Accounts Receivable', kAbbr(ar), 'unpaid export invoices')}
        ${kpiCard('Accounts Payable', kAbbr(ap), 'suppliers + accruals', 'k-warn')}
      </div>
      <div class="grid grid-3" style="margin-top:14px">
        <div class="card fin-statement">
          <div class="card-title">Profit &amp; Loss Statement <span class="sub">YTD ${t.slice(0, 4)}</span></div>
          <div class="fs-row head"><span>Revenue</span><span></span></div>
          <div class="fs-row"><span>Export sales (FOB)</span><span class="num">${money(fobYtd)}</span></div>
          <div class="fs-row"><span>Domestic cocoa sales</span><span class="num">${money(revCats['Cocoa Sales'] || 0)}</span></div>
          <div class="fs-row total"><span>Total revenue</span><span class="num">${money(rev)}</span></div>
          <div class="fs-row head"><span>Cost of goods</span><span></span></div>
          <div class="fs-row"><span>Cocoa bean purchases</span><span class="num">(${money(cogs)})</span></div>
          <div class="fs-row total"><span>Gross profit</span><span class="num ${gp >= 0 ? 't-good' : 't-bad'}">${money(gp)}</span></div>
          <div class="fs-row head"><span>Operating expenses</span><span></span></div>
          ${Object.entries(expCats).filter(([c]) => c !== 'Supplier Payments').sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="fs-row"><span>${c}</span><span class="num">(${money(v)})</span></div>`).join('')}
          <div class="fs-row total"><span>Net profit</span><span class="num ${np >= 0 ? 't-good' : 't-bad'}">${money(np)}</span></div>
        </div>
        <div class="card fin-statement">
          <div class="card-title">Balance Sheet <span class="sub">as at ${fmtDate(t)}</span></div>
          <div class="fs-row head"><span>Assets</span><span></span></div>
          <div class="fs-row"><span>Cash &amp; equivalents</span><span class="num">${money(cash)}</span></div>
          <div class="fs-row"><span>Accounts receivable</span><span class="num">${money(ar)}</span></div>
          <div class="fs-row"><span>Cocoa inventory</span><span class="num">${money(inv)}</span></div>
          <div class="fs-row"><span>Property, plant &amp; equipment</span><span class="num">${money(assetsVal)}</span></div>
          <div class="fs-row total"><span>Total assets</span><span class="num">${money(cash + ar + inv + assetsVal)}</span></div>
          <div class="fs-row head"><span>Liabilities</span><span></span></div>
          <div class="fs-row"><span>Accounts payable</span><span class="num">(${money(ap)})</span></div>
          <div class="fs-row total"><span>Net assets / equity</span><span class="num t-good">${money(equity)}</span></div>
        </div>
        <div class="card fin-statement">
          <div class="card-title">Cash Flow Statement <span class="sub">last 6 months net</span></div>
          ${cf.map(b => `<div class="fs-row"><span>${b.label}</span><span class="num ${b.value >= 0 ? 't-good' : 't-bad'}">${money(b.value)}</span></div>`).join('')}
          <div class="fs-row total"><span>Closing cash</span><span class="num t-good">${money(cash)}</span></div>
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:14px">
        <div class="card"><div class="card-title">Expense Breakdown <span class="sub">YTD by category</span></div><div class="chart-box"><canvas id="chExpCat"></canvas></div></div>
        <div class="card"><div class="card-title">Monthly P&amp;L <span class="sub">14 months</span></div><div class="chart-box"><canvas id="chPnl"></canvas></div></div>
      </div>`;
  },
  init() {
    const th = chartTheme();
    const t = todayISO(), yrFrom = t.slice(0, 4) + '-01-01';
    const expCats = {};
    DB.transactions.filter(x => x.dir === 'out' && x.date >= yrFrom).forEach(x => expCats[x.category] = (expCats[x.category] || 0) + x.amount);
    const ents = Object.entries(expCats).sort((a, b) => b[1] - a[1]);
    newChart('chExpCat', {
      type: 'doughnut',
      data: { labels: ents.map(e => e[0]), datasets: [{ data: ents.map(e => e[1]), backgroundColor: ['#1b88ff', '#19c3e6', '#f5a623', '#ef4444', '#8b5cf6', '#22c55e', '#eab308', '#14b8a6', '#64748b', '#f472b6', '#a3e635'], borderWidth: 0 }] },
      options: { plugins: { legend: { position: 'right' } } },
    });
    const rev = seriesMonthly(14, (f, tt) => revenueIn(f, tt));
    const np = seriesMonthly(14, (f, tt) => revenueIn(f, tt) - cogsIn(f, tt) - opexIn(f, tt));
    newChart('chPnl', {
      type: 'bar',
      data: { labels: rev.map(s => s.label), datasets: [
        { label: 'Revenue', data: rev.map(s => s.value), backgroundColor: th.accent + 'b0', borderRadius: 5 },
        { label: 'Net profit', data: np.map(s => s.value), backgroundColor: np.map(s => s.value >= 0 ? th.good + 'b0' : th.bad + 'b0'), borderRadius: 5 },
      ] },
      options: { scales: { y: { ticks: { callback: v => kAbbr(v) } } } },
    });
  },
};

/* ───────── CASH ───────── */
VIEWS.cash = {
  html() {
    const t = todayISO(), moFrom = t.slice(0, 7) + '-01';
    const inMo = DB.transactions.filter(x => x.dir === 'in' && x.date >= moFrom).reduce((a, x) => a + x.amount, 0);
    const outMo = DB.transactions.filter(x => x.dir === 'out' && x.date >= moFrom).reduce((a, x) => a + x.amount, 0);
    return pageHead('Cash Transactions', '🏦 CASH TRANSACTIONS', 'Every kina in and out — balances & charts update automatically',
      `<button class="btn btn-primary" onclick="App.formTransaction()">＋ Record Transaction</button>
       <button class="btn" onclick="App.exportCSV('transactions')">⬇ Export CSV</button>`)
      + `<div class="kpi-grid">
        ${kpiCard('Cash Balance', kAbbr(cashBalance()), 'live ledger balance', 'k-good', true)}
        ${kpiCard('Cash In — ' + monthLabel().split(' ')[0], kAbbr(inMo), 'sales · export payments', 'k-good')}
        ${kpiCard('Cash Out — ' + monthLabel().split(' ')[0], kAbbr(outMo), 'suppliers · payroll · opex', 'k-bad')}
        ${kpiCard('Net Movement', kAbbr(inMo - outMo), 'this month', inMo - outMo >= 0 ? 'k-good' : 'k-bad')}
      </div>
      <div class="card" style="margin-top:14px"><div class="card-title">Cash In vs Cash Out <span class="sub">monthly</span></div><div class="chart-box"><canvas id="chCashIO"></canvas></div></div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Transaction Ledger</div>
        <div class="table-tools">
          <input id="fTq" placeholder="Search description…" style="flex:1;min-width:160px">
          <select id="fTdir"><option value="">In + out</option><option value="in">Cash in</option><option value="out">Cash out</option></select>
          <select id="fTcat"><option value="">All categories</option>${[...new Set(DB.transactions.map(x => x.category))].sort().map(c => `<option>${c}</option>`).join('')}</select>
        </div>
        ${tableShell('txn', [{ label: 'Ref' }, { label: 'Date' }, { label: 'Category' }, { label: 'Description' }, { label: 'Entered By' }, { label: 'Approved By' }, { label: 'Receipt' }, { label: 'Amount', num: 1 }])}
      </div>`;
  },
  init() {
    const th = chartTheme();
    const inS = seriesMonthly(12, (f, t) => DB.transactions.filter(x => x.dir === 'in' && x.date >= f && x.date <= t).reduce((a, x) => a + x.amount, 0));
    const outS = seriesMonthly(12, (f, t) => DB.transactions.filter(x => x.dir === 'out' && x.date >= f && x.date <= t).reduce((a, x) => a + x.amount, 0));
    newChart('chCashIO', {
      type: 'bar',
      data: { labels: inS.map(s => s.label), datasets: [
        { label: 'Cash in', data: inS.map(s => s.value), backgroundColor: th.good + 'b8', borderRadius: 5 },
        { label: 'Cash out', data: outS.map(s => s.value), backgroundColor: th.bad + 'b8', borderRadius: 5 },
      ] },
      options: { scales: { y: { ticks: { callback: v => kAbbr(v) } } } },
    });
    const rows = () => {
      const q = ($('#fTq').value || '').toLowerCase(), dir = $('#fTdir').value, cat = $('#fTcat').value;
      return DB.transactions.slice().reverse()
        .filter(x => (!q || x.desc.toLowerCase().includes(q)) && (!dir || x.dir === dir) && (!cat || x.category === cat))
        .map(x => `<tr><td class="t-strong">${x.id}</td><td>${fmtDate(x.date)}</td><td>${statusChip(x.dir === 'in' ? 'Active' : 'Pending').replace('Active', x.category).replace('Pending', x.category)}</td>
          <td>${esc(x.desc)}</td><td>${esc(x.enteredBy)}</td><td>${esc(x.approvedBy)}</td><td>${x.receipt ? '📎' : '—'}</td>
          <td class="num ${x.dir === 'in' ? 't-good' : 't-bad'}">${x.dir === 'in' ? '+' : '−'}${money(x.amount)}</td></tr>`);
    };
    bindTable('txn', rows, 14);
    ['fTq', 'fTdir', 'fTcat'].forEach(id => $('#' + id).addEventListener('input', () => { S.pages.txn = 0; TBL.txn.refresh(); }));
  },
};

/* ───────── ASSETS ───────── */
VIEWS.assets = {
  html() {
    const cats = ['Vehicle', 'Machinery', 'Building'];
    const statuses = { 'Operational': '🟢', 'Maintenance Due': '🟡', 'Under Repair': '🟠', 'Out of Service': '🔴' };
    return pageHead('Assets', '🚜 ASSET MANAGEMENT', 'Vehicles · machinery · buildings — full register with status tracking',
      `<button class="btn btn-primary" onclick="App.formAsset()">＋ Add Asset</button>
       <button class="btn" onclick="App.exportCSV('assets')">⬇ Export CSV</button>`)
      + `<div class="kpi-grid">
        ${cats.map(c => {
          const list = DB.assets.filter(a => a.category === c);
          return kpiCard(c + 's', list.length, kAbbr(list.reduce((a, x) => a + x.value, 0)) + ' current value');
        }).join('')}
        ${kpiCard('Fleet Health', DB.assets.filter(a => a.status === 'Operational').length + ' / ' + DB.assets.length, 'assets operational', DB.assets.some(a => a.status === 'Under Repair') ? 'k-warn' : 'k-good')}
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Asset Register <span class="sub">${Object.entries(statuses).map(([s, e]) => e + ' ' + s).join(' · ')}</span></div>
        <div class="table-tools">
          <select id="fAcat"><option value="">All categories</option>${cats.map(c => `<option>${c}</option>`).join('')}</select>
          <select id="fAst"><option value="">All statuses</option>${Object.keys(statuses).map(s => `<option>${s}</option>`).join('')}</select>
        </div>
        ${tableShell('ast', [{ label: 'ID' }, { label: 'Asset' }, { label: 'Category' }, { label: 'Purchased' }, { label: 'Cost', num: 1 }, { label: 'Current Value', num: 1 }, { label: 'Location' }, { label: 'Assigned To' }, { label: 'Status' }, { label: '' }])}
      </div>`;
  },
  init() {
    const rows = () => {
      const cat = $('#fAcat').value, st = $('#fAst').value;
      return DB.assets.filter(a => (!cat || a.category === cat) && (!st || a.status === st))
        .map(a => `<tr><td class="t-strong">${a.id}</td><td class="t-strong">${esc(a.name)}</td><td>${a.category}</td><td>${fmtDate(a.purchased)}</td>
          <td class="num">${money(a.cost)}</td><td class="num t-strong">${money(a.value)}</td><td>${esc(a.location)}</td><td>${esc(a.assignedTo)}</td>
          <td>${statusChip(a.status)}</td>
          <td><button class="btn btn-sm" onclick="App.cycleAsset('${a.id}')">Status ➜</button></td></tr>`);
    };
    bindTable('ast', rows, 12);
    ['fAcat', 'fAst'].forEach(id => $('#' + id).addEventListener('input', () => { S.pages.ast = 0; TBL.ast.refresh(); }));
  },
};

/* ───────── FLEET ───────── */
VIEWS.fleet = {
  html() {
    const t = todayISO();
    const fleetAlerts = buildAlerts().filter(a => ['Vehicle Maintenance Due', 'Insurance Expiry', 'Insurance Expired', 'Registration Expiry', 'Driver Licence Expiry', 'Fuel Consumption Anomaly'].includes(a.cat));
    const expCell = d => {
      const n = daysBetween(t, d);
      if (d > '2098') return '<span class="t-muted">n/a</span>';
      if (n < 0) return `<span class="t-bad">${fmtDate(d)} ⚠</span>`;
      if (n <= 30) return `<span class="t-warn">${fmtDate(d)} (${n}d)</span>`;
      return fmtDate(d);
    };
    return pageHead('Fleet', '🚛 FLEET MANAGEMENT', 'Vehicles, drivers, fuel & compliance — automatic reminders',
      `<button class="btn btn-primary" onclick="App.formVehicle()">＋ Add Vehicle</button>`)
      + `<div class="grid grid-2">
        <div class="card">
          <div class="card-title">⏰ Automatic Reminders <span class="sub">${fleetAlerts.length} active</span></div>
          <div class="alert-list" style="max-height:300px;overflow:auto">${fleetAlerts.length ? fleetAlerts.map(alertRow).join('') : '<div class="alert-empty">✅ Fleet fully compliant</div>'}</div>
        </div>
        <div class="card"><div class="card-title">Fuel Consumption <span class="sub">L/100km by vehicle</span></div><div class="chart-box tall"><canvas id="chFuel"></canvas></div></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">Fleet Register</div>
        ${tableShell('flt', [{ label: 'Rego' }, { label: 'Vehicle' }, { label: 'Driver' }, { label: 'Fuel L/100km', num: 1 }, { label: 'Last Service' }, { label: 'Insurance Expiry' }, { label: 'Rego Expiry' }, { label: 'Licence Expiry' }, { label: 'Location' }])}
      </div>`;
  },
  init() {
    const th = chartTheme();
    const fleet = DB.vehicles.filter(v => v.fuelL100 > 0);
    const avg = fleet.reduce((a, v) => a + v.fuelL100, 0) / Math.max(1, fleet.length);
    newChart('chFuel', {
      type: 'bar',
      data: { labels: fleet.map(v => v.rego), datasets: [{ label: 'L/100km', data: fleet.map(v => v.fuelL100), backgroundColor: fleet.map(v => v.fuelL100 > avg * 1.45 ? th.bad + 'cc' : th.accent + 'cc'), borderRadius: 6 }] },
    });
    const t = todayISO();
    const expCell = d => {
      const n = daysBetween(t, d);
      if (d > '2098') return '<span class="t-muted">n/a</span>';
      if (n < 0) return `<span class="t-bad">${fmtDate(d)} ⚠</span>`;
      if (n <= 30) return `<span class="t-warn">${fmtDate(d)} (${n}d)</span>`;
      return fmtDate(d);
    };
    bindTable('flt', () => DB.vehicles.map(v => `<tr><td class="t-strong">${v.rego}</td><td>${esc(v.model)}</td><td>${esc(v.driver)}</td>
      <td class="num">${v.fuelL100 || '—'}</td><td>${daysBetween(v.lastService, t) > 180 ? `<span class="t-warn">${fmtDate(v.lastService)} ⚠</span>` : fmtDate(v.lastService)}</td>
      <td>${expCell(v.insuranceExpiry)}</td><td>${expCell(v.regoExpiry)}</td><td>${expCell(v.licenceExpiry)}</td><td>${esc(v.location)}</td></tr>`), 10);
  },
};

/* ───────── ANALYTICS ───────── */
VIEWS.analytics = {
  html() {
    return pageHead('Analytics', '📈 ADVANCED ANALYTICS', 'Cross-business intelligence with AI-style forecasting models')
      + `<div class="grid grid-2">
        <div class="card"><div class="card-title">🔮 Purchase Forecast <span class="sub">linear model · next 3 months</span></div><div class="chart-box"><canvas id="fcPur"></canvas></div></div>
        <div class="card"><div class="card-title">🔮 Revenue Forecast <span class="sub">linear model · next 3 months</span></div><div class="chart-box"><canvas id="fcRev"></canvas></div></div>
        <div class="card"><div class="card-title">🔮 Inventory Forecast <span class="sub">projected tonnes on hand</span></div><div class="chart-box"><canvas id="fcInv"></canvas></div></div>
        <div class="card"><div class="card-title">🔮 Cash Flow Forecast <span class="sub">projected closing balance</span></div><div class="chart-box"><canvas id="fcCash"></canvas></div></div>
      </div>
      <div id="aiInsights" class="grid grid-3" style="margin-top:14px"></div>
      <div class="grid grid-2" style="margin-top:14px">
        <div class="card"><div class="card-title">Export Destination Analysis <span class="sub">tonnes by country</span></div><div class="chart-box"><canvas id="chDest"></canvas></div></div>
        <div class="card"><div class="card-title">Profitability by Month <span class="sub">net margin %</span></div><div class="chart-box"><canvas id="chMargin"></canvas></div></div>
        <div class="card"><div class="card-title">Supplier Performance Trend <span class="sub">top 5 · monthly volume</span></div><div class="chart-box"><canvas id="chSupTrend"></canvas></div></div>
        <div class="card"><div class="card-title">Asset Value by Category</div><div class="chart-box"><canvas id="chAsset"></canvas></div></div>
      </div>`;
  },
  init() {
    const th = chartTheme();
    const fcChart = (id, series, unitFn, color) => {
      const f = forecast(series);
      const labels = [...f.hist.map(s => s.label), ...f.fc.map(s => s.label)];
      newChart(id, {
        type: 'line',
        data: { labels, datasets: [
          { label: 'Actual', data: [...f.hist.map(s => s.value), ...f.fc.map(() => null)], borderColor: color, backgroundColor: grad(id, color), fill: true, tension: .35, pointRadius: 0, borderWidth: 2.4 },
          { label: 'Forecast', data: [...f.hist.map(() => null), f.hist.length ? f.hist[f.hist.length - 1].value : null, ...f.fc.map(s => s.value)].slice(1).length === labels.length ? [...f.hist.map((s, i) => i === f.hist.length - 1 ? s.value : null), ...f.fc.map(s => s.value)] : [...f.hist.map((s, i) => i === f.hist.length - 1 ? s.value : null), ...f.fc.map(s => s.value)], borderColor: th.warn, borderDash: [6, 5], tension: .35, pointRadius: 3, pointBackgroundColor: th.warn, borderWidth: 2 },
        ] },
        options: { scales: { y: { ticks: { callback: unitFn } } } },
      });
      return f;
    };
    const fP = fcChart('fcPur', seriesMonthly(12, (f, t) => sumKg(purchasesIn(f, t)) / 1000), v => v + 't', th.accent);
    const fR = fcChart('fcRev', seriesMonthly(12, (f, t) => revenueIn(f, t)), v => kAbbr(v), th.good);
    fcChart('fcInv', inventorySeries(12).map(s => ({ label: s.label, value: s.value / 1000 })), v => v + 't', th.accent2);
    const fC = fcChart('fcCash', cashSeries(12), v => kAbbr(v), '#8b5cf6');
    const dirWord = s => s > 0 ? 'rising 📈' : 'softening 📉';
    $('#aiInsights').innerHTML = [
      { ico: '🌱', t: 'Purchasing momentum', d: `Model projects <b>${(fP.fc[0] ? fP.fc[0].value.toFixed(0) : '—')} t</b> next month — volumes are ${dirWord(fP.slope)} at ~${Math.abs(fP.slope).toFixed(1)} t/month.` },
      { ico: '💰', t: 'Revenue outlook', d: `Next-month revenue projected at <b>${fR.fc[0] ? kAbbr(fR.fc[0].value) : '—'}</b>. Trend is ${dirWord(fR.slope)} on a 12-month regression.` },
      { ico: '🏦', t: 'Cash runway', d: `Cash balance projected at <b>${fC.fc[2] ? kAbbr(fC.fc[2].value) : '—'}</b> in 3 months. ${fC.slope > 0 ? 'Positive operating trajectory.' : 'Monitor outflows — trajectory is negative.'}` },
    ].map(x => `<div class="card"><div class="card-title">${x.ico} ${x.t}</div><div style="font-size:13px;color:var(--muted);line-height:1.6">${x.d}</div></div>`).join('');

    const destAgg = {};
    DB.shipments.filter(s => !['Preparing', 'Processing'].includes(s.status)).forEach(s => destAgg[s.destination] = (destAgg[s.destination] || 0) + s.tonnes);
    const de = Object.entries(destAgg).sort((a, b) => b[1] - a[1]);
    newChart('chDest', { type: 'bar', data: { labels: de.map(d => d[0]), datasets: [{ label: 'Tonnes', data: de.map(d => d[1]), backgroundColor: th.accent2 + 'cc', borderRadius: 6 }] }, options: { indexAxis: 'y' } });

    const marg = seriesMonthly(12, (f, t) => { const r = revenueIn(f, t); return r ? ((r - cogsIn(f, t) - opexIn(f, t)) / r) * 100 : 0; });
    newChart('chMargin', { type: 'line', data: { labels: marg.map(s => s.label), datasets: [{ label: 'Net margin %', data: marg.map(s => s.value), borderColor: th.good, backgroundColor: grad('chMargin', th.good), fill: true, tension: .35, pointRadius: 0, borderWidth: 2.4 }] } });

    const top5 = supplierStats().slice(0, 5);
    const months = seriesMonthly(8, () => 0);
    newChart('chSupTrend', {
      type: 'line',
      data: { labels: months.map(m => m.label), datasets: top5.map((s, i) => ({
        label: s.name.split(' ').slice(0, 2).join(' '),
        data: months.map(m => DB.purchases.filter(p => p.supplier === s.id && monthKey(p.date) === m.key).reduce((a, p) => a + p.kg, 0) / 1000),
        borderColor: ['#1b88ff', '#19c3e6', '#22c55e', '#f5a623', '#8b5cf6'][i], tension: .35, pointRadius: 0, borderWidth: 2,
      })) },
    });
    const catAgg = {};
    DB.assets.forEach(a => catAgg[a.category] = (catAgg[a.category] || 0) + a.value);
    newChart('chAsset', { type: 'doughnut', data: { labels: Object.keys(catAgg), datasets: [{ data: Object.values(catAgg), backgroundColor: ['#1b88ff', '#19c3e6', '#22c55e'], borderWidth: 0 }] }, options: { plugins: { legend: { position: 'right' } } } });
  },
};

/* ───────── REPORTS ───────── */
VIEWS.reports = {
  html() {
    return pageHead('Reports', '📊 REPORTING CENTRE', 'One-click executive reports — PDF, Excel & CSV export')
      + `<div class="report-tiles">
        ${[['daily', '📅', 'Daily Report', 'Today\'s operations summary'],
           ['weekly', '🗓️', 'Weekly Report', 'Rolling 7-day performance'],
           ['monthly', '📆', 'Monthly Report', monthLabel()],
           ['quarterly', '📈', 'Quarterly Report', 'Current quarter to date'],
           ['annual', '🏆', 'Annual Report', new Date().getFullYear() + ' year to date']]
          .map(r => `<button class="report-tile" onclick="App.buildReport('${r[0]}')"><div class="rt-ico">${r[1]}</div><div class="rt-name">${r[2]}</div><div class="rt-sub">${r[3]}</div></button>`).join('')}
      </div>
      <div id="reportPreview"></div>`;
  },
};
function reportRange(kind) {
  const t = todayISO();
  if (kind === 'daily') return { from: t, to: t, label: 'Daily Report — ' + fmtDate(t) };
  if (kind === 'weekly') return { from: iso(addDays(NOW, -6)), to: t, label: 'Weekly Report — w/e ' + fmtDate(t) };
  if (kind === 'monthly') return { from: t.slice(0, 7) + '-01', to: t, label: 'Monthly Report — ' + monthLabel() };
  if (kind === 'quarterly') {
    const q = Math.floor(NOW.getMonth() / 3);
    return { from: iso(new Date(NOW.getFullYear(), q * 3, 1)), to: t, label: 'Quarterly Report — Q' + (q + 1) + ' ' + NOW.getFullYear() };
  }
  return { from: t.slice(0, 4) + '-01-01', to: t, label: 'Annual Report — ' + NOW.getFullYear() + ' YTD' };
}
function buildReportHTML(kind) {
  const r = reportRange(kind);
  const pur = purchasesIn(r.from, r.to);
  const rev = revenueIn(r.from, r.to), cogs = sumVal(pur), opex = opexIn(r.from, r.to);
  const ships = DB.shipments.filter(s => s.etd >= r.from && s.etd <= r.to && !['Preparing', 'Processing'].includes(s.status));
  const locAgg = {};
  pur.forEach(p => locAgg[p.buyingPoint] = (locAgg[p.buyingPoint] || 0) + p.kg);
  const supAgg = {};
  pur.forEach(p => supAgg[p.supplier] = (supAgg[p.supplier] || 0) + p.kg);
  const topSup = Object.entries(supAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="report-doc" id="reportDoc">
    <h2>PACIFIC CAPITAL — ${r.label}</h2>
    <div class="rd-meta">Cocoa Operations &amp; Export Management System · Generated ${new Date().toLocaleString('en-AU')} · Prepared for Jarrod Hulo, Managing Director</div>
    <h4>Executive Summary</h4>
    <div class="mini-row">
      <div class="mini-stat"><b>${fmtT(sumKg(pur))}</b><span>Cocoa purchased</span></div>
      <div class="mini-stat"><b>${money(cogs)}</b><span>Purchase spend</span></div>
      <div class="mini-stat"><b>${money(rev)}</b><span>Revenue</span></div>
      <div class="mini-stat"><b>${money(rev - cogs)}</b><span>Gross profit</span></div>
      <div class="mini-stat"><b>${money(rev - cogs - opex)}</b><span>Net profit</span></div>
      <div class="mini-stat"><b>${ships.reduce((a, s) => a + s.tonnes, 0).toFixed(0)} t</b><span>Exported (${ships.length} shipments)</span></div>
      <div class="mini-stat"><b>${money(cashBalance())}</b><span>Cash on hand (today)</span></div>
      <div class="mini-stat"><b>${fmtT(invTotalKg())}</b><span>Inventory (today)</span></div>
    </div>
    <h4>Purchasing by Location</h4>
    <table class="data"><thead><tr><th>Location</th><th class="num">Volume</th><th class="num">Share</th></tr></thead><tbody>
      ${Object.entries(locAgg).sort((a, b) => b[1] - a[1]).map(([l, kg]) => `<tr><td>${l}</td><td class="num">${fmtT(kg)}</td><td class="num">${pc((kg / Math.max(1, sumKg(pur))) * 100)}</td></tr>`).join('') || '<tr><td colspan="3">No purchases in period</td></tr>'}
    </tbody></table>
    <h4>Top Suppliers</h4>
    <table class="data"><thead><tr><th>Supplier</th><th class="num">Volume</th></tr></thead><tbody>
      ${topSup.map(([id, kg]) => `<tr><td>${esc(supplierById(id).name)}</td><td class="num">${fmtT(kg)}</td></tr>`).join('') || '<tr><td colspan="2">—</td></tr>'}
    </tbody></table>
    <h4>Shipments in Period</h4>
    <table class="data"><thead><tr><th>Shipment</th><th>Customer</th><th>Destination</th><th class="num">Tonnes</th><th class="num">FOB</th><th>Status</th></tr></thead><tbody>
      ${ships.map(s => `<tr><td>${s.id}</td><td>${esc(customerById(s.customer).name)}</td><td>${s.destination}</td><td class="num">${s.tonnes}</td><td class="num">${money(s.fob)}</td><td>${s.status}</td></tr>`).join('') || '<tr><td colspan="6">No shipments in period</td></tr>'}
    </tbody></table>
  </div>`;
}

/* ───────── ADMIN ───────── */
VIEWS.admin = {
  html() {
    return pageHead('Administration', '⚙️ ADMINISTRATION PANEL', 'Users · security · backups · audit trail')
      + `<div class="grid grid-2">
        <div class="card">
          <div class="card-title">Users &amp; Roles <button class="btn btn-sm btn-primary" onclick="App.formUser()">＋ Add User</button></div>
          ${tableShell('usr', [{ label: 'ID' }, { label: 'Name' }, { label: 'Role' }, { label: 'Status' }, { label: '' }])}
        </div>
        <div class="card">
          <div class="card-title">🔐 Security &amp; System Settings</div>
          <div class="form-grid">
            <div class="field"><label>Change PIN (4 digits)</label><input id="setPin" type="password" maxlength="4" inputmode="numeric" placeholder="••••"></div>
            <div class="field"><label>Session timeout (minutes)</label><input id="setTimeout" type="number" min="1" max="240" value="${DB.settings.timeoutMin}"></div>
            <div class="field"><label>Low stock alert (% of capacity)</label><input id="setLow" type="number" min="1" max="60" value="${DB.settings.lowStockPct}"></div>
            <div class="field"><label>Capacity warning (%)</label><input id="setCap" type="number" min="50" max="100" value="${DB.settings.capacityWarnPct}"></div>
          </div>
          <div class="form-actions"><button class="btn btn-primary" onclick="App.saveSettings()">💾 Save Settings</button></div>
          <div class="card-title" style="margin-top:18px">💾 Backups</div>
          <div class="head-actions">
            <button class="btn" onclick="App.backup()">⬇ Download Backup (JSON)</button>
            <label class="btn" style="cursor:pointer">⬆ Restore Backup<input type="file" accept=".json" style="display:none" onchange="App.restore(event)"></label>
            <button class="btn btn-danger" onclick="App.resetData()">♻ Reset Demo Data</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">🕓 Login History</div>
          <div style="max-height:300px;overflow:auto">
            ${DB.loginHistory.slice(0, 25).map(l => `<div class="audit-row"><span class="au-time">${esc(l.time)}</span><span>${esc(l.user)}</span><span style="margin-left:auto">${statusChip(l.result)}</span></div>`).join('') || '<div class="alert-empty">No logins recorded</div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-title">📜 Audit Trail</div>
          <div style="max-height:300px;overflow:auto">
            ${DB.audit.slice(0, 40).map(a => `<div class="audit-row"><span class="au-time">${esc(a.time)}</span><span><b>${esc(a.user)}</b> — ${esc(a.action)}</span></div>`).join('') || '<div class="alert-empty">No audit entries</div>'}
          </div>
        </div>
      </div>`;
  },
  init() {
    bindTable('usr', () => DB.users.map(u => `<tr><td class="t-strong">${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.role)}</td>
      <td>${statusChip(u.active ? 'Active' : 'Inactive')}</td>
      <td><button class="btn btn-sm" onclick="App.toggleUser('${u.id}')">${u.active ? 'Deactivate' : 'Activate'}</button></td></tr>`), 8);
  },
};

/* ═══════════ FORMS & ACTIONS ═══════════ */
const App = {
  go, pg(key, d) { S.pages[key] = (S.pages[key] || 0) + d; TBL[key].refresh(); },
  setTrend(p) { S.purchTrend = p; render(); },

  /* purchase */
  formPurchase() {
    openModal('Record Cocoa Purchase', `
      <div class="form-grid">
        <div class="field full"><label>Supplier</label><select id="pSup">${DB.suppliers.filter(s => s.active).map(s => `<option value="${s.id}">${esc(s.name)} — ${s.village}</option>`).join('')}</select></div>
        <div class="field"><label>Date</label><input id="pDate" type="date" value="${todayISO()}"></div>
        <div class="field"><label>Buying Point</label><select id="pLoc">${LOCATIONS.map(l => `<option value="${l.name}">${l.name} (${l.province})</option>`).join('')}</select></div>
        <div class="field"><label>Bean Type</label><select id="pType"><option>Dry Bean</option><option>Wet Bean</option><option>Fermented Bean</option></select></div>
        <div class="field"><label>Grade</label><select id="pGrade"><option>A</option><option>B</option><option>C</option></select></div>
        <div class="field"><label>Moisture %</label><input id="pMoist" type="number" step="0.1" value="7.0"></div>
        <div class="field"><label>Weight (kg)</label><input id="pKg" type="number" min="1" value="1000"></div>
        <div class="field"><label>Price per KG (Kina)</label><input id="pPrice" type="number" step="0.01" value="22.50"></div>
        <div class="field"><label>Payment</label><select id="pPaid"><option value="0">Pay later (creditor)</option><option value="1">Paid cash now</option></select></div>
        <div class="calc-line"><span>Total Value (Weight × Price)</span><span id="pTotal">K 22,500</span></div>
      </div>
      <div class="form-hint">Saving updates inventory, financials, supplier records & profitability instantly.</div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.savePurchase()">💾 Save Purchase</button></div>`,
      () => {
        const upd = () => { $('#pTotal').textContent = money((+$('#pKg').value || 0) * (+$('#pPrice').value || 0)); };
        ['pKg', 'pPrice'].forEach(id => $('#' + id).addEventListener('input', upd)); upd();
      });
  },
  savePurchase() {
    const kg = +$('#pKg').value, price = +$('#pPrice').value;
    if (!kg || !price) return toast('Weight and price are required', 'bad');
    const locName = $('#pLoc').value;
    const loc = LOCATIONS.find(l => l.name === locName);
    const paid = $('#pPaid').value === '1';
    const p = {
      id: uid('PUR'), date: $('#pDate').value || todayISO(), supplier: $('#pSup').value,
      buyingPoint: locName, province: loc.province, beanType: $('#pType').value, grade: $('#pGrade').value,
      moisture: +$('#pMoist').value || 0, kg, pricePerKg: price, total: Math.round(kg * price),
      paid, enteredBy: 'Jarrod Hulo',
    };
    DB.purchases.push(p);
    DB.movements.push({ id: uid('MV'), date: p.date, type: 'Received', wh: loc.wh, beanType: p.beanType, deltaKg: kg, ref: p.id, note: supplierById(p.supplier).name + ' · ' + locName });
    if (paid) DB.transactions.push({ id: uid('TXN'), date: p.date, dir: 'out', category: 'Supplier Payments', amount: p.total, desc: 'Cash purchase ' + p.id + ' — ' + supplierById(p.supplier).name, enteredBy: 'Jarrod Hulo', approvedBy: 'Jarrod Hulo', receipt: true });
    audit('Recorded purchase ' + p.id + ' — ' + fmtKg(kg) + ' ' + p.beanType + ' for ' + money(p.total));
    saveDB(); closeModal(); toast('Purchase saved — KPIs, inventory & finance updated'); render();
  },
  payPurchase(id) {
    const p = DB.purchases.find(x => x.id === id);
    if (!p) return;
    p.paid = true;
    DB.transactions.push({ id: uid('TXN'), date: todayISO(), dir: 'out', category: 'Supplier Payments', amount: p.total, desc: 'Settlement of ' + p.id + ' — ' + supplierById(p.supplier).name, enteredBy: 'Jarrod Hulo', approvedBy: 'Jarrod Hulo', receipt: true });
    audit('Paid supplier docket ' + id + ' — ' + money(p.total));
    saveDB(); toast('Supplier paid — cash & payables updated'); render();
  },

  /* shipment */
  formShipment() {
    openModal('New Export Shipment', `
      <div class="form-grid">
        <div class="field full"><label>Customer</label><select id="sCust">${DB.customers.filter(c => c.type !== 'Domestic Buyer').map(c => `<option value="${c.id}">${esc(c.name)} — ${c.country}</option>`).join('')}</select></div>
        <div class="field"><label>Contract</label><select id="sCon"><option value="">— Spot sale —</option>${DB.contracts.map(c => `<option value="${c.number}">${c.number} (${customerById(c.customer).name.split(' ')[0]}…)</option>`).join('')}</select></div>
        <div class="field"><label>Origin Warehouse</label><select id="sWh">${PORT_WH.map(w => `<option value="${w}">${warehouseById(w).name}</option>`).join('')}</select></div>
        <div class="field"><label>Vessel</label><input id="sVes" value="Coral Chief"></div>
        <div class="field"><label>Container No.</label><input id="sCont" value="TEMU ${Math.floor(Math.random() * 900000 + 100000)}-${Math.floor(Math.random() * 10)}"></div>
        <div class="field"><label>ETD</label><input id="sEtd" type="date" value="${iso(addDays(NOW, 10))}"></div>
        <div class="field"><label>ETA</label><input id="sEta" type="date" value="${iso(addDays(NOW, 40))}"></div>
        <div class="field"><label>Tonnes</label><input id="sT" type="number" min="1" value="50"></div>
        <div class="field"><label>FOB per tonne (Kina)</label><input id="sFobT" type="number" value="38000"></div>
        <div class="calc-line"><span>FOB Value</span><span id="sTotal">K 1,900,000</span></div>
      </div>
      <div class="form-hint">Export-ready stock available: ${PORT_WH.map(w => warehouseById(w).name.split(' ')[0] + ' ' + fmtT(whStock(w)['Export Ready'])).join(' · ')}</div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveShipment()">💾 Create Shipment</button></div>`,
      () => {
        const upd = () => { $('#sTotal').textContent = money((+$('#sT').value || 0) * (+$('#sFobT').value || 0)); };
        ['sT', 'sFobT'].forEach(id => $('#' + id).addEventListener('input', upd)); upd();
      });
  },
  saveShipment() {
    const t = +$('#sT').value, fobT = +$('#sFobT').value;
    if (!t || !fobT) return toast('Tonnes and FOB rate are required', 'bad');
    const cust = customerById($('#sCust').value);
    const dest = DEST[cust.country] ? cust.country : 'Singapore';
    const s = {
      id: uid('SHP'), container: $('#sCont').value, containers: Math.max(1, Math.round(t / 24)),
      customer: cust.id, contract: $('#sCon').value || '', destination: dest, port: DEST[dest].port,
      vessel: $('#sVes').value, etd: $('#sEtd').value, eta: $('#sEta').value,
      tonnes: t, fob: Math.round(t * fobT), status: 'Preparing', originWh: $('#sWh').value, paid: false,
    };
    DB.shipments.push(s);
    audit('Created shipment ' + s.id + ' — ' + t + ' t to ' + dest);
    saveDB(); closeModal(); toast('Shipment created — advance status as it progresses'); render();
  },
  advanceShipment(id) {
    const s = DB.shipments.find(x => x.id === id);
    if (!s) return;
    const order = ['Preparing', 'Processing', 'Packed', 'Loaded', 'In Transit', 'Delivered', 'Completed'];
    const next = order[Math.min(order.indexOf(s.status) + 1, order.length - 1)];
    if (s.status === 'Processing' && next === 'Packed') {
      const avail = whStock(s.originWh)['Export Ready'];
      if (avail < s.tonnes * 1000) return toast('Not enough export-ready stock at ' + warehouseById(s.originWh).name + ' (' + fmtT(avail) + ' available)', 'bad');
      DB.movements.push({ id: uid('MV'), date: todayISO(), type: 'Exported', wh: s.originWh, beanType: 'Export Ready', deltaKg: -s.tonnes * 1000, ref: s.id, note: customerById(s.customer).name + ' · ' + s.destination });
    }
    s.status = next;
    audit('Shipment ' + id + ' advanced to ' + next);
    saveDB(); toast(id + ' → ' + next); render();
  },
  payShipment(id) {
    const s = DB.shipments.find(x => x.id === id);
    if (!s) return;
    s.paid = true;
    DB.transactions.push({ id: uid('TXN'), date: todayISO(), dir: 'in', category: 'Export Payments', amount: s.fob, desc: s.id + ' — ' + s.destination + ' FOB settlement received', enteredBy: 'Maryanne Kila', approvedBy: 'Jarrod Hulo', receipt: true });
    audit('Received payment for ' + id + ' — ' + money(s.fob));
    saveDB(); toast('Payment received — cash & receivables updated'); render();
  },

  /* inventory movement */
  formMovement() {
    openModal('Record Inventory Movement', `
      <div class="form-grid">
        <div class="field"><label>Type</label><select id="mType"><option>Adjustment</option><option>Damaged</option><option>Transferred</option></select></div>
        <div class="field"><label>Date</label><input id="mDate" type="date" value="${todayISO()}"></div>
        <div class="field"><label>Warehouse</label><select id="mWh">${DB.warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select></div>
        <div class="field" id="mWh2Wrap" style="display:none"><label>Destination Warehouse</label><select id="mWh2">${DB.warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select></div>
        <div class="field"><label>Bean Type</label><select id="mBean">${BEAN_TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Quantity (kg) — use negative to deduct</label><input id="mKg" type="number" value="-100"></div>
        <div class="field full"><label>Note</label><input id="mNote" placeholder="Reason / reference"></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveMovement()">💾 Save Movement</button></div>`,
      () => {
        $('#mType').addEventListener('input', () => {
          $('#mWh2Wrap').style.display = $('#mType').value === 'Transferred' ? '' : 'none';
          if ($('#mType').value === 'Damaged') $('#mKg').value = -Math.abs(+$('#mKg').value || 100);
        });
      });
  },
  saveMovement() {
    const type = $('#mType').value, kg = Math.round(+$('#mKg').value || 0);
    if (!kg) return toast('Quantity required', 'bad');
    const date = $('#mDate').value || todayISO(), wh = $('#mWh').value, bean = $('#mBean').value, note = $('#mNote').value;
    if (type === 'Transferred') {
      const wh2 = $('#mWh2').value;
      if (wh2 === wh) return toast('Choose two different warehouses', 'bad');
      const amt = Math.abs(kg);
      const ref = uid('TRF');
      DB.movements.push({ id: uid('MV'), date, type, wh, beanType: bean, deltaKg: -amt, ref, note: 'To ' + warehouseById(wh2).name + (note ? ' — ' + note : '') });
      DB.movements.push({ id: uid('MV'), date, type, wh: wh2, beanType: bean, deltaKg: amt, ref, note: 'From ' + warehouseById(wh).name });
    } else {
      DB.movements.push({ id: uid('MV'), date, type, wh, beanType: bean, deltaKg: type === 'Damaged' ? -Math.abs(kg) : kg, ref: type.slice(0, 3).toUpperCase(), note });
    }
    audit('Inventory ' + type.toLowerCase() + ' — ' + fmtKg(kg) + ' ' + bean);
    saveDB(); closeModal(); toast('Movement recorded — stock levels updated'); render();
  },

  /* transaction */
  formTransaction() {
    const cats = { in: ['Cocoa Sales', 'Export Payments', 'Other Income'], out: ['Supplier Payments', 'Payroll', 'Fuel', 'Repairs', 'Logistics', 'Utilities', 'Office Expenses', 'Warehouse Expenses', 'Export Costs'] };
    openModal('Record Cash Transaction', `
      <div class="form-grid">
        <div class="field"><label>Direction</label><select id="tDir"><option value="out">Cash OUT</option><option value="in">Cash IN</option></select></div>
        <div class="field"><label>Date</label><input id="tDate" type="date" value="${todayISO()}"></div>
        <div class="field"><label>Category</label><select id="tCat">${cats.out.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Amount (Kina)</label><input id="tAmt" type="number" min="1" value="1000"></div>
        <div class="field full"><label>Description</label><input id="tDesc" placeholder="What was this for?"></div>
        <div class="field"><label>Approved By</label><select id="tAppr">${DB.users.filter(u => u.active).map(u => `<option>${u.name}</option>`).join('')}</select></div>
        <div class="field"><label>Receipt Attached</label><select id="tRec"><option value="1">Yes 📎</option><option value="0">No</option></select></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveTransaction()">💾 Save Transaction</button></div>`,
      () => {
        $('#tDir').addEventListener('input', () => {
          $('#tCat').innerHTML = cats[$('#tDir').value].map(c => `<option>${c}</option>`).join('');
        });
      });
  },
  saveTransaction() {
    const amt = +$('#tAmt').value;
    if (!amt) return toast('Amount required', 'bad');
    DB.transactions.push({
      id: uid('TXN'), date: $('#tDate').value || todayISO(), dir: $('#tDir').value,
      category: $('#tCat').value, amount: Math.round(amt), desc: $('#tDesc').value || $('#tCat').value,
      enteredBy: 'Jarrod Hulo', approvedBy: $('#tAppr').value, receipt: $('#tRec').value === '1',
    });
    DB.transactions.sort((a, b) => a.date < b.date ? -1 : 1);
    audit('Recorded ' + ($('#tDir').value === 'in' ? 'cash in' : 'cash out') + ' — ' + money(amt) + ' (' + $('#tCat').value + ')');
    saveDB(); closeModal(); toast('Transaction saved — cash balance updated'); render();
  },

  /* supplier / customer / contract / asset / vehicle / user */
  formSupplier() {
    openModal('Add Supplier', `
      <div class="form-grid">
        <div class="field full"><label>Supplier Name</label><input id="nSname" placeholder="e.g. Gazelle Growers Co-op"></div>
        <div class="field"><label>Village</label><input id="nSvil"></div>
        <div class="field"><label>Province</label><select id="nSprov">${[...new Set(LOCATIONS.map(l => l.province))].map(p => `<option>${p}</option>`).join('')}</select></div>
        <div class="field"><label>Nearest Buying Point</label><select id="nSloc">${LOCATIONS.map(l => `<option>${l.name}</option>`).join('')}</select></div>
        <div class="field"><label>Phone</label><input id="nSph" placeholder="+675 …"></div>
        <div class="field full"><label>Bank Details</label><input id="nSbank" placeholder="Bank · branch · account"></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveSupplier()">💾 Add Supplier</button></div>`);
  },
  saveSupplier() {
    const name = $('#nSname').value.trim();
    if (!name) return toast('Name required', 'bad');
    DB.suppliers.push({
      id: 'SUP-' + String(DB.suppliers.length + 1).padStart(3, '0'), name, village: $('#nSvil').value,
      province: $('#nSprov').value, buyingPoint: $('#nSloc').value, phone: $('#nSph').value,
      bank: $('#nSbank').value, active: true, joined: todayISO(),
    });
    audit('Added supplier ' + name);
    saveDB(); closeModal(); toast('Supplier added'); render();
  },
  supplierProfile(id) {
    const s = supplierStats().find(x => x.id === id);
    const recent = DB.purchases.filter(p => p.supplier === id).slice(-8).reverse();
    openModal('Supplier Scorecard — ' + s.name, `
      <div class="mini-row" style="margin-bottom:14px">
        <div class="mini-stat"><b>${s.deliveries}</b><span>Deliveries</span></div>
        <div class="mini-stat"><b>${fmtT(s.kg)}</b><span>Total volume</span></div>
        <div class="mini-stat"><b>${kAbbr(s.val)}</b><span>Total value</span></div>
        <div class="mini-stat"><b>${s.quality.toFixed(0)}/100</b><span>Avg quality</span></div>
        <div class="mini-stat"><b>${s.unpaid ? money(s.unpaid) : 'K 0'}</b><span>Unpaid balance</span></div>
      </div>
      <div class="form-hint">📞 ${esc(s.phone)} · 🏦 ${esc(s.bank)} · Joined ${fmtDate(s.joined)} · Last delivery ${s.last ? fmtDate(s.last) : '—'}</div>
      <h4 style="margin:14px 0 8px;font-size:12px;letter-spacing:1px;color:var(--accent)">RECENT DELIVERIES</h4>
      <div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Type</th><th>Grade</th><th class="num">Kg</th><th class="num">Total</th><th>Paid</th></tr></thead>
      <tbody>${recent.map(p => `<tr><td>${fmtDate(p.date)}</td><td>${p.beanType.replace(' Bean', '')}</td><td>${p.grade}</td><td class="num">${p.kg.toLocaleString()}</td><td class="num">${money(p.total)}</td><td>${p.paid ? '✅' : '⏳'}</td></tr>`).join('')}</tbody></table></div>`);
  },
  formCustomer() {
    openModal('Add Customer', `
      <div class="form-grid">
        <div class="field full"><label>Company Name</label><input id="nCname"></div>
        <div class="field"><label>Country</label><select id="nCcty">${[...Object.keys(DEST), 'Papua New Guinea'].map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Type</label><select id="nCtype"><option>Export Client</option><option>International Buyer</option><option>Domestic Buyer</option></select></div>
        <div class="field"><label>Contact Person</label><input id="nCper"></div>
        <div class="field"><label>Email</label><input id="nCem" type="email"></div>
        <div class="field full"><label>Phone</label><input id="nCph"></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveCustomer()">💾 Add Customer</button></div>`);
  },
  saveCustomer() {
    const name = $('#nCname').value.trim();
    if (!name) return toast('Company name required', 'bad');
    DB.customers.push({
      id: 'CUS-' + String(DB.customers.length + 1).padStart(3, '0'), name, country: $('#nCcty').value,
      contact: $('#nCper').value, email: $('#nCem').value, phone: $('#nCph').value, type: $('#nCtype').value,
    });
    audit('Added customer ' + name);
    saveDB(); closeModal(); toast('Customer added'); render();
  },
  customerProfile(id) {
    const c = customerStats().find(x => x.id === id);
    const ships = DB.shipments.filter(s => s.customer === id).slice().reverse();
    openModal('Customer History — ' + c.name, `
      <div class="mini-row" style="margin-bottom:14px">
        <div class="mini-stat"><b>${c.shipments}</b><span>Shipments</span></div>
        <div class="mini-stat"><b>${c.tonnes.toFixed(0)} t</b><span>Volume</span></div>
        <div class="mini-stat"><b>${kAbbr(c.revenue)}</b><span>Revenue</span></div>
        <div class="mini-stat"><b>${c.activeContracts}</b><span>Active contracts</span></div>
      </div>
      <div class="form-hint">👤 ${esc(c.contact)} · ✉️ ${esc(c.email)} · 📞 ${esc(c.phone)} · ${c.country}</div>
      <h4 style="margin:14px 0 8px;font-size:12px;letter-spacing:1px;color:var(--accent)">SHIPMENT HISTORY</h4>
      <div class="table-wrap"><table class="data"><thead><tr><th>Shipment</th><th>ETD</th><th class="num">Tonnes</th><th class="num">FOB</th><th>Status</th></tr></thead>
      <tbody>${ships.map(s => `<tr><td>${s.id}</td><td>${fmtDate(s.etd)}</td><td class="num">${s.tonnes}</td><td class="num">${money(s.fob)}</td><td>${s.status}</td></tr>`).join('') || '<tr><td colspan="5">No shipments yet</td></tr>'}</tbody></table></div>`);
  },
  formContract() {
    openModal('New Supply Contract', `
      <div class="form-grid">
        <div class="field full"><label>Customer</label><select id="nKcust">${DB.customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Start Date</label><input id="nKstart" type="date" value="${todayISO()}"></div>
        <div class="field"><label>End Date</label><input id="nKend" type="date" value="${iso(addDays(NOW, 365))}"></div>
        <div class="field"><label>Volume (tonnes)</label><input id="nKvol" type="number" min="1" value="200"></div>
        <div class="field"><label>Contract Value (Kina)</label><input id="nKval" type="number" min="1" value="7500000"></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveContract()">💾 Create Contract</button></div>`);
  },
  saveContract() {
    const vol = +$('#nKvol').value, val = +$('#nKval').value;
    if (!vol || !val) return toast('Volume and value required', 'bad');
    const num = 'CN-' + NOW.getFullYear() + '-' + String(DB.contracts.length + 1).padStart(3, '0');
    DB.contracts.push({ number: num, customer: $('#nKcust').value, start: $('#nKstart').value, end: $('#nKend').value, volumeT: vol, valueK: val });
    audit('Created contract ' + num);
    saveDB(); closeModal(); toast('Contract created'); render();
  },
  formAsset() {
    openModal('Add Asset', `
      <div class="form-grid">
        <div class="field full"><label>Asset Name</label><input id="nAname" placeholder="e.g. Toyota Hilux SR5 (REG-123)"></div>
        <div class="field"><label>Category</label><select id="nAcat"><option>Vehicle</option><option>Machinery</option><option>Building</option></select></div>
        <div class="field"><label>Purchase Date</label><input id="nAdate" type="date" value="${todayISO()}"></div>
        <div class="field"><label>Purchase Cost (K)</label><input id="nAcost" type="number" value="100000"></div>
        <div class="field"><label>Current Value (K)</label><input id="nAval" type="number" value="100000"></div>
        <div class="field"><label>Location</label><input id="nAloc"></div>
        <div class="field"><label>Assigned To</label><input id="nAass"></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveAsset()">💾 Add Asset</button></div>`);
  },
  saveAsset() {
    const name = $('#nAname').value.trim();
    if (!name) return toast('Asset name required', 'bad');
    DB.assets.push({
      id: 'AST-' + String(DB.assets.length + 1).padStart(3, '0'), name, category: $('#nAcat').value,
      purchased: $('#nAdate').value, cost: +$('#nAcost').value || 0, value: +$('#nAval').value || 0,
      location: $('#nAloc').value, assignedTo: $('#nAass').value, status: 'Operational',
    });
    audit('Added asset ' + name);
    saveDB(); closeModal(); toast('Asset added'); render();
  },
  cycleAsset(id) {
    const a = DB.assets.find(x => x.id === id);
    const order = ['Operational', 'Maintenance Due', 'Under Repair', 'Out of Service'];
    a.status = order[(order.indexOf(a.status) + 1) % order.length];
    audit('Asset ' + id + ' status → ' + a.status);
    saveDB(); toast(a.name + ' → ' + a.status, 'info'); render();
  },
  formVehicle() {
    openModal('Add Fleet Vehicle', `
      <div class="form-grid">
        <div class="field"><label>Registration</label><input id="nVreg" placeholder="ABC-123"></div>
        <div class="field"><label>Model</label><input id="nVmod" placeholder="Toyota Hilux"></div>
        <div class="field"><label>Driver</label><input id="nVdrv"></div>
        <div class="field"><label>Fuel L/100km</label><input id="nVfuel" type="number" step="0.1" value="12"></div>
        <div class="field"><label>Insurance Expiry</label><input id="nVins" type="date" value="${iso(addDays(NOW, 365))}"></div>
        <div class="field"><label>Rego Expiry</label><input id="nVrego" type="date" value="${iso(addDays(NOW, 365))}"></div>
        <div class="field"><label>Driver Licence Expiry</label><input id="nVlic" type="date" value="${iso(addDays(NOW, 365))}"></div>
        <div class="field"><label>Current Location</label><input id="nVloc"></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveVehicle()">💾 Add Vehicle</button></div>`);
  },
  saveVehicle() {
    const rego = $('#nVreg').value.trim();
    if (!rego) return toast('Registration required', 'bad');
    DB.vehicles.push({
      rego, model: $('#nVmod').value, driver: $('#nVdrv').value, fuelL100: +$('#nVfuel').value || 0,
      insuranceExpiry: $('#nVins').value, regoExpiry: $('#nVrego').value, licenceExpiry: $('#nVlic').value,
      location: $('#nVloc').value, lastService: todayISO(),
    });
    audit('Added fleet vehicle ' + rego);
    saveDB(); closeModal(); toast('Vehicle added'); render();
  },
  formUser() {
    openModal('Add User', `
      <div class="form-grid">
        <div class="field full"><label>Full Name</label><input id="nUname"></div>
        <div class="field full"><label>Role</label><select id="nUrole">${['Managing Director', 'Finance Manager', 'Operations Manager', 'Export Manager', 'Warehouse Manager', 'Data Entry Officer'].map(r => `<option>${r}</option>`).join('')}</select></div>
      </div>
      <div class="form-actions"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveUser()">💾 Add User</button></div>`);
  },
  saveUser() {
    const name = $('#nUname').value.trim();
    if (!name) return toast('Name required', 'bad');
    DB.users.push({
      id: 'U-' + String(DB.users.length + 1).padStart(3, '0'), name, role: $('#nUrole').value,
      initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(), active: true,
    });
    audit('Added user ' + name + ' (' + $('#nUrole').value + ')');
    saveDB(); closeModal(); toast('User added'); render();
  },
  toggleUser(id) {
    const u = DB.users.find(x => x.id === id);
    u.active = !u.active;
    audit((u.active ? 'Activated' : 'Deactivated') + ' user ' + u.name);
    saveDB(); render();
  },

  /* settings / backup */
  saveSettings() {
    const pin = $('#setPin').value.trim();
    if (pin) {
      if (!/^\d{4}$/.test(pin)) return toast('PIN must be exactly 4 digits', 'bad');
      DB.settings.pin = pin;
      audit('PIN changed');
    }
    DB.settings.timeoutMin = Math.max(1, +$('#setTimeout').value || 15);
    DB.settings.lowStockPct = Math.max(1, +$('#setLow').value || 15);
    DB.settings.capacityWarnPct = Math.max(50, +$('#setCap').value || 90);
    audit('System settings updated');
    saveDB(); toast('Settings saved'); render();
  },
  backup() {
    const blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pngpc-backup-' + todayISO() + '.json';
    a.click();
    audit('Backup downloaded');
    toast('Backup downloaded');
  },
  restore(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.version || !data.purchases) throw new Error('bad file');
        DB = data; saveDB(); applyTheme();
        audit('Backup restored from file');
        toast('Backup restored'); render();
      } catch (e) { toast('Invalid backup file', 'bad'); }
    };
    r.readAsText(f);
  },
  resetData() {
    if (confirm('Reset ALL data back to the demo dataset?\nYour entered records will be lost.')) {
      resetDB(); applyTheme(); toast('Demo data regenerated', 'info'); render();
    }
  },

  /* reports + exports */
  buildReport(kind) {
    $('#reportPreview').innerHTML = `<div class="head-actions" style="margin-bottom:12px">
      <button class="btn btn-primary" onclick="window.print()">🖨 Print / PDF</button>
      <button class="btn" onclick="App.exportReportExcel()">📗 Excel</button>
      <button class="btn" onclick="App.exportCSV('purchases')">📄 CSV (purchases)</button>
    </div>` + buildReportHTML(kind);
    audit('Generated ' + kind + ' report');
    $('#reportPreview').scrollIntoView({ behavior: 'smooth' });
  },
  exportReportExcel() {
    const doc = document.getElementById('reportDoc');
    if (!doc) return;
    const html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>' + doc.innerHTML + '</body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pngpc-report-' + todayISO() + '.xls';
    a.click();
    toast('Excel report downloaded');
  },
  exportCSV(kind) {
    let rows = [], name = kind;
    if (kind === 'purchases') {
      rows = [['Docket', 'Date', 'Supplier', 'BuyingPoint', 'Province', 'BeanType', 'Grade', 'MoisturePct', 'WeightKg', 'PricePerKg', 'TotalK', 'Paid', 'EnteredBy'],
        ...DB.purchases.map(p => [p.id, p.date, supplierById(p.supplier).name, p.buyingPoint, p.province, p.beanType, p.grade, p.moisture, p.kg, p.pricePerKg, p.total, p.paid ? 'Yes' : 'No', p.enteredBy])];
    } else if (kind === 'shipments') {
      rows = [['Shipment', 'Container', 'Customer', 'Destination', 'Port', 'Vessel', 'ETD', 'ETA', 'Tonnes', 'FOB_K', 'Status', 'Paid'],
        ...DB.shipments.map(s => [s.id, s.container, customerById(s.customer).name, s.destination, s.port, s.vessel, s.etd, s.eta, s.tonnes, s.fob, s.status, s.paid ? 'Yes' : 'No'])];
    } else if (kind === 'transactions') {
      rows = [['Ref', 'Date', 'Direction', 'Category', 'AmountK', 'Description', 'EnteredBy', 'ApprovedBy'],
        ...DB.transactions.map(x => [x.id, x.date, x.dir, x.category, x.amount, x.desc, x.enteredBy, x.approvedBy])];
    } else if (kind === 'suppliers') {
      rows = [['ID', 'Name', 'Village', 'Province', 'Phone', 'Bank', 'Active', 'Deliveries', 'VolumeKg', 'ValueK', 'Quality'],
        ...supplierStats().map(s => [s.id, s.name, s.village, s.province, s.phone, s.bank, s.active ? 'Yes' : 'No', s.deliveries, s.kg, s.val, s.quality.toFixed(0)])];
    } else if (kind === 'movements') {
      rows = [['Ref', 'Date', 'Type', 'Warehouse', 'BeanType', 'DeltaKg', 'Linked', 'Note'],
        ...DB.movements.map(m => [m.id, m.date, m.type, warehouseById(m.wh).name, m.beanType, m.deltaKg, m.ref, m.note])];
    } else if (kind === 'assets') {
      rows = [['ID', 'Name', 'Category', 'Purchased', 'CostK', 'ValueK', 'Location', 'AssignedTo', 'Status'],
        ...DB.assets.map(a => [a.id, a.name, a.category, a.purchased, a.cost, a.value, a.location, a.assignedTo, a.status])];
    }
    const csv = rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pngpc-' + name + '-' + todayISO() + '.csv';
    a.click();
    toast('CSV exported — ' + (rows.length - 1) + ' rows');
  },
  closeModal,
};
window.App = App;

/* ═══════════ BOOT ═══════════ */
loadDB();
applyTheme();
initLogin();
initShell();
if (sessionStorage.getItem('pngpc_auth') === '1') {
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  startSession();
  go('dashboard');
}
