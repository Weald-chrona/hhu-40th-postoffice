/* ============================================================
   四十号邮局 · 内容风控（敏感词）
   ============================================================
   三道防线：

     1. check(text) —— 前端即时提示，命中就挡住投递按钮，不替用户改词
     2. mask(text)  —— 入库前兜底打码，把命中词替换成 **
     3. 后台审核     —— 管理员在 admin.html 里把漏网的信下架（status=hidden）

   词库分两层：
     · BASE_WORDS —— 写在代码里的兜底词，断网、数据库没配好时也照常工作
     · 远端词库   —— 存在 Supabase 的 words 表里，管理员在后台加删，改完刷新就生效
   只要远端拉到了，就以远端为准（这样管理员删掉的词是真的删掉了）。

   为什么要两处都做：前端拦是体验（当场告诉你哪句不合适），
   后台是兜底（前端词库随代码发布出去，真想绕总能绕）。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 兜底词库 ----------
     和 supabase/schema.sql 里的种子词保持一致；
     改这里记得同步那边，否则第一次连库时会有一段时间对不上。 */
  var BASE_WORDS = [
    // 辱骂与攻击
    '傻逼', '傻b', '煞笔', '沙比', '智障', '脑残', '废物', '滚蛋',
    '去死', '垃圾人', '白痴', 'low逼', '狗东西', '贱人', '你妈',
    'tmd', 'nmsl', 'cnmb', 'rnm',
    // 广告与引流
    '加微信', '加v信', '加薇信', '私聊我', '代写', '代做', '包过',
    '低价出', '扫码进群', '刷单', '兼职日结', '日入过万',
    // 垃圾信息
    '推广链接', '点击链接', '免费领取', '内部资料出售', '加我微信',
    // 其他不宜出现在校园页面的内容
    '约炮', '裸聊', '赌场', '博彩', '办证', '发票代开'
  ];

  /* ---------- 保护词 ----------
     有些正常话里合法地含有脏词片段，直接做字面包含会误杀：
       「妈妈的话」含「妈的」  「你妈妈」含「你妈」
     检查之前先把它们换成占位符，查完再还原。 */
  var PROTECT = ['妈妈', '爸妈', '姑妈', '姨妈', '舅妈', '大妈', '妈宝', '后妈', '干妈'];
  var PH = '\u0001';

  /* ---------- 组合规则 ----------
     两个字母的缩写不能直接进词库：「Sb」是锑元素，「sb」也可能是正常缩写，
     一刀切会误伤。所以改成「缩写 + 骂的对象」同时出现才算，
     比如「sb学校」「这学院真sb」「sb老师」。
     这类规则写在代码里，不放进 words 表 —— 它需要词性判断，
     后台做一个「加个词」的输入框没法表达。 */
  var COMBO = [
    {
      re: /(sb|shabi|sha逼|傻b|傻逼|煞笔).{0,3}(学校|大学|学院|校区|老师|导员|辅导员|河海|信息院|专业|院系|上课)/,
      label: '辱骂'
    },
    {
      re: /(学校|大学|学院|校区|老师|导员|辅导员|河海|信息院|专业|院系|上课).{0,3}(sb|shabi|sha逼|傻b)/,
      label: '辱骂'
    }
  ];

  /* ---------- 远端词库 ---------- */
  var CACHE_KEY = 'po_words_cache_v1';
  var remoteWords = null;   // null = 还没拉到远端，用 BASE_WORDS

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      var arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) && arr.length ? arr : null;
    } catch (e) { return null; }
  }

  function writeCache(list) {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  /** 当前生效的词表 */
  function activeWords() {
    return remoteWords && remoteWords.length ? remoteWords : BASE_WORDS;
  }

  /**
   * 从数据库拉词库。拉不到就维持现状（缓存 / 兜底词），不影响写信。
   * @param {Object} client supabase 客户端，可为 null（演示模式）
   * @param {Function} done 回调，参数是最终生效的词表
   */
  function loadRemote(client, done) {
    var done1 = typeof done === 'function' ? done : function () {};

    // 先挂上上次的缓存，网络慢也不会空手
    var cached = readCache();
    if (cached) remoteWords = cached;

    if (!client || typeof client.from !== 'function') return done1(activeWords());

    try {
      client.from('words').select('word').then(function (res) {
        // 出错就保持现状；成功且非空才整体替换，避免表被清空时全放行
        if (!res || !res.error) {
          var list = [];
          var rows = (res && res.data) || [];
          for (var i = 0; i < rows.length; i++) {
            var w = rows[i] && rows[i].word;
            if (w) list.push(String(w));
          }
          if (list.length) {
            remoteWords = list;
            writeCache(list);
          }
        }
        done1(activeWords());
      }, function () { done1(activeWords()); });
    } catch (e) { done1(activeWords()); }
  }

  /* ---------- 归一化 ---------- */
  function shield(text) {
    var s = String(text == null ? '' : text);
    for (var i = 0; i < PROTECT.length; i++) {
      s = s.split(PROTECT[i]).join(PH + i + PH);
    }
    return s;
  }

  function unshield(text) {
    var s = String(text == null ? '' : text);
    for (var i = 0; i < PROTECT.length; i++) {
      s = s.split(PH + i + PH).join(PROTECT[i]);
      // 兜底：占位符被打码打散了也要还原，不留控制字符
      s = s.split(PH + i).join(PROTECT[i].slice(0, 1));
    }
    return s.replace(new RegExp(PH, 'g'), '');
  }

  /** 去掉空格和常见分隔符，防止「傻 逼」绕过 */
  function normalize(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[\s\u3000\-_*·.。~～|/\\]+/g, '');
  }

  /**
   * 检查是否命中敏感内容
   * @returns {Array} 命中的词（或规则标签）数组，空数组表示没问题
   */
  function check(text) {
    var raw = shield(text);
    var t = normalize(raw);
    if (!t) return [];

    var hits = [];

    // 第一层：词库里的词
    var words = activeWords();
    for (var i = 0; i < words.length; i++) {
      var w = normalize(words[i]);
      if (w && t.indexOf(w) !== -1 && hits.indexOf(words[i]) === -1) hits.push(words[i]);
    }

    // 第二层：缩写 + 对象的组合规则
    for (var j = 0; j < COMBO.length; j++) {
      if (COMBO[j].re.test(t) && hits.indexOf(COMBO[j].label) === -1) {
        hits.push(COMBO[j].label);
      }
    }

    // 第三层：整句就是俩字母在骂人（「sb」单独一句），这种也拦
    if (t.length <= 6 && /^(sb|shabi|nmsl|cnmb|tmd|rnm)$/.test(t) &&
        hits.indexOf('辱骂') === -1) {
      hits.push('辱骂');
    }

    return hits;
  }

  function escapeReg(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 入库前兜底打码：把命中词替换成 **
   * 归一化后字符位置会变，所以这里用「逐词替换原文」的方式处理。
   * 组合规则（需要词性判断的那种）不在这里打码 —— 它靠 check 拦住，
   * 真漏了还有管理员下架这一道。
   */
  function mask(text) {
    var out = shield(text);
    var words = activeWords();

    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      // 原文直接出现
      out = out.replace(new RegExp(escapeReg(w), 'gi'), '**');
      // 中间插了分隔符的变体，如「傻 逼」「傻.逼」
      var withGap = w.split('').map(escapeReg).join('[\\s\\u3000\\-_*.。·~～]{0,2}');
      out = out.replace(new RegExp(withGap, 'gi'), '**');
    }

    return unshield(out);
  }

  window.PO_SENSITIVE = {
    check: check,
    mask: mask,
    loadRemote: loadRemote,
    /** 当前生效的词表（远端优先），后台和调试用 */
    list: activeWords,
    /** 代码里那份兜底词，只读 */
    words: BASE_WORDS
  };
})();
