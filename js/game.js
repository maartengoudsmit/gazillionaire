// Game engine: state, markets, trips, events, AI. No DOM access in here.
'use strict';

const R = (a, b) => a + Math.random() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.round(n).toLocaleString('en-US');
const NG = GOODS.length;

let G = null;

// ---------- creation ----------
function newGame(opts) {
  const defs = PLANET_DEFS.slice().sort(() => Math.random() - 0.5).slice(0, 7);
  G = {
    version: 1, week: 0, level: opts.level, goal: LEVELS[opts.level].goal, over: null,
    tierMax: 0, news: [], weather: [], danger: [], aiNews: [], facilities: [], lastAuction: 0, saved: false,
    planets: defs.map((d, i) => {
      const p = { i, id: d.id, x: SLOTS[i][0], y: SLOTS[i][1], sup: [], s0: [], mod: [],
        fuel: RI(28, 55), stock: { v: RI(60, 140), trend: 0, hist: [] } };
      for (let g = 0; g < NG; g++) {
        p.s0.push(R(0.12, 0.88)); p.mod.push(R(0.88, 1.15)); p.sup.push(0);
        p.sup[g] = p.s0[g];
      }
      for (let k = 0; k < 20; k++) p.stock.hist.push(p.stock.v);
      return p;
    }),
    co: []
  };
  const names = [opts.name].concat(AI_DEFS.map(a => a.name));
  for (let i = 0; i < 7; i++) {
    G.co.push(newCompany(i, names[i], i === 0, i === 0 ? 0 : (opts.ai ? opts.ai[i - 1] : 3), i === 0 ? '' : AI_DEFS[i - 1].style));
  }
  for (const c of G.co) { c.loc = RI(0, 6); c.dest = c.loc; }
  G.co[0].loc = RI(0, 6);
  for (let k = 0; k < 3; k++) driftMarkets(true);
  genNews();
  record();
  return G;
}

function newCompany(i, name, human, int, style) {
  return {
    i, name, human, int, style, cash: 25000, save: 0, tu: 0, zn: 0, shipIdx: 0, engine: 5,
    bonus: { cargo: 0, pass: 0, tank: 0 }, crewAdj: 0, salary: 60,
    cargo: Array(NG).fill(0), paid: Array(NG).fill(0), fuel: 12, loc: 0, dest: 0, owed: 0,
    ticket: 150, adPass: 0, adComm: 0, insured: false, insRate: 0.012,
    impRate: 0.015, expRate: 0.015, passTax: 0.08,
    wh: Array.from({ length: 7 }, () => Array(NG).fill(0)), whCap: Array(7).fill(20),
    whPaid: Array.from({ length: 7 }, () => Array(NG).fill(0)),
    shares: Array.from({ length: 7 }, () => ({ n: 0, paid: 0 })),
    hist: [], luck: 0, boughtStockWeek: -1, specialWeek: -1, offer: null,
    tuRate: 0.03, tuSave: 0.003, tuLimit: 25000, znRate: 0.02, znLimit: 25000,
    bankrupt: false, holdWeeks: 0, tripsDone: 0
  };
}

// ---------- derived values ----------
const planetOf = c => G.planets[c.loc];
const planetDef = p => PLANET_DEFS.find(d => d.id === p.id);
const dist = (a, b) => Math.max(8, Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 3));
const sz = c => SHIPS[c.shipIdx][1];
const cargoMax = c => Math.floor(sz(c) * 0.7) + c.bonus.cargo;
const passMax = c => Math.max(2, Math.round(sz(c) / 9)) + c.bonus.pass;
const tankMax = c => 12 + Math.round(sz(c) / 8) + c.bonus.tank;
const crewN = c => Math.max(1, 3 + Math.floor(c.shipIdx * 1.2) - c.crewAdj);
const cargoTons = c => c.cargo.reduce((a, b) => a + b, 0);
const maxFuelUse = c => Math.max(2, Math.round(tankMax(c) * 0.6));
const shipValue = c => Math.max(8000, SHIPS[c.shipIdx][2]) + c.engine * 800;
const hours = (c, a, b) => dist(a, b) / c.engine;
const fuelUse = (c, a, b) => clamp(Math.round(dist(a, b) / 40 * (0.8 + sz(c) / 150)), 2, maxFuelUse(c));
const fuelPrice = (c, p) => Math.round(p.fuel * (1 + c.shipIdx * 0.35));
const engineKuarp = c => c.engine;
const capOf = g => (60 + 700 * Math.pow(0.85, g)) * (1 + 0.55 * G.tierMax);
const priceAt = (p, g, sup) => Math.max(1, Math.round(GOODS[g][1] * p.mod[g] * (1.6 - 1.15 * Math.min(sup, 1.3))));
const quote = (p, g) => priceAt(p, g, p.sup[g]);
const adPassEff = c => Math.min(1, c.adPass / (passMax(c) * 90));
const adCommEff = c => Math.min(1, c.adComm / (cargoMax(c) * 18));
const adPassCostRef = c => Math.round(passMax(c) * 90);
const adCommCostRef = c => Math.round(cargoMax(c) * 18);
const availTons = (p, g, c) => Math.max(0, Math.floor(Math.max(0, p.sup[g] - 0.03) * capOf(g) * (1 + 0.8 * (c ? adCommEff(c) : 0))));
const refFare = (c, a, b) => Math.round(dist(a, b) * 2.2 * (1 + 0.35 * c.shipIdx));
const insPremium = c => Math.round(c.insRate * (shipValue(c) + cargoValue(c)));
const cargoValue = c => c.cargo.reduce((s, n, g) => s + n * c.paid[g], 0);
const stockPrice = p => Math.max(0, p.stock.v);
const sharesValue = c => c.shares.reduce((s, sh, i) => s + sh.n * stockPrice(G.planets[i]), 0);
const netWorth = c => c.cash + c.save + sharesValue(c) - c.tu - c.zn;
const nextShip = c => (c.shipIdx < SHIPS.length - 1 ? SHIPS[c.shipIdx + 1] : null);
const engineCost = c => Math.round(1500 * Math.pow(c.engine + 1, 1.7));
const co = i => G.co[i];
const human = () => G.co[0];

function bumpLimits(c) { c.tuLimit = Math.round(c.tuLimit * 1.8 / 1000) * 1000; c.znLimit = Math.round(c.znLimit * 1.8 / 1000) * 1000; }
function calcTier() { G.tierMax = Math.max(...G.co.map(c => c.shipIdx)); }

function record() {
  for (const c of G.co) { c.hist.push(netWorth(c)); if (c.hist.length > 20) c.hist.shift(); }
}

// ---------- markets ----------
function driftMarkets(quiet) {
  calcTier();
  for (const p of G.planets) {
    for (let g = 0; g < NG; g++) {
      p.s0[g] = clamp(p.s0[g] + R(-0.05, 0.05), 0.08, 0.92);
      p.sup[g] = clamp(p.sup[g] + (p.s0[g] - p.sup[g]) * 0.3 + R(-0.07, 0.07), 0.02, 1.15);
    }
    p.fuel = clamp(p.fuel + RI(-4, 4), 20, 70);
    const s = p.stock; // stock exchange trend model
    s.trend = clamp(s.trend * 0.65 + R(-0.05, 0.05) + (s.v < 40 ? 0.01 : 0) - (s.v > 260 ? 0.02 : 0), -0.2, 0.2);
    s.v = Math.max(0, s.v * (1 + s.trend + R(-0.02, 0.02)));
    if (s.v < 6) { s.crash = true; s.v = 0; } else s.crash = false;
    s.hist.push(s.v); s.hist.shift();
  }
  // stock crashes wipe out holdings, then the exchange reopens
  for (const p of G.planets) {
    if (p.stock.crash) {
      for (const c of G.co) { c.shares[p.i] = { n: 0, paid: 0 }; }
      p.stock.v = RI(50, 90); p.stock.trend = 0; p.stock.hist = Array(20).fill(p.stock.v);
      G.aiNews.push('The ' + p.id + ' Stock Exchange has CRASHED! Investors lose everything.');
    }
  }
  if (!quiet) { calcTier(); }
}

// Cost of trading n tons while price moves; returns total and updates supply.
function tradeCost(p, g, n, buy, apply) {
  const cap = capOf(g);
  const steps = Math.min(40, Math.max(1, n));
  const q = n / steps;
  let sup = p.sup[g], total = 0;
  for (let k = 0; k < steps; k++) {
    sup += buy ? -q / cap / 2 : q / cap / 2;
    total += q * priceAt(p, g, sup);
    sup += buy ? -q / cap / 2 : q / cap / 2;
  }
  if (apply) p.sup[g] = clamp(sup, 0.0, 1.5);
  return total;
}

