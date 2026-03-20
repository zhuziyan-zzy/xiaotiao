// Public Landing Page — 公开门面介绍页 V3.0 (全新改版)

export function renderLandingPage() {
  return `
    <div class="landing">
      <!-- Hero Section with animated background -->
      <section class="landing__hero">
        <div class="landing__hero-bg">
          <div class="landing__hero-orb landing__hero-orb--1"></div>
          <div class="landing__hero-orb landing__hero-orb--2"></div>
          <div class="landing__hero-orb landing__hero-orb--3"></div>
          <div class="landing__hero-grid"></div>
        </div>
        <div class="landing__hero-content">
          <div class="landing__badge landing__badge--animated">🎓 华东政法大学</div>
          <h1 class="landing__title">
            <span class="landing__title-accent" id="landing-typed-title">再译</span>
            <br>涉外法治多模态学习平台
          </h1>
          <p class="landing__subtitle">
            融合 AI 智能分析，打造法学英语学习新范式。<br>
            主题探索 · 文献研究 · 智能翻译 · 一站式学术助手
          </p>
          <div class="landing__hero-actions">
            <button class="btn btn--primary btn--lg landing__cta landing__cta--pulse" onclick="location.hash='#/login'">
              🚀 立即开始
            </button>
            <button class="btn btn--secondary btn--lg landing__cta--ghost" onclick="document.getElementById('landing-features').scrollIntoView({behavior:'smooth'})">
              📖 了解更多
            </button>
          </div>
          <div class="landing__stats landing__stats--hero">
            <div class="landing__stat landing__stat--animated" data-count="5" data-suffix="+">
              <div class="landing__stat-num"><span class="landing__counter" data-target="5">0</span>+</div>
              <div class="landing__stat-label">核心功能模块</div>
            </div>
            <div class="landing__stat landing__stat--animated" data-count="3">
              <div class="landing__stat-num"><span class="landing__counter" data-target="3">0</span></div>
              <div class="landing__stat-label">AI 大模型驱动</div>
            </div>
            <div class="landing__stat landing__stat--animated" data-count="1000" data-suffix="+">
              <div class="landing__stat-num"><span class="landing__counter" data-target="1000">0</span>+</div>
              <div class="landing__stat-label">学术文献支持</div>
            </div>
            <div class="landing__stat landing__stat--animated">
              <div class="landing__stat-num">24/7</div>
              <div class="landing__stat-label">AI 全天候服务</div>
            </div>
          </div>
        </div>
        <div class="landing__scroll-indicator" onclick="document.getElementById('landing-features').scrollIntoView({behavior:'smooth'})">
          <span>↓</span>
        </div>
      </section>

      <!-- Feature Showcase with Demo -->
      <section class="landing__section" id="landing-features">
        <div class="container">
          <div class="landing__section-header">
            <div class="landing__section-badge">✨ 核心功能</div>
            <h2 class="landing__section-title">为法学英语学习量身打造</h2>
            <p class="landing__section-desc">三大核心模块，覆盖你的全部学术英语需求</p>
          </div>

          <!-- Feature 1: Topic Explorer with Demo -->
          <div class="landing__feature-showcase">
            <div class="landing__feature-info">
              <div class="landing__feature-badge landing__feature-badge--explore">模块一</div>
              <h3 class="landing__feature-showcase-title">🔍 主题探索</h3>
              <p class="landing__feature-showcase-desc">
                输入任意法学主题，AI 自动生成专业学习内容。
                涵盖术语解析、案例分析、双语对照等多维度内容，
                帮助你快速掌握涉外法治前沿知识。
              </p>
              <ul class="landing__feature-list landing__feature-list--enhanced">
                <li><span class="landing__check">✓</span> AI 智能生成中英双语学习素材</li>
                <li><span class="landing__check">✓</span> 法律专业术语自动标注与解释</li>
                <li><span class="landing__check">✓</span> 真实法律案例嵌入式分析</li>
                <li><span class="landing__check">✓</span> 自适应难度匹配你的英语水平</li>
              </ul>
            </div>
            <div class="landing__feature-demo">
              <div class="landing__demo-window">
                <div class="landing__demo-toolbar">
                  <span class="landing__demo-dot landing__demo-dot--red"></span>
                  <span class="landing__demo-dot landing__demo-dot--yellow"></span>
                  <span class="landing__demo-dot landing__demo-dot--green"></span>
                  <span class="landing__demo-title">主题探索 — 再译平台</span>
                </div>
                <div class="landing__demo-content landing__demo-content--explore">
                  <div class="landing__demo-search">
                    <span class="landing__demo-search-icon">🔍</span>
                    <span class="landing__demo-search-text">International Arbitration Law...</span>
                    <span class="landing__demo-search-btn">生成</span>
                  </div>
                  <div class="landing__demo-article">
                    <div class="landing__demo-tag-row">
                      <span class="landing__demo-tag">⚖️ 国际仲裁</span>
                      <span class="landing__demo-tag">📊 中级难度</span>
                      <span class="landing__demo-tag">📝 800词</span>
                    </div>
                    <div class="landing__demo-text">
                      <p class="landing__demo-en">International arbitration has become the <mark>predominant</mark> method for resolving cross-border commercial disputes...</p>
                      <p class="landing__demo-zh">国际仲裁已成为解决跨境商业争端的<mark>主要</mark>方式...</p>
                    </div>
                    <div class="landing__demo-vocab">
                      <span class="landing__demo-vocab-item">📖 arbitration <small>仲裁</small></span>
                      <span class="landing__demo-vocab-item">📖 predominant <small>主要的</small></span>
                      <span class="landing__demo-vocab-item">📖 jurisdiction <small>管辖权</small></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Feature 2: Research Center with Demo -->
          <div class="landing__feature-showcase landing__feature-showcase--reverse">
            <div class="landing__feature-info">
              <div class="landing__feature-badge landing__feature-badge--research">模块二</div>
              <h3 class="landing__feature-showcase-title">📚 文献研究中心</h3>
              <p class="landing__feature-showcase-desc">
                内置论文库与 PDF 智能阅读器。上传或搜索学术论文，
                AI 自动逐页生成摘要、支持划词翻译与高亮批注，
                让学术阅读事半功倍。
              </p>
              <ul class="landing__feature-list landing__feature-list--enhanced">
                <li><span class="landing__check">✓</span> PDF 智能阅读器 + 逐页 AI 摘要</li>
                <li><span class="landing__check">✓</span> 划词即时翻译与高亮批注</li>
                <li><span class="landing__check">✓</span> 论文追踪器自动搜索最新文献</li>
                <li><span class="landing__check">✓</span> 论文集管理与知识图谱关联</li>
              </ul>
            </div>
            <div class="landing__feature-demo">
              <div class="landing__demo-window">
                <div class="landing__demo-toolbar">
                  <span class="landing__demo-dot landing__demo-dot--red"></span>
                  <span class="landing__demo-dot landing__demo-dot--yellow"></span>
                  <span class="landing__demo-dot landing__demo-dot--green"></span>
                  <span class="landing__demo-title">PDF 阅读器 — 再译平台</span>
                </div>
                <div class="landing__demo-content landing__demo-content--research">
                  <div class="landing__demo-pdf-layout">
                    <div class="landing__demo-pdf-page">
                      <div class="landing__demo-pdf-line landing__demo-pdf-line--title">Comparative Study of International Trade Law</div>
                      <div class="landing__demo-pdf-line">Abstract: This paper examines the evolving...</div>
                      <div class="landing__demo-pdf-line landing__demo-pdf-line--highlight">The WTO dispute settlement mechanism has...</div>
                      <div class="landing__demo-pdf-line">provisions under Article XXI of the GATT...</div>
                      <div class="landing__demo-pdf-line">bilateral investment treaties (BITs)...</div>
                      <div class="landing__demo-pdf-line landing__demo-pdf-line--highlight">sustainable development goals require new...</div>
                    </div>
                    <div class="landing__demo-pdf-sidebar">
                      <div class="landing__demo-pdf-summary">
                        <span class="landing__demo-pdf-ai">🤖 AI 摘要</span>
                        <p>本文比较分析了WTO争端解决机制的演变，探讨了双边投资条约中的国家安全例外条款...</p>
                      </div>
                      <div class="landing__demo-pdf-annotation">
                        <span class="landing__demo-pdf-note">📝 批注</span>
                        <p>WTO DSM — 了解争端解决机制的核心流程</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Feature 3: Translation Studio with Demo -->
          <div class="landing__feature-showcase">
            <div class="landing__feature-info">
              <div class="landing__feature-badge landing__feature-badge--translate">模块三</div>
              <h3 class="landing__feature-showcase-title">🌐 翻译工作室</h3>
              <p class="landing__feature-showcase-desc">
                专业法律文本翻译工具，支持多种翻译风格选择。
                从合同条款到判决书，AI 提供精准的法律术语翻译，
                并附带详细的术语解读与对比分析。
              </p>
              <ul class="landing__feature-list landing__feature-list--enhanced">
                <li><span class="landing__check">✓</span> 直译 / 法律 / 通顺三种风格对比</li>
                <li><span class="landing__check">✓</span> 法律术语精准翻译 + 术语解读</li>
                <li><span class="landing__check">✓</span> 用户自译对比与 AI 评分</li>
                <li><span class="landing__check">✓</span> 翻译历史管理与导出</li>
              </ul>
            </div>
            <div class="landing__feature-demo">
              <div class="landing__demo-window">
                <div class="landing__demo-toolbar">
                  <span class="landing__demo-dot landing__demo-dot--red"></span>
                  <span class="landing__demo-dot landing__demo-dot--yellow"></span>
                  <span class="landing__demo-dot landing__demo-dot--green"></span>
                  <span class="landing__demo-title">翻译工作室 — 再译平台</span>
                </div>
                <div class="landing__demo-content landing__demo-content--translate">
                  <div class="landing__demo-translate-layout">
                    <div class="landing__demo-translate-source">
                      <div class="landing__demo-translate-label">🇨🇳 源文本</div>
                      <p>甲方应当在合同签订后三十日内，将全部技术资料移交给乙方，并确保资料的完整性与准确性。</p>
                    </div>
                    <div class="landing__demo-translate-results">
                      <div class="landing__demo-translate-style">
                        <span class="landing__demo-translate-badge landing__demo-translate-badge--literal">直译</span>
                        <p>Party A shall within thirty days after signing the contract...</p>
                      </div>
                      <div class="landing__demo-translate-style">
                        <span class="landing__demo-translate-badge landing__demo-translate-badge--legal">法律</span>
                        <p>Party A shall, within thirty (30) days following the execution of this Agreement...</p>
                      </div>
                      <div class="landing__demo-translate-style">
                        <span class="landing__demo-translate-badge landing__demo-translate-badge--plain">通顺</span>
                        <p>Within 30 days of signing the contract, Party A must hand over all technical...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Platform Advantages Section -->
      <section class="landing__section landing__section--advantages" id="landing-advantages">
        <div class="container">
          <div class="landing__section-header">
            <div class="landing__section-badge">💎 平台优势</div>
            <h2 class="landing__section-title">为什么选择再译？</h2>
            <p class="landing__section-desc">六大核心优势，全方位助力你的法学英语提升</p>
          </div>
          <div class="landing__advantages-grid">
            <div class="landing__advantage-card">
              <div class="landing__advantage-icon">🤖</div>
              <h4 class="landing__advantage-title">多模型 AI 驱动</h4>
              <p class="landing__advantage-desc">集成 Claude、GPT、Gemini 三大 AI 模型，智能路由选择最优模型，确保生成质量与速度的最佳平衡。</p>
            </div>
            <div class="landing__advantage-card">
              <div class="landing__advantage-icon">⚖️</div>
              <h4 class="landing__advantage-title">法学领域深耕</h4>
              <p class="landing__advantage-desc">专注涉外法治英语教学，内置法律术语库、案例库、论文库，AI 提示词经过法学专家精心调优。</p>
            </div>
            <div class="landing__advantage-card">
              <div class="landing__advantage-icon">📊</div>
              <h4 class="landing__advantage-title">个性化学习路径</h4>
              <p class="landing__advantage-desc">基于用户英语水平、学科领域、兴趣标签，智能推荐学习内容，自适应调整文章难度和词汇推荐。</p>
            </div>
            <div class="landing__advantage-card">
              <div class="landing__advantage-icon">📝</div>
              <h4 class="landing__advantage-title">智能生词管理</h4>
              <p class="landing__advantage-desc">全局划词收词，自动生成释义和例句。SRS 间隔重复系统科学记忆，支持 CET-4/6、雅思等考试词表。</p>
            </div>
            <div class="landing__advantage-card">
              <div class="landing__advantage-icon">🔬</div>
              <h4 class="landing__advantage-title">学术研究工具链</h4>
              <p class="landing__advantage-desc">集成 OpenAlex、Semantic Scholar 等学术 API，论文自动追踪、PDF 智能阅读、知识图谱分析一站式完成。</p>
            </div>
            <div class="landing__advantage-card">
              <div class="landing__advantage-icon">🔒</div>
              <h4 class="landing__advantage-title">安全可靠</h4>
              <p class="landing__advantage-desc">数据加密存储，XSS 安全防护，用户隐私优先。部署于高可用云服务器，确保 7×24 小时稳定服务。</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Data Stats Section -->
      <section class="landing__section landing__section--stats" id="landing-data">
        <div class="container">
          <div class="landing__stats-showcase">
            <div class="landing__stats-intro">
              <div class="landing__section-badge">📈 数据实力</div>
              <h2 class="landing__section-title" style="text-align:left;">用数据说话</h2>
              <p class="landing__section-desc" style="text-align:left;">
                再译平台持续迭代优化，为华东政法大学师生提供稳定、高质量的 AI 学术辅助服务。
              </p>
            </div>
            <div class="landing__stats-grid">
              <div class="landing__stats-card">
                <div class="landing__stats-card-num"><span class="landing__counter" data-target="3">0</span></div>
                <div class="landing__stats-card-label">AI 大模型</div>
                <div class="landing__stats-card-detail">Claude · GPT · Gemini</div>
              </div>
              <div class="landing__stats-card">
                <div class="landing__stats-card-num"><span class="landing__counter" data-target="6">0</span></div>
                <div class="landing__stats-card-label">核心功能模块</div>
                <div class="landing__stats-card-detail">探索 · 文献 · 翻译 · 词库 · 追踪 · 笔记</div>
              </div>
              <div class="landing__stats-card">
                <div class="landing__stats-card-num"><span class="landing__counter" data-target="15">0</span>+</div>
                <div class="landing__stats-card-label">精调提示词模板</div>
                <div class="landing__stats-card-detail">法学领域专业 Prompt 工程</div>
              </div>
              <div class="landing__stats-card">
                <div class="landing__stats-card-num"><span class="landing__counter" data-target="9">0</span></div>
                <div class="landing__stats-card-label">学科领域覆盖</div>
                <div class="landing__stats-card-detail">法学 · 金融 · 计算机 · 医学 等</div>
              </div>
              <div class="landing__stats-card">
                <div class="landing__stats-card-num"><span class="landing__counter" data-target="5">0</span></div>
                <div class="landing__stats-card-label">文献源 API</div>
                <div class="landing__stats-card-detail">OpenAlex · Semantic Scholar 等</div>
              </div>
              <div class="landing__stats-card">
                <div class="landing__stats-card-num">99.9<small>%</small></div>
                <div class="landing__stats-card-label">服务可用率</div>
                <div class="landing__stats-card-detail">高可用云端部署</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="landing__section landing__section--alt">
        <div class="container">
          <div class="landing__section-header">
            <div class="landing__section-badge">📋 使用指南</div>
            <h2 class="landing__section-title">三步开始你的学习之旅</h2>
          </div>
          <div class="landing__steps landing__steps--enhanced">
            <div class="landing__step landing__step--enhanced">
              <div class="landing__step-icon-wrap">
                <div class="landing__step-num">01</div>
              </div>
              <div class="landing__step-content">
                <h3>注册 & 个性画像</h3>
                <p>快速注册，设置你的学科领域和英语水平。系统将根据 5 步画像设置提供个性化内容推荐。</p>
              </div>
              <div class="landing__step-connector"></div>
            </div>
            <div class="landing__step landing__step--enhanced">
              <div class="landing__step-icon-wrap">
                <div class="landing__step-num">02</div>
              </div>
              <div class="landing__step-content">
                <h3>选择功能模块</h3>
                <p>根据学习需求选择主题探索、文献研究、翻译工作室或生词本，每个模块均集成 AI 辅助。</p>
              </div>
              <div class="landing__step-connector"></div>
            </div>
            <div class="landing__step landing__step--enhanced">
              <div class="landing__step-icon-wrap">
                <div class="landing__step-num">03</div>
              </div>
              <div class="landing__step-content">
                <h3>AI 深度辅助</h3>
                <p>AI 自动生成学习文章、智能翻译对比、论文摘要分析，实时生词收录，全程辅助你的学术英语提升。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Team Section -->
      <section class="landing__section" id="landing-team">
        <div class="container">
          <div class="landing__section-header">
            <div class="landing__section-badge">👥 团队介绍</div>
            <h2 class="landing__section-title">我们的团队</h2>
            <p class="landing__section-desc">来自华东政法大学的跨学科研究团队</p>
          </div>
          <div class="landing__team-grid" id="landing-team-grid">
            <div style="text-align:center;color:var(--text-muted);padding:40px;">
              加载中...
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="landing__section landing__section--cta">
        <div class="container" style="text-align:center;">
          <div class="landing__cta-content">
            <h2 class="landing__section-title" style="color:#fff;">准备好开始了吗？</h2>
            <p class="landing__section-desc" style="color:rgba(255,255,255,0.85);">
              注册账号，即刻体验 AI 驱动的法学英语学习新方式<br>
              <span style="font-size:0.85rem;opacity:0.7;">华东政法大学涉外法治多模态学习平台 · 免费使用</span>
            </p>
            <button class="btn btn--primary btn--lg landing__cta landing__cta--final" onclick="location.hash='#/login'" style="margin-top:24px;">
              🚀 免费注册开始
            </button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing__footer">
        <div class="container">
          <div class="landing__footer-content">
            <div class="landing__footer-brand">
              <span class="landing__footer-logo">再译</span>
              <span class="landing__footer-tagline">华东政法大学涉外法治多模态学习平台</span>
            </div>
            <div class="landing__footer-links">
              <span>© 2025 再译 ZaiYi</span>
              <span>·</span>
              <span>华东政法大学</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `;
}

