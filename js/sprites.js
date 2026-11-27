/* =========================================================
   sprites.js — 像素圖：怪物、裝備圖示、夥伴（夥伴圖在 lib/partners.js）
   每個字元 = 一格像素，'.' 是透明。怪物面朝左（往勇者走）。
   ========================================================= */
(function () {
  const PX = 2; // 一格像素畫成 2×2（邏輯座標）

  /* ---------- 怪物 ---------- */
  const MON = {
    slime: {
      pal: { G: '#6fd65a', g: '#b8f5a0', d: '#3f9a3a', K: '#1a2a1a', W: '#ffffff', M: '#2a5a2a' },
      frames: [[
        '.....GGGG.....',
        '...GGgGGGGG...',
        '..GGgWGGGGGG..',
        '.GGGgGGGGGGGG.',
        '.GKKGGGKKGGGG.',
        'GGKWGGGKWGGGGG',
        'GGGGGGGGGGGGGG',
        'GGGMMMGGGGGGGG',
        'dGGGGGGGGGGGGd',
        '.dddddddddddd.',
      ]],
    },
    goblin: {
      pal: { G: '#7cc242', g: '#5a9a2e', Y: '#ffe14d', K: '#1a1a14', W: '#f4f4e8', M: '#5a1a1a', B: '#8a5a32', b: '#5e3b1e', L: '#4a3a2a', w: '#a87a4a', S: '#2a2a22' },
      frames: [[
        '.....gggg.....',
        '....gGGGGg....',
        'g..gGGGGGGg..g',
        'gGgGGGGGGGGgGg',
        '.ggGYKGGYKGgg.',
        '...GGGGGGGG...',
        '...GWMMMMWG...',
        '....GGGGGG....',
        '..bbBBBBBBbb..',
        '.GbBBBBBBBBbG.',
        'wGbBBBbbBBBbG.',
        'wwGBBBBBBBB.G.',
        'ww.BBBBBBBB...',
        'w...LLLLLL....',
        '....LL..LL....',
        '....LL..LL....',
        '...SSS..SSS...',
      ], [
        '..............',
        '.....gggg.....',
        '....gGGGGg....',
        'g..gGGGGGGg..g',
        'gGgGGGGGGGGgGg',
        '.ggGYKGGYKGgg.',
        '...GGGGGGGG...',
        '...GWMMMMWG...',
        '....GGGGGG....',
        '..bbBBBBBBbb..',
        'wGbBBBBBBBBbG.',
        'wwbBBBbbBBBbG.',
        'wwGBBBBBBBB.G.',
        'w..BBBBBBBB...',
        '...LLL..LLL...',
        '..LL......LL..',
        '.SSS......SSS.',
      ]],
    },
    bat: {
      pal: { P: '#6a3aa8', p: '#4a2478', R: '#ff3d3d', W: '#ffffff' },
      frames: [[
        'P..............P',
        'PP............PP',
        'PPP..P....P..PPP',
        'PPPP.PPPPPP.PPPP',
        '.PPPPPRPPRPPPPP.',
        '..PPPPPPPPPPPP..',
        '....PPWPPWPP....',
        '.....PPPPPP.....',
        '......P..P......',
        '................',
      ], [
        '................',
        '.....P....P.....',
        '.....PPPPPP.....',
        '....PPRPPRPP....',
        '.PPPPPPPPPPPPPP.',
        'PPPPPPWPPWPPPPPP',
        'PPP..PPPPPP..PPP',
        'PP....P..P....PP',
        'P..............P',
        '................',
      ]],
    },
    skeleton: {
      pal: { W: '#ece6d2', d: '#b8b09a', K: '#1a1418', R: '#ff3d3d', S: '#9aa6b8', s: '#5a6478' },
      frames: [[
        '...WWWWWW...',
        '..WWWWWWWW..',
        '..WKKWWKKW..',
        '..WKRWWKRW..',
        '..WWWWWWWW..',
        '...WKWKWW...',
        '....dWWd....',
        '.....WW.....',
        '..WWWWWWWW..',
        'SW.W.WW.W.W.',
        'SW.WdWWdW.W.',
        'SW.W.WW.W.W.',
        'S...WWWWW..W',
        'S....WW.....',
        's...WWWW....',
        '...WW..WW...',
        '...W....W...',
        '...W....W...',
        '..WW....WW..',
      ], [
        '............',
        '...WWWWWW...',
        '..WWWWWWWW..',
        '..WKKWWKKW..',
        '..WKRWWKRW..',
        '..WWWWWWWW..',
        '...WKWKWW...',
        '....dWWd....',
        '.....WW.....',
        'SWWWWWWWWW..',
        'SW.WdWWdW.W.',
        'SW.W.WW.W.W.',
        'S...WWWWW..W',
        'S....WW.....',
        's...WWWW....',
        '..WW....W...',
        '..W.....W...',
        '.WW.....WW..',
        '............',
      ]],
    },
    imp: {
      pal: { R: '#e8433a', r: '#a82a26', H: '#f4e0b0', Y: '#ffe14d', K: '#1a0a0a', W: '#ffffff', M: '#4a0a0a', w: '#5a1a2a', T: '#a82a26' },
      frames: [[
        '..H........H..',
        '..HH......HH..',
        '...RRRRRRRR...',
        '..RRRRRRRRRR..',
        '..RYKRRRYKRR..',
        '..RRRRRRRRRR..',
        '..RRWMMMMWRR..',
        'w..RRRRRRRR..w',
        'ww.rRRRRRRr.ww',
        'wwwRRRRRRRRwww',
        '.ww.RRRRRR.ww.',
        '....RRRRRR....',
        '....RR..RR..T.',
        '....R....R.T..',
        '...RR....RRT..',
      ], [
        '..H........H..',
        '..HH......HH..',
        '...RRRRRRRR...',
        '..RRRRRRRRRR..',
        '..RYKRRRYKRR..',
        '..RRRRRRRRRR..',
        '..RRWMMMMWRR..',
        '...RRRRRRRR...',
        '...rRRRRRRr...',
        'wwwRRRRRRRRwww',
        'www.RRRRRR.www',
        'ww..RRRRRR..ww',
        'w...RR..RR..Tw',
        '....R....R.T..',
        '...RR....RRT..',
      ]],
    },
    golem: {
      pal: { S: '#8a90a0', s: '#5e6474', L: '#b4bac8', O: '#ff9a2e', K: '#2a2a34' },
      frames: [[
        '.....SSSSSSSS.....',
        '....SLLSSSSSSS....',
        '....SOOSSSSOOS....',
        '....SSSSSSSSSS....',
        '..SSSSssSSssSSSS..',
        '.SLSSSSSSSSSSSSSS.',
        'SLSSSSSSOSSSSSSSSS',
        'SSS.SSSOOOSSSSS.SS',
        'SSS.SSSSOSSSSSS.SS',
        'SSS.sSSSSSSSSSs.SS',
        'SS..SSSSSSSSSSS..S',
        'sS..sSSSSSSSSSs..s',
        '....SSSS..SSSS....',
        '....SSSS..SSSS....',
        '...sSSSs..sSSSs...',
        '..KKKKKK..KKKKKK..',
      ]],
    },
  };

  /* ---------- 裝備圖示（10×10） M=稀有度顏色 L=亮 D=暗 ---------- */
  const ICON = {
    weapon: [
      '........WL',
      '.......WLM',
      '......WLM.',
      '.....WLM..',
      '....WLM...',
      '.Y.WLM....',
      '.YYLM.....',
      '..YY......',
      '.BYYY.....',
      'BB..Y.....',
    ],
    helm: [
      '..........',
      '...MMMM...',
      '..MLLMMM..',
      '.MLMMMMMM.',
      '.MMMMMMMM.',
      '.MKKKKKKM.',
      '.MK.KK.KM.',
      '.MM.KK.MM.',
      '..M....M..',
      '..........',
    ],
    armor: [
      '.MM....MM.',
      'MMMMYYMMMM',
      'MLMMMMMMDM',
      '.LMMMMMMD.',
      '.MMMYYMMM.',
      '.MMMMMMMD.',
      '.MMMMMMMD.',
      '.MDDDDDDD.',
      '..........',
      '..........',
    ],
    cape: [
      '..YMMMMY..',
      '..MMMMMM..',
      '.MLMMMMMM.',
      '.MLMMMMMD.',
      '.MLMMMMMD.',
      'MMLMMMMMMD',
      'MMMMMMMMMD',
      'MMMMMMMMDD',
      'MDMDMDMDMD',
      '..........',
    ],
    ring: [
      '....WL....',
      '...LMML...',
      '....MD....',
      '..YYYYYY..',
      '.YY....YY.',
      '.Y......Y.',
      '.Y......Y.',
      '.YY....YY.',
      '..YYYYYY..',
      '..........',
    ],
  };

  /* ---------- 畫圖工具 ---------- */
  function bake(rows, pal, px, flip) {
    const w = rows[0].length, h = rows.length;
    const c = document.createElement('canvas');
    c.width = w * px; c.height = h * px;
    const x = c.getContext('2d');
    rows.forEach((row, j) => {
      if (row.length !== w) console.warn('像素圖寬度不一致', row);
      for (let i = 0; i < w; i++) {
        const ch = row[i];
        if (ch === '.' || !pal[ch]) continue;
        x.fillStyle = pal[ch];
        x.fillRect((flip ? w - 1 - i : i) * px, j * px, px, px);
      }
    });
    return c;
  }
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
  };
  G.shade = shade;

  // 受傷時整隻變白
  const whiten = pal => { const o = {}; for (const k in pal) o[k] = '#ffffff'; return o; };
  const tint = (pal, col) => { const o = {}; for (const k in pal) o[k] = col; return o; };
  // 影兵：深色身體 + 一圈紫色外框（在暗的背景也看得到），原點不變（外框畫在原本的範圍內）
  function outlined(body, edge) {
    const c = document.createElement('canvas'); c.width = body.width; c.height = body.height;
    const x = c.getContext('2d');
    [[-PX, 0], [PX, 0], [0, -PX], [0, PX]].forEach(([dx, dy]) => x.drawImage(edge, dx, dy));
    x.drawImage(body, 0, 0);
    return c;
  }

  G.makeSprites = function () {
    const S = { mon: {}, monHit: {}, monShadow: {}, partner: {}, partnerShadow: {}, icons: {}, portraits: {} };
    for (const id in MON) {
      S.mon[id] = MON[id].frames.map(f => bake(f, MON[id].pal, PX));
      S.monHit[id] = MON[id].frames.map(f => bake(f, whiten(MON[id].pal), PX));
      S.monShadow[id] = MON[id].frames.map(f => outlined(bake(f, tint(MON[id].pal, '#1c0f30'), PX), bake(f, tint(MON[id].pal, '#a070ff'), PX)));
    }
    const SP = window.SUPER_PARTNERS;
    for (const p of SP.list) {
      S.partner[p.id] = {};
      for (const pose of SP.POSES) S.partner[p.id][pose] = bake(SP.frame(p.id, pose), p.pal, PX);
      S.portraits[p.id] = bake(SP.frame(p.id, 'idle'), p.pal, 3).toDataURL();
      S.partnerShadow[p.id] = bake(SP.frame(p.id, 'cast'), tint(p.pal, '#5a2a9a'), PX);
    }
    // 手的位置（相對腳底中心）：給道具、聚光、飛行道具的起點用
    S.partnerScale = 1;
    S.partnerHand = { idle: [13, -15], charge: [16, -31], cast: [19, -20] };
    S.partnerLabel = 64;
    if (G.CFG.hdPartners && !/[?&]old\b/.test(location.search)) loadHdPartners(S, SP);
    if (!/[?&]old\b/.test(location.search)) loadHdMonsters(S);
    G.SPR = S;
  };

  /* ---------- 高畫質怪物：img/monsters/<id>_<格>.png（原始檔與產生器在 ../素材大集合/怪物） ----------
     每張圖：w×h 像素，錨點 (ax, ay) = 腳底中心，disp = 在遊戲裡的高度
     載入後換掉像素怪；用 _w / _h（顯示大小）、_ax / _ay（錨點）讓畫圖和碰撞框知道大小 */
  const HD_MON = {"slime_0": {"w": 175, "h": 136, "ax": 87, "ay": 121, "disp": 30}, "slime_1": {"w": 175, "h": 136, "ax": 87, "ay": 121, "disp": 30}, "slime_2": {"w": 175, "h": 136, "ax": 87, "ay": 121, "disp": 30}, "slime_3": {"w": 175, "h": 136, "ax": 87, "ay": 121, "disp": 30}, "slime_4": {"w": 175, "h": 136, "ax": 87, "ay": 121, "disp": 30}, "slime_5": {"w": 175, "h": 136, "ax": 87, "ay": 121, "disp": 30}, "slime_boss_0": {"w": 208, "h": 196, "ax": 104, "ay": 178, "disp": 92}, "slime_boss_1": {"w": 208, "h": 196, "ax": 104, "ay": 178, "disp": 92}, "slime_boss_2": {"w": 208, "h": 196, "ax": 104, "ay": 178, "disp": 92}, "slime_boss_3": {"w": 208, "h": 196, "ax": 104, "ay": 178, "disp": 92}, "slime_boss_4": {"w": 208, "h": 196, "ax": 104, "ay": 178, "disp": 92}, "slime_boss_5": {"w": 208, "h": 196, "ax": 104, "ay": 178, "disp": 92}, "goblin_0": {"w": 165, "h": 205, "ax": 82, "ay": 196, "disp": 48}, "goblin_1": {"w": 165, "h": 205, "ax": 82, "ay": 196, "disp": 48}, "goblin_2": {"w": 165, "h": 205, "ax": 82, "ay": 196, "disp": 48}, "goblin_3": {"w": 165, "h": 205, "ax": 82, "ay": 196, "disp": 48}, "goblin_4": {"w": 165, "h": 205, "ax": 82, "ay": 196, "disp": 48}, "goblin_5": {"w": 165, "h": 205, "ax": 82, "ay": 196, "disp": 48}, "goblin_boss_0": {"w": 323, "h": 264, "ax": 162, "ay": 254, "disp": 110}, "goblin_boss_1": {"w": 323, "h": 264, "ax": 162, "ay": 254, "disp": 110}, "goblin_boss_2": {"w": 323, "h": 264, "ax": 162, "ay": 254, "disp": 110}, "goblin_boss_3": {"w": 323, "h": 264, "ax": 162, "ay": 254, "disp": 110}, "goblin_boss_4": {"w": 323, "h": 264, "ax": 162, "ay": 254, "disp": 110}, "goblin_boss_5": {"w": 323, "h": 264, "ax": 162, "ay": 254, "disp": 110}, "bat_0": {"w": 218, "h": 145, "ax": 109, "ay": 130, "disp": 30}, "bat_1": {"w": 218, "h": 145, "ax": 109, "ay": 130, "disp": 30}, "bat_2": {"w": 218, "h": 145, "ax": 109, "ay": 130, "disp": 30}, "bat_3": {"w": 218, "h": 145, "ax": 109, "ay": 130, "disp": 30}, "bat_4": {"w": 218, "h": 145, "ax": 109, "ay": 130, "disp": 30}, "bat_5": {"w": 218, "h": 145, "ax": 109, "ay": 130, "disp": 30}, "bat_boss_0": {"w": 259, "h": 178, "ax": 130, "ay": 160, "disp": 69}, "bat_boss_1": {"w": 259, "h": 178, "ax": 130, "ay": 160, "disp": 69}, "bat_boss_2": {"w": 259, "h": 178, "ax": 130, "ay": 160, "disp": 69}, "bat_boss_3": {"w": 259, "h": 178, "ax": 130, "ay": 160, "disp": 69}, "bat_boss_4": {"w": 259, "h": 178, "ax": 130, "ay": 160, "disp": 69}, "bat_boss_5": {"w": 259, "h": 178, "ax": 130, "ay": 160, "disp": 69}, "skeleton_0": {"w": 251, "h": 181, "ax": 126, "ay": 176, "disp": 54}, "skeleton_1": {"w": 251, "h": 181, "ax": 126, "ay": 176, "disp": 54}, "skeleton_2": {"w": 251, "h": 181, "ax": 126, "ay": 176, "disp": 54}, "skeleton_3": {"w": 251, "h": 181, "ax": 126, "ay": 176, "disp": 54}, "skeleton_4": {"w": 251, "h": 181, "ax": 126, "ay": 176, "disp": 54}, "skeleton_5": {"w": 251, "h": 181, "ax": 126, "ay": 176, "disp": 54}, "skeleton_boss_0": {"w": 299, "h": 248, "ax": 150, "ay": 242, "disp": 124}, "skeleton_boss_1": {"w": 299, "h": 248, "ax": 150, "ay": 242, "disp": 124}, "skeleton_boss_2": {"w": 299, "h": 248, "ax": 150, "ay": 242, "disp": 124}, "skeleton_boss_3": {"w": 299, "h": 248, "ax": 150, "ay": 242, "disp": 124}, "skeleton_boss_4": {"w": 299, "h": 248, "ax": 150, "ay": 242, "disp": 124}, "skeleton_boss_5": {"w": 299, "h": 248, "ax": 150, "ay": 242, "disp": 124}, "imp_0": {"w": 186, "h": 185, "ax": 93, "ay": 185, "disp": 44}, "imp_1": {"w": 186, "h": 185, "ax": 93, "ay": 185, "disp": 44}, "imp_2": {"w": 186, "h": 185, "ax": 93, "ay": 185, "disp": 44}, "imp_3": {"w": 186, "h": 185, "ax": 93, "ay": 185, "disp": 44}, "imp_4": {"w": 186, "h": 185, "ax": 93, "ay": 185, "disp": 44}, "imp_5": {"w": 186, "h": 185, "ax": 93, "ay": 185, "disp": 44}, "imp_boss_0": {"w": 221, "h": 269, "ax": 110, "ay": 269, "disp": 101}, "imp_boss_1": {"w": 221, "h": 269, "ax": 110, "ay": 269, "disp": 101}, "imp_boss_2": {"w": 221, "h": 269, "ax": 110, "ay": 269, "disp": 101}, "imp_boss_3": {"w": 221, "h": 269, "ax": 110, "ay": 269, "disp": 101}, "imp_boss_4": {"w": 221, "h": 269, "ax": 110, "ay": 269, "disp": 101}, "imp_boss_5": {"w": 221, "h": 269, "ax": 110, "ay": 269, "disp": 101}, "golem_0": {"w": 195, "h": 188, "ax": 97, "ay": 180, "disp": 52}, "golem_1": {"w": 195, "h": 188, "ax": 97, "ay": 180, "disp": 52}, "golem_2": {"w": 195, "h": 188, "ax": 97, "ay": 180, "disp": 52}, "golem_3": {"w": 195, "h": 188, "ax": 97, "ay": 180, "disp": 52}, "golem_4": {"w": 195, "h": 188, "ax": 97, "ay": 180, "disp": 52}, "golem_5": {"w": 195, "h": 188, "ax": 97, "ay": 180, "disp": 52}, "golem_boss_0": {"w": 232, "h": 224, "ax": 116, "ay": 214, "disp": 120}, "golem_boss_1": {"w": 232, "h": 224, "ax": 116, "ay": 214, "disp": 120}, "golem_boss_2": {"w": 232, "h": 224, "ax": 116, "ay": 214, "disp": 120}, "golem_boss_3": {"w": 232, "h": 224, "ax": 116, "ay": 214, "disp": 120}, "golem_boss_4": {"w": 232, "h": 224, "ax": 116, "ay": 214, "disp": 120}, "golem_boss_5": {"w": 232, "h": 224, "ax": 116, "ay": 214, "disp": 120}, "treant_boss_0": {"w": 244, "h": 338, "ax": 122, "ay": 324, "disp": 140}, "treant_boss_1": {"w": 244, "h": 338, "ax": 122, "ay": 324, "disp": 140}, "treant_boss_2": {"w": 244, "h": 338, "ax": 122, "ay": 324, "disp": 140}, "treant_boss_3": {"w": 244, "h": 338, "ax": 122, "ay": 324, "disp": 140}, "treant_boss_4": {"w": 244, "h": 338, "ax": 122, "ay": 324, "disp": 140}, "treant_boss_5": {"w": 244, "h": 338, "ax": 122, "ay": 324, "disp": 140}, "troll_boss_0": {"w": 222, "h": 280, "ax": 111, "ay": 239, "disp": 130}, "troll_boss_1": {"w": 222, "h": 280, "ax": 111, "ay": 239, "disp": 130}, "troll_boss_2": {"w": 222, "h": 280, "ax": 111, "ay": 239, "disp": 130}, "troll_boss_3": {"w": 222, "h": 280, "ax": 111, "ay": 239, "disp": 130}, "troll_boss_4": {"w": 222, "h": 280, "ax": 111, "ay": 239, "disp": 130}, "troll_boss_5": {"w": 222, "h": 280, "ax": 111, "ay": 239, "disp": 130}, "lich_boss_0": {"w": 239, "h": 374, "ax": 120, "ay": 374, "disp": 125}, "lich_boss_1": {"w": 239, "h": 374, "ax": 120, "ay": 374, "disp": 125}, "lich_boss_2": {"w": 239, "h": 374, "ax": 120, "ay": 374, "disp": 125}, "lich_boss_3": {"w": 239, "h": 374, "ax": 120, "ay": 374, "disp": 125}, "lich_boss_4": {"w": 239, "h": 374, "ax": 120, "ay": 374, "disp": 125}, "lich_boss_5": {"w": 239, "h": 374, "ax": 120, "ay": 374, "disp": 125}, "infernal_boss_0": {"w": 250, "h": 352, "ax": 125, "ay": 345, "disp": 140}, "infernal_boss_1": {"w": 250, "h": 352, "ax": 125, "ay": 345, "disp": 140}, "infernal_boss_2": {"w": 250, "h": 352, "ax": 125, "ay": 345, "disp": 140}, "infernal_boss_3": {"w": 250, "h": 352, "ax": 125, "ay": 345, "disp": 140}, "infernal_boss_4": {"w": 250, "h": 352, "ax": 125, "ay": 345, "disp": 140}, "infernal_boss_5": {"w": 250, "h": 352, "ax": 125, "ay": 345, "disp": 140}, "frostgiant_boss_0": {"w": 456, "h": 360, "ax": 228, "ay": 319, "disp": 145}, "frostgiant_boss_1": {"w": 456, "h": 360, "ax": 228, "ay": 319, "disp": 145}, "frostgiant_boss_2": {"w": 456, "h": 360, "ax": 228, "ay": 319, "disp": 145}, "frostgiant_boss_3": {"w": 456, "h": 360, "ax": 228, "ay": 319, "disp": 145}, "frostgiant_boss_4": {"w": 456, "h": 360, "ax": 228, "ay": 319, "disp": 145}, "frostgiant_boss_5": {"w": 456, "h": 360, "ax": 228, "ay": 319, "disp": 145}, "demonking_boss_0": {"w": 456, "h": 348, "ax": 228, "ay": 340, "disp": 140}, "demonking_boss_1": {"w": 456, "h": 348, "ax": 228, "ay": 340, "disp": 140}, "demonking_boss_2": {"w": 456, "h": 348, "ax": 228, "ay": 340, "disp": 140}, "demonking_boss_3": {"w": 456, "h": 348, "ax": 228, "ay": 340, "disp": 140}, "demonking_boss_4": {"w": 456, "h": 348, "ax": 228, "ay": 340, "disp": 140}, "demonking_boss_5": {"w": 456, "h": 348, "ax": 228, "ay": 340, "disp": 140}, "darkknight_0": {"w": 346, "h": 231, "ax": 173, "ay": 225, "disp": 58}, "darkknight_1": {"w": 346, "h": 231, "ax": 173, "ay": 225, "disp": 58}, "darkknight_2": {"w": 346, "h": 231, "ax": 173, "ay": 225, "disp": 58}, "darkknight_3": {"w": 346, "h": 231, "ax": 173, "ay": 225, "disp": 58}, "darkknight_4": {"w": 346, "h": 231, "ax": 173, "ay": 225, "disp": 58}, "darkknight_5": {"w": 346, "h": 231, "ax": 173, "ay": 225, "disp": 58}, "darkknight_boss_0": {"w": 412, "h": 294, "ax": 206, "ay": 287, "disp": 133}, "darkknight_boss_1": {"w": 412, "h": 294, "ax": 206, "ay": 287, "disp": 133}, "darkknight_boss_2": {"w": 412, "h": 294, "ax": 206, "ay": 287, "disp": 133}, "darkknight_boss_3": {"w": 412, "h": 294, "ax": 206, "ay": 287, "disp": 133}, "darkknight_boss_4": {"w": 412, "h": 294, "ax": 206, "ay": 287, "disp": 133}, "darkknight_boss_5": {"w": 412, "h": 294, "ax": 206, "ay": 287, "disp": 133}, "dwarf_0": {"w": 287, "h": 213, "ax": 144, "ay": 202, "disp": 42}, "dwarf_1": {"w": 287, "h": 213, "ax": 144, "ay": 202, "disp": 42}, "dwarf_2": {"w": 287, "h": 213, "ax": 144, "ay": 202, "disp": 42}, "dwarf_3": {"w": 287, "h": 213, "ax": 144, "ay": 202, "disp": 42}, "dwarf_4": {"w": 287, "h": 213, "ax": 144, "ay": 202, "disp": 42}, "dwarf_5": {"w": 287, "h": 213, "ax": 144, "ay": 202, "disp": 42}, "dwarf_boss_0": {"w": 342, "h": 256, "ax": 171, "ay": 244, "disp": 97}, "dwarf_boss_1": {"w": 342, "h": 256, "ax": 171, "ay": 244, "disp": 97}, "dwarf_boss_2": {"w": 342, "h": 256, "ax": 171, "ay": 244, "disp": 97}, "dwarf_boss_3": {"w": 342, "h": 256, "ax": 171, "ay": 244, "disp": 97}, "dwarf_boss_4": {"w": 342, "h": 256, "ax": 171, "ay": 244, "disp": 97}, "dwarf_boss_5": {"w": 342, "h": 256, "ax": 171, "ay": 244, "disp": 97}, "gargoyle_0": {"w": 202, "h": 160, "ax": 101, "ay": 160, "disp": 42}, "gargoyle_1": {"w": 202, "h": 160, "ax": 101, "ay": 160, "disp": 42}, "gargoyle_2": {"w": 202, "h": 160, "ax": 101, "ay": 160, "disp": 42}, "gargoyle_3": {"w": 202, "h": 160, "ax": 101, "ay": 160, "disp": 42}, "gargoyle_4": {"w": 202, "h": 160, "ax": 101, "ay": 160, "disp": 42}, "gargoyle_5": {"w": 202, "h": 160, "ax": 101, "ay": 160, "disp": 42}, "gargoyle_boss_0": {"w": 241, "h": 192, "ax": 120, "ay": 192, "disp": 97}, "gargoyle_boss_1": {"w": 241, "h": 192, "ax": 120, "ay": 192, "disp": 97}, "gargoyle_boss_2": {"w": 241, "h": 192, "ax": 120, "ay": 192, "disp": 97}, "gargoyle_boss_3": {"w": 241, "h": 192, "ax": 120, "ay": 192, "disp": 97}, "gargoyle_boss_4": {"w": 241, "h": 192, "ax": 120, "ay": 192, "disp": 97}, "gargoyle_boss_5": {"w": 241, "h": 192, "ax": 120, "ay": 192, "disp": 97}, "ghost_0": {"w": 199, "h": 168, "ax": 100, "ay": 158, "disp": 42}, "ghost_1": {"w": 199, "h": 168, "ax": 100, "ay": 158, "disp": 42}, "ghost_2": {"w": 199, "h": 168, "ax": 100, "ay": 158, "disp": 42}, "ghost_3": {"w": 199, "h": 168, "ax": 100, "ay": 158, "disp": 42}, "ghost_4": {"w": 199, "h": 168, "ax": 100, "ay": 158, "disp": 42}, "ghost_5": {"w": 199, "h": 168, "ax": 100, "ay": 158, "disp": 42}, "ghost_boss_0": {"w": 237, "h": 228, "ax": 118, "ay": 216, "disp": 97}, "ghost_boss_1": {"w": 237, "h": 228, "ax": 118, "ay": 216, "disp": 97}, "ghost_boss_2": {"w": 237, "h": 228, "ax": 118, "ay": 216, "disp": 97}, "ghost_boss_3": {"w": 237, "h": 228, "ax": 118, "ay": 216, "disp": 97}, "ghost_boss_4": {"w": 237, "h": 228, "ax": 118, "ay": 216, "disp": 97}, "ghost_boss_5": {"w": 237, "h": 228, "ax": 118, "ay": 216, "disp": 97}, "icesprite_0": {"w": 186, "h": 195, "ax": 93, "ay": 195, "disp": 42}, "icesprite_1": {"w": 186, "h": 195, "ax": 93, "ay": 195, "disp": 42}, "icesprite_2": {"w": 186, "h": 195, "ax": 93, "ay": 195, "disp": 42}, "icesprite_3": {"w": 186, "h": 195, "ax": 93, "ay": 195, "disp": 42}, "icesprite_4": {"w": 186, "h": 195, "ax": 93, "ay": 195, "disp": 42}, "icesprite_5": {"w": 186, "h": 195, "ax": 93, "ay": 195, "disp": 42}, "icesprite_boss_0": {"w": 222, "h": 243, "ax": 111, "ay": 243, "disp": 97}, "icesprite_boss_1": {"w": 222, "h": 243, "ax": 111, "ay": 243, "disp": 97}, "icesprite_boss_2": {"w": 222, "h": 243, "ax": 111, "ay": 243, "disp": 97}, "icesprite_boss_3": {"w": 222, "h": 243, "ax": 111, "ay": 243, "disp": 97}, "icesprite_boss_4": {"w": 222, "h": 243, "ax": 111, "ay": 243, "disp": 97}, "icesprite_boss_5": {"w": 222, "h": 243, "ax": 111, "ay": 243, "disp": 97}, "mushroom_0": {"w": 170, "h": 198, "ax": 85, "ay": 191, "disp": 36}, "mushroom_1": {"w": 170, "h": 198, "ax": 85, "ay": 191, "disp": 36}, "mushroom_2": {"w": 170, "h": 198, "ax": 85, "ay": 191, "disp": 36}, "mushroom_3": {"w": 170, "h": 198, "ax": 85, "ay": 191, "disp": 36}, "mushroom_4": {"w": 170, "h": 198, "ax": 85, "ay": 191, "disp": 36}, "mushroom_5": {"w": 170, "h": 198, "ax": 85, "ay": 191, "disp": 36}, "mushroom_boss_0": {"w": 202, "h": 236, "ax": 101, "ay": 228, "disp": 83}, "mushroom_boss_1": {"w": 202, "h": 236, "ax": 101, "ay": 228, "disp": 83}, "mushroom_boss_2": {"w": 202, "h": 236, "ax": 101, "ay": 228, "disp": 83}, "mushroom_boss_3": {"w": 202, "h": 236, "ax": 101, "ay": 228, "disp": 83}, "mushroom_boss_4": {"w": 202, "h": 236, "ax": 101, "ay": 228, "disp": 83}, "mushroom_boss_5": {"w": 202, "h": 236, "ax": 101, "ay": 228, "disp": 83}, "orc_0": {"w": 240, "h": 242, "ax": 120, "ay": 232, "disp": 58}, "orc_1": {"w": 240, "h": 242, "ax": 120, "ay": 232, "disp": 58}, "orc_2": {"w": 240, "h": 242, "ax": 120, "ay": 232, "disp": 58}, "orc_3": {"w": 240, "h": 242, "ax": 120, "ay": 232, "disp": 58}, "orc_4": {"w": 240, "h": 242, "ax": 120, "ay": 232, "disp": 58}, "orc_5": {"w": 240, "h": 242, "ax": 120, "ay": 232, "disp": 58}, "orc_boss_0": {"w": 286, "h": 298, "ax": 143, "ay": 286, "disp": 133}, "orc_boss_1": {"w": 286, "h": 298, "ax": 143, "ay": 286, "disp": 133}, "orc_boss_2": {"w": 286, "h": 298, "ax": 143, "ay": 286, "disp": 133}, "orc_boss_3": {"w": 286, "h": 298, "ax": 143, "ay": 286, "disp": 133}, "orc_boss_4": {"w": 286, "h": 298, "ax": 143, "ay": 286, "disp": 133}, "orc_boss_5": {"w": 286, "h": 298, "ax": 143, "ay": 286, "disp": 133}, "salamander_0": {"w": 256, "h": 127, "ax": 128, "ay": 122, "disp": 30}, "salamander_1": {"w": 256, "h": 127, "ax": 128, "ay": 122, "disp": 30}, "salamander_2": {"w": 256, "h": 127, "ax": 128, "ay": 122, "disp": 30}, "salamander_3": {"w": 256, "h": 127, "ax": 128, "ay": 122, "disp": 30}, "salamander_4": {"w": 256, "h": 127, "ax": 128, "ay": 122, "disp": 30}, "salamander_5": {"w": 256, "h": 127, "ax": 128, "ay": 122, "disp": 30}, "salamander_boss_0": {"w": 305, "h": 152, "ax": 152, "ay": 146, "disp": 69}, "salamander_boss_1": {"w": 305, "h": 152, "ax": 152, "ay": 146, "disp": 69}, "salamander_boss_2": {"w": 305, "h": 152, "ax": 152, "ay": 146, "disp": 69}, "salamander_boss_3": {"w": 305, "h": 152, "ax": 152, "ay": 146, "disp": 69}, "salamander_boss_4": {"w": 305, "h": 152, "ax": 152, "ay": 146, "disp": 69}, "salamander_boss_5": {"w": 305, "h": 152, "ax": 152, "ay": 146, "disp": 69}, "spider_0": {"w": 181, "h": 114, "ax": 91, "ay": 102, "disp": 30}, "spider_1": {"w": 181, "h": 114, "ax": 91, "ay": 102, "disp": 30}, "spider_2": {"w": 181, "h": 114, "ax": 91, "ay": 102, "disp": 30}, "spider_3": {"w": 181, "h": 114, "ax": 91, "ay": 102, "disp": 30}, "spider_4": {"w": 181, "h": 114, "ax": 91, "ay": 102, "disp": 30}, "spider_5": {"w": 181, "h": 114, "ax": 91, "ay": 102, "disp": 30}, "spider_boss_0": {"w": 216, "h": 136, "ax": 108, "ay": 121, "disp": 69}, "spider_boss_1": {"w": 216, "h": 136, "ax": 108, "ay": 121, "disp": 69}, "spider_boss_2": {"w": 216, "h": 136, "ax": 108, "ay": 121, "disp": 69}, "spider_boss_3": {"w": 216, "h": 136, "ax": 108, "ay": 121, "disp": 69}, "spider_boss_4": {"w": 216, "h": 136, "ax": 108, "ay": 121, "disp": 69}, "spider_boss_5": {"w": 216, "h": 136, "ax": 108, "ay": 121, "disp": 69}, "wolf_0": {"w": 221, "h": 134, "ax": 110, "ay": 130, "disp": 34}, "wolf_1": {"w": 221, "h": 134, "ax": 110, "ay": 130, "disp": 34}, "wolf_2": {"w": 221, "h": 134, "ax": 110, "ay": 130, "disp": 34}, "wolf_3": {"w": 221, "h": 134, "ax": 110, "ay": 130, "disp": 34}, "wolf_4": {"w": 221, "h": 134, "ax": 110, "ay": 130, "disp": 34}, "wolf_5": {"w": 221, "h": 134, "ax": 110, "ay": 130, "disp": 34}, "wolf_boss_0": {"w": 263, "h": 160, "ax": 132, "ay": 155, "disp": 78}, "wolf_boss_1": {"w": 263, "h": 160, "ax": 132, "ay": 155, "disp": 78}, "wolf_boss_2": {"w": 263, "h": 160, "ax": 132, "ay": 155, "disp": 78}, "wolf_boss_3": {"w": 263, "h": 160, "ax": 132, "ay": 155, "disp": 78}, "wolf_boss_4": {"w": 263, "h": 160, "ax": 132, "ay": 155, "disp": 78}, "wolf_boss_5": {"w": 263, "h": 160, "ax": 132, "ay": 155, "disp": 78}, "yeti_0": {"w": 176, "h": 213, "ax": 88, "ay": 203, "disp": 58}, "yeti_1": {"w": 176, "h": 213, "ax": 88, "ay": 203, "disp": 58}, "yeti_2": {"w": 176, "h": 213, "ax": 88, "ay": 203, "disp": 58}, "yeti_3": {"w": 176, "h": 213, "ax": 88, "ay": 203, "disp": 58}, "yeti_4": {"w": 176, "h": 213, "ax": 88, "ay": 203, "disp": 58}, "yeti_5": {"w": 176, "h": 213, "ax": 88, "ay": 203, "disp": 58}, "yeti_boss_0": {"w": 210, "h": 259, "ax": 105, "ay": 247, "disp": 133}, "yeti_boss_1": {"w": 210, "h": 259, "ax": 105, "ay": 247, "disp": 133}, "yeti_boss_2": {"w": 210, "h": 259, "ax": 105, "ay": 247, "disp": 133}, "yeti_boss_3": {"w": 210, "h": 259, "ax": 105, "ay": 247, "disp": 133}, "yeti_boss_4": {"w": 210, "h": 259, "ax": 105, "ay": 247, "disp": 133}, "yeti_boss_5": {"w": 210, "h": 259, "ax": 105, "ay": 247, "disp": 133}};
  // 特殊事件的超級女人（超級女人/tools/export_game.py 自動更新這一行）
  const HD_WOMEN = {"w_ghost_boss_0": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_ghost_boss_1": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_ghost_boss_2": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_ghost_boss_3": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_ghost_boss_4": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_ghost_boss_5": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_beetle_boss_0": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_beetle_boss_1": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_beetle_boss_2": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_beetle_boss_3": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_beetle_boss_4": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_beetle_boss_5": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_lychee_boss_0": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_lychee_boss_1": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_lychee_boss_2": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_lychee_boss_3": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_lychee_boss_4": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_lychee_boss_5": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_mosquito_boss_0": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_mosquito_boss_1": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_mosquito_boss_2": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_mosquito_boss_3": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_mosquito_boss_4": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}, "w_mosquito_boss_5": {"w": 200, "h": 280, "ax": 100, "ay": 272, "disp": 190}};
  Object.assign(HD_MON, HD_WOMEN);
  function hdCanvas(src, w, h, fn) { // 跟原圖一樣大的畫布，fn 在上面加工
    const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), src); return c;
  }
  function silhouette(img, col) { return hdCanvas(img, img.width, img.height, (x, s) => { x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, img.width, img.height); }); }
  function loadHdMonsters(S) {
    S.boss = S.boss || {}; S.bossHit = S.bossHit || {};
    // 載入一組（一般或首領）：全部格數都載好才一起換上，動畫不會缺格
    function loadSet(id, key, done) {
      const n = Object.keys(HD_MON).filter(k => new RegExp(`^${key}_\\d+$`).test(k)).length, frames = [];
      for (let k = 0; k < n; k++) {
        const m = HD_MON[`${key}_${k}`], img = new Image();
        img.onload = () => {
          const sc = m.disp / m.h, tag = c => Object.assign(c, { _w: m.w * sc, _h: m.h * sc, _ax: m.ax * sc, _ay: m.ay * sc, _hd: true });
          const hit = silhouette(img, '#ffffff');
          // 影兵：深色身體 + 一圈紫色外框
          const edge = silhouette(img, '#a070ff'), pad = Math.max(3, Math.round(img.height * 0.025));
          const shadow = hdCanvas(img, img.width, img.height, x => {
            for (const [dx, dy] of [[-pad, 0], [pad, 0], [0, -pad], [0, pad], [-pad, -pad], [pad, pad], [-pad, pad], [pad, -pad]]) x.drawImage(edge, dx, dy);
            x.drawImage(silhouette(img, '#1c0f30'), 0, 0);
          });
          frames[k] = { img: tag(img), hit: tag(hit), shadow: tag(shadow) };
          if (frames.filter(Boolean).length === n) done(frames);
        };
        img.src = `img/monsters/${key}_${k}.png`;
      }
    }
    const ids = new Set([...Object.keys(MON), ...G.CFG.monsters.map(m => m.id)]); // 第二批小怪只有高畫質圖
    for (const id of ids) {
      loadSet(id, id, f => { S.mon[id] = f.map(q => q.img); S.monHit[id] = f.map(q => q.hit); S.monShadow[id] = f.map(q => q.shadow); });
      loadSet(id, id + '_boss', f => { S.boss[id] = f.map(q => q.img); S.bossHit[id] = f.map(q => q.hit); });
    }
    // 特殊事件的超級女人：只有首領版
    for (const sb of G.CFG.specialBosses || []) loadSet(sb.id, sb.id + '_boss', f => { S.boss[sb.id] = f.map(q => q.img); S.bossHit[sb.id] = f.map(q => q.hit); });
    // 區域霸主：只有首領版；被小牛收服時的影兵用同一張圖、縮小成一般怪的大小
    for (const zb of G.CFG.zoneBosses || []) {
      const id = zb.id;
      loadSet(id, id + '_boss', f => {
        S.boss[id] = f.map(q => q.img); S.bossHit[id] = f.map(q => q.hit);
        S.monShadow[id] = f.map(q => {
          const c = q.shadow, k = 56 / c._h, out = document.createElement('canvas');
          out.width = c.width; out.height = c.height; out.getContext('2d').drawImage(c, 0, 0);
          return Object.assign(out, { _hd: true, _w: c._w * k, _h: 56, _ax: c._ax * k, _ay: c._ay * k });
        });
      });
    }
  }


  /* ---------- 高畫質夥伴：img/partners/<id>_<動作>.png（超級夥伴/tools/export_game.py 輸出的卡通版 400×560，跟首領一樣是高畫質） ---------- */
  function loadHdPartners(S, SP) {
    S.partnerScale = 0.125;                                        // 400×560 畫成 50×70（跟以前的像素版一樣大）
    S.partnerHand = { idle: [13, -14], charge: [17, -37], cast: [21, -27] };
    S.partnerLabel = 78;
    for (const p of SP.list) {
      S.portraits[p.id] = `img/partners/${p.id}_idle.png`;
      for (const pose of ['idle', 'charge', 'cast']) {
        const img = new Image();
        img.onload = () => {
          S.partner[p.id][pose] = img;
          if (pose === 'cast') { // 影步的殘影：整張染成紫色
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const x = c.getContext('2d');
            x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#5a2a9a'; x.fillRect(0, 0, c.width, c.height);
            S.partnerShadow[p.id] = c;
          }
        };
        img.src = `img/partners/${p.id}_${pose}.png`;
      }
    }
  }

  // 裝備圖示（依部位 + 稀有度上色），回傳 dataURL
  G.itemIcon = function (slot, rar) {
    const key = slot + rar;
    if (G.SPR.icons[key]) return G.SPR.icons[key];
    const col = G.CFG.rarities[rar].color;
    const pal = { M: col, L: shade(col, 0.5), D: shade(col, -0.45), K: '#1a1420', W: '#ffffff', Y: '#e8b84a', B: '#7a4a2a' };
    if (slot === 'weapon' && rar === 0) { pal.M = '#a87a4a'; pal.L = '#d8b48a'; pal.W = '#e8d0a8'; } // 木劍
    return (G.SPR.icons[key] = bake(ICON[slot], pal, 4).toDataURL());
  };

  // 勇者頭像（火柴人）
  G.heroPortrait = function () {
    if (G.SPR.heroPortrait) return G.SPR.heroPortrait;
    const c = document.createElement('canvas'); c.width = 48; c.height = 78;
    const x = c.getContext('2d');
    x.strokeStyle = '#f4f0e6'; x.lineWidth = 4; x.lineCap = 'round';
    x.beginPath(); x.arc(24, 14, 9, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(24, 23); x.lineTo(24, 50); x.moveTo(24, 50); x.lineTo(14, 74); x.moveTo(24, 50); x.lineTo(34, 74);
    x.moveTo(24, 30); x.lineTo(12, 44); x.moveTo(24, 30); x.lineTo(38, 36); x.stroke();
    x.strokeStyle = '#cfe4ff'; x.lineWidth = 3; x.beginPath(); x.moveTo(38, 36); x.lineTo(46, 6); x.stroke();
    return (G.SPR.heroPortrait = c.toDataURL());
  };
})();