function buyGoods(c, p, g, n) {
  n = Math.floor(n);
  const free = cargoMax(c) - cargoTons(c);
  n = Math.min(n, free, availTons(p, g, c));
  if (n <= 0) return { ok: false, msg: 'nothing' };
  let cost = tradeCost(p, g, n, true, false);
  if (cost > c.cash) { // reduce to what can be afforded
    while (n > 0 && tradeCost(p, g, n, true, false) > c.cash) n--;
    if (n <= 0) return { ok: false, msg: 'cash' };
    cost = tradeCost(p, g, n, true, false);
  }
  tradeCost(p, g, n, true, true);
  const tot = c.cargo[g] * c.paid[g] + cost;
  c.cargo[g] += n; c.paid[g] = tot / c.cargo[g];
  c.cash -= cost;
  return { ok: true, n, cost: Math.round(cost) };
}

function sellGoods(c, p, g, n) {
  n = Math.min(Math.floor(n), c.cargo[g]);
  if (n <= 0) return { ok: false };
  const rev = tradeCost(p, g, n, false, true);
  const profit = rev - n * c.paid[g];
  c.cargo[g] -= n; if (c.cargo[g] === 0) c.paid[g] = 0;
  c.cash += rev;
  return { ok: true, n, rev: Math.round(rev), profit: Math.round(profit) };
}

// ---------- finance ----------
function emergencyFunds(c) {
  // If cash is negative, the Trader's Union steps in.
  if (c.cash >= 0) return 0;
  const need = Math.ceil(-c.cash) + 500;
  c.tu += need; c.cash += need;
  return need;
}
function bankruptCheck(c) {
  if (c.tu > c.tuLimit * 1.0001 || c.zn > c.znLimit * 1.0001) { c.bankrupt = true; return true; }
  return false;
}

// ---------- trips ----------
function canDepart(c, dest) {
  const a = planetOf(c), b = G.planets[dest];
  if (c.fuel < fuelUse(c, a, b)) return 'fuel';
  return null;
}

function weeklyCosts(c) {
  const notes = [];
  const a = c.tu * c.tuRate, b = c.zn * c.znRate, s = c.save * c.tuSave;
  c.tu += a; c.zn += b; c.save += s;
  c.owed += crewN(c) * c.salary;
  return { tuInt: Math.round(a), znInt: Math.round(b), saveInt: Math.round(s) };
}

function payCrew(c) {
  const amt = Math.min(c.owed, Math.max(0, c.cash));
  c.cash -= amt; c.owed -= amt; return amt;
}

function pushPlanetFee(c, p) {
  let fee = 0;
  const fl = G.facilities.filter(f => f.planet === p.i);
  for (const f of fl) {
    if (f.owner === c.i) { // owner collects
      if (f.rev > 0) { c.cash += f.rev; f.col = (f.col || 0) + f.rev; f.rev = 0; }
    } else { c.cash -= f.fee; fee += f.fee; f.rev += f.fee; }
  }
  return fee;
}

function hazardFor(c, destIdx) {
  const luckAdj = -c.luck * 0.04;
  const d = G.danger.find(x => x.planet === destIdx);
  let id = null;
  if (d && Math.random() < 0.45 + luckAdj) id = d.hazard;
  else if (Math.random() < 0.07 + luckAdj) id = pick(HAZARDS).id;
  return id;
}

function resolveHazard(c, hid) {
  const h = HAZARDS.find(x => x.id === hid);
  const ev = { img: h.img, title: h.t, snd: h.snd, kind: 'hazard', lines: [], insuredLines: [] };
  const val = shipValue(c);
  let dmg = 0, lost = 0, covered = false;
  const hasCargo = cargoTons(c) > 0;
  const money = (a, b) => Math.round(val * R(a, b) + 300);
  if (h.kind === 'dmg') { dmg = money(0.03, 0.1); ev.lines.push(h.x.replace('{$}', fmt(dmg))); }
  else if (h.kind === 'toll') { dmg = money(0.03, 0.09); ev.lines.push('The Chichi Bobo Rebels intercept your vessel. They demand you pay a revolutionary tax of ' + fmt(dmg) + ' kubars in support of the struggle to overthrow Supreme Commander Dred Nicolson. You end up giving the rebels valuable parts of your ship, which you must now pay to replace.'); }
  else if (h.kind === 'steal') {
    const txt = {
      darleen: ['The Darleen Smugglers stop your ship and become furious when they discover that you don\'t have any cargo they can steal. They harass you and your crew for a few hours, then grow bored and leave.', 'The Darleen Smugglers stop your ship and help themselves to all your cargo.'],
      hungo: ['You run smack into a tribe of Hungo Warriors on the war path. These legendary fighters do your ship no harm but carry off one of your more attractive crew members for initiation into their clan.', 'You run smack into a tribe of Hungo Warriors on the war path. These legendary fighters take all your cargo and even carry off one of your more attractive crew members for initiation into their clan.'],
      wicky: ['A group of nasty little Wicky Wicks attach themselves to your ship\'s engine and won\'t let go. When they find out you have no cargo to steal, they let you go unharmed.', 'A group of nasty little Wicky Wicks attach themselves to your ship\'s engine and won\'t let go. The only way to convince these slime balls to free your ship is to surrender all your cargo.'],
      pirates: ['A band of space pirates, descendants of the infamous Bro Nap Goodshark, overtake your ship. Unable to find any cargo to steal, they wind up playing with your navigation controls and drinking all your beverages.', 'A band of space pirates, descendants of the infamous Bro Nap Goodshark, overtake your ship. After a few hours of mess and mayhem, they steal all your cargo and fly off laughing.']
    }[hid];
    ev.lines.push(txt[hasCargo ? 1 : 0]);
    if (hasCargo) lost = cargoValue(c);
  } else if (h.kind === 'stealdmg') {
    dmg = money(0.02, 0.07);
    ev.lines.push(hasCargo ? 'You are unlucky enough to get jumped by the Baid-Rowel Bandits. They not only steal all your cargo but also inflict ' + fmt(dmg) + ' kubars worth of damage to your ship.' :
      'You are unlucky enough to get jumped by the Baid-Rowel Bandits. They become so angry when they find out that you don\'t have any cargo to steal that they inflict ' + fmt(dmg) + ' kubars worth of damage to your ship.');
    if (hasCargo) lost = cargoValue(c);
  }
  const total = dmg + lost;
  if (c.insured && total > 0 && !(hid === 'rebels' && false)) {
    covered = true;
    ev.lines.push('Luckily you have Voyager\'s Insurance! The insurance company reimburses you in full for all losses.');
    ev.insured = true;
    if (lost) { for (let g = 0; g < NG; g++) { c.cargo[g] = c.cargo[g]; } }
    if (lost) { c.cargo.fill(0); c.paid.fill(0); /* goods stolen, value reimbursed */ c.cash += lost; }
  } else {
    c.cash -= dmg;
    if (lost) { c.cargo.fill(0); c.paid.fill(0); }
    if (total > 0 && !c.insured) ev.lines.push('Sorry, but you don\'t have insurance.');
    ev.bad = true;
  }
  emergencyFunds(c);
  return ev;
}

// returns list of events for the human trip arrival
function arriveHuman(c, fromIdx, destIdx) {
  const evs = [];
  const to = G.planets[destIdx];
  c.loc = destIdx;
  c.tripsDone++;
  // arrival report
  const rep = { kind: 'report', lines: [] };
  // passengers
  const from = G.planets[fromIdx];
  const wait = Math.round(passMax(c) * R(0.5, 1.3) * (1 + 0.8 * adPassEff(c)));
  const acc = clamp(1.5 - c.ticket / refFare(c, from, to), 0, 1);
  const n = Math.min(passMax(c), Math.round(wait * acc));
  const gross = n * c.ticket, tax = Math.round(gross * c.passTax);
  c.cash += gross - tax;
  rep.pass = { wait, n, gross, tax, ref: refFare(c, from, to) };
  // tariffs on cargo coming in
  const imp = Math.round(cargoValue(c) * c.impRate);
  c.cash -= imp; rep.imp = imp;
  const fee = pushPlanetFee(c, to);
  rep.fee = fee;
  rep.collected = 0;
  c.adPass = 0; c.adComm = 0; c.insured = false;
  const need = emergencyFunds(c);
  if (need) rep.loan = need;
  evs.push(rep);
  return { evs, rep };
}

function exportTariff(c) {
  const t = Math.round(cargoValue(c) * c.expRate);
  c.cash -= t; return t;
}

