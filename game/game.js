'use strict';
/* =========================================================
   CUỘC GỌI TỪ CAMPUCHIA · Map 1 (point-and-click, first person)
   ANO301 · Nhóm 3 · art & UI: source/Game of Thiên Duyên
   ========================================================= */
const W = 1920, H = 1080;
const $ = s => document.querySelector(s);
const cv = $('#cv'), ctx = cv.getContext('2d');
const stage = $('#stage');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const A = p => 'assets/v2/' + p;

/* ---------------- Stage scaling (sharp on Retina) ---------------- */
let SCALE = 1, RS = 1;
function resize() {
  SCALE = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `scale(${SCALE})`;
  stage.style.left = (innerWidth - W * SCALE) / 2 + 'px';
  stage.style.top = (innerHeight - H * SCALE) / 2 + 'px';
  const rs = clamp(SCALE * (window.devicePixelRatio || 1), 0.5, 2);
  if (cv.width !== Math.round(W * rs)) { RS = rs; cv.width = Math.round(W * RS); cv.height = Math.round(H * RS); }
}
addEventListener('resize', resize); resize();
const toStage = e => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / SCALE, y: (e.clientY - r.top) / SCALE }; };

/* ---------------- Assets ---------------- */
const ROOMS = ['office', 'desk', 'desk2', 'pc', 'corner', 'hallOffice', 'hall', 'hallWater', 'hallKPI', 'boss', 'bossLeft', 'bossRight', 'cellDoor', 'cells'];
const IMG = {};
const IMG_SRC = {
  ...Object.fromEntries(ROOMS.map(r => [r, A(`rooms/${r}.jpg`)])),
  dai: A('chars/dai.png'), keys: A('props/keys.png'),
};
function loadAssets(onProgress) {
  const extra = ['props/binder.png', 'props/clock.png', 'props/paper20.png', 'props/k.png', 'props/cup.png', 'chars/yen.png',
    'ui/box_ti.png', 'ui/box_dai.png', 'ui/box_yen.png', 'ui/menu_bg.jpg', 'ui/logo.png', 'ui/start.png', 'ui/start_h.png', 'ui/option.png', 'ui/option_h.png',
    'ui/opt_bg.jpg', 'ui/opt_panel.webp', 'ui/snd_panel.webp', 'ui/tut_panel.webp', 'ui/quit_panel.webp', 'ui/pause_panel.webp', 'ui/end_bg.jpg', 'ui/end_title.png'];
  const all = [...Object.entries(IMG_SRC), ...extra.map(p => [p, A(p)])];
  let done = 0;
  return Promise.all(all.map(([k, src]) => new Promise(res => {
    const i = new Image();
    i.onload = () => { IMG[k] = i; res(); onProgress(++done / all.length); };
    i.onerror = () => { console.warn('Thiếu asset', src); res(); onProgress(++done / all.length); };
    i.src = src;
  })));
}

/* ---------------- Settings & audio ---------------- */
const SET = { music: 0.6, sfx: 0.9 };
try { Object.assign(SET, JSON.parse(localStorage.getItem('cgtc-settings') || '{}')); } catch (e) { /* private mode */ }
const saveSet = () => { try { localStorage.setItem('cgtc-settings', JSON.stringify(SET)); } catch (e) { /* ignore */ } applyVolumes(); };

const AU = { ctx: null, sfx: null, music: null };
function ac() {
  if (!AU.ctx) {
    AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.sfx = AU.ctx.createGain(); AU.sfx.connect(AU.ctx.destination);
    AU.music = AU.ctx.createGain(); AU.music.connect(AU.ctx.destination);
    applyVolumes();
  }
  if (AU.ctx.state === 'suspended') AU.ctx.resume();
  return AU.ctx;
}
function applyVolumes() {
  if (AU.sfx) { AU.sfx.gain.value = SET.sfx * 0.6; AU.music.gain.value = SET.music * 0.5; }
  if (voice) voice.volume = SET.sfx;
  $('#video').volume = Math.max(SET.sfx, SET.music);
}
function tone(f, d, type = 'square', v = 0.15, when = 0, bus = 'sfx') {
  const c = ac(), t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(AU[bus]); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, v = 0.2, freq = 800) {
  const c = ac(), t = c.currentTime;
  const b = c.createBuffer(1, Math.max(1, c.sampleRate * d), c.sampleRate);
  const ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(AU.sfx); s.start(t);
}
const SFX = {
  click() { tone(900, 0.05, 'square', 0.06); },
  step() { noise(0.12, 0.12, 500); },
  ok() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, i * 0.08)); },
  wrong() { tone(180, 0.25, 'sawtooth', 0.14); tone(140, 0.3, 'sawtooth', 0.12, 0.12); },
  pick() { tone(700, 0.08, 'triangle', 0.15); tone(1100, 0.14, 'triangle', 0.15, 0.07); },
  door() { noise(0.45, 0.3, 300); tone(90, 0.4, 'sine', 0.2); },
  heart() { tone(62, 0.12, 'sine', 0.55); tone(55, 0.14, 'sine', 0.45, 0.17); },
  key() { tone(1200 + Math.random() * 300, 0.04, 'square', 0.05); },
};
const BGM = { mode: null, beat: 0, timer: null };
const BASS = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 82.41];
function bgm(mode) { BGM.mode = mode; if (!BGM.timer) BGM.timer = setInterval(bgmTick, 250); }
function bgmTick() {
  if (!BGM.mode || !AU.ctx || G.video) return;
  const b = BGM.beat++, n = BASS[(b >> 3) % 8];
  if (BGM.mode === 'menu') {
    if (b % 4 === 0) tone(n, 1.0, 'triangle', 0.12, 0, 'music');
    if (b % 2 === 0) tone([440, 523, 659, 523][(b >> 1) % 4] * 0.5, 0.45, 'sine', 0.05, 0, 'music');
  } else if (BGM.mode === 'calm') {
    if (b % 4 === 0) tone(n, 0.9, 'triangle', 0.13, 0, 'music');
    if (b % 8 === 6) tone(n * 4, 0.3, 'sine', 0.05, 0, 'music');
  } else if (BGM.mode === 'alarm') {
    if (b % 2 === 0) tone(n, 0.22, 'sawtooth', 0.09, 0, 'music');
    if (b % 8 === 0) { tone(880, 0.22, 'square', 0.07, 0, 'music'); tone(660, 0.22, 'square', 0.07, 0.25, 'music'); }
  }
}

