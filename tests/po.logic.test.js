/* ============================================================
   四十号邮局 · 纯逻辑自检
   跑法：在本仓库根目录执行   node tests/po.logic.test.js
   只测不依赖浏览器的部分：敏感词两道防线 + 配置完整性。
   ============================================================ */
const path = require('path');

global.window = {};
require(path.join(__dirname, '..', 'js', 'sensitiveWords.js'));
require(path.join(__dirname, '..', 'js', 'config.js'));

const S = global.window.PO_SENSITIVE;
const C = global.window.PO_CONFIG;
const B = global.window.PO_MAILBOXES;

let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

console.log('=== 敏感词 check() ===');
t('正常留言不命中', S.check('祝愿学院四十岁生日快乐').length === 0);
t('辱骂词命中', S.check('你这个傻逼').length > 0);
t('中间插空格也能命中', S.check('你这个傻 逼').length > 0);
t('大小写混写也能命中', S.check('加V信联系我').length > 0);
t('广告引流命中', S.check('兼职日结，私聊我').length > 0);

console.log('=== 缩写与误伤控制 ===');
/* 两个字母的缩写不能直接进词库：Sb 是锑元素，一刀切会误伤。
   所以用「缩写 + 骂的对象」的组合规则，加上整句只有缩写时的兜底。 */
t('「sb学校」命中', S.check('sb学校').length > 0);
t('「这学院真sb」反向也命中', S.check('这学院真sb').length > 0);
t('「sb 学校」中间有空格也命中', S.check('sb 学校').length > 0);
t('带化学符号的正常内容不误伤', S.check('Sb-Fe 合金的电阻率测了三遍').length === 0);
t('「你妈妈最近还好吗」不误伤', S.check('你妈妈最近还好吗').length === 0);
t('「你妈的」还是拦', S.check('你妈的').length > 0);
t('整句只有 sb 也拦', S.check('sb').length > 0);

console.log('=== 敏感词 mask() ===');
const m1 = S.mask('你这个傻逼');
t('打码后不再命中', S.check(m1).length === 0, m1);
t('打码结果含 **', m1.indexOf('**') !== -1, m1);
const m2 = S.mask('正常内容不受影响');
t('正常内容不被改', m2 === '正常内容不受影响', m2);

console.log('=== 配置完整性 ===');
t('六个信箱', B.length === 6, B.length);
t('信箱 id 唯一', new Set(B.map(b => b.id)).size === B.length);
t('已填 Supabase key（连真实库）',
  /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(C.supabaseUrl) && C.supabaseKey.length > 20);
t('字数上限 500', C.maxLength === 500);

console.log('=== 入学年份与信箱的对应 ===');
/* 写信时按入学年份决定信投哪一格，所以每一年都得正好有一个信箱接住：
   range 首尾相接、不留空档、不重叠，并且盖满 PO_YEAR_RANGE。 */
const Y = global.window.PO_YEAR_RANGE;
const ranged = B.filter(b => b.range).sort((a, b) => a.range[0] - b.range[0]);
t('学生信箱都配了 range', ranged.length === B.length - 1, ranged.length);
t('年份下限是建院年 1986', Y.min === 1986, Y.min);
t('range 从下限起到上限止',
  ranged[0].range[0] === Y.min && ranged[ranged.length - 1].range[1] === Y.max,
  ranged[0].range[0] + '~' + ranged[ranged.length - 1].range[1]);

let gap = null, overlap = null;
for (let i = 1; i < ranged.length; i++) {
  if (ranged[i].range[0] !== ranged[i - 1].range[1] + 1) {
    const bad = ranged[i - 1].id + ' → ' + ranged[i].id;
    if (ranged[i].range[0] > ranged[i - 1].range[1]) gap = bad;
    else overlap = bad;
  }
}
t('每年都落得进某一格（无空档）', !gap, gap);
t('两个信箱不抢同一年（无重叠）', !overlap, overlap);

const faculty = B.find(b => b.noYear);
t('教职工信箱不收「入学年份」', !!faculty && !faculty.range, faculty && faculty.id);

console.log('=== 邮票配色（一箱一版） ===');
/* 每格信箱都得带一套完整的 stamp 配色，否则 palOf() 会退回默认色，
   六张票就会长得一样。四色缺一不可，还必须是 #rrggbb。 */
const HEX = /^#[0-9a-f]{6}$/i;
const PAL_KEYS = ['paper', 'ink', 'accent', 'edge'];
t('每个信箱都有 stamp 配色', B.every(b => b.stamp && typeof b.stamp === 'object'));
t('四个颜色一个不缺',
  B.every(b => PAL_KEYS.every(k => typeof b.stamp[k] === 'string')));
t('颜色都是 6 位十六进制',
  B.every(b => PAL_KEYS.every(k => HEX.test(b.stamp[k]))),
  B.filter(b => PAL_KEYS.some(k => !HEX.test(b.stamp[k] || ''))).map(b => b.id).join(','));
