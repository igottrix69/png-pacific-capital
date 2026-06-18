/* ═══════════════════════════════════════════════════════════
   PNG PACIFIC CAPITAL — Data Layer
   localStorage store · deterministic seed · derived analytics
   Every KPI / chart / alert is COMPUTED from the records below,
   so entering new data updates the whole system automatically.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const DB_KEY = 'pngpc_db_v1';
const NOW = new Date();

/* ───── tiny utils ───── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let _R = mulberry32(20260612);
const rnd = () => _R();
const ri = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const rf = (a, b) => rnd() * (b - a) + a;
const pick = arr => arr[Math.floor(rnd() * arr.length)];

const iso = d => {
  const x = new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
};
const todayISO = () => iso(NOW);
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function monthKey(d) { return String(d).slice(0, 7); }
function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d + 'T00:00:00');
  return x.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function money(n, dec = 0) {
  const neg = n < 0;
  const v = Math.abs(Number(n) || 0);
  return (neg ? '−K ' : 'K ') + v.toLocaleString('en-AU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtKg(kg) {
  kg = Number(kg) || 0;
  if (Math.abs(kg) >= 1000) return (kg / 1000).toLocaleString('en-AU', { maximumFractionDigits: 1 }) + ' t';
  return kg.toLocaleString('en-AU', { maximumFractionDigits: 0 }) + ' kg';
}
function fmtT(kg) { return ((Number(kg) || 0) / 1000).toLocaleString('en-AU', { maximumFractionDigits: 1 }) + ' t'; }
function pc(n) { return (Number(n) || 0).toFixed(1) + '%'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(); }

/* ───── static reference data ───── */
const LOCATIONS = [
  { name: 'Kokopo', province: 'East New Britain', wh: 'WH-KKP' },
  { name: 'Kimbe', province: 'West New Britain', wh: 'WH-KMB' },
  { name: 'Popondetta', province: 'Oro', wh: 'WH-LAE' },
  { name: 'Lae', province: 'Morobe', wh: 'WH-LAE' },
  { name: 'Madang', province: 'Madang', wh: 'WH-MDG' },
  { name: 'Wewak', province: 'East Sepik', wh: 'WH-WWK' },
  { name: 'Goroka', province: 'Eastern Highlands', wh: 'WH-LAE' },
  { name: 'Kundiawa', province: 'Chimbu', wh: 'WH-LAE' },
];
const BEAN_TYPES = ['Wet Bean', 'Dry Bean', 'Fermented Bean', 'Export Ready'];
const PORT_WH = ['WH-LAE', 'WH-KKP'];

const DEST = {
  Netherlands: { port: 'Amsterdam', lat: 52.37, lon: 4.9 },
  Germany: { port: 'Hamburg', lat: 53.55, lon: 9.99 },
  Singapore: { port: 'Singapore', lat: 1.35, lon: 103.82 },
  Malaysia: { port: 'Port Klang', lat: 3.0, lon: 101.39 },
  USA: { port: 'Philadelphia', lat: 39.95, lon: -75.16 },
  Japan: { port: 'Yokohama', lat: 35.44, lon: 139.64 },
  Belgium: { port: 'Antwerp', lat: 51.22, lon: 4.4 },
  Australia: { port: 'Brisbane', lat: -27.47, lon: 153.03 },
};
const ORIGIN = { name: 'Port Moresby / Lae, PNG', lat: -6.73, lon: 147.0 };