/* ---------------- Voice lines (generated, pitch-shifted per character) ---------------- */
let voice = null;
function playVoice(id) {
  stopVoice();
  if (!id) return;
  voice = new Audio(A(`voice/${id}.mp3`)); voice.volume = SET.sfx;
  voice.play().catch(() => { /* autoplay blocked until first click */ });
}
function stopVoice() { if (voice) { voice.pause(); voice = null; } }

/* ---------------- UI helpers ---------------- */
const ui = {
  hud: $('#hud'), obj: $('#obj-text'), count: $('#countdown'), inv: $('#inv'), detFill: $('#det-fill'), lives: $('#lives'), warn: $('#warn'),
  vign: $('#vignette'), tip: $('#tip'), overlay: $('#overlay'), dialog: $('#dialog'), dFig: $('#d-fig'), dFrame: $('#d-frame'),
  dName: $('#d-name'), dText: $('#d-text'), video: $('#video'), vskip: $('#vskip'), screen: $('#screen'), toast: $('#toast'), fade: $('#fade'), flash: $('#flash'),
};
let toastT = 0;
function toast(msg, ms = 2600) { ui.toast.textContent = msg; ui.toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => ui.toast.classList.remove('show'), ms); }
const fmt = s => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

/* ---------------- Game state ---------------- */
const G = { mode: 'loading' };
const D = {};
const AREA = { office: 'office', desk: 'office', desk2: 'office', pc: 'office', corner: 'office', hallOffice: 'hall', hall: 'hall', hallWater: 'hall', hallKPI: 'hall', cellDoor: 'hall', boss: 'boss', bossLeft: 'boss', bossRight: 'boss', cells: 'cells' };
const SAFE = new Set(['desk', 'pc']);
const ROUTE = ['boss', 'hall', 'office', 'hall'];
const STAY = { boss: 14, hall: 7, office: 9 };
const AREA_NAME = { office: 'phòng làm việc', hall: 'hành lang', boss: 'phòng ông trùm', cells: 'phòng giam' };
const LETTERS = ['cup', 'clock', 'k', 'paper'];

function newGame() {
  Object.assign(G, {
    mode: 'play', view: 'office', inv: new Set(), flags: {}, lives: 3, det: 0, caught: 0, grace: 0,
    alarm: false, countdown: 0, overlay: null, dlg: null, paused: false, video: false, busy: false, t: 0, hbT: 0, hover: null, hoverArrow: null,
  });
  Object.assign(D, { area: 'office', idx: 2, t: 6, warned: false, greeted: false });
}
const has = id => G.inv.has(id);

/* ---------------- Views & hotspots (1920×1080 art coordinates) ---------------- */
const VIEWS = {
  office: { dai: { x: 760, h: 880 }, arrows: { down: 'hallOffice' }, spots: [
    { x: 993, y: 700, w: 665, h: 360, label: 'Bàn máy số 4', go: 'desk' },
    { x: 218, y: 700, w: 742, h: 360, label: 'Bàn máy khác', go: 'desk2' },
    { x: 1080, y: 458, w: 447, h: 218, label: 'Bảng ghim và đồng hồ', go: 'corner' },
  ] },
  desk: { arrows: { down: 'office' }, spots: [
    { x: 55, y: 175, w: 556, h: 545, label: 'Màn hình máy số 4', go: 'pc' },
    { x: 1040, y: 470, w: 215, h: 300, label: 'Cuốn sổ', act: () => collect('note') },
  ] },
  desk2: { arrows: { down: 'office' }, spots: [] },
  pc: { arrows: { down: 'desk' }, spots: [
    { x: 535, y: 170, w: 330, h: 64, label: 'Folder Ho_so_nhan_su', act: () => openFolder('hoso') },
    { x: 535, y: 246, w: 330, h: 64, label: 'Folder Kich_ban', act: () => openFolder('kichban') },
    { x: 535, y: 322, w: 330, h: 64, label: 'Folder KPI', act: () => openFolder('kpi') },
    { x: 535, y: 398, w: 330, h: 64, label: 'Folder Anh', act: () => openFolder('anh') },
  ], draw: drawPcLabels },
  corner: { arrows: { down: 'office' }, spots: [
    { x: 993, y: 131, w: 272, h: 273, label: 'Đồng hồ', act: () => collect('clock') },
    { x: 1150, y: 600, w: 310, h: 420, label: 'Thùng rác', act: () => collect('paper') },
  ] },
  hallOffice: { dai: { x: 400, h: 860 }, arrows: { left: 'hall' }, spots: [
    { x: 720, y: 153, w: 894, h: 785, label: 'Vào phòng làm việc', go: 'office' },
  ] },
  hall: { dai: { x: 930, h: 720 }, arrows: { down: 'hallOffice' }, spots: [
    { x: 273, y: 240, w: 196, h: 415, label: 'Máy lọc nước', go: 'hallWater' },
    { x: 655, y: 300, w: 403, h: 360, label: 'Cửa phòng giam (CELL)', go: 'cellDoor' },
    { x: 1102, y: 251, w: 294, h: 404, label: 'Bảng KPI và cửa gỗ', go: 'hallKPI' },
    { x: 1495, y: 98, w: 403, h: 666, label: 'Cửa OFFICE', go: 'hallOffice' },
  ] },
  hallWater: { arrows: { down: 'hall' }, spots: [
    { x: 1190, y: 630, w: 110, h: 150, label: 'Cái ly', act: () => collect('cup') },
  ] },
  hallKPI: { dai: { x: 1140, h: 900 }, arrows: { down: 'hall' }, spots: [
    { x: 22, y: 76, w: 698, h: 491, label: 'Bảng KPI', act: () => collect('k') },
    { x: 862, y: 76, w: 556, h: 971, label: 'Cửa phòng ông trùm', go: 'boss', sfx: 'door' },
  ] },
  boss: { dai: { x: 900, h: 900 }, arrows: { down: 'hallKPI' }, spots: [
    { x: 33, y: 327, w: 665, h: 720, label: 'Góc làm việc', go: 'bossLeft' },
    { x: 1222, y: 262, w: 698, h: 785, label: 'Góc sofa', go: 'bossRight' },
  ] },
  bossLeft: { arrows: { down: 'boss', right: 'bossRight' }, spots: [] },
  bossRight: { arrows: { down: 'boss', left: 'bossLeft' }, spots: [
    { x: 720, y: 60, w: 340, h: 480, label: 'Đầu nai', cond: () => !has('key'), act: () => collect('key') },
  ], draw: () => { if (!has('key') && IMG.keys) ctx.drawImage(IMG.keys, 835, 405, 120, 121); } },
  cellDoor: { arrows: { down: 'hall' }, spots: [
    { x: 436, y: 120, w: 797, h: 884, label: () => G.flags.gate ? 'Vào phòng giam' : 'Cửa phòng giam', act: cellDoorAct },
    { x: 1385, y: 295, w: 360, h: 272, label: 'Bàn phím mật mã', act: openKeypad },
  ], draw: drawCellBars },
  cells: { arrows: { down: 'cellDoor' }, spots: [
    { x: 985, y: 125, w: 215, h: 955, label: 'Phòng 602', act: () => cellAct(602) },
    { x: 760, y: 365, w: 85, h: 635, label: 'Phòng 609', act: () => cellAct(609) },
    { x: 630, y: 450, w: 50, h: 500, label: 'Phòng 601', act: () => cellAct(601) },
    { x: 340, y: 510, w: 145, h: 390, label: 'Phòng 603', act: () => cellAct(603) },
  ] },
};
const lbl = s => typeof s.label === 'function' ? s.label() : s.label;
const spotsOf = v => VIEWS[v].spots.filter(s => !s.cond || s.cond());

