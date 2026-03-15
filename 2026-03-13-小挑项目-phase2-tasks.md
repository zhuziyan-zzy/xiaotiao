# 小挑项目 Phase 2 开发任务清单

- 文档版本：`v2.0`
- 日期：`2026-03-13`
- 当前阶段：`V1 MVP → 词汇驱动智能学习平台`
- 基于：`2026-03-13-小挑项目-v2-整合prd.md` + 用户新增需求 8 条

---

## 概念模型说明

在开始任务之前，先明确三类"词汇"的定义边界，这是整个系统设计的基础：

| 概念 | 定义 | 来源 | 在文章中的角色 |
|------|------|------|-------------|
| **数据库词汇（My Words）** | 用户主动加入、需要反复练习的目标词汇 | 用户手动添加 / 文件导入 / AI 提取 | 文章生成时必须嵌入，由 SRS 算法控制每次出现哪些词 |
| **生词（New Words）** | 文章中出现的、超出用户当前掌握范围的陌生词 | 从"目标范围"词表中选取 | 丰富文章词汇，让用户接触新词；用户可将感兴趣的生词加入 My Words |
| **目标范围词表（Target Range）** | 标准化词汇表（四六级、雅思等）| 系统内置，用户选择激活哪个 | 为"生词"提供候选池，可视化用户对该词表的掌握进度 |

**关键规则**：数据库词汇 ≠ 生词。数据库词汇是已在学习中的词；生词是文章中额外引入的陌生词。生词被用户标记后可加入 My Words 数据库。

---

## 一、当前完成度评估

### 已完成

| 模块 | 状态 | 说明 |
|------|------|------|
| 前端 SPA 框架 | 完成 | Vite + 原生 JS，哈希路由，三页面完整渲染 |
| 首页 Home | 完成 | Hero 区块、三模块入口卡片、价值说明 |
| Topic Explorer UI | 完成（待升级） | 单主题输入、单域名选择，需扩展为多选+参数面板 |
| Article Lab UI | 完成 | 模式切换、文件上传、分段显示、单段重试 |
| Translation Studio UI | 完成 | 方向切换、三风格结果、用户译文点评 |
| 跨模块跳转 | 完成 | Topic → Translation 内容传递 |
| 交互动效系统 | 完成 | Liquid Glass 风格全套交互 |
| 产品文档 | 完成 | V1 PRD、V2 整合 PRD |

### 未完成（Phase 2 全量缺口）

| 模块 | 状态 | 说明 |
|------|------|------|
| 后端 API 服务器 | 未开始 | `api.js` 全为 Mock |
| LLM 接入（三模块）| 未开始 | 无实际 Claude 调用 |
| Topic Explorer 高级参数 | 未开始 | 多主题、多域名、文章风格、文章参数设置 |
| My Words 词汇数据库 | 未开始 | 全新模块：CRUD + 多种导入方式 + AI 提取 |
| 多格式文件解析（Excel/Word/照片）| 未开始 | AI 识别提取词汇进入数据库 |
| SRS 轮动机制 | 未开始 | 记忆曲线算法 + 任务进度可视化 |
| 目标范围（Target Range）| 未开始 | 词表选择 + 生词控制 + 进度看板 |
| 数据埋点 | 部分 | `feedback_submit` 仅 `console.log` |
| 错误处理完善 | 部分 | 无重试策略，无超时处理 |
| 测试 / 部署 | 未开始 | 无测试文件，无生产配置 |

---

## 二、Phase 2 任务优先级总览

```
P0（阻塞型）   → 后端框架 + LLM 接入 + 数据库初始化（无此无法运行任何功能）
P1（核心差异化）→ My Words 词汇数据库（CRUD + 多格式导入 + AI 提取）
               → Topic Explorer 升级（多选参数 + 风格 + 文章控制参数）
               → SRS 轮动机制 + 任务看板
P2（体验完善） → 目标范围模块 + 进度可视化
               → 流式输出、错误处理、输入校验
P3（质量保障） → 埋点落地、自动化测试、部署流水线
```

---

## 三、P0 任务：后端框架 + 数据库初始化

### 任务 0.1 — 初始化后端项目

**目标**：创建能同时承载 LLM 调用与数据持久化的后端服务。

**技术选型**：
- **推荐：Python + FastAPI** — 后续需接入文件解析（openpyxl / python-docx / PIL）、AI 图片识别、LangGraph，Python 生态更完整
- 备选：Node.js + Express（如团队更熟悉 JS）

