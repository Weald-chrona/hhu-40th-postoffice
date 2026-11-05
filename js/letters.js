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

  function refresh() {
    store.list(function (all, err) {
      if (err) {
        els.letters.innerHTML = '<p class="po-empty">信件加载失败：' + esc(err.message || '未知错误') + '</p>';
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

      showStamp(row);
      refresh();
      // 这里不要再自动 openBox()：拆信台浮层在 DOM 里排在邮票后面，
      // 同一层级下会画在邮票上面，把刚生成的邮票整个盖住。
      // 想回去看自己那封信，用户点「收下，继续看信」就够了，那条路里已经带了 openBox。
    });
  }

  function showStamp(row) {
    stampRow = row;
    if (els.stampTip) els.stampTip.textContent = '右键或长按这张邮票也能保存';
    var b = boxById(row.mailbox) || { title: '', num: '' };
    var quote = row.content.length > 76 ? row.content.slice(0, 76) + '…' : row.content;

    els.stampCard.innerHTML =
      '<div class="po-stamp-inner">' +
        '<div class="po-stamp-top">' +
          '<span class="po-stamp-brand">四十号邮局</span>' +
          '<span class="po-stamp-box">' + esc(b.title) + '</span>' +
        '</div>' +
        '<div class="po-stamp-quote">' + esc(quote) + '</div>' +
        '<div class="po-stamp-foot">' +
          '<span class="po-stamp-from">—— ' + esc(row.author_name) +
            (row.grad_year ? '（' + esc(yearText(row)) + '）' : '') + '</span>' +
          '<span class="po-stamp-no">' + esc(stampNo(row.id)) + '</span>' +
        '</div>' +
        '<div class="po-postmark"><span><b>四秩砺行</b>' + esc(todayText()) + '<br>POSTED</span></div>' +
      '</div>';

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

    // 纸底
    g.fillStyle = '#f5f1e8';
    g.fillRect(0, 0, W, H);

    // 齿孔：沿四条边每隔 24px 挖掉一个半径 8 的圆
    g.fillStyle = '#fbf9f4';
    var step = 24, x, y;
    function punch(px, py) { g.beginPath(); g.arc(px, py, 8, 0, Math.PI * 2); g.fill(); }
    for (x = 0; x <= W; x += step) { punch(x, 0); punch(x, H); }
    for (y = 0; y <= H; y += step) { punch(0, y); punch(W, y); }

    // 内外两道框
    g.strokeStyle = '#1a3a6b';
    g.lineWidth = 2;
    g.strokeRect(24, 24, W - 48, H - 48);
    g.globalAlpha = 0.35;
    g.lineWidth = 1;
    g.strokeRect(32, 32, W - 64, H - 64);
    g.globalAlpha = 1;

    var b = boxById(row.mailbox) || { title: '' };

    // 抬头
    g.fillStyle = '#1a3a6b';
    g.font = 'bold 21px serif';
    g.fillText('四十号邮局', 48, 66);

    // 右上角：投进的那个年代
    g.fillStyle = '#b03a2e';
    g.font = '15px "Microsoft YaHei", sans-serif';
    var bt = b.title || '';
    g.fillText(bt, W - 48 - g.measureText(bt).width, 66);

    g.strokeStyle = 'rgba(26, 58, 107, 0.25)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(48, 82); g.lineTo(W - 48, 82); g.stroke();

    // 正文：最多六行，超出以省略号结尾
    g.fillStyle = '#2b2b2b';
    g.font = '17px "Microsoft YaHei", sans-serif';
    var lines = wrapLines(g, row.content || '', 400, 6);
    for (var i = 0; i < lines.length; i++) g.fillText(lines[i], 48, 120 + i * 30);

    // 面值
    g.fillStyle = '#c8952c';
    g.font = 'bold 56px serif';
    g.fillText('40', W - 140, 178);
    g.font = '12px "Microsoft YaHei", sans-serif';
    g.fillText('周年纪念', W - 140, 200);

    // 邮戳：朱红双圈
    g.save();
    g.globalAlpha = 0.75;
    g.strokeStyle = '#b03a2e';
    var cx = W - 100, cy = 292;
    g.lineWidth = 2.5;
    g.beginPath(); g.arc(cx, cy, 44, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.2;
    g.beginPath(); g.arc(cx, cy, 36, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#b03a2e';
    g.font = 'bold 17px serif';
    g.textAlign = 'center';
    g.fillText('河海', cx, cy - 4);
    g.fillText('信息', cx, cy + 18);
    g.restore();
    g.textAlign = 'left';

    // 落款，编号跟在后面同一行 —— 右边留给邮戳，别压上去
    g.fillStyle = '#1a3a6b';
    g.font = '15px "Microsoft YaHei", sans-serif';
    var from = '—— ' + (row.author_name || '匿名') +
               (row.grad_year ? '（' + yearText(row) + '）' : '');
    g.fillText(from, 48, H - 52);
    var fromW = g.measureText(from).width;
    g.fillStyle = '#8a8578';
    g.font = '13px "Microsoft YaHei", sans-serif';
    g.fillText(stampNo(row.id), 48 + fromW + 18, H - 53);

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