function drawPcLabels() {
  ctx.font = '30px VT323, monospace'; ctx.fillStyle = '#2b2b24';
  ['Ho_so_nhan_su' + (G.flags.folder ? '' : ' 🔒'), 'Kich_ban', 'KPI', 'Anh'].forEach((t, i) => ctx.fillText(t, 618, 214 + i * 76));
}
function drawCellBars() {
  if (G.flags.gate) return;
  ctx.save(); ctx.fillStyle = 'rgba(30,34,32,.55)'; ctx.fillRect(452, 262, 762, 740);
  ctx.strokeStyle = '#151816'; ctx.lineWidth = 6;
  for (let x = 470; x < 1214; x += 62) { ctx.fillStyle = '#5d6762'; ctx.fillRect(x, 262, 20, 740); ctx.strokeRect(x, 262, 20, 740); }
  ctx.fillStyle = '#5d6762'; ctx.fillRect(452, 560, 762, 22); ctx.strokeRect(452, 560, 762, 22);
  ctx.restore();
}

/* ---------------- Navigation ---------------- */
function go(view, sfx) {
  if (G.busy) return;
  G.busy = true; closeOverlay(true);
  if (sfx) SFX[sfx](); else SFX.step();
  ui.fade.classList.add('on');
  setTimeout(() => {
    const before = AREA[G.view];
    G.view = view;
    if (AREA[view] !== before) { G.grace = Math.max(G.grace, 1.0); if (D.area === AREA[view]) SFX.heart(); }
    ui.fade.classList.remove('on');
    setTimeout(() => { G.busy = false; }, 120);
  }, 220);
}

/* ---------------- Dialogue (only on puzzle-critical moments) ---------------- */
const WHO = {
  ti: { name: 'TÍ CÔNG AN', box: 'ui/box_ti.png', side: 'l' },
  dai: { name: 'ANH ĐẠI', box: 'ui/box_dai.png', side: 'r', fig: 'chars/dai.png', figSide: 'left' },
  yen: { name: 'AN YÊN', box: 'ui/box_yen.png', side: 'l', fig: 'chars/yen.png', figSide: 'right' },
};
let typeTimer = null, typeFull = '', typeIdx = 0;
function dialog(lines, done) {
  G.dlg = { q: lines.slice(), done };
  ui.dialog.classList.remove('hidden'); ui.tip.classList.remove('on');
  nextLine();
}
function nextLine() {
  if (!G.dlg) return;
  if (typeTimer && typeIdx < typeFull.length) { clearInterval(typeTimer); typeTimer = null; ui.dText.textContent = typeFull; typeIdx = typeFull.length; return; }
  const l = G.dlg.q.shift();
  if (!l) { stopVoice(); ui.dialog.classList.add('hidden'); const d = G.dlg.done; G.dlg = null; if (d) d(); return; }
  const w = WHO[l.who];
  ui.dFrame.src = A(w.box);
  ui.dName.textContent = w.name; ui.dName.className = w.side;
  const inScene = l.who === 'dai' && VIEWS[G.view].dai && D.area === AREA[G.view] && G.mode === 'play';
  if (w.fig && !inScene) { ui.dFig.src = A(w.fig); ui.dFig.className = w.figSide; } else ui.dFig.className = 'hidden';
  typeFull = l.text; typeIdx = 0; ui.dText.textContent = '';
  playVoice(l.v);
  clearInterval(typeTimer);
  typeTimer = setInterval(() => {
    typeIdx += 2; ui.dText.textContent = typeFull.slice(0, typeIdx);
    if (typeIdx >= typeFull.length) { clearInterval(typeTimer); typeTimer = null; }
  }, 22);
}
ui.dialog.addEventListener('pointerdown', e => { e.stopPropagation(); nextLine(); });
const L = {
  intro: { who: 'dai', v: 'intro_dai', text: 'Ê thằng mới! Mày ngồi máy số 4, lo mà làm đi. Hông làm là ăn điện nghe chưa!' },
  note: { who: 'ti', v: 'note_ti', text: 'Trời đất ơi, mật khẩu dán chình ình trên sổ luôn. St5K, nhớ nè!' },
  pclock: { who: 'ti', v: 'pclock_ti', text: 'Có khóa nè trời. Mật khẩu ở đâu ta?' },
  pcwrong: { who: 'ti', v: 'pcwrong_ti', text: 'Sai bét rồi!' },
  pcopen: { who: 'ti', v: 'pcopen_ti', text: 'An Yên, phòng 602! Giờ kiếm mật khẩu cửa phòng giam.' },
  clock: { who: 'ti', v: 'clock_ti', text: 'Số 4 xanh lè trên đồng hồ. Nhớ nè!' },
  paper: { who: 'ti', v: 'paper_ti', text: 'Lục thùng rác ra được số 20. Hên dữ thần!' },
  cup: { who: 'ti', v: 'cup_ti', text: 'Cái ly có số 2 nè. Ghi lại liền!' },
  k: { who: 'ti', v: 'k_ti', text: 'Chữ K vàng chóe trên bảng KPI. Lụm!' },
  all4: { who: 'ti', v: 'all4_ti', text: 'Đủ 4 ký tự rồi! Ra cửa phòng giam thử coi.' },
  doorlocked: { who: 'ti', v: 'doorlocked_ti', text: 'Cửa khóa số. Phải có mật khẩu mới vô được.' },
  kpok: { who: 'ti', v: 'kpok_ti', text: 'Mở rồi! Dễ như ăn cháo!' },
  kpwrong: { who: 'ti', v: 'kpwrong_ti', text: 'Bíp bíp! Sai rồi, bình tĩnh, bình tĩnh...' },
  key: { who: 'ti', v: 'keys_ti', text: 'Chùm chìa khóa treo trên đầu nai. Lụm liền!' },
  nokey: { who: 'yen', v: 'nokey_yen', text: 'Anh ơi cứu em! Chìa khóa nằm bên phòng ông trùm á!' },
  wrongcell: { who: 'ti', v: 'wrongcell_ti', text: 'Hông phải phòng này.' },
  rescue: { who: 'ti', v: 'rescue_ti', text: 'An Yên! Anh tới rồi, mình về nhà thôi!' },
  caught: { who: 'dai', v: 'caught_dai', text: 'Lảng vảng làm gì đó hả? Ăn điện nè!' },
  afterzap: { who: 'dai', v: 'afterzap_dai', text: 'Về chỗ ngồi chạy KPI cho tao!' },
  gameover: { who: 'dai', v: 'gameover_dai', text: 'Ba lần rồi đó nha. Mày ở lại đây luôn đi!' },
};