**交付物**：
- [ ] 初始化 `xiaotiao-server/` 目录，含 `requirements.txt` 或 `package.json`
- [ ] `.env` 配置（`ANTHROPIC_API_KEY`、`PORT`、`DB_PATH`），`.env` 加入 `.gitignore`
- [ ] CORS 配置，允许 `localhost:5173`
- [ ] `GET /health` → `{ "status": "ok", "db": "connected" }`
- [ ] SQLite 数据库初始化脚本（`db/init.sql`），建立所有表结构（详见下方 Schema）

**验收**：`curl http://localhost:3000/health` 返回 200，且数据库文件已创建。

---

### 任务 0.2 — 数据库 Schema 设计与初始化

**说明**：Phase 2 引入词汇数据库后，需要在项目启动时完成所有表的建立。

#### 词汇主表（vocabulary_items）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID PK | 唯一主键 |
| `word` | VARCHAR | 单词本体（小写规范化） |
| `definition_zh` | TEXT | 中文释义（可由 AI 生成，也可为空） |
| `part_of_speech` | VARCHAR | 词性（noun / verb / adj 等，可空） |
| `domain` | VARCHAR | 所属领域标签（如 legal / finance / general） |
| `source` | VARCHAR | 来源类型：manual / excel / word_doc / photo / ai_chat |
| `example_sentence` | TEXT | 例句（可空，由 AI 补充） |
| `is_active` | BOOLEAN | 是否参与 SRS 轮动（默认 true） |
| `created_at` | TIMESTAMP | 创建时间 |

#### SRS 状态表（vocabulary_srs_states）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID PK | 主键 |
| `vocab_id` | UUID FK | 关联 vocabulary_items |
| `traversal_count` | INTEGER | 历史文章出现次数（初始 0） |
| `ease_factor` | FLOAT | EF 容易度因子（初始 2.5，SM-2 算法核心参数） |
| `interval_days` | INTEGER | 下次复习间隔天数（初始 1） |
| `next_review_date` | TIMESTAMP | 下次应被编入文章的日期 |
| `is_mastered` | BOOLEAN | 是否已熟记（true 则移出轮动队列） |
| `last_article_id` | VARCHAR | 最近一次出现的文章 ID（用于溯源） |
| `last_reviewed_at` | TIMESTAMP | 最近一次参与文章生成的时间 |

#### 目标范围表（target_ranges）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | VARCHAR PK | 范围标识（如 `cet4`、`cet6`、`ielts`） |
| `display_name` | VARCHAR | 展示名（四级、六级、雅思词汇） |
| `total_count` | INTEGER | 词表总词数 |
| `description` | TEXT | 简介 |

#### 目标范围词汇表（target_range_words）

| 字段 | 类型 | 说明 |
|------|------|------|
| `range_id` | VARCHAR FK | 关联 target_ranges |
| `word` | VARCHAR | 单词 |
| `frequency_rank` | INTEGER | 频率排名（可空，用于排序生词优先级） |

#### 文章风格表（article_styles）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID PK | 主键 |
| `type` | VARCHAR | `preset`（系统预设）或 `custom`（用户上传模板）|
| `name` | VARCHAR | 展示名（如 The Economist、The Guardian）|
| `prompt_modifier` | TEXT | 注入 Prompt 的风格描述片段（preset 用）|
| `template_text` | TEXT | 用户上传的示例文章（custom 用，供 AI 模仿）|
| `created_at` | TIMESTAMP | 创建时间 |

**交付物**：
- [ ] `db/init.sql` 包含所有上述建表语句
- [ ] 预置目标范围初始数据：`cet4`（4425词）、`cet6`（6710词）、`ielts`（IELTS 核心词）、`toefl`（TOEFL 核心词）
- [ ] 预置文章风格初始数据（至少 5 条 preset）：

| id | name | 风格描述 |
|----|------|---------|
| `economist` | The Economist | 严谨、精炼、使用 Latinate 词汇，善用隐喻，段落短而论点密集 |
| `guardian` | The Guardian | 清晰可读，叙事性强，适度使用口语，引用专家观点 |
| `ft` | Financial Times | 商业导向，数字与事实密集，行文节制，强调影响与因果 |
| `academic` | 学术期刊风格 | 正式、客观、使用被动语态，文献引用格式规范 |
| `plain_english` | Plain English | 简洁，短句，尽量用常用词替换术语，适合初级读者 |

**验收**：后端启动后，`SELECT name FROM article_styles;` 返回 5 条预设记录，目标范围表有初始词汇数据。

---

### 任务 0.3 — 接入 Claude API：Topic Explorer（基础版）

**接口**：`POST /api/v1/topic/generate`（此版本先实现基础接入，高级参数在任务 1.3 扩展）

**请求格式**：
```json
{
  "topics": ["international arbitration", "data governance"],
  "domains": ["international-law", "commercial-law"],
  "level": "intermediate",
  "article_style_id": "economist",
  "article_length": 400,
  "db_word_count": 8,
  "new_word_count": 5,
  "target_range_id": "cet6",
  "db_words": ["jurisdiction", "arbitration clause", "sovereign immunity"]
}
```

