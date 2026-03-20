// Page renderers for all views — Apple Liquid Glass v2
import {
  analyzeArticle,
  createVocabItem,
  generateTopic,
  runTranslation,
  fetchAPI,
  getArticleHistory,
  getArticleDetail,
  deleteArticle,
  exportArticleWord
} from './api.js';
import { escapeHtml, sanitizeHtml } from './utils/sanitize.js';
import { getTaskManager } from './components/task_manager.js';
import { initAnnotationContext, restoreAnnotations, renderAnnotationPanel } from './components/annotation_manager.js';

// Confidence hint Chinese labels
const CONFIDENCE_LABELS = { high: '高', medium: '中', low: '低' };
function confidenceLabel(hint) {
  return `可信度: ${CONFIDENCE_LABELS[hint] || hint}`;
}

/**
 * V2.0: 在文章 HTML 中高亮目标词（db_words）和新词（new_words）
 * - db_words: 蓝色加粗（复习词汇）
 * - new_words: 橙色加粗（新学词汇）
 */
function highlightArticleWords(html, dbWordsUsed = [], newWords = []) {
  if ((!dbWordsUsed || !dbWordsUsed.length) && (!newWords || !newWords.length)) return html;

  // Collect all words to highlight with their type
  const wordMap = new Map(); // word lowercase -> { word, type }
  (dbWordsUsed || []).forEach(w => {
    if (w) wordMap.set(w.toLowerCase(), { word: w, type: 'db' });
  });
  (newWords || []).forEach(w => {
    const word = typeof w === 'string' ? w : w.word;
    if (word) wordMap.set(word.toLowerCase(), { word, type: 'new' });
  });

  if (wordMap.size === 0) return html;

  // Sort by length descending to match longer phrases first
  const sortedWords = [...wordMap.values()].sort((a, b) => b.word.length - a.word.length);

  // Build a regex that matches any of the words (case insensitive, word boundary)
  const escaped = sortedWords.map(w => w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  // Replace text nodes only (skip HTML tags)
  return html.replace(/>([^<]+)</g, (fullMatch, textContent) => {
    const replaced = textContent.replace(regex, (match) => {
      const entry = wordMap.get(match.toLowerCase());
      if (!entry) return match;
      const cls = entry.type === 'db' ? 'hl-word--db' : 'hl-word--new';
      return `<mark class="hl-word ${cls}">${match}</mark>`;
    });
    return `>${replaced}<`;
  });
}
import { startSimulatedProgress } from './utils/stream.js';

// ============ Shared Layout — Liquid Glass ============
// Render layout shell is now handled centrally in index.html

// ============ HOME PAGE — V3.0 Data Dashboard ============

export function renderHome() {
  return `
    <section class="dash" style="padding:80px 0 40px;">
      <div class="container">
        <!-- Greeting -->
        <div style="margin-bottom:24px;">
          <h1 style="font-size:clamp(22px,4vw,32px);font-weight:800;letter-spacing:-1px;color:var(--text-primary);margin-bottom:4px;">
            👋 <span id="home-username">你好</span>，欢迎回来
          </h1>
          <p id="home-profile-tags" style="font-size:.82rem;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;">
            <span class="hero__tag">涉外法治英语学习平台</span>
          </p>
        </div>

        <!-- Stats Grid -->
        <div id="dash-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
          <div class="glass-panel dash-stat" style="padding:16px;border-radius:16px;text-align:center;">
            <div class="dash-stat__val" id="ds-vocab" style="font-size:1.6rem;font-weight:800;background:var(--grad-topic);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">—</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">📖 生词总量</div>
          </div>
          <div class="glass-panel dash-stat" style="padding:16px;border-radius:16px;text-align:center;">
            <div class="dash-stat__val" id="ds-mastered" style="font-size:1.6rem;font-weight:800;background:var(--grad-translation);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">—</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">✅ 已掌握</div>
          </div>
          <div class="glass-panel dash-stat" style="padding:16px;border-radius:16px;text-align:center;">
            <div class="dash-stat__val" id="ds-review" style="font-size:1.6rem;font-weight:800;background:var(--grad-article);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">—</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">🔄 今日待复习</div>
          </div>
          <div class="glass-panel dash-stat" style="padding:16px;border-radius:16px;text-align:center;">
            <div class="dash-stat__val" id="ds-articles" style="font-size:1.6rem;font-weight:800;background:var(--grad-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">—</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">📰 已读文章</div>
          </div>
          <div class="glass-panel dash-stat" style="padding:16px;border-radius:16px;text-align:center;">
            <div class="dash-stat__val" id="ds-papers" style="font-size:1.6rem;font-weight:800;color:#8b5cf6;">—</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">📄 收藏论文</div>
          </div>
          <div class="glass-panel dash-stat" style="padding:16px;border-radius:16px;text-align:center;">
            <div class="dash-stat__val" id="ds-translations" style="font-size:1.6rem;font-weight:800;background:var(--grad-translation);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">—</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">🌐 翻译篇数</div>
          </div>
        </div>

        <!-- Middle Row: Scope + Trend -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
          <!-- Exam Scope -->
          <div class="glass-panel" style="padding:18px;border-radius:16px;" id="dash-scope-card">
            <div style="font-size:.85rem;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎯 备考范围</div>
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px;">
              <span id="dash-scope-name" style="font-size:1.1rem;font-weight:800;color:var(--text-primary);">—</span>
              <span id="dash-scope-pct" style="font-size:.75rem;color:var(--text-muted);"></span>
            </div>
            <div style="height:8px;background:rgba(0,0,0,0.04);border-radius:6px;overflow:hidden;margin-bottom:8px;">
              <div id="dash-scope-bar" style="height:100%;width:0%;background:var(--grad-topic);border-radius:6px;transition:width 0.8s ease;"></div>
            </div>
            <div id="dash-scope-detail" style="display:flex;gap:16px;font-size:.72rem;color:var(--text-muted);"></div>
          </div>
          <!-- 7-Day Trend -->
          <div class="glass-panel" style="padding:18px;border-radius:16px;">
            <div style="font-size:.85rem;font-weight:700;color:var(--text-primary);margin-bottom:10px;">📈 近7日新增生词</div>
            <div id="dash-trend" style="display:flex;align-items:flex-end;gap:6px;height:80px;"></div>
          </div>
        </div>

        <!-- 银河星图 — Galaxy Flowing Star Map -->
        <div class="glass-panel" style="padding:0;border-radius:20px;overflow:hidden;position:relative;">
          <div style="position:absolute;top:16px;left:20px;z-index:2;pointer-events:none;">
            <div style="font-size:.9rem;font-weight:700;color:rgba(255,235,180,0.95);text-shadow:0 0 20px rgba(255,200,100,0.4);">🌌 词汇银河</div>
            <div style="font-size:.68rem;color:rgba(255,225,160,0.5);margin-top:2px;">拖拽旋转 · 滚轮缩放 · 点击查看词义</div>
          </div>
          <div style="position:absolute;top:16px;right:20px;z-index:2;display:flex;gap:12px;font-size:.65rem;color:rgba(255,225,160,0.6);pointer-events:none;">
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#fbbf24;margin-right:4px;vertical-align:middle;box-shadow:0 0 8px #fbbf24;"></span>专业词</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f9a8d4;margin-right:4px;vertical-align:middle;box-shadow:0 0 8px #f9a8d4;"></span>文章新词</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#93c5fd;margin-right:4px;vertical-align:middle;box-shadow:0 0 8px #93c5fd;"></span>论文词</span>
          </div>
          <canvas id="star-map" style="width:100%;height:900px;display:block;cursor:grab;"></canvas>
          <div id="star-tooltip" style="display:none;position:absolute;z-index:10;padding:10px 16px;background:rgba(30,20,50,0.92);border:1px solid rgba(255,200,100,0.2);border-radius:12px;color:#ffeeb8;font-size:.78rem;pointer-events:none;backdrop-filter:blur(16px);max-width:260px;box-shadow:0 4px 24px rgba(255,180,60,0.12);"></div>
        </div>
      </div>
    </section>
  `;
}

export function initHome() {
  const user = JSON.parse(localStorage.getItem('zaiyi_user') || '{}');
  const profile = JSON.parse(localStorage.getItem('zaiyi_profile') || '{}');
  const uEl = document.getElementById('home-username');
  if (uEl && user.username) uEl.textContent = user.username;

  // Profile tags
  const tagsEl = document.getElementById('home-profile-tags');
  if (tagsEl && profile.subject_field) {
    const FM = { law:'法学', finance:'金融', cs:'计算机', medicine:'医学', engineering:'工程', humanities:'人文' };
    const tags = [];
    const fields = Array.isArray(profile.subject_field) ? profile.subject_field : [profile.subject_field];
    fields.forEach(f => tags.push(FM[f] || f));
    if (profile.eng_level) tags.push(profile.eng_level.toUpperCase());
    if (tags.length) tagsEl.innerHTML = tags.map(t => `<span class="hero__tag">${t}</span>`).join('');
  }

  // Load all stats
  import('./api.js').then(({ fetchAPIGet }) => {
    // Vocab stats
    fetchAPIGet('/vocab/stats').then(d => {
      if (!d) return;
      const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v ?? '—'; };
      s('ds-vocab', d.total); s('ds-mastered', d.mastered); s('ds-review', d.need_review_today);
    }).catch(() => {});

    // Papers
    fetchAPIGet('/papers?limit=1').then(d => {
      const e = document.getElementById('ds-papers');
      if (e && d) e.textContent = d.total ?? 0;
    }).catch(() => {});

    // Articles read
    fetchAPIGet('/papers/stats').then(d => {
      const e = document.getElementById('ds-articles');
      if (e && d) e.textContent = d.read_papers ?? 0;
    }).catch(() => {});

    // Translation count
    fetchAPIGet('/translation/history?limit=1').then(d => {
      const e = document.getElementById('ds-translations');
      if (e && d) e.textContent = d.total ?? 0;
    }).catch(() => {});

    // Scope stats
    fetchAPIGet('/vocab/scope-stats').then(d => {
      if (!d || !d.total) return;
      document.getElementById('dash-scope-name').textContent = d.scope_name || d.scope_id;
      const pct = Math.round((d.learned / d.total) * 100);
      document.getElementById('dash-scope-pct').textContent = `${d.learned}/${d.total} (${pct}%)`;
      document.getElementById('dash-scope-bar').style.width = `${pct}%`;
      document.getElementById('dash-scope-detail').innerHTML = `
        <span>📖 已学 <strong>${d.learned}</strong></span>
        <span>✅ 掌握 <strong>${d.mastered}</strong></span>
        <span>📝 待学 <strong>${d.total - d.learned}</strong></span>`;
    }).catch(() => {});

    // 7-day trend — interactive bar chart
    fetchAPIGet('/vocab?limit=200').then(d => {
      const items = d?.items || d?.words || [];
      const counts = {};
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        counts[dt.toISOString().slice(0, 10)] = 0;
      }
      items.forEach(w => {
        const day = (w.created_at || '').slice(0, 10);
        if (day in counts) counts[day]++;
      });
      const vals = Object.values(counts);
      const max = Math.max(...vals, 1);
      const total = vals.reduce((a, b) => a + b, 0);
      const container = document.getElementById('dash-trend');
      if (!container) return;
      container.style.cssText = 'display:flex;align-items:flex-end;gap:6px;height:90px;padding:4px 0;';
      container.innerHTML = Object.entries(counts).map(([day, v], i) => {
        const h = Math.max(6, (v / max) * 70);
        const label = day.slice(5);
        const isToday = i === 6;
        return `<div class="trend-bar-col" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;position:relative;" data-count="${v}" data-day="${label}">
          <span class="trend-bar-val" style="font-size:.65rem;color:var(--text-muted);font-weight:600;opacity:0;transition:opacity 0.2s;">${v}</span>
          <div class="trend-bar" style="width:100%;height:${h}px;background:${isToday ? 'linear-gradient(180deg,#a78bfa,var(--accent))' : 'var(--grad-topic)'};border-radius:6px;transition:height 0.6s cubic-bezier(0.34,1.56,0.64,1),transform 0.2s ease,box-shadow 0.2s ease,filter 0.2s ease;transform-origin:bottom;"></div>
          <span style="font-size:.6rem;color:var(--text-muted);transition:color 0.2s;${isToday ? 'color:var(--accent);font-weight:700;' : ''}">${isToday ? '今天' : label}</span>
        </div>`;
      }).join('') + `<div style="position:absolute;top:-2px;right:0;font-size:.65rem;color:var(--text-muted);">共 ${total} 词</div>`;
      container.style.position = 'relative';
      // Interactive hover
      container.addEventListener('mouseenter', () => {
        container.querySelectorAll('.trend-bar-val').forEach(v => v.style.opacity = '1');
      });
      container.addEventListener('mouseleave', () => {
        container.querySelectorAll('.trend-bar-val').forEach(v => v.style.opacity = '0');
        container.querySelectorAll('.trend-bar').forEach(b => {
          b.style.transform = ''; b.style.boxShadow = ''; b.style.filter = '';
        });
      });
      container.querySelectorAll('.trend-bar-col').forEach(col => {
        col.addEventListener('mouseenter', () => {
          const bar = col.querySelector('.trend-bar');
          bar.style.transform = 'scaleY(1.12) scaleX(1.06)';
          bar.style.boxShadow = '0 4px 16px rgba(88,86,214,0.3)';
          bar.style.filter = 'brightness(1.15)';
          col.querySelector('.trend-bar-val').style.opacity = '1';
          col.querySelector('.trend-bar-val').style.color = 'var(--accent)';
          col.querySelector('.trend-bar-val').style.fontWeight = '800';
          col.querySelector('.trend-bar-val').style.transform = 'scale(1.2)';
        });
        col.addEventListener('mouseleave', () => {
          const bar = col.querySelector('.trend-bar');
          bar.style.transform = ''; bar.style.boxShadow = ''; bar.style.filter = '';
          col.querySelector('.trend-bar-val').style.color = '';
          col.querySelector('.trend-bar-val').style.fontWeight = '';
          col.querySelector('.trend-bar-val').style.transform = '';
        });
      });
    }).catch(() => {});

    // Galaxy Star Map — init immediately, load words async
    initStarMap([], 6710, 0); // Show galaxy immediately
    Promise.all([
      fetchAPIGet('/vocab?limit=200').catch(() => ({ items: [] })),
      fetchAPIGet('/vocab/scope-stats').catch(() => ({ total: 6710, learned: 0 }))
    ]).then(([vocabData, scopeData]) => {
      const items = vocabData?.items || vocabData?.words || [];
      if (items.length > 0) {
        initStarMap(items, scopeData?.total || 6710, scopeData?.learned || items.length);
      }
    }).catch(() => { /* already showing empty galaxy */ });
  });
}

