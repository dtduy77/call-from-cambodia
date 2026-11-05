'use strict';
/* =========================================================
   CUỘC GỌI TỪ CAMPUCHIA — Map 1
   ANO301 · Nhóm 3 · art: asset của nhóm (game/assets)
   ========================================================= */
const W = 1280, H = 720;
const $ = s => document.querySelector(s);
const cv = $('#cv'), ctx = cv.getContext('2d');
const stage = $('#stage');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

let SCALE = 1;
function resize() {
  SCALE = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `scale(${SCALE})`;
  stage.style.left = (innerWidth - W * SCALE) / 2 + 'px';
  stage.style.top = (innerHeight - H * SCALE) / 2 + 'px';
}
addEventListener('resize', resize); resize();

/* ---------------- Assets ---------------- */
const SRC = {
  bg_office: 'bg_office.jpg', bg_hall: 'bg_hall.jpg', bg_hallB: 'bg_hallB.jpg', bg_boss: 'bg_boss.jpg', bg_menu: 'bg_menu.jpg',
  ti_front: 'ti_front.png', ti_side: 'ti_turn2.png', ti_back: 'ti_turn4.png',
  ti_phone: 'ti_pose0.png', ti_pose1: 'ti_pose1.png', ti_pose2: 'ti_pose2.png',
  anyen: 'anyen.png', anhdai: 'anhdai.png',
  p_clock: 'props/clock.png', p_cup: 'props/cup_2.png', p_trash: 'props/trash.png', p_keys: 'props/keys.png',
};
const IMG = {};
function loadAssets() {
  return Promise.all(Object.entries(SRC).map(([k, f]) => new Promise(res => {
    const i = new Image();
    i.onload = () => { IMG[k] = i; res(); };
    i.onerror = () => { console.warn('Thiếu asset', f); res(); };
    i.src = 'assets/' + f;
  })));
}
function tint(img, color) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0);
  return c;
}
function draw(k, x, y, w, h) { const i = IMG[k]; if (i) ctx.drawImage(i, x, y, w, h); }

/* ---------------- Audio (WebAudio synth) ---------------- */
const AU = { ctx: null, on: true, master: null };
function ac() {
  if (!AU.ctx) {
    AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.5; AU.master.connect(AU.ctx.destination);
  }
  if (AU.ctx.state === 'suspended') AU.ctx.resume();
  return AU.ctx;
}
function tone(f, d, type = 'square', v = 0.15, when = 0, slide = 0) {
  if (!AU.on) return;
  const c = ac(), t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, v = 0.2, when = 0, freq = 800) {
  if (!AU.on) return;
  const c = ac(), t = c.currentTime + when;
  const b = c.createBuffer(1, Math.max(1, c.sampleRate * d), c.sampleRate);
  const ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t);
}
const SFX = {
  click() { tone(900, 0.05, 'square', 0.06); },
  type() { tone(1300 + Math.random() * 500, 0.025, 'square', 0.03); },
  ok() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, i * 0.08)); },
  wrong() { tone(180, 0.25, 'sawtooth', 0.14); tone(140, 0.3, 'sawtooth', 0.12, 0.12); },
  pick() { tone(700, 0.08, 'triangle', 0.15); tone(1100, 0.14, 'triangle', 0.15, 0.07); },
  door() { noise(0.45, 0.3, 0, 300); tone(90, 0.4, 'sine', 0.2); },
  zap() { noise(0.7, 0.4, 0, 2500); for (let i = 0; i < 8; i++) tone(200 + Math.random() * 900, 0.06, 'sawtooth', 0.12, i * 0.07); },
  heart() { tone(62, 0.12, 'sine', 0.55); tone(55, 0.14, 'sine', 0.45, 0.17); },
  ring() { for (let i = 0; i < 2; i++) for (let j = 0; j < 10; j++) tone(j % 2 ? 440 : 480, 0.05, 'sine', 0.12, i * 0.75 + j * 0.05); },
  alarm() { tone(880, 0.22, 'square', 0.07); tone(660, 0.22, 'square', 0.07, 0.25); },
  step() { noise(0.04, 0.05, 0, 1500); },
};
const BGM = { mode: null, beat: 0, timer: null };
const BASS = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 82.41];
function bgm(mode) {
  BGM.mode = mode;
  if (!BGM.timer) BGM.timer = setInterval(bgmTick, 250);
}
function bgmTick() {
  if (!AU.on || !BGM.mode || !AU.ctx) return;
  const b = BGM.beat++, n = BASS[(b >> 3) % 8];
  if (BGM.mode === 'menu') {
    if (b % 4 === 0) tone(n, 1.0, 'triangle', 0.08);
    if (b % 2 === 0) tone([440, 523, 659, 523][(b >> 1) % 4] * 0.5, 0.45, 'sine', 0.035);
  } else if (BGM.mode === 'calm') {
    if (b % 4 === 0) tone(n, 0.9, 'triangle', 0.1);
    if (b % 8 === 6) tone(n * 4, 0.3, 'sine', 0.035);
    if (b % 16 === 11) tone(n * 6, 0.2, 'sine', 0.025);
  } else if (BGM.mode === 'alarm') {
    if (b % 2 === 0) tone(n, 0.22, 'sawtooth', 0.07);
    if (b % 4 === 2) tone(1200, 0.06, 'square', 0.03);
    if (b % 8 === 0) SFX.alarm();
  }
}

/* ---------------- DOM helpers ---------------- */
const ui = {
  hud: $('#hud'), obj: $('#obj-text'), roomT: $('#room-text'), daiT: $('#dai-text'), timer: $('#hud-timer'),
  detFill: $('#det-fill'), lives: $('#lives'), inv: $('#hud-inv'), toast: $('#toast'), vign: $('#vignette'),
  overlay: $('#overlay'), panel: $('#panel'), dialog: $('#dialog'), dPort: $('#d-portrait'), dName: $('#d-name'),
  dText: $('#d-text'), screen: $('#screen'), fade: $('#fade'), flash: $('#flash'),
};
let toastT = 0;
function toast(msg) {
  ui.toast.textContent = msg; ui.toast.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => ui.toast.classList.remove('show'), 2200);
}
const fmt = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

/* ---------------- Game state ---------------- */
const G = {}, P = {}, D = {};
const ROUTE = ['boss', 'hallB', 'hallA', 'office', 'hallA', 'hallB'];
const DWELL = { boss: 11, hallB: 3.5, hallA: 4, office: 6 };
const DOORX = {
  office: { hallA: -60 },
  hallA: { office: 1340, hallB: -60 },
  hallB: { hallA: 1340, boss: 880 },
  boss: { hallB: 1340 },
};
const ADJ = { office: ['hallA'], hallA: ['office', 'hallB', 'cells'], hallB: ['hallA', 'boss'], boss: ['hallB'], cells: ['hallA'] };
const LETTERS = ['c2', 'c4', 'cK', 'c20'];

function newGame() {
  Object.assign(G, {
    mode: 'play', room: 'office', elapsed: 0, lives: 3, det: 0, caughtN: 0, grace: 0,
    inv: new Set(), flags: {}, overlay: null, alarm: false, countdown: 0,
    dlg: false, dq: [], ddone: null, paused: false, trans: false, cut: null, hbT: 0, t: 0, wrongPw: 0,
  });
  Object.assign(P, { x: 1000, dir: -1, moving: false, target: null, after: null, walkT: 0, stepT: 0 });
  Object.assign(D, { room: 'office', x: 760, dir: 1, state: 'hold', ri: 3, timer: 0, goal: 0, look: 2, say: null, sayT: 0, walkT: 0, chasing: false });
}
const has = id => G.inv.has(id);

/* ---------------- Rooms & hotspots ---------------- */
const say = (text, face = 'angry') => () => dialog([{ who: 'ti', face, text }]);
let KEY_GREEN = null;