**字段说明**：
- `topics`：多主题数组，合并为一个文章主题范围
- `domains`：多专业方向，Prompt 中并列说明
- `db_words`：当次 SRS 算法选出的数据库单词列表，**必须**出现在文章中
- `new_word_count`：文章中额外引入的生词数量，从 `target_range_id` 中选取
- `db_word_count`：数据库单词在文章中出现的目标数量（可少于 `db_words` 总数）

**Claude Prompt 设计要点**：
- System Prompt 固定角色 + 风格锁定（根据 `article_style_id` 注入对应 `prompt_modifier`）
- 明确要求：`db_words` 列表中的词**必须**在文章中自然出现
- 明确要求：额外引入 `new_word_count` 个来自目标范围的生词（由后端先从词表中预选候选词后传入 Prompt）
- 按 `article_length` 控制输出篇幅（±50 词浮动）
- 输出 JSON 结构：

```json
{
  "result_text": "HTML 格式文章",
  "db_words_used": ["jurisdiction", "arbitration clause"],
  "new_words": [
    { "word": "adjudicate", "definition_zh": "裁决", "in_sentence": "The tribunal was asked to adjudicate..." }
  ],
  "terms": [ { "term": "...", "zh": "...", "example": "..." } ],
  "notes": ["..."],
  "confidence_hint": "medium"
}
```

**实现要求**：
- [ ] 使用 `claude-sonnet-4-6` 模型
- [ ] 后端在调用前，根据 `target_range_id` 和 `new_word_count` 从目标范围词表中随机抽取候选生词并传入 Prompt
- [ ] JSON 响应解析与校验（校验 `db_words_used` 覆盖率）
- [ ] 将 Prompt 模板提取为独立文件 `prompts/topic_generate.txt`
- [ ] 请求超时 20s

**验收**：请求中指定 `db_words: ["jurisdiction"]`，返回文章中该词出现次数 >= 1。

---

### 任务 0.4 — 接入 Claude API：Article Lab

**接口**：`POST /api/v1/article/analyze`（与原设计一致，无新增参数）

- [ ] 后端分段逻辑（按自然段或每 300 词切分）
- [ ] 按 `analysis_mode` 切换 Prompt（`plain` / `legal_focus`）
- [ ] 输出：`paragraphs`（原文+解释）、`terms`、`key_sentences`（>= 3 条）
- [ ] 输入 > 2000 词返回 `422`

**验收**：150 词文本返回 >= 1 段解释，key_sentences >= 3。

---

### 任务 0.5 — 接入 Claude API：Translation Studio

**接口**：`POST /api/v1/translation/run`（与原设计一致）

- [ ] 一次请求生成 literal / legal / plain 三种风格
- [ ] `user_translation` 非空时返回 `critique` 对象
- [ ] 输入 > 5000 字符返回 `422`

**验收**：返回 `variants` 数组长度为 3，响应时间 P95 < 12s。

---

### 任务 0.6 — 前端切换至真实 API

- [ ] 引入 `VITE_API_BASE_URL` 环境变量
- [ ] `api.js` 中所有函数改为 `fetch` 调用，删除 Mock 数据和 `delay()`
- [ ] 统一错误处理（解析后端 `{ error, code }` 格式）
- [ ] `AbortController` 超时（20s）

**验收**：三个模块页面可调用本地后端并展示真实 AI 结果。

---

## 四、P1 任务：My Words 词汇数据库

> 这是 Phase 2 最核心的差异化功能，也是 SRS 和文章生成个性化的基础。

### 任务 1.1 — 词汇数据库 CRUD 接口

**后端接口清单**：

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/v1/vocab` | 获取全部词汇列表（支持分页、搜索、按 domain 筛选）|
| `POST` | `/api/v1/vocab` | 新增单个词汇 |
| `PUT` | `/api/v1/vocab/:id` | 编辑词汇（释义、词性、域名、激活状态）|
| `DELETE` | `/api/v1/vocab/:id` | 删除词汇 |
| `POST` | `/api/v1/vocab/batch` | 批量新增（导入场景使用）|
| `GET` | `/api/v1/vocab/stats` | 统计信息（总词数、活跃词数、已掌握数）|

**实现要求**：
- [ ] `GET /api/v1/vocab` 支持 `?search=word&domain=legal&page=1&limit=50` 参数
- [ ] 新增词汇时，自动在 `vocabulary_srs_states` 创建对应初始 SRS 记录（EF=2.5，interval=1，next_review=今日）
- [ ] 批量新增时去重（同一 word 不重复插入，已存在则跳过并在响应中标注）
- [ ] AI 辅助补全：新增词汇时若 `definition_zh` 为空，调用 Claude 自动生成释义和例句（可选，异步处理）

**验收**：通过 Postman 完成增删改查全流程，stats 接口返回正确统计。

---

### 任务 1.2 — My Words 前端页面

**新增路由**：`#/vocab`（导航栏新增入口）

