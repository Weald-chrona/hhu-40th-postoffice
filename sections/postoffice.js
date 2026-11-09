/* ============================================================
   四、四十号邮局
   ------------------------------------------------------------
   这是本板块的 HTML 骨架。里面的内容（信件列表、邮票）由
   js/letters.js 动态填进去。要改排版就改这里，要改逻辑去 letters.js。

   板块分三「页」，同一时间只显示一页（letters.js 里的 showView）：
     home  —— 手绘主视觉，整屏只有它
     write —— 写下我的故事：挑年代 + 信纸表单
     read  —— 看看我们的青春：六个信箱 + 拆信台
   ============================================================ */
(function () {
  var html = `    <!-- ===== 四、四十号邮局 ===== -->
    <section class="section section--alt po" id="blessings" data-po-view="home">
      <div class="container">

        <!-- ---------- 页一：主页，只有手绘主视觉 ----------
             图在 images/po-head-sketch.jpg（1920×1349，比例 1.42:1，纸底 #eeebda）。
             换图时纸底颜色不同，要同步改 css/postoffice.css 里的 --po-sketch。 -->
        <div class="po-hero reveal" data-po-page="home">
          <div class="po-hero-art" aria-hidden="true"></div>
          <div class="container po-hero-inner">
            <div class="po-hero-text">
              <span class="po-hero-kicker">01 / POST OFFICE · 四十号邮局</span>
              <p class="po-hero-dept">河海大学信息科学与工程学院</p>
              <p class="po-hero-years">1986 — 2026　·　办学四十周年</p>
              <h1 class="po-hero-title">凤凰花开时，<br />我想要寄出一封信。</h1>
              <p class="po-hero-desc">写完会生成一张属于你的纪念邮票。信会留在那个年代里，也会被所有人读到。</p>
              <div class="po-hero-actions">
                <a class="po-hero-btn" href="#blessings/write" data-po-go="write">写下我的故事</a>
                <a class="po-hero-btn po-hero-btn--ghost" href="#blessings/read" data-po-go="read">看看我们的青春</a>
              </div>
            </div>
          </div>
        </div>

        <!-- ---------- 页二：写下我的故事（两步走） ----------
             第一步只露六个信箱，选了年代才出现信纸 —— 一张空表单先摆在那儿
             没人愿意填。两步之间可以来回换，见 letters.js 的 enterWrite。 -->
        <div class="po-page hidden" data-po-page="write">
          <div class="po-page-head">
            <a class="po-back" href="#blessings" data-po-go="home">← 回邮局首页</a>
            <span class="po-page-kicker">四十号邮局 · 来信</span>
            <h2 class="po-page-title">写下我的故事</h2>
            <p class="po-page-desc">先挑一个十年，信就投进那个年代。写完会生成一张属于你的纪念邮票。</p>
          </div>

          <!-- 第一步：挑一个十年。
               原来这里还有一行「第一步 挑一个十年，信会投进那个年代」的说明条，
               跟上面的页头描述重复了，删掉（2026-11-01）。 -->
          <div class="po-step" id="poPick">
            <div class="po-mailboxes po-mailboxes--pick reveal" data-po-boxes="write"></div>
          </div>

          <!-- 挑不出年代、或者不知道写什么的人给个出口：先去看别人的信。
               跳转同样交给 [data-po-go]，进看信页会自动翻开一个信箱。 -->
          <div class="po-cta po-cta--soft">
            <a class="po-cta-btn po-cta-btn--ghost" href="#blessings/read" data-po-go="read">先看看别人怎么写的</a>
            <span class="po-cta-note">看完随时可以回来写</span>
          </div>

          <!-- 第二步的信纸和投递后的邮票都不在页面流里：
               它们是板块末尾那两个浮层（po-modal），点信箱时从屏幕中间弹出来，
               而不是把整页往下滚一截 —— 像登录框那样盖在上面。 -->
        </div>

        <!-- ---------- 页三：看看我们的青春 ---------- -->
        <div class="po-page hidden" data-po-page="read">
          <div class="po-page-head">
            <a class="po-back" href="#blessings" data-po-go="home">← 回邮局首页</a>
            <span class="po-page-kicker">四十号邮局 · 来信</span>
            <h2 class="po-page-title">看看我们的青春</h2>
            <p class="po-page-desc">或在当下，或已遥远，写下一封信，寄往来时归途。</p>
          </div>

          <!-- ---------- 纪念墙 ----------
               每一封寄到这里的信，都会生成一张邮票贴在这面墙上——
               墙本身不做任何交互，点某一张才打开那张票（浮层复用写信后的那张）。
               票只贴主信，回信不占墙上的位置（跟 stampRank 的口径一致）。
               贴法见 js/letters.js 的 renderWall()：倾斜和错位按信件 id 定死，
               同一个 id 每次刷新都贴在同一个角度，不会一刷新就满墙乱跳。 -->
          <section class="po-wall reveal" id="poWall">
            <div class="po-wall-head">
              <div>
                <span class="po-wall-kicker">四十号邮局 · 纪念墙</span>
                <h3 class="po-wall-title">每一封信，都在墙上留一张票</h3>
              </div>
              <span class="po-wall-count" id="poWallCount"></span>
            </div>

            <!-- ---------- 找信 ----------
                 墙是「一眼看全部」，搜索是「找那一封」。两者不并排出现：
                 一搜，墙就换成同尺寸的信纸列表，直接能读、能点赞、能存图 ——
                 否则搜出三张票还得一张张点开才知道哪张是，等于没搜。
                 筛选和排序全在前端做（几百封信不差这点算力），见 js/letters.js 的 renderWall()。 -->
            <div class="po-find" id="poFind">
              <div class="po-find-bar">
                <div class="po-find-search">
                  <svg class="po-find-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="M15.5 15.5 21 21" />
                  </svg>
                  <input id="poFindInput" type="search" maxlength="30" autocomplete="off"
                         placeholder="搜署名或一句话" aria-label="搜索信件" />
                  <button class="po-find-clear hidden" id="poFindClear" type="button" aria-label="清空搜索">&times;</button>
                </div>
                <div class="po-find-sort" role="group" aria-label="排序方式">
                  <button class="po-find-sortbtn is-on" type="button" data-find-sort="new">最新</button>
                  <button class="po-find-sortbtn" type="button" data-find-sort="hot">最多人赞</button>
                </div>
              </div>
              <div class="po-find-chips" id="poFindChips" role="group" aria-label="按年代筛选"></div>
            </div>

            <div class="po-wall-board" data-po-wall></div>
            <p class="po-wall-empty hidden" id="poWallEmpty">墙上还空着。第一个寄信的人，第一张票就是他的。</p>

            <!-- 搜索/筛选生效时换成列表，这里不出现票 -->
            <div class="po-find-list hidden" id="poFindList"></div>
            <div class="po-find-empty hidden" id="poFindEmpty">
              <p>没有找到这样的信。</p>
              <button class="po-btn po-btn--sm" type="button" id="poFindReset">清空条件，看全部</button>
            </div>
          </section>

          <!-- 动态统计：数字由 js/letters.js 按真实来信算，进这一页时重新滚一次 -->
          <div class="po-stats reveal" id="poStats">
            <div class="po-stat">
              <span class="po-stat-num" data-po-stat="letters">0</span>
              <span class="po-stat-label">封信件已寄出</span>
            </div>
            <div class="po-stat">
              <span class="po-stat-num" data-po-stat="replies">0</span>
              <span class="po-stat-label">封回信已收到</span>
            </div>
            <div class="po-stat">
              <span class="po-stat-num" data-po-stat="people">0</span>
              <span class="po-stat-label">个人记下了文字</span>
            </div>
          </div>
          <p class="po-stats-note" id="poStatsNote">正在数信……</p>

          <!-- 看完别人的信，给一个往「写下我的故事」去的入口。
               data-po-go="write" 由 js/letters.js 统一接管：切页 + 把地址栏换成
               #blessings/write（浏览器前进后退也走得通），不用自己写跳转。 -->
          <div class="po-cta">
            <p class="po-cta-text">读了这么多，有没有一句话是你想留下的？</p>
            <a class="po-cta-btn" href="#blessings/write" data-po-go="write">我也想写一封信 ✍</a>
            <span class="po-cta-note">挑一个十年，写完会生成一张属于你的纪念邮票</span>
          </div>

          <!-- 六个信箱：点哪个年代，信就弹成浮层（拆信台搬到板块末尾了，
               不占页面流 —— 原来它在信箱下面展开，会把整页往下一推） -->
          <div class="po-mailboxes reveal" data-po-boxes="read"></div>
        </div>

      </div><!-- /.container -->

      <!-- ---------- 写信浮层 ----------
           点任意一个信箱后从屏幕中间弹出来，盖住整页（含导航），像登录框。
           关闭方式：点遮罩、按 Esc、「换一个年代」、「我还要组织一下语言」。
           没放右上角 × —— 跟「我还要组织一下语言」是同一个动作，两个入口反而让人犹豫。 -->
      <div class="po-modal hidden" id="poForm" role="dialog" aria-modal="true" aria-labelledby="poFormTitle">
        <div class="po-modal-backdrop" data-po-dismiss="form"></div>
        <div class="po-modal-card">
          <div class="po-form-paper">
            <span class="po-modal-kicker" id="poFormTitle">写一封信</span>
            <div class="po-form-head">
              <div class="po-form-picked">
                <span class="po-form-seal" id="poFormSeal"></span>
                <span class="po-form-picked-title" id="poFormBox"></span>
                <button class="po-form-switch" id="poFormSwitch" type="button">换一个年代</button>
              </div>
              <span class="po-form-tip" id="poCountTip">0 / 500</span>
            </div>

            <div class="po-form-row">
              <label class="po-field">
                <span>署名 <i class="po-req">必填</i></span>
                <input id="poName" type="text" maxlength="12" placeholder="可用网名，12 字以内" autocomplete="off" />
              </label>
              <label class="po-field po-field--sm">
                <!-- 选教职工信箱时这两处会变成「任教年份 / 选填」，由 js/letters.js 控制 -->
                <span><span id="poYearLabel">入学年份</span> <i class="po-req" id="poYearReq">必填</i></span>
                <input id="poYear" type="number" min="1986" max="2026" placeholder="如 2019" />
              </label>
            </div>

            <label class="po-field">
              <span>信的内容 <i class="po-req">必填</i></span>
              <textarea id="poContent" rows="5" maxlength="500"
                        placeholder="写给学院、写给老师同学、写给四年后的自己……"></textarea>
            </label>

            <p class="po-warn hidden" id="poWarn"></p>

            <div class="po-form-actions">
              <button class="po-btn" id="poSend" disabled>寄出信件</button>
              <button class="po-btn po-btn--ghost" id="poCancel">我还要组织一下语言</button>
              <span class="po-mode" id="poMode"></span>
            </div>
            <p class="po-hint" id="poHint"></p>
          </div>
        </div>
      </div>

      <!-- ---------- 投递成功后的纪念邮票（同样是浮层） ---------- -->
      <div class="po-modal hidden" id="poStamp">
        <div class="po-modal-backdrop" data-po-dismiss="stamp"></div>
        <div class="po-modal-card po-modal-card--stamp">
          <button class="po-modal-x" type="button" data-po-dismiss="stamp" aria-label="关闭">&times;</button>
          <div class="po-stamp-card" id="poStampCard"></div>
          <p class="po-stamp-tip" id="poStampTip">存成一封信，就能发给没来现场的同学</p>
          <div class="po-stamp-actions">
            <button class="po-btn" id="poStampCard" type="button">保存这封信</button>
            <button class="po-btn po-btn--ghost" id="poStampSave" type="button">只存邮票</button>
            <button class="po-btn po-btn--ghost" id="poStampClose" type="button">收下，继续看信</button>
          </div>
        </div>
      </div>

      <!-- ---------- 拆信台浮层 ----------
           点「看看我们的青春」里的某个信箱后从屏幕中间弹出来。
           2026-11-01 从页面流里搬过来的：原来它跟在信箱下面展开，会把整页往下推一截，
           空信箱时下面只剩一句「还没有信」，很占地方。现在就当一层浮层。
           里面的 id 没动（poDeskSeal / poDeskTitle / poDeskCount / poLetters），
           letters.js 的渲染逻辑照旧。 -->
      <div class="po-modal hidden" id="poDesk" role="dialog" aria-modal="true" aria-labelledby="poDeskTitle">
        <div class="po-modal-backdrop" data-po-dismiss="desk"></div>
        <!-- 没放右上角的 ×：「收起」就是同一个动作，跟写信浮层一个道理，两个入口反而犹豫 -->
        <div class="po-modal-card po-modal-card--desk">
          <div class="po-desk-head">
            <div class="po-desk-title">
              <span class="po-desk-seal" id="poDeskSeal"></span>
              <div>
                <h3 id="poDeskTitle"></h3>
                <p id="poDeskCount"></p>
              </div>
            </div>
            <div class="po-desk-actions">
              <button class="po-btn" id="poWriteBtn">✍ 写一封信</button>
              <button class="po-btn po-btn--ghost" id="poCloseDesk">收起</button>
            </div>
          </div>
          <div class="po-letters" id="poLetters"></div>
        </div>
      </div>

    </section>
`;
  var mount = document.getElementById("sec-postoffice");
  if (mount) mount.outerHTML = html;
})();