/* ═══════════ SEED GENERATION ═══════════ */
function generateSeed() {
  _R = mulberry32(20260612);
  const db = {
    version: 1,
    settings: { pin: '0000', theme: 'dark', timeoutMin: 15, lowStockPct: 15, capacityWarnPct: 90 },
    users: [
      { id: 'U-001', name: 'Jarrod Hulo', role: 'Managing Director', initials: 'JH', active: true },
      { id: 'U-002', name: 'Maryanne Kila', role: 'Finance Manager', initials: 'MK', active: true },
      { id: 'U-003', name: 'David Temu', role: 'Operations Manager', initials: 'DT', active: true },
      { id: 'U-004', name: 'Grace Wartovo', role: 'Export Manager', initials: 'GW', active: true },
      { id: 'U-005', name: 'Samuel Gere', role: 'Warehouse Manager', initials: 'SG', active: true },
      { id: 'U-006', name: 'Ruth Namaliu', role: 'Data Entry Officer', initials: 'RN', active: true },
    ],
    warehouses: [
      { id: 'WH-KKP', name: 'Kokopo Central Warehouse', manager: 'Peter Tovue', capacityKg: 800000, province: 'East New Britain', maintenance: 'Good' },
      { id: 'WH-KMB', name: 'Kimbe Bay Depot', manager: 'Lucy Karim', capacityKg: 450000, province: 'West New Britain', maintenance: 'Good' },
      { id: 'WH-LAE', name: 'Lae Port Export Facility', manager: 'Samuel Gere', capacityKg: 1200000, province: 'Morobe', maintenance: 'Inspection due' },
      { id: 'WH-MDG', name: 'Madang Coastal Store', manager: 'Anna Bogan', capacityKg: 350000, province: 'Madang', maintenance: 'Good' },
      { id: 'WH-WWK', name: 'Wewak North Depot', manager: 'Joseph Maru', capacityKg: 300000, province: 'East Sepik', maintenance: 'Roof repair scheduled' },
    ],
    suppliers: [], purchases: [], movements: [], shipments: [], customers: [], contracts: [],
    assets: [], vehicles: [], transactions: [], loginHistory: [], audit: [],
  };

  /* suppliers */
  const supDefs = [
    ['Toval Cocoa Cooperative', 'Toma', 'East New Britain', 'Kokopo'],
    ['Bitapaka Growers Assn', 'Bitapaka', 'East New Britain', 'Kokopo'],
    ['Warangoi Family Estates', 'Warangoi', 'East New Britain', 'Kokopo'],
    ['Kavui Block Holders', 'Kavui', 'West New Britain', 'Kimbe'],
    ['Talasea Smallholders', 'Talasea', 'West New Britain', 'Kimbe'],
    ['Sangara Plantation Group', 'Sangara', 'Oro', 'Popondetta'],
    ['Kokoda Valley Farmers', 'Kokoda', 'Oro', 'Popondetta'],
    ['Markham Valley Cocoa', 'Mutzing', 'Morobe', 'Lae'],
    ['Salamaua Coastal Growers', 'Salamaua', 'Morobe', 'Lae'],
    ['Transgogol Cocoa Assn', 'Transgogol', 'Madang', 'Madang'],
    ['Karkar Island Estates', 'Karkar', 'Madang', 'Madang'],
    ['Maprik Growers Co-op', 'Maprik', 'East Sepik', 'Wewak'],
    ['Yangoru Family Farms', 'Yangoru', 'East Sepik', 'Wewak'],
    ['Asaro Valley Producers', 'Asaro', 'Eastern Highlands', 'Goroka'],
  ];
  const banks = ['BSP — Kokopo', 'BSP — Kimbe', 'Kina Bank — Lae', 'BSP — Madang', 'Westpac — Lae', 'BSP — Wewak', 'Kina Bank — Goroka'];
  supDefs.forEach((s, i) => {
    db.suppliers.push({
      id: 'SUP-' + String(i + 1).padStart(3, '0'),
      name: s[0], village: s[1], province: s[2], buyingPoint: s[3],
      phone: '+675 7' + ri(10, 99) + ' ' + ri(10000, 99999),
      bank: pick(banks) + ' · ' + ri(1000000, 9999999),
      active: i !== 13 ? true : false,
      joined: iso(addDays('2025-01-01', ri(0, 90))),
    });
  });

  /* customers */
  const custDefs = [
    ['Amstel Cocoa Trading BV', 'Netherlands', 'Daan Visser', 'd.visser@amstelcocoa.nl'],
    ['Hamburg Kakao Handel GmbH', 'Germany', 'Petra Lange', 'p.lange@hkakao.de'],
    ['Singapore Commodity Partners', 'Singapore', 'Wei Lim Tan', 'wl.tan@sgcommodity.sg'],
    ['Klang Cocoa Industries Sdn Bhd', 'Malaysia', 'Ahmad Razak', 'a.razak@klangcocoa.my'],
    ['Liberty Bean Importers LLC', 'USA', 'Sarah Whitman', 's.whitman@libertybean.com'],
    ['Tokyo Cacao Trading KK', 'Japan', 'Kenji Watanabe', 'k.watanabe@tokyocacao.jp'],
    ['Antwerp Fine Cocoa NV', 'Belgium', 'Lukas Mertens', 'l.mertens@antwerpcocoa.be'],
    ['Brisbane Cocoa Merchants Pty', 'Australia', 'Emma Crawford', 'e.crawford@briscocoa.com.au'],
    ['Paradise Chocolate PNG Ltd', 'Papua New Guinea', 'Michael Toropo', 'm.toropo@paradisechoc.pg'],
  ];
  custDefs.forEach((c, i) => {
    db.customers.push({
      id: 'CUS-' + String(i + 1).padStart(3, '0'),
      name: c[0], country: c[1], contact: c[2], email: c[3],
      phone: '+' + ri(1, 81) + ' ' + ri(200, 999) + ' ' + ri(100000, 999999),
      type: c[1] === 'Papua New Guinea' ? 'Domestic Buyer' : 'Export Client',
    });
  });

  /* contracts */
  const conDefs = [
    ['CN-2025-001', 'CUS-001', '2025-02-01', '2026-01-31', 420, 14700000],
    ['CN-2025-002', 'CUS-003', '2025-03-15', '2026-03-14', 300, 10800000],
    ['CN-2025-003', 'CUS-002', '2025-06-01', '2026-07-05', 260, 9600000],
    ['CN-2025-004', 'CUS-005', '2025-08-01', '2026-07-31', 240, 8900000],
    ['CN-2026-001', 'CUS-006', '2026-01-10', '2026-12-31', 320, 12500000],
    ['CN-2026-002', 'CUS-004', '2026-03-01', '2027-02-28', 280, 10400000],
  ];
  conDefs.forEach(c => db.contracts.push({
    number: c[0], customer: c[1], start: c[2], end: c[3], volumeT: c[4], valueK: c[5],
  }));

  /* assets */
  const assetDefs = [
    ['AST-001', 'Toyota Hilux SR5 (LBS-412)', 'Vehicle', '2024-03-12', 185000, 142000, 'Kokopo', 'David Temu', 'Operational'],
    ['AST-002', 'Toyota Hilux SR5 (LBS-518)', 'Vehicle', '2024-07-02', 189000, 156000, 'Lae', 'Field Team Morobe', 'Operational'],
    ['AST-003', 'Toyota Hilux SR (MAG-101)', 'Vehicle', '2023-11-20', 172000, 121000, 'Madang', 'Field Team Madang', 'Maintenance Due'],
    ['AST-004', 'Toyota LandCruiser 79 (KBE-244)', 'Vehicle', '2023-05-18', 248000, 176000, 'Kimbe', 'Lucy Karim', 'Operational'],
    ['AST-005', 'Toyota LandCruiser 76 (POM-779)', 'Vehicle', '2025-02-04', 295000, 261000, 'Port Moresby', 'Jarrod Hulo', 'Operational'],
    ['AST-006', 'Isuzu FVR 8t Truck (LAE-882)', 'Vehicle', '2024-01-15', 320000, 252000, 'Lae', 'Logistics', 'Operational'],
    ['AST-007', 'Isuzu NPS 4t Truck (KKP-330)', 'Vehicle', '2023-08-22', 215000, 152000, 'Kokopo', 'Logistics', 'Under Repair'],
    ['AST-008', 'Toyota 8FD25 Forklift', 'Machinery', '2024-05-10', 98000, 78000, 'Lae Port Facility', 'Samuel Gere', 'Operational'],
    ['AST-009', 'Samoa Cocoa Dryer ×4', 'Machinery', '2023-04-01', 145000, 96000, 'Kokopo Central', 'Peter Tovue', 'Operational'],
    ['AST-010', 'Rotary Cocoa Dryer (12t)', 'Machinery', '2025-06-15', 410000, 372000, 'Lae Port Facility', 'Samuel Gere', 'Operational'],
    ['AST-011', 'FG Wilson 110kVA Generator', 'Machinery', '2024-02-28', 86000, 66000, 'Kokopo Central', 'Peter Tovue', 'Maintenance Due'],
    ['AST-012', 'Avery 60t Weighbridge', 'Machinery', '2023-09-05', 230000, 184000, 'Lae Port Facility', 'Samuel Gere', 'Operational'],
    ['AST-013', 'Fermentation House (24 boxes)', 'Building', '2023-03-15', 175000, 150000, 'Kokopo Central', 'Operations', 'Operational'],
    ['AST-014', 'Kokopo Central Warehouse', 'Building', '2023-01-10', 1450000, 1320000, 'Kokopo', 'Peter Tovue', 'Operational'],
    ['AST-015', 'Lae Port Export Facility', 'Building', '2023-01-10', 2600000, 2410000, 'Lae', 'Samuel Gere', 'Operational'],
    ['AST-016', 'Head Office — Kokopo', 'Building', '2023-02-01', 680000, 642000, 'Kokopo', 'Jarrod Hulo', 'Operational'],
  ];
  assetDefs.forEach(a => db.assets.push({
    id: a[0], name: a[1], category: a[2], purchased: a[3], cost: a[4], value: a[5],
    location: a[6], assignedTo: a[7], status: a[8],
  }));

  /* fleet (linked to vehicle assets) */
  const fleetDefs = [
    ['LBS-412', 'Toyota Hilux SR5', 'Joseph Kanawi', 11.8, '2026-09-14', '2026-08-02', 'Kokopo', '2027-03-19', '2026-04-28'],
    ['LBS-518', 'Toyota Hilux SR5', 'Martin Sori', 12.4, '2026-07-03', '2026-11-15', 'Lae', '2026-12-04', '2026-03-10'],
    ['MAG-101', 'Toyota Hilux SR', 'Paul Gima', 13.1, '2026-06-25', '2026-07-08', 'Madang', '2026-06-30', '2025-12-12'],
    ['KBE-244', 'LandCruiser 79', 'Thomas Vele', 14.6, '2027-01-20', '2026-10-11', 'Kimbe', '2027-05-22', '2026-02-14'],
    ['POM-779', 'LandCruiser 76', 'Jarrod Hulo', 13.9, '2027-02-04', '2027-01-15', 'Port Moresby', '2028-01-30', '2026-05-02'],
    ['LAE-882', 'Isuzu FVR 8t', 'Robert Aihi', 24.2, '2026-08-19', '2026-09-30', 'Lae', '2026-11-08', '2026-05-20'],
    ['KKP-330', 'Isuzu NPS 4t', 'Andrew Loko', 31.5, '2026-10-02', '2026-12-22', 'Kokopo (workshop)', '2027-02-11', '2026-01-25'],
    ['FORK-01', 'Toyota 8FD25 Forklift', 'Yard Crew', 0, '2027-04-01', '2099-01-01', 'Lae Port Facility', '2027-08-15', '2026-06-01'],
  ];
  fleetDefs.forEach(v => db.vehicles.push({
    rego: v[0], model: v[1], driver: v[2], fuelL100: v[3],
    insuranceExpiry: v[4], regoExpiry: v[5], location: v[6], licenceExpiry: v[7], lastService: v[8],
  }));

  /* ── time-series generation with running stock ── */
  const stock = {}; // key wh|type -> kg
  const stk = (wh, t) => stock[wh + '|' + t] || 0;
  const addStock = (wh, t, kg) => { stock[wh + '|' + t] = (stock[wh + '|' + t] || 0) + kg; };
  let mvSeq = 0, puSeq = 0;
  const mv = (date, type, wh, beanType, deltaKg, ref, note) => {
    db.movements.push({ id: 'MV-' + String(++mvSeq).padStart(5, '0'), date, type, wh, beanType, deltaKg: Math.round(deltaKg), ref: ref || '', note: note || '' });
    addStock(wh, beanType, Math.round(deltaKg));
  };

  const start = new Date('2025-01-05T00:00:00');
  const days = daysBetween(start, NOW);
  const officers = ['Ruth Namaliu', 'David Temu', 'Grace Wartovo'];

  /* shipment plan: every ~5 weeks from Mar 2025 */
  const shipPlan = [];
  let sd = new Date('2025-03-12T00:00:00');
  let sn = 0;
  const vessels = ['Kota Ratu', 'Coral Chief', 'Highland Chief', 'Chief Kapilik', 'Madang Coast', 'Pacific Islander II'];
  while (sd < addDays(NOW, 40)) {
    sn++;
    shipPlan.push({ etd: new Date(sd), n: sn });
    sd = addDays(sd, ri(30, 42));
  }
  /* guarantee a fresh in-transit shipment + a pending pipeline for the exec dashboard */
  shipPlan.push({ etd: addDays(NOW, -7), n: ++sn });
  if (!shipPlan.some(p => { const d = daysBetween(todayISO(), iso(p.etd)); return d > 0 && d <= 14; })) shipPlan.push({ etd: addDays(NOW, 9), n: ++sn });
  if (!shipPlan.some(p => daysBetween(todayISO(), iso(p.etd)) > 14)) shipPlan.push({ etd: addDays(NOW, 24), n: ++sn });

  for (let d = 0; d <= days; d++) {
    const date = addDays(start, d);
    const dISO = iso(date);
    const m = date.getMonth(); // seasonality: flush Apr–Jul & Oct–Dec
    const season = [0.55, 0.6, 0.8, 1.1, 1.25, 1.2, 1.05, 0.75, 0.7, 1.0, 1.15, 1.05][m];
    const dow = date.getDay();
    if (dow !== 0) { // no Sunday buying
      const nBuys = Math.round(rf(0.6, 4.2) * season);
      for (let b = 0; b < nBuys; b++) {
        const sup = pick(db.suppliers.filter(s => s.active || rnd() < 0.1));
        const loc = LOCATIONS.find(l => l.name === sup.buyingPoint) || pick(LOCATIONS);
        const r = rnd();
        const beanType = r < 0.22 ? 'Wet Bean' : (r < 0.82 ? 'Dry Bean' : 'Fermented Bean');
        const grade = rnd() < 0.62 ? 'A' : (rnd() < 0.8 ? 'B' : 'C');
        const moisture = beanType === 'Wet Bean' ? rf(38, 50) : rf(6, 8.5);
        const kg = ri(280, 2600);
        const trend = 1 + (d / days) * 0.35; // cocoa price uptrend
        let ppk = beanType === 'Wet Bean' ? rf(4.2, 6.2) : beanType === 'Dry Bean' ? rf(15.5, 21.5) : rf(18, 25);
        ppk = +(ppk * trend * (grade === 'A' ? 1.06 : grade === 'B' ? 1 : 0.9)).toFixed(2);
        const total = Math.round(kg * ppk);
        const age = daysBetween(dISO, todayISO());
        const paid = age > 21 ? true : (age > 7 ? rnd() < 0.6 : rnd() < 0.25);
        db.purchases.push({
          id: 'PUR-' + String(++puSeq).padStart(5, '0'),
          date: dISO, supplier: sup.id, buyingPoint: loc.name, province: loc.province,
          beanType, grade, moisture: +moisture.toFixed(1), kg, pricePerKg: ppk, total,
          paid, enteredBy: pick(officers),
        });
        mv(dISO, 'Received', loc.wh, beanType, kg, 'PUR-' + String(puSeq).padStart(5, '0'), sup.name + ' · ' + loc.name);
      }
    }

    /* weekly: dry the wet beans (40% yield) + process to export-ready at ports */
    if (dow === 2) {
      db.warehouses.forEach(w => {
        const wet = stk(w.id, 'Wet Bean');
        if (wet > 400) {
          const take = Math.round(wet * 0.9);
          mv(dISO, 'Processed', w.id, 'Wet Bean', -take, 'DRY', 'Solar/kiln drying batch');
          mv(dISO, 'Processed', w.id, 'Dry Bean', Math.round(take * 0.4), 'DRY', 'Dried yield @40%');
        }
      });
      PORT_WH.forEach(wid => {
        ['Dry Bean', 'Fermented Bean'].forEach(t => {
          const have = stk(wid, t);
          if (have > 2000) {
            const take = Math.round(have * 0.8);
            mv(dISO, 'Processed', wid, t, -take, 'GRADE', 'Graded & bagged for export');
            mv(dISO, 'Processed', wid, 'Export Ready', take, 'GRADE', 'Export-ready stock');
          }
        });
      });
    }

    /* monthly: transfer regional stock to ports */
    if (date.getDate() === 14 || date.getDate() === 28) {
      ['WH-KMB', 'WH-MDG', 'WH-WWK'].forEach(wid => {
        ['Dry Bean', 'Fermented Bean'].forEach(t => {
          const have = stk(wid, t);
          if (have > 3000) {
            const take = Math.round(have * 0.75);
            const dest = wid === 'WH-KMB' ? 'WH-KKP' : 'WH-LAE';
            const tr = 'TRF-' + dISO.replace(/-/g, '') + '-' + wid.slice(3);
            mv(dISO, 'Transferred', wid, t, -take, tr, 'Coastal transfer to ' + dest);
            mv(dISO, 'Transferred', dest, t, take, tr, 'Received from ' + wid);
          }
        });
      });
    }

    /* sporadic damage / adjustment */
    if (d % 47 === 23) {
      const wid = pick(PORT_WH);
      if (stk(wid, 'Dry Bean') > 800) mv(dISO, 'Damaged', wid, 'Dry Bean', -ri(80, 320), 'QC', 'Moisture damage write-off');
    }
    if (d % 61 === 40) {
      const wid = pick(db.warehouses).id;
      if (stk(wid, 'Dry Bean') > 500) mv(dISO, 'Adjustment', wid, 'Dry Bean', ri(-150, 150), 'STK', 'Stocktake variance');
    }

    /* shipments on plan dates */
    const plan = shipPlan.find(p => iso(p.etd) === dISO);
    if (plan) {
      const port = plan.n % 3 === 0 ? 'WH-KKP' : 'WH-LAE';
      const avail = stk(port, 'Export Ready');
      const wantT = ri(40, 95);
      const tonnes = Math.min(wantT, Math.floor((avail * 0.92) / 1000));
      if (tonnes >= 18) {
        const contract = db.contracts.filter(c => c.start <= dISO && c.end >= dISO)[plan.n % Math.max(1, db.contracts.filter(c => c.start <= dISO && c.end >= dISO).length)] || pick(db.contracts);
        const cust = db.customers.find(c => c.id === contract.customer);
        const dest = DEST[cust.country] ? cust.country : pick(Object.keys(DEST));
        const transit = dest === 'Australia' ? ri(8, 12) : dest === 'Singapore' || dest === 'Malaysia' ? ri(12, 18) : dest === 'Japan' ? ri(14, 20) : ri(28, 40);
        const eta = iso(addDays(dISO, transit));
        const fobPerT = Math.round(rf(29000, 36500) * (1 + (d / days) * 0.22));
        const etdDate = new Date(dISO);
        let status;
        const dToEtd = daysBetween(todayISO(), dISO); // + future
        if (dToEtd > 14) status = 'Preparing';
        else if (dToEtd > 5) status = 'Processing';
        else if (dToEtd > 0) status = 'Packed';
        else if (daysBetween(eta, todayISO()) < 0) status = 'In Transit';
        else if (daysBetween(eta, todayISO()) < 25) status = 'Delivered';
        else status = 'Completed';
        const containers = Math.max(1, Math.round(tonnes / 24));
        const ship = {
          id: 'SHP-' + String(plan.n).padStart(3, '0'),
          container: 'TEMU ' + ri(100000, 999999) + '-' + ri(0, 9) + (containers > 1 ? ' +' + (containers - 1) : ''),
          containers,
          customer: cust.id, contract: contract.number,
          destination: dest, port: DEST[dest].port,
          vessel: pick(vessels),
          etd: dISO, eta, tonnes,
          fob: tonnes * fobPerT,
          status,
          originWh: port,
          paid: status === 'Completed' || (status === 'Delivered' && rnd() < 0.5),
        };
        db.shipments.push(ship);
        if (!['Preparing', 'Processing'].includes(status)) {
          mv(dISO, 'Exported', port, 'Export Ready', -tonnes * 1000, ship.id, cust.name + ' · ' + dest);
        }
      }
    }
  }

  /* future planned shipments → pending export pipeline */
  shipPlan.filter(p => iso(p.etd) > todayISO()).forEach(plan => {
    const dISO = iso(plan.etd);
    const port = plan.n % 3 === 0 ? 'WH-KKP' : 'WH-LAE';
    const active = db.contracts.filter(c => c.start <= dISO && c.end >= dISO);
    const contract = active.length ? active[plan.n % active.length] : pick(db.contracts);
    const cust = db.customers.find(c => c.id === contract.customer);
    const dest = DEST[cust.country] ? cust.country : pick(Object.keys(DEST));
    const transit = dest === 'Australia' ? ri(8, 12) : (dest === 'Singapore' || dest === 'Malaysia') ? ri(12, 18) : dest === 'Japan' ? ri(14, 20) : ri(28, 40);
    const tonnes = ri(40, 80);
    const dToEtd = daysBetween(todayISO(), dISO);
    const status = dToEtd > 14 ? 'Preparing' : dToEtd > 5 ? 'Processing' : 'Packed';
    const containers = Math.max(1, Math.round(tonnes / 24));
    const ship = {
      id: 'SHP-' + String(plan.n).padStart(3, '0'),
      container: 'TEMU ' + ri(100000, 999999) + '-' + ri(0, 9) + (containers > 1 ? ' +' + (containers - 1) : ''),
      containers, customer: cust.id, contract: contract.number,
      destination: dest, port: DEST[dest].port, vessel: pick(vessels),
      etd: dISO, eta: iso(addDays(dISO, transit)), tonnes,
      fob: tonnes * Math.round(rf(36000, 42500)),
      status, originWh: port, paid: false,
    };
    db.shipments.push(ship);
    if (status === 'Packed' && stk(port, 'Export Ready') >= tonnes * 1000) {
      mv(todayISO(), 'Exported', port, 'Export Ready', -tonnes * 1000, ship.id, cust.name + ' · ' + dest + ' (packed)');
    }
  });
  db.shipments.sort((a, b) => a.etd < b.etd ? -1 : 1);

  /* ── transactions ledger ── */
  let txSeq = 0;
  const tx = (date, dir, category, amount, desc, by, approvedBy) => {
    db.transactions.push({
      id: 'TXN-' + String(++txSeq).padStart(5, '0'),
      date, dir, category, amount: Math.round(amount), desc,
      enteredBy: by || 'Maryanne Kila', approvedBy: approvedBy || 'Jarrod Hulo', receipt: true,
    });
  };
  tx('2025-01-06', 'in', 'Other Income', 6000000, 'Shareholder capital injection — PNGPC Holdings');

  /* weekly supplier payouts for paid purchases */
  const paidByWeek = {};
  db.purchases.filter(p => p.paid).forEach(p => {
    const wk = iso(addDays(p.date, 7 - new Date(p.date + 'T00:00:00').getDay()));
    paidByWeek[wk] = (paidByWeek[wk] || 0) + p.total;
  });
  Object.entries(paidByWeek).forEach(([wk, amt]) => {
    if (wk <= todayISO()) tx(wk, 'out', 'Supplier Payments', amt, 'Weekly supplier settlement run');
  });

  /* shipment income + logistics/export costs */
  db.shipments.forEach(s => {
    if (s.paid) {
      const payDate = iso(addDays(s.eta, 12));
      if (payDate <= todayISO()) tx(payDate, 'in', 'Export Payments', s.fob, s.id + ' — ' + s.destination + ' FOB settlement');
      else s.paid = false;
    }
    if (s.etd <= todayISO() && !['Preparing', 'Processing'].includes(s.status)) {
      tx(s.etd, 'out', 'Logistics', ri(18000, 34000), s.id + ' — inland haulage & port handling');
      tx(s.etd, 'out', 'Export Costs', ri(9000, 16000), s.id + ' — export docs, fumigation, marine insurance');
    }
  });

  /* monthly opex + weekly fuel */
  let mcur = new Date('2025-01-25T00:00:00');
  while (mcur <= NOW) {
    const dI = iso(mcur);
    tx(dI, 'out', 'Payroll', ri(112000, 128000), 'Monthly payroll — ' + dI.slice(0, 7));
    tx(dI, 'out', 'Utilities', ri(8500, 14500), 'Power, water & comms');
    tx(dI, 'out', 'Office Expenses', ri(4200, 7800), 'Office & admin running costs');
    db.warehouses.forEach(w => tx(dI, 'out', 'Warehouse Expenses', ri(2400, 4300), w.name + ' — operations'));
    if (rnd() < 0.6) tx(iso(addDays(mcur, -ri(2, 12))), 'out', 'Repairs', ri(3500, 26000), pick(['Dryer element replacement', 'Truck clutch overhaul', 'Forklift hydraulics service', 'Warehouse roof patch', 'Generator service & filters']));
    tx(iso(addDays(mcur, -ri(0, 10))), 'in', 'Cocoa Sales', ri(24000, 68000), 'Domestic sales — Paradise Chocolate PNG');
    mcur = addDays(mcur, 30);
  }
  let wcur = new Date('2025-01-10T00:00:00');
  while (wcur <= NOW) {
    tx(iso(wcur), 'out', 'Fuel', ri(6800, 15500), 'Fleet fuel — weekly fill');
    wcur = addDays(wcur, 7);
  }

  /* ensure cash never negative: working-capital drawdowns */
  db.transactions.sort((a, b) => a.date < b.date ? -1 : 1);
  let bal = 0; const draws = [];
  db.transactions.forEach(t => {
    bal += t.dir === 'in' ? t.amount : -t.amount;
    if (bal < 300000) {
      const draw = 2000000;
      draws.push({ date: t.date, amount: draw });
      bal += draw;
    }
  });
  draws.forEach(d => tx(d.date, 'in', 'Other Income', d.amount, 'Working capital facility drawdown — BSP'));
  db.transactions.sort((a, b) => a.date < b.date ? -1 : 1);

  /* seed audit + login history */
  db.audit.push(
    { time: iso(addDays(NOW, -2)) + ' 08:14', user: 'Jarrod Hulo', action: 'System backup completed' },
    { time: iso(addDays(NOW, -1)) + ' 09:02', user: 'Ruth Namaliu', action: 'Entered 14 purchase records' },
    { time: iso(addDays(NOW, -1)) + ' 15:47', user: 'Grace Wartovo', action: 'Updated shipment status — SHP-0' + ri(10, 14) },
  );
  db.loginHistory.push(
    { time: iso(addDays(NOW, -1)) + ' 07:58', user: 'Jarrod Hulo', result: 'Success' },
    { time: iso(addDays(NOW, -1)) + ' 12:31', user: 'Maryanne Kila', result: 'Success' },
  );

  return db;
}