**页面布局**：
```
[搜索框] [按域名筛选 Dropdown] [添加单词 Button] [导入 Button]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[词汇列表表格]
  Word | 中文释义 | 词性 | 域名 | SRS状态 | 下次复习 | 操作
  jurisdiction | 管辖权 | n. | legal | 复习中 | 明天 | [编辑][删除]
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[统计条：共 264 词 · 活跃 241 词 · 已掌握 23 词]
```

**交互细节**：
- [ ] 添加单词弹窗（Modal）：输入 word，释义可选（留空则 AI 自动补全），选择域名
- [ ] 编辑行内直接修改（点击编辑图标展开 inline 编辑）
- [ ] 删除需二次确认（"确认删除该词？此操作不可撤销"）
- [ ] 搜索实时过滤（前端过滤，无需每次请求后端）
- [ ] SRS 状态标签显示：新词（灰）/ 复习中（黄）/ 待复习（橙）/ 已掌握（绿）
- [ ] 支持批量选择 + 批量删除 / 批量设为已掌握
- [ ] 词汇卡片可展开查看完整信息（例句、SRS 详细参数）

**验收**：新增一个词 → 列表实时更新；删除一个词 → 列表减少且后端确认删除。

---

### 任务 1.3 — 多格式词汇导入：打字输入 + 文本解析

**目标**：允许用户一次粘贴一段文字，AI 从中提取所有词汇进入数据库。

**接口**：`POST /api/v1/vocab/extract/text`

```json
{
  "text": "The defendant shall be liable for breach of fiduciary duty...",
  "mode": "extract_terms"
}
```

**后端逻辑**：
1. 调用 Claude，要求识别文本中的专业词汇（法律、金融、学术等领域术语）
2. 返回提取词汇列表，带建议释义
3. 前端展示预览列表，用户逐条确认或全选后批量导入

**Claude Prompt 要点**：
- 输出 JSON 数组：`[{ "word": "fiduciary duty", "definition_zh": "受托责任", "part_of_speech": "n.", "domain": "legal" }]`
- 过滤停用词和通用高频词（不提取 the / is / from 等）
- 专注领域术语，每次提取 10-30 个词

**前端实现**：
- [ ] My Words 页面新增"从文本提取"按钮 → 打开侧边面板（Drawer）
- [ ] 文本框输入 + 提取按钮 → 展示提取结果预览列表（每词可勾选/取消）
- [ ] 确认导入按钮 → 调用批量新增接口 → 返回导入成功/跳过重复数量

**验收**：输入包含 5 个法律术语的段落，AI 提取结果准确率 >= 80%，勾选后可成功导入。

---

### 任务 1.4 — 多格式词汇导入：Excel 文件

**目标**：用户上传 Excel，系统解析后提取词汇列入数据库。

**接口**：`POST /api/v1/vocab/import/excel`（multipart/form-data）

**后端逻辑**：
- 使用 `openpyxl`（Python）或 `xlsx`（Node.js）解析 Excel
- 自动识别"单词列"（列名包含 word / term / 单词 等关键字）
- 支持格式：每行一个词，或带有中文释义列（自动映射 word + definition_zh）
- 若无法自动识别列结构，返回列名列表让用户手动指定

**前端实现**：
- [ ] My Words 页面"导入"按钮 → 展开导入 Dropdown：选择文件格式（Excel / Word / 照片）
- [ ] Excel 导入：文件选择器（`.xlsx, .xls`）→ 上传 → 展示解析预览（列名映射确认）→ 确认导入
- [ ] 导入进度条（大文件时）
- [ ] 导入结果摘要：成功 X 条，跳过重复 Y 条，格式错误 Z 条

**验收**：上传含 20 个词汇的 Excel，系统成功解析并导入，重复词汇跳过且有提示。

---

### 任务 1.5 — 多格式词汇导入：Word 文档

**目标**：用户上传 Word 文档（如课件、阅读材料），AI 从中提取专业词汇。

**接口**：`POST /api/v1/vocab/import/word`（multipart/form-data）

**后端逻辑**：
- 使用 `python-docx` 提取文档纯文本
- 文本长度 > 5000 词时，提示用户"内容较长，将提取前 5000 词中的术语"
- 将纯文本送入任务 1.3 的 Claude 提取管线

**前端实现**：与 Excel 导入流程一致，文件格式改为 `.docx, .doc`。

