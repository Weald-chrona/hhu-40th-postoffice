/* ============================================================
   二、学科成果
   本文件由拆分脚本从原 index.html 搬出，内容与原样一致。
   负责这一板块的同学只需要改这个文件。
   ============================================================ */
(function () {
  var html = `    <!-- ===== 二、学科成果 ===== -->
    <section class="section section--alt" id="achievements">
      <div class="container">
        <div class="section-head reveal">
          <span class="section-kicker">02 / ACHIEVEMENTS</span>
          <h2 class="section-title">学科成果</h2>
          <p class="section-desc">从专业建设到科研平台，四十年积累。</p>
        </div>

        <div class="stats-grid stats-inline reveal">
          <div class="stat">
            <strong class="stat-num" data-count="40" data-suffix="年">0</strong>
            <span class="stat-label">建院历程</span>
          </div>
          <div class="stat">
            <strong class="stat-num" data-count="3" data-suffix="个">0</strong>
            <span class="stat-label">本科专业</span>
          </div>
          <div class="stat">
            <strong class="stat-num" data-count="9" data-suffix="个">0</strong>
            <span class="stat-label">省市级科技平台</span>
          </div>
          <div class="stat">
            <strong class="stat-num" data-count="1850" data-suffix="余名">0</strong>
            <span class="stat-label">在校本科生</span>
          </div>
        </div>

        <div class="cards">
          <article class="card reveal">
            <span class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z"/>
              </svg>
            </span>
            <h3>专业建设</h3>
            <p>通信工程、物联网工程于 2021 年入选国家级一流本科专业建设点，并分别于 2022、2023 年通过中国工程教育专业认证。</p>
          </article>

          <article class="card reveal">
            <span class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19V6l8-3 8 3v13"/>
                <path d="M4 19h16"/>
                <path d="M9 19v-6h6v6"/>
              </svg>
            </span>
            <h3>学科平台</h3>
            <p>拥有“信息与通信工程”一级学科博士点、“电子信息”专博点，以及海上智能网信技术教育部重点实验室等 9 个省市级科技平台。</p>
          </article>

          <article class="card reveal">
            <span class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <circle cx="6" cy="6" r="2.4"/>
                <circle cx="18" cy="6" r="2.4"/>
                <circle cx="12" cy="18" r="2.4"/>
                <path d="M8.2 7.2l2.6 8.6M15.8 7.2l-2.6 8.6M8.4 6h7.2"/>
              </svg>
            </span>
            <h3>科研实力</h3>
            <p>近 5 年承担国家级项目 40 余项，发表 SCI 论文 420 余篇，国家发明专利授权 500 余项，获教育部科技进步一等奖等重要奖励 10 多项。</p>
          </article>

          <article class="card reveal">
            <span class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-4 9 4-9 4-9-4z"/>
                <path d="M7 11.2V15c0 1.6 2.2 2.8 5 2.8s5-1.2 5-2.8v-3.8"/>
                <path d="M21 9v5"/>
              </svg>
            </span>
            <h3>人才培养</h3>
            <p>近三年获“挑战杯”全国特等奖 1 项、“中国软件杯”一等奖 4 项、二等奖 16 项，成为信息领域创新人才培养的重要基地。</p>
          </article>
        </div>
      </div>
    </section>
`;
  var mount = document.getElementById("sec-achievements");
  if (mount) mount.outerHTML = html;
})();
