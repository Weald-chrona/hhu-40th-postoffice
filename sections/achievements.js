/* ============================================================
   二、学科成果（重构版）
   负责：队友 B
   结构：特色定位 → 核心数据 → 学科方向双栏 → 学科里程碑
        → 学科平台矩阵 → 三张成果卡
   ============================================================ */
(function () {
  var html = `    <!-- ===== 二、学科成果 ===== -->
    <section class="section section--alt" id="achievements">
      <div class="container">
        <div class="section-head reveal">
          <span class="section-kicker">02 / DISCIPLINE</span>
          <h2 class="section-title">学科成果</h2>
          <p class="section-desc">从无线电专业到一级学科博士点，一条完整的信息学科成长线。</p>
        </div>

        <div class="disc-lead reveal">
          <p>服务水利、海洋信息化与领域专用通信系统，已成为水利、海洋等行业
            <b>“信息与通信工程”学科关键技术的创新基地</b>，水利行业信息与通信工程的引领者。</p>

          <p class="disc-facts">
            <span><b>40</b> 年建院历程</span>
            <span><b>3</b> 个博士阶段学位点</span>
            <span><b>4</b> 个学科方向</span>
            <span><b>9</b> 个省市级科技平台</span>
          </p>
        </div>


        <div class="disc-grid">
          <article class="disc-card reveal">
            <header>
              <h3>信息与通信工程</h3>
              <p class="disc-sub">一级学科博士点 · 博士后流动站</p>
            </header>
            <ul>
              <li>领域无线通信理论与技术</li>
              <li>智能信息处理及应用</li>
              <li>电子信息系统与芯片</li>
              <li>空天地海物联网技术</li>
            </ul>
          </article>

          <article class="disc-card reveal">
            <header>
              <h3>电子信息</h3>
              <p class="disc-sub">专业博士点 · 2024 年获批</p>
            </header>
            <ul>
              <li>计算机技术</li>
              <li>通信工程</li>
              <li>软件工程</li>
              <li>人工智能</li>
            </ul>
          </article>
        </div>

        <ol class="disc-milestones reveal" aria-label="学科建设里程碑">
          <li><span class="ms-year">1960</span><span class="ms-text">无线电设计与制造专业</span></li>
          <li><span class="ms-year">1998</span><span class="ms-text">通信与信息系统二级硕士点</span></li>
          <li><span class="ms-year">2005</span><span class="ms-text">信息与通信工程一级硕士点</span></li>
          <li><span class="ms-year">2011</span><span class="ms-text">一级学科博士点</span></li>
          <li><span class="ms-year">2019</span><span class="ms-text">博士后流动站</span></li>
          <li><span class="ms-year">2024</span><span class="ms-text">电子信息专博点</span></li>
        </ol>

        <div class="platform-block reveal">
          <div class="platform-head">
            <h3>学科平台</h3>
            <p>1 个教育部重点实验室 · 8 个省市级科技平台</p>
          </div>

          <div class="platform-top">
            <span class="platform-badge">国家级</span>
            <p class="platform-name">海上智能网信技术教育部重点实验室</p>
          </div>

          <div class="platform-group">
            <span class="platform-badge platform-badge--sub">省市级</span>
            <div class="platform-tags">
              <span>江苏省输配电装备技术重点实验室</span>
              <span>江苏省海洋监测设备与数据处理工程中心</span>
              <span>特种机器人技术江苏省高校重点实验室（共建）</span>
              <span>常州市输配电及节电技术重点实验室</span>
              <span>常州市传感网与环境感知重点实验室</span>
              <span>常州市特种机器人及智能技术重点实验室（共建）</span>
              <span>常州市图形图像与骨科植入物数字化技术重点实验室</span>
              <span>常州市无人机智能管控平台与技术重点实验室</span>
            </div>
          </div>
        </div>

        <div class="team-block reveal">
          <div class="platform-head">
            <h3>师资队伍</h3>
            <p>专任教师博士比例 92% · 海外经历 46.6%</p>
          </div>

          <div class="team-stats">
            <div><b>116</b><span>教职工</span></div>
            <div><b>88</b><span>专任教师</span></div>
            <div><b>23</b><span>教授</span></div>
            <div><b>38</b><span>副教授</span></div>
            <div><b>19</b><span>博士生导师</span></div>
            <div><b>45</b><span>硕士生导师</span></div>
          </div>

          <div class="team-group">
            <span class="platform-badge platform-badge--sub">人才称号</span>
            <div class="platform-tags">
              <span>IEEE Fellow 1 人</span>
              <span>国家级人才 3 人</span>
              <span>宝钢优秀教师奖 4 人</span>
              <span>徐芝纶教学奖 1 人</span>
              <span>谷歌奖教金 1 人</span>
              <span>中国高被引学者 2 人</span>
              <span>全球前 0.05% 顶尖科学家 2 人</span>
              <span>全球前 2% 顶尖科学家 4 人</span>
            </div>
          </div>

          <p class="team-foot">在校本科生 1850 余名 · 研究生 600 余名 · 留学生 30 余名</p>
        </div>

        <div class="cards cards--three">
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

/* ---------- 学科里程碑：进入视口时轨道生长、学士帽依次点亮 ---------- */
(function () {
  var rail = document.querySelector(".disc-milestones");
  if (!rail) return;

  if (!("IntersectionObserver" in window)) {
    rail.classList.add("is-in");
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        rail.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  io.observe(rail);
})();