/* ---------------- Inventory ---------------- */
const ITEMS = {
  note: { img: 'props/binder.png', t: 'St5K', name: 'Sổ St5K' },
  file: { img: 'chars/yen.png', t: '602', name: 'Hồ sơ An Yên' },
  cup: { img: 'props/cup.png', t: '2', name: 'Ly số 2' },
  clock: { img: 'props/clock.png', t: '4', name: 'Đồng hồ số 4' },
  k: { img: 'props/k.png', t: 'K', name: 'Chữ K' },
  paper: { img: 'props/paper20.png', t: '20', name: 'Giấy số 20' },
  key: { img: 'props/keys.png', t: '', name: 'Chùm chìa khóa' },
};
function renderInv() {
  ui.inv.innerHTML = Object.entries(ITEMS).map(([id, it]) =>
    `<div class="slot ${has(id) ? '' : 'empty'}" title="${it.name}"><img src="${A(it.img)}" alt="">${has(id) && it.t ? `<span class="t">${it.t}</span>` : ''}</div>`).join('');
}
const ZOOM = { note: 'props/binder.png', clock: 'props/clock.png', paper: 'props/paper20.png', cup: 'props/cup.png', k: 'props/k.png', key: 'props/keys.png' };
function collect(id) {
  if (has(id)) { showZoom(ZOOM[id]); return; }
  showZoom(ZOOM[id]);
  SFX.pick();
  dialog([L[id]], () => {
    closeOverlay(); G.inv.add(id); renderInv();
    if (id === 'key') { G.alarm = true; G.countdown = 60; bgm('alarm'); toast('Ông trùm sắp phát hiện mất chìa khóa! Nhanh lên!', 3200); }
    if (LETTERS.includes(id) && LETTERS.every(has) && !G.flags.all4) { G.flags.all4 = true; dialog([L.all4]); }
  });
}

/* ---------------- Overlays ---------------- */
function showZoom(src) {
  G.overlay = 'zoom';
  ui.overlay.className = '';
  ui.overlay.innerHTML = `<img class="zoom" src="${A(src)}" alt="">`;
  ui.overlay.onpointerdown = e => { if (!G.dlg) closeOverlay(); };
}
function closeOverlay(silent) {
  if (!G.overlay) return;
  G.overlay = null; ui.overlay.className = 'hidden'; ui.overlay.innerHTML = ''; ui.overlay.onpointerdown = null;
  if (!silent) SFX.click();
}

/* --- PC folders (drawn inside the monitor of the "pc" view) --- */
function openFolder(f) {
  G.overlay = 'pc'; ui.overlay.className = 'pc';
  const win = (title, body) => {
    ui.overlay.innerHTML = `<div class="pcwin"><div class="tb"><span>${title}</span><b data-x>x</b></div><div class="wb">${body}</div></div>`;
    ui.overlay.querySelector('[data-x]').onclick = () => closeOverlay();
    return ui.overlay.querySelector('.wb');
  };
  ui.overlay.onpointerdown = e => { if (e.target === ui.overlay) closeOverlay(); };
  if (f === 'hoso') {
    if (G.flags.folder) return win('Ho_so_nhan_su', profileHTML());
    const wb = win('Ho_so_nhan_su', `To use this folder, you need Enter Password<br><input id="pw" maxlength="8" autocomplete="off" spellcheck="false"><button id="pwok">OK</button><div id="pwmsg"></div>`);
    const inp = wb.querySelector('#pw'); setTimeout(() => inp.focus(), 50);
    if (!G.flags.triedPc && !has('note')) { G.flags.triedPc = true; dialog([L.pclock], () => inp.focus()); }
    const submit = () => {
      if (inp.value.trim().toLowerCase() === 'st5k') {
        SFX.ok(); G.flags.folder = true; G.inv.add('file'); renderInv();
        wb.innerHTML = profileHTML(); dialog([L.pcopen]);
      } else {
        SFX.wrong(); wb.querySelector('#pwmsg').innerHTML = '<span class="err">Wrong password!</span>';
        const w = ui.overlay.querySelector('.pcwin'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
        inp.select(); if (!G.flags.saidWrong) { G.flags.saidWrong = true; dialog([L.pcwrong], () => inp.focus()); }
      }
    };
    wb.querySelector('#pwok').onclick = submit;
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeOverlay(); });
  } else if (f === 'kichban') {
    win('Kich_ban.txt', `<b>KỊCH BẢN 1:</b> "Việc nhẹ lương cao" bên Campuchia, bao vé máy bay. Tới nơi thu hộ chiếu.<br><br><b>KỊCH BẢN 2:</b> Giả danh công an gọi báo "tài khoản dính rửa tiền", bắt chuyển tiền "xác minh".<br><br><span class="hl">Công an thật không bao giờ bắt chuyển tiền qua điện thoại!</span>`);
  } else if (f === 'kpi') {
    win('KPI.xls', `<table><tr><th>Mã</th><th>Doanh thu</th><th>Ghi chú</th></tr><tr><td>03-VAN</td><td>107%</td><td>✓</td></tr><tr><td>02-THI</td><td>67%</td><td>✓</td></tr><tr><td>04-TÍ</td><td>...</td><td>...</td></tr><tr><td>01-ANYEN</td><td class="err">6%</td><td class="err">FAILED</td></tr></table>`);
  } else {
    win('Anh', 'Ảnh hộ chiếu của những người mới bị lừa sang...<br><br><span class="err">(Bọn chúng giữ giấy tờ để không ai trốn được.)</span>');
  }
}
function profileHTML() {
  return `<div class="profile"><div class="ph" style="background-image:url(${A('chars/yen.png')})"></div>
    <div>Name: <b>Nguyễn An Yên</b><br>Date: 01-04-2007<br>Born: Việt Nam<br>Status: <span class="err">FAILED KPI</span><br>Prison cell: <span class="hl"><b>602</b></span></div></div>`;
}

