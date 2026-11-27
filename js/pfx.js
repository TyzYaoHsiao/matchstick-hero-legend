/* =========================================================
   pfx.js — 把 pixelfx 的像素特效疊到戰場上
   特效來源：js/lib/pixelfx.js（由 pixelfx 專案打包，MIT 授權）

   G.pfx.add('fire/meteor', { x, y, ...特效參數 }, { layer, life, follow, delay })
     layer  : 'front'（預設，畫在角色前面）或 'back'（畫在角色後面）
     life   : 循環特效要播幾秒（時間到會淡出）
     follow : 每幀呼叫，回傳 {x, y} 讓特效跟著移動（例如飛行的火球）
     delay  : 延遲幾秒才出現
     force  : 不受特效數量上限限制
   ========================================================= */
(function () {
  const P = window.PFX;
  const L = G.pfx = { ok: !!P, layers: {} };
  if (!P) { console.warn('pixelfx 沒有載入，特效會關閉'); }

  function makeLayer(W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return { list: [], frame: P.createFrame(W, H), img: new ImageData(W, H), canvas: c, ctx: c.getContext('2d') };
  }

  L.resize = function (W, H) {
    if (!P) return;
    const old = L.layers;
    L.W = W; L.H = H;
    L.layers = { back: makeLayer(W, H), front: makeLayer(W, H) };
    for (const k in old) L.layers[k].list = old[k].list; // 縮放視窗時保留正在播的特效
  };

  L.add = function (id, opts = {}, cfg = {}) {
    if (!P || !L.layers.front) return null;
    const mod = P.FX[id];
    if (!mod) { console.warn('找不到特效', id); return null; }
    // 特效太多時直接略過（傷害照算，只是不畫）；force 的（常駐鬥氣、掉寶光柱）一定會加
    if (!cfg.force && L.count() >= (G.lowFx ? 30 : 50)) return null; // 同時最多 50 個（低畫質 30 個），合成像素的成本跟特效數量成正比
    for (const k in opts) if (opts[k] === undefined) delete opts[k]; // 沒給的參數用特效預設值
    const e = { fx: P.createFx(mod, opts), t: 0, life: cfg.life || 0, follow: cfg.follow, delay: cfg.delay || 0, mod };
    L.layers[cfg.layer === 'back' ? 'back' : 'front'].list.push(e);
    return e;
  };
  L.stop = e => { if (e) e.fx.stop(); };
  L.clear = () => { for (const k in L.layers) { L.layers[k].list = []; L.layers[k].dirty = null; } };
  L.count = () => (L.layers.front ? L.layers.front.list.length + L.layers.back.list.length : 0);

  L.update = function (dt) {
    for (const k in L.layers) {
      const ly = L.layers[k];
      for (const e of ly.list) {
        if (e.delay > 0) { e.delay -= dt; continue; }
        e.t += dt;
        if (e.follow) {
          const p = e.follow(e);
          if (p) { e.fx.options.x = p.x; e.fx.options.y = p.y; if (p.angle !== undefined) e.fx.options.angle = p.angle; }
          else e.fx.stop();
        }
        e.fx.update(dt);
        if (e.life && e.t >= e.life) e.fx.stop();
      }
      ly.list = ly.list.filter(e => !e.fx.done());
    }
  };

  // 每個特效各自的範圍；重疊的合併成一塊，分散在畫面兩端時不會變成整個畫面都要合成
  function boxes(list, W, H) {
    const out = [];
    for (const e of list) {
      if (e.delay > 0) continue;
      const m = e.mod.meta, o = e.fx.options;
      const [w, h] = m.size, [ox, oy] = m.origin || [w / 2, h / 2];
      let l, t, r, b;
      if (o.angle) { const R = Math.hypot(w, h); l = o.x - R; r = o.x + R; t = o.y - R; b = o.y + R; }
      else { l = o.flip ? o.x - (w - ox) : o.x - ox; r = l + w; t = o.y - oy; b = t + h; }
      const bx = [Math.max(0, Math.floor(l - 6)), Math.max(0, Math.floor(t - 6)), Math.min(W, Math.ceil(r + 6)), Math.min(H, Math.ceil(b + 6))];
      if (bx[2] > bx[0] && bx[3] > bx[1]) out.push(bx);
    }
    // 重疊（或很接近）的框合併
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < out.length && !merged; i++) for (let j = i + 1; j < out.length; j++) {
        const A = out[i], Bx = out[j];
        if (A[0] <= Bx[2] + 8 && Bx[0] <= A[2] + 8 && A[1] <= Bx[3] + 8 && Bx[1] <= A[3] + 8) {
          out[i] = [Math.min(A[0], Bx[0]), Math.min(A[1], Bx[1]), Math.max(A[2], Bx[2]), Math.max(A[3], Bx[3])];
          out.splice(j, 1); merged = true; break;
        }
      }
    }
    return out;
  }

  // 透明背景合成（改寫自 pixelfx 的 composite，只處理指定範圍；空白像素直接寫 0）
  function composite(f, out, out32, x0, y0, x1, y1) {
    const C = f.color, Lt = f.light, w = f.w;
    for (let y = y0; y < y1; y++) {
      for (let i = y * w + x0, end = y * w + x1; i < end; i++) {
        const c = C[i], l = Lt[i] & 0xffffff;
        if (!l) { out32[i] = c; continue; }           // 沒有光：顏色原樣搬過去（Uint32 的 RGBA 排列和 ImageData 相同）
        let r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255, a = c >>> 24;
        const lr = l & 255, lg = (l >>> 8) & 255, lb = (l >>> 16) & 255;
        if (a < 255) {
          const pa = a / 255, pr = r * pa + lr, pg = g * pa + lg, pb = b * pa + lb;
          const na = Math.min(1, Math.max(pa, Math.max(lr, lg, lb) / 255));
          if (na > 0) { r = Math.min(255, pr / na); g = Math.min(255, pg / na); b = Math.min(255, pb / na); a = na * 255; }
        } else { r = Math.min(255, r + lr); g = Math.min(255, g + lg); b = Math.min(255, b + lb); }
        const j = i * 4;
        out[j] = r; out[j + 1] = g; out[j + 2] = b; out[j + 3] = a;
      }
    }
  }

  L.draw = function (ctx, which) {
    const ly = L.layers[which];
    if (!ly || !ly.list.length) return;
    const bs = boxes(ly.list, L.W, L.H);
    if (!bs.length) return;
    const f = ly.frame;
    // 效能：只清掉上一格畫過的範圍（整張 960×440 每格清兩次很浪費）；每 30 格整張清一次，避免有特效畫出範圍外留下殘影
    ly.fc = (ly.fc || 0) + 1;
    if (!ly.dirty || ly.fc % 30 === 0) P.clearFrame(f);
    else for (const [x0, y0, x1, y1] of ly.dirty) for (let y = y0; y < y1; y++) { const a = y * f.w + x0, b = y * f.w + x1; f.color.fill(0, a, b); f.light.fill(0, a, b); }
    ly.dirty = bs;
    for (const e of ly.list) if (e.delay <= 0) e.fx.draw(f);
    if (!ly.img32) ly.img32 = new Uint32Array(ly.img.data.buffer);
    ctx.imageSmoothingEnabled = false;
    for (const [x0, y0, x1, y1] of bs) {
      composite(f, ly.img.data, ly.img32, x0, y0, x1, y1);
      ly.ctx.putImageData(ly.img, 0, 0, x0, y0, x1 - x0, y1 - y0);
      ctx.drawImage(ly.canvas, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    }
  };

  /* ---------- 配色工具：用一個主色做出暗→亮的色階，給特效換色 ---------- */
  const hex2 = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  L.ramp = function (col, n = 7) {
    const c = hex2(col), dark = [16, 12, 30], white = [255, 255, 255], out = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      out.push(k < 0.55 ? mix(dark, c, k / 0.55) : mix(c, white, (k - 0.55) / 0.45));
    }
    return out;
  };
  L.rainbow = ['#ff3d6a', '#ff9a2e', '#ffe14d', '#4dff9a', '#3da9ff', '#b46bff', '#ffffff'];
})();
