/* ============================================================
   三、校友风采
   负责：队友 B
   改动：人物档案式卡片（大头像）+ 入学年份筛选 + 简介展开
   口径：统一使用「级」（入学年份）
   ============================================================ */
(function () {
  var html = `    <!-- ===== 三、校友风采 ===== -->
    <section class="section" id="alumni">
      <div class="container">
        <div class="section-head reveal">
          <span class="section-kicker">03 / ALUMNI</span>
          <h2 class="section-title">校友风采</h2>
          <p class="section-desc">四十年，他们从这里出发。</p>
        </div>

        <div class="alumni-filter reveal" role="group" aria-label="按入学年份筛选校友">
          <button type="button" class="is-active" data-group="all">全部</button>
          <button type="button" data-group="g3">2020–2021 级</button>
          <button type="button" data-group="g2">2016–2019 级</button>
          <button type="button" data-group="g1">1999–2002 级</button>
        </div>

        <div class="alumni-grid">
          <article class="alumni-card reveal" data-group="g3">
            <img class="alumni-avatar" src="images/alumni-1.jpg" alt="校友吴思梦" />
            <div class="alumni-body">
              <h3>吴思梦</h3>
              <p class="alumni-meta">2021 级 · 电子科学与技术</p>
              <p class="alumni-quote">推免至北京大学集成电路学院直接攻读博士学位。绩点及保研综合排名均为专业第一；英语四六级均超过600分；本科期间发表和录用3篇SCI论文；主持和参与3项省校级创训项目；公开一项国家发明专利；获“中国软件杯”大学生软件设计大赛三等奖等8项竞赛奖项；担任班长、党支部组织委员、班级宣传委员；获国家奖学金、小米奖学金、优秀共青团员、优秀“1442工程”学员等多项奖励荣誉。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g3">
            <img class="alumni-avatar" src="images/alumni-2.jpg" alt="校友朱立超" />
            <div class="alumni-body">
              <h3>朱立超</h3>
              <p class="alumni-meta">2021 级 · 通信工程</p>
              <p class="alumni-quote">推免至东南大学信息科学与工程学院移动通信国家重点实验室直接攻读博士学位。历任信息科学与工程学院学生科学与技术协会主席、电子技术部部长等职。主持国家级创新创业训练计划项目1项并优秀结题，相关成果被推荐参与全国大学生创新创业年会，发表学术论文2篇，其中CSCD1篇（第一作者），受理/授权发明专利5项，荣获全国大学生节能减排大赛国奖、华为杯国奖等省部以上奖励累计7项，荣获河海大学优秀学生等校级以上奖励荣誉7项。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g3">
            <img class="alumni-avatar" src="images/alumni-3.jpg" alt="校友朱胡悦" />
            <div class="alumni-body">
              <h3>朱胡悦</h3>
              <p class="alumni-meta">2020 级 · 通信工程</p>
              <p class="alumni-quote">推免至中国科学技术大学电子信息专业。曾任通信二班班长、学生科协电子技术部干事；曾获2021-2022学年河海大学“优秀学生”、2021-2022学年河海大学“优秀学生干部”、2022年度河海大学“优秀共青团员”等荣誉称号；获得国家奖学金、科技创新奖学金等7项奖学金；获得“中国软件杯”大学生软件设计大赛全国三等奖、江苏省高等数学竞赛一等奖、全国大学生英语竞赛一等奖、全国大学生英语词汇能力大赛全国二等奖、全国英语阅读大赛江苏赛区三等奖等奖项；以通讯作者兼第二作者于中科院1区期刊《Information Sciences》（IF：8.1）发表论文一篇，于中科院1区期刊《Applied Energy》在投论文一篇。作为队长组织大创项目一项，以第一发明人受理发明专利一项。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g3">
            <img class="alumni-avatar" src="images/alumni-4.jpg" alt="校友于力涵" />
            <div class="alumni-body">
              <h3>于力涵</h3>
              <p class="alumni-meta">2020 级 · 通信工程</p>
              <p class="alumni-quote">推免至上海交通大学。曾任校区学生会文艺部负责人、20级通信1班宣传委员、22级通信2班助学导师等。专业排名第一，曾获“国家奖学金”“江苏省三好学生”等多项奖学金和荣誉称号，作为负责人获得挑战杯省金、国铜等多项国省级奖项，作为负责人、核心成员参与国家级、省级大学生创新创业项目多项，发表多篇核心期刊论文，发明专利受理多项。看世界，找自己，他始终秉持“勇于探索、爱国荣校”的价值理念，乐于助人，珍惜机会，逐梦远航。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g2">
            <img class="alumni-avatar" src="images/alumni-5.jpg" alt="校友江龙韬" />
            <div class="alumni-body">
              <h3>江龙韬</h3>
              <p class="alumni-meta">2019 级 · 通信工程</p>
              <p class="alumni-quote">曾获2020-2021学年国家奖学金、河海大学2019-2020学年学业优秀奖学金、河海大学2019-2020学年精神文明奖学金、河海大学2019-2020学年科技创新奖学金、全国大学生电子设计大赛国家级二等奖、河海大学2019年电子设计大赛一等奖、河海大学2020年电子设计大赛一等奖、河海大学2020年度学习研究类优秀学生、河海大学2022年海韵风华十杰百佳学习研究类优秀学生、河海大学2019-2020学年优秀学生标兵、河海大学2020年物联网工程学院优秀宣传员。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g2">
            <img class="alumni-avatar" src="images/alumni-9.jpg" alt="校友陈旭" />
            <div class="alumni-body">
              <h3>陈旭</h3>
              <p class="alumni-meta">2019 级 · 通信工程</p>
              <p class="alumni-quote">中共党员，信息学部物联网工程学院通信工程专业本科生，免试推荐至中国科学技术大学攻读硕士学位。曾任信息学部团委副书记、组织部负责人，团建指导员、助学导师、班级班长等职务。获江苏省三好学生、江苏省社会实践先进个人、河海大学海韵风华十杰百佳优秀学生等多项荣誉称号；获“中国软件杯”全国大学生软件设计大赛三等奖、数学中国“认证杯”数学建模网络挑战赛二等奖等奖项。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g2">
            <img class="alumni-avatar" src="images/alumni-8.jpg" alt="校友陈婧怡" />
            <div class="alumni-body">
              <h3>陈婧怡</h3>
              <p class="alumni-meta">2016 级 · 通信工程</p>
              <p class="alumni-quote">中共党员，物联网工程学院通信工程专业学生。大一学年担任 16 级通信一班团支书，获评河海大学优秀学生干部；同年加入“1442”工程；积极参与“领航计划”，发挥先锋模范作用，获评“先进个人”；积极投身党团工作，获评河海大学优秀共青团员。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g1">
            <img class="alumni-avatar" src="images/alumni-6.jpg" alt="校友秦奋" />
            <div class="alumni-body">
              <h3>秦奋</h3>
              <p class="alumni-meta">2002 级 · 通信工程</p>
              <p class="alumni-quote">毕业后在中国航天科技集团上海航天电子技术研究所从事航天器测控通信产品研发工作，正高级研究员。获批航天测控通信类国军标项目 4 项，获航天科技集团科技进步二等奖 1 项、国防科技进步三等奖 1 项。自 2016 年起带领团队承担“天问一号”火星环绕器器间测控通信子系统攻关任务，助力我国首次自主火星探测任务。</p>
            </div>
          </article>

          <article class="alumni-card reveal" data-group="g1">
            <img class="alumni-avatar" src="images/alumni-7.jpg" alt="校友段永华" />
            <div class="alumni-body">
              <h3>段永华</h3>
              <p class="alumni-meta">1999 级 · 电子信息工程</p>
              <p class="alumni-quote">1999 年至 2003 年就读于河海大学电子信息工程专业。曾先后任职苏州达方电子科技有限公司工程师、苏州璨宇光学有限公司研发主管。现任海的电子科技（苏州）有限公司创始人兼总经理、海九智能科技（苏州）有限公司总经理，河海大学苏州校友会常委副会长、苏州上市苗圃校友会副会长。</p>
            </div>
          </article>
        </div>
      </div>
    </section>
`;
  var mount = document.getElementById("sec-alumni");
  if (mount) mount.outerHTML = html;
})();

