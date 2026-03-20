/**
 * Annotation Manager — 全局标注/批注管理组件
 * 支持高亮(highlight)和批注(annotation)，可注入到任意 AI 内容容器。
 */
import { fetchAPI, fetchAPIGet } from '../api.js';

// ── Highlight Colors ──
const HIGHLIGHT_COLORS = [
  { name: '黄色', color: 'rgba(255,255,0,0.35)', bg: 'rgba(255,255,0,0.5)' },
  { name: '绿色', color: 'rgba(0,255,128,0.3)',  bg: 'rgba(0,255,128,0.45)' },
  { name: '蓝色', color: 'rgba(100,180,255,0.3)', bg: 'rgba(100,180,255,0.45)' },
  { name: '粉色', color: 'rgba(255,130,180,0.3)', bg: 'rgba(255,130,180,0.45)' },
  { name: '橙色', color: 'rgba(255,180,50,0.3)',  bg: 'rgba(255,180,50,0.45)' },
];

// Inject CSS once
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const style = document.createElement('style');
  style.id = 'annotation-manager-css';
  style.textContent = `
    @keyframes annPickerIn { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
    @keyframes annHighlightFlash { 0% { opacity:.2; } 50% { opacity:.6; } 100% { opacity:1; } }
    .ann-highlight { animation: annHighlightFlash .4s ease-out; border-radius:2px; cursor:pointer; }
    .ann-highlight--restored { animation: none; }
    .ann-underline { border-bottom: 2px solid #a78bfa; cursor: pointer; position: relative; }
    .ann-underline:hover { border-bottom-color: #c4b5fd; }
    .ann-color-picker { position:fixed; z-index:10000; background:rgba(30,27,46,.95); backdrop-filter:blur(20px); border:1px solid rgba(167,139,250,.3); border-radius:14px; padding:10px 14px; box-shadow:0 8px 32px rgba(0,0,0,.4); display:flex; gap:10px; align-items:center; animation:annPickerIn .15s ease-out; }
    .ann-color-picker::before { content:''; position:absolute; left:-7px; top:50%; transform:translateY(-50%); border:6px solid transparent; border-right-color:rgba(167,139,250,.3); }
    .ann-color-btn { width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,.15); cursor:pointer; transition:transform .15s ease; }
    .ann-color-btn:hover { transform:scale(1.2); }
    .ann-note-popover { position:fixed; z-index:10001; background:rgba(30,27,46,.95); backdrop-filter:blur(20px); border:1px solid rgba(167,139,250,.3); border-radius:14px; padding:14px; box-shadow:0 8px 32px rgba(0,0,0,.4); width:280px; animation:annPickerIn .15s ease-out; }
    .ann-note-input { width:100%; background:rgba(255,255,255,.06); border:1px solid rgba(167,139,250,.2); border-radius:8px; color:#e2e8f0; font-size:.82rem; padding:8px 10px; resize:vertical; min-height:60px; outline:none; }
    .ann-note-input:focus { border-color:#a78bfa; }
    .ann-note-input::placeholder { color:#64748b; }
    .ann-note-submit { margin-top:8px; padding:6px 16px; background:rgba(167,139,250,.2); border:1px solid rgba(167,139,250,.3); border-radius:8px; color:#c4b5fd; font-size:.78rem; cursor:pointer; transition:all .2s; }
    .ann-note-submit:hover { background:rgba(167,139,250,.35); }
    .ann-tooltip { position:fixed; z-index:10002; background:rgba(30,27,46,.95); backdrop-filter:blur(16px); border:1px solid rgba(167,139,250,.25); border-radius:10px; padding:10px 14px; box-shadow:0 6px 24px rgba(0,0,0,.35); max-width:260px; font-size:.8rem; color:#e2e8f0; line-height:1.5; pointer-events:none; animation:annPickerIn .12s ease-out; }
    .ann-panel { border:1px solid rgba(255,255,255,.06); border-radius:12px; background:rgba(0,0,0,.02); margin-top:12px; overflow:hidden; }
    .ann-panel__header { padding:10px 14px; font-size:.82rem; font-weight:600; color:var(--text-primary); border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
    .ann-panel__list { max-height:300px; overflow-y:auto; }
    .ann-panel__item { padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.04); font-size:.78rem; }
    .ann-panel__item:last-child { border-bottom:none; }
    .ann-panel__text { color:var(--text-primary); margin-bottom:4px; }
    .ann-panel__note { color:#a78bfa; font-size:.75rem; margin-top:4px; }
    .ann-panel__meta { color:var(--text-muted); font-size:.7rem; margin-top:4px; display:flex; justify-content:space-between; align-items:center; }
    .ann-panel__delete { background:none; border:none; color:#f87171; font-size:.7rem; cursor:pointer; opacity:.6; }
    .ann-panel__delete:hover { opacity:1; }
  `;
  document.head.appendChild(style);
}