const ROOMS = {
  office: {
    name: 'Phòng làm việc', bg: 'bg_office', floor: 702, h: 392,
    exits: { left: { to: 'hallA', x: 1150, dir: -1, label: 'Hành lang A' } },
    spots: [
      { id: 'pc04', x: 935, y: 226, w: 132, h: 96, ix: 1000, label: 'Máy tính PC04 (chỗ của mình)', act: openComputer },
      { id: 'note', x: 800, y: 318, w: 70, h: 32, ix: 840, label: () => has('note') ? 'Mặt bàn' : 'Tờ giấy trên bàn',
        act: () => has('note') ? say('Mặt bàn trống trơn, chỉ có bụi với vết cà phê.')() : openNote(),
        draw() { if (has('note')) return; ctx.save(); ctx.translate(835, 333); ctx.rotate(-0.12);
          ctx.fillStyle = '#fbf4e2'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.fillRect(-26, -12, 52, 22); ctx.strokeRect(-26, -12, 52, 22);
          ctx.strokeStyle = '#777'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-20, -6 + i * 6); ctx.lineTo(18, -6 + i * 6); ctx.stroke(); }
          ctx.restore(); } },
      { id: 'clock', x: 612, y: 122, w: 80, h: 80, ix: 650, label: 'Đồng hồ treo tường', act: inspectClock,
        draw() { draw('p_clock', 614, 124, 76, 74); } },
      { id: 'calendar', x: 84, y: 150, w: 80, h: 100, ix: 125, label: 'Lịch treo tường',
        act: say('Lịch năm 2024... Tờ giấy bàn giao ghi "30 tháng 2". Tháng 2 làm gì có ngày 30. Giấy tờ ở đây toàn đồ dỏm.'),
        draw() { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.fillRect(88, 156, 70, 88); ctx.strokeRect(88, 156, 70, 88);
          ctx.fillStyle = '#c8342b'; ctx.fillRect(88, 156, 70, 22); ctx.strokeRect(88, 156, 70, 22);
          ctx.fillStyle = '#fff'; ctx.font = '800 15px "Be Vietnam Pro"'; ctx.textAlign = 'center'; ctx.fillText('2024', 123, 173);
          ctx.fillStyle = '#111'; ctx.font = '800 34px "Be Vietnam Pro"'; ctx.fillText('T2', 123, 225); ctx.textAlign = 'left'; } },
      { id: 'pc02', x: 293, y: 220, w: 126, h: 84, ix: 356, label: 'Máy PC02',
        act: say('Máy PC02. Màn hình đầy tin nhắn "Chúc mừng bạn trúng thưởng...". Kịch bản lừa đảo cả đấy.') },
      { id: 'pc03', x: 680, y: 230, w: 124, h: 84, ix: 742, label: 'Máy PC03',
        act: say('Máy của người khác. Đụng vào là bị nghi ngay. Mình được giao máy số 4.') },
    ],
  },
  hallA: {
    name: 'Hành lang A', bg: 'bg_hall', floor: 706, h: 400,
    exits: {
      right: { to: 'office', x: 110, dir: 1, label: 'Phòng làm việc' },
      left: { to: 'hallB', x: 1150, dir: -1, label: 'Hành lang B' },
    },
    spots: [
      { id: 'cup', x: 284, y: 262, w: 44, h: 44, ix: 300, label: 'Cốc giấy ở máy lọc nước', act: inspectCup,
        draw() { draw('p_cup', 290, 268, 32, 32); } },
      { id: 'kpi', x: 738, y: 160, w: 96, h: 134, ix: 785, label: 'Bảng KPI', act: inspectKPI },
      { id: 'keypad', x: 636, y: 236, w: 70, h: 74, ix: 672, label: 'Bàn phím mật mã cửa khu giam', act: openKeypad },
      { id: 'gate', x: 432, y: 128, w: 200, h: 284, ix: 530, label: () => G.flags.gate ? 'Vào khu giam' : 'Cửa sắt khu giam (CELL)',
        act: () => {
          if (!G.flags.gate) return say('Cửa sắt khóa chặt. Bên cạnh có bàn phím nhập mật mã.')();
          SFX.door(); go('cells', 90, 1);
        },
        draw() { if (!G.flags.gate) return; ctx.fillStyle = 'rgba(120,255,150,.18)'; ctx.fillRect(468, 228, 128, 172); } },
      { id: 'camera', x: 248, y: 80, w: 64, h: 66, ix: 280, label: 'Camera giám sát',
        act: say('Camera... đèn đỏ không sáng. Chắc chỉ là đồ để dọa. Người canh thật sự là Anh Đại.') },
      { id: 'mona', x: 0, y: 0, w: 140, h: 265, ix: 90, label: 'Bức tranh',
        act: say('Tranh Mona Lisa mà cười toe toét. Tới tranh ở đây cũng là hàng giả.', 'happy') },
      { id: 'blueA', x: 835, y: 130, w: 96, h: 300, ix: 880, label: 'Cửa xanh',
        act: say('Khóa trái. Bên trong toàn tiếng gõ phím với tiếng gọi điện. Phòng "chạy KPI".') },
    ],
  },
  hallB: {
    name: 'Hành lang B', bg: 'bg_hallB', floor: 706, h: 400,
    exits: { right: { to: 'hallA', x: 100, dir: 1, label: 'Hành lang A' } },
    spots: [
      { id: 'trash', x: 316, y: 486, w: 70, h: 86, ix: 352, label: 'Thùng rác', act: inspectTrash,
        draw() { draw('p_trash', 322, 490, 62, 80); } },
      { id: 'bossdoor', x: 835, y: 104, w: 96, h: 318, ix: 880, label: 'Cửa phòng Anh Đại',
        act: () => { SFX.door(); go('boss', 1150, -1); } },
      { id: 'elev', x: 492, y: 145, w: 132, h: 260, ix: 558, label: 'Thang máy',
        act: say('Thang máy bị khóa, phải có thẻ của Anh Đại mới đi được.') },
      { id: 'keypadB', x: 632, y: 238, w: 66, h: 64, ix: 664, label: 'Bảng điều khiển thang máy',
        act: say('Bấm thử... không phản hồi. Phải có thẻ từ.') },
      { id: 'notice', x: 738, y: 160, w: 94, h: 132, ix: 785, label: 'Bảng thông báo',
        act: say('"KPI tuần này: 8 người chưa đạt → chuyển phòng tối." Bọn này coi người như máy.') },
      { id: 'mono', x: 0, y: 0, w: 172, h: 276, ix: 110, label: 'Tranh "Mono Visa"',
        act: say('"Mono Visa"... Ai vẽ cái này vậy trời.', 'happy') },
    ],
  },
  boss: {
    name: 'Phòng Anh Đại', bg: 'bg_boss', floor: 712, h: 410,
    exits: { right: { to: 'hallB', x: 880, dir: -1, label: 'Hành lang B' } },
    spots: [
      { id: 'skull', x: 838, y: 172, w: 166, h: 170, ix: 920, label: () => has('key') ? 'Đầu hươu' : 'Đầu hươu... có gì đó treo bên dưới',
        act: () => has('key') ? say('Cái đầu hươu nhìn mình chằm chằm. Rợn người.')() : inspectSkull(),
        draw() { if (has('key') || !KEY_GREEN) return; ctx.drawImage(KEY_GREEN, 898, 300, 46, 48); } },
      { id: 'bosspc', x: 236, y: 428, w: 134, h: 116, ix: 330, label: 'Máy tính của Anh Đại', act: openBossPC },
      { id: 'board', x: 640, y: 230, w: 162, h: 86, ix: 720, label: 'Bảng ghim',
        act: say('Ảnh chụp hộ chiếu của mấy người mới bị lừa sang... Bọn chúng giữ giấy tờ để không ai trốn được.') },
      { id: 'shelf', x: 200, y: 205, w: 280, h: 240, ix: 340, label: 'Kệ hồ sơ',
        act: say('Toàn hợp đồng "việc nhẹ lương cao" với chữ ký của người bị lừa.') },
    ],
  },
  cells: {
    name: 'Khu giam', bg: null, floor: 690, h: 380,
    exits: { left: { to: 'hallA', x: 530, dir: 1, label: 'Hành lang A' } },
    spots: [],
  },
};
const CELL_X = i => 150 + i * 190;
for (let i = 0; i < 6; i++) {
  ROOMS.cells.spots.push({ id: 'cell' + (i + 1), x: CELL_X(i), y: 185, w: 170, h: 390, ix: CELL_X(i) + 85, label: `Buồng giam PK${i + 1}`, act: () => cellAct(i + 1) });
}

/* ---------------- Dialogue ---------------- */
const WHO = {
  ti: { name: 'Tí Công An', face: f => `assets/face_${f || 'angry'}.png` },
  think: { name: 'Tí (nghĩ thầm)', face: f => `assets/face_${f || 'angry'}.png` },
  dai: { name: 'Anh Đại', face: () => 'assets/face_dai.png' },
  yen: { name: 'An Yên', face: () => 'assets/face_yen.png' },
  sep: { name: 'Thủ trưởng (điện thoại)', icon: '☎️' },
  sys: { name: '' },
};
let typeTimer = null, typeFull = '', typeIdx = 0;
function dialog(lines, done) {
  G.dq = lines.slice(); G.ddone = done || null; G.dlg = true;
  ui.dialog.classList.remove('hidden');
  nextLine();
}
function nextLine() {
  if (typeTimer && typeIdx < typeFull.length) {
    clearInterval(typeTimer); typeTimer = null; ui.dText.textContent = typeFull; typeIdx = typeFull.length; return;
  }
  const l = G.dq.shift();
  if (!l) {
    ui.dialog.classList.add('hidden'); G.dlg = false;
    const d = G.ddone; G.ddone = null; if (d) d(); return;
  }
  if (l.sfx) SFX[l.sfx]();
  const w = WHO[l.who] || WHO.sys;
  ui.dName.textContent = w.name;
  if (w.face) { ui.dPort.className = ''; ui.dPort.textContent = ''; ui.dPort.style.backgroundImage = `url(${w.face(l.face)})`; }
  else if (w.icon) { ui.dPort.className = ''; ui.dPort.style.backgroundImage = 'none'; ui.dPort.textContent = w.icon; }
  else { ui.dPort.className = 'none'; }
  ui.dText.className = l.who === 'sys' ? 'sys' : '';
  typeFull = l.text; typeIdx = 0; ui.dText.textContent = '';
  clearInterval(typeTimer);
  typeTimer = setInterval(() => {
    typeIdx += 2; ui.dText.textContent = typeFull.slice(0, typeIdx);
    if (typeIdx % 6 === 0) SFX.type();
    if (typeIdx >= typeFull.length) { clearInterval(typeTimer); typeTimer = null; }
  }, 18);
}
function skipDialog() { clearInterval(typeTimer); typeTimer = null; typeFull = ''; typeIdx = 0; G.dq = []; nextLine(); }
ui.dialog.addEventListener('pointerdown', e => { e.stopPropagation(); nextLine(); });

/* ---------------- Overlays ---------------- */
function openOverlay(type, html, mount) {
  G.overlay = type;
  ui.panel.className = '';
  ui.panel.innerHTML = `<button class="x" data-close>✕ Esc</button>` + html;
  ui.overlay.classList.remove('hidden');
  ui.panel.querySelectorAll('[data-close]').forEach(b => b.onclick = closeOverlay);
  if (mount) mount(ui.panel);
}
function closeOverlay() {
  if (!G.overlay) return;
  const t = G.overlay; G.overlay = null;
  ui.overlay.classList.add('hidden'); ui.panel.innerHTML = '';
  afterOverlay(t);
}
ui.overlay.addEventListener('pointerdown', e => { if (e.target === ui.overlay) closeOverlay(); });

