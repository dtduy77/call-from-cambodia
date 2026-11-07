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
const ROOMS = ['gate', 'office', 'desk', 'desk2', 'pc', 'corner', 'hallOffice', 'hall', 'hallWater', 'hallKPI', 'boss', 'bossLeft', 'bossRight', 'cellDoor', 'cells'];
const IMG = {};
const IMG_SRC = {
  ...Object.fromEntries(ROOMS.map(r => [r, A(`rooms/${r}.jpg`)])),
  dai: A('chars/dai.png'), keys: A('props/keys.png'),
};
function loadAssets(onProgress) {
  const extra = ['props/binder.png', 'props/clock.png', 'props/paper20.png', 'props/k.png', 'props/cup.png', 'chars/yen.png',
    'ui/box_ti.png', 'ui/box_dai.png', 'ui/box_yen.png', 'ui/menu_bg.jpg', 'ui/logo.png', 'ui/start.png', 'ui/start_h.png', 'ui/option.png', 'ui/option_h.png',
    'ui/opt_bg.jpg', 'ui/opt_panel.webp', 'ui/snd_panel.webp', 'ui/tut_panel.webp', 'ui/quit_panel.webp', 'ui/pause_panel.webp', 'ui/end_bg.jpg', 'ui/end_title.png', 'ui/mission.jpg'];
  const outl = Object.keys(typeof OUTLINE === 'object' ? OUTLINE : {}).map(k => ['ol:' + k, A(`outline/${k}.png`)]);
  const all = [...Object.entries(IMG_SRC), ...extra.map(p => [p, A(p)]), ...outl];
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
  ring() { for (let i = 0; i < 2; i++) for (let k = 0; k < 10; k++) { tone(1320, 0.05, 'sine', 0.12, i * 0.9 + k * 0.06); tone(1760, 0.05, 'sine', 0.08, i * 0.9 + k * 0.06 + 0.03); } },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.12, i * 0.22)); },
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
const AREA = { office: 'office', desk: 'office', desk2: 'office', pc: 'office', corner: 'office', hallOffice: 'hall', hall: 'hall', hallWater: 'hall', hallKPI: 'hall', cellDoor: 'hall', boss: 'boss', bossLeft: 'boss', bossRight: 'boss', cells: 'cells', gate: 'outside' };
const SAFE = new Set(['pc']); // ngồi đúng máy 04 thì an toàn
const ROUTE = ['boss', 'hall', 'office', 'hall'];
const STAY = { boss: 14, hall: 7, office: 9 };
const AREA_NAME = { office: 'phòng làm việc', hall: 'hành lang', boss: 'phòng ông trùm', cells: 'phòng giam' };
const LETTERS = ['cup', 'clock', 'k', 'paper'];

function newGame() {
  Object.assign(G, {
    mode: 'play', view: 'office', inv: new Set(), flags: {}, lives: 3, det: 0, caught: 0, grace: 0,
    alarm: false, countdown: 0, overlay: null, dlg: null, paused: false, video: false, busy: false, t: 0, hbT: 0, hover: null, hoverArrow: null,
  });
  Object.assign(D, { area: 'hall', idx: 3, t: 9999, warned: false, greeted: true });
}
const has = id => G.inv.has(id);