// ── Compute text offset relative to container ──
function getTextOffset(container, range) {
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  while (treeWalker.nextNode()) {
    if (treeWalker.currentNode === range.startContainer) {
      return { start: offset + range.startOffset, end: offset + range.startOffset + range.toString().length };
    }
    offset += treeWalker.currentNode.textContent.length;
  }
  return { start: 0, end: 0 };
}

// ── Find range by text offset ──
function findRangeByOffset(container, start, end) {
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let startNode = null, startOff = 0, endNode = null, endOff = 0;
  while (treeWalker.nextNode()) {
    const node = treeWalker.currentNode;
    const len = node.textContent.length;
    if (!startNode && offset + len > start) {
      startNode = node;
      startOff = start - offset;
    }
    if (!endNode && offset + len >= end) {
      endNode = node;
      endOff = end - offset;
      break;
    }
    offset += len;
  }
  if (startNode && endNode) {
    try {
      const range = document.createRange();
      range.setStart(startNode, startOff);
      range.setEnd(endNode, endOff);
      return range;
    } catch (_e) { return null; }
  }
  return null;
}

// ── Apply highlight mark to a range ──
function applyHighlightMark(range, color, annId, isRestored = false) {
  const mark = document.createElement('mark');
  mark.style.cssText = `background:${color};padding:0;`;
  mark.className = isRestored ? 'ann-highlight ann-highlight--restored' : 'ann-highlight';
  mark.dataset.annId = annId;
  try {
    range.surroundContents(mark);
  } catch (_e) {
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
  }
  return mark;
}

// ── Apply underline mark for annotation ──
function applyUnderlineMark(range, annId, note, isRestored = false) {
  const span = document.createElement('span');
  span.className = 'ann-underline';
  span.dataset.annId = annId;
  span.dataset.note = note;
  try {
    range.surroundContents(span);
  } catch (_e) {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  // Hover tooltip
  span.addEventListener('mouseenter', (e) => showTooltip(note, e.clientX, e.clientY));
  span.addEventListener('mouseleave', () => hideTooltip());
  return span;
}

// ── Tooltip ──
let _tooltipEl = null;
function showTooltip(text, x, y) {
  hideTooltip();
  _tooltipEl = document.createElement('div');
  _tooltipEl.className = 'ann-tooltip';
  _tooltipEl.textContent = text;
  _tooltipEl.style.left = `${x + 12}px`;
  _tooltipEl.style.top = `${y - 40}px`;
  document.body.appendChild(_tooltipEl);
  // Keep within viewport
  requestAnimationFrame(() => {
    if (!_tooltipEl) return;
    const rect = _tooltipEl.getBoundingClientRect();
    if (rect.right > window.innerWidth - 10) _tooltipEl.style.left = `${window.innerWidth - rect.width - 10}px`;
    if (rect.top < 10) _tooltipEl.style.top = `${y + 20}px`;
  });
}
function hideTooltip() {
  if (_tooltipEl) { _tooltipEl.remove(); _tooltipEl = null; }
}

// ── Show color picker for highlight ──
export function showHighlightPicker(contentType, contentId, containerEl, anchorX, anchorY) {
  injectCSS();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const savedRange = sel.getRangeAt(0).cloneRange();
  const selectedText = sel.toString().trim();
  if (!selectedText) return;

  // Remove existing picker
  document.getElementById('ann-color-picker')?.remove();

  const picker = document.createElement('div');
  picker.id = 'ann-color-picker';
  picker.className = 'ann-color-picker';

  HIGHLIGHT_COLORS.forEach(({ name, color, bg }) => {
    const btn = document.createElement('button');
    btn.className = 'ann-color-btn';
    btn.title = name;
    btn.style.background = bg;
    btn.addEventListener('click', async () => {
      picker.remove();
      const offsets = getTextOffset(containerEl, savedRange);
      const annId = crypto.randomUUID?.() || Date.now().toString();
      applyHighlightMark(savedRange, color, annId);
      sel.removeAllRanges();
      // Save to backend
      try {
        const data = await fetchAPI('/annotations', {
            content_type: contentType, content_id: contentId,
            type: 'highlight', selected_text: selectedText, color,
            text_offset_start: offsets.start, text_offset_end: offsets.end,
        });
        // Update annId on the mark
        const mark = containerEl.querySelector(`[data-ann-id="${annId}"]`);
        if (mark && data.id) mark.dataset.annId = data.id;
        window.showToast?.('已添加高亮', 'success');
        refreshPanel(contentType, contentId, containerEl);
      } catch (_e) { window.showToast?.('高亮保存失败', 'error'); }
    });
    picker.appendChild(btn);
  });

  document.body.appendChild(picker);
  picker.style.left = `${anchorX}px`;
  picker.style.top = `${anchorY}px`;
  // Keep within viewport
  requestAnimationFrame(() => {
    const rect = picker.getBoundingClientRect();
    if (rect.right > window.innerWidth - 10) picker.style.left = `${window.innerWidth - rect.width - 10}px`;
  });

  // Auto-close
  setTimeout(() => {
    const close = (e) => { if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('mousedown', close); } };
    document.addEventListener('mousedown', close);
  }, 50);
}

