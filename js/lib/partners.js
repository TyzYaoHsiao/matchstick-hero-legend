/* =========================================================
   超級夥伴 — 五位夥伴的像素圖
   每個字元 = 一格像素，對應該角色的調色盤；'.' 是透明。
   所有角色都是 16 寬 × 26 高（上半身 21 列 + 腿 5 列），面朝右。

   用法（瀏覽器）：<script src="sprites.js"></script>
     SUPER_PARTNERS.list            → 五位夥伴的資料
     SUPER_PARTNERS.frame(id, pose) → 該姿勢的字元陣列（pose: idle / walk1 / walk2 / jump / charge 蓄力 / cast 出手）
     SUPER_PARTNERS.bake(id, pose, scale, flip) → 畫好的 <canvas>
   ========================================================= */
(function (root) {
  // 共用腿型：N = 褲子、n = 褲子陰影、K = 鞋子、w = 褲子側條紋（沒定義顏色就不畫）
  const LEGS = {
    idle: [
      '...NNNNNNNNNN...',
      '...NNNN..NNNN...',
      '...NNNN..NNNN...',
      '...nNNN..NNNn...',
      '..KKKKK..KKKKK..',
    ],
    walk1: [
      '...NNNNNNNNNN...',
      '..NNNN....NNNN..',
      '.NNNN......NNNN.',
      '.nNN........NNn.',
      'KKKK........KKKK',
    ],
    walk2: [
      '...NNNNNNNNNN...',
      '....NNNNNNNN....',
      '.....NNNNNN.....',
      '.....NnNNnN.....',
      '....KKKKKKKK....',
    ],
    jump: [
      '...NNNNNNNNNN...',
      '..NNNN...NNNN...',
      '..NNN....NNNNK..',
      '.KKNN.....KKK...',
      '.KK.............',
    ],
  };

  const list = [
    /* ---------- 小牛先生（沿用《小牛先生大冒險》主角） ---------- */
    {
      id: 'cow', name: '小牛先生',
      look: '黑短髮、粗框眼鏡、驚訝的嘴、米白塗鴉T恤、黑色斜背包、深藍褲子',
      pal: {
        H: '#1d1b22', S: '#f2c9a0', s: '#d9a77e',
        G: '#121214', g: '#bcd7ee', E: '#2a2a30', M: '#6e2f33',
        T: '#f4efd3', P: '#c0392b', p: '#2e6fb0',
        b: '#38383d', B: '#2a2a2e',
        N: '#3c4868', n: '#2c3550', K: '#1e1e22',
      },
      top: [
        '....HHHHHHH.....',
        '...HHHHHHHHHH...',
        '..HHHHHHHHHHHH..',
        '..HHHHHHHHHHHHH.',
        '..HHSHHHHHSHHHH.',
        '..HSSSSSSSSSSHH.',
        '..GGGGGSGGGGGSH.',
        '..GgEgGSGgEgGSs.',
        '..GGGGGSGGGGGSs.',
        '..SSSSSSSSSSSSs.',
        '...SSSSSMMSSSS..',
        '....SSSSMMSSS...',
        '.....SSSSSSS....',
        '...TTTTTTTTTb...',
        '..TTTTTTTTTbTT..',
        '.STTPPpTTTbTTTS.',
        '.STTTTTTTbTTTTS.',
        '.STBBBBBBBTTTTS.',
        '.SSBBBBBBBTTTSS.',
        '...TBBBBBBTTT...',
        '...NNNNNNNNNN...',
      ],
    },

    /* ---------- 小狗先生 ---------- */
    {
      id: 'dog', name: '小狗先生',
      look: '整齊黑短髮、藍光黑框眼鏡、圓臉笑咪咪、深藍防風外套、灰褲、黑鞋',
      pal: {
        H: '#18171c', S: '#f0c49b', s: '#d39f78',
        G: '#15161c', g: '#8fb4ff', E: '#26262c', M: '#7a2e33', W: '#ffffff',
        J: '#2f3b5c', j: '#222b45', z: '#a3acc4',
        N: '#5b5e66', n: '#46484f', K: '#151518',
      },
      top: [
        '....HHHHHHH.....',
        '...HHHHHHHHHH...',
        '..HHHHHHHHHHHH..',
        '..HHHHHHHHHHHHH.',
        '..HSHHSHHSHHSHH.',
        '..SSSSSSSSSSSSS.',
        '..GGGGGSGGGGGSs.',
        '..GgEgGSGgEgGSs.',
        '..GGGGGSGGGGGSs.',
        '.sSSSSSSSSSSSSs.',
        '..SSSMWWWWMSSSs.',
        '...SSSMMMMSSSS..',
        '....SSSSSSSS....',
        '...jJJJJzJJJj...',
        '..JJJJJJzJJJJJ..',
        '.jJJJJJJzJJJJJj.',
        '.jJJJJJJzJJJJJj.',
        '.jJJJJJJzJJJJJj.',
        '.SjJJJJJzJJJJjS.',
        '...JJJJJzJJJJ...',
        '...NNNNNNNNNN...',
      ],
    },

    /* ---------- 他誰 ---------- */
    {
      id: 'who', name: '他誰',
      look: '蓬鬆亂翹的捲髮、沒戴眼鏡、壞笑、橄欖綠飛行外套、黑色斜背包、淺色牛仔褲',
      pal: {
        H: '#1b1714', h: '#3a2e26', S: '#e9bb8f', s: '#c9976c',
        E: '#1e1a18', W: '#ffffff', M: '#7a3a34',
        O: '#5c6440', o: '#454b2f', b: '#1f1f23', B: '#2c2d33',
        N: '#8eaed4', n: '#7092bb', K: '#222226',
      },
      top: [
        '..H..HH..H......',
        '...HHHHHHHH.H...',
        '..HHhHHHHhHHH...',
        '.HHHHHHHHHHHHHH.',
        '.HHhHHHHHhHHHHH.',
        '..HHSHHSHHSHHHH.',
        '..HSEESSSSEESSs.',
        '..HSSSSSSSSSSSs.',
        '..SSEWSSSSEWSSs.',
        '..SSSSSSSSSSSSs.',
        '...SSSSSSSMMSS..',
        '....SSSSSMMSS...',
        '.....SSSSSSS....',
        '...OOOOOOOOOb...',
        '..OOOOOOOOObOO..',
        '.oOOOOOOOObOOOo.',
        '.oOOOOOOObOOOOo.',
        '.oOBBBBBBBOOOOo.',
        '.SoBBBBBBBOOOoS.',
        '...OBBBBBBOOO...',
        '...NNNNNNNNNN...',
      ],
    },

    /* ---------- 浩浩人 ---------- */
    {
      id: 'hao', name: '浩浩人',
      look: '刺刺的短髮、黑色方框眼鏡、圓臉、敞開的深藍外套裡面穿亮藍色運動衫、後背包、黑褲',
      pal: {
        H: '#26262b', h: '#4a4a52', S: '#f2c8a2', s: '#d6a57f',
        G: '#111116', g: '#dceaf3', E: '#24242a', M: '#9a4a48',
        J: '#28324f', j: '#1c2338', U: '#2a6fe8', g: '#55575f',
        N: '#272a33', n: '#1c1e25', K: '#141417',
      },
      top: [
        '....H.H.H.H.....',
        '...HhHhHhHhH....',
        '..HHHHHHHHHHHH..',
        '..HHHHHHHHHHHHH.',
        '..HHHHHHHHHHHHh.',
        '..HSSSSSSSSSSSs.',
        '..GGGGGSGGGGGSs.',
        '..GgEgGSGgEgGSs.',
        '..GGGGGSGGGGGSs.',
        '.sSSSSSSSSSSSSs.',
        '.sSSSSSSSSSSSSs.',
        '..SSSSSMMMSSSS..',
        '...SSSSSSSSSS...',
        '...JJUUUUUUJJ...',
        '..JJJUUUUUUJJJ..',
        '.jJgJUUUUUUJgJj.',
        '.jJgJUUUUUUJgJj.',
        '.jJgJUUUUUUJgJj.',
        '.SjgJUUUUUUJgjS.',
        '...JUUUUUUUUJ...',
        '...NNNNNNNNNN...',
      ],
    },

    /* ---------- 漁夫先生 ---------- */
    {
      id: 'fisher', name: '漁夫先生',
      look: '茶棕色瀏海鍋蓋頭、細框圓眼鏡、瘦高、灰色T恤配後背包、黑色白條運動褲、灰球鞋、手錶',
      pal: {
        H: '#6a4630', h: '#8a6044', S: '#f3cfab', s: '#d8ab86',
        G: '#8c7650', g: '#e6eef2', E: '#2a2420', M: '#a0524c',
        T: '#74706d', t: '#5d5957', b: '#1d1d21', W: '#c9ccd2',
        N: '#1e1f26', n: '#15161b', w: '#e9e9ee', K: '#7c8189',
      },
      top: [
        '....HHHHHHH.....',
        '...HHhHHHHHHH...',
        '..HHHHHhHHHHHH..',
        '..HHHHHHHHHHHHH.',
        '..HHHHHHHHHHHHH.',
        '..HHHSHHHHSHHHH.',
        '..HSGGGSSGGGSSs.',
        '..HGgEgGSGgEgGs.',
        '..SSGGGSSGGGSSs.',
        '..SSSSSSSSSSSSs.',
        '...SSSSSSSSSS...',
        '....SSSSMMSSS...',
        '.....SSSSSS.....',
        '...TbTTTTTTbT...',
        '..TTbTTTTTTbTT..',
        '.STTbTTTTTTbTTS.',
        '.STtTTTTTTTTtTS.',
        '.STTTTTTTTTTTTS.',
        '.SWTTTTTTTTTTSS.',
        '...TTTTTTTTTT...',
        '...NNNNNNNNNN...',
      ],
      legs: {
        idle: [
          '...NNNNNNNNNN...',
          '...NwNN..NNwN...',
          '...NwNN..NNwN...',
          '...nwNN..NNwn...',
          '..KKKKK..KKKKK..',
        ],
      },
    },
  ];

  const byId = {};
  list.forEach(p => { byId[p.id] = p; });

  /* ---------- 施法動作：蓄力 charge / 出手 cast ----------
     這兩個姿勢左右各多 2 格（寬 20），讓手可以伸出身體外。
     座標用加寬後的欄位：前手（右邊）原本在第 16 欄、後手（左邊）在第 3 欄，第 15～18 列。
     arm = 袖子的顏色字元，twoHands = 蓄力時雙手一起舉高。'_' 代表清成透明。 */
  const PAD = 2;
  const ARM = {
    cow:    { arm: 'S', fix: [[18, 15, 'T']], twoHands: true },  // 短袖，手臂是皮膚色；聖騎士雙手高舉
    dog:    { arm: 'J' },
    who:    { arm: 'O' },
    hao:    { arm: 'J' },
    fisher: { arm: 'S', fix: [[18, 15, 'T']] },
  };
  const POSE_LEGS = { charge: 'idle', cast: 'walk1' };
  function armOps(id, pose) {
    const a = ARM[id], A = a.arm, ops = (a.fix || []).slice();
    const put = (rows, cols, ch) => rows.forEach(r => cols.forEach(c => ops.push([r, c, ch])));
    if (pose === 'charge') {
      // 蓄力：前手高舉到頭旁邊，2 格粗
      put([15, 16, 17, 18], [16], '_');
      put([14, 15], [16], A);
      put([12, 13, 14, 15], [17, 18], A);
      put([9, 10, 11], [17, 18], 'S');
      if (a.twoHands) {
        put([15, 16, 17, 18], [3], '_');
        put([14, 15], [3], A);
        put([12, 13, 14, 15], [1, 2], A);
        put([9, 10, 11], [1, 2], 'S');
      }
    } else if (pose === 'cast') {
      // 出手：前手往前伸直推出去，後手往後甩
      put([16, 17, 18], [16], '_');
      put([15, 16], [16, 17], A);
      put([15, 16], [18, 19], 'S');
      put([16, 17, 18], [3], '_');
      put([15], [2, 3], A);
      put([15, 16], [0, 1], 'S');
    }
    return ops;
  }

  function frame(id, pose) {
    const p = byId[id];
    const legKey = POSE_LEGS[pose] || pose;
    const legs = (p.legs && p.legs[legKey]) || LEGS[legKey] || LEGS.idle;
    const rows = p.top.concat(legs);
    if (!POSE_LEGS[pose]) return rows;
    const pad = '.'.repeat(PAD);
    const grid = rows.map(r => (pad + r + pad).split(''));
    for (const [r, c, ch] of armOps(id, pose)) grid[r][c] = ch === '_' ? '.' : ch;
    return grid.map(r => r.join(''));
  }

  // 只在瀏覽器裡能用（需要 document）
  function bake(id, pose, scale, flip) {
    const rows = frame(id, pose || 'idle');
    const pal = byId[id].pal;
    const px = scale || 2;
    const w = rows[0].length, h = rows.length;
    const c = document.createElement('canvas');
    c.width = w * px; c.height = h * px;
    const x = c.getContext('2d');
    rows.forEach((row, j) => {
      for (let i = 0; i < w; i++) {
        const ch = row[i];
        if (ch === '.' || !pal[ch]) continue;
        x.fillStyle = pal[ch];
        x.fillRect((flip ? w - 1 - i : i) * px, j * px, px, px);
      }
    });
    return c;
  }

  root.SUPER_PARTNERS = { list, byId, frame, bake, POSES: Object.keys(LEGS).concat(['charge', 'cast']), W: 16, H: 26, CAST_W: 16 + PAD * 2 };
})(typeof window !== 'undefined' ? window : globalThis);
