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

console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