// ── Show annotation (comment) input ──
export function showAnnotationInput(contentType, contentId, containerEl, anchorX, anchorY) {
  injectCSS();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const savedRange = sel.getRangeAt(0).cloneRange();
  const selectedText = sel.toString().trim();
  if (!selectedText) return;

  document.getElementById('ann-note-popover')?.remove();

  const popover = document.createElement('div');
  popover.id = 'ann-note-popover';
  popover.className = 'ann-note-popover';
  popover.innerHTML = `
    <div style="font-size:.75rem;color:#94a3b8;margin-bottom:6px;">📝 为选中内容添加批注</div>
    <div style="font-size:.78rem;color:#c4b5fd;background:rgba(167,139,250,.08);padding:6px 8px;border-radius:6px;margin-bottom:8px;max-height:40px;overflow:hidden;text-overflow:ellipsis;">"${selectedText.slice(0, 60)}${selectedText.length > 60 ? '…' : ''}"</div>
    <textarea class="ann-note-input" placeholder="输入您的评价或批注..." autofocus></textarea>
    <div style="display:flex;gap:6px;justify-content:flex-end;">
      <button class="ann-note-submit" id="ann-note-cancel" style="background:rgba(255,255,255,.05);color:#94a3b8;">取消</button>
      <button class="ann-note-submit" id="ann-note-save">保存批注</button>
    </div>
  `;
  document.body.appendChild(popover);
  popover.style.left = `${Math.min(anchorX, window.innerWidth - 300)}px`;
  popover.style.top = `${anchorY}px`;

  const textarea = popover.querySelector('.ann-note-input');
  textarea.focus();

  popover.querySelector('#ann-note-cancel').addEventListener('click', () => { popover.remove(); sel.removeAllRanges(); });
  popover.querySelector('#ann-note-save').addEventListener('click', async () => {
    const note = textarea.value.trim();
    if (!note) { textarea.focus(); return; }
    popover.remove();
    const offsets = getTextOffset(containerEl, savedRange);
    const annId = crypto.randomUUID?.() || Date.now().toString();
    applyUnderlineMark(savedRange, annId, note);
    sel.removeAllRanges();
    try {
      const data = await fetchAPI('/annotations', {
          content_type: contentType, content_id: contentId,
          type: 'annotation', selected_text: selectedText, note,
          text_offset_start: offsets.start, text_offset_end: offsets.end,
      });
      const el = containerEl.querySelector(`[data-ann-id="${annId}"]`);
      if (el && data.id) el.dataset.annId = data.id;
      window.showToast?.('已添加批注', 'success');
      refreshPanel(contentType, contentId, containerEl);
    } catch (_e) { window.showToast?.('批注保存失败', 'error'); }
  });

  // Close on outside click
  setTimeout(() => {
    const close = (e) => { if (!popover.contains(e.target)) { popover.remove(); document.removeEventListener('mousedown', close); } };
    document.addEventListener('mousedown', close);
  }, 50);
}

