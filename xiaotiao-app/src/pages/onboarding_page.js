// V2.1 Onboarding Page — 5-step profile setup with multi-select & dynamic specialties
import { fetchAPIGet, fetchAPI } from '../api.js';
import { getAuthUser, setAuth } from '../auth.js';

const STEPS = [
  {
    key: 'exam_type',
    title: '你的备考目标是？',
    subtitle: '选择你当前最主要的英语学习目标',
    icon: '🎯',
  },
  {
    key: 'subject_field',
    title: '你的学科领域是？',
    subtitle: '可多选，我们将推荐相关专业的学习材料',
    icon: '📚',
  },
  {
    key: 'specialty',
    title: '你的细分专业方向',
    subtitle: '根据你选择的学科领域推荐，也可自行添加',
    icon: '🔬',
  },
  {
    key: 'eng_level',
    title: '你的英语水平',
    subtitle: '用于智能调整文章难度和词汇推荐',
    icon: '📊',
  },
  {
    key: 'interest_tags',
    title: '选择你感兴趣的话题',
    subtitle: '可多选，帮助我们个性化推荐',
    icon: '🏷️',
  },
];

// 学科领域 → 细分专业方向的映射
const SPECIALTY_MAP = {
  law: [
    '国际法', '刑法', '民商法', '知识产权法', '环境法',
    '金融法', '劳动法', '宪法与行政法', '国际经济法', '海商法',
  ],
  finance: [
    '投资银行', '量化金融', '风险管理', '公司金融', '金融科技',
    '保险精算', '资产管理', '国际金融', '行为金融',
  ],
  cs: [
    '人工智能', '机器学习', '自然语言处理', '计算机视觉',
    '网络安全', '分布式系统', '数据库', '前端开发', '后端工程',
  ],
  medicine: [
    '临床医学', '药学', '公共卫生', '护理学', '中医学',
    '口腔医学', '医学影像', '病理学', '免疫学',
  ],
  engineering: [
    '机械工程', '电气工程', '土木工程', '化学工程',
    '材料科学', '航空航天', '生物工程', '环境工程',
  ],
  humanities: [
    '哲学', '历史学', '文学', '语言学', '社会学',
    '心理学', '教育学', '新闻传播', '政治学',
  ],
  economics: [
    '宏观经济', '微观经济', '计量经济学', '发展经济学',
    '劳动经济学', '产业经济学', '国际贸易',
  ],
  management: [
    '工商管理', '市场营销', '人力资源', '供应链管理',
    '战略管理', '项目管理', '信息管理',
  ],
  other: [
    '跨学科研究', '数据科学', '统计学', '数学', '物理学', '化学', '生物学',
  ],
};

