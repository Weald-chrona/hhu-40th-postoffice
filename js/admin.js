/* ============================================================
   四十号邮局 · 内容管理后台
   ============================================================
   这个页面只做三件事：
     1. 登录（Supabase Auth 邮箱密码）
     2. 看信 → 下架 / 恢复 / 删除
     3. 管屏蔽词库 → 加词 / 删词

   权限不靠前端判断：页面上按钮藏得再好，拿到 anon key 的人照样能直接调接口。
   真正的门在数据库的 RLS 里（supabase/schema.sql 第 4 节），
   这里的 is_admin 检查只是为了让非管理员看到一句人话，而不是一片空白。
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.PO_CONFIG || {};
  var BOXES = window.PO_MAILBOXES || [];

  var db = null;
  var letters = [];   // 全部信件（含回复）
  var words = [];     // 词库
  var boxName = {};   // mailbox id → 显示名

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  BOXES.forEach(function (b) { boxName[b.id] = b.num + ' · ' + b.title; });

  /* ---------- 提示 ---------- */

  function fatal(msg) {
    $('adLogin').innerHTML =
      '<div class="ad-login-card"><h1>没法开始</h1>' +
      '<p class="ad-sub">' + esc(msg) + '</p>' +
      '<p class="ad-sub">配置步骤写在 <code>supabase/配置步骤.md</code> 里。</p></div>';
  }

  function say(el, msg, ok) {
    el.textContent = msg || '';
    el.className = 'ad-msg' + (msg ? (ok ? ' is-ok' : ' is-bad') : '');
  }

  /** 把 Supabase 的报错翻译成人话，别直接把英文甩出来 */
  function explain(err) {
    if (!err) return '未知错误';
    var code = err.code || '';
    if (code === '23505') return '这个词已经在库里了。';
    if (code === '42501' || /row-level security/i.test(err.message || '')) {
      return '数据库拒绝了这次操作：当前账号不在 admins 表里，或者 RLS 策略没跑全。';
    }
    if (code === '42P01') return '表不存在，先跑一遍 supabase/schema.sql。';
    if (/JWT/i.test(err.message || '')) return '登录已过期，请重新登录。';
    return err.message || String(err);
  }

  /* ---------- 登录 ---------- */

  function showLogin() {
    $('adLogin').hidden = false;
    $('adMain').hidden = true;
    $('adWho').hidden = true;
  }

  function showMain(email) {
    $('adLogin').hidden = true;
    $('adMain').hidden = false;
    $('adWho').hidden = false;
    $('adEmail').textContent = email || '';
  }

  function enter(session) {
    var email = (session && session.user && session.user.email) || '';

    // 登录成功不等于有权限：admins 表里没有这个邮箱，一样只能看公开的信。
    db.rpc('is_admin').then(function (res) {
      if (res.error) {
        showLogin();
        say($('adLoginMsg'), '读不到管理员名单：' + explain(res.error) +
            '（先确认 supabase/schema.sql 跑过了）', false);
        return;
      }
      if (res.data !== true) {
        db.auth.signOut();
        showLogin();
        say($('adLoginMsg'), '这个账号（' + email + '）不在管理员名单里。' +
            '要去数据库里执行一句 insert into admins(email) values (\'' + email + '\');', false);
        return;
      }
      showMain(email);
      loadLetters();
      loadWords();
    });
  }

  function bindLogin() {
    $('adLoginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('adLoginBtn');
      btn.disabled = true;
      say($('adLoginMsg'), '正在登录……', true);

      db.auth.signInWithPassword({
        email: $('adUser').value.trim(),
        password: $('adPass').value
      }).then(function (res) {
        btn.disabled = false;
        if (res.error) {
          say($('adLoginMsg'), explain(res.error), false);
          return;
        }
        say($('adLoginMsg'), '', true);
        $('adPass').value = '';
        enter(res.data.session);
      });
    });

    $('adLogout').addEventListener('click', function () {
      db.auth.signOut().then(showLogin);
    });
  }

  /* ---------- 信件 ---------- */

  function loadLetters() {
    $('adCount').textContent = '正在加载……';
    db.from('letters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(function (res) {
        if (res.error) {
          $('adCount').textContent = '加载失败：' + explain(res.error);
          return;
        }
        letters = res.data || [];
        renderLetters();
      });
  }

  function currentFilter() {
    return {
      box: $('adBox').value,
      status: $('adStatus').value,
      q: $('adSearch').value.trim().toLowerCase()
    };
  }

  function filtered() {
    var f = currentFilter();
    return letters.filter(function (l) {
      if (f.box && l.mailbox !== f.box) return false;
      if (f.status && (l.status || 'ok') !== f.status) return false;
      if (f.q) {
        var hay = ((l.author_name || '') + ' ' + (l.content || '')).toLowerCase();
        if (hay.indexOf(f.q) === -1) return false;
      }
      return true;
    });
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    var p = function (x) { return x < 10 ? '0' + x : '' + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderLetters() {
    var list = filtered();
    var hidden = list.filter(function (l) { return l.status === 'hidden'; }).length;

    $('adCount').textContent = '共 ' + letters.length + ' 条（含回复），' +
      '当前筛出 ' + list.length + ' 条，其中已下架 ' + hidden + ' 条。';

    if (!list.length) {
      $('adList').innerHTML = '<p class="ad-empty">这里没有符合条件的信。</p>';
      return;
    }

    $('adList').innerHTML = list.map(function (l) {
      var isReply = !!l.parent_id;
      var isHidden = l.status === 'hidden';
      var cls = 'ad-item' + (isReply ? ' is-reply' : '') + (isHidden ? ' is-hidden' : '');

      return '<article class="' + cls + '" data-id="' + esc(l.id) + '">' +
        '<div class="ad-item-head">' +
          '<span class="ad-badge">' + esc(boxName[l.mailbox] || l.mailbox) + '</span>' +
          '<b>' + esc(l.author_name || '匿名') + '</b>' +
          (l.grad_year ? '<span class="ad-meta">' + esc(l.grad_year) + '</span>' : '') +
          '<span class="ad-meta">' + esc(fmtTime(l.created_at)) + '</span>' +
          (isReply ? '<span class="ad-tag ad-tag--reply">回复</span>' : '') +
          (isHidden ? '<span class="ad-tag ad-tag--hidden">已下架</span>' : '') +
        '</div>' +
        '<p class="ad-item-body">' + esc(l.content) + '</p>' +
        '<div class="ad-item-foot">' +
          (isHidden
            ? '<button class="ad-btn ad-btn--sm" type="button" data-act="ok">恢复展示</button>'
            : '<button class="ad-btn ad-btn--sm" type="button" data-act="hide">下架</button>') +
          '<button class="ad-btn ad-btn--sm ad-btn--danger" type="button" data-act="del">删除</button>' +
          '<span class="ad-meta">♥ ' + esc(l.likes || 0) + '</span>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function setStatus(id, status) {
    db.from('letters').update({ status: status }).eq('id', id).then(function (res) {
      if (res.error) { alert('操作失败：' + explain(res.error)); return; }
      for (var i = 0; i < letters.length; i++) {
        if (letters[i].id === id) letters[i].status = status;
      }
      renderLetters();
    });
  }

  function removeLetter(id) {
    var l = letters.filter(function (x) { return x.id === id; })[0];
    var isMain = l && !l.parent_id;
    if (!confirm(isMain
      ? '删掉这封信？它下面的回复会一起删掉，而且不能撤销。\n\n如果只是想让它不显示，用「下架」就够了。'
      : '删掉这条回复？不能撤销。')) return;

    db.from('letters').delete().eq('id', id).then(function (res) {
      if (res.error) { alert('删除失败：' + explain(res.error)); return; }
      letters = letters.filter(function (x) {
        return x.id !== id && x.parent_id !== id;
      });
      renderLetters();
    });
  }

  function bindLetters() {
    $('adReload').addEventListener('click', function () {
      loadLetters();
      loadWords();
    });
    $('adStatus').addEventListener('change', renderLetters);
    $('adBox').addEventListener('change', renderLetters);

    var timer = null;
    $('adSearch').addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(renderLetters, 180);
    });

    $('adList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var item = btn.closest('.ad-item');
      if (!item) return;
      var id = item.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'hide') setStatus(id, 'hidden');
      else if (act === 'ok') setStatus(id, 'ok');
      else if (act === 'del') removeLetter(id);
    });
  }

  /* ---------- 词库 ---------- */

  function loadWords() {
    $('adWordList').innerHTML = '<p class="ad-empty">正在加载……</p>';
    db.from('words').select('*').order('word').then(function (res) {
      if (res.error) {
        $('adWordList').innerHTML =
          '<p class="ad-empty">词库加载失败：' + esc(explain(res.error)) + '</p>';
        return;
      }
      words = res.data || [];
      renderWords();
    });
  }

  function renderWords() {
    if (!words.length) {
      $('adWordList').innerHTML = '<p class="ad-empty">词库是空的。' +
        '（前端会退回到代码里那份兜底词表，不会完全放行）</p>';
      return;
    }
    $('adWordList').innerHTML =
      '<p class="ad-note">共 ' + words.length + ' 个词</p><div class="ad-chips">' +
      words.map(function (w) {
        return '<span class="ad-chip">' +
          esc(w.word) +
          (w.note ? '<em>' + esc(w.note) + '</em>' : '') +
          '<button type="button" data-word-id="' + esc(w.id) + '" aria-label="删除">&times;</button>' +
        '</span>';
      }).join('') +
      '</div>';
  }

  function bindWords() {
    $('adWordForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('adWordInput');
      var w = input.value.trim();
      if (!w) return;

      db.from('words').insert([{
        word: w,
        note: $('adWordNote').value.trim() || null
      }]).then(function (res) {
        if (res.error) { say($('adWordMsg'), explain(res.error), false); return; }
        say($('adWordMsg'), '已添加「' + w + '」，访客刷新页面后生效。', true);
        input.value = '';
        $('adWordNote').value = '';
        loadWords();
      });
    });

    $('adWordList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-word-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-word-id');
      var chip = btn.closest('.ad-chip');
      var label = chip ? chip.textContent.replace('×', '').trim() : '这个词';
      if (!confirm('从词库里删掉「' + label + '」？删掉之后前端就不拦它了。')) return;

      db.from('words').delete().eq('id', id).then(function (res) {
        if (res.error) { say($('adWordMsg'), explain(res.error), false); return; }
        loadWords();
      });
    });
  }

  /* ---------- tab 切换 ---------- */

  function bindTabs() {
    $('adTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab]');
      if (!btn) return;
      var name = btn.getAttribute('data-tab');

      Array.prototype.forEach.call($('adTabs').children, function (b) {
        b.classList.toggle('is-on', b === btn);
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-pane]'), function (p) {
        p.hidden = p.getAttribute('data-pane') !== name;
      });
    });
  }

  /* ---------- 启动 ---------- */

  function init() {
    if (!CFG.supabaseUrl || !CFG.supabaseKey) {
      return fatal('还没配数据库：打开 js/config.js，把 supabaseUrl 和 supabaseKey 填上。');
    }
    if (typeof window.supabase === 'undefined') {
      return fatal('Supabase SDK 没加载出来（多半是网络拦了 CDN）。刷新一次，或者换个网络再试。');
    }

    db = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);

    // 信箱下拉
    $('adBox').innerHTML += BOXES.map(function (b) {
      return '<option value="' + esc(b.id) + '">' + esc(b.num + ' · ' + b.title) + '</option>';
    }).join('');

    bindLogin();
    bindLetters();
    bindWords();
    bindTabs();

    db.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (session) enter(session);
      else showLogin();
    });
  }

  init();
})();
