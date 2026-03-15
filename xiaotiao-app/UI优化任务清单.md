# 小挑 XiaoTiao — 前端 UI 优化任务清单
> 基准风格：Apple iOS 26 / Liquid Glass，清晰美观，无遮挡
> 生成日期：2026-03-13

---

## 一、严重 Bug（影响可用性，必须优先修复）

### BUG-01 · Vocab / Progress 页面使用了未定义的 CSS 类
**文件**：`src/vocab_page.js`、`src/progress_page.js`、`src/style.css`

**问题描述**：
以下 CSS 类名在 `style.css` 中**完全不存在**，导致相关元素无样式：
- `.glass-panel` — 用于页面容器
- `.input-field` / `.input-wrapper` — 用于搜索框、下拉框、文本框
- `.settings-group` / `.settings-label` — 用于表单分组
- `.icon-btn` — 用于删除按钮
- `.btn--secondary` / `.btn--sm` / `.btn--icon` — 用于次级按钮、小按钮、图标按钮
- `.p-4` — 用于 padding 工具类

**影响**：按钮无样式（或继承全局重置导致无边框无背景）、表单无布局。

**修复方案**：在 `style.css` 末尾补全上述类的定义，与主 glass 设计系统保持一致。

---

### BUG-02 · Vocab / Progress 页面白色文字在默认浅色主题下不可见
**文件**：`src/vocab_page.js`（line 8）、`src/progress_page.js`（line 12）

**问题描述**：
```html
<h1 style="color: white; ...">我的生词本</h1>
<h1 style="color: white; ...">学习数据洞察</h1>
```
而默认主题背景色为浅色 `--bg-base: #f0edf6`（近白色），白色文字几乎**完全不可见**。整个词汇表和进度页使用暗色主题的 inline style（`rgba(0,0,0,0.2)` 表头、`rgba(255,255,255,0.03)` 卡片等），与默认主题完全格格不入。

**修复方案**：
1. 移除全部 `color: white` hardcode inline style
2. 将颜色替换为设计系统 token：`color: var(--text-primary)`
3. 深色背景块改为 `var(--glass-bg)` + `var(--glass-border)`，与其他页面统一

---

### BUG-03 · `window.selectMode` / `window.setDirection` 误清除导航栏高亮
**文件**：`src/pages.js`（line 556、line 831）

**问题描述**：
```js
document.querySelectorAll('.segmented__btn').forEach(btn => btn.classList.remove('active'));
```
这两个全局函数用 `querySelectorAll('.segmented__btn')` 选取**页面上所有** segmented 按钮，包括 Navbar 的导航链接（也带有 `.segmented__btn` 类）。每次切换解读模式或翻译方向，Navbar 当前页面高亮就会被**清除**，导致导航栏失去活跃状态。

**修复方案**：
- `selectMode`：将选择器限定为 `#article-segmented .segmented__btn`
- `setDirection`：将选择器限定为 `#direction-segmented .segmented__btn`

---

### BUG-04 · HTML 结构错误：多余的闭合标签 + 缺少 `</body>`
**文件**：`src/pages.js`、`index.html`

**问题描述**：
- `renderHome()` 结尾（line 113-114）有一个多余的 `</section>` + `</section>`（比开合标签多一个）
- `renderTopicExplorer()` 结尾（line 259-260）有一个多余的 `</div>`
- `renderArticleLab()` 结尾（line 548-549）同样有一个多余的 `</div>`
- `renderTranslationStudio()` 结尾（line 824-825）同样有一个多余的 `</div>`
- `index.html` 第 85 行 `</html>` 前**缺少 `</body>` 闭合标签**

**影响**：浏览器自动修复会引发不可预期的 DOM 结构，影响样式和 JS 查询。

**修复方案**：逐一删除多余闭合标签，在 `index.html` 第 84 行后补上 `</body>`。

---

## 二、视觉遮挡 / 层叠问题

### UI-01 · 导航栏 6 个入口 + 主题按钮 + 通知 + 头像严重拥挤
**文件**：`index.html`（line 30-68）、`src/style.css`（line 282-418）

**问题描述**：
一个最大宽度 720px 的胶囊形导航栏内塞入了：
- 品牌 Logo + "XiaoTiao" 文字
- 6 个导航项（含彩色小圆点），每项 `padding: 8px 16px`，字体 14px
- 4 个主题切换圆形按钮（28×28px）
- 1 个通知铃铛图标按钮
- 1 个用户头像

这在任何屏幕尺寸下都会**溢出或挤压**，导航文字被裁切，且主题按钮视觉上浮于 Navbar 内部但 padding 规则与 Navbar 不匹配（`.theme-switcher-container` 有 `border-top` 和 `margin-top` 原为垂直布局设计）。

