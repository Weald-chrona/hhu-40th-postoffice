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
t('未填 key 时进入演示模式', !(C.supabaseUrl && C.supabaseKey));
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

console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