/* --- Keypad of the prison door --- */
function openKeypad() {
  if (G.flags.gate) { toast('Cửa phòng giam đã mở.'); return; }
  let code = '';
  G.overlay = 'keypad'; ui.overlay.className = '';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'K', 'P', 'S', 'T', '⌫', 'OK'];
  ui.overlay.innerHTML = `<div class="kp"><h2>CELL</h2><div class="kp-screen">${'<div></div>'.repeat(5)}</div>
    <div class="kp-keys">${keys.map(k => `<button data-k="${k}" class="${k === 'OK' ? 'ok' : k === '⌫' ? 'del' : ''}">${k}</button>`).join('')}</div>
    <div class="kp-msg">Nhập 5 ký tự</div></div><button class="xbtn" data-x>✕ Esc</button>`;
  const scr = ui.overlay.querySelector('.kp-screen'), msg = ui.overlay.querySelector('.kp-msg');
  const show = () => [...scr.children].forEach((d, i) => d.textContent = code[i] || '');
  const press = k => {
    SFX.key();
    if (k === '⌫') code = code.slice(0, -1);
    else if (k === 'OK') {
      if (code === '24K20') { SFX.ok(); SFX.door(); G.flags.gate = true; closeOverlay(true); dialog([L.kpok]); return; }
      SFX.wrong(); code = ''; msg.textContent = 'SAI MẬT MÃ';
      scr.classList.remove('shake'); void scr.offsetWidth; scr.classList.add('shake');
      if (D.area === AREA[G.view]) G.det = Math.min(99, G.det + 15);
      if (!G.flags.saidKp) { G.flags.saidKp = true; dialog([L.kpwrong]); }
    } else if (code.length < 5) code += k;
    show();
  };
  ui.overlay.querySelectorAll('[data-k]').forEach(b => b.onclick = () => press(b.dataset.k));
  ui.overlay.querySelector('[data-x]').onclick = () => closeOverlay();
  ui.overlay.onpointerdown = e => { if (e.target === ui.overlay) closeOverlay(); };
  G.keypad = e => {
    const k = e.key.toUpperCase();
    if (/^[0-9AKPST]$/.test(k)) press(k); else if (e.key === 'Backspace') press('⌫'); else if (e.key === 'Enter') press('OK');
  };
}
function cellDoorAct() {
  if (!G.flags.gate) return dialog([L.doorlocked]);
  go('cells', 'door');
}
function cellAct(n) {
  if (n !== 602) return dialog([L.wrongcell]);
  if (!has('key')) return dialog([L.nokey]);
  SFX.door(); G.flags.rescued = true; G.alarm = false;
  dialog([L.rescue], () => playVideo('cut3', endScreen));
}

/* ---------------- Cutscenes ---------------- */
function playVideo(name, done) {
  G.video = true; stopVoice();
  const v = ui.video; v.src = A(`video/${name}.mp4`); v.currentTime = 0;
  v.classList.remove('hidden'); ui.vskip.classList.remove('hidden');
  v.volume = Math.max(SET.sfx, SET.music);
  let finished = false;
  const end = () => { if (finished) return; finished = true; v.pause(); v.classList.add('hidden'); ui.vskip.classList.add('hidden'); G.video = false; G.skipVideo = null; done && done(); };
  v.onended = end; v.onerror = end;
  G.skipVideo = end;
  v.play().catch(() => { v.muted = true; v.play().catch(end); });
}
ui.video.addEventListener('pointerdown', () => G.skipVideo && G.skipVideo());

/* ---------------- Anh Đại patrol ---------------- */
function nextArea() { return ROUTE[(D.idx + 1) % ROUTE.length]; }
function updDai(dt) {
  const here = AREA[G.view];
  D.t -= dt * (G.alarm ? 1.8 : 1);
  if (!D.warned && D.t < 4 && nextArea() === here && D.area !== here) {
    D.warned = true; SFX.heart();
    ui.warn.textContent = `Có tiếng bước chân đang tới ${AREA_NAME[here]}...`;
  }
  if (D.t <= 0) {
    D.idx = (D.idx + 1) % ROUTE.length; D.area = ROUTE[D.idx]; D.t = STAY[D.area]; D.warned = false; D.greeted = false;
    if (D.area === here) { G.grace = Math.max(G.grace, 1.2); SFX.heart(); }
  }
}
function updDetect(dt) {
  if (G.grace > 0) G.grace -= dt;
  const here = AREA[G.view];
  const present = D.area === here && here !== 'cells';
  if (present && G.grace <= 0) {
    let r = SAFE.has(G.view) ? -40 : here === 'boss' ? 55 : 24;
    if (r > 0 && G.overlay && G.overlay !== 'pc') r += 15;
    if (SAFE.has(G.view) && !D.greeted) { D.greeted = true; playVoice('good_dai'); toast('Anh Đại: "Ừ, làm vậy mới ngoan."'); }
    G.det = clamp(G.det + r * dt, 0, 100);
  } else G.det = Math.max(0, G.det - 15 * dt);
  G.hbT -= dt;
  if (present && G.hbT <= 0) { G.hbT = 0.9 - G.det / 220; SFX.heart(); }
  if (G.det >= 100) caught();
}
function caught(reason) {
  G.det = 0; closeOverlay(true); ui.warn.classList.remove('on');
  ui.flash.classList.remove('zap'); void ui.flash.offsetWidth; ui.flash.classList.add('zap');
  dialog([L.caught], () => playVideo('cut2', () => {
    G.lives--; G.caught++;
    if (G.lives <= 0) return dialog([L.gameover], gameOver);
    if (has('key') && !G.flags.rescued) { G.inv.delete('key'); G.alarm = false; bgm('calm'); renderInv(); toast('Ông trùm đã lấy lại chùm chìa khóa.'); }
    dialog([L.afterzap], () => {
      G.view = 'desk'; G.grace = 2;
      Object.assign(D, { area: 'office', idx: 2, t: 2.5, warned: false, greeted: true });
    });
  }));
}