**苹果 HIG 原则**：iOS 标签栏最多 5 个条目，超出应用 "更多" 折叠。

**修复方案**：
1. 主题切换按钮从 Navbar 移出，改为页面设置面板或右上角浮动按钮
2. 通知/头像区保留但减少到仅头像（点击展开下拉菜单）
3. 导航项若坚持保留 6 个，可在移动端改为底部 TabBar 样式
4. Navbar `max-width` 可适当放大到 860px 以容纳所有项目

---

### UI-02 · 模块卡片 hover 遮挡相邻元素
**文件**：`src/style.css`（line 624-695）

**问题描述**：
```css
.module-card:hover {
  z-index: 10;
  transform: translateY(-6px) scale(1.015);
}
```
Hover 时卡片上移 6px 并放大 1.5%，同时设 `z-index: 10`。三列卡片水平相邻时，中间卡片 hover 上浮后其放大的阴影/光晕会**视觉遮挡**左右两侧卡片的顶部内容。

**修复方案**：
- 缩小 hover 上移量：`translateY(-4px) scale(1.01)`
- 通过 `overflow: visible` + 合理 `margin` 而非 z-index 管控层叠
- 或只用阴影加深表现 hover，不使用位移

---

### UI-03 · `module-card::after` 光晕层（z-index:2）可能覆盖卡片文字点击区域
**文件**：`src/style.css`（line 605-622）

**问题描述**：
`::after` 伪元素设有 `z-index: 2`，而卡片内容（标题、说明、CTA）不设 z-index，层叠顺序下内容处于 z-index 0 的自然流。虽然 `pointer-events: none` 防止了点击阻断，但配合 `position: absolute; top:0; left:-100%; right:100%; bottom:0` 在 hover 时移动到卡片上方，某些浏览器（Safari）可能产生文字渲染模糊。

**修复方案**：
- 将卡片内容包裹在 `<div class="module-card__content" style="position:relative; z-index:3">` 中，确保内容永远在光晕层之上

---

### UI-04 · `bg-noise` z-index 与页面内容关系隐患
**文件**：`index.html`（line 20）、`src/style.css`（line 253-261）

**问题描述**：
```css
.bg-noise { position: fixed; z-index: 0; pointer-events: none; }
#app      { position: relative; z-index: 1; }
```
`bg-noise` z-index: 0 处于 `-1`（bg-atmosphere）和 `1`（#app）之间，理论上内容在上方不受影响，但某些低端移动浏览器会将 `z-index:0` 的 `position:fixed` 元素放入独立合成层，消耗额外内存。

**修复方案**：改为 `z-index: -1`，与 `bg-atmosphere` 同层级，用 `isolation: isolate` 在 `#app` 上确保堆叠上下文清晰。

---

## 三、动画与交互缺陷

### ANIM-01 · JS 视差覆盖 CSS float 动画，导致 orb 只能垂直移动
**文件**：`src/main.js`（line 178-185）

**问题描述**：
```js
function updateParallax() {
  orbs.forEach((orb, i) => {
    orb.style.transform = `translateY(${scrollY * speed}px)`;
  });
}
```
通过 JS 直接设置 `orb.style.transform`，会**完全覆盖** CSS 中 `animation: orbFloat` 定义的 transform 动画。一旦用户滚动页面，CSS 的 orbFloat 浮动效果立即消失，orb 只剩机械的垂直平移。

**修复方案**：
- 使用 CSS 自定义属性（Custom Property）传递偏移量：`--parallax-y: Xpx`，在 orbFloat keyframes 里叠加 `translateY(var(--parallax-y, 0))`
- 或放弃 JS 视差，仅保留纯 CSS orbFloat 动画

---

### ANIM-02 · `glassAppear` 使用 `filter: blur(6px)` 同屏多元素同时执行，GPU 压力大
**文件**：`src/style.css`（line 1812-1824）

**问题描述**：
首页有 hero badge、hero title、hero desc、hero actions、hero stats（3个）、3个 module card 共 9 个元素同时运行含 `filter: blur` 的入场动画。`blur` 滤镜会强制创建合成层并在 GPU 上执行，9 层同时 blur 可在低端设备上导致掉帧（<60fps）。

**修复方案**：
- 将 `glassAppear` 的 `blur(6px)` 改为 `blur(2px)` 或完全移除，仅保留 `opacity + translateY`
- 对于 module card，使用 CSS `animation-delay` 做错开出现，而非全部同一帧启动

---

