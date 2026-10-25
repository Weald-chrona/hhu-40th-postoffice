/* ============================================================
   四十号邮局 · 内容风控（敏感词）
   ============================================================
   两道防线：
     1. check(text) —— 前端即时提示，命中就挡住投递按钮，不替用户改词
     2. mask(text)  —— 入库前兜底打码，把命中词替换成 **

   词库放在 WORDS 数组里，需要增删直接往里加，一行一个。
   演示答辩时可以说：「我们在前端提示和入库打码两处都做了内容风控」。
   ============================================================ */
(function () {
  var WORDS = [
    // 辱骂与攻击
    '傻逼', '煞笔', '沙比', '智障', '脑残', '废物', '滚蛋', '去死',
    '垃圾人', '白痴', 'lowb', 'low逼',
    // 广告与引流
    '加微信', '加v信', '加薇信', '私聊我', '代写', '代做', '包过',
    '低价出', '扫码进群', '刷单', '兼职日结', '日入过万',
    // 垃圾信息
    '广告', '推广链接', '点击链接', '免费领取', '内部资料出售',
    // 其他不宜出现在校园页面的内容
    '约炮', '裸聊', '赌场', '博彩', '办证', '发票代开'
  ];

  // 归一化：去掉空格和常见分隔符，防止「傻 逼」绕过
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\s\u3000\-_*·.。]/g, '');
  }

  /**
   * 检查是否命中敏感词
   * @returns {Array} 命中的词数组，空数组表示没问题
   */
  function check(text) {
    var t = normalize(text);
    var hits = [];
    for (var i = 0; i < WORDS.length; i++) {
      if (t.indexOf(normalize(WORDS[i])) !== -1) hits.push(WORDS[i]);
    }
    return hits;
  }

  /**
   * 入库前兜底打码：把命中词替换成 **
   * 归一化后字符位置会变，所以这里用「逐词替换原文」的方式处理。
   */
  function mask(text) {
    var out = String(text || '');
    for (var i = 0; i < WORDS.length; i++) {
      var w = WORDS[i];
      var re = new RegExp(escapeReg(w), 'gi');
      out = out.replace(re, '**');
      // 处理中间插了分隔符的变体，如「傻 逼」
      var withGap = w.split('').join('[\\s\\u3000\\-_*.。·]{0,2}');
      out = out.replace(new RegExp(withGap, 'gi'), '**');
    }
    return out;
  }

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  window.PO_SENSITIVE = {
    check: check,
    mask: mask,
    words: WORDS
  };
})();