const CLUE = {
  note: { icon: '📝', name: 'Giấy' }, file: { icon: '🗂️', name: 'Hồ sơ' },
  c2: { t: '2', name: 'Cốc' }, c4: { t: '4', name: 'Đồng hồ' }, cK: { t: 'K', name: 'KPI' }, c20: { t: '20', name: 'Rác' },
  key: { icon: '🗝️', name: 'Chìa' }, usb: { icon: '💾', name: 'USB' },
};
function addClue(id, msg) {
  if (has(id)) return;
  G.inv.add(id); SFX.pick(); toast(msg || `Đã thu thập: ${CLUE[id].name}`);
  renderInv();
}
function renderInv() {
  const order = ['note', 'file', 'c2', 'c4', 'cK', 'c20', 'key', 'usb'];
  ui.inv.innerHTML = order.map(id => {
    const c = CLUE[id], got = has(id);
    const inner = c.t ? `<span class="t">${got ? c.t : '?'}</span>` : (got ? c.icon : '·');
    return `<div class="slot ${got ? '' : 'empty'}" title="${c.name}">${inner}<span class="n">${c.name}</span></div>`;
  }).join('');
}

/* --- Paper note --- */
function openNote() {
  openOverlay('note', `
    <div class="paper">
      <h3>GIẤY BÀN GIAO MÁY</h3>
      <div class="date">Campuchia, 30 tháng 2, 2024</div>
      <div class="warn">Mã truy cập Folder: <u>không giữ ra ngoài dưới mọi hình thức!</u></div>
      <ul><li>PC01 – 7n2P</li><li>PC02 – 4C9a</li><li>PC03 – J97t</li><li>PC04 – St5K</li></ul>
      <div class="sign">KIỂM TRA ĐÚNG MÁY</div>
    </div>
    <div class="center"><button class="btn" id="take">Cất vào túi</button></div>`,
    p => p.querySelector('#take').onclick = () => { addClue('note'); closeOverlay(); });
}

/* --- PC04 computer --- */
function openComputer() {
  openOverlay('computer', `
    <div class="pc">
      <div class="pc-bar"><span>PC04 · KHU TU TRI OS v0.9</span><span>${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span></div>
      <div class="pc-body">
        <div class="pc-icons">
          <button class="pc-icon" data-f="hoso"><span class="ic">📁</span>Ho_so_nhan_su ${G.flags.folder ? '' : '🔒'}</button>
          <button class="pc-icon" data-f="kichban"><span class="ic">📁</span>Kich_ban_goi</button>
          <button class="pc-icon" data-f="kpi"><span class="ic">📁</span>KPI_thang_2</button>
          <button class="pc-icon" data-f="trash"><span class="ic">🗑️</span>Recycle Bin</button>
        </div>
        <div class="pc-win" id="pcwin"><div class="tb">Chào mừng</div><div class="wb">Chào "chuyên viên tư vấn" mới.<br>Hãy chạy KPI. Mọi hoạt động đều được ghi lại.<br><br><span style="color:#777">(Click vào folder bên trái)</span></div></div>
      </div>
    </div>`,
    p => {
      p.querySelectorAll('.pc-icon').forEach(b => b.onclick = () => { SFX.click(); pcOpen(b.dataset.f, p); });
      if (G.flags.folder) pcOpen('hoso', p);
    });
}
function pcOpen(f, p) {
  const win = p.querySelector('#pcwin');
  const set = (title, body) => { win.innerHTML = `<div class="tb">${title}</div><div class="wb">${body}</div>`; };
  if (f === 'hoso') {
    if (G.flags.folder) return set('Ho_so_nhan_su / tot_thi', profileHTML());
    set('Ho_so_nhan_su 🔒', `
      <p>🔑 To use this folder, you need Enter Password</p>
      <p><input id="pw" maxlength="8" autocomplete="off" spellcheck="false"><button id="pwok">OK</button><button id="pwno">Cancel</button></p>
      <p id="pwmsg"></p>`);
    const inp = win.querySelector('#pw'); inp.focus();
    const submit = () => {
      if (inp.value.trim().toLowerCase() === 'st5k') {
        SFX.ok(); G.flags.folder = true; addClue('file', 'Mở khóa hồ sơ: An Yên ở buồng PK5');
        p.querySelector('[data-f="hoso"]').innerHTML = '<span class="ic">📁</span>Ho_so_nhan_su';
        set('Ho_so_nhan_su / tot_thi', profileHTML());
      } else {
        SFX.wrong(); G.wrongPw++;
        win.querySelector('#pwmsg').innerHTML = `<span class="err">Sai mật khẩu! (${G.wrongPw})</span>` +
          (G.wrongPw >= 2 && !has('note') ? '<br><span style="color:#555">Mật khẩu chắc được ghi đâu đó quanh bàn làm việc...</span>' : '');
        win.classList.remove('shake'); void win.offsetWidth; win.classList.add('shake');
        inp.select();
      }
    };
    win.querySelector('#pwok').onclick = submit;
    win.querySelector('#pwno').onclick = () => set('Chào mừng', 'Đã hủy.');
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); e.stopPropagation(); if (e.key === 'Escape') closeOverlay(); });
  } else if (f === 'kichban') {
    set('Kich_ban_goi.txt', `
      <b>KỊCH BẢN 1: "VIỆC NHẸ LƯƠNG CAO"</b><br>Tuyển người sang Campuchia làm "chăm sóc khách hàng", bao vé máy bay, lương 1.500$/tháng. Tới nơi thì thu hộ chiếu.<br><br>
      <b>KỊCH BẢN 2: GIẢ DANH CÔNG AN</b><br>Gọi báo "tài khoản của bạn liên quan đường dây rửa tiền", yêu cầu chuyển tiền vào "tài khoản tạm giữ" để xác minh.<br><br>
      <b>KỊCH BẢN 3: "LÀM NHIỆM VỤ" NHẬN HOA HỒNG</b><br>Cho rút tiền lời vài lần đầu, sau đó bắt nạp số tiền lớn để "mở khóa" tài khoản.<br><br>
      <span class="hl">Tí: Công an thật không bao giờ yêu cầu chuyển tiền qua điện thoại.</span>`);
  } else if (f === 'kpi') {
    set('KPI_thang_2.xls', `
      <table><tr><th>Nhân viên</th><th>Doanh thu</th><th>Cấp</th></tr>
      <tr><td>Trình</td><td>20 tỷ</td><td>★★★</td></tr><tr><td>Bảo</td><td>14 tỷ</td><td>★★</td></tr>
      <tr><td>Hưng</td><td>10 tỷ</td><td>★</td></tr><tr><td>An Yên</td><td class="err">0 đ</td><td class="err">TỐT THÍ</td></tr></table>
      <p>Chỉ tiêu tháng: <b>20 tỷ / người</b>. Không đạt → chích điện + giam lỏng.</p>`);
  } else {
    set('Recycle Bin', 'Thùng rác trống.<br><span style="color:#777">Ai đó dọn sạch rồi... nhưng thùng rác thật ngoài hành lang thì chưa chắc.</span>');
  }
}
function profileHTML() {
  return `<div class="profile"><div class="ph" style="background-image:url(assets/face_yen.png)"></div>
    <div>Name: <b>Nguyễn An Yên</b><br>Date: 01-04-2007<br>Born: Việt Nam<br>Status: <span class="err">Tốt thí (không đạt KPI)</span><br>
    Prison cell: <span class="hl"><b>PK5</b></span></div></div>`;
}

