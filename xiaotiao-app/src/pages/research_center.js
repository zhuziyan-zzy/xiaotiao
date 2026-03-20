// V2.0 Research Center — Hub page for 文献研究中心
import { escapeHtml } from '../utils/sanitize.js';
import { fetchAPIGet } from '../api.js';

export function renderResearchCenter() {
  return `
    <div class="container">
      <div class="page-header">
        <div class="page-header__badge">
          <span class="nav-dot" style="background:var(--research)"></span>
          文献研究中心
        </div>
        <h1 class="page-header__title">文献研究中心</h1>
        <p class="page-header__subtitle">
          论文管理 · AI 文章生成 · 主题追踪 — 一站式学术研究平台
        </p>
      </div>

      <!-- Cards Grid -->
      <div class="rc-grid">
        <!-- 论文库 -->
        <a class="rc-card" href="#/research/papers" id="rc-papers">
          <div class="rc-card__icon">📚</div>
          <div class="rc-card__body">
            <div class="rc-card__title">论文库</div>
            <div class="rc-card__desc">搜索、管理和阅读学术论文</div>
          </div>
          <div class="rc-card__stat" id="rc-papers-count">
            <span class="rc-card__stat-val">—</span>
            <span class="rc-card__stat-label">收藏</span>
          </div>
        </a>

        <!-- AI 文章生成 -->
        <a class="rc-card" href="#/research/generate" id="rc-generate">
          <div class="rc-card__icon">✨</div>
          <div class="rc-card__body">
            <div class="rc-card__title">AI 文章生成</div>
            <div class="rc-card__desc">粘贴英文法律文本，AI 逐段解读</div>
          </div>
        </a>

        <!-- 主题追踪 -->
        <a class="rc-card" href="#/research/tracker" id="rc-tracker">
          <div class="rc-card__icon">🔍</div>
          <div class="rc-card__body">
            <div class="rc-card__title">主题追踪</div>
            <div class="rc-card__desc">追踪学术领域最新论文动态</div>
          </div>
          <div class="rc-card__stat" id="rc-tracker-count">
            <span class="rc-card__stat-val">—</span>
            <span class="rc-card__stat-label">主题</span>
          </div>
        </a>
      </div>

      <!-- Stats Row -->
      <div class="rc-stats-row" id="rc-stats-row" style="display:none;">
        <div class="rc-mini-stat">
          <span class="rc-mini-stat__val" id="rc-stat-total">0</span>
          <span class="rc-mini-stat__label">论文总量</span>
        </div>
        <div class="rc-mini-stat">
          <span class="rc-mini-stat__val" id="rc-stat-read">0</span>
          <span class="rc-mini-stat__label">已读完</span>
        </div>
        <div class="rc-mini-stat">
          <span class="rc-mini-stat__val" id="rc-stat-reading">0</span>
          <span class="rc-mini-stat__label">阅读中</span>
        </div>
        <div class="rc-mini-stat">
          <span class="rc-mini-stat__val" id="rc-stat-7d">0</span>
          <span class="rc-mini-stat__label">近7日导入</span>
        </div>
      </div>

      <!-- 近期活动 -->
      <div class="glass-panel" style="margin-top: 20px; padding: 24px; border-radius: 20px;">
        <div class="panel__header" style="margin-bottom: 16px;">
          <div class="panel__title">
            <span class="panel__title-icon" style="background:var(--research)"></span>
            近期活动
          </div>
        </div>
        <div id="rc-recent" class="rc-recent">
          <div class="sidebar-loading">加载中...</div>
        </div>
      </div>
    </div>
  `;
}

export function initResearchCenter() {
  // Load paper count
  fetchAPIGet('/papers?limit=1').then(data => {
    const countEl = document.querySelector('#rc-papers-count .rc-card__stat-val');
    if (countEl && data && typeof data.total === 'number') {
      countEl.textContent = data.total;
    }
  }).catch(() => {});

  // Load tracker topic count
  fetchAPIGet('/tracker/topics').then(data => {
    const countEl = document.querySelector('#rc-tracker-count .rc-card__stat-val');
    if (countEl && Array.isArray(data)) {
      countEl.textContent = data.length;
    }
  }).catch(() => {});

  // Load stats
  fetchAPIGet('/papers/stats').then(data => {
    if (!data) return;
    const row = document.getElementById('rc-stats-row');
    if (row) row.style.display = 'flex';
    const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v ?? 0; };
    s('rc-stat-total', data.total_papers);
    s('rc-stat-read', data.read_papers);
    s('rc-stat-reading', data.reading_papers);
    s('rc-stat-7d', data.imported_7d);
  }).catch(() => {});

  // Load recent activity (last 5 papers updated)
  fetchAPIGet('/papers?limit=5').then(data => {
    const container = document.getElementById('rc-recent');
    if (!container) return;
    const items = data?.items || [];
    if (!items.length) {
      container.innerHTML = `
        <div class="result-empty">
          <div class="result-empty__icon">📖</div>
          <div class="result-empty__text">开始阅读论文后，最近活动会显示在这里</div>
        </div>`;
      return;
    }
    container.innerHTML = items.map(p => {
      const title = escapeHtml(p.title || '未命名论文');
      const time = p.updated_at ? formatTimeAgo(p.updated_at) : '';
      const status = p.read_status === 'read' ? '✅ 已读' : p.read_status === 'reading' ? '📖 阅读中' : '🆕 新增';
      const progress = (p.pages_read && p.total_pages) ? Math.round(p.pages_read / p.total_pages * 100) : 0;
      return `
        <a href="#/research/papers/${p.id}" class="rc-activity-item">
          <div class="rc-activity-item__main">
            <div class="rc-activity-item__title">${title}</div>
            <div class="rc-activity-item__meta">
              <span class="rc-activity-item__status">${status}</span>
              <span class="rc-activity-item__time">${time}</span>
            </div>
          </div>
          ${p.total_pages > 0 ? `<div class="rc-activity-item__progress">
            <div class="rc-activity-item__progress-bar" style="width:${progress}%"></div>
          </div>` : ''}
        </a>`;
    }).join('');
  }).catch(() => {
    const container = document.getElementById('rc-recent');
    if (container) container.innerHTML = `
      <div class="result-empty">
        <div class="result-empty__icon">📖</div>
        <div class="result-empty__text">开始阅读论文后，最近活动会显示在这里</div>
      </div>`;
  });
}

function formatTimeAgo(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch { return ''; }
}