// ── Restore annotations from backend ──
export async function restoreAnnotations(contentType, contentId, containerEl) {
  injectCSS();
  if (!containerEl) return;
  try {
    const anns = await fetchAPIGet(`/annotations?content_type=${contentType}&content_id=${contentId}`);
    if (!Array.isArray(anns) || anns.length === 0) return;
    // Wait for content to render
    await new Promise(r => setTimeout(r, 300));
    for (const ann of anns) {
      if (ann.text_offset_start == null || ann.text_offset_end == null) continue;
      const range = findRangeByOffset(containerEl, ann.text_offset_start, ann.text_offset_end);
      if (!range) continue;
      if (ann.type === 'highlight') {
        applyHighlightMark(range, ann.color || 'rgba(255,255,0,0.35)', ann.id, true);
      } else if (ann.type === 'annotation') {
        applyUnderlineMark(range, ann.id, ann.note || '', true);
      }
    }
  } catch (_e) { console.warn('[AnnotationManager] Failed to restore:', _e); }
}

// ── Render annotation panel below content ──
export async function renderAnnotationPanel(contentType, contentId, targetEl) {
  injectCSS();
  if (!targetEl) return;
  // Remove existing panel
  targetEl.querySelector('.ann-panel')?.remove();
  try {
    const anns = await fetchAPIGet(`/annotations?content_type=${contentType}&content_id=${contentId}`);
    if (!Array.isArray(anns) || anns.length === 0) return;

    const highlights = anns.filter(a => a.type === 'highlight');
    const annotations = anns.filter(a => a.type === 'annotation');

    const panel = document.createElement('div');
    panel.className = 'ann-panel';
    let html = `<div class="ann-panel__header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">📌 标注与批注 (${anns.length}) <span style="font-size:.7rem;">▼</span></div><div class="ann-panel__list">`;

    if (highlights.length) {
      html += `<div style="padding:8px 14px;font-size:.72rem;color:#94a3b8;font-weight:600;">🖍️ 高亮 (${highlights.length})</div>`;
      highlights.forEach(h => {
        html += `<div class="ann-panel__item">
          <div class="ann-panel__text" style="border-left:3px solid ${h.color || 'rgba(255,255,0,.5)'};padding-left:8px;">${_esc(h.selected_text?.slice(0, 80))}${(h.selected_text?.length || 0) > 80 ? '…' : ''}</div>
          <div class="ann-panel__meta"><span>${_timeAgo(h.created_at)}</span><button class="ann-panel__delete" data-delete-id="${h.id}">删除</button></div>
        </div>`;
      });
    }
    if (annotations.length) {
      html += `<div style="padding:8px 14px;font-size:.72rem;color:#94a3b8;font-weight:600;">📝 批注 (${annotations.length})</div>`;
      annotations.forEach(a => {
        html += `<div class="ann-panel__item">
          <div class="ann-panel__text" style="border-left:3px solid #a78bfa;padding-left:8px;">${_esc(a.selected_text?.slice(0, 60))}${(a.selected_text?.length || 0) > 60 ? '…' : ''}</div>
          <div class="ann-panel__note">${_esc(a.note)}</div>
          <div class="ann-panel__meta"><span>${_timeAgo(a.created_at)}</span><button class="ann-panel__delete" data-delete-id="${a.id}">删除</button></div>
        </div>`;
      });
    }
    html += '</div>';
    panel.innerHTML = html;
    targetEl.appendChild(panel);

    // Delete handlers
    panel.querySelectorAll('.ann-panel__delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.deleteId;
        try {
          await fetchAPI(`/annotations/${id}`, {}, { method: 'DELETE' });
          // Remove visual mark from content
          const mark = document.querySelector(`[data-ann-id="${id}"]`);
          if (mark) {
            const parent = mark.parentNode;
            while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            mark.remove();
          }
          btn.closest('.ann-panel__item')?.remove();
          window.showToast?.('已删除', 'success');
        } catch (_e) { window.showToast?.('删除失败', 'error'); }
      });
    });
  } catch (_e) {}
}

// ── Internal helpers ──
function refreshPanel(contentType, contentId, containerEl) {
  const panelTarget = containerEl.closest('[data-ann-panel-target]') || containerEl.parentElement;
  if (panelTarget) renderAnnotationPanel(contentType, contentId, panelTarget);
}

function _esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function _timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

/**
 * Initialize annotation context on a container element.
 * Sets data attributes so the global word selector knows the context.
 */
export function initAnnotationContext(contentType, contentId, containerEl) {
  injectCSS();
  if (!containerEl) return;
  containerEl.dataset.annContentType = contentType;
  containerEl.dataset.annContentId = contentId;
}

/**
 * Get annotation context from a DOM element by traversing ancestors.
 */
export function getAnnotationContext(el) {
  const ctx = el?.closest?.('[data-ann-content-type]');
  if (!ctx) return null;
  return { contentType: ctx.dataset.annContentType, contentId: ctx.dataset.annContentId, container: ctx };
}