### ANIM-03 · Advanced Drawer 展开/收起使用 height 动画，触发 reflow
**文件**：`src/pages.js`（line 333-348）

**问题描述**：
```js
drawerAdv.style.height = drawerAdv.scrollHeight + 'px'; // lock
requestAnimationFrame(() => {
  drawerAdv.style.height = '0';
});
```
动画 `height: 0 → Xpx` 每帧都触发浏览器**重排（reflow）**，不是 GPU 加速属性。在低端机上动画卡顿。

**修复方案**：
- 用 CSS `max-height` 过渡 + `overflow: hidden`（`max-height: 0 → 600px`），或
- 用 CSS `grid-template-rows: 0fr → 1fr` 技巧实现真正 GPU 加速的展开动画

---

### ANIM-04 · 页面路由切换无过渡动画
**文件**：`src/router.js`、`src/main.js`（line 224-262）

**问题描述**：
点击导航链接时，`#app` 内容瞬间替换，没有任何离场/入场动画。Apple iOS 26 风格要求页面切换有流畅的滑动或淡入淡出过渡（通常是 `translateX` 或 `opacity` + `scale`）。

**修复方案**：
在 Router 的 resolve 方法中加入：
1. 离场：当前内容 `opacity: 1 → 0 + translateY(8px)`，持续 160ms
2. 切换内容（在 transitionend 回调中）
3. 入场：新内容 `opacity: 0 + translateY(8px) → 1 + translateY(0)`，持续 240ms，用 `ease-spring`

---

### ANIM-05 · Segmented Slider 在初始渲染时偶发"从左侧 0 宽度滑入"的闪烁
**文件**：`src/main.js`（line 128-158）

**问题描述**：
代码通过 `slider.style.transition = 'none'` → 设置位置 → 双 rAF 后恢复 transition 来防止初始动画。但 `requestAnimationFrame` 中嵌套 `requestAnimationFrame` 在某些帧率下（特别是 Safari）无法保证两帧之间已完成布局，仍会偶发滑块从 0 宽度出现的抖动。

**修复方案**：用 `offsetWidth`（强制同步读取布局）替代双 rAF 方案：
```js
slider.style.transition = 'none';
updateSegmentedSlider(container.id);
slider.offsetWidth; // force reflow
slider.style.transition = '';
```

---

## 四、主题系统缺陷

### THEME-01 · 四个备选主题均未重新定义 Glass 和文字颜色变量
**文件**：`src/style.css`（line 1766-1805）

**问题描述**：
`abyss`/`emerald`/`cyber`/`obsidian` 四个深色主题都没有重定义：
- `--glass-bg`（仍为 `rgba(255,255,255,0.45)`）→ 深色背景上 45% 白色玻璃效果异常刺眼
- `--text-primary`（仍为 `#1c1c2e`）→ 深色背景上深色文字→ **文字不可见**
- `--text-secondary`（仍为 `#58566b`）→ 同上
- `--glass-border`（仍为 `rgba(255,255,255,0.60)`）→ 边框过于明亮

**修复方案**：每个深色主题补充：
```css
:root[data-theme="abyss"] {
  --glass-bg: rgba(15, 20, 40, 0.55);
  --glass-bg-hover: rgba(15, 20, 40, 0.70);
  --glass-bg-input: rgba(20, 25, 50, 0.60);
  --glass-border: 1px solid rgba(255, 255, 255, 0.12);
  --text-primary: #e8eaf6;
  --text-secondary: #9ba3c2;
  --text-muted: #5c6491;
  /* ... */
}
```

---

### THEME-02 · abyss 主题中所有模块颜色合并为同一蓝色，失去色彩区分
**文件**：`src/style.css`（line 1766-1775）

**问题描述**：
```css
:root[data-theme="abyss"] {
  --topic: #38bdf8;
  --article: #38bdf8;   /* 与 topic 相同 */
  --translation: #818cf8;
}
```
主题探索（蓝色）和文章实验室（本应橙色）在 abyss 主题下变成**同一种蓝色**，导航栏彩点和模块卡片颜色编码失去区分意义。

**修复方案**：各主题应保持模块色调的区分度，只做整体色温的偏移，例如：
- `abyss` 主题：topic 保持蓝系，article 改为 `#f59e0b`（暖黄），translation 改为 `#34d399`（绿）

---

## 五、iOS 风格合规性问题

### IOS-01 · 错误提示使用原生 `alert()` 弹窗，不符合 iOS 设计语言
**文件**：`src/pages.js`（line 613, 886）、`src/vocab_page.js`（line 313, 351）

