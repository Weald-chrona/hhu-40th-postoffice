/* ============================================================
   一、院史时间轴
   负责这一板块的同学只需要改这个文件。
   本次改动：七个年份节点全部配上影像（校史馆藏 + 常州校区实景），
   影像放在卡片顶部，图注标注真实年份与来源，不冒充当年现场。
   ============================================================ */
(function () {
  var html = `    <!-- ===== 一、院史时间轴 ===== -->
    <section class="section" id="history">
      <div class="container">
        <div class="section-head reveal">
          <span class="section-kicker">02 / HISTORY</span>
          <h2 class="section-title">院史时间轴</h2>
          <p class="section-desc">从无线电专业到信息科学与工程学院，七次跨越。每一次更名，都是一次学科版图的重新划定。</p>
        </div>

        <ol class="timeline">
          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <figure class="timeline-photo">
                <img src="images/tl-1960-lab.jpg" alt="黑白照片：华东水利学院时期师生在水轮机实验室做气蚀试验" loading="lazy" width="720" height="450" />
                <figcaption>华水时期 · 师生在水轮机实验室｜校史馆藏</figcaption>
              </figure>
              <div class="timeline-body">
                <span class="timeline-year">1960</span>
                <h3>发端 · 无线电专业</h3>
                <p>无线电设计与制造专业创办，学院相关学科由此发端。</p>
              </div>
            </div>
          </li>

          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <figure class="timeline-photo">
                <img src="images/tl-1986-plaque.jpg" alt="黑白照片：1985 年七十周年校庆，钱正英与杨泳沂为河海大学校名揭牌" loading="lazy" width="720" height="450" />
                <figcaption>1985 年 · 恢复河海校名揭牌｜校史馆藏</figcaption>
              </figure>
              <div class="timeline-body">
                <span class="timeline-year">1986</span>
                <h3>建系 · 电子工程系</h3>
                <p>河海大学机械学院电子工程系成立，学院前身正式组建。</p>
              </div>
            </div>
          </li>

          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <figure class="timeline-photo">
                <img src="images/tl-1995-gate.jpg" alt="1995 年的河海大学校门，门楣上挂着一排红灯笼" loading="lazy" width="720" height="450" />
                <figcaption>1995 年 · 河海大学校门｜校史馆藏</figcaption>
              </figure>
              <div class="timeline-body">
                <span class="timeline-year">1995</span>
                <h3>更名 · 计算机及信息工程学院</h3>
                <p>更名为河海大学计算机及信息工程学院（常州）。</p>
              </div>
            </div>
          </li>

          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <figure class="timeline-photo">
                <img src="images/tl-2009-211.jpg" alt="河海大学“十五”“211 工程”建设项目验收会场" loading="lazy" width="720" height="450" />
                <figcaption>2006 年 · “211 工程”建设项目验收｜校史馆藏</figcaption>
              </figure>
              <div class="timeline-body">
                <span class="timeline-year">2009</span>
                <h3>更名 · 计算机与信息学院</h3>
                <p>更名为河海大学计算机与信息学院（常州）。</p>
              </div>
            </div>
          </li>

          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <figure class="timeline-photo">
                <img src="images/tl-2012-plaque.jpg" alt="水安全与水科学协同创新中心揭牌仪式现场" loading="lazy" width="720" height="450" />
                <figcaption>水安全与水科学协同创新中心揭牌｜校史馆藏</figcaption>
              </figure>
              <div class="timeline-body">
                <span class="timeline-year">2012</span>
                <h3>更名 · 物联网工程学院</h3>
                <p>2012 年 11 月，更名为河海大学物联网工程学院。</p>
              </div>
            </div>
          </li>

          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <figure class="timeline-photo">
                <img src="images/tl-2023-campus.jpg" alt="河海大学常州校区航拍全景" loading="lazy" width="720" height="450" />
                <figcaption>常州校区 · 新校区于 2023 年启用</figcaption>
              </figure>
              <div class="timeline-body">
                <span class="timeline-year">2023</span>
                <h3>更名 · 信息科学与工程学院</h3>
                <p>2023 年 4 月，更名为河海大学信息科学与工程学院。</p>
              </div>
            </div>
          </li>

          <li class="timeline-item reveal">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div class="timeline-card">
              <figure class="timeline-photo">
                <img src="images/tl-2026-night.jpg" alt="常州校区图书馆夜景，灯光倒映在水面上" loading="lazy" width="720" height="450" />
                <figcaption>四秩之夜 · 常州校区</figcaption>
              </figure>
              <div class="timeline-body">
                <span class="timeline-year">2026</span>
                <h3>新程 · 四秩风华</h3>
                <p>办学四十周年，站在新起点，面向智能时代再启新程。</p>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>
`;
  var mount = document.getElementById("sec-history");
  if (mount) mount.outerHTML = html;
})();


/* ---------- 院史时间轴：每次切到本板块都重播淡入 ---------- */
(function () {
  var panel = document.querySelector('[data-panel="history"]');
  var items = Array.prototype.slice.call(
    document.querySelectorAll("#history .reveal")
  );
  if (!panel || !items.length) return;

  function replay() {
    /* 第一步：禁用过渡，把元素瞬间复位到“透明且偏移”的起点 */
    items.forEach(function (el) {
      el.style.transition = "none";
      el.classList.remove("is-visible");
    });

    void panel.offsetHeight;   /* 强制回流，让浏览器确认这个起点 */

    requestAnimationFrame(function () {
      /* 第二步：恢复过渡，重新排好错落延迟。
         原来是 i * 0.95 秒：七条排下来最后一条要等 5.7 秒，而这段延迟是从
         「切进本板块」那刻开始算的 —— 用户滚到时间轴末尾时，第六、第七条
         还是透明的，看上去就是两块空卡片。0.26 秒一档，整组 2 秒内走完，
         逐条浮现的节奏还在，滚到哪儿都不会撞见空白。 */
      items.forEach(function (el, i) {
        el.style.transition = "";
        el.style.transitionDelay = Math.min(i * 0.26, 2.4) + "s";
      });

      requestAnimationFrame(function () {
        /* 第三步：加回类名，动画从起点开始播 */
        items.forEach(function (el) { el.classList.add("is-visible"); });
      });
    });
  }

  if ("MutationObserver" in window) {
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.attributeName === "class" && !panel.classList.contains("is-hidden")) {
          replay();
        }
      });
    }).observe(panel, { attributes: true, attributeFilter: ["class"] });
  }
})();
