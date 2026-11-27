// 火柴勇者傳說2 平衡模擬：載入真正的 js/config.js、js/state.js，模擬一個貪心玩家（自動升級、抽卡、學院）一路打上去
// 用法：node tools/balance_sim.js [打到第幾關] [覆寫.json]   環境變數 EVERY=每幾關印一行  SEED=亂數種子  MIGRATE=16（先用舊血量玩到鬥氣修煉 16，再搬到第 185 關）
const fs = require('fs'), path = require('path');
const GAME = path.join(__dirname, '..', 'js');
global.window = global; global.G = {};
eval(fs.readFileSync(path.join(GAME, 'config.js'), 'utf8'));
const ov = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : {};
Object.assign(G.CFG, ov.cfg || {});
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
eval(fs.readFileSync(path.join(GAME, 'state.js'), 'utf8'));
if (ov.patch) eval(ov.patch); // 公式覆寫
const C = G.CFG;
const ARMY_CAP = [0, 4, 8, 12, 16, 24];
G.rankOf = id => G.pAuraTier(G.S.units[id] || 0);
G.classMul = id => {
  if (id !== 'cow') return 1;
  const r = G.rankOf('cow'), n = Math.min(ARMY_CAP[r], G.S.army.length);
  return (1 + 0.08 * n) * (r >= 4 ? 1.5 : 1);
};
G.S = G.newState();
const S = G.S;
S.army = [];
const MAX = +process.argv[2] || 200;
const VERBOSE = process.env.V;
let t = 0;                 // 遊戲秒數
let mineLvl = 1, guildLvl = 1;

function armyFill() { const cap = ARMY_CAP[G.rankOf('cow')]; while (S.army.length < cap) S.army.push({}); }
const avgPoolMul = st => { const p = G.monsterPool(st); return p.reduce((a, m) => a + G.hpMulOf(m, st), 0) / p.length; };
// 一般首領：從這區小怪隨機挑一種（最強的那種最難，算 worst 模式時用）
function bossType(st) {
  const zi = G.zoneIndex(st);
  if (st % C.stagesPerZone === 0) return C.zoneBosses.find(b => b.zone === zi);
  const p = G.monsterPool(st);
  if (process.env.WORST) return p.reduce((a, b) => b.hpMul > a.hpMul ? b : a);
  return p[Math.floor(rng() * p.length)];
}
let curBoss = null;
const bossHp = st => G.monsterHp(st) * G.hpMulOf(curBoss, st, true) * C.bossHpMul;
const bossTime = st => G.bossTimeOf(curBoss);

// 首領戰 45 秒能打多少：平常 DPS × 時間 + 每人一發大招 + 技能
function bossDamage(st) {
  let d = G.totalDps() * bossTime(st) * (ov.classBonus || 1.15); // 轉職招式額外傷害
  for (const u of C.units) {
    const l = S.units[u.id]; if (!l) continue;
    const hero = u.id === 'hero', r = hero ? G.auraTier(l) : G.rankOf(u.id);
    d += G.unitDmg(u.id, l) * (C.ultMul + r * (hero ? 2 : 3)) * (C.bossUlts || 1);
  }
  for (const sk of C.skills) if (G.skillLvl(sk.id)) d += G.skillDmg(sk.id) * Math.max(1, Math.floor(bossTime(st) / G.skillCd(sk.id)));
  return d;
}