**问题描述**：
```js
alert('文本超过 2000 词限制...');
alert('Word is required');
confirm('确定要删除...');
```
原生浏览器 `alert()/confirm()` 弹窗与 Liquid Glass 风格完全不统一，且会阻塞 JS 线程。iOS 中应使用 **Toast 通知** 或 **Sheet 模态卡片**。

**修复方案**：
1. 实现一个 Toast 组件（fixed 定位，底部居中，glass 背景，自动 3s 消失）
2. `confirm` 改为自定义 Modal（class 名 `.modal-glass`）
3. 替换所有 `alert()` 和 `confirm()` 调用

---

### IOS-02 · 表单输入框去掉 outline 后无自定义 Focus 环，无障碍性差
**文件**：`src/style.css`（line 961）

**问题描述**：
```css
.form-input { outline: none; }
```
虽然有 `box-shadow` 的 focus 高亮，但其 `rgba(88,86,214,0.08)` 透明度极低，在明亮背景下几乎不可见。键盘导航用户无法确认焦点位置。

**修复方案**：
```css
.form-input:focus-visible {
  box-shadow: 0 0 0 3px rgba(88, 86, 214, 0.25),
              0 0 0 1px rgba(88, 86, 214, 0.6);
}
```

---

### IOS-03 · 导航栏固定在顶部但主内容 padding-top 不足，内容被遮挡
**文件**：`src/style.css`（line 427-430）

**问题描述**：
```css
.page { padding-top: 88px; }
```
Navbar 的实际高度约为 `14px(top) + 6px(padding) + 42px(inner) + 6px(padding) = 68px`，加上 `top: 14px` 即 Navbar 底部距顶部约 82px。`.page` 的 `padding-top: 88px` 勉强够，但当 Navbar 在 `scrolled` 状态增加高度时（box-shadow 更大），没有补偿距离，且 `.page-container`（vocab/progress 页面）没有继承这个 padding，这两个页面内容会**顶到 Navbar 后面**。

**修复方案**：
- 用 CSS 变量 `--navbar-height: 82px`，统一应用于 `.page`、`.page-container` 的 `padding-top`
- 也可通过 `padding-top: env(safe-area-inset-top)` 兼容 iPhone 刘海

---

### IOS-04 · Checkbox 样式未定义，使用浏览器默认样式
**文件**：`src/style.css` 无 `.checkbox-label` 定义

**问题描述**：
主题探索页的专业方向多选（`#topic-domain-checklist`）中：
```html
<label class="checkbox-label">
  <input type="checkbox" ...><span></span> 国际法
</label>
```
CSS 中无 `.checkbox-label` 的定义，`<span>` 没有样式（应渲染为自定义 glass 风格 checkbox）。显示的是浏览器默认复选框，与整体风格不符。

**修复方案**：
```css
.checkbox-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer;
}
.checkbox-label input[type="checkbox"] { display: none; }
.checkbox-label span {
  width: 18px; height: 18px; border-radius: 6px;
  border: 1.5px solid rgba(0,0,0,0.15);
  background: var(--glass-bg-input);
  transition: all 0.2s var(--ease-spring);
  flex-shrink: 0;
}
.checkbox-label input:checked + span {
  background: var(--accent);
  border-color: var(--accent);
  /* 添加 checkmark via ::after */
}
```

---

### IOS-05 · `custom-domain-field` 的类写法不一致
**文件**：`src/pages.js`（line 163）、`src/style.css`（line 663）

**问题描述**：
HTML 中写：`class="custom-domain-field"`，CSS 中定义：`.form-input.custom-domain-field`（需要同时有 form-input 类），但 HTML 中**没有** `form-input` 类。CSS 选择器将永远不匹配。

**修复方案**：HTML 改为：
```html
<input type="text" class="form-input custom-domain-field" ...>
```

---

## 六、响应式 / 移动端问题

### RESP-01 · 移动端导航栏无汉堡菜单，6个入口只能小字挤压
**文件**：`src/style.css`（line 1946-1976）

**问题描述**：
768px 以下仅缩小字号到 11px，减少 padding 到 `6px 9px`，隐藏品牌文字。6 个导航入口 + 通知 + 头像 + 4 个主题按钮在 375px 宽 iPhone 上严重溢出，即使开启 `overflow-x: auto` 用户也无法察觉可以横滑。

**修复方案**：
- 移动端导航改为**底部 TabBar**（固定在底部）
- 或实现汉堡菜单（点击展开 sheet 形式的全屏菜单）
- 主题切换仅在设置页/个人中心显示

---

### RESP-02 · 生词本表格在移动端无法正常显示
**文件**：`src/vocab_page.js`（line 44-60）