export async function initLandingPage() {
  // Load team members from public API
  try {
    const res = await fetch((import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/v1\/?$/, '') + '/api/team-members');
    if (res.ok) {
      const data = await res.json();
      const members = data.members || [];
      const grid = document.getElementById('landing-team-grid');
      if (grid && members.length > 0) {
        grid.innerHTML = members.map(m => `
          <div class="landing__team-card">
            <div class="landing__team-avatar" style="${m.avatar_url ? 'background-image:url(' + m.avatar_url + ');' : ''}">
              ${!m.avatar_url ? '<span>' + (m.name || '?')[0] + '</span>' : ''}
            </div>
            <div class="landing__team-name">${m.name || '成员'}</div>
            <div class="landing__team-role">${m.role || ''}</div>
            <div class="landing__team-bio">${m.bio || ''}</div>
          </div>
        `).join('');
      } else if (grid) {
        grid.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;grid-column:1/-1;">团队成员信息即将更新</div>';
      }
    }
  } catch (_e) {
    const grid = document.getElementById('landing-team-grid');
    if (grid) grid.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;grid-column:1/-1;">团队成员信息即将更新</div>';
  }

  // ── Scroll-in Animations with Stagger ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll(
    '.landing__feature-showcase, .landing__advantage-card, .landing__step--enhanced, .landing__team-card, .landing__stats-card, .landing__demo-window'
  ).forEach((el, i) => {
    el.style.transitionDelay = `${i * 0.06}s`;
    observer.observe(el);
  });

  // ── Counter Animation ──
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        if (isNaN(target)) return;
        animateCounter(el, 0, target, 1500);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.landing__counter').forEach(el => {
    counterObserver.observe(el);
  });

  function animateCounter(el, start, end, duration) {
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ── Typing Effect for Title ──
  const typedEl = document.getElementById('landing-typed-title');
  if (typedEl) {
    const text = '再译';
    typedEl.textContent = '';
    typedEl.style.borderRight = '3px solid var(--accent, #6366f1)';
    for (let i = 0; i < text.length; i++) {
      setTimeout(() => {
        typedEl.textContent = text.slice(0, i + 1);
        if (i === text.length - 1) {
          setTimeout(() => { typedEl.style.borderRight = 'none'; }, 800);
        }
      }, 300 + i * 200);
    }
  }
}
