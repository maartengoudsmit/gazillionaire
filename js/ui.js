// UI layer: renders every screen into the fixed 640x480 stage.
'use strict';

const stage = document.getElementById('stage');
const $img = n => 'assets/img/' + n + '.png';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- sound ----------
let muted = false;
try { muted = localStorage.getItem('gaz_muted') === '1'; } catch (e) { }
const sndCache = {};
function sfx(name) {
  if (muted || !name) return;
  try {
    let a = sndCache[name];
    if (!a) { a = new Audio('assets/snd/' + name.toLowerCase().replace('.wav', '') + '.mp3'); sndCache[name] = a; }
    a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => { });
  } catch (e) { }
}
function setMuted(m) { muted = m; try { localStorage.setItem('gaz_muted', m ? '1' : '0'); } catch (e) { } document.getElementById('mute').textContent = m ? '🔇' : '🔊'; }

// ---------- DOM helpers ----------
function mk(parent, tag, cls, html, css) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (css) Object.assign(e.style, css);
  if (parent) parent.appendChild(e);
  return e;
}
function btn(parent, label, fn, css, cls) {
  const b = mk(parent, 'div', 'btn ' + (cls || ''), label, css);
  b.onclick = () => { if (b.classList.contains('dis')) return; sfx('ping1'); fn(b); };
  return b;
}
function vidEl(parent, name, css) {
  const v = mk(parent, 'video', null, null, css);
  v.src = 'assets/vid/' + name + '.mp4'; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true; v.setAttribute('muted', '');
  v.onerror = () => v.remove();
  const p = v.play(); if (p && p.catch) p.catch(() => { });
  return v;
}
function setBg(name) { stage.style.backgroundImage = name ? 'url(' + $img(name) + ')' : 'none'; }
function clearStage(bg) { stage.innerHTML = ''; setBg(bg); }
function win(parent, title, x, y, w, h) {
  const wn = mk(parent, 'div', 'win', null, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  mk(wn, 'div', 'tb', title);
  const bd = mk(wn, 'div', 'bd');
  return { wn, bd };
}
function overlay() { return mk(stage, 'div', 'ov'); }
const money = n => fmt(n) + ' kubars';
const para = (t) => '<p>' + t + '</p>';

// ---------- generic dialogs ----------
// opts: img, title, lines[], buttons[{t,v,dis}], snd, w
function dlg(o) {
  return new Promise(res => {
    const ov = overlay();
    const w = o.w || 520, hasImg = !!o.img;
    const lines = (o.lines || []).map(para).join('');
    const textW = w - 24 - (hasImg ? 150 : 0);
    const lineCount = Math.ceil((o.lines || []).join(' ').length * 6.3 / textW) + (o.lines || []).length + 1;
    const h = Math.max(hasImg ? 270 : 140, Math.min(430, 30 + lineCount * 17 + 50 + (o.extra ? o.extra.h : 0)));
    const x = Math.round((640 - w) / 2), y = Math.round((480 - h) / 2);
    const { bd } = win(ov, o.title || 'Gazillionaire', x, y, w, h);
    if (hasImg) {
      const ib = mk(bd, 'div', 'panel', null, { position: 'absolute', left: '0', top: '0', width: '140px', height: Math.min(h - 70, 250) + 'px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' });
      mk(ib, 'img', null, null).src = $img(o.img);
      ib.firstChild.onerror = function () { this.style.display = 'none'; };
      ib.firstChild.style.cssText = 'max-width:132px;max-height:' + (Math.min(h - 70, 250) - 6) + 'px';
    }
    const t = mk(bd, 'div', 'panel pt', lines, { position: 'absolute', left: hasImg ? '148px' : '0', right: '0', top: '0', bottom: '38px' });
    if (o.extra) o.extra.build(t);
    const bb = mk(bd, 'div', 'dlgbtns');
    (o.buttons || [{ t: 'Close', v: true }]).forEach(b => {
      const e = btn(bb, b.t, () => { ov.remove(); res(b.v); }, null, 's' + (b.dis ? ' dis' : ''));
    });
    if (o.snd) sfx(o.snd);
  });
}
const alertBox = (text, title) => dlg({ title: title || 'Gazillionaire', lines: [text], w: 420 });
const confirmBox = (text, title, yes, no) => dlg({ title: title || 'Gazillionaire', lines: [text], w: 440, buttons: [{ t: yes || 'Yes', v: true }, { t: no || 'No', v: false }] });

function askNumber(title, text, max, def, okLabel) {
  return new Promise(res => {
    const ov = overlay();
    const { bd } = win(ov, title, 150, 150, 340, 190);
    mk(bd, 'div', null, text, { position: 'absolute', left: '4px', right: '4px', top: '2px', fontSize: '12px', lineHeight: '1.35' });
    const inp = mk(bd, 'input', null, null, { position: 'absolute', left: '8px', top: '90px', width: '200px' });
    inp.type = 'text'; inp.inputMode = 'numeric'; inp.value = def != null ? Math.floor(def) : '';
    btn(bd, 'Max', () => { inp.value = Math.floor(max); }, { left: '216px', top: '88px', width: '50px', height: '26px' });
    const done = v => { ov.remove(); res(v); };
    const ok = () => { const v = Math.floor(Number(String(inp.value).replace(/[, ]/g, ''))); if (isNaN(v) || v < 0) { inp.value = ''; return; } done(Math.min(v, Math.floor(max))); };
    btn(bd, okLabel || 'OK', ok, { left: '60px', top: '124px', width: '90px', height: '26px' });
    btn(bd, 'Cancel', () => done(null), { left: '170px', top: '124px', width: '90px', height: '26px' });
    inp.onkeydown = e => { if (e.key === 'Enter') ok(); else if (e.key === 'Escape') done(null); };
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  });
}

// ---------- title / new game ----------
async function titleScreen() {
  clearStage('title');
  const hint = mk(stage, 'div', 'stat', '(click to continue)', { right: '6px', bottom: '6px', fontSize: '11px' });
  stage.onclick = () => { stage.onclick = null; sfx('lavamind'); startMenu(); };
}

function startMenu() {
  clearStage('title');
  const { wn, bd } = win(stage, 'Gazillionaire Deluxe', 200, 260, 240, 210);
  btn(bd, 'New Game', newGameScreen, { left: '20px', top: '10px', width: '190px', height: '30px' });
  const any = [1, 2, 3, 4, 5].some(i => slotInfo(i));
  btn(bd, 'Load Game', () => loadScreen(() => startMenu()), { left: '20px', top: '48px', width: '190px', height: '30px' }, any ? '' : 'dis');
  btn(bd, 'How to Play', howTo, { left: '20px', top: '86px', width: '190px', height: '30px' });
  btn(bd, 'About LavaMind', about, { left: '20px', top: '124px', width: '190px', height: '30px' });
}

async function howTo() {
  await dlg({ img: null, title: 'How to Play', w: 560, lines: [
    'Your goal is to build a successful business trading commodities between the 7 planets of Kukubia, and be the first company whose NET WORTH (cash + savings + stock, minus loans) reaches the target.',
    '1) Go to the MARKETPLACE and buy the commodities which are at a low price.',
    '2) Once your ship is filled with cargo, go to JOURNEY and click on the planet you wish to travel to.',
    '3) On the new planet, go to MARKETPLACE. If the MARKET PRICE is higher than the PRICE YOU PAID, sell for a profit.',
    'Pay your crew, buy fuel and insurance, set your passenger ticket price, and try the PLANET SPECIAL on every planet. Buy bigger ships, faster engines, and watch the news and weather for trouble. Six computer companies are competing against you.'] });
}
async function about() {
  await dlg({ img: 'lavamind', title: 'About', w: 560, lines: [
    'Gazillionaire Deluxe was produced, designed and programmed by Naomi Kokubo and Steven Hoffman of LavaMind (c) 1994-1997.',
    'This is a fan-made web port rebuilt from the original game\'s art, sound and text. Prices are re-created, and the computer rivals are new designs (six personalities whose intelligence changes how they play), so numbers and behaviour will differ from the 1996 game.'] });
}

function newGameScreen() {
  clearStage('stars3');
  const { bd } = win(stage, 'New Game', 90, 60, 460, 360);
  mk(bd, 'div', null, 'Your company name:', { position: 'absolute', left: '10px', top: '12px', fontWeight: 'bold' });
  const nm = mk(bd, 'input', null, null, { position: 'absolute', left: '10px', top: '32px', width: '300px' });
  nm.type = 'text'; nm.value = 'Player 1 Inc.'; nm.maxLength = 28;
  mk(bd, 'div', null, 'Game level (net worth needed to win):', { position: 'absolute', left: '10px', top: '70px', fontWeight: 'bold' });
  let lvl = 1;
  const lb = LEVELS.map((l, i) => btn(bd, l.name + '<br>' + fmt(l.goal), () => { lvl = i; lb.forEach((b, j) => b.style.outline = j === i ? '2px solid #000080' : 'none'); }, { left: (10 + i * 108) + 'px', top: '92px', width: '102px', height: '40px' }));
  lb[lvl].style.outline = '2px solid #000080';
  mk(bd, 'div', null, 'Computer opponents (click to cycle intelligence 1-5; hover for profile):', { position: 'absolute', left: '10px', top: '146px', fontWeight: 'bold' });
  const ai = AI_DEFS.map(() => 3);
  AI_DEFS.forEach((a, i) => {
    const b = btn(bd, a.name + ' &mdash; IQ ' + ai[i], () => { ai[i] = ai[i] % 5 + 1; b.innerHTML = a.name + ' &mdash; IQ ' + ai[i]; }, { left: (10 + (i % 2) * 218) + 'px', top: (170 + Math.floor(i / 2) * 32) + 'px', width: '210px', height: '26px' });
    b.title = a.bio;
  });
  btn(bd, 'Start Game', async () => {
    const name = nm.value.trim() || 'Player 1 Inc.';
    newGame({ name, level: lvl, ai });
    await introScreens();
    mainMenu();
  }, { left: '120px', top: '290px', width: '110px', height: '30px' });
  btn(bd, 'Back', startMenu, { left: '240px', top: '290px', width: '90px', height: '30px' });
}

async function introScreens() {
  clearStage('planets');
  const h = human();
  await dlg({ img: 'dred', title: 'Emperor Dred Nicolson', w: 560, snd: 'dred', lines: [
    'For the first time in 700 years, Emperor Dred Nicolson has granted you and a handful of other newly formed trading companies permission to operate inside the Kukubian Colonies.',
    'As president of ' + h.name + ', you must make a profit transporting essential commodities between the seven planets of Kukubia.',
    'Your goal is to build a trade empire by investing in larger ships, buying warehouses and skillfully out-maneuvering your competitors. You win by reaching a NET WORTH of ' + money(G.goal) + '.',
    'Don\'t worry. LavaMind loves you.'] });
  await dlg({ title: 'Quick start', w: 520, lines: [
    '1) Your goal is to build a successful business trading commodities between the 7 planets of Kukubia.',
    '2) To begin with, you must go to the MARKETPLACE and buy the commodities which are at a low price.',
    '3) Once your ship is filled with cargo, you are ready to leave. Go to JOURNEY and click on the planet you wish to travel to.',
    '4) When you arrive on the new planet, go to MARKETPLACE. If the MARKET PRICE is higher than the PRICE YOU PAID, you can sell your goods for a profit.'] });
}

// ---------- main menu ----------
let starBg = 'stars1';
function mainMenu() {
  const c = human(), p = planetOf(c), d = planetDef(p);
  clearStage(starBg);
  const hd = mk(stage, 'div', 'hdr');
  hd.innerHTML = '<span>' + c.name + '</span><span>Week <b>' + G.week + '</b></span><span>Cash <b>' + fmt(c.cash) + '</b></span><span>Net worth <b>' + fmt(netWorth(c)) + '</b> / ' + fmtShort(G.goal) + '</span>';
  // ship picture
  const ship = mk(stage, 'img', 'abs', null, { left: '14px', top: '40px', width: '250px', height: '156px', border: '2px solid #444', background: '#000' });
  ship.src = $img('ship' + (c.shipIdx + 1));
  mk(stage, 'div', 'stat', SHIPS[c.shipIdx][0] + ' (' + sz(c) + ' tons)', { left: '16px', top: '198px', fontSize: '11px' });
  // stats
  const bar = (lbl, v, m, y) => {
    mk(stage, 'div', 'stat', lbl + ' ' + Math.floor(v) + ' / ' + m, { left: '285px', top: y + 'px', fontSize: '12px' });
    const b = mk(stage, 'div', 'bar abs', '<i style="width:' + clamp(v / m * 100, 0, 100) + '%"></i>', { left: '455px', top: (y + 3) + 'px', width: '170px' });
    if (lbl === 'Fuel' && v < maxFuelUse(c)) b.firstChild.style.background = '#c00';
  };
  mk(stage, 'div', 'stat', 'You are on <span style="color:#ff0;font-size:16px">' + p.id + '</span>', { left: '285px', top: '38px', fontSize: '13px' });
  bar('Cargo', cargoTons(c), cargoMax(c), 62);
  bar('Fuel', c.fuel, tankMax(c), 84);
  mk(stage, 'div', 'stat', 'Crew owed: <span style="color:' + (c.owed > 0 ? '#f66' : '#8f8') + '">' + fmt(c.owed) + '</span>', { left: '285px', top: '106px', fontSize: '12px' });
  mk(stage, 'div', 'stat', 'Engine: ' + c.engine + ' kuarp &nbsp; Passengers: ' + passMax(c), { left: '285px', top: '128px', fontSize: '12px' });
  mk(stage, 'div', 'stat', 'Loans: ' + fmt(c.tu + c.zn) + ' &nbsp; Savings: ' + fmt(c.save), { left: '285px', top: '150px', fontSize: '12px' });
  mk(stage, 'div', 'stat', (c.insured ? '<span style="color:#8f8">Insured for next trip</span>' : '<span style="color:#fc6">Not insured</span>') + (c.luck > 1 ? ' &nbsp; <span style="color:#8f8">Blessed</span>' : c.luck < -1 ? ' &nbsp; <span style="color:#f88">Cursed</span>' : ''), { left: '285px', top: '172px', fontSize: '12px' });
  // info panel
  mk(stage, 'div', 'abs', '<b style="color:#ff0">' + p.id + '</b> &mdash; ' + d.blurb + (specialDone(c) ? '' : ' <span style="color:#8f8">Planet special available!</span>'), { left: '14px', top: '400px', width: '612px', height: '70px', background: 'rgba(0,0,0,.65)', color: '#fff', padding: '6px', fontSize: '12px', lineHeight: '1.4', border: '1px solid #666' });
  const items = [
    ['Marketplace', marketScreen], ['Journey', journeyScreen], ['Planet Special', specialScreen], ['Explore Planet', exploreScreen],
    ['Bank (Savings & Loan)', () => accountScreen('bank')], ['Mr. Zinn\'s Loan', () => accountScreen('zinn')], ['Voyager\'s Insurance', insureScreen], ['Crew', crewScreen],
    ['Fuel', fuelScreen], ['Advertising', adScreen], ['Passengers', passScreen], ['Warehouse', warehouseScreen],
    ['Stock Market', stockScreen], ['Ship Info', shipScreen], ['Graphs', graphScreen], ['Opponents', oppScreen],
    ['Facilities', facScreen], ['File Options', fileScreen]
  ];
  items.forEach((it, i) => {
    const T = document.body.classList.contains('touch');
    const b = btn(stage, it[0], async () => { await it[1](); }, { left: (14 + (i % 4) * 155) + 'px', top: (212 + Math.floor(i / 4) * (T ? 37 : 31)) + 'px', width: '150px', height: T ? '34px' : '27px' });
    if (it[0] === 'Planet Special' && !specialDone(c)) b.style.color = '#006000';
  });
}
const fmtShort = n => n >= 1e9 ? (n / 1e9) + ' billion' : n >= 1e6 ? (n / 1e6) + ' million' : fmt(n);

function sub(title, w, h) {
  const ov = overlay();
  const { bd } = win(ov, title, Math.round((640 - w) / 2), Math.round((480 - h) / 2), w, h);
  const close = () => { ov.remove(); mainMenu(); };
  return { ov, bd, close, w, h };
}
const closeBtn = (s, label) => btn(s.bd, label || 'Close', s.close, { left: (s.w - 12 - 100) / 2 + 'px', bottom: '4px', width: '100px', height: '26px' });
function helpBtn(s, title, text) { return btn(s.bd, 'Help', () => dlg({ title: 'Help (' + title + ')', w: 480, lines: [text], snd: 'help' }), { right: '4px', bottom: '4px', width: '60px', height: '26px' }); }

// ---------- marketplace ----------
function marketScreen() {
  const c = human(), p = planetOf(c);
  const s = sub('Marketplace on ' + p.id, 620, 450);
  let sel = null, showAll = true;
  const info = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '0', top: '0', right: '0', height: '38px', padding: '3px 6px' });
  const tb = mk(s.bd, 'div', 'panel', null, { position: 'absolute', left: '0', top: '42px', right: '0', height: '286px', overflow: 'auto' });
  const act = mk(s.bd, 'div', null, null, { position: 'absolute', left: '0', top: '334px', right: '0', height: '64px' });
  const qty = mk(act, 'input', null, null, { position: 'absolute', left: '4px', top: '4px', width: '90px' });
  qty.type = 'text'; qty.inputMode = 'numeric'; qty.value = '';
  const msg = mk(act, 'div', null, '', { position: 'absolute', left: '4px', top: '34px', right: '4px', height: '30px', fontSize: '12px' });
  function render() {
    info.innerHTML = 'Cash: <b>' + fmt(c.cash) + '</b> &nbsp; Cargo bay: <b>' + cargoTons(c) + '</b> / ' + cargoMax(c) + ' tons (' + Math.round(cargoTons(c) / cargoMax(c) * 100) + '% filled)';
    let h = '<table class="t"><tr><th>Commodity</th><th class="n">Tons on Ship</th><th class="n">Price You Paid</th><th class="n">Market Price</th><th class="n">Price Range</th><th class="n">Tons on Planet</th></tr>';
    for (let g = 0; g < NG; g++) {
      if (!showAll && !c.cargo[g]) continue;
      const q = quote(p, g), base = GOODS[g][1];
      const lo = Math.round(base * 0.85 * 0.45), hi = Math.round(base * 1.15 * 1.6);
      const col = c.cargo[g] ? (q >= c.paid[g] ? '#060' : '#a00') : '';
      h += '<tr data-g="' + g + '" class="' + (sel === g ? 'sel' : '') + '"><td>' + GOODS[g][0] + '</td><td class="n">' + (c.cargo[g] || '') + '</td><td class="n">' + (c.cargo[g] ? fmt(c.paid[g]) : '') + '</td><td class="n" style="color:' + (sel === g ? '#fff' : col) + '">' + fmt(q) + '</td><td class="n">' + fmt(lo) + ' - ' + fmt(hi) + '</td><td class="n">' + fmt(availTons(p, g, c)) + '</td></tr>';
    }
    tb.innerHTML = h + '</table>';
    tb.querySelectorAll('tr[data-g]').forEach(r => r.onclick = () => { sel = Number(r.dataset.g); sfx(GOODS[sel][2]); render(); });
  }
  const need = () => { if (sel == null) { msg.innerHTML = '<span class="bad">Click on a commodity first.</span>'; return null; } const n = Math.floor(Number(String(qty.value).replace(/,/g, ''))); return n > 0 ? n : (msg.innerHTML = '<span class="bad">Enter a number of tons.</span>', null); };
  const doBuy = (n) => {
    const r = buyGoods(c, p, sel, n);
    if (!r.ok) { msg.innerHTML = '<span class="bad">' + (r.msg === 'cash' ? 'You do not have enough cash.' : cargoTons(c) >= cargoMax(c) ? 'There is no room left on your ship.' : 'There are none to buy.') + '</span>'; sfx('bad'); return; }
    msg.innerHTML = 'You bought <b>' + r.n + '</b> tons of ' + GOODS[sel][0] + ' for ' + money(r.cost) + ' (' + fmt(r.cost / r.n) + '/ton).'; sfx('stock'); render();
  };
  const doSell = (n) => {
    if (!c.cargo[sel]) { msg.innerHTML = '<span class="bad">There are zero tons of ' + GOODS[sel][0] + ' on your ship.</span>'; return; }
    const r = sellGoods(c, p, sel, n);
    msg.innerHTML = 'You just made <b class="' + (r.profit >= 0 ? 'good' : 'bad') + '">' + fmt(r.profit) + '</b> kubars profit selling ' + r.n + ' ton' + (r.n > 1 ? 's' : '') + ' of ' + GOODS[sel][0] + '.'; sfx(r.profit >= 0 ? 'gooddeal' : 'baddeal'); render();
  };
  btn(act, 'Buy', () => { const n = need(); if (n) doBuy(n); }, { left: '100px', top: '2px', width: '60px', height: '26px' });
  btn(act, 'Buy Max', () => { if (sel == null) return need(); const n = Math.min(cargoMax(c) - cargoTons(c), availTons(p, sel, c)); doBuy(n); }, { left: '166px', top: '2px', width: '70px', height: '26px' });
  btn(act, 'Sell', () => { const n = need(); if (n) doSell(n); }, { left: '250px', top: '2px', width: '60px', height: '26px' });
  btn(act, 'Sell All', () => { if (sel == null) return need(); doSell(c.cargo[sel]); }, { left: '316px', top: '2px', width: '70px', height: '26px' });
  btn(act, 'Sell Everything', () => { let tot = 0; for (let g = 0; g < NG; g++) if (c.cargo[g]) { tot += sellGoods(c, p, g, c.cargo[g]).profit; } msg.innerHTML = 'Total profit: <b class="' + (tot >= 0 ? 'good' : 'bad') + '">' + fmt(tot) + '</b> kubars.'; sfx('stock2'); render(); }, { left: '392px', top: '2px', width: '110px', height: '26px' });
  btn(act, 'Show Cargo', b => { showAll = !showAll; b.innerHTML = showAll ? 'Show Cargo' : 'Show All'; render(); }, { left: '508px', top: '2px', width: '94px', height: '26px' });
  closeBtn(s); helpBtn(s, 'Marketplace', 'As a space merchant, your goal is to buy commodities for a low price on one planet, then travel to another planet and sell them for a substantially higher price. The MARKET PRICE is the price that the commodities are selling for on this planet. The PRICE RANGE shows the lowest and highest possible prices on other planets. Buying pushes prices up and selling pushes prices down, so big trades get a worse average price.');
  render();
}

