// V2.1 Sidebar Panel Controller — manages collapsible sidebar with vocab, translate, and notes tabs
import { fetchAPIGet, fetchAPI } from '../api.js';
import { getRecentNotes, createNote, updateNote, deleteNote, exportNotes } from '../api.js';

let sidebarOpen = false;
const STORAGE_KEY = 'zaiyi_sidebar_state';

export function initSidebar() {
  const panel = document.getElementById('sidebar-panel');
  const toggleBtn = document.getElementById('btn-sidebar-toggle');
  const closeBtn = document.getElementById('btn-sidebar-close');

  if (!panel || !toggleBtn) return;

  // Restore state
  sidebarOpen = localStorage.getItem(STORAGE_KEY) === 'open';
  if (sidebarOpen) openSidebar();

  toggleBtn.addEventListener('click', () => {
    sidebarOpen ? closeSidebar() : openSidebar();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
  }

  // Tab switching
  panel.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTabContent(tab.dataset.tab);
    });
  });

  // Load default tab
  loadTabContent('vocab');
}

function openSidebar() {
  const panel = document.getElementById('sidebar-panel');
  if (!panel) return;
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sidebar-open');
  sidebarOpen = true;
  localStorage.setItem(STORAGE_KEY, 'open');
}

function closeSidebar() {
  const panel = document.getElementById('sidebar-panel');
  if (!panel) return;
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sidebar-open');
  sidebarOpen = false;
  localStorage.setItem(STORAGE_KEY, 'closed');
}

function loadTabContent(tab) {
  const content = document.getElementById('sidebar-content');
  if (!content) return;

  switch (tab) {
    case 'vocab':
      renderVocabTab(content);
      break;
    case 'translate':
      renderTranslateTab(content);
      break;
    case 'notes':
      renderNotesTab(content);
      break;
  }
}

// ── Detect current module from URL hash ──

function detectCurrentModule() {
  const hash = window.location.hash || '';
  if (hash.includes('/topic') || hash.includes('/home')) return { module: 'article', label: '文章' };
  if (hash.includes('/translation')) return { module: 'translation', label: '翻译' };
  if (hash.includes('/vocab')) return { module: 'vocab', label: '词汇' };
  if (hash.includes('/research') || hash.includes('/papers')) return { module: 'paper', label: '论文' };
  return { module: 'article', label: '文章' }; // default
}

// ── Vocab Tab ──