/* ---------------- Views & hotspots (1920×1080 art coordinates) ---------------- */
// nav: NF = đi tới (mũi tên hướng lên, đặt ngay chỗ đi vào), NL / NR = quay trái / phải (mép màn hình), NB = quay lại (mũi tên chữ U ở giữa đáy)
const NF = (x, y, to, label, o = {}) => ({ dir: 'fwd', x, y, to, label, ...o });
const NL = (to, label, o = {}) => ({ dir: 'left', x: 86, y: 540, to, label, ...o });
const NR = (to, label, o = {}) => ({ dir: 'right', x: 1834, y: 540, to, label, ...o });
const NB = (to, label = 'Quay lại') => ({ dir: 'back', x: 960, y: 1000, to, label });
const VIEWS = {
  gate: { nav: [NF(960, 820, () => enterCompound(), 'Vào khu nhà'), NB(() => dialog([L.notyet]), 'Bỏ về')], spots: [
    { x: 330, y: 330, w: 1320, h: 560, label: 'Cổng khu nhà', act: () => enterCompound() },
  ] },
  hall: { dai: { x: 930, h: 720 }, nav: [
    NL('hallWater', 'Máy lọc nước', { lock: true }),
    NF(800, 760, 'cellDoor', 'Cửa phòng giam (CELL)', { lock: true }),
    NF(1235, 760, 'hallKPI', 'Bảng KPI · cửa gỗ', { lock: true }),
    NR('hallOffice', 'Văn phòng (máy 04)'),
  ], spots: [
    { x: 273, y: 240, w: 196, h: 415, label: 'Máy lọc nước', go: 'hallWater', lock: true },
    { x: 655, y: 300, w: 403, h: 360, label: 'Cửa phòng giam (CELL)', go: 'cellDoor', lock: true },
    { x: 1102, y: 251, w: 294, h: 404, label: 'Bảng KPI và cửa gỗ', go: 'hallKPI', lock: true },
    { x: 1495, y: 98, w: 403, h: 666, label: 'Cửa OFFICE', go: 'hallOffice' },
  ] },
  hallOffice: { dai: { x: 400, h: 860 }, nav: [NF(1160, 930, 'pc', 'Vào ngồi máy 04'), NL('hall', 'Hành lang')], spots: [
    { x: 720, y: 153, w: 894, h: 785, label: 'Vào ngồi máy 04', go: 'pc' },
  ] },
  // Văn phòng theo prototype Figma (f06 → f13): vào là ngồi ngay máy 04 của Tí;
  // quay phải: bàn dán giấy note (slide 35) → bàn có cuốn sổ St5K; quay trái: toàn cảnh (slide 36) → góc bảng ghim.
  pc: { nav: [NL('office', 'Nhìn quanh văn phòng'), NR('desk', 'Bàn bên phải')], spots: [
    { x: 535, y: 170, w: 330, h: 64, label: 'KICH_BAN', act: () => openFolder('kichban') },
    { x: 535, y: 246, w: 330, h: 64, label: 'DANH_SACH', act: () => openFolder('danhsach') },
    { x: 535, y: 322, w: 330, h: 64, label: 'HO_SO_MAT', act: () => openFolder('hoso') },
    { x: 535, y: 398, w: 330, h: 64, label: 'THUNG_RAC', act: () => openFolder('rac') },
  ], draw: drawPcLabels },
  desk: { nav: [NL('pc', 'Về máy 04'), NR('desk2', 'Bàn kế tiếp')], spots: [
    { x: 235, y: 45, w: 640, h: 590, label: 'Máy bàn bên', act: () => dialog([L.desk1]) },
  ] },
  desk2: { nav: [NL('desk', 'Quay lại')], spots: [
    { x: 60, y: 165, w: 555, h: 630, label: 'Máy bàn bên', act: () => dialog([L.desk2]) },
    { x: 1045, y: 470, w: 215, h: 300, label: 'Cuốn sổ', act: () => collect('note') },
  ] },
  office: { dai: { x: 760, h: 880 }, nav: [
    NF(1300, 670, 'corner', 'Góc bảng ghim · đồng hồ'),
    NF(870, 650, 'hall', 'Ra hành lang'),
    NR('pc', 'Về máy 04'),
  ], spots: [
    // chỉ máy số 4 (màn hình có thư mục) mới mở giao diện thư mục; 3 máy còn lại ra góc xéo bàn bên
    { x: 235, y: 735, w: 300, h: 170, label: 'Máy số 4 (của mình)', go: 'pc' },
    { x: 545, y: 735, w: 340, h: 170, label: 'Máy bàn khác', go: 'desk' },
    { x: 1030, y: 735, w: 290, h: 170, label: 'Máy bàn khác', go: 'desk' },
    { x: 1335, y: 735, w: 295, h: 170, label: 'Máy bàn khác', go: 'desk' },
    { x: 1080, y: 458, w: 447, h: 218, label: 'Bảng ghim và đồng hồ', go: 'corner' },
  ] },
  corner: { nav: [NL('office', 'Quay lại văn phòng')], spots: [
    { x: 268, y: 100, w: 576, h: 350, label: 'Bảng ghim', act: () => dialog([L.board]) },
    { x: 980, y: 40, w: 300, h: 320, label: 'Đồng hồ', shape: 'ellipse', act: () => collect('clock') },
    { x: 1150, y: 605, w: 300, h: 380, label: 'Thùng rác', act: () => collect('paper') },
  ] },
  hallWater: { nav: [NB('hall')], spots: [
    { x: 1190, y: 630, w: 110, h: 150, label: 'Cái ly', act: () => collect('cup') },
  ] },
  hallKPI: { dai: { x: 1140, h: 900 }, nav: [NF(1140, 900, 'boss', 'Phòng ông trùm', { sfx: 'door' }), NB('hall')], spots: [
    { x: 22, y: 76, w: 698, h: 491, label: 'Bảng KPI', act: () => collect('k') },
    { x: 862, y: 76, w: 556, h: 760, label: 'Cửa phòng ông trùm', go: 'boss', sfx: 'door' },
  ] },
  boss: { dai: { x: 900, h: 900 }, nav: [NL('bossLeft', 'Góc làm việc'), NR('bossRight', 'Góc sofa'), NB('hallKPI', 'Ra hành lang')], spots: [
    { x: 33, y: 327, w: 665, h: 620, label: 'Góc làm việc', go: 'bossLeft' },
    { x: 1222, y: 262, w: 560, h: 685, label: 'Góc sofa', go: 'bossRight' },
  ] },
  bossLeft: { nav: [NR('bossRight', 'Góc sofa'), NB('boss')], spots: [] },
  bossRight: { nav: [NL('bossLeft', 'Góc làm việc'), NB('boss')], spots: [
    { x: 720, y: 60, w: 340, h: 420, label: 'Đầu hươu', cond: () => !has('key'), act: () => collect('key') },
  ] },
  cellDoor: { nav: [NF(840, 830, () => cellDoorAct(), 'Vào phòng giam'), NB('hall')], spots: [
    { x: 436, y: 120, w: 797, h: 700, label: () => G.flags.gate ? 'Vào phòng giam' : 'Cửa phòng giam', act: () => cellDoorAct() },
    { x: 1385, y: 295, w: 360, h: 272, label: 'Bàn phím mật mã', act: () => openKeypad() },
  ], draw: drawCellBars },
  cells: { nav: [NB('cellDoor')], spots: [
    { x: 985, y: 125, w: 215, h: 800, label: 'Phòng 602', act: () => cellAct(602) },
    { x: 760, y: 365, w: 85, h: 560, label: 'Phòng 609', act: () => cellAct(609) },
    { x: 630, y: 450, w: 50, h: 480, label: 'Phòng 601', act: () => cellAct(601) },
    { x: 340, y: 510, w: 145, h: 390, label: 'Buồng cuối dãy (603)', act: () => cellAct(603) },
  ] },
};
const lbl = s => typeof s.label === 'function' ? s.label() : s.label;
const spotsOf = v => VIEWS[v].spots.filter(s => !s.cond || s.cond());

