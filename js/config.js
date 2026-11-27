/* =========================================================
   config.js — 所有遊戲數值都在這裡，調整平衡只要改這個檔案
   ========================================================= */
window.G = window.G || {};

G.CFG = {
  // 戰場（邏輯座標，畫面會自動縮放）
  H: 440,
  MIN_W: 680,
  MAX_W: 1200,
  GROUND: 340,       // 地面 y
  HERO_X: 185,       // 勇者站的位置（整隊靠左，讓出中間給大招效果）
  FRONT: 400,        // 怪物停下來的 x
  partnerScale: 0.58, // 夥伴畫的大小（1 = 原本大小）
  partnerGap: 28,     // 夥伴之間的間隔
  partnerLead: 42,    // 勇者跟第一位夥伴的距離

  // 關卡
  killsPerStage: 10,
  spawnEvery: 1.1,
  maxOnField: 5,
  hpBase: 8,
  hpGrowth: 1.2,       // 前 hpKnee 關：每關血量 ×1.2
  hpKnee: 75,          // 從這關開始，每關的血量成長在 hpTaper 關內慢慢降到 hpGrowthLate
  hpTaper: 50,
  hpGrowthLate: 1.06,  // 第 125 關以後每關 ×1.06：五位夥伴都招募後，隊伍每關大約只能變強 5%，原本的 ×1.2 會在 150 關以後撞牆（第 185 關要練幾百小時）
  rewardBase: 2,
  rewardGrowth: 1.16,
  bossHpMul: 25,       // 首領血量 = 該關小怪平均 × 這個值；一般首領不管是哪種怪都一樣硬
  bossRewardMul: 8,
  bossTime: 45,        // 首領限時秒數
  chapterBossMul: 1.3, // 章節首領（每區最後一關）血量再 ×1.3，但限時也拉長到 chapterBossTime，需要的 DPS 跟一般首領差不多
  chapterBossTime: 60,
  // 模擬測試：../tools/balance_sim.js（node 跑，會列出每關大概要打多久）
  stagesPerZone: 5,

  // 戰鬥
  clickMul: 0.25,      // 點擊傷害 = 全隊 DPS × 這個值（最少 1）
  critMul: 3,

  // 離線
  offlineCapHours: 24,
  offlineEff: 0.5,

  zones: [
    { name: '翠綠草原',   sky: ['#1b2a4a', '#5a7fa8'], far: '#3c5a6e', hill: '#2f5a3a', ground: '#3d6b35', dirt: '#2a3f22', accent: '#9be36b', moon: '#fff4c4', deco: 'tree' },
    { name: '幽暗森林',   sky: ['#0b1420', '#1d3a3a'], far: '#14302c', hill: '#0f2620', ground: '#1f3d26', dirt: '#14261a', accent: '#6bffb8', moon: '#d8fff0', deco: 'pine' },
    { name: '骷髏墓地',   sky: ['#120d1e', '#3a2a4e'], far: '#2a2038', hill: '#1e1830', ground: '#3a3346', dirt: '#26212e', accent: '#c7a6ff', moon: '#e6dcff', deco: 'grave' },
    { name: '熔岩火山',   sky: ['#1a0606', '#5e1a10'], far: '#3a120e', hill: '#2a0e0c', ground: '#3b1d16', dirt: '#24100c', accent: '#ff7a3d', moon: '#ffb070', deco: 'rock' },
    { name: '冰霜雪原',   sky: ['#0d1a33', '#4d74a8'], far: '#5e7fa6', hill: '#8fb0d4', ground: '#d8e6f5', dirt: '#a8c0dc', accent: '#9fe8ff', moon: '#ffffff', deco: 'ice' },
    { name: '魔王城',     sky: ['#07040c', '#2a0d26'], far: '#1e0e1e', hill: '#160a16', ground: '#2a1a28', dirt: '#1a0f18', accent: '#ff4d8a', moon: '#ff6a6a', deco: 'castle' },
  ],

  // 怪物（像素圖在 sprites.js）：hpMul 同時也是獎勵倍率
  monsters: [
    { id: 'slime',    name: '果凍史萊姆', speed: 42, hpMul: 1.0, fly: false, color: '#7ee36b' },
    { id: 'goblin',   name: '哥布林',     speed: 60, hpMul: 0.8, fly: false, color: '#9bd04a' },
    { id: 'bat',      name: '吸血蝙蝠',   speed: 70, hpMul: 0.9, fly: true,  color: '#a06bff' },
    { id: 'skeleton', name: '骷髏兵',     speed: 38, hpMul: 1.4, fly: false, color: '#e8e2d0' },
    { id: 'imp',      name: '小惡魔',     speed: 50, hpMul: 1.6, fly: true,  color: '#ff5a3d' },
    { id: 'golem',    name: '岩石魔像',   speed: 24, hpMul: 2.2, fly: false, color: '#9aa0b0' },
    // 第二批
    { id: 'wolf',       name: '野狼',     speed: 78, hpMul: 0.8, fly: false, color: '#a8acb8' },
    { id: 'mushroom',   name: '毒蘑菇',   speed: 36, hpMul: 1.1, fly: false, color: '#e8303a' },
    { id: 'orc',        name: '獸人戰士', speed: 44, hpMul: 1.8, fly: false, color: '#7a9a5a' },
    { id: 'spider',     name: '巨蜘蛛',   speed: 64, hpMul: 1.0, fly: false, color: '#7a4a98' },
    { id: 'ghost',      name: '怨靈',     speed: 46, hpMul: 1.2, fly: true,  color: '#bfeaff' },
    { id: 'dwarf',      name: '狂戰矮人', speed: 40, hpMul: 1.7, fly: false, color: '#f08040' },
    { id: 'salamander', name: '火蜥蜴',   speed: 58, hpMul: 1.2, fly: false, color: '#ff8a2a' },
    { id: 'icesprite',  name: '冰精靈',   speed: 52, hpMul: 1.1, fly: true,  color: '#7fd0ff' },
    { id: 'yeti',       name: '雪怪',     speed: 30, hpMul: 2.3, fly: false, color: '#d8e4f0' },
    { id: 'darkknight', name: '黑暗騎士', speed: 38, hpMul: 2.2, fly: false, color: '#ff1a3a' },
    { id: 'gargoyle',   name: '石像鬼',   speed: 56, hpMul: 1.5, fly: true,  color: '#8a8e9a' },
  ],
  // 每個區域會出現的小怪（依照 zones 的順序）
  zoneMonsters: [
    ['slime', 'goblin', 'wolf', 'mushroom'],                  // 翠綠草原
    ['goblin', 'wolf', 'orc', 'spider', 'bat'],               // 幽暗森林
    ['skeleton', 'ghost', 'bat', 'spider'],                   // 骷髏墓地
    ['imp', 'golem', 'salamander', 'dwarf'],                  // 熔岩火山
    ['icesprite', 'yeti', 'wolf', 'dwarf'],                   // 冰霜雪原
    ['darkknight', 'gargoyle', 'imp', 'skeleton', 'orc'],     // 魔王城
  ],
  // 區域霸主：每個區域一隻專屬首領，固定在區域最後一關（章節首領）登場；其他關是一般怪物的首領版
  zoneBosses: [
    { id: 'treant',     name: '巨木樹人', zone: 0, speed: 26, hpMul: 1.3, fly: false, color: '#6ab04a', unique: true },
    { id: 'troll',      name: '森林巨魔', zone: 1, speed: 34, hpMul: 1.4, fly: false, color: '#7a9a6a', unique: true },
    { id: 'lich',       name: '死靈法師', zone: 2, speed: 40, hpMul: 1.3, fly: true,  color: '#9a5bff', unique: true },
    { id: 'infernal',   name: '熔岩炎魔', zone: 3, speed: 36, hpMul: 1.6, fly: false, color: '#ff5a2a', unique: true },
    { id: 'frostgiant', name: '冰霜巨人', zone: 4, speed: 28, hpMul: 1.8, fly: false, color: '#7fc8ff', unique: true },
    { id: 'demonking',  name: '黑暗魔王', zone: 5, speed: 32, hpMul: 2.0, fly: false, color: '#ff1a3a', unique: true },
  ],
  // 首領的名字跟著首領的種類（造型在 img/monsters/<id>_boss_*.png）
  bossNames: { slime: '史萊姆王', goblin: '哥布林酋長', bat: '吸血蝠王', skeleton: '骷髏王', imp: '惡魔領主', golem: '熔岩巨像',
    wolf: '銀牙狼王', mushroom: '蘑菇大王', orc: '獸人督軍', spider: '蜘蛛女王', ghost: '怨靈公爵', dwarf: '矮人鍛造王',
    salamander: '炎蜥領主', icesprite: '冰晶女王', yeti: '雪怪王', darkknight: '黑暗騎士團長', gargoyle: '石像鬼領主' },

  /* 章節演出（依照 zones 的順序，每個區域 = 一章）
     tag：進入新章節時大標題下面的一句話
     talk：第一次遇到章節首領時的對話（boss = 首領說、hero = 勇者說），點戰場可以跳下一句
     clear：打倒章節首領後「第 N 章 完」下面的一句話 */
  chapters: [
    { tag: '冒險，從這片草原開始',
      talk: [['boss', '吼……是誰踩在我的草地上？'], ['hero', '路過的勇者！讓開，我要去魔王城。'], ['boss', '想過去？先問問我的樹根！']],
      clear: '草原恢復了平靜，風裡多了花香' },
    { tag: '樹影之間，有東西在盯著你',
      talk: [['boss', '這座森林是巨魔的地盤，人類滾出去！'], ['hero', '我的夥伴們可不這麼想。'], ['boss', '那就把你們全部抓來當晚餐！']],
      clear: '第一道陽光照進了森林' },
    { tag: '安息之地，不再安息',
      talk: [['boss', '呵呵……再強的勇者，最後都會變成我的士兵。'], ['hero', '那你得先打得贏我才行。'], ['boss', '起來吧，我的亡者們！']],
      clear: '亡魂們終於得到了安息' },
    { tag: '腳下的大地正在燃燒',
      talk: [['boss', '區區一根火柴，也敢靠近火焰？'], ['hero', '火柴可是越燒越旺的！'], ['boss', '狂妄！化成灰吧！']],
      clear: '火山的怒火平息了' },
    { tag: '連呼吸都會結冰的地方',
      talk: [['boss', '這裡的一切都將永遠凍結……包括你。'], ['hero', '我的鬥氣，比你的冰還要硬！'], ['boss', '那就試試看吧，小東西。']],
      clear: '冰雪開始融化，春天要來了' },
    { tag: '一切的終點',
      talk: [['boss', '你終於來了，火柴勇者。'], ['hero', '魔王，你的野心到此為止！'], ['boss', '有趣……就讓我看看你的覺悟！']],
      clear: '魔王倒下了……但黑暗似乎還沒有散去' },
  ],

  /* ---------- 特殊事件：超級女人 ----------
     打一般關卡時偶爾發生：某位夥伴被她叫走（暫時不能攻擊），她變成特殊首領登場。
     在時限內打倒她：夥伴回來，獎勵是召喚券（tickets 張）；時間到她就走掉，什麼都沒有，關卡照常繼續。
     every：兩次事件之間隔幾秒（隨機）　first：開遊戲後第一次最快幾秒
     fightSec：她的血量 = 留下來的隊伍（扣掉被叫走的夥伴）大約要打幾秒；如果這隊打一般首領本來就很久，改成一般首領 × 1.4 倍，
       所以一定比一般首領耐打，最多 time 的 65%，時限內打得完。不管叫走的是主力還是小角色，都是差不多長的一場仗
     calibSec：開打第幾秒用實際傷害校正她的血量（公式算不到轉職招式、影兵、裝備這些）
     goldMul：打倒時的金幣 = 這一關首領 × goldMul
     partner：被叫走的夥伴（要先招募才會發生；hero = 火柴勇者本人，被叫走時勇者不揮劍，點擊和技能照常）　start：登場對話（partner = 夥伴說、boss = 她說）
     taunt：戰鬥中她隨機說的話　win：打倒後夥伴說的話　lose：時間到她說的話
     造型在 img/monsters/<id>_boss_*.png（超級女人/tools/export_game.py 輸出） */
  specialEvent: { every: [240, 420], first: 90, fightSec: 36, calibSec: [6, 16], time: 60, goldMul: 1, tickets: 15 },
  specialBosses: [
    { id: 'w_ghost', name: '齜牙影鬼', event: '電話來囉', partner: 'fisher', icon: '📞', color: '#a77bff', speed: 40,
      start: [['partner', '電話來囉……我接一下。'], ['boss', '喂？怎麼這麼久才接！']],
      taunt: ['你現在在哪？', '旁邊是誰的聲音？', '嘿嘿嘿……', '說！你剛剛在幹嘛！', '不准掛電話喔～'],
      win: '呼……終於掛掉了。', lose: '晚點再打給你！' },
    { id: 'w_beetle', name: '英俊甲蟲', event: '開車載我', partner: 'cow', icon: '🚗', color: '#3fd08a', speed: 36,
      start: [['partner', '欸？又要我開車……'], ['boss', '開車載我！現在！']],
      taunt: ['前面右轉！', '開慢一點啦！', '我今天是不是很英俊？', '順便去買個飲料～', '你是不是走錯路了？'],
      win: '安全送達，請下車！', lose: '明天也要載我喔！' },
    { id: 'w_lychee', name: '多汁荔枝', event: '幫我付錢', partner: 'dog', icon: '💸', color: '#ff5a7a', speed: 44,
      start: [['partner', '等等……我的錢包呢？'], ['boss', '幫我付錢！']],
      taunt: ['這個也要！', '刷卡刷卡～', '荔枝很貴的喔！', '下次換我請（騙你的）', '還有那個、那個也要！'],
      win: '錢包……保住了。', lose: '謝謝招待～' },
    { id: 'w_mosquito', name: '厲害蚊子', event: '我要吃牛排', partner: 'hero', icon: '🥩', color: '#ff4a5a', speed: 42,
      start: [['partner', '又要吃牛排？上禮拜才吃過……'], ['boss', '我要吃牛排！五分熟！']],
      taunt: ['要加蘑菇醬喔！', '還要一杯紅酒～', '排隊也要等！', '你吃沙拉就好～', '嗡嗡嗡……肚子好餓！'],
      win: '牛排……我也想吃一口。', lose: '下次換你請我吃大餐！' },
  ],

  /* ---------- 隊伍：勇者 + 五位超級夥伴 ----------
     傷害 = dmg × 等級 × 2^(等級/25 取整)
     升級花費 = cost × growth^等級；hire 是招募價格（0 = 一開始就有） */
  // 夥伴用高畫質卡通圖（img/partners/，400×560，跟首領一樣；超級夥伴/tools/export_game.py 輸出）；網址加 ?old 可以看原本的 16×26 像素版
  hdPartners: true,
  milestone: 25,
  // 夥伴大招（地圖砲）：能量每 ultTime 秒充滿（所有人固定，轉職、升等都不影響），傷害 = 夥伴傷害 × (ultMul + 轉職階段 × 3)，打全場
  // 按鍵：Q W E R T 對應小牛、小狗、他誰、浩浩人、漁夫，Y 是勇者；開「自動施法」時滿了會自己放
  ultTime: 60,
  ultMul: 12,
  ultKeys: ['q', 'w', 'e', 'r', 't', 'y'], // 最後一個 Y 是勇者的白虎
  units: [
    { id: 'hero',   name: '火柴勇者', job: '劍士',     role: '近身連斬，可以學技能、穿裝備', color: '#ffe08a',
      dmg: 1,     rate: 1.6, hire: 0,       cost: 8,       growth: 1.12 },
    { id: 'cow',    name: '小牛先生', job: '暗影君王', color: '#9a5bff', attack: 'shadow',
      role: '影步瞬移連刺；打倒的怪會化為影之軍團',
      dmg: 4.4,   rate: 1.0, hire: 100,     cost: 45,      growth: 1.13,
      ranks: [
        { title: 'E級獵人',   desc: '影步瞬移到敵人身邊連刺' },
        { title: '暗殺者',     desc: '解鎖「起來吧！」打倒的怪會化為影兵（上限 4），影兵定時突擊' },
        { title: '影之術士',   desc: '統治者的權柄：每 3 擊用念力舉起敵人重摔；影兵上限 8' },
        { title: '死靈統帥',   desc: '每 4 擊召出暗影之手抓住敵人；影兵上限 12' },
        { title: '影之支配者', desc: '展開君王領域，影之軍團傷害 ×1.5；影兵上限 16' },
        { title: '暗影君王',   desc: '每 5 擊暗影大爆發；影兵上限 24' },
      ] },
    { id: 'dog',    name: '小狗先生', job: '災厄炎帝', color: '#ff6a2a', attack: 'fire',
      role: '火焰法師，火球一路進化成災厄隕石',
      dmg: 27,    rate: 0.9, hire: 1500,    cost: 600,     growth: 1.14,
      ranks: [
        { title: '見習火法師', desc: '丟出火球，命中爆炸' },
        { title: '火焰術士',   desc: '火球變大，每 3 發引燃地面火環' },
        { title: '爆炎魔導師', desc: '一次丟出兩顆火球' },
        { title: '煉獄大法師', desc: '每 4 發召喚煉獄火柱' },
        { title: '焚天魔導',   desc: '每 5 發捲起火焰龍捲風，持續灼燒' },
        { title: '災厄炎帝',   desc: '每 6 發降下三顆災厄隕石' },
      ] },
    { id: 'who',    name: '他誰',     job: '滅世箭神', color: '#5ef0a0', attack: 'bow',
      role: '弓箭手，箭越射越多，最後射出滅世神箭',
      dmg: 187,   rate: 1.2, hire: 25000,   cost: 9000,    growth: 1.15,
      ranks: [
        { title: '見習弓手', desc: '射出一支箭' },
        { title: '獵人',     desc: '連射兩支箭' },
        { title: '神射手',   desc: '三連發，同時射三個目標' },
        { title: '風暴遊俠', desc: '每 3 發射出貫穿全場的疾風之箭' },
        { title: '星隕箭聖', desc: '每 4 發降下箭雨' },
        { title: '滅世箭神', desc: '每 5 發射出滅世神箭，星辰墜落' },
      ] },
    { id: 'hao',    name: '浩浩人',   job: '神罰騎士', color: '#ffd23d', attack: 'holy',
      role: '聖騎士，聖光重擊一路進化成神罰天雷',
      dmg: 7900,  rate: 0.5, hire: 400000,  cost: 120000,  growth: 1.16,
      ranks: [
        { title: '見習騎士', desc: '召喚聖光重擊' },
        { title: '聖殿騎士', desc: '重擊會波及周圍敵人' },
        { title: '審判騎士', desc: '每 3 擊降下審判金雷，連鎖三隻' },
        { title: '天罰聖騎', desc: '每 4 擊召喚聖光柱，打最強的敵人' },
        { title: '光耀聖騎', desc: '背後展開聖光；每 5 擊審判全場' },
        { title: '神罰騎士', desc: '每 6 擊神罰：天雷劈向所有敵人' },
      ] },
    { id: 'fisher', name: '漁夫先生', job: '萬濤海神', color: '#3da9ff', attack: 'water', splash: 90,
      role: '擲出魚叉，最後能召喚海嘯',
      dmg: 30000, rate: 0.5, hire: 6000000, cost: 2000000, growth: 1.17,
      ranks: [
        { title: '漁夫',     desc: '擲出魚叉，水花濺射' },
        { title: '釣魚達人', desc: '每 3 叉掀起大波浪，從腳下一路衝過全場，把敵人沖退' },
        { title: '潮汐術士', desc: '一次擲出兩支魚叉' },
        { title: '怒濤領主', desc: '每 4 叉從地底噴出水柱' },
        { title: '深海霸主', desc: '每 5 叉製造漩渦，敵人變慢並持續受傷' },
        { title: '萬濤海神', desc: '每 6 叉召喚巨型海嘯，兩道巨浪接連衝過全場' },
      ] },
  ],

  /* ---------- 鬥氣：勇者等級到了就突破，傷害倍增 ---------- */
  auras: [
    { lv: 10,  name: '初階鬥氣', color: '#e8f4ff', mul: 1.5 },
    { lv: 25,  name: '青藍鬥氣', color: '#3da9ff', mul: 2 },
    { lv: 50,  name: '翠綠鬥氣', color: '#4dff9a', mul: 2 },
    { lv: 100, name: '紫電鬥氣', color: '#b46bff', mul: 2.5 },
    { lv: 200, name: '赤焰鬥氣', color: '#ff4d2e', mul: 3 },
    { lv: 350, name: '黃金鬥氣', color: '#ffd23d', mul: 4 },
    { lv: 500, name: '虹光神鬥氣', color: 'rainbow', mul: 5 },
  ],

  /* ---------- 夥伴轉職：夥伴等級到了就轉職（職業名稱在 units[].ranks），傷害再乘 mul ---------- */
  partnerAuras: [
    { lv: 25,  name: '覺醒', mul: 1.5 },
    { lv: 50,  name: '爆發', mul: 2 },
    { lv: 100, name: '極限', mul: 2 },
    { lv: 200, name: '超越', mul: 2.5 },
    { lv: 400, name: '神域', mul: 3 },
  ],

  /* ---------- 技能：用魔晶學習與升級 ----------
     傷害 = 勇者 DPS × power × (1 + 0.5 × (等級 - 1))
     冷卻 = cd × max(0.5, 1 - 0.03 × (等級 - 1))
     等級 10 覺醒：特效與傷害再加強 */
  skills: [
    { id: 'aura',    name: '鬥氣斬',   key: '1', color: '#ffe08a', cd: 8,  power: 10,  unlock: 1,  cost: 1, growth: 1.45,
      desc: '凝聚鬥氣劈出巨大劍氣，重創最前面的敵人並震傷周圍', awaken: '覺醒：劍氣變成三連斬' },
    { id: 'meteor',  name: '流星火雨', key: '2', color: '#ff7a3d', cd: 20, power: 14,  unlock: 3,  cost: 2, growth: 1.5,
      desc: '召喚隕石砸向敵群，範圍傷害', awaken: '覺醒：隕石數量加倍' },
    { id: 'thunder', name: '雷霆萬鈞', key: '3', color: '#5ad8ff', cd: 15, power: 9,   unlock: 6,  cost: 3, growth: 1.5,
      desc: '天雷同時劈中場上所有敵人', awaken: '覺醒：每隻敵人被劈兩次' },
    { id: 'frost',   name: '冰封千里', key: '4', color: '#9fe8ff', cd: 25, power: 6,   unlock: 10, cost: 4, growth: 1.55,
      desc: '冰霜新星凍結所有敵人 4 秒，凍結中受到傷害 +50%', awaken: '覺醒：冰刺從地面竄出追加傷害' },
    { id: 'holy',    name: '聖光審判', key: '5', color: '#fff1a8', cd: 30, power: 40,  unlock: 15, cost: 6, growth: 1.55,
      desc: '天降光柱，對單一最強敵人造成巨額傷害（首領優先）', awaken: '覺醒：聖光柱化為三道' },
    { id: 'void',    name: '虛空黑洞', key: '6', color: '#c86bff', cd: 45, power: 8,   unlock: 25, cost: 10, growth: 1.6,
      desc: '開啟黑洞吸住所有敵人持續造成傷害，最後引爆', awaken: '覺醒：引爆威力三倍' },
  ],

  /* ---------- 裝備 ---------- */
  slots: [
    { id: 'weapon', name: '武器', stat: 'atk',   statName: '勇者攻擊', base: 0.20 },
    { id: 'helm',   name: '頭盔', stat: 'crit',  statName: '暴擊率',   base: 0.01 },
    { id: 'armor',  name: '鎧甲', stat: 'gold',  statName: '金幣獲得', base: 0.10 },
    { id: 'cape',   name: '披風', stat: 'skill', statName: '技能傷害', base: 0.25 },
    { id: 'ring',   name: '戒指', stat: 'ally',  statName: '夥伴傷害', base: 0.15 },
  ],
  rarities: [
    { id: 0, name: '普通', color: '#b8b8b8', mul: 1,   weight: 50, bossWeight: 0 },
    { id: 1, name: '精良', color: '#5ee05e', mul: 1.8, weight: 30, bossWeight: 30 },
    { id: 2, name: '稀有', color: '#4da6ff', mul: 3,   weight: 14, bossWeight: 38 },
    { id: 3, name: '史詩', color: '#c06bff', mul: 5,   weight: 5,  bossWeight: 22 },
    { id: 4, name: '傳說', color: '#ff9a2e', mul: 8,   weight: 1,  bossWeight: 9 },
    { id: 5, name: '神話', color: '#ff3d6a', mul: 13,  weight: 0,  bossWeight: 1 },
  ],
  itemNames: {
    weapon: ['木劍', '鐵劍', '騎士長劍', '秘銀劍', '龍牙大劍', '星辰聖劍'],
    helm:   ['皮帽', '鐵盔', '角盔', '獅鷲頭盔', '龍首盔', '星冠'],
    armor:  ['布衣', '鎖子甲', '鋼鐵胸甲', '秘銀鎧甲', '龍鱗鎧', '天使聖鎧'],
    cape:   ['旅人斗篷', '獵人披風', '法師披風', '鳳凰披風', '暗夜龍翼', '銀河披風'],
    ring:   ['銅戒', '銀戒', '紅寶石戒', '月光戒指', '龍眼戒指', '永恆之戒'],
  },
  dropChance: 0.03,      // 小怪掉裝備的機率
  bagSize: 100,
  enhanceMax: 15,        // 強化上限
  enhanceStep: 0.12,     // 每強化一次 +12% 主屬性

  // 收成站
  baseCapMin: 120,
  harvesters: [
    { id: 'guild', name: '冒險者公會', res: 'gold',     desc: '其他冒險者幫你接委託，把報酬換成金幣。',
      rateOfReward: 0.15, lvlBonus: 0.5, upCost: 50,  upGrowth: 1.9, upRes: 'gold' },
    { id: 'mine',  name: '魔晶礦脈',   res: 'crystals', desc: '矮人礦工慢慢挖出魔晶，用來學技能和研究。',
      perMin: 0.25,       lvlBonus: 1,   upCost: 200, upGrowth: 2.3, upRes: 'gold' },
  ],

  /* 裝備召喚：用召喚券抽裝備，裝備等級 = 歷來最高關卡
     召喚券從首領掉：一般首領 bossTickets 張，章節首領（區域最後一關）chapterTickets 張
     weights 依照 rarities 的順序（普通、精良、稀有、史詩、傳說、神話），數字越大越容易抽到 */
  gacha: {
    bossTickets: 5,
    chapterTickets: 10,
    weights: [0, 40, 35, 18, 6, 1],
  },

  // 學院研究：用魔晶購買
  tech: [
    { id: 'power',   name: '鬥氣修煉', desc: '全隊傷害 +15%',          cost: 3, growth: 1.55, eff: 0.15, max: 999 },
    { id: 'bounty',  name: '尋寶術',   desc: '擊殺金幣 +12%',          cost: 3, growth: 1.55, eff: 0.12, max: 999 },
    { id: 'crit',    name: '弱點看破', desc: '暴擊率 +3%（3 倍傷害）', cost: 4, growth: 1.6,  eff: 0.03, max: 20 },
    { id: 'luck',    name: '幸運符文', desc: '掉寶率 +20%，稀有度提升', cost: 5, growth: 1.7,  eff: 0.2,  max: 15 },
    { id: 'storage', name: '倉庫擴建', desc: '收成上限 +2 小時',       cost: 5, growth: 1.8,  eff: 120,  max: 11 },
    { id: 'mineup',  name: '矮人鎬子', desc: '魔晶產量 +20%',          cost: 6, growth: 1.7,  eff: 0.2,  max: 999 },
  ],

};