/* ═══════════ STORE ═══════════ */
let DB = null;
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) { DB = parsed; return; }
    }
  } catch (e) { /* regenerate */ }
  DB = generateSeed();
  saveDB();
}
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch (e) { console.warn('Storage full', e); }
}
function resetDB() { localStorage.removeItem(DB_KEY); loadDB(); }

/* Validate & sanitise an imported backup before trusting it.
   Throws on anything malformed. Record IDs are flow into onclick="" string
   literals, where HTML-escaping does NOT prevent a break-out — so IDs must
   match a strict safe pattern or the whole import is rejected. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const BACKUP_ARRAYS = ['users', 'warehouses', 'suppliers', 'purchases', 'movements',
  'shipments', 'customers', 'contracts', 'assets', 'vehicles', 'transactions',
  'loginHistory', 'audit'];
const ID_CHECKS = {
  purchases: 'id', movements: 'id', shipments: 'id', suppliers: 'id',
  customers: 'id', assets: 'id', users: 'id', warehouses: 'id', vehicles: 'rego',
};

function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object');
  if (data.version !== 1) throw new Error('unsupported version');
  // reject prototype-pollution keys anywhere at the top level
  for (const k of ['__proto__', 'constructor', 'prototype']) {
    if (Object.prototype.hasOwnProperty.call(data, k)) throw new Error('illegal key');
  }
  // every known collection must be an array
  for (const key of BACKUP_ARRAYS) {
    if (!Array.isArray(data[key])) throw new Error('missing/invalid "' + key + '"');
  }
  // settings must be a sane object; coerce hostile values to safe defaults
  const s = data.settings;
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('invalid settings');
  const clean = {
    version: 1,
    settings: {
      pin: /^\d{4}$/.test(s.pin) ? s.pin : '0000',
      theme: s.theme === 'light' ? 'light' : 'dark',
      timeoutMin: Math.min(240, Math.max(1, Number(s.timeoutMin) || 15)),
      lowStockPct: Math.min(60, Math.max(1, Number(s.lowStockPct) || 15)),
      capacityWarnPct: Math.min(100, Math.max(50, Number(s.capacityWarnPct) || 90)),
    },
  };
  // every record ID that ends up in an onclick handler must be a safe token
  for (const [coll, field] of Object.entries(ID_CHECKS)) {
    for (const row of data[coll]) {
      if (!row || typeof row !== 'object') throw new Error('bad row in ' + coll);
      if (!SAFE_ID.test(String(row[field]))) throw new Error('unsafe id in ' + coll);
    }
  }
  // copy collections through (text fields are HTML-escaped at render time)
  for (const key of BACKUP_ARRAYS) clean[key] = data[key];
  return clean;
}
function audit(action) {
  const t = new Date();
  DB.audit.unshift({ time: iso(t) + ' ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'), user: 'Jarrod Hulo', action });
  if (DB.audit.length > 400) DB.audit.length = 400;
  saveDB();
}

/* ═══════════ DERIVED ANALYTICS ═══════════ */
const supplierById = id => DB.suppliers.find(s => s.id === id) || { name: id, province: '' };
const customerById = id => DB.customers.find(c => c.id === id) || { name: id, country: '' };
const warehouseById = id => DB.warehouses.find(w => w.id === id) || { name: id, capacityKg: 0 };