// ---------- journey ----------
async function journeyScreen() {
  const c = human(), here = planetOf(c);
  const ov = overlay();
  ov.style.background = 'none';
  ov.style.backgroundImage = 'url(' + $img('planets') + ')';
  const lbl = mk(ov, 'div', 'hdr', 'Click on the planet you wish to travel to. Fuel: ' + Math.floor(c.fuel) + ' tons &nbsp; Engine: ' + c.engine + ' kuarp');
  const info = mk(ov, 'div', 'abs', '', { left: '10px', bottom: '8px', width: '460px', height: '44px', background: 'rgba(0,0,0,.75)', color: '#fff', padding: '4px 8px', fontSize: '12px' });
  info.innerHTML = 'You are on <b style="color:#ff0">' + here.id + '</b>.';
  G.planets.forEach(p => {
    const cur = p.i === c.loc;
    const dot = mk(ov, 'div', 'abs', '<div style="position:absolute;left:-30px;top:30px;width:90px;text-align:center;color:' + (cur ? '#ff0' : '#fff') + ';font-weight:bold;text-shadow:1px 1px 0 #000;font-size:12px">' + p.id + (cur ? '<br>(here)' : '') + '</div>', { left: (p.x - 32) + 'px', top: (p.y - 32) + 'px', width: '64px', height: '64px', cursor: cur ? 'default' : 'pointer', borderRadius: '50%', border: cur ? '2px dashed #ff0' : '2px solid transparent' });
    if (!cur) {
      dot.onmouseenter = () => { dot.style.borderColor = '#0ff'; const d = dist(here, p), need = fuelUse(c, here, p); info.innerHTML = 'Travel to <b style="color:#ff0">' + p.id + '</b>: distance ' + d + ', about ' + hours(c, here, p).toFixed(1) + ' hours at ' + c.engine + ' kuarps, fuel needed ' + need + ' tons.'; };
      dot.onmouseleave = () => { dot.style.borderColor = 'transparent'; };
      dot.onclick = async () => {
        const d = dist(here, p), need = fuelUse(c, here, p);
        const items = [];
        const ok = await dlg({ title: 'Journey', w: 440, lines: ['Travel to <b>' + p.id + '</b>?', 'Distance: ' + d + ' &nbsp; Travel time: about ' + hours(c, here, p).toFixed(1) + ' hours<br>Fuel needed: ' + need + ' tons (you have ' + Math.floor(c.fuel) + ')<br>Crew owed: ' + fmt(c.owed) + '<br>Insurance: ' + (c.insured ? 'yes' : '<b>no</b>') + '<br>Cargo: ' + cargoTons(c) + ' / ' + cargoMax(c) + ' tons', c.owed > 0 ? '<span class="bad">Warning: your unpaid crew may go on strike!</span>' : ''], buttons: [{ t: 'Blast Off!', v: true }, { t: 'Stay', v: false }] });
        if (!ok) return;
        ov.remove();
        await doTravel(p.i);
      };
    }
  });
  btn(ov, 'Return to Main Menu', () => { ov.remove(); }, { right: '10px', bottom: '8px', width: '150px', height: '26px' });
}

