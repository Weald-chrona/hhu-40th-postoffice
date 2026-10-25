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
    els.mailboxes.innerHTML = html;
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
               (l.grad_year ? '<span class="po-letter-year">' + esc(l.grad_year) + ' 级</span>' : '') +
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
      state.letters = all || [];
      state.replies = groupReplies(state.letters);

      var counts = {};
      state.letters.forEach(function (l) {
        if (l.parent_id) return;
        counts[l.mailbox] = (counts[l.mailbox] || 0) + 1;
      });
      renderBoxes(counts);
      if (state.box) renderLetters();
    });
  }

  /* ============================================================
     4. 交互
     ============================================================ */

  function openBox(id) {
    state.box = id;
    var b = boxById(id);
    if (!b) return;

    var cards = els.mailboxes.querySelectorAll('.po-box');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('is-active', cards[i].getAttribute('data-box') === id);
    }

    els.desk.classList.remove('hidden');
    els.deskSeal.textContent = b.num;
    els.deskTitle.textContent = b.title;
    var n = state.letters.filter(function (l) { return l.mailbox === id && !l.parent_id; }).length;
    els.deskCount.textContent = b.desc + ' · 已有 ' + n + ' 封信';
    renderLetters();

    // 表单里的信箱下拉跟着切
    if (els.boxSelect) els.boxSelect.value = id;
  }

  function closeDesk() {
    state.box = null;
    els.desk.classList.add('hidden');
    els.form.classList.add('hidden');
    var cards = els.mailboxes.querySelectorAll('.po-box');
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove('is-active');
  }

  function showForm() {
    if (!state.box) openBox(BOXES[0].id);
    els.form.classList.remove('hidden');
    els.stampWrap.classList.add('hidden');
    els.name.focus();
    els.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideForm() {
    els.form.classList.add('hidden');
    els.warn.classList.add('hidden');
    els.content.value = '';
    updateCount();
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

    if (!name) return fail('写个署名吧，网名也行。');
    if (!content) return fail('信的内容不能是空的。');
    if (content.length > (CFG.maxLength || 500)) return fail('太长了，删掉一点。');

    var hits = SENS.check(content);
    if (hits.length) return fail('包含不适宜内容（' + hits.join('、') + '），改一改再投。');

    els.send.disabled = true;
    els.send.textContent = '投递中…';

    store.send({
      box: state.box,
      name: name,
      year: year ? parseInt(year, 10) : null,
      content: SENS.mask(content)
    }, function (row, err) {
      els.send.disabled = false;
      els.send.textContent = '投 递';

      if (err) return fail('投递失败：' + (err.message || '请稍后再试'));

      hideForm();
      showStamp(row);
      refresh();
      setTimeout(function () { if (state.box) openBox(state.box); }, 60);
    });
  }

  function showStamp(row) {
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
            (row.grad_year ? '（' + esc(row.grad_year) + ' 级）' : '') + '</span>' +
          '<span class="po-stamp-no">' + esc(stampNo(row.id)) + '</span>' +
        '</div>' +
        '<div class="po-postmark"><span><b>四秩砺行</b>' + esc(todayText()) + '<br>POSTED</span></div>' +
      '</div>';

    els.stampWrap.classList.remove('hidden');
    els.stampWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    els.mailboxes.addEventListener('click', function (e) {
      var card = e.target.closest('.po-box');
      if (card) openBox(card.getAttribute('data-box'));
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
    document.getElementById('poCancel').addEventListener('click', hideForm);
    document.getElementById('poStampClose').addEventListener('click', function () {
      els.stampWrap.classList.add('hidden');
    });
    els.content.addEventListener('input', updateCount);
  }

  /* ============================================================
     5. 启动
     ============================================================ */

  function init() {
    els.mailboxes = document.getElementById('poMailboxes');
    if (!els.mailboxes) return;   // 邮局 DOM 还没注入，说明 sections/postoffice.js 没加载

    els.desk = document.getElementById('poDesk');
    els.deskSeal = document.getElementById('poDeskSeal');
    els.deskTitle = document.getElementById('poDeskTitle');
    els.deskCount = document.getElementById('poDeskCount');
    els.letters = document.getElementById('poLetters');
    els.form = document.getElementById('poForm');
    els.warn = document.getElementById('poWarn');
    els.name = document.getElementById('poName');
    els.year = document.getElementById('poYear');
    els.boxSelect = document.getElementById('poBox');
    els.content = document.getElementById('poContent');
    els.countTip = document.getElementById('poCountTip');
    els.send = document.getElementById('poSend');
    els.stampWrap = document.getElementById('poStamp');
    els.stampCard = document.getElementById('poStampCard');

    initBackend();

    // 信箱下拉
    els.boxSelect.innerHTML = BOXES.map(function (b) {
      return '<option value="' + esc(b.id) + '">' + esc(b.title) + '</option>';
    }).join('');
    els.year.min = (window.PO_YEAR_RANGE || {}).min || 1960;
    els.year.max = (window.PO_YEAR_RANGE || {}).max || 2026;

    // 模式提示
    var modeEl = document.getElementById('poMode');
    if (modeEl) {
      modeEl.textContent = DEMO
        ? '本地演示模式：信存在你这台电脑的浏览器里'
        : '已连接云端数据库';
    }

    bind();
    refresh();
  }

  init();
})();