t('九种配色不重样（六格各不相同）',
  new Set(B.map(b => PAL_KEYS.map(k => b.stamp[k].toLowerCase()).join('|'))).size === B.length);
t('每格都有辑数和邮戳字',
  B.every(b => typeof b.series === 'string' && b.series && typeof b.seal === 'string' && b.seal));
t('烫金特别版配色存在', !!global.window.PO_GOLD_STAMP &&
  HEX.test(global.window.PO_GOLD_STAMP.accent));

/* 特别版以前是直接把 PO_GOLD_STAMP 当 pal 用的，deep / stain 两个派生色是空的：
   年份那行页面上跳过赋值、导出时 canvas 吃到上一次的 fillStyle。
   现在两套配色都过 makePal()，所以配置里同样只要求这四个色，别写派生色。 */
const GOLD_CFG = global.window.PO_GOLD_STAMP || {};
t('特别版也配齐四个色',
  PAL_KEYS.every(k => HEX.test(GOLD_CFG[k] || '')),
  PAL_KEYS.filter(k => !HEX.test(GOLD_CFG[k] || '')).join(','));
t('特别版的纸和六张常用票都不撞色',
  !B.some(b => b.stamp.paper.toLowerCase() === String(GOLD_CFG.paper).toLowerCase()));
t('特别版是新封：age 在 0 和 1 之间',
  typeof GOLD_CFG.age === 'number' && GOLD_CFG.age > 0 && GOLD_CFG.age < 1,
  GOLD_CFG.age);

console.log('=== 票面插画（一箱一图） ===');
/* 插画只写一份笔画数据：页面拼成 SVG、导出用 Path2D。
   这里校验「每格都有自己的年代物」「六个不重样」，以及构图用的画布尺寸和
   正文节选上限有没有被谁改坏（改了页面和导出会一起错位）。 */
const fs = require('fs');
const lettersSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'letters.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(__dirname, '..', 'css', 'postoffice.css'), 'utf8');
const eraBlock = lettersSrc.slice(lettersSrc.indexOf('function sceneEra'), lettersSrc.indexOf('function strokePath'));
const hasEra = k => new RegExp("key === '" + k + "'").test(eraBlock);

t('每格都指定了插画', B.every(b => typeof b.motif === 'string' && b.motif));
t('六个插画各不相同', new Set(B.map(b => b.motif)).size === B.length);
t('插画都在 sceneEra 里定义', B.every(b => hasEra(b.motif)),
  B.filter(b => !hasEra(b.motif)).map(b => b.motif).join(','));
t('插画画布是 180 × 100', /SCENE_W = 180,\s*SCENE_H = 100/.test(lettersSrc));
t('正文节选上限是 28 字（横排两行，一行 14 字）', /QUOTE_MAX = 28/.test(lettersSrc) &&
  /function quoteLines/.test(lettersSrc));
t('正文按中间断成两行', /s\.length <= 14/.test(lettersSrc) &&
  /Math\.ceil\(s\.length \/ 2\)/.test(lettersSrc));
t('票面正文横排，不是竖排', !/writing-mode:\s*vertical/.test(cssSrc));
t('邮戳在右上角，页面与导出同一组坐标', /left: 84\.33%/.test(cssSrc) &&
  /var cx = 506, cy = 116/.test(lettersSrc));
t('页面与导出共用同一份 path', /function sketchCSS/.test(lettersSrc) &&
  /sketchOf\(deco\.id\)/.test(lettersSrc));

/* 手绘花稿上票：每格一张白底图，页面 <img> 与导出 canvas 用的必须是同一张。
   图缺失会让票面退回程序线稿（不至于开天窗），但答辩前必须发现，所以这里查文件存在 */
const artFiles = B.map(b => b.art).filter(Boolean);
t('每格都指定了手绘花稿', artFiles.length === B.length,
  B.filter(b => !b.art).map(b => b.id).join(','));
t('六张花稿各不相同', new Set(artFiles).size === artFiles.length);
t('花稿文件都在 images/stamps/ 下',
  artFiles.every(p => /^images\/stamps\/[\w.\-]+$/.test(p) &&
    fs.existsSync(path.join(__dirname, '..', p))),
  artFiles.filter(p => !fs.existsSync(path.join(__dirname, '..', p))).join(','));
t('页面与导出用同一张花稿', /artOf\(deco\.id\)/.test(lettersSrc) &&
  /class="po-stamp-pic"/.test(lettersSrc));

console.log('=== 纪念墙 ===');
/* 墙上的票必须「同一个 id 永远在同一个位置」：位置由 hashId + spread 算，
   谁要是图省事换成 Math.random，点个赞整墙就会重贴一遍。 */