**问题描述**：
6 列 `<table>` 在小屏幕无任何响应式处理（无 `overflow-x: auto` 包裹，无列的折叠策略）。375px 屏幕上每列只有约 62px 宽，内容严重溢出。

**修复方案**：
- 外层加 `overflow-x: auto`
- 移动端隐藏次要列（专业领域、下次复习），或改为卡片列表布局

---

## 七、代码质量 / 可维护性

### CODE-01 · Vocab / Progress 页面充斥大量 inline style，无法应用主题变量
**文件**：`src/vocab_page.js`（全文）、`src/progress_page.js`（全文）

**问题描述**：
两个页面 90% 的样式以 `style="..."` 形式写在 HTML 字符串中，大量使用硬编码颜色（`rgba(255,255,255,0.03)`、`rgba(0,0,0,0.2)` 等），导致：
- 主题切换对这两个页面完全无效
- 代码可读性极差
- 维护时需要同时更改 JS 字符串

**修复方案**：为这两个页面在 `style.css` 中创建专属类（`.vocab-page`、`.progress-page` 等），将 inline style 提取为 CSS 类，使用设计 token。

---

### CODE-02 · `setDirection` 和 `selectMode` 中 `event` 对象在 `copyText` 里被意外引用
**文件**：`src/pages.js`（line 844-848）

**问题描述**：
```js
window.copyText = function (text) {
  navigator.clipboard.writeText(text).then(() => {
    event.target.textContent = '✓ 已复制';  // 使用了全局 event 对象
  });
};
```
`event` 是全局对象，在异步 `then()` 回调中引用时，原始事件可能已经失效，会导致 `event.target` 为 null，引发错误。

**修复方案**：
```js
window.copyText = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ 已复制';
    setTimeout(() => { btn.textContent = '复制'; }, 1500);
  });
};
// 调用方改为：onclick="copyText(`...`, this)"
```

---

## 优化任务优先级汇总

| 优先级 | 编号 | 描述 | 影响范围 |
|--------|------|------|----------|
| 🔴 P0 | BUG-01 | 补全缺失 CSS 类 | 生词本、进度页完全失样式 |
| 🔴 P0 | BUG-02 | 修复白字在浅色背景上不可见 | 生词本、进度页可读性 |
| 🔴 P0 | BUG-03 | 修复 selectMode/setDirection 清除 Navbar 高亮 | 全站导航 |
| 🔴 P0 | BUG-04 | 修复 HTML 多余闭合标签 + 缺失 `</body>` | 全页面 DOM 结构 |
| 🟠 P1 | UI-01 | 导航栏瘦身/重构，分离主题切换 | 全站顶部体验 |
| 🟠 P1 | IOS-01 | 用 Toast/Modal 替换 alert()/confirm() | 全站交互 |
| 🟠 P1 | THEME-01 | 补全深色主题的 glass+文字变量 | 4个深色主题 |
| 🟠 P1 | IOS-03 | 统一 Navbar 高度变量，修复页面被遮挡 | 生词本、进度页 |
| 🟡 P2 | ANIM-01 | 修复 JS 视差覆盖 CSS float 动画 | 背景动效 |
| 🟡 P2 | ANIM-02 | 降低 glassAppear blur 强度提升性能 | 全站入场动画 |
| 🟡 P2 | ANIM-04 | 添加页面切换过渡动画 | 路由切换体验 |
| 🟡 P2 | IOS-04 | 补全 Checkbox 自定义样式 | 主题探索页 |
| 🟡 P2 | IOS-05 | 修复 custom-domain-field 类名错误 | 主题探索页 |
| 🟡 P2 | RESP-01 | 移动端导航改为底部 TabBar | 移动端 |
| 🟢 P3 | ANIM-03 | Advanced Drawer 改用 max-height/grid 动画 | 主题探索页 |
| 🟢 P3 | ANIM-05 | 修复 Segmented Slider 初始化抖动 | 切换控件 |
| 🟢 P3 | UI-02 | 调整模块卡片 hover 位移量 | 首页 |
| 🟢 P3 | UI-03 | 为卡片内容层设置 z-index | 首页 |
| 🟢 P3 | THEME-02 | abyss 主题恢复模块色彩区分 | 主题 |
| 🟢 P3 | IOS-02 | 增强 Focus 环可见度 | 无障碍 |
| 🟢 P3 | CODE-01 | 提取 vocab/progress inline style 到 CSS | 可维护性 |
| 🟢 P3 | CODE-02 | 修复 copyText 异步 event 引用 | 翻译页复制按钮 |
| 🟢 P3 | RESP-02 | 生词本表格移动端响应式 | 移动端 |