/* ---------- 入学年份筛选 ---------- */
(function () {
  var filter = document.querySelector(".alumni-filter");
  if (!filter) return;

  var buttons = filter.querySelectorAll("button");
  var cards = document.querySelectorAll(".alumni-card");

  filter.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-group]");
    if (!btn) return;

    Array.prototype.forEach.call(buttons, function (b) {
      b.classList.toggle("is-active", b === btn);
    });

    var group = btn.getAttribute("data-group");

    Array.prototype.forEach.call(cards, function (card) {
      var match = group === "all" || card.getAttribute("data-group") === group;
      card.classList.toggle("is-hidden", !match);
    });
  });
})();

/* ---------- 简介超过 5 行时，显示「展开全文」 ---------- */
(function () {
  var quotes = document.querySelectorAll(".alumni-quote");

  Array.prototype.forEach.call(quotes, function (q) {
    if (q.scrollHeight <= q.clientHeight + 4) return;

    var card = q.closest(".alumni-card");
    if (!card) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "alumni-more";
    btn.textContent = "展开全文";

    btn.addEventListener("click", function () {
      var open = card.classList.toggle("is-open");
      btn.textContent = open ? "收起" : "展开全文";
    });

    q.parentNode.insertBefore(btn, q.nextSibling);
  });
})();
