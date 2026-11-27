/* =========================================================
   battle.js — 自動戰鬥：生怪、勇者與夥伴攻擊、技能、鬥氣突破、掉寶、首領
   特效都交給 G.pfx（pixelfx），這裡只決定「什麼時候、在哪裡、打多痛」
   ========================================================= */
(function () {
  const C = G.CFG, FX = G.pfx;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const B = G.battle = {
    W: 960,
    monsters: [], shots: [], fx: [], floaters: [], timers: [], parts: [], dying: [],
    spawnT: 0, boss: null, bossT: 0, bossDelay: 0,
    unitState: {}, skillCd: {},
    freeze: 0, shake: 0, flash: 0, flashCol: '#ffffff', banner: null,
    auraFx: [], auraShown: -1, pparts: {}, pAuraFx: {}, pAuraShown: {},
    ult: {}, ultWait: {}, cutQ: [], cutin: null, waves: [], balls: [], specials: [],
  };

  /* ---------- 站位 ---------- */
  B.unitPos = function (id) {
    if (id === 'hero') return { x: C.HERO_X, y: C.GROUND };
    const i = C.units.findIndex(u => u.id === id) - 1;
    return { x: C.HERO_X - C.partnerLead - i * C.partnerGap, y: C.GROUND };
  };
  // 出手時往前伸的那隻手（出手圖的第 18～19 欄、第 15～16 列，放大 2 倍）
  B.hand = id => { const p = B.unitPos(id), h = G.SPR.partnerHand.cast, k = C.partnerScale; return { x: p.x + (h[0] - 1) * k, y: p.y + h[1] * k }; };
  // 有大招的人：五位夥伴，最後是勇者（白虎）
  B.ultIds = () => C.units.slice(1).map(u => u.id).concat('hero');
  B.ultDef = id => id === 'hero' ? G.HERO_ULT : G.CLASS[G.unitDef(id).attack].ult;

  B.reset = function () {
    B.monsters = []; B.shots = []; B.fx = []; B.timers = []; B.parts = []; B.dying = [];
    B.boss = null; B.bossT = 0; B.spawnT = 0.5; B.bossDelay = 0; B.event = null; B.evLine = null;
    if (B.evT === undefined) B.evT = WANT ? 4 : C.specialEvent.first;
    B.freeze = 0; B.shake = 0; B.flash = 0; B.banner = null; B.scene = null; B.bossWarn = 0;
    C.units.forEach(u => { B.unitState[u.id] = { cd: rand(0, 0.5), kick: 0, combo: 0, lunge: 0 }; });
    C.skills.forEach(s => { if (B.skillCd[s.id] === undefined) B.skillCd[s.id] = 0; });
    FX.clear(); B.auraFx = []; B.auraShown = -1; B.pparts = {}; B.pAuraFx = {}; B.pAuraShown = {};
    B.cutQ = []; B.cutin = null; B.waves = []; B.balls = []; B.specials = []; B.skillQ = null;
    B.ultIds().forEach((id, i) => { if (B.ult[id] === undefined) B.ult[id] = 0.15 + i * 0.1; }); // 錯開，不會一起滿
    B.runners = []; B.souls = []; if (G.CLASS) for (const k in G.CLASS) G.CLASS[k].reset && G.CLASS[k].reset();
  };

  const after = (t, fn) => B.timers.push({ t, fn });
  const hitStop = s => { B.freeze = Math.max(B.freeze, s); };
  const shakeIt = s => { B.shake = Math.max(B.shake, s); };
  const busy = () => FX.count() > (G.lowFx ? 18 : 30); // 特效太多時省略裝飾性的（火花、煙霧）
  // 原地刪除（不每幀產生新陣列，減少垃圾回收造成的頓一下）
  function prune(a, keep) { let j = 0; for (let i = 0; i < a.length; i++) if (keep(a[i])) a[j++] = a[i]; a.length = j; return a; }
  const MAX_FLOAT = () => G.lowFx ? 20 : 34; // 同時顯示的傷害數字上限

  /* ---------- 怪物 ---------- */
  function makeMonster(type, stage, boss) {
    const mul = G.hpMulOf(type, stage, boss);
    const hp = G.monsterHp(stage) * mul * (boss ? C.bossHpMul : 1);
    const bossSpr = boss && G.SPR.boss && G.SPR.boss[type.id]; // 有專屬首領圖就用，沒有就把一般怪放大
    const spr = bossSpr ? bossSpr[0] : G.SPR.mon[type.id][0], sc = boss && !bossSpr ? 2.4 : 1;
    return {
      type, boss, hp, max: hp, sc,
      w: (spr._w || spr.width) * sc, h: (spr._h || spr.height) * sc,
      x: B.W + (spr._w || spr.width) * sc + 10,
      y: type.fly ? C.GROUND - (boss ? 120 : 70) : C.GROUND,
      speed: type.speed * (boss ? 0.6 : 1) * rand(0.9, 1.1),
      stop: C.FRONT + (boss ? 50 : rand(0, 150)),
      ph: rand(0, 6), ap: Math.random(), hit: 0, frozen: 0, hdBoss: !!bossSpr,
      reward: G.reward(stage) * mul * (boss ? C.bossRewardMul : 1),
      name: boss ? (type.unique ? type.name : C.bossNames[type.id] || type.name + '王') : type.name,
    };
  }
  const mid = m => ({ x: m.x, y: m.y - m.h / 2 });
  // 走一個完整動作循環（左右腳各一步）前進的距離：步伐越大的怪動作越慢
  const STRIDE = { slime: 58, goblin: 46, skeleton: 42, golem: 44 };

  B.startBoss = function () {
    if (B.boss) return;
    B.monsters = [];
    // 區域最後一關是章節首領（區域霸主，圖已經載好才會出），其他關是一般怪物的首領版
    const S = G.S, zi = G.zoneIndex(S.stage), final = S.stage % C.stagesPerZone === 0;
    const zb = final && (C.zoneBosses || []).find(b => b.zone === zi && G.SPR.boss && G.SPR.boss[b.id]);
    const type = zb || pick(G.monsterPool(S.stage));
    B.boss = makeMonster(type, S.stage, true);
    B.monsters.push(B.boss);
    B.bossT = B.bossTMax = G.bossTimeOf(type);
    // 第一次遇到這章的首領：先對話
    const ci = G.chapIdx(S.stage), ch = C.chapters[zi];
    if (zb && ch && ci > S.talk) {
      S.talk = ci;
      startScene({ kind: 'talk', wait: true, lines: ch.talk.map(([who, txt]) => ({ who, txt })) });
      return;
    }
    B.bossWarn = 1.6; // 畫面右邊泛紅光，提示首領要從那邊進來（render.js 畫）
    G.ui && G.ui.toast(`首領「${B.boss.name}」降臨！`);
    shakeIt(6);
  };

  /* ---------- 特殊事件：超級女人把夥伴叫走，自己變成特殊首領 ---------- */
  const E = () => C.specialEvent;
  const WANT = (location.search.match(/[?&]event=(\w+)/) || [])[1]; // 測試用：網址加 ?event=w_ghost，幾秒後就發生（不用先招募夥伴）
  B.away = id => !!(B.event && B.event.def.partner === id); // 被叫走的夥伴：不攻擊、不放大招
  // 現在能發生的事件（夥伴要招募了、圖要載好了）
  const eventPool = () => (C.specialBosses || []).filter(d => G.S.units[d.partner] && G.SPR.boss && G.SPR.boss[d.id]);
  function startEvent(def) {
    const S = G.S;
    // 場上的小怪被嚇跑
    for (const m of B.monsters) if (m.hp > 0) FX.add('spawn/poof', { x: m.x, y: m.y, palette: FX.ramp(m.type.color, 6) });
    B.monsters = [];
    const m = makeMonster(Object.assign({ hpMul: 1, fly: false, unique: true }, def), S.stage, true);
    // 血量照「留下來的隊伍」的傷害算：叫走主力或小角色都一樣是一場大約 fightSec 秒的仗
    const dps = C.units.reduce((n, u) => u.id === def.partner || !S.units[u.id] ? n : n + G.unitDps(u.id, S.units[u.id]), 0), all = G.totalDps();
    // 公式算的 DPS 沒算到轉職招式、影兵這些，先給 1.5 倍，開打後再用實際傷害校正（見 calibrate）
    m.hp = m.max = Math.max(1, dps * E().fightSec * 1.5); m.reward *= E().goldMul; m.special = def;
    m.calib = { el: 0, t: 0, dmg: 0, pass: 0, full: dps > 0 ? Math.max(1, all / dps) : 1 };
    B.boss = m; B.monsters.push(m);
    B.bossT = B.bossTMax = E().time;
    B.event = { def, say: null, sayT: 4 };
    B.evLine = null; B.bossWarn = 1.6;
    S.stats.events = (S.stats.events || 0) + 1;
    startScene({ kind: 'event', dur: 2.8, def, next: { kind: 'talk', wait: true, lines: def.start.map(([who, txt]) => ({ who, txt })) } });
  }
  // 校正她的血量：開打 calibSec 裡的每個時間點（例如 6 秒、16 秒）各算一次
  //   速度 = 平常每秒打掉多少血（大招放完 4 秒內的不算，轉職招式、影兵、裝備都算到）
  //   整場仗的長度 = fightSec 和「這隊打一般首領要幾秒 × 1.4」取比較長的，最多 time 的 65%
  //   剩下的血 = 速度 × 剩下的秒數（至少 8 秒）；已經被打掉的血照算，所以開場大招一起轟也不會讓仗變太短或太長
  function calibrate(m, dt) {
    const c = m.calib, at = E().calibSec;
    if (!c || c.pass >= at.length || !entered(m)) return;
    c.el += dt;
    if (!(B.ultT > 0)) c.t += dt;
    if (c.el < at[c.pass] || c.t < 2) return;
    c.pass++;
    const S = G.S, rate = c.dmg / c.t, pool = G.monsterPool(S.stage);
    const bossHp = G.monsterHp(S.stage) * C.bossHpMul * G.hpMulOf(pool[0], S.stage, true);
    const normal = bossHp / (rate * c.full); // 這隊（全員）打一般首領大概要幾秒
    const fight = Math.min(E().time * 0.65, Math.max(E().fightSec, normal * 1.4));
    const taken = m.max - m.hp, left = Math.max(8, fight - c.el);
    m.hp = Math.min(m.hp * 3, rate * left); m.max = taken + m.hp; // 一次最多加到 3 倍，血條不會跳太誇張
  }
  // 給測試用：G.battle.startEvent('w_ghost')；網址加 ?event=w_ghost 會在幾秒後發生
  B.startEvent = id => { const d = (C.specialBosses || []).find(x => x.id === id) || pick(eventPool()); if (d && !B.boss && !B.scene) { startEvent(d); return true; } return false; };
  function endEvent(won) {
    const ev = B.event, def = ev.def, S = G.S;
    B.event = null;
    B.evT = rand(E().every[0], E().every[1]);
    if (won) {
      const tk = E().tickets;
      S.tickets = (S.tickets || 0) + tk;
      B.evLine = { who: def.partner, txt: def.win, t: 0, dur: 2.8 };
      G.ui && G.ui.toast(`打倒「${def.name}」！${G.unitDef(def.partner).name}回來了：獲得 ${tk} 張召喚券`, def.color);
    } else {
      const m = B.boss;
      if (m) FX.add('spawn/poof', { x: m.x, y: m.y - m.h / 2, palette: FX.ramp(def.color, 6) }, { force: true });
      B.monsters = B.monsters.filter(x => x !== m);
      G.ui && G.ui.toast(`${def.name}：「${def.lose}」　她走掉了，${G.unitDef(def.partner).name}回來了`, def.color);
    }
    B.boss = null;
  }

  // 怪走進畫面才算「上場」：在這之前不會被瞄準、也不會受傷，不會出現還沒看到就被秒掉
  // 小怪體積小，整隻露出來就能打；首領很大，露出半身（中心點到畫面邊）就能打
  const entered = m => m.x <= B.W - (m.boss ? 0 : m.w / 2);
  const living = () => B.monsters.filter(m => m.hp > 0);             // 包含還在畫面外的（算場上數量用）
  const alive = () => B.monsters.filter(m => m.hp > 0 && entered(m)); // 已經上場、可以打的
  function front() {
    let best = null;
    for (const m of B.monsters) if (m.hp > 0 && entered(m) && (!best || m.x < best.x)) best = m;
    return best;
  }
  const near = (x, r) => alive().filter(m => Math.abs(m.x - x) < r + m.w / 2);
  // 給 classes.js（夥伴職業）用的共用工具
  Object.assign(B, { after, hitStop, shakeIt, busy, front, alive, living, entered, near, mid });

  /* ---------- 傷害 ---------- */
  B.hurt = function (m, dmg, opts = {}) {
    if (!m || m.hp <= 0 || !entered(m)) return;
    let crit = !opts.noCrit && Math.random() < G.critChance();
    if (crit) dmg *= C.critMul;
    if (m.frozen > 0) dmg *= 1.5;
    m.hp -= dmg; m.hit = 0.1;
    // 特殊首領還沒校正前：記錄平常每秒受到多少傷害（大招另外算），血最少留 40%，不會開場就被大招秒掉
    if (m.calib) { if (!(B.ultT > 0)) m.calib.dmg += dmg; if (!m.calib.pass) m.hp = Math.max(m.hp, m.max * 0.4); }
    const big = opts.skill || crit;
    if (!big && B.floaters.length >= MAX_FLOAT()) { if (m.hp <= 0) kill(m); return; } // 數字太多時省略普通傷害的數字
    B.floaters.push({
      x: m.x + rand(-12, 12), y: m.y - m.h - 8, txt: G.fmt(dmg) + (crit ? '!' : ''),
      col: opts.col || (crit ? '#ffe14d' : '#ffffff'), size: opts.skill ? 22 : crit ? 19 : 13, life: big ? 1.1 : 0.8, vy: big ? 60 : 40,
    });
    if (crit && !busy()) { FX.add('impacts/crit-hit', { x: m.x - 20, y: mid(m).y + 10 }); hitStop(0.05); shakeIt(2); }
    if (m.hp <= 0) kill(m);
  };

  function kill(m) {
    const S = G.S;
    B.dying.push({ m, t: 0 }); // 倒下淡出的動畫（render.js 畫）
    const gain = m.reward * G.goldMult();
    S.gold += gain;
    S.stats.kills++;
    B.floaters.push({ x: m.x, y: m.y - m.h - 26, txt: '+' + G.fmt(gain) + ' 金', col: '#ffd23d', size: 14, life: 1.2, vy: 40 });
    if (!busy() || m.boss) FX.add('spawn/poof', { x: m.x, y: m.y, palette: FX.ramp(m.type.color, 6) });
    for (const k in G.CLASS) if (G.CLASS[k].onKill) G.CLASS[k].onKill(m);
    // 掉寶
    const luck = 1 + G.luck();
    if ((m.boss && !m.special) || Math.random() < C.dropChance * luck) dropItem(m); // 特殊事件的獎勵只有召喚券
    if (m.special) {
      FX.add('explosions/firework-burst', { x: m.x, y: m.y - 40 }, { force: true });
      FX.add('explosions/firework-burst', { x: m.x - 80, y: m.y - 70, seed: 5 }, { delay: 0.3 });
      hitStop(0.25); shakeIt(10); B.flash = 0.35; B.flashCol = m.special.color;
      S.stats.eventWins = (S.stats.eventWins || 0) + 1;
      endEvent(true);
    } else if (m.boss) {
      const cr = G.bossCrystals(S.stage), tk = S.stage % C.stagesPerZone === 0 ? C.gacha.chapterTickets : C.gacha.bossTickets;
      S.crystals += cr; S.tickets = (S.tickets || 0) + tk;
      S.stats.bosses++;
      FX.add('explosions/firework-burst', { x: m.x, y: m.y - 40 }, { force: true });
      FX.add('explosions/firework-burst', { x: m.x - 90, y: m.y - 60, seed: 3 }, { delay: 0.3 });
      FX.add('explosions/firework-burst', { x: m.x + 70, y: m.y - 50, seed: 7 }, { delay: 0.55 });
      hitStop(0.25); shakeIt(10); B.flash = 0.35; B.flashCol = '#ffffff';
      G.ui && G.ui.toast(`擊敗首領！獲得 ${cr} 魔晶、${tk} 張召喚券，前往第 ${S.stage + 1} 關`);
      if (S.stage % C.stagesPerZone === 0) startScene({ kind: 'clear', delay: 1.3, dur: 3.2, idx: G.chapIdx(S.stage) }); // 章節完結
      S.stage++; S.best = Math.max(S.best, S.stage); S.kills = 0;
      B.boss = null;
    } else if (S.kills < C.killsPerStage) {
      S.kills++;
    }
  }

  function dropItem(m) {
    const S = G.S, it = G.makeItem(S.stage, m.boss), r = C.rarities[it.rar];
    S.stats.drops++;
    FX.add('pickups/loot-beam', { x: m.x, y: C.GROUND, palette: FX.ramp(r.color, 7) }, { life: it.rar >= 3 ? 2.6 : 1.4, force: true });
    if (it.rar >= 4) FX.add('holy/feather-burst', { x: m.x, y: C.GROUND - 40, palette: FX.ramp(r.color, 8) });
    if (S.bag.length >= C.bagSize) {
      const g = G.itemSell(it); S.gold += g;
      G.ui && G.ui.toast(`背包滿了，${r.name}「${G.itemName(it)}」自動賣出 +${G.fmt(g)} 金`);
      return;
    }
    S.bag.push(it);
    G.ui && G.ui.toast(`獲得${r.name}裝備「${G.itemName(it)}」`, r.color);
    G.ui && G.ui.bagChanged();
  }

  /* ---------- 勇者攻擊 ---------- */
  function slashRamp() {
    const k = G.auraTier(G.S.units.hero);
    if (!k) return undefined;
    const col = C.auras[k - 1].color;
    return col === 'rainbow' ? FX.rainbow : FX.ramp(col, 7);
  }
  // 連段：斜劈 → 上挑 → 突刺 → 斜劈 → 上挑 → 迴旋斬，每招姿勢和特效都不同
  const COMBO = [
    { pose: 'slash',  fx: 'melee/sword-slash',  dx: -44, mul: 1 },
    { pose: 'upper',  fx: 'melee/double-slash', dx: -44, mul: 1.2 },
    { pose: 'thrust', fx: 'melee/thrust',       dx: -70, mul: 1.3 },
    { pose: 'slash',  fx: 'melee/sword-slash',  dx: -44, mul: 1 },
    { pose: 'upper',  fx: 'melee/double-slash', dx: -44, mul: 1.2 },
    { pose: 'spin',   fx: 'melee/spin-slash',   dx: 0,   mul: 2 },
  ];
  B.heroAnim = function (pose, dur) { const st = B.unitState.hero; st.anim = { pose, t: 0, dur }; st.trail = []; };
  function heroAttack() {
    const target = front();
    if (!target) return false;
    const st = B.unitState.hero, mv = COMBO[st.combo % COMBO.length];
    st.combo++; st.kick = 1;
    B.heroAnim(mv.pose, 0.46);
    // 揮下去的那一刻才出特效、扣血
    after(0.15, () => {
      const t = target.hp > 0 ? target : front();
      if (!t) return;
      st.lunge = 1;
      const y = t.type.fly ? t.y + 12 : C.GROUND;
      FX.add(mv.fx, { x: t.x + mv.dx, y, palette: slashRamp(), seed: st.combo });
      B.hurt(t, G.unitDmg('hero', G.S.units.hero) * mv.mul);
      if (mv.pose === 'spin') { near(t.x, 70).forEach(m => { if (m !== t) B.hurt(m, G.unitDmg('hero', G.S.units.hero) * 0.6); }); shakeIt(3); }
    });
    return true;
  }

  /* ---------- 夥伴攻擊：先蓄力，出手那一刻交給職業（classes.js）決定放什麼招 ---------- */
  function partnerAttack(u) {
    if (!front()) return false;
    const st = B.unitState[u.id], w = G.CLASS[u.attack].wind;
    st.anim = { t: 0, w, dur: w + 0.32 };
    st.blink = null;
    after(w, () => partnerRelease(u));
    return true;
  }
  function partnerRelease(u) {
    const target = front();
    if (!target) return;
    const st = B.unitState[u.id];
    st.kick = 1; st.combo++;
    G.CLASS[u.attack].release(u, G.rankOf(u.id), G.unitDmg(u.id, G.S.units[u.id]), st, target);
  }
  B.bolt = bolt;
  function bolt(a, b) {
    const pts = [a.x, a.y], n = 7;
    for (let k = 1; k < n; k++) {
      const f = k / n;
      pts.push(a.x + (b.x - a.x) * f + rand(-8, 8), a.y + (b.y - a.y) * f + rand(-14, 14));
    }
    pts.push(b.x, b.y);
    return pts;
  }
  /* ---------- 從左衝到右的巨大招式（大波浪、烈陽火球、巨箭、聖光月牙、暗影潮） ----------
     kind 決定 render.js 怎麼畫；前緣經過的怪各打一次、往後沖退（首領不會被沖走）
     hitFx: { id, opts } 打中時在怪身上加的特效；trailFx 同理，沿路每隔一段時間放一個 */
  B.surge = function (o) {
    B.waves.push(Object.assign({ kind: 'water', x: C.HERO_X - 40, h: 80, len: 260, speed: 480, dmg: 0, push: 70, col: '#3da9ff', t: 0, sp: 0, hit: new Set() }, o, { x0: o.x === undefined ? C.HERO_X - 40 : o.x }));
  };
  const HIT_COL = { water: '#a8e4ff', fire: '#ffb070', arrow: '#a8ffcf', holy: '#fff1a8', shadow: '#e0b0ff' };
  /* ---------- 特殊演出：有自己時間軸的大招（咖哩棒光束、影之大軍） ----------
     { kind, dur, update(s, dt) }；render.js 依 kind 畫，s.t 是開始後經過的秒數 */
  B.special = o => { const s = Object.assign({ t: 0 }, o); B.specials.push(s); return s; };
  function updateSpecials(dt) {
    for (const s of B.specials) { s.t += dt; if (s.update) s.update(s, dt); }
    prune(B.specials, s => s.t < s.dur);
  }

  /* ---------- 從天空斜飛下來的巨大火球（小狗先生的 Explosion） ----------
     從 (x0, y0) 飛到 (tx, ty)，越飛越快，落地呼叫 onLand(x, y)；render.js 畫火球 */
  B.bigBall = o => B.balls.push(Object.assign({ t: 0 }, o));
  function updateBalls(dt) {
    for (const b of B.balls) {
      b.t += dt;
      const k = Math.min(1, b.t / b.dur), e = k * k * 0.6 + k * 0.4; // 先慢後快
      b.x = b.x0 + (b.tx - b.x0) * e; b.y = b.y0 + (b.ty - b.y0) * e;
      b.ang = Math.atan2(b.ty - b.y0, b.tx - b.x0);
      if (k >= 1) { b.done = true; b.onLand(b.tx, b.ty); }
    }
    prune(B.balls, b => !b.done);
  }
  function updateWaves(dt) {
    for (const w of B.waves) {
      w.t += dt; w.x += w.speed * dt;
      for (const m of B.monsters) {
        if (m.hp <= 0 || w.hit.has(m) || !entered(m) || m.x - m.w / 2 > w.x + w.h * 0.2) continue;
        w.hit.add(m);
        B.hurt(m, w.dmg, { skill: w.skill, col: HIT_COL[w.kind] || '#ffffff' });
        if (!m.boss) m.push = Math.max(m.push || 0, w.push);
        m.slow = Math.max(m.slow || 0, 1);
        if (w.hitFx && !busy()) FX.add(w.hitFx.id, Object.assign({ x: m.x - 10, y: m.type.fly ? mid(m).y + 14 : C.GROUND }, w.hitFx.opts || {}));
      }
      w.sp -= dt; // 沿路的水花／火焰
      if (w.sp <= 0 && w.x > 0 && w.x < B.W) {
        w.sp = w.kind === 'water' ? (w.h > 120 ? 0.26 : 0.14) : 0.2; // 大浪的水花疏一點（水花特效面積大，太密會掉幀）
        if (w.kind === 'water') { if (!busy()) FX.add('water/splash', { x: w.x + w.h * 0.15, y: C.GROUND }); }
        else if (w.trailFx && !busy()) FX.add(w.trailFx.id, Object.assign({ x: w.x + (w.trailDx !== undefined ? w.trailDx : -w.h * 0.3), y: C.GROUND }, w.trailFx.opts || {}));
      }
    }
    prune(B.waves, w => w.x - w.len < B.W + 60);
  }

  /* ---------- 夥伴大招（地圖砲）：能量滿了就能放，放之前全畫面蓋板（斜線分割：半邊頭像、半邊招式名） ---------- */
  B.ultTime = () => C.ultTime; // 所有人固定，轉職、升等都不影響
  B.ultReady = id => !!G.S.units[id] && B.ult[id] >= 1;
  // 回傳 true 表示已經放出（或排進蓋板佇列）；不能放時回傳原因字串
  B.fireUlt = function (id) {
    if (!G.S.units[id]) return '還沒招募';
    if (B.away(id)) return '被叫走了，打倒她才會回來';
    if (!B.ultReady(id)) return `能量 ${Math.floor((B.ult[id] || 0) * 100)}%，還沒滿`;
    if (!living().length) return '場上沒有敵人'; // 怪還在走進來也可以放：蓋板播完牠們就進場了
    B.ult[id] = 0; B.cutQ.push(id);
    return true;
  };
  function startCutin(id) {
    const u = G.unitDef(id), def = B.ultDef(id), hero = id === 'hero';
    const r = hero ? G.auraTier(G.S.units.hero) : G.rankOf(id);
    const job = hero ? (r ? C.auras[r - 1].name : u.job) : G.jobTitle(id, r);
    B.cutin = {
      id, col: u.color, name: def.name, en: def.en, beast: def.beast, beastTag: def.beastTag, sub: `${u.name}・${job}`, t: 0, dur: 1.75,
      go() {
        if (!G.S.units[id]) return;
        if (hero) B.heroAnim('spin', 0.6);
        else { const st = B.unitState[id]; st.anim = { t: 0, w: 0.05, dur: 0.6 }; st.kick = 1.6; }
        B.flash = 0.35; B.flashCol = '#ffffff'; shakeIt(8);
        def.fire(u, r, G.unitDmg(id, G.S.units[id]) * (C.ultMul + r * (hero ? 2 : 3)));
        B.ultT = 4; // 大招造成的傷害 4 秒內不算進特殊首領的校正
        G.S.stats.ults = (G.S.stats.ults || 0) + 1;
      },
    };
  }

  /* ---------- 技能 ---------- */
  B.skillReady = id => G.skillLvl(id) > 0 && B.skillCd[id] <= 0;
  // 玩家按技能：有怪就放；還沒有怪進場就先待命，下一隻怪進場馬上放（不用一直連點）
  // 回傳 true（放了）、'wait'（待命中）或不能放的原因
  B.skillQ = null;
  B.tryCast = function (id) {
    if (B.scene) return 'wait';
    if (!G.skillLvl(id)) return '還沒學，打首領拿魔晶去「技能」分頁學';
    if (!B.skillReady(id)) return `冷卻中，還要 ${Math.ceil(B.skillCd[id])} 秒`;
    if (B.cast(id)) { if (B.skillQ === id) B.skillQ = null; return true; }
    B.skillQ = id; return 'wait';
  };
  B.cast = function (id) {
    if (!B.skillReady(id) || !front()) return false;
    const S = G.S, lvl = G.skillLvl(id), awake = lvl >= 10, dmg = G.skillDmg(id), sk = G.skillDef(id);
    B.skillCd[id] = G.skillCd(id);
    S.stats.casts++;
    B.unitState.hero.kick = 1.6; B.unitState.hero.lunge = 1; B.heroAnim('cast', 0.75);
    B.banner = { txt: sk.name, col: sk.color, life: 1.2, max: 1.2, small: true };
    const opt = { skill: true, col: sk.color };
    const f = front();
    switch (id) {
      case 'aura': {
        const x = f.x;
        FX.add('melee/heavy-cleave', { x: x - 64, y: C.GROUND, palette: slashRamp() || FX.ramp('#ffe08a', 7) });
        after(0.335, () => {
          FX.add('impacts/ground-slam', { x, y: C.GROUND, reach: 110 });
          hitStop(0.1); shakeIt(8);
          near(x, 120).forEach(m => B.hurt(m, m === f ? dmg : dmg * 0.5, opt));
        });
        if (awake) {
          after(0.75, () => { const t = front(); if (!t) return; FX.add('melee/double-slash', { x: t.x - 44, y: C.GROUND, palette: slashRamp() }); B.hurt(t, dmg * 0.4, opt); });
          after(1.05, () => { const t = front(); if (!t) return; FX.add('melee/spin-slash', { x: t.x, y: C.GROUND, palette: slashRamp() }); near(t.x, 100).forEach(m => B.hurt(m, dmg * 0.4, opt)); shakeIt(5); });
        }
        break;
      }
      case 'meteor': {
        const n = awake ? 6 : 3, ms = alive();
        for (let k = 0; k < n; k++) {
          const tx = ms.length ? pick(ms).x + rand(-30, 30) : C.FRONT + rand(0, 200);
          FX.add('fire/meteor', { x: tx, y: C.GROUND, seed: k * 7 + 1 }, { delay: k * 0.28 });
          after(k * 0.28 + 0.62, () => { near(tx, 90).forEach(m => B.hurt(m, dmg / n * 1.6, opt)); shakeIt(7); hitStop(0.04); });
        }
        break;
      }
      case 'thunder': {
        alive().slice(0, 8).forEach((m, k) => {
          const strike = (d) => {
            FX.add('lightning/lightning-strike', { x: m.x, y: C.GROUND, seed: k + d * 10 }, { delay: d + k * 0.07 });
            after(d + k * 0.07 + 0.76, () => { B.hurt(m, dmg, opt); shakeIt(5); B.flash = 0.12; B.flashCol = '#bfefff'; });
          };
          strike(0);
          if (awake) strike(0.6);
        });
        break;
      }
      case 'frost': {
        const ms = alive(), cx = ms.reduce((s, m) => s + m.x, 0) / ms.length;
        FX.add('ice/frost-nova', { x: cx, y: C.GROUND, reach: 150 });
        after(0.6, () => { alive().forEach(m => { m.frozen = 4; B.hurt(m, dmg, opt); }); shakeIt(4); });
        if (awake) {
          FX.add('ice/ice-spikes', { x: C.HERO_X + 20, y: C.GROUND, reach: 240 }, { delay: 0.5 });
          after(1.9, () => alive().forEach(m => B.hurt(m, dmg * 0.8, opt)));
        }
        break;
      }
      case 'holy': {
        const t = B.boss && B.boss.hp > 0 ? B.boss : alive().sort((a, b) => b.hp - a.hp)[0];
        FX.add('holy/holy-pillar', { x: t.x, y: C.GROUND });
        FX.add('holy/feather-burst', { x: t.x, y: C.GROUND - 60 }, { delay: 0.5 });
        after(0.53, () => { B.hurt(t, dmg, opt); hitStop(0.12); shakeIt(8); B.flash = 0.25; B.flashCol = '#fff6c8'; });
        if (awake) [-56, 56].forEach((dx, k) => {
          FX.add('holy/holy-pillar', { x: t.x + dx, y: C.GROUND, seed: k + 3 }, { delay: 0.35 + k * 0.3 });
          after(0.88 + k * 0.3, () => { B.hurt(t.hp > 0 ? t : front(), dmg * 0.5, opt); shakeIt(5); });
        });
        break;
      }
      case 'void': {
        const ms = alive(), cx = Math.max(C.FRONT + 30, ms.reduce((s, m) => s + m.x, 0) / ms.length);
        const hole = FX.add('shadow/black-hole', { x: cx, y: C.GROUND - 46 }, { life: 3.4 });
        B.pull = { x: cx, t: 3.4 };
        for (let k = 1; k <= 12; k++) after(k * 0.28, () => alive().forEach(m => B.hurt(m, dmg * 0.04, { noCrit: true, col: '#d9a6ff' })));
        after(3.4, () => { FX.add('explosions/implosion', { x: cx, y: C.GROUND - 46 }); });
        after(3.55, () => {
          FX.add('shadow/dark-explosion', { x: cx, y: C.GROUND });
          alive().forEach(m => B.hurt(m, dmg * (awake ? 3 : 1), opt));
          hitStop(0.15); shakeIt(12); B.flash = 0.3; B.flashCol = '#e0b0ff';
        });
        void hole;
        break;
      }
    }
    return true;
  };

  /* ---------- 鬥氣突破 ---------- */
  B.checkAura = function () {
    const S = G.S, tier = G.auraTier(S.units.hero);
    if (tier > S.aura) {
      S.aura = tier;
      const a = C.auras[tier - 1], col = a.color === 'rainbow' ? '#ffffff' : a.color;
      const ramp = a.color === 'rainbow' ? FX.rainbow : FX.ramp(col, 8);
      const x = C.HERO_X;
      FX.add('arcane/magic-circle-cast', { x, y: C.GROUND, palette: ramp }, { layer: 'back' });
      FX.add('holy/feather-burst', { x, y: C.GROUND - 50, palette: ramp }, { delay: 0.4 });
      FX.add('explosions/firework-burst', { x, y: C.GROUND - 70 }, { delay: 1.2 });
      FX.add('arcane/mana-burst', { x, y: C.GROUND, palette: ramp }, { delay: 1.3 });
      B.banner = { txt: `鬥氣突破！${a.name}`, sub: `勇者傷害 ×${a.mul}`, col, life: 3.2, max: 3.2 };
      B.flash = 0.5; B.flashCol = col; shakeIt(10); hitStop(0.2);
      G.ui && G.ui.toast(`火柴勇者覺醒了「${a.name}」！傷害 ×${a.mul}`, col);
    }
    if (tier !== B.auraShown) setAuraFx(tier);
  };
  /* ---------- 夥伴鬥氣突破 ---------- */
  B.checkPartnerAura = function (id, silent) {
    const S = G.S, u = G.unitDef(id), tier = G.pAuraTier(S.units[id]);
    S.paura = S.paura || {};
    if (tier > (S.paura[id] || 0)) {
      S.paura[id] = tier;
      if (!silent) {
        const p = B.unitPos(id), ramp = FX.ramp(u.color, 8), a = C.partnerAuras[tier - 1];
        FX.add('arcane/magic-circle-cast', { x: p.x, y: C.GROUND, palette: ramp }, { layer: 'back' });
        FX.add('holy/feather-burst', { x: p.x, y: C.GROUND - 45, palette: ramp }, { delay: 0.35 });
        FX.add('arcane/mana-burst', { x: p.x, y: C.GROUND, palette: ramp }, { delay: 1.1 });
        const rk = u.ranks[tier];
        B.banner = { txt: `${u.name} 轉職！`, sub: `「${rk.title}」　傷害 ×${a.mul}　${rk.desc}`, col: u.color, life: 3.6, max: 3.6 };
        B.flash = 0.35; B.flashCol = u.color; shakeIt(7); hitStop(0.12);
      }
    }
    if (tier !== B.pAuraShown[id]) {
      (B.pAuraFx[id] || []).forEach(e => FX.stop(e));
      B.pAuraFx[id] = []; B.pAuraShown[id] = tier;
    }
  };
  B.checkAllPartnerAuras = function (silent) { C.units.slice(1).forEach(u => B.checkPartnerAura(u.id, silent)); };

  function setAuraFx(tier) {
    B.auraFx.forEach(e => FX.stop(e));
    B.auraFx = [];
    B.auraShown = tier;
    if (tier < 3) return;
    const a = C.auras[tier - 1], ramp = a.color === 'rainbow' ? FX.rainbow : FX.ramp(a.color, 8);
    B.auraFx.push(FX.add('arcane/rune-circle', { x: C.HERO_X, y: C.GROUND + 4, palette: ramp }, { layer: 'back', force: true }));
    if (tier >= 6) B.auraFx.push(FX.add('holy/sunburst', { x: C.HERO_X, y: C.GROUND - 28, palette: ramp }, { layer: 'back', force: true }));
  }

  /* ---------- 點擊 ---------- */
  B.click = function (x, y) {
    if (B.scene) { B.skipScene(); return; }
    let target = null, bd = 1e9;
    for (const m of alive()) {
      const c = mid(m), d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) { bd = d; target = m; }
    }
    if (!target) return;
    G.S.stats.clicks++;
    if (!B.unitState.hero.anim) B.heroAnim('thrust', 0.3);
    const c = mid(target);
    if (!busy()) FX.add('impacts/hit-spark', { x: c.x - 10, y: c.y + 14, palette: slashRamp() });
    B.fx.push({ kind: 'tap', x: c.x, y: c.y, life: 0.25, max: 0.25 });
    B.hurt(target, G.clickDmg());
  };

  // 首領走到定位：腳下爆開紅色魔法陣、地面震一下（飛行首領改成魔力爆發）
  function bossLand(m) {
    if (m.landed || m.x > m.stop) return;
    m.landed = true;
    const ramp = FX.ramp('#ff3d6a', 8);
    FX.add('arcane/magic-circle-cast', { x: m.x, y: C.GROUND, palette: ramp }, { layer: 'back', force: true });
    if (m.type.fly) FX.add('arcane/mana-burst', { x: m.x, y: m.y - m.h / 2, palette: ramp }, { force: true });
    else FX.add('impacts/ground-slam', { x: m.x, y: C.GROUND, reach: m.w * 0.8, palette: ramp }, { force: true });
    shakeIt(8); B.flash = Math.max(B.flash, 0.15); B.flashCol = '#ff3d6a';
  }

  /* ---------- 章節演出 ----------
     title：新章節標題　talk：首領對話（首領邊說邊走進來）　clear：第 N 章 完
     演出時戰鬥暫停（首領的限時也不會倒數），點戰場可以跳過 */
  B.scene = null;
  function startScene(sc) { B.scene = Object.assign({ t: 0, step: 0, st: 0, delay: 0 }, sc); }
  function endScene() { const n = B.scene && B.scene.next; B.scene = null; if (n) startScene(n); }
  B.skipScene = function () {
    const s = B.scene;
    if (!s || s.t < s.delay + 0.3) return; // 剛開始的瞬間不給跳，避免連點誤觸
    if (s.kind === 'talk' && !s.wait && s.step < s.lines.length - 1) { s.step++; s.st = 0; } else endScene();
  };
  B.lineTime = ln => 1.4 + ln.txt.length * 0.1; // 一句話停留的秒數（字越多越久）
  function tickScene(dt) {
    const s = B.scene;
    s.t += dt;
    if (s.kind !== 'talk') { if (s.t >= s.delay + s.dur) endScene(); return; }
    // 首領走進來：露出大半身才開始說話
    const m = B.boss;
    if (!m) { endScene(); return; }
    if (m.x > m.stop) {
      const v = Math.max(m.speed * 2, 110);
      m.x = Math.max(m.stop, m.x - v * dt); m.moving = true; m.ph += dt * 8;
      m.ap += m.type.fly ? dt * 1.5 : v * dt / (46 * (m.hdBoss ? 2.3 : 1));
    } else m.moving = false;
    bossLand(m);
    if (s.wait) { if (m.x <= B.W - m.w * 0.3) { s.wait = false; s.st = 0; } return; }
    s.st += dt;
    if (s.st >= B.lineTime(s.lines[s.step])) { if (s.step < s.lines.length - 1) { s.step++; s.st = 0; } else endScene(); }
  }

  /* ---------- 每幀更新 ---------- */
  B.update = function (dt) {
    const S = G.S;
    // 震動、閃光、標語不受停頓影響
    B.shake = Math.max(0, B.shake - dt * 30);
    if (B.bossWarn > 0) B.bossWarn -= dt;
    B.flash = Math.max(0, B.flash - dt);
    if (B.floaters.length > MAX_FLOAT() + 10) B.floaters.splice(0, B.floaters.length - MAX_FLOAT() - 10);
    if (B.banner) { B.banner.life -= dt; if (B.banner.life <= 0) B.banner = null; }
    for (const f of B.floaters) { f.y -= f.vy * dt; f.life -= dt; }
    prune(B.floaters, f => f.life > 0);
    // 章節演出：播放時戰鬥暫停，只有特效、倒下動畫繼續動
    if (!B.scene && !B.cutin && !B.boss && G.chapIdx(S.stage) > S.chap && !(G.ui && G.ui.modalOpen())) {
      S.chap = G.chapIdx(S.stage);
      startScene({ kind: 'title', dur: 3.4, idx: S.chap });
    }
    if (B.scene) {
      tickScene(dt);
      FX.update(dt);
      B.monsters = B.monsters.filter(m => m.hp > 0);
      for (const d of B.dying) d.t += dt;
      prune(B.dying, d => d.t < 0.45);
      return;
    }
    // 大招蓋板：播放時戰鬥暫停，播完才放招
    if (!B.cutin && B.cutQ.length && alive().length) startCutin(B.cutQ.shift()); // 等有怪進場才播
    if (B.cutin) {
      B.cutin.t += dt;
      if (B.cutin.t >= B.cutin.dur) { const c = B.cutin; B.cutin = null; c.go(); }
      return;
    }
    // 打擊停頓：所有東西停一下，打擊感更重
    if (B.freeze > 0) { B.freeze -= dt; return; }

    FX.update(dt);
    for (const tm of B.timers) { tm.t -= dt; if (tm.t <= 0) { tm.done = true; tm.fn(); } }
    B.timers = B.timers.filter(tm => !tm.done);

    // 打倒之後夥伴說的話
    if (B.evLine) { B.evLine.t += dt; if (B.evLine.t >= B.evLine.dur) B.evLine = null; }
    // 特殊事件：一般關卡打怪時倒數，時間到就發生
    if (!B.boss && !B.scene && C.specialBosses) {
      B.evT -= dt;
      if (B.evT <= 0) {
        const pool = WANT ? (C.specialBosses || []).filter(d => d.id === WANT && G.SPR.boss && G.SPR.boss[d.id]) : eventPool();
        if (pool.length) { startEvent(pick(pool)); return; }
        B.evT = 30; // 還沒招募到相關夥伴：過一陣子再看
      }
    }
    if (B.ultT > 0) B.ultT -= dt;
    if (B.event && B.boss) calibrate(B.boss, dt);
    // 她在戰鬥中隨機嘴砲
    if (B.event && B.boss) {
      const ev = B.event;
      if (ev.say) { ev.say.t += dt; if (ev.say.t > 2.6) ev.say = null; }
      ev.sayT -= dt;
      if (ev.sayT <= 0 && entered(B.boss)) { ev.say = { txt: pick(ev.def.taunt), t: 0 }; ev.sayT = rand(5, 8); }
    }
    // 生怪
    if (!B.boss) {
      if (S.kills >= C.killsPerStage && S.auto) {
        B.bossDelay += dt;
        if (B.bossDelay > 1) { B.bossDelay = 0; B.startBoss(); }
      } else {
        B.spawnT -= dt;
        if (B.spawnT <= 0 && living().length < C.maxOnField) {
          B.spawnT = C.spawnEvery * rand(0.7, 1.3);
          B.monsters.push(makeMonster(pick(G.monsterPool(S.stage)), S.stage, false));
        }
      }
    } else {
      B.bossT -= dt;
      if (B.bossT <= 0 && B.boss.hp > 0 && B.boss.special) endEvent(false);
      else if (B.bossT <= 0 && B.boss.hp > 0) {
        B.monsters = B.monsters.filter(m => m !== B.boss);
        B.boss = null; S.auto = false; S.kills = 0;
        G.ui && G.ui.toast('首領太強了，撤退！升級後再按「挑戰首領」');
      }
    }
    // 怪物移動（凍結時不動；黑洞會把怪吸過去）
    if (B.pull) { B.pull.t -= dt; if (B.pull.t <= 0) B.pull = null; }
    for (const m of B.monsters) {
      if (m.hit > 0) m.hit -= dt;
      if (m.frozen > 0) { m.frozen -= dt; continue; }
      if (m.lift > 0) { m.lift -= dt; continue; }
      if (m.push > 0) { const d = Math.min(m.push, 420 * dt); m.push -= d; m.x = Math.min(B.W + 30, m.x + d); continue; } // 被浪沖退
      const slowK = m.slow > 0 ? 0.4 : 1;
      if (m.slow > 0) m.slow -= dt;
      m.ph += dt * (m.x > m.stop ? 8 : 4);
      // 動作相位：走路的怪照「走了多遠」前進（腳步跟移動同步），飛的怪固定拍翅，停下來就不踏步
      m.moving = m.x > m.stop && !B.pull;
      const stride = (STRIDE[m.type.id] || 46) * (m.hdBoss ? 2.3 : 1);
      if (m.type.fly) m.ap += dt * 2.2 * (m.hdBoss ? 0.7 : 1);
      else if (m.moving) m.ap += m.speed * slowK * dt / stride;
      if (B.pull && !m.boss) m.x += (B.pull.x - m.x) * Math.min(1, dt * 2.5);
      else if (m.x > m.stop) m.x -= m.speed * slowK * dt;
      if (m.boss) bossLand(m);
    }
    B.monsters = B.monsters.filter(m => m.hp > 0);
    for (const d of B.dying) d.t += dt;
    prune(B.dying, d => d.t < 0.45);

    // 勇者與夥伴攻擊
    C.units.forEach(u => {
      const st = B.unitState[u.id];
      st.kick = Math.max(0, st.kick - dt * 6);
      st.lunge = Math.max(0, st.lunge - dt * 5);
      if (st.anim) { st.anim.t += dt; if (st.anim.t >= st.anim.dur) st.anim = null; }
      if (!S.units[u.id] || B.away(u.id)) return;
      st.cd -= dt;
      if (st.cd <= 0) {
        const ok = u.id === 'hero' ? heroAttack() : partnerAttack(u);
        if (ok) st.cd += 1 / u.rate; else st.cd = 0.1;
      }
    });

    for (const k in G.CLASS) if (G.CLASS[k].tick) G.CLASS[k].tick(dt);

    // 夥伴大招充能；開自動施法時，滿了而且場上怪夠多（或首領）就放
    B.ultIds().forEach(id => {
      if (!S.units[id]) return;
      B.ult[id] = Math.min(1, (B.ult[id] || 0) + dt / B.ultTime(id));
      // 滿了以後累計等待時間：場上 3 隻以上或首領進場就放；等超過 8 秒，有 1 隻也放（隊伍太強、怪湊不到 3 隻時）
      B.ultWait[id] = B.ult[id] >= 1 ? (B.ultWait[id] || 0) + dt : 0;
      const n = alive().length, bossIn = B.boss && B.boss.hp > 0 && entered(B.boss);
      if (S.autoCast && B.ult[id] >= 1 && !B.cutQ.length && (n >= 3 || bossIn || (n >= 1 && B.ultWait[id] > 8))) B.fireUlt(id);
    });
    updateWaves(dt); updateBalls(dt); updateSpecials(dt);

    // 待命中的技能：有怪進場就放
    if (B.skillQ && front()) { const q = B.skillQ; B.skillQ = null; B.cast(q); }
    // 技能冷卻 + 自動施法
    C.skills.forEach(s => { B.skillCd[s.id] = Math.max(0, (B.skillCd[s.id] || 0) - dt); });
    if (S.autoCast && alive().length) {
      for (const s of C.skills) if (B.skillReady(s.id) && (alive().length >= 3 || (B.boss && entered(B.boss)))) { B.cast(s.id); break; }
    }

    // 飛行道具
    // 目標在半路被別人打死：改追最前面的怪；場上沒怪了就飛到原本的位置照樣爆炸，不會憑空消失
    for (const p of B.shots) {
      let t = p.target;
      if (t && (t.hp <= 0 || !B.monsters.includes(t))) t = p.target = front();
      if (t) { const m0 = mid(t); p.tx = m0.x; p.ty = m0.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
      p.ang = Math.atan2(dy, dx);
      if (d <= step + 6) { p.dead = true; p.onLand(p, t, { x: p.tx, y: p.ty }); }
      else { p.x += dx / d * step; p.y += dy / d * step; }
    }
    B.shots = B.shots.filter(p => !p.dead);

    // 小特效（閃電線、點擊圈）
    for (const f of B.fx) f.life -= dt;
    B.fx = B.fx.filter(f => f.life > 0);

    // 鬥氣粒子
    // 低畫質時粒子減半；另外設總量上限，避免後期幾千顆粒子
    const pk = G.lowFx ? 0.5 : 1;
    const tier = G.auraTier(S.units.hero);
    if (tier) {
      const a = C.auras[tier - 1], n = 6 + tier * 6;
      for (let k = 0; k < n * dt * 6 * pk && B.parts.length < 360 * pk; k++) {
        const col = a.color === 'rainbow' ? FX.rainbow[Math.floor(Math.random() * 6)] : a.color;
        B.parts.push({ x: C.HERO_X + rand(-10 - tier * 2, 10 + tier * 2), y: C.GROUND - rand(0, 20), vx: rand(-8, 8), vy: -rand(30, 60 + tier * 12), life: rand(0.4, 0.8 + tier * 0.08), col, s: rand(1.5, 2.5 + tier * 0.3) });
      }
    }
    for (const p of B.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    prune(B.parts, p => p.life > 0);
    // 夥伴的鬥氣粒子（每位夥伴各自一個陣列，繪圖時不用掃過所有人的粒子）
    C.units.slice(1).forEach(u => {
      const pt = G.pAuraTier(S.units[u.id]);
      if (!pt) return;
      const arr = B.pparts[u.id] || (B.pparts[u.id] = []);
      const x0 = B.unitPos(u.id).x, col2 = G.shade(u.color, 0.5);
      for (let k = 0; k < (3 + pt * 4) * dt * 6 * pk && arr.length < 120 * pk; k++) {
        arr.push({ x: x0 + rand(-9 - pt * 2, 9 + pt * 2), y: C.GROUND - rand(0, 16), vx: rand(-6, 6), vy: -rand(25, 45 + pt * 10), life: rand(0.35, 0.7 + pt * 0.08), col: Math.random() < 0.3 ? col2 : u.color, s: rand(1.4, 2.2 + pt * 0.25) });
      }
    });
    for (const id in B.pparts) {
      const arr = B.pparts[id];
      for (const p of arr) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      prune(arr, p => p.life > 0);
    }
  };
})();