**验收**：上传一篇含法律术语的 Word 文档，提取结果包含文中核心术语。

---

### 任务 1.6 — 多格式词汇导入：照片 / 图片 OCR

**目标**：用户拍摄单词本、课件截图等，AI 识别图中文字并提取词汇。

**接口**：`POST /api/v1/vocab/import/image`（multipart/form-data）

**后端逻辑**：
1. 接收图片（`.jpg, .png, .heic` 等）
2. 使用 **Claude 视觉能力**（`claude-sonnet-4-6` 支持多模态）直接识别图中文字，无需额外 OCR 服务
3. Claude Prompt：要求识别图片中的所有单词/短语，并识别其中的专业术语，返回结构化词汇列表
4. 同样进入预览 → 确认 → 批量导入流程

**实现要求**：
- [ ] 图片文件大小限制：10MB 以内
- [ ] 支持多图片同时上传（最多 5 张）
- [ ] 图片中文字模糊时，在结果中标注"识别置信度低"

**验收**：拍摄一张手写单词本照片（字迹清晰），系统成功识别并提取词汇。

---

## 五、P1 任务：Topic Explorer 高级参数升级

### 任务 1.7 — 多主题 + 多域名选择

**目标**：将现有单主题输入升级为支持多主题并行，域名改为多选。

**前端改动**（`pages.js` Topic Explorer 页）：

**主题输入升级**：
- [ ] 现有单行 `<input>` 改为 **标签式多值输入**（与现有标签系统一致，回车添加一个主题 Tag）
- [ ] 支持预设快捷主题按钮（例："国际仲裁" "数据跨境" "知识产权" "海洋法" 等，点击直接添加）
- [ ] 最多允许同时输入 5 个主题

**域名多选升级**：
- [ ] 现有 `<select>` 改为 **多选 Checkbox Dropdown**（展开后可勾选多个域名）
- [ ] 已选域名以 Tag 形式展示在 Dropdown 下方
- [ ] 预设选项扩充：国际法 / 商法 / 宪法学 / 刑法学 / 知识产权法 / 金融法 / 劳动法 / 环境法 / 数字法律 / 争端解决
- [ ] 支持自定义输入（在 Dropdown 底部提供"自定义..."输入框）

**接口变更**：`topics` 字段改为数组（任务 0.3 已按新格式设计）。

**验收**：输入 2 个主题 + 3 个域名后提交，生成的文章内容覆盖了多个主题方向。

---

### 任务 1.8 — 文章风格选择

**目标**：允许用户选择文章写作风格，支持预设风格和自定义模板。

**前端改动**：

**预设风格选择**：
- [ ] 在 Topic Explorer 输入面板新增"文章风格"区块
- [ ] 以卡片形式展示预设风格（The Economist、Guardian、FT、学术期刊、Plain English）
- [ ] 每张卡片附有风格简描（2 行文字说明）
- [ ] 选中时卡片高亮，默认不选（不限风格）

**自定义模板上传**：
- [ ] 预设风格末尾增加"+ 上传我的模板"选项
- [ ] 点击后展开文件上传区域（`.txt, .md, .docx`，上限 3000 词）
- [ ] 上传成功后，自定义模板以卡片形式出现在风格选择区，名称可编辑
- [ ] 后端调用 Claude 分析模板风格特征（句长、词汇密度、语态等），生成 `prompt_modifier` 存入 `article_styles` 表
- [ ] 自定义风格持久化（刷新后保留）

**接口变更**：新增 `POST /api/v1/styles/custom`（上传自定义模板，返回 style_id）。

**验收**：选择 "The Economist" 风格生成的文章，与选择 "Plain English" 生成的文章，句式和词汇复杂度有明显差异。

---

### 任务 1.9 — 文章生成参数控制

**目标**：给用户精细控制文章中各类词汇比例和篇幅的能力。

**前端改动**（Topic Explorer 输入面板新增"生成参数"折叠区块）：

```
[生成参数] （默认折叠，点击展开）
  文章长度：[300词] ──●──────── [800词]  当前：400词
  嵌入数据库单词数：[0] ──●──── [20]     当前：8个
  引入生词数：       [0] ──●──── [15]     当前：5个
  生词来源范围：     [下拉选择目标范围] 默认：不限
```

**实现要求**：
- [ ] 三个 Range Slider（文章长度 300-800，数据库词 0-20，生词 0-15）
- [ ] 实时显示当前值
- [ ] "嵌入数据库单词数" Slider 的最大值应动态跟随数据库中活跃词汇数量（若数据库有 50 个词，最大可设 20；若只有 3 个词，最大显示 3）
- [ ] 生词来源范围 Dropdown：选项来自 `target_ranges` 表（四六级、雅思等），不选则 AI 自由选词
- [ ] 数据库为空时，"嵌入数据库单词数" Slider 禁用，并显示提示"请先在 My Words 添加词汇"，附链接跳转