async function doTravel(dest) {
  const out = travel(dest);
  if (out.blocked) { await alertBox(out.blocked); return; }
  starBg = pick(STARS);
  await showEvents(out.events);
  if (G.over) { await gameOver(); return; }
  if (human().bankrupt) { await gameOver(); return; }
  autosave();
  mainMenu();
}

async function showEvents(evs) {
  for (const e of evs) await showEvent(e);
}

async function showEvent(e) {
  const c = human();
  switch (e.kind) {
    case 'depart': return animateTrip(e);
    case 'msg':
    case 'hazard': {
      const ins = e.insuredLines || [];
      await dlg({ img: e.img, title: e.title, lines: e.lines.concat(ins), snd: e.snd || (e.bad ? 'bad' : 'good') });
      return;
    }
    case 'choice': {
      const poor = e.needCash && c.cash < e.needCash;
      const r = await dlg({ img: e.img, title: e.title, lines: e.lines.concat(poor ? ['<span class="bad">You do not have enough cash to accept.</span>'] : []), snd: e.snd, buttons: [{ t: 'Yes', v: true, dis: poor }, { t: 'No', v: false }] });
      if (r && e.yes) { const more = e.yes(); if (more) await showEvents(more); }
      return;
    }
    case 'report': mainMenu(); return arrivalReport(e);
    case 'gamble': return gambleDlg(e);
    case 'queg': return quegDlg(e);
    case 'broker': return brokerDlg(e);
    case 'zobrok': return zobrokDlg(e);
    case 'auction': return auctionDlg(e);
  }
}