// ---------- human travel ----------
// Returns a plan list of events. UI shows them in order.
function travel(destIdx) {
  const c = human();
  const out = { events: [], blocked: null };
  const a = planetOf(c), b = G.planets[destIdx];
  const need = fuelUse(c, a, b);
  if (c.fuel < need) { out.blocked = 'You do not have enough fuel to make this trip. You need ' + need + ' tons but only have ' + Math.floor(c.fuel) + '.'; return out; }
  // strike?
  if (c.owed > 0 && Math.random() < Math.min(0.9, 0.3 + 0.2 * (c.owed / Math.max(1, crewN(c) * c.salary) - 1))) {
    const back = c.owed;
    c.cash -= back; c.owed = 0; c.salary += 10;
    emergencyFunds(c);
    out.events.push({ kind: 'msg', img: 'crew', title: 'Union Boss', snd: 'bad6', bad: true,
      lines: ['Your crew goes on STRIKE because you have not paid them! To settle the strike you are forced to pay ' + fmt(back) + ' kubars in back wages and raise their weekly salary by 10 kubars per person.'] });
  }
  out.events.push({ kind: 'depart', from: a, to: b, hours: Math.round(hours(c, a, b) * 10) / 10 });
  // costs
  const wc = weeklyCosts(c);
  const exp = exportTariff(c);
  c.fuel -= need;
  const th = hours(c, a, b);
  G.week++;
  driftMarkets();
  genNews();
  // AIs that arrive first
  const ais = G.co.filter(x => !x.human && !x.bankrupt);
  const times = new Map(ais.map(x => [x, hours(x, G.planets[x.loc], G.planets[x.dest]) * R(0.95, 1.05)]));
  const first = ais.filter(x => times.get(x) < th).sort((x, y) => times.get(x) - times.get(y));
  const later = ais.filter(x => times.get(x) >= th).sort((x, y) => times.get(x) - times.get(y));
  first.forEach(aiMove);
  // hazard
  const hid = hazardFor(c, destIdx);
  if (hid) {
    const he = resolveHazard(c, hid);
    out.events.push(he);
  } else if (Math.random() < 0.08 * (c.shipIdx / 3 + 1)) {
    const rep = Math.round(shipValue(c) * R(0.01, 0.04) + 200);
    if (c.insured) out.events.push({ kind: 'msg', img: 'repair', title: 'Ship Breakdown', snd: 'repair', lines: ['Your ship breaks down! Luckily you have Voyager\'s Insurance. The insurance company reimburses you in full for the repair-droid (' + fmt(rep) + ' kubars).'] });
    else { c.cash -= rep; out.events.push({ kind: 'msg', img: 'repair', title: 'Ship Breakdown', snd: 'repair', bad: true, lines: ['Your ship breaks down! You must pay ' + fmt(rep) + ' kubars for a repair-droid to come out and fix your ship.'] }); }
  }
  const { evs, rep } = arriveHuman(c, a.i, destIdx);
  rep.wc = wc; rep.exp = exp; rep.from = a.i; rep.to = destIdx; rep.owed = c.owed;
  out.events.push(...evs);
  // random encounter / market event
  const enc = randomEncounter(c, destIdx);
  if (enc) out.events.push(enc);
  const mk = marketNote(b);
  later.forEach(aiMove);
  if (bankruptCheck(c)) { G.over = { winner: null, lose: 'bankrupt' }; }
  record();
  checkEnd();
  c.luck *= 0.8;
  maybeAuction(out.events);
  return out;
}

function marketNote() { return null; }

function checkEnd() {
  if (G.over) return;
  let best = null;
  for (const c of G.co) { if (c.bankrupt && !c.human) continue; if (netWorth(c) >= G.goal && (!best || netWorth(c) > netWorth(best))) best = c; }
  if (best) G.over = { winner: best.i };
  const nw = netWorth(human());
  if (nw >= 2e9) G.over = { winner: 0, cap: true };
}

// ---------- news ----------
function genNews() {
  G.news = []; G.weather = []; G.danger = [];
  const weatherIds = ['meteor', 'solar', 'hurr', 'typhoon', 'dexxy', 'mippi', 'bollup', 'vapor', 'whirl', 'bobble'];
  const nd = RI(1, 3);
  const used = new Set();
  for (let k = 0; k < nd; k++) {
    const pi = RI(0, 6); if (used.has(pi)) continue; used.add(pi);
    const hz = pick(HAZARDS).id;
    G.danger.push({ planet: pi, hazard: hz });
    const p = G.planets[pi];
    const txt = HAZARD_NEWS[hz].replace('{P}', p.id);
    const reliable = Math.random() < 0.88;
    const target = reliable ? p.id : G.planets[(pi + RI(1, 6)) % 7].id;
    const item = { text: HAZARD_NEWS[hz].replace('{P}', target), planet: pi };
    if (weatherIds.includes(hz)) G.weather.push(item); else G.news.push(item);
  }
  // market stories
  for (let k = 0; k < 2; k++) {
    const p = pick(G.planets), g = RI(0, NG - 1);
    if (Math.random() < 0.5) {
      p.sup[g] = clamp(p.sup[g] - R(0.2, 0.4), 0.02, 1.2);
      G.news.push({ text: pick(['A labor strike on ' + p.id + ' has slashed production of ' + GOODS[g][0] + '.', 'A freak accident in a ' + GOODS[g][0] + ' warehouse on ' + p.id + ' has left the planet short of supply.', 'Government regulations have stifled the ' + GOODS[g][0] + ' industry on ' + p.id + '.']), planet: p.i });
    } else {
      p.sup[g] = clamp(p.sup[g] + R(0.2, 0.4), 0.02, 1.2);
      G.news.push({ text: pick(['A bumper crop of ' + GOODS[g][0] + ' on ' + p.id + ' is flooding the market.', 'Production of ' + GOODS[g][0] + ' on ' + p.id + ' is at an all-time high.', 'A new factory has boosted the ' + GOODS[g][0] + ' supply on ' + p.id + '.']), planet: p.i });
    }
  }
  for (let k = 0; k < 2; k++) {
    const p = pick(G.planets);
    G.news.push({ text: pick(NEWS_FLAVOR).replace(/\{P\}/g, p.id).replace('{N}', RI(3, 97)), planet: -1 });
  }
  const sp = pick(G.planets);
  G.news.push({ text: 'The ' + sp.id + ' Stock Exchange is ' + (sp.stock.trend > 0.04 ? 'booming. Analysts expect the rally to continue.' : sp.stock.trend < -0.04 ? 'in trouble. Investors are nervous.' : 'holding steady.'), planet: sp.i });
  for (const t of G.aiNews.slice(-3)) G.news.push({ text: t, planet: -1 });
  G.aiNews = [];
}

// ---------- AI ----------
function aiNoise(c) { return 1 + R(-0.35, 0.35) / (0.6 + c.int * 0.5); }