function drawPcLabels() {
  ctx.font = '30px VT323, monospace'; ctx.fillStyle = '#2b2b24';
  ['KICH_BAN', 'DANH_SACH', 'HO_SO_MAT' + (G.flags.folder ? '' : ' 🔒'), 'THUNG_RAC'].forEach((t, i) => ctx.fillText(t, 618, 214 + i * 76));
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
    setTimeout(() => {
      G.busy = false;
    }, 120);
  }, 220);
}

/* ---------------- Dialogue (only on puzzle-critical moments) ---------------- */
const WHO = {
  ti: { name: 'TÍ CÔNG AN', box: 'ui/box_ti.png', side: 'l', fig: 'chars/ti.png', figSide: 'right' },
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
  gate1: { who: 'ti', v: 'gate1_ti', text: 'Tin báo nói An Yên bị nhốt trong khu này. Nhìn cái cổng thôi đã thấy mờ ám rồi.' },
  gate2: { who: 'ti', v: 'gate2_ti', text: 'Mình giả bộ đi xin việc để lọt vô trong. Diễn cho khéo nghen Tí, đừng để lộ cái mặt công an.' },
  notyet: { who: 'ti', v: 'notyet_ti', text: 'Chưa cứu được An Yên mà về là bị sếp la cho thúi đầu. Vô thôi!' },
  wake: { who: 'dai', v: 'wake_dai', text: 'Tỉnh rồi hả? Từ nay mày làm cho tao. Ở đây tao nói gì nghe nấy, nghe chưa?' },
  art: { who: 'dai', v: 'art_dai', text: 'Nhớ nè: tất cả việc tụi mình đang làm hông phải lừa đảo. Đó là nghệ thuật thuyết phục!' },
  intro: { who: 'dai', v: 'intro_dai', text: 'Ra văn phòng ngồi máy 04 mà làm. Thấy lười là tao chích điện cho dựng tóc luôn á!' },
  endure: { who: 'ti', v: 'endure_ti', text: '(Nhịn... nhịn... Ra văn phòng mở máy 04 coi có manh mối gì hông.)' },
  watch: { who: 'ti', v: 'watch_ti', text: 'Ổng đang ngó mình kìa. Ra máy 04 làm bộ chăm chỉ cái đã.' },
  good: { who: 'dai', v: 'good_dai', text: 'Ừ, ngồi làm vậy mới ngoan nghen.' },
  note: { who: 'ti', v: 'note_ti', text: 'Cuốn sổ có dán mật khẩu: St5K. Dán ngay trên bàn luôn, bảo mật dữ thần!' },
  note2: { who: 'ti', v: 'note2_ti', text: 'Chắc là mật khẩu thư mục bị khóa trong máy 04. Thử liền!' },
  desk1: { who: 'ti', v: 'desk1_ti', text: 'Máy này tắt rồi. Dán đầy giấy ghi số điện thoại lạ, chắc là danh sách người bị lừa.' },
  desk2: { who: 'ti', v: 'desk2_ti', text: 'Máy bàn bên còn mở app nhắn tin, toàn kịch bản dụ người ta chuyển tiền. Ghê thiệt!' },
  pcwrong: { who: 'ti', v: 'pcwrong_ti', text: 'Sai rồi. Mật khẩu chắc ghi đâu đó quanh mấy cái bàn này thôi.' },
  pcopen: { who: 'ti', v: 'pcopen_ti', text: 'Mở được rồi! Hồ sơ ghi An Yên bị nhốt ở buồng cuối dãy phòng giam.' },
  pcopen2: { who: 'ti', v: 'pcopen2_ti', text: 'Có cả ghi chú cách ghép mã cửa. Còn chìa khóa buồng thì ông Đại cất trong phòng riêng.' },
  board: { who: 'ti', v: 'board_ti', text: 'Bảng ghim toàn ảnh thẻ người làm ở đây... Ủa, có cả ảnh An Yên nè.' },
  clock: { who: 'ti', v: 'clock_ti', text: 'Đồng hồ hư, kim giây cứ giật hoài ở số 4. Mà sao số 4 lại tô màu xanh ta?' },
  paper: { who: 'ti', v: 'paper_ti', text: 'Trong thùng rác có mẩu giấy ghi số 20 mực xanh. Đi điều tra mà như đi lượm ve chai!' },
  cup: { who: 'ti', v: 'cup_ti', text: 'Cái ly có số 2 viết mực xanh, y chang mẩu giấy số 20.' },
  k: { who: 'ti', v: 'k_ti', text: 'Chữ K trong KPI tô vàng chóe vậy ai mà hông thấy. Thêm một manh mối!' },
  doorlocked: { who: 'ti', v: 'doorlocked_ti', text: 'Cửa khóa mã rồi. Phải ghép mã theo ghi chú trong hồ sơ mật.' },
  kpok: { who: 'ti', v: 'kpok_ti', text: 'Bíp! Song sắt kéo lên rồi. Ngon lành!' },
  kpwrong: { who: 'ti', v: 'kpwrong_ti', text: 'Sai mã rồi. Bình tĩnh, coi lại thứ tự trong ghi chú.' },
  skull: { who: 'ti', v: 'skull_ti', text: 'Cái đầu hươu này hình như ngậm cái gì trong miệng...' },
  key: { who: 'ti', v: 'keys_ti', text: 'Chùm chìa khóa nè! Giấu trong miệng đầu hươu, ông Đại cũng sáng tạo ghê.' },
  nokey: { who: 'yen', v: 'nokey_yen', text: 'Anh ơi cứu em! Chìa khóa ông Đại giữ, ổng cất trong phòng riêng á.' },
  wrongcell: { who: 'ti', v: 'wrongcell_ti', text: 'Hông phải buồng này. An Yên ở buồng cuối dãy lận.' },
  yen1: { who: 'yen', v: 'yen1_yen', text: 'Anh... anh tới cứu em thiệt hả?' },
  ti1: { who: 'ti', v: 'ti1_ti', text: 'Anh là Tí, công an. Gia đình em báo tin rồi. Mình đi liền!' },
  yen2: { who: 'yen', v: 'yen2_yen', text: 'Em tưởng không bao giờ được về nhà nữa...' },
  yen3: { who: 'yen', v: 'yen3_yen', text: 'Anh cứu em xong nhớ cho em xin số nghen, em về em viết review năm sao!' },
  ti2: { who: 'ti', v: 'ti2_ti', text: 'Theo sát anh nghen. Ra khỏi cổng là an toàn rồi!' },
  alo: { who: 'ti', v: 'alo_ti', text: 'Ủa alo, gì căng vậy?' },
  gone: { who: 'ti', v: 'gone_ti', text: 'Hắn ta đi rồi... phải hành động lẹ thôi.' },
  caught: { who: 'dai', v: 'caught_dai', text: 'Ê, lảng vảng đây làm gì đó mậy? Ăn điện nè!' },
  afterzap: { who: 'dai', v: 'afterzap_dai', text: 'Về chỗ ngồi chạy KPI cho tao, lẹ!' },
  gameover: { who: 'dai', v: 'gameover_dai', text: 'Ba lần rồi đó nghen. Thôi ở lại đây làm cho tao luôn đi!' },
};

