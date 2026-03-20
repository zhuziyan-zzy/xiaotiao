// PDF Reader Page — /papers/:id/read
import 'pdfjs-dist/web/pdf_viewer.css';
import { streamAI, renderMarkdown, startSimulatedProgress } from '../utils/stream.js';
import { authFetch } from '../utils/http.js';
import { addExtraButtons } from '../components/word_selector.js';
import { initAnnotationContext, restoreAnnotations, renderAnnotationPanel } from '../components/annotation_manager.js';

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = RAW_API_BASE.replace(/\/api\/v1\/?$/, '');

function escapePopoverHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function renderPaperReaderPage(params) {
  return `
    <div style="display:flex;flex-direction:column;height:calc(100vh - 96px);">
      <!-- Top Bar -->
      <div class="glass-panel" style="padding:8px 20px;border-radius:0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:12px;">
          <a href="#/papers/${params.id}" style="color:var(--accent);text-decoration:none;font-size:0.9rem;">← 返回详情</a>
          <span id="reader-title" style="color:var(--text-primary);font-size:0.9rem;font-weight:500;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <span id="page-indicator" style="color:var(--text-muted);font-size:0.85rem;">第 1 / ? 页</span>
          <input type="number" id="page-jump-input" min="1" style="width:60px;padding:4px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.1);font-size:0.85rem;text-align:center;" placeholder="页码">
          <div style="display:flex;gap:4px;">
            <button class="btn btn--secondary" id="btn-zoom-out" style="padding:4px 10px;font-size:0.85rem;">-</button>
            <span id="zoom-level" style="color:var(--text-muted);font-size:0.85rem;min-width:40px;text-align:center;">120%</span>
            <button class="btn btn--secondary" id="btn-zoom-in" style="padding:4px 10px;font-size:0.85rem;">+</button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="reader-layout" style="display:flex;flex:1;overflow:hidden;">
        <!-- PDF Viewer -->
        <div id="pdf-container" class="reader-pdf" style="flex:1;overflow-y:auto;padding:20px;background:rgba(0,0,0,0.02);display:flex;flex-direction:column;align-items:center;gap:8px;">
          <div id="pdf-loading" style="text-align:center;padding:60px;color:var(--text-muted);">
            正在加载 PDF 阅读器...
          </div>
        </div>

        <!-- Sidebar -->
        <div class="reader-sidebar" style="width:380px;border-left:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;background:rgba(0,0,0,0.02);">
          <!-- Progress Header (always visible) -->
          <div style="padding:12px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span id="pages-read-count" style="color:var(--text-muted);font-size:0.75rem;">已读 0 页</span>
              <span id="page-indicator-sidebar" style="color:var(--text-muted);font-size:0.72rem;"></span>
            </div>
            <div id="reading-progress-bar" style="margin-top:6px;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
              <div id="reading-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#f472b6,#a78bfa);border-radius:2px;transition:width 0.4s ease;"></div>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div style="display:flex;border-bottom:2px solid rgba(255,255,255,0.06);padding:0 16px;" id="sidebar-tabs">
            <button class="reader-tab is-active" id="tab-summaries" style="flex:1;padding:10px 4px;font-size:0.82rem;font-weight:600;color:var(--text-primary);background:none;border:none;cursor:pointer;border-bottom:2px solid #a78bfa;margin-bottom:-2px;transition:all 0.2s;">📋 概要</button>
            <button class="reader-tab" id="tab-chat" style="flex:1;padding:10px 4px;font-size:0.82rem;font-weight:600;color:var(--text-muted);background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.2s;">💬 对话</button>
            <button class="reader-tab" id="tab-annotations" style="flex:1;padding:10px 4px;font-size:0.82rem;font-weight:600;color:var(--text-muted);background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.2s;">📌 标注</button>
          </div>

          <!-- Panel: Summaries -->
          <div id="panel-summaries" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;">
            <div id="page-summaries" style="flex:1;padding:14px 16px;display:flex;flex-direction:column;gap:14px;">
              <p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:30px 10px;line-height:1.6;">📖 滚动阅读 PDF<br>AI 将自动生成逐页概要</p>
            </div>
          </div>

          <!-- Panel: Chat (hidden by default) -->
          <div id="panel-chat" style="flex:1;overflow-y:auto;display:none;flex-direction:column;">
            <!-- Quick Questions -->
            <div id="reader-quick-questions" style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);">
              <p style="color:var(--text-muted);font-size:0.72rem;margin:0 0 8px;font-weight:500;">💡 快捷提问</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                <button class="reader-quick-q" data-q="这篇论文的主要贡献是什么？" style="padding:5px 12px;font-size:0.74rem;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:16px;color:#c4b5fd;cursor:pointer;transition:all 0.2s;white-space:nowrap;">📌 主要贡献</button>
                <button class="reader-quick-q" data-q="实验方法有什么局限？" style="padding:5px 12px;font-size:0.74rem;background:rgba(244,114,182,0.08);border:1px solid rgba(244,114,182,0.2);border-radius:16px;color:#f9a8d4;cursor:pointer;transition:all 0.2s;white-space:nowrap;">🔬 方法局限</button>
                <button class="reader-quick-q" data-q="与相关工作有什么区别？" style="padding:5px 12px;font-size:0.74rem;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:16px;color:#93c5fd;cursor:pointer;transition:all 0.2s;white-space:nowrap;">📊 相关工作</button>
                <button class="reader-quick-q" data-q="请总结这篇论文的核心论点" style="padding:5px 12px;font-size:0.74rem;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:16px;color:#6ee7b7;cursor:pointer;transition:all 0.2s;white-space:nowrap;">🎯 核心论点</button>
              </div>
            </div>
            <!-- Chat Response -->
            <div id="reader-chat-response" style="flex:1;overflow-y:auto;padding:14px 16px;display:none;"></div>
            <div id="chat-empty-state" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;">
              <p style="color:var(--text-muted);font-size:0.82rem;text-align:center;line-height:1.6;">💬 基于已读内容提问<br><span style="font-size:0.72rem;">可使用快捷提问或自由输入</span></p>
            </div>
            <!-- Chat Input -->
            <div style="padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex;gap:6px;">
                <input type="text" id="reader-chat-input" class="input-field" placeholder="基于已读内容提问..." style="flex:1;font-size:0.82rem;padding:8px 12px;border-radius:10px;">
                <button class="btn btn--primary" id="btn-reader-chat" style="padding:8px 14px;font-size:0.82rem;border-radius:10px;">发送</button>
              </div>
            </div>
          </div>
          </div>

          <!-- Panel: Annotations (hidden by default) -->
          <div id="panel-annotations" style="flex:1;overflow-y:auto;display:none;flex-direction:column;padding:14px 16px;">
            <div id="annotation-panel-content">
              <p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:30px 10px;line-height:1.6;">📌 选中 PDF 文字后<br>使用工具栏的 🖍️高亮 或 📝批注 按钮<br>标注内容将在此显示</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Selection Result Popover -->
      <div id="selection-result" style="display:none;position:fixed;z-index:201;background:var(--glass-bg-solid,#1e1b2e);backdrop-filter:blur(24px);border:1px solid rgba(167,139,250,0.2);border-radius:14px;padding:18px;box-shadow:0 12px 48px rgba(0,0,0,0.4);max-width:480px;max-height:70vh;overflow-y:auto;"></div>
    </div>
  `;
}