function aiMove(c) {
  if (c.bankrupt) return;
  const from = G.planets[c.loc], to = G.planets[c.dest];
  if (c.loc !== c.dest) {
    // trip costs
    weeklyCosts(c);
    c.fuel -= Math.min(c.fuel, fuelUse(c, from, to));
    c.cash -= cargoValue(c) * (c.expRate + c.impRate);
    c.loc = c.dest;
    const wait = Math.round(passMax(c) * R(0.5, 1.2));
    const ref = refFare(c, from, to);
    const acc = clamp(1.5 - c.ticket / ref, 0, 1);
    const n = Math.min(passMax(c), Math.round(wait * acc));
    c.cash += n * c.ticket * (1 - c.passTax);
    pushPlanetFee(c, to);
    // hazards (AI take a chance of loss)
    if (Math.random() < 0.1 && !c.insured) {
      const h = pick(HAZARDS);
      const d = shipValue(c) * R(0.03, 0.09);
      if (h.kind === 'steal' && cargoTons(c) > 0) { c.cargo.fill(0); c.paid.fill(0); G.aiNews.push(c.name + ' ' + pick(['is robbed by a band of Space Pirates.', 'gets caught in a Meteor Storm.', 'has its cargo stolen by the Baid-Rowel Bandits.'])); }
      else { c.cash -= d; if (Math.random() < 0.4) G.aiNews.push(c.name + ' ' + pick(['gets caught in a Meteor Storm.', 'stumbles into a deadly Solar Storm.', 'runs smack into a cloud of Dexxy Gas.'])); }
    }
  }
  c.insured = false;
  const p = planetOf(c);
  // pay crew
  if (c.cash > c.owed) { c.cash -= c.owed; c.owed = 0; } else { c.tu += c.owed; c.owed = 0; }
  // sell cargo
  for (let g = 0; g < NG; g++) {
    if (c.cargo[g] > 0) {
      const price = quote(p, g);
      if (price >= c.paid[g] * 1.01 || c.holdWeeks >= 2) sellGoods(c, p, g, c.cargo[g]);
    }
  }
  c.holdWeeks = cargoTons(c) > 0 ? c.holdWeeks + 1 : 0;
  // finances
  if (c.cash < 0) { c.tu += -c.cash + 1000; c.cash = 1000; }
  const reserve = shipValue(c) * 0.15 + crewN(c) * c.salary * 2;
  if (c.cash > reserve * 2 && (c.tu + c.zn) > 0) {
    const pay = Math.min(c.tu, c.cash - reserve * 1.5); c.tu -= pay; c.cash -= pay;
    const pz = Math.min(c.zn, c.cash - reserve * 1.5); if (pz > 0) { c.zn -= pz; c.cash -= pz; }
  }
  if (c.cash < reserve && c.tu < c.tuLimit * 0.8 && c.int >= 2) { const b = Math.min(c.tuLimit * 0.8 - c.tu, reserve * 1.5); c.tu += b; c.cash += b; }
  if (c.cash > reserve * 6 && c.tu === 0 && c.zn === 0 && c.style === 'steady') { const s = c.cash * 0.2; c.save += s; c.cash -= s; }
  if (c.tu > c.tuLimit * 0.95) { c.tuLimit += 25000; }
  // fuel
  const need = maxFuelUse(c);
  if (c.fuel < need * 1.5) { const buy = Math.min(tankMax(c) - c.fuel, Math.floor(Math.max(0, c.cash) / fuelPrice(c, p))); if (buy > 0) { c.fuel += buy; c.cash -= buy * fuelPrice(c, p); } }
  c.fuel = Math.min(c.fuel, tankMax(c));
  // upgrades
  const ns = nextShip(c);
  if (ns && c.cash > ns[2] * (c.style === 'bold' ? 2.6 : 3.2) && Math.random() < 0.35 + c.int * 0.1) {
    const trade = SHIPS[c.shipIdx][2] * 0.5;
    c.cash -= ns[2] - trade; c.shipIdx++; c.fuel = tankMax(c); bumpLimits(c); calcTier();
    G.aiNews.push(c.name + ' purchases a new ' + ns[1] + '-ton ship for ' + fmt(ns[2]) + ' kubars from the Trader\'s Union.');
  }
  if (c.cash > engineCost(c) * 12 && c.engine < 6 + c.shipIdx * 3 && Math.random() < 0.15) { c.cash -= engineCost(c); c.engine++; G.aiNews.push(c.name + ' travels to Pyke to purchase a new faster ' + c.engine + ' kuarp engine.'); }
  if (Math.random() < 0.06) {
    const d = Math.round(Math.max(0, netWorth(c)) * R(0.02, 0.05));
    if (Math.random() < 0.5) { c.cash += d; G.aiNews.push(c.name + pick([' reaps record profits as it transforms into a lean, mean, fighting machine!', ' cuts a deal with a foreign merchant.', ' manages to make a tidy sum on its stock investments.'])); }
    else { c.cash -= d; G.aiNews.push(c.name + pick([' suffers as profits fall due to a serious miscalculation in the commodities market.', ' forgets to pay its taxes.', ' suffers from bad management decisions.'])); }
  }
  // pick destination and buy cargo
  let best = null;
  for (const d of G.planets) {
    if (d.i === c.loc) continue;
    const t = Math.max(6, hours(c, p, d));
    const fuelOK = fuelUse(c, p, d) <= c.fuel;
    if (!fuelOK) continue;
    // greedy allocation
    const rows = [];
    for (let g = 0; g < NG; g++) {
      const buyP = quote(p, g);
      const sellP = priceAt(d, g, d.sup[g]) * aiNoise(c) * (1 - c.impRate - c.expRate);
      const m = sellP - buyP;
      if (m > 0) rows.push({ g, m, buyP, ratio: m / buyP });
    }
    rows.sort((x, y) => y.m - x.m);
    let space = cargoMax(c), cash = Math.max(0, c.cash * (c.style === 'steady' ? 0.6 : 0.78) - fuelUse(c, p, d) * 20), prof = 0;
    const plan = [];
    for (const r of rows) {
      const n = Math.min(space, availTons(p, r.g, c), Math.floor(cash / r.buyP));
      if (n <= 0) continue;
      const eff = r.m * (1 - Math.min(0.35, n / capOf(r.g)));
      plan.push({ g: r.g, n }); space -= n; cash -= n * r.buyP; prof += n * eff;
      if (space <= 0) break;
    }
    const score = prof / Math.sqrt(t);
    if (!best || score > best.score) best = { d, plan, score, prof };
  }
  if (best && best.prof > crewN(c) * c.salary * 0.6) {
    c.dest = best.d.i;
    for (const r of best.plan) buyGoods(c, p, r.g, r.n);
  } else {
    c.dest = pick(G.planets.filter(x => x.i !== c.loc)).i;
  }
  if (c.fuel < fuelUse(c, p, G.planets[c.dest])) {
    // emergency: shortest trip
    const nearest = G.planets.filter(x => x.i !== c.loc).sort((a, b) => dist(p, a) - dist(p, b))[0];
    c.dest = nearest.i; c.fuel = Math.max(c.fuel, fuelUse(c, p, nearest));
  }
  if (c.tu > c.tuLimit) c.tuLimit = Math.ceil(c.tu * 1.3 / 1000) * 1000;
  if (netWorth(c) < -c.tuLimit * 0.5) { c.bankrupt = true; G.aiNews.push(c.name + ' Bankrupts!!!'); c.cargo.fill(0); }
  // ticket
  c.ticket = Math.round(refFare(c, p, G.planets[c.dest]) * R(0.6, 0.9));
  c.insured = Math.random() < 0.3 + c.int * 0.1 && c.cash > insPremium(c) * 3;
  if (c.insured) c.cash -= insPremium(c);
}

