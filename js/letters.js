/* ============================================================
   四十号邮局 · 主逻辑
   ============================================================
   分三层，从上往下读：
     1. 存储层 store —— 负责「信存到哪去」，两种实现：
        · Supabase（js/config.js 里填了 key）
        · localStorage（没填 key 时自动降级，用来演示和录视频）
     2. 渲染层 —— 把信画成信纸、把邮票画出来
     3. 交互层 —— 点信箱、写信、点赞、回复

   安全性：所有用户输入在拼 HTML 前都过 esc()，不会被执行成代码。
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.PO_CONFIG || {};
  var BOXES = window.PO_MAILBOXES || [];
  var SENS = window.PO_SENSITIVE || { check: function () { return []; }, mask: function (s) { return s; } };

  var LS_KEY = 'po_letters_v1';
  var LS_LIKE = 'po_liked_v1';

  var els = {};
  var state = { box: null, letters: [], replies: {} };
  var db = null;
  var DEMO = true;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var statsReady = false;    // 第一批信加载完了没
  var statsPlayed = false;   // 这一轮进「看信」页，数字滚过没有
  var deskDismissed = false; // 用户点过「收起」，就别再自动展开拆信台

  /* ============================================================
     1. 存储层
     ============================================================ */

  function initBackend() {
    var hasKey = CFG.supabaseUrl && CFG.supabaseKey && CFG.supabaseUrl.indexOf('https://') === 0;
    if (hasKey && typeof window.supabase !== 'undefined') {
      try {
        db = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
        DEMO = false;
      } catch (e) {
        DEMO = true;
      }
    }
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function writeLocal(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function newId() {
    return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var store = {
    /** 取全部信件（含回复），按时间从新到旧 */
    list: function (cb) {
      if (DEMO) {
        var all = readLocal().sort(function (a, b) {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        return cb(all, null);
      }
      db.from('letters')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
        .then(function (res) { cb(res.data || [], res.error); });
    },

    /** 投一封信 */
    send: function (payload, cb) {
      var row = {
        mailbox: payload.box,
        author_name: payload.name,
        grad_year: payload.year || null,
        content: payload.content,
        parent_id: null,
        likes: 0,
        created_at: new Date().toISOString()
      };
      if (DEMO) {
        row.id = newId();
        var list = readLocal();
        list.unshift(row);
        writeLocal(list);
        return cb(row, null);
      }
      db.from('letters').insert([row]).select().single()
        .then(function (res) { cb(res.data, res.error); });
    },

    /** 回复一封信 */
    reply: function (payload, cb) {
      var row = {
        mailbox: payload.box,
        author_name: payload.name || '匿名校友',
        grad_year: null,
        content: payload.content,
        parent_id: payload.parentId,
        likes: 0,
        created_at: new Date().toISOString()
      };
      if (DEMO) {
        row.id = newId();
        var list = readLocal();
        list.unshift(row);
        writeLocal(list);
        return cb(row, null);
      }
      db.from('letters').insert([row]).select().single()
        .then(function (res) { cb(res.data, res.error); });
    },

    /** 点赞：真实库走 rpc，本地模式直接 +1 */
    like: function (id, cb) {
      if (DEMO) {
        var list = readLocal();
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) { list[i].likes = (list[i].likes || 0) + 1; break; }
        }
        writeLocal(list);
        return cb(null);
      }
      db.rpc('like_letter', { letter_id: id }).then(function (res) { cb(res.error); });
    }
  };

  function likedSet() {
    try { return JSON.parse(localStorage.getItem(LS_LIKE) || '{}'); }
    catch (e) { return {}; }
  }

  function markLiked(id) {
    var s = likedSet();
    s[id] = 1;
    try { localStorage.setItem(LS_LIKE, JSON.stringify(s)); } catch (e) {}
  }

  /* ============================================================
     2. 工具
     ============================================================ */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function boxById(id) {
    for (var i = 0; i < BOXES.length; i++) if (BOXES[i].id === id) return BOXES[i];
    return null;
  }

  /** 这一年入学的人属于哪个信箱。落在空档里就返回 null（配置改了 range 时会露出来） */
  function boxOfYear(y) {
    for (var i = 0; i < BOXES.length; i++) {
      var r = BOXES[i].range;
      if (r && y >= r[0] && y <= r[1]) return BOXES[i];
    }
    return null;
  }

  /** 这一格是不是不收「入学年份」的（教职工信箱） */
  function isNoYear(b) {
    return !!(b && b.noYear);
  }

  /** 信上那行年份：学生是「2019 级」，教职工是「2019 年任教」 */
  function yearText(l) {
    if (!l || !l.grad_year) return '';
    return l.grad_year + (isNoYear(boxById(l.mailbox)) ? ' 年任教' : ' 级');
  }

  function stampNo(id) {
    var n = String(id || '').replace(/\D/g, '').slice(-6);
    if (!n) n = String(Date.now()).slice(-6);
    return 'NO.40-' + n;
  }

  function todayText() {
    var d = new Date();
    var p = function (x) { return x < 10 ? '0' + x : '' + x; };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  }

  /* ============================================================
     2.5 邮票：一箱一版的配色
     ------------------------------------------------------------
     每格信箱在 js/config.js 里带一套 stamp 配色（纸底 / 正文字色 /
     面值色 / 外框色），这里只负责「取出来 + 兜底」。
     页面上的票和导出的 PNG 都从 palOf() 拿颜色，改配置两边一起变。 */
  var GOLD = makePal(window.PO_GOLD_STAMP || { paper: '#FBF4E2', ink: '#7A5A16', accent: '#C8A02A', edge: '#E3CFA0' });

  /* '#2F4858' + 0.3 → 'rgba(47,72,88,0.3)'：颜色配置只写六位十六进制，
     需要半透明时在这里换算，样式表和 canvas 用的是同一个结果 */
  function hexA(hex, a) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return 'rgba(0,0,0,' + a + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* 两个十六进制色按 t 混合：t=0 全是 a，t=1 全是 b */
  function mixHex(a, b, t) {
    var na = parseInt(String(a).replace('#', ''), 16);
    var nb = parseInt(String(b).replace('#', ''), 16);
    if (isNaN(na) || isNaN(nb)) return a;
    function ch(n, sh) { return (n >> sh) & 255; }
    var r = Math.round(ch(na, 16) * (1 - t) + ch(nb, 16) * t);
    var gg = Math.round(ch(na, 8) * (1 - t) + ch(nb, 8) * t);
    var bl = Math.round(ch(na, 0) * (1 - t) + ch(nb, 0) * t);
    return '#' + ((1 << 24) + (r << 16) + (gg << 8) + bl).toString(16).slice(1);
  }

  /* 配置里只写四个色，其余两个派生色在这里现算。
     六格信箱和特别版都走这一条 —— 以前特别版是把 PO_GOLD_STAMP 整个当 pal 用，
     deep / stain 是空的：年份那行在页面上直接跳过赋值，导出时 canvas 里
     fillStyle = undefined 不报错、就吃住了上一次留下的颜色，看着像是「有颜色」，
     其实那颜色跟这张票没关系。config 里少写一个字段，两边就各错各的。 */
  function makePal(p) {
    p = p || {};
    var accent = p.accent || '#B03A2E';
    var ink = p.ink || '#1A3A6B';
    var paper = p.paper || '#F6F2E6';
    return {
      paper:  paper,
      ink:    ink,
      accent: accent,
      edge:   p.edge || '#D8D1BC',
      /* 右上角那行年代用 accent，但金 #D08A2C 压在旧纸黄上几乎读不出来，
         所以往墨色里压一档单独出一个 deep —— 它是要被人读的，不是装饰 */
      deep:   mixHex(accent, ink, 0.62),
      /* 邮戳的颜色。不能直接抄 deep：deep 是往墨里压了六成，蓝图那张会压成深藏青，
         盖在蓝纸上就看不见了。只压三成，红戳还是红的，金戳压成赭黄 —— 压在旧纸上
         都还读得出来，这才是邮戳该有的样子 */
      post:   mixHex(accent, ink, 0.3),
      /* 水渍与纤维的颜色。不能写死成褐色：蓝纸上落褐渍就成了一块脏，
         所以按「纸色混墨」现算 —— 蓝纸出灰蓝，绿纸出灰绿 */
      stain:  mixHex(paper, ink, 0.34),
      /* 纸「旧」到什么程度，一处系数管三样：水渍浓度、纸纤维的深浅、四边压暗。
         六张常用票是被翻过很多年的信纸，写 1；特别版那张是当天盖戳的新封，
         在 config 里调到 0.45 左右 */
      age:    typeof p.age === 'number' ? p.age : 1
    };
  }

  /* 一张票的「版面」—— 纸色、字色、花稿，从六版里抽一版。
     原来版面是跟信箱绑死的：投进壹格就一定是牛皮黄配梧桐，一墙信看下来
     一半是同款。现在按信件 id 抽，六种旧纸随机落到每一封上。

     种子只取 id，不掺 Math.random：刷新、点个赞、重新打开，还是同一张票。
     要是每次渲染都重抽，墙会像被人整面撕下来重贴，点开的那张也会变样。

     文字部分（右上年代、第几辑、邮戳里的印文）仍然跟着信箱 ——
     那是这封信投进哪一格的事实，不能随机。 */
  function decoOf(row) {
    var b = boxById(row && row.mailbox);
    if (window.PO_STAMP_RANDOM === false) return b;
    var pool = [];
    for (var i = 0; i < BOXES.length; i++) if (BOXES[i].stamp) pool.push(BOXES[i]);
    if (!pool.length) return b;
    var h = hashId(String((row && row.id) || '') + '|deco');
    return pool[Math.floor(spread(h, 9) * pool.length) % pool.length];
  }

  function palOf(row) {
    var d = decoOf(row);
    return makePal(d && d.stamp);
  }

  /* 票面手绘花稿：config 里 b.art 指到 images/stamps/ 下的白底图。
     页面里当 <img> 铺在插画层，导出 PNG 时用同一张画进位图，
     两边都靠 multiply 让白底吃进纸色。图没加载好就退回程序线稿，不会开天窗 */
  var ART_CACHE = {};

  function preloadArt() {
    for (var i = 0; i < BOXES.length; i++) {
      var b = BOXES[i];
      if (!b.art || ART_CACHE[b.art]) continue;
      var img = new Image();
      img.src = b.art;
      ART_CACHE[b.art] = img;
    }
  }

  function artOf(boxId) {
    var b = boxById(boxId);
    var img = b && b.art ? ART_CACHE[b.art] : null;
    return img && img.complete && img.naturalWidth ? img : null;
  }

  /* 花稿在票面上的落位：每格一个 [x, y, 边长]，写在 js/config.js 的 artBox 里，
     按各自花稿的形状摆（桂花是右上角垂下来的枝，花瓶是竖长条，横向那团就靠右压底）。
     这里只是没配 artBox 时的兜底，跟 .po-stamp-card.has-art .po-stamp-art 的默认值对齐。
     图都是 900 × 900 正方形，所以只给边长——画等比铺满这个方块，超出纸边的部分裁掉。 */
  var ART_BOX_FALLBACK = [296, 104, 268];

  function artBoxOf(b) {
    var a = (b && b.artBox) || ART_BOX_FALLBACK;
    return { x: a[0], y: a[1], w: a[2], h: a[2] };
  }

  /** 这封信是它那一格里的第几封（只数主信，回复不占号） */
  function stampRank(row) {
    if (!row || !row.created_at) return 1;
    var t = new Date(row.created_at).getTime();
    var n = 0;
    for (var i = 0; i < state.letters.length; i++) {
      var l = state.letters[i];
      if (l.parent_id || l.mailbox !== row.mailbox) continue;
      if (new Date(l.created_at).getTime() <= t) n++;
    }
    return n || 1;
  }

  /** 首日封 / 第 40 封 / 第 100 封 → 烫金特别版 */
  function isSpecialStamp(row) {
    var r = stampRank(row);
    return r === 1 || r === 40 || r === 100;
  }

  function specialLabel(row) {
    var r = stampRank(row);
    if (r === 40) return '第 40 封';
    if (r === 100) return '第 100 封';
    return '首日封';
  }

  /* ---------- 纸底的水彩晕染 ----------
     票面在页面上是 CSS 画的、导出时是 canvas 画的，两边必须是同一张脸，
     所以晕染的位置只写这一份（0–1 的归一化坐标），各自按自己的方式铺一遍。
     只铺「几团很淡的暖白 + 一点旧纸黄」，不做浓墨——邮戳和正文还要压在它上面。
     纯白（255,255,255）会把米黄纸洗成灰白，这里一律用暖白（255,250,238）。

     做旧的秘诀不在纸色深，在「不均匀」：纸受潮、见光、被手指翻过，
     黄得深浅不一，还会长出几块褐斑（藏书里叫 foxing）。
     所以暖白只留很轻的两团提亮，旧纸黄加重，另外撒三粒小褐斑——
     颗粒小、边界柔，远看像纸本身，不像洒了咖啡。 */
  var WASH = [
    { x: 0.16, y: 0.20, r: 0.62, c: '255,250,238', a: 0.16 },
    { x: 0.80, y: 0.72, r: 0.66, c: '255,250,238', a: 0.11 },
    { x: 0.52, y: 0.48, r: 0.78, c: 'stain', a: 0.17 },
    { x: 0.06, y: 0.92, r: 0.55, c: 'stain', a: 0.24 },
    { x: 0.94, y: 0.08, r: 0.50, c: 'stain', a: 0.20 },
    { x: 0.30, y: 0.86, r: 0.40, c: 'stain', a: 0.16 },
    { x: 0.72, y: 0.28, r: 0.13, c: 'stain', a: 0.22 },
    { x: 0.21, y: 0.63, r: 0.10, c: 'stain', a: 0.18 },
    { x: 0.88, y: 0.88, r: 0.09, c: 'stain', a: 0.20 }
  ];

  /* 四边压暗：真邮票放久了，边缘总比中间黄一点。
     这个值样式表里那份 inset 阴影要一起改，不然页面和导出的图不一样深。
     #6E5632 = rgb(110,86,50)，和 .po-stamp-inner 的 box-shadow 是同一个色 */
  var VIGNETTE = { hex: '#6E5632', a: 0.22 };

  /* ---------- 纸纤维 ----------
     样式表里那层是 SVG 的 feTurbulence，canvas 这边用同密度的随机颗粒近似。
     只求拎起来是「一张纸」，不求两张图逐像素一样。 */
  var GRAIN_TILE = null;
  function grainTile() {
    if (GRAIN_TILE) return GRAIN_TILE;
    var N = 200;
    var cv = document.createElement('canvas');
    cv.width = N;
    cv.height = N;
    var cx = cv.getContext('2d');
    if (!cx) return null;
    var img = cx.createImageData(N, N);
    var d = img.data;
    for (var i = 0; i < N * N; i++) {
      var o = i * 4;
      /* 纯黑、靠 multiply 吃纸色 —— 和样式表那层同一个思路 */
      d[o] = 0;
      d[o + 1] = 0;
      d[o + 2] = 0;
      /* 八成是极淡的底噪，两成是看得见的纤维点 */
      d[o + 3] = Math.random() < 0.8 ? Math.random() * 34 : Math.random() * 78;
    }
    cx.putImageData(img, 0, 0);
    GRAIN_TILE = cv;
    return cv;
  }

  /* ---------- 票面手绘稿 ----------
     跟主页那张手绘稿（images/po-head-sketch.jpg）一个调子：铅笔细线、米黄纸底、
     一点朱红、大留白。构图 = 信箱 + 飞出来的信 + 花与星芒，右下角摆这一格的年代物。
     一条「笔画」就是一串点，抖两遍再描（同一颗随机种子），页面拼成 SVG、导出用 canvas，
     两边吃的是同一批 path —— 所以页面那张和存下来的 PNG 长得一模一样。
     坐标固定 180 × 100，跟插画框 350 × 194 同比例。 */
  var SCENE_W = 180, SCENE_H = 100;

  /* 票面正文最多印几个字：竖排四列、每列七字（超出的用省略号收尾） */
  var QUOTE_MAX = 28;

  /* 一笔三种墨：ink 主线 / accent 朱红 / soft 起草线 */
  var TONE = {
    ink:    { alpha: 0.66, width: 0.95 },
    accent: { alpha: 0.62, width: 0.95 },
    soft:   { alpha: 0.26, width: 0.60 }
  };

  /* 四角星芒：手绘稿里那几颗小闪 */
  function star(cx, cy, r) {
    var k = r * 0.24;
    return [[cx, cy - r], [cx + k, cy - k], [cx + r, cy], [cx + k, cy + k],
            [cx, cy + r], [cx - k, cy + k], [cx - r, cy], [cx - k, cy - k], [cx, cy - r]];
  }

  /* 小圆：用多边形近似，画出来是手绘的抖圈，不是尺子画的 */
  function ring(cx, cy, r, n) {
    var pts = [], i, a, seg = n || 9;
    for (i = 0; i <= seg; i++) {
      a = i / seg * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }

  /* 一片花瓣：从花心往外鼓一圈再收回来 */
  function petal(cx, cy, deg, len, wid) {
    var a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    return [[cx, cy],
            [cx + ca * len * 0.42 - sa * wid, cy + sa * len * 0.42 + ca * wid],
            [cx + ca * len, cy + sa * len],
            [cx + ca * len * 0.42 + sa * wid, cy + sa * len * 0.42 - ca * wid],
            [cx, cy]];
  }

  /* 所有年代共用的底稿：信箱、飞出来的信、星芒、花与草。
     sh: 1 的笔画走直线（信封、投信口这类该有角的），其余做曲线平滑 */
  function sceneBase() {
    var s = [], i;
    /* 信箱：圆顶 + 两侧 + 底。投信口贴在最上面，只有一道细长的口子 ——
       早先那版投信口和门扣上下对称，被同事笑称「像个机器人」 */
    s.push({ t: 'ink', p: [[26, 60], [26, 41], [27, 34], [31, 29], [40, 27], [49, 28], [54, 32], [56, 38], [56, 60], [26, 60]] });
    s.push({ t: 'ink', sh: 1, p: [[32, 36], [50, 36], [50, 39], [32, 39], [32, 36]] });
    // 左下角的小铭牌 + 门缝 + 门扣
    s.push({ t: 'ink', sh: 1, p: [[30, 49], [35, 49], [35, 54], [30, 54], [30, 49]] });
    s.push({ t: 'soft', p: ring(32.5, 51.5, 1.1, 7) });
    s.push({ t: 'ink', p: [[52, 41], [52, 57]] });
    // 右侧的排线：暗示这是个立体的箱子，不是一块板
    s.push({ t: 'soft', p: [[54, 43], [50, 46]] });
    s.push({ t: 'soft', p: [[54, 48], [50, 51]] });
    s.push({ t: 'soft', p: [[54, 53], [50, 56]] });
    s.push({ t: 'soft', p: [[52, 47], [55, 46]] });
    // 侧旗：旗杆从箱顶伸出来，旗面冲右
    s.push({ t: 'ink', p: [[56, 36], [56, 25]] });
    s.push({ t: 'ink', sh: 1, p: [[56, 25], [63, 28], [56, 32]] });
    // 两条腿 + 横撑
    s.push({ t: 'ink', p: [[32, 60], [31, 86]] });
    s.push({ t: 'ink', p: [[50, 60], [51, 86]] });
    s.push({ t: 'ink', p: [[31, 76], [51, 76]] });
    // 地平线 + 地上的影线
    s.push({ t: 'soft', p: [[10, 90], [60, 90]] });
    for (i = 0; i < 3; i++) s.push({ t: 'soft', p: [[27 + i * 8, 88], [33 + i * 8, 85]] });

    // 飞出来的信：三个信封 + 一张信纸（信封走直线，才是信封不是叶子）
    s.push({ t: 'ink', sh: 1, p: [[106, 28], [123, 21], [128, 31], [111, 38], [106, 28]] });
    s.push({ t: 'ink', sh: 1, p: [[106, 28], [115, 30], [128, 31]] });
    s.push({ t: 'ink', sh: 1, p: [[137, 12], [151, 6], [156, 16], [142, 22], [137, 12]] });
    s.push({ t: 'ink', sh: 1, p: [[137, 12], [146, 15], [156, 16]] });
    s.push({ t: 'ink', sh: 1, p: [[90, 44], [106, 37], [111, 47], [95, 54], [90, 44]] });
    s.push({ t: 'ink', sh: 1, p: [[90, 44], [98, 46], [111, 47]] });
    s.push({ t: 'ink', sh: 1, p: [[124, 4], [135, 0], [139, 8], [128, 12], [124, 4]] });
    // 信飞出去的轨迹
    s.push({ t: 'soft', p: [[60, 40], [72, 31], [86, 30]] });
    s.push({ t: 'soft', p: [[64, 52], [78, 46], [90, 50]] });
    // 星芒
    s.push({ t: 'ink', p: star(157, 40, 5.6) });
    s.push({ t: 'ink', p: star(84, 20, 3.6) });
    s.push({ t: 'soft', p: star(168, 62, 2.8) });

    // 花：五瓣 + 花心 + 三根朱红花蕊
    var fx = 13, fy = 74;
    for (i = 0; i < 5; i++) s.push({ t: 'ink', p: petal(fx, fy, -90 + i * 72, 15, 6.6) });
    s.push({ t: 'ink', p: ring(fx, fy, 2.6, 8) });
    // 花瓣尖上一小笔朱红 —— 主视觉那张手绘稿的花就是这么点的
    for (i = 0; i < 5; i++) {
      var pa = (-90 + i * 72) * Math.PI / 180;
      s.push({ t: 'accent', p: [[fx + Math.cos(pa) * 11.5, fy + Math.sin(pa) * 11.5],
                                [fx + Math.cos(pa) * 15, fy + Math.sin(pa) * 15]] });
    }
    s.push({ t: 'accent', p: [[fx + 1, fy - 1], [fx + 6, fy - 8]] });
    s.push({ t: 'accent', p: [[fx, fy], [fx - 6, fy - 7]] });
    s.push({ t: 'accent', p: [[fx + 2, fy + 1], [fx + 8, fy + 4]] });
    // 花茎与叶
    s.push({ t: 'ink', p: [[fx, fy + 5], [fx - 1, 92]] });
    s.push({ t: 'ink', p: [[fx - 1, 84], [fx - 11, 90]] });
    s.push({ t: 'ink', p: [[fx + 6, 80], [fx + 10, 89]] });

    // 空地上补几笔：草与碎石，别让下半张空着
    s.push({ t: 'soft', p: [[3, 96], [5, 87]] });
    s.push({ t: 'soft', p: [[8, 97], [9, 89]] });
    s.push({ t: 'soft', p: [[56, 96], [54, 87]] });
    s.push({ t: 'soft', p: [[60, 97], [61, 89]] });
    s.push({ t: 'soft', p: [[66, 94], [68, 88]] });
    s.push({ t: 'soft', p: [[70, 96], [71, 89]] });
    s.push({ t: 'ink', p: [[78, 92], [83, 90], [86, 93]] });
    s.push({ t: 'ink', p: [[88, 95], [92, 94], [94, 96]] });
    return s;
  }

  /* 这一格右下角的年代物：一箱一图，六格不重样 */
  function sceneEra(key) {
    var s = [];
    if (key === 'lab') {            // 第一辑：实验楼
      s.push({ t: 'ink', sh: 1, p: [[112, 92], [112, 68], [140, 68], [140, 92]] });
      s.push({ t: 'ink', sh: 1, p: [[110, 68], [126, 60], [142, 68]] });
      s.push({ t: 'ink', sh: 1, p: [[118, 74], [125, 74], [125, 80], [118, 80], [118, 74]] });
      s.push({ t: 'ink', sh: 1, p: [[129, 74], [136, 74], [136, 80], [129, 80], [129, 74]] });
      s.push({ t: 'ink', sh: 1, p: [[124, 92], [124, 86], [131, 86], [131, 92]] });
      s.push({ t: 'ink', p: [[126, 60], [126, 52]] });
      s.push({ t: 'soft', p: [[123, 56], [129, 56]] });
    } else if (key === 'crt') {     // 第二辑：机房里的 CRT
      s.push({ t: 'ink', sh: 1, p: [[116, 66], [144, 66], [144, 85], [116, 85], [116, 66]] });
      s.push({ t: 'ink', sh: 1, p: [[120, 70], [140, 70], [140, 81], [120, 81], [120, 70]] });
      s.push({ t: 'soft', p: [[123, 74], [136, 74]] });
      s.push({ t: 'soft', p: [[123, 78], [130, 78]] });
      s.push({ t: 'ink', sh: 1, p: [[128, 85], [126, 90]] });
      s.push({ t: 'ink', sh: 1, p: [[132, 85], [134, 90]] });
      s.push({ t: 'ink', sh: 1, p: [[118, 93], [142, 93], [146, 97], [114, 97]] });
    } else if (key === 'chip') {    // 第三辑：芯片
      s.push({ t: 'ink', sh: 1, p: [[120, 70], [144, 70], [144, 90], [120, 90], [120, 70]] });
      s.push({ t: 'ink', sh: 1, p: [[124, 74], [140, 74], [140, 86], [124, 86], [124, 74]] });
      s.push({ t: 'ink', sh: 1, p: [[120, 76], [114, 76]] });
      s.push({ t: 'ink', sh: 1, p: [[120, 84], [114, 84]] });
      s.push({ t: 'ink', sh: 1, p: [[144, 76], [150, 76]] });
      s.push({ t: 'ink', sh: 1, p: [[144, 84], [150, 84]] });
      s.push({ t: 'ink', sh: 1, p: [[128, 70], [128, 64]] });
      s.push({ t: 'ink', sh: 1, p: [[136, 70], [136, 64]] });
    } else if (key === 'chart') {   // 第四辑：数据窗
      s.push({ t: 'ink', sh: 1, p: [[112, 64], [150, 64], [150, 94], [112, 94], [112, 64]] });
      s.push({ t: 'soft', sh: 1, p: [[112, 74], [150, 74]] });
      s.push({ t: 'ink', p: [[116, 90], [124, 80], [132, 85], [144, 72]] });
      s.push({ t: 'ink', p: ring(124, 80, 1.5, 7) });
      s.push({ t: 'ink', p: ring(144, 72, 1.5, 7) });
    } else if (key === 'letter') {  // 第五辑：纸飞机
      s.push({ t: 'ink', sh: 1, p: [[110, 84], [150, 64], [138, 86], [132, 78], [110, 84]] });
      s.push({ t: 'ink', sh: 1, p: [[138, 86], [132, 78]] });
      s.push({ t: 'soft', p: [[114, 92], [124, 88], [132, 94]] });
    } else if (key === 'podium') {  // 第六辑：讲台与黑板
      s.push({ t: 'ink', sh: 1, p: [[110, 62], [150, 62], [150, 84], [110, 84], [110, 62]] });
      s.push({ t: 'soft', p: [[116, 68], [140, 68]] });
      s.push({ t: 'soft', p: [[116, 74], [132, 74]] });
      s.push({ t: 'soft', p: [[116, 80], [126, 80]] });
      s.push({ t: 'ink', sh: 1, p: [[118, 90], [142, 90]] });
      s.push({ t: 'ink', sh: 1, p: [[120, 94], [140, 94], [144, 99], [116, 99]] });
    }
    return s;
  }

  function n1(n) { return Math.round(n * 10) / 10; }

  /* 点串 → 平滑曲线：以中点为锚，拐角自然发圆，像随手画的 */
  function strokePath(pts, sharp) {
    var d, i, mx, my;
    if (!pts || pts.length < 2) return '';
    d = 'M' + n1(pts[0][0]) + ' ' + n1(pts[0][1]);
    if (sharp) {
      for (i = 1; i < pts.length; i++) d += 'L' + n1(pts[i][0]) + ' ' + n1(pts[i][1]);
      return d;
    }
    for (i = 1; i < pts.length - 1; i++) {
      mx = (pts[i][0] + pts[i + 1][0]) / 2;
      my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += 'Q' + n1(pts[i][0]) + ' ' + n1(pts[i][1]) + ' ' + n1(mx) + ' ' + n1(my);
    }
    d += 'L' + n1(pts[pts.length - 1][0]) + ' ' + n1(pts[pts.length - 1][1]);
    return d;
  }

  /* 固定种子的伪随机：同一个 key 每次都抖成同一个样子 */
  function rnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function jitter(pts, seed, amp) {
    var r = rnd(seed), out = [], i;
    for (i = 0; i < pts.length; i++) {
      out.push([pts[i][0] + (r() - 0.5) * amp, pts[i][1] + (r() - 0.5) * amp]);
    }
    return out;
  }

  /* 抖动两遍 = 铅笔描两道的味道。两遍的 path 都算好缓存起来，两个渲染器共用 */
  var sketchCache = {};

  function sketchOf(boxId) {
    var b = boxById(boxId);
    var key = (b && b.motif) || 'none';
    if (sketchCache[key]) return sketchCache[key];

    var strokes = sceneBase().concat(sceneEra(key));
    var base = key.charCodeAt(0) * 131 || 7;
    var passes = [[], []];
    var i, p;
    for (i = 0; i < strokes.length; i++) {
      for (p = 0; p < 2; p++) {
        passes[p].push({
          d: strokePath(jitter(strokes[i].p, base + i * 17 + p * 977, p ? 2.1 : 1.3), strokes[i].sh),
          t: strokes[i].t
        });
      }
    }
    sketchCache[key] = passes;
    return passes;
  }

  /* 同一批 path 拼成 SVG 当插画框的底图 */
  function sketchCSS(boxId, ink, accent) {
    var passes = sketchOf(boxId);
    var color = { ink: ink, accent: accent, soft: ink };
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SCENE_W + ' ' + SCENE_H + '" ' +
      'fill="none" stroke-linecap="round" stroke-linejoin="round">';
    var p, i, s, tone;
    for (p = 0; p < 2; p++) {
      for (i = 0; i < passes[p].length; i++) {
        s = passes[p][i];
        tone = TONE[s.t];
        svg += '<path d="' + s.d + '" stroke="' + color[s.t] + '" stroke-width="' + tone.width +
          '" stroke-opacity="' + (tone.alpha * (p ? 0.42 : 1)).toFixed(2) + '"/>';
      }
    }
    svg += '</svg>';
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
  }

  /* WASH 里的 'stain' 占位换成这一格自己的污渍色，其余（暖白）原样保留 */
  function washFor(pal) {
    var rgb = String(pal && pal.stain || '#A88A58').replace('#', '');
    var n = parseInt(rgb, 16);
    var str = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    /* 两团暖白是「提亮」，留着不动；只按 pal.age 削水渍的浓度。
       特别版是新封，纸还没被手指翻出印子，脏的那几团该淡下去 */
    var k = pal && typeof pal.age === 'number' ? pal.age : 1;
    return WASH.map(function (w) {
      var stain = w.c === 'stain';
      return {
        x: w.x, y: w.y, r: w.r,
        c: stain ? str : w.c,
        a: stain ? Math.round(w.a * k * 100) / 100 : w.a
      };
    });
  }

  function washCSS(pal) {
    /* canvas 那边画的是正圆（半径 r × 宽），样式表里用椭圆 + 百分比来对齐：
       横向半径 = r × 100% 宽，纵向 = r × 100 × (600/380) % 高 */
    var ratio = 600 / 380;
    return washFor(pal).map(function (w) {
      var rx = Math.round(w.r * 100);
      return 'radial-gradient(ellipse ' + rx + '% ' + Math.round(rx * ratio) + '% at ' +
             Math.round(w.x * 100) + '% ' + Math.round(w.y * 100) + '%,' +
             ' rgba(' + w.c + ',' + w.a + ') 0%, rgba(' + w.c + ',0) 100%)';
    }).join(',');
  }

  /* ============================================================
     3. 渲染
     ============================================================ */

  /* 「写下我的故事」和「看看我们的青春」各有一组六个信箱，
     同一个渲染结果往所有容器里灌，再把选中态同步过去 */
  function boxGrids() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-po-boxes]'));
  }

  function syncActive(id) {
    boxGrids().forEach(function (grid) {
      var cards = grid.querySelectorAll('.po-box');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('is-active', cards[i].getAttribute('data-box') === id);
      }
    });
  }

  function renderBoxes(counts) {
    var html = BOXES.map(function (b) {
      var n = counts[b.id] || 0;
      return '<button class="po-box" type="button" data-box="' + esc(b.id) + '">' +
               '<span class="po-box-num">' + esc(b.num) + '</span>' +
               '<h3 class="po-box-title">' + esc(b.title) + '</h3>' +
               '<p class="po-box-desc">' + esc(b.desc) + '</p>' +
               '<span class="po-box-count">已有 ' + n + ' 封</span>' +
             '</button>';
    }).join('');
    boxGrids().forEach(function (grid) { grid.innerHTML = html; });
    if (state.box) syncActive(state.box);
  }

  function letterHTML(l) {
    var liked = likedSet()[l.id] ? 1 : 0;
    var replies = state.replies[l.id] || [];
    var replyHTML = replies.length
      ? '<div class="po-replies">' + replies.map(function (r) {
          return '<p class="po-reply"><b>' + esc(r.author_name || '匿名校友') + '</b>' +
                 esc(r.content) + '</p>';
        }).join('') + '</div>'
      : '';

    return '<article class="po-letter" data-id="' + esc(l.id) + '">' +
             '<div class="po-letter-head">' +
               '<span class="po-letter-name">' + esc(l.author_name || '匿名') + '</span>' +
               (l.grad_year ? '<span class="po-letter-year">' + esc(yearText(l)) + '</span>' : '') +
               '<span class="po-letter-time">' + esc(fmtTime(l.created_at)) + '</span>' +
             '</div>' +
             '<div class="po-letter-body">' + esc(l.content) + '</div>' +
             '<div class="po-letter-foot">' +
               '<button class="po-act' + (liked ? ' is-on' : '') + '" data-act="like" data-id="' + esc(l.id) + '">' +
                 '♥ ' + (l.likes || 0) + ' 个赞' +
               '</button>' +
               '<button class="po-act" data-act="reply" data-id="' + esc(l.id) + '">回复</button>' +
             '</div>' +
             replyHTML +
           '</article>';
  }

  function renderLetters() {
    var list = state.letters.filter(function (l) {
      return l.mailbox === state.box && !l.parent_id;
    });
    els.letters.innerHTML = list.length
      ? list.map(letterHTML).join('')
      : '<p class="po-empty">这个信箱还没有信，来写第一封吧。</p>';
  }

  /* ---------- 纪念墙 ----------
     一面贴满邮票的墙：每一封主信一张票，回信不占位置（跟 stampRank 同一个口径）。
     错落感靠三个随机量：倾斜、上下挪、左右挪。它们必须由信件 id 算出来，
     不能用 Math.random —— 否则每次刷新、每次点赞回一条，整墙的票都会重新抖一遍，
     像有人把墙上的票全撕下来重贴了一次。 */
  var WALL_MAX = 48;    // 一面墙最多贴 48 张（桌面约 6 排）。再多就不是墙，是一片噪点了

  /* 字符串 → 32 位整数，FNV-1a。只求稳定和分散，不求密码学 */
  function hashId(s) {
    var h = 2166136261;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /* 同一个 id、同一个槽位，永远得到同一个 0–1 的小数 */
  function spread(h, k) {
    var x = Math.sin(h * 0.0001 + k * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function renderWall() {
    var board = document.querySelector('[data-po-wall]');
    if (!board) return;

    var list = state.letters.filter(function (l) { return !l.parent_id; })
      .slice()
      .sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });

    if (list.length > WALL_MAX) list = list.slice(-WALL_MAX);

    if (!list.length) {
      board.innerHTML = '';
      if (els.wallCount) els.wallCount.textContent = '';
      if (els.wallEmpty) els.wallEmpty.classList.remove('hidden');
      /* 空墙就别留那块深色板了：一条空荡荡的深色横条压在标题下面，
         看着像加载失败的占位块 */
      var section = board.closest('.po-wall');
      if (section) section.classList.add('is-empty');
      return;
    }
    var wallSec = board.closest('.po-wall');
    if (wallSec) wallSec.classList.remove('is-empty');
    if (els.wallEmpty) els.wallEmpty.classList.add('hidden');
    if (els.wallCount) {
      els.wallCount.textContent = state.letters.filter(function (l) { return !l.parent_id; }).length
        > WALL_MAX
        ? '最近 ' + WALL_MAX + ' 张'
        : list.length + ' 张票';
    }

    /* 先一次性铺好空壳，再逐张 paint —— 每张票要读 artBox、算 wash，
       一张一张插 DOM 会让浏览器反复重排，几十张就看得出来卡 */
    board.innerHTML = list.map(function (l) {
      var h = hashId(l.id);
      var deg = (spread(h, 1) - 0.5) * 6.4;        // -3.2° ~ 3.2°
      var dy = (spread(h, 2) - 0.5) * 22;          // 上下错开 ±11px
      var dx = (spread(h, 3) - 0.5) * 12;          // 左右错开 ±6px
      var z = 1 + Math.round(spread(h, 4) * 3);    // 谁压谁，也是定的
      return '<button class="po-wall-tile" type="button" data-wall-id="' + esc(l.id) + '"' +
               ' style="--r:' + deg.toFixed(2) + 'deg;--dx:' + dx.toFixed(1) + 'px;' +
               '--dy:' + dy.toFixed(1) + 'px;--z:' + z + '"' +
               ' aria-label="' + esc((l.author_name || '匿名') + '寄往' +
                 ((boxById(l.mailbox) || {}).title || '') + '，点开看这张邮票') + '">' +
               '<span class="po-stamp-card"></span>' +
             '</button>';
    }).join('');

    var tiles = board.querySelectorAll('.po-wall-tile');
    for (var i = 0; i < tiles.length; i++) {
      var card = tiles[i].querySelector('.po-stamp-card');
      if (card) paintStamp(card, list[i]);
    }
  }

  function groupReplies(all) {
    var map = {};
    all.forEach(function (l) {
      if (!l.parent_id) return;
      (map[l.parent_id] = map[l.parent_id] || []).push(l);
    });
    Object.keys(map).forEach(function (k) {
      map[k].sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
    });
    return map;
  }

  function refresh(done) {
    store.list(function (all, err) {
      if (err) {
        els.letters.innerHTML = '<p class="po-empty">信件加载失败：' + esc(err.message || '未知错误') + '</p>';
        if (done) done();
        return;
      }
      // 被管理员下架的信不展示。数据库那边 RLS 已经挡了一道，
      // 这里再挡一次是为了兜住缓存、旧数据这类漏网的。
      state.letters = (all || []).filter(function (l) { return l.status !== 'hidden'; });
      state.replies = groupReplies(state.letters);

      var counts = {};
      state.letters.forEach(function (l) {
        if (l.parent_id) return;
        counts[l.mailbox] = (counts[l.mailbox] || 0) + 1;
      });
      renderBoxes(counts);
      renderWall();
      if (state.box) renderLetters();

      // 直接开在「看信」页时，第一封信刚到手，这里补跑一次数字滚动
      statsReady = true;
      if (view === 'read' && !statsPlayed) {
        statsPlayed = true;
        updateStats(true);
      } else {
        updateStats(false);
      }

      // 拆信台改成浮层后，进这一页不再自动弹窗 —— 一进来就盖住六格信箱很烦，
      // 想看得自己点一个年代。
      if (done) done();
    });
  }

  /* ---------- 看信页顶上的动态统计 ----------
     三个数字全从真实来信里数出来，不是写死的：
       封信件已寄出   = 没有 parent_id 的信
       封回信已收到   = 有 parent_id 的回复
       个人记下了文字 = 署名去重后的人数（没署名的算「匿名」一个人）
     下面那句小结会挑出信最多的那个信箱，所以每次刷新都可能不一样。 */
  function statData() {
    var letters = 0, replies = 0, authors = {};
    state.letters.forEach(function (l) {
      if (l.parent_id) replies += 1;
      else letters += 1;
      authors[(l.author_name || '').trim() || '匿名'] = 1;
    });

    var hot = null, hotN = 0;
    BOXES.forEach(function (b) {
      var n = state.letters.filter(function (l) {
        return l.mailbox === b.id && !l.parent_id;
      }).length;
      if (n > hotN) { hotN = n; hot = b; }
    });

    return {
      letters: letters,
      replies: replies,
      people: Object.keys(authors).length,
      hot: hot,
      hotN: hotN
    };
  }

  function setStat(key, val, animate) {
    var el = els.stats ? els.stats.querySelector('[data-po-stat="' + key + '"]') : null;
    if (!el) return;
    if (!animate || reduceMotion) { el.textContent = val; return; }
    countUp(el, val);
  }

  /** 数字从 0 滚到目标值，1200ms 缓出。重复调用会先把上一次的动画掐掉 */
  function countUp(el, target) {
    if (el._poRaf) { cancelAnimationFrame(el._poRaf); el._poRaf = null; }
    if (el._poTimer) { clearTimeout(el._poTimer); el._poTimer = null; }

    var start = null, duration = 1200;
    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) el._poRaf = requestAnimationFrame(tick);
      else el._poRaf = null;
    }
    el._poRaf = requestAnimationFrame(tick);

    // 标签页在后台时 rAF 会被节流甚至不跑，兜底 1.4s 后直接落终值，
    // 免得用户切回来看到一排永远滚不完的数字
    el._poTimer = setTimeout(function () {
      if (el._poRaf) { cancelAnimationFrame(el._poRaf); el._poRaf = null; }
      el.textContent = target;
      el._poTimer = null;
    }, duration + 200);
  }

  function updateStats(animate) {
    if (!els.stats) return;
    var d = statData();

    setStat('letters', d.letters, animate);
    setStat('replies', d.replies, animate);
    setStat('people', d.people, animate);

    if (els.statsNote) {
      els.statsNote.textContent = d.hotN
        ? '最热闹的是「' + d.hot.title + '」，已经攒了 ' + d.hotN + ' 封信。'
        : '还没有人投信，第一封会是谁的？';
    }
  }

  /* ============================================================
     4. 交互
     ============================================================ */

  /** 选中一个年代：只高亮，不展开拆信台 */
  function selectBox(id) {
    state.box = id;
    syncActive(id);
  }

  /* ---------- 浮层 ----------
     写信和邮票都是盖在页面上的浮层，不是页面流里的块。
     开着的时候给 body 挂 po-modal-open 把底下的滚动锁住。 */

  function openModal(el) {
    if (!el) return;
    el.classList.remove('hidden');
    document.body.classList.add('po-modal-open');
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.add('hidden');
    // 两张浮层都在同一个页面上，全关了才解锁滚动
    var open = document.querySelector('.po-modal:not(.hidden)');
    if (!open) document.body.classList.remove('po-modal-open');
  }

  function closeAllModals() {
    closeModal(els.form);
    closeModal(els.stampWrap);
    closeModal(els.desk);
  }

  /* ---------- 写信页的两步：挑年代 → 写信 ----------
     一张空表单先摆在那儿没人愿意填，所以先只露六个信箱，
     点了哪一个才弹出信纸浮层，信头写着选了哪个年代，随时能换。 */

  /** 信头那行：印章 + 年代名 */
  function paintFormHead(b) {
    if (els.formSeal) els.formSeal.textContent = b ? b.num : '';
    if (els.formBox) els.formBox.textContent = b ? b.title : '';
  }

  /** 教职工信箱不收入学年份，字段跟着改名、去掉「必填」 */
  function paintYearField(b) {
    var noYear = isNoYear(b);
    if (els.yearLabel) els.yearLabel.textContent = noYear ? '任教年份' : '入学年份';
    if (els.yearReq) els.yearReq.classList.toggle('hidden', noYear);
    if (els.year) els.year.placeholder = noYear ? '选填，如 2005' : '如 2019';
  }

  /** 换一格：高亮、信头、年份规则一起跟上 */
  function applyBox(id) {
    var b = boxById(id);
    if (!b) return;

    selectBox(b.id);
    paintFormHead(b);
    paintYearField(b);

    // 换到另一格时，上一格填的年份对不上了，清掉让用户重填 —— 留着比清掉更容易写错。
    // 教职工信箱没有 range（不收入学年份），也一样清空。
    var y = els.year.value.trim();
    var fits = !!y && b.range && +y >= b.range[0] && +y <= b.range[1];
    if (y && !fits) els.year.value = '';

    refreshSendState();
  }

  /* 入学年份是事实，信箱跟着它走：填 2003 就自动改投「一九九六 — 二〇〇五」。
     不这么做的话，「二〇二六 · 新生」那格里会躺着一封 1960 级的信。
     教职工信箱例外 —— 那格本来就不收入学年份，不参与改写。 */
  function followYear() {
    var raw = els.year.value.trim();
    if (!/^\d{4}$/.test(raw)) return;
    if (isNoYear(boxById(state.box))) return;

    var target = boxOfYear(parseInt(raw, 10));
    if (!target || target.id === state.box) return;

    applyBox(target.id);
    note('按入学年份改投「' + target.title + '」。');
  }

  var noteTimer = null;

  /** 在「还差什么」那行临时说一句别的，2.8 秒后恢复 */
  function note(msg) {
    if (!els.hint) return;
    els.hint.textContent = msg;
    els.hint.classList.remove('is-bad');
    els.hint.classList.add('is-ok');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { refreshSendState(); }, 2800);
  }

  function enterWrite(id) {
    var b = boxById(id) || boxById(defaultBoxId());
    if (!b) return;

    applyBox(b.id);
    els.warn.classList.add('hidden');
    openModal(els.form);
  }

  /** 关掉信纸回第一步；clear = 顺手把填的内容清掉 */
  function backToPick(clear) {
    if (clear) {
      els.name.value = '';
      els.year.value = '';
      els.content.value = '';
      updateCount();
    }
    els.warn.classList.add('hidden');
    closeModal(els.form);
    refreshSendState();
  }

  /** 每次进「写下我的故事」都从第一步开始，别停在上一轮的表单上 */
  function resetWrite() {
    if (!els.form) return;
    closeAllModals();
    els.warn.classList.add('hidden');
    state.box = null;
    syncActive(null);
    refreshSendState();
    window.scrollTo(0, 0);
  }

  /** 必填项缺哪项列哪项 —— 寄出按钮不到齐就不给按。
      教职工信箱的「任教年份」是选填，所以那边只有两项必填。 */
  function missingFields() {
    var miss = [];
    var min = (window.PO_YEAR_RANGE || {}).min || 1986;
    var max = (window.PO_YEAR_RANGE || {}).max || 2026;
    var noYear = isNoYear(boxById(state.box));
    var yLabel = noYear ? '任教年份' : '入学年份';

    if (!els.name.value.trim()) miss.push('署名');

    var y = els.year.value.trim();
    if (!y) {
      if (!noYear) miss.push(yLabel);
    } else if (!/^\d{4}$/.test(y) || +y < min || +y > max) {
      miss.push(yLabel + '（' + min + '–' + max + '）');
    }

    if (!els.content.value.trim()) miss.push('信的内容');
    return miss;
  }

  function refreshSendState() {
    if (!els.send) return;
    paintYearField(boxById(state.box));

    var miss = missingFields();
    var total = isNoYear(boxById(state.box)) ? '两' : '三';

    // 内容里有不合适的表达时，同样不给按 —— 让人边写边知道，
    // 而不是点了「寄出」被弹回来、还得自己找是哪句。
    var hits = els.content && els.content.value.trim()
      ? SENS.check(els.content.value)
      : [];

    els.send.disabled = miss.length > 0 || hits.length > 0;

    if (els.hint) {
      if (miss.length) {
        els.hint.textContent = '还差：' + miss.join('、');
        els.hint.classList.remove('is-ok');
        els.hint.classList.remove('is-bad');
      } else if (hits.length) {
        els.hint.textContent = '这句话里有不合适的表达，改一改就能寄出';
        els.hint.classList.remove('is-ok');
        els.hint.classList.add('is-bad');
      } else {
        els.hint.textContent = total + '项都填好了，可以寄出。';
        els.hint.classList.remove('is-bad');
        els.hint.classList.add('is-ok');
      }
    }
  }

  /** 打开一个信箱：选中 + 弹出拆信台浮层并渲染信（2026-11-01 起是浮层，不再往页面流里展开） */
  function openBox(id) {
    selectBox(id);
    var b = boxById(id);
    if (!b) return;

    deskDismissed = false;
    openModal(els.desk);
    els.deskSeal.textContent = b.num;
    els.deskTitle.textContent = b.title;
    var n = state.letters.filter(function (l) { return l.mailbox === id && !l.parent_id; }).length;
    els.deskCount.textContent = b.desc + ' · 已有 ' + n + ' 封信';
    renderLetters();
  }

  function closeDesk() {
    state.box = null;
    deskDismissed = true;
    closeModal(els.desk);
    syncActive(null);
  }

  /** 「✍ 写一封信」：跳到写信页，并直接带着刚才翻的信箱弹出信纸 */
  function showForm() {
    var keep = state.box || defaultBoxId();
    closeModal(els.desk);   // 拆信台还盖着呢，先收掉再弹信纸
    showView('write');
    enterWrite(keep);
    setTimeout(function () { if (els.name) els.name.focus({ preventScroll: true }); }, 160);
  }

  function hideForm() {
    els.warn.classList.add('hidden');
    els.warn.textContent = '';
    els.content.value = '';
    updateCount();
  }

  function defaultBoxId() {
    for (var i = 0; i < BOXES.length; i++) if (BOXES[i].id === '2026-fresh') return BOXES[i].id;
    return BOXES.length ? BOXES[0].id : null;
  }

  function updateCount() {
    var n = els.content.value.length;
    els.countTip.textContent = n + ' / ' + (CFG.maxLength || 500);
  }

  function send() {
    var name = els.name.value.trim();
    var year = els.year.value.trim();
    var content = els.content.value.trim();

    function fail(msg) {
      els.warn.textContent = msg;
      els.warn.classList.remove('hidden');
    }

    var miss = missingFields();
    if (miss.length) return fail('还差：' + miss.join('、') + '。');
    if (content.length > (CFG.maxLength || 500)) return fail('太长了，删掉一点。');

    var hits = SENS.check(content);
    if (hits.length) return fail('包含不适宜内容（' + hits.join('、') + '），改一改再投。');

    els.send.disabled = true;
    els.send.textContent = '寄出中…';

    store.send({
      box: state.box,
      name: name,
      year: year ? parseInt(year, 10) : null,
      content: SENS.mask(content)
    }, function (row, err) {
      els.send.textContent = '寄出信件';

      if (err) {
        refreshSendState();
        return fail('寄出失败：' + (err.message || '请稍后再试'));
      }

      hideForm();
      // 投完先收起信纸浮层，紧接着把邮票浮层弹出来 —— 页面一直没动过
      closeModal(els.form);
      refreshSendState();

      /* 先等列表刷新完再画票：邮票要判断「这是这一格的第几封」，
         拿旧列表数出来的永远是第 1 封，每张票都会变成首日封。 */
      refresh(function () { showStamp(row); });
      // 这里不要再自动 openBox()：拆信台浮层在 DOM 里排在邮票后面，
      // 同一层级下会画在邮票上面，把刚生成的邮票整个盖住。
      // 想回去看自己那封信，用户点「收下，继续看信」就够了，那条路里已经带了 openBox。
    });
  }

  /* 票面正文：换行压成空格，超长留省略号 */
  function quoteOf(row) {
    var s = (row.content || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    return s.length > QUOTE_MAX ? s.slice(0, QUOTE_MAX - 1) + '…' : s;
  }

  /* 横排后按中间断开成两行 —— 交给浏览器自己折，第二行常常只剩两三个字 */
  function quoteLines(row) {
    var s = quoteOf(row);
    if (s.length <= 14) return [s];
    var half = Math.ceil(s.length / 2);
    return [s.slice(0, half), s.slice(half)];
  }

  /* ---------- 票面：一份 HTML，两处用 ----------
     以前这段只活在 showStamp() 里，写死给浮层那张卡。纪念墙上要贴几十张，
     总不能再抄一遍 —— 版式一改两边就对不上，跟当初「页面和导出各画一遍」是同一个坑。
     现在 paintStamp(el, row) 给任意一个 .po-stamp-card 打上内容 + 配色，
     浮层和墙都调它，谁也别自己拼字符串。 */
  function paintStamp(card, row) {
    var b = boxById(row.mailbox) || { title: '', num: '' };
    var gold = isSpecialStamp(row);
    var pal = gold ? GOLD : palOf(row);
    /* 花稿跟纸色是同一版，得一起换：只换纸色不换花，蓝纸上压着桂花那张褐色线稿，
       颜色对不上。特别版除外 —— 首日封有自己的烫金版式。 */
    var deco = gold ? b : decoOf(row);

    card.innerHTML =
      (gold ? '<span class="po-stamp-badge">' + esc(specialLabel(row)) + '</span>' : '') +
      '<div class="po-stamp-inner">' +
        '<div class="po-stamp-top">' +
          '<span class="po-stamp-brand">四十号邮局' +
            (b.series ? '<i>' + esc(b.series) + '</i>' : '') + '</span>' +
          '<span class="po-stamp-box">' + esc(b.title) + '</span>' +
        '</div>' +
        '<div class="po-stamp-art">' +
          (deco.art ? '<img class="po-stamp-pic" src="' + esc(deco.art) + '" alt="" loading="lazy">' : '') +
        '</div>' +
        '<p class="po-stamp-quote">' +
          quoteLines(row).map(function (s) { return esc(s); }).join('<br>') +
        '</p>' +
        '<div class="po-stamp-foot">' +
          '<span class="po-stamp-value">40<em>周年纪念</em></span>' +
          '<span class="po-stamp-from">—— ' + esc(row.author_name) +
            (row.grad_year ? '（' + esc(yearText(row)) + '）' : '') + '</span>' +
          '<span class="po-stamp-no">' + esc(stampNo(row.id)) + '</span>' +
        '</div>' +
        '<div class="po-postmark"><span><b>河海</b>' + esc(b.seal || '信息') +
          '<i>' + esc(todayText()) + '</i></span></div>' +
      '</div>';

    /* 配色走 CSS 变量：一箱一版全靠这几个值，样式表里不用写六套 */
    card.style.setProperty('--st-paper', pal.paper);
    card.style.setProperty('--st-ink', pal.ink);
    card.style.setProperty('--st-accent', pal.accent);
    card.style.setProperty('--st-deep', pal.deep);
    /* 只给八分墨：整条 opacity 压下去的话，邮戳底下那层纸色也会跟着变淡 */
    card.style.setProperty('--st-post', hexA(pal.post, 0.8));
    card.style.setProperty('--st-edge', pal.edge);
    card.style.setProperty('--st-age', pal.age);
    card.style.setProperty('--st-line', hexA(pal.ink, 0.3));
    card.style.setProperty('--st-tint', hexA(pal.accent, 0.09));
    /* 邮戳底下那层纸色。花稿正好压在右上角，枝条穿过「智启」两个字就糊成一团，
       垫一层中心浓、到圈边化开的纸色，字才立得住（canvas 里同一组数值） */
    card.style.setProperty('--st-veil', hexA(pal.paper, 0.5));
    card.style.setProperty('--st-veil0', hexA(pal.paper, 0));
    card.classList.toggle('is-gold', gold);
    /* 有手绘花稿就把插画层放大、让文字压上去；没有就还按原来那个小方框走 */
    card.classList.toggle('has-art', !!deco.art);

    var inner = card.querySelector('.po-stamp-inner');
    if (inner) inner.style.backgroundImage = washCSS(pal);
    var art = card.querySelector('.po-stamp-art');
    if (art && deco.art) {
      /* 每版的花稿按自己形状落位，百分比交给内联样式，样式表里只留默认值 */
      var ab = artBoxOf(deco);
      art.style.left = (ab.x / 600 * 100).toFixed(2) + '%';
      art.style.top = (ab.y / 380 * 100).toFixed(2) + '%';
      art.style.width = (ab.w / 600 * 100).toFixed(2) + '%';
      art.style.height = (ab.h / 380 * 100).toFixed(2) + '%';
    }
    if (art && !deco.art) {
      // 两层：手绘稿在上，本色晕在下（跟 canvas 里那圈 radial 对齐）
      art.style.backgroundImage = sketchCSS(deco.id, pal.ink, pal.accent) +
        ', radial-gradient(ellipse at 34% 66%, ' + hexA(pal.accent, 0.09) + ', transparent 62%)';
    }

    return { b: b, gold: gold, pal: pal };
  }

  function showStamp(row) {
    stampRow = row;
    var r = paintStamp(els.stampCard, row);

    if (els.stampTip) {
      els.stampTip.textContent = r.gold
        ? '这一格的第 ' + stampRank(row) + ' 封，烫金特别版'
        : '右键或长按这张邮票也能保存';
    }

    openModal(els.stampWrap);
  }

  /* ============================================================
     4.4b 把邮票导出成 PNG
     ------------------------------------------------------------
     页面上那张邮票是 HTML + CSS 画的：怎么缩放都清楚，手机上也好排版。
     但 HTML 存不成图片，所以点「保存」时按同一套版式用 canvas 再画一遍，
     画完 toDataURL 塞给一个 <a download> 触发下载。
     画布 600 × 380，按设备像素比放大再缩，避免高分屏上发虚。 */
  var stampRow = null;

  /** 中文折行：canvas 没有现成的换行 API，只能逐字量宽度 */
  function wrapLines(g, text, maxWidth, maxLines) {
    var lines = [];
    var line = '';
    var i;
    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === '\n') { lines.push(line); line = ''; continue; }
      if (line && g.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
        if (lines.length === maxLines) { i++; break; }   // 排满了，剩下的字塞不进去
        continue;
      }
      line += ch;
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (i < text.length && lines.length) {               // 有字被截掉，末行补省略号
      var last = lines[lines.length - 1];
      lines[lines.length - 1] = last.slice(0, Math.max(0, last.length - 1)) + '…';
    }
    return lines;
  }

  function drawStamp(row) {
    var W = 600, H = 380;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var c = document.createElement('canvas');
    c.width = W * dpr;
    c.height = H * dpr;
    var g = c.getContext('2d');
    if (!g) return null;
    g.scale(dpr, dpr);

    var gold = isSpecialStamp(row);
    var pal = gold ? GOLD : palOf(row);
    var b = boxById(row.mailbox) || { title: '' };
    /* 导出的票必须跟页面上那张一模一样，所以这里读同一个 decoOf —— 
       各算各的随机种子，存下来的图就会跟看到的不同 */
    var deco = gold ? b : decoOf(row);

    // 纸底
    g.fillStyle = pal.paper;
    g.fillRect(0, 0, W, H);

    // 水彩晕染：和 CSS 那几团一一对应（同一份 WASH，同一套坐标）
    var wash = washFor(pal);
    for (var w = 0; w < wash.length; w++) {
      var blob = wash[w];
      var bx = blob.x * W, by = blob.y * H, br = blob.r * W;
      var grad = g.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, 'rgba(' + blob.c + ',' + blob.a + ')');
      grad.addColorStop(1, 'rgba(' + blob.c + ',0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    }

    // 纸纤维：颗粒 + 一道斜向帘纹，对应样式表里 .po-stamp-inner::after 那三层
    var age = typeof pal.age === 'number' ? pal.age : 1;
    var tile = grainTile();
    if (tile) {
      g.save();
      g.globalAlpha = 0.62 * age;
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = g.createPattern(tile, 'repeat');
      g.fillRect(0, 0, W, H);
      g.restore();
    }
    g.save();
    g.strokeStyle = 'rgba(0,0,0,0.028)';
    g.lineWidth = 1;
    for (var s1 = -H * 0.2; s1 < W + H * 0.2; s1 += 6) {
      g.beginPath();
      g.moveTo(s1, 0);
      g.lineTo(s1 + H * 0.194, H);
      g.stroke();
    }
    g.restore();

    // 四边压暗，和样式表里的 inset 阴影对齐
    var vig = g.createRadialGradient(W / 2, H / 2, W * 0.30, W / 2, H / 2, W * 0.78);
    vig.addColorStop(0, 'rgba(120,96,60,0)');
    vig.addColorStop(1, hexA(VIGNETTE.hex, VIGNETTE.a * age));
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);

    /* 插画层：有手绘花稿就整张铺上去（multiply 让白底吃进纸色），
       没有的话退回原来那个「淡白底 + 细框 + 程序线稿」的小画框 */
    var pic = artOf(deco.id);
    var AX = 44, AY = 90, AW = 350, AH = 194;

    if (pic) {
      /* 位置读同一份 artBox，页面上是百分比、这里是设计坐标，两边同源不会错位 */
      var ab = artBoxOf(deco);
      var asc = Math.min(ab.w / pic.naturalWidth, ab.h / pic.naturalHeight);
      var dw = pic.naturalWidth * asc, dh = pic.naturalHeight * asc;
      g.save();
      /* 花稿会故意出血到纸外，页面上靠 overflow: hidden 裁，canvas 这边得自己 clip，
         不然多出来的枝叶会画到齿孔和外框上 */
      g.beginPath();
      g.rect(0, 0, W, H);
      g.clip();
      g.globalCompositeOperation = 'multiply';
      g.drawImage(pic, ab.x + (ab.w - dw) / 2, ab.y + (ab.h - dh) / 2, dw, dh);
      g.restore();
    } else {

    g.fillStyle = 'rgba(255,255,255,0.42)';
    g.fillRect(AX, AY, AW, AH);
    g.save();
    g.beginPath(); g.rect(AX, AY, AW, AH); g.clip();
    var tint = g.createRadialGradient(AX + AW * 0.34, AY + AH * 0.66, 0,
                                      AX + AW * 0.34, AY + AH * 0.66, AW * 0.62);
    tint.addColorStop(0, hexA(pal.accent, 0.09));
    tint.addColorStop(1, hexA(pal.accent, 0));
    g.fillStyle = tint;
    g.fillRect(AX, AY, AW, AH);
    g.restore();

    g.strokeStyle = pal.ink;
    g.globalAlpha = 0.3;
    g.lineWidth = 1;
    g.strokeRect(AX, AY, AW, AH);
    g.globalAlpha = 1;

    if (window.Path2D) {
      var passes = sketchOf(deco.id);
      g.save();
      g.beginPath();
      g.rect(AX, AY, AW, AH);
      g.clip();
      g.translate(AX, AY);
      g.scale(AW / SCENE_W, AH / SCENE_H);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (var p = 0; p < 2; p++) {
        var dim = p ? 0.42 : 1;
        for (var i = 0; i < passes[p].length; i++) {
          var s = passes[p][i], tone = TONE[s.t];
          g.globalAlpha = tone.alpha * dim;
          g.strokeStyle = s.t === 'accent' ? pal.accent : pal.ink;
          g.lineWidth = tone.width;
          g.stroke(new Path2D(s.d));
        }
      }
      g.restore();
    }

    }

    // 齿孔：沿四条边每隔 24px 挖掉一个半径 8 的圆
    g.fillStyle = '#ffffff';
    var step = 24, x, y;
    function punch(px, py) { g.beginPath(); g.arc(px, py, 8, 0, Math.PI * 2); g.fill(); }
    for (x = 0; x <= W; x += step) { punch(x, 0); punch(x, H); }
    for (y = 0; y <= H; y += step) { punch(0, y); punch(W, y); }

    /* 内框：原来这里画了两道（24 一道粗的、32 一道细的），页面上却一道都没有 ——
       同一个版式两套样子，导出的图跟看到的不一样。现在两边都不画：
       票面外面那圈识别色的边已经把它框住了，再加一圈只是多一道线。 */

    // 抬头：票名 + 辑数（特别版再缀上说明）
    g.fillStyle = pal.ink;
    g.font = 'bold 24px serif';
    g.fillText('四十号邮局', 44, 64);
    var headEnd = 44 + g.measureText('四十号邮局').width;
    g.globalAlpha = 0.62;
    g.font = '14px "Microsoft YaHei", sans-serif';
    g.fillText(b.series || '', headEnd + 10, 63);
    headEnd += 10 + g.measureText(b.series || '').width;
    g.globalAlpha = 1;
    /* 特別版的小红标：跟网页版 .po-stamp-badge 一样挂在右上角、斜 6 度，
       别塞进抬头里挤「第三辑」 */
    if (gold) {
      var label = specialLabel(row);
      g.save();
      g.font = 'bold 13px "Microsoft YaHei", sans-serif';
      var lw = g.measureText(label).width + 20;
      g.translate(W - 26 - lw / 2, 26);
      g.rotate(6 * Math.PI / 180);
      g.fillStyle = '#B03A2E';
      g.fillRect(-lw / 2, -11, lw, 22);
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, 0, 1);
      g.restore();
    }

    // 右上角：投进的那个年代（用加深一档的 accent，浅金压在旧纸上读不出来）
    g.fillStyle = pal.deep;
    g.font = 'bold 15px "Microsoft YaHei", sans-serif';
    var bt = b.title || '';
    g.fillText(bt, 556 - g.measureText(bt).width, 64);

    // 抬头下面那道细线
    g.strokeStyle = pal.ink;
    g.globalAlpha = 0.22;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(44, 78); g.lineTo(556, 78); g.stroke();
    g.globalAlpha = 1;

    /* 正文：横排两行（左上角 44 / 首行 214 / 行距 30）。
       花稿挪到右半边以后字不再压画，只拿纸色轻轻描一道细边兜底，
       描粗了字会泡发 —— 网页版是同一条思路，靠一层极淡的 text-shadow */
    var lines = quoteLines(row);
    g.font = '19px "Microsoft YaHei", sans-serif';
    g.lineJoin = 'round';
    g.textBaseline = 'alphabetic';
    for (var li = 0; li < lines.length; li++) {
      var ly = 194 + li * 28;
      g.globalAlpha = 1;
      g.strokeStyle = pal.paper;
      g.lineWidth = 2;
      g.globalAlpha = 0.6;
      g.strokeText(lines[li], 44, ly);
      g.globalAlpha = 0.92;
      g.fillStyle = pal.ink;
      g.fillText(lines[li], 44, ly);
    }
    g.globalAlpha = 1;

    /* 面值：40 + 周年纪念。跟正文同一道细描边 */
    g.font = 'bold 34px serif';
    g.strokeStyle = pal.paper;
    g.lineWidth = 2;
    g.globalAlpha = 0.6;
    g.strokeText('40', 44, 330);
    g.fillStyle = pal.accent;
    g.globalAlpha = 1;
    g.fillText('40', 44, 330);

    g.font = '14px "Microsoft YaHei", sans-serif';
    g.strokeText('周年纪念', 88, 330);
    g.fillStyle = pal.ink;
    g.globalAlpha = 0.85;
    g.fillText('周年纪念', 88, 330);
    g.globalAlpha = 1;

    // 落款 + 编号：右边给邮戳留出位置，名字太长就截断
    var noText = stampNo(row.id);
    g.font = '14px "Microsoft YaHei", sans-serif';
    var noW = g.measureText(noText).width;
    g.font = '19px "Microsoft YaHei", sans-serif';
    var from = '—— ' + (row.author_name || '匿名') +
               (row.grad_year ? '（' + yearText(row) + '）' : '');
    var maxFromW = 556 - 20 - noW - 150;
    var cut = false;
    while (from.length > 3 && g.measureText(from).width > maxFromW) {
      from = from.slice(0, -1);
      cut = true;
    }
    if (cut) from += '…';
    g.strokeStyle = pal.paper;
    g.lineWidth = 2;
    g.strokeText(from, 150, 330);
    g.fillStyle = pal.ink;
    g.fillText(from, 150, 330);

    g.font = '14px "Microsoft YaHei", sans-serif';
    g.strokeStyle = pal.paper;
    g.lineWidth = 2;
    g.strokeText(noText, 556 - noW, 331);
    g.globalAlpha = 0.55;
    g.fillStyle = pal.ink;
    g.fillText(noText, 556 - noW, 331);
    g.globalAlpha = 1;

    // 邮戳：朱红双圈，压在票面右上角（跟样式表里 84.33% / 30.53% 那组数字对齐）
    g.save();
    var cx = 506, cy = 116;
    /* 花稿正压在这个角上：枝条一穿，「智启」两个字就糊成一团，底下的日期直接没了。
       两步处理：先把整圈垫一层很淡的纸色（不然枝叶从圈里穿过去很乱），
       再给三行字各描一圈纸色硬边 —— 描边只清字身边缘，画该露的还露着。
       只垫不描，字还是会被叶脉划开；只描不垫，圈里的画糊成一片。 */
    var veil = g.createRadialGradient(cx, cy, 0, cx, cy, 44);
    veil.addColorStop(0, hexA(pal.paper, 0.5));
    veil.addColorStop(0.7, hexA(pal.paper, 0.36));
    veil.addColorStop(1, hexA(pal.paper, 0));
    g.fillStyle = veil;
    g.beginPath(); g.arc(cx, cy, 44, 0, Math.PI * 2); g.fill();

    g.globalAlpha = 0.8;
    g.strokeStyle = pal.post;
    g.lineWidth = 2.4;
    g.beginPath(); g.arc(cx, cy, 38, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.1;
    g.beginPath(); g.arc(cx, cy, 31, 0, Math.PI * 2); g.stroke();
    g.fillStyle = pal.post;
    g.textAlign = 'center';
    g.lineJoin = 'round';
    g.strokeStyle = pal.paper;
    g.font = 'bold 15px serif';
    g.lineWidth = 3;
    g.globalAlpha = 0.78;
    g.strokeText('河海', cx, cy - 2);
    g.globalAlpha = 0.8;
    g.fillText('河海', cx, cy - 2);
    g.font = '14px serif';
    g.lineWidth = 2.6;
    g.globalAlpha = 0.72;
    g.strokeText(b.seal || '信息', cx, cy + 15);
    g.globalAlpha = 0.8;
    g.fillText(b.seal || '信息', cx, cy + 15);
    g.font = '8px "Microsoft YaHei", sans-serif';
    g.lineWidth = 1.4;
    g.globalAlpha = 0.62;
    g.strokeText(todayText(), cx, cy + 24);
    g.globalAlpha = 0.7;
    g.fillText(todayText(), cx, cy + 24);
    g.restore();
    g.textAlign = 'left';

    return c;
  }

  function saveStamp() {
    if (!stampRow) return;
    function tip(msg) { if (els.stampTip) els.stampTip.textContent = msg; }

    var c = drawStamp(stampRow);
    if (!c) { tip('这个浏览器不支持导出图片，直接截图保存也一样。'); return; }

    try {
      var a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = '四秩时光邮局-' + stampNo(stampRow.id) + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      tip('已经存好了，去浏览器的下载目录看看。');
    } catch (e) {
      tip('导出失败了，直接截图保存也一样。');
    }
  }

  function toggleReplyForm(letterEl) {
    var exist = letterEl.querySelector('.po-reply-form');
    if (exist) { exist.remove(); return; }

    var wrap = document.createElement('div');
    wrap.className = 'po-reply-form';
    wrap.innerHTML =
      '<input type="text" maxlength="12" placeholder="你的署名（可留空）" />' +
      '<input type="text" maxlength="140" placeholder="写一句回复…" />' +
      '<button class="po-btn po-btn--sm" type="button">寄出</button>';

    wrap.querySelector('.po-btn').addEventListener('click', function () {
      var inputs = wrap.querySelectorAll('input');
      var name = inputs[0].value.trim();
      var text = inputs[1].value.trim();
      if (!text) { inputs[1].focus(); return; }

      var hits = SENS.check(text);
      if (hits.length) { inputs[1].value = ''; inputs[1].placeholder = '包含不适宜内容，改一改'; return; }

      var id = letterEl.getAttribute('data-id');
      var letter = null;
      for (var i = 0; i < state.letters.length; i++) {
        if (state.letters[i].id === id) { letter = state.letters[i]; break; }
      }
      store.reply({ box: (letter && letter.mailbox) || state.box, name: name, content: SENS.mask(text), parentId: id },
        function (row, err) {
          if (err) return;
          refresh();
          setTimeout(function () { if (state.box) openBox(state.box); }, 60);
        });
    });

    letterEl.appendChild(wrap);
    wrap.querySelector('input').focus();
  }

  function bind() {
    boxGrids().forEach(function (grid) {
      var mode = grid.getAttribute('data-po-boxes');
      grid.addEventListener('click', function (e) {
        // 这一页正被 hidden 藏起来时不响应，免得状态和看到的页面对不上
        if (!grid.offsetWidth && !grid.offsetHeight) return;

        var card = e.target.closest('.po-box');
        if (!card) return;
        var id = card.getAttribute('data-box');

        if (mode === 'write') {
          // 写信页：点哪个年代就进第二步，信纸随之出现
          enterWrite(id);
        } else {
          openBox(id);
        }
      });
    });

    els.letters.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var act = btn.getAttribute('data-act');

      if (act === 'like') {
        if (likedSet()[id]) return;
        markLiked(id);
        store.like(id, function () { refresh(); setTimeout(function () { if (state.box) openBox(state.box); }, 60); });
      } else if (act === 'reply') {
        toggleReplyForm(btn.closest('.po-letter'));
      }
    });

    /* 纪念墙：点哪张票就打开哪张票的浮层（跟刚寄完看到的是同一个浮层，
       收藏/保存按钮都在，不是另做一套只读预览） */
    if (els.wall) {
      els.wall.addEventListener('click', function (e) {
        var tile = e.target.closest('[data-wall-id]');
        if (!tile) return;
        var id = tile.getAttribute('data-wall-id');
        var row = null;
        for (var i = 0; i < state.letters.length; i++) {
          if (state.letters[i].id === id) { row = state.letters[i]; break; }
        }
        if (row) showStamp(row);
      });
    }

    document.getElementById('poWriteBtn').addEventListener('click', showForm);
    document.getElementById('poCloseDesk').addEventListener('click', closeDesk);
    els.send.addEventListener('click', send);
    document.getElementById('poCancel').addEventListener('click', function () {
      // 「我还要组织一下语言」= 关掉信纸，写过的字留着，下次点开同一个信箱还在。
      // 不再顺手清空 —— 右上角那个 × 已经去掉了，这是唯一一个明着「退出」的入口，
      // 再清空会把人刚写的半封信弄没。
      closeModal(els.form);
    });
    if (els.formSwitch) {
      els.formSwitch.addEventListener('click', function () { backToPick(false); });
    }
    [els.name, els.content].forEach(function (el) {
      if (el) el.addEventListener('input', refreshSendState);
    });
    // 年份单独处理：先按当前信箱算一遍状态，再让信箱跟着年份走
    if (els.year) {
      els.year.addEventListener('input', function () {
        refreshSendState();
        followYear();
      });
    }

    // 浮层关闭：点遮罩（写信浮层没有 ×，靠下面那个按钮退出）
    document.addEventListener('click', function (e) {
      var x = e.target.closest('[data-po-dismiss]');
      if (!x) return;
      var which = x.getAttribute('data-po-dismiss');
      if (which === 'form') backToPick(false);
      else if (which === 'desk') closeDesk();
      else closeModal(els.stampWrap);
    });

    // Esc 也能关，跟系统弹窗一个习惯
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (els.form && !els.form.classList.contains('hidden')) { backToPick(false); return; }
      if (els.stampWrap && !els.stampWrap.classList.contains('hidden')) { closeModal(els.stampWrap); return; }
      if (els.desk && !els.desk.classList.contains('hidden')) closeDesk();
    });

    document.getElementById('poStampClose').addEventListener('click', function () {
      closeModal(els.stampWrap);
      var box = state.box;   // 刚投的那个信箱，直接带过去翻
      showView('read');
      if (box) openBox(box);
    });
    document.getElementById('poStampSave').addEventListener('click', saveStamp);
    // 内容边写边查，命中不合适的词就提前把「寄出」禁掉（防抖，别每敲一个字跑一遍）
    var checkTimer = null;
    els.content.addEventListener('input', function () {
      updateCount();
      clearTimeout(checkTimer);
      checkTimer = setTimeout(refreshSendState, 220);
    });
  }

  /* ============================================================
     4.5 板块内分页：主页 / 写下我的故事 / 看看我们的青春
     ------------------------------------------------------------
     三页都写在 DOM 里，靠 hidden 切换，地址栏跟着变：
       #blessings       主页，整屏只有手绘主视觉
       #blessings/write 写下我的故事
       #blessings/read  看看我们的青春
     抬头两个按钮是「跳页」而不是滚动 —— 滚动会让人以为还在同一页。
     ============================================================ */

  var VIEWS = ['home', 'write', 'read'];
  var view = 'home';

  function hashOf(v) {
    return v === 'home' ? '#blessings' : '#blessings/' + v;
  }

  function viewOfHash(h) {
    var m = /^#blessings\/([a-z]+)$/.exec(h || '');
    return m && VIEWS.indexOf(m[1]) > -1 ? m[1] : 'home';
  }

  function pageEl(v) {
    var pages = document.querySelectorAll('[data-po-page]');
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].getAttribute('data-po-page') === v) return pages[i];
    }
    return null;
  }

  /* 隐藏的页面没被 IntersectionObserver 观察过，切过来时要手动补一遍入场动画，
     否则 .reveal 会一直停在 opacity:0 */
  function playReveal(scope) {
    if (!scope) return;
    var items = scope.querySelectorAll('.reveal');
    if (!items.length) return;

    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('is-visible');
      items[i].style.transitionDelay = Math.min(i * 0.07, 0.5) + 's';
    }

    void scope.offsetHeight;

    requestAnimationFrame(function () {
      for (var j = 0; j < items.length; j++) items[j].classList.add('is-visible');
    });

    // 兜底：标签页在后台时 rAF 会被浏览器挂起，回到前台之前这几块一直是空白
    //（统计、信箱都会「消失」）。一秒多后再确认一次，已经加过就是空的重复动作。
    setTimeout(function () {
      for (var k = 0; k < items.length; k++) items[k].classList.add('is-visible');
    }, 1200);
  }

  function showView(v, pushHash) {
    if (VIEWS.indexOf(v) < 0) v = 'home';
    view = v;

    for (var i = 0; i < VIEWS.length; i++) {
      var el = pageEl(VIEWS[i]);
      if (el) el.classList.toggle('hidden', VIEWS[i] !== v);
    }
    if (els.section) els.section.setAttribute('data-po-view', v);

    // 进「写下我的故事」一律回到第一步挑年代（从拆信台过来的会再直接弹信纸）
    if (v === 'write') resetWrite();
    else closeAllModals();   // 切页时浮层不能跟着飘过去

    updateFooter();
    playReveal(pageEl(v));
    window.scrollTo(0, 0);

    // 每次进「看信」页都让数字重滚一遍；信还没加载完就交给 refresh() 补
    if (v === 'read') {
      if (statsReady) {
        statsPlayed = true;
        updateStats(true);
      }
    } else {
      statsPlayed = false;
    }

    if (pushHash !== false && location.hash !== hashOf(v)) {
      try { history.pushState(null, '', hashOf(v)); }
      catch (e) { location.hash = hashOf(v); }
    }
  }

  /* 主页只有手绘块，页脚也一起收掉，整页一屏到底（用户要求：只有这一页不要页脚）。
     切到别的板块或别的页时要把页脚还回来，所以盯一下外层 [data-panel] 的 class —— 
     导航切板块时 main.js 改的是它的 is-hidden。 */
  function updateFooter() {
    var panel = els.section ? els.section.closest('[data-panel]') : null;
    var onHome = view === 'home' && !(panel && panel.classList.contains('is-hidden'));
    document.body.classList.toggle('po-on-home', onHome);
  }

  function bindViewLinks() {
    // 抬头按钮、返回链接，统一用 [data-po-go]
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-po-go]');
      if (!link) return;
      e.preventDefault();

      var v = link.getAttribute('data-po-go');
      showView(v);   // 进看信页不自动弹拆信台，等用户自己点一个年代
    });

    // 点导航上的「四十号邮局」= 回主页（地址栏也一起退回去）
    var navLink = document.querySelector('a[data-tab="postoffice"]');
    if (navLink) navLink.addEventListener('click', function () { showView('home'); });

    // 浏览器前进/后退、手输地址
    window.addEventListener('hashchange', function () {
      var v = viewOfHash(location.hash);
      if (v !== view) showView(v, false);
    });
    window.addEventListener('popstate', function () {
      var v = viewOfHash(location.hash);
      if (v !== view) showView(v, false);
    });
  }

  /* ============================================================
     5. 启动
     ============================================================ */

  function init() {
    // 两组信箱（写信页 / 看信页）都在，才说明邮局 DOM 已经注入
    els.mailboxes = document.querySelector('[data-po-boxes]');
    if (!els.mailboxes) return;   // sections/postoffice.js 没加载

    els.section = document.getElementById('blessings');
    els.desk = document.getElementById('poDesk');
    els.deskSeal = document.getElementById('poDeskSeal');
    els.deskTitle = document.getElementById('poDeskTitle');
    els.deskCount = document.getElementById('poDeskCount');
    els.letters = document.getElementById('poLetters');
    els.form = document.getElementById('poForm');
    els.pick = document.getElementById('poPick');
    els.formSeal = document.getElementById('poFormSeal');
    els.formBox = document.getElementById('poFormBox');
    els.formSwitch = document.getElementById('poFormSwitch');
    els.hint = document.getElementById('poHint');
    els.warn = document.getElementById('poWarn');
    els.name = document.getElementById('poName');
    els.year = document.getElementById('poYear');
    els.yearLabel = document.getElementById('poYearLabel');
    els.yearReq = document.getElementById('poYearReq');
    els.content = document.getElementById('poContent');
    els.countTip = document.getElementById('poCountTip');
    els.send = document.getElementById('poSend');
    els.stampWrap = document.getElementById('poStamp');
    els.stampCard = document.getElementById('poStampCard');
    els.stampTip = document.getElementById('poStampTip');
    els.stats = document.getElementById('poStats');
    els.statsNote = document.getElementById('poStatsNote');
    els.wall = document.querySelector('[data-po-wall]');
    els.wallCount = document.getElementById('poWallCount');
    els.wallEmpty = document.getElementById('poWallEmpty');

    /* 三个浮层挂到 body 下。板块切换的入场动画（panelIn）会给 .panel 加 transform，
       而 position:fixed 的子元素一旦有带 transform 的祖先，就会相对那个祖先定位 ——
       浮层会跑到板块的中间（可能在屏幕外），而不是屏幕正中。挪到 body 就没这回事。 */
    [els.form, els.stampWrap, els.desk].forEach(function (m) {
      if (m && m.parentNode !== document.body) document.body.appendChild(m);
    });

    preloadArt();   // 票面花稿先抓下来，点开邮票和导出 PNG 都直接能用

    initBackend();

    // 屏蔽词库：远端优先（管理员在后台改完刷新就生效），拉不到用代码里那份兜底。
    // 不 await，网络慢也不耽误页面渲染 —— 拿到之前先按兜底词判。
    if (typeof SENS.loadRemote === 'function') {
      SENS.loadRemote(DEMO ? null : db, function () {});
    }

    // 年份输入框的范围（1986 是建院那年，再往前没有「入学」这回事）
    els.year.min = (window.PO_YEAR_RANGE || {}).min || 1986;
    els.year.max = (window.PO_YEAR_RANGE || {}).max || 2026;

    // 模式提示
    var modeEl = document.getElementById('poMode');
    if (modeEl) {
      modeEl.textContent = DEMO
        ? '本地演示模式：信存在你这台电脑的浏览器里'
        : '已连接云端数据库';
    }

    bind();
    bindViewLinks();

    // 导航切板块时页脚要能自己回来，盯住外层 panel 的 class
    var panel = els.section ? els.section.closest('[data-panel]') : null;
    if (panel && window.MutationObserver) {
      new MutationObserver(updateFooter).observe(panel, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    showView(viewOfHash(location.hash), false);
    refresh();
  }

  init();
})();