function stockMap() {
  const m = {};
  DB.movements.forEach(v => {
    const k = v.wh + '|' + v.beanType;
    m[k] = (m[k] || 0) + v.deltaKg;
  });
  return m;
}
function whStock(whId) {
  const m = stockMap(); const out = {};
  BEAN_TYPES.forEach(t => out[t] = Math.max(0, m[whId + '|' + t] || 0));
  out.total = BEAN_TYPES.reduce((a, t) => a + out[t], 0);
  return out;
}
function typeTotals() {
  const m = stockMap(); const out = {};
  BEAN_TYPES.forEach(t => out[t] = 0);
  Object.entries(m).forEach(([k, kg]) => { const t = k.split('|')[1]; out[t] = (out[t] || 0) + Math.max(0, kg); });
  return out;
}
function invTotalKg() { return Object.values(typeTotals()).reduce((a, b) => a + b, 0); }
function avgDryCost() {
  const dr = DB.purchases.filter(p => p.beanType !== 'Wet Bean').slice(-400);
  if (!dr.length) return 18;
  return dr.reduce((a, p) => a + p.pricePerKg, 0) / dr.length;
}
function invValue() {
  const t = typeTotals(); const c = avgDryCost();
  return t['Dry Bean'] * c + t['Fermented Bean'] * c * 1.08 + t['Export Ready'] * c * 1.15 + t['Wet Bean'] * c * 0.3;
}