// ---------- random encounters ----------
function randomEncounter(c, destIdx) {
  if (Math.random() > 0.45) return null;
  const p = G.planets[destIdx];
  const val = Math.max(1000, Math.round(Math.max(netWorth(c), shipValue(c)) * R(0.04, 0.12)));
  const cargo = cargoTons(c) > 0;
  const luck = c.luck;
  const L = (txt) => ({ kind: 'choice', lines: [txt] });
  const list = [];
  // each entry: weight, build()
  list.push([2, () => {
    const amt = Math.round(val * R(0.5, 1.5));
    c.cash += amt;
    return { kind: 'msg', img: 'money', title: 'You\'re in the money!', snd: 'good2', lines: ['It\'s your lucky day!!! You win the lottery and receive ' + fmt(amt) + ' kubars.'] };
  }]);
  list.push([2, () => {
    const add = Math.max(5, Math.round(c.whCap[destIdx] * 0.3));
    const before = c.whCap[destIdx]; c.whCap[destIdx] += add;
    return { kind: 'msg', img: 'warehous', title: 'Free Warehouse Space', snd: 'good3', lines: ['In order to encourage you to use the warehouse more often, the Trader\'s Union increases your warehouse space on ' + p.id + ' from ' + before + ' tons to ' + c.whCap[destIdx] + ' tons free of charge.'] };
  }]);
  if (cargo) list.push([2, () => {
    const amt = Math.round(cargoValue(c) * R(1.5, 2.2) + 500);
    return { kind: 'choice', img: 'scooter', title: 'Scooter Jay', snd: 'scooter', lines: ['Your ship runs across Scooter Jay, a smuggler from the galaxy of Pata Pata Pita. Scooter offers to buy all of your cargo for ' + fmt(amt) + ' kubars. Under Imperial law, you are forbidden to trade with anyone from Pata Pata Pita. Do you want to break the law and accept Scooter\'s offer?'],
      yes: () => { c.cash += amt; c.cargo.fill(0); c.paid.fill(0);
        if (Math.random() < 0.4) { const f = Math.round(amt * 0.5); c.cash -= f; return [{ kind: 'msg', img: 'police', title: 'Imperial Police', snd: 'police', bad: true, lines: ['Little did you know, the Imperial Police had you under surveillance the entire time. For your crime against the New Realm, you are fined ' + fmt(f) + ' kubars and warned that if you break the law again you could wind up in jail.'] }]; }
        return [{ kind: 'msg', img: 'scooter', title: 'Scooter Jay', lines: ['Scooter pays you ' + fmt(amt) + ' kubars in cash and zooms off. Nobody saw a thing!'] }]; } };
  }]);
  list.push([2, () => {
    const amt = Math.round(val * 0.6);
    return { kind: 'choice', img: 'curtis', title: 'Curtonian Plus', snd: 'curtis', lines: ['You are stopped by a broken-down spaceship flashing a distress signal. The captain, Curtonian Plus, asks if you will loan him ' + fmt(amt) + ' kubars to repair his ship so he can return home. He promises to pay you back just as soon as he arrives. Do you want to loan him the money?'],
      needCash: amt,
      yes: () => { c.cash -= amt; const back = Math.round(amt * R(1.5, 3)); c.cash += back;
        return [{ kind: 'msg', img: 'curtis', title: 'Curtonian Plus', snd: 'curtis', lines: ['As it turns out, Curtonian Plus is from one of Kukubia\'s wealthiest merchant families. His father winds up paying you ' + fmt(back) + ' kubars for your kindness.'] }]; } };
  }]);
  list.push([1.5, () => {
    const amt = Math.round(val * 0.8);
    return { kind: 'choice', img: 'quist', title: 'Quist', snd: 'quist', lines: ['Quist, a high flying financier, says he has cooked up a sure fire scheme for making millions. If you invest ' + fmt(amt) + ' kubars with him, he guarantees you\'ll see a tenfold profit within a month or two. Do you want to invest your money?'],
      needCash: amt,
      yes: () => { c.cash -= amt; if (Math.random() < 0.12 + Math.max(0, luck) * 0.05) { c.cash += amt * 10; return [{ kind: 'msg', img: 'quist', title: 'Quist', snd: 'good2', lines: ['Incredible! Quist\'s scheme actually works, and he pays you ' + fmt(amt * 10) + ' kubars.'] }]; }
        return [{ kind: 'msg', img: 'quist', title: 'Quist', snd: 'bad5', bad: true, lines: ['Quist vanishes with your ' + fmt(amt) + ' kubars. You should have known better.'] }]; } };
  }]);
  list.push([1.5, () => {
    const amt = Math.round(val * 0.5);
    return { kind: 'choice', img: 'wobbler', title: 'The Wobbler', snd: 'wobbler', lines: ['Your company is approached by The Wobbler, a starving artist. The Wobbler asks you to sponsor his next avant-garde theatrical production. It will cost ' + fmt(amt) + ' kubars and probably won\'t make any money. However, it will be an artistic masterpiece that will go down in history. Do you give him the money?'],
      needCash: amt,
      yes: () => { c.cash -= amt; if (Math.random() < 0.3) { c.cash += amt * 3; return [{ kind: 'msg', img: 'dred', title: 'Emperor Dred Nicolson', snd: 'good2', lines: ['The Wobbler\'s experimental play turns out to be a surprise hit! The public flocks to see it. Supreme Commander Dred Nicolson calls it a national treasure. The Wobbler generously repays you ' + fmt(amt * 3) + ' kubars, three times your original investment.'] }]; }
        return [{ kind: 'msg', img: 'dred', title: 'Emperor Dred Nicolson', snd: 'bad5', bad: true, lines: ['The Wobbler\'s experimental play turns out to be a complete flop! Supreme Commander Dred Nicolson calls it a national disgrace and bans it from ever being shown again in public.'] }]; } };
  }]);
  list.push([1.5, () => {
    const amt = Math.round(val * 0.4);
    return { kind: 'choice', img: 'yoyo', title: 'Yoyo', snd: 'yoyo', lines: ['Your ship is stopped by Yoyo, a notorious gambler. Yoyo offers to make you a wager. He will flip a coin. If it comes up tails, he will pay you ' + fmt(amt) + ' kubars. If it comes up heads, you will pay him ' + fmt(amt) + ' kubars. Do you accept Yoyo\'s offer?'],
      needCash: amt,
      yes: () => { if (Math.random() < 0.38 + luck * 0.03) { c.cash += amt; return [{ kind: 'msg', img: 'yoyo', title: 'Yoyo', lines: ['Tails! You win ' + fmt(amt) + ' kubars. Yoyo grumbles and flies away.'] }]; }
        c.cash -= amt; return [{ kind: 'msg', img: 'money', title: 'Heads!!!', bad: true, lines: ['Sorry, you lose. You should know by now that it never pays to gamble with a pro!'] }]; } };
  }]);
  if (cargo) list.push([1.2, () => ({ kind: 'choice', img: 'limpus', title: 'Limpus', snd: 'limpus', lines: ['Limpus, a renowned humanitarian and philanthropist, asks if you would like to donate the cargo you have in your ship to the Kukubian Children\'s Fund. Do you give your valuable cargo to the needy children?'],
    yes: () => { c.cargo.fill(0); c.paid.fill(0); c.luck = Math.min(3, c.luck + 2); return [{ kind: 'msg', img: 'monk', title: 'Grand Sages', snd: 'blessing', lines: ['When the Grand Sages, Kukubia\'s most venerated religious figures, hear of how your struggling company offered to give up its precious cargo for needy children, they grant your company the highest blessing.'] }]; } })]);
  list.push([1.2, () => {
    const amt = Math.round(val * R(1, 2));
    return { kind: 'choice', img: 'iso', title: 'Iso', snd: 'iso', lines: ['You come across Iso, a painfully shy monk who disdains material possessions. Pilgrims often seek out Iso for blessings and give her extraordinary sums of money, but Iso has no use for these pieces of paper. Thus, Iso gives them away to anyone who will take them. Are you interested in relieving Iso of ' + fmt(amt) + ' kubars?'],
      yes: () => { c.cash += amt; return [{ kind: 'msg', img: 'iso', title: 'Iso', lines: ['Iso hands over ' + fmt(amt) + ' kubars and smiles serenely.'] }]; } };
  }]);
  list.push([1.2, () => {
    const n = RI(1, Math.max(1, passMax(c)));
    return { kind: 'choice', img: 'tatilus', title: 'Tatilus', snd: 'tatilus', lines: ['Tatilus, an emergency passenger broker, says that he has ' + n + ' passengers desperate to get to ' + pick(G.planets).id + ' this week. If you\'ll take them onboard your ship, he\'ll pay you 5,000 kubars per passenger. Are you interested?'],
      yes: () => { const a = n * 5000; c.cash += a; return [{ kind: 'msg', img: 'tatilus', title: 'Tatilus', lines: ['Tatilus pays you ' + fmt(a) + ' kubars. The passengers hop on board.'] }]; } };
  }]);
  list.push([1.2, () => {
    const pct = Math.round(c.fuel / tankMax(c) * 100), amt = Math.round(c.fuel / 2 * fuelPrice(c, p) * 2);
    return { kind: 'choice', img: 'gurttle', title: 'Gurttle', snd: 'gurttle', lines: ['Gurttle, a notorious fuel fiend, grabs onto your fuel tank and demands that you give him something to drink. Gurttle offers to pay you ' + fmt(amt) + ' kubars if you\'ll allow him to gulp down half of the fuel presently in your tank. Your tank is currently ' + pct + '% full. Do you accommodate Gurttle\'s biological needs?'],
      yes: () => { c.fuel = Math.floor(c.fuel / 2); c.cash += amt; return [{ kind: 'msg', img: 'gurttle', title: 'Gurttle', lines: ['Gurttle slurps down half your fuel and pays you ' + fmt(amt) + ' kubars.'] }]; } };
  }]);
  if (cargo) list.push([1.5, () => {
    const amt = Math.round(cargoValue(c) * 3);
    return { kind: 'choice', img: 'lord', title: 'Lord 104', snd: 'lord', lines: ['Lord 104, the 104th Prince of the Leaper Colony, is a wealthy and wild speculator. Lord 104 offers to buy up all of your cargo for ' + fmt(amt) + ' kubars, which is three times as much as you paid for it! Do you accept Lord 104\'s offer?'],
      yes: () => { c.cash += amt; c.cargo.fill(0); c.paid.fill(0); return [{ kind: 'msg', img: 'lord', title: 'Lord 104', lines: ['Lord 104 hops away with your cargo and leaves you ' + fmt(amt) + ' kubars richer.'] }]; } };
  }]);
  if (cargo) list.push([1.5, () => {
    const amt = Math.round(cargoValue(c) * 2);
    return { kind: 'choice', img: 'leahy', title: 'Captain Leahy', snd: 'leahy', lines: ['Captain Leahy, an ex-pirate turned respectable businessman, offers to buy all of your cargo for ' + fmt(amt) + ' kubars, which is twice as much as you paid for it. He assures you this is entirely legal, and you will make a guaranteed profit. Do you accept Captain Leahy\'s offer?'],
      yes: () => { c.cash += amt; c.cargo.fill(0); c.paid.fill(0); return [{ kind: 'msg', img: 'leahy', title: 'Captain Leahy', lines: ['A deal is a deal. Captain Leahy pays you ' + fmt(amt) + ' kubars.'] }]; } };
  }]);
  list.push([1.5, () => ({ kind: 'msg', img: 'mulls', title: 'Mulls', snd: 'mulls', lines: ['Mulls, a reclusive, retired business consultant, comes out of his shell to offer you a piece of free advice:', pick(MULLS_TIPS)] })]);
  list.push([1.2, () => {
    const opts = [['turbocharge your ship\'s engine', () => { c.engine++; }], ['expand your ship\'s cargo bay by 10 tons', () => { c.bonus.cargo += 10; }], ['expand your ship\'s passenger capacity by 1 seat', () => { c.bonus.pass += 1; }], ['expand your ship\'s fuel tank capacity by 5 tons', () => { c.bonus.tank += 5; }]];
    const o = pick(opts), amt = Math.round(val * 0.5);
    return { kind: 'choice', img: 'teeter', title: 'Teeter', snd: 'teeter', lines: ['You come across Teeter, a travelling repairman. Teeter says that he has the necessary parts to ' + o[0] + '. This will only cost you ' + fmt(amt) + ' kubars. Are you interested?'],
      needCash: amt,
      yes: () => { c.cash -= amt; o[1](); return [{ kind: 'msg', img: 'teeter', title: 'Teeter', snd: 'teeter2', lines: ['Teeter is a genius! He manages to ' + o[0] + ' without any trouble!'] }]; } };
  }]);
  if (crewN(c) > 2) list.push([1, () => {
    const amt = Math.round(val * 0.6);
    return { kind: 'choice', img: 'meeg', title: 'Meeg', snd: 'meeg', lines: ['You happen across Meeg, a true adolescent technoid who claims to know just about everything. Meeg offers to entirely re-program your ship\'s computers, which will allow you to replace one of your crew members with a fully automated system. The entire job will cost you ' + fmt(amt) + ' kubars and may upset the labor union, but it could save you money in the long run. Are you interested?'],
      needCash: amt,
      yes: () => { c.cash -= amt;
        if (Math.random() < 0.5) { c.crewAdj++; return [{ kind: 'msg', img: 'meeg', title: 'Meeg', snd: 'good5', lines: ['Meeg is successful! He manages to re-program your system so that you can now eliminate one of your crew members from your payroll. To say the least, the Labor Union is not happy with this development.'] }]; }
        const d = Math.round(amt * 0.8); c.cash -= d; return [{ kind: 'msg', img: 'meeg', title: 'Meeg', snd: 'bad2', bad: true, lines: ['You should have known better than to let Meeg near your computers. He winds up crashing your entire system. The only way to get it back up and running is to purchase an entirely new motherboard costing ' + fmt(d) + ' kubars! Sorry, but your insurance does not cover self-inflicted computer crashes.'] }]; } };
  }]);
  list.push([1, () => ({ kind: 'choice', img: 'spike', title: 'Spike', snd: 'spike', lines: ['You happen across Spike the Space Mutt. Spike hops on board your ship and makes himself at home. You have a choice. Either you can adopt this stray dog, or you can leave him on his asteroid. Do you adopt Spike?'],
    yes: () => { const d = Math.round(shipValue(c) * R(0.02, 0.06)); c.cash -= d; return [{ kind: 'msg', img: 'spike', title: 'Spike', snd: 'spike2', bad: true, lines: ['Spike the Space Mutt turns out to be a real pain in the neck. He runs wild on your ship, chewing holes in your new seats and tearing apart your wiring. You finally end up dumping Spike on a passing asteroid, but not before he inflicts ' + fmt(d) + ' kubars worth of damage. Sorry, but your insurance does not cover household pets.'] }]; } })]);
  list.push([1, () => {
    const amt = Math.round(val * 0.3);
    return { kind: 'choice', img: 'nibble', title: 'Nibble', snd: 'nibble', lines: ['Nibble, a professional bully, offers to intimidate your crew into lowering their salary. He assures you this union busting tactic works every time. Nibble promises to do the job for only ' + fmt(amt) + ' kubars. How about it?'],
      needCash: amt,
      yes: () => { c.cash -= amt;
        if (Math.random() < 0.5) { c.salary = Math.max(20, c.salary - 20); return [{ kind: 'msg', img: 'nibble', title: 'Nibble', snd: 'nibble2', lines: ['Nibble\'s intimidation tactics pay off. He manages to break up the union and scare your crew into lowering their salary by 20 kubars per person each week.'] }]; }
        c.salary += 20; return [{ kind: 'msg', img: 'nibble', title: 'Nibble', snd: 'bad', bad: true, lines: ['Nibble\'s harassment backfires, and your crew goes on strike! To settle it you are forced to get rid of Nibble and raise your crew\'s weekly salary by 20 kubars per person.'] }]; } };
  }]);
  list.push([0.8, () => {
    const amt = Math.round(val * 0.5);
    return { kind: 'choice', img: 'speevak', title: 'Speevak', snd: 'speevak', lines: ['Speevak, a distraught pregnant space fly, offers to pay you ' + fmt(amt) + ' kubars if you will empty your ship\'s septic tanks onto her asteroid. The waste is perfect for breeding baby flies, and she promises to clean up afterwards. Do you agree?'],
      yes: () => { c.cash += amt; if (Math.random() < 0.5) { const f = Math.round(amt * 1.5); c.cash -= f; return [{ kind: 'msg', img: 'police', title: 'Sanitation Police', snd: 'police', bad: true, lines: ['When the sanitation police learn what you have done, they immediately fine you ' + fmt(f) + ' kubars for illegal waste disposal. Sorry, but your insurance does not cover illegal waste disposal.'] }]; } return [{ kind: 'msg', img: 'speevak', title: 'Speevak', lines: ['Speevak is delighted and pays you ' + fmt(amt) + ' kubars. Nobody ever finds out.'] }]; } };
  }]);
  list.push([0.8, () => ({ kind: 'msg', img: 'dred', title: 'Emperor Dred Nicolson', snd: 'dred', lines: ['Supreme Commander Dred Nicolson, Emperor of the New Realm, pays a visit to your company. He says your company is critical to the success of Kukubia, and he will do his best to support free trade and open up new markets.'] })]);
  const total = list.reduce((s, x) => s + x[0], 0);
  let r = Math.random() * total;
  for (const [w, f] of list) { r -= w; if (r <= 0) return f(); }
  return null;
}

