/* =========================================================
   ui.js — 左右面板：資源、收成、隊伍、技能、裝備、學院、技能列、提示訊息
   ========================================================= */
(function () {
  const C = G.CFG, B = G.battle;
  const $ = id => document.getElementById(id);
  const ui = G.ui = {};
  let bagDirty = true;

  /* ---------- 提示訊息 ---------- */
  ui.toast = function (msg, col) {
    const box = $('toasts'), el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    if (col) el.style.borderColor = col, el.style.color = col;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), 3400);
  };
  ui.modal = function (title, html, ok) {
    $('modalTitle').textContent = title; $('modalBody').innerHTML = html; $('modal').hidden = false;
    $('modalOk').textContent = ok || '出發！';
  };

  /* ---------- 抽卡動畫 ----------
     1. 召喚陣蓄力（顏色會偷偷透露最高稀有度：藍 → 紫 → 金 → 紅）
     2. 閃白，卡片背面落下
     3. 一張一張翻開；傳說以上翻開前會停一下、翻開時畫面震動
     點一下畫面：直接全部翻開 */
  const gacha = { timers: [], step: null };
  function gachaLater(t, fn) { gacha.timers.push(setTimeout(fn, t)); }
  function gachaClear() { gacha.timers.forEach(clearTimeout); gacha.timers = []; }
  ui.gachaShow = function (res) {
    const el = $('gacha'), top = Math.max(...res.map(r => r.it.rar));
    gachaClear();
    el.hidden = false; el.className = 'charge';
    // 蓄力的顏色：先藍，史詩以上轉紫，傳說以上轉金，神話轉紅
    const tint = [C.rarities[2].color];
    if (top >= 3) tint.push(C.rarities[3].color);
    if (top >= 4) tint.push('#ffd23d');
    if (top >= 5) tint.push(C.rarities[5].color);
    el.style.setProperty('--g', tint[0]);
    tint.slice(1).forEach((c, k) => gachaLater(700 + k * 450, () => { el.style.setProperty('--g', c); el.classList.add('surge'); setTimeout(() => el.classList.remove('surge'), 260); }));
    const chargeT = 1500 + (tint.length - 1) * 450;
    $('gachaTitle').textContent = '';
    $('gachaOk').hidden = true;
    $('gachaHint').hidden = false;
    $('gachaCards').className = 'g-cards' + (res.length === 1 ? ' one' : '');
    $('gachaCards').innerHTML = res.map(({ it, sold }, i) => {
      const r = C.rarities[it.rar], sl = G.slotDef(it.slot);
      return `<div class="g-card r${it.rar}" style="--c:${r.color};--d:${(i * 0.05).toFixed(2)}s">
        <div class="g-in">
          <div class="g-back"><span>?</span></div>
          <div class="g-face">
            <em>${r.name}</em>
            <img src="${G.itemIcon(it.slot, it.rar)}" alt="">
            <b>${G.itemName(it)}</b>
            <span>${sl.statName} +${G.fmtPct(G.itemVal(it))}</span>
            ${sold ? '<i>背包滿・已賣出</i>' : ''}
          </div>
        </div>
      </div>`;
    }).join('');
    const cards = [...$('gachaCards').children];
    let next = 0;
    const flip = c => {
      if (c.classList.contains('open')) return;
      c.classList.add('open');
      const rar = +c.className.match(/r(\d)/)[1];
      if (rar >= 4) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    };
    const finish = () => {
      gachaClear();
      cards.forEach(flip);
      el.className = 'done';
      const r = C.rarities[top];
      $('gachaTitle').innerHTML = top >= 4 ? `<span style="color:${r.color}">${r.name}降臨！</span>` : '召喚完成';
      $('gachaHint').hidden = true;
      $('gachaOk').hidden = false;
      gacha.step = null;
    };
    const flipNext = () => {
      if (next >= cards.length) { gachaLater(350, finish); return; }
      const c = cards[next++], rar = +c.className.match(/r(\d)/)[1];
      if (rar >= 4) { c.classList.add('tease'); gachaLater(650, () => { flip(c); gachaLater(420, flipNext); }); }
      else { flip(c); gachaLater(res.length === 1 ? 300 : 170, flipNext); }
    };
    gachaLater(chargeT, () => {
      el.className = 'burst';
      gachaLater(450, () => { el.className = 'reveal'; gachaLater(500 + cards.length * 50, flipNext); });
    });
    gacha.step = finish;
  };
  $('gacha').addEventListener('click', e => {
    if (e.target.id === 'gachaOk') return;
    if (gacha.step) gacha.step(); // 點一下：直接全部翻開
  });
  $('gachaOk').onclick = () => { gachaClear(); $('gacha').hidden = true; };
  ui.modalOpen = () => !$('modal').hidden;
  $('modalOk').onclick = () => { $('modal').hidden = true; };
  ui.bagChanged = () => { bagDirty = true; };
  // 只有內容真的變了才改 innerHTML，避免按下滑鼠途中按鈕內部被換掉，導致 click 沒觸發
  const setHTML = (el, html) => { if (el._html !== html) { el._html = html; el.innerHTML = html; } };
  let ptrDown = false;
  addEventListener('pointerdown', () => { ptrDown = true; }, true);
  addEventListener('pointerup', () => { ptrDown = false; }, true);
  addEventListener('pointercancel', () => { ptrDown = false; }, true);

  /* ---------- 收成站 ---------- */
  const resName = r => ({ gold: '金幣', crystals: '魔晶', tickets: '召喚券' })[r];
  const whole = h => h.res !== 'gold'; // 魔晶、召喚券只收整數
  function buildHarvest() {
    $('harvest').innerHTML = C.harvesters.map(h => `
      <div class="card harv" id="h-${h.id}">
        <div class="row"><b>${h.name}</b><span class="lv" id="h-${h.id}-lv"></span></div>
        <div class="row num"><span id="h-${h.id}-amt"></span><span class="dim" id="h-${h.id}-rate"></span></div>
        <div class="bar"><i id="h-${h.id}-bar" class="${h.res}"></i></div>
        <div class="dim small" id="h-${h.id}-eta"></div>
        <div class="btns">
          <button class="btn go" id="h-${h.id}-get">收成</button>
          <button class="btn" id="h-${h.id}-up"></button>
        </div>
      </div>`).join('');
    C.harvesters.forEach(h => {
      $(`h-${h.id}-get`).onclick = () => collect(h.id);
      $(`h-${h.id}-up`).onclick = () => upgradeHarv(h.id);
    });
  }
  function collect(id) {
    const s = G.S.harv[id], h = G.harvDef(id);
    const amt = whole(h) ? Math.floor(s.acc) : s.acc;
    if (amt < 1) return;
    G.S[h.res] += amt; s.acc -= amt;
    ui.toast(`收成 ${G.fmt(amt)} ${resName(h.res)}`);
  }
  function upgradeHarv(id) {
    const cost = G.harvUpCost(id), res = G.harvDef(id).upRes;
    if (G.S[res] < cost) return;
    G.S[res] -= cost; G.S.harv[id].lvl++;
  }

  /* ---------- 右側清單 ---------- */
  function buildList() {
    const tab = G.S.tab;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('buyMode').hidden = tab !== 'party';
    const L = $('list');
    if (tab === 'party') {
      L.innerHTML = C.units.map(u => `
        <div class="card unit" id="u-${u.id}" style="--c:${u.color}">
          <img class="portrait" src="${u.id === 'hero' ? G.heroPortrait() : G.SPR.portraits[u.id]}" alt="">
          <div class="info">
            <div class="row"><b>${u.name}<em id="u-${u.id}-job">${u.job}</em></b><span class="lv" id="u-${u.id}-lv"></span></div>
            <div class="num small" id="u-${u.id}-dps"></div>
            <div class="small milestone" id="u-${u.id}-ms"></div>
          </div>
          <button class="btn go buy" id="u-${u.id}-buy"></button>
        </div>`).join('');
      C.units.forEach(u => { $(`u-${u.id}-buy`).onclick = () => buyUnit(u.id); });
    } else if (tab === 'skill') {
      L.innerHTML = C.skills.map(s => `
        <div class="card skill" id="s-${s.id}" style="--c:${s.color}">
          <div class="row"><b><span class="key">${s.key}</span>${s.name}</b><span class="lv" id="s-${s.id}-lv"></span></div>
          <div class="dim small">${s.desc}</div>
          <div class="small num" id="s-${s.id}-num"></div>
          <div class="small awaken" id="s-${s.id}-aw">${s.awaken}（Lv10）</div>
          <button class="btn go" id="s-${s.id}-buy"></button>
        </div>`).join('');
      C.skills.forEach(s => { $(`s-${s.id}-buy`).onclick = () => buySkill(s.id); });
    } else if (tab === 'gear') {
      L.innerHTML = `
        <div class="card gacha">
          <div class="row"><b>裝備召喚</b><span class="tix" id="g-tix"></span></div>
          <div class="dim small">${C.rarities.filter(r => C.gacha.weights[r.id]).map(r => `<span style="color:${r.color}">${r.name} ${G.fmtPct(G.gachaRate(r.id))}</span>`).join('・')}</div>
          <div class="btns">
            <button class="btn go" id="g-1">召喚 ×1<span>1 張召喚券</span></button>
            <button class="btn go" id="g-10">召喚 ×10<span>10 張召喚券</span></button>
          </div>
        </div>
        <div class="slots" id="slots"></div>
        <div class="card gearsum" id="gearSum"></div>
        <div class="row bagbar"><span class="sec" id="bagTitle"></span><button class="btn" id="sellWeak">賣掉較弱的</button></div>
        <div class="stack" id="bag"></div>`;
      $('sellWeak').onclick = sellWeak;
      $('g-1').onclick = () => summon(1);
      $('g-10').onclick = () => summon(10);
      bagDirty = true;
    } else {
      L.innerHTML = C.tech.map(t => `
        <div class="card unit" id="t-${t.id}" style="--c:#c8a0ff">
          <div class="swatch"></div>
          <div class="info">
            <div class="row"><b>${t.name}</b><span class="lv" id="t-${t.id}-lv"></span></div>
            <div class="dim small">${t.desc}</div>
          </div>
          <button class="btn go buy" id="t-${t.id}-buy"></button>
        </div>`).join('');
      C.tech.forEach(t => { $(`t-${t.id}-buy`).onclick = () => buyTech(t.id); });
    }
    refresh();
  }

  function buyUnit(id) {
    const { n, cost } = G.unitBuy(id);
    if (G.S.gold < cost) return;
    const was = G.S.units[id];
    G.S.gold -= cost; G.S.units[id] += n;
    const u = G.unitDef(id);
    if (!was) {
      B.unitState[id] = { cd: 0.3, kick: 1, combo: 0, lunge: 0 };
      const p = B.unitPos(id);
      G.pfx.add('arcane/magic-circle-cast', { x: p.x, y: p.y, palette: G.pfx.ramp(u.color, 8) }, { layer: 'back' });
      ui.toast(`${u.name}（${u.job}）加入隊伍！`, u.color);
    } else {
      const p = B.unitPos(id);
      if (G.pfx.count() < 30) G.pfx.add('pickups/collect-burst', { x: p.x, y: p.y - 20, palette: G.pfx.ramp(u.color, 6) });
    }
    const before = Math.floor(was / C.milestone), after = Math.floor(G.S.units[id] / C.milestone);
    // 這次升級剛好轉職（或鬥氣突破）的話，只留中間的大字，不再跳「達到 LvXX」
    const rankUp = id === 'hero' ? G.auraTier(G.S.units[id]) > G.auraTier(was) : G.pAuraTier(G.S.units[id]) > G.pAuraTier(was);
    if (was && after > before && !rankUp) ui.toast(`${u.name} 達到 Lv${after * C.milestone}，傷害翻倍！`, u.color);
    if (id === 'hero') B.checkAura(); else B.checkPartnerAura(id);
  }
  function buyTech(id) {
    const t = G.techDef(id), cost = G.techCost(id);
    if (G.techLvl(id) >= t.max || G.S.crystals < cost) return;
    G.S.crystals -= cost; G.S.tech[id] = G.techLvl(id) + 1;
  }
  function buySkill(id) {
    const s = G.skillDef(id), cost = G.skillCost(id);
    if (G.S.best < s.unlock || G.S.crystals < cost) return;
    G.S.crystals -= cost;
    const lvl = G.S.skills[id] = G.skillLvl(id) + 1;
    if (lvl === 1) { ui.toast(`學會技能「${s.name}」！按 ${s.key} 或點下方技能列施放`, s.color); buildSkillBar(); }
    else if (lvl === 10) {
      ui.toast(`「${s.name}」覺醒！${s.awaken.replace('覺醒：', '')}`, s.color);
      B.banner = { txt: `技能覺醒・${s.name}`, sub: s.awaken.replace('覺醒：', ''), col: s.color, life: 3, max: 3 };
      G.pfx.add('arcane/magic-circle-cast', { x: C.HERO_X, y: C.GROUND, palette: G.pfx.ramp(s.color, 8) }, { layer: 'back' });
    } else if (G.pfx.count() < 30) G.pfx.add('arcane/mana-burst', { x: C.HERO_X, y: C.GROUND, palette: G.pfx.ramp(s.color, 7) });
  }

  /* ---------- 裝備 ---------- */
  const statText = it => { const s = G.slotDef(it.slot); return `${s.statName} +${G.fmtPct(G.itemVal(it))}`; };
  function equip(itemId) {
    const S = G.S, i = S.bag.findIndex(x => x.id === itemId);
    if (i < 0) return;
    const it = S.bag[i], old = S.equip[it.slot];
    S.equip[it.slot] = it;
    S.bag.splice(i, 1);
    if (old) S.bag.push(old);
    G.pfx.add('pickups/collect-burst', { x: C.HERO_X, y: C.GROUND - 20, palette: G.pfx.ramp(C.rarities[it.rar].color, 6) });
    bagDirty = true; refresh();
  }
  function unequip(slot) {
    const S = G.S, it = S.equip[slot];
    if (!it || S.bag.length >= C.bagSize) return;
    S.equip[slot] = null; S.bag.push(it); bagDirty = true; refresh();
  }
  function sell(itemId) {
    const S = G.S, i = S.bag.findIndex(x => x.id === itemId);
    if (i < 0) return;
    const g = G.itemSell(S.bag[i]); S.gold += g; S.bag.splice(i, 1);
    ui.toast(`賣出 +${G.fmt(g)} 金`); bagDirty = true; refresh();
  }
  function sellWeak() {
    const S = G.S; let g = 0, n = 0;
    S.bag = S.bag.filter(it => {
      const cur = S.equip[it.slot];
      if (cur && G.itemVal(it) <= G.itemVal(cur)) { g += G.itemSell(it); n++; return false; }
      return true;
    });
    S.gold += g; bagDirty = true; refresh();
    ui.toast(n ? `賣掉 ${n} 件較弱的裝備，+${G.fmt(g)} 金` : '沒有比身上弱的裝備');
  }
  function summon(n) {
    const free = C.bagSize - G.S.bag.length;
    if (free < n) { ui.toast(free > 0 ? `背包只剩 ${free} 格，無法召喚 ×${n}` : '背包已滿，請先整理背包'); return; }
    const res = G.gachaPull(n);
    if (!res) return;
    ui.gachaShow(res);
    bagDirty = true; refresh();
  }
  function enhance(slot) {
    const S = G.S, it = S.equip[slot];
    if (!it || it.plus >= C.enhanceMax) return;
    const cost = G.enhanceCost(it);
    if (S.gold < cost) return;
    S.gold -= cost; it.plus++;
    G.pfx.add('arcane/mana-burst', { x: C.HERO_X, y: C.GROUND, palette: G.pfx.ramp(C.rarities[it.rar].color, 7) });
    if (it.plus % 5 === 0) ui.toast(`${G.itemName(it)} 強化成功！`, C.rarities[it.rar].color);
    bagDirty = true; refresh();
  }
  function buildGear() {
    const S = G.S;
    $('slots').innerHTML = C.slots.map(s => {
      const it = S.equip[s.id];
      if (!it) return `<div class="slot empty"><div class="ico"></div><div class="small dim">${s.name}</div><div class="small dim">未裝備・${s.statName}</div></div>`;
      const r = C.rarities[it.rar];
      return `<div class="slot" style="--c:${r.color}">
        <img class="ico" src="${G.itemIcon(it.slot, it.rar)}" alt="">
        <div class="iname">${G.itemName(it)} <span class="dim small">${s.name}</span></div>
        <button class="btn mini go" data-enh="${s.id}">${it.plus >= C.enhanceMax ? '已滿' : '強化<br>' + G.fmt(G.enhanceCost(it)) + ' 金'}</button>
        <button class="btn mini ghost" data-off="${s.id}">卸下</button>
        <div class="small dim">${statText(it)}</div>
      </div>`;
    }).join('');
    $('slots').querySelectorAll('[data-enh]').forEach(b => b.onclick = () => enhance(b.dataset.enh));
    $('slots').querySelectorAll('[data-off]').forEach(b => b.onclick = () => unequip(b.dataset.off));
    $('gearSum').innerHTML = C.slots.map(s => `<span>${s.statName} <b>+${G.fmtPct(G.equipStat(s.stat))}</b></span>`).join('');
    $('bagTitle').textContent = `背包 ${S.bag.length} / ${C.bagSize}`;
    const bag = S.bag.slice().sort((a, b) => b.rar - a.rar || G.itemVal(b) - G.itemVal(a));
    $('bag').innerHTML = bag.length ? bag.map(it => {
      const r = C.rarities[it.rar], cur = S.equip[it.slot];
      const diff = cur ? G.itemVal(it) - G.itemVal(cur) : G.itemVal(it);
      const cmp = diff > 0 ? `<span class="up">▲ ${G.fmtPct(diff)}</span>` : diff < 0 ? `<span class="down">▼ ${G.fmtPct(-diff)}</span>` : '';
      return `<div class="card item" style="--c:${r.color}">
        <img class="ico" src="${G.itemIcon(it.slot, it.rar)}" alt="">
        <div class="info">
          <div class="iname">${G.itemName(it)} <span class="dim small">${r.name}・${G.slotDef(it.slot).name}・${it.ilvl}級</span></div>
          <div class="small">${statText(it)} ${cmp}</div>
        </div>
        <button class="btn go mini" data-eq="${it.id}">裝備</button>
        <button class="btn mini" data-sell="${it.id}">賣 ${G.fmt(G.itemSell(it))}</button>
      </div>`;
    }).join('') : '<p class="help">打倒首領一定會掉裝備，小怪偶爾也會掉。</p>';
    $('bag').querySelectorAll('[data-eq]').forEach(b => b.onclick = () => equip(+b.dataset.eq));
    $('bag').querySelectorAll('[data-sell]').forEach(b => b.onclick = () => sell(+b.dataset.sell));
  }

  /* ---------- 戰場下方技能列 ---------- */
  function buildSkillBar() {
    $('skillbar').innerHTML = C.skills.map(s => `
      <button class="sk" id="sk-${s.id}" style="--c:${s.color}" title="${s.name}：${s.desc}">
        <span class="k">${s.key}</span><span class="n">${s.name}</span><span class="cd" id="sk-${s.id}-cd"></span>
      </button>`).join('');
    C.skills.forEach(s => { $(`sk-${s.id}`).onclick = () => tryCast(s.id); });
    // 夥伴大招列（頭像＋能量條）
    $('ultbar').innerHTML = B.ultIds().map((id, i) => {
      const u = G.unitDef(id), face = id === 'hero' ? heroFace() : G.SPR.portraits[id];
      return `
      <button class="ult${id === 'hero' ? ' hero' : ''}" id="ult-${id}" style="--c:${id === 'hero' ? '#e8f4ff' : u.color}" title="${B.ultDef(id).name}">
        <span class="face" style="background-image:url('${face}')"></span>
        <span class="k">${C.ultKeys[i].toUpperCase()}</span><span class="fill"></span>
      </button>`;
    }).join('');
    B.ultIds().forEach(id => { $(`ult-${id}`).onclick = () => tryUlt(id); });
  }
  function tryCast(id) {
    const r = B.tryCast(id), el = $(`sk-${id}`);
    if (r === true || r === 'wait') return;
    if (el) { el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); }
    ui.toast(`${G.skillDef(id).name}：${r}`);
  }
  // 勇者大招按鈕的頭像：用程式畫一個小火柴人
  let heroFaceUrl = null;
  function heroFace() {
    if (heroFaceUrl) return heroFaceUrl;
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const x = c.getContext('2d');
    x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.arc(24, 12, 7, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(24, 19); x.lineTo(24, 34); x.moveTo(24, 24); x.lineTo(14, 30); x.moveTo(24, 24); x.lineTo(36, 18);
    x.moveTo(24, 34); x.lineTo(17, 45); x.moveTo(24, 34); x.lineTo(31, 45); x.stroke();
    x.strokeStyle = '#9fe2ff'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(35, 19); x.lineTo(45, 4); x.stroke();
    return (heroFaceUrl = c.toDataURL());
  }
  // 點了不能放的時候說原因，按鈕抖一下
  function tryUlt(id) {
    const r = B.fireUlt(id), el = $(`ult-${id}`);
    if (r === true) return;
    if (el) { el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); }
    ui.toast(`${G.unitDef(id).name}的大招：${r}`);
  }
  ui.tickSkills = function () {
    C.skills.forEach(s => {
      const el = $(`sk-${s.id}`); if (!el) return;
      const lvl = G.skillLvl(s.id);
      el.classList.toggle('locked', !lvl);
      const cd = lvl ? B.skillCd[s.id] || 0 : 0, p = lvl ? (cd / G.skillCd(s.id)).toFixed(3) : '0', txt = cd > 0 ? String(Math.ceil(cd)) : '';
      if (el._p !== p) { el._p = p; el.style.setProperty('--p', p); }
      if (el._t !== txt) { el._t = txt; $(`sk-${s.id}-cd`).textContent = txt; }
      if (lvl) el.classList.toggle('ready', cd <= 0);
      const q = B.skillQ === s.id;
      if (el._q !== q) { el._q = q; el.classList.toggle('queued', q); }
    });
    const cut = !!B.cutin || !!(B.scene && B.scene.t >= B.scene.delay); // 大招蓋板、章節演出時藏起戰場上的按鈕
    if (ui._cut !== cut) { ui._cut = cut; $('screen').classList.toggle('cutin', cut); }
    B.ultIds().forEach(id => {
      const el = $(`ult-${id}`); if (!el) return;
      const has = !!G.S.units[id], v = has ? Math.min(1, B.ult[id] || 0) : 0, g = v.toFixed(3), full = v >= 1;
      if (el._h !== has) { el._h = has; el.hidden = !has; }
      if (el._p !== g) { el._p = g; el.style.setProperty('--p', g); }
      if (el._f !== full) { el._f = full; el.classList.toggle('ready', full); }
    });
  };

  /* ---------- 每 0.25 秒更新數字 ---------- */
  function refresh() {
    const S = G.S;
    $('gold').textContent = G.fmt(S.gold);
    $('crystals').textContent = G.fmt(Math.floor(S.crystals));
    $('tickets').textContent = G.fmt(Math.floor(S.tickets));
    $('dps').textContent = G.fmt(G.totalDps());
    $('clickDmg').textContent = G.fmt(G.clickDmg());
    $('best').textContent = S.best;
    const tier = G.auraTier(S.units.hero);
    $('aura').textContent = tier ? C.auras[tier - 1].name : '尚未覺醒';

    C.harvesters.forEach(h => {
      const s = S.harv[h.id], cap = G.harvCap(h.id), rate = G.harvRate(h.id), full = s.acc >= cap - 1e-9;
      $(`h-${h.id}-lv`).textContent = 'Lv' + s.lvl;
      $(`h-${h.id}-amt`).textContent = `${G.fmt(whole(h) ? Math.floor(s.acc) : s.acc)} / ${G.fmt(cap)}`;
      $(`h-${h.id}-rate`).textContent = whole(h) ? `${(rate * 3600).toFixed(1)}/時` : `${G.fmt(rate * 60)}/分`;
      $(`h-${h.id}-bar`).style.width = Math.min(100, s.acc / cap * 100) + '%';
      $(`h-${h.id}-eta`).textContent = full ? '已滿！停止生產，快收成' : `約 ${G.fmtTime((cap - s.acc) / rate)} 後滿倉`;
      $(`h-${h.id}`).classList.toggle('full', full);
      $(`h-${h.id}-get`).disabled = (whole(h) ? Math.floor(s.acc) : s.acc) < 1;
      const up = $(`h-${h.id}-up`), cost = G.harvUpCost(h.id);
      const ut = `升級 ${G.fmt(cost)} 金`; if (up.textContent !== ut) up.textContent = ut; up.disabled = S[h.upRes] < cost;
    });

    if (S.tab === 'party') {
      document.querySelectorAll('.mode').forEach(b => b.classList.toggle('on', String(S.buyMode) === b.dataset.mode));
      C.units.forEach(u => {
        const lvl = S.units[u.id], el = $(`u-${u.id}-buy`);
        if (!el) return;
        const { n, cost } = G.unitBuy(u.id);
        const pt = u.id === 'hero' ? 0 : G.pAuraTier(lvl);
        $(`u-${u.id}-lv`).textContent = lvl ? 'Lv' + lvl : '未加入';
        let extra = '';
        if (u.id === 'cow' && G.rankOf('cow') >= 1) extra = `・影兵 ${(S.army || []).length}/${G.armyCap()}`;
        $(`u-${u.id}-dps`).textContent = lvl ? `DPS ${G.fmt(G.unitDps(u.id, lvl))}${extra}` : `基礎 DPS ${G.fmt(u.dmg * u.rate * G.dmgMult())}`;
        if (u.ranks) { // 目前職業 → 最終職業
          const r = G.rankOf(u.id), last = u.ranks.length - 1;
          setHTML($(`u-${u.id}-job`), lvl ? (r < last ? `<span>${u.ranks[r].title}</span> <span>→ ${u.job}</span>` : `★ ${u.job}`) : u.job); // 只在箭頭處換行
        }
        let ms = '';
        if (lvl) {
          const nextMs = (Math.floor(lvl / C.milestone) + 1) * C.milestone;
          ms = `Lv${nextMs} 傷害 ×2`;
          if (u.id === 'hero') { const na = G.nextAura(lvl); if (na && na.lv <= nextMs) ms = `Lv${na.lv} 鬥氣突破「${na.name}」×${na.mul}`; else if (na) ms += `・Lv${na.lv} ${na.name}`; }
          else { const na = G.nextPAura(lvl); if (na) { const rk = u.ranks[C.partnerAuras.indexOf(na) + 1]; ms = `Lv${na.lv} 轉職「${rk.title}」`; } else ms = '已達最高職業'; }
        }
        $(`u-${u.id}-ms`).textContent = ms;
        setHTML(el, lvl ? `升級 ×${n}<span>${G.fmt(cost)} 金</span>` : `招募<span>${G.fmt(cost)} 金</span>`);
        el.disabled = S.gold < cost;
        $(`u-${u.id}`).classList.toggle('locked', !lvl);
      });
    } else if (S.tab === 'skill') {
      C.skills.forEach(s => {
        const el = $(`s-${s.id}-buy`); if (!el) return;
        const lvl = G.skillLvl(s.id), cost = G.skillCost(s.id), locked = S.best < s.unlock;
        $(`s-${s.id}-lv`).textContent = lvl ? 'Lv' + lvl + (lvl >= 10 ? ' 覺醒' : '') : '未學會';
        $(`s-${s.id}-num`).textContent = lvl ? `威力 ${G.fmt(G.skillDmg(s.id))}・冷卻 ${G.skillCd(s.id).toFixed(1)} 秒` : `冷卻 ${s.cd} 秒`;
        $(`s-${s.id}-aw`).classList.toggle('done', lvl >= 10);
        setHTML(el, locked ? `第 ${s.unlock} 關解鎖` : `${lvl ? '升級' : '學習'}　${G.fmt(cost)} 魔晶`);
        el.disabled = locked || S.crystals < cost;
        $(`s-${s.id}`).classList.toggle('locked', !lvl);
      });
    } else if (S.tab === 'gear') {
      if (bagDirty && !ptrDown) { bagDirty = false; buildGear(); }
      else {
        // 只更新按鈕能不能按
        $('slots').querySelectorAll('[data-enh]').forEach(b => { const it = S.equip[b.dataset.enh]; b.disabled = !it || it.plus >= C.enhanceMax || S.gold < G.enhanceCost(it); });
      }
      if ($('g-tix')) {
        $('g-tix').textContent = `召喚券 ${G.fmt(Math.floor(S.tickets))}`;
        $('g-1').disabled = S.tickets < 1; $('g-10').disabled = S.tickets < 10;
      }
    } else {
      C.tech.forEach(t => {
        const el = $(`t-${t.id}-buy`); if (!el) return;
        const lvl = G.techLvl(t.id), maxed = lvl >= t.max, cost = G.techCost(t.id);
        $(`t-${t.id}-lv`).textContent = 'Lv' + lvl + (t.max < 999 ? ` / ${t.max}` : '');
        setHTML(el, maxed ? '已滿級' : `研究<span>${G.fmt(cost)} 魔晶</span>`);
        el.disabled = maxed || S.crystals < cost;
      });
    }

    const canBoss = !B.boss && S.kills >= C.killsPerStage;
    $('bossBtn').disabled = !canBoss;
    $('bossBtn').classList.toggle('pulse', canBoss && !S.auto);
    $('autoBtn').classList.toggle('on', S.auto);
    $('autoBtn').textContent = S.auto ? '自動推進：開' : '自動推進：關';
    $('castBtn').classList.toggle('on', S.autoCast);
    $('castBtn').textContent = S.autoCast ? '自動施法：開' : '自動施法：關';
  }
  ui.refresh = refresh;

  /* ---------- 按鈕 ---------- */
  ui.init = function () {
    buildHarvest();
    buildList();
    buildSkillBar();
    document.querySelectorAll('.tab').forEach(b => b.onclick = () => { G.S.tab = b.dataset.tab; buildList(); });
    document.querySelectorAll('.mode').forEach(b => b.onclick = () => {
      G.S.buyMode = b.dataset.mode === 'max' ? 'max' : +b.dataset.mode; refresh();
    });
    $('bossBtn').onclick = () => { G.S.auto = true; B.startBoss(); };
    $('autoBtn').onclick = () => { G.S.auto = !G.S.auto; refresh(); };
    $('castBtn').onclick = () => { G.S.autoCast = !G.S.autoCast; refresh(); };
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || G.paused) return;
      const s = C.skills.find(x => x.key === e.key);
      if (s) tryCast(s.id);
      const ui2 = C.ultKeys.indexOf(e.key.toLowerCase());
      if (ui2 >= 0) tryUlt(B.ultIds()[ui2]);
    });
    /* ---------- 圖鑑：角色、首領的圖和名稱 ---------- */
    const codexGroups = () => [
      { id: 'unit', name: '角色', items: C.units.map(x => ({
        img: x.id === 'hero' ? G.heroPortrait() : `img/partners/${x.id}_idle.png`, name: x.name, sub: x.job, col: x.color })) },
      { id: 'zone', name: '章節首領', items: (C.zoneBosses || []).map(b => ({
        img: `img/monsters/${b.id}_boss_0.png`, name: b.name, sub: `第 ${b.zone + 1} 章・${C.zones[b.zone].name}`, col: b.color })) },
      { id: 'boss', name: '首領', items: C.monsters.map(m => ({
        img: `img/monsters/${m.id}_boss_0.png`, name: C.bossNames[m.id] || m.name + '王', sub: `${m.name}的首領`, col: m.color })) },
      { id: 'special', name: '特殊首領', items: (C.specialBosses || []).map(d => ({
        img: `img/monsters/${d.id}_boss_0.png`, name: d.name, sub: `特殊事件「${d.event}」`, col: d.color })) },
    ];
    let codexTab = 'unit';
    function codexRender() {
      const gs = codexGroups(), g = gs.find(x => x.id === codexTab) || gs[0];
      $('codexTabs').innerHTML = gs.map(x => `<button class="tab${x.id === g.id ? ' on' : ''}" data-cx="${x.id}">${x.name}<small>${x.items.length}</small></button>`).join('');
      $('codexGrid').innerHTML = g.items.map(it => `<div class="cx-card" style="--c:${it.col}">
        <div class="cx-pic"><img src="${it.img}" alt="${it.name}"${it.px ? ' class="px"' : ''}></div>
        <b>${it.name}</b><small>${it.sub}</small></div>`).join('');
      $('codexGrid').scrollTop = 0;
    }
    $('codexTabs').onclick = e => { const b = e.target.closest('[data-cx]'); if (b) { codexTab = b.dataset.cx; codexRender(); } };
    const codexClose = () => { $('codex').hidden = true; };
    $('codexBtn').onclick = () => { codexRender(); $('codex').hidden = false; };
    $('codexClose').onclick = codexClose;
    $('codex').onclick = e => { if (e.target === $('codex')) codexClose(); }; // 點外面關閉
    addEventListener('keydown', e => { if (e.key === 'Escape' && !$('codex').hidden) codexClose(); });

    let armed = false;
    $('resetBtn').onclick = () => {
      const b = $('resetBtn');
      if (!armed) {
        armed = true; b.textContent = '再按一次確認'; b.classList.add('warn');
        setTimeout(() => { armed = false; b.textContent = '刪除存檔'; b.classList.remove('warn'); }, 3000);
        return;
      }
      armed = false; b.textContent = '刪除存檔'; b.classList.remove('warn');
      G.wipe(); B.reset(); buildList(); buildSkillBar(); ui.toast('存檔已刪除，重新開始冒險');
    };
  };
})();