function purchasesIn(fromISO, toISO) {
  return DB.purchases.filter(p => p.date >= fromISO && p.date <= toISO);
}
function sumKg(list) { return list.reduce((a, p) => a + p.kg, 0); }
function sumVal(list) { return list.reduce((a, p) => a + (p.total ?? p.amount ?? 0), 0); }

function revenueIn(fromISO, toISO) {
  return DB.shipments
    .filter(s => !['Preparing', 'Processing'].includes(s.status) && s.etd >= fromISO && s.etd <= toISO)
    .reduce((a, s) => a + s.fob, 0)
    + DB.transactions.filter(t => t.dir === 'in' && t.category === 'Cocoa Sales' && t.date >= fromISO && t.date <= toISO).reduce((a, t) => a + t.amount, 0);
}
function cogsIn(fromISO, toISO) { return sumVal(purchasesIn(fromISO, toISO)); }
function opexIn(fromISO, toISO) {
  return DB.transactions.filter(t => t.dir === 'out' && t.category !== 'Supplier Payments' && t.date >= fromISO && t.date <= toISO).reduce((a, t) => a + t.amount, 0);
}
function cashBalance() {
  return DB.transactions.reduce((a, t) => a + (t.dir === 'in' ? t.amount : -t.amount), 0);
}
function accountsReceivable() {
  return DB.shipments.filter(s => ['In Transit', 'Delivered'].includes(s.status) && !s.paid).reduce((a, s) => a + s.fob, 0);
}
function outstandingSupplier() {
  return DB.purchases.filter(p => !p.paid).reduce((a, p) => a + p.total, 0);
}
function accountsPayable() { return outstandingSupplier() + 38500; /* + accrued utilities/fuel invoices */ }