// ---------- planet specials ----------
function specialDone(c) { return c.specialWeek === G.week; }
function useSpecial(c) { c.specialWeek = G.week; }

// Returns an array of dialog events describing the outcome.
function runSpecial(c, kind, arg) {
  const p = planetOf(c);
  const luck = c.luck;
  const good = Math.random() < 0.5 + luck * 0.06;
  const F = (title, img, lines, snd, bad) => ({ kind: 'msg', img, title, lines: Array.isArray(lines) ? lines : [lines], snd, bad });
  switch (kind) {
    case 'tax': {
      const r = Math.random();
      if (r < 0.25) return [F('Imperial Magistrate', 'asian2', 'The Imperial Magistrate says he will not participate in corporate welfare while there are starving children around. Petition denied.', 'neutral')];
      if (r < 0.7) {
        const w = pick(['impRate', 'expRate', 'passTax']);
        const name = { impRate: 'import tariffs', expRate: 'export tariffs', passTax: 'passenger taxes' }[w];
        const old = c[w]; c[w] = Math.max(0.005, old - 0.01);
        return [F('Imperial Magistrate', 'asian', 'After you eloquently explain your company\'s financial situation, the Imperial Magistrate is so moved that he lowers your ' + name + ' from ' + (old * 100).toFixed(1) + '% to ' + (c[w] * 100).toFixed(1) + '%.', 'good', false)];
      }
      if (r < 0.85) { const amt = Math.round(shipValue(c) * 0.1); c.cash += amt; return [F('Imperial Magistrate', 'asian', 'The Imperial Magistrate generously grants your company an emergency tax break. That means you receive a refund of ' + fmt(amt) + ' kubars.', 'good')]; }
      { const w = pick(['impRate', 'expRate', 'passTax']); c[w] += 0.01; return [F('Imperial Magistrate', 'asian2', 'Your petition backfires! The Imperial Magistrate audits your books and decides your taxes are too low. Your ' + ({ impRate: 'import tariff', expRate: 'export tariff', passTax: 'passenger tax' }[w]) + ' rises to ' + (c[w] * 100).toFixed(1) + '%.', 'bad', true)]; }
    }
    case 'engine': {
      if (Math.random() < 0.12) return [F('L-Tech Sales Rep.', 'mech2', pick(['When you show up at the L-Tech engine plant, they inform you that their mechanic is ill, and they cannot install a new engine. They ask you to come back next week.', 'For no apparent reason, when you show up at the L-Tech engine plant, it is closed.', 'Emperor Dred Nicolson has requested 500 L-Tech engines for the Imperial Fleet this week. You will have to come back another time.']), 'neutral')];
      const price = engineCost(c);
      return [{ kind: 'choice', img: 'mech', title: 'L-Tech Sales Rep.', snd: 'engine', lines: ['This week you can purchase a ' + (c.engine + 1) + ' kuarp engine for ' + fmt(price) + ' kubars. Your ship has a ' + c.engine + ' kuarp engine now. ' + pick(['Faster is better!', 'It pays to be first!', 'L-Tech is the best!', 'Time is money!', 'The race is on!'])], needCash: price,
        yes: () => { c.cash -= price; c.engine++; return [F('L-Tech Sales Rep.', 'mech', 'You just purchased L-Tech\'s super ' + c.engine + ' kuarp engine for ' + fmt(price) + ' kubars.', 'mech')]; } }];
    }
    case 'sages': {
      const r = Math.random();
      if (r < 0.2) return [F('Grand Sage', 'monk', pick(['The Grand Sages tell you to give to others before asking for yourself.', 'The Grand Sages remind you that the pursuit of material wealth will only lead to discontentment.', 'The Grand Sages advise you not to depend upon others for your happiness.']), 'monk')];
      if (r < 0.35) { c.luck = Math.max(-3, c.luck - 2); return [F('Grand Sage', 'monk', 'The Grand Sages harshly criticize you for failing to give back to the world what you have taken, and they CURSE the ground you walk on.', 'bad', true)]; }
      const hi = Math.random() < 0.3; c.luck = Math.min(3, c.luck + (hi ? 3 : 1.5));
      return [F('Grand Sage', 'monk', hi ? 'The Grand Sages grant you their HIGHEST BLESSING and urge you to make good use of your fortunes.' : 'The Grand Sages grant you a SMALL BLESSING and urge you to take care of those who depend upon you.', 'blessing')];
    }
    case 'union': {
      const r = Math.random();
      if (r < 0.2) { const l = 25000 * Math.max(1, G.tierMax + 1) * 0.5; c.tuLimit += Math.round(l / 1000) * 1000; return [F('Trader\'s Union Official', 'loan1', 'The Trader\'s Union generously offers to increase your credit limit by ' + fmt(Math.round(l / 1000) * 1000) + ' kubars.', 'good')]; }
      if (r < 0.4) { const old = c.tuRate; if (old <= 0.012) return [F('Trader\'s Union Official', 'loan2', 'The Trader\'s Union says it would be unfair to change your rates while not doing the same for their other members.', 'loan')]; c.tuRate = Math.max(0.01, old - 0.005); return [F('Trader\'s Union Official', 'loan1', 'The Trader\'s Union offers to lower the interest rate on your loan from ' + (old * 100).toFixed(1) + '% to ' + (c.tuRate * 100).toFixed(1) + '%.', 'good')]; }
      if (r < 0.6) { const old = c.tuSave; c.tuSave += 0.003; return [F('Trader\'s Union Official', 'loan1', 'The Trader\'s Union offers to increase the interest rate on your savings account from ' + (old * 100).toFixed(1) + '% to ' + (c.tuSave * 100).toFixed(1) + '%.', 'good')]; }
      if (r < 0.7 && c.tu > 0) { const was = c.tu; c.tu = Math.round(c.tu * 2 / 3); return [F('Trader\'s Union Official', 'loan1', 'The Trader\'s Union generously offers to forgive one third of your debt. That means you now owe the Trader\'s Union only ' + fmt(c.tu) + ' kubars instead of ' + fmt(was) + ' kubars.', 'good')]; }
      if (r < 0.82) { const old = c.tuRate; c.tuRate += 0.005; return [F('Trader\'s Union Official', 'loan2', 'Your plea for assistance backfires! Instead of lowering your rates, the Trader\'s Union raises the interest on your loan from ' + (old * 100).toFixed(1) + '% to ' + (c.tuRate * 100).toFixed(1) + '%.', 'bad', true)]; }
      return [F('Trader\'s Union Official', 'loan2', pick(['The Trader\'s Union asks you to be patient and keep up the hard work.', 'The Trader\'s Union informs you that their budget is tight and they cannot do anything at the present time.', 'The Trader\'s Union urges you to improve your business practices rather than relying on them to bail you out.']), 'loan')];
    }
    case 'leave': {
      const cost = crewN(c) * c.salary;
      const r = Math.random();
      if (r < 0.15) { const b = Math.round(shipValue(c) * 0.04); c.cash -= b; emergencyFunds(c); return [F('Peelia Veelia', 'peelia2', 'Your crew gets into a fight with a rowdy bunch of Lepro Ulps and winds up in jail. It costs you ' + fmt(b) + ' kubars to bail them out. What a vacation!', 'bad', true)]; }
      if (r < 0.3 && c.salary > 25) { const o = c.salary; c.salary = Math.max(20, o - 15); return [F('Peelia Veelia', 'peelia', 'After a few days on Loro, your crew feels so relaxed that you manage to talk them into reducing their salary from ' + o + ' to ' + c.salary + ' kubars per person. Of course, as part of the bargain, you promise to return to Loro as often as possible.', 'good')]; }
      if (r < 0.4 && c.owed > 0) { const o = c.owed; c.owed = 0; return [F('Peelia Veelia', 'peelia', 'Your crew is so happy with their vacation that they offer to forget about any money you owe them. That means you no longer have to pay ' + fmt(o) + ' kubars in back wages.', 'good')]; }
      if (r < 0.5) { c.fuel = tankMax(c); return [F('Peelia Veelia', 'peelia', 'Your crew is so grateful at having this unexpected vacation that they all chip-in to fill up the ship\'s fuel tank.', 'fuel')]; }
      return [F('Peelia Veelia', 'peelia', pick(['Your crew has a wonderful time surfing the Vorpal Pools, stuffing themselves with Lorinian grapes and WaWa pies, and dancing the night away.', 'Your crew thanks you for the much-needed vacation and promises to work harder than ever.', 'Loro is bliss. Your pilot falls in love with one of the local girls, your navigator goes deep sea phonging, and the rest of your crew spend all their time paying court to Peelia Veelia.']), 'crew')];
    }
    case 'zinn': {
      const r = Math.random();
      if (r < 0.2) { const l = Math.round(25000 * Math.max(1, G.tierMax + 1) * 0.7 / 1000) * 1000; c.znLimit += l; return [F('Mr. Zinn', 'zinn', 'Mr. Zinn generously extends your credit limit by ' + fmt(l) + ' kubars.', 'good')]; }
      if (r < 0.4) { const old = c.znRate; if (old <= 0.011) { c.znRate = 0.02; return [F('Mr. Zinn', 'zinn2', 'Mr. Zinn becomes angry. He says your rate is already 1%, the lowest in the system, and you still pester him for more. He decides to raise your rate to 2%.', 'bad', true)]; } c.znRate = Math.max(0.01, old - 0.005); return [F('Mr. Zinn', 'zinn', 'Mr. Zinn lowers your interest rate from ' + (old * 100).toFixed(1) + '% to ' + (c.znRate * 100).toFixed(1) + '%.', 'good')]; }
      if (r < 0.5 && c.zn > 0) { const was = c.zn; c.zn = Math.round(c.zn * 2 / 3); return [F('Mr. Zinn', 'zinn', 'Mr. Zinn feels sorry for you and offers to forgive 1/3 of your debt. That means your debt shrinks from ' + fmt(was) + ' kubars to ' + fmt(c.zn) + ' kubars.', 'good')]; }
      return [F('Mr. Zinn', 'zinn2', pick(['Mr. Zinn says that times are tough for everyone, and you have to do your best with the current rates.', 'Mr. Zinn has come down with a recurring case of Nefratic Fever and cancels his meeting with you.', 'Mr. Zinn introduces you to his family. There is Mrs. Zinn and his 12 daughters. He is a proud father.', 'The butler informs you that Mr. Zinn is away on business and should return sometime soon.']), 'zinn')];
    }
    case 'insure': {
      const r = Math.random();
      if (r < 0.4) { const pct = RI(8, 25); c.insRate = Math.max(0.004, c.insRate * (1 - pct / 100)); return [F('Your Insurance Agent', 'insure', 'Your Insurance Agent says he will reduce your rates by an average of ' + pct + '%. He explains how this will severely cut into his commissions and lifestyle, but he values you as a customer and is willing to sacrifice on your behalf.', 'good')]; }
      if (r < 0.55) { const pct = RI(5, 20); c.insRate *= 1 + pct / 100; return [F('Your Insurance Agent', 'insure', 'Your Insurance Agent is not in a good mood. In fact, he says that after reviewing your records, he has no choice but to raise your rates by an average of ' + pct + '%.', 'bad', true)]; }
      return [F('Your Insurance Agent', 'insure', pick(['The insurance company says they are working on offering lower rates to everyone.', 'The insurance company politely informs you that they have a monopoly on insurance sales in the Kukubian system, so complaining about your high rates will get you nowhere.', 'The insurance company tells you to come back next week when things are not so busy.']), 'insure')];
    }
    case 'gamble': {
      const max = Math.floor(c.cash * 0.05);
      return [{ kind: 'gamble', img: 'dealer1', title: 'Casino Dealer', max }];
    }
    case 'queg': {
      const g = RI(Math.max(3, 6 - 0), NG - 1), n = Math.min(cargoMax(c), RI(8, 40) + c.shipIdx * 20);
      const mp = quote(p, g), price = Math.round(mp * R(0.4, 0.65));
      return [{ kind: 'queg', img: 'cornu1', title: 'Lady Cornucopia', g, n, price, mp }];
    }
    case 'mech': {
      const opts = [['turbocharge your ship\'s engine', () => { c.engine++; }], ['expand your ship\'s cargo bay by 10 tons', () => { c.bonus.cargo += 10; }], ['expand your ship\'s passenger capacity by 1 seat', () => { c.bonus.pass += 1; }], ['expand your ship\'s fuel tank capacity by 5 tons', () => { c.bonus.tank += 5; }]];
      const o = pick(opts), amt = Math.round(shipValue(c) * R(0.18, 0.4) + 800);
      return [{ kind: 'choice', img: 'mechan1', title: 'Your Mechanic', snd: 'mech', lines: ['Your favorite mechanic claims he has found the necessary parts and can ' + o[0] + ', but it will cost you ' + fmt(amt) + ' kubars.'], needCash: amt,
        yes: () => { c.cash -= amt; o[1](); return [F('Your Mechanic', 'mechan3', 'With a few spare parts and some hard work, your mechanic manages to ' + o[0] + '.', 'mech')]; } }];
    }
    case 'sooth': {
      const price = Math.round(shipValue(c) * 0.02 + 200);
      return [{ kind: 'choice', img: 'sooth3', title: 'Soothsayer', snd: 'neutral3', lines: ['This week the Soothsayers are charging ' + fmt(price) + ' kubars for their service. Have your fortune read?'], needCash: price,
        yes: () => { c.cash -= price; const roll = clamp(Math.round(R(-3, 3) + c.luck * 0.3), -3, 3);
          // result roll maps to message and sets luck (a positive reading helps future events, and may pay out)
          c.luck = clamp(c.luck * 0.5 + roll, -3, 3);
          const idx = clamp(roll + 4, 0, 7);
          const out = [F('Soothsayer', 'sooth' + (roll > 0 ? 3 : roll < 0 ? 1 : 2), SOOTH_TEXT[idx], 'sooth', roll < 0)];
          if (roll >= 2) { const a = Math.round(price * R(5, 15)); c.cash += a; out.push(F('Soothsayer', 'sooth3', pick(LUCKY_NOTES).replace('{$}', fmt(a)).replace('{P}', p.id), 'good')); }
          return out; } }];
    }
    case 'agent': {
      const ev = [
        ['on hottest daytime TV talk show', 1], ['on prime time TV', 1], ['with Kukubia\'s most famous sports star', 1], ['with the Ministry of Travel', 1], ['with a journalist from the Astral Reporter', 1], ['on late night TV', 1], ['with the Cosmic Consumer Caucus', 1], ['with the Interplanetary Inquirer', 1], ['on Planet Line News', 1], ['at the Ceremony of the Stars', 1]];
      const e = pick(ev);
      return [{ kind: 'choice', img: 'agent1', title: 'Your Agent', snd: 'agent', lines: ['This week your agent claims to have a mega media event scheduled for you ' + e[0] + '. Do you want to do it?'],
        yes: () => { const r = Math.random() + luck * 0.04; const gain = Math.round(Math.max(2000, netWorth(c) * 0.02));
          if (r > 0.65) { c.cash += gain; c.adPass += passMax(c) * 90; return [F('Your Agent', 'agent1', 'It goes brilliantly! You appear ' + e[0] + ' and your company\'s reputation soars. You are paid ' + fmt(gain) + ' kubars, and passengers will flock to your ship next week.', 'agent')]; }
          if (r > 0.3) return [F('Your Agent', 'agent2', 'Your appearance ' + e[0] + ' is uneventful. Nobody seems to notice. Sorry, but that\'s show biz!', 'agent2')];
          const loss = Math.round(gain * 0.5); c.cash -= loss; emergencyFunds(c); return [F('Your Agent', 'agent2', 'Disaster! Your appearance ' + e[0] + ' goes horribly wrong. The press has a field day and the bad publicity costs you ' + fmt(loss) + ' kubars.', 'bad7', true)]; } }];
    }
    case 'broker': {
      if (Math.random() < 0.2) return [F('Your Stock Broker', 'broker2', pick(['Unfortunately, when you show up at your stock broker\'s office, you discover that she is away at a bond convention on Loro.', 'When you show up at your broker\'s office, she is not there. The secretary informs you that your broker is on the stock exchange floor for the rest of the week.', 'Your stock broker sits you down and gives you a long lecture about avoiding risky investments.']), 'neutral')];
      return [{ kind: 'broker', img: 'broker1', title: 'Your Stock Broker' }];
    }
    case 'fuel': {
      if (Math.random() < 0.2) return [F('Zobrok', 'zobrok2', pick(['When you dock your ship at Zobrok\'s refueling station, Zobrok informs you that he is terribly sorry, but the previous customer just purchased the last of his fuel.', 'As you pull up to Zobrok\'s refueling station, he rushes out and begs you to come back another time.']), 'neutral')];
      const off = RI(20, 45);
      return [{ kind: 'zobrok', img: 'zobrok1', title: 'Zobrok the Fuel Wholesaler', off, retail: fuelPrice(c, p), price: Math.round(fuelPrice(c, p) * (1 - off / 100)) }];
    }
  }
  return [];
}

