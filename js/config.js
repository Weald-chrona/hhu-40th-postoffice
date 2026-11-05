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
   noYear：这一格不收「入学年份」（教职工没有入学年份），留空也能寄。

   stamp：这一格的信封邮票长什么样（一箱一版）。
     paper  纸底    ink  正文字色
     accent 面值/邮戳色（每格唯一的识别色）
     edge   外框色    seal 邮戳里那两个字    series 票面角上的辑数

   art：票面插画（手绘花稿）。指向 images/stamps/ 下的图，要求**白底**——
   叠加用的是 multiply（white × 纸色 = 纸色），所以纸面得是纯白，米黄底会留灰块。
   图片处理脚本见 shots/atlas/whiten.html（洗纸色 + 裁边 + 居中成 900×900）。
   留空则退回 motif 的程序线稿。

   artBox：花稿在票面上的落位 [x, y, 边长]，单位是 600 × 380 的设计坐标，
   左上角为原点。图都是 900 × 900 正方形，所以只给边长，画会等比铺满这个方块；
   花开在哪一角、要不要出血到纸边，全靠这三个数按各自形状调——
   桂花那种「枝从右上垂下来」的图就往右上角放，花瓶那种竖长的就贴右缘走满高度。

   纸底一箱一色，六个年代用六种旧纸，像从不同年份的档案盒里各抽出一张：
     壹 牛皮黄（档案袋）  贰 旧酒红（红砂纸）    叁 蓝图蓝（工程晒图纸）
     肆 暖米（信纸）      伍 淡青（新纸带青）    陆 账本绿（旧账簿封皮）
   （贰和陆的绿/红在 11-05 按用户要求对调过，原来贰是账本绿、陆是旧酒红）
   要点是「旧」不是「艳」：饱和度压到 20% 上下、明度一律 80% 左右，
   颜色再跳也像被年月洗过一遭。纸纹和污渍色由 letters.js 按纸色算，
   所以蓝纸上落的是灰蓝的渍、绿纸上是灰绿的渍，不会糊成一块脏黄。 */
window.PO_MAILBOXES = [
  { id: '1986-1995', num: '壹', title: '一九八六 — 一九九五', desc: '创院十年',
    range: [1986, 1995], series: '第一辑', seal: '创院', motif: 'lab', art: 'images/stamps/f1-w.png', artBox: [325, -10, 350],
    stamp: { paper: '#E0C795', ink: '#2F4858', accent: '#A6382E', edge: '#BDA26C' } },

  { id: '1996-2005', num: '贰', title: '一九九六 — 二〇〇五', desc: '世纪跨越',
    range: [1996, 2005], series: '第二辑', seal: '跨越', motif: 'crt', art: 'images/stamps/f2-w.png', artBox: [262, 40, 355],
    /* 2026-11-05 用户要求：贰的账本绿和陆的红砂色对调（整组换，字色和金标跟着纸走） */
    stamp: { paper: '#D3AC95', ink: '#7E2A22', accent: '#B8902C', edge: '#B3957E' } },

  { id: '2006-2015', num: '叁', title: '二〇〇六 — 二〇一五', desc: '信息提速',
    range: [2006, 2015], series: '第三辑', seal: '提速', motif: 'chip', art: 'images/stamps/f3-w.png', artBox: [302, 36, 320],
    stamp: { paper: '#B6C5D4', ink: '#1F3A6E', accent: '#A34A2E', edge: '#96A7B8' } },

  { id: '2016-2025', num: '肆', title: '二〇一六 — 二〇二五', desc: '智启新程',
    range: [2016, 2025], series: '第四辑', seal: '智启', motif: 'chart', art: 'images/stamps/f4-w.png', artBox: [274, 41, 390],
    stamp: { paper: '#EBD8B1', ink: '#1E5F5A', accent: '#C2842E', edge: '#C7B37E' } },

  { id: '2026-fresh', num: '伍', title: '二〇二六 · 新生', desc: '写给未来四年',
    range: [2026, 2026], series: '第五辑', seal: '新声', motif: 'letter', art: 'images/stamps/f5-w.png', artBox: [285, 40, 360],
    stamp: { paper: '#BBD2C9', ink: '#A8452A', accent: '#B54A2E', edge: '#96ADA4' } },

  { id: 'faculty', num: '陆', title: '教职工信箱', desc: '师长寄语', noYear: true,
    series: '第六辑', seal: '教席', motif: 'podium', art: 'images/stamps/f6-w.png', artBox: [258, 42, 340],
    /* 换来的是贰原来那套账本绿 */
    stamp: { paper: '#C3CCA0', ink: '#2E4A32', accent: '#8C6A2F', edge: '#9FA97B' } }
];

/* 票面版面（纸色 + 花稿）要不要跟信箱解绑。

   true  —— 一封信投进哪一格，跟它拿到哪一版的纸没有关系：六种旧纸随机落到每一封上。
            种子只取信件 id，所以这一封永远是这一版，刷新、点赞都不会变。
   false —— 回到老规矩：壹格的信一定是牛皮黄配梧桐，一格一款。

   注意：随机的只有纸色和花稿。右上角的年代、抬头后的「第几辑」、邮戳里的印文
   仍然跟着信箱走 —— 那是这封信投进哪一格的事实。 */
window.PO_STAMP_RANDOM = true;

/* 特别版（首日封 / 第 40 封 / 第 100 封）用的配色，见 js/letters.js 的 isSpecialStamp。

   六张常用票的纸都是被人翻了二十年的旧纸：牛皮档案袋、账簿封皮、晒图蓝、教案纸。
   首日封不是 —— 它是当天盖戳、当天寄出的那一张，纸还是新的。
   所以这一张反过来做：全站最干净的一张象牙白，烫金是它唯一的彩色。
   age 0.45 是把这张纸的「旧」压到四成半 —— 水渍、纸纤维、四边压暗一起减，
   不然它混在六张旧纸里，看着也像在抽屉里放了二十年。 */
window.PO_GOLD_STAMP = { paper: '#F2EBD8', ink: '#5C4413', accent: '#B8862A', edge: '#D8C69C', age: 0.5 };

/* 入学年份的区间。下限是 1986 —— 学院这一年建院，再往前没有「入学」这回事 */
window.PO_YEAR_RANGE = { min: 1986, max: 2026 };