**验收**：设置文章长度 600 词，生成的文章字数在 550-650 词范围内。

---

## 六、P1 任务：SRS 轮动机制

### 任务 1.10 — SRS 核心算法实现

**目标**：实现基于改良 SM-2 算法的词汇轮动系统（参见 PRD v2 第 10 节）。

**后端接口**：

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/v1/srs/due-words` | 获取今日应复习词汇列表 |
| `GET` | `/api/v1/srs/new-words` | 获取未曝光的新词列表 |
| `POST` | `/api/v1/srs/session` | 提交一次文章生成的 SRS 反馈（更新 EF 和 interval）|
| `GET` | `/api/v1/srs/schedule` | 查看未来 7 天的词汇轮动计划 |

**算法逻辑**（后端服务 `services/srs.py`）：

**词汇选取优先级（每次生成文章时调用）**：
1. **复习池**：`next_review_date <= 今日` 的词（已曝光但需复习）
2. **新词池**：`traversal_count = 0` 的词（从未出现）
3. **缓冲池**：`traversal_count > 0` 且 `is_mastered = false` 且未到期的词（填充用）

```python
def select_words_for_article(db_word_count: int) -> list[VocabItem]:
    due = get_due_words()          # 优先复习
    new = get_new_words()          # 其次新词
    buffer = get_buffer_words()    # 最后填充

    selected = (due + new + buffer)[:db_word_count]
    return selected
```

**SRS 更新逻辑（文章生成后，用户完成阅读时触发）**：

```python
def update_srs_state(vocab_id: str, quality: int):
    # quality: 0-5（由用户操作隐式推断，见下方）
    state = get_srs_state(vocab_id)

    if quality >= 3:  # 记住了
        if state.traversal_count == 0:
            state.interval_days = 1
        elif state.traversal_count == 1:
            state.interval_days = 6
        else:
            state.interval_days = round(state.interval_days * state.ease_factor)

        new_ef = state.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        state.ease_factor = max(1.3, new_ef)
    else:  # 忘了
        state.interval_days = 1

    state.next_review_date = today + timedelta(days=state.interval_days)
    state.traversal_count += 1
    save(state)
```

**隐式质量评估（quality 推断方式）**：
- `quality = 5`：用户点击了该词的术语卡片（主动查询，证明注意到了）
- `quality = 3`：词出现在文章中，用户浏览了全文（被动接触）
- `quality = 0`：文章生成后，用户在下次生成时该词在"复习池"中仍未被点击（默认遗忘）

**实现要求**：
- [ ] `services/srs.py` 实现 `select_words_for_article()` 和 `update_srs_state()` 两个核心函数
- [ ] `GET /api/v1/srs/due-words` 返回今日应复习词汇，按 `next_review_date` 升序排列
- [ ] 文章生成时，后端自动调用 `select_words_for_article(db_word_count)` 填充 `db_words` 参数（前端可覆盖）
- [ ] 文章结果返回后，前端调用 `POST /api/v1/srs/session` 上报本次文章中出现的词汇 ID

**验收**：
- 新建 3 个词汇后调用 `GET /api/v1/srs/due-words`，3 个词均在复习列表中
- 调用 `update_srs_state(id, quality=5)` 后，该词的 `interval_days` 从 1 更新为 6

---

### 任务 1.11 — SRS 看板前端页面

**新增路由**：`#/progress`（导航栏新增，或在 My Words 页内嵌 Tab）

**页面布局**：

```
[SRS 学习看板]

今日任务                           未来 7 天预览
┌──────────────────────┐           日期  到期词数
│ 今日待复习：12 个词    │           明天    8
│ 今日新词配额：5 个     │           后天    3
│ 已完成任务：3/17       │           ...    ...
└──────────────────────┘

词汇状态分布（环形图）
  新词 132 / 复习中 89 / 待复习 24 / 已掌握 19

词汇轮动列表
  ┌──────────────────────────────────────────────────┐
  │ jurisdiction  下次复习：明天  间隔：6天  EF：2.50 │
  │ arbitration   下次复习：3天后 间隔：13天 EF：2.80 │
  │ sovereignty   待复习！      间隔：1天  EF：2.10  │
  └──────────────────────────────────────────────────┘
```

**实现要求**：
- [ ] 今日任务卡片（今日待复习数、新词数、已通过文章生成完成数）
- [ ] 未来 7 天轮动预览（柱状图，显示每天到期词数）
- [ ] 词汇状态分布（用 SVG 环形图，纯前端渲染，无需图表库）
- [ ] 词汇轮动列表：显示每词的下次复习日期、当前 interval、EF 值
- [ ] "今日生成文章"快捷按钮（跳转 Topic Explorer 并自动填入今日 SRS 推荐词汇量）
- [ ] 词汇状态标签颜色系统统一：新词（灰）/ 复习中（黄）/ 待复习（红）/ 已掌握（绿）

