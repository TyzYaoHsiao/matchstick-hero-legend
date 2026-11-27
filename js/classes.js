/* =========================================================
   classes.js — 五位夥伴的職業：每次轉職（Lv25 / 50 / 100 / 200 / 400）解鎖新招式
   職業名稱與說明在 config.js 的 units[].ranks
   這裡只寫「出手時做什麼」，共用的戰鬥工具都在 G.battle（B）上
   ========================================================= */
(function () {
  const C = G.CFG, B = G.battle, FX = G.pfx;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const FIRE = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6'];
  const FIRE_ACCENT = ['#ffe26b', '#fff3a6', '#ffffff'];
  const PURPLE = FX.ramp('#9a5bff', 8), GOLD = FX.ramp('#ffd23d', 8), GREEN = FX.ramp('#5ef0a0', 7), SEA = FX.ramp('#3da9ff', 8);

  G.rankOf = id => G.pAuraTier(G.S.units[id] || 0);
  G.jobTitle = (id, r) => G.unitDef(id).ranks[r === undefined ? G.rankOf(id) : r].title;

  // 通用飛行道具：從夥伴伸出去的手飛向目標，落地時呼叫 onLand(p, 目標或 null, 落點)
  function shoot(u, target, o) {
    const h = B.hand(u.id), m0 = B.mid(target);
    const p = Object.assign({ x: h.x, y: h.y + (o.oy || 0), target, tx: m0.x, ty: m0.y }, o);
    B.shots.push(p);
    if (o.fxId) FX.add(o.fxId, Object.assign({ x: p.x, y: p.y }, o.fxOpts || {}), { follow: () => p.dead ? null : { x: p.x, y: p.y, angle: p.ang || 0 } });
    return p;
  }
  const victims = (t, at, r) => t && t.hp > 0 ? [t] : B.near(at.x, r || 40);
  // 場上怪的中心與範圍（給地圖砲定位用）
  const center = () => { const ms = B.alive(); return ms.length ? Math.max(C.FRONT + 30, ms.reduce((a, m) => a + m.x, 0) / ms.length) : C.FRONT + 160; };
  const span = () => { const ms = B.alive(); return ms.length ? [Math.min(...ms.map(m => m.x)) - 30, Math.max(...ms.map(m => m.x)) + 30] : [C.FRONT, B.W - 40]; };
  const strongest = () => (B.boss && B.boss.hp > 0) ? B.boss : B.alive().sort((a, b) => b.hp - a.hp)[0];

  const CL = G.CLASS = {};

  /* =========================================================
     小狗先生：災厄炎帝（火焰法師一路升級）
     ========================================================= */
  CL.fire = {
    wind: 0.22,
    release(u, r, dmg, st, target) {
      const n = st.combo, balls = r >= 2 ? 2 : 1;
      for (let k = 0; k < balls; k++) {
        B.after(k * 0.12, () => {
          const t = k === 0 ? (target.hp > 0 ? target : B.front()) : (pick(B.alive()) || B.front());
          if (!t) return;
          shoot(u, t, {
            speed: 430, dmg: dmg * (balls > 1 ? 0.65 : 1), oy: k * -6, fxId: 'fire/fireball', fxOpts: { radius: 7 + r * 1.5 },
            onLand(p, t2, at) {
              FX.add('explosions/plasma-explosion', { x: at.x, y: at.y, palette: FIRE, accent: FIRE_ACCENT });
              victims(t2, at).forEach(m => B.hurt(m, p.dmg, { col: '#ffb070' }));
              // 火焰術士：每 3 發引燃地面火環
              if (k === 0 && r >= 1 && n % 3 === 0) {
                FX.add('fire/fire-ring', { x: at.x, y: C.GROUND, reach: 70 + r * 10 });
                B.after(0.3, () => B.near(at.x, 80).forEach(m => B.hurt(m, dmg * 1.5, { col: '#ff8a2a' })));
              }
            },
          });
        });
      }
      // 煉獄大法師：每 4 發煉獄火柱
      if (r >= 3 && n % 4 === 0) {
        const x = target.x;
        FX.add('fire/flame-pillar', { x, y: C.GROUND, height: 150 + r * 10 }, { delay: 0.1 });
        B.after(0.8, () => { B.near(x, 50).forEach(m => B.hurt(m, dmg * 3, { skill: true, col: '#ff6a2a' })); B.shakeIt(5); });
      }
      // 焚天魔導：每 5 發火焰龍捲風，持續灼燒 3 秒
      if (r >= 4 && n % 5 === 0) {
        const x = target.x;
        FX.add('fire/fire-tornado', { x, y: C.GROUND, height: 130 }, { life: 3, delay: 0.2 });
        for (let k = 1; k <= 10; k++) B.after(0.2 + k * 0.3, () => B.near(x, 60).forEach(m => B.hurt(m, dmg * 0.4, { noCrit: true, col: '#ff9a4a' })));
      }
      // 災厄炎帝：每 6 發災厄隕石
      if (r >= 5 && n % 6 === 0) {
        const ms = B.alive();
        for (let k = 0; k < 3; k++) {
          const x = (ms.length ? pick(ms).x : target.x) + rand(-30, 30);
          FX.add('fire/meteor', { x, y: C.GROUND, seed: n + k }, { delay: k * 0.3 });
          B.after(k * 0.3 + 0.62, () => { B.near(x, 90).forEach(m => B.hurt(m, dmg * 3, { skill: true, col: '#ff3d1a' })); B.shakeIt(8); B.hitStop(0.05); });
        }
        B.banner = { txt: '災厄降臨', col: '#ff6a2a', life: 1.4, max: 1.4, small: true };
      }
    },
    // 大招：一顆巨大火球從左上方的天空斜飛下來，砸在怪群中間，超大爆炸打全場
    ult: {
      name: 'Explosion', en: 'EXPLOSION MAGIC', beast: '鳳凰',
      // 四聖獸・鳳凰：火鳳凰展開烈焰雙翼，從左上方天空俯衝下來，撞進怪群中間爆開
      fire(u, r, dmg) {
        const tx = center();
        B.bigBall({
          x0: tx - 520, y0: -160, tx, ty: C.GROUND - 10, dur: 1.1, R: 62, phoenix: true,
          onLand(x, y) {
            // 爆炸：白光 → 衝擊波 → 火環 → 好幾團火焰爆開
            B.fx.push({ kind: 'boom', x, y, life: 1.1, max: 1.1, R: Math.max(320, B.W * 0.45) });
            FX.add('fire/fire-ring', { x, y: C.GROUND, reach: 300 }, { force: true });
            FX.add('impacts/ground-slam', { x, y: C.GROUND, palette: FIRE, reach: 200 }, { force: true });
            for (let k = 0; k < 6; k++) {
              const ex = x + (k - 2.5) * 70 + rand(-20, 20), ey = C.GROUND - rand(10, 90);
              FX.add('explosions/plasma-explosion', { x: ex, y: ey, palette: FIRE, accent: FIRE_ACCENT, seed: k }, { delay: k * 0.07, force: k < 3 });
            }
            FX.add('fire/flame-pillar', { x, y: C.GROUND, height: 220 }, { delay: 0.1, force: true });
            B.alive().forEach(m => B.hurt(m, dmg, { skill: true, col: '#ff8a2a' }));
            B.shakeIt(18); B.hitStop(0.22); B.flash = 0.6; B.flashCol = '#fff3a6';
            B.after(0.25, () => { B.flash = 0.35; B.flashCol = '#ff6a2a'; });
          },
        });
      },
    },
  };

  /* =========================================================
     小牛先生：暗影君王
     影步瞬移連刺；打倒的怪會被「起來吧！」化成影之軍團，定時突擊
     ========================================================= */
  const ARMY_CAP = [0, 4, 8, 12, 16, 24];
  G.armyCap = () => ARMY_CAP[G.rankOf('cow')];
  G.armySlot = i => { const col = i % 12, row = Math.floor(i / 12); return { x: 20 + col * 15 + row * 8, y: C.GROUND - 30 - row * 10 }; }; // 站在隊伍後方山坡，不疊到勇者
  B.runners = []; B.souls = [];
  let chargeT = 4;
  // 影兵突擊：挑 n 隻衝出去
  function armyCharge(n, dmg) {
    const S = G.S;
    const order = S.army.map((a, i) => i).sort(() => Math.random() - 0.5).slice(0, n);
    order.forEach((i, k) => B.after(k * 0.06, () => {
      const t = pick(B.alive()); if (!t || !S.army[i]) return;
      const s = G.armySlot(i);
      B.runners.push({ i, type: S.army[i].t, boss: S.army[i].b, x: s.x, y: s.y, target: t, dmg: dmg * (S.army[i].b ? 1.5 : 0.6), phase: 0, life: 0 });
    }));
  }
  CL.shadow = {
    wind: 0.12,
    release(u, r, dmg, st, target) {
      const n = st.combo;
      st.blink = target.x - 34; // 影子交換：瞬移到敵人身邊
      FX.add('melee/dagger-flurry', { x: target.x - 36, y: target.type.fly ? target.y + 12 : C.GROUND, palette: PURPLE });
      B.after(0.37, () => B.hurt(target.hp > 0 ? target : B.front(), dmg, { col: '#d0a8ff' }));
      // 統治者的權柄：把敵人用念力舉起來再重摔
      if (r >= 2 && n % 3 === 0) {
        B.after(0.1, () => { if (target.hp <= 0) return; target.lift = 0.7; FX.add('explosions/implosion', { x: target.x, y: B.mid(target).y - 30, palette: PURPLE }); });
        B.after(0.8, () => {
          FX.add('impacts/ground-slam', { x: target.x, y: C.GROUND, palette: PURPLE, reach: 90 });
          B.near(target.x, 70).forEach(m => B.hurt(m, dmg * 3, { skill: true, col: '#c08bff' }));
          B.shakeIt(6); B.hitStop(0.06);
        });
      }
      // 死靈統帥：暗影之手從地底抓住敵人
      if (r >= 3 && n % 4 === 0) {
        const x = target.x;
        FX.add('shadow/grasping-hands', { x, y: C.GROUND, palette: PURPLE }, { delay: 0.15 });
        B.after(0.75, () => B.near(x, 80).forEach(m => { B.hurt(m, dmg * 2, { col: '#b07aff' }); m.slow = Math.max(m.slow || 0, 2); }));
      }
      // 暗影君王：暗影大爆發
      if (r >= 5 && n % 5 === 0) {
        const x = target.x;
        FX.add('shadow/dark-explosion', { x, y: C.GROUND });
        B.after(1.84, () => { B.near(x, 130).forEach(m => B.hurt(m, dmg * 4, { skill: true, col: '#e0b0ff' })); B.shakeIt(10); B.flash = 0.25; B.flashCol = '#9a5bff'; });
      }
    },
    // 大招：暗影之手抓住全場 → 影之軍團全員突擊 → 暗影大爆發
    ult: {
      name: '永夜軍臨・無盡深淵', en: 'ETERNAL NIGHT · ENDLESS ABYSS', beast: '黑龍', beastTag: '君王聖獸', // 黑龍是小牛專屬的聖獸，不屬於四聖獸
      // 大軍降臨：天色變成永夜、天空裂開深淵；影子士兵一排排從地底爬出來、飛行的從裂縫降下，
      // 列隊完成後全軍往右衝鋒，前排經過的敵人都被踏過去；最後深淵收束爆開
      fire(u, r, dmg) {
        const types = (G.S.army || []).map(a => a.t).concat(['skeleton', 'skeleton', 'goblin', 'goblin', 'golem', 'slime', 'imp', 'bat']);
        const flyOf = id => (C.monsters.find(m => m.id === id) || {}).fly;
        const N = G.lowFx ? 14 : 24, sol = [];
        for (let k = 0; k < N; k++) {
          const type = k < 2 ? pick(['golem', 'skeleton']) : pick(types), fly = flyOf(type), giant = k < 2;
          const row = giant ? 0 : k % 3;
          sol.push({
            type, fly, giant, row,
            x: giant ? 80 + k * 150 + rand(-20, 20) : rand(-40, C.HERO_X + 20),
            y: fly ? C.GROUND - 90 - rand(0, 70) : C.GROUND - 16 + row * 11,
            sc: giant ? 2.3 : (fly ? 0.9 : 0.85 + row * 0.18),
            rise: giant ? 0.75 + k * 0.12 : rand(0.15, 1.0),
            run: 1.55 + rand(0, 0.35) + (giant ? 0.15 : 0),
            sp: giant ? 420 : rand(440, 620),
            ph: rand(0, 6),
          });
        }
        sol.sort((a, b) => (a.fly - b.fly) || (a.row - b.row) || (b.giant - a.giant)); // 後排先畫
        const st = B.unitState[u.id]; st.anim = { t: 0, w: 1.4, dur: 1.8 };              // 小牛舉手號令
        // 聖獸・黑龍（西方飛龍）：大軍列隊時，黑龍從深淵裂縫飛出，拍著翅膀飛過軍團上空，一路往地面噴紫黑色龍息
        B.after(0.5, () => B.surge({ kind: 'wdragon', x: C.HERO_X - 160, h: 130, len: 520, speed: 430, dmg: dmg * 0.25, push: 50, skill: true,
          trailDx: 40, trailFx: { id: 'impacts/ground-slam', opts: { palette: PURPLE, reach: 60 } },
          hitFx: { id: 'shadow/grasping-hands', opts: { palette: PURPLE } } }));
        B.special({
          kind: 'horde', dur: 4.3, sol, hit: new Set(),
          update(s, dt) {
            let front = -1e9;
            for (const so of s.sol) {
              if (!so.up && s.t >= so.rise) { so.up = 1; if (!so.fly && !B.busy() && Math.random() < 0.15) FX.add('spawn/poof', { x: so.x, y: C.GROUND, palette: PURPLE }); }
              if (s.t >= so.run) { so.x += so.sp * dt; front = Math.max(front, so.x + 12 * so.sc); }
            }
            if (!s.charged && s.t >= 1.55) { s.charged = 1; B.shakeIt(9); B.banner = { txt: '全軍突擊！', col: '#c08bff', life: 1.3, max: 1.3, small: true }; }
            for (const m of B.alive()) {
              if (s.hit.has(m) || front < m.x - m.w / 2) continue;
              s.hit.add(m);
              B.hurt(m, dmg * 0.45, { skill: true, col: '#e0b0ff' });
              if (!m.boss) m.push = Math.max(m.push || 0, 90);
              if (!B.busy()) FX.add('melee/claw-swipe', { x: m.x - 30, y: m.type.fly ? m.y + 12 : C.GROUND, palette: PURPLE });
              B.shakeIt(4);
            }
            if (!s.boom && s.t >= 3.45) {
              s.boom = 1;
              const x = center();
              FX.add('explosions/implosion', { x, y: C.GROUND - 60, palette: PURPLE }, { force: true });
              FX.add('impacts/ground-slam', { x, y: C.GROUND, palette: PURPLE, reach: 220 }, { force: true });
              B.alive().forEach(m => B.hurt(m, dmg * 0.3, { skill: true, col: '#e0b0ff' }));
              B.shakeIt(14); B.hitStop(0.12); B.flash = 0.35; B.flashCol = '#9a5bff';
            }
          },
        });
      },
    },
    // 影之軍團：每隻 +8% 傷害；君王領域（影之支配者起）再 ×1.5
    mul() {
      const r = G.rankOf('cow'), n = (G.S.army || []).length;
      return (1 + 0.08 * n) * (r >= 4 ? 1.5 : 1);
    },
    // 起來吧！打倒的怪有機率化為影兵（首領一定會）
    onKill(m) {
      const S = G.S;
      if (!S.units.cow || G.rankOf('cow') < 1 || m.special) return;
      S.army = S.army || [];
      if (S.army.length >= G.armyCap()) return;
      if (!m.boss && Math.random() > 0.25) return;
      const slot = G.armySlot(S.army.length);
      S.army.push({ t: m.type.id, b: !!m.boss });
      const idx = S.army.length - 1;
      S.army[idx].rising = 1; // 剛被召喚，還在飛回來
      B.floaters.push({ x: m.x, y: m.y - m.h - 40, txt: '起來吧！', col: '#c08bff', size: m.boss ? 24 : 16, life: 1.4, vy: 30 });
      B.souls.push({ x: m.x, y: m.y - m.h / 2, x0: m.x, y0: m.y - m.h / 2, tx: slot.x, ty: slot.y - 14, t: 0, idx });
    },
    tick(dt) {
      const S = G.S, r = G.rankOf('cow');
      // 靈魂飛回軍團
      for (const s of B.souls) {
        s.t += dt / 0.9;
        const k = Math.min(1, s.t), arc = Math.sin(k * Math.PI) * 70;
        s.x = s.x0 + (s.tx - s.x0) * k; s.y = s.y0 + (s.ty - s.y0) * k - arc;
        if (k >= 1 && S.army[s.idx]) { S.army[s.idx].rising = 0; FX.add('spawn/poof', { x: s.tx, y: s.ty + 14, palette: PURPLE }); }
      }
      B.souls = B.souls.filter(s => s.t < 1);
      // 影兵定時突擊
      if (S.units.cow && r >= 1 && S.army && S.army.length && B.alive().length) {
        chargeT -= dt;
        if (chargeT <= 0) {
          chargeT = 7 - r * 0.6;
          armyCharge(Math.min(S.army.length, 2 + r), G.unitDmg('cow', S.units.cow));
        }
      }
      for (const q of B.runners) {
        if (q.phase === 0) {
          const t = q.target.hp > 0 ? q.target : B.front();
          if (!t) { q.phase = 1; continue; }
          q.target = t;
          const tx = t.x - 22, d = tx - q.x;
          q.x += Math.sign(d) * Math.min(Math.abs(d), 560 * dt);
          q.y += ((t.type.fly ? t.y + 10 : C.GROUND) - q.y) * Math.min(1, dt * 6);
          if (Math.abs(d) < 4) {
            FX.add('melee/claw-swipe', { x: t.x - 30, y: t.type.fly ? t.y + 12 : C.GROUND, palette: PURPLE });
            B.hurt(t, q.dmg, { col: '#b07aff' });
            q.phase = 1;
          }
        } else q.life += dt;
      }
      B.runners = B.runners.filter(q => q.life < 0.35);
    },
  };

  /* =========================================================
     他誰：滅世箭神（弓箭手一路升級）
     ========================================================= */
  function arrow(u, t, d, delay) {
    B.after(delay, () => {
      const tt = t && t.hp > 0 ? t : B.front();
      if (!tt) return;
      shoot(u, tt, {
        speed: 950, dmg: d, fxId: 'projectiles/arrow',
        onLand(p, t2, at) {
          if (!B.busy()) FX.add('impacts/hit-spark', { x: at.x - 10, y: at.y + 14, palette: GREEN });
          victims(t2, at).forEach(m => B.hurt(m, p.dmg, { col: '#a8ffcf' }));
        },
      });
    });
  }
  CL.bow = {
    wind: 0.25,
    release(u, r, dmg, st, target) {
      const n = st.combo;
      if (r >= 2) { // 神射手：三連發射三個目標
        const ts = B.alive().sort((a, b) => a.x - b.x).slice(0, 3);
        ts.forEach((t, k) => arrow(u, t, dmg * 0.6, k * 0.05));
        if (ts.length < 3) arrow(u, target, dmg * 0.6, 0.1);
      } else if (r >= 1) { arrow(u, target, dmg * 0.6, 0); arrow(u, target, dmg * 0.6, 0.09); }
      else arrow(u, target, dmg, 0);
      const h = B.hand(u.id);
      // 風暴遊俠：貫穿全場的疾風之箭
      if (r >= 3 && n % 3 === 0) {
        B.after(0.05, () => {
          B.fx.push({ kind: 'beam', x1: h.x, y1: h.y, x2: B.W + 20, y2: h.y - 4, col: '#5ef0a0', life: 0.4, max: 0.4, w: 6 });
          B.alive().forEach(m => { B.hurt(m, dmg * 2, { col: '#5ef0a0' }); if (!B.busy()) FX.add('impacts/hit-spark', { x: m.x - 10, y: B.mid(m).y + 14, palette: GREEN }); });
          B.shakeIt(3);
        });
      }
      // 星隕箭聖：箭雨
      if (r >= 4 && n % 4 === 0) {
        const ms = B.alive(), lo = Math.min(...ms.map(m => m.x), target.x) - 40, hi = Math.max(...ms.map(m => m.x), target.x) + 40;
        for (let k = 0; k < 16; k++) {
          const x = rand(lo, hi), delay = 0.1 + k * 0.05, fall = 0.35;
          B.after(delay, () => B.fx.push({ kind: 'rain', x, y0: 10, y1: C.GROUND - 4, col: '#c8ffe0', life: fall, max: fall }));
          B.after(delay + fall, () => B.near(x, 14).forEach(m => B.hurt(m, dmg * 0.5, { noCrit: true, col: '#c8ffe0' })));
        }
      }
      // 滅世箭神：滅世神箭 + 星辰墜落
      if (r >= 5 && n % 5 === 0) {
        const t = strongest() || target, x = t.x;
        B.after(0.05, () => {
          B.fx.push({ kind: 'beam', x1: h.x, y1: h.y, x2: x, y2: B.mid(t).y, col: '#ffd23d', life: 0.6, max: 0.6, w: 12 });
          FX.add('explosions/plasma-explosion', { x, y: B.mid(t).y, palette: GOLD, accent: ['#fff6c8', '#ffffff', '#ffffff'] });
        });
        FX.add('arcane/star-fall', { x, y: C.GROUND, palette: GOLD }, { delay: 0.2 });
        B.after(0.2, () => { B.hurt(t, dmg * 4, { skill: true, col: '#ffd23d' }); B.hitStop(0.08); B.shakeIt(6); });
        B.after(1.2, () => { B.near(x, 130).forEach(m => B.hurt(m, dmg * 3, { skill: true, col: '#ffe680' })); B.flash = 0.2; B.flashCol = '#fff2b0'; });
        B.banner = { txt: '滅世神箭', col: '#ffd23d', life: 1.4, max: 1.4, small: true };
      }
    },
    // 大招：漫天箭雨蓋滿全場，最後一道貫穿全場的光箭
    ult: {
      name: '萬箭齊發', en: 'THOUSAND ARROWS', beast: '青龍',
      // 四聖獸・青龍：疾風巨箭化成一條巨大的青龍，蜿蜒飛過全場，後面跟著漫天箭雨
      fire(u, r, dmg) {
        const p = B.unitPos(u.id);
        B.surge({ kind: 'dragon', x: p.x - 40, h: 220, len: 640, speed: 620, dmg: dmg * 0.7, push: 120, skill: true,
          hitFx: { id: 'impacts/hit-spark', opts: { palette: GREEN } } });
        B.shakeIt(10); B.flash = 0.15; B.flashCol = '#c8ffe0';
        const [lo, hi] = span();
        for (let k = 0; k < 40; k++) {
          const x = lo + (hi - lo) * Math.random(), delay = 0.5 + k * 0.03, fall = 0.32;
          B.after(delay, () => B.fx.push({ kind: 'rain', x, y0: -10, y1: C.GROUND - 4, col: '#c8ffe0', life: fall, max: fall }));
        }
        for (let k = 0; k < 3; k++) B.after(0.9 + k * 0.3, () => { B.alive().forEach(m => B.hurt(m, dmg * 0.1, { noCrit: true, col: '#c8ffe0' })); B.shakeIt(3); });
      },
    },
  };

  /* =========================================================
     浩浩人：神罰騎士（聖騎士一路升級）
     ========================================================= */
  let sunFx = null;
  CL.holy = {
    wind: 0.3,
    release(u, r, dmg, st, target) {
      const n = st.combo, x = target.x;
      FX.add('holy/smite', { x, y: C.GROUND, seed: n });
      B.after(0.54, () => {
        const t = target.hp > 0 ? target : B.front();
        if (!t) return;
        B.hurt(t, dmg, { col: '#fff1a8' }); B.shakeIt(3);
        if (r >= 1) B.near(t.x, 60).forEach(m => { if (m !== t) B.hurt(m, dmg * 0.5, { col: '#fff1a8' }); });
      });
      // 審判騎士：審判金雷連鎖三隻
      if (r >= 2 && n % 3 === 0) {
        const h = B.hand(u.id);
        B.after(0.1, () => {
          let from = { x: h.x, y: h.y - 30 };
          B.alive().sort((a, b) => a.x - b.x).slice(0, 3).forEach(m => {
            const to = B.mid(m);
            B.fx.push({ kind: 'bolt', pts: B.bolt(from, to), life: 0.25, max: 0.25, col: '#ffd23d' });
            if (!B.busy()) FX.add('lightning/zap-hit', { x: to.x, y: to.y, palette: GOLD });
            B.hurt(m, dmg, { col: '#ffe680' });
            from = to;
          });
        });
      }
      // 天罰聖騎：聖光柱
      if (r >= 3 && n % 4 === 0) {
        const t = strongest() || target;
        FX.add('holy/holy-pillar', { x: t.x, y: C.GROUND }, { delay: 0.05 });
        B.after(0.6, () => { B.hurt(t, dmg * 3, { skill: true, col: '#fff1a8' }); B.shakeIt(6); });
      }
      // 光耀聖騎：對全場審判
      if (r >= 4 && n % 5 === 0) {
        B.alive().slice(0, 6).forEach((m, k) => {
          FX.add('holy/smite', { x: m.x, y: C.GROUND, seed: k }, { delay: k * 0.08 });
          B.after(k * 0.08 + 0.54, () => B.hurt(m, dmg * 1.2, { col: '#fff1a8' }));
        });
      }
      // 神罰騎士：神罰天雷劈向所有敵人
      if (r >= 5 && n % 6 === 0) {
        B.alive().slice(0, 8).forEach((m, k) => {
          FX.add('lightning/lightning-strike', { x: m.x, y: C.GROUND, palette: GOLD, sparks: GOLD, seed: k }, { delay: k * 0.06 });
          B.after(k * 0.06 + 0.76, () => { B.hurt(m, dmg * 3, { skill: true, col: '#ffd23d' }); B.shakeIt(6); B.flash = 0.12; B.flashCol = '#fff2b0'; });
        });
        B.banner = { txt: '神罰', col: '#ffd23d', life: 1.4, max: 1.4, small: true };
      }
    },
    // 大招：全場天雷連劈兩輪，最後聖光柱轟最強的敵人
    ult: {
      name: 'EX．咖哩棒', en: 'EXCALIBUR', beast: '白虎',
      // 四聖獸・白虎：蓄力時白虎在浩浩人背後浮現、伏低身子；光束解放的瞬間，白虎跟著光束一起撲出去
      // 聖劍解放：天色暗下來，光粒子往劍上聚集，劍身化成直衝天際的金色光柱；
      // 一口氣往前揮下，變成橫掃全場的巨大金色光束，連續轟擊所有敵人
      fire(u, r, dmg) {
        const h = B.hand(u.id), st = B.unitState[u.id];
        st.anim = { t: 0, w: 1.05, dur: 2.6 }; // 舉劍蓄力 → 揮下
        const TICKS = [1.2, 1.42, 1.64, 1.86, 2.08, 2.3];
        B.after(1.2, () => B.surge({ kind: 'tiger', x: B.unitPos(u.id).x - 40, h: 170, len: 400, speed: 760, dmg: dmg * 0.25, push: 110, skill: true,
          hitFx: { id: 'melee/claw-swipe', opts: { palette: FX.ramp('#bfe6ff', 7) } } }));
        B.special({
          kind: 'excal', dur: 3.0, hx: h.x + 2, hy: h.y - 4, n: 0, px: B.unitPos(u.id).x,
          update(s) {
            if (!s.rumble && s.t > 0.35) { s.rumble = 1; B.shakeIt(3); }
            while (s.n < TICKS.length && s.t >= TICKS[s.n]) {
              const first = s.n === 0;
              B.alive().forEach(m => {
                B.hurt(m, dmg * 0.75 / TICKS.length, { skill: true, col: '#fff1a8' }); // 另外 25% 是白虎撲擊
                if (first && !m.boss) m.push = Math.max(m.push || 0, 120);
                if (first && !B.busy()) FX.add('lightning/zap-hit', { x: m.x, y: B.mid(m).y, palette: GOLD });
              });
              if (first) { B.flash = 0.55; B.flashCol = '#fff6c8'; B.hitStop(0.14); B.shakeIt(14); } else B.shakeIt(7);
              s.n++;
            }
          },
        });
      },
    },
    tick() { // 光耀聖騎起，背後常駐聖光
      const want = G.S.units.hao && G.rankOf('hao') >= 4;
      if (want && (!sunFx || sunFx.fx.done())) { const p = B.unitPos('hao'); sunFx = FX.add('holy/sunburst', { x: p.x, y: C.GROUND - 28, palette: GOLD }, { layer: 'back', force: true }); }
      if (!want && sunFx) { FX.stop(sunFx); sunFx = null; }
    },
    reset() { sunFx = null; },
  };

  /* =========================================================
     漁夫先生：萬濤海神
     ========================================================= */
  CL.water = {
    wind: 0.24,
    release(u, r, dmg, st, target) {
      const n = st.combo, count = r >= 2 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        B.after(k * 0.1, () => {
          const t = k === 0 ? (target.hp > 0 ? target : B.front()) : (pick(B.alive()) || B.front());
          if (!t) return;
          shoot(u, t, {
            speed: 650, dmg: dmg * (count > 1 ? 0.65 : 1), oy: k * -5, fxId: 'projectiles/arrow',
            onLand(p, t2, at) {
              const gx = t2 ? t2.x : at.x;
              FX.add('water/splash', { x: gx, y: C.GROUND });
              B.near(gx, u.splash).forEach(m => B.hurt(m, m === t2 ? p.dmg : p.dmg * 0.5, { col: '#a8dcff' }));
            },
          });
        });
      }
      // 釣魚達人：每 3 叉從腳下掀起大波浪，一路衝過全場（萬濤海神那一下換成海嘯）
      if (r >= 1 && n % 3 === 0 && !(r >= 5 && n % 6 === 0)) {
        const p = B.unitPos(u.id);
        B.surge({ x: p.x + 10, h: 70 + r * 8, len: 220 + r * 20, speed: 470, dmg: dmg * 2, push: 50 + r * 6 });
        B.shakeIt(3);
      }
      // 怒濤領主：地底水柱
      if (r >= 3 && n % 4 === 0) {
        const x = target.x;
        FX.add('water/geyser', { x, y: C.GROUND, height: 140 }, { delay: 0.1 });
        B.after(1.3, () => { B.near(x, 50).forEach(m => B.hurt(m, dmg * 3, { skill: true, col: '#7fd4ff' })); B.shakeIt(5); });
      }
      // 深海霸主：漩渦，變慢 + 持續傷害
      if (r >= 4 && n % 5 === 0) {
        const x = target.x;
        FX.add('water/whirlpool', { x, y: C.GROUND - 2, palette: SEA }, { life: 3, layer: 'back' });
        for (let k = 1; k <= 10; k++) B.after(k * 0.3, () => B.near(x, 70).forEach(m => { B.hurt(m, dmg * 0.3, { noCrit: true, col: '#7fd4ff' }); m.slow = Math.max(m.slow || 0, 0.6); }));
      }
      // 萬濤海神：海嘯，兩道巨浪接連衝過全場
      if (r >= 5 && n % 6 === 0) {
        const p = B.unitPos(u.id);
        B.surge({ x: p.x - 20, h: 130, len: 380, speed: 520, dmg: dmg * 2.5, push: 90, skill: true });
        B.after(0.45, () => B.surge({ x: p.x - 20, h: 100, len: 300, speed: 560, dmg: dmg * 1.5, push: 60, skill: true }));
        B.shakeIt(8);
        B.banner = { txt: '海嘯', col: '#7fd4ff', life: 1.4, max: 1.4, small: true };
      }
    },
    // 大招：漩渦拉住全場，接著一道蓋過半個畫面的巨浪衝過去，再一道追擊
    ult: {
      name: '萬濤・怒海狂瀾', en: 'TIDAL CATACLYSM', beast: '玄武',
      // 四聖獸・玄武：龜蛇合體的玄武站在第一道巨浪的浪頭上，一起衝過全場
      fire(u, r, dmg) {
        const p = B.unitPos(u.id), x = center();
        FX.add('water/whirlpool', { x, y: C.GROUND - 2, palette: SEA }, { life: 1.6, layer: 'back', force: true });
        B.alive().forEach(m => { m.slow = Math.max(m.slow || 0, 2); });
        B.after(0.15, () => { B.surge({ x: p.x - 60, h: 195, len: 560, speed: 560, dmg: dmg * 0.7, push: 130, skill: true, rider: 'tortoise' }); B.shakeIt(12); });
        B.after(0.75, () => B.surge({ x: p.x - 60, h: 150, len: 420, speed: 620, dmg: dmg * 0.3, push: 70, skill: true }));
        B.after(1.9, () => { const t = strongest(); if (t) FX.add('water/geyser', { x: t.x, y: C.GROUND, height: 180 }, { force: true }); });
      },
    },
  };

  /* =========================================================
     火柴勇者：麒麟（瑞獸，不屬於四聖獸）
     金色的麒麟踏著火雲從勇者身後奔出，一路燒過全場，最後在怪群中間踏出火柱
     ========================================================= */
  G.HERO_ULT = {
    name: '麒麟・天威烈焰', en: 'QILIN · HEAVENLY BLAZE', beast: '麒麟', beastTag: '瑞獸',
    fire(u, r, dmg) {
      B.surge({ kind: 'qilin', x: C.HERO_X - 100, h: 200, len: 440, speed: 640, dmg: dmg * 0.6, push: 130, skill: true,
        trailFx: { id: 'fire/fire-ring', opts: { reach: 40 } }, trailDx: -60,
        hitFx: { id: 'explosions/plasma-explosion', opts: { palette: FIRE, accent: FIRE_ACCENT } } });
      B.shakeIt(10);
      B.after(1.45, () => {
        const x = Math.min(center(), B.W - 160);
        FX.add('fire/flame-pillar', { x, y: C.GROUND, height: 240 }, { force: true });
        B.fx.push({ kind: 'boom', x, y: C.GROUND - 20, life: 0.9, max: 0.9, R: 300 });
        B.alive().forEach(m => B.hurt(m, dmg * 0.4, { skill: true, col: '#ffd23d' }));
        B.shakeIt(14); B.hitStop(0.12); B.flash = 0.3; B.flashCol = '#ffd86a';
      });
    },
  };

  // 職業的額外傷害倍率（目前只有暗影君王的影之軍團）
  G.classMul = id => {
    const u = G.unitDef(id), c = u && CL[u.attack];
    return c && c.mul ? c.mul() : 1;
  };
})();