function animateTrip(e) {
  return new Promise(res => {
    const c = human();
    const ov = overlay(); ov.style.background = '#000 url(' + $img('planets') + ') no-repeat'; ov.style.zIndex = 30;
    const a = e.from, b = e.to;
    const ship = mk(ov, 'img', 'abs', null, { width: '70px', height: '44px', mixBlendMode: 'screen', left: a.x + 'px', top: a.y + 'px' });
    ship.src = $img('ship' + (c.shipIdx + 1));
    const label = mk(ov, 'div', 'hdr', 'Travelling from ' + a.id + ' to ' + b.id + '... (' + e.hours + ' hours)');
    G.planets.forEach(p => mk(ov, 'div', 'abs', p.id, { left: (p.x - 30) + 'px', top: (p.y + 30) + 'px', width: '60px', textAlign: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold', textShadow: '1px 1px 0 #000' }));
    sfx('rocket' + RI(1, 6));
    const t0 = performance.now(), dur = 1800;
    let done = false;
    const finish = () => { if (done) return; done = true; ov.remove(); res(); };
    const step = t => {
      if (done) return;
      const k = Math.min(1, (t - t0) / dur), ease = k * k * (3 - 2 * k);
      ship.style.left = (a.x + (b.x - a.x) * ease - 35) + 'px'; ship.style.top = (a.y + (b.y - a.y) * ease - 22) + 'px';
      if (k < 1) requestAnimationFrame(step); else setTimeout(finish, 250);
    };
    requestAnimationFrame(step);
    ov.onclick = finish;
  });
}

async function arrivalReport(r) {
  const c = human(), p = G.planets[r.to];
  const L = [];
  L.push('Welcome to <b>' + p.id + '</b>!');
  if (r.pass) L.push('Passengers: ' + r.pass.wait + ' were waiting; <b>' + r.pass.n + '</b> bought tickets at ' + fmt(c.ticket) + ' kubars. Income ' + fmt(r.pass.gross) + (r.pass.tax ? ', passenger tax ' + fmt(r.pass.tax) : '') + '.');
  const costs = [];
  if (r.exp) costs.push('export tariff ' + fmt(r.exp));
  if (r.imp) costs.push('import tariff ' + fmt(r.imp));
  if (r.fee) costs.push('facility fees ' + fmt(r.fee));
  if (costs.length) L.push('Costs: ' + costs.join(', ') + '.');
  const wc = r.wc;
  if (wc && (wc.tuInt || wc.znInt || wc.saveInt)) L.push('Interest: ' + (wc.tuInt ? 'Trader\'s Union loan +' + fmt(wc.tuInt) + ' ' : '') + (wc.znInt ? 'Zinn loan +' + fmt(wc.znInt) + ' ' : '') + (wc.saveInt ? 'savings +' + fmt(wc.saveInt) : ''));
  if (r.owed) L.push('<span class="bad">You owe your crew ' + fmt(r.owed) + ' kubars.</span>');
  if (r.loan) L.push('<span class="bad">You ran out of money, so the Trader\'s Union loaned you ' + fmt(r.loan) + ' kubars. Don\'t forget to pay them back!</span>');
  const tw = G.facilities.filter(f => f.planet === p.i && f.owner === 0);
  await dlg({ img: null, title: 'Arrival', w: 500, lines: L, snd: 'ping4' });
}

async function gambleDlg(e) {
  const c = human();
  const ov = overlay();
  await new Promise(async res => {
    const bet = e.max;
    if (bet < 1) { ov.remove(); await dlg({ img: 'dealer1', title: 'Casino Dealer', lines: ['You do not have enough cash to gamble. Under Imperial Law you may gamble up to 5% of your cash, and that comes to less than 1 kubar.'] }); return res(); }
    ov.remove();
    const amt = await askNumber('The Casino', 'ALL OR NOTHING: win and you double your bet; lose and the fun is over. Imperial law limits you to 5% of your cash: <b>' + fmt(e.max) + '</b> kubars. How much do you bet?', e.max, e.max, 'Bet!');
    if (amt) {
      if (Math.random() < 0.47 + c.luck * 0.02) { c.cash += amt; await dlg({ img: 'dealer3', title: 'Casino Dealer', lines: ['You WIN! You doubled your bet and take home an extra ' + money(amt) + '.'], snd: 'good4' }); }
      else { c.cash -= amt; await dlg({ img: 'dealer2', title: 'Casino Dealer', lines: ['Sorry, you lose. The house wins ' + money(amt) + '.'], snd: 'bad4' }); }
    }
    res();
  });
}

async function quegDlg(e) {
  const c = human(), g = e.g;
  const free = cargoMax(c) - cargoTons(c);
  const total = e.n * e.price;
  if (e.n > free) { await dlg({ img: 'cornu2', title: 'Lady Cornucopia', lines: ['You cannot purchase ' + e.n + ' tons of cargo because your ship only has room for ' + free + ' tons. Before you purchase any goods from Lady Cornucopia, you must first make room by unloading some of the cargo from your ship. Lady Cornucopia insists upon selling all or nothing.'], snd: 'neutral' }); c.specialWeek = -1; return; }
  const r = await dlg({ img: 'cornu1', title: 'Lady Cornucopia', snd: 'cornu', lines: ['Queg is the infamous renegade planet. This week Lady Cornucopia offers to sell you <b>' + e.n + ' tons of ' + GOODS[g][0] + '</b> for only <b>' + fmt(e.price) + '</b> kubars per ton (total ' + fmt(total) + '). The current market price of ' + GOODS[g][0] + ' on ' + planetOf(c).id + ' is ' + fmt(e.mp) + ' kubars per ton.'], buttons: [{ t: 'Buy it', v: true, dis: total > c.cash }, { t: 'No thanks', v: false }] });
  if (r) {
    c.cash -= total;
    const tot = c.cargo[g] * c.paid[g] + total; c.cargo[g] += e.n; c.paid[g] = tot / c.cargo[g];
    await dlg({ img: 'cornu1', title: 'Lady Cornucopia', lines: ['You just purchased ' + e.n + ' tons of ' + GOODS[g][0] + ' at ' + fmt(e.price) + ' kubars/ton. You spent a total of ' + money(total) + '. Have fun with the ' + GOODS[g][0] + '!'] });
  } else c.specialWeek = -1;
}

async function brokerDlg(e) {
  const hints = G.planets.slice().sort((a, b) => b.stock.trend - a.stock.trend);
  const lab = t => t > 0.08 ? 'very strong buy' : t > 0.03 ? 'strong buy' : t > -0.03 ? 'hold' : t > -0.08 ? 'strong sell' : 'very strong sell';
  await dlg({ img: 'broker1', title: 'Your Stock Broker', w: 520, snd: 'stock2', lines: ['Your stock broker gives you the following recommendations:'].concat(hints.map(p => '<b>' + p.id + '</b> Exchange = ' + lab(p.stock.trend + R(-0.02, 0.02)))) });
}

async function zobrokDlg(e) {
  const c = human(), p = planetOf(c);
  const space = Math.floor(tankMax(c) - c.fuel);
  const r = await dlg({ img: 'zobrok1', title: 'Zobrok the Fuel Wholesaler', snd: 'neutral', lines: ['Welcome to Nosh, the fuel depot of Kukubia. You hear that Zobrok, a big time wholesaler, is selling fuel at ' + e.off + '% off the retail price.', 'In other words, Zobrok is selling fuel at <b>' + e.price + '</b> kubars/ton, while most other distributors are selling it at ' + e.retail + ' kubars/ton.'], buttons: [{ t: 'Fill my tank', v: true, dis: space <= 0 }, { t: 'No thanks', v: false }] });
  if (r) {
    const n = Math.min(space, Math.floor(Math.max(0, c.cash) / e.price));
    c.cash -= n * e.price; c.fuel += n;
    await dlg({ img: 'zobrok1', title: 'Zobrok', snd: 'fuel', lines: ['Zobrok fills up your tank with ' + n + ' tons, saving you a total of ' + money(n * (e.retail - e.price)) + '.'] });
  } else c.specialWeek = -1;
}

async function auctionDlg(a) {
  const p = G.planets[a.planet];
  const c = human();
  const top = a.top ? 'The highest bid so far is ' + money(a.top.bid) + ' (' + a.top.c.name + ').' : 'No one else has bid yet.';
  const r = await dlg({ img: 'dred', title: 'Facility Auction', w: 540, snd: 'auction', lines: ['In an attempt to promote free trade in the Kukubian Colonies, Supreme Commander Dred Nicolson is auctioning off the <b>' + a.type + '</b> on <b>' + p.id + '</b>. The owner earns a FEE of ' + fmt(a.fee) + ' kubars from every other company that arrives on ' + p.id + ' and collects the revenue when visiting.', 'Opening price: ' + money(a.base) + '. ' + top, 'Do you want to place a bid?'], buttons: [{ t: 'Bid', v: true, dis: c.cash < a.base * 0.5 }, { t: 'Pass', v: false }] });
  let bid = 0;
  if (r) { const v = await askNumber('Place your bid', 'You have ' + money(c.cash) + '. How many kubars do you bid?', c.cash, a.top ? a.top.bid + 1000 : a.base, 'Bid'); bid = v || 0; }
  const res = finishAuction(a, bid);
  if (res) await dlg({ img: res.winner.human ? 'dred' : null, title: 'Auction Results', lines: [res.winner.human ? 'You won the auction! You paid ' + money(res.price) + ' for the ' + a.type + ' on ' + p.id + '.' : res.winner.name + ' wins the ' + a.type + ' on ' + p.id + ' with a bid of ' + money(res.price) + '.'], snd: res.winner.human ? 'good3' : 'neutral' });
}

// ---------- planet special ----------
async function specialScreen() {
  const c = human(), p = planetOf(c), d = planetDef(p);
  if (specialDone(c)) { await alertBox('You have already completed your PLANET SPECIAL for this turn. Try again next turn.', 'Planet Special'); return; }
  const r = await dlg({ img: d.img, title: d.who, w: 540, lines: [d.desc].concat(d.sp === 'sooth' || d.sp === 'agent' || d.sp === 'engine' ? [] : []), buttons: [{ t: d.btn, v: true }, { t: 'Return to Main Menu', v: false }], });
  if (!r) return;
  useSpecial(c);
  const evs = runSpecial(c, d.sp);
  await showEvents(evs);
  mainMenu();
}

// ---------- explore ----------
const SCENES = ['garden_', 'lavaflo_', 'mine3_', 'seacows_', 'stadium_', 'tornado_', 'theater_', 'hive_', 'mud_', 'magma_', 'flood_', 'furnace_', 'landsli_', 'dock_'];
function exploreScreen() {
  const c = human(), p = planetOf(c);
  const s = sub('Explore ' + p.id, 560, 400);
  const tabs = ['News Center', 'Weather Bureau', 'History of ' + p.id, 'Ministry of Time'];
  const body = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '0', top: '32px', right: '0', bottom: '36px' });
  let cur = 0;
  function render() {
    let h = '';
    if (cur === 0) { h = '<b>Headline News</b><br><br>' + G.news.map(n => para(n.text)).join(''); sfx('news'); }
    if (cur === 1) { h = '<b>Weather Bureau</b><br><br>' + (G.weather.length ? G.weather.map(n => para(n.text)).join('') : para('The Weather Bureau reports clear skies throughout the Kukubian system this week.')); }
    if (cur === 2) { h = '<b>History of ' + p.id + '</b><br><br>' + (HISTORY[p.id] || []).map(para).join(''); }
    if (cur === 3) { h = '<b>Ministry of Time</b><br><br>' + para(TIME_TEXT.a) + para(TIME_TEXT.b) + para(TIME_TEXT.c) + para('According to our records the date is ' + (24 + Math.floor(G.week / 12)) + ' A.B., and your trading company has been in business ' + G.week + ' kuku weeks. ' + TIME_TEXT.d); }
    body.innerHTML = h; body.scrollTop = 0;
    if (cur === 0 || cur === 2) { const sc = SCENES[(p.i * 3 + cur) % SCENES.length]; const v = vidEl(null, sc, { float: 'right', width: '200px', margin: '0 0 6px 8px', border: '2px solid #444' }); body.insertBefore(v, body.firstChild); }
    tbs.forEach((b, i) => b.style.outline = i === cur ? '2px solid #000080' : 'none');
  }
  const tbs = tabs.map((t, i) => btn(s.bd, t, () => { cur = i; render(); }, { left: (i * 134) + 'px', top: '0', width: '130px', height: '26px' }));
  closeBtn(s); render();
}

// ---------- accounts ----------
function accountScreen(kind) {
  const c = human();
  const zinn = kind === 'zinn';
  const s = sub(zinn ? 'Mr. Zinn\'s Loan' : 'Trader\'s Union Bank', 560, zinn ? 300 : 400);
  if (zinn) mk(s.bd, 'img', null, null, { position: 'absolute', left: '0', top: '0', width: '110px', height: '176px', objectFit: 'contain', background: '#fff' }).src = $img('zinn'); else vidEl(s.bd, 'account_', { position: 'absolute', left: '0', top: '0', width: '110px', height: '176px', objectFit: 'cover', background: '#000' });
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '118px', top: '0', right: '0', height: zinn ? '170px' : '270px' });
  const act = mk(s.bd, 'div', null, null, { position: 'absolute', left: '0', top: zinn ? '180px' : '280px', right: '0', height: '60px' });
  function render() {
    if (zinn) {
      t.innerHTML = para('Mr. Zinn is a wealthy and somewhat fickle financier. He is willing to loan you money at <b>' + (c.znRate * 100).toFixed(1) + '%</b> interest per week.') + para('You owe Mr. Zinn: <b>' + money(c.zn) + '</b><br>Credit limit: <b>' + money(c.znLimit) + '</b><br>Cash: <b>' + money(c.cash) + '</b>') + para('If you ever allow this loan to exceed the CREDIT LIMIT, Mr. Zinn will repossess your ship, which will force you into BANKRUPTCY and cause you to lose the game.');
    } else {
      t.innerHTML = para('Cash: <b>' + money(c.cash) + '</b>') + para('<b>Savings account</b>: ' + money(c.save) + ' at ' + (c.tuSave * 100).toFixed(1) + '% interest per week.') + para('<b>Trader\'s Union loan</b>: ' + money(c.tu) + ' at ' + (c.tuRate * 100).toFixed(1) + '% interest per week.<br>Credit limit: ' + money(c.tuLimit) + '. Available: ' + money(Math.max(0, c.tuLimit - c.tu))) + para('Interest is added every time you travel to a new planet. Under no circumstances allow your loan to exceed your CREDIT LIMIT, or the Trader\'s Union will force you into BANKRUPTCY and you will lose the game.') + para('Net worth: <b>' + money(netWorth(c)) + '</b>');
    }
  }
  const field = (lbl, fn, x, y, w) => btn(act, lbl, async () => { await fn(); render(); }, { left: x + 'px', top: y + 'px', width: w + 'px', height: '26px' });
  const getter = zinn ? () => c.zn : () => c.tu;
  const setter = zinn ? (v) => { c.zn = v; } : (v) => { c.tu = v; };
  const lim = zinn ? () => c.znLimit : () => c.tuLimit;
  field('Borrow', async () => { const max = Math.max(0, lim() - getter()); if (max <= 0) return alertBox('The ' + (zinn ? 'lender' : 'Trader\'s Union') + ' refuses to loan you any more money. Check your credit limit.'); const v = await askNumber('Borrow Money', 'Enter the amount you wish to borrow (up to ' + fmt(max) + '):', max, max); if (v) { setter(getter() + v); c.cash += v; sfx('loan'); } }, 0, 0, 100);
  field('Repay', async () => { const max = Math.min(getter(), c.cash); if (max <= 0) return alertBox(getter() <= 0 ? 'You don\'t owe any money.' : 'You do not have any cash to repay with.'); const v = await askNumber('Repay Loan', 'Enter the amount you wish to repay (up to ' + fmt(max) + '):', max, max); if (v) { setter(getter() - v); c.cash -= v; sfx('coins'); } }, 108, 0, 100);
  if (!zinn) {
    field('Deposit', async () => { if (c.cash <= 0) return; const v = await askNumber('Deposit', 'How much do you want to deposit into your savings account?', c.cash, c.cash); if (v) { c.cash -= v; c.save += v; sfx('bank'); } }, 216, 0, 100);
    field('Withdraw', async () => { if (c.save <= 0) return; const v = await askNumber('Withdraw', 'How much do you want to withdraw?', c.save, c.save); if (v) { c.cash += v; c.save -= v; sfx('coins'); } }, 324, 0, 100);
  }
  closeBtn(s); helpBtn(s, zinn ? 'Mr. Zinn\'s Loan' : 'Bank', zinn ? 'Mr. Zinn is a wealthy and somewhat fickle financier. He made his fortune as a merchant on Zile, and now he wants to expand his business. Mr. Zinn is willing to loan you money as long as you pay him interest on the loan.' : 'Any time you are on a planet, you may deposit money in your Trader\'s Union Bank Account, or take out a loan from the Trader\'s Union. Interest is added every time you travel to a new planet.');
  render();
}