// 貪心購買：每個單位考慮「升 1 級」或「升到下一個 25 級/轉職門檻」，挑 DPS/金幣 最好的
function buyStep() {
  const base = G.totalDps();
  let best = null;
  for (const u of C.units) {
    const l = S.units[u.id];
    if (l === 0) {
      if (u.hire <= S.gold) {
        S.units[u.id] = 1; const g = G.totalDps() - base; S.units[u.id] = 0;
        const sc = g / u.hire; if (!best || sc > best.sc) best = { sc, id: u.id, n: 1, cost: u.hire };
      }
      continue;
    }
    const targets = [1, Math.ceil((l + 1) / 25) * 25 - l];
    for (const n of targets) {
      if (n < 1) continue;
      const cost = G.unitCost(u.id, l, n);
      if (cost > S.gold) continue;
      S.units[u.id] = l + n; armyFill(); const g = G.totalDps() - base; S.units[u.id] = l;
      const sc = g / cost; if (!best || sc > best.sc) best = { sc, id: u.id, n, cost };
    }
  }
  if (!best) return false;
  S.gold -= best.cost; S.units[best.id] += best.n; armyFill();
  return true;
}
function buyAll() { let k = 0; while (buyStep() && k < 5000) k++; }

// 魔晶：鬥氣修煉為主、弱點看破補滿、礦脈
function spendCrystals() {
  for (let k = 0; k < 1000; k++) {
    const opts = [];
    if (G.techLvl('crit') < 20) opts.push(['crit', G.techCost('crit') * 0.7]);
    opts.push(['power', G.techCost('power')]);
    opts.push(['mineup', G.techCost('mineup') * 1.6]);
    // 技能（勇者技能）
    for (const sk of C.skills) opts.push(['sk:' + sk.id, G.skillCost(sk.id) * (ov.skillWeight || 3)]);
    opts.sort((a, b) => a[1] - b[1]);
    const [id] = opts[0];
    const cost = id.startsWith('sk:') ? G.skillCost(id.slice(3)) : G.techCost(id);
    if (cost > S.crystals) return;
    S.crystals -= cost;
    if (id.startsWith('sk:')) S.skills[id.slice(3)] = G.skillLvl(id.slice(3)) + 1; else S.tech[id] = G.techLvl(id) + 1;
  }
}
// 召喚券：抽完、每個部位穿最好的
function gacha() {
  while (S.tickets >= 1) {
    S.tickets--;
    const w = C.gacha.weights, sum = w.reduce((a, b) => a + b, 0);
    let x = rng() * sum, rar = 0;
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) { rar = i; break; } }
    const slot = C.slots[Math.floor(rng() * C.slots.length)].id;
    equipIf({ slot, rar, ilvl: S.best, plus: 0 });
  }
}
function equipIf(it) {
  const cur = S.equip[it.slot];
  if (!cur || G.itemVal(it) > G.itemVal(cur)) S.equip[it.slot] = it;
}
// 強化：只在跟升級夥伴差不多划算時（金幣 5% 以內）強化武器/戒指
function enhance() {
  for (const sl of ['weapon', 'ring']) {
    const it = S.equip[sl]; if (!it) continue;
    while (it.plus < C.enhanceMax && G.enhanceCost(it) < S.gold * (ov.enhanceFrac || 0.05)) { S.gold -= G.enhanceCost(it); it.plus++; }
  }
}
let seed = +process.env.SEED || 12345; function rng() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

// 收成：公會、礦脈（每次收、有上限的話玩家常回來收就當作沒上限）
function harvest(dt) {
  const gl = C.harvesters[0], mn = C.harvesters[1];
  S.gold += G.reward(S.best) * gl.rateOfReward * (1 + gl.lvlBonus * (guildLvl - 1)) * G.goldMult() * dt * (ov.harvEff ?? 0.5);
  S.crystals += mn.perMin * (1 + mn.lvlBonus * (mineLvl - 1)) / 60 * (1 + G.techLvl('mineup') * 0.2) * dt * (ov.harvEff ?? 0.5);
  // 礦脈/公會升級（便宜就升）
  while (mn.upCost * Math.pow(mn.upGrowth, mineLvl - 1) < S.gold * 0.1) { S.gold -= mn.upCost * Math.pow(mn.upGrowth, mineLvl - 1); mineLvl++; }
  while (gl.upCost * Math.pow(gl.upGrowth, guildLvl - 1) < S.gold * 0.1) { S.gold -= gl.upCost * Math.pow(gl.upGrowth, guildLvl - 1); guildLvl++; }
}
// 打小怪 dt 秒
function farm(st, dt) {
  const hp = G.monsterHp(st) * avgPoolMul(st), dps = G.totalDps() * (ov.classBonus || 1.15);
  const rate = Math.min(dps / hp, 1 / C.spawnEvery) * (ov.farmEff || 0.85);
  const kills = rate * dt;
  S.gold += kills * G.reward(st) * avgPoolMul(st) * G.goldMult();
  if (rng() < kills * C.dropChance * (1 + G.luck())) equipIf(G.makeItem(st, false));
  harvest(dt);
  t += dt;
  return kills;
}