/* ---------------- Inventory ---------------- */
const ITEMS = {
  note: { img: 'props/binder.png', t: 'St5K', name: 'Sổ St5K' },
  file: { img: 'chars/yen.png', t: '', name: 'Hồ sơ An Yên' },
  cup: { img: 'props/cup.png', t: '2', name: 'Ly số 2' },
  clock: { img: 'props/clock.png', t: '4', name: 'Đồng hồ số 4' },
  k: { img: 'props/k.png', t: 'K', name: 'Chữ K' },
  paper: { img: 'props/paper20.png', t: '20', name: 'Giấy số 20' },
  key: { img: 'props/keys.png', t: '', name: 'Chùm chìa khóa' },
};
function renderInv() {
  ui.inv.innerHTML = `<div class="lbl">ĐỒ ĐÃ LƯỢM</div><div class="slots">` + Object.entries(ITEMS).map(([id, it]) => has(id)
    ? `<div class="slot" title="${it.name}"><img class="${id === 'file' ? 'photo' : ''}" src="${A(it.img)}" alt="">${it.t ? `<span class="t">${it.t}</span>` : ''}</div>`
    : `<div class="slot empty" title="Chưa có">?</div>`).join('') + '</div>';
}
const ZOOM = { note: 'props/binder.png', clock: 'props/clock.png', paper: 'props/paper20.png', cup: 'props/cup.png', k: 'props/k.png', key: 'props/keys.png' };
function collect(id) {
  if (has(id)) { showZoom(ZOOM[id]); return; }
  const finish = () => {
    closeOverlay(); G.inv.add(id); renderInv();
    if (id === 'key') { G.alarm = true; G.countdown = 60; bgm('alarm'); toast('Ông trùm sắp phát hiện mất chìa khóa! Nhanh lên!', 3200); }
  };
  if (id === 'key') {
    return dialog([L.skull], () => { showZoom(ZOOM.key); SFX.pick(); dialog([L.key], finish); });
  }
  showZoom(ZOOM[id]);
  SFX.pick();
  dialog(id === 'note' ? [L.note, L.note2] : [L[id]], finish);
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
    if (G.flags.folder) return win('HỒ SƠ MẬT', profileHTML());
    const wb = win('NHẬP MẬT KHẨU', `Thư mục được bảo vệ. Nhập mật khẩu:<br><input id="pw" maxlength="8" autocomplete="off" spellcheck="false"><button id="pwok">MỞ</button><div id="pwmsg"></div>`);
    const inp = wb.querySelector('#pw'); setTimeout(() => inp.focus(), 50);
    const submit = () => {
      if (inp.value.trim().toLowerCase() === 'st5k') {
        SFX.ok(); G.flags.folder = true; G.inv.add('file'); renderInv();
        wb.innerHTML = profileHTML(); ui.overlay.querySelector('.tb span').textContent = 'HỒ SƠ MẬT'; dialog([L.pcopen, L.pcopen2]);
      } else {
        SFX.wrong(); wb.querySelector('#pwmsg').innerHTML = '<span class="err">Sai mật khẩu!</span>';
        const w = ui.overlay.querySelector('.pcwin'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
        inp.select(); if (!G.flags.saidWrong) { G.flags.saidWrong = true; dialog([L.pcwrong], () => inp.focus()); }
      }
    };
    wb.querySelector('#pwok').onclick = submit;
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key.length === 1 || e.key === 'Backspace') SFX.key(); if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeOverlay(); });
  } else if (f === 'kichban') {
    win('KỊCH BẢN GỌI ĐIỆN', `Bước 1: Xưng là nhân viên ngân hàng / công an / bưu điện.<br>Bước 2: Báo "tài khoản có dấu hiệu bất thường" hoặc "trúng thưởng".<br>Bước 3: Hối thúc, đe dọa, không cho nạn nhân thời gian suy nghĩ.<br>Bước 4: Yêu cầu chuyển tiền vào "tài khoản an toàn".<br><br><span class="hl">(Tí: Nhớ kỹ. Ra ngoài phải cảnh báo mọi người.)</span>`);
  } else if (f === 'danhsach') {
    win('DANH SÁCH KHÁCH HÀNG', `0912xxx – Bà N., 67 tuổi — đã chuyển 2 lần<br>0906xxx – Anh T., sinh viên — đang "chăm sóc"<br>0903xxx – Chị H. — từ chối, gọi lại sau<br><br><span class="err">(Hàng trăm số điện thoại nữa... Toàn là người thật.)</span>`);
  } else {
    win('THÙNG RÁC', 'Trống rỗng. Ai đó đã xóa sạch dấu vết.');
  }
}
function profileHTML() {
  return `<div class="profile"><div class="ph" style="background-image:url(${A('chars/yen.png')})"></div>
    <div>HỒ SƠ: <b>NGUYEN AN YEN</b> — mã 01<br>Tình trạng: không chịu làm việc, KPI 6% — <span class="err">FAILED</span><br>Xử lý: nhốt <span class="hl"><b>BUỒNG CUỐI DÃY</b></span> khu giam.</div></div>
    <div style="margin-top:10px">GHI CHÚ AN NINH — MÃ CỬA KHU GIAM:<br><span class="hl">[số trên mẩu giấy trong thùng rác] + [số kim đồng hồ văn phòng] + [số trên ly nước hành lang] + [chữ cái tô vàng trên bảng KPI]</span><br><br>Chìa khóa các buồng: anh Đại giữ, cất trong phòng riêng.</div>`;
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
      if (code === '2042K') { SFX.ok(); SFX.door(); G.flags.gate = true; closeOverlay(true); dialog([L.kpok]); return; }
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
  if (n !== 603) return dialog([L.wrongcell]);
  if (!has('key')) return dialog([L.nokey]);
  SFX.door(); G.flags.rescued = true; G.alarm = false;
  dialog([L.yen1, L.ti1, L.yen2, L.ti2, L.yen3], () => playVideo('cut3', missionComplete));
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
    const left = D.area === here;
    D.idx = (D.idx + 1) % ROUTE.length; D.area = ROUTE[D.idx]; D.t = STAY[D.area]; D.warned = false; D.greeted = false;
    if (left && D.area !== here && !G.flags.saidGone && !G.overlay) { G.flags.saidGone = true; dialog([L.gone]); }
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
    if (SAFE.has(G.view) && !D.greeted) { D.greeted = true; playVoice('good_dai'); toast('Anh Đại: "' + L.good.text + '"'); }
    G.det = clamp(G.det + r * dt, 0, 100);
  } else G.det = Math.max(0, G.det - 15 * dt);
  G.hbT -= dt;
  if (present && G.hbT <= 0) { G.hbT = 0.9 - G.det / 220; SFX.heart(); }
  if (G.det >= 100) caught();
}
function caught(reason) {
  G.det = 0; closeOverlay(true); ui.warn.classList.remove('on');
  ui.flash.classList.remove('zap'); void ui.flash.offsetWidth; ui.flash.classList.add('zap');
  dialog([L.caught, L.alo], () => playVideo('cut2', () => {
    G.lives--; G.caught++;
    if (G.lives <= 0) return dialog([L.gameover], gameOver);
    if (has('key') && !G.flags.rescued) { G.inv.delete('key'); G.alarm = false; bgm('calm'); renderInv(); toast('Ông trùm đã lấy lại chùm chìa khóa.'); }
    dialog([L.afterzap], () => {
      G.view = 'pc'; G.grace = 2;
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
    ${ib('o-sound', 'opt_sound', 947, 530, 169, 74)}${ib('o-tut', 'opt_tut', 958, 640, 253, 75)}
    ${ib('o-quit', 'opt_quit', 962, 758, 286, 85)}${ib('o-back', 'back', 959, 873, 82, 42)}`,
  s => {
    s.querySelector('#o-sound').onclick = () => showSound(() => showOptions(back));
    s.querySelector('#o-tut').onclick = () => showTutorial(() => showOptions(back));
    s.querySelector('#o-quit').onclick = () => showQuit(() => showOptions(back));
    s.querySelector('#o-back').onclick = back;
  });
}
function showSound(back) {
  // một nút loa (bật/tắt, đổi hình theo âm lượng) + thanh kéo + phần trăm
  const row = (key, y) => `
    <button class="ib snd-ico" data-mute="${key}" style="left:700px;top:${y - 40}px;width:96px;height:80px"><img alt=""></button>
    <div class="vol" data-s="${key}" style="left:830px;top:${y - 30}px"><div class="vt"><div class="vf"></div><div class="vk"></div></div></div>
    <div class="vpct" data-p="${key}" style="left:1296px;top:${y - 26}px"></div>`;
  showScreen(`${panelBg()}<img class="bg" src="${A('ui/snd_panel.webp')}" alt="">${row('music', 571)}${row('sfx', 724)}${ib('s-back', 'back', 959, 873, 82, 42)}`, s => {
    const last = { music: SET.music || 0.6, sfx: SET.sfx || 0.9 };
    const paint = () => {
      s.querySelectorAll('.vol').forEach(sl => {
        const v = SET[sl.dataset.s];
        sl.querySelector('.vf').style.width = (v * 100) + '%'; sl.querySelector('.vk').style.left = (v * 100) + '%';
      });
      s.querySelectorAll('[data-p]').forEach(d => d.textContent = Math.round(SET[d.dataset.p] * 100) + '%');
      s.querySelectorAll('[data-mute]').forEach(bt => {
        const on = SET[bt.dataset.mute] > 0;
        const im = bt.querySelector('img'); im.src = A(on ? 'ui/snd_on.png' : 'ui/snd_off.png');
        bt.title = on ? 'Tắt tiếng' : 'Bật tiếng';
      });
    };
    s.querySelectorAll('.vol').forEach(sl => {
      const key = sl.dataset.s, trk = sl.querySelector('.vt');
      const setFrom = e => {
        const r = trk.getBoundingClientRect();
        SET[key] = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 100) / 100;
        if (SET[key] > 0) last[key] = SET[key];
        paint(); applyVolumes();
      };
      sl.addEventListener('pointerdown', e => { e.preventDefault(); sl.setPointerCapture(e.pointerId); sl.classList.add('drag'); setFrom(e); });
      sl.addEventListener('pointermove', e => { if (sl.hasPointerCapture(e.pointerId)) setFrom(e); });
      const end = e => { if (!sl.classList.contains('drag')) return; sl.classList.remove('drag'); saveSet(); if (key === 'sfx') SFX.click(); };
      sl.addEventListener('pointerup', end); sl.addEventListener('pointercancel', end);
    });
    s.querySelectorAll('[data-mute]').forEach(bt => bt.onclick = () => {
      const k = bt.dataset.mute; SET[k] = SET[k] > 0 ? 0 : last[k]; paint(); saveSet();
    });
    s.querySelector('#s-back').onclick = back;
    paint();
  });
}
function showTutorial(back) {
  showScreen(`${panelBg()}<img class="bg" src="${A('ui/tut_panel.webp')}" alt="">
    <div class="tut-note"><b>MẸO NHỎ</b>
      <p><span class="k">➜</span> Mũi tên đỏ: đi tới / quay trái phải</p>
      <p><span class="k">↩</span> Mũi tên chữ U: quay lại</p>
      <p><span class="k">H</span> Gợi ý &nbsp; <span class="k">Esc</span> Tạm dừng</p>
      <p class="warn">Nghe tiếng bước chân là chạy về <b>bàn máy 04</b> ngồi liền!</p></div>
    ${ib('t-back', 'back', 959, 873, 82, 42)}`, s => { s.querySelector('#t-back').onclick = back; });
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
function missionComplete() {
  G.mode = 'end'; ui.hud.classList.add('hidden'); SFX.ok();
  showScreen(`<img class="bg" src="${A('ui/mission.jpg')}" alt="Mission Complete" style="cursor:pointer">`, s => {
    let done = false; const next = () => { if (!done) { done = true; endScreen(); } };
    s.querySelector('.bg').onclick = next; setTimeout(next, 3500);
  });
}
function endScreen() {
  G.mode = 'end'; ui.hud.classList.add('hidden'); bgm('menu');
  // giống menu chính: chữ The End trên màn hình máy tính, 2 tờ note Restart / Quit bên dưới
  showScreen(`<img class="bg" src="${A('ui/menu_bg.jpg')}" alt="">
    <img class="abs" src="${A('ui/end_title.png')}" style="left:201px;top:298px;width:701px;height:295px" alt="The End">
    ${ib('e-restart', 'restart', 527, 842, 208, 200)}${ib('e-quit', 'quit', 722, 842, 208, 200)}`, s => {
    s.querySelector('#e-restart').onclick = startGame;
    s.querySelector('#e-quit').onclick = showMenu;
  });
}
function gameOver() {
  G.mode = 'end'; ui.hud.classList.add('hidden'); bgm('menu'); SFX.lose();
  showScreen(`<img class="bg" src="${A('ui/menu_bg.jpg')}" alt=""><div class="over-title">BỊ LỘ RỒI!</div>
    ${ib('e-restart', 'restart', 527, 842, 208, 200)}${ib('e-quit', 'quit', 722, 842, 208, 200)}`, s => {
    s.querySelector('#e-restart').onclick = startGame;
    s.querySelector('#e-quit').onclick = showMenu;
  });
}

/* ---------------- Flow ---------------- */
function enterCompound() {
  if (G.flags.entered) return;
  G.flags.entered = true; ui.hud.classList.add('hidden');
  playVideo('cut2', () => {
    G.view = 'hall'; ui.hud.classList.remove('hidden');
    dialog([L.wake, L.art, L.intro, L.endure], () => { D.t = 3; G.grace = 4; D.greeted = false; });
  });
}
function startGame() {
  hideScreen(); newGame(); renderInv(); bgm(null); G.mode = 'intro';
  SFX.ring(); // chuông điện thoại reo: Tí nhận cuộc gọi giao nhiệm vụ
  ui.fade.classList.add('on');
  setTimeout(() => { ui.fade.classList.remove('on'); startCut1(); }, 1900);
}
function startCut1() {
  playVideo('cut1', () => {
    G.mode = 'play'; G.view = 'gate'; ui.hud.classList.remove('hidden'); bgm('calm');
    dialog([L.gate1, L.gate2], () => toast('Click vào đồ vật để tương tác · Mũi tên đỏ để đổi góc nhìn · Space: bỏ qua thoại', 5000));
  });
}
function objective() {
  const n = LETTERS.filter(has).length;
  if (has('key')) return 'Giải cứu An Yên ở buồng cuối dãy.';
  if (G.flags.gate) return 'Lấy chìa khóa buồng giam trong phòng anh Đại.';
  if (G.flags.folder) return `Tìm 4 manh mối và mở cửa khu phòng giam. (${n}/4)`;
  if (G.flags.entered) return 'Vào văn phòng, mở thư mục bị khóa trong máy 04.';
  return 'Vào khu nhà tìm An Yên.';
}
function hint() {
  let t;
  if (has('key')) t = 'Ra cửa CELL ở hành lang, vào phòng giam, mở buồng cuối dãy (603).';
  else if (G.flags.gate) t = 'Chìa khóa giấu trong miệng đầu hươu ở phòng anh Đại (cửa gỗ cạnh bảng KPI). Vào lúc hắn đi tuần chỗ khác.';
  else if (G.flags.folder) {
    const where = { cup: 'cái ly ở máy lọc nước (hành lang)', clock: 'đồng hồ (góc phòng làm việc)', k: 'bảng KPI (hành lang)', paper: 'thùng rác (góc phòng làm việc)' };
    const miss = LETTERS.filter(c => !has(c)).map(c => where[c]);
    t = miss.length ? 'Còn thiếu: ' + miss.join(' · ') : 'Ghép theo ghi chú: giấy (20) + đồng hồ (4) + ly (2) + chữ (K) = 2042K. Nhập ở bàn phím cạnh cửa CELL.';
  } else if (has('note')) t = 'Quay trái về máy 04, mở thư mục HO_SO_MAT, nhập mật khẩu trên cuốn sổ.';
  else if (G.flags.entered) t = 'Vào văn phòng (cửa OFFICE) là tới máy 04. Quay phải 2 lần tới bàn có cuốn sổ dán mật khẩu.';
  else t = 'Bấm vào cổng để vào khu nhà.';
  toast('💡 ' + t, 5000);
}

/* ---------------- Input ---------------- */
const arrowRects = () => VIEWS[G.view].nav.map(n => ({ ...n, x: n.x - 65, y: n.y - 65, w: 130, h: 130, cx: n.x, cy: n.y }));
function nav(a) {
  if (a.lock && !G.flags.folder) return dialog([L.watch]);
  ui.tip.classList.remove('on');
  typeof a.to === 'function' ? a.to() : go(a.to, a.sfx);
}
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const canInteract = () => G.mode === 'play' && !G.dlg && !G.paused && !G.video && !G.busy && !G.overlay;
cv.addEventListener('pointermove', e => {
  if (!canInteract()) { G.hover = G.hoverArrow = null; cv.style.cursor = 'default'; ui.tip.classList.remove('on'); return; }
  const p = toStage(e);
  G.hoverArrow = arrowRects().find(r => inRect(p, r)) || null;
  G.hover = G.hoverArrow ? null : spotsOf(G.view).find(s => inRect(p, s)) || null;
  cv.style.cursor = (G.hover || G.hoverArrow) ? 'pointer' : 'default';
  const t = G.hover || G.hoverArrow;
  if (t) { ui.tip.textContent = G.hover ? lbl(G.hover) : (G.hoverArrow.dir === 'back' ? '↩ ' : '➜ ') + G.hoverArrow.label; ui.tip.style.left = Math.min(p.x + 24, W - 420) + 'px'; ui.tip.style.top = (p.y + 24) + 'px'; ui.tip.classList.add('on'); }
  else ui.tip.classList.remove('on');
});
cv.addEventListener('pointerdown', e => {
  ac();
  if (G.dlg) { nextLine(); return; }
  if (!canInteract()) return;
  const p = toStage(e);
  const a = arrowRects().find(r => inRect(p, r));
  if (a) { nav(a); return; }
  const s = spotsOf(G.view).find(s => inRect(p, s));
  if (!s) return;
  ui.tip.classList.remove('on');
  if (s.lock && !G.flags.folder) return dialog([L.watch]);
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
  const ns = VIEWS[G.view].nav, by = d => ns.filter(n => n.dir === d);
  const k = { ArrowDown: by('back'), Backspace: by('back'), ArrowLeft: by('left'), ArrowRight: by('right'), ArrowUp: by('fwd') }[e.key];
  if (k && k.length === 1) { e.preventDefault(); nav(k[0]); }
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
  const s = hover ? 1.15 : 1, bob = Math.sin(G.t * 5) * 6;
  const off = { left: [-bob, 0], right: [bob, 0], fwd: [0, -bob], back: [0, bob * 0.6] }[r.dir];
  ctx.save(); ctx.translate(r.cx + off[0], r.cy + off[1]); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const red = ctx.createLinearGradient(-50, -50, 50, 50); red.addColorStop(0, '#ee7a44'); red.addColorStop(1, '#d6332a');
  if (r.dir === 'back') {
    // mũi tên chữ U: quay lại chỗ trước
    const path = () => { ctx.beginPath(); ctx.moveTo(36, 34); ctx.lineTo(36, -4); ctx.arc(0, -4, 36, 0, Math.PI, true); ctx.lineTo(-36, 6); };
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
    path(); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 32; ctx.stroke(); ctx.shadowColor = 'transparent';
    path(); ctx.strokeStyle = red; ctx.lineWidth = 20; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-64, 2); ctx.lineTo(-8, 2); ctx.lineTo(-36, 44); ctx.closePath();
    ctx.fillStyle = red; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 6; ctx.fill(); ctx.stroke();
  } else {
    ctx.rotate({ fwd: -Math.PI / 2, left: Math.PI, right: 0 }[r.dir]);
    ctx.beginPath(); ctx.moveTo(-46, -18); ctx.lineTo(8, -18); ctx.lineTo(8, -44); ctx.lineTo(52, 0); ctx.lineTo(8, 44); ctx.lineTo(8, 18); ctx.lineTo(-46, 18); ctx.closePath();
    ctx.fillStyle = red; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  }
  ctx.restore();
}
function drawHover(s) {
  // viền sáng ôm đúng hình đồ vật (ảnh tách sẵn trong assets/v2/outline)
  const p = 0.6 + 0.25 * Math.sin(G.t * 5), pad = 6;
  const key = `${G.view}_${VIEWS[G.view].spots.indexOf(s)}`, im = IMG['ol:' + key];
  if (im && typeof OUTLINE === 'object' && OUTLINE[key]) {
    ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.t * 5) ** 2;
    ctx.drawImage(im, OUTLINE[key][0], OUTLINE[key][1]); ctx.restore(); return;
  }
  ctx.save(); ctx.beginPath();
  if (s.shape === 'ellipse') ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2 + pad, s.h / 2 + pad, 0, 0, Math.PI * 2);
  else ctx.roundRect(s.x - pad, s.y - pad, s.w + pad * 2, s.h + pad * 2, Math.min(28, s.w / 4, s.h / 4));
  ctx.fillStyle = 'rgba(255,248,225,.07)'; ctx.fill();
  ctx.shadowColor = 'rgba(255,236,190,.9)'; ctx.shadowBlur = 16;
  ctx.strokeStyle = `rgba(255,248,225,${p})`; ctx.lineWidth = 2.5; ctx.stroke();
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
  if (G.hover && canInteract()) drawHover(G.hover);
  if (G.mode === 'play' && !G.dlg) for (const r of arrowRects()) drawArrow(r, G.hoverArrow && G.hoverArrow.cx === r.cx && G.hoverArrow.cy === r.cy);
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