// ---------- insurance / crew / fuel ----------
function insureScreen() {
  const c = human();
  const s = sub('Voyager\'s Insurance', 500, 300);
  vidEl(s.bd, 'insure_', { position: 'absolute', left: '0', top: '0', width: '110px', height: '176px', objectFit: 'cover', background: '#000' });
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '118px', top: '0', right: '0', height: '210px' });
  const b = btn(s.bd, '', async () => {
    if (c.insured) return;
    const cost = insPremium(c);
    if (cost > c.cash) return alertBox('You do not have enough cash to buy insurance.');
    c.cash -= cost; c.insured = true; sfx('insure'); render();
  }, { left: '118px', top: '220px', width: '200px', height: '28px' });
  function render() {
    const cost = insPremium(c);
    t.innerHTML = para('Voyager\'s Insurance protects you against damage from asteroids, losses due to space pirates, bad goods, and much more.') + para('This insurance will only cover your <b>next trip</b>. You must pay a premium every week if you want to be fully covered.') + para('Premium for your next trip: <b>' + money(cost) + '</b><br>Status: <b>' + (c.insured ? 'INSURED for the next trip' : 'not insured') + '</b><br>Cash: ' + money(c.cash)) + para('Visit Frac to ask for lower premiums.');
    b.innerHTML = c.insured ? 'Already insured' : 'Buy insurance (' + fmt(cost) + ')'; b.classList.toggle('dis', c.insured);
  }
  closeBtn(s); helpBtn(s, 'Insurance', 'Any time you are on a planet, you may purchase Voyager\'s Insurance. This insurance will only cover your next trip. Your insurance costs will rise and fall depending on local conditions, your accident record, and the size of your ship and cargo.');
  render();
}

function crewScreen() {
  const c = human();
  const s = sub('Crew', 500, 300);
  vidEl(s.bd, 'labor_', { position: 'absolute', left: '0', top: '0', width: '110px', height: '176px', objectFit: 'cover', background: '#000' });
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '118px', top: '0', right: '0', height: '210px' });
  const b = btn(s.bd, '', async () => {
    if (c.owed <= 0) return;
    if (c.cash < c.owed) { const v = await askNumber('Pay Crew', 'You owe your crew ' + fmt(c.owed) + ' kubars. How much do you want to pay now?', c.cash, c.cash); if (v) { c.cash -= v; c.owed -= v; sfx('coins'); } }
    else { c.cash -= c.owed; c.owed = 0; sfx('crew'); }
    render();
  }, { left: '118px', top: '220px', width: '200px', height: '28px' });
  function render() {
    t.innerHTML = para('You employ <b>' + crewN(c) + '</b> crew members aboard your ' + SHIPS[c.shipIdx][0] + ': pilot, navigator, engineer' + (crewN(c) > 3 ? ' and ' + (crewN(c) - 3) + ' staff' : '') + '.') + para('Weekly salary: <b>' + fmt(c.salary) + '</b> kubars per person (' + fmt(crewN(c) * c.salary) + ' per week).') + para('Back wages owed: <b>' + money(c.owed) + '</b>') + para('You must pay each employee a weekly salary. If you fail to pay your crew, there is a chance they will go on strike when you try to leave. Cash: ' + money(c.cash));
    b.innerHTML = c.owed > 0 ? 'Pay crew (' + fmt(c.owed) + ')' : 'Crew is paid'; b.classList.toggle('dis', c.owed <= 0);
  }
  closeBtn(s); helpBtn(s, 'Crew', 'The number of employees you have depends on the size and type of your ship. You will not be required to hire any additional employees until you purchase a larger ship. You must pay each employee a weekly salary. If you fail to pay your crew, there is a chance they will go on strike.');
  render();
}

