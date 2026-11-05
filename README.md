# 四秩砺行 · 信领新途

河海大学信息科学与工程学院建院四十周年主题网站 —— 第十二届网页设计大赛参赛作品骨架。

一，院史时间轴
表达形式：画轴？

二，学科与成果
数据图表展示？（这个有待商榷）

三：校友风采

四：四十号邮局
表达形式：分六个信箱（按照入学时间来）：1986-1995，1996-2005，2006-2015，2016-2025.2026新生，教职工
不需要用户注册，署名，填写入学年份进行留言，留言后获得纪念邮票截图
所有人可以查看留言并回复——————敏感词屏蔽

---

## 分工与协作约定

### 每个人负责哪一块

| 负责人 | 分支 | 板块 | 你只需要改这些文件 |
|---|---|---|---|
| 队友 A | `feat/history-timeline` | 一、院史时间轴 | `sections/history.js`、`css/history.css` |
| 队友 B | `feat/achievements-alumni` | 二、学科成果 + 三、校友风采 | `sections/achievements.js`、`sections/alumni.js`、`css/achievements.css`、`css/alumni.css` |
| 我（组长） | `feat/40th-postoffice` | 四、四十号邮局（动态） | `sections/postoffice.js`、`css/postoffice.css`、`js/letters.js`、`js/config.js`、`supabase/schema.sql` |

**一句话原则：自己的活只在自己那几个文件里改，别碰别人的。**
真要改公共部分（导航栏、页脚、`css/style.css`），先在群里说一声。

### 每天的工作流程

开工前，拉一下别人的最新改动：

```bash
git checkout 你自己的分支名
git pull
git merge dev
```

收工前，提交并推送：

```bash
git add .
git commit -m "写清楚你改了啥"
git push
```

最后统一由组长把各分支合并回 `dev`。

### 目录结构

```
index.html              页面骨架：导航、主视觉、页脚。基本不用改
about.html              学院概况页
admin.html              内容管理后台（只有管理员用，导航里不出现）
css/
  style.css             公共样式（变量、导航、主视觉、页脚、通用区块）
  assets-inline.css     内联资源（别改）
  history.css           ← 队友 A
  achievements.css      ← 队友 B
  alumni.css            ← 队友 B
  postoffice.css        ← 组长
  admin.css             后台样式（只有 admin.html 用）
  responsive.css        所有 @media 响应式规则，最后加载
sections/
  history.js            ← 队友 A
  achievements.js       ← 队友 B
  alumni.js             ← 队友 B
  postoffice.js         ← 组长
js/
  main.js               滚动动画、导航、轮播等公共交互
  config.js             邮局配置：Supabase key、六个信箱、字数上限
  sensitiveWords.js     屏蔽词：兜底词库 + 组合规则 + 远端词库同步
  letters.js            邮局主逻辑：存取、渲染、写信、看信
  admin.js              后台逻辑：登录、下架信件、管词库
images/                 图片资源
supabase/
  schema.sql            建表 + RLS + 词库种子词
  配置步骤.md            从注册到后台能用的完整步骤
```

`sections/*.js` 里就是各板块的 HTML，改法和改 HTML 一样，外面包了一层
`(function(){ ... })();` 是必须的外壳，不要删。

> ⚠️ `index.html` 里 `<link>` 的顺序是**加载顺序**，也是样式层叠的先后，别随便调。
> 要做移动端适配，写进 `css/responsive.css`。

---

## 四十号邮局：两种模式

### 现在打开就是「本地演示模式」

`js/config.js` 里两个 key 是空的，所以信件存在浏览器的 localStorage 里——
**写信 → 出现在信箱里 → 刷新页面还在**，完整流程都能跑，只是数据只在这台电脑上。

演示答辩、录视频用这个模式就够了，不需要网络，也不需要数据库。

### 切到真实数据库（Supabase）

详细步骤见 `supabase/配置步骤.md`，这里是要点：

1. 打开 supabase.com 新建项目（免费，区域选新加坡）
2. 左侧 **SQL Editor** → 把 `supabase/schema.sql` 整段粘进去 → **Run**
   这一步会建好 `letters` / `words` / `admins` 三张表、开启 RLS、创建点赞函数
3. **Authentication → Users → Add user** 建一个管理员账号（记得勾 Auto Confirm User）
4. 回到 SQL Editor，把这个邮箱登记成管理员：
   ```sql
   insert into public.admins (email) values ('你的邮箱@example.com');
   ```
5. **Project Settings → API** 里复制两个值，填进 `js/config.js`：

```js
supabaseUrl: 'https://xxxxxxxx.supabase.co',   // Project URL
supabaseKey: 'eyJhbGciOi...',                  // anon public
```

刷新页面，写信区会显示「已连接云端数据库」，之后写的信就存在云上了。
**不用改任何其他代码。**

> ⚠️ RLS 一定要开（schema.sql 里已经开了）。anon key 会随网页发出去，
> 任何人都能看到，没有 RLS 就等于数据库裸奔。

### 内容管理后台（admin.html）

配好数据库之后，打开 `admin.html`，用第四步那个邮箱密码登录。

- **信件审核**：按信箱/状态筛选、搜关键词；「下架」= 从所有人页面消失但数据还在，
  「删除」= 真删（主信会连带删掉它的回复）
- **屏蔽词库**：加词删词，访客刷新页面生效

权限不在前端判断——数据库的 RLS 只认 `admins` 表里的邮箱，
就算有人拿到 anon key 直接调接口，改不了也删不掉。

### 屏蔽词怎么工作的

三层，缺一层都容易被绕：

1. **兜底词库**（`sensitiveWords.js` 里的 `BASE_WORDS`）—— 前端即时拦截，断网也能用
2. **组合规则**—— 两个字母的缩写不单拦（`Sb` 是锑元素），
   要「缩写 + 骂的对象」同时出现才拦，比如 `sb学校`；「妈妈」「爸妈」这类词先保护起来，不误伤
3. **后台下架**—— 前两条都漏了，管理员在 `admin.html` 里把那条撤掉

词库本身存在 Supabase 的 `words` 表里，所以加词不用改代码重发。

### 自检

```bash
node tests/po.logic.test.js
```

25 项逻辑测试（敏感词两道防线、缩写误伤控制、配置完整性、入学年份与信箱对应）
应当全部 PASS。