/* ---------------- Screens built from the group's UI art ---------------- */
const ib = (id, img, cx, cy, w, h, hw, hh) =>
  `<button class="ib" id="${id}" style="left:${cx - Math.max(w, hw || w) / 2}px;top:${cy - Math.max(h, hh || h) / 2}px;width:${Math.max(w, hw || w)}px;height:${Math.max(h, hh || h)}px">
    <img class="n" src="${A('ui/' + img + '.png')}" style="position:absolute;left:${(Math.max(w, hw || w) - w) / 2}px;top:${(Math.max(h, hh || h) - h) / 2}px;width:${w}px;height:${h}px" alt="">
    <img class="h" src="${A('ui/' + img + '_h.png')}" style="position:absolute;left:${(Math.max(w, hw || w) - (hw || w)) / 2}px;top:${(Math.max(h, hh || h) - (hh || h)) / 2}px;width:${hw || w}px;height:${hh || h}px" alt=""></button>`;
function showScreen(html, mount) { ui.screen.innerHTML = html; ui.screen.classList.remove('hidden'); ui.tip.classList.remove('on'); if (mount) mount(ui.screen); ui.screen.querySelectorAll('.ib').forEach(b => b.addEventListener('click', () => SFX.click())); }
function hideScreen() { ui.screen.classList.add('hidden'); ui.screen.innerHTML = ''; }
const inGame = () => G.mode === 'play';
const panelBg = () => inGame() ? '<div class="dim"></div>' : `<img class="bg" src="${A('ui/opt_bg.jpg')}" alt="">`;