export function renderOnboardingPage() {
  return `
    <div class="onboarding">
      <div class="onboarding__card" id="onboarding-card">
        <div class="onboarding__header">
          <div class="onboarding__icon" id="onboarding-icon">🎯</div>
          <h1 class="onboarding__title" id="onboarding-title">欢迎来到再译!</h1>
          <p class="onboarding__subtitle" id="onboarding-subtitle">让我们先了解你，以便提供个性化的学习体验</p>
        </div>
        <div class="onboarding__body" id="onboarding-body">
          <div class="onboarding__loading">加载中...</div>
        </div>
        <div class="onboarding__footer">
          <div class="onboarding__progress">
            ${STEPS.map((_, i) => `<div class="onboarding__dot${i === 0 ? ' active' : ''}" data-step="${i}"></div>`).join('')}
          </div>
          <div class="onboarding__actions">
            <button class="btn btn--ghost" id="onboarding-back" style="display:none;">← 上一步</button>
            <button class="btn btn--ghost" id="onboarding-skip" style="opacity:0.6;font-size:0.85rem;">跳过</button>
            <button class="btn btn--primary" id="onboarding-next">下一步 →</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initOnboardingPage() {
  let currentStep = 0;
  let fieldConfig = null;
  const selections = {
    exam_type: null,
    subject_field: [],      // V2.1: multi-select
    specialty: [],           // V2.1: multi-select with custom input
    eng_level: null,
    interest_tags: [],
  };

  const body = document.getElementById('onboarding-body');
  const title = document.getElementById('onboarding-title');
  const subtitle = document.getElementById('onboarding-subtitle');
  const icon = document.getElementById('onboarding-icon');
  const nextBtn = document.getElementById('onboarding-next');
  const backBtn = document.getElementById('onboarding-back');
  const skipBtn = document.getElementById('onboarding-skip');

  // Fallback config in case API is unreachable
  const FALLBACK_CONFIG = {
    exam_types: [
      { id: 'kaoyan', label: '考研英语' },
      { id: 'cet4', label: '四级' },
      { id: 'cet6', label: '六级' },
      { id: 'ielts', label: '雅思' },
      { id: 'toefl', label: '托福' },
      { id: 'gre', label: 'GRE' },
      { id: 'bar_exam', label: '法律英语/法考' },
      { id: 'other', label: '其他' },
    ],
    subject_fields: [
      { id: 'law', label: '法学' },
      { id: 'finance', label: '金融' },
      { id: 'economics', label: '经济学' },
      { id: 'cs', label: '计算机' },
      { id: 'medicine', label: '医学' },
      { id: 'engineering', label: '工程' },
      { id: 'management', label: '管理学' },
      { id: 'humanities', label: '人文社科' },
      { id: 'other', label: '其他' },
    ],
    eng_levels: [
      { id: 'cet4', label: 'CET-4', description: '大学英语四级水平' },
      { id: 'cet6', label: 'CET-6', description: '大学英语六级水平' },
      { id: 'ielts5', label: '雅思 5-6 分', description: '中级英语水平' },
      { id: 'ielts7', label: '雅思 7+ 分', description: '高级英语水平' },
      { id: 'native', label: '接近母语', description: '可无障碍阅读学术文献' },
    ],
    interest_tags: [
      '区块链监管', '跨境金融', '国际仲裁', '知识产权',
      '数据隐私', '人工智能', '环境法', '国际贸易',
      '公司治理', '反垄断', '人权法', '网络安全',
      '量化投资', '生物医药', '新能源', '航天科技',
    ],
  };

  async function loadConfig() {
    try {
      fieldConfig = await fetchAPIGet('/config/fields');
      // Validate response has data
      if (!fieldConfig.exam_types || !fieldConfig.exam_types.length) {
        fieldConfig = FALLBACK_CONFIG;
      }
    } catch (e) {
      fieldConfig = FALLBACK_CONFIG;
    }
    renderStep(0);
  }

  function renderStep(stepIdx) {
    currentStep = stepIdx;
    const step = STEPS[stepIdx];

    icon.textContent = step.icon;
    title.textContent = step.title;
    subtitle.textContent = step.subtitle;

    // Update progress dots
    document.querySelectorAll('.onboarding__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === stepIdx);
      dot.classList.toggle('completed', i < stepIdx);
    });

    backBtn.style.display = stepIdx > 0 ? '' : 'none';
    nextBtn.textContent = stepIdx === STEPS.length - 1 ? '完成设置 ✓' : '下一步 →';

    let html = '';
    switch (step.key) {
      case 'exam_type':
        html = renderOptionGrid(fieldConfig.exam_types, 'exam_type', selections.exam_type);
        break;
      case 'subject_field':
        html = renderMultiSelectGrid(fieldConfig.subject_fields, 'subject_field', selections.subject_field);
        break;
      case 'specialty':
        html = renderSpecialtyStep();
        break;
      case 'eng_level':
        html = renderLevelCards(fieldConfig.eng_levels, selections.eng_level);
        break;
      case 'interest_tags':
        html = renderTagGrid(fieldConfig.interest_tags, selections.interest_tags);
        break;
    }
    body.innerHTML = html;
    bindSelectionEvents();
  }

  // V2.1: Specialty step with dynamic options based on selected subject fields + custom input
  function renderSpecialtyStep() {
    const fields = selections.subject_field || [];
    let allSpecialties = [];
    for (const f of fields) {
      const specs = SPECIALTY_MAP[f] || SPECIALTY_MAP['other'] || [];
      allSpecialties = allSpecialties.concat(specs);
    }
    if (allSpecialties.length === 0) {
      allSpecialties = SPECIALTY_MAP['other'] || ['跨学科研究', '数据科学'];
    }
    // Deduplicate
    allSpecialties = [...new Set(allSpecialties)];

    return `
      <div class="onboarding__tags">
        ${allSpecialties.map(s => `
          <button class="onboarding__tag ${selections.specialty.includes(s) ? 'selected' : ''}"
            data-specialty="${s}">
            ${s}
          </button>
        `).join('')}
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;align-items:center;">
        <input id="custom-specialty-input" type="text" placeholder="自定义方向（回车添加）"
          style="flex:1;padding:10px 14px;border-radius:10px;border:1.5px solid rgba(0,0,0,0.1);background:rgba(255,255,255,0.6);font-size:0.9rem;color:#1c1c2e;outline:none;">
        <button id="btn-add-specialty" class="btn btn--primary btn--sm" style="padding:8px 14px;">添加</button>
      </div>
    `;
  }

  function renderOptionGrid(items, key, selected) {
    if (!items || !items.length) return '<div class="onboarding__empty">暂无选项</div>';
    return `<div class="onboarding__grid">
      ${items.map(it => `
        <button class="onboarding__option ${selected === it.id ? 'selected' : ''}"
          data-key="${key}" data-value="${it.id}">
          ${it.label}
        </button>
      `).join('')}
    </div>`;
  }

  // V2.1: Multi-select grid for subject fields
  function renderMultiSelectGrid(items, key, selected) {
    if (!items || !items.length) return '<div class="onboarding__empty">暂无选项</div>';
    const sel = selected || [];
    return `<div class="onboarding__grid">
      ${items.map(it => `
        <button class="onboarding__option onboarding__multi-option ${sel.includes(it.id) ? 'selected' : ''}"
          data-key="${key}" data-value="${it.id}">
          ${it.label}
        </button>
      `).join('')}
    </div>
    <div style="margin-top:8px;font-size:0.78rem;color:rgba(0,0,0,0.45);text-align:center;">可多选</div>`;
  }

  function renderLevelCards(levels, selected) {
    if (!levels || !levels.length) return '';
    return `<div class="onboarding__levels">
      ${levels.map(l => `
        <button class="onboarding__level-card ${selected === l.id ? 'selected' : ''}"
          data-key="eng_level" data-value="${l.id}">
          <div class="onboarding__level-label">${l.label}</div>
          <div class="onboarding__level-desc">${l.description || ''}</div>
        </button>
      `).join('')}
    </div>`;
  }

  function renderTagGrid(tags, selected) {
    if (!tags || !tags.length) return '';
    return `<div class="onboarding__tags">
      ${tags.map(t => `
        <button class="onboarding__tag ${selected.includes(t) ? 'selected' : ''}"
          data-tag="${t}">
          ${t}
        </button>
      `).join('')}
    </div>`;
  }

  function bindSelectionEvents() {
    // Single-select options (exam_type, eng_level)
    body.querySelectorAll('.onboarding__option:not(.onboarding__multi-option)').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const value = btn.dataset.value;
        selections[key] = value;
        btn.parentElement.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Single-select level cards
    body.querySelectorAll('.onboarding__level-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const value = btn.dataset.value;
        selections[key] = value;
        btn.parentElement.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // V2.1: Multi-select for subject_field
    body.querySelectorAll('.onboarding__multi-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const value = btn.dataset.value;
        if (!Array.isArray(selections[key])) selections[key] = [];
        const idx = selections[key].indexOf(value);
        if (idx >= 0) {
          selections[key].splice(idx, 1);
          btn.classList.remove('selected');
        } else {
          selections[key].push(value);
          btn.classList.add('selected');
        }
      });
    });

    // Multi-select tags (interest_tags)
    body.querySelectorAll('.onboarding__tag:not([data-specialty])').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const idx = selections.interest_tags.indexOf(tag);
        if (idx >= 0) {
          selections.interest_tags.splice(idx, 1);
          btn.classList.remove('selected');
        } else {
          selections.interest_tags.push(tag);
          btn.classList.add('selected');
        }
      });
    });

    // V2.1: Multi-select specialty tags
    body.querySelectorAll('.onboarding__tag[data-specialty]').forEach(btn => {
      btn.addEventListener('click', () => {
        const spec = btn.dataset.specialty;
        const idx = selections.specialty.indexOf(spec);
        if (idx >= 0) {
          selections.specialty.splice(idx, 1);
          btn.classList.remove('selected');
        } else {
          selections.specialty.push(spec);
          btn.classList.add('selected');
        }
      });
    });

    // V2.1: Custom specialty input
    const customInput = document.getElementById('custom-specialty-input');
    const addBtn = document.getElementById('btn-add-specialty');
    if (customInput && addBtn) {
      const addCustomSpecialty = () => {
        const val = customInput.value.trim();
        if (!val) return;
        if (!selections.specialty.includes(val)) {
          selections.specialty.push(val);
          // Re-render to show the new tag
          body.innerHTML = renderSpecialtyStep();
          bindSelectionEvents();
        }
        customInput.value = '';
      };
      addBtn.addEventListener('click', addCustomSpecialty);
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addCustomSpecialty(); }
      });
    }
  }

  nextBtn.addEventListener('click', async () => {
    if (currentStep < STEPS.length - 1) {
      renderStep(currentStep + 1);
    } else {
      // Complete onboarding
      await saveProfile();
    }
  });

  backBtn.addEventListener('click', () => {
    if (currentStep > 0) renderStep(currentStep - 1);
  });

  skipBtn.addEventListener('click', async () => {
    selections.onboarding_completed = true;
    await saveProfile();
  });

  async function saveProfile() {
    nextBtn.disabled = true;
    nextBtn.textContent = '保存中...';
    try {
      // Convert arrays to comma-separated strings for backend compatibility
      const payload = {
        ...selections,
        subject_field: Array.isArray(selections.subject_field) ? selections.subject_field.join(',') : selections.subject_field,
        specialty: Array.isArray(selections.specialty) ? selections.specialty.join(',') : selections.specialty,
        onboarding_completed: true,
      };
      await fetchAPI('/user/profile', payload, { method: 'PUT' });
      // Update local storage
      const user = getAuthUser();
      if (user) {
        user.onboarding_completed = true;
        setAuth(null, user);
      }
      localStorage.setItem('zaiyi_profile', JSON.stringify(payload));
      window.location.hash = '#/home';
    } catch (e) {
      if (window.showToast) window.showToast('保存失败: ' + e.message, 'error');
      nextBtn.disabled = false;
      nextBtn.textContent = '完成设置 ✓';
    }
  }

  loadConfig();
}