function contractStats(c) {
  const ships = DB.shipments.filter(s => s.contract === c.number && !['Preparing', 'Processing'].includes(s.status));
  const delivered = ships.reduce((a, s) => a + s.tonnes, 0);
  const remaining = Math.max(0, c.volumeT - delivered);
  const pct = Math.min(100, (delivered / c.volumeT) * 100);
  const expired = c.end < todayISO();
  const daysLeft = daysBetween(todayISO(), c.end);
  return { delivered, remaining, pct, expired, daysLeft, active: !expired && remaining > 0 };
}

function supplierStats() {
  return DB.suppliers.map(s => {
    const list = DB.purchases.filter(p => p.supplier === s.id);
    const kg = sumKg(list), val = sumVal(list);
    const gscore = list.length ? list.reduce((a, p) => a + (p.grade === 'A' ? 96 : p.grade === 'B' ? 85 : 72), 0) / list.length : 0;
    const last = list.length ? list[list.length - 1].date : null;
    const unpaid = list.filter(p => !p.paid).reduce((a, p) => a + p.total, 0);
    return { ...s, deliveries: list.length, kg, val, quality: gscore, last, unpaid };
  }).sort((a, b) => b.kg - a.kg);
}
function customerStats() {
  return DB.customers.map(c => {
    const ships = DB.shipments.filter(s => s.customer === c.id && !['Preparing', 'Processing'].includes(s.status));
    const rev = ships.reduce((a, s) => a + s.fob, 0);
    const t = ships.reduce((a, s) => a + s.tonnes, 0);
    const contracts = DB.contracts.filter(x => x.customer === c.id && contractStats(x).active).length;
    return { ...c, shipments: ships.length, revenue: rev, tonnes: t, activeContracts: contracts };
  }).sort((a, b) => b.revenue - a.revenue);
}