function showMenu() {
  G.mode = 'menu'; G.paused = false; G.dlg = null; stopVoice(); closeOverlay(true);
  ui.dialog.classList.add('hidden'); ui.hud.classList.add('hidden');
  bgm('menu');
  showScreen(`<img class="bg" src="${A('ui/menu_bg.jpg')}" alt="">
    <img class="abs" src="${A('ui/logo.png')}" style="left:213px;top:207px;width:667px;height:499px" alt="Cuộc Gọi Từ Campuchia">
    ${ib('m-start', 'start', 526, 823, 276, 250)}${ib('m-opt', 'option', 722, 808, 276, 250)}`,
  s => {
    s.querySelector('#m-start').onclick = () => { ac(); startGame(); };
    s.querySelector('#m-opt').onclick = () => { ac(); showOptions(showMenu); };
  });
}
function showOptions(back) {
  showScreen(`${panelBg()}<img class="bg" src="${A('ui/opt_panel.webp')}" alt="">
    ${ib('o-sound', 'opt_sound', 947, 530, 169, 74, 256, 128)}${ib('o-tut', 'opt_tut', 958, 640, 253, 75, 256, 128)}
    ${ib('o-quit', 'opt_quit', 962, 758, 286, 85, 367, 128)}${ib('o-back', 'back', 959, 873, 82, 42, 128, 64)}`,
  s => {
    s.querySelector('#o-sound').onclick = () => showSound(() => showOptions(back));
    s.querySelector('#o-tut').onclick = () => showTutorial(() => showOptions(back));
    s.querySelector('#o-quit').onclick = () => showQuit(() => showOptions(back));
    s.querySelector('#o-back').onclick = back;
  });
}
function showSound(back) {
  const row = (key, y) => `
    <button class="ib" data-full="${key}" style="left:706px;top:${y - 36}px;width:91px;height:71px"><img class="n" src="${A('ui/snd_on.png')}" alt=""><img class="h" src="${A('ui/snd_on.png')}" style="filter:brightness(1.6)" alt=""></button>
    <div class="slider" data-s="${key}" style="left:823px;top:${y - 20}px;width:425px">
      <img class="trk" src="${A('ui/snd_track.png')}" alt=""><div class="fil"><img src="${A('ui/snd_fill.png')}" alt=""></div><img class="knob" src="${A('ui/snd_knob.png')}" alt=""></div>
    <button class="ib" data-mute="${key}" style="left:1264px;top:${y - 45}px;width:74px;height:90px"><img class="n" src="${A('ui/snd_off.png')}" alt=""><img class="h" src="${A('ui/snd_off.png')}" style="filter:brightness(1.6)" alt=""></button>`;
  showScreen(`${panelBg()}<img class="bg" src="${A('ui/snd_panel.webp')}" alt="">${row('music', 571)}${row('sfx', 724)}${ib('s-back', 'back', 959, 873, 82, 42, 128, 64)}`, s => {
    const paint = () => s.querySelectorAll('.slider').forEach(sl => {
      const v = SET[sl.dataset.s]; sl.querySelector('.fil').style.width = (v * 425) + 'px'; sl.querySelector('.knob').style.left = (v * 425) + 'px';
    });
    s.querySelectorAll('.slider').forEach(sl => {
      const setFrom = e => { const p = toStage(e); SET[sl.dataset.s] = clamp((p.x - 823) / 425, 0, 1); paint(); saveSet(); };
      sl.addEventListener('pointerdown', e => { sl.setPointerCapture(e.pointerId); setFrom(e); sl.onpointermove = setFrom; });
      sl.addEventListener('pointerup', () => { sl.onpointermove = null; SFX.click(); });
    });
    s.querySelectorAll('[data-full]').forEach(b => b.onclick = () => { SET[b.dataset.full] = 1; paint(); saveSet(); });
    s.querySelectorAll('[data-mute]').forEach(b => b.onclick = () => { SET[b.dataset.mute] = 0; paint(); saveSet(); });
    s.querySelector('#s-back').onclick = back;
    paint();
  });
}
function showTutorial(back) {
  showScreen(`${panelBg()}<img class="bg" src="${A('ui/tut_panel.webp')}" alt="">
    <div class="tut-note">Mũi tên đỏ / phím ← → ↓: đổi góc nhìn · H: gợi ý · Esc: tạm dừng<br>Anh Đại đi tuần: nghe tiếng bước chân thì về <b>bàn máy số 4</b> ngồi!</div>
    ${ib('t-back', 'back', 959, 873, 82, 42, 128, 64)}`, s => { s.querySelector('#t-back').onclick = back; });
}
function showQuit(back) {
  showScreen(`${panelBg()}<img class="bg" src="${A('ui/quit_panel.webp')}" alt="">${ib('q-yes', 'yes', 783, 646, 90, 78)}${ib('q-no', 'no', 1112, 642, 73, 84)}`, s => {
    s.querySelector('#q-yes').onclick = () => { if (inGame()) showMenu(); else { showMenu(); toast('Hẹn gặp lại!'); } };
    s.querySelector('#q-no').onclick = back;
  });
}
function showPause() {
  if (G.mode !== 'play' || G.dlg || G.video) return;
  G.paused = true; closeOverlay(true);
  showScreen(`<div class="dim"></div><img class="bg" src="${A('ui/pause_panel.webp')}" alt="">
    ${ib('p-home', 'p_home', 640, 655, 143, 205)}${ib('p-opt', 'p_opt', 956, 657, 210, 204)}${ib('p-play', 'p_play', 1259, 654, 125, 197)}`, s => {
    s.querySelector('#p-home').onclick = () => showQuit(showPause);
    s.querySelector('#p-opt').onclick = () => showOptions(showPause);
    s.querySelector('#p-play').onclick = resume;
  });
}
function resume() { G.paused = false; hideScreen(); }
function endScreen() {
  G.mode = 'end'; ui.hud.classList.add('hidden'); bgm('menu');
  showScreen(`<img class="bg" src="${A('ui/end_bg.jpg')}" alt="">
    <img class="abs" src="${A('ui/end_title.png')}" style="left:201px;top:298px;width:701px;height:295px" alt="The End">
    ${ib('e-restart', 'restart', 527, 842, 208, 200)}${ib('e-quit', 'quit', 735, 835, 208, 200)}
    <div class="end-note">Cảnh giác với lời mời "việc nhẹ lương cao" ở nước ngoài. Có nghi vấn, báo ngay cho công an (113).</div>`, s => {
    s.querySelector('#e-restart').onclick = startGame;
    s.querySelector('#e-quit').onclick = showMenu;
  });
}
function gameOver() {
  G.mode = 'end'; ui.hud.classList.add('hidden'); bgm('menu');
  showScreen(`<img class="bg" src="${A('ui/end_bg.jpg')}" alt=""><div class="over-title">BỊ LỘ RỒI!</div>
    ${ib('e-restart', 'restart', 527, 842, 208, 200)}${ib('e-quit', 'quit', 735, 835, 208, 200)}`, s => {
    s.querySelector('#e-restart').onclick = startGame;
    s.querySelector('#e-quit').onclick = showMenu;
  });
}

/* ---------------- Flow ---------------- */
function startGame() {
  hideScreen(); newGame(); renderInv(); bgm(null);
  playVideo('cut1', () => {
    G.mode = 'play'; G.view = 'office'; ui.hud.classList.remove('hidden'); bgm('calm');
    dialog([L.intro], () => {
      toast('Click vào đồ vật để tương tác · Mũi tên đỏ để đổi góc nhìn · Space: bỏ qua thoại', 5000);
      D.t = 3; G.grace = 4;
    });
  });
}
function objective() {
  const n = LETTERS.filter(has).length;
  if (has('key')) return 'Giải cứu An Yên ở phòng 602!';
  if (G.flags.gate) return 'Tìm chìa khóa phòng giam';
  if (G.flags.folder) return `Tìm 4 ký tự để mở cửa phòng giam (${n}/4)`;
  return 'Mở hồ sơ trong máy số 4';
}
function hint() {
  let t;
  if (has('key')) t = 'Ra cửa CELL ở hành lang, vào phòng giam và mở phòng 602.';
  else if (G.flags.gate) t = 'Chìa khóa treo ở đầu nai trong phòng ông trùm (cửa gỗ cạnh bảng KPI). Vào lúc hắn đi tuần chỗ khác.';
  else if (G.flags.folder) {
    const where = { cup: 'cái ly ở máy lọc nước (hành lang)', clock: 'đồng hồ (góc phòng làm việc)', k: 'bảng KPI (hành lang)', paper: 'thùng rác (góc phòng làm việc)' };
    const miss = LETTERS.filter(c => !has(c)).map(c => where[c]);
    t = miss.length ? 'Còn thiếu: ' + miss.join(' · ') : 'Nhập 2 4 K 20 vào bàn phím cạnh cửa CELL.';
  } else if (has('note')) t = 'Bấm vào màn hình máy số 4, mở folder Ho_so_nhan_su, nhập mật khẩu trên cuốn sổ.';
  else t = 'Tới bàn máy số 4, xem cuốn sổ có tờ giấy nhớ.';
  toast('💡 ' + t, 5000);
}