function fuelScreen() {
  const c = human(), p = planetOf(c);
  const s = sub('Fuel', 500, 300);
  mk(s.bd, 'img', null, null, { position: 'absolute', left: '0', top: '0', width: '110px', height: '110px', objectFit: 'contain', background: '#000' }).src = $img('fire');
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '118px', top: '0', right: '0', height: '210px' });
  const price = () => fuelPrice(c, p);
  btn(s.bd, 'Fill tank', async () => {
    const need = Math.floor(tankMax(c) - c.fuel);
    if (need <= 0) return alertBox('You go to fill up your tank but discover it is already full. You can\'t fill up a full tank, now can you?');
    const n = Math.min(need, Math.floor(c.cash / price()));
    if (n <= 0) return alertBox('You cannot afford any fuel.');
    const own = G.facilities.some(f => f.planet === p.i && f.type === 'Fuel Depot' && f.owner !== 0);
    c.cash -= n * price(); c.fuel += n; sfx('fuel'); render();
  }, { left: '118px', top: '220px', width: '120px', height: '28px' });
  btn(s.bd, 'Buy tons...', async () => {
    const max = Math.min(Math.floor(tankMax(c) - c.fuel), Math.floor(c.cash / price()));
    if (max <= 0) return alertBox('You cannot buy any more fuel.');
    const v = await askNumber('Buy Fuel', 'How many tons of fuel do you want to buy at ' + price() + ' kubars/ton?', max, max);
    if (v) { c.cash -= v * price(); c.fuel += v; sfx('fuel'); render(); }
  }, { left: '248px', top: '220px', width: '120px', height: '28px' });
  function render() {
    t.innerHTML = para('Your ship runs on Ionic Fuel, a combination of nuclear and synthetic fuels. Every time you travel to a planet, your ship consumes fuel: between 2 and <b>' + maxFuelUse(c) + '</b> tons, depending on distance and ship size.') + para('Price on ' + p.id + ': <b>' + price() + '</b> kubars/ton<br>Fuel in tank: <b>' + Math.floor(c.fuel) + ' / ' + tankMax(c) + '</b> tons<br>Cash: ' + money(c.cash)) + para('Tip: visit Nosh for wholesale fuel prices.');
  }
  closeBtn(s); helpBtn(s, 'Fuel', 'Your ship runs on Ionic Fuel. Every time you travel to a planet, your ship consumes fuel. On average, the longer the distance travelled and the larger the ship, the more fuel is used.');
  render();
}

// ---------- advertising / passengers ----------
function adScreen() {
  const c = human();
  const s = sub('Advertising', 520, 330);
  vidEl(s.bd, 'ad_', { position: 'absolute', left: '0', top: '0', width: '110px', height: '110px', objectFit: 'cover', background: '#000' });
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '118px', top: '0', right: '0', height: '210px' });
  const act = mk(s.bd, 'div', null, null, { position: 'absolute', left: '0', top: '220px', right: '0', height: '64px' });
  function render() {
    t.innerHTML = para('There are two types of advertising. <b>Passenger Advertising</b>: the more you spend, the more passengers will be waiting to buy tickets on the next planet. <b>Commodities Advertising</b>: the more you spend, the more cargo will be available for you to buy on the next planet (it does not change prices).') + para('Advertising is only effective for one week. Larger ships cost more to fill.') + para('Passenger ads this week: <b>' + money(c.adPass) + '</b> (effect ' + Math.round(adPassEff(c) * 100) + '% of max)<br>Commodity ads this week: <b>' + money(c.adComm) + '</b> (effect ' + Math.round(adCommEff(c) * 100) + '% of max)<br>Full effect costs about ' + fmt(adPassCostRef(c)) + ' (passengers) and ' + fmt(adCommCostRef(c)) + ' (commodities).<br>Cash: ' + money(c.cash));
  }
  btn(act, 'Passenger ads', async () => { const v = await askNumber('Passenger Advertising', 'How much do you want to spend on passenger advertising? (Full effect: ' + fmt(adPassCostRef(c)) + ')', c.cash, adPassCostRef(c)); if (v) { c.cash -= v; c.adPass += v; sfx('advert'); render(); } }, { left: '118px', top: '0', width: '150px', height: '28px' });
  btn(act, 'Commodity ads', async () => { const v = await askNumber('Commodities Advertising', 'How much do you want to spend on commodities advertising? (Full effect: ' + fmt(adCommCostRef(c)) + ')', c.cash, adCommCostRef(c)); if (v) { c.cash -= v; c.adComm += v; sfx('advert'); render(); } }, { left: '276px', top: '0', width: '150px', height: '28px' });
  closeBtn(s); render();
}

function passScreen() {
  const c = human(), p = planetOf(c);
  const s = sub('Passengers', 520, 360);
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '0', top: '0', right: '0', height: '270px' });
  function render() {
    let h = para('Your ship can carry <b>' + passMax(c) + '</b> passengers. You may charge as much or as little as you like for tickets. If your ticket price is too high, nobody will want to travel on your ship. If it is too low, it will be difficult to make a profit.') + para('Current ticket price: <b>' + fmt(c.ticket) + '</b> kubars. Passenger tax: ' + (c.passTax * 100).toFixed(1) + '%.');
    h += '<table class="t"><tr><th>Destination</th><th class="n">Distance</th><th class="n">Typical fare</th><th class="n">Est. passengers at your price</th></tr>';
    for (const d of G.planets) if (d.i !== p.i) { const ref = refFare(c, p, d), acc = clamp(1.5 - c.ticket / ref, 0, 1); h += '<tr><td>' + d.id + '</td><td class="n">' + dist(p, d) + '</td><td class="n">' + fmt(ref) + '</td><td class="n">~' + Math.round(passMax(c) * acc) + ' of ' + passMax(c) + '</td></tr>'; }
    t.innerHTML = h + '</table>';
  }
  btn(s.bd, 'Set ticket price', async () => { const v = await askNumber('Ticket Price', 'Enter the price per passenger ticket (kubars). Typical fares are shown in the table; around 60-80% of the typical fare tends to fill the ship.', 1e9, c.ticket); if (v != null && v > 0) { c.ticket = v; render(); } }, { left: '0', top: '280px', width: '150px', height: '28px' });
  closeBtn(s); render();
}

// ---------- warehouse ----------
function warehouseScreen() {
  const c = human(), p = planetOf(c), pi = p.i;
  const s = sub('Warehouse on ' + p.id, 600, 430);
  const info = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '0', top: '0', right: '0', height: '34px', padding: '3px 6px' });
  const tb = mk(s.bd, 'div', 'panel', null, { position: 'absolute', left: '0', top: '38px', right: '0', height: '250px', overflow: 'auto' });
  const msg = mk(s.bd, 'div', null, '', { position: 'absolute', left: '0', top: '330px', right: '0', height: '20px' });
  let sel = null;
  const used = () => c.wh[pi].reduce((a, b) => a + b, 0);
  function render() {
    info.innerHTML = 'Warehouse space: <b>' + used() + '</b> / ' + c.whCap[pi] + ' tons used. Ship cargo: <b>' + cargoTons(c) + '</b> / ' + cargoMax(c) + '. Storing goods avoids tariffs, but they sit idle.';
    let h = '<table class="t"><tr><th>Commodity</th><th class="n">Tons on Ship</th><th class="n">Tons in Warehouse</th><th class="n">Market Price</th></tr>';
    for (let g = 0; g < NG; g++) if (c.cargo[g] || c.wh[pi][g] || sel === g) h += '<tr data-g="' + g + '" class="' + (sel === g ? 'sel' : '') + '"><td>' + GOODS[g][0] + '</td><td class="n">' + c.cargo[g] + '</td><td class="n">' + c.wh[pi][g] + '</td><td class="n">' + fmt(quote(p, g)) + '</td></tr>';
    tb.innerHTML = h + '</table>';
    tb.querySelectorAll('tr[data-g]').forEach(r => r.onclick = () => { sel = Number(r.dataset.g); render(); });
  }
  const move = async (store) => {
    if (sel == null) { msg.innerHTML = '<span class="bad">Click on a commodity first.</span>'; return; }
    const g = sel;
    const max = store ? Math.min(c.cargo[g], c.whCap[pi] - used()) : Math.min(c.wh[pi][g], cargoMax(c) - cargoTons(c));
    if (max <= 0) { msg.innerHTML = '<span class="bad">' + (store ? 'Nothing to store or the warehouse is full.' : 'Nothing to take or your ship is full.') + '</span>'; return; }
    const v = await askNumber(store ? 'Store Goods' : 'Take Goods', 'How many tons of ' + GOODS[g][0] + '?', max, max);
    if (!v) return;
    if (store) { const tot = c.whPaid[pi][g] * c.wh[pi][g] + c.paid[g] * v; c.wh[pi][g] += v; c.whPaid[pi][g] = tot / c.wh[pi][g]; c.cargo[g] -= v; if (!c.cargo[g]) c.paid[g] = 0; }
    else { const tot = c.paid[g] * c.cargo[g] + c.whPaid[pi][g] * v; c.cargo[g] += v; c.paid[g] = tot / c.cargo[g]; c.wh[pi][g] -= v; if (!c.wh[pi][g]) c.whPaid[pi][g] = 0; }
    render();
  };
  btn(s.bd, 'Store on ship -> warehouse', () => move(true), { left: '0', top: '296px', width: '200px', height: '26px' });
  btn(s.bd, 'Take warehouse -> ship', () => move(false), { left: '210px', top: '296px', width: '200px', height: '26px' });
  btn(s.bd, 'Trader\'s Union lottery', async () => {
    if (c.lotteryWeek === G.week) return alertBox('You have already entered the lottery this week.');
    c.lotteryWeek = G.week;
    if (Math.random() < 0.3) {
      const add = 20 + 10 * G.tierMax, price = add * 400 * (1 + G.tierMax);
      const ok = await confirmBox('Your name comes up in the lottery! The Trader\'s Union offers you ' + add + ' more tons of warehouse space on ' + p.id + ' for ' + money(price) + '. Buy it?', 'Trader\'s Union', 'Buy', 'No');
      if (ok) { if (c.cash < price) await alertBox('You do not have enough cash.'); else { c.cash -= price; c.whCap[pi] += add; } }
    } else await alertBox('Sorry, your name was not drawn this week. Try again next week.', 'Trader\'s Union');
    render();
  }, { left: '420px', top: '296px', width: '170px', height: '26px' });
  closeBtn(s); render();
}

