/**
 * Global Task Manager — floating ball that shows running background tasks.
 * Persists across page navigation since it's injected into <body>, not #app.
 */

import { authFetch } from '../utils/http.js';

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = RAW_API_BASE.replace(/\/api\/v1\/?$/, '');

const SOURCE_LABELS = {
  arxiv: 'ArXiv', openalex: 'OpenAlex', semantic_scholar: 'Semantic Scholar',
  crossref: 'CrossRef', doaj: 'DOAJ', core: 'CORE', ssrn: 'SSRN', cnki: 'CNKI',
};

class TaskManager {
  constructor() {
    this.tasks = new Map(); // id -> { name, type, percentage, status, meta }
    this.pollIntervals = new Map();
    this.expanded = false;
    this._injectDOM();
  }

  _injectDOM() {
    // Floating ball container — outside #app so it persists across routes
    const ball = document.createElement('div');
    ball.id = 'task-manager-ball';
    ball.className = 'task-ball hidden';
    ball.innerHTML = `
      <div class="task-ball__indicator">
        <svg class="task-ball__spinner" viewBox="0 0 36 36">
          <circle class="task-ball__track" cx="18" cy="18" r="16" fill="none" stroke-width="3"/>
          <circle class="task-ball__progress" cx="18" cy="18" r="16" fill="none" stroke-width="3"
                  stroke-dasharray="100.53" stroke-dashoffset="100.53"/>
        </svg>
        <span class="task-ball__count">0</span>
      </div>
      <div class="task-ball__panel">
        <div class="task-ball__panel-header">
          <span>后台任务</span>
          <button class="task-ball__close">✕</button>
        </div>
        <div class="task-ball__panel-body"></div>
      </div>
    `;
    document.body.appendChild(ball);

    this.ballEl = ball;
    this.countEl = ball.querySelector('.task-ball__count');
    this.progressCircle = ball.querySelector('.task-ball__progress');
    this.panelEl = ball.querySelector('.task-ball__panel');
    this.panelBody = ball.querySelector('.task-ball__panel-body');

    ball.querySelector('.task-ball__indicator').addEventListener('click', () => {
      this.expanded = !this.expanded;
      this.panelEl.classList.toggle('is-open', this.expanded);
    });
    ball.querySelector('.task-ball__close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.expanded = false;
      this.panelEl.classList.remove('is-open');
    });
  }

  /**
   * Register a tracker search task.
   * @param {string} topicId
   * @param {string} topicTitle
   * @param {string[]} sources
   */
  addTrackerSearch(topicId, topicTitle, sources) {
    const taskId = `tracker-${topicId}`;
    this.tasks.set(taskId, {
      name: `搜索: ${topicTitle}`,
      type: 'tracker',
      topicId,
      percentage: 0,
      status: '启动中...',
      sources,
    });
    this._startPoll(taskId, topicId);
    this._updateUI();
  }

  /**
   * Register a generic task with manual progress updates.
   */
  addTask(id, name, type = 'generic') {
    this.tasks.set(id, { name, type, percentage: 0, status: '进行中...' });
    this._updateUI();
    return id;
  }

  updateTask(id, percentage, status) {
    const t = this.tasks.get(id);
    if (t) {
      t.percentage = percentage;
      t.status = status;
      if (percentage >= 100) {
        setTimeout(() => this.removeTask(id), 3000);
      }
      this._updateUI();
    }
  }

  removeTask(id) {
    this.tasks.delete(id);
    const interval = this.pollIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(id);
    }
    this._updateUI();
  }

  _startPoll(taskId, topicId) {
    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`${API_BASE}/topics/${topicId}/progress`);
        const prog = await res.json();
        const task = this.tasks.get(taskId);
        if (!task) { clearInterval(interval); return; }

        task.percentage = prog.percentage || 0;
        const srcLabel = SOURCE_LABELS[prog.current_source] || prog.current_source || '';
        task.status = prog.status === 'searching'
          ? `${prog.completed}/${prog.total} — ${srcLabel}`
          : prog.status === 'done' ? '完成 ✓' : task.status;

        this._updateUI();

        if (prog.status === 'done' || prog.percentage >= 100) {
          task.percentage = 100;
          task.status = '搜索完成 ✓';
          this._updateUI();

          // Notify if on tracker page
          if (window.location.hash.includes('tracker')) {
            window.__trackerSearchDone?.();
          }
          window.showToast?.(`「${task.name}」完成`, 'success');

          setTimeout(() => this.removeTask(taskId), 4000);
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 3000);

    this.pollIntervals.set(taskId, interval);

    // Safety: stop after 5 min
    setTimeout(() => {
      if (this.pollIntervals.has(taskId)) {
        this.removeTask(taskId);
      }
    }, 300000);
  }

  _updateUI() {
    const count = this.tasks.size;
    this.ballEl.classList.toggle('hidden', count === 0);
    this.countEl.textContent = count;

    // Average progress for the circular indicator
    let avgPct = 0;
    if (count > 0) {
      let total = 0;
      this.tasks.forEach(t => total += t.percentage);
      avgPct = Math.round(total / count);
    }
    // stroke-dashoffset: circumference * (1 - pct/100)
    const circumference = 2 * Math.PI * 16; // ~100.53
    const offset = circumference * (1 - avgPct / 100);
    this.progressCircle.style.strokeDashoffset = offset;

    // Panel items
    this.panelBody.innerHTML = Array.from(this.tasks.values()).map(t => `
      <div class="task-ball__item">
        <div class="task-ball__item-header">
          <span class="task-ball__item-name">${this._escapeHtml(t.name)}</span>
          <span class="task-ball__item-pct">${t.percentage}%</span>
        </div>
        <div class="task-ball__item-bar">
          <div class="task-ball__item-fill" style="width:${t.percentage}%"></div>
        </div>
        <div class="task-ball__item-status">${this._escapeHtml(t.status)}</div>
      </div>
    `).join('');
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

// Global singleton
let _instance = null;
export function getTaskManager() {
  if (!_instance) _instance = new TaskManager();
  return _instance;
}

export function initTaskManager() {
  return getTaskManager();
}