export async function initPaperReaderPage(params) {
  const paperId = params.id;
  let scale = 1.2;
  let totalPages = 0;
  let pagesRead = new Set();
  let maxPageReached = 0; // Track max page for progress (never regresses)
  let summariesGenerated = new Set();
  let pdfDoc = null;
  let observer = null;
  let pdfjsLibInstance = null;
  let lastReaderQuestion = '';
  let isChatBusy = false;

  // Load paper info
  try {
    const res = await authFetch(`${API_BASE}/papers/${paperId}`);
    const paper = await res.json();
    document.getElementById('reader-title').textContent = paper.title;
  } catch (e) { /* ignore */ }

  // Set annotation context on PDF container
  const pdfContainer = document.getElementById('pdf-container');
  if (pdfContainer) {
    initAnnotationContext('paper', paperId, pdfContainer);
  }

  // Load PDF.js dynamically
  try {
    const [pdfjsLib, workerUrlModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url')
    ]);
    pdfjsLibInstance = pdfjsLib;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerUrlModule.default) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlModule.default;
    }

    // Fetch PDF
    const pdfRes = await authFetch(`${API_BASE}/papers/${paperId}/pdf`);
    if (!pdfRes.ok) throw new Error('无法获取 PDF');

    const contentType = pdfRes.headers.get('content-type');
    let pdfData;

    if (contentType && contentType.includes('application/json')) {
      const jsonData = await pdfRes.json();
      if (jsonData.pdf_url) {
        const proxyRes = await fetch(jsonData.pdf_url);
        pdfData = await proxyRes.arrayBuffer();
      } else {
        throw new Error('No PDF available');
      }
    } else {
      pdfData = await pdfRes.arrayBuffer();
    }

    pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
    totalPages = pdfDoc.numPages;
    document.getElementById('page-indicator').textContent = `第 1 / ${totalPages} 页`;
    document.getElementById('page-jump-input').max = totalPages;

    await renderAllPages(pdfDoc, scale, pdfjsLibInstance);

    // Restore saved reading progress from server
    try {
      const progressRes = await authFetch(`${API_BASE}/papers/${paperId}`);
      if (progressRes.ok) {
        const paperData = await progressRes.json();
        const savedPages = parseInt(paperData.pages_read) || 0;
        if (savedPages > maxPageReached) {
          maxPageReached = savedPages;
          const pct = totalPages > 0 ? Math.round(maxPageReached / totalPages * 100) : 0;
          const fill = document.getElementById('reading-progress-fill');
          if (fill) fill.style.width = `${pct}%`;
          document.getElementById('pages-read-count').textContent = `已读 ${maxPageReached} 页`;
          document.getElementById('page-indicator').textContent = `第 1 / ${totalPages} 页（最远 ${maxPageReached} 页）`;
        }
      }
    } catch (_e) { /* ignore progress restore errors */ }

    // Load and restore saved annotations/highlights
    await restoreAnnotations(paperId);

  } catch (e) {
    document.getElementById('pdf-loading').innerHTML = `
      <div style="color:#ef4444;font-size:1.1rem;margin-bottom:8px;">PDF 加载失败</div>
      <p style="color:var(--text-muted);">${e.message}</p>
      <p style="color:var(--text-muted);margin-top:12px;">如果论文来自 ArXiv，PDF 可能需要通过代理获取。</p>
    `;
  }

  async function renderAllPages(doc, currentScale, pdfjsLib) {
    const container = document.getElementById('pdf-container');
    container.innerHTML = '';

    // Use devicePixelRatio for HiDPI rendering (sharp text)
    const pixelRatio = window.devicePixelRatio || 1;
    const renderScale = currentScale * pixelRatio;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const cssViewport = page.getViewport({ scale: currentScale });
      const renderViewport = page.getViewport({ scale: renderScale });

      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper';
      wrapper.style.cssText = `position:relative;margin-bottom:8px;width:${cssViewport.width}px;height:${cssViewport.height}px;`;
      wrapper.dataset.pageNum = i;

      const canvas = document.createElement('canvas');
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.cssText = `display:block;width:${cssViewport.width}px;height:${cssViewport.height}px;background:white;box-shadow:0 2px 12px rgba(0,0,0,0.12);border-radius:4px;`;

      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      // pdfjs v5 requires --total-scale-factor for text positioning
      textLayerDiv.style.cssText = `position:absolute;inset:0;--total-scale-factor:${currentScale};`;

      wrapper.appendChild(canvas);
      wrapper.appendChild(textLayerDiv);
      container.appendChild(wrapper);

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      try {
        const textContent = await page.getTextContent();
        if (pdfjsLib.TextLayer) {
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: cssViewport,
          });
          await textLayer.render();
        } else if (pdfjsLib.renderTextLayer) {
          await pdfjsLib.renderTextLayer({
            textContent,
            container: textLayerDiv,
            viewport: cssViewport,
          });
        }
      } catch (_e) {
        console.warn('[Reader] TextLayer render error:', _e);
      }
    }

    setupIntersectionObserver(doc);
  }

  function setupIntersectionObserver(doc) {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.dataset.pageNum);
          pagesRead.add(pageNum);

          // Track max page reached (never regresses)
          if (pageNum > maxPageReached) {
            maxPageReached = pageNum;
          }

          document.getElementById('pages-read-count').textContent = `已读 ${pagesRead.size} 页`;
          document.getElementById('page-indicator').textContent = `第 ${pageNum} / ${totalPages} 页（最远 ${maxPageReached} 页）`;

          // Update progress bar
          if (totalPages > 0) {
            const pct = Math.round(maxPageReached / totalPages * 100);
            const fill = document.getElementById('reading-progress-fill');
            if (fill) fill.style.width = `${pct}%`;
          }

          // Persist reading progress (debounced) — always send max
          clearTimeout(window.__progressSaveTimer);
          window.__progressSaveTimer = setTimeout(() => {
            authFetch(`${API_BASE}/papers/${paperId}/reading-progress`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pages_read: maxPageReached, total_pages: totalPages })
            }).catch(() => {});
          }, 2000);

          // Auto-generate summary for new pages
          if (!summariesGenerated.has(pageNum)) {
            generatePageSummary(doc, pageNum, paperId);
          }
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('#pdf-container [data-page-num]').forEach(el => {
      observer.observe(el);
    });

    window.__readerObserver = observer;
  }

  // Helper: get text from a specific page
  async function getPageText(doc, pageNum) {
    try {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      return textContent.items.map(item => item.str).join(' ');
    } catch { return ''; }
  }

  // Helper: get surrounding context for selection
  async function getSelectionContext(selectedText) {
    // Find which page the selection is in
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return selectedText;

    const range = sel.getRangeAt(0);
    const pageWrapper = range.commonAncestorContainer?.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement?.closest('[data-page-num]')
      : range.commonAncestorContainer?.closest?.('[data-page-num]');

    if (!pageWrapper || !pdfDoc) return selectedText;

    const pageNum = parseInt(pageWrapper.dataset.pageNum);
    const pageText = await getPageText(pdfDoc, pageNum);

    // Return selected text with page context
    return `【所在页面（第${pageNum}页）完整内容】：\n${pageText.slice(0, 2000)}\n\n【用户选中的文本】：\n${selectedText}`;
  }

  async function generatePageSummary(doc, pageNum, paperId, force = false) {
    if (!force && summariesGenerated.has(pageNum)) return;
    summariesGenerated.add(pageNum);

    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');

    if (text.trim().length < 50) return;

    const summariesContainer = document.getElementById('page-summaries');

    // Remove placeholder text
    const placeholder = summariesContainer.querySelector('p');
    if (placeholder && placeholder.textContent.includes('滚动阅读')) {
      placeholder.remove();
    }

    let summaryDiv = document.getElementById(`summary-wrap-${pageNum}`);
    if (!summaryDiv) {
      summaryDiv = document.createElement('div');
      summaryDiv.id = `summary-wrap-${pageNum}`;
      summaryDiv.style.cssText = 'border-left:3px solid var(--accent);padding-left:12px;';
      summaryDiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px;">
          <div style="font-size:0.75rem;color:var(--text-muted);">第 ${pageNum} 页</div>
          <button class="btn btn--ghost btn--sm" data-regenerate="${pageNum}">🔄 重新生成</button>
        </div>
        <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;" id="summary-${pageNum}">
          <span style="color:var(--text-muted);">生成中...</span>
          <div id="summary-progress-${pageNum}" style="margin-top:8px;"></div>
        </div>
      `;
      summariesContainer.appendChild(summaryDiv);
      summariesContainer.scrollTop = summariesContainer.scrollHeight;
      const regenBtn = summaryDiv.querySelector('[data-regenerate]');
      if (regenBtn) {
        regenBtn.addEventListener('click', () => generatePageSummary(doc, pageNum, paperId, true));
      }
    } else {
      const target = document.getElementById(`summary-${pageNum}`);
      if (target) {
        target.innerHTML = `
          <span style="color:var(--text-muted);">生成中...</span>
          <div id="summary-progress-${pageNum}" style="margin-top:8px;"></div>
        `;
      }
    }

    try {
      const target = document.getElementById(`summary-${pageNum}`);
      const progressEl = document.getElementById(`summary-progress-${pageNum}`);
      let progress = null;
      if (progressEl) {
        progress = startSimulatedProgress(progressEl, '');
      }
      let firstChunk = true;
      console.log(`[Reader] Generating summary for page ${pageNum}, text length: ${text.length}`);
      await streamAI(`/papers/${paperId}/page-summary`, { page_number: pageNum, page_text: text.slice(0, 3000) }, (accum) => {
        if (firstChunk && progress) {
          progress.complete();
          setTimeout(() => progress.bar.destroy(), 300);
          firstChunk = false;
        }
        if (target) target.innerHTML = renderMarkdown(accum);
      });
    } catch (e) {
      console.error(`[Reader] Summary generation failed for page ${pageNum}:`, e);
      const target = document.getElementById(`summary-${pageNum}`);
      if (target) target.innerHTML = `<span style="color:var(--text-muted);">概要生成失败: ${e.message}</span>`;
    }
  }

  // Zoom controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    if (scale < 3.0) {
      scale += 0.2;
      document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
      if (pdfDoc && pdfjsLibInstance) renderAllPages(pdfDoc, scale, pdfjsLibInstance);
    }
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (scale > 0.5) {
      scale -= 0.2;
      document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
      if (pdfDoc && pdfjsLibInstance) renderAllPages(pdfDoc, scale, pdfjsLibInstance);
    }
  });

  // Page jump
  document.getElementById('page-jump-input').addEventListener('change', (e) => {
    const pageNum = parseInt(e.target.value);
    if (pageNum >= 1 && pageNum <= totalPages) {
      const target = document.querySelector(`[data-page-num="${pageNum}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Register paper-reader-specific buttons on the unified global toolbar
  const resultPopover = document.getElementById('selection-result');
  let lastSelectionAction = null;
  let lastSelectionText = '';

  const HIGHLIGHT_COLORS = [
    { name: '黄色', color: 'rgba(255,255,0,0.4)', bg: 'rgba(255,255,0,0.5)' },
    { name: '绿色', color: 'rgba(0,255,128,0.35)', bg: 'rgba(0,255,128,0.45)' },
    { name: '蓝色', color: 'rgba(100,180,255,0.35)', bg: 'rgba(100,180,255,0.45)' },
    { name: '粉色', color: 'rgba(255,130,180,0.35)', bg: 'rgba(255,130,180,0.45)' },
    { name: '橙色', color: 'rgba(255,180,50,0.35)', bg: 'rgba(255,180,50,0.45)' },
  ];

  const runSelectionAction = async (action, selectedText) => {
    if (!selectedText) return;
    lastSelectionAction = action;
    lastSelectionText = selectedText;

    if (action === 'highlight') {
      // Save selection before it gets lost
      const sel = window.getSelection();
      const savedRange = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;

      // Create inline color picker popover
      let picker = document.getElementById('highlight-color-picker');
      if (picker) picker.remove();

      picker = document.createElement('div');
      picker.id = 'highlight-color-picker';
      picker.style.cssText = 'position:fixed;z-index:10000;background:rgba(30,27,46,0.95);backdrop-filter:blur(20px);border:1px solid rgba(167,139,250,0.3);border-radius:14px;padding:10px 14px;box-shadow:0 8px 32px rgba(0,0,0,0.4);display:flex;gap:10px;align-items:center;animation:pickerFadeIn 0.15s ease-out;';

      // Add picker animation + highlight animation CSS if not already added
      if (!document.getElementById('highlight-anim-style')) {
        const style = document.createElement('style');
        style.id = 'highlight-anim-style';
        style.textContent = `
          @keyframes pickerFadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          @keyframes highlightFlash { 0% { opacity: 0.2; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
          .pdf-highlight { animation: highlightFlash 0.4s ease-out; border-radius: 3px; }
          .pdf-highlight--restored { animation: none; }
          #highlight-color-picker::before { content: ''; position: absolute; left: -7px; top: 50%; transform: translateY(-50%); border: 6px solid transparent; border-right-color: rgba(167,139,250,0.3); }
        `;
        document.head.appendChild(style);
      }

      HIGHLIGHT_COLORS.forEach(({ name, color, bg }) => {
        const btn = document.createElement('button');
        btn.title = name;
        btn.style.cssText = `width:26px;height:26px;border-radius:50%;border:2px solid rgba(0,0,0,0.1);background:${bg};cursor:pointer;transition:transform 0.15s ease;`;
        btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.2)'; });
        btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
        btn.addEventListener('click', async () => {
          picker.remove();
          // Apply visual highlight — wrap only the selected text, not the entire span
          try {
            if (savedRange) {
              const mark = document.createElement('mark');
              mark.style.cssText = `background:${color};border-radius:2px;padding:0;`;
              mark.className = 'pdf-highlight';
              try {
                savedRange.surroundContents(mark);
              } catch (_e) {
                const fragment = savedRange.extractContents();
                mark.appendChild(fragment);
                savedRange.insertNode(mark);
              }
            }
            // Find which page
            let pageNum = null;
            if (savedRange) {
              const pageWrapper = savedRange.commonAncestorContainer?.nodeType === Node.TEXT_NODE
                ? savedRange.commonAncestorContainer.parentElement?.closest('[data-page-num]')
                : savedRange.commonAncestorContainer?.closest?.('[data-page-num]');
              if (pageWrapper) pageNum = parseInt(pageWrapper.dataset.pageNum);
            }
            await authFetch(`${API_BASE}/papers/${paperId}/annotations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'highlight', selected_text: selectedText, color, page_number: pageNum })
            });
            window.showToast?.('已添加高亮', 'success');
          } catch (e) {
            window.showToast?.('添加失败', 'error');
          }
          window.getSelection()?.removeAllRanges();
        });
        picker.appendChild(btn);
      });

      document.body.appendChild(picker);

      // Position to the RIGHT of the toolbar
      const toolbarEl = document.querySelector('.word-selector-bar.is-visible');
      if (toolbarEl) {
        const tbRect = toolbarEl.getBoundingClientRect();
        picker.style.left = `${tbRect.right + 8}px`;
        picker.style.top = `${tbRect.top}px`;
        if (tbRect.right + 220 > window.innerWidth) {
          picker.style.left = `${tbRect.left - 220}px`;
        }
      } else if (savedRange) {
        const rect = savedRange.getBoundingClientRect();
        picker.style.left = `${rect.right + 8}px`;
        picker.style.top = `${rect.top}px`;
      }

      // Auto-close on outside click
      setTimeout(() => {
        const close = (e) => {
          if (!picker.contains(e.target)) {
            picker.remove();
            document.removeEventListener('mousedown', close);
          }
        };
        document.addEventListener('mousedown', close);
      }, 50);
      return;
    }

    // Translate or Summary — include page context
    resultPopover.style.display = 'block';
    resultPopover.style.left = `${Math.max(20, window.innerWidth / 2 - 220)}px`;
    resultPopover.style.top = `${Math.min(window.innerHeight / 3, 150)}px`;
    resultPopover.style.maxWidth = '480px';
    resultPopover.style.maxHeight = '70vh';

    if (action === 'translate') {
      // ── Full structured translation (same as global) ──
      resultPopover.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:0.8rem;color:var(--text-muted);">🌐 论文翻译</span>
          <button class="btn btn--ghost btn--sm" id="btn-selection-regenerate">🔄 重新生成</button>
        </div>
        <div id="selection-progress-container" style="min-width:200px;"></div>
      `;
      const selProgressContainer = document.getElementById('selection-progress-container');
      const selProgress = startSimulatedProgress(selProgressContainer, '翻译中...');

      document.getElementById('btn-selection-regenerate')?.addEventListener('click', () => runSelectionAction('translate', lastSelectionText));

      try {
        const { fetchAPI } = await import('../api.js');
        const data = await fetchAPI('/translation/run', {
          source_text: selectedText,
          direction: 'en_to_zh',
          style: ['literal'],
        });
        selProgress.complete();

        let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
        html += '<span style="font-size:0.8rem;color:var(--text-muted);">🌐 论文翻译</span>';
        html += '<button class="btn btn--ghost btn--sm" id="btn-selection-regenerate">🔄</button>';
        html += '</div>';

        // Render translation variants as separate cards
        const variants = data.variants || [];
        const STYLE_COLORS = { literal: '#60a5fa', plain: '#34d399' };
        if (variants.length) {
          variants.forEach(v => {
            const color = STYLE_COLORS[v.style] || '#a78bfa';
            html += `<div style="margin-bottom:8px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid ${color};">
              <div style="font-size:0.72rem;font-weight:700;color:${color};margin-bottom:3px;">${escapePopoverHtml(v.label || v.style || '')}</div>
              <div style="font-size:0.82rem;color:var(--text-primary);line-height:1.5;white-space:pre-wrap;">${escapePopoverHtml(v.text || '')}</div>
            </div>`;
          });
        }

        // Render key terms
        if (data.terms && data.terms.length) {
          html += '<div style="margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:8px;">';
          html += '<div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);margin-bottom:3px;">📚 关键术语</div>';
          data.terms.forEach(t => {
            html += `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:2px;"><b>${escapePopoverHtml(t.term || '')}</b>: ${escapePopoverHtml(t.definition_zh || '')}</div>`;
          });
          html += '</div>';
        }

        // Render notes
        if (data.notes && data.notes.length) {
          html += '<div style="margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:8px;">';
          html += '<div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);margin-bottom:3px;">💡 翻译提示</div>';
          data.notes.forEach(n => {
            html += `<div style="font-size:0.76rem;color:var(--text-secondary);margin-bottom:2px;">• ${escapePopoverHtml(n)}</div>`;
          });
          html += '</div>';
        }

        // Render common errors
        if (data.common_errors && data.common_errors.length) {
          html += '<div style="margin-top:6px;padding:6px 10px;background:rgba(255,255,255,0.02);border-radius:8px;">';
          html += '<div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);margin-bottom:3px;">⚠️ 常见错误</div>';
          data.common_errors.forEach(e => {
            html += `<div style="font-size:0.76rem;color:var(--text-secondary);margin-bottom:2px;">• ${escapePopoverHtml(e)}</div>`;
          });
          html += '</div>';
        }

        // ── Extra: Context-aware holistic translation ──
        html += '<div id="contextual-translation-section" style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #f472b6;">';
        html += '<div style="font-size:0.72rem;font-weight:700;color:#f472b6;margin-bottom:3px;">📖 上下文整体性翻译与分析</div>';
        html += '<div id="contextual-translation-content" style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;"><span style="color:var(--text-muted);">生成中...</span></div>';
        html += '</div>';

        resultPopover.innerHTML = html;
        document.getElementById('btn-selection-regenerate')?.addEventListener('click', () => runSelectionAction('translate', lastSelectionText));

        // Stream the contextual translation
        const contextText = await getSelectionContext(selectedText);
        const ctxContent = document.getElementById('contextual-translation-content');
        try {
          await streamAI(`/papers/${paperId}/translate`, { text: contextText }, (text) => {
            if (ctxContent) ctxContent.innerHTML = renderMarkdown(text);
          });
        } catch (e) {
          if (ctxContent) ctxContent.innerHTML = `<span style="color:var(--text-muted);">上下文翻译生成失败</span>`;
        }

      } catch (e) {
        selProgress.stop();
        resultPopover.innerHTML = `<span style="color:#ef4444;font-size:0.85rem;">翻译失败: ${e.message}</span>`;
      }
    } else {
      // ── Summary action — streaming as before ──
      resultPopover.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:0.8rem;color:var(--text-muted);">📝 摘要</span>
          <button class="btn btn--ghost btn--sm" id="btn-selection-regenerate">🔄 重新生成</button>
        </div>
        <div id="selection-progress-container" style="min-width:200px;"></div>
      `;
      const selProgressContainer = document.getElementById('selection-progress-container');
      const selProgress = startSimulatedProgress(selProgressContainer, '生成摘要...');
      document.getElementById('btn-selection-regenerate')?.addEventListener('click', () => runSelectionAction('summary', lastSelectionText));

      const contextText = await getSelectionContext(selectedText);
      try {
        let firstChunk = true;
        await streamAI(`/papers/${paperId}/summarize-selection`, { text: contextText }, (text) => {
          if (firstChunk) {
            selProgress.complete();
            firstChunk = false;
          }
          resultPopover.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:0.8rem;color:var(--text-muted);">📝 摘要</span>
              <button class="btn btn--ghost btn--sm" id="btn-selection-regenerate">🔄 重新生成</button>
            </div>
            <div style="font-size:0.85rem;color:var(--text-primary);line-height:1.6;">${renderMarkdown(text)}</div>
          `;
          document.getElementById('btn-selection-regenerate')?.addEventListener('click', () => runSelectionAction('summary', lastSelectionText));
        });
      } catch (e) {
        selProgress.stop();
        resultPopover.innerHTML = `<span style="color:#ef4444;font-size:0.85rem;">处理失败: ${e.message}</span>`;
      }
    }
  };

  // Close result popover on click outside
  document.addEventListener('mousedown', (e) => {
    if (resultPopover && !resultPopover.contains(e.target)) {
      resultPopover.style.display = 'none';
    }
  });

  // Add extra buttons to the global word selector toolbar
  addExtraButtons([
    {
      label: '翻译',
      icon: '🌐',
      className: 'word-selector-bar__btn--extra',
      onClick: (text) => runSelectionAction('translate', text)
    },
    {
      label: '摘要',
      icon: '📝',
      className: 'word-selector-bar__btn--extra',
      onClick: (text) => runSelectionAction('summary', text)
    }
  ]);

  // ── Sidebar Tab Switching ──
  const tabSummaries = document.getElementById('tab-summaries');
  const tabChat = document.getElementById('tab-chat');
  const tabAnnotations = document.getElementById('tab-annotations');
  const panelSummaries = document.getElementById('panel-summaries');
  const panelChat = document.getElementById('panel-chat');
  const panelAnnotations = document.getElementById('panel-annotations');

  function switchTab(tab) {
    // Reset all tabs
    [tabSummaries, tabChat, tabAnnotations].forEach(t => {
      if (t) { t.style.color = 'var(--text-muted)'; t.style.borderBottomColor = 'transparent'; }
    });
    [panelSummaries, panelChat, panelAnnotations].forEach(p => { if (p) p.style.display = 'none'; });
    // Activate selected
    if (tab === 'summaries') {
      tabSummaries.style.color = 'var(--text-primary)'; tabSummaries.style.borderBottomColor = '#a78bfa';
      panelSummaries.style.display = 'flex';
    } else if (tab === 'chat') {
      tabChat.style.color = 'var(--text-primary)'; tabChat.style.borderBottomColor = '#a78bfa';
      panelChat.style.display = 'flex';
    } else if (tab === 'annotations') {
      tabAnnotations.style.color = 'var(--text-primary)'; tabAnnotations.style.borderBottomColor = '#a78bfa';
      panelAnnotations.style.display = 'flex';
      // Refresh annotation panel
      const annContent = document.getElementById('annotation-panel-content');
      if (annContent) renderAnnotationPanel('paper', paperId, annContent);
    }
  }

  tabSummaries.addEventListener('click', () => switchTab('summaries'));
  tabChat.addEventListener('click', () => switchTab('chat'));
  if (tabAnnotations) tabAnnotations.addEventListener('click', () => switchTab('annotations'));

  // Quick questions — switch to chat tab, auto-fill and send
  document.querySelectorAll('.reader-quick-q').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab('chat');
      const q = btn.dataset.q;
      document.getElementById('reader-chat-input').value = q;
      sendChatMessage();
    });
  });

  // Reader chat — send on click or Enter
  const chatBtn = document.getElementById('btn-reader-chat');
  const chatInput = document.getElementById('reader-chat-input');

  const sendChatMessage = async () => {
    const msg = chatInput.value.trim();
    if (!msg || isChatBusy) return;
    isChatBusy = true;
    chatInput.value = '';

    // Visual: show active state
    chatBtn.disabled = true;
    chatBtn.textContent = '...';

    // Hide empty state, show response
    const emptyState = document.getElementById('chat-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    const responseDiv = document.getElementById('reader-chat-response');
    responseDiv.style.display = 'block';
    lastReaderQuestion = msg;
    responseDiv.innerHTML = `<span style="color:var(--text-muted);font-size:0.85rem;">思考中...</span><div id="reader-chat-progress"></div>`;

    const chatProgressEl = document.getElementById('reader-chat-progress');
    const chatProgress = startSimulatedProgress(chatProgressEl, '');

    try {
      let firstChunk = true;
      console.log(`[Reader] Chat: "${msg}"`);
      await streamAI(`/papers/${paperId}/chat`, { message: msg }, (text) => {
        if (firstChunk) {
          chatProgress.complete();
          setTimeout(() => chatProgress.bar?.destroy(), 300);
          firstChunk = false;
        }
        responseDiv.innerHTML = `
          <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
            <button class="btn btn--ghost btn--sm" id="btn-reader-chat-regenerate">🔄 重新生成</button>
          </div>
          <div style="font-size:0.85rem;color:var(--text-primary);line-height:1.6;max-height:200px;overflow-y:auto;">${renderMarkdown(text)}</div>
        `;
        const regenBtn = document.getElementById('btn-reader-chat-regenerate');
        if (regenBtn) {
          regenBtn.addEventListener('click', () => {
            if (!lastReaderQuestion) return;
            chatInput.value = lastReaderQuestion;
            sendChatMessage();
          });
        }
      });
    } catch (e) {
      chatProgress.stop();
      chatProgress.bar?.destroy();
      responseDiv.innerHTML = `<span style="color:#ef4444;font-size:0.85rem;">回答失败: ${e.message}</span>`;
    } finally {
      isChatBusy = false;
      chatBtn.disabled = false;
      chatBtn.textContent = '发送';
    }
  };

  chatBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // ── Restore saved annotations/highlights ──
  async function restoreAnnotations(paperId) {
    try {
      const res = await authFetch(`${API_BASE}/papers/${paperId}/annotations`);
      const anns = await res.json();
      if (!Array.isArray(anns) || anns.length === 0) return;

      // Wait a bit for text layers to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      for (const ann of anns) {
        if (ann.type !== 'highlight' || !ann.selected_text) continue;

        const color = ann.color || 'rgba(255,255,0,0.4)';
        const pageNum = ann.page_number;

        // Find the text in the text layer
        const pageWrappers = pageNum
          ? [document.querySelector(`[data-page-num="${pageNum}"]`)]
          : document.querySelectorAll('[data-page-num]');

        for (const wrapper of pageWrappers) {
          if (!wrapper) continue;
          const textLayer = wrapper.querySelector('.textLayer');
          if (!textLayer) continue;

          // Find spans containing the annotation text
          const spans = textLayer.querySelectorAll('span');
          for (const span of spans) {
            const spanText = span.textContent || '';
            if (ann.selected_text.includes(spanText.trim()) && spanText.trim().length > 0) {
              // Apply highlight style to matching spans
              const mark = document.createElement('mark');
              mark.style.cssText = `background:${color};border-radius:2px;padding:0;`;
              mark.className = 'pdf-highlight pdf-highlight--restored';
              // Wrap span content
              mark.textContent = span.textContent;
              span.textContent = '';
              span.appendChild(mark);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Reader] Failed to restore annotations:', e);
    }
  }

  // Cleanup on page leave
  window.__readerCleanup = () => {
    if (window.__readerObserver) {
      window.__readerObserver.disconnect();
      window.__readerObserver = null;
    }
  };
}