const wallSrc = lettersSrc.slice(lettersSrc.indexOf('function renderWall'),
  lettersSrc.indexOf('function groupReplies'));
t('墙上票的位置只由 id 决定', /hashId\(l\.id\)/.test(wallSrc) &&
  /spread\(h, 1\)/.test(wallSrc) && !/Math\.random/.test(wallSrc));
t('角度与错位都落在设定的范围内',
  /\* 6\.4/.test(wallSrc) && /\* 22/.test(wallSrc) && /\* 12/.test(wallSrc));
t('墙上张数有上限', /WALL_MAX = \d+/.test(lettersSrc));
t('点墙上的票打开的是同一个浮层',
  /\[data-wall-id\]/.test(lettersSrc) && /showStamp\(row\)/.test(lettersSrc));
/* 票是按 0.4 缩小的。这里必须用 zoom 不能用 transform：transform 会把
   mix-blend-mode 的插画提成合成层，正片叠底的白底花稿会整块跑位 */
t('墙上的票用 zoom 缩小，不用 transform',
  /\.po-wall-tile \.po-stamp-card \{[\s\S]*?zoom: 0\.4/.test(cssSrc) &&
  !/\.po-wall-tile[^{]*\{[^}]*transform:\s*scale/.test(cssSrc));
t('墙上的票宽度写死，别让小屏那条 width:100% 接管',
  /\.po-wall-tile \.po-stamp-card \{[\s\S]*?width: 320px/.test(cssSrc));
t('空墙收掉深色墙板', /is-empty/.test(lettersSrc) &&
  /\.po-wall\.is-empty \.po-wall-board \{ display: none/.test(cssSrc));

console.log('=== 邮戳与内框（页面 / 导出对齐） ===');
/* 导出那张图以前比页面多两道内框，同一个版式两套样子。
   现在两边都不画 —— 票面外那圈识别色的边已经把它框住了。 */
t('导出的票不再多画内框', !/strokeRect\(24, 24/.test(lettersSrc) &&
  !/strokeRect\(32, 32/.test(lettersSrc));
/* 邮戳压在花稿最密的那一角，必须垫一层纸色才读得出来；页面和导出都要垫 */
t('邮戳底下垫了纸色', /--st-veil/.test(lettersSrc) && /--st-veil/.test(cssSrc) &&
  /createRadialGradient\(cx, cy/.test(lettersSrc));
/* 邮戳色单独派生：用 accent 太淡，用 deep 在蓝纸上会压成深藏青看不见 */
t('邮戳用 post 色，不是 accent / deep', /post:\s*mixHex\(accent, ink, 0\.3\)/.test(lettersSrc) &&
  /--st-post/.test(lettersSrc) && /var\(--st-post/.test(cssSrc));
t('页面与导出的邮戳同圆心', /var cx = 506, cy = 116/.test(lettersSrc) &&
  /left: 84\.33%/.test(cssSrc) && /top: 30\.53%/.test(cssSrc));

/* 「这张纸有多旧」只有一个系数（pal.age），它得同时管住三样：
   水渍浓度、纸纤维的深浅、四边压暗。少管一样，特别版就会半新半旧 ——
   纸是白的、边上还压着一圈陈年黄。页面那两样读 --st-age，导出那两样读 pal.age。 */
t('age 同时管水渍、纸纤维、四边压暗', /w\.a \* k/.test(lettersSrc) &&
  /0\.62 \* age/.test(lettersSrc) && /VIGNETTE\.a \* age/.test(lettersSrc));
t('页面侧靠 --st-age 接同一个系数', /--st-age/.test(lettersSrc) &&
  (cssSrc.match(/var\(--st-age/g) || []).length >= 2);

console.log('=== 版面随机 ===');
/* 一张票的纸色和花稿从六版里抽，跟投进哪一格无关。
   关键是「只由 id 决定」：掺了 Math.random 的话，点个赞整墙重贴，
   同一封信存两次会得到两张不一样的票。 */
t('配置里有版面随机的开关', global.window.PO_STAMP_RANDOM === true);
const decoBody = lettersSrc.slice(lettersSrc.indexOf('function decoOf'),
  lettersSrc.indexOf('function palOf(row)'));
t('抽版面以信件 id 为种子', /hashId\(/.test(decoBody) && /row\.id/.test(decoBody));
t('抽版面不掺随机数', !/Math\.random/.test(decoBody));
t('开关关掉就退回按信箱配', /PO_STAMP_RANDOM === false\) return b/.test(decoBody));
const decoCalls = lettersSrc.match(/var deco = gold \? b : decoOf\(row\);/g) || [];
t('页面与导出各抽一次、特别版不参与', decoCalls.length === 2, String(decoCalls.length));
t('文字仍跟着信箱走', /var b = boxById\(row\.mailbox\)/.test(lettersSrc));

console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