**验收**：导入 20 个词汇后，看板正确显示状态分布，未来预览显示合理的复习计划。

---

## 七、P2 任务：目标范围（Target Range）模块

### 任务 2.1 — 目标范围词表管理后端

**目标**：支持内置标准词表，并可视化用户对各词表的掌握进度。

**词表数据来源**：
- 四级词表（CET-4，约 4425 词）：从开源词表引入，存入 `target_range_words`
- 六级词表（CET-6，约 6710 词）：同上
- 雅思词表（IELTS Academic Word List，约 570 词族）：同上
- 托福词表（TOEFL Core Words）：同上

**新增接口**：

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/v1/ranges` | 获取所有目标范围列表（含每个范围的总词数）|
| `GET` | `/api/v1/ranges/:id/progress` | 获取用户对该范围的掌握进度 |
| `GET` | `/api/v1/ranges/:id/words` | 分页获取范围词汇，支持按掌握状态过滤 |

**进度计算逻辑**：
- 对某个 target_range，统计其 `target_range_words` 中有多少词已出现在用户的 `vocabulary_items` 中（即用户已将其加入 My Words 或已在文章中标注为"认识"）
- 进度 = `已加入 My Words 的词数 / 目标范围总词数`

**实现要求**：
- [ ] 初始化脚本从开源词表文件（`.txt` 或 `.csv`）批量导入到 `target_range_words`
- [ ] `GET /api/v1/ranges/:id/progress` 返回：`{ total, encountered, in_vocab_db, progress_pct }`

**验收**：调用 `GET /api/v1/ranges/cet4/progress`，返回正确的总词数和当前进度。

---

### 任务 2.2 — 目标范围前端看板

**位置**：在 SRS 看板页（`#/progress`）下方新增"目标范围"区块，或独立为 Tab。

**UI 设计**：

```
[目标范围学习进度]

选择激活的目标范围：[四级] [六级] [雅思] [托福]（可多选）

CET-4   ████████░░░░░░░░░░░░  38%   1683 / 4425 词
CET-6   ████░░░░░░░░░░░░░░░░  18%   1208 / 6710 词
IELTS   ██████████████░░░░░░  72%    410 / 570  词

[点击任意进度条 → 展开该词表详情，显示未学词汇列表]
```

**实现要求**：
- [ ] 进度条组件（SVG 或 CSS，不依赖外部库）
- [ ] 点击进度条展开词表详情：分"已加入 My Words"和"未接触"两类展示
- [ ] "未接触"词列表中，每个词有"+添加"按钮，一键加入 My Words
- [ ] 进度条数据来自 `GET /api/v1/ranges/:id/progress`

**文章生成联动**：
- 在 Topic Explorer 的"生词来源范围" Dropdown 中选择某范围后，文章中引入的生词优先从该范围的"未接触词"中选取
- 用户阅读完文章后，文章中的生词可标记为"已认识"（不一定加入 My Words，但计入该范围的 `encountered` 进度）

**实现要求**：
- [ ] 文章结果页，在 `new_words` 列表每项右侧增加：`[+加入 My Words]` 和 `[已认识]` 两个操作按钮
- [ ] 点击"已认识"→ 调用 `POST /api/v1/ranges/encountered`（记录该词已被用户接触）
- [ ] 点击"+加入 My Words"→ 调用词汇新增接口，同时标记为 encountered

**验收**：激活 CET-6 范围后，生成文章中的生词来自 CET-6 词表，阅读完成后点击"已认识"，CET-6 进度条百分比上升。

---

## 八、P2 任务：体验完善

### 任务 2.3 — 流式输出（Streaming）

- [ ] 后端 Topic 接口改为 SSE（Server-Sent Events）
- [ ] Claude API 调用启用 `stream: true`
- [ ] 前端文章区域逐 token 追加渲染
- [ ] 流式传输完成后再渲染术语、SRS 操作区

**验收**：Topic Explorer 提交后，3 秒内开始逐字显示文章内容。

---

### 任务 2.4 — 错误处理与重试

- [ ] 前端错误界面增加"重试"按钮（保留用户输入）
- [ ] 区分超时 / 5xx / 422 / Rate Limit 给出差异化提示
- [ ] 后端统一错误格式：`{ "error": "message", "code": "ERROR_CODE" }`
- [ ] Article Lab 单段重试失败只影响该段

**验收**：断网状态提交，15 秒内显示超时错误并提供重试。

---

