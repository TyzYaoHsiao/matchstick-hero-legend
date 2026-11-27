/* =========================================================
   render.js — 戰場繪圖：背景、火柴勇者（含裝備與鬥氣）、夥伴、怪物、特效
   ========================================================= */
(function () {
  const C = G.CFG, B = G.battle, FX = G.pfx;
  const FONT = '"Noto Sans TC","Microsoft JhengHei",sans-serif';
  const TITLE = '"Noto Serif TC","Noto Sans TC","Microsoft JhengHei",serif';
  let ctx, t = 0, portraitMode = false;

  const STARS = [];
  (function () { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 90; i++) STARS.push([r(), r() * 0.55, r() * 1.2 + 0.3, r() * 6]); })();

  /* ---------- 小工具 ---------- */
  function circ(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function line(pts, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]); ctx.stroke();
  }
  function poly(pts, fill, stroke, w) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w || 1; ctx.stroke(); }
  }
  function text(s, x, y, size, col, align = 'center', weight = 700, font = FONT) {
    ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
  }
  function outlined(s, x, y, size, col, align = 'center', font = FONT) {
    ctx.font = `900 ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = 'rgba(10,6,16,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  // shadowBlur 是最耗效能的繪圖；低畫質模式（main.js 偵測到掉幀時開啟）直接不畫光暈
  function glow(col, blur, fn) {
    if (G.lowFx) { fn(); return; }
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = blur; fn(); ctx.restore();
  }
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
  // 怪物圖（像素版或高畫質版）：以腳底中心為原點畫，回傳顯示寬高
  const SW = img => img._w || img.width, SH = img => img._h || img.height;
  function drawSprite(img) {
    if (img._hd) { ctx.imageSmoothingEnabled = true; ctx.drawImage(img, -img._ax, -img._ay, img._w, img._h); }
    else { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, -img.width / 2, -img.height); }
  }
  const rainbowAt = k => `hsl(${(t * 120 + k) % 360},100%,65%)`;

  /* ---------- 背景 ---------- */
  // 不會動的部分（天空、月亮、山、城堡、地面）畫一次存起來，之後每幀只貼圖
  // 換區域、改視窗大小、畫質改變時才重畫
  let bgKey = '', skyCv = null, sceneCv = null;
  function bakeLayer(cv, sc, fn) {
    cv.width = Math.ceil(B.W * sc); cv.height = Math.ceil(C.H * sc);
    const c2 = cv.getContext('2d'), keep = ctx;
    c2.setTransform(sc, 0, 0, sc, 0, 0);
    ctx = c2; fn(); ctx = keep;
  }
  function drawBackground() {
    const W = B.W, z = G.zone(G.S.stage), gy = C.GROUND;
    const sc = ctx.getTransform().a, key = G.zoneIndex(G.S.stage) + '|' + W + '|' + sc + '|' + !!G.lowFx;
    if (key !== bgKey) {
      bgKey = key;
      skyCv = skyCv || document.createElement('canvas');
      sceneCv = sceneCv || document.createElement('canvas');
      bakeLayer(skyCv, sc, () => {
        const g = ctx.createLinearGradient(0, 0, 0, gy);
        g.addColorStop(0, z.sky[0]); g.addColorStop(1, z.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, C.H);
      });
      bakeLayer(sceneCv, sc, () => drawScenery(z));
    }
    ctx.drawImage(skyCv, 0, 0, W, C.H);
    ctx.fillStyle = 'rgb(255,250,230)';
    for (const [x, y, r, p] of STARS) {
      ctx.globalAlpha = 0.15 + 0.5 * Math.abs(Math.sin(t * 0.6 + p));
      ctx.beginPath(); ctx.arc(x * W, y * gy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(sceneCv, 0, 0, W, C.H);
    decos(z);
  }
  function drawScenery(z) {
    const W = B.W, gy = C.GROUND;
    // 月亮
    const mx = W * 0.8, my = 78;
    glow(z.moon, 40, () => circ(mx, my, 30, z.moon));
    circ(mx + 11, my - 6, 26, hexA(z.sky[0], 0.35));
    // 遠景
    ridge(z.far, gy - 95, 0.005, 40, 11);
    if (z.deco === 'castle' || G.zoneIndex(G.S.stage) % 2 === 0) castle(W * 0.62, gy - 88, z.far);
    ridge(z.hill, gy - 40, 0.012, 26, 3);
    // 地面
    ctx.fillStyle = z.ground; ctx.fillRect(0, gy, W, C.H - gy);
    ctx.fillStyle = z.dirt; ctx.fillRect(0, gy + 10, W, C.H - gy - 10);
    ctx.fillStyle = hexA(z.accent, 0.55); ctx.fillRect(0, gy, W, 2);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let x = 0; x < W; x += 38) ctx.fillRect(x + ((x / 38) % 3) * 9, gy + 18 + ((x / 38) % 2) * 20, 10, 4);
    // 小草
    ctx.fillStyle = hexA(z.accent, 0.35);
    for (let x = 6; x < W; x += 23) ctx.fillRect(x, gy - 3 - ((x * 7) % 3), 2, 3 + ((x * 7) % 3));
  }
  function ridge(col, base, freq, amp, seed) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, C.GROUND);
    for (let x = 0; x <= B.W; x += 10) ctx.lineTo(x, base - Math.abs(Math.sin(x * freq + seed)) * amp - Math.sin(x * freq * 3.1 + seed) * amp * 0.3);
    ctx.lineTo(B.W, C.GROUND); ctx.fill();
  }
  function castle(x, y, col) {
    ctx.fillStyle = G.shade(col, -0.25);
    ctx.fillRect(x - 50, y - 20, 100, 60);
    [[-50, 40, 14], [-14, 60, 16], [30, 46, 14]].forEach(([dx, h, w]) => {
      ctx.fillRect(x + dx, y - h, w, h + 10);
      poly([x + dx - 3, y - h, x + dx + w / 2, y - h - 16, x + dx + w + 3, y - h], G.shade(col, -0.35));
    });
    ctx.fillStyle = 'rgba(255,210,120,.55)';
    [[-44, -26], [-8, -44], [36, -30], [0, -6], [20, -6]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 3, 5));
  }
  function decos(z) {
    const gy = C.GROUND, W = B.W;
    for (let k = 0; k < 9; k++) {
      const x = ((k * 137 + 60) % (W + 80)) - 40;
      if (Math.abs(x - C.HERO_X) < 40) continue;
      const s = 0.7 + ((k * 31) % 5) / 10;
      ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
      const dark = G.shade(z.hill, -0.35);
      switch (z.deco) {
        case 'tree':
          ctx.fillStyle = '#4a3020'; ctx.fillRect(-3, -26, 6, 26);
          circ(0, -36, 18, dark); circ(-10, -28, 12, dark); circ(10, -28, 12, dark); break;
        case 'pine':
          ctx.fillStyle = '#2a1a10'; ctx.fillRect(-2, -12, 4, 12);
          poly([-16, -10, 0, -56, 16, -10], dark); poly([-12, -28, 0, -66, 12, -28], dark); break;
        case 'grave':
          ctx.fillStyle = dark; ctx.fillRect(-8, -22, 16, 22); circ(0, -22, 8, dark);
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-1, -24, 2, 12); ctx.fillRect(-5, -20, 10, 2); break;
        case 'rock':
          poly([-18, 0, -12, -20, 4, -28, 16, -12, 20, 0], dark);
          ctx.fillStyle = `rgba(255,120,40,${0.4 + 0.3 * Math.sin(t * 3 + k)})`; ctx.fillRect(-4, -16, 3, 10); break;
        case 'ice':
          poly([-10, 0, -4, -40, 2, 0], 'rgba(200,240,255,.7)'); poly([0, 0, 8, -28, 14, 0], 'rgba(160,220,255,.6)'); break;
        case 'castle':
          ctx.fillStyle = dark; ctx.fillRect(-6, -40, 12, 40); poly([-9, -40, 0, -58, 9, -40], dark);
          ctx.fillStyle = `rgba(255,80,120,${0.5 + 0.3 * Math.sin(t * 2 + k)})`; ctx.fillRect(-2, -30, 4, 6); break;
      }
      ctx.restore();
    }
  }

  /* ---------- 火柴勇者 ----------
     姿勢用關節座標表示（腳底在 0,0，面朝右）。攻擊時在「蓄力 → 出招 → 收招」之間內插。
     hip 髖、neck 脖子、head 頭、fk/ff 前腳膝蓋/腳、bk/bf 後腳、fe/fh 持劍手肘/手、be/bh 另一隻手、sw 劍的角度 */
  const INK = '#f7f3ea', LINE = '#140f1c';
  const POSE = {
    idle:    { hip: [0, -25], neck: [3, -45], head: [5, -54], fk: [8, -13], ff: [11, 0], bk: [-5, -12], bf: [-10, 0], fe: [10, -37], fh: [15, -33], be: [-3, -37], bh: [-8, -31], sw: -0.95 },
    slashW:  { hip: [-2, -24], neck: [-3, -44], head: [-4, -53], fk: [7, -13], ff: [11, 0], bk: [-7, -12], bf: [-12, 0], fe: [-6, -50], fh: [-2, -59], be: [2, -38], bh: [8, -36], sw: -2.7 },
    slashS:  { hip: [9, -21], neck: [17, -38], head: [21, -46], fk: [19, -11], ff: [25, 0], bk: [0, -10], bf: [-10, 0], fe: [26, -32], fh: [33, -24], be: [6, -36], bh: [-3, -42], sw: 0.55 },
    upperW:  { hip: [2, -17], neck: [8, -34], head: [11, -42], fk: [12, -9], ff: [14, 0], bk: [-6, -8], bf: [-11, 0], fe: [12, -22], fh: [16, -12], be: [2, -28], bh: [-4, -22], sw: 1.1 },
    upperS:  { hip: [6, -33], neck: [8, -53], head: [9, -62], fk: [12, -22], ff: [10, -10], bk: [-1, -20], bf: [-6, -11], fe: [14, -60], fh: [17, -70], be: [0, -48], bh: [-7, -44], sw: -1.35 },
    thrustW: { hip: [-3, -24], neck: [-6, -43], head: [-8, -51], fk: [6, -13], ff: [10, 0], bk: [-8, -12], bf: [-12, 0], fe: [-6, -36], fh: [-10, -33], be: [2, -40], bh: [10, -42], sw: -0.08 },
    thrustS: { hip: [12, -18], neck: [24, -33], head: [29, -40], fk: [25, -10], ff: [32, 0], bk: [2, -8], bf: [-12, 0], fe: [32, -30], fh: [42, -29], be: [14, -34], bh: [4, -38], sw: -0.04 },
    spinW:   { hip: [2, -18], neck: [6, -36], head: [8, -44], fk: [12, -9], ff: [15, 0], bk: [-6, -9], bf: [-12, 0], fe: [-4, -30], fh: [-12, -28], be: [10, -30], bh: [16, -26], sw: 2.6 },
    castW:   { hip: [0, -26], neck: [1, -46], head: [1, -55], fk: [7, -13], ff: [10, 0], bk: [-6, -12], bf: [-10, 0], fe: [4, -56], fh: [4, -66], be: [-3, -56], bh: [2, -66], sw: -1.57 },
  };
  const MOVES = { slash: ['slashW', 'slashS'], upper: ['upperW', 'upperS'], thrust: ['thrustW', 'thrustS'], spin: ['spinW', 'spinS'], cast: ['castW', 'slashS'] };
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => 1 - (1 - k) * (1 - k);
  function mixPose(A, Bp, k) {
    const o = {};
    for (const key in A) o[key] = key === 'sw' ? lerp(A.sw, Bp.sw, k) : [lerp(A[key][0], Bp[key][0], k), lerp(A[key][1], Bp[key][1], k)];
    return o;
  }
  function spinPose(q) { // 迴旋斬：劍繞著身體轉
    const a = 2.6 + q * Math.PI * 2.6;
    const base = { hip: [4, -24], neck: [6, -43], head: [8, -52], fk: [13, -12], ff: [19, 0], bk: [-6, -11], bf: [-14, 0], be: [-4, -38], bh: [-12, -40] };
    const sh = [6, -40];
    return Object.assign(base, { fe: [sh[0] + Math.cos(a) * 8, sh[1] + Math.sin(a) * 8], fh: [sh[0] + Math.cos(a) * 16, sh[1] + Math.sin(a) * 16], sw: a });
  }
  // 依動畫進度回傳 { p: 姿勢, striking: 是否正在揮劍 }
  function heroPose(st) {
    const br = Math.sin(t * 2.4) * 0.9;
    const I = mixPose(POSE.idle, POSE.idle, 0);
    ['hip', 'neck', 'head', 'fe', 'fh', 'be', 'bh'].forEach(k => { I[k] = [I[k][0], I[k][1] + br * (k === 'hip' ? 0.4 : 1)]; });
    I.sw += Math.sin(t * 2.4) * 0.04;
    const a = st.anim;
    if (!a) return { p: I, striking: false };
    const [wk, sk] = MOVES[a.pose], W = POSE[wk], q = a.t / a.dur;
    const w0 = a.pose === 'cast' ? 0.42 : 0.3, s0 = w0 + 0.12, h0 = a.pose === 'spin' ? 0.82 : 0.68;
    if (a.pose === 'spin' && q >= w0 && q < h0) return { p: spinPose((q - w0) / (h0 - w0)), striking: true };
    const S = sk === 'spinS' ? spinPose(1) : POSE[sk];
    if (q < w0) return { p: mixPose(I, W, ease(q / w0)), striking: false };
    if (q < s0) return { p: mixPose(W, S, (q - w0) / (s0 - w0)), striking: true };
    if (q < h0) return { p: S, striking: q < s0 + 0.06 };
    return { p: mixPose(S, I, ease((q - h0) / (1 - h0))), striking: false };
  }

  function itemCol(slot) { const it = G.S.equip[slot]; return it ? C.rarities[it.rar].color : null; }
  function auraColor(tier) { if (!tier) return null; const c = C.auras[tier - 1].color; return c === 'rainbow' ? rainbowAt(0) : c; }
  function limb(a, b, c) { // 兩段式手腳：先畫深色描邊再畫白色
    line([a[0], a[1], b[0], b[1], c[0], c[1]], LINE, 6.5);
    line([a[0], a[1], b[0], b[1], c[0], c[1]], INK, 3.6);
  }
  function star(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }

  /* ---------- 武器：依稀有度有完全不同的造型 ---------- */
  const SWORD_LEN = [22, 25, 29, 33, 35, 37, 41]; // 沒裝備、普通、精良、稀有、史詩、傳說、神話
  function drawSword(rar, tier) {
    const L = SWORD_LEN[rar + 1], B0 = 5, tip = B0 + L;
    const glowCol = rar >= 3 ? C.rarities[rar].color : auraColor(tier);
    const blade = fn => { if (glowCol && (rar >= 2 || tier >= 2)) glow(glowCol, 10 + Math.max(0, rar) * 3, fn); else fn(); };
    // 握柄（纏布）+ 柄頭
    ctx.fillStyle = rar >= 4 ? '#3a1a10' : '#5a3620'; ctx.fillRect(-6, -1.6, 11, 3.2);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; for (let k = -5; k < 4; k += 3) ctx.fillRect(k, -1.6, 1, 3.2);
    circ(-7, 0, 2.2, rar >= 2 ? '#e8b84a' : '#8a8a92');
    switch (rar) {
      case -1: // 訓練短劍
        blade(() => poly([B0, -2, tip - 4, -2, tip, 0, tip - 4, 2, B0, 2], '#c9d2de', LINE, 1));
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(3, -4.5, 3, 9);
        break;
      case 0: // 木劍
        blade(() => poly([B0, -2.6, tip - 3, -2.6, tip, -0.5, tip, 0.5, tip - 3, 2.6, B0, 2.6], '#b8864e', LINE, 1));
        ctx.fillStyle = '#8a5e32'; ctx.fillRect(B0 + 3, -0.5, L - 8, 1);
        ctx.fillStyle = '#7a4e28'; ctx.fillRect(3, -4, 3, 8);
        break;
      case 1: // 鐵劍：血槽 + 鐵護手
        blade(() => poly([B0, -2.8, tip - 6, -2.8, tip, 0, tip - 6, 2.8, B0, 2.8], '#dde4ee', LINE, 1));
        ctx.fillStyle = '#9aa6b8'; ctx.fillRect(B0 + 1, -0.6, L - 9, 1.2);
        ctx.fillStyle = '#7a8496'; ctx.fillRect(2.5, -6, 3, 12);
        break;
      case 2: // 騎士長劍：金色彎護手 + 藍寶石
        blade(() => poly([B0, -3, tip - 7, -3, tip, 0, tip - 7, 3, B0, 3], '#eef3fa', '#2a4a8a', 1.2));
        ctx.fillStyle = '#4da6ff'; ctx.fillRect(B0 + 1, -0.7, L - 10, 1.4);
        poly([1, -8, 6, -4, 6, 4, 1, 8, 3, 0], '#e8b84a', '#7a5a10', 1);
        glow('#4da6ff', 8, () => circ(4, 0, 2, '#7fc4ff'));
        break;
      case 3: // 秘銀劍：紫光劍身 + 閃爍符文
        blade(() => {
          const g = ctx.createLinearGradient(B0, 0, tip, 0); g.addColorStop(0, '#8a4ae8'); g.addColorStop(1, '#f4e6ff');
          poly([B0, -3.2, tip - 8, -3.6, tip, 0, tip - 8, 3.6, B0, 3.2], g, '#3a1a6a', 1.2);
        });
        for (let k = 0; k < 5; k++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 4 + k))})`; ctx.fillRect(B0 + 4 + k * 5.5, -1, 2, 2); }
        poly([2, -10, 7, -3, 7, 3, 2, 10, 4, 0], '#c9b0ff', '#4a2a8a', 1);
        break;
      case 4: { // 龍牙大劍：寬刃、鋸齒背、骨頭護手、火星
        blade(() => {
          const g = ctx.createLinearGradient(0, -6, 0, 5); g.addColorStop(0, '#ffcf7a'); g.addColorStop(1, '#c84a1a');
          const pts = [B0, 4.5, tip - 9, 4.5, tip, 0];
          for (let k = 0; k <= 6; k++) pts.push(tip - 4 - k * (L - 8) / 6, -5.5 - (k % 2 ? 2.5 : 0));
          pts.push(B0, -5);
          poly(pts, g, '#4a1408', 1.3);
        });
        ctx.fillStyle = '#ffe9b0'; ctx.fillRect(B0 + 2, 1.5, L - 12, 1);
        poly([1, -10, 6, -6, 6, 6, 1, 10, 3, 0], '#efe4cc', '#6a5a44', 1);
        for (let k = 0; k < 3; k++) { const f = (t * 1.5 + k / 3) % 1; ctx.fillStyle = `rgba(255,${150 + k * 30},60,${1 - f})`; ctx.fillRect(B0 + 6 + k * 9, -8 - f * 14, 2, 2); }
        break;
      }
      case 5: // 星辰聖劍：天使翅膀護手、星形寶石、環繞星光
        blade(() => {
          const g = ctx.createLinearGradient(B0, 0, tip, 0); g.addColorStop(0, '#ff5a8a'); g.addColorStop(0.5, '#ffe6f0'); g.addColorStop(1, '#ffffff');
          poly([B0, -3.4, tip - 9, -3.8, tip, 0, tip - 9, 3.8, B0, 3.4], g, '#e8b84a', 1.4);
        });
        ctx.fillStyle = '#ffd23d'; ctx.fillRect(B0 + 1, -0.6, L - 11, 1.2);
        [-1, 1].forEach(sd => poly([5, 0, 0, sd * 6, -4, sd * 13, 2, sd * 11, 0, sd * 17, 5, sd * 12, 6, sd * 4], '#ffffff', '#c8a040', 1));
        glow('#ff3d6a', 14, () => star(5, 0, 3.5 + Math.sin(t * 6) * 0.8, '#ffd8e4'));
        for (let k = 0; k < 4; k++) {
          const a = t * 3 + k * Math.PI / 2, px = B0 + L * 0.55 + Math.cos(a) * L * 0.5, py = Math.sin(a) * 7;
          ctx.fillStyle = k % 2 ? '#ffffff' : '#ffd23d'; ctx.fillRect(px - 1, py - 1, 2, 2);
        }
        break;
    }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(B0 + 2, -1.6, L * 0.5, 0.9); // 反光
    if ((t * 0.7) % 1 < 0.08) star(tip - 2, -1, 3, '#ffffff');               // 劍尖偶爾閃一下
  }

  const HS = 0.92;          // 勇者放大倍率
  // 有粗細的手腳：上段粗、下段細；腳有靴子、手有金屬護腕；back = 遠側（顏色暗一點）
  // 勇者的材質：皮膚（象牙白）、大衣、褲子、皮靴、金屬；每種都有亮 / 中 / 暗三色，畫成有圓柱感的光影
  const HM = {
    skin: ['#fffaf0', '#ece3d2', '#b3a48c'], skinFar: ['#e6dccb', '#cfc4b0', '#958871'],
    coat: ['#5a62a8', '#30356a', '#171a3a'], pants: ['#4a4660', '#2c2940', '#16141f'], pantsFar: ['#3a374e', '#221f32', '#100e18'],
    boot: ['#a8744a', '#6a4426', '#33200f'], metal: ['#ffffff', '#c4cede', '#6a7488'], hair: ['#5a5070', '#2a2438', '#0e0b16'],
  };
  // 一段圓柱：先描邊，再用垂直於這段的漸層上色（左上亮、右下暗）
  function seg(a, b, w, M) {
    line([a[0], a[1], b[0], b[1]], LINE, w + 2.6);
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const s0 = nx * -0.7 + ny * -0.7 > 0 ? 1 : -1; // 讓亮面朝左上
    const g = ctx.createLinearGradient(mx + nx * w / 2 * s0, my + ny * w / 2 * s0, mx - nx * w / 2 * s0, my - ny * w / 2 * s0);
    g.addColorStop(0, M[0]); g.addColorStop(0.45, M[1]); g.addColorStop(1, M[2]);
    line([a[0], a[1], b[0], b[1]], g, w);
  }
  function ball(x, y, r, M) { // 關節／圓形部件：球形光影
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, M[0]); g.addColorStop(0.55, M[1]); g.addColorStop(1, M[2]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // 手：上臂是皮膚、前臂戴金屬護腕；腳：褲子 + 皮靴
  function heroLimb(a, b, c, kind, back) {
    const leg = kind === 'leg';
    if (leg) {
      const P = back ? HM.pantsFar : HM.pants, bk = [b[0] + (c[0] - b[0]) * 0.45, b[1] + (c[1] - b[1]) * 0.45];
      seg(a, b, 6.2, P); ball(b[0], b[1], 3, P); seg(b, bk, 5, P);
      seg(bk, c, 5.6, HM.boot);
      ctx.fillStyle = LINE; ctx.beginPath(); ctx.ellipse(c[0] + 2.6, c[1] - 1.2, 5.2, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, c[1] - 4, 0, c[1] + 1); g.addColorStop(0, HM.boot[0]); g.addColorStop(0.5, HM.boot[1]); g.addColorStop(1, HM.boot[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c[0] + 2.6, c[1] - 1.3, 4.1, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      line([bk[0] - 2.6, bk[1], bk[0] + 2.6, bk[1]], '#e8b84a', 1.4); // 靴口金邊
      if (!back) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(c[0] + 0.5, c[1] - 3, 2.2, 0.8); } // 皮革反光
    } else {
      const S = back ? HM.skinFar : HM.skin, br = [b[0] + (c[0] - b[0]) * 0.35, b[1] + (c[1] - b[1]) * 0.35];
      seg(a, b, 4.6, S); ball(b[0], b[1], 2.3, S); seg(b, br, 3.8, S);
      seg(br, c, 4.6, back ? ['#c4cede', '#8a94a8', '#4a5468'] : HM.metal);          // 金屬護腕
      line([br[0], br[1], c[0], c[1]], 'rgba(255,255,255,.7)', 0.8);
    }
  }

  const SWORD_SCALE = 1.25; // 劍再放大一點，比較有魄力
  function drawHero() {
    const st = B.unitState.hero || {};
    const lvl = G.S.units.hero, tier = G.auraTier(lvl);
    const x = C.HERO_X, y = C.GROUND;
    const { p, striking } = heroPose(st);
    const W = pt => [x + pt[0] * HS, y + pt[1] * HS];

    // 鬥氣：光暈 + 火焰粒子
    if (tier) {
      const a = C.auras[tier - 1], cx = x + p.hip[0] * HS, cy = y - 30;
      const R = 20 + tier * 5 + Math.sin(t * 6) * 2;
      const gr = ctx.createRadialGradient(cx, cy, 4, cx, cy, R + 18);
      gr.addColorStop(0, a.color === 'rainbow' ? 'rgba(255,255,255,.35)' : hexA(a.color, 0.35)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, R, R + 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const q of B.parts) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s * 1.6); }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // 劍的殘影軌跡（世界座標）
    const wr = G.S.equip.weapon ? G.S.equip.weapon.rar : -1;
    const L = (SWORD_LEN[wr + 1] + 5) * SWORD_SCALE, hw = W(p.fh);
    const tipW = [hw[0] + Math.cos(p.sw) * L * HS, hw[1] + Math.sin(p.sw) * L * HS];
    const midW = [hw[0] + Math.cos(p.sw) * L * 0.3 * HS, hw[1] + Math.sin(p.sw) * L * 0.3 * HS];
    st.trail = st.trail || [];
    if (striking) st.trail.push({ tip: tipW, mid: midW, life: 0.2 });
    st.trail.forEach(s => { s.life -= 1 / 60; });
    st.trail = st.trail.filter(s => s.life > 0);
    if (st.trail.length > 1) {
      const tc = auraColor(tier) || (wr >= 2 ? C.rarities[wr].color : '#ffffff');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 1; k < st.trail.length; k++) {
        const a = st.trail[k - 1], b = st.trail[k];
        ctx.globalAlpha = 0.6 * Math.min(a.life, b.life) / 0.2;
        poly([a.tip[0], a.tip[1], b.tip[0], b.tip[1], b.mid[0], b.mid[1], a.mid[0], a.mid[1]], tc);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(x, y); ctx.scale(HS, HS);
    { const sx = (p.ff[0] + p.bf[0]) / 2, g = ctx.createRadialGradient(sx, 0, 1, sx, 0, 17); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, 0, 17, 3.6, 0, 0, Math.PI * 2); ctx.fill(); }

    const bandCol = auraColor(tier) || '#e8433a', sp = striking ? 1.7 : 1;
    // 大衣下擺：從腰往後下方飄（揮劍時甩得更開）
    {
      const hp = p.hip, fl = Math.sin(t * 6) * 2, bk = striking ? -5 : 0;
      const cg = ctx.createLinearGradient(hp[0] + 4, hp[1] - 4, hp[0] - 14, hp[1] + 16); cg.addColorStop(0, HM.coat[0]); cg.addColorStop(0.5, HM.coat[1]); cg.addColorStop(1, HM.coat[2]);
      poly([hp[0] - 3, hp[1] - 5, hp[0] + 4, hp[1] - 3, hp[0] + 1 + fl * 0.4, hp[1] + 15, hp[0] - 7 + fl + bk, hp[1] + 17, hp[0] - 15 + fl * 1.5 + bk, hp[1] + 13], cg, LINE, 1.4);
      line([hp[0] - 2, hp[1] - 1, hp[0] - 6 + fl * 0.8 + bk, hp[1] + 14], 'rgba(10,10,30,.55)', 1); // 摺痕
      line([hp[0] + 1 + fl * 0.4, hp[1] + 15, hp[0] - 7 + fl + bk, hp[1] + 17, hp[0] - 15 + fl * 1.5 + bk, hp[1] + 13], tier ? bandCol : '#e8b84a', 1.1);
    }
    // 圍巾的長尾巴：從脖子往後飄、越後面越細，出招時拉長
    {
      // 先算出中心線，再沿著法線往兩側展開成一整片（一次填色、一次描邊，不會一節一節）
      const n = p.neck, x0 = n[0] - 2, y0 = n[1] + 1, C2 = [];
      for (let j = 0; j <= 9; j++) C2.push([x0 - j * 4.4 * sp, y0 + j * 0.9 + (j ? Math.sin(t * 8 - j * 0.8) * (0.6 + j * 0.5) : 0), 2.8 - j * 0.2]);
      const Lft = [], Rgt = [];
      C2.forEach(([cx, cy, w], j) => {
        const a2 = C2[Math.max(0, j - 1)], b2 = C2[Math.min(9, j + 1)], dx = b2[0] - a2[0], dy = b2[1] - a2[1], d = Math.hypot(dx, dy) || 1;
        Lft.push(cx - dy / d * w, cy + dx / d * w); Rgt.unshift(cx + dy / d * w, cy - dx / d * w);
      });
      const sg = ctx.createLinearGradient(x0, y0 - 3, x0, y0 + 9); sg.addColorStop(0, G.shade(bandCol.startsWith('#') ? bandCol : '#e8433a', 0.35)); sg.addColorStop(0.5, bandCol); sg.addColorStop(1, G.shade(bandCol.startsWith('#') ? bandCol : '#e8433a', -0.45));
      poly([...Lft, ...Rgt], sg, LINE, 1.5); // Rgt 是從尾端排回來的，接在 Lft 後面剛好繞一圈
      line([C2[1][0], C2[1][1] - 1, C2[5][0], C2[5][1] - 1], 'rgba(255,255,255,.45)', 0.9);   // 布料的亮面
      for (const j of [3, 6]) line([C2[j][0], C2[j][1] - 2, C2[j][0] - 2, C2[j][1] + 2], 'rgba(0,0,0,.3)', 0.9); // 摺痕
    }
    // 後腳
    heroLimb(p.hip, p.bk, p.bf, 'leg', true);
    // 披風（跟著身體，揮劍時往後甩）
    const cape = itemCol('cape');
    if (cape) {
      const fl = Math.sin(t * 5) * 4, n = p.neck, hp = p.hip, back = striking ? -8 : 0;
      poly([n[0] - 2, n[1] + 1, n[0] + 3, n[1] + 1, hp[0] - 4, hp[1] + 10, hp[0] - 20 + fl + back, hp[1] + 16, n[0] - 16 + fl * 0.5 + back, n[1] + 8], hexA(cape, 0.95), G.shade(cape, -0.45), 1.5);
    }
    // 後手
    heroLimb(p.neck, p.be, p.bh, 'arm', true);
    // 身體：倒三角（胸寬腰窄）+ 腰帶
    {
      const n = p.neck, hp = p.hip, a = Math.atan2(n[1] - hp[1], n[0] - hp[0]), qx = -Math.sin(a), qy = Math.cos(a);
      const tg = ctx.createLinearGradient(n[0] - qx * 6, n[1] - qy * 6, n[0] + qx * 6, n[1] + qy * 6); tg.addColorStop(0, HM.coat[2]); tg.addColorStop(0.55, HM.coat[1]); tg.addColorStop(1, HM.coat[0]);
      poly([hp[0] + qx * 3.8, hp[1] + qy * 3.8, n[0] + qx * 6.2, n[1] + qy * 6.2, n[0] - qx * 6.2, n[1] - qy * 6.2, hp[0] - qx * 3.8, hp[1] - qy * 3.8], tg, LINE, 1.8);
      // 胸前的 V 領（露出象牙白的身體）＋ 金色滾邊 ＋ 中縫
      const cx2 = n[0] + Math.cos(a) * -1, cy2 = n[1] + Math.sin(a) * -1, vx = n[0] - Math.cos(a) * -7, vy = n[1] - Math.sin(a) * -7;
      poly([cx2 + qx * 3.2, cy2 + qy * 3.2, (n[0] + hp[0]) / 2 + (n[0] - hp[0]) * 0.15, (n[1] + hp[1]) / 2 + (n[1] - hp[1]) * 0.15, cx2 - qx * 3.2, cy2 - qy * 3.2], HM.skin[1], null);
      line([cx2 + qx * 3.4, cy2 + qy * 3.4, (n[0] + hp[0]) / 2 + (n[0] - hp[0]) * 0.15, (n[1] + hp[1]) / 2 + (n[1] - hp[1]) * 0.15, cx2 - qx * 3.4, cy2 - qy * 3.4], '#e8b84a', 1.1);
      line([(n[0] + hp[0]) / 2 + (n[0] - hp[0]) * 0.15, (n[1] + hp[1]) / 2 + (n[1] - hp[1]) * 0.15, hp[0], hp[1]], 'rgba(10,10,30,.6)', 0.8);
      line([n[0] + qx * 4.6, n[1] + qy * 4.6, hp[0] + qx * 2.8, hp[1] + qy * 2.8], 'rgba(255,255,255,.28)', 1.1); // 衣服的亮面
      const bx = hp[0] + Math.cos(a) * 3, by = hp[1] + Math.sin(a) * 3;
      line([bx + qx * 4.4, by + qy * 4.4, bx - qx * 4.4, by - qy * 4.4], LINE, 3.8); line([bx + qx * 3.8, by + qy * 3.8, bx - qx * 3.8, by - qy * 3.8], '#6a4426', 2.3);
      line([bx + qx * 3.8, by + qy * 3.8 - 0.6, bx - qx * 3.8, by - qy * 3.8 - 0.6], 'rgba(255,220,170,.4)', 0.6);
      ball(bx, by, 1.8, ['#fff2a8', '#e8b84a', '#8a5a10']);
    }
    // 鎧甲（沿著身體角度）
    const armor = itemCol('armor');
    if (armor) {
      const ang = Math.atan2(p.neck[1] - p.hip[1], p.neck[0] - p.hip[0]), len = Math.hypot(p.neck[0] - p.hip[0], p.neck[1] - p.hip[1]);
      ctx.save(); ctx.translate(p.hip[0], p.hip[1]); ctx.rotate(ang + Math.PI / 2);
      poly([-6, 0, 6, 0, 8, -len + 3, -8, -len + 3], armor, G.shade(armor, -0.5), 1.5);
      ctx.fillStyle = G.shade(armor, 0.45); ctx.fillRect(-5, -len + 6, 3, 7);
      ctx.fillStyle = '#e8b84a'; ctx.fillRect(-6, -4, 12, 2.5);
      if (G.S.equip.armor.rar >= 3) { // 高稀有度有金色肩甲
        poly([-9, -len + 3, -4, -len + 1, -4, -len + 7, -10, -len + 8], '#e8b84a', LINE, 0.8);
        poly([9, -len + 3, 4, -len + 1, 4, -len + 7, 10, -len + 8], '#e8b84a', LINE, 0.8);
      }
      ctx.restore();
    }
    // 前腳
    heroLimb(p.hip, p.fk, p.ff, 'leg', false);
    // 圍巾繞在脖子上的那一圈
    { const n = p.neck; ctx.fillStyle = bandCol; ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(n[0], n[1] - 0.5, 6.4, 3.2, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // 頭
    const h = p.head, helm = G.S.equip.helm;
    // 刺刺的頭髮（戴頭盔就蓋住）：先畫往後上方翹的髮尖，再畫臉
    if (!helm) {
      const H0 = h[0], H1 = h[1], wv = Math.sin(t * 5) * 0.8;
      const hg = ctx.createLinearGradient(H0 + 4, H1 - 18, H0 - 12, H1 + 2); hg.addColorStop(0, HM.hair[0]); hg.addColorStop(0.5, HM.hair[1]); hg.addColorStop(1, HM.hair[2]);
      poly([H0 - 6, H1 + 3, H0 - 14 + wv, H1 - 1, H0 - 9, H1 - 4, H0 - 16 + wv, H1 - 10, H0 - 8, H1 - 9, H0 - 10 + wv, H1 - 17, H0 - 2, H1 - 11, H0 + 1, H1 - 18, H0 + 4, H1 - 10, H0 + 9, H1 - 13, H0 + 8, H1 - 5], hg, LINE, 1.6);
      for (const [a, b, c2, d] of [[H0 - 1, H1 - 11, H0 + 0.6, H1 - 16], [H0 - 7, H1 - 9, H0 - 8.5, H1 - 14], [H0 - 9, H1 - 4, H0 - 13, H1 - 8]]) line([a, b, c2, d], 'rgba(200,190,255,.45)', 0.9); // 髮絲的亮光
    }
    ctx.beginPath(); ctx.arc(h[0], h[1], 8.5, 0, Math.PI * 2); ctx.strokeStyle = LINE; ctx.lineWidth = 2.2; ctx.stroke();
    ball(h[0], h[1], 8.4, HM.skin);
    ctx.fillStyle = 'rgba(255,150,140,.25)'; ctx.beginPath(); ctx.ellipse(h[0] + 3.5, h[1] + 3, 2.4, 1.4, 0, 0, Math.PI * 2); ctx.fill(); // 臉頰
    if (!helm) poly([h[0] - 6, h[1] - 7, h[0] + 9, h[1] - 6, h[0] + 7, h[1] - 3.6, h[0] + 4, h[1] - 5, h[0] + 1.5, h[1] - 3.4, h[0] - 1, h[1] - 5.2], '#24202e', LINE, 1); // 瀏海
    // 眼睛：平常銳利，出招時瞇起來；鬥氣第 3 階起眼睛發光
    if (striking) { ctx.fillStyle = LINE; ctx.fillRect(h[0] + 2, h[1] - 1, 6, 1.6); }
    else {
      poly([h[0] + 2, h[1] - 2.6, h[0] + 7.2, h[1] - 1.4, h[0] + 6.6, h[1] + 1, h[0] + 2.5, h[1] + 0.3], LINE);
      line([h[0] + 1.2, h[1] - 4.4, h[0] + 7.6, h[1] - 3.4], LINE, 1.3); // 銳利的眉毛
      if (tier >= 3) glow(bandCol, 8, () => circ(h[0] + 5.2, h[1] - 0.6, 1.3, bandCol));
      else { ctx.fillStyle = '#fff'; ctx.fillRect(h[0] + 5, h[1] - 1.5, 1.2, 1.2); }
    }
    if (!helm) {
      ctx.save(); ctx.beginPath(); ctx.arc(h[0], h[1], 8.5, 0, Math.PI * 2); ctx.clip();
      const bg2 = ctx.createLinearGradient(0, h[1] - 6.5, 0, h[1] - 3.1); bg2.addColorStop(0, G.shade(bandCol.startsWith('#') ? bandCol : '#e8433a', 0.35)); bg2.addColorStop(1, G.shade(bandCol.startsWith('#') ? bandCol : '#e8433a', -0.35));
      ctx.fillStyle = bg2; ctx.fillRect(h[0] - 9, h[1] - 6.5, 18, 3.4);
      ctx.restore();
      { const g3 = ctx.createLinearGradient(0, h[1] - 6.5, 0, h[1] - 3.1); g3.addColorStop(0, '#fff2a8'); g3.addColorStop(1, '#a87a1a'); ctx.fillStyle = g3; ctx.fillRect(h[0] + 3, h[1] - 6.5, 3.2, 3.4); ctx.strokeStyle = LINE; ctx.lineWidth = 0.6; ctx.strokeRect(h[0] + 3, h[1] - 6.5, 3.2, 3.4); } // 頭帶上的金屬片
    } else {
      const hc = C.rarities[helm.rar].color, dk = G.shade(hc, -0.45), hx = h[0], hy = h[1];
      ctx.beginPath(); ctx.arc(hx, hy, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(hx + 9.5, hy - 1); ctx.lineTo(hx - 9.5, hy - 1); ctx.closePath();
      ctx.fillStyle = hc; ctx.fill(); ctx.strokeStyle = dk; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = G.shade(hc, 0.5); ctx.fillRect(hx - 5, hy - 8, 4, 2);
      if (helm.rar >= 2 && helm.rar < 4) { poly([hx - 8, hy - 6, hx - 16, hy - 17, hx - 6, hy - 9], '#f0e6d0', LINE, 1); poly([hx + 8, hy - 6, hx + 16, hy - 17, hx + 6, hy - 9], '#f0e6d0', LINE, 1); }
      if (helm.rar >= 4) glow('#ffd23d', 10, () => poly([hx - 8, hy - 8, hx - 8, hy - 18, hx - 4, hy - 12, hx, hy - 20, hx + 4, hy - 12, hx + 8, hy - 18, hx + 8, hy - 8], '#ffd23d', '#a87a1a', 1));
      if (helm.rar === 1) { ctx.fillStyle = dk; ctx.fillRect(hx - 1, hy - 10, 2, 9); }
    }
    // 持劍手 + 劍
    heroLimb(p.neck, p.fe, p.fh, 'arm', false);
    ctx.save(); ctx.translate(p.fh[0], p.fh[1]); ctx.rotate(p.sw); ctx.scale(SWORD_SCALE, SWORD_SCALE);
    drawSword(wr, tier);
    ctx.restore();
    ctx.beginPath(); ctx.arc(p.fh[0], p.fh[1], 2.9, 0, Math.PI * 2); ctx.fillStyle = LINE; ctx.fill(); ball(p.fh[0], p.fh[1], 2.3, HM.metal);
    // 戒指閃光
    const ring = itemCol('ring');
    if (ring && Math.sin(t * 4) > 0.3) glow(ring, 10, () => circ(p.bh[0], p.bh[1], 2, ring));
    ctx.restore();

    if (portraitMode) return;
    text(`Lv${lvl}`, x, y + 13, 10, '#e8dcc0', 'center', 700);
    if (tier) outlined(C.auras[tier - 1].name, x, y - 90, 11, auraColor(tier));
    // 勇者的大招（白虎）能量條
    const ug = Math.min(1, B.ult.hero || 0), bw = 34, by = y + 21;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 5);
    if (ug >= 1) glow('#e8f4ff', 10, () => { ctx.fillStyle = (t * 4 % 1) < 0.5 ? '#ffffff' : '#9fd8ff'; ctx.fillRect(x - bw / 2, by, bw, 3); });
    else { ctx.fillStyle = '#e8f4ff'; ctx.fillRect(x - bw / 2, by, bw * ug, 3); }
  }

  /* ---------- 夥伴 ---------- */
  function drawPartner(u) {
    const lvl = G.S.units[u.id];
    if (!lvl) return;
    const p = B.unitPos(u.id), st = B.unitState[u.id] || {}, PS = C.partnerScale;
    const spr = G.SPR.partner[u.id];
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(PS, PS); ctx.translate(-p.x, -p.y);
    // 動作：蓄力（往後仰、微蹲、腳下法陣、手上聚光）→ 出手（往前衝、伸手、手上爆光）→ 回到站姿
    const a = st.anim;
    let pose = 'idle', dx = 0, sy = 1, charge = 0, release = 0;
    if (a) {
      if (a.t < a.w) { pose = 'charge'; charge = a.t / a.w; dx = -2.5 * charge; sy = 1 - 0.06 * charge; }
      else {
        const k = Math.min(1, (a.t - a.w) / (a.dur - a.w));
        pose = k < 0.8 ? 'cast' : 'idle'; release = 1 - k;
        dx = 7 * release * release; sy = 1 + 0.05 * release;
        // 暗影君王：影步瞬移到敵人身邊，最後 30% 時間閃回原位
        if (u.attack === 'shadow' && st.blink != null) dx = (release > 0.3 ? st.blink - p.x : (st.blink - p.x) * (release / 0.3)) / PS; // 畫面有縮放，換算回原本的距離
      }
    }
    const img = spr[pose];
    const bob = a ? 0 : Math.round(Math.sin(t * 3 + p.x) * 1);
    const x = p.x + dx;
    // 鬥氣：身體周圍的光暈（階段越高越大）
    const pt = G.pAuraTier(lvl);
    if (pt) {
      const R = 14 + pt * 4 + Math.sin(t * 6 + p.x) * 1.5, cy = p.y - 24;
      const gr = ctx.createRadialGradient(x, cy, 3, x, cy, R + 14);
      gr.addColorStop(0, hexA(u.color, 0.3 + pt * 0.04)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, cy, R, R + 12, 0, 0, Math.PI * 2); ctx.fill();
    }
    // 蓄力時腳下的旋轉法陣
    if (charge > 0 || release > 0.5) {
      const al = charge > 0 ? charge : (release - 0.5) * 2, r = 12 + 6 * al;
      glow(u.color, 10, () => {
        ctx.strokeStyle = hexA(u.color, 0.9 * al); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r + 4, (r + 4) * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([3, 4]); ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      });
    }
    // 第 3 階起腳下的符文陣（線條畫的，比 pixelfx 版便宜很多）
    if (pt >= 3) runeRing(p.x, p.y + 2, 20 + pt * 2, u.color, pt);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, p.y, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.imageSmoothingEnabled = img.width > 40; // 高畫質圖要平滑縮小；舊的像素圖保持硬邊
    // 影步：原地留下影子、瞬移的路徑上有殘影
    if (u.attack === 'shadow' && release > 0.05 && st.blink != null) {
      ctx.globalAlpha = 0.45 * release;
      const sh = G.SPR.partnerShadow.cow, ks = sh.width > 40 ? G.SPR.partnerScale : 1, sw = sh.width * ks, shh = sh.height * ks;
      for (let k = 0; k <= 3; k++) ctx.drawImage(sh, Math.round(p.x + dx * k / 4 - sw / 2), Math.round(p.y - shh), sw, shh);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(p.y + bob));
    ctx.scale(1, sy);
    const ks = img.width > 40 ? G.SPR.partnerScale : 1, iw = img.width * ks, ih = img.height * ks; // 高畫質圖畫成一半大
    ctx.drawImage(img, -Math.round(iw / 2), -ih, iw, ih);
    ctx.restore();
    // 往上竄的鬥氣火焰（畫在角色前面，看起來包住身體）
    if (pt) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const q of (B.pparts[u.id] || [])) {
        ctx.globalAlpha = Math.min(1, q.life * 2) * 0.85; ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x + dx), Math.round(q.y), q.s, q.s * 1.6);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // 蓄力：舉高的手上聚光；出手：伸出去的手爆一下光
    if (charge > 0) {
      const HC = G.SPR.partnerHand.charge, hx = x + HC[0] - 1, hy = p.y + (HC[1] - 1) * sy, r = 2 + charge * 5;
      glow(u.color, 18, () => { circ(hx, hy, r, hexA(u.color, 0.85)); circ(hx, hy, r * 0.45, '#ffffff'); });
      if (u.attack === 'holy') glow(u.color, 18, () => { circ(x - 15, hy, r, hexA(u.color, 0.85)); circ(x - 15, hy, r * 0.45, '#ffffff'); });
      ctx.strokeStyle = hexA(u.color, 0.7 * charge); ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) { // 往手上吸的光線
        const ang = t * 4 + k * Math.PI / 2, d = 14 * (1 - ((t * 3 + k * 0.25) % 1));
        line([hx + Math.cos(ang) * d, hy + Math.sin(ang) * d, hx + Math.cos(ang) * (d + 4), hy + Math.sin(ang) * (d + 4)], hexA(u.color, 0.8 * charge), 1.2);
      }
    }
    if (release > 0.4) {
      const hx = x + G.SPR.partnerHand.cast[0] - 1, hy = p.y + G.SPR.partnerHand.cast[1];
      glow(u.color, 20, () => { circ(hx, hy, 9 * release, hexA(u.color, 0.7 * release)); circ(hx, hy, 4 * release, '#ffffff'); });
    }
    drawProp(u, pt, x, p.y, pose, charge, release);
    // 暗影君王的眼睛會發出紫光
    if (u.attack === 'shadow' && pt >= 1) {
      glow('#c08bff', 8 + pt * 2, () => { ctx.fillStyle = '#e8d0ff'; ctx.fillRect(x - 8, p.y - 38, 3, 2); ctx.fillRect(x + 4, p.y - 38, 3, 2); });
      ctx.strokeStyle = 'rgba(190,140,255,.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 8, p.y - 37); ctx.lineTo(x - 14 - Math.sin(t * 6) * 2, p.y - 39); ctx.stroke();
    }
    ctx.restore();
    text('Lv' + lvl, p.x, p.y + 13, 10, '#c8bca0', 'center', 700);
    // 大招能量條：滿了會閃
    const ug = Math.min(1, B.ult[u.id] || 0), bw = 24, by = p.y + 21;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(p.x - bw / 2 - 1, by - 1, bw + 2, 5);
    if (ug >= 1) glow(u.color, 10, () => { ctx.fillStyle = (t * 4 % 1) < 0.5 ? '#ffffff' : u.color; ctx.fillRect(p.x - bw / 2, by, bw, 3); });
    else { ctx.fillStyle = u.color; ctx.fillRect(p.x - bw / 2, by, bw * ug, 3); }
    const idx = C.units.indexOf(u);
    outlined((pt >= 5 ? '★' : '') + G.jobTitle(u.id, pt), p.x, p.y - G.SPR.partnerLabel * PS - (idx % 2) * 12, pt >= 5 ? 11 : 10, u.color);
  }

  function runeRing(cx, cy, R, col, pt) {
    const sq = 0.32, rot = t * 0.8;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(col, 0.55); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * sq, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.72, R * 0.72 * sq, 0, 0, Math.PI * 2); ctx.stroke();
    // 轉動的符文點
    ctx.fillStyle = hexA(col, 0.9);
    const n = 6 + pt * 2;
    for (let k = 0; k < n; k++) {
      const a = rot + k * Math.PI * 2 / n, rr = k % 2 ? R : R * 0.72;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rr * 0.86) - 1, Math.round(cy + Math.sin(a) * rr * 0.86 * sq) - 1, 2, 2);
    }
    // 六芒星
    ctx.strokeStyle = hexA(col, 0.35);
    for (let s = 0; s < 2; s++) {
      ctx.beginPath();
      for (let k = 0; k <= 3; k++) { const a = -rot + s * Math.PI / 3 + k * Math.PI * 2 / 3; ctx.lineTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72 * sq); }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- 職業道具：法杖 / 匕首 / 弓 / 劍盾 / 三叉戟 ----------
     手的位置：站著 (+13,-15)、蓄力舉手 (+16,-31)、出手往前伸 (+19,-20) */
  function drawProp(u, rank, x, y, pose, charge, release) {
    const H = G.SPR.partnerHand[pose === 'charge' || pose === 'cast' ? pose : 'idle'], g = [x + H[0], y + H[1]];
    const col = u.color, blur = 4 + rank * 3;
    const dirOf = { idle: -1.57, charge: -1.57, cast: -0.2 };
    let ang = dirOf[pose];
    const P = (d, a = ang) => [g[0] + Math.cos(a) * d, g[1] + Math.sin(a) * d];
    switch (u.attack) {
      case 'fire': { // 法杖 + 火焰寶珠
        const a = P(-10), b = P(26);
        line([a[0], a[1], b[0], b[1]], '#1a1018', 4); line([a[0], a[1], b[0], b[1]], '#7a4a2a', 2.2);
        const r = 3 + rank * 0.6 + charge * 3;
        glow('#ff6a2a', blur + charge * 10, () => { circ(b[0], b[1], r, '#ff8a2a'); circ(b[0], b[1], r * 0.5, '#fff3a6'); });
        for (let k = 0; k < 1 + rank; k++) { const f = (t * 2 + k / (1 + rank)) % 1; ctx.fillStyle = `rgba(255,${120 + k * 20},40,${1 - f})`; ctx.fillRect(b[0] - 1 + Math.sin(k * 7 + t * 5) * 2, b[1] - r - f * (8 + rank * 2), 2, 2); }
        break;
      }
      case 'shadow': { // 雙匕首
        if (pose === 'idle') ang = 1.2;
        const a = P(-3), b = P(11);
        glow('#9a5bff', blur, () => { line([a[0], a[1], b[0], b[1]], '#2a1a3a', 3.5); line([g[0], g[1], b[0], b[1]], '#c8a8ff', 1.8); });
        break;
      }
      case 'bow': { // 弓：蓄力時拉弦、搭上發光的箭
        if (pose === 'charge') ang = -0.9;
        const R = 12, a1 = ang - 1.15, a2 = ang + 1.15, c0 = [g[0] - Math.cos(ang) * 4, g[1] - Math.sin(ang) * 4];
        const e1 = [c0[0] + Math.cos(a1) * R, c0[1] + Math.sin(a1) * R], e2 = [c0[0] + Math.cos(a2) * R, c0[1] + Math.sin(a2) * R];
        const pull = pose === 'charge' ? 4 + charge * 6 : 0, nock = [g[0] - Math.cos(ang) * pull, g[1] - Math.sin(ang) * pull];
        line([e1[0], e1[1], nock[0], nock[1], e2[0], e2[1]], 'rgba(255,255,255,.8)', 0.8);
        glow(rank >= 3 ? col : '#000000', rank >= 3 ? blur : 0, () => {
          ctx.strokeStyle = '#1a1018'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(c0[0], c0[1], R, a1, a2); ctx.stroke();
          ctx.strokeStyle = rank >= 4 ? '#ffd23d' : '#8a5a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c0[0], c0[1], R, a1, a2); ctx.stroke();
        });
        if (pose === 'charge') glow(col, 12, () => line([nock[0], nock[1], nock[0] + Math.cos(ang) * 16, nock[1] + Math.sin(ang) * 16], col, 1.8));
        break;
      }
      case 'holy': { // 聖劍 + 盾牌（盾在背後那隻手）
        const sx = x - 12, sy0 = y - 21;
        glow(col, rank >= 2 ? blur : 0, () => { circ(sx, sy0, 6.5, '#e8b84a'); circ(sx, sy0, 5, '#fff6d8'); });
        ctx.fillStyle = '#e8b84a'; ctx.fillRect(sx - 0.8, sy0 - 4, 1.6, 8); ctx.fillRect(sx - 3, sy0 - 1.6, 6, 1.6);
        if (pose === 'idle') ang = -1.0;
        const a = P(-4), b = P(22);
        line([a[0], a[1], g[0], g[1]], '#5a3620', 2.5);
        const gp = P(1), gp1 = [gp[0] + Math.cos(ang + 1.57) * 4, gp[1] + Math.sin(ang + 1.57) * 4], gp2 = [gp[0] - Math.cos(ang + 1.57) * 4, gp[1] - Math.sin(ang + 1.57) * 4];
        line([gp1[0], gp1[1], gp2[0], gp2[1]], '#e8b84a', 2);
        glow('#ffe680', blur + charge * 10, () => { line([g[0], g[1], b[0], b[1]], '#1a1018', 4); line([g[0], g[1], b[0], b[1]], '#fff6d8', 2.2); });
        break;
      }
      case 'water': { // 三叉戟
        const a = P(-10), b = P(26), n = [Math.cos(ang + 1.57), Math.sin(ang + 1.57)], d = [Math.cos(ang), Math.sin(ang)];
        line([a[0], a[1], b[0], b[1]], '#1a1018', 4); line([a[0], a[1], b[0], b[1]], '#7fb8d8', 2.2);
        glow('#3da9ff', blur, () => {
          [-1, 0, 1].forEach(k => {
            const base = [b[0] + n[0] * k * 4, b[1] + n[1] * k * 4], tip = [base[0] + d[0] * (k ? 6 : 9), base[1] + d[1] * (k ? 6 : 9)];
            line([base[0], base[1], tip[0], tip[1]], '#dff4ff', 1.8);
          });
          line([b[0] + n[0] * 4, b[1] + n[1] * 4, b[0] - n[0] * 4, b[1] - n[1] * 4], '#dff4ff', 1.8);
        });
        break;
      }
    }
  }

  /* ---------- 暗影君王：影之軍團、靈魂、君王領域 ---------- */
  function drawShadowArmy() {
    const S = G.S;
    if (!S.units.cow) return;
    const r = G.rankOf('cow');
    if (r >= 4) { // 君王領域：地面泛紫光
      const gr = ctx.createLinearGradient(0, C.GROUND - 30, 0, C.GROUND + 20);
      gr.addColorStop(0, 'rgba(120,60,200,0)'); gr.addColorStop(0.6, `rgba(150,90,240,${0.38 + 0.08 * Math.sin(t * 2)})`); gr.addColorStop(1, 'rgba(60,20,120,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, C.GROUND - 30, B.W, 50);
      ctx.fillStyle = 'rgba(200,160,255,.5)';
      for (let k = 0; k < 24; k++) { const f = (t * 0.4 + k / 24) % 1, xx = (k * 97) % B.W; ctx.fillRect(xx, C.GROUND - f * 40, 1.5, 3); }
    }
    const running = new Set(B.runners.map(q => q.i));
    (S.army || []).forEach((a, i) => {
      if (a.rising || running.has(i)) return;
      const s = G.armySlot(i), img = (G.SPR.monShadow[a.t] || G.SPR.monShadow.slime)[0], sc = a.b ? 1.1 : 0.7, bob = Math.sin(t * 2 + i) * 1;
      ctx.save(); ctx.globalAlpha = 0.8; ctx.translate(s.x, s.y + bob); ctx.scale(sc, sc);
      drawSprite(img); ctx.restore(); ctx.globalAlpha = 1;
      const ex = s.x - SW(img) * sc * 0.28, ey = s.y + bob - SH(img) * sc * 0.72;
      ctx.fillStyle = 'rgba(176,122,255,.45)'; ctx.fillRect(ex - 1, ey - 1, 4, 4);
      ctx.fillStyle = '#efe0ff'; ctx.fillRect(ex, ey, 2, 2);
    });
    for (const q of B.runners) {
      const img = (G.SPR.monShadow[q.type] || G.SPR.monShadow.slime)[0], sc = q.boss ? 1.3 : 0.9, al = q.phase ? Math.max(0, 1 - q.life / 0.35) : 0.95;
      for (let k = 2; k >= 0; k--) {
        ctx.save(); ctx.globalAlpha = al * (k ? 0.25 : 1); ctx.translate(q.x - k * 10, q.y); ctx.scale(sc, sc);
        drawSprite(img); ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(232,208,255,${al})`; ctx.fillRect(q.x - SW(img) * sc * 0.28, q.y - SH(img) * sc * 0.72, 2, 2);
    }
    for (const sl of B.souls) {
      glow('#b07aff', 14, () => { circ(sl.x, sl.y, 4, 'rgba(200,160,255,.9)'); circ(sl.x, sl.y, 2, '#ffffff'); });
    }
  }

  /* ---------- 怪物 ---------- */
  // 怪物：6 格連續動作 + 程式加的動態（走路的上下彈、前傾、停下來呼吸、史萊姆跳、被打後退、死掉倒下）
  function drawMonster(m, dieT) {
    const id = m.type.id, hd = m.hdBoss && G.SPR.boss[id];
    const frames = ((m.hit > 0 && !dieT) ? (hd ? G.SPR.bossHit : G.SPR.monHit) : (hd ? G.SPR.boss : G.SPR.mon))[id];
    const n = frames.length, ap = ((m.ap || 0) % 1 + 1) % 1;
    const many = n > 2;
    const fi = many ? (m.moving || m.type.fly || id === 'slime' ? Math.floor(ap * n) % n : 0) : (n > 1 ? Math.floor(m.ph * (m.type.fly ? 1.6 : 0.8)) % n : 0);
    const img = frames[fi], K = SH(img) * m.sc / 50; // 動作幅度跟體型成比例
    let bob = 0, sx = 1, sy = 1, rot = 0, dx = 0, al = 1;
    if (many) {
      if (m.type.fly) bob = Math.sin(m.ph * 0.6) * 5 - Math.cos(ap * Math.PI * 2) * 4 * K; // 拍翅時身體上下
      else if (id === 'slime') {
        if (m.moving) bob = -Math.max(0, Math.sin(ap * Math.PI * 2)) * 16 * K;           // 一跳一跳
        else { sy = 1 + 0.04 * Math.sin(t * 3 + m.ph); sx = 2 - sy; }
      } else if (m.moving) { bob = -Math.abs(Math.sin(ap * Math.PI * 2)) * 3 * K; rot = -0.05; } // 每一步彈一下、身體前傾
      else { sy = 1 + 0.025 * Math.sin(t * 2.6 + m.ph); }                                  // 停下來呼吸
    } else {
      bob = m.type.fly ? Math.sin(m.ph * 0.6) * 6 : 0;
      if (id === 'slime') { const q = Math.sin(m.ph * 1.2) * 0.08; sx = 1 + q; sy = 1 - q; }
    }
    if (m.hit > 0 && !dieT) { const k = m.hit / 0.1; dx = 6 * k * K; sx *= 1 + 0.06 * k; sy *= 1 - 0.06 * k; rot += 0.06 * k; } // 被打：往後縮一下
    if (m.frozen > 0) { bob = 0; rot = 0; }
    if (dieT) { const q = dieT / 0.45; al = 1 - q; rot += q * 1.2; bob += m.type.fly ? q * 40 : q * 6; sy *= 1 - q * 0.2; } // 往後倒、淡出（飛的會掉下來）
    if (m.lift > 0) { // 統治者的權柄：被舉到半空再摔下來
      bob -= (m.lift > 0.1 ? Math.min(1, (0.7 - m.lift) / 0.4) : m.lift / 0.1) * 40;
      glow('#9a5bff', 14, () => { ctx.strokeStyle = 'rgba(190,140,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(m.x, m.y + bob - m.h / 2, m.w * 0.7, m.h * 0.7, 0, 0, Math.PI * 2); ctx.stroke(); });
    }
    // 首領的氣場：腳下脈動的紅圈 + 往上飄的火星
    if (m.boss && !dieT) {
      const R = m.w * 0.7, pu = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(m.x, C.GROUND, 4, m.x, C.GROUND, R);
      g.addColorStop(0, `rgba(255,60,90,${0.35 + 0.15 * pu})`); g.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(m.x, C.GROUND, R, R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,120,140,${0.5 + 0.3 * pu})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(m.x, C.GROUND, R * (0.75 + 0.1 * pu), R * 0.17, 0, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 10; k++) {
        const q = (t * 0.6 + k * 0.1) % 1, px = m.x + Math.sin(k * 2.4 + t) * R * 0.7;
        ctx.globalAlpha = 1 - q; ctx.fillStyle = k % 2 ? '#ff8aa0' : '#ffd23d'; ctx.fillRect(px, C.GROUND - q * m.h * 1.1, 2.5, 2.5);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.globalAlpha = al;
    if (!m.type.fly) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(m.x, m.y, m.w * 0.4 * (1 + bob / 60), 3 * m.sc * (m.hdBoss ? 2 : 1), 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.translate(Math.round(m.x + dx), Math.round(m.y + bob));
    if (rot) ctx.rotate(rot);
    ctx.scale(m.sc * sx, m.sc * sy);
    if (m.boss && !G.lowFx && !dieT) { ctx.shadowColor = '#ff3d6a'; ctx.shadowBlur = 16; }
    drawSprite(img);
    ctx.shadowBlur = 0;
    if (m.boss && !hd) { // 沒有專屬首領圖時才畫小王冠
      const cy = -SH(img) - 6;
      poly([-8, cy + 6, -8, cy - 2, -4, cy + 2, 0, cy - 4, 4, cy + 2, 8, cy - 2, 8, cy + 6], '#ffd23d', '#8a5a10', 0.8);
    }
    ctx.restore();
    if (dieT) return;
    if (m.frozen > 0) {
      ctx.fillStyle = `rgba(170,230,255,${0.25 + 0.1 * Math.sin(t * 8)})`;
      ctx.strokeStyle = 'rgba(220,250,255,.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(m.x - m.w / 2 - 3, m.y + bob - m.h - 3, m.w + 6, m.h + 6); ctx.fill(); ctx.stroke();
    }
    if (!m.boss && m.hp < m.max) {
      const bw = 30, by = m.y + bob - m.h - 8;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(m.x - bw / 2, by, bw, 4);
      ctx.fillStyle = '#ff4d4d'; ctx.fillRect(m.x - bw / 2, by, bw * Math.max(0, m.hp / m.max), 4);
    }
  }

  /* ---------- 小特效 ---------- */
  function drawSmallFx() {
    for (const f of B.fx) {
      const a = f.life / f.max;
      if (f.kind === 'bolt') {
        glow(f.col, 16, () => { line(f.pts, hexA(f.col, a), 4 * a + 1); line(f.pts, `rgba(255,255,255,${a})`, 1.5); });
      } else if (f.kind === 'beam') { // 貫穿的光箭
        glow(f.col, 20, () => { line([f.x1, f.y1, f.x2, f.y2], hexA(f.col, a), f.w * a + 1); line([f.x1, f.y1, f.x2, f.y2], `rgba(255,255,255,${a})`, f.w * 0.3 * a + 0.5); });
      } else if (f.kind === 'rain') { // 從天而降的箭
        const k = 1 - a, y = f.y0 + (f.y1 - f.y0) * k;
        line([f.x, y - 16, f.x, y], f.col, 1.6); poly([f.x - 2.5, y - 2, f.x + 2.5, y - 2, f.x, y + 4], '#ffffff');
      } else if (f.kind === 'claws') { // 白虎的三道巨大爪痕：從右上撕到左下，邊長出來邊變淡
        const grow2 = Math.min(1, (1 - a) * 4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = -1; i <= 1; i++) {
          const x0 = f.x + 170 + i * 60, y0 = f.y - 170, x1 = f.x - 170 + i * 60, y1 = f.y + 150;
          const ex = x0 + (x1 - x0) * grow2, ey = y0 + (y1 - y0) * grow2, nx = (y1 - y0), ny = -(x1 - x0), nl = Math.hypot(nx, ny), w = 14 * a + 2;
          ctx.fillStyle = `rgba(200,235,255,${0.5 * a})`;
          poly([x0, y0, (x0 + ex) / 2 + nx / nl * w * 2.2, (y0 + ey) / 2 + ny / nl * w * 2.2, ex, ey, (x0 + ex) / 2 - nx / nl * w * 2.2, (y0 + ey) / 2 - ny / nl * w * 2.2], ctx.fillStyle);
          poly([x0, y0, (x0 + ex) / 2 + nx / nl * w, (y0 + ey) / 2 + ny / nl * w, ex, ey, (x0 + ex) / 2 - nx / nl * w, (y0 + ey) / 2 - ny / nl * w], `rgba(255,255,255,${a})`);
        }
        ctx.restore();
      } else if (f.kind === 'boom') { // Explosion 的爆炸：白熱火球膨脹 + 往外擴散的衝擊波環
        const k = 1 - a, R = f.R * (0.25 + 0.75 * Math.sqrt(k));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, R * 0.7);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.35, `rgba(255,230,120,${a * 0.9})`); g.addColorStop(0.7, `rgba(255,120,30,${a * 0.6})`); g.addColorStop(1, 'rgba(255,40,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,240,200,${a})`; ctx.lineWidth = 10 * a + 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, R, R * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,140,40,${a * 0.8})`; ctx.lineWidth = 5 * a + 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, R * 0.75, R * 0.33, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else if (f.kind === 'tap') {
        ctx.strokeStyle = `rgba(255,240,200,${a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 24 - a * 12, 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (const f of B.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      outlined(f.txt, f.x, f.y, f.size, f.col);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- 衝過全場的大波浪 ---------- */
  /* ---------- 四聖獸（高畫質圖：img/beasts/，原始檔與產生器在 ../素材大集合/四聖獸） ----------
     每張圖都有錨點（ax, ay）：零件靠錨點接起來，數字來自素材大集合/四聖獸/meta.json */
  // 尺寸和錨點都是原圖（素材大集合）的像素座標；img/beasts 裡是縮小版，畫的時候會拉回這個大小，不影響位置
  const BEAST_META = {
    tiger_run: { w: 955, h: 430, ax: 488, ay: 178 },
    qilin_run: { w: 982, h: 690, ax: 412, ay: 403 }, // 勇者的麒麟（6 格奔馳）
    dragon_head: { w: 730, h: 513, ax: 120, ay: 275 }, dragon_segment: { w: 202, h: 277, ax: 102, ay: 177 },
    dragon_claw: { w: 346, h: 333, ax: 130, ay: 18 }, dragon_tail: { w: 604, h: 216, ax: 578, ay: 123 },
    phoenix_body: { w: 601, h: 477, ax: 267, ay: 388 }, phoenix_wing: { w: 424, h: 536, ax: 120, ay: 515 }, phoenix_tail: { w: 1082, h: 520, ax: 1059, ay: 260 },
    tortoise: { w: 1111, h: 683, ax: 484, ay: 667 },
  };
  // 黑龍（小牛先生的聖獸，西方飛龍）：4 格拍翅；mx, my 是嘴巴的位置（噴龍息用）
  BEAST_META.wdragon_fly = { w: 1826, h: 1390, ax: 906, ay: 884, mx: 1684, my: 579 };
  const BIMG = {};
  ['qilin_run_0', 'qilin_run_1', 'qilin_run_2', 'qilin_run_3', 'qilin_run_4', 'qilin_run_5', 'dragon_head', 'dragon_segment', 'dragon_claw', 'dragon_tail', 'wdragon_fly_0', 'wdragon_fly_1', 'wdragon_fly_2', 'wdragon_fly_3', 'phoenix_body', 'phoenix_wing', 'phoenix_tail', 'tortoise', 0, 1, 2, 3, 4, 5].forEach(k => {
    const name = typeof k === 'number' ? 'tiger_run_' + k : k, img = new Image();
    img.src = `img/beasts/${name}.png`; BIMG[name] = img;
  });
  const bok = name => { const i = BIMG[name]; return i && i.complete && i.naturalWidth > 0; };
  // 以錨點為中心畫圖：sc 是縮放，ang 是旋轉，flipX / sy 用來鏡射或壓扁（翅膀拍動）
  function beast(name, metaKey, x, y, sc, ang = 0, flipX = false, sy = 1) {
    const m = BEAST_META[metaKey || name], img = BIMG[name];
    ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); ctx.scale(flipX ? -sc : sc, sc * sy);
    ctx.drawImage(img, -m.ax, -m.ay, m.w, m.h); ctx.restore();
  }


  // 聖獸的神聖光芒：外圈光暈 + 慢慢轉的光柱 + 往上飄的光點；dark 不是 null 時先在外圍罩一層暗光（黑龍的黑光）
  // inner / outer 是 'r,g,b' 字串
  function holyLight(x, y, r, inner, outer, dark) {
    ctx.save();
    if (dark) {
      const dg = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.35);
      dg.addColorStop(0, `rgba(${dark},0)`); dg.addColorStop(0.6, `rgba(${dark},.35)`); dg.addColorStop(1, `rgba(${dark},0)`);
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 1 + 0.06 * Math.sin(t * 5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * pulse);
    g.addColorStop(0, `rgba(${inner},.5)`); g.addColorStop(0.45, `rgba(${outer},.28)`); g.addColorStop(1, `rgba(${outer},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, Math.PI * 2); ctx.fill();
    const rg = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.25); // 光柱
    rg.addColorStop(0, `rgba(${inner},.3)`); rg.addColorStop(1, `rgba(${inner},0)`);
    ctx.fillStyle = rg;
    for (let k = 0; k < 10; k++) {
      const a = t * 0.5 + k * Math.PI / 5, L = r * (1.05 + 0.2 * Math.sin(t * 3 + k * 1.7)), wd = 0.07;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - wd) * L, y + Math.sin(a - wd) * L); ctx.lineTo(x + Math.cos(a + wd) * L, y + Math.sin(a + wd) * L); ctx.closePath(); ctx.fill();
    }
    for (let k = 0; k < 14; k++) { // 光點
      const q = (t * 0.7 + k * 0.071) % 1, ax = x + Math.sin(k * 12.9) * r * 0.8, ay = y + Math.cos(k * 7.3) * r * 0.5 - q * r * 0.6;
      ctx.globalAlpha = Math.sin(q * Math.PI); ctx.fillStyle = k % 3 ? `rgb(${inner})` : '#ffffff';
      ctx.fillRect(ax - 1.5, ay - 1.5, 3, 3);
    }
    ctx.restore();
  }

  // 白虎：六格奔跑動畫
  function drawTigerSweep(w) {
    if (!bok('tiger_run_0')) return drawTigerSweepOld(w);
    const m = BEAST_META.tiger_run, S = (w.h * 1.15 / m.h) * grow(w), frame = Math.floor(t * 12) % 6;
    const bx = w.x - (m.w - m.ax) * S, by = C.GROUND + 6 - (m.h - m.ay) * S; // 鼻尖在浪頭、腳踩地
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 速度線與白色靈氣
    for (let i = 0; i < 16; i++) { const yy = by + ((i * 37) % 160 - 80) * S * 2.4, len = (80 + (i * 53) % 140), xx = bx - 120 * S * 2 - ((t * 700 + i * 61) % (w.len * 0.8)); ctx.fillStyle = 'rgba(255,240,190,.35)'; ctx.fillRect(xx - len, yy, len, 2); }
    const ag = ctx.createRadialGradient(bx, by, 10, bx, by, m.w * S * 0.6);
    ag.addColorStop(0, 'rgba(255,245,210,.4)'); ag.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.ellipse(bx, by, m.w * S * 0.62, m.h * S * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    holyLight(bx - m.w * S * 0.15, by - m.h * S * 0.35, m.w * S * 0.55, '255,250,225', '255,205,70'); // 白虎：金白色聖光
    beast('tiger_run_' + frame, 'tiger_run', bx, by, S);
  }

  // 黑龍（西方飛龍）：拍著翅膀從左飛到右，飛過畫面中段時往前下方噴紫黑色龍息
  function drawWDragon(w) {
    if (!bok('wdragon_fly_0')) return;
    const m = BEAST_META.wdragon_fly, S = (w.h * 3.3 / m.w) * grow(w), frame = Math.floor(t * 9) % 4;
    const bx = w.x - (m.w - m.ax) * S, by = C.GROUND - 125 + Math.sin(t * 4.5) * 10;
    // 地上的影子
    ctx.fillStyle = 'rgba(20,6,40,.35)'; ctx.beginPath(); ctx.ellipse(bx, C.GROUND + 4, m.w * S * 0.35, 8, 0, 0, Math.PI * 2); ctx.fill();
    holyLight(bx, by - m.h * S * 0.15, m.w * S * 0.5, '200,140,255', '120,40,220', '15,0,30'); // 黑龍：紫光 + 外圍黑光
    // 龍息：嘴巴 → 前下方的地面
    const mx = bx + (m.mx - m.ax) * S, my = by + (m.my - m.ay) * S;
    if (mx > B.W * 0.3 && mx < B.W * 0.95) {
      const gx = mx + 90, fl = 0.85 + 0.15 * Math.sin(t * 30);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(mx, my, gx, C.GROUND);
      g.addColorStop(0, 'rgba(245,225,255,.95)'); g.addColorStop(0.3, 'rgba(170,70,255,.85)'); g.addColorStop(1, 'rgba(70,0,130,.25)'); // 紫色的龍息
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mx, my - 4); ctx.lineTo(gx + 90 * fl, C.GROUND + 6); ctx.lineTo(gx - 70 * fl, C.GROUND + 6); ctx.lineTo(mx, my + 6); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 10; k++) { const q = (t * 3 + k * 0.1) % 1; ctx.fillStyle = `rgba(210,150,255,${1 - q})`; ctx.beginPath(); ctx.arc(mx + (gx - mx) * q + Math.sin(k * 7 + t * 20) * 20 * q, my + (C.GROUND - my) * q, 3 + q * 8, 0, Math.PI * 2); ctx.fill(); }
      const gg = ctx.createRadialGradient(gx, C.GROUND, 4, gx, C.GROUND, 120); // 地面被龍息燒得發紫
      gg.addColorStop(0, 'rgba(160,60,255,.6)'); gg.addColorStop(1, 'rgba(80,0,160,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(gx, C.GROUND, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    beast('wdragon_fly_' + frame, 'wdragon_fly', bx, by, S);
  }

  // 麒麟：6 格奔馳，金色靈氣 + 火星
  function drawQilinSweep(w) {
    if (!bok('qilin_run_0')) return drawTigerSweepOld(w);
    const m = BEAST_META.qilin_run, S = (w.h * 1.3 / m.h) * grow(w), frame = Math.floor(t * 12) % 6;
    const bx = w.x - (m.w - m.ax) * S, by = C.GROUND + 8 - (m.h - m.ay) * S;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) { const yy = by + ((i * 37) % 160 - 80) * S * 2, len = 80 + (i * 53) % 140, xx = bx - m.ax * S - ((t * 700 + i * 61) % (w.len * 0.8)); ctx.fillStyle = 'rgba(255,200,90,.35)'; ctx.fillRect(xx - len, yy, len, 2); }
    const ag = ctx.createRadialGradient(bx, by, 10, bx, by, m.w * S * 0.6);
    ag.addColorStop(0, 'rgba(255,200,80,.4)'); ag.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.ellipse(bx, by, m.w * S * 0.62, m.h * S * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 16; k++) { const q = (t * 1.4 + k * 0.0625) % 1; ctx.globalAlpha = 1 - q; ctx.fillStyle = k % 2 ? '#ffd23d' : '#ff8a2a'; ctx.fillRect(bx - m.ax * S - q * 160 + Math.sin(k * 3) * 30, by - m.ay * S * 0.4 + Math.cos(k * 5) * 60 - q * 30, 3, 3); }
    ctx.restore(); ctx.globalAlpha = 1;
    beast('qilin_run_' + frame, 'qilin_run', bx, by, S);
  }
  // 白虎（浩浩人的咖哩棒）：蓄力時在浩浩人背後浮現、伏低，光束解放時隱去（換成撲出去的白虎）
  function drawTigerGuard(s) {
    if (!bok('tiger_run_3')) return;
    const k = s.t, al = Math.min(clamp01(k / 0.5), clamp01((1.25 - k) / 0.15));
    if (al <= 0) return;
    const m = BEAST_META.tiger_run, S = 150 / m.h, rise = easeOut(k / 0.6);
    ctx.save(); ctx.globalAlpha = al * 0.95;
    const g = ctx.createRadialGradient(s.px, C.GROUND - 50, 10, s.px, C.GROUND - 50, 160);
    g.addColorStop(0, 'rgba(255,240,190,.45)'); g.addColorStop(1, 'rgba(255,220,120,0)'); // 白虎的金白光
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.px, C.GROUND - 40, 170, 110, 0, 0, Math.PI * 2); ctx.fill();
    beast('tiger_run_3', 'tiger_run', s.px - 20, C.GROUND + 6 - (m.h - m.ay) * S + (1 - rise) * 60, S);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // 玄武（漁夫的大招）：站在巨浪的浪頭上一起衝
  function drawTortoiseRider(w) {
    if (!bok('tortoise')) return;
    const h = w.h * grow(w), sc = h * 0.55 / BEAST_META.tortoise.h, tx = w.x - h * 0.2, ty = C.GROUND - h * 0.82 + Math.sin(t * 6) * 4;
    holyLight(tx, ty - h * 0.25, h * 0.55, '170,225,255', '40,120,255'); // 玄武：藍色聖光
    beast('tortoise', null, tx, ty, sc, Math.sin(t * 3) * 0.06);
  }

  // 青龍：龍頭 + 一節節身體沿著波浪排列 + 兩對龍爪 + 龍尾
  function drawDragonSweep(w) {
    const pre = 'dragon_', aura = '#5ef0c0';
    if (!bok(pre + 'segment') || !bok(pre + 'head')) return drawDragonSweepOld(w);
    const G0 = C.GROUND, k0 = grow(w), R = 34 * k0, baseY = G0 - 160, A = 55;
    const yAt = x => baseY + A * Math.sin(x * 0.011 - t * 5);
    const angAt = x => Math.atan2(yAt(x + 4) - yAt(x - 4), 8);
    const gap = 13, N = Math.floor(w.len / gap), hx = w.x - R * 0.4;
    const segR = i => R * (1 - (i / N) * 0.7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 青色靈氣
    for (let i = N; i >= 0; i -= 3) { const x = hx - i * gap; ctx.globalAlpha = 0.12 * (1 - i / N); ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, yAt(x), R * 2.2 * (1 - i / N * 0.6), 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // 龍尾
    const tx = hx - N * gap;
    if (bok(pre + 'tail')) beast(pre + 'tail', null, tx + gap, yAt(tx + gap), segR(N) * 2.2 / 165, angAt(tx + gap));
    // 身體節（尾巴往頭畫，前面的蓋住後面的）
    const claws = new Set([7, 8, Math.floor(N * 0.55), Math.floor(N * 0.55) + 1]);
    for (let i = N; i >= 1; i--) {
      const x = hx - i * gap, y = yAt(x), sc = segR(i) / 92;
      if (claws.has(i) && i % 2 === 1 && bok(pre + 'claw')) beast(pre + 'claw', null, x, y + segR(i) * 0.4, sc * 0.75, Math.sin(t * 9 + i) * 0.25);
      beast(pre + 'segment', null, x, y, sc, angAt(x));
    }
    // 龍頭
    holyLight(hx, yAt(hx), R * 3.2, '190,255,235', '40,220,170'); // 青龍：青色聖光
    beast(pre + 'head', null, hx, yAt(hx), R * 2.3 / 200, angAt(hx) * 0.7);
  }

  // 鳳凰：尾羽、後面的翅膀、身體、前面的翅膀（會拍動），整隻轉向飛行方向
  function drawPhoenix(b, R, ca, sa) {
    if (!bok('phoenix_body') || !bok('phoenix_wing')) return drawPhoenixOld(b, R, ca, sa);
    const flap = 0.62 + 0.38 * Math.sin(t * 13), ang = Math.atan2(sa, ca), sc = R * 2.4 / 360;
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(ang);
    holyLight(-R * 0.3, 0, R * 3, '255,190,110', '255,50,30'); // 鳳凰：紅色聖光
    if (bok('phoenix_tail')) beast('phoenix_tail', null, -R * 0.9, R * 0.15, R * 7 / 1082, Math.sin(t * 6) * 0.05);
    ctx.globalAlpha = 0.85; beast('phoenix_wing', null, -R * 0.1, R * 0.2, sc * 1.25, 0.15, true, -flap); ctx.globalAlpha = 1; // 下面那片（鏡射）
    beast('phoenix_body', null, 0, 0, sc);
    beast('phoenix_wing', null, -R * 0.2, -R * 0.35, sc * 1.35, -0.1, true, flap);
    ctx.restore();
  }

  // 玄武：從地面升起，半透明浮在浩浩人背後，加上金色護盾光罩
  function drawTortoise(s) {
    if (!bok('tortoise')) return drawTortoiseOld(s);
    const k = s.t, G0 = C.GROUND, cx = s.px - 10;
    const al = Math.min(clamp01(k / 0.6), clamp01((s.dur - k) / 0.5));
    if (al <= 0) return;
    const rise = easeOut(k / 0.7), sc = 240 / BEAST_META.tortoise.h;
    ctx.save(); ctx.globalAlpha = al;
    const sg = ctx.createRadialGradient(cx + 40, G0, 30, cx + 40, G0, 300); // 護盾光罩
    sg.addColorStop(0, 'rgba(255,210,61,0)'); sg.addColorStop(0.85, `rgba(255,210,61,${0.2 + 0.08 * Math.sin(k * 8)})`); sg.addColorStop(1, 'rgba(255,210,61,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx + 40, G0, 300, 220, 0, Math.PI, 0); ctx.fill();
    holyLight(cx, G0 - 110 + (1 - rise) * 80, 190, '170,225,255', '40,120,255'); // 玄武：藍色聖光
    ctx.globalAlpha = al * 0.92;
    beast('tortoise', null, cx, G0 + 8 + (1 - rise) * 80, sc);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  /* ---------- 四聖獸（舊的程式畫法，當備用） ---------- */
  // 鳳凰：以火球為身體，往飛行方向的兩側展開烈焰雙翼，後面拖著長長的尾羽
  function drawPhoenixOld(b, R, ca, sa) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(sa, ca)); // 之後 +x 是飛行方向
    const flap = 0.7 + 0.3 * Math.sin(t * 13);
    // 尾羽：幾條長長飄動的火焰
    for (let f = 0; f < 5; f++) {
      const off = (f - 2) * R * 0.28;
      ctx.beginPath(); ctx.moveTo(-R * 0.6, off * 0.3);
      for (let j = 1; j <= 14; j++) { const s = j / 14; ctx.lineTo(-R * (0.6 + s * 6.5), off * (0.3 + s * 1.6) + Math.sin(t * 9 + j * 0.7 + f) * R * 0.35 * s); }
      ctx.strokeStyle = f % 2 ? 'rgba(255,120,30,.55)' : 'rgba(255,210,80,.6)'; ctx.lineWidth = R * (0.22 - Math.abs(f - 2) * 0.03); ctx.lineCap = 'round'; ctx.stroke();
    }
    // 雙翼
    for (const sd of [-1, 1]) {
      const wy = sd * flap;
      const pts = [R * 0.2, sd * R * 0.4, -R * 0.2, wy * R * 2.4, -R * 0.9, wy * R * 3.4, -R * 1.7, wy * R * 3.1, -R * 1.4, wy * R * 2.2, -R * 2.2, wy * R * 1.9, -R * 1.2, wy * R * 1.0, -R * 0.6, sd * R * 0.4];
      const g = ctx.createLinearGradient(0, 0, -R * 1.2, wy * R * 3.2);
      g.addColorStop(0, 'rgba(255,250,200,.95)'); g.addColorStop(0.4, 'rgba(255,190,60,.85)'); g.addColorStop(1, 'rgba(230,50,20,.5)');
      poly(pts, g);
      ctx.strokeStyle = 'rgba(255,240,180,.7)'; ctx.lineWidth = 2; // 羽毛線
      for (let f = 1; f <= 4; f++) { ctx.beginPath(); ctx.moveTo(-R * 0.2 * f, sd * R * 0.5); ctx.lineTo(-R * (0.2 + f * 0.4), wy * R * (1.2 + f * 0.5)); ctx.stroke(); }
    }
    // 頭與冠羽
    poly([R * 1.0, -R * 0.25, R * 1.55, 0, R * 1.0, R * 0.25], '#fff3a6');      // 喙
    ctx.fillStyle = '#ffe26b'; ctx.beginPath(); ctx.arc(R * 0.85, 0, R * 0.35, 0, Math.PI * 2); ctx.fill();
    for (let f = 0; f < 3; f++) poly([R * 0.75, -R * 0.2, R * (0.3 - f * 0.25), -R * (0.75 + f * 0.15) + Math.sin(t * 10 + f) * 4, R * (0.55 - f * 0.2), -R * 0.15], 'rgba(255,140,40,.8)');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(R * 0.92, -R * 0.12, 4, 4);
    ctx.restore();
  }
  // 青龍：蜿蜒的長身體跟著龍頭飛，背鰭、龍爪、龍角、龍鬚
  function drawDragonSweepOld(w) {
    const G0 = C.GROUND, k0 = grow(w), R = 30 * k0, seg = 15, N = Math.floor(w.len / seg);
    const baseY = G0 - 150, A = 55;
    const yAt = x => baseY + A * Math.sin(x * 0.011 - t * 5);
    const hx = w.x, hy = yAt(hx);
    ctx.save();
    // 外圍的青色靈氣
    ctx.globalCompositeOperation = 'lighter';
    for (let i = N; i >= 0; i -= 3) { const x = hx - i * seg; ctx.globalAlpha = 0.12 * (1 - i / N); ctx.fillStyle = '#5ef0c0'; ctx.beginPath(); ctx.arc(x, yAt(x), R * 2 * (1 - i / N * 0.6), 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // 身體（從尾巴畫到頭）
    for (let i = N; i >= 1; i--) {
      const x = hx - i * seg, y = yAt(x), r = R * (1 - (i / N) * 0.75);
      const g = ctx.createLinearGradient(x, y - r, x, y + r);
      g.addColorStop(0, '#0f5e4a'); g.addColorStop(0.45, '#22a884'); g.addColorStop(0.8, '#9ff5d5'); g.addColorStop(1, '#d8fff0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(8,60,46,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + r * 0.3, y, r * 0.8, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); // 鱗片
      if (i % 2 === 0) { // 背鰭
        const nx = x + seg, ny = yAt(nx), ang = Math.atan2(ny - y, seg) - Math.PI / 2;
        poly([x + Math.cos(ang - 0.35) * r, y + Math.sin(ang - 0.35) * r, x + Math.cos(ang) * r * 1.9 - seg * 0.5, y + Math.sin(ang) * r * 1.9, x + Math.cos(ang + 0.4) * r, y + Math.sin(ang + 0.4) * r], '#5ef0a0');
      }
      if (i === 6 || i === 16 || i === Math.floor(N * 0.6)) { // 龍爪
        ctx.strokeStyle = '#1b7a60'; ctx.lineWidth = r * 0.35; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.6); ctx.lineTo(x - r * 0.5, y + r * 1.6); ctx.lineTo(x + r * 0.3, y + r * 2.0); ctx.stroke();
        ctx.fillStyle = '#f4fff8'; for (let c = 0; c < 3; c++) ctx.fillRect(x + r * 0.2 + c * 4, y + r * 2.0, 3, 5);
      }
    }
    // 龍頭
    const ang = Math.atan2(yAt(hx + 5) - hy, 5);
    ctx.translate(hx, hy); ctx.rotate(ang);
    const H = R * 1.25;
    // 鬃毛
    for (let m = 0; m < 6; m++) poly([-H * 0.4, -H * 0.3 + m * 4, -H * (1.6 + m * 0.15), -H * (0.9 - m * 0.3) + Math.sin(t * 8 + m) * 5, -H * 0.8, H * 0.1], m % 2 ? '#7ff5c8' : '#3fd3a0');
    // 頭與吻部
    poly([-H * 0.6, -H * 0.7, H * 0.5, -H * 0.6, H * 1.7, -H * 0.25, H * 1.8, H * 0.05, H * 0.6, H * 0.15, -H * 0.6, H * 0.6], '#2cbf94', '#0b4a3a', 2);
    poly([H * 0.4, H * 0.2, H * 1.6, H * 0.15, H * 1.3, H * 0.6, H * 0.3, H * 0.6], '#9ff5d5', '#0b4a3a', 2);       // 下顎（張嘴）
    ctx.fillStyle = '#ffffff'; for (let tt = 0; tt < 4; tt++) ctx.fillRect(H * (0.6 + tt * 0.25), H * 0.12, 3, 5);   // 牙
    // 龍角
    ctx.strokeStyle = '#e8ffe8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-H * 0.2, -H * 0.6); ctx.lineTo(-H * 1.2, -H * 1.6); ctx.moveTo(-H * 0.7, -H * 1.1); ctx.lineTo(-H * 0.5, -H * 1.6); ctx.stroke();
    // 眼睛
    glow('#ffe680', 10, () => { ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.ellipse(H * 0.55, -H * 0.3, H * 0.2, H * 0.12, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#10302a'; ctx.fillRect(H * 0.55, -H * 0.36, 3, 6);
    // 龍鬚
    ctx.strokeStyle = 'rgba(220,255,240,.85)'; ctx.lineWidth = 2.5;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(H * 1.5, -H * 0.1); ctx.bezierCurveTo(H * 1.2, sd * H * 1.2, -H * 0.5, sd * H * 0.4 + Math.sin(t * 7) * 10, -H * 1.8, sd * H * 1.1 + Math.sin(t * 6 + sd) * 14); ctx.stroke(); }
    ctx.restore();
  }
  // 白虎：白底黑紋的巨虎往右飛撲，四腳奔跑、尾巴甩動，額頭有「王」字，眼睛發藍光
  function drawTigerSweepOld(w) {
    const S = w.h / 200 * grow(w), p = t * 14, bob = Math.sin(p * 2) * 6;
    const bx = w.x - 170 * S, by = C.GROUND - 100 * S + bob * S;
    ctx.save();
    // 往後拉的速度線與靈氣
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) { const yy = by + ((i * 37) % 160 - 80) * S, len = (80 + (i * 53) % 140) * S, xx = bx - 120 * S - ((t * 700 + i * 61) % (w.len * 0.8)); ctx.fillStyle = 'rgba(190,230,255,.35)'; ctx.fillRect(xx - len, yy, len, 2); }
    const ag = ctx.createRadialGradient(bx, by, 10, bx, by, 220 * S);
    ag.addColorStop(0, 'rgba(190,230,255,.35)'); ag.addColorStop(1, 'rgba(190,230,255,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.ellipse(bx, by, 240 * S, 130 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(bx, by); ctx.scale(S, S); ctx.rotate(Math.sin(p * 2) * 0.05);
    const leg = (hx, hy, a1, a2, col, wd) => { // 兩段式的腳 + 腳掌
      const kx = hx + Math.cos(a1) * 55, ky = hy + Math.sin(a1) * 55, fx = kx + Math.cos(a2) * 50, fy = ky + Math.sin(a2) * 50;
      ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(fx + 6, fy, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
    };
    const s1 = Math.sin(p), s2 = Math.sin(p + Math.PI);
    // 遠側的腳（比較暗）
    leg(-85, 15, 1.9 + s1 * 0.7, 1.3 + s1 * 0.5, '#aebccb', 20);
    leg(75, 15, 1.2 + s2 * 0.8, 1.8 + s2 * 0.4, '#aebccb', 18);
    // 尾巴
    ctx.strokeStyle = '#f4f8fc'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-115, -15); ctx.bezierCurveTo(-170, -40, -190, -100 + Math.sin(p) * 20, -240, -85 + Math.sin(p * 1.3) * 25); ctx.stroke();
    ctx.strokeStyle = '#1a1d24'; ctx.lineWidth = 15; ctx.setLineDash([8, 16]); ctx.stroke(); ctx.setLineDash([]);
    // 身體
    const bg = ctx.createLinearGradient(0, -55, 0, 50);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.6, '#e6eef6'); bg.addColorStop(1, '#c4d2e0');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, 128, 50, 0, 0, Math.PI * 2); ctx.fill();
    // 黑色虎紋
    ctx.fillStyle = '#1a1d24';
    for (let i = 0; i < 7; i++) { const x = -100 + i * 30; poly([x, -48, x + 14, -46, x + 6 + (i % 2) * 6, -8, x + 2, -10], '#1a1d24'); if (i % 2) poly([x + 4, 46, x + 14, 44, x + 9, 18], '#1a1d24'); }
    // 近側的腳
    leg(-85, 15, 1.9 + s2 * 0.7, 1.3 + s2 * 0.5, '#f4f8fc', 22);
    leg(75, 15, 1.2 + s1 * 0.8, 1.8 + s1 * 0.4, '#f4f8fc', 20);
    ctx.fillStyle = '#1a1d24'; for (const [lx, ly] of [[-70, 45], [90, 45]]) ctx.fillRect(lx, ly, 14, 4);
    // 頭
    ctx.save(); ctx.translate(140, -32);
    poly([-20, -40, -8, -68, 6, -42], '#f4f8fc', '#1a1d24', 3); poly([10, -42, 26, -66, 34, -36], '#f4f8fc', '#1a1d24', 3); // 耳朵
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eef4fa'; ctx.beginPath(); ctx.ellipse(36, 14, 30, 20, 0, 0, Math.PI * 2); ctx.fill(); // 口鼻
    // 張開的嘴與尖牙
    poly([30, 22, 72, 18, 40, 42], '#5a1820');
    poly([44, 21, 48, 31, 52, 20], '#ffffff'); poly([58, 20, 61, 28, 64, 19], '#ffffff');
    poly([62, 4, 72, 8, 64, 14], '#1a1d24'); // 鼻子
    // 額頭的「王」字與臉上的紋
    ctx.strokeStyle = '#1a1d24'; ctx.lineWidth = 4; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-12, -30); ctx.lineTo(12, -30); ctx.moveTo(-10, -21); ctx.lineTo(10, -21); ctx.moveTo(-14, -12); ctx.lineTo(14, -12); ctx.moveTo(0, -30); ctx.lineTo(0, -12); ctx.stroke();
    ctx.lineWidth = 3; for (const yy of [6, 16]) { ctx.beginPath(); ctx.moveTo(-40, yy - 6); ctx.lineTo(-18, yy); ctx.stroke(); }
    // 發藍光的眼睛
    glow('#7fd4ff', 12, () => { ctx.fillStyle = '#9fe2ff'; poly([14, -8, 32, -12, 28, -2], '#9fe2ff'); });
    ctx.fillStyle = '#0d2a40'; ctx.fillRect(24, -9, 3, 5);
    ctx.restore();
    ctx.restore();
  }
  // 玄武：龜蛇合體，半透明浮現在浩浩人背後；龜甲是金色六角護盾
  function drawTortoiseOld(s) {
    const k = s.t, G0 = C.GROUND, cx = s.px - 10;
    const al = Math.min(clamp01(k / 0.6), clamp01((s.dur - k) / 0.5));
    if (al <= 0) return;
    const rise = easeOut(k / 0.7), sx = 170, sy = 120, by = G0 + 6 + (1 - rise) * 60;
    ctx.save(); ctx.globalAlpha = al;
    // 腳
    ctx.fillStyle = '#2c4a56';
    for (const lx of [-0.7, -0.3, 0.35, 0.72]) { ctx.beginPath(); ctx.ellipse(cx + lx * sx, by - 8, 22, 16, 0, 0, Math.PI * 2); ctx.fill(); }
    // 頭（朝右）
    ctx.beginPath(); ctx.ellipse(cx + sx * 1.02, by - sy * 0.35, 34, 24, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23d'; ctx.fillRect(cx + sx * 1.12, by - sy * 0.42, 6, 4);
    // 龜甲
    ctx.beginPath(); ctx.ellipse(cx, by - 10, sx, sy, 0, Math.PI, 0); ctx.closePath();
    const g = ctx.createLinearGradient(0, by - sy, 0, by);
    g.addColorStop(0, '#3f6a7a'); g.addColorStop(1, '#16303a'); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = `rgba(255,220,90,${0.75 + 0.25 * Math.sin(k * 6)})`; ctx.lineWidth = 2.5;
    const hr = 26;
    for (let row = 0; row < 7; row++) for (let col = -8; col <= 8; col++) {
      const hxp = cx + col * hr * 1.5, hyp = by - 10 - row * hr * 1.73 + (col & 1 ? hr * 0.87 : 0);
      ctx.beginPath(); for (let v = 0; v < 6; v++) { const a = v * Math.PI / 3; v ? ctx.lineTo(hxp + Math.cos(a) * hr, hyp + Math.sin(a) * hr) : ctx.moveTo(hxp + Math.cos(a) * hr, hyp + Math.sin(a) * hr); } ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, by - 10, sx, sy, 0, Math.PI, 0); ctx.stroke();
    // 纏在龜甲上的蛇，抬起頭朝右
    ctx.strokeStyle = '#2f7a5e'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - sx * 0.95, by - 14);
    ctx.bezierCurveTo(cx - sx * 0.6, by - sy * 1.3, cx + sx * 0.1, by - sy * 0.2, cx + sx * 0.35, by - sy * 0.95);
    ctx.bezierCurveTo(cx + sx * 0.5, by - sy * 1.45, cx + sx * 0.75, by - sy * 1.35 + Math.sin(k * 5) * 6, cx + sx * 0.82, by - sy * 1.15);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,61,.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2f7a5e'; ctx.beginPath(); ctx.ellipse(cx + sx * 0.86, by - sy * 1.12, 16, 11, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff5a3d'; ctx.fillRect(cx + sx * 0.92, by - sy * 1.18, 4, 3);
    // 護盾光罩：罩住整個隊伍
    const sg = ctx.createRadialGradient(cx + 40, G0, 30, cx + 40, G0, 300);
    sg.addColorStop(0, 'rgba(255,210,61,0)'); sg.addColorStop(0.85, `rgba(255,210,61,${0.18 + 0.08 * Math.sin(k * 8)})`); sg.addColorStop(1, 'rgba(255,210,61,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx + 40, G0, 300, 200, 0, Math.PI, 0); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  /* ---------- 特殊演出 ---------- */
  function drawSpecials(layer) {
    for (const s of B.specials) {
      if (s.kind === 'excal') { if (layer === 'over') drawExcalibur(s); else { excalDark(s); drawTigerGuard(s); } }
      else if (s.kind === 'horde') drawHorde(s, layer);
    }
  }
  const clamp01 = q => Math.max(0, Math.min(1, q));
  // 一段光束：從原點往 +x 方向，長 len、半寬 th（呼叫前先 translate / rotate）
  function beamBody(len, th, k) {
    let g = ctx.createLinearGradient(0, -th * 1.35, 0, th * 1.35);
    g.addColorStop(0, 'rgba(255,190,60,0)'); g.addColorStop(0.3, 'rgba(255,200,70,.35)'); g.addColorStop(0.5, 'rgba(255,236,160,.85)');
    g.addColorStop(0.7, 'rgba(255,200,70,.35)'); g.addColorStop(1, 'rgba(255,190,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, -th * 1.35, len, th * 2.7);
    g = ctx.createLinearGradient(0, -th * 0.45, 0, th * 0.45);
    g.addColorStop(0, 'rgba(255,250,220,0)'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.fillRect(0, -th * 0.45, len, th * 0.9);
    // 往前竄的光條
    for (let i = 0; i < 26; i++) {
      const yy = (((i * 37) % 100) / 100 - 0.5) * th * 2.4, xx = (k * 1600 + i * 173) % len, w = 60 + (i * 41) % 90;
      ctx.fillStyle = i % 3 ? 'rgba(255,245,200,.55)' : 'rgba(255,255,255,.8)'; ctx.fillRect(xx, yy, w, i % 4 ? 1.5 : 3);
    }
    // 根部的強光
    const f = ctx.createRadialGradient(0, 0, 2, 0, 0, th * 1.6 + 20);
    f.addColorStop(0, '#ffffff'); f.addColorStop(0.4, 'rgba(255,240,180,.8)'); f.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = f; ctx.beginPath(); ctx.arc(0, 0, th * 1.6 + 20, 0, Math.PI * 2); ctx.fill();
  }
  // 天色暗下來（光束更亮）；畫在角色和玄武後面
  function excalDark(s) {
    const dark = 0.55 * Math.min(clamp01(s.t / 0.3), clamp01((s.dur - s.t) / 0.4));
    ctx.fillStyle = `rgba(8,6,22,${dark})`; ctx.fillRect(-20, -20, B.W + 40, C.H + 40);
  }
  function drawExcalibur(s) {
    const k = s.t, W = B.W, H = C.H, hx = s.hx, hy = s.hy;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let ang, len, th;
    if (k < 0.95) { // 蓄力：光粒子聚集，光柱往天上長
      const q = easeOut(k / 0.75);
      ang = -Math.PI / 2; len = (hy + 80) * q; th = 8 + 14 * clamp01(k / 0.95);
      for (let i = 0; i < 46; i++) {
        const ph = (k * 1.4 + i * 0.137) % 1, a0 = i * 2.39, R = 200 * (1 - ph);
        const py = hy - (i * 53 % 260), px = hx + Math.cos(a0) * R;
        ctx.globalAlpha = ph; ctx.fillStyle = i % 3 ? '#ffe680' : '#ffffff'; ctx.fillRect(px, py + Math.sin(a0) * R * 0.4, 3, 3);
      }
      ctx.globalAlpha = 1;
    } else if (k < 1.2) { // 揮下
      const q = easeIn((k - 0.95) / 0.25);
      ang = -Math.PI / 2 + (Math.PI / 2 - 0.035) * q; len = Math.max(hy + 80, W * 1.3 * q); th = 22 + 10 * q;
    } else { // 解放：橫掃全場的光束，最後收細消失
      const grow = easeOut((k - 1.2) / 0.12), fade = clamp01((s.dur - 0.15 - k) / 0.45);
      ang = -0.035; len = W * 1.3; th = (24 + 80 * grow) * fade;
      // 地面被照亮
      const gg = ctx.createLinearGradient(0, C.GROUND - 30, 0, C.GROUND + 40);
      gg.addColorStop(0, 'rgba(255,220,120,0)'); gg.addColorStop(0.5, `rgba(255,220,120,${0.45 * fade})`); gg.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = gg; ctx.fillRect(hx, C.GROUND - 30, W, 70);
    }
    if (th > 0.5) { ctx.translate(hx, hy); ctx.rotate(ang); beamBody(len, th, k); }
    ctx.restore();
  }
  // 影之大軍
  function drawHorde(s, layer) {
    const k = s.t, W = B.W, G0 = C.GROUND;
    const night = Math.min(clamp01(k / 0.5), clamp01((s.dur - k) / 0.6));
    const rx = W * 0.22, ry = 74, rw = 200 * easeOut(k / 0.6) * (0.4 + 0.6 * night);
    if (layer === 'under') {
      // 永夜：天色變成深紫黑
      ctx.fillStyle = `rgba(14,4,30,${0.62 * night})`; ctx.fillRect(-20, -20, W + 40, C.H + 40);
      // 天空裂開的深淵
      if (rw > 2) {
        ctx.save();
        const g = ctx.createRadialGradient(rx, ry, 2, rx, ry, rw);
        g.addColorStop(0, `rgba(0,0,0,${night})`); g.addColorStop(0.55, `rgba(40,10,80,${0.9 * night})`); g.addColorStop(0.8, `rgba(154,91,255,${0.6 * night})`); g.addColorStop(1, 'rgba(154,91,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(rx, ry, rw, rw * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(208,168,255,${0.7 * night})`; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(rx, ry, rw * (0.5 + i * 0.18), rw * 0.28 * (0.5 + i * 0.18), 0, k * (2 + i) % 6.28, k * (2 + i) % 6.28 + 2.4); ctx.stroke(); }
        ctx.restore();
      }
      // 地上的召喚陣
      const cr = 300 * easeOut(k / 0.5);
      ctx.save(); ctx.strokeStyle = `rgba(176,122,255,${0.8 * night})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(C.HERO_X * 0.55, G0 + 4, cr, cr * 0.09, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -k * 60;
      ctx.beginPath(); ctx.ellipse(C.HERO_X * 0.55, G0 + 4, cr * 0.8, cr * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const gg = ctx.createLinearGradient(0, G0 - 40, 0, G0 + 20);
      gg.addColorStop(0, 'rgba(154,91,255,0)'); gg.addColorStop(0.7, `rgba(154,91,255,${0.35 * night})`); gg.addColorStop(1, 'rgba(154,91,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, G0 - 40, W, 60);
      ctx.restore();
      return;
    }
    // 士兵（畫在怪物前面）
    for (const so of s.sol) {
      if (k < so.rise || so.x > W + 80) continue;
      const img = (G.SPR.monShadow[so.type] || [])[0]; if (!img) continue;
      const rk = clamp01((k - so.rise) / 0.35), iw = SW(img) * so.sc, ih = SH(img) * so.sc;
      const running = k >= so.run, bob = running ? -Math.abs(Math.sin(k * 16 + so.ph)) * 4 * so.sc : Math.sin(k * 3 + so.ph);
      let x = so.x, y = so.y;
      if (so.fly) { const e = easeOut(rk); x = rx + (so.x - rx) * e; y = ry + (so.y - ry) * e; }
      const drawOne = (dx, al) => {
        ctx.save(); ctx.globalAlpha = al; ctx.translate(x + dx, y + bob); ctx.scale(-so.sc, so.sc); // 翻過來面向右邊衝
        drawSprite(img); ctx.restore();
      };
      if (!so.fly && rk < 1) { // 從地底爬出來：只畫地面以上的部分
        ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, W + 40, y + 2 + 20); ctx.clip();
        y += (1 - rk) * ih; drawOne(0, 0.95); ctx.restore();
      } else {
        if (running) { drawOne(-14 * so.sc, 0.2); drawOne(-7 * so.sc, 0.35); }
        drawOne(0, 0.95);
      }
      // 發光的眼睛
      const ex = x + iw * 0.28 - 1, ey = y + bob - ih * 0.72;
      ctx.fillStyle = 'rgba(176,122,255,.5)'; ctx.fillRect(ex - 1, ey - 1, 3 + so.sc, 3 + so.sc);
      ctx.fillStyle = '#f2e6ff'; ctx.fillRect(ex, ey, 1 + so.sc, 1 + so.sc);
      // 衝鋒揚起的塵土
      if (running && !so.fly) { ctx.fillStyle = 'rgba(150,110,200,.35)'; for (let d = 0; d < 3; d++) ctx.fillRect(x - iw * 0.4 - d * 9 - ((k * 50 + d * 7) % 9), y - 2 - d * 2, 4, 3); }
    }
  }

  // 斜飛下來的巨大火球：火焰尾巴沿著飛行方向往後拖
  function drawBigBalls() {
    for (const b of B.balls) {
      if (b.x === undefined) continue;
      const R = b.R * Math.min(1, 0.4 + b.t * 1.5), ca = Math.cos(b.ang), sa = Math.sin(b.ang);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cols = ['#fff3a6', '#ffe26b', '#ffc23d', '#ff8a2a', '#f2561d', '#c9281f', '#8a1f17'], N = 24, L = R * 6;
      for (let i = N; i >= 1; i--) {
        const s = i / N, wob = Math.sin(t * 16 + i * 1.9) * R * 0.25 * s;
        const px = b.x - ca * s * L - sa * wob, py = b.y - sa * s * L + ca * wob;
        ctx.globalAlpha = (1 - s) * 0.6; ctx.fillStyle = cols[Math.min(6, Math.floor(s * 7))];
        ctx.beginPath(); ctx.arc(px, py, R * (1 - s * 0.7) * (0.85 + 0.15 * Math.sin(t * 25 + i * 3)), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const hd = b.phoenix && bok('phoenix_body');
      const g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, R * 1.4);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#fff3a6'); g.addColorStop(0.6, 'rgba(255,150,40,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      if (hd) { ctx.globalAlpha = 0.7; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, R * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; drawPhoenix(b, R, ca, sa); }
      else {
        if (b.phoenix) drawPhoenix(b, R, ca, sa);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, R * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      // 地上越來越亮的落點光
      const k = Math.min(1, b.t / b.dur);
      const gg = ctx.createRadialGradient(b.tx, C.GROUND, 2, b.tx, C.GROUND, 160);
      gg.addColorStop(0, `rgba(255,170,60,${0.6 * k})`); gg.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(b.tx, C.GROUND, 160, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  function drawWaves() {
    for (const w of B.waves) {
      if (w.kind === 'fire') drawSunSweep(w);
      else if (w.kind === 'arrow') drawArrowSweep(w);
      else if (w.kind === 'holy') drawCrescentSweep(w);
      else if (w.kind === 'shadow') drawShadowSweep(w);
      else if (w.kind === 'dragon') drawDragonSweep(w);
      else if (w.kind === 'wdragon') drawWDragon(w);
      else if (w.kind === 'qilin') drawQilinSweep(w);
      else if (w.kind === 'tiger') drawTigerSweep(w);
      else { drawWaterSweep(w); if (w.rider === 'tortoise') drawTortoiseRider(w); }
    }
  }
  const grow = w => Math.min(1, w.t * 5); // 剛出現時從小長大
  // 烈陽火球：白熱的核心、後面拖著一長串火焰
  function drawSunSweep(w) {
    const G0 = C.GROUND, R = w.h * 0.42 * grow(w), cx = w.x - R * 0.4, cy = G0 - R - 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 地面被照亮
    const gg = ctx.createRadialGradient(cx, G0, 4, cx, G0, R * 2.2);
    gg.addColorStop(0, 'rgba(255,140,40,.55)'); gg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(cx, G0, R * 2.2, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // 火焰尾巴
    const N = 26, cols = ['#fff3a6', '#ffe26b', '#ffc23d', '#ff8a2a', '#f2561d', '#c9281f', '#8a1f17'];
    for (let i = N; i >= 0; i--) {
      const s = i / N, px = cx - s * w.len, wob = Math.sin(t * 14 + i * 1.7) * R * 0.18 * s;
      const rr = R * (1 - s * 0.8) * (0.85 + 0.15 * Math.sin(t * 22 + i * 3));
      ctx.globalAlpha = (1 - s) * 0.55;
      ctx.fillStyle = cols[Math.min(cols.length - 1, Math.floor(s * cols.length))];
      ctx.beginPath(); ctx.arc(px, cy + wob - s * R * 0.25, rr, 0, Math.PI * 2); ctx.fill();
    }
    // 核心
    ctx.globalAlpha = 1;
    const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 1.35);
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.35, '#fff3a6'); cg.addColorStop(0.6, 'rgba(255,170,50,.9)'); cg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();
    // 噴出的火星
    for (let k = 0; k < 26; k++) {
      const ph = (t * 1.6 + k * 0.173) % 1, ang = Math.PI * (0.55 + (k * 0.618 % 1) * 0.9);
      const px = cx + Math.cos(ang) * (R + ph * R * 1.6) - ph * 60, py = cy + Math.sin(ang) * (R + ph * R * 1.2);
      ctx.globalAlpha = 1 - ph; ctx.fillStyle = k % 3 ? '#ffc23d' : '#ffffff'; ctx.fillRect(px, py, 3, 3);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // 疾風巨箭：發光的箭身、巨大箭頭、繞著箭身的風環
  function drawArrowSweep(w) {
    const G0 = C.GROUND, k0 = grow(w), H = w.h * k0, y = G0 - w.h * 0.42, tip = w.x, head = H * 0.55, tail = tip - w.len * k0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // 速度線
    for (let i = 0; i < 18; i++) {
      const yy = y + ((i * 37) % 100 - 50) / 50 * H * 0.6, len = 80 + (i * 53) % 160, xx = tip - head - ((t * 900 + i * 71) % (w.len * 0.9));
      ctx.fillStyle = 'rgba(160,255,200,.35)'; ctx.fillRect(xx - len, yy, len, i % 3 ? 1.5 : 3);
    }
    // 箭身
    const sg = ctx.createLinearGradient(tail, 0, tip, 0);
    sg.addColorStop(0, 'rgba(94,240,160,0)'); sg.addColorStop(0.5, 'rgba(94,240,160,.7)'); sg.addColorStop(1, 'rgba(220,255,235,1)');
    ctx.fillStyle = sg; ctx.fillRect(tail, y - H * 0.07, tip - head * 0.6 - tail, H * 0.14);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(tail + w.len * 0.3, y - H * 0.025, tip - head * 0.6 - tail - w.len * 0.3, H * 0.05);
    // 箭羽
    const fx0 = tail + w.len * 0.35 * k0;
    poly([fx0, y - H * 0.06, fx0 - H * 0.35, y - H * 0.38, fx0 - H * 0.15, y - H * 0.06], 'rgba(94,240,160,.55)');
    poly([fx0, y + H * 0.06, fx0 - H * 0.35, y + H * 0.38, fx0 - H * 0.15, y + H * 0.06], 'rgba(94,240,160,.55)');
    // 箭頭
    // 光暈用放大的半透明箭頭代替 shadowBlur（大面積模糊很吃效能）
    for (const [e, al] of [[1.35, 0.18], [1.15, 0.3]]) poly([tip + H * 0.12 * e, y, tip - head * e, y - H * 0.32 * e, tip - head * 0.7, y, tip - head * e, y + H * 0.32 * e], `rgba(94,240,160,${al})`);
    poly([tip, y, tip - head, y - H * 0.32, tip - head * 0.7, y, tip - head, y + H * 0.32], 'rgba(94,240,160,.9)');
    poly([tip - 6, y, tip - head * 0.8, y - H * 0.18, tip - head * 0.6, y, tip - head * 0.8, y + H * 0.18], '#ffffff');
    // 風環
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const gap = w.len * 0.22, xx = tip - head - i * gap - (t * 500 % gap), rr = H * 0.42 * (1 - i * 0.18);
      ctx.strokeStyle = `rgba(190,255,220,${0.7 - i * 0.15})`;
      ctx.beginPath(); ctx.ellipse(xx, y, rr * 0.22, rr, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  // 聖光月牙斬：金色的巨大月牙，後面拖著殘影，邊緣閃電
  function crescent(cx, cy, R, a) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.arc(cx - R * 0.42, cy, R * 0.86, Math.PI * 0.38, -Math.PI * 0.38, true);
    ctx.closePath();
    ctx.globalAlpha = a;
  }
  function drawCrescentSweep(w) {
    const G0 = C.GROUND, R = w.h * 0.55 * grow(w), cy = G0 - w.h * 0.45, cx = w.x - R;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 4; i >= 1; i--) { // 殘影
      crescent(cx - i * w.len * 0.16, cy, R * (1 - i * 0.06), 0.35 - i * 0.07);
      ctx.fillStyle = '#ffd23d'; ctx.fill();
    }
    const gr = ctx.createLinearGradient(cx, 0, cx + R, 0);
    gr.addColorStop(0, 'rgba(255,210,61,.2)'); gr.addColorStop(0.6, '#ffe680'); gr.addColorStop(1, '#ffffff');
    glow('#ffd23d', 40, () => { crescent(cx, cy, R, 1); ctx.fillStyle = gr; ctx.fill(); });
    ctx.globalAlpha = 1;
    // 邊緣的金色閃電
    ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const a0 = -0.4 + k * 0.27 + Math.sin(t * 30 + k) * 0.05;
      let px = cx + Math.cos(a0 * Math.PI) * R, py = cy + Math.sin(a0 * Math.PI) * R;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let j = 0; j < 4; j++) { px += 10 + Math.random() * 14; py += (Math.random() - 0.5) * 28; ctx.lineTo(px, py); }
      ctx.stroke();
    }
    // 光羽
    ctx.fillStyle = '#fff6c8';
    for (let k = 0; k < 20; k++) {
      const ph = (t * 1.3 + k * 0.137) % 1, yy = cy + ((k * 0.618 % 1) - 0.5) * R * 1.8;
      ctx.globalAlpha = 1 - ph; ctx.fillRect(cx + R * 0.6 - ph * w.len * 0.8, yy - ph * 30, 3, 3);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // 暗影潮：一整片翻滾的黑紫色影子，裡面有一雙雙發光的眼睛
  function drawShadowSweep(w) {
    const G0 = C.GROUND, H = w.h * grow(w), x = w.x;
    const blobs = [];
    for (let i = 0; i < 64; i++) {
      const s = (i * 0.618034) % 1, v = (i * 0.754878 + 0.31) % 1;  // s：離前緣多遠，v：高度（兩個互不相關的序列，才會鋪滿）
      const front = 1 - Math.pow(v, 2) * 0.5;                        // 前緣上面比較後面，像浪一樣
      const bx = x - s * w.len - (1 - front) * H * 0.5 + Math.sin(t * 6 + i) * 8;
      const by = G0 - v * H * (1 - s * 0.6) + Math.cos(t * 5 + i * 2) * 6;
      const r = H * (0.16 + 0.08 * ((i * 0.27) % 1)) * (1 - s * 0.55);
      blobs.push([bx, by, r, s]);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [bx, by, r, s] of blobs) { ctx.globalAlpha = 0.25 * (1 - s); ctx.fillStyle = '#9a5bff'; ctx.beginPath(); ctx.arc(bx, by, r * 1.25, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    for (const [bx, by, r, s] of blobs) { ctx.globalAlpha = 0.9 * (1 - s * 0.8); ctx.fillStyle = s < 0.3 ? '#1a0a2e' : '#24103e'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // 發光的眼睛
    for (let k = 0; k < 9; k++) {
      const s = (k * 0.29) % 0.7, v = 0.15 + (k * 0.47) % 0.7;
      const ex = x - s * w.len - H * 0.1, ey = G0 - v * H * (1 - s * 0.6);
      if ((t * 2 + k * 0.37) % 1 < 0.08) continue; // 眨眼
      glow('#c08bff', 10, () => { ctx.fillStyle = '#f0e0ff'; ctx.fillRect(ex - 8, ey, 5, 3); ctx.fillRect(ex + 3, ey, 5, 3); });
    }
    // 前緣的紫色電光
    ctx.strokeStyle = 'rgba(208,168,255,.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = 0; j <= 12; j++) { const v = j / 12, px = x - Math.pow(v, 2) * H * 0.25 + (Math.random() - 0.5) * 8, py = G0 - v * H; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    ctx.restore();
  }
  function drawWaterSweep(w) {
    const G0 = C.GROUND;
    {
      const x = w.x, h = w.h * Math.min(1, w.t * 5), L = w.len, tail = x - L;
      // 浪身：從尾巴慢慢升高到浪頭，浪頭往前捲
      const top = s0 => G0 - h * Math.pow(s0, 1.6) * (0.92 + 0.08 * Math.sin(t * 9 + s0 * 14));
      ctx.beginPath(); ctx.moveTo(tail, G0 + 6);
      for (let k = 0; k <= 20; k++) { const s0 = k / 20; ctx.lineTo(tail + L * 0.9 * s0, top(s0)); }
      ctx.bezierCurveTo(x - h * 0.05, G0 - h * 1.08, x + h * 0.32, G0 - h * 0.98, x + h * 0.38, G0 - h * 0.7); // 浪尖往前捲
      ctx.bezierCurveTo(x + h * 0.3, G0 - h * 0.55, x + h * 0.1, G0 - h * 0.62, x + h * 0.06, G0 - h * 0.48); // 捲回來
      ctx.quadraticCurveTo(x + h * 0.02, G0 - h * 0.2, x + h * 0.22, G0 + 6);
      ctx.closePath();
      const gr = ctx.createLinearGradient(tail, 0, x + h * 0.4, 0);
      gr.addColorStop(0, 'rgba(20,90,190,0)'); gr.addColorStop(0.35, 'rgba(25,110,210,.55)'); gr.addColorStop(0.8, 'rgba(45,150,245,.88)'); gr.addColorStop(1, 'rgba(120,210,255,.95)');
      ctx.fillStyle = gr; ctx.fill();
      // 深色浪底
      const gv = ctx.createLinearGradient(0, G0 - h, 0, G0);
      gv.addColorStop(0, 'rgba(255,255,255,0)'); gv.addColorStop(1, 'rgba(6,40,110,.45)');
      ctx.fillStyle = gv; ctx.fill();
      // 浪花白邊
      ctx.save(); ctx.globalAlpha = 0.9;
      glow('#bfeaff', 10, () => {
        ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 3 + h / 60; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let k = 8; k <= 20; k++) { const s0 = k / 20, px = tail + L * 0.9 * s0, py = top(s0); k === 8 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
        ctx.bezierCurveTo(x - h * 0.05, G0 - h * 1.08, x + h * 0.32, G0 - h * 0.98, x + h * 0.38, G0 - h * 0.7);
        ctx.stroke();
      });
      // 浪身裡的亮色水紋
      ctx.strokeStyle = 'rgba(190,235,255,.35)'; ctx.lineWidth = 1.5;
      for (let j = 1; j <= 3; j++) {
        ctx.beginPath();
        for (let k = 6; k <= 18; k++) { const s0 = k / 20, px = tail + L * 0.9 * s0 - j * 14, py = top(s0) + j * h * 0.16 + Math.sin(t * 7 + k + j) * 2; k === 6 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
        ctx.stroke();
      }
      // 浪尖噴出的水花
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 10 + h / 10; k++) {
        const ph = (t * 2.2 + k * 0.137) % 1, ang = -1.2 + (k * 0.618 % 1) * 1.6;
        const px = x + h * 0.3 + Math.cos(ang) * ph * h * 0.5, py = G0 - h * 0.95 + Math.sin(ang) * ph * h * 0.4 + ph * ph * h * 0.5;
        ctx.globalAlpha = 1 - ph; ctx.fillRect(px, py, 2 + h / 80, 2 + h / 80);
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
  }

  /* ---------- 大招蓋板：全畫面、斜線分割，左半邊頭像、右半邊招式名 ---------- */
  const easeOut = q => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 3);
  const easeIn = q => Math.pow(Math.max(0, Math.min(1, q)), 3);
  // 夥伴的單色剪影（蓋板頭像的外框用），每位夥伴只做一次
  const silCache = {};
  function silhouette(id, img, col) {
    const key = id + (img.width || 0);
    if (silCache[key]) return silCache[key];
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const x = cv.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, cv.width, cv.height);
    return (silCache[key] = cv);
  }
  function drawCutin() {
    const c = B.cutin;
    if (!c) return;
    const W = B.W, H = C.H, k = c.t, D = c.dur, col = c.col;
    const inK = easeOut(k / 0.26), outK = easeIn((k - (D - 0.28)) / 0.28);
    const topX = W * 0.56, botX = W * 0.40, slope = (topX - botX) / H;
    // 1. 整個畫面壓暗
    ctx.fillStyle = `rgba(4,2,10,${0.7 * inK * (1 - outK)})`; ctx.fillRect(0, 0, W, H);
    // 2. 右半邊（招式名）：從右邊滑進來，最後往右飛出去
    const rx = (1 - inK) * W * 0.7 + outK * W * 0.8;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(topX + 10 + rx, 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(botX + 10 + rx, H); ctx.closePath(); ctx.clip();
    let gr = ctx.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, hexA(col, 0.55)); gr.addColorStop(0.6, 'rgba(12,8,22,.95)'); gr.addColorStop(1, 'rgba(6,4,12,.98)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // 往左飛的速度線
    for (let i = 0; i < 26; i++) {
      const yy = (i * 53.7) % H, len = 60 + (i * 37) % 120, sp = 900 + (i * 131) % 700;
      const xx = W - ((k * sp + i * 97) % (W + len));
      ctx.fillStyle = i % 3 ? hexA(col, 0.25) : 'rgba(255,255,255,.18)'; ctx.fillRect(xx, yy, len, i % 4 ? 1.5 : 3);
    }
    // 大大的英文字當底紋
    ctx.globalAlpha = 0.09; text(c.en, W * 0.74 + rx - k * 40, H * 0.2, 46, '#ffffff', 'center', 900); ctx.globalAlpha = 1;
    // 招式名：一開始放大、砸下來定住
    const pop = 1 + 0.9 * (1 - easeOut((k - 0.12) / 0.22));
    const ty = H * 0.52, divX = topX - (topX - botX) * 0.52, len = [...c.name].length;
    const tx = (divX + W) / 2 + 8 + rx, fs = Math.min(64, (W - divX - 56) / (len * 1.02));
    if (k > 0.12) {
      ctx.save(); ctx.translate(tx, ty); ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, (k - 0.12) / 0.1);
      glow(col, 30, () => outlined(c.name, 0, 0, fs, '#ffffff', 'center', TITLE));
      ctx.restore(); ctx.globalAlpha = 1;
    }
    outlined(c.sub, tx, ty - fs * 0.5 - 22, 17, col, 'center');
    // 招式名下方的色帶
    ctx.fillStyle = col; ctx.fillRect(tx - (W - topX) * 0.36 * inK, ty + fs * 0.5 + 12, (W - topX) * 0.72 * inK, 4);
    text(c.en, tx, ty + fs * 0.5 + 30, 12, hexA(col, 0.9), 'center', 900);
    if (c.beast) outlined(`${c.beastTag || '四聖獸'}・${c.beast}　降臨`, tx, ty + fs * 0.5 + 54, 15, '#ffffff', 'center', TITLE);
    ctx.restore();
    // 3. 左半邊（頭像）：從左邊滑進來，最後往左飛出去
    const lx = -(1 - inK) * W * 0.7 - outK * W * 0.8;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(topX + lx, 0); ctx.lineTo(botX + lx, H); ctx.lineTo(-10, H); ctx.closePath(); ctx.clip();
    gr = ctx.createLinearGradient(0, H, topX, 0);
    gr.addColorStop(0, G.shade ? G.shade(col, 0.25) : '#101018'); gr.addColorStop(0.55, col); gr.addColorStop(1, '#ffffff');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // 放射集中線（從頭像往外）
    const hx = W * 0.25 + lx, hy = H * 0.42;
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2 + k * 0.6, a2 = a + 0.035;
      ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * 60, hy + Math.sin(a) * 60);
      ctx.lineTo(hx + Math.cos(a) * 900, hy + Math.sin(a) * 900); ctx.lineTo(hx + Math.cos(a2) * 900, hy + Math.sin(a2) * 900); ctx.closePath(); ctx.fill();
    }
    // 斜紋
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 10;
    for (let i = -4; i < 20; i++) { const xx = i * 40 + (k * 80) % 40; ctx.beginPath(); ctx.moveTo(xx, H); ctx.lineTo(xx + H * 0.5, 0); ctx.stroke(); }
    // 頭像：放大的夥伴，只露出上半身（慢慢往前推）
    const img = (G.SPR.partner[c.id] || {}).cast;
    if (c.id === 'hero') {
      const sc = H * 0.95 / 96; // 跟著勇者的大小（HS）調，頭髮才不會被切到
      ctx.save(); ctx.translate(hx + k * 18 - C.HERO_X * sc, H * 1.02 - C.GROUND * sc); ctx.scale(sc, sc);
      portraitMode = true; try { drawHero(); } finally { portraitMode = false; }
      ctx.restore();
    } else if (img) {
      const sc = H * 1.45 / img.height, iw = img.width * sc, ih = img.height * sc;
      const drift = k * 18;
      ctx.imageSmoothingEnabled = img.width > 40;
      // 先畫一層彩色剪影當外框
      ctx.globalAlpha = 0.6; ctx.drawImage(silhouette(c.id, img, col), hx - iw * 0.47 + drift + 10, hy - ih * 0.3 + 6, iw, ih); ctx.globalAlpha = 1;
      ctx.drawImage(img, hx - iw * 0.47 + drift, hy - ih * 0.3, iw, ih);
    }
    // 聖獸名的大字（直排，半透明）
    if (c.beast) {
      ctx.globalAlpha = 0.28 * inK;
      const bs = H * 0.3;
      [...c.beast].forEach((ch, i) => outlined(ch, W * 0.08 + lx, H * 0.3 + i * bs * 1.05, bs, '#ffffff', 'center', TITLE));
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 4. 斜線分割：白色粗線 + 職業色細線
    const dx = (lx + rx) / 2;
    glow(col, 20, () => {
      line([topX + 5 + dx, -10, botX + 5 + dx - slope * 10, H + 10], '#ffffff', 7);
      line([topX + 14 + dx, -10, botX + 14 + dx - slope * 10, H + 10], col, 3);
    });
    // 5. 上下電影黑邊
    const bar = 34 * inK * (1 - outK);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    // 6. 收尾閃白
    if (outK > 0) { ctx.fillStyle = `rgba(255,255,255,${0.6 * outK})`; ctx.fillRect(0, 0, W, H); }
  }

  /* ---------- 上方資訊、標語 ---------- */
  function drawTopBar() {
    const S = G.S, W = B.W, z = G.zone(S.stage);
    outlined(`第 ${S.stage} 關`, 18, 24, 20, '#fff2d0', 'left', TITLE);
    text(z.name, 18, 48, 13, z.accent, 'left', 700);
    if (B.boss) {
      const bw = Math.min(420, W - 280), bx = (W - bw) / 2;
      outlined(B.boss.name, W / 2, 18, 15, '#ff6a7a', 'center', TITLE);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, 30, bw, 9);
      glow('#ff3d6a', 8, () => { ctx.fillStyle = '#ff3d6a'; ctx.fillRect(bx, 30, bw * Math.max(0, B.boss.hp / B.boss.max), 9); });
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, 42, bw, 3);
      ctx.fillStyle = '#ffd23d'; ctx.fillRect(bx, 42, bw * Math.max(0, B.bossT / (B.bossTMax || C.bossTime)), 3);
      text(`${G.fmt(Math.max(0, B.boss.hp))} / ${G.fmt(B.boss.max)}   ${Math.ceil(B.bossT)} 秒`, W / 2, 56, 11, '#f4e8d0', 'center', 700);
    } else {
      const n = C.killsPerStage, pw = 14, gap = 5, total = n * pw + (n - 1) * gap, sx = W - 18 - total;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i < S.kills ? z.accent : 'rgba(255,255,255,.15)';
        ctx.fillRect(sx + i * (pw + gap), 18, pw, 5);
      }
      text(S.kills >= n ? (S.auto ? '首領即將出現' : '可以挑戰首領') : `擊殺 ${S.kills}/${n}`, W - 18, 36, 11, '#e8dcc0', 'right', 700);
    }
  }
  function drawBanner() {
    const b = B.banner;
    if (!b) return;
    const a = Math.min(1, b.life * 3, (b.max - b.life) * 6);
    const W = B.W, y = b.small ? 112 : C.H * 0.36;
    ctx.globalAlpha = a;
    if (!b.small) {
      const gr = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(10,4,20,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, y - 44, W, 88);
    }
    const sc = b.small ? 1 : 1 + Math.max(0, (b.life - b.max + 0.25)) * 2;
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(sc, sc);
    glow(b.col, 24, () => outlined(b.txt, 0, 0, b.small ? 22 : 36, b.col, 'center', TITLE));
    if (b.sub) outlined(b.sub, 0, 32, 15, '#fff2d0');
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 首領登場前：畫面右邊緣一閃一閃的紅光，跟首領走進來的方向連在一起
  function drawBossWarn() {
    const k = B.bossWarn || 0;
    if (k <= 0) return;
    const W = B.W, H = C.H, a = Math.min(1, k / 0.4) * (0.75 + 0.25 * Math.sin(t * 12));
    const gr = ctx.createLinearGradient(W, 0, W - 220, 0);
    gr.addColorStop(0, `rgba(255,50,90,${0.75 * a})`); gr.addColorStop(0.4, `rgba(255,40,80,${0.3 * a})`); gr.addColorStop(1, 'rgba(255,40,80,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gr; ctx.fillRect(W - 220, 0, 220, H);
    ctx.restore();
    // 邊緣一條亮線
    ctx.fillStyle = `rgba(255,120,150,${0.9 * a})`; ctx.fillRect(W - 3, 0, 3, H);
  }

  /* ---------- 章節演出 ---------- */
  const CN = '零一二三四五六七八九';
  function cnNum(n) { // 1～99 的中文數字
    if (n < 10) return CN[n];
    const a = Math.floor(n / 10), b = n % 10;
    return (a > 1 ? CN[a] : '') + '十' + (b ? CN[b] : '');
  }
  const chapName = i => `第${cnNum(i + 1)}章`;
  // 把一句話依寬度斷行（中文逐字斷）
  function wrap(s, maxW) {
    const out = []; let cur = '';
    for (const ch of s) { if (cur && ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ''; } cur += ch; }
    if (cur) out.push(cur);
    return out;
  }
  function bubble(s, x, y, name, col, side, k) {
    const FS = 15, LH = 21, PAD = 12;
    ctx.font = `700 ${FS}px ${FONT}`;
    const all = wrap(s, 250), shown = Math.floor(k * 26); // 打字機效果：每秒 26 字
    let left = shown;
    const lines = all.map(l => { const v = l.slice(0, Math.max(0, left)); left -= l.length; return v; });
    const w = Math.max(...all.map(l => ctx.measureText(l).width)) + PAD * 2, h = all.length * LH + PAD * 2;
    let bx = side === 'right' ? x - w + 30 : x - 30;
    bx = Math.max(10, Math.min(B.W - w - 10, bx));
    const by = Math.max(54, y - h - 14);
    const pop = easeOut(Math.min(1, k / 0.18));
    ctx.save();
    ctx.translate(x, by + h); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop); ctx.translate(-x, -(by + h));
    ctx.globalAlpha = pop;
    // 對話框 + 小尾巴
    ctx.fillStyle = 'rgba(14,10,24,.92)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, w, h, 10); ctx.fill(); ctx.stroke();
    const tx = Math.max(bx + 16, Math.min(bx + w - 16, x));
    ctx.beginPath(); ctx.moveTo(tx - 8, by + h - 1); ctx.lineTo(tx, by + h + 12); ctx.lineTo(tx + 8, by + h - 1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 8, by + h); ctx.lineTo(tx, by + h + 12); ctx.lineTo(tx + 8, by + h); ctx.stroke();
    // 名牌
    ctx.font = `900 12px ${TITLE}`;
    const nw = ctx.measureText(name).width + 16;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(bx + 10, by - 10, nw, 19, 5); ctx.fill();
    text(name, bx + 10 + nw / 2, by, 12, '#140a18', 'center', 900, TITLE);
    lines.forEach((l, i) => text(l, bx + PAD, by + PAD + LH * i + LH / 2, FS, '#fff4dc', 'left', 700));
    ctx.restore();
  }
  /* ---------- 特殊事件 ---------- */
  // 事件卡：「特殊事件」小字 + 事件名稱大字（會抖，像電話在響）+ 誰被叫走了
  function drawEventCard(s, inK, outK) {
    const W = B.W, H = C.H, d = s.def, a = inK * (1 - outK), y = H * 0.4, u = G.unitDef(d.partner);
    ctx.globalAlpha = a;
    const gr = ctx.createLinearGradient(0, y - 80, 0, y + 80);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(14,4,22,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, y - 80, W, 160);
    text('！ 特殊事件 ！', W / 2, y - 40, 15, '#ffd23d', 'center', 900, TITLE);
    const k = s.t - s.delay, shakeX = k < 1.6 ? Math.sin(k * 60) * 3 * (1 - k / 1.6) : 0, sc = 1 + 0.12 * (1 - inK);
    ctx.save(); ctx.translate(W / 2 + shakeX, y + 6); ctx.scale(sc, sc);
    glow(d.color, 26, () => outlined(d.event + '！', 0, 0, 44, d.color, 'center', TITLE));
    ctx.font = `48px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const iw = ctx.measureText(d.event).width;
    ctx.fillText(d.icon, -iw * 0.5 - 70 - Math.abs(shakeX) * 2, 2); ctx.fillText(d.icon, iw * 0.5 + 70 + Math.abs(shakeX) * 2, 2);
    ctx.restore();
    text(`${u.name}被「${d.name}」叫走了！在時限內打倒她`, W / 2, y + 50, 14, '#fff2d0', 'center', 700);
    ctx.globalAlpha = 1;
  }
  // 戰鬥中：被叫走的夥伴頭上冒圖示；她的嘴砲；打倒後夥伴說的話
  function drawEventBits() {
    if (B.scene) return;
    const ev = B.event;
    if (ev) {
      const p = B.unitPos(ev.def.partner), bob = Math.sin(t * 6) * 2;
      ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ev.def.icon, p.x, p.y - 62 + bob);
      text('忙碌中', p.x, p.y - 46, 10, '#ffd0e0', 'center', 900);
      const m = B.boss;
      if (ev.say && m) bubble(ev.say.txt, m.x - m.w * 0.3, m.y - m.h * 0.6, m.name, ev.def.color, 'right', ev.say.t); // 畫在身體旁邊，不會被上面的按鈕擋住
    }
    const l = B.evLine;
    if (l) { const u = G.unitDef(l.who), p = B.unitPos(l.who); bubble(l.txt, p.x + 6, p.y - 52, u.name, u.color, 'left', l.t); }
  }
  function drawScene() {
    const s = B.scene;
    if (!s || s.t < s.delay) return;
    const W = B.W, H = C.H, k = s.t - s.delay;
    const inK = easeOut(k / 0.4), outK = s.kind === 'talk' ? 0 : easeIn((k - (s.dur - 0.5)) / 0.5);
    // 上下電影黑邊
    const bar = 38 * inK * (1 - outK);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    if (s.kind === 'talk') {
      if (!s.wait) {
        const ln = s.lines[s.step], m = B.boss;
        if (ln.who === 'hero') bubble(ln.txt, C.HERO_X + 10, C.GROUND - 78, '火柴勇者', '#ffe08a', 'left', s.st);
        else if (ln.who === 'partner' && B.event) { const u = G.unitDef(B.event.def.partner), p = B.unitPos(u.id); bubble(ln.txt, p.x + 6, p.y - 52, u.name, u.color, 'left', s.st); }
        else if (m) bubble(ln.txt, m.x, m.y - m.h - 6, m.name, m.special ? m.special.color : '#ff6a7a', 'right', s.st);
      }
      text('點擊戰場跳過 ▶', W - 16, H - 19 * inK, 11, 'rgba(255,240,210,.7)', 'right', 700);
      return;
    }
    if (s.kind === 'event') { drawEventCard(s, inK, outK); return; }
    const z = C.zones[s.idx % C.zones.length], ch = C.chapters[s.idx % C.chapters.length] || {};
    const a = inK * (1 - outK), y = H * 0.4;
    ctx.globalAlpha = a;
    const gr = ctx.createLinearGradient(0, y - 70, 0, y + 70);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(8,4,16,.78)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, y - 70, W, 140);
    const lw = Math.min(260, W * 0.3) * inK; // 標題兩側的細線
    if (s.kind === 'title') {
      const col = z.accent, sc = 1 + 0.08 * (1 - inK);
      text(chapName(s.idx), W / 2, y - 34, 15, '#e8d6a8', 'center', 900, TITLE);
      ctx.save(); ctx.translate(W / 2, y + 4); ctx.scale(sc, sc);
      glow(col, 26, () => outlined(z.name, 0, 0, 42, col, 'center', TITLE));
      ctx.restore();
      ctx.fillStyle = hexA(col, 0.8); ctx.fillRect(W / 2 - lw - 120, y + 4, lw, 1.5); ctx.fillRect(W / 2 + 120, y + 4, lw, 1.5);
      if (ch.tag) text(ch.tag, W / 2, y + 44, 14, '#fff2d0', 'center', 700);
    } else {
      glow('#ffd23d', 24, () => outlined(`${chapName(s.idx)}　完`, W / 2, y - 6, 38, '#ffd23d', 'center', TITLE));
      ctx.fillStyle = 'rgba(255,210,61,.8)'; ctx.fillRect(W / 2 - lw - 130, y - 6, lw, 1.5); ctx.fillRect(W / 2 + 130, y - 6, lw, 1.5);
      if (ch.clear) text(ch.clear, W / 2, y + 36, 14, '#fff2d0', 'center', 700);
    }
    ctx.globalAlpha = 1;
  }

  // 效能分析：網址加 ?prof 會記錄每一段的耗時到 G.prof（平常不量，不影響效能）
  const PROF = /[?&]prof=?/.test(location.search);
  G.prof = {};
  function step(name, fn) {
    if (!PROF) return fn();
    const a = performance.now(); fn(); const d = performance.now() - a, p = G.prof[name] || (G.prof[name] = { n: 0, sum: 0, max: 0 });
    p.n++; p.sum += d; if (d > p.max) p.max = d;
  }
  G.render = function (c, dt) {
    ctx = c; t += dt;
    ctx.save();
    if (B.shake > 0) ctx.translate((Math.random() - 0.5) * B.shake, (Math.random() - 0.5) * B.shake);
    step('背景', drawBackground);
    step('特效(後)', () => FX.draw(ctx, 'back'));
    step('演出(後)', () => drawSpecials('under'));
    step('影之軍團', drawShadowArmy);
    step('夥伴', () => C.units.slice(1).reverse().forEach(drawPartner));
    step('勇者', drawHero);
    step('怪物', () => { for (const d of B.dying) drawMonster(d.m, d.t); B.monsters.slice().sort((a, b) => b.x - a.x).forEach(m => drawMonster(m)); });
    step('衝鋒招式', drawWaves);
    step('火球', drawBigBalls);
    step('演出(前)', () => drawSpecials('over'));
    step('特效(前)', () => FX.draw(ctx, 'front'));
    step('小特效', drawSmallFx);
    ctx.restore();
    if (B.flash > 0) { ctx.fillStyle = hexA(B.flashCol, Math.min(0.55, B.flash)); ctx.fillRect(0, 0, B.W, C.H); }
    drawBossWarn();
    drawTopBar();
    drawEventBits();
    drawScene();
    drawBanner();
    drawCutin();
    if (G.paused) {
      ctx.fillStyle = 'rgba(6,4,12,.55)'; ctx.fillRect(0, 0, B.W, C.H);
      outlined('— 暫停中 —', B.W / 2, C.H / 2, 28, '#ffd23d', 'center', TITLE);
    }
  };
})();
