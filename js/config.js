/* ============================================================
   四十号邮局 · 配置层
   ============================================================
   这两个 key 目前是空的，网站会自动进入「本地演示模式」：
   写的信存在浏览器 localStorage 里，刷新还在，界面完全一样。
   等你把 Supabase 建好，把两个值填进来（引号内直接粘贴），
   刷新页面就会自动切到真实数据库，不用改任何别的代码。
   ============================================================ */
window.PO_CONFIG = {
  // Supabase 项目地址（区域：东京）
  supabaseUrl: 'https://glsxokmwacudzvrnuhtq.supabase.co',

  // Publishable key（公开密钥，可以放进前端；数据安全由数据库 RLS 负责）
  supabaseKey: 'sb_publishable_Oaytp5vybQxVnRRKPsvPxw_DrOcTSN0',

  // 每页最多显示多少封信
  pageSize: 30,

  // 留言最长字数（与 textarea 的 maxlength 保持一致）
  maxLength: 500
};

/* 六个信箱。改标题、改顺序、增删信箱都只改这个数组。
   range：这个信箱收哪几年入学的信。写信时填的入学年份决定信投进哪一格，
   所以年份和信箱不会打架；range 之间必须首尾相接、不留空档（1986–2026 全覆盖）。
   noYear：这一格不收「入学年份」（教职工没有入学年份），留空也能寄。 */
window.PO_MAILBOXES = [
  { id: '1986-1995', num: '壹', title: '一九八六 — 一九九五', desc: '创院十年', range: [1986, 1995] },
  { id: '1996-2005', num: '贰', title: '一九九六 — 二〇〇五', desc: '世纪跨越', range: [1996, 2005] },
  { id: '2006-2015', num: '叁', title: '二〇〇六 — 二〇一五', desc: '信息提速', range: [2006, 2015] },
  { id: '2016-2025', num: '肆', title: '二〇一六 — 二〇二五', desc: '智启新程', range: [2016, 2025] },
  { id: '2026-fresh', num: '伍', title: '二〇二六 · 新生', desc: '写给未来四年', range: [2026, 2026] },
  { id: 'faculty', num: '陆', title: '教职工信箱', desc: '师长寄语', noYear: true }
];

/* 入学年份的区间。下限是 1986 —— 学院这一年建院，再往前没有「入学」这回事 */
window.PO_YEAR_RANGE = { min: 1986, max: 2026 };
