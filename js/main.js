/* =========================================================
   main.js — 啟動、畫面縮放、遊戲迴圈、自動存檔
   ========================================================= */
(function () {
  const C = G.CFG, B = G.battle;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const stage = document.getElementById('stage'), screen = document.getElementById('screen');
  let scale = 1;

  function fit() {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (!sw || !sh) return;
    const W = Math.round(Math.max(C.MIN_W, Math.min(C.MAX_W, sw / sh * C.H)));
    if (W !== B.W || !G.pfx.layers.front) { B.W = W; G.pfx.resize(W, C.H); }
    const s = Math.min(sw / B.W, sh / C.H);
    screen.style.width = Math.floor(B.W * s) + 'px';
    screen.style.height = Math.floor(C.H * s) + 'px';
    const dpr = Math.min(G.lowFx ? 1.25 : 2, window.devicePixelRatio || 1); // 低畫質時降低解析度
    scale = s * dpr;
    cv.width = Math.round(B.W * scale); cv.height = Math.round(C.H * scale);
  }

  cv.addEventListener('pointerdown', e => {
    if (G.paused) return;
    const r = cv.getBoundingClientRect();
    B.click((e.clientX - r.left) * B.W / r.width, (e.clientY - r.top) * C.H / r.height);
  });

  // 啟動
  G.makeSprites();
  G.S = G.load() || G.newState();
  G.S.army = G.S.army || [];
  const away = (Date.now() - (G.S.savedAt || Date.now())) / 1000;
  const off = G.applyOffline(away);
  fit();
  B.reset();
  G.ui.init();
  B.auraShown = -1; B.checkAura();
  B.checkAllPartnerAuras(true);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
  addEventListener('resize', fit);
  if (off) {
    G.ui.modal('歡迎回來，勇者', `
      <p>你離開了 <b>${G.fmtTime(off.sec)}</b>。</p>
      <p>隊伍在第 ${G.S.stage} 關自動作戰，擊敗 <b>${G.fmt(off.kills)}</b> 隻怪物，獲得 <b class="amber">${G.fmt(off.gold)}</b> 金幣。</p>
      <p class="dim">冒險者公會和魔晶礦脈也累積了資源，記得去左邊收成。</p>`);
  } else if (G.S.stats.kills === 0) {
    G.ui.modal('劍與魔法的世界', `
      <p>火柴勇者踏上冒險，五位<b>超級夥伴</b>會陸續加入。</p>
      <p>・升級勇者到 Lv10、25、50…會<b class="amber">鬥氣突破</b>，傷害倍增。</p>
      <p>・打倒首領拿<b class="cyan">魔晶</b>，去「技能」學招式，Lv10 會覺醒。</p>
      <p>・首領一定掉<b>裝備</b>，穿上後勇者外觀也會改變。</p>
      <p class="dim">點戰場可以幫忙攻擊，數字鍵 1～6 施放技能。</p>`);
  }

  setInterval(G.save, 5000);
  addEventListener('beforeunload', G.save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });

  // 自動畫質：連續 3 秒平均低於約 38 FPS 就切到低畫質（關光暈、粒子減半、降解析度、特效上限變低）
  let last = performance.now(), uiT = 0, avg = 1 / 60, slowT = 0;
  function watchFps(raw) {
    if (G.lowFx || document.hidden || raw > 0.5) return;
    avg += (raw - avg) * 0.05;
    slowT = avg > 0.026 ? slowT + raw : 0;
    if (slowT > 3) { G.lowFx = true; fit(); console.info('偵測到掉幀，切換為低畫質模式'); }
  }
  function loop(now) {
    let dt = (now - last) / 1000; last = now;
    watchFps(dt);
    if (dt > 5) { G.applyOffline(dt); dt = 0; }
    dt = Math.min(dt, 0.1);
    if (!G.paused) B.update(dt);
    G.tickHarvest(dt);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    G.render(ctx, G.paused ? 0 : dt);
    G.ui.tickSkills();
    uiT -= dt || 0.016;
    if (uiT <= 0) { uiT = 0.25; G.ui.refresh(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
