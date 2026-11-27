/* =========================================================
   state.js — 存檔資料、數值公式、裝備、存讀檔、離線收益
   ========================================================= */
(function () {
  const C = G.CFG;
  const SAVE_KEY = 'stick-hero-legend2-v1'; // 和舊版分開存檔

  G.newState = function () {
    const units = {};
    C.units.forEach(u => { units[u.id] = u.hire === 0 ? 1 : 0; });
    const harv = {};
    C.harvesters.forEach(h => { harv[h.id] = { lvl: 1, acc: 0 }; });
    const equip = {};
    C.slots.forEach(s => { equip[s.id] = null; });
    return {
      v: 1,
      gold: 0, crystals: 0, tickets: 0,
      stage: 1, best: 1, kills: 0, auto: true,
      units, tech: {}, harv,
      skills: {}, autoCast: true,
      equip, bag: [], nextItem: 1,
      aura: 0,                       // 已突破的鬥氣階段數
      paura: null,                   // 夥伴已轉職的階段 {id: 階段}
      army: [],                      // 暗影君王的影之軍團 [{t: 怪物種類, b: 是否首領}]
      stats: { kills: 0, bosses: 0, clicks: 0, casts: 0, drops: 0 },
      buyMode: 1, tab: 'party',
      chap: -1, talk: -1,            // 章節演出：已播過標題的章節、已播過首領對話的章節
      savedAt: Date.now(),
    };
  };

  /* ---------- 數字格式 ---------- */
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  G.fmt = function (n) {
    if (!isFinite(n)) return '∞';
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
    let i = 0;
    while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
    return (n < 100 ? n.toFixed(2) : n.toFixed(1)).replace(/\.?0+$/, '') + SUFFIX[i];
  };
  G.fmtPct = n => (n * 100 >= 10 ? Math.round(n * 100) : (n * 100).toFixed(1)) + '%';
  G.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return `${h} 小時 ${m} 分`;
    if (m) return `${m} 分 ${s} 秒`;
    return `${s} 秒`;
  };

  /* ---------- 查表 ---------- */
  G.techLvl = id => G.S.tech[id] || 0;
  G.techDef = id => C.tech.find(t => t.id === id);
  G.unitDef = id => C.units.find(u => u.id === id);
  G.harvDef = id => C.harvesters.find(h => h.id === id);
  G.skillDef = id => C.skills.find(s => s.id === id);
  G.slotDef = id => C.slots.find(s => s.id === id);
  G.skillLvl = id => G.S.skills[id] || 0;

  G.zoneIndex = stage => Math.floor((stage - 1) / C.stagesPerZone) % C.zones.length;
  G.zone = stage => C.zones[G.zoneIndex(stage)];
  G.chapIdx = stage => Math.floor((stage - 1) / C.stagesPerZone); // 第幾章（從 0 算，繞完一圈會繼續往上加）
  /* 血量成長：前 hpKnee 關每關 ×hpGrowth；之後在 hpTaper 關內慢慢降到每關 ×hpGrowthLate。
     夥伴全招募後，隊伍每關大約只能變強 3～5%，血量還照 ×1.2 長的話，100 關以後每關要練的時間會翻倍，變成撞牆 */
  const lnHp = [0, 0]; // lnHp[s] = ln(第 s 關血量 / hpBase)
  const lnStep = k => {
    const a = Math.log(C.hpGrowth), b = Math.log(C.hpGrowthLate || C.hpGrowth), k0 = C.hpKnee || Infinity, n = C.hpTaper || 1;
    return k < k0 ? a : k < k0 + n ? a + (b - a) * (k - k0 + 0.5) / n : b;
  };
  G.monsterHp = stage => {
    stage = Math.max(1, Math.floor(stage));
    while (lnHp.length <= stage) { const s = lnHp.length; lnHp.push(lnHp[s - 1] + lnStep(s - 1)); }
    return C.hpBase * Math.exp(lnHp[stage]);
  };
  // 每個區域的小怪平均血量倍率調成 1：怪物之間還是有強有弱，但換區域時難度不會忽高忽低
  G.zoneNorm = stage => {
    const ids = (C.zoneMonsters || [])[G.zoneIndex(stage)];
    const ms = (ids || C.monsters.map(m => m.id)).map(id => C.monsters.find(m => m.id === id)).filter(Boolean);
    return ms.length ? ms.length / ms.reduce((s, m) => s + m.hpMul, 0) : 1;
  };
  G.isChapterBoss = type => type.unique && type.zone !== undefined;
  // 這隻怪的血量（也是獎勵）倍率：小怪照種類（換算成區域平均 1）；一般首領不管哪種都是 1（輸了重打不會因為抽到雪怪王突然變難）；章節首領固定 chapterBossMul
  G.hpMulOf = (type, stage, boss) => G.isChapterBoss(type) ? (C.chapterBossMul || 1) : type.unique ? type.hpMul : boss ? 1 : type.hpMul * G.zoneNorm(stage);
  G.bossTimeOf = type => G.isChapterBoss(type) ? (C.chapterBossTime || C.bossTime) : C.bossTime;
  G.reward = stage => C.rewardBase * Math.pow(C.rewardGrowth, stage - 1);
  G.bossCrystals = stage => 1 + Math.floor(stage / 5);
  // 這個區域的小怪；圖還沒載入的先不出（第二批只有高畫質圖）
  G.monsterPool = stage => {
    const ids = (C.zoneMonsters || [])[G.zoneIndex(stage)] || C.monsters.map(m => m.id);
    const pool = ids.map(id => C.monsters.find(m => m.id === id)).filter(m => m && (!G.SPR || (G.SPR.mon && G.SPR.mon[m.id])));
    return pool.length ? pool : C.monsters.slice(0, 2);
  };

  /* ---------- 裝備加成 ---------- */
  G.itemVal = it => {
    const s = G.slotDef(it.slot), r = C.rarities[it.rar];
    return s.base * r.mul * (1 + 0.05 * (it.ilvl - 1)) * (1 + C.enhanceStep * it.plus);
  };
  G.equipStat = function (stat) {
    let v = 0;
    for (const s of C.slots) { const it = G.S.equip[s.id]; if (it && s.stat === stat) v += G.itemVal(it); }
    return v;
  };

  /* ---------- 鬥氣 ---------- */
  G.auraTier = lvl => { let k = 0; C.auras.forEach((a, i) => { if (lvl >= a.lv) k = i + 1; }); return k; };
  G.auraMul = lvl => C.auras.slice(0, G.auraTier(lvl)).reduce((m, a) => m * a.mul, 1);
  G.nextAura = lvl => C.auras.find(a => lvl < a.lv) || null;
  G.pAuraTier = lvl => { let k = 0; C.partnerAuras.forEach((a, i) => { if (lvl >= a.lv) k = i + 1; }); return k; };
  G.pAuraMul = lvl => C.partnerAuras.slice(0, G.pAuraTier(lvl)).reduce((m, a) => m * a.mul, 1);
  G.pAuraName = (id, tier) => G.unitDef(id).ranks[tier].title;
  G.nextPAura = lvl => C.partnerAuras.find(a => lvl < a.lv) || null;

  /* ---------- 傷害公式 ---------- */
  G.dmgMult = () => (1 + G.techLvl('power') * G.techDef('power').eff);
  G.goldMult = () => (1 + G.techLvl('bounty') * G.techDef('bounty').eff) * (1 + G.equipStat('gold'));
  G.critChance = () => Math.min(0.75, G.techLvl('crit') * G.techDef('crit').eff + G.equipStat('crit'));
  G.capSec = () => (C.baseCapMin + G.techLvl('storage') * G.techDef('storage').eff) * 60;
  G.luck = () => G.techLvl('luck') * G.techDef('luck').eff;

  G.unitDmg = function (id, lvl) {
    if (!lvl) return 0;
    const u = G.unitDef(id);
    let d = u.dmg * lvl * Math.pow(2, Math.floor(lvl / C.milestone)) * G.dmgMult();
    if (id === 'hero') d *= G.auraMul(lvl) * (1 + G.equipStat('atk'));
    else d *= (1 + G.equipStat('ally')) * G.pAuraMul(lvl) * (G.classMul ? G.classMul(id) : 1);
    return d;
  };
  const critAvg = () => 1 + G.critChance() * (C.critMul - 1);
  G.unitDps = (id, lvl) => G.unitDmg(id, lvl) * G.unitDef(id).rate * critAvg() * (G.unitDef(id).chain || 1);
  G.totalDps = () => C.units.reduce((s, u) => s + G.unitDps(u.id, G.S.units[u.id]), 0);
  G.heroDps = () => G.unitDps('hero', G.S.units.hero);
  G.clickDmg = () => Math.max(1, G.totalDps() * C.clickMul);

  G.skillDmg = function (id) {
    const sk = G.skillDef(id), lvl = G.skillLvl(id);
    if (!lvl) return 0;
    const awake = lvl >= 10 ? 1.5 : 1;
    return Math.max(1, G.heroDps()) * sk.power * (1 + 0.5 * (lvl - 1)) * awake * (1 + G.equipStat('skill')) * G.auraMul(G.S.units.hero) ** 0.25;
  };
  G.skillCd = id => G.skillDef(id).cd * Math.max(0.5, 1 - 0.03 * (G.skillLvl(id) - 1));
  G.skillCost = id => { const s = G.skillDef(id), l = G.skillLvl(id); return Math.ceil(s.cost * Math.pow(s.growth, l)); };

  /* ---------- 購買 ---------- */
  G.unitCost = function (id, lvl, n) {
    const u = G.unitDef(id);
    if (lvl === 0) return u.hire;
    let total = 0;
    for (let k = 0; k < n; k++) total += u.cost * Math.pow(u.growth, lvl + k);
    return total;
  };
  G.unitBuy = function (id) {
    const lvl = G.S.units[id];
    if (lvl === 0) return { n: 1, cost: G.unitDef(id).hire };
    const mode = G.S.buyMode;
    if (mode !== 'max') return { n: mode, cost: G.unitCost(id, lvl, mode) };
    let n = 0, cost = 0;
    const u = G.unitDef(id);
    while (n < 1000) {
      const next = u.cost * Math.pow(u.growth, lvl + n);
      if (cost + next > G.S.gold) break;
      cost += next; n++;
    }
    if (n === 0) return { n: 1, cost: G.unitCost(id, lvl, 1) };
    return { n, cost };
  };
  G.techCost = id => { const t = G.techDef(id); return Math.ceil(t.cost * Math.pow(t.growth, G.techLvl(id))); };

  /* ---------- 裝備產生 ---------- */
  G.rollRarity = function (boss) {
    const L = G.luck();
    const ws = C.rarities.map(r => (boss ? r.bossWeight : r.weight) * (1 + L * r.id));
    let x = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return i; }
    return 0;
  };
  G.makeItem = function (stage, boss) {
    const slot = C.slots[Math.floor(Math.random() * C.slots.length)].id;
    return { id: G.S.nextItem++, slot, rar: G.rollRarity(boss), ilvl: stage, plus: 0 };
  };
  G.itemName = it => C.itemNames[it.slot][it.rar] + (it.plus ? ` +${it.plus}` : '');
  G.itemSell = it => Math.ceil(G.reward(it.ilvl) * 6 * Math.pow(it.rar + 1, 2) * (1 + it.plus * 0.5));
  G.enhanceCost = it => Math.ceil(G.reward(Math.max(it.ilvl, G.S.best)) * 25 * (it.rar + 1) * Math.pow(1.6, it.plus));

  /* ---------- 裝備召喚 ---------- */
  G.gachaRate = rar => { const w = C.gacha.weights; return w[rar] / w.reduce((a, b) => a + b, 0); };
  G.gachaPull = function (n) {
    const S = G.S;
    if (S.tickets < n || C.bagSize - S.bag.length < n) return null;
    S.tickets -= n;
    const w = C.gacha.weights, sum = w.reduce((a, b) => a + b, 0), out = [];
    for (let k = 0; k < n; k++) {
      let x = Math.random() * sum, rar = 0;
      for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) { rar = i; break; } }
      const slot = C.slots[Math.floor(Math.random() * C.slots.length)].id;
      const it = { id: S.nextItem++, slot, rar, ilvl: S.best, plus: 0 };
      if (S.bag.length >= C.bagSize) { const g = G.itemSell(it); S.gold += g; out.push({ it, sold: g }); }
      else { S.bag.push(it); out.push({ it, sold: 0 }); }
    }
    return out;
  };

  /* ---------- 收成站 ---------- */
  G.harvRate = function (id) {
    const h = G.harvDef(id), lvl = G.S.harv[id].lvl;
    if (id === 'guild') return G.reward(G.S.best) * h.rateOfReward * (1 + h.lvlBonus * (lvl - 1)) * G.goldMult();
    if (id === 'mine') return (h.perMin * (1 + h.lvlBonus * (lvl - 1)) / 60) * (1 + G.techLvl('mineup') * G.techDef('mineup').eff);
    return 0;
  };
  G.harvCap = id => G.harvRate(id) * G.capSec();
  G.harvUpCost = id => { const h = G.harvDef(id); return Math.ceil(h.upCost * Math.pow(h.upGrowth, G.S.harv[id].lvl - 1)); };
  G.tickHarvest = function (dt) {
    C.harvesters.forEach(h => {
      const s = G.S.harv[h.id];
      s.acc = Math.min(G.harvCap(h.id), s.acc + G.harvRate(h.id) * dt);
    });
  };

  /* ---------- 離線收益 ---------- */
  G.applyOffline = function (sec) {
    if (sec < 30) return null;
    G.tickHarvest(sec);
    const fightSec = Math.min(sec, C.offlineCapHours * 3600);
    const pool = G.monsterPool(G.S.stage);
    const avgMul = pool.reduce((s, m) => s + G.hpMulOf(m, G.S.stage), 0) / pool.length;
    const hp = G.monsterHp(G.S.stage) * avgMul;
    const rate = Math.min(G.totalDps() / hp, 1 / C.spawnEvery);
    const kills = Math.floor(rate * fightSec * C.offlineEff);
    const gold = kills * G.reward(G.S.stage) * avgMul * G.goldMult();
    G.S.gold += gold;
    G.S.stats.kills += kills;
    return { sec, kills, gold };
  };

  /* ---------- 存讀檔 ---------- */
  G.save = function () {
    G.S.savedAt = Date.now();
    ['runBest', 'souls', 'soulsTotal', 'rebirths', 'talents'].forEach(k => { delete G.S[k]; }); // 清掉已移除的轉生系統留下的欄位
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.S)); } catch (e) { /* 無法存檔時照樣能玩 */ }
  };
  G.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const base = G.newState();
      const merged = Object.assign(base, s);
      merged.units = Object.assign(G.newState().units, s.units);
      merged.harv = Object.assign(G.newState().harv, s.harv);
      merged.stats = Object.assign(G.newState().stats, s.stats);
      merged.equip = Object.assign(G.newState().equip, s.equip);
      merged.skills = Object.assign({}, s.skills);
      if (s.chap === undefined) { merged.chap = G.chapIdx(merged.stage); merged.talk = merged.chap - 1; } // 舊存檔：只補播目前這章的首領對話
      merged.bag = Array.isArray(s.bag) ? s.bag : [];
      merged.army = (Array.isArray(s.army) ? s.army : []).map(a => ({ t: a.t, b: a.b }));
      return merged;
    } catch (e) { return null; }
  };
  G.wipe = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    G.S = G.newState();
  };
})();
