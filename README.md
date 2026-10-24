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
| 队友 A | `feat/history` | 一、院史时间轴 | `sections/history.js`、`css/history.css` |
| 队友 B | `feat/achievements-alumni` | 二、学科成果 + 三、校友风采 | `sections/achievements.js`、`sections/alumni.js`、`css/achievements.css`、`css/alumni.css` |
| 我（组长） | `feat/postoffice` | 四、四十号邮局（动态） | `sections/postoffice.js`、`css/postoffice.css`、`js/letters.js`、`js/config.js`、`supabase/schema.sql` |

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
css/
  style.css             公共样式（变量、导航、主视觉、页脚、通用区块）
  assets-inline.css     内联资源（别改）
  history.css           ← 队友 A
  achievements.css      ← 队友 B
  alumni.css            ← 队友 B
  postoffice.css        ← 组长
  responsive.css        所有 @media 响应式规则，最后加载
sections/
  history.js            ← 队友 A
  achievements.js       ← 队友 B
  alumni.js             ← 队友 B
  postoffice.js         ← 组长
js/
  main.js               滚动动画、导航、轮播等公共交互
images/                 图片资源
supabase/               数据库脚本
```

`sections/*.js` 里就是各板块的 HTML，改法和改 HTML 一样，外面包了一层
`(function(){ ... })();` 是必须的外壳，不要删。

> ⚠️ `index.html` 里 `<link>` 的顺序是**加载顺序**，也是样式层叠的先后，别随便调。
> 要做移动端适配，写进 `css/responsive.css`。