async function renderVocabTab(container) {
  container.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section__header">
        <span>📖 今日新增生词</span>
        <a href="#/vocab" class="sidebar-section__link">查看全部 →</a>
      </div>
      <div id="sidebar-vocab-list" class="sidebar-vocab-list">
        <div class="sidebar-loading">加载中...</div>
      </div>
    </div>
  `;

  try {
    const data = await fetchAPIGet('/vocab?limit=50&filter=today');
    const list = document.getElementById('sidebar-vocab-list');
    if (!list) return;

    const items = data.items || data || [];
    if (!items.length) {
      list.innerHTML = `
        <div class="sidebar-empty">
          <div class="sidebar-empty__icon">📖</div>
          <div class="sidebar-empty__text">今天还没有新增生词<br>阅读文章时划词添加</div>
        </div>
      `;
      return;
    }

    list.innerHTML = items.map(w => `
      <div class="sidebar-vocab-item${w.is_mastered ? ' is-mastered' : ''}" data-vocab-id="${w.id}" style="display:flex;align-items:center;gap:8px;">
        <button class="mastery-toggle ${w.is_mastered ? 'mastery-toggle--on' : 'mastery-toggle--off'}" data-id="${w.id}" data-mastered="${w.is_mastered ? '1' : '0'}"
          title="${w.is_mastered ? '取消掌握' : '标为已掌握'}">
          <span class="mastery-toggle__icon">${w.is_mastered ? '✓' : ''}</span>
        </button>
        <div style="flex:1;min-width:0;">
          <div class="sidebar-vocab-item__word">${w.word || ''}</div>
          <div class="sidebar-vocab-item__def">${w.definition_zh || ''}</div>
        </div>
      </div>
    `).join('');

    // Mastery toggle click handler
    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('.mastery-toggle');
      if (!btn) return;
      const id = btn.dataset.id;
      const currentlyMastered = btn.dataset.mastered === '1';
      const setMastered = !currentlyMastered;
      const row = btn.closest('.sidebar-vocab-item');
      const iconEl = btn.querySelector('.mastery-toggle__icon');

      // Loading state
      btn.style.pointerEvents = 'none';
      btn.classList.add('is-loading');
      if (iconEl) iconEl.textContent = '⟳';

      try {
        await fetchAPI(`/vocab/${id}/mastery`, { is_mastered: setMastered }, { method: 'PUT' });
        // Success — animate burst
        btn.classList.remove('is-loading');
        btn.classList.add('is-animating');
        setTimeout(() => btn.classList.remove('is-animating'), 500);

        btn.dataset.mastered = setMastered ? '1' : '0';
        btn.classList.toggle('mastery-toggle--on', setMastered);
        btn.classList.toggle('mastery-toggle--off', !setMastered);
        btn.title = setMastered ? '取消掌握' : '标为已掌握';
        if (iconEl) iconEl.textContent = setMastered ? '✓' : '';
        if (row) row.classList.toggle('is-mastered', setMastered);
        if (window.showToast) window.showToast(setMastered ? '已掌握 ✅' : '已取消掌握', 'success');
      } catch (_err) {
        btn.classList.remove('is-loading');
        if (iconEl) iconEl.textContent = currentlyMastered ? '✓' : '';
        if (window.showToast) window.showToast('操作失败', 'error');
      }
      btn.style.pointerEvents = '';
    });
  } catch (_e) {
    const list = document.getElementById('sidebar-vocab-list');
    if (list) list.innerHTML = '<div class="sidebar-empty"><div class="sidebar-empty__text">加载失败</div></div>';
  }
}

// ── Translate Tab ──

function renderTranslateTab(container) {
  container.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section__header">
        <span>🔤 快速翻译</span>
        <a href="#/translation/history" class="sidebar-section__link">翻译历史 →</a>
      </div>
      <textarea class="sidebar-translate-input" id="sidebar-translate-input"
        placeholder="选中文章中的文本，或在此输入需要翻译的内容..."
        rows="4"></textarea>
      <button class="btn btn--primary btn--sm btn--full" id="sidebar-translate-btn"
        style="margin-top: 8px;">翻译</button>
      <div class="sidebar-translate-result" id="sidebar-translate-result"></div>
    </div>
  `;

  const btn = document.getElementById('sidebar-translate-btn');
  const input = document.getElementById('sidebar-translate-input');
  const result = document.getElementById('sidebar-translate-result');

  btn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    btn.disabled = true;
    btn.textContent = '翻译中...';
    result.innerHTML = '<div class="sidebar-loading">AI 翻译中...</div>';
    try {
      const data = await fetchAPI('/translation/run', {
        source_text: text,
        direction: 'en_to_zh',
        style: ['literal'],
      });

      let html = '';

      // Render translation variants as separate cards
      const variants = data.variants || data.translations || [];
      if (Array.isArray(variants) && variants.length) {
        const STYLE_COLORS = { literal: '#60a5fa', legal: '#a78bfa', plain: '#34d399' };
        variants.forEach(v => {
          const color = STYLE_COLORS[v.style] || 'var(--text-accent)';
          html += `
            <div style="margin-bottom:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid ${color};">
              <div style="font-size:0.75rem;font-weight:700;color:${color};margin-bottom:4px;">${escapeTranslateHtml(v.label || v.style_label || v.style || '')}</div>
              <div style="font-size:0.85rem;color:var(--text-primary);line-height:1.5;white-space:pre-wrap;">${escapeTranslateHtml(v.text || '')}</div>
            </div>`;
        });
      }

      // Render key terms
      if (data.terms && data.terms.length) {
        html += '<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:8px;">';
        html += '<div style="font-size:0.72rem;font-weight:600;color:var(--text-muted);margin-bottom:4px;">📚 关键术语</div>';
        data.terms.forEach(t => {
          html += `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:2px;"><b>${escapeTranslateHtml(t.term || '')}</b>: ${escapeTranslateHtml(t.definition_zh || '')}</div>`;
        });
        html += '</div>';
      }

      // Render notes
      if (data.notes && data.notes.length) {
        html += '<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:8px;">';
        html += '<div style="font-size:0.72rem;font-weight:600;color:var(--text-muted);margin-bottom:4px;">💡 翻译提示</div>';
        data.notes.forEach(n => {
          html += `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:2px;">• ${escapeTranslateHtml(n)}</div>`;
        });
        html += '</div>';
      }

      if (!html) {
        html = `<div class="sidebar-translate-item"><div class="sidebar-translate-item__text">翻译完成，但无法解析结果</div></div>`;
      }

      result.innerHTML = html;
    } catch (e) {
      result.innerHTML = `<div class="sidebar-empty"><div class="sidebar-empty__text">翻译失败: ${e.message}</div></div>`;
    }
    btn.disabled = false;
    btn.textContent = '翻译';
  });
}

function escapeTranslateHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Notes Tab (V2.1) ──