/* --- Inspect helpers --- */
function inspect(type, title, art, clueId, caption) {
  const got = has(clueId);
  openOverlay(type, `<h2>${title}</h2><div class="center">${art}</div><p class="cap">${caption}</p>
    <div class="center"><button class="btn" id="take" ${got ? 'disabled' : ''}>${got ? 'Đã ghi nhớ' : 'Ghi nhớ ký tự màu xanh'}</button></div>`,
    p => p.querySelector('#take').onclick = () => { addClue(clueId, `Ghi nhớ ký tự: ${CLUE[clueId].t}`); closeOverlay(); });
}
function inspectClock() {
  let nums = '';
  for (let i = 1; i <= 12; i++) {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2, x = 150 + 104 * Math.cos(a), y = 150 + 104 * Math.sin(a);
    nums += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${i === 4 ? 46 : 26}" font-weight="800" fill="${i === 4 ? '#2fb54a' : '#111'}" font-family="Be Vietnam Pro">${i}</text>`;
  }
  const hand = (ang, len, w, c) => { const a = ang - Math.PI / 2; return `<line x1="150" y1="150" x2="${150 + len * Math.cos(a)}" y2="${150 + len * Math.sin(a)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; };
  const art = `<svg viewBox="0 0 300 300" width="300" height="300"><circle cx="150" cy="150" r="138" fill="#fffaf0" stroke="#111" stroke-width="9"/>${nums}
    ${hand(8 / 12 * Math.PI * 2, 62, 9, '#111')}${hand(0, 92, 6, '#111')}${hand(4 / 12 * Math.PI * 2, 100, 3, '#c8342b')}<circle cx="150" cy="150" r="8" fill="#111"/></svg>`;
  inspect('clock', 'Đồng hồ treo tường', art, 'c4', 'Đồng hồ chỉ 8:00. Kim giây cứ giật qua giật lại ở số <b style="color:#2fb54a">4</b>, và số 4 được tô màu xanh khác hẳn mấy số còn lại.');
}
function inspectCup() {
  const art = `<svg viewBox="0 0 260 280" width="240" height="260"><path d="M40 30 L220 30 L190 260 L70 260 Z" fill="#fff" stroke="#111" stroke-width="8" stroke-linejoin="round"/>
    <ellipse cx="130" cy="30" rx="90" ry="14" fill="#e8f4ff" stroke="#111" stroke-width="7"/>
    <text x="130" y="175" text-anchor="middle" font-size="130" font-weight="800" fill="#2fb54a" font-family="Be Vietnam Pro">2</text></svg>`;
  inspect('cup', 'Cốc giấy ở máy lọc nước', art, 'c2', 'Cốc của ai đó để quên, trên thân có số <b style="color:#2fb54a">2</b> màu xanh lá.');
}
function inspectKPI() {
  const art = `<svg viewBox="0 0 360 300" width="360" height="300"><rect x="10" y="10" width="340" height="280" fill="#fff" stroke="#111" stroke-width="8"/>
    <text x="70" y="100" font-size="92" font-weight="800" fill="#2fb54a" font-family="Be Vietnam Pro">K</text>
    <text x="140" y="100" font-size="92" font-weight="800" fill="#111" font-family="Be Vietnam Pro">PI</text>
    <text x="40" y="170" font-size="26" fill="#111" font-family="Patrick Hand">1st 👤 Doanh thu 20 tỷ (Trình)</text>
    <text x="40" y="215" font-size="26" fill="#111" font-family="Patrick Hand">2nd 👤 Doanh thu 14 tỷ (Bảo)</text>
    <text x="40" y="260" font-size="26" fill="#c8342b" font-family="Patrick Hand">Cuối bảng → phòng tối</text></svg>`;
  inspect('kpi', 'Bảng KPI "đào lửa"', art, 'cK', 'Chữ <b style="color:#2fb54a">K</b> trong chữ KPI được tô xanh. "Chạy KPI tới chết", văn hóa của nơi này.');
}
function inspectTrash() {
  const art = `<svg viewBox="0 0 320 260" width="320" height="260"><path d="M30 40 L120 18 L210 34 L292 22 L300 120 L284 236 L180 222 L90 244 L24 226 L38 130 Z" fill="#f3ead2" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
    <path d="M60 70 L110 90 M200 60 L250 90 M70 200 L120 180" stroke="#bbb" stroke-width="3"/>
    <text x="160" y="96" text-anchor="middle" font-size="52" fill="#111" font-family="Patrick Hand">SBD</text>
    <text x="160" y="134" text-anchor="middle" font-size="30" fill="#111" font-family="Patrick Hand">PC09</text>
    <text x="160" y="214" text-anchor="middle" font-size="90" font-weight="800" fill="#2fb54a" font-family="Be Vietnam Pro">20</text></svg>`;
  inspect('trash', 'Tờ giấy vo tròn trong thùng rác', art, 'c20', 'Lục thùng rác thấy một tờ "SBD PC09" bị vò nát. Con số <b style="color:#2fb54a">20</b> được viết bằng mực xanh.');
}
function inspectSkull() {
  openOverlay('skull', `<h2>Đầu hươu treo tường</h2><div class="center"><canvas id="skc" width="420" height="380" style="border:3px solid #111;background:#fff"></canvas></div>
    <p class="cap">Một chùm chìa khóa màu xanh móc trên sừng hươu. Đây chắc chắn là chìa <b>buồng giam</b>. Lấy là hắn sẽ sớm phát hiện!</p>
    <div class="center"><button class="btn red" id="take">Lấy chìa khóa</button></div>`,
    p => {
      const c = p.querySelector('#skc').getContext('2d');
      if (IMG.bg_boss) { const sx = IMG.bg_boss.width / W, sy = IMG.bg_boss.height / H; c.drawImage(IMG.bg_boss, 800 * sx, 160 * sy, 240 * sx, 217 * sy, 0, 0, 420, 380); }
      if (KEY_GREEN) c.drawImage(KEY_GREEN, (898 - 800) * 1.75, (300 - 160) * 1.75, 46 * 1.75, 48 * 1.75);
      p.querySelector('#take').onclick = () => { takeKey(); closeOverlay(); };
    });
}
function takeKey() {
  addClue('key', 'Lấy được chìa khóa buồng giam!');
  G.alarm = true; G.countdown = 90; bgm('alarm');
  G.flags.keyMsg = true;
}
function openBossPC() {
  const got = has('usb');
  openOverlay('bosspc', `
    <div class="pc" style="height:440px">
      <div class="pc-bar"><span>LAPTOP — TRỊNH TRẦN ANH ĐẠI</span><span>🔓</span></div>
      <div class="pc-body"><div class="pc-win"><div class="tb">So_sach_that.xls</div><div class="wb">
        <table><tr><th>Mã "hàng"</th><th>Quê</th><th>Giá mua</th><th>Đã lừa được</th></tr>
        <tr><td>PK1</td><td>Đồng Tháp</td><td>3.000$</td><td>1,2 tỷ</td></tr>
        <tr><td>PK3</td><td>Nghệ An</td><td>3.500$</td><td>2,8 tỷ</td></tr>
        <tr><td>PK5</td><td>Sài Gòn</td><td>2.000$</td><td class="err">0đ (phạt)</td></tr></table>
        <p>Tài khoản trung gian, danh sách "đại lý tuyển dụng"... Đây là bằng chứng đủ để triệt phá cả đường dây.</p>
        <button id="copy" class="btn teal" ${got ? 'disabled' : ''}>${got ? 'Đã chép vào USB' : '💾 Chép dữ liệu vào USB'}</button>
        <div class="progress"><div id="pg" style="width:${got ? 100 : 0}%"></div></div>
      </div></div></div>
    </div>`,
    p => {
      const b = p.querySelector('#copy');
      b.onclick = () => {
        b.disabled = true; b.textContent = 'Đang chép... đừng để bị phát hiện!';
        let v = 0; const pg = p.querySelector('#pg');
        const iv = setInterval(() => {
          if (G.overlay !== 'bosspc') { clearInterval(iv); return; }
          if (G.dlg || G.paused) return;
          v += 4; pg.style.width = v + '%'; SFX.type();
          if (v >= 100) { clearInterval(iv); addClue('usb', 'Đã chép bằng chứng vào USB'); b.textContent = 'Đã chép vào USB'; }
        }, 160);
      };
    });
}

/* --- Keypad --- */
function openKeypad() {
  if (G.flags.gate) return say('Cửa khu giam đã mở rồi.', 'happy')();
  let code = '';
  openOverlay('keypad', `<h2 class="center">Khóa cửa khu giam</h2>
    <div class="kp">
      <div class="kp-icons"><div>🥤</div><div>⏰</div><div>📋</div><div class="span2">🗑️</div></div>
      <div class="kp-screen" id="scr">${'<div></div>'.repeat(5)}</div>
      <div class="kp-keys" id="keys"></div>
      <p class="cap center" id="kmsg" style="margin:4px 0 0">Nhập 5 ký tự. Có hình gợi ý phía trên mỗi ô.</p>
    </div>`,
    p => {
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'K', 'P', 'S', 'T', '⌫', 'OK'];
      const box = p.querySelector('#keys');
      box.innerHTML = keys.map(k => `<button data-k="${k}" class="${k === 'OK' ? 'ok' : k === '⌫' ? 'del' : ''}" ${k === 'OK' ? 'style="grid-column:span 2"' : ''}>${k}</button>`).join('');
      const scr = p.querySelector('#scr');
      const show = () => [...scr.children].forEach((d, i) => d.textContent = code[i] || '');
      const press = k => {
        SFX.click();
        if (k === '⌫') code = code.slice(0, -1);
        else if (k === 'OK') {
          if (code === '24K20') {
            SFX.ok(); SFX.door(); G.flags.gate = true; closeOverlay();
            dialog([{ who: 'ti', face: 'happy', text: '2 - 4 - K - 20... Cửa khu giam mở rồi!' }]);
            return;
          }
          SFX.wrong(); code = '';
          const m = p.querySelector('#kmsg'); m.innerHTML = '<span style="color:#c8342b;font-weight:800">BÍP BÍP! Sai mật mã. Tiếng kêu to quá...</span>';
          scr.classList.remove('shake'); void scr.offsetWidth; scr.classList.add('shake');
          if (D.room === G.room) G.det = Math.min(99, G.det + 15);
        } else if (code.length < 5) code += k;
        show();
      };
      box.querySelectorAll('button').forEach(b => b.onclick = () => press(b.dataset.k));
      p._key = e => {
        const k = e.key.toUpperCase();
        if (/^[0-9AKPST]$/.test(k)) press(k);
        else if (e.key === 'Backspace') press('⌫');
        else if (e.key === 'Enter') press('OK');
      };
    });
}

/* --- Cells --- */
function cellAct(n) {
  if (n !== 5) {
    const t = {
      1: 'PK1... có người co ro trong góc, không dám ngẩng lên. Mình sẽ quay lại cứu tất cả các người.',
      2: 'PK2 trống. Trên tường chi chít vạch đếm ngày.',
      3: 'PK3... một người đàn ông thì thào: "Đừng để hắn thấy..."',
      4: 'PK4 trống. Chỉ có cái chiếu rách.',
      6: 'PK6 trống. Mùi ẩm mốc nồng nặc.',
    }[n];
    return dialog([{ who: 'ti', face: 'shock', text: (has('key') ? 'Chìa không khớp ổ khóa này. ' : '') + t }]);
  }
  if (!has('key')) {
    return dialog([
      { who: 'yen', text: 'Anh... anh không giống người của bọn chúng. Làm ơn, cứu em với...' },
      { who: 'ti', face: 'angry', text: 'Suỵt. Anh là công an. Ổ khóa này cần chìa, em có biết chìa ở đâu không?' },
      { who: 'yen', text: 'Hắn... Anh Đại treo chùm chìa trên cái đầu hươu trong phòng hắn. Cửa xanh ở hành lang B.' },
    ], () => G.flags.yenHint = true);
  }
  rescue();
}
function rescue() {
  SFX.door(); G.flags.rescued = true; G.alarm = false; bgm('calm');
  dialog([
    { who: 'sys', text: '*Cạch* Ổ khóa buồng PK5 bật mở.' },
    { who: 'ti', face: 'happy', text: 'An Yên! Anh là Tí, công an Việt Nam. Anh đến đưa em về nhà.' },
    { who: 'yen', text: 'Thật... thật sao? Em cứ tưởng sẽ không bao giờ ra khỏi đây được...' },
    { who: 'ti', face: 'angry', text: 'Nắm chặt tay anh. Giờ mình phải quyết định thật nhanh.' },
  ], endingChoice);
}

/* ---------------- Transitions ---------------- */
function go(room, x, dir) {
  if (G.trans) return;
  G.trans = true; closeOverlay();
  ui.fade.classList.add('on');
  setTimeout(() => {
    G.room = room; P.x = x; P.dir = dir; P.target = null; P.after = null; G.grace = 0.9;
    ui.fade.classList.remove('on');
    setTimeout(() => { G.trans = false; onEnter(room); }, 220);
  }, 260);
}
function onEnter(room) {
  if (D.room === room) SFX.heart();
  if (room === 'cells' && !G.flags.cellsSeen) {
    G.flags.cellsSeen = true;
    dialog([{ who: 'think', face: 'shock', text: 'Khu giam... Tối và ẩm. Phải tìm buồng PK5.' }]);
  }
  if (room === 'boss' && !G.flags.bossSeen) {
    G.flags.bossSeen = true;
    dialog([{ who: 'think', face: 'shock', text: 'Phòng của Anh Đại. Phải làm nhanh trước khi hắn quay lại!' }]);
  }
}
function afterOverlay(t) {
  if (t === 'computer' && G.flags.folder && !G.flags.toldCode) {
    G.flags.toldCode = true;
    dialog([
      { who: 'think', face: 'angry', text: 'An Yên ở buồng PK5. Khu giam nằm sau cửa sắt "CELL" ở Hành lang A.' },
      { who: 'think', face: 'angry', text: 'Cửa đó khóa bằng mật mã 5 ký tự. Để ý mấy ký tự màu xanh lá mà bọn chúng đánh dấu quanh đây.' },
    ]);
  }
  if (LETTERS.every(has) && !G.flags.allLetters) {
    G.flags.allLetters = true;
    dialog([{ who: 'think', face: 'happy', text: 'Đủ 4 manh mối: 2, 4, K, 20. Thử ở bàn phím cạnh cửa khu giam, theo thứ tự hình gợi ý.' }]);
  }
  if (t === 'skull' && has('key') && G.flags.keyMsg) {
    G.flags.keyMsg = false;
    dialog([
      { who: 'ti', face: 'shock', text: 'Có chìa rồi! Hắn mà phát hiện là toi. Phải tới buồng PK5 ngay!' },
      { who: 'sys', text: 'Bạn có 90 giây trước khi Anh Đại phát hiện mất chìa khóa.' },
    ]);
  }
}

/* ---------------- Caught / game over ---------------- */
function caught(reason) {
  if (G.dlg) return;
  closeOverlay();
  SFX.zap(); ui.flash.classList.remove('zap'); void ui.flash.offsetWidth; ui.flash.classList.add('zap');
  G.lives--; G.caughtN++; G.det = 0; D.chasing = false; D.sayT = 0;
  const hadKey = has('key') && !G.flags.rescued;
  if (hadKey) { G.inv.delete('key'); G.alarm = false; G.countdown = 0; bgm('calm'); renderInv(); }
  const lines = reason === 'time'
    ? [{ who: 'dai', text: 'Chìa khóa của tao đâu?! Thằng mới... Là MÀY!' }]
    : [{ who: 'dai', text: pick(['Bắt được mày rồi! Lảng vảng làm gì hả?!', 'Thằng mới mà dám rình mò à?!', 'Tao thấy hết rồi nhé!']) }];
  lines.push({ who: 'sys', sfx: 'zap', text: '*Bzzzt!* Dùi cui điện chích thẳng vào người Tí.' });
  lines.push({ who: 'ti', face: 'shock', text: 'Áááá!!!' });
  if (G.lives <= 0) return dialog(lines, gameOver);
  if (hadKey) lines.push({ who: 'dai', text: 'Chìa khóa tao lấy lại rồi. Đừng có mơ.' });
  lines.push({ who: 'dai', text: 'Về chỗ ngồi chạy KPI! Lần sau tao không nhẹ tay đâu.' });
  dialog(lines, () => {
    G.room = 'office'; P.x = 1000; P.dir = -1; P.target = null; P.after = null;
    Object.assign(D, { room: 'office', x: 700, dir: 1, state: 'walkOut', ri: 3, goal: -60 });
    G.grace = 2;
  });
}
function gameOver() {
  G.mode = 'end'; bgm('menu'); ui.hud.classList.add('hidden');
  showScreen(`<div class="sheet"><div class="inner center">
    <h1 style="color:#c8342b">BỊ LỘ THÂN PHẬN</h1>
    <p>Tí Công An bị Anh Đại bắt quả tang lần thứ ba. Nhiệm vụ thất bại...</p>
    <div class="stats"><div>Thời gian<span>${fmt(G.elapsed)}</span></div><div>Manh mối<span>${G.inv.size}/8</span></div></div>
    <button class="btn" id="again">Chơi lại</button> <button class="btn teal" id="tomenu">Về menu</button>
  </div></div>`, s => { s.querySelector('#again').onclick = startGame; s.querySelector('#tomenu').onclick = showMenu; });
}

/* ---------------- Ending ---------------- */
function endingChoice() {
  G.mode = 'end'; ui.hud.classList.add('hidden');
  showScreen(`<div class="sheet"><div class="inner">
    <h1>LỰA CHỌN CUỐI</h1>
    <p>An Yên đã được giải thoát. Còi báo động có thể vang lên bất cứ lúc nào. Tí sẽ làm gì?</p>
    <div class="choice">
      <button id="cA">🏃 Đưa An Yên thoát ra ngay<small>Lẻn ra cửa khẩu Mộc Bài, gặp lực lượng hỗ trợ bên kia biên giới.</small></button>
      <button id="cB">📞 Gọi lực lượng ập vào, đối đầu Anh Đại<small>Rủi ro hơn. Cần đủ bằng chứng để bắt hắn.</small></button>
    </div></div></div>`, s => {
    s.querySelector('#cA').onclick = () => ending('A');
    s.querySelector('#cB').onclick = () => ending('B');
  });
}
function ending(c) {
  const ev = has('usb');
  let title, body, lines = [];
  if (c === 'A') {
    title = 'VỀ NHÀ';
    body = `Tí đưa An Yên lẻn qua cửa khẩu Mộc Bài ngay trong đêm. Cô được đoàn tụ với gia đình.` +
      (ev ? ` Dữ liệu trong USB giúp cơ quan chức năng triệt phá đường dây của Anh Đại vài tuần sau đó.` : ` Nhưng Anh Đại và "khu tự trị" vẫn còn đó, cùng những nạn nhân khác...`);
  } else if (ev) {
    title = 'PHÁ ĐƯỜNG DÂY';
    lines = [
      { who: 'dai', text: 'Thằng nhân viên mới... Mày là công an?!' },
      { who: 'ti', face: 'angry', text: 'Trịnh Trần Anh Đại! Toàn bộ sổ sách của anh đã nằm trong chiếc USB này.' },
      { who: 'ti', face: 'happy', text: 'Lực lượng đã bao vây tòa nhà. Hết đường chạy rồi!' },
    ];
    body = 'Lực lượng chức năng hai nước phối hợp ập vào khu tự trị. Anh Đại bị bắt, hàng chục nạn nhân ở các buồng PK được giải cứu. Đường dây "việc nhẹ lương cao" bị xóa sổ.';
  } else {
    title = 'KẺ TRỐN THOÁT';
    lines = [
      { who: 'dai', text: 'Công an à? Bằng chứng đâu mà bắt tao? Ha ha ha!' },
      { who: 'ti', face: 'shock', text: 'Khốn kiếp... Lẽ ra mình phải lấy được sổ sách của hắn!' },
    ];
    body = 'An Yên được an toàn, nhưng thiếu bằng chứng nên Anh Đại tẩu thoát qua cửa sau. (Mẹo: máy tính trong phòng Anh Đại chứa sổ sách lừa đảo.)';
  }
  const show = () => {
    bgm('menu');
    showScreen(`<div class="sheet"><div class="inner">
      <div class="lbl">KẾT THÚC ${c === 'B' && ev ? '★ TỐT NHẤT' : ''}</div>
      <h1>${title}</h1>
      <p>${body}</p>
      <div class="stats"><div>Thời gian<span>${fmt(G.elapsed)}</span></div><div>Bị chích điện<span>${G.caughtN}</span></div><div>Bằng chứng<span>${ev ? 'CÓ' : 'KHÔNG'}</span></div></div>
      <div class="aware"><b>Hãy tỉnh táo trước lừa đảo:</b>
        <ul style="margin:6px 0">
          <li>Lời mời "việc nhẹ lương cao" ở nước ngoài, bao vé máy bay, không cần kinh nghiệm thường là bẫy.</li>
          <li>Công an không làm việc qua điện thoại và không bao giờ yêu cầu chuyển tiền để "xác minh".</li>
          <li>Không giao hộ chiếu, giấy tờ cho người lạ. Có nghi vấn, hãy báo ngay cho công an (113).</li>
        </ul></div>
      <p style="font-size:13px;color:#555;margin-top:12px">ANO301 · Nhóm 3 · GVHD: BinhLTT: Đặng Ngọc Trinh, Phạm Trần Mai Anh, Nguyễn Ngọc Anh Thư, Nguyễn Huỳnh Thiên Duyên, Võ Ngọc Thái An</p>
      <button class="btn" id="again">Chơi lại</button> <button class="btn teal" id="tomenu">Về menu</button>
    </div></div>`, s => { s.querySelector('#again').onclick = startGame; s.querySelector('#tomenu').onclick = showMenu; });
  };
  hideScreen();
  if (lines.length) { G.cut = 'end'; dialog(lines, show); } else show();
}

/* ---------------- Screens ---------------- */
function showScreen(html, mount) {
  ui.screen.innerHTML = html; ui.screen.classList.remove('hidden');
  if (mount) mount(ui.screen);
}
function hideScreen() { ui.screen.classList.add('hidden'); ui.screen.innerHTML = ''; }

function showMenu() {
  G.mode = 'menu'; G.cut = null; G.dlg = false; G.overlay = null; G.paused = false;
  ui.dialog.classList.add('hidden'); ui.overlay.classList.add('hidden'); ui.hud.classList.add('hidden');
  bgm('menu');
  showScreen(`
    <button class="menu-hit" style="left:72px;top:284px;width:262px;height:64px" id="m-play" aria-label="Play Game"></button>
    <button class="menu-hit" style="left:70px;top:360px;width:240px;height:64px" id="m-opt" aria-label="Options"></button>
    <button class="menu-hit" style="left:66px;top:436px;width:242px;height:66px" id="m-more" aria-label="More games"></button>
    <div class="menu-foot">Mẹo: chơi với tai nghe · <kbd>←</kbd><kbd>→</kbd> di chuyển · <kbd>E</kbd> tương tác</div>`,
    s => {
      s.querySelector('#m-play').onclick = () => { ac(); SFX.click(); startGame(); };
      s.querySelector('#m-opt').onclick = () => { ac(); SFX.click(); showOptions(); };
      s.querySelector('#m-more').onclick = () => { ac(); SFX.click(); showCredits(); };
    });
}
function helpHTML() {
  return `<h3>Điều khiển</h3>
    <p><kbd>←</kbd> <kbd>→</kbd> hoặc <kbd>A</kbd> <kbd>D</kbd>: di chuyển, đi ra mép màn hình để sang phòng khác<br>
    <kbd>E</kbd> / <kbd>Space</kbd>: tương tác khi đứng gần đồ vật (hoặc click thẳng vào đồ vật)<br>
    <kbd>H</kbd>: gợi ý · <kbd>Esc</kbd>: đóng cửa sổ / tạm dừng</p>
    <h3>Sinh tồn trong khu tự trị</h3>
    <p>Anh Đại đi tuần giữa các phòng. Khi hắn nhìn thấy bạn làm việc khả nghi, <b>Mức nghi ngờ</b> tăng.
    Đứng ở <b>bàn PC04</b> (hoặc dùng máy PC04) để giả vờ làm việc. Đầy thanh nghi ngờ thì bị chích điện. Bị bắt 3 lần là thua.</p>`;
}
function showOptions() {
  showScreen(`<div class="sheet"><div class="inner">
    <h1>Options</h1>
    <p><label><input type="checkbox" id="snd" ${AU.on ? 'checked' : ''}> Âm thanh</label></p>
    ${helpHTML()}
    <button class="btn" id="back">Quay lại</button></div></div>`, s => {
    s.querySelector('#snd').onchange = e => { AU.on = e.target.checked; };
    s.querySelector('#back').onclick = showMenu;
  });
}
function showCredits() {
  showScreen(`<div class="sheet"><div class="inner">
    <h1>Cuộc Gọi Từ Campuchia</h1>
    <p>Game phiêu lưu giải đố nâng cao nhận thức về lừa đảo và mua bán người.</p>
    <h3>ANO301 · Nhóm 3 · GVHD: BinhLTT</h3>
    <ul><li>Đặng Ngọc Trinh (SE201998)</li><li>Phạm Trần Mai Anh (SE203855)</li><li>Nguyễn Ngọc Anh Thư (SE201075)</li>
    <li>Nguyễn Huỳnh Thiên Duyên (SE192780)</li><li>Võ Ngọc Thái An (SE201693)</li></ul>
    <p>Bản này gồm <b>Map 1</b>. Map 2 (căn tin) sẽ được bổ sung.</p>
    <button class="btn" id="back">Quay lại</button></div></div>`, s => s.querySelector('#back').onclick = showMenu);
}
function showPause() {
  G.paused = true;
  showScreen(`<div class="sheet"><div class="inner">
    <h1>Tạm dừng</h1>${helpHTML()}
    <p><label><input type="checkbox" id="snd" ${AU.on ? 'checked' : ''}> Âm thanh</label></p>
    <button class="btn" id="resume">Tiếp tục</button> <button class="btn teal" id="tomenu">Về menu chính</button></div></div>`, s => {
    s.querySelector('#snd').onchange = e => { AU.on = e.target.checked; };
    s.querySelector('#resume').onclick = resume;
    s.querySelector('#tomenu').onclick = showMenu;
  });
}
function resume() { G.paused = false; hideScreen(); }

function startGame() {
  hideScreen(); newGame(); renderInv();
  G.mode = 'play'; G.cut = 'call'; ui.hud.classList.add('hidden');
  bgm(null);
  dialog([
    { who: 'sys', sfx: 'ring', text: 'TP. Hồ Chí Minh, 23 giờ 47. Điện thoại của Tí reo liên hồi...' },
    { who: 'ti', face: 'shock', text: 'Alo? Ai gọi giờ này vậy...' },
    { who: 'sep', text: 'Tí, tôi đây. Có vụ khẩn.' },
    { who: 'sep', text: 'Một cô gái tên Nguyễn An Yên bị lừa sang Campuchia với lời hứa "việc nhẹ lương cao". Gia đình mất liên lạc đã ba tuần.' },
    { who: 'sep', text: 'Cô ấy đang bị giam trong một "khu tự trị" ở Bavet, sát cửa khẩu Mộc Bài. Trùm ở đó là Trịnh Trần Anh Đại.' },
    { who: 'ti', face: 'angry', text: 'Anh Đại... Em nghe danh hắn rồi.' },
    { who: 'sep', text: 'Cậu sẽ cải trang thành một thanh niên bị lừa sang làm "chuyên viên tư vấn". Trà trộn, tìm vị trí An Yên, đưa cô ấy ra.' },
    { who: 'sep', text: 'Nhớ kỹ: ở đó KPI là sinh mạng. Đừng để bị lộ.' },
    { who: 'ti', face: 'happy', text: 'Rõ, thưa thủ trưởng. Nhiệm vụ này em nhận!' },
  ], () => {
    G.cut = 'card';
    showScreen(`<div class="card"><h1>KHU TỰ TRỊ</h1><p>Bavet, Campuchia · Ngày đầu tiên của "nhân viên mới"</p></div>`);
    setTimeout(() => {
      hideScreen(); G.cut = null; ui.hud.classList.remove('hidden'); bgm('calm');
      dialog([
        { who: 'dai', text: 'Thằng mới đấy à? Nhìn cái mặt ngơ ngơ.' },
        { who: 'dai', text: 'Mày ngồi ở máy 4, lo mà làm đi. Còn không đừng có mơ mà thoát khỏi đây.' },
        { who: 'ti', face: 'shock', text: 'D-dạ... em làm ngay, đại ca!' },
        { who: 'dai', text: 'KPI tháng này 20 tỷ. Thiếu một đồng là biết tay tao.' },
        { who: 'think', face: 'angry', text: 'Hắn đi tuần liên tục. Mình phải tìm thông tin của An Yên mà không để hắn nghi ngờ.' },
        { who: 'sys', text: 'Di chuyển: ← → hoặc A D · Tương tác: E / Space (hoặc click vào đồ vật) · Gợi ý: H' },
        { who: 'sys', text: 'Khi Anh Đại ở cùng phòng, hãy về đứng ở bàn PC04 để giả vờ làm việc. Bị hắn bắt gặp đang rình mò thì Mức nghi ngờ sẽ tăng.' },
      ], () => { D.state = 'walkOut'; D.goal = -60; });
    }, 2600);
  });
}

/* ---------------- Objective & hints ---------------- */
function objective() {
  const n = LETTERS.filter(has).length;
  if (G.flags.rescued) return 'Đưa An Yên ra ngoài!';
  if (has('key')) return 'Tới khu giam, mở buồng PK5 giải cứu An Yên!';
  if (G.flags.gate) return G.flags.yenHint ? 'Lấy chìa khóa trên đầu hươu trong phòng Anh Đại' : 'Tìm buồng PK5 trong khu giam và tìm chìa khóa';
  if (G.flags.folder) return `Tìm ký tự màu xanh để mở cửa khu giam (${n}/4)`;
  if (has('note')) return 'Mở folder hồ sơ trên máy PC04';
  return 'Ngồi vào máy PC04 theo lệnh Anh Đại';
}
function hint() {
  let t;
  if (has('key')) t = 'Vào khu giam qua cửa sắt "CELL" ở Hành lang A, đến buồng PK5 và dùng chìa khóa.';
  else if (G.flags.gate) t = 'Chìa khóa buồng giam móc trên đầu hươu trong phòng Anh Đại (cửa xanh ở Hành lang B). Lẻn vào khi hắn đi tuần ở phòng khác. Máy tính của hắn còn có bằng chứng.';
  else if (G.flags.folder) {
    const where = { c2: ['hallA', 'số trên cốc giấy ở máy lọc nước'], c4: ['office', 'số trên đồng hồ treo tường'], cK: ['hallA', 'chữ trên bảng KPI'], c20: ['hallB', 'tờ giấy trong thùng rác'] };
    const ROUTE_TO = {
      office: { office: 'ngay trong phòng này', hallA: 'đi sang TRÁI ra Hành lang A', hallB: 'đi sang TRÁI ra Hành lang A, rồi đi tiếp sang TRÁI tới Hành lang B' },
      hallA: { office: 'đi sang PHẢI về Phòng làm việc', hallA: 'ngay trong hành lang này', hallB: 'đi sang TRÁI tới Hành lang B' },
      hallB: { office: 'đi sang PHẢI ra Hành lang A, rồi đi tiếp sang PHẢI về Phòng làm việc', hallA: 'đi sang PHẢI ra Hành lang A', hallB: 'ngay trong hành lang này' },
      boss: { office: 'ra Hành lang B, rồi đi sang PHẢI 2 lần', hallA: 'ra Hành lang B, rồi đi sang PHẢI', hallB: 'ra khỏi phòng này' },
      cells: { office: 'ra Hành lang A, rồi đi sang PHẢI', hallA: 'ra khỏi khu giam', hallB: 'ra Hành lang A, rồi đi sang TRÁI' },
    };
    const miss = LETTERS.filter(c => !has(c));
    t = miss.length
      ? `Đã có ${4 - miss.length}/4 ký tự. Còn thiếu: ` + miss.map(c => `${where[c][1]} (${ROUTE_TO[G.room][where[c][0]]})`).join('; ') + '.'
      : 'Đủ rồi! Ra Hành lang A, nhập 2 4 K 20 vào bàn phím cạnh cửa CELL (thứ tự theo hình: cốc, đồng hồ, KPI, thùng rác).';
  } else if (has('note')) t = 'Mở máy PC04, vào folder Ho_so_nhan_su, nhập mật khẩu của PC04 ghi trên Giấy bàn giao máy.';
  else t = 'Trên bàn làm việc, giữa máy 03 và 04, có một tờ giấy.';
  dialog([{ who: 'think', face: 'angry', text: t }]);
}

/* ---------------- Input ---------------- */
const keys = {};
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key;
  if (G.dlg) {
    if (k === 'e' || k === 'E' || k === ' ' || k === 'Enter') { e.preventDefault(); nextLine(); }
    if (k === 'Escape') skipDialog();
    return;
  }
  if (G.overlay) {
    if (k === 'Escape') closeOverlay();
    else if (ui.panel._key) ui.panel._key(e);
    return;
  }
  if (G.mode !== 'play' || G.cut) return;
  if (k === 'Escape' || k === 'p' || k === 'P') { G.paused ? resume() : showPause(); return; }
  if (G.paused) return;
  keys[k.toLowerCase()] = true;
  if (k === 'e' || k === 'E' || k === ' ' || k === 'Enter') { e.preventDefault(); const s = activeSpot(); if (s) interact(s); }
  if (k === 'h' || k === 'H') hint();
  if (k.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

cv.addEventListener('pointerdown', e => {
  ac();
  if (G.dlg) { nextLine(); return; }
  if (G.mode !== 'play' || G.cut || G.paused || G.overlay || G.trans) return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / SCALE, y = (e.clientY - r.top) / SCALE;
  const R = ROOMS[G.room];
  const s = R.spots.find(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
  if (s) { P.target = s.ix; P.after = s; return; }
  P.after = null;
  if (x < 60 && R.exits.left) P.target = -40;
  else if (x > W - 60 && R.exits.right) P.target = W + 40;
  else if (y > 380) P.target = clamp(x, 40, W - 40);
});
$('#btn-hint').onclick = () => { if (!G.dlg && !G.overlay && !G.paused) hint(); };
$('#btn-pause').onclick = () => { if (!G.dlg && !G.overlay) G.paused ? resume() : showPause(); };

function label(s) { return typeof s.label === 'function' ? s.label() : s.label; }
function activeSpot() {
  let best = null, bd = 80;
  for (const s of ROOMS[G.room].spots) { const d = Math.abs(P.x - s.ix); if (d < bd) { bd = d; best = s; } }
  return best;
}
function interact(s) { if (G.overlay || G.dlg) return; P.dir = Math.sign(s.ix - P.x) || P.dir; s.act(); }

/* ---------------- Update ---------------- */
const SPEED = 290;
function updPlayer(dt) {
  const R = ROOMS[G.room];
  let vx = 0;
  if (!G.overlay) {
    if (keys['arrowleft'] || keys['a']) vx = -1;
    if (keys['arrowright'] || keys['d']) vx = 1;
  }
  if (vx) { P.target = null; P.after = null; }
  else if (P.target != null && !G.overlay) {
    const d = P.target - P.x;
    if (Math.abs(d) < 6) {
      P.x = clamp(P.target, -60, W + 60); P.target = null;
      if (P.after) { const s = P.after; P.after = null; interact(s); }
    } else vx = Math.sign(d);
  }
  P.moving = !!vx;
  if (vx) {
    P.dir = vx; P.x += vx * SPEED * dt; P.walkT += dt;
    P.stepT -= dt; if (P.stepT <= 0) { P.stepT = 0.32; SFX.step(); }
  }
  if (P.x <= 40) {
    if (R.exits.left && (vx < 0 || P.target == null)) { const e = R.exits.left; return go(e.to, e.x, e.dir); }
    P.x = 40;
  }
  if (P.x >= W - 40) {
    if (R.exits.right && (vx > 0 || P.target == null)) { const e = R.exits.right; return go(e.to, e.x, e.dir); }
    P.x = W - 40;
  }
}
function daiSay(t) { D.say = t; D.sayT = 2.4; }
function updDai(dt) {
  if (D.sayT > 0) D.sayT -= dt;
  if (D.state === 'hold') return;
  const spd = G.alarm ? 210 : 125;
  const step = (goal, s = spd) => {
    const d = goal - D.x;
    if (Math.abs(d) < 4) { D.x = goal; D.moving = false; return true; }
    D.dir = Math.sign(d); D.x += D.dir * Math.min(Math.abs(d), s * dt); D.moving = true; D.walkT += dt; return false;
  };
  // chase when very suspicious
  if (D.room === G.room && G.det > 62 && G.room !== 'cells') {
    if (!D.chasing) { D.chasing = true; daiSay('ĐỨNG LẠI ĐÓ!'); }
    if (Math.abs(P.x - D.x) > 110) step(P.x, spd * 1.35); else { D.moving = false; D.dir = Math.sign(P.x - D.x) || D.dir; }
    return;
  }
  if (D.chasing) { D.chasing = false; D.state = 'linger'; D.timer = 2; }
  if (D.state === 'walkIn') {
    if (step(D.goal)) { D.state = 'linger'; D.timer = DWELL[D.room] * (G.alarm ? 0.5 : 1) * rnd(0.8, 1.25); D.look = rnd(1, 2); }
  } else if (D.state === 'linger') {
    D.moving = false; D.timer -= dt; D.look -= dt;
    if (D.look <= 0) { D.dir *= -1; D.look = rnd(1.2, 2.6); }
    if (D.timer <= 0) { D.state = 'walkOut'; D.goal = DOORX[D.room][ROUTE[(D.ri + 1) % ROUTE.length]]; }
  } else if (D.state === 'walkOut') {
    if (step(D.goal)) {
      const prev = D.room; D.ri = (D.ri + 1) % ROUTE.length; D.room = ROUTE[D.ri];
      D.x = DOORX[D.room][prev]; D.state = 'walkIn';
      D.goal = D.room === 'office' ? rnd(480, 900) : D.room === 'boss' ? rnd(500, 1000) : rnd(250, 1000);
      if (D.room === G.room) {
        G.grace = Math.max(G.grace, 0.8); SFX.heart();
        daiSay(pick(['KPI đâu hết rồi?!', 'Làm việc đi, nhìn cái gì!', 'Tao đang để mắt tới tụi bây đấy.', 'Đứa nào lười là ăn điện!']));
        if (prev === 'boss' || D.room === 'boss') SFX.door();
      }
    }
  }
}
function seen() {
  if (D.room !== G.room || G.room === 'cells') return false;
  if (D.x < -20 || D.x > W + 20) return false;
  const dx = P.x - D.x, ad = Math.abs(dx);
  if (ad < 170) return true;
  return Math.sign(dx) === D.dir && ad < 780;
}
function atDesk() { return G.room === 'office' && P.x > 925 && P.x < 1075; }
function suspicion() {
  const o = G.overlay;
  if (atDesk() && (!o || o === 'computer')) return -45;
  if (o) return 60;
  if (G.room === 'boss') return 70;
  if (has('key') && !G.flags.rescued) return 38;
  return P.moving ? 15 : 8;
}
function updDetect(dt) {
  if (G.grace > 0) G.grace -= dt;
  const s = seen(); G.seen = s;
  if (s && G.grace <= 0) {
    const r = suspicion();
    G.det = clamp(G.det + r * dt, 0, 100);
    if (r > 0 && G.det > 35 && D.sayT <= 0 && !D.chasing) daiSay('Ê... thằng kia?');
  } else G.det = Math.max(0, G.det - 12 * dt);
  if (G.det >= 100) caught();
  // heartbeat when danger is near
  G.hbT -= dt;
  const near = D.room === G.room || (ADJ[G.room] || []).includes(D.room);
  if (near && G.hbT <= 0) { G.hbT = D.room === G.room ? (0.9 - G.det / 200) : 1.4; if (D.room === G.room || Math.random() < 0.5) SFX.heart(); }
}
function update(dt) {
  G.t += dt;
  if (G.mode !== 'play' || G.dlg || G.paused || G.cut) return;
  G.elapsed += dt;
  if (!G.trans) updPlayer(dt);
  updDai(dt);
  if (!G.trans) updDetect(dt);
  if (G.alarm && !G.dlg) {
    G.countdown -= dt;
    if (G.countdown <= 0) { G.countdown = 0; caught('time'); }
  }
}

/* ---------------- Render ---------------- */
function drawChar(img, x, floor, h, flip, bob = 0, tilt = 0) {
  if (!img) return;
  const s = h / img.height, w = img.width * s;
  ctx.save(); ctx.translate(x, floor);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.42, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, bob); ctx.rotate(tilt);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}
function bubble(x, y, text, color = '#fff', tc = '#111') {
  ctx.font = '800 20px "Be Vietnam Pro", sans-serif';
  const w = ctx.measureText(text).width + 26, h = 38;
  ctx.fillStyle = color; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 8, y - 1); ctx.lineTo(x, y + 12); ctx.lineTo(x + 8, y - 1); ctx.fill(); ctx.stroke();
  ctx.fillStyle = tc; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - h / 2 + 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
function drawCells() {
  ctx.fillStyle = '#3a3f47'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#272b31'; ctx.fillRect(0, 0, W, 95);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 95); ctx.lineTo(W, 95); ctx.stroke();
  for (const lx of [260, 640, 1020]) {
    const g = ctx.createRadialGradient(lx, 100, 10, lx, 300, 420);
    g.addColorStop(0, 'rgba(255,230,160,.35)'); g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 95, W, 600);
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(lx - 40, 95, 80, 10); ctx.strokeRect(lx - 40, 95, 80, 10);
  }
  const fg = ctx.createLinearGradient(0, 575, 0, H); fg.addColorStop(0, '#5a5d61'); fg.addColorStop(1, '#3a3c40');
  ctx.fillStyle = fg; ctx.fillRect(0, 575, W, H - 575);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 575); ctx.lineTo(W, 575); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.35)';
  for (let x = -200; x < W + 200; x += 120) { ctx.beginPath(); ctx.moveTo(640 + (x - 640) * 0.6, 575); ctx.lineTo(x, H); ctx.stroke(); }
  for (let i = 0; i < 6; i++) {
    const x = CELL_X(i), y = 185, w = 170, h = 390, n = i + 1;
    ctx.fillStyle = '#1b1d22'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2a2d33'; ctx.fillRect(x + 10, y + 10, w - 20, h - 80);
    ctx.fillStyle = '#4a3a2c'; ctx.fillRect(x + 14, y + h - 90, w - 28, 18);
    if (n === 1 || n === 3) {
      ctx.fillStyle = '#0d0e11';
      ctx.beginPath(); ctx.arc(x + 60, y + h - 150, 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 64, y + h - 100, 36, 46, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (n === 5 && !G.flags.rescued) drawChar(IMG.anyen, x + w / 2, y + h - 8, 300, false, Math.sin(G.t * 2) * 1.5);
    const open = n === 5 && G.flags.rescued;
    ctx.fillStyle = '#8a8f96'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    for (let b = 0; b < 8; b++) {
      const bx = x + 10 + b * 21 + (open ? 120 : 0);
      if (bx > x + w + 100) continue;
      ctx.fillRect(bx, y, 8, h); ctx.strokeRect(bx, y, 8, h);
    }
    ctx.fillRect(x, y + 120, w, 10); ctx.strokeRect(x, y + 120, w, 10);
    ctx.lineWidth = 6; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = n === 5 ? '#f2c230' : '#d9d2c0'; ctx.lineWidth = 3;
    ctx.fillRect(x + w / 2 - 38, y - 44, 76, 34); ctx.strokeRect(x + w / 2 - 38, y - 44, 76, 34);
    ctx.fillStyle = '#111'; ctx.font = '30px VT323, monospace'; ctx.textAlign = 'center'; ctx.fillText('PK' + n, x + w / 2, y - 18); ctx.textAlign = 'left';
  }
}
function drawCut() {
  if (G.cut === 'call') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1426'); g.addColorStop(1, '#1d2a44');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#122039'; ctx.fillRect(140, 90, 360, 260); ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.strokeRect(140, 90, 360, 260);
    ctx.beginPath(); ctx.moveTo(320, 90); ctx.lineTo(320, 350); ctx.moveTo(140, 220); ctx.lineTo(500, 220); ctx.stroke();
    ctx.fillStyle = '#f5f1d0'; ctx.beginPath(); ctx.arc(430, 150, 28, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(150 + (i * 97) % 340, 100 + (i * 53) % 240, 2, 2); }
    drawChar(IMG.ti_phone, 860, 760, 700, false, Math.sin(G.t * 1.5) * 2);
    const r = (G.t * 3) % 1;
    ctx.strokeStyle = `rgba(242,194,48,${1 - r})`; ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(905, 150, 30 + k * 18 + r * 18, -0.9, 0.6); ctx.stroke(); }
  } else if (G.cut === 'end') {
    ctx.fillStyle = '#0d1018'; ctx.fillRect(0, 0, W, H);
    drawChar(IMG.ti_pose2, 420, 700, 560, false);
    drawChar(IMG.anhdai, 880, 700, 560, false);
  } else { ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, W, H); }
}
function render() {
  ctx.clearRect(0, 0, W, H);
  if (G.mode === 'menu') { if (IMG.bg_menu) ctx.drawImage(IMG.bg_menu, 0, 0, W, H); return; }
  if (G.cut) { drawCut(); return; }
  const R = ROOMS[G.room];
  if (R.bg && IMG[R.bg]) ctx.drawImage(IMG[R.bg], 0, 0, W, H); else drawCells();
  for (const s of R.spots) if (s.draw) s.draw();

  // active hotspot highlight
  const act = (G.mode === 'play' && !G.dlg && !G.overlay) ? activeSpot() : null;
  if (act) {
    const p = 0.5 + 0.5 * Math.sin(G.t * 6);
    ctx.save(); ctx.strokeStyle = `rgba(242,194,48,${0.6 + 0.4 * p})`; ctx.lineWidth = 4; ctx.setLineDash([10, 6]);
    ctx.strokeRect(act.x - 4, act.y - 4, act.w + 8, act.h + 8); ctx.restore();
  }

  // characters
  const daiImg = IMG.anhdai;
  const drawD = () => {
    if (D.room !== G.room) return;
    const bob = D.moving ? -Math.abs(Math.sin(D.walkT * 7)) * 6 : 0;
    drawChar(daiImg, D.x, R.floor + 6, R.h * 1.04, D.dir > 0, bob, D.moving ? Math.sin(D.walkT * 7) * 0.02 : 0);
    const hy = R.floor - R.h * 1.04 - 14;
    if (D.chasing || G.det > 70) bubble(D.x, hy, '!', '#c8342b', '#fff');
    else if (G.seen && G.det > 35) bubble(D.x, hy, '?', '#f2c230');
    else if (D.sayT > 0 && D.say) bubble(D.x, hy, D.say);
  };
  const drawP = () => {
    let img = IMG.ti_front, flip = false;
    if (P.moving) { img = IMG.ti_side; flip = P.dir < 0; }
    else if (G.overlay === 'computer' && atDesk()) img = IMG.ti_back;
    const bob = P.moving ? -Math.abs(Math.sin(P.walkT * 9)) * 7 : Math.sin(G.t * 2) * 1.2;
    drawChar(img, P.x, R.floor, R.h, flip, bob);
    if (has('key') && !G.flags.rescued && KEY_GREEN) ctx.drawImage(KEY_GREEN, P.x + 18, R.floor - R.h * 0.45, 26, 27);
  };
  if (D.x < P.x) { drawD(); drawP(); } else { drawP(); drawD(); }

  // prompt
  if (act) {
    const t = `E · ${label(act)}`;
    ctx.font = '600 17px "Be Vietnam Pro", sans-serif';
    const w = ctx.measureText(t).width + 22;
    let bx = clamp(act.x + act.w / 2 - w / 2, 8, W - w - 8), by = Math.max(act.y - 44, 120);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(bx, by, w, 32, 6); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.fillText(t, bx + 11, by + 22);
  }
  // exits
  for (const side of ['left', 'right']) {
    const e = R.exits[side]; if (!e) continue;
    const near = side === 'left' ? P.x < 260 : P.x > W - 260;
    const x = side === 'left' ? 52 : W - 52, dir = side === 'left' ? -1 : 1, y = 470;
    ctx.save(); ctx.globalAlpha = near ? 1 : 0.55 + 0.25 * Math.sin(G.t * 3);
    ctx.translate(x + Math.sin(G.t * 6) * 5 * dir, y); ctx.scale(dir * 1.3, 1.3);
    ctx.fillStyle = '#c8342b'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, -12); ctx.lineTo(0, -12); ctx.lineTo(0, -24); ctx.lineTo(20, 0); ctx.lineTo(0, 24); ctx.lineTo(0, 12); ctx.lineTo(-22, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.font = '800 15px "Be Vietnam Pro"'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 4;
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    const lt = side === 'left' ? '← ' + e.label : e.label + ' →';
    ctx.strokeText(lt, side === 'left' ? 16 : W - 16, y + 56); ctx.fillText(lt, side === 'left' ? 16 : W - 16, y + 56);
    ctx.textAlign = 'left';
  }
  if (G.alarm) { ctx.fillStyle = `rgba(200,30,30,${0.08 + 0.06 * Math.sin(G.t * 8)})`; ctx.fillRect(0, 0, W, H); }
}

const ROOMNAME = r => ROOMS[r].name;
function updHUD() {
  if (G.mode !== 'play' || G.cut) return;
  ui.obj.textContent = objective();
  ui.roomT.textContent = '📍 ' + ROOMNAME(G.room);
  let cls = '', txt = '';
  if (D.room === G.room && G.room !== 'cells') { cls = 'here'; txt = '⚠ Anh Đại đang ở đây!'; }
  else if ((ADJ[G.room] || []).includes(D.room)) { cls = 'near'; txt = `👣 Tiếng bước chân ở ${ROOMNAME(D.room)}...`; }
  if (atDesk() && D.room === G.room) { cls = 'safe'; txt = '🖥 Đang "làm việc" ở PC04 (an toàn)'; }
  ui.daiT.className = cls; ui.daiT.textContent = txt;
  ui.detFill.style.width = G.det + '%';
  ui.lives.textContent = '❤️'.repeat(Math.max(0, G.lives)) + '🖤'.repeat(Math.max(0, 3 - G.lives));
  if (G.alarm) { ui.timer.classList.add('alarm'); ui.timer.textContent = '⚠ ' + fmt(G.countdown); }
  else { ui.timer.classList.remove('alarm'); ui.timer.textContent = fmt(G.elapsed); }
  ui.vign.style.opacity = G.seen ? Math.min(1, G.det / 80) : (D.room === G.room ? 0.15 : 0);
}

/* ---------------- Main loop ---------------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render(); updHUD();
  requestAnimationFrame(frame);
}

(async function boot() {
  newGame(); G.mode = 'loading';
  ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = '28px VT323, monospace'; ctx.fillText('Đang tải...', 560, 360);
  await loadAssets();
  if (IMG.p_keys) KEY_GREEN = tint(IMG.p_keys, '#3fd45e');
  try { await document.fonts.ready; } catch (e) { /* ignore */ }
  showMenu();
  requestAnimationFrame(frame);
})();
