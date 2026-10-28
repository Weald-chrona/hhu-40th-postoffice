/* ============================================================
   四、四十号邮局
   ------------------------------------------------------------
   这是本板块的 HTML 骨架。里面的内容（信件列表、邮票）由
   js/letters.js 动态填进去。要改排版就改这里，要改逻辑去 letters.js。
   ============================================================ */
(function () {
  var html = `    <!-- ===== 四、四十号邮局 ===== -->
    <section class="section section--alt" id="blessings">
      <div class="container">
        <div class="section-head reveal">
          <span class="section-kicker">04 / POST OFFICE</span>
          <h2 class="section-title">四十号邮局</h2>
          <p class="section-desc">写一封信，投进属于你的那十年。所有人都能读，也能回。</p>
        </div>

        <!-- 六个信箱（js 动态填入） -->
        <div class="po-mailboxes reveal" id="poMailboxes"></div>

        <!-- 拆信台：选中某个信箱后展开 -->
        <div class="po-desk hidden" id="poDesk">
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

        <!-- 写信 -->
        <div class="po-form hidden" id="poForm">
          <div class="po-form-paper">
            <div class="po-form-head">
              <span class="po-form-title">写一封信</span>
              <span class="po-form-tip" id="poCountTip">0 / 500</span>
            </div>

            <div class="po-form-row">
              <label class="po-field">
                <span>署名</span>
                <input id="poName" type="text" maxlength="12" placeholder="可用网名，12 字以内" autocomplete="off" />
              </label>
              <label class="po-field po-field--sm">
                <span>入学年份</span>
                <input id="poYear" type="number" min="1960" max="2026" placeholder="如 2019" />
              </label>
            </div>

            <label class="po-field">
              <span>投进哪个信箱</span>
              <select id="poBox"></select>
            </label>

            <label class="po-field">
              <span>信的内容</span>
              <textarea id="poContent" rows="6" maxlength="500"
                        placeholder="写给学院、写给老师同学、写给四年后的自己……"></textarea>
            </label>

            <p class="po-warn hidden" id="poWarn"></p>

            <div class="po-form-actions">
              <button class="po-btn" id="poSend">投 递</button>
              <button class="po-btn po-btn--ghost" id="poCancel">再想想</button>
              <span class="po-mode" id="poMode"></span>
            </div>
          </div>
        </div>

        <!-- 投递成功后弹出的纪念邮票 -->
        <div class="po-stamp-wrap hidden" id="poStamp">
          <div class="po-stamp-card" id="poStampCard"></div>
          <p class="po-stamp-tip">右键或长按保存这张邮票 · 也可以直接截图</p>
          <button class="po-btn po-btn--ghost" id="poStampClose">收下，继续看信</button>
        </div>
      </div>
    </section>
`;
  var mount = document.getElementById("sec-postoffice");
  if (mount) mount.outerHTML = html;
})();