/* time-bucketed series */
function seriesDaily(n, fn) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = iso(addDays(NOW, -i));
    out.push({ label: fmtDate(d).replace(/ \d{4}$/, ''), key: d, value: fn(d, d) });
  }
  return out;
}
function seriesMonthly(n, fn) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
    const from = iso(d);
    const to = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    out.push({ label: d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }), key: monthKey(from), value: fn(from, to) });
  }
  return out;
}
function seriesWeekly(n, fn) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const to = addDays(NOW, -i * 7);
    const from = addDays(to, -6);
    out.push({ label: 'Wk ' + fmtDate(iso(to)).replace(/ \d{4}$/, ''), key: iso(to), value: fn(iso(from), iso(to)) });
  }
  return out;
}
function seriesYearly(fn) {
  const out = [];
  for (let y = 2025; y <= NOW.getFullYear(); y++) {
    out.push({ label: String(y), key: String(y), value: fn(y + '-01-01', y + '-12-31') });
  }
  return out;
}
function cashSeries(nMonths) {
  const buckets = seriesMonthly(nMonths, () => 0);
  let running = 0;
  const firstKey = buckets[0].key;
  DB.transactions.forEach(t => { if (monthKey(t.date) < firstKey) running += t.dir === 'in' ? t.amount : -t.amount; });
  buckets.forEach(b => {
    DB.transactions.forEach(t => { if (monthKey(t.date) === b.key) running += t.dir === 'in' ? t.amount : -t.amount; });
    b.value = running;
  });
  return buckets;
}
function inventorySeries(nMonths) {
  const buckets = seriesMonthly(nMonths, () => 0);
  let running = 0;
  const firstKey = buckets[0].key;
  DB.movements.forEach(v => { if (monthKey(v.date) < firstKey) running += v.deltaKg; });
  buckets.forEach(b => {
    DB.movements.forEach(v => { if (monthKey(v.date) === b.key) running += v.deltaKg; });
    b.value = Math.max(0, running);
  });
  return buckets;
}

/* simple linear-regression forecast: returns {hist:[], fc:[]} */
function forecast(series, periods = 3) {
  const n = series.length;
  if (n < 3) return { hist: series, fc: [] };
  const xs = series.map((_, i) => i);
  const ys = series.map(s => s.value);
  const xm = xs.reduce((a, b) => a + b, 0) / n, ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - xm) * (ys[i] - ym); den += (x - xm) ** 2; });
  const slope = den ? num / den : 0, intercept = ym - slope * xm;
  const fc = [];
  for (let p = 1; p <= periods; p++) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() + p, 1);
    fc.push({ label: d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }) + ' ᶠ', value: Math.max(0, intercept + slope * (n - 1 + p)) });
  }
  return { hist: series, fc, slope };
}

/* ═══════════ KPI PACK ═══════════ */
function kpiPack() {
  const t = todayISO();
  const wkFrom = iso(addDays(NOW, -6));
  const moFrom = t.slice(0, 7) + '-01';
  const yrFrom = t.slice(0, 4) + '-01-01';
  const types = typeTotals();
  const activeContracts = DB.contracts.filter(c => contractStats(c).active).length;
  const pendingContainers = DB.shipments.filter(s => ['Preparing', 'Processing', 'Packed'].includes(s.status)).reduce((a, s) => a + (s.containers || 1), 0);
  const inTransit = DB.shipments.filter(s => s.status === 'In Transit' || s.status === 'Loaded').length;
  const activeSup = new Set(DB.purchases.filter(p => p.date >= iso(addDays(NOW, -90))).map(p => p.supplier)).size;
  const activeLoc = new Set(DB.purchases.filter(p => p.date >= iso(addDays(NOW, -90))).map(p => p.buyingPoint)).size;
  const revMo = revenueIn(moFrom, t), revYr = revenueIn(yrFrom, t);
  const gpYr = revYr - cogsIn(yrFrom, t);
  const npYr = gpYr - opexIn(yrFrom, t);
  return {
    boughtToday: sumKg(purchasesIn(t, t)),
    boughtWeek: sumKg(purchasesIn(wkFrom, t)),
    boughtMonth: sumKg(purchasesIn(moFrom, t)),
    boughtYear: sumKg(purchasesIn(yrFrom, t)),
    invKg: invTotalKg(), invVal: invValue(), types,
    revMonth: revMo, revYear: revYr,
    grossProfit: gpYr, netProfit: npYr,
    cash: cashBalance(),
    ar: accountsReceivable(), ap: accountsPayable(),
    outstandingSup: outstandingSupplier(),
    activeContracts, activeLoc, activeSup, pendingContainers, inTransit,
  };
}