// ---------- stock market ----------
function stockScreen() {
  const c = human(), p = planetOf(c);
  const s = sub('Stock Exchange on ' + p.id, 620, 440);
  const tb = mk(s.bd, 'div', 'panel', null, { position: 'absolute', left: '0', top: '0', width: '300px', height: '230px', overflow: 'auto' });
  const cv = mk(s.bd, 'canvas', 'panel', null, { position: 'absolute', left: '306px', top: '0', width: '294px', height: '230px', background: '#000' });
  cv.width = 294; cv.height = 230;
  const info = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '0', top: '236px', right: '0', height: '100px' });
  const msg = mk(s.bd, 'div', null, '', { position: 'absolute', left: '0', top: '344px', right: '0', height: '20px' });
  let sel = p.i;
  function render() {
    let h = '<table class="t"><tr><th>Exchange</th><th class="n">Price</th><th class="n">Shares</th><th>Trend</th></tr>';
    for (const q of G.planets) { const tr = q.stock.trend; h += '<tr data-i="' + q.i + '" class="' + (sel === q.i ? 'sel' : '') + '"><td>' + q.id + (q.i === p.i ? ' *' : '') + '</td><td class="n">' + fmt(stockPrice(q)) + '</td><td class="n">' + c.shares[q.i].n + '</td><td>' + (tr > 0.03 ? '&#9650;' : tr < -0.03 ? '&#9660;' : '&#9654;') + '</td></tr>'; }
    tb.innerHTML = h + '</table>';
    tb.querySelectorAll('tr[data-i]').forEach(r => r.onclick = () => { sel = Number(r.dataset.i); render(); });
    const q = G.planets[sel], sh = c.shares[sel];
    info.innerHTML = 'Exchange: <b>' + q.id + '</b> &nbsp; Price per share: <b>' + fmt(stockPrice(q)) + '</b><br>You own <b>' + sh.n + '</b> shares' + (sh.n ? ' (avg. paid ' + fmt(sh.paid) + ', worth ' + fmt(sh.n * stockPrice(q)) + ')' : '') + '. Cash: ' + fmt(c.cash) + '<br>' + (sel === p.i ? '' : '<span class="bad">You can only buy or sell on the planet where the exchange is located.</span><br>') + '<span style="font-size:11px">Rules: one stock purchase per week, at most 50% of your cash, 1% broker commission. If a market hits zero it crashes and you lose everything.</span>';
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 294, 230);
    const hs = q.stock.hist, mx = Math.max(...hs, 1) * 1.1;
    g.strokeStyle = '#0a0'; g.beginPath();
    hs.forEach((v, i) => { const x = 10 + i * (274 / 19), y = 215 - v / mx * 195; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = '#ff0'; g.font = '11px Arial'; g.fillText(q.id + ' Exchange - last 20 weeks', 10, 14);
  }
  btn(s.bd, 'Buy shares', async () => {
    const q = G.planets[sel]; if (sel !== p.i) return;
    if (c.boughtStockWeek === G.week) return alertBox('Imperial regulations allow only one stock purchase per week.');
    const max = Math.floor(c.cash * 0.5 / (stockPrice(q) * 1.01));
    if (stockPrice(q) <= 0 || max < 1) return alertBox('You cannot afford any shares (limit: 50% of your cash).');
    const v = await askNumber('Buy Shares', 'How many shares at ' + fmt(stockPrice(q)) + ' kubars each? (max ' + fmt(max) + ')', max, max);
    if (v) { buyStock(c, sel, v); sfx('stock'); render(); }
  }, { left: '0', top: '370px', width: '120px', height: '28px' });
  btn(s.bd, 'Sell shares', async () => {
    const sh = c.shares[sel]; if (sel !== p.i || !sh.n) return;
    const v = await askNumber('Sell Shares', 'How many shares do you want to sell?', sh.n, sh.n);
    if (v) { sellStock(c, sel, v); sfx('stock2'); render(); }
  }, { left: '130px', top: '370px', width: '120px', height: '28px' });
  closeBtn(s); render();
}

// ---------- ship info ----------
function shipScreen() {
  const c = human();
  const s = sub('Ship Info', 600, 420);
  mk(s.bd, 'img', null, null, { position: 'absolute', left: '0', top: '0', width: '250px', height: '156px', background: '#000' }).src = $img('ship' + (c.shipIdx + 1));
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '258px', top: '0', right: '0', height: '300px' });
  const used = sz(c) - cargoMax(c) + c.bonus.cargo;
  t.innerHTML = '<b>' + SHIPS[c.shipIdx][0] + '</b> (' + sz(c) + '-ton ship)<br><br>' +
    'Cargo capacity: <b>' + cargoMax(c) + '</b> tons<br>Passenger capacity: <b>' + passMax(c) + '</b><br>Fuel tank: <b>' + tankMax(c) + '</b> tons (max use ' + maxFuelUse(c) + ' per trip)<br>Engine: <b>' + c.engine + '</b> kuarp<br>Crew: <b>' + crewN(c) + '</b> at ' + fmt(c.salary) + ' kubars/week<br><br>' +
    para('The ship\'s engine room, bridge, passenger seating area, crew living quarters, life support systems and fuel tanks take up approximately ' + used + ' tons. The remaining ' + cargoMax(c) + ' tons can be used to haul cargo.') +
    para('The higher the kuarp value, the faster your ship can travel. This is an advantage if you are trying to beat another player to a planet in order to buy up all the best commodities. Divide the distance by the engine speed to estimate the travel time.');
  mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '0', top: '164px', width: '250px', height: '136px' }).innerHTML = '<b>All ships</b><br>' + SHIPS.map((x, i) => (i === c.shipIdx ? '<b>&gt; ' : '') + x[0] + ' - ' + x[1] + 't' + (i === c.shipIdx ? '</b>' : '')).join('<br>');
  const n = nextShip(c);
  const offer = c.offer && c.offer.week === G.week;
  btn(s.bd, 'Purchase Larger Ship', async () => {
    if (!n) return alertBox('You already own the largest ship in Kukubia.');
    if (!c.offerWeek || c.offerWeek < G.week - 2) {
      if (Math.random() < 0.45) c.offerWeek = G.week;
      else { await alertBox('You cannot buy or sell your ship whenever you feel like it. The Trader\'s Union strictly regulates the sale of all commercial ships. This helps to maintain a trade balance between the planets and prevents the larger companies from monopolizing the market. Try again next turn.', 'Trader\'s Union'); return; }
    }
    const trade = Math.round(SHIPS[c.shipIdx][2] * 0.5), price = n[2] - trade;
    const ok = await dlg({ img: 'ship' + (c.shipIdx + 2), title: 'Trader\'s Union', w: 540, snd: 'ping2', lines: ['The Trader\'s Union offers you a <b>' + n[0] + '</b>, a ' + n[1] + '-ton ship, for ' + money(n[2]) + '. They will give you ' + money(trade) + ' for your old ' + SHIPS[c.shipIdx][0] + ', so you pay <b>' + money(price) + '</b>. A larger ship needs more crew, uses more fuel, and costs more to insure.', 'Your cargo and extras will transfer to the new ship.'], buttons: [{ t: 'Buy it!', v: true, dis: price > c.cash }, { t: 'No thanks', v: false }] });
    if (ok) { c.cash -= price; c.shipIdx++; c.bonus = { cargo: 0, pass: 0, tank: 0 }; c.crewAdj = 0; c.fuel = Math.min(c.fuel, tankMax(c)); c.offerWeek = 0; bumpLimits(c); calcTier(); sfx('rocket3'); G.aiNews.push(c.name + ' purchases a new ' + n[1] + '-ton ship for ' + fmt(n[2]) + ' kubars from the Trader\'s Union.'); s.close(); }
  }, { left: '0', top: '312px', width: '170px', height: '28px' });
  closeBtn(s);
}