async function renderNotesTab(container) {
  const { module, label } = detectCurrentModule();

  container.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section__header">
        <span>📝 我的笔记</span>
        <button class="sidebar-section__link" id="btn-export-notes" style="background:none;border:none;cursor:pointer;color:var(--text-accent);font-size:0.82rem;">导出全部 ↓</button>
      </div>

      <!-- New note input -->
      <div style="margin-bottom:12px;">
        <textarea id="sidebar-note-input" class="sidebar-translate-input"
          placeholder="在此写笔记... (与当前${label}模块关联)"
          rows="3" style="margin-bottom:6px;"></textarea>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:0.75rem;color:var(--text-muted);">模块: ${label}</span>
          <button class="btn btn--primary btn--sm" id="btn-add-note" style="margin-left:auto;padding:4px 12px;">保存笔记</button>
        </div>
      </div>

      <!-- Notes list -->
      <div id="sidebar-notes-list" class="sidebar-vocab-list">
        <div class="sidebar-loading">加载笔记...</div>
      </div>
    </div>
  `;

  // Load notes
  await loadNotesList();

  // Save note handler
  document.getElementById('btn-add-note').addEventListener('click', async () => {
    const input = document.getElementById('sidebar-note-input');
    const content = input.value.trim();
    if (!content) return;

    const { module } = detectCurrentModule();
    // Use current page context as ref_id (hash or generate a session id)
    const refId = getContextRefId();

    try {
      await createNote(module, refId, content);
      input.value = '';
      if (window.showToast) window.showToast('笔记已保存 ✅', 'success');
      await loadNotesList();
    } catch (e) {
      if (window.showToast) window.showToast('保存失败: ' + e.message, 'error');
    }
  });

  // Export handler
  document.getElementById('btn-export-notes').addEventListener('click', async () => {
    try {
      const blob = await exportNotes();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      if (window.showToast) window.showToast('笔记已导出', 'success');
    } catch (e) {
      if (window.showToast) window.showToast('导出失败: ' + e.message, 'error');
    }
  });
}

function getContextRefId() {
  const hash = window.location.hash || '#/home';
  // Try to extract article/paper id from hash
  const match = hash.match(/#\/[\w/]+\/([a-f0-9-]+)/);
  if (match) return match[1];
  // Fallback: use hash as context key
  return hash.replace('#/', '').replace(/\//g, '_') || 'general';
}

async function loadNotesList() {
  const list = document.getElementById('sidebar-notes-list');
  if (!list) return;

  try {
    const data = await getRecentNotes(null, 30);
    const items = data.items || [];

    if (!items.length) {
      list.innerHTML = `
        <div class="sidebar-empty">
          <div class="sidebar-empty__icon">📝</div>
          <div class="sidebar-empty__text">还没有笔记<br>在上方输入框添加</div>
        </div>
      `;
      return;
    }

    const MODULE_ICONS = { article: '📄', translation: '🔤', vocab: '📖', paper: '📚' };
    const MODULE_LABELS = { article: '文章', translation: '翻译', vocab: '词汇', paper: '论文' };

    list.innerHTML = items.map(n => `
      <div class="sidebar-vocab-item" data-note-id="${n.id}" style="position:relative;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
          <span style="font-size:0.85rem;">${MODULE_ICONS[n.module] || '📝'}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600;">${MODULE_LABELS[n.module] || n.module}</span>
          <span style="font-size:0.65rem;color:var(--text-muted);margin-left:auto;">${formatNoteTime(n.created_at)}</span>
          <button class="note-delete-btn" data-note-id="${n.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px;font-size:0.75rem;" title="删除">✕</button>
        </div>
        <div class="sidebar-vocab-item__def" style="white-space:pre-wrap;word-break:break-word;">${escapeNoteHtml(n.content)}</div>
      </div>
    `).join('');

    // Delete handlers
    list.querySelectorAll('.note-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const noteId = btn.dataset.noteId;
        if (!confirm('确定删除此笔记？')) return;
        try {
          await deleteNote(noteId);
          if (window.showToast) window.showToast('笔记已删除', 'success');
          await loadNotesList();
        } catch (err) {
          if (window.showToast) window.showToast('删除失败', 'error');
        }
      });
    });
  } catch (_e) {
    list.innerHTML = '<div class="sidebar-empty"><div class="sidebar-empty__text">加载笔记失败</div></div>';
  }
}

function formatNoteTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toTimeString().slice(0, 5);
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${d.toTimeString().slice(0, 5)}`;
}

function escapeNoteHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Public API ──

export function openSidebarWithTranslation(text) {
  openSidebar();
  const panel = document.getElementById('sidebar-panel');
  if (panel) {
    panel.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    const translateTab = panel.querySelector('[data-tab="translate"]');
    if (translateTab) translateTab.classList.add('active');
  }
  const content = document.getElementById('sidebar-content');
  if (content) {
    renderTranslateTab(content);
    const input = document.getElementById('sidebar-translate-input');
    if (input) {
      input.value = text;
      const btn = document.getElementById('sidebar-translate-btn');
      if (btn) btn.click();
    }
  }
}

export function openSidebarVocab() {
  openSidebar();
  const panel = document.getElementById('sidebar-panel');
  if (panel) {
    panel.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    const vocabTab = panel.querySelector('[data-tab="vocab"]');
    if (vocabTab) vocabTab.classList.add('active');
  }
  const content = document.getElementById('sidebar-content');
  if (content) renderVocabTab(content);
}

export function openSidebarNotes() {
  openSidebar();
  const panel = document.getElementById('sidebar-panel');
  if (panel) {
    panel.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    const notesTab = panel.querySelector('[data-tab="notes"]');
    if (notesTab) notesTab.classList.add('active');
  }
  const content = document.getElementById('sidebar-content');
  if (content) renderNotesTab(content);
}