/* ═══════════ ALERTS ENGINE ═══════════ */
function buildAlerts() {
  const A = [];
  const t = todayISO();
  const soon = d => { const n = daysBetween(t, d); return n >= 0 && n <= 30; };

  /* low inventory / capacity */
  DB.warehouses.forEach(w => {
    const s = whStock(w.id);
    const u = w.capacityKg ? (s.total / w.capacityKg) * 100 : 0;
    if (u > DB.settings.capacityWarnPct) A.push({ sev: 'bad', ico: '🏭', cat: 'Warehouse Capacity', title: w.name + ' at ' + u.toFixed(0) + '% capacity', sub: fmtT(s.total) + ' of ' + fmtT(w.capacityKg) + ' — schedule export or transfer', view: 'warehouses' });
    else if (u > 0 && u < DB.settings.lowStockPct && PORT_WH.includes(w.id)) A.push({ sev: 'warn', ico: '📦', cat: 'Low Inventory', title: 'Low stock — ' + w.name, sub: 'Only ' + fmtT(s.total) + ' on hand (' + u.toFixed(0) + '% of capacity)', view: 'inventory' });
  });
  const er = typeTotals()['Export Ready'];
  if (er < 40000) A.push({ sev: 'warn', ico: '📦', cat: 'Low Inventory', title: 'Export-ready stock below 40 t', sub: fmtT(er) + ' available — upcoming shipments at risk', view: 'inventory' });

  /* supplier payment overdue */
  const overdue = DB.purchases.filter(p => !p.paid && daysBetween(p.date, t) > 14);
  if (overdue.length) {
    const amt = overdue.reduce((a, p) => a + p.total, 0);
    A.push({ sev: 'bad', ico: '💸', cat: 'Supplier Payment Overdue', title: overdue.length + ' supplier payments overdue >14 days', sub: money(amt) + ' outstanding — settlement run required', view: 'purchasing' });
  }

  /* shipment delays */
  DB.shipments.filter(s => s.status === 'In Transit' && s.eta < t).forEach(s => {
    A.push({ sev: 'bad', ico: '🚢', cat: 'Shipment Delay', title: s.id + ' overdue at ' + s.port, sub: 'ETA was ' + fmtDate(s.eta) + ' — ' + customerById(s.customer).name, view: 'exports' });
  });

  /* vehicles */
  DB.vehicles.forEach(v => {
    if (daysBetween(v.lastService, t) > 180) A.push({ sev: 'warn', ico: '🚛', cat: 'Vehicle Maintenance Due', title: v.rego + ' service overdue', sub: v.model + ' — last serviced ' + fmtDate(v.lastService), view: 'fleet' });
    if (soon(v.insuranceExpiry)) A.push({ sev: 'warn', ico: '🛡️', cat: 'Insurance Expiry', title: v.rego + ' insurance expires ' + fmtDate(v.insuranceExpiry), sub: v.model + ' · driver ' + v.driver, view: 'fleet' });
    else if (v.insuranceExpiry < t) A.push({ sev: 'bad', ico: '🛡️', cat: 'Insurance Expired', title: v.rego + ' insurance EXPIRED', sub: 'Expired ' + fmtDate(v.insuranceExpiry) + ' — vehicle should not operate', view: 'fleet' });
    if (soon(v.regoExpiry)) A.push({ sev: 'warn', ico: '📋', cat: 'Registration Expiry', title: v.rego + ' road registration expires ' + fmtDate(v.regoExpiry), sub: v.model, view: 'fleet' });
    if (soon(v.licenceExpiry)) A.push({ sev: 'warn', ico: '🪪', cat: 'Driver Licence Expiry', title: v.driver + ' — licence expires ' + fmtDate(v.licenceExpiry), sub: 'Assigned to ' + v.rego, view: 'fleet' });
  });
  /* fuel anomaly */
  const fleet = DB.vehicles.filter(v => v.fuelL100 > 0);
  const avgFuel = fleet.reduce((a, v) => a + v.fuelL100, 0) / Math.max(1, fleet.length);
  fleet.forEach(v => {
    if (v.fuelL100 > avgFuel * 1.45) A.push({ sev: 'warn', ico: '⛽', cat: 'Fuel Consumption Anomaly', title: v.rego + ' burning ' + v.fuelL100 + ' L/100km', sub: 'Fleet average is ' + avgFuel.toFixed(1) + ' — check engine / usage', view: 'fleet' });
  });

  /* contracts */
  DB.contracts.forEach(c => {
    const cs = contractStats(c);
    if (!cs.expired && cs.daysLeft <= 45 && cs.remaining > 0) {
      A.push({ sev: cs.daysLeft <= 21 ? 'bad' : 'warn', ico: '📑', cat: 'Contract Expiry', title: c.number + ' expires in ' + cs.daysLeft + ' days', sub: cs.remaining.toFixed(0) + ' t still undelivered to ' + customerById(c.customer).name, view: 'contracts' });
    }
  });

  /* asset status */
  DB.assets.filter(a => a.status === 'Under Repair').forEach(a => A.push({ sev: 'warn', ico: '🔧', cat: 'Asset Under Repair', title: a.name, sub: 'Out of action at ' + a.location, view: 'assets' }));
  DB.assets.filter(a => a.status === 'Maintenance Due').forEach(a => A.push({ sev: 'warn', ico: '🛠️', cat: 'Maintenance Due', title: a.name, sub: 'Schedule maintenance — ' + a.location, view: 'assets' }));

  const sevRank = { bad: 0, warn: 1 };
  return A.sort((x, y) => sevRank[x.sev] - sevRank[y.sev]);
}