// ---------- graphs / opponents ----------
function graphScreen() {
  const s = sub('Graphs', 620, 440);
  const cv = mk(s.bd, 'canvas', 'panel', null, { position: 'absolute', left: '0', top: '32px', width: '600px', height: '340px', background: '#000' });
  cv.width = 600; cv.height = 340;
  let cur = 0;
  const colors = ['#ff0', '#f55', '#5f5', '#5af', '#f5f', '#5ff', '#fa5'];
  function draw() {
    const g = cv.getContext('2d'); g.clearRect(0, 0, 600, 340); g.fillStyle = '#000'; g.fillRect(0, 0, 600, 340);
    g.font = '12px Arial'; g.textBaseline = 'middle';
    if (cur === 0) {
      g.fillStyle = '#fff'; g.fillText('Net worth on turn ' + G.week + '  (goal: ' + fmt(G.goal) + ')', 10, 14);
      const vals = G.co.map(c => netWorth(c)), mx = Math.max(G.goal * 0.02, ...vals, 1);
      G.co.forEach((c, i) => { const w = Math.max(0, vals[i]) / mx * 320, y = 34 + i * 42; g.fillStyle = colors[i]; g.fillRect(190, y, w, 28); g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(c.name.slice(0, 26), 184, y + 14); g.textAlign = 'left'; g.fillText(fmt(vals[i]), 194 + w, y + 14); });
    } else if (cur === 1) {
      g.fillStyle = '#fff'; g.fillText('Market strength on turn ' + G.week + ' (by ship size)', 10, 14);
      const tot = G.co.reduce((a, c) => a + sz(c), 0); let ang = -Math.PI / 2;
      G.co.forEach((c, i) => { const a = sz(c) / tot * Math.PI * 2; g.fillStyle = colors[i]; g.beginPath(); g.moveTo(170, 180); g.arc(170, 180, 140, ang, ang + a); g.fill(); ang += a; g.fillStyle = colors[i]; g.fillRect(350, 50 + i * 36, 16, 16); g.fillStyle = '#fff'; g.fillText(c.name + ' - ' + SHIPS[c.shipIdx][0] + ' (' + Math.round(sz(c) / tot * 100) + '%)', 374, 58 + i * 36); });
    } else {
      g.fillStyle = '#fff'; g.fillText('Company history: net worth over the last 20 weeks', 10, 14);
      let mx = 1, mn = 0; G.co.forEach(c => c.hist.forEach(v => { mx = Math.max(mx, v); mn = Math.min(mn, v); }));
      G.co.forEach((c, i) => { g.strokeStyle = colors[i]; g.lineWidth = 2; g.beginPath(); c.hist.forEach((v, k) => { const x = 40 + k * (540 / Math.max(1, c.hist.length - 1)), y = 300 - (v - mn) / (mx - mn || 1) * 260; k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.fillStyle = colors[i]; g.fillText(c.name.slice(0, 20), 40 + (i % 4) * 140, 322 + Math.floor(i / 4) * 14); });
      g.fillStyle = '#fff'; g.fillText(fmt(mx), 4, 40); g.fillText(fmt(mn), 4, 300);
    }
  }
  ['Net Worth', 'Market Strength', 'Company History'].forEach((t, i) => btn(s.bd, t, () => { cur = i; draw(); }, { left: (i * 150) + 'px', top: '0', width: '144px', height: '26px' }));
  closeBtn(s); draw();
}

function oppScreen() {
  const s = sub('Opponents', 620, 440);
  const t = mk(s.bd, 'div', 'panel', null, { position: 'absolute', left: '0', top: '0', right: '0', height: '330px', overflow: 'auto' });
  function render() {
    let h = '<table class="t"><tr><th>Company</th><th>Ship</th><th class="n">Engine</th><th class="n">Net Worth</th><th>Location</th><th>Intelligence</th></tr>';
    G.co.forEach(c => {
      h += '<tr><td>' + c.name + (c.bankrupt ? ' (bankrupt)' : '') + '</td><td>' + SHIPS[c.shipIdx][0] + '</td><td class="n">' + c.engine + '</td><td class="n">' + fmt(netWorth(c)) + '</td><td>' + G.planets[c.loc].id + '</td><td>' + (c.human ? '(you)' : '<span class="b" data-i="' + c.i + '" style="cursor:pointer;color:#00c">- ' + c.int + ' +</span>') + '</td></tr>';
      const def = AI_DEFS[c.i - 1];
      if (!c.human && def) h += '<tr><td colspan="6" style="white-space:normal;color:#555;font-size:10px;padding:0 4px 3px 14px;border-bottom:1px solid #ccc">' + def.bio + '</td></tr>';
    });
    t.innerHTML = h + '</table>';
    t.querySelectorAll('.b').forEach(e => e.onclick = ev => { const c = G.co[e.dataset.i]; const r = e.getBoundingClientRect(); const left = ev.clientX < r.left + r.width / 2; c.int = clamp(c.int + (left ? -1 : 1), 1, 5); render(); });
  }
  mk(s.bd, 'div', null, 'You are competing against six computer controlled companies. Click the - or + beside a company to lower or raise its intelligence (1-5). The higher the intelligence the more difficult it will be to compete.', { position: 'absolute', left: '0', top: '338px', right: '0', fontSize: '12px' });
  closeBtn(s); render();
}

function facScreen() {
  const c = human();
  const s = sub('Facilities', 560, 360);
  const t = mk(s.bd, 'div', 'panel pt', '', { position: 'absolute', left: '0', top: '0', right: '0', height: '270px' });
  let h = para('Every few turns, Emperor Dred auctions off facilities such as fuel depots, launch pads and passenger ticket offices to the highest bidder. The owner charges every other company a FEE when it arrives on that planet, and collects the REVENUE when visiting.');
  if (!G.facilities.length) h += para('<i>No facilities have been sold yet.</i>');
  else { h += '<table class="t"><tr><th>Planet</th><th>Facility</th><th>Owner</th><th class="n">Fee</th><th class="n">Revenue waiting</th></tr>'; G.facilities.forEach(f => { h += '<tr><td>' + G.planets[f.planet].id + '</td><td>' + f.type + '</td><td>' + G.co[f.owner].name + '</td><td class="n">' + fmt(f.fee) + '</td><td class="n">' + fmt(f.rev) + '</td></tr>'; }); h += '</table>'; }
  t.innerHTML = h; closeBtn(s);
}

// ---------- file ----------
function loadScreen(back) {
  clearStage('stars4');
  const { bd } = win(stage, 'Load Game', 120, 100, 400, 290);
  for (let i = 1; i <= 5; i++) {
    const inf = slotInfo(i);
    btn(bd, inf ? i + '. ' + inf.name + ' - week ' + inf.week + ', net worth ' + fmt(inf.nw) : i + '. .......', () => {
      if (!inf) return alertBox('You cannot load an empty file. Before you can load a game, you must first save the game.');
      if (loadGame(i)) { starBg = pick(STARS); mainMenu(); } else alertBox('Could not load that game.');
    }, { left: '10px', top: (10 + (i - 1) * 40) + 'px', width: '370px', height: '32px' });
  }
  btn(bd, 'Exit Without Loading', back || mainMenu, { left: '110px', top: '216px', width: '170px', height: '26px' });
}
function saveScreen() {
  clearStage('stars5');
  const { bd } = win(stage, 'Save Game As', 120, 100, 400, 290);
  for (let i = 1; i <= 5; i++) {
    const inf = slotInfo(i);
    btn(bd, i + '. ' + (inf ? inf.name + ' - week ' + inf.week : '.......'), async () => {
      if (inf && !(await confirmBox('Overwrite this saved game?'))) return;
      G.slot = i;
      if (saveGame(i)) { await alertBox('Game saved. AUTO SAVE is now on for this game.'); mainMenu(); } else alertBox('Could not save (browser storage unavailable).');
    }, { left: '10px', top: (10 + (i - 1) * 40) + 'px', width: '370px', height: '32px' });
  }
  btn(bd, 'Exit Without Saving', mainMenu, { left: '110px', top: '216px', width: '170px', height: '26px' });
}
function autosave() { if (G && G.slot) saveGame(G.slot); }

function fileScreen() {
  const s = sub('File Options', 340, 300);
  const bs = [['Save Game', () => { saveScreen(); s.ov.remove(); }], ['Load Game', () => { loadScreen(); s.ov.remove(); }],
    ['New Game', async () => { if (await confirmBox('Start a new game? The current game will be lost unless you saved it.')) { s.ov.remove(); newGameScreen(); } }],
    ['Sound ' + (muted ? 'OFF' : 'ON'), (b) => { setMuted(!muted); b.innerHTML = 'Sound ' + (muted ? 'OFF' : 'ON'); }],
    ['Quit to Title', async () => { if (await confirmBox('Quit to the title screen?')) { s.ov.remove(); titleScreen(); } }]];
  bs.forEach((b, i) => btn(s.bd, b[0], b[1], { left: '50px', top: (6 + i * 40) + 'px', width: '210px', height: '32px' }));
  closeBtn(s);
}

// ---------- game over ----------
async function gameOver() {
  const o = G.over, c = human();
  if (c.bankrupt || (o && o.lose === 'bankrupt')) {
    clearStage('lose');
    await dlg({ img: null, title: 'Bankrupt!', lines: [c.name + ' has exceeded its credit limit. The lender repossesses your ship, forcing you into BANKRUPTCY. You lose the game.'], snd: 'bankrupt' });
  } else if (o && o.winner === 0) {
    clearStage('win'); sfx('good3'); vidEl(stage, 'wingame_', { position: 'absolute', left: '0', top: '0', width: '640px', height: '480px', objectFit: 'cover', opacity: '.55' });
    await dlg({ img: null, title: 'You win!', w: 480, lines: [c.name + ' wins the game!', 'Your company has attained a net worth of ' + money(netWorth(c)) + ' in ' + G.week + ' weeks. You are a true Gazillionaire!' + (o.cap ? ' You passed the 2 billion kubar mark, and we congratulate you for playing Gazillionaire longer than we ever expected anyone to play. You may now consider yourself an honorary member of the Society of Dred.' : '')] });
  } else if (o) {
    const w = G.co[o.winner];
    clearStage('lose');
    await dlg({ img: null, title: 'Game over', w: 480, lines: [w.name + ' wins the game!', 'It was the first to reach a net worth of ' + money(G.goal) + '. You finished with ' + money(netWorth(c)) + '. Better luck next time!'], snd: 'bad2' });
  }
  if (G) G.slot = 0;
  clearStage('thanks');
  stage.onclick = () => { stage.onclick = null; titleScreen(); };
}