// ---------- stocks ----------
function buyStock(c, pi, n) {
  const p = G.planets[pi];
  const price = stockPrice(p);
  const cost = n * price * 1.01;
  if (cost > c.cash) return 'cash';
  c.cash -= cost;
  const sh = c.shares[pi];
  sh.paid = (sh.n * sh.paid + n * price) / (sh.n + n); sh.n += n;
  c.boughtStockWeek = G.week;
  return null;
}
function sellStock(c, pi, n) {
  const p = G.planets[pi], sh = c.shares[pi];
  n = Math.min(n, sh.n);
  c.cash += n * stockPrice(p) * 0.99; sh.n -= n; if (!sh.n) sh.paid = 0;
  return n;
}

// ---------- facilities ----------
const FAC_TYPES = ['Fuel Depot', 'Launch Pad', 'Passenger Ticket Office'];
function maybeAuction(events) {
  if (G.week < 4 || G.week - G.lastAuction < 6 || Math.random() < 0.3) return;
  G.lastAuction = G.week;
  const planet = RI(0, 6), type = pick(FAC_TYPES);
  const base = Math.round(40000 * (1 + G.tierMax * 1.3) / 1000) * 1000;
  const bids = G.co.filter(x => !x.human && !x.bankrupt && x.cash > base).map(x => ({ c: x, bid: Math.round(base * R(0.6, 1.5) / 1000) * 1000 })).filter(b => b.c.cash > b.bid * 1.3);
  const top = bids.sort((a, b) => b.bid - a.bid)[0] || null;
  events.push({ kind: 'auction', planet, type, base, top, fee: Math.max(10, Math.round(base / 900)) });
}
function finishAuction(a, humanBid) {
  let winner = null, price = 0;
  if (humanBid && (!a.top || humanBid >= a.top.bid) && humanBid <= human().cash) { winner = human(); price = humanBid; }
  else if (a.top) { winner = a.top.c; price = a.top.bid; }
  if (!winner) return null;
  winner.cash -= price;
  G.facilities.push({ planet: a.planet, type: a.type, owner: winner.i, fee: a.fee, rev: 0, price });
  return { winner, price };
}

// ---------- persistence ----------
function saveGame(slot) {
  G.saved = true;
  try { localStorage.setItem('gaz_save_' + slot, JSON.stringify({ t: Date.now(), nw: Math.round(netWorth(human())), week: G.week, name: human().name, G })); return true; } catch (e) { return false; }
}
function slotInfo(slot) {
  try { const s = localStorage.getItem('gaz_save_' + slot); if (!s) return null; const o = JSON.parse(s); return { t: o.t, nw: o.nw, week: o.week, name: o.name }; } catch (e) { return null; }
}
function loadGame(slot) {
  try { const s = localStorage.getItem('gaz_save_' + slot); if (!s) return false; G = JSON.parse(s).G; return true; } catch (e) { return false; }
}
