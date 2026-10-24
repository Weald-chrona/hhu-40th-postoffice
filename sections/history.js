/* ============================================================
   一、校史时间轴
   本文件由拆分脚本从原 index.html 搬出，内容与原样一致。
   负责这一板块的同学只需要改这个文件。
   ============================================================ */
(function () {
  var html = `    <!-- ===== 一、校史时间轴 ===== -->
    <section class="section" id="history">
      <div class="container">
        <div class="section-head reveal">
          <span class="section-kicker">01 / HISTORY</span>
          <h2 class="section-title">校史时间轴</h2>
          <p class="section-desc">从无线电专业到信息科学与工程学院，七次跨越。</p>
        </div>

        <ol class="timeline">
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <span class="timeline-year">1960</span>
              <h3>发端 · 无线电专业</h3>
              <p>无线电设计与制造专业创办，学院相关学科由此发端。</p>
            </div>
          </li>
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <span class="timeline-year">1986</span>
              <h3>建系 · 电子工程系</h3>
              <p>河海大学机械学院电子工程系成立，学院前身正式组建。</p>
            </div>
          </li>
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <span class="timeline-year">1995</span>
              <h3>更名 · 计算机及信息工程学院</h3>
              <p>更名为河海大学计算机及信息工程学院（常州）。</p>
            </div>
          </li>
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <span class="timeline-year">2009</span>
              <h3>更名 · 计算机与信息学院</h3>
              <p>更名为河海大学计算机与信息学院（常州）。</p>
            </div>
          </li>
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <span class="timeline-year">2012</span>
              <h3>更名 · 物联网工程学院</h3>
              <p>2012 年 11 月，更名为河海大学物联网工程学院。</p>
            </div>
          </li>
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <span class="timeline-year">2023</span>
              <h3>更名 · 信息科学与工程学院</h3>
              <p>2023 年 4 月，更名为河海大学信息科学与工程学院。</p>
            </div>
          </li>
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <span class="timeline-year">2026</span>
              <h3>新程 · 四秩风华</h3>
              <p>建院四十周年，站在新起点，面向智能时代再启新程。</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
`;
  var mount = document.getElementById("sec-history");
  if (mount) mount.outerHTML = html;
})();