### 任务 2.5 — 输入校验后端兜底

- [ ] `topic` 非空，长度 <= 200
- [ ] `source_text` Article Lab <= 2000 词，Translation <= 5000 字符
- [ ] HTML 特殊字符过滤（防 Prompt 注入）
- [ ] 日志脱敏（记录前 50 字 + 总长度，不记录全文）

---

## 九、P3 任务：数据埋点

### 任务 3.1 — 完整埋点事件实现

新增词汇相关埋点事件：

| 事件名 | 触发时机 |
|--------|---------|
| `vocab_add` | 手动添加词汇 |
| `vocab_import` | 导入词汇（含格式类型）|
| `vocab_ai_extract` | AI 提取词汇完成 |
| `new_word_add_to_vocab` | 文章生词加入 My Words |
| `new_word_encountered` | 标记生词"已认识" |
| `srs_article_generated` | 以 SRS 模式生成文章 |

原有事件（`home_enter` / `module_enter` / `task_submit` / `task_success` / `task_fail` / `term_click` / `copy_result` / `feedback_submit`）同步实现。

- [ ] `src/analytics.js` 统一 `track()` 函数
- [ ] 后端 `POST /api/v1/analytics/event` 写入 JSONL 文件

---

### 任务 3.2 — 质量保障

- [ ] 核心接口单元测试：Prompt 构建、响应解析、输入校验
- [ ] SRS 算法单元测试：`select_words_for_article()` 优先级顺序，`update_srs_state()` EF 更新计算
- [ ] 覆盖率目标 > 70%（核心路径）

---

### 任务 3.3 — 部署配置

| 组件 | 推荐方案 |
|------|---------|
| 前端 | Vercel / Netlify |
| 后端 | Railway / Render（需支持文件存储或持久化磁盘）|
| 数据库 | SQLite 文件随后端持久化，或升级至 PostgreSQL |
| 环境变量 | 平台 Secrets |

- [ ] Dockerfile（后端）
- [ ] `vite.config.js` 生产 API 地址注入
- [ ] `.gitignore` 包含 `.env`、`*.db`、`node_modules/`、`dist/`

---

## 十、里程碑更新

| 里程碑 | 覆盖任务 | 完成标志 |
|--------|---------|---------|
| **M1 内部可演示** | 0.1 ~ 0.6 | 三模块接入真实 Claude API，本地可 demo |
| **M2 词汇系统上线** | 1.1 ~ 1.9 | My Words 数据库完整可用（CRUD + Excel/Word/照片导入 + AI 提取），Topic Explorer 支持多选参数和风格选择 |
| **M3 SRS + 目标范围** | 1.10 ~ 2.2 | 记忆曲线轮动运行，文章生成真正由 SRS 驱动，目标范围进度可视化 |
| **M4 V1 公测版** | 2.3 ~ 3.3 | 流式输出、完整埋点、自动化测试、部署到生产，邀请制灰度开放 |

---

## 十一、技术债务记录

以下问题不阻塞交付，但应在 M2 前修复：

1. **`pages.js` 中 `copyText` 使用隐式 `event` 全局变量**（[src/pages.js:721](xiaotiao-app/src/pages.js#L721)），改为显式传参。
2. **`renderHome()` 末尾有多余的 `</section>` 闭合标签**（[src/pages.js:113](xiaotiao-app/src/pages.js#L113)），修复为有效 HTML。
3. **Translation Studio 结果模板字符串内嵌 backtick 转义**（[src/pages.js:809](xiaotiao-app/src/pages.js#L809)），翻译文含 backtick 时 JS 语法错误，改为 `data-text` attribute 方案。
4. **`router.js` 中 `const init` 变量声明未使用**（[src/router.js:23](xiaotiao-app/src/router.js#L23)），可清理。
5. **导航栏目前固定为 4 个入口**，新增 My Words（`#/vocab`）和 Progress（`#/progress`）后，需要评估是否折叠为下拉菜单或调整布局。

---

## 十二、V2+ 预研（不进入 Phase 2）

- [ ] LangGraph 多智能体管线（Data Ingestion → Discovery → Curriculum → Drafting → Adaptation → Pedagogical Agent）
- [ ] Claude Prompt Caching 评估（降低 Topic 生成的重复 Prompt Token 成本）
- [ ] PostgreSQL 迁移（用户量 > 1000 时从 SQLite 升级）
- [ ] RAG 向量数据库（将用户历史文章向量化，生成前后呼应的新内容）
- [ ] 流式难度调节（Adaptation Agent + 前端难度滑块）
- [ ] Research Finder（文献检索 + 学术图谱）

---

*文档结束 — Phase 2 任务清单 v2.0，日期 2026-03-13，整合原 v1.0 任务 + 8 条新增需求*
