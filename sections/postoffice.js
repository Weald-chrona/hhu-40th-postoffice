/* ============================================================
   四、四十号邮局（留言墙，待重做）
   本文件由拆分脚本从原 index.html 搬出，内容与原样一致。
   负责这一板块的同学只需要改这个文件。
   ============================================================ */
(function () {
  var html = `    <!-- ===== 四、祝福留言墙 ===== -->
    <section class="section section--alt" id="blessings">
      <div class="container">
        <div class="section-head reveal">
          <span class="section-kicker">04 / BLESSINGS</span>
          <h2 class="section-title">祝福留言墙</h2>
          <p class="section-desc">一句祝福，一段心意。</p>
        </div>

        <!-- 留言卡片保留，内容待填入真实留言 -->
        <div class="blessing-wall">
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
          <div class="blessing-card reveal"></div>
        </div>

        <p class="blessing-note reveal">本墙仅作祝福集中展示，不开放实时提交</p>
      </div>
    </section>
`;
  var mount = document.getElementById("sec-postoffice");
  if (mount) mount.outerHTML = html;
})();