/* ---------------- Input ---------------- */
function arrowRects() {
  const a = VIEWS[G.view].arrows, r = [];
  if (a.down) r.push({ dir: 'down', to: a.down, x: 900, y: 940, w: 120, h: 120 });
  if (a.left) r.push({ dir: 'left', to: a.left, x: 20, y: 480, w: 120, h: 120 });
  if (a.right) r.push({ dir: 'right', to: a.right, x: 1780, y: 480, w: 120, h: 120 });
  return r;
}
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const canInteract = () => G.mode === 'play' && !G.dlg && !G.paused && !G.video && !G.busy && !G.overlay;
cv.addEventListener('pointermove', e => {
  if (!canInteract()) { G.hover = G.hoverArrow = null; cv.style.cursor = 'default'; ui.tip.classList.remove('on'); return; }
  const p = toStage(e);
  G.hoverArrow = arrowRects().find(r => inRect(p, r)) || null;
  G.hover = G.hoverArrow ? null : spotsOf(G.view).find(s => inRect(p, s)) || null;
  cv.style.cursor = (G.hover || G.hoverArrow) ? 'pointer' : 'default';
  if (G.hover) { ui.tip.textContent = lbl(G.hover); ui.tip.style.left = Math.min(p.x + 24, W - 420) + 'px'; ui.tip.style.top = (p.y + 24) + 'px'; ui.tip.classList.add('on'); }
  else ui.tip.classList.remove('on');
});
cv.addEventListener('pointerdown', e => {
  ac();
  if (G.dlg) { nextLine(); return; }
  if (!canInteract()) return;
  const p = toStage(e);
  const a = arrowRects().find(r => inRect(p, r));
  if (a) { go(a.to); return; }
  const s = spotsOf(G.view).find(s => inRect(p, s));
  if (!s) return;
  ui.tip.classList.remove('on');
  if (s.go) go(s.go, s.sfx); else s.act();
});
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (G.video && (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter')) { e.preventDefault(); G.skipVideo && G.skipVideo(); return; }
  if (G.dlg) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); nextLine(); } return; }
  if (G.overlay) {
    if (e.key === 'Escape') closeOverlay();
    else if (G.overlay === 'keypad' && G.keypad) G.keypad(e);
    return;
  }
  if (G.mode !== 'play') return;
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { G.paused ? resume() : showPause(); return; }
  if (G.paused || G.busy) return;
  const a = VIEWS[G.view].arrows;
  if (e.key === 'ArrowDown' && a.down) { e.preventDefault(); go(a.down); }
  if (e.key === 'ArrowLeft' && a.left) { e.preventDefault(); go(a.left); }
  if (e.key === 'ArrowRight' && a.right) { e.preventDefault(); go(a.right); }
  if (e.key === 'h' || e.key === 'H') hint();
});
$('#btn-pause').onclick = () => { ac(); SFX.click(); showPause(); };
$('#btn-hint').onclick = () => { if (canInteract()) hint(); };

/* ---------------- Update & render ---------------- */
function update(dt) {
  G.t += dt;
  if (G.mode !== 'play' || G.dlg || G.paused || G.video) return;
  updDai(dt);
  updDetect(dt);
  if (G.alarm) { G.countdown -= dt; if (G.countdown <= 0) { G.countdown = 0; G.alarm = false; caught(); } }
}
function drawArrow(r, hover) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, s = hover ? 1.15 : 1, bob = Math.sin(G.t * 5) * 6;
  ctx.save(); ctx.translate(cx + (r.dir === 'left' ? -bob : r.dir === 'right' ? bob : 0), cy + (r.dir === 'down' ? bob : 0));
  ctx.rotate(r.dir === 'down' ? Math.PI / 2 : r.dir === 'left' ? Math.PI : 0); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-46, -18); ctx.lineTo(8, -18); ctx.lineTo(8, -44); ctx.lineTo(52, 0); ctx.lineTo(8, 44); ctx.lineTo(8, 18); ctx.lineTo(-46, 18); ctx.closePath();
  const g = ctx.createLinearGradient(-46, 0, 52, 0); g.addColorStop(0, '#e46a3c'); g.addColorStop(1, '#d6332a');
  ctx.fillStyle = g; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  ctx.restore();
}
function render() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (G.mode !== 'play' && G.mode !== 'end') return;
  const v = VIEWS[G.view], img = IMG[G.view];
  if (img) ctx.drawImage(img, 0, 0, W, H);
  if (v.draw) v.draw();
  // Anh Đại standing in the wide views of the area he is patrolling
  if (v.dai && D.area === AREA[G.view] && IMG.dai) {
    const d = IMG.dai, h = v.dai.h, w = d.width * h / d.height;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.drawImage(d, v.dai.x - w / 2, H - h + 40, w, h); ctx.restore();
  }
  if (G.hover && canInteract()) {
    const s = G.hover, p = 0.55 + 0.45 * Math.sin(G.t * 6);
    ctx.save(); ctx.strokeStyle = `rgba(231,184,90,${p})`; ctx.lineWidth = 5; ctx.setLineDash([16, 10]); ctx.strokeRect(s.x, s.y, s.w, s.h); ctx.restore();
  }
  if (G.mode === 'play' && !G.dlg) for (const r of arrowRects()) drawArrow(r, G.hoverArrow && G.hoverArrow.dir === r.dir);
  if (G.alarm) { ctx.fillStyle = `rgba(200,30,30,${0.07 + 0.05 * Math.sin(G.t * 8)})`; ctx.fillRect(0, 0, W, H); }
}
function updHUD() {
  if (G.mode !== 'play') return;
  ui.obj.textContent = objective();
  ui.count.textContent = G.alarm ? '⚠ ' + fmt(G.countdown) : '';
  ui.detFill.style.width = G.det + '%';
  ui.lives.textContent = '❤️'.repeat(Math.max(0, G.lives)) + '🖤'.repeat(Math.max(0, 3 - G.lives));
  const here = AREA[G.view];
  const coming = D.warned && D.area !== here;
  const present = D.area === here && here !== 'cells' && !G.dlg;
  ui.warn.classList.toggle('on', !G.dlg && (coming || (present && !SAFE.has(G.view))));
  if (present && !SAFE.has(G.view)) ui.warn.textContent = 'Anh Đại đang ở đây! Về bàn máy số 4!';
  ui.vign.style.opacity = present && !SAFE.has(G.view) ? Math.min(1, 0.2 + G.det / 90) : 0;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render(); updHUD();
  requestAnimationFrame(frame);
}

(async function boot() {
  newGame(); G.mode = 'loading';
  await loadAssets(p => { $('#load-fill').style.width = Math.round(p * 100) + '%'; });
  try { await document.fonts.ready; } catch (e) { /* ignore */ }
  $('#loading').remove();
  showMenu();
  requestAnimationFrame(frame);
})();