const out = [];
S.stage = 1;
let lastT = 0, stuckT = 0, ok = true;
let migrated = !process.env.MIGRATE;
const NEWCFG = ov.cfg || { hpKnee: C.hpKnee, hpTaper: C.hpTaper, hpGrowthLate: C.hpGrowthLate, chapterBossMul: C.chapterBossMul, chapterBossTime: C.chapterBossTime }; if (!migrated) { for (const k of Object.keys(NEWCFG)) delete C[k]; C.hpGrowthLate = undefined; }
while (S.stage <= MAX) {
  if (!migrated && G.techLvl('power') >= +process.env.MIGRATE) {
    migrated = true; console.log(`[搬移] 舊數值在第 ${S.stage} 關達到鬥氣修煉 ${G.techLvl('power')}，等級 ${C.units.map(u => S.units[u.id]).join('/')}，改成站在第 185 關、套新數值`);
    Object.assign(C, NEWCFG); eval(fs.readFileSync(path.join(GAME, 'state.js'), 'utf8')); G.S = S;
    S.stage = 185; S.best = 185; out.length = 0; lastT = t;
  }
  const st = S.stage;
  // 打 10 隻小怪
  let k = 0; while (k < C.killsPerStage) { k += farm(st, 1); buyAll(); }
  let tries = 0; curBoss = bossType(st);
  while (bossDamage(st) < bossHp(st)) {
    tries++;
    farm(st, 10); buyAll(); spendCrystals(); enhance();
    if (t - lastT > (ov.giveUp || 3600 * 24 * 30)) { ok = false; break; }
  }
  if (!ok) break;
  t += 15; // 首領戰
  S.crystals += G.bossCrystals(st);
  S.tickets += st % C.stagesPerZone === 0 ? C.gacha.chapterTickets : C.gacha.bossTickets;
  equipIf(G.makeItem(st, true));
  S.stage++; S.best = Math.max(S.best, S.stage);
  gacha(); spendCrystals(); enhance();
  out.push({ st, dt: t - lastT, T: t, ratio: bossDamage(st) / bossHp(st), lv: C.units.map(u => S.units[u.id]).join('/'), pw: G.techLvl('power'),
    eq: C.slots.map(s => S.equip[s.id] ? C.rarities[S.equip[s.id].rar].name[0] + '+' + S.equip[s.id].plus : '-').join(' ') });
  lastT = t;
}
const fmtT = s => s < 120 ? s.toFixed(0) + 's' : s < 7200 ? (s / 60).toFixed(1) + 'm' : (s / 3600).toFixed(1) + 'h';
const every = +process.env.EVERY || 5;
for (const o of out) if (o.st % every === 0 || o.st > MAX - 3 || VERBOSE)
  console.log(`關${String(o.st).padStart(3)}  本關 ${fmtT(o.dt).padStart(7)}  累計 ${fmtT(o.T).padStart(7)}  等級 ${o.lv.padEnd(26)} 鬥氣修煉${o.pw}  ${o.eq}`);
if (!ok) console.log(`卡在第 ${S.stage} 關（${fmtT(t - lastT)} 還打不過）`);
module.exports = out;