// ── 银河星图 — Optimized Galaxy Flowing Star Map ──────────────────────
function initStarMap(vocabItems, scopeTotal, learnedCount) {
  scopeTotal = scopeTotal || 6710;
  learnedCount = learnedCount || vocabItems.length;
  const canvas = document.getElementById('star-map');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('star-tooltip');
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x for perf
  let W, H;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgDirty = true;
  }
  resize();
  window.addEventListener('resize', resize);

  // Pre-render static background to offscreen canvas
  let bgCanvas = null, bgDirty = true;
  function renderBg() {
    if (!bgDirty && bgCanvas) return;
    if (W < 1 || H < 1) return;
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = Math.ceil(W); bgCanvas.height = Math.ceil(H);
    const bgCtx = bgCanvas.getContext('2d');
    // Strong gradient background
    const bg = bgCtx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#030118');
    bg.addColorStop(0.25, '#0a0530');
    bg.addColorStop(0.5, '#150a3a');
    bg.addColorStop(0.75, '#1a0e35');
    bg.addColorStop(1, '#0d0825');
    bgCtx.fillStyle = bg; bgCtx.fillRect(0, 0, W, H);
    // Nebula clouds — vivid
    const nebulae = [
      { x: 0.2, y: 0.3, r: 250, hue: 280, a: 0.12 },
      { x: 0.7, y: 0.25, r: 300, hue: 320, a: 0.1 },
      { x: 0.5, y: 0.6, r: 350, hue: 40, a: 0.08 },
      { x: 0.3, y: 0.7, r: 200, hue: 220, a: 0.1 },
      { x: 0.8, y: 0.65, r: 280, hue: 260, a: 0.09 },
    ];
    for (const n of nebulae) {
      const nx = W * n.x, ny = H * n.y;
      const ng = bgCtx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
      ng.addColorStop(0, `hsla(${n.hue},70%,35%,${n.a})`);
      ng.addColorStop(0.4, `hsla(${n.hue},60%,25%,${n.a * 0.5})`);
      ng.addColorStop(1, 'transparent');
      bgCtx.fillStyle = ng; bgCtx.fillRect(0, 0, W, H);
    }
    // Milky Way band
    bgCtx.save();
    bgCtx.translate(W / 2, H / 2);
    bgCtx.rotate(-0.3);
    const band = bgCtx.createLinearGradient(-W, 0, W, 0);
    band.addColorStop(0, 'transparent');
    band.addColorStop(0.3, 'rgba(200,180,255,0.04)');
    band.addColorStop(0.5, 'rgba(255,220,180,0.06)');
    band.addColorStop(0.7, 'rgba(200,180,255,0.04)');
    band.addColorStop(1, 'transparent');
    bgCtx.fillStyle = band;
    bgCtx.fillRect(-W, -H * 0.15, W * 2, H * 0.3);
    bgCtx.restore();
    bgDirty = false;
  }

  // Galaxy field — big bright stars filling the canvas
  const galaxyCount = Math.min(800, Math.max(400, Math.round(scopeTotal / 8)));
  const galaxyStars = [];
  // Spiral arms — spread across full canvas
  for (let i = 0; i < galaxyCount; i++) {
    const t = i / galaxyCount;
    const arm = (i % 4) * (Math.PI / 2);
    const r = 30 + t * 600 + (Math.random() - 0.5) * 120; // Much wider spread
    const angle = arm + t * 5 + (Math.random() - 0.5) * 0.6;
    galaxyStars.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle) * 0.4,
      z: (Math.random() - 0.5) * 100,
      size: 1.5 + Math.random() * 3.5,      // 1.5-5px — clearly visible
      brightness: 0.4 + Math.random() * 0.5,  // 0.4-0.9 — bright
      twinklePhase: Math.random() * 6.28,
      twinkleSpeed: 0.003 + Math.random() * 0.008,
      hue: 30 + Math.random() * 30,
      sat: 15 + Math.random() * 35,
    });
  }
  // Extra random background stars to fill empty space
  for (let i = 0; i < 200; i++) {
    galaxyStars.push({
      x: (Math.random() - 0.5) * 1400,
      y: (Math.random() - 0.5) * 700,
      z: (Math.random() - 0.5) * 200,
      size: 0.8 + Math.random() * 2,
      brightness: 0.2 + Math.random() * 0.4,
      twinklePhase: Math.random() * 6.28,
      twinkleSpeed: 0.002 + Math.random() * 0.006,
      hue: 200 + Math.random() * 160,
      sat: 10 + Math.random() * 30,
    });
  }

  // Bright learned stars
  const COLORS = {
    domain:  [255, 200, 60],
    article: [255, 140, 200],
    paper:   [120, 180, 255],
  };
  const learnedStars = vocabItems.map((w, i) => {
    const domain = (w.domain || w.source || '').toLowerCase();
    let type = 'article';
    if (domain.includes('paper') || domain.includes('论文')) type = 'paper';
    else if (domain.includes('law') || domain.includes('专业') || domain.includes('legal')) type = 'domain';
    const phi = Math.acos(-1 + (2 * i + 1) / Math.max(vocabItems.length, 1));
    const theta = Math.sqrt(vocabItems.length * Math.PI) * phi;
    const r = 50 + Math.random() * 90;
    return {
      word: w.word || w.term || '',
      zh: w.definition || w.zh || '',
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta) * 0.4,
      z: r * Math.cos(phi) * 0.3,
      color: COLORS[type], type,
      size: 4 + Math.random() * 3.5,
      pulse: Math.random() * 6.28,
      breathSpeed: 0.015 + Math.random() * 0.01,
    };
  });

  // Constellation edges
  const edges = [];
  const connCount = new Map();
  for (let i = 0; i < learnedStars.length; i++) {
    const dists = [];
    for (let j = i + 1; j < learnedStars.length; j++) {
      const dx = learnedStars[i].x - learnedStars[j].x;
      const dy = learnedStars[i].y - learnedStars[j].y;
      const dz = learnedStars[i].z - learnedStars[j].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < 100) dists.push({ j, d });
    }
    dists.sort((a, b) => a.d - b.d);
    for (const { j } of dists.slice(0, 2)) {
      if ((connCount.get(i) || 0) < 3 && (connCount.get(j) || 0) < 3) {
        edges.push([i, j]);
        connCount.set(i, (connCount.get(i) || 0) + 1);
        connCount.set(j, (connCount.get(j) || 0) + 1);
      }
    }
  }

  // Build edge lookup for O(1) access
  const edgeMap = new Map();
  edges.forEach(([i, j]) => {
    if (!edgeMap.has(i)) edgeMap.set(i, []);
    if (!edgeMap.has(j)) edgeMap.set(j, []);
    edgeMap.get(i).push(j);
    edgeMap.get(j).push(i);
  });

  // Floating particles
  const particles = Array.from({ length: 30 }, () => ({
    x: Math.random() * 1400, y: Math.random() * 700,
    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
    size: 0.5 + Math.random() * 1.2,
    life: Math.random() * 6.28,
    hue: 25 + Math.random() * 35,
  }));

  let rotAngle = 0;
  let zoom = 1, targetZoom = 1;
  let dragging = false, lastMx = 0, lastMy = 0;
  let dragOffsetX = 0, dragOffsetY = 0;
  let mouseX = -999, mouseY = -999;
  let selectedStar = null, hoveredStar = null;

  // Drag
  canvas.addEventListener('mousedown', e => { dragging = true; lastMx = e.clientX; lastMy = e.clientY; canvas.style.cursor = 'grabbing'; });
  window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
  window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top;
    if (dragging) {
      dragOffsetX += (e.clientX - lastMx) * 0.4;
      dragOffsetY += (e.clientY - lastMy) * 0.4;
      lastMx = e.clientX; lastMy = e.clientY;
    }
  });

  // Wheel zoom (trackpad pinch-to-zoom sends wheel events)
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY || e.deltaX;
    targetZoom = Math.max(0.3, Math.min(3, targetZoom - delta * 0.001));
  }, { passive: false });

  canvas.addEventListener('click', () => { selectedStar = hoveredStar || null; });
  canvas.addEventListener('mouseleave', () => { mouseX = -999; mouseY = -999; hoveredStar = null; if (tooltip) tooltip.style.display = 'none'; });

  // Touch
  let lastTouchDist = 0;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    } else {
      dragging = true;
      lastMx = e.touches[0].clientX; lastMy = e.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchend', () => { dragging = false; lastTouchDist = 0; });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist > 0) {
        targetZoom = Math.max(0.3, Math.min(3, targetZoom * (dist / lastTouchDist)));
      }
      lastTouchDist = dist;
    } else if (dragging) {
      const t = e.touches[0];
      dragOffsetX += (t.clientX - lastMx) * 0.4;
      dragOffsetY += (t.clientY - lastMy) * 0.4;
      lastMx = t.clientX; lastMy = t.clientY;
    }
  }, { passive: true });

  function project(x, y, z) {
    const ca = Math.cos(rotAngle), sa = Math.sin(rotAngle);
    const rx = (x * ca - z * sa) * zoom;
    const rz = x * sa + z * ca;
    const tilt = 0.18;
    const ry = (y * Math.cos(tilt) - rz * Math.sin(tilt)) * zoom;
    const rz2 = y * Math.sin(tilt) + rz * Math.cos(tilt);
    const fov = 500;
    const scale = fov / (fov + rz2 + 200);
    return { sx: W / 2 + rx * scale + dragOffsetX, sy: H / 2 + ry * scale + dragOffsetY, scale: scale * zoom, z: rz2 };
  }

  let frame = 0;
  function render() {
    frame++;
    if (W < 1 || H < 1) { resize(); requestAnimationFrame(render); return; }
    rotAngle += 0.003;
    zoom += (targetZoom - zoom) * 0.08;
    renderBg();

    // Draw background — directly if cached canvas fails
    if (bgCanvas && bgCanvas.width > 0) {
      ctx.drawImage(bgCanvas, 0, 0, W, H);
    } else {
      // Fallback: draw gradient directly
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#030118'); bg.addColorStop(0.5, '#150a3a'); bg.addColorStop(1, '#0d0825');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    }

    // Pulsing galactic core glow (only 1 gradient per frame)
    const cp = 0.85 + 0.15 * Math.sin(frame * 0.01);
    const cx = W / 2 + dragOffsetX, cy = H / 2 + dragOffsetY;
    const coreR = Math.min(W, H) * 0.4 * cp * zoom;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    core.addColorStop(0, 'rgba(255,190,80,0.1)');
    core.addColorStop(0.2, 'rgba(255,150,60,0.06)');
    core.addColorStop(0.5, 'rgba(200,130,220,0.03)');
    core.addColorStop(1, 'transparent');
    ctx.fillStyle = core; ctx.fillRect(0, 0, W, H);

    // Galaxy field (simple circles, no per-star gradient)
    for (let i = 0; i < galaxyStars.length; i++) {
      const s = galaxyStars[i];
      const p = project(s.x, s.y, s.z);
      const tw = s.brightness * (0.5 + 0.5 * Math.sin(frame * s.twinkleSpeed + s.twinklePhase));
      const sz = s.size * p.scale;
      if (sz < 0.2 || p.sx < -5 || p.sx > W + 5 || p.sy < -5 || p.sy > H + 5) continue;
      ctx.globalAlpha = tw;
      ctx.fillStyle = `hsl(${s.hue},${s.sat}%,82%)`;
      ctx.fillRect(p.sx - sz * 0.5, p.sy - sz * 0.5, sz, sz); // rect faster than arc
      if (sz > 0.8) { // soft glow for bigger ones
        ctx.globalAlpha = tw * 0.3;
        ctx.fillRect(p.sx - sz, p.sy - sz, sz * 2, sz * 2);
      }
    }
    ctx.globalAlpha = 1;

    // Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life += 0.02;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.globalAlpha = 0.12 + 0.12 * Math.sin(p.life);
      ctx.fillStyle = `hsl(${p.hue},80%,70%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Project learned stars
    const projected = learnedStars.map((s, i) => {
      const p = project(s.x, s.y, s.z);
      return { ...s, ...p, idx: i };
    }).sort((a, b) => a.z - b.z);

    // Constellation lines
    ctx.lineWidth = 0.6;
    for (let e = 0; e < edges.length; e++) {
      const [i, j] = edges[e];
      const a = projected[projected.findIndex(p => p.idx === i)];
      const b = projected[projected.findIndex(p => p.idx === j)];
      if (!a || !b) continue;
      const al = Math.min(a.scale, b.scale) * 0.25;
      if (al < 0.03) continue;
      const isSel = selectedStar && (selectedStar.idx === i || selectedStar.idx === j);
      ctx.globalAlpha = isSel ? al * 3 : al;
      ctx.strokeStyle = isSel ? '#ffd250' : '#ffe0a0';
      ctx.lineWidth = isSel ? 1.5 : 0.6;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    hoveredStar = null;

    // Bright learned stars (no per-star createRadialGradient!)
    for (let si = 0; si < projected.length; si++) {
      const s = projected[si];
      const breath = 0.7 + 0.3 * Math.sin(frame * s.breathSpeed + s.pulse);
      const sz = s.size * s.scale * breath;
      const alpha = Math.min(1, 0.4 + s.scale * 0.7);
      const [r, g, b] = s.color;
      const isSel = selectedStar && selectedStar.idx === s.idx;

      // Soft halo (simple circle, not gradient)
      const haloSz = sz * (isSel ? 5 : 3);
      ctx.globalAlpha = alpha * (isSel ? 0.12 : 0.06);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath(); ctx.arc(s.sx, s.sy, haloSz, 0, 6.28); ctx.fill();

      // Core
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(s.sx, s.sy, sz * (isSel ? 1.5 : 1), 0, 6.28);
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();

      // Hot center
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath(); ctx.arc(s.sx, s.sy, sz * 0.35, 0, 6.28);
      ctx.fillStyle = '#fffcf0'; ctx.fill();

      // Cross-flare on large stars
      if (sz > 2) {
        ctx.globalAlpha = alpha * 0.12;
        ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = 0.8;
        const fl = sz * 4;
        ctx.beginPath(); ctx.moveTo(s.sx - fl, s.sy); ctx.lineTo(s.sx + fl, s.sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.sx, s.sy - fl * 0.7); ctx.lineTo(s.sx, s.sy + fl * 0.7); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Selected label
      if (isSel) {
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillStyle = '#ffeeb8';
        ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
        ctx.fillText(s.word, s.sx, s.sy - sz * 3 - 6);
        if (s.zh) {
          ctx.font = '400 11px Inter, sans-serif';
          ctx.fillStyle = 'rgba(255,225,160,0.65)';
          ctx.fillText(s.zh, s.sx, s.sy - sz * 3 + 10);
        }
        ctx.shadowBlur = 0;
      }

      const dx = mouseX - s.sx, dy = mouseY - s.sy;
      if (dx * dx + dy * dy < 900 && s.scale > 0.2) hoveredStar = s;
    }

    // Tooltip
    if (tooltip) {
      if (hoveredStar && hoveredStar.word) {
        tooltip.style.display = 'block';
        tooltip.innerHTML = `<strong style="font-size:.9rem;color:#ffeeb8;">${hoveredStar.word}</strong>${hoveredStar.zh ? `<div style="color:rgba(255,225,160,0.6);font-size:.72rem;margin-top:3px;">${hoveredStar.zh}</div>` : ''}<div style="color:rgba(255,200,100,0.35);font-size:.6rem;margin-top:4px;">点击选中 · 滚轮缩放</div>`;
        let tx = hoveredStar.sx + 16, ty = hoveredStar.sy - 10;
        if (tx + 230 > W) tx = hoveredStar.sx - 230;
        if (ty < 10) ty = 10;
        tooltip.style.left = tx + 'px'; tooltip.style.top = ty + 'px';
        canvas.style.cursor = 'pointer';
      } else {
        tooltip.style.display = 'none';
        if (!dragging) canvas.style.cursor = 'grab';
      }
    }

    // Progress counter
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,225,160,0.3)';
    ctx.textAlign = 'right';
    const pct = scopeTotal > 0 ? ((learnedCount / scopeTotal) * 100).toFixed(1) : '0.0';
    ctx.fillText(`✦ ${learnedCount} / ${scopeTotal} 词 (${pct}%)`, W - 16, H - 14);

    requestAnimationFrame(render);
  }
  render();
}







// ============ TOPIC EXPLORER PAGE ============

// Load domain tags from user profile (read-only display)
async function loadProfileDomains() {
  const checklist = document.getElementById('topic-domain-checklist');
  if (!checklist) return;

  const profile = JSON.parse(localStorage.getItem('zaiyi_profile') || '{}');
  const specialties = Array.isArray(profile.specialty) ? profile.specialty : (profile.specialty ? [profile.specialty] : []);
  const interests = Array.isArray(profile.interest_tags) ? profile.interest_tags : [];
  const subjectFields = Array.isArray(profile.subject_field) ? profile.subject_field : (profile.subject_field ? [profile.subject_field] : []);

  // Try to get specialty labels from backend config
  const SPEC_LABELS = {};
  for (const field of subjectFields) {
    try {
      const data = await fetchAPIGet(`/config/specialties?field=${field}`);
      (data.specialties || []).forEach(s => { SPEC_LABELS[s.id] = s.label; });
    } catch (_e) {}
  }

  // Build domain list from specialties + interest tags
  const domains = [];
  specialties.forEach(s => {
    domains.push({ id: s, label: SPEC_LABELS[s] || s });
  });
  interests.forEach(t => {
    if (!domains.find(d => d.id === t)) {
      domains.push({ id: t, label: t });
    }
  });

  // Fallback if empty
  if (domains.length === 0) {
    checklist.innerHTML = '<span style="color:var(--text-muted);font-size:.85rem;">请先在 <a href="#/settings/profile" style="color:var(--text-accent);">画像设置</a> 中选择专业方向</span>';
    return;
  }

  checklist.innerHTML = domains.map(d =>
    `<span class="profile-domain-tag" data-domain="${d.label}" style="display:inline-block;padding:4px 12px;margin:3px 4px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);border-radius:16px;font-size:0.82rem;color:#c4b5fd;">${d.label}</span>`
  ).join('');
}


export function renderTopicExplorer() {
  return `
    <div class="container">
      <div class="page-header">
        <div class="page-header__badge">
          <span class="nav-dot" style="background:var(--topic)"></span>
          模块 01 · 主题探索
        </div>
        <h1 class="page-header__title">主题探索</h1>
        <p class="page-header__subtitle">
          输入任意涉外法治主题，AI 为你生成系统化的英文学习材料与术语解析
        </p>
      </div>

      <!-- FIX 5: Topic keywords, domains, tags moved to main page -->
      <div class="glass-panel" style="padding:24px;border-radius:20px;margin-bottom:20px;">
        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">主题关键词 *</label>
          <input type="text" class="form-input" id="topic-input"
            placeholder="例如：international arbitration, treaty law, cross-border data..."
            value="international arbitration">
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">当前专业方向（来自画像设置）<a href="#/settings/profile" style="font-size:.7rem;color:var(--text-accent);margin-left:8px;">修改画像 →</a></label>
          <div id="topic-domain-checklist" style="display:flex;flex-wrap:wrap;gap:2px;">
            <span style="color:var(--text-muted);font-size:.85rem;">加载中...</span>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">涉及事件（可选，文章中应涉及的真实案例或场景）</label>
          <textarea class="form-input" id="topic-events-input" rows="2"
            placeholder="例如：2024年中美贸易争端案例、欧盟GDPR执行案例..."
            style="resize:vertical;min-height:50px;"></textarea>
        </div>
      </div>

      <!-- FIX 6: Summary bar with current params and generate button -->
      <div class="glass-panel" id="topic-summary-bar" style="padding:16px 24px;border-radius:16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;flex:1;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:var(--text-muted);font-size:0.8rem;">方向：</span>
            <span id="summary-domains" style="color:var(--text-primary);font-size:0.85rem;font-weight:500;">国际法, 商法</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:var(--text-muted);font-size:0.8rem;">等级：</span>
            <span id="summary-level" style="color:var(--text-primary);font-size:0.85rem;">初级</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:var(--text-muted);font-size:0.8rem;">风格：</span>
            <span id="summary-style" style="color:var(--text-primary);font-size:0.85rem;">经济学人</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:var(--text-muted);font-size:0.8rem;">长度：</span>
            <span id="summary-length" style="color:var(--text-primary);font-size:0.85rem;">250 词</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="btn btn--secondary btn--sm" id="topic-reopen-config">调整参数</button>
          <button class="btn btn--topic" id="topic-submit-main" style="padding:8px 20px;">生成学习内容</button>
        </div>
      </div>

      <button class="topic-config-fab is-visible" id="topic-config-fab" title="打开参数配置">
        ⚙️
      </button>

      <!-- FIX 4: Config overlay starts minimized (no is-open) -->
      <!-- FIX 5: Config wizard only contains Step 2 (parameters) -->
      <div class="topic-config-overlay" id="topic-config-overlay">
        <div class="topic-config-dialog">
          <div class="topic-config-dialog__header">
            <div>
              <div class="topic-config-dialog__title">参数配置</div>
              <div class="topic-config-dialog__hint">调整生成参数后点击生成</div>
            </div>
            <button class="btn btn--secondary btn--sm" id="topic-config-minimize">最小化</button>
          </div>
          <div class="topic-config-dialog__body">
            <div class="topic-step-pane is-active" id="topic-step-2">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">难度等级</label>
                  <select class="form-select" id="topic-level">
                    <option value="beginner" selected>初级 Beginner</option>
                    <option value="intermediate">中级 Intermediate</option>
                    <option value="advanced">高级 Advanced</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">文章风格 (生成模版)</label>
                  <select class="form-select" id="topic-style">
                    <option value="economist" selected>The Economist (经济学人)</option>
                    <option value="guardian">The Guardian (卫报)</option>
                    <option value="ft">Financial Times (金融时报)</option>
                    <option value="academic">Academic (学术期刊)</option>
                    <option value="plain_english">Plain English (简明日常)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">文章长度 (Words): <span id="label-len">250</span></label>
                <input type="range" id="topic-len-slider" min="100" max="1000" step="50" value="250" style="width: 100%;">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">需复习的生词量: <span id="label-db-words">4</span></label>
                  <input type="range" id="topic-db-words-slider" min="0" max="20" step="1" value="4" style="width: 100%;">
                </div>
                <div class="form-group">
                  <label class="form-label">引入新词数量: <span id="label-new-words">4</span></label>
                  <input type="range" id="topic-new-words-slider" min="0" max="15" step="1" value="4" style="width: 100%;">
                </div>
              </div>

              <!-- Exam scope progress card -->
              <div id="scope-progress-card" class="glass-panel" style="padding:12px 16px;margin-top:8px;border-radius:12px;display:none;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <span style="font-size:.82rem;font-weight:600;color:var(--text-primary);">🎯 <span id="scope-name">—</span></span>
                  <span id="scope-stats-text" style="font-size:.72rem;color:var(--text-muted);"></span>
                </div>
                <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                  <div id="scope-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#a78bfa,#f472b6);border-radius:4px;transition:width 0.6s ease;"></div>
                </div>
                <div id="scope-detail" style="display:flex;gap:16px;margin-top:6px;font-size:.72rem;color:var(--text-muted);"></div>
              </div>

              <div class="topic-step-actions">
                <button class="btn btn--topic btn--full btn--lg" id="topic-submit">
                  生成学习内容
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="topic-tabs" style="display:flex;gap:4px;margin-bottom:16px;background:var(--glass-bg);border:var(--glass-border);border-radius:var(--r-pill);padding:4px;width:fit-content;">
        <button class="topic-tab is-active" id="tab-generate" style="padding:8px 20px;border:none;border-radius:var(--r-pill);font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms ease;background:var(--grad-topic);color:#fff;">📝 生成结果</button>
        <button class="topic-tab" id="tab-history" style="padding:8px 20px;border:none;border-radius:var(--r-pill);font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms ease;background:transparent;color:var(--text-secondary);">📚 历史文章</button>
      </div>

      <!-- Generate Result Panel -->
      <div id="topic-generate-panel">
        <div class="module-page">
          <div class="module-page__layout module-page__layout--single">
            <div class="panel panel--topic-result">
              <div class="panel__header">
                <div class="panel__title">
                  <span class="panel__title-icon" style="background:var(--topic)"></span>
                  学习内容
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:12px;color:var(--text-muted)" id="topic-confidence"></span>
                </div>
              </div>
              <div class="panel__body">
                <div id="topic-result">
                  <div class="result-empty">
                    <div class="result-empty__icon">🔍</div>
                    <div class="result-empty__text">
                      输入主题关键词并点击生成，<br>AI 将为你创建专属学习材料
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- History Panel -->
      <div id="topic-history-panel" style="display:none;">
        <div class="module-page">
          <div class="module-page__layout module-page__layout--single">
            <div class="panel">
              <div class="panel__header">
                <div class="panel__title">
                  <span class="panel__title-icon" style="background:var(--topic)"></span>
                  历史文章
                </div>
                <button class="btn btn--sm btn--ghost" id="btn-refresh-history">🔄 刷新</button>
              </div>
              <div class="panel__body">
                <div id="history-list">
                  <div class="result-empty">
                    <div class="result-empty__icon">📚</div>
                    <div class="result-empty__text">加载中...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initTopicExplorer() {
  const configOverlay = document.getElementById('topic-config-overlay');
  const configFab = document.getElementById('topic-config-fab');
  const minimizeConfigBtn = document.getElementById('topic-config-minimize');
  const reopenConfigBtn = document.getElementById('topic-reopen-config');
  const submitBtn = document.getElementById('topic-submit');
  const submitMainBtn = document.getElementById('topic-submit-main');
  const resultArea = document.getElementById('topic-result');
  const topicInput = document.getElementById('topic-input');

  // Load domains from user profile
  loadProfileDomains();
  let lastTopicPayload = null;
  let lastTopicLabel = '';

  // Style label map for summary bar
  const styleLabelMap = {
    'economist': '经济学人', 'guardian': '卫报', 'ft': '金融时报',
    'academic': '学术期刊', 'plain_english': '简明日常'
  };
  const levelLabelMap = {
    'beginner': '初级', 'intermediate': '中级', 'advanced': '高级'
  };

  // FIX 6: Update summary bar whenever params change
  const updateSummaryBar = () => {
    const domainTags = document.querySelectorAll('#topic-domain-checklist .profile-domain-tag');
    const domains = Array.from(domainTags).map(t => t.dataset.domain);
    const level = document.getElementById('topic-level').value;
    const style = document.getElementById('topic-style').value;
    const length = document.getElementById('topic-len-slider').value;

    const domainsEl = document.getElementById('summary-domains');
    const levelEl = document.getElementById('summary-level');
    const styleEl = document.getElementById('summary-style');
    const lengthEl = document.getElementById('summary-length');

    if (domainsEl) domainsEl.textContent = domains.length ? domains.join(', ') : '未选择';
    if (levelEl) levelEl.textContent = levelLabelMap[level] || level;
    if (styleEl) styleEl.textContent = styleLabelMap[style] || style;
    if (lengthEl) lengthEl.textContent = `${length} 词`;
  };


  const openConfig = () => {
    configOverlay.classList.add('is-open');
    configFab.classList.remove('is-visible');
  };

  const minimizeConfig = () => {
    configOverlay.classList.remove('is-open');
    configFab.classList.add('is-visible');
    updateSummaryBar();
  };

  const validateTopic = () => {
    const topic = topicInput.value.trim();
    if (!topic) {
      topicInput.style.borderColor = 'rgba(239,68,68,0.5)';
      topicInput.focus();
      return false;
    }
    topicInput.style.borderColor = '';
    return true;
  };

  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (submitMainBtn) submitMainBtn.click();
    }
  });

  configFab.addEventListener('click', openConfig);
  reopenConfigBtn.addEventListener('click', openConfig);
  minimizeConfigBtn.addEventListener('click', minimizeConfig);
  configOverlay.addEventListener('click', (e) => {
    if (e.target === configOverlay) minimizeConfig();
  });
  const onEscape = (e) => {
    if (e.key === 'Escape' && configOverlay.classList.contains('is-open')) {
      minimizeConfig();
    }
  };
  document.addEventListener('keydown', onEscape);

  // Update summary bar when config changes
  ['topic-level', 'topic-style'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateSummaryBar);
  });
  // (domain checklist is read-only, no change listener needed)

  // (Tags removed — replaced by events textarea)

  // Slider label bindings
  ['len', 'db-words', 'new-words'].forEach(id => {
      document.getElementById(`topic-${id}-slider`).addEventListener('input', (e) => {
          document.getElementById(`label-${id}`).textContent = e.target.value;
          updateSummaryBar();
      });
  });

  // Load exam scope progress
  async function loadScopeStats() {
    try {
      const stats = await fetchAPIGet('/vocab/scope-stats');
      const card = document.getElementById('scope-progress-card');
      if (!card || !stats || !stats.total) return;
      card.style.display = 'block';
      document.getElementById('scope-name').textContent = stats.scope_name || stats.scope_id;
      const pct = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
      document.getElementById('scope-stats-text').textContent = `${stats.learned} / ${stats.total} (${pct}%)`;
      document.getElementById('scope-progress-fill').style.width = `${pct}%`;
      document.getElementById('scope-detail').innerHTML = `
        <span>📖 已学 <strong>${stats.learned}</strong></span>
        <span>✅ 已掌握 <strong>${stats.mastered}</strong></span>
        <span>📝 待学 <strong>${stats.total - stats.learned}</strong></span>
      `;
    } catch (_e) { /* silent */ }
  }
  loadScopeStats();

  // Re-fetch when profile is updated (e.g. exam_type changed)
  window.addEventListener('profile-updated', loadScopeStats);

  const runTopicGeneration = async (payload, topicLabel) => {
    if (!payload) return;

    submitBtn.disabled = true;
    if (submitMainBtn) submitMainBtn.disabled = true;
    minimizeConfigBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> AI 正在生成...';
    if (submitMainBtn) submitMainBtn.innerHTML = '<span class="spinner"></span> 生成中...';

    resultArea.innerHTML = `
      <div class="loading-state">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <div class="loading-text">正在为「${topicLabel}」生成学习内容...</div>
        <div id="topic-gen-progress" style="margin-top:12px;max-width:400px;margin-left:auto;margin-right:auto;"></div>
      </div>
    `;

    const progressEl = document.getElementById('topic-gen-progress');
    const progress = startSimulatedProgress(progressEl, '正在调用 AI 生成...');

    const taskId = `topic-${Date.now()}`;
    const tm = getTaskManager();
    tm.addTask(taskId, `生成: ${topicLabel}`, 'topic');
    // Sync simulated progress to floating ball
    const _topicSyncId = setInterval(() => {
      const pct = progress.bar?.element?.querySelector('.sim-progress-pct')?.textContent;
      if (pct) tm.updateTask(taskId, parseInt(pct), 'AI 生成中...');
    }, 500);

    try {
      const data = await generateTopic(payload);
      clearInterval(_topicSyncId);
      tm.updateTask(taskId, 100, '生成完成 ✓');
      progress.complete();

      document.getElementById('topic-confidence').textContent = confidenceLabel(data.confidence_hint);
      minimizeConfig();

      // Build new words section if available
      const newWordsHtml = (data.new_words && data.new_words.length) ? `
          <div class="gen-article__section">
            <div class="gen-article__section-title" style="display:flex;align-items:center;justify-content:space-between;">
              <span>🆕 新词 (${data.new_words.length})</span>
              <button class="btn btn--sm btn--ghost" id="btn-batch-add-vocab">📥 批量加入生词本</button>
            </div>
            <div class="terms-grid">
              ${data.new_words.map(w => `
                <div class="term-card" data-word="${escapeHtml(w.word)}" data-def="${escapeHtml(w.definition_zh)}" data-sentence="${escapeHtml(w.in_sentence)}" onclick="this.classList.toggle('expanded')">
                  <div class="term-card__en">${escapeHtml(w.word)}</div>
                  <div class="term-card__zh">${escapeHtml(w.definition_zh)}</div>
                  <div class="term-card__example">
                    <strong>Example:</strong> ${escapeHtml(w.in_sentence)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
      ` : '';

      resultArea.innerHTML = `
        <div class="gen-article">
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
            <button class="btn btn--ghost btn--sm" id="btn-topic-regenerate">🔄 重新生成</button>
          </div>
          <div class="gen-article__section">
            <div class="gen-article__section-title">📄 英文学习文章</div>
            <div class="gen-article__text" data-ann-content-type="article" data-ann-content-id="${data.article_id || taskId}">${highlightArticleWords(sanitizeHtml(data.result_text), data.db_words_used, data.new_words)}</div>
          </div>

          ${data.translation_text ? `
          <div class="gen-article__section">
            <div class="gen-article__section-title" style="display:flex;align-items:center;justify-content:space-between;">
              <span>🀄 逐段中文翻译</span>
              <button class="btn btn--sm btn--ghost" onclick="this.closest('.gen-article__section').querySelector('.gen-article__translation').classList.toggle('collapsed')">
                收起/展开
              </button>
            </div>
            <div class="gen-article__translation" style="background:rgba(255,255,255,0.03);border-radius:8px;padding:16px;margin-top:8px;line-height:1.8;color:#94a3b8;font-size:0.95em;">
              ${sanitizeHtml(data.translation_text)}
            </div>
          </div>
          ` : ''}

          <div class="gen-article__section">
            <div class="gen-article__section-title">📚 关键术语 (${data.terms.length})</div>
            <div class="terms-grid">
              ${data.terms.map(t => `
                <div class="term-card" data-term="${escapeHtml(t.term)}" style="cursor:pointer;">
                  <div class="term-card__en">${escapeHtml(t.term)}</div>
                  <div class="term-card__zh">${escapeHtml(t.zh)}</div>
                  <div class="term-card__example">
                    <strong>Example:</strong> ${escapeHtml(t.example)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          ${newWordsHtml}

          <div class="notes-section">
            <div class="notes-section__title">💡 核心概念说明</div>
            ${data.notes.map(n => `<div class="notes-section__item">${escapeHtml(n)}</div>`).join('')}
          </div>

          <div class="feedback">
            <span class="feedback__label">结果是否有帮助？</span>
            <div class="feedback__btns">
              <button class="feedback__btn" onclick="submitFeedback(this, 'Topic_Explorer', 'Positive')">👍 有帮助</button>
              <button class="feedback__btn" onclick="submitFeedback(this, 'Topic_Explorer', 'Negative')">👎 需改进</button>
            </div>
          </div>

          <div class="cross-cta">
            <div class="cross-cta__text">
              <strong>继续学习：</strong>基于本文内容进入翻译训练
            </div>
            <button class="btn btn--translation" onclick="jumpToTranslation(this)">
              进入 Translation Studio →
            </button>
          </div>
        </div>
      `;
      const regenBtn = document.getElementById('btn-topic-regenerate');
      if (regenBtn) regenBtn.addEventListener('click', () => runTopicGeneration(lastTopicPayload, lastTopicLabel));

      // Enable annotations on article text
      const artContentId = data.article_id || taskId;
      const artTextEl = resultArea.querySelector('.gen-article__text[data-ann-content-type]');
      if (artTextEl) {
        initAnnotationContext('article', artContentId, artTextEl);
        renderAnnotationPanel('article', artContentId, resultArea);
      }

      // Batch add new words to vocabulary
      const batchBtn = document.getElementById('btn-batch-add-vocab');
      if (batchBtn) {
        batchBtn.addEventListener('click', async () => {
          const cards = resultArea.querySelectorAll('.term-card[data-word]');
          if (!cards.length) { showToast('没有可添加的新词', 'warning'); return; }
          batchBtn.disabled = true;
          batchBtn.textContent = '添加中...';
          let added = 0;
          for (const card of cards) {
            try {
              await createVocabItem({
                word: card.dataset.word,
                definition_zh: card.dataset.def,
                example_sentence: card.dataset.sentence,
                domain: 'topic_generation',
                source: 'topic_explorer'
              });
              added++;
            } catch (_e) { /* skip duplicates */ }
          }
          batchBtn.textContent = `✓ 已添加 ${added} 词`;
          showToast(`已将 ${added} 个新词加入生词本`, 'success');
        });
      }
    } catch (err) {
      clearInterval(_topicSyncId);
      progress.stop();
      resultArea.innerHTML = `
        <div class="result-empty">
          <div class="result-empty__icon">❌</div>
          <div class="result-empty__text">生成失败，请重试<br><span style="color:#ef4444;">${err.message}</span><br><br><span style="font-size:0.85rem;color:var(--text-muted);">提示：请检查 LLM 服务配置是否正确，或稍后重试。</span></div>
        </div>
      `;
      tm.removeTask(taskId);
    }

    minimizeConfigBtn.disabled = false;
    submitBtn.innerHTML = '生成学习内容';
    submitBtn.disabled = false;
    if (submitMainBtn) {
      submitMainBtn.innerHTML = '生成学习内容';
      submitMainBtn.disabled = false;
    }
  };

  const doSubmit = async () => {
    const topic = topicInput.value.trim();
    if (!validateTopic()) return;

    const level = document.getElementById('topic-level').value;
    const domainTags = document.querySelectorAll('#topic-domain-checklist .profile-domain-tag');
    const domains = Array.from(domainTags).map(t => t.dataset.domain);
    const style = document.getElementById('topic-style').value;
    const length = parseInt(document.getElementById('topic-len-slider').value, 10);
    const dbWords = parseInt(document.getElementById('topic-db-words-slider').value, 10);
    const newWords = parseInt(document.getElementById('topic-new-words-slider').value, 10);
    const events = (document.getElementById('topic-events-input')?.value || '').trim();

    lastTopicPayload = {
      topic,
      level,
      domains: domains.length ? domains : ['General'],
      style,
      length,
      dbWords,
      newWords,
      events
    };
    lastTopicLabel = topic;
    minimizeConfig();
    await runTopicGeneration(lastTopicPayload, lastTopicLabel);
  };

  submitBtn.addEventListener('click', doSubmit);
  if (submitMainBtn) submitMainBtn.addEventListener('click', doSubmit);

  // FIX 4: Config starts minimized, FAB is visible by default
  updateSummaryBar();

  // ══════════════════════════════════════════════
  // HISTORY TAB LOGIC
  // ══════════════════════════════════════════════
  const tabGenerate = document.getElementById('tab-generate');
  const tabHistory = document.getElementById('tab-history');
  const generatePanel = document.getElementById('topic-generate-panel');
  const historyPanel = document.getElementById('topic-history-panel');
  const historyList = document.getElementById('history-list');
  const refreshHistoryBtn = document.getElementById('btn-refresh-history');

  const LEVEL_MAP = { beginner: '初级', intermediate: '中级', advanced: '高级' };
  const STYLE_MAP = { economist: '经济学人', guardian: '卫报', ft: '金融时报', academic: '学术期刊', plain_english: '简明日常' };

  const switchTab = (tab) => {
    if (tab === 'generate') {
      tabGenerate.style.background = 'var(--grad-topic)';
      tabGenerate.style.color = '#fff';
      tabGenerate.classList.add('is-active');
      tabHistory.style.background = 'transparent';
      tabHistory.style.color = 'var(--text-secondary)';
      tabHistory.classList.remove('is-active');
      generatePanel.style.display = '';
      historyPanel.style.display = 'none';
    } else {
      tabHistory.style.background = 'var(--grad-topic)';
      tabHistory.style.color = '#fff';
      tabHistory.classList.add('is-active');
      tabGenerate.style.background = 'transparent';
      tabGenerate.style.color = 'var(--text-secondary)';
      tabGenerate.classList.remove('is-active');
      generatePanel.style.display = 'none';
      historyPanel.style.display = '';
      loadHistory();
    }
  };

  tabGenerate.addEventListener('click', () => switchTab('generate'));
  tabHistory.addEventListener('click', () => switchTab('history'));
  if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', () => loadHistory());

  let historyPage = 1;

  async function loadHistory(page = 1) {
    historyPage = page;
    historyList.innerHTML = `<div class="result-empty"><div class="loading-dots"><span></span><span></span><span></span></div><div class="loading-text">加载历史文章...</div></div>`;
    try {
      const data = await getArticleHistory(page, 10);
      if (!data.items || data.items.length === 0) {
        historyList.innerHTML = `<div class="result-empty"><div class="result-empty__icon">📚</div><div class="result-empty__text">暂无历史文章<br>生成一篇文章后会自动保存在这里</div></div>`;
        return;
      }
      let html = '<div class="history-cards">';
      for (const item of data.items) {
        const date = item.created_at ? new Date(item.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const domains = (item.domains || []).join(', ');
        const preview = (item.preview || '').replace(/<[^>]+>/g, '').substring(0, 120);
        html += `
          <div class="history-card" data-id="${escapeHtml(item.id)}">
            <div class="history-card__header">
              <div class="history-card__topic">${escapeHtml(item.topic)}</div>
              <div class="history-card__date">${date}</div>
            </div>
            <div class="history-card__meta">
              <span class="history-card__tag">${LEVEL_MAP[item.level] || item.level}</span>
              <span class="history-card__tag">${STYLE_MAP[item.style] || item.style}</span>
              <span class="history-card__tag">${item.article_length || '?'} 词</span>
              ${domains ? `<span class="history-card__tag">${escapeHtml(domains)}</span>` : ''}
            </div>
            <div class="history-card__preview">${escapeHtml(preview)}...</div>
            <div class="history-card__actions">
              <button class="btn btn--sm btn--topic history-view-btn" data-id="${item.id}">📖 查看全文</button>
              <button class="btn btn--sm btn--ghost history-export-btn" data-id="${item.id}">📥 下载 Word</button>
              <button class="btn btn--sm btn--ghost history-delete-btn" data-id="${item.id}" style="color:#ef4444;">🗑️ 删除</button>
            </div>
            <div class="history-card__detail" id="detail-${item.id}" style="display:none;"></div>
          </div>
        `;
      }
      html += '</div>';

      // Pagination
      const totalPages = Math.ceil(data.total / data.size);
      if (totalPages > 1) {
        html += `<div style="display:flex;justify-content:center;gap:8px;margin-top:16px;">`;
        for (let p = 1; p <= totalPages; p++) {
          html += `<button class="btn btn--sm ${p === page ? 'btn--topic' : 'btn--ghost'}" onclick="window.__loadHistory(${p})">${p}</button>`;
        }
        html += '</div>';
      }

      historyList.innerHTML = html;

      // Bind actions
      historyList.querySelectorAll('.history-view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewArticleDetail(btn.dataset.id));
      });
      historyList.querySelectorAll('.history-export-btn').forEach(btn => {
        btn.addEventListener('click', () => downloadArticleWord(btn.dataset.id, btn));
      });
      historyList.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteArticleItem(btn.dataset.id));
      });
    } catch (err) {
      historyList.innerHTML = `<div class="result-empty"><div class="result-empty__icon">❌</div><div class="result-empty__text">加载失败：${err.message}</div></div>`;
    }
  }

  window.__loadHistory = loadHistory;

  async function viewArticleDetail(id) {
    const detailEl = document.getElementById(`detail-${id}`);
    if (!detailEl) return;
    if (detailEl.style.display !== 'none') {
      detailEl.style.display = 'none';
      return;
    }
    detailEl.innerHTML = `<div style="text-align:center;padding:20px;"><div class="loading-dots"><span></span><span></span><span></span></div></div>`;
    detailEl.style.display = 'block';
    try {
      const data = await getArticleDetail(id);
      const newWordsHtml = (data.new_words && data.new_words.length) ? `
        <div class="gen-article__section">
          <div class="gen-article__section-title">🆕 新词 (${data.new_words.length})</div>
          <div class="terms-grid">
            ${data.new_words.map(w => `
              <div class="term-card" onclick="this.classList.toggle('expanded')">
                <div class="term-card__en">${escapeHtml(w.word)}</div>
                <div class="term-card__zh">${escapeHtml(w.definition_zh)}</div>
                <div class="term-card__example"><strong>Example:</strong> ${escapeHtml(w.in_sentence)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      detailEl.innerHTML = `
        <div class="gen-article" style="margin-top:16px;border-top:1px solid rgba(0,0,0,0.06);padding-top:16px;">
          <div class="gen-article__section">
            <div class="gen-article__section-title">📄 英文学习文章</div>
            <div class="gen-article__text" data-ann-content-type="article" data-ann-content-id="${id}">${highlightArticleWords(sanitizeHtml(data.result_text), data.db_words_used, data.new_words)}</div>
          </div>
          ${data.translation_text ? `
          <div class="gen-article__section">
            <div class="gen-article__section-title">🀄 逐段中文翻译</div>
            <div class="gen-article__translation" style="background:rgba(255,255,255,0.03);border-radius:8px;padding:16px;margin-top:8px;line-height:1.8;color:#94a3b8;font-size:0.95em;">
              ${sanitizeHtml(data.translation_text)}
            </div>
          </div>
          ` : ''}
          <div class="gen-article__section">
            <div class="gen-article__section-title">📚 关键术语 (${data.terms.length})</div>
            <div class="terms-grid">
              ${data.terms.map(t => `
                <div class="term-card" data-term="${escapeHtml(t.term)}" style="cursor:pointer;">
                  <div class="term-card__en">${escapeHtml(t.term)}</div>
                  <div class="term-card__zh">${escapeHtml(t.zh)}</div>
                  <div class="term-card__example"><strong>Example:</strong> ${escapeHtml(t.example)}</div>
                </div>
              `).join('')}
            </div>
          </div>
          ${newWordsHtml}
          ${data.notes && data.notes.length ? `
          <div class="notes-section">
            <div class="notes-section__title">💡 核心概念说明</div>
            ${data.notes.map(n => `<div class="notes-section__item">${escapeHtml(n)}</div>`).join('')}
          </div>
          ` : ''}
        </div>
      `;
      // Restore annotations on old article
      const histArtTextEl = detailEl.querySelector('.gen-article__text[data-ann-content-type]');
      if (histArtTextEl) {
        initAnnotationContext('article', id, histArtTextEl);
        restoreAnnotations('article', id, histArtTextEl);
        renderAnnotationPanel('article', id, detailEl);
      }
    } catch (err) {
      detailEl.innerHTML = `<div style="color:#ef4444;padding:12px;">加载失败：${err.message}</div>`;
    }
  }

  async function downloadArticleWord(id, btn) {
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ 导出中...';
    try {
      const blob = await exportArticleWord(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `article_${id.substring(0, 8)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      btn.textContent = '✅ 已下载';
      setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2000);
    } catch (err) {
      btn.textContent = '❌ 失败';
      setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2000);
      if (typeof showToast === 'function') showToast('导出失败：' + err.message, 'error');
    }
  }

  async function deleteArticleItem(id) {
    if (!confirm('确定删除这篇历史文章？')) return;
    try {
      await deleteArticle(id);
      if (typeof showToast === 'function') showToast('已删除', 'success');
      loadHistory(historyPage);
    } catch (err) {
      if (typeof showToast === 'function') showToast('删除失败：' + err.message, 'error');
    }
  }
}

// Global handoff function
window.jumpToTranslation = function(btnElement) {
  // Find the generated text in the same result area
  const articleBox = btnElement.closest('#topic-result').querySelector('.gen-article__text');
  if (articleBox) {
    const textToTranslate = articleBox.innerText || articleBox.textContent;
    sessionStorage.setItem('__xiao_tiao_handoff_text', textToTranslate.trim());
  }
  location.hash = '/translation';
};


// ============ ARTICLE LAB PAGE ============

export function renderArticleLab() {
  return `
    <div class="container">
      <div class="page-header">
        <div class="page-header__badge">
          <span class="nav-dot" style="background:var(--article)"></span>
          模块 02 · 文章实验室
        </div>
        <h1 class="page-header__title">文章解读</h1>
        <p class="page-header__subtitle">
          粘贴英文法律文本，AI 为你分段解读、提取术语、标注关键句
        </p>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn--sm btn--ghost" id="btn-article-history-toggle" title="历史记录">
            🕒 历史记录
          </button>
        </div>
      </div>

      <div class="module-page">
        <div class="module-page__layout">
          <!-- Input Panel -->
          <div class="panel">
            <div class="panel__header">
              <div class="panel__title">
                <span class="panel__title-icon" style="background:var(--article)"></span>
                输入文本
              </div>
              <span style="font-size:12px;color:var(--text-muted)" id="article-word-count">0 词</span>
            </div>
            <div class="panel__body">
              <div class="form-group">
                <label class="form-label">解读模式</label>
                <div class="segmented segmented--article" id="article-segmented">
                  <div class="segmented__slider" id="article-slider"></div>
                  <button class="segmented__btn active" id="mode-plain" onclick="selectMode('plain')">
                    📝 基础解读
                  </button>
                  <button class="segmented__btn" id="mode-legal" onclick="selectMode('legal_focus')">
                    ⚖️ 法律重点解读
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="checkbox-label" style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="article-grounded">
                  <span></span>
                  使用 Grounded 模式（RAG 检索证据）
                  <button type="button" id="grounded-info-toggle" style="background:none;border:1px solid var(--text-muted);color:var(--text-muted);border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin-left:4px;flex-shrink:0;" title="了解 Grounded 模式">?</button>
                </label>
                <div id="grounded-info-panel" style="display:none;margin-top:10px;padding:16px;background:rgba(88,86,214,0.05);border:1px solid rgba(88,86,214,0.15);border-radius:12px;font-size:0.85rem;line-height:1.7;color:var(--text-secondary);">
                  <div style="font-weight:600;color:var(--text-primary);margin-bottom:8px;">Grounded 模式说明</div>
                  <p style="margin-bottom:8px;"><strong>什么是 Grounded 模式？</strong><br>
                  Grounded 模式使用 RAG（检索增强生成）技术，在生成解读前先从知识库中检索相关证据和案例，确保 AI 的分析有据可依。</p>
                  <p style="margin-bottom:8px;"><strong>RAG 检索如何工作？</strong><br>
                  系统会将你的输入文本与知识库中的 GitHub 案例、法律文献片段进行语义匹配，选取最相关的 top-K 条结果作为上下文，辅助 AI 生成更准确的解读。</p>
                  <p style="margin-bottom:8px;"><strong>提供什么类型的证据？</strong><br>
                  引用来源包括：GitHub 开源法律 AI 项目案例、相关法律条文片段、学术文献摘要等。每条引用会标注来源和相关度。</p>
                  <p style="margin:0;"><strong>使用技巧：</strong><br>
                  - 建议先通过"Research Finder"刷新并入库 GitHub 案例<br>
                  - 输入越具体的法律文本，检索效果越好<br>
                  - 适合用于需要引用佐证的学术分析场景</p>
                </div>
              </div>

              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                  <label class="form-label" style="margin-bottom: 0;">英文法律文本 *</label>
                  <label class="btn btn--sm btn--ghost" style="padding: 4px 12px; font-size: 12px; cursor: pointer; border-radius: var(--r-pill);">
                    📄 上传 .txt / .md / .pdf
                    <input type="file" id="article-file-upload" accept=".txt,.md,.pdf,application/pdf,text/plain,text/markdown" style="display: none;">
                  </label>
                </div>
                <textarea class="form-input" id="article-input" rows="12"
                  placeholder="粘贴英文法律文本，如判例、条约、法规段落等...&#10;&#10;支持最多 3500 词">The doctrine of sovereign immunity has long been a cornerstone of international law. It provides that a sovereign state cannot be subjected to the jurisdiction of another state's courts without its consent. However, the absolute theory of sovereign immunity has gradually given way to the restrictive theory, which distinguishes between acts performed in the exercise of sovereign authority (acta jure imperii) and those of a commercial nature (acta jure gestionis). Under the restrictive approach, immunity is only granted for public acts, while commercial activities may be subject to the jurisdiction of foreign courts. This evolution reflects the changing nature of state participation in commercial transactions and the need to provide legal remedies for private parties dealing with state entities.</textarea>
              </div>

              <button class="btn btn--article btn--full btn--lg" id="article-submit">
                📖 开始解读
              </button>
            </div>
          </div>

          <!-- Output Panel -->
          <div class="panel">
            <div class="panel__header">
              <div class="panel__title">
                <span class="panel__title-icon" style="background:var(--article)"></span>
                解读结果
              </div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn--sm btn--ghost" id="btn-article-highlight" title="高亮" style="display:none;">🖍️ 高亮</button>
                <button class="btn btn--sm btn--ghost" id="btn-article-annotate" title="批注" style="display:none;">📝 批注</button>
                <button class="btn btn--sm btn--ghost" id="btn-article-download" title="下载" style="display:none;">⬇️ 下载</button>
              </div>
            </div>
            <div class="panel__body">
              <div id="article-result">
                <div class="result-empty">
                  <div class="result-empty__icon">📖</div>
                  <div class="result-empty__text">
                    输入或粘贴英文法律文本，<br>AI 将为你进行智能解读
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Article History Side Panel -->
      <div id="article-history-panel" class="glass-panel" style="display:none;position:fixed;right:0;top:60px;width:380px;max-width:90vw;height:calc(100vh - 60px);z-index:100;border-radius:20px 0 0 20px;padding:20px;overflow-y:auto;backdrop-filter:blur(20px);background:rgba(15,15,30,0.92);border:1px solid rgba(255,255,255,0.08);box-shadow:-8px 0 40px rgba(0,0,0,0.4);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-weight:700;font-size:1rem;color:var(--text-primary);">🕒 解读历史</div>
          <button class="btn btn--sm btn--ghost" id="btn-article-history-close">✕</button>
        </div>
        <div id="article-history-list" style="display:flex;flex-direction:column;gap:10px;">
          <div style="text-align:center;color:var(--text-muted);padding:30px 0;">加载中...</div>
        </div>
      </div>
    </div>
  `;
}

// Expose mode selection globally — BUG-03: scoped selector
window.selectMode = function (mode) {
  window.__articleMode = mode;
  document.querySelectorAll('#article-segmented .segmented__btn').forEach(btn => btn.classList.remove('active'));
  if (mode === 'legal_focus') {
    document.getElementById('mode-legal').classList.add('active');
  } else {
    document.getElementById('mode-plain').classList.add('active');
  }
  
  if (window.__updateSegmentedSlider) {
    window.__updateSegmentedSlider('article-segmented');
  }
};

export function initArticleLab() {
  window.__articleMode = 'plain';

  const submitBtn = document.getElementById('article-submit');
  const resultArea = document.getElementById('article-result');
  const articleInput = document.getElementById('article-input');
  const wordCount = document.getElementById('article-word-count');
  const fileUpload = document.getElementById('article-file-upload');
  const groundedInput = document.getElementById('article-grounded');
  let lastArticlePayload = null;
  let lastArticleWords = 0;

  // FIX 7: Grounded mode info panel toggle
  const groundedInfoToggle = document.getElementById('grounded-info-toggle');
  const groundedInfoPanel = document.getElementById('grounded-info-panel');
  if (groundedInfoToggle && groundedInfoPanel) {
    groundedInfoToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = groundedInfoPanel.style.display !== 'none';
      groundedInfoPanel.style.display = isOpen ? 'none' : 'block';
      groundedInfoToggle.textContent = isOpen ? '?' : '×';
    });
  }

  const extractTextFromPdfFile = async (file) => {
    const [pdfjsLib, workerUrlModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url')
    ]);
    const pdfjsWorkerUrl = workerUrlModule.default;

    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== pdfjsWorkerUrl) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
    }

    const buffer = await file.arrayBuffer();
    const task = pdfjsLib.getDocument({ data: buffer });
    const pdf = await task.promise;
    const pageLimit = Math.min(pdf.numPages, 30);

    const chunks = [];
    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      const line = text.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (line) chunks.push(line);
    }
    return chunks.join('\n\n');
  };

  if (fileUpload) {
    fileUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const filename = (file.name || '').toLowerCase();
      try {
        if (filename.endsWith('.pdf')) {
          showToast('正在解析 PDF 文本...', 'info', 1500);
          const extracted = await extractTextFromPdfFile(file);
          if (!extracted.trim()) {
            throw new Error('未提取到文本，可能是扫描版 PDF');
          }
          articleInput.value = extracted;
          articleInput.dispatchEvent(new Event('input'));
          showToast('PDF 文本已导入，可直接解读', 'success');
        } else {
          const text = await file.text();
          articleInput.value = text;
          articleInput.dispatchEvent(new Event('input'));
        }
      } catch (err) {
        showToast(`文件解析失败：${err.message || '请重试'}`, 'error');
      } finally {
        e.target.value = '';
      }
    });
  }

  articleInput.addEventListener('input', () => {
    const words = articleInput.value.trim().split(/\s+/).filter(Boolean).length;
    wordCount.textContent = `${words} 词`;
    if (words > 3500) {
      wordCount.style.color = '#ef4444';
    } else {
      wordCount.style.color = 'var(--text-muted)';
    }
  });

  // Trigger initial count
  articleInput.dispatchEvent(new Event('input'));

  const runArticleAnalysis = async (payload, words) => {
    if (!payload) return;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> AI 正在解读...';

    resultArea.innerHTML = `
      <div class="loading-state">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <div class="loading-text">正在解读文本 (${words} 词)...</div>
        <div id="article-gen-progress" style="margin-top:12px;max-width:400px;margin-left:auto;margin-right:auto;"></div>
      </div>
    `;

    const articleProgressEl = document.getElementById('article-gen-progress');
    const articleProgress = startSimulatedProgress(articleProgressEl, '正在调用 AI 解读...');

    const _artTaskId = `article-${Date.now()}`;
    const _artTm = getTaskManager();
    _artTm.addTask(_artTaskId, '文章解读', 'article');
    const _artSyncId = setInterval(() => {
      const pct = articleProgress.bar?.element?.querySelector('.sim-progress-pct')?.textContent;
      if (pct) _artTm.updateTask(_artTaskId, parseInt(pct), 'AI 解读中...');
    }, 500);

    try {
      const data = await analyzeArticle(payload);
      clearInterval(_artSyncId);
      _artTm.updateTask(_artTaskId, 100, '解读完成 ✓');
      articleProgress.complete();

      resultArea.innerHTML = `
        <div class="analysis-result">
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
            <button class="btn btn--ghost btn--sm" id="btn-article-regenerate">🔄 重新解读全文</button>
          </div>
          <div class="gen-article__section">
            <div class="gen-article__section-title">📝 分段解读</div>
            ${data.paragraphs.map((p, i) => `
              <div class="analysis-paragraph">
                <div class="analysis-paragraph__label analysis-paragraph__label--original">段落 ${i + 1} · 原文</div>
                <div class="analysis-paragraph__original">${escapeHtml(p.original)}</div>
                <div class="analysis-paragraph__label analysis-paragraph__label--explain">中文解读</div>
                <div class="analysis-paragraph__explanation">${escapeHtml(p.explanation)}</div>
                <div style="text-align: right; margin-top: 10px;">
                  <button class="btn btn--sm btn--ghost" onclick="window.retryParagraph(this)">
                    🔄 重新解读此段
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="gen-article__section">
            <div class="gen-article__section-title">📚 关键术语</div>
            <div class="terms-grid">
              ${data.terms.map(t => `
                <div class="term-card" data-term="${escapeHtml(t.term)}" style="cursor:pointer;">
                  <div class="term-card__en">${escapeHtml(t.term)}</div>
                  <div class="term-card__zh">${escapeHtml(t.definition_zh)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          ${data.key_sentences.length > 0 ? `
            <div class="gen-article__section">
              <div class="gen-article__section-title">⭐ 关键句 (${data.key_sentences.length})</div>
              <div class="key-sentences">
                ${data.key_sentences.map(s => `
                  <div class="key-sentence">
                    <div class="key-sentence__text">"${escapeHtml(s.text)}"</div>
                    <div class="key-sentence__reason">${escapeHtml(s.reason)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="feedback">
            <span class="feedback__label">解读结果是否有帮助？</span>
            <div class="feedback__btns">
              <button class="feedback__btn" onclick="submitFeedback(this, 'Article_Lab', 'Positive')">👍 有帮助</button>
              <button class="feedback__btn" onclick="submitFeedback(this, 'Article_Lab', 'Negative')">👎 需改进</button>
            </div>
          </div>

          <div class="cross-cta">
            <div class="cross-cta__text">
              <strong>继续学习：</strong>将本文内容进行翻译训练
            </div>
            <button class="btn btn--translation" onclick="location.hash='/translation'">
              进入 Translation Studio →
            </button>
          </div>
        </div>
      `;

      // Show toolbar buttons after successful render
      const dlBtn = document.getElementById('btn-article-download');
      const hlBtn = document.getElementById('btn-article-highlight');
      const anBtn = document.getElementById('btn-article-annotate');
      if (dlBtn) dlBtn.style.display = '';
      if (hlBtn) hlBtn.style.display = '';
      if (anBtn) anBtn.style.display = '';

      // Store data for download
      window.__lastArticleData = data;

      const regenBtn = document.getElementById('btn-article-regenerate');
      if (regenBtn) regenBtn.addEventListener('click', () => runArticleAnalysis(lastArticlePayload, lastArticleWords));
    } catch (err) {
      clearInterval(_artSyncId);
      _artTm.removeTask(_artTaskId);
      articleProgress.stop();
      resultArea.innerHTML = `
        <div class="result-empty">
          <div class="result-empty__icon">❌</div>
          <div class="result-empty__text">解读失败<br><span style="color:#ef4444;">${err.message}</span><br><br><span style="font-size:0.85rem;color:var(--text-muted);">提示：请检查网络连接或 LLM 服务配置。</span></div>
          <button class="btn btn--article btn--sm" id="btn-article-retry" style="margin-top:16px;">🔄 重新解读</button>
        </div>
      `;
      const retryBtn = document.getElementById('btn-article-retry');
      if (retryBtn) retryBtn.addEventListener('click', () => runArticleAnalysis(lastArticlePayload, lastArticleWords));
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '📖 开始解读';
  };

  submitBtn.addEventListener('click', async () => {
    const text = articleInput.value.trim();
    if (!text) {
      articleInput.style.borderColor = 'rgba(239,68,68,0.5)';
      return;
    }

    const words = text.split(/\s+/).filter(Boolean).length;
    if (words > 3500) {
      showToast('文本超过 3500 词限制，请缩短输入或分段处理。', 'warning');
      return;
    }

    lastArticlePayload = {
      source_text: text,
      analysis_mode: window.__articleMode,
      target_lang: 'zh',
      grounded: Boolean(groundedInput && groundedInput.checked),
      top_k: 4
    };
    lastArticleWords = words;
    await runArticleAnalysis(lastArticlePayload, lastArticleWords);
  });

  // ── Download Handler ──
  document.getElementById('btn-article-download')?.addEventListener('click', () => {
    const data = window.__lastArticleData;
    if (!data) { showToast('没有可下载的内容', 'warning'); return; }
    let content = '=== 文章解读结果 ===\n\n';
    if (data.paragraphs) {
      data.paragraphs.forEach((p, i) => {
        content += `--- 段落 ${i + 1} ---\n原文：${p.original}\n解读：${p.explanation}\n\n`;
      });
    }
    if (data.translation_text) content += `=== 翻译 ===\n${data.translation_text}\n\n`;
    if (data.terms && data.terms.length) {
      content += '=== 关键术语 ===\n';
      data.terms.forEach(t => { content += `${t.term} — ${t.zh || t.definition_zh || ''}\n`; });
      content += '\n';
    }
    if (data.key_sentences && data.key_sentences.length) {
      content += '=== 关键句 ===\n';
      data.key_sentences.forEach(s => { content += `"${s.text}" — ${s.reason}\n`; });
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `article_analysis_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
    showToast('已下载解读结果', 'success');
  });

  // ── Highlight & Annotate (enable word selector annotation features) ──
  document.getElementById('btn-article-highlight')?.addEventListener('click', () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      import('./components/annotation_manager.js').then(m => m.showHighlightPicker(sel.getRangeAt(0)));
    } else {
      showToast('请先选中文章中的文本，再点击高亮', 'info');
    }
  });
  document.getElementById('btn-article-annotate')?.addEventListener('click', () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      import('./components/annotation_manager.js').then(m => m.showAnnotationInput(sel.getRangeAt(0)));
    } else {
      showToast('请先选中文章中的文本，再点击批注', 'info');
    }
  });

  // ── History Panel ──
  const historyToggle = document.getElementById('btn-article-history-toggle');
  const historyPanel = document.getElementById('article-history-panel');
  const historyClose = document.getElementById('btn-article-history-close');
  const historyList = document.getElementById('article-history-list');

  async function loadArticleHistory() {
    if (!historyList) return;
    historyList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px 0;">加载中...</div>';
    try {
      const data = await getArticleHistory(1, 20);
      const items = data.items || data || [];
      if (!items.length) {
        historyList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px 0;">暂无历史记录</div>';
        return;
      }
      historyList.innerHTML = items.map(item => `
        <div class="history-card" data-id="${item.id || ''}" style="padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;cursor:pointer;transition:background 150ms;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${new Date(item.created_at || item.timestamp || Date.now()).toLocaleString('zh-CN')}</div>
          <div style="font-size:0.85rem;color:var(--text-primary);line-height:1.5;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
            ${escapeHtml((item.source_text || item.title || '').slice(0, 120))}${(item.source_text || '').length > 120 ? '...' : ''}
          </div>
          <div style="display:flex;gap:8px;margin-top:6px;">
            ${item.analysis_mode ? `<span style="font-size:0.65rem;padding:2px 6px;background:rgba(var(--article-rgb,88,86,214),0.15);border-radius:6px;color:var(--text-secondary);">${item.analysis_mode === 'legal_focus' ? '⚖️ 法律' : '📝 基础'}</span>` : ''}
            ${item.article_length ? `<span style="font-size:0.65rem;color:var(--text-muted);">${item.article_length} 词</span>` : ''}
          </div>
        </div>
      `).join('');

      // Click to load history item
      historyList.querySelectorAll('.history-card[data-id]').forEach(card => {
        card.addEventListener('click', async () => {
          const id = card.dataset.id;
          if (!id) return;
          try {
            const detail = await getArticleDetail(id);
            if (detail && detail.source_text) {
              articleInput.value = detail.source_text;
              articleInput.dispatchEvent(new Event('input'));
              if (detail.analysis_mode) window.selectMode(detail.analysis_mode);
              historyPanel.style.display = 'none';
              showToast('已加载历史记录，可重新解读', 'success');
            }
          } catch (e) {
            showToast('加载历史记录失败', 'error');
          }
        });
      });
    } catch (e) {
      historyList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px 0;">加载失败</div>';
    }
  }

  if (historyToggle && historyPanel) {
    historyToggle.addEventListener('click', () => {
      const isOpen = historyPanel.style.display !== 'none';
      historyPanel.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) loadArticleHistory();
    });
  }
  if (historyClose && historyPanel) {
    historyClose.addEventListener('click', () => { historyPanel.style.display = 'none'; });
  }
}

// Global Single Paragraph Retry Function
window.retryParagraph = async function(btn) {
  const container = btn.closest('.analysis-paragraph');
  const enText = container.querySelector('.analysis-paragraph__original').innerText;
  const zhEl = container.querySelector('.analysis-paragraph__explanation');
  
  btn.disabled = true;
  const originalBtnText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;margin-right:6px"></span> 解读中...';
  if (zhEl) {
    zhEl.innerHTML = `<span style="color:var(--text-muted);">正在生成该段解读...</span><div id="para-retry-progress"></div>`;
  }

  const { startSimulatedProgress: startProgress } = await import('./utils/stream.js');
  const paraProgressEl = document.getElementById('para-retry-progress');
  const paraProgress = paraProgressEl ? startProgress(paraProgressEl, '') : null;

  try {
    const mode = window.__articleMode || 'plain';
    const { analyzeArticle } = await import('./api.js');
    const data = await analyzeArticle({ source_text: enText, analysis_mode: mode });
    if (paraProgress) paraProgress.complete();
    
    if (zhEl) {
      zhEl.innerText = data.paragraphs[0].explanation;
    }
    
    // Success flash highlight
    container.style.transition = 'background-color 0.4s ease';
    container.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
    setTimeout(() => {
        container.style.backgroundColor = '';
    }, 1000);
  } catch (err) {
    if (paraProgress) paraProgress.stop();
    showToast('段落重新解读失败：' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnText;
  }
};

// ============ TRANSLATION STUDIO PAGE ============

export function renderTranslationStudio() {
  return `
    <div class="container">
      <div class="page-header">
        <div class="page-header__badge">
          <span class="nav-dot" style="background:var(--translation)"></span>
          模块 03 · 翻译工作室
        </div>
        <h1 class="page-header__title">翻译训练</h1>
        <p class="page-header__subtitle">
          中英法律文本互译，获取三种风格翻译与专业表达建议
        </p>
      </div>

      <div class="module-page">
        <div class="module-page__layout">
          <!-- Input Panel -->
          <div class="panel">
            <div class="panel__header">
              <div class="panel__title">
                <span class="panel__title-icon" style="background:var(--translation)"></span>
                翻译输入
              </div>
            </div>
            <div class="panel__body">
              <div class="form-group">
                <label class="form-label">翻译方向</label>
                <div class="segmented segmented--translation" id="direction-segmented">
                  <div class="segmented__slider" id="direction-slider"></div>
                  <button class="segmented__btn active" id="dir-zh2en" onclick="setDirection('zh_to_en')">
                    中文 → 英文
                  </button>
                  <button class="segmented__btn" id="dir-en2zh" onclick="setDirection('en_to_zh')">
                    英文 → 中文
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">源文本 *</label>
                <textarea class="form-input" id="translation-input" rows="8"
                  placeholder="输入需要翻译的法律文本...">跨境数据治理规则仍处于快速演化阶段。各国和各地区持续调整其监管框架，以应对数据跨国流动带来的挑战。</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">你的翻译（可选，用于对照点评）</label>
                <textarea class="form-input" id="translation-user" rows="4"
                  placeholder="输入你自己的翻译，AI 将与生成结果进行对照..."></textarea>
              </div>

              <button class="btn btn--translation btn--full btn--lg" id="translation-submit">
                🌐 生成翻译
              </button>
            </div>
          </div>

          <!-- Output Panel -->
          <div class="panel">
            <div class="panel__header">
              <div class="panel__title">
                <span class="panel__title-icon" style="background:var(--translation)"></span>
                翻译结果
              </div>
              <span style="font-size:12px;color:var(--text-muted)" id="trans-confidence"></span>
            </div>
            <div class="panel__body">
              <div id="translation-result">
                <div class="result-empty">
                  <div class="result-empty__icon">🌐</div>
                  <div class="result-empty__text">
                    输入文本并点击生成，<br>获取三种风格的法律翻译
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// BUG-03: scoped selector — only clear buttons inside #direction-segmented
window.setDirection = function (dir) {
  window.__translationDirection = dir;
  document.querySelectorAll('#direction-segmented .segmented__btn').forEach(btn => btn.classList.remove('active'));
  if (dir === 'zh_to_en') {
    document.getElementById('dir-zh2en').classList.add('active');
  } else {
    document.getElementById('dir-en2zh').classList.add('active');
  }
  // Update slider position
  if (window.__updateSegmentedSlider) {
    window.__updateSegmentedSlider('direction-segmented');
  }
};

// CODE-02: pass button element explicitly to avoid stale global event
window.copyText = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      btn.textContent = '✓ 已复制';
      setTimeout(() => { btn.textContent = '复制'; }, 1500);
    }
  });
};

export function initTranslationStudio() {
  window.__translationDirection = 'zh_to_en';

  const transInput = document.getElementById('translation-input');
  let lastTranslationPayload = null;
  
  // Check for handoff text from Topic Explorer
  const handoffText = sessionStorage.getItem('__xiao_tiao_handoff_text');
  if (handoffText) {
    transInput.value = handoffText;
    // Optional: flash animation to show it was populated
    transInput.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
    transInput.style.borderColor = 'var(--translation)';
    transInput.style.boxShadow = '0 0 0 4px rgba(52, 199, 89, 0.15)';
    setTimeout(() => {
      transInput.style.borderColor = '';
      transInput.style.boxShadow = '';
    }, 1500);
    // Remove the item so it only happens once
    sessionStorage.removeItem('__xiao_tiao_handoff_text');
    
    // Automatically switch to EN -> ZH since topic generated is English
    window.setDirection('en_to_zh');
  }

  const submitBtn = document.getElementById('translation-submit');
  const resultArea = document.getElementById('translation-result');

  const runTranslationRequest = async (payload) => {
    if (!payload) return;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> AI 正在翻译...';

    resultArea.innerHTML = `
      <div class="loading-state">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <div class="loading-text">正在生成三种风格翻译...</div>
        <div id="trans-gen-progress" style="margin-top:12px;max-width:400px;margin-left:auto;margin-right:auto;"></div>
      </div>
    `;

    const transProgressEl = document.getElementById('trans-gen-progress');
    const transProgress = startSimulatedProgress(transProgressEl, '正在调用 AI 翻译...');

    const _transTaskId = `trans-${Date.now()}`;
    const _transTm = getTaskManager();
    _transTm.addTask(_transTaskId, '翻译', 'translation');
    const _transSyncId = setInterval(() => {
      const pct = transProgress.bar?.element?.querySelector('.sim-progress-pct')?.textContent;
      if (pct) _transTm.updateTask(_transTaskId, parseInt(pct), 'AI 翻译中...');
    }, 500);

    try {
      const data = await runTranslation(payload);
      clearInterval(_transSyncId);
      _transTm.updateTask(_transTaskId, 100, '翻译完成 ✓');
      transProgress.complete();

      document.getElementById('trans-confidence').textContent = confidenceLabel(data.confidence_hint);

      // Store variant texts for safe copy via data attributes
      const variantsCopyData = data.variants.map(v => v.text);
      window.__translationVariants = variantsCopyData;

      const transId = data.history_id || `trans-${Date.now()}`;
      resultArea.innerHTML = `
        <div class="translation-result" data-ann-content-type="translation" data-ann-content-id="${transId}">
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
            <button class="btn btn--ghost btn--sm" id="btn-translation-regenerate">🔄 重新生成翻译</button>
          </div>
          ${data.critique ? `
            <div class="gen-article__section" style="margin-bottom: 24px; background: rgba(52, 199, 89, 0.05); padding: 18px; border-radius: 12px; border: 1px solid rgba(52, 199, 89, 0.2);">
              <div class="gen-article__section-title" style="color: var(--translation); margin-bottom: 12px;">🤖 译文对照点评</div>
              <div style="margin-bottom: 12px; font-size: 14px;">
                <strong>评分：</strong> <span style="color: var(--translation); font-weight: bold;">${escapeHtml(data.critique.score)}</span><br>
                <div style="margin-top: 6px; color: var(--text-base);">${escapeHtml(data.critique.feedback)}</div>
              </div>
              ${data.critique.improvements.map(imp => `
                <div style="font-size: 13px; margin-bottom: 10px; padding-left: 12px; border-left: 2px solid var(--translation);">
                  <div style="text-decoration: line-through; color: var(--text-muted); margin-bottom: 2px;">${escapeHtml(imp.original)}</div>
                  <div style="color: var(--text-base);">👉 ${escapeHtml(imp.suggested)} <br><span style="color: var(--text-muted); font-size: 12px;">💡 ${escapeHtml(imp.reason)}</span></div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${data.variants.map((v, idx) => `
            <div class="translation-variant translation-variant--${escapeHtml(v.style)}">
              <div class="translation-variant__label">
                ${v.style === 'literal' ? '📋' : v.style === 'legal' ? '⚖️' : '💬'} ${escapeHtml(v.label)}
              </div>
              <div class="translation-variant__text">${escapeHtml(v.text)}</div>
              <button class="translation-variant__copy" data-variant-idx="${idx}">复制</button>
              <div style="clear:both"></div>
            </div>
          `).join('')}

          <div class="gen-article__section" style="margin-top:20px">
            <div class="gen-article__section-title">📚 相关术语</div>
            <div class="terms-grid">
              ${data.terms.map(t => `
                <div class="term-card">
                  <div class="term-card__en">${escapeHtml(t.term)}</div>
                  <div class="term-card__zh">${escapeHtml(t.definition_zh)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="notes-section">
            <div class="notes-section__title">💡 表达建议</div>
            ${data.notes.map(n => `<div class="notes-section__item">${escapeHtml(n)}</div>`).join('')}
          </div>

          ${data.common_errors && data.common_errors.length ? `
            <div class="notes-section" style="margin-top:12px;">
              <div class="notes-section__title">⚠️ 常见错误提示</div>
              ${data.common_errors.map(n => `<div class="notes-section__item">${escapeHtml(n)}</div>`).join('')}
            </div>
          ` : ''}

          <div class="feedback">
            <span class="feedback__label">翻译结果是否有帮助？</span>
            <div class="feedback__btns">
              <button class="feedback__btn" onclick="submitFeedback(this, 'Translation_Studio', 'Positive')">👍 有帮助</button>
              <button class="feedback__btn" onclick="submitFeedback(this, 'Translation_Studio', 'Negative')">👎 需改进</button>
            </div>
          </div>
        </div>
      `;

      // Bind copy buttons via data attributes (avoids XSS from inline template literals)
      resultArea.querySelectorAll('.translation-variant__copy[data-variant-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.variantIdx, 10);
          const text = (window.__translationVariants || [])[idx] || '';
          copyText(text, btn);
        });
      });
      const regenBtn = document.getElementById('btn-translation-regenerate');
      if (regenBtn) regenBtn.addEventListener('click', () => runTranslationRequest(lastTranslationPayload));

      // Enable annotations on translation result
      const transResultEl = resultArea.querySelector('.translation-result[data-ann-content-type]');
      if (transResultEl) {
        initAnnotationContext('translation', transId, transResultEl);
        renderAnnotationPanel('translation', transId, resultArea);
      }
    } catch (err) {
      clearInterval(_transSyncId);
      _transTm.removeTask(_transTaskId);
      transProgress.stop();
      resultArea.innerHTML = `
        <div class="result-empty">
          <div class="result-empty__icon">❌</div>
          <div class="result-empty__text">翻译失败<br><span style="color:#ef4444;">${err.message}</span><br><br><span style="font-size:0.85rem;color:var(--text-muted);">提示：请检查网络连接或 LLM 服务配置。</span></div>
          <button class="btn btn--translation btn--sm" id="btn-translation-retry" style="margin-top:16px;">🔄 重新翻译</button>
        </div>
      `;
      const retryBtn = document.getElementById('btn-translation-retry');
      if (retryBtn) retryBtn.addEventListener('click', () => runTranslationRequest(lastTranslationPayload));
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '🌐 开始翻译';
  };

  submitBtn.addEventListener('click', async () => {
    const text = document.getElementById('translation-input').value.trim();
    if (!text) {
      document.getElementById('translation-input').style.borderColor = 'rgba(239,68,68,0.5)';
      return;
    }

    if (text.length > 5000) {
      showToast('输入文本过长，请控制在 5000 字符以内。', 'warning');
      return;
    }

    const userTranslation = document.getElementById('translation-user').value.trim();
    lastTranslationPayload = {
      source_text: text,
      direction: window.__translationDirection,
      style: ['literal', 'legal', 'plain'],
      user_translation: userTranslation
    };

    await runTranslationRequest(lastTranslationPayload);
  });
}

// ============ RESEARCH FINDER PAGE ============

export function renderResearchPage() {
  return `
    <div class="container">
      <div class="page-header">
        <div class="page-header__badge">
          <span class="nav-dot" style="background:var(--research)"></span>
          模块 04 · 研究与检索
        </div>
        <h1 class="page-header__title">Research Finder</h1>
        <p class="page-header__subtitle">
          GitHub 相似案例检索 + RAG 入库 + Grounded 问答
        </p>
      </div>

      <div class="module-page">
        <div class="module-page__layout">
          <div class="panel">
            <div class="panel__header">
              <div class="panel__title">
                <span class="panel__title-icon" style="background:var(--research)"></span>
                数据刷新与索引
              </div>
            </div>
            <div class="panel__body">
              <div style="display:flex; gap:10px; flex-wrap: wrap; margin-bottom: 12px;">
                <button class="btn btn--research" id="research-refresh">刷新 GitHub 案例</button>
                <button class="btn btn--secondary" id="research-ingest">写入 RAG 索引</button>
              </div>
              <div id="research-status" class="notes-section__item">等待操作</div>

              <div class="gen-article__section" style="margin-top:16px;">
                <div class="gen-article__section-title">🧩 Grounded Q&A</div>
                <textarea class="form-input" id="rag-query-input" rows="5" placeholder="例如：在 legal ai assistant 场景里，FastAPI 方案常见技术栈是什么？"></textarea>
                <button class="btn btn--research btn--full" id="rag-query-submit" style="margin-top:12px;">检索并回答</button>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel__header">
              <div class="panel__title">
                <span class="panel__title-icon" style="background:var(--research)"></span>
                检索结果
              </div>
            </div>
            <div class="panel__body">
              <div class="gen-article__section">
                <div class="gen-article__section-title">📚 GitHub Cases</div>
                <div id="research-cases" class="notes-section__item">加载中...</div>
              </div>
              <div class="gen-article__section">
                <div class="gen-article__section-title">🏢 组织架构</div>
                <div id="research-org" class="notes-section__item">加载中...</div>
              </div>
              <div class="gen-article__section">
                <div class="gen-article__section-title">🧠 RAG 回答</div>
                <pre id="rag-answer" class="gen-article__text">尚未提问</pre>
                <div id="rag-citations" class="notes-section__item">暂无引用</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initResearchPage() {
  const statusEl = document.getElementById('research-status');
  const casesEl = document.getElementById('research-cases');
  const orgEl = document.getElementById('research-org');
  const answerEl = document.getElementById('rag-answer');
  const citationsEl = document.getElementById('rag-citations');

  async function loadBaseData() {
    try {
      const [casesData, orgData] = await Promise.all([
        getResearchGithubCases(20),
        getOrgUnits()
      ]);
      const cases = Array.isArray(casesData.items) ? casesData.items : [];
      const orgUnits = Array.isArray(orgData.items) ? orgData.items : [];

      if (cases.length === 0) {
        casesEl.innerHTML = '暂无案例，请点击“刷新 GitHub 案例”';
      } else {
        casesEl.innerHTML = cases.map((item) => `
          <div class="term-card" style="margin-bottom:10px;">
            <div class="term-card__en"><a href="${item.html_url}" target="_blank" rel="noreferrer">${item.full_name}</a></div>
            <div class="term-card__zh">⭐ ${item.stars || 0} · ${item.language || 'Unknown'}</div>
            <div class="term-card__example">${item.query || ''}</div>
          </div>
        `).join('');
      }

      if (orgUnits.length === 0) {
        orgEl.innerHTML = '暂无组织架构数据';
      } else {
        orgEl.innerHTML = orgUnits.map((unit) => `
          <div class="notes-section__item">
            <strong>${unit.unit_name}</strong> · ${unit.owner_role}<br>
            ${unit.responsibility}
          </div>
        `).join('');
      }
    } catch (err) {
      casesEl.innerHTML = `加载失败：${err.message}`;
      orgEl.innerHTML = `加载失败：${err.message}`;
    }
  }

  document.getElementById('research-refresh').addEventListener('click', async () => {
    statusEl.textContent = '正在刷新 GitHub 案例...';
    try {
      const result = await refreshResearchGithubCases();
      statusEl.textContent = `刷新完成：新增/更新 ${result.saved_total} 条`;
      await loadBaseData();
    } catch (err) {
      statusEl.textContent = `刷新失败：${err.message}`;
    }
  });

  document.getElementById('research-ingest').addEventListener('click', async () => {
    statusEl.textContent = '正在写入 RAG 索引...';
    try {
      const result = await ingestGithubCasesToRag(30);
      statusEl.textContent = `入库完成：docs=${result.ingested_documents}, chunks=${result.ingested_chunks}`;
    } catch (err) {
      statusEl.textContent = `入库失败：${err.message}`;
    }
  });

  document.getElementById('rag-query-submit').addEventListener('click', async () => {
    const query = document.getElementById('rag-query-input').value.trim();
    if (!query) {
      statusEl.textContent = '请输入问题';
      return;
    }
    statusEl.textContent = '正在检索并回答...';
    try {
      const result = await queryRag({ query, top_k: 5 });
      answerEl.textContent = result.answer || '无回答';
      const citations = Array.isArray(result.citations) ? result.citations : [];
      citationsEl.innerHTML = citations.length
        ? citations.map((c) => `<div class="notes-section__item">[${c.id}] ${c.title}${c.url ? ` · <a href="${c.url}" target="_blank" rel="noreferrer">${c.url}</a>` : ''}</div>`).join('')
        : '暂无引用';
      statusEl.textContent = '检索完成';
    } catch (err) {
      statusEl.textContent = `检索失败：${err.message}`;
    }
  });

  loadBaseData();
}

// Global Analytics Hook — submits feedback to backend
window.submitFeedback = async function(btn, moduleName, selection) {
  const container = btn.closest('.feedback__btns');
  container.querySelectorAll('.feedback__btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const payload = {
    module: moduleName,
    selection: selection,
    timestamp: new Date().toISOString()
  };
  console.log(`[Analytics] Event: feedback_submit`, payload);
  try {
    await fetchAPI('/feedback', payload, { retries: 0, timeoutMs: 5000 });
  } catch (_e) {
    // Feedback submission is non-critical, silently ignore failures
  }
};
