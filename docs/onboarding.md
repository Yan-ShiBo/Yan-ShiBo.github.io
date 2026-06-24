# 开发者与 AI 助手上手指南

本文给维护者和 AI 编码助手使用。目标是在改动前快速理解当前站点，避免破坏双语结构、响应式布局和证明材料链路。

## 1. 建议阅读顺序

1. `docs/design/architecture.md`：先理解站点架构、页面职责、外部集成契约和数据模型。
2. `docs/design/issues_and_fixes.md`：了解历史问题和防退化检查。
3. `docs/design/design.md`：理解设计方向和组件合同。
4. `docs/design/style_guide.md`：修改 CSS 前阅读。
5. `docs/design/testing.md`：了解完整测试清单。
6. `docs/design/ops.md`：了解部署和故障排查。
7. `docs/design/glossary.md`：统一术语。
8. 当前要改的 HTML/CSS/JS 文件。

## 2. 项目地图

| 路径 | 说明 |
| --- | --- |
| `index.html` / `en/index.html` | 首页和英文首页 |
| `profile.html` / `en/profile.html` | 档案时间线和证明图 |
| `research.html` / `en/research.html` | 研究方向和方法链 |
| `projects.html` / `en/projects.html` | 项目展示 |
| `resume.html` / `en/resume.html` | 简历和材料 |
| `analytics.html` / `en/analytics.html` | 访问统计 |
| `404.html` / `en/404.html` | 错误页和自动跳转 |
| `assets/css/site.css` | 全站唯一核心 CSS |
| `assets/js/site.js` | 主题、抽屉、lightbox、anchor、返回顶部 |
| `assets/js/stats.js` | 公开统计和本地访问记录 |
| `scripts/generate-sitemap.js` | sitemap 生成脚本 |
| `docs/design/` | 设计、架构、测试、运维文档集中目录 |

## 3. 本地预览

推荐使用 Python 静态服务，避免直接双击文件时部分相对路径、PDF 或浏览器安全策略表现不同：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

访问：

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/en/`
- `http://127.0.0.1:8000/profile.html`
- `http://127.0.0.1:8000/analytics.html`

## 4. 修改流程

1. 先确定要改的是内容、样式、交互、统计、资源还是文档。
2. 找到中文页和英文对应页。
3. 如果改视觉，优先复用 `site.css` 现有组件。
4. 如果改 JS，确认 DOM id、`data-*` 属性和文档是否同步。
5. 如果改路由或新增页面，更新 `scripts/generate-sitemap.js` 并重新生成 `sitemap.xml`。
6. 执行测试清单（见 `docs/design/testing.md`）。

## 5. 常见维护任务

### 5.1 修改基本信息

常见信息包括学校、研究方向、邮箱、电话、微信、GitHub。

需要同步检查：

- `index.html` 和 `en/index.html`
- `profile.html` 和 `en/profile.html`
- `resume.html` 和 `en/resume.html`
- 页面 `<head>` 中的 JSON-LD
- PDF 简历本身

不要只改页面正文，结构化数据和简历 PDF 也要同步。

### 5.2 更新 GPA、排名或考研信息

首页快速数据在 `index.html` 和 `en/index.html` 的 `.quick-stats`。简历页和档案页也可能重复出现 GPA、排名、学分、考研成绩。修改后全站搜索旧数字，例如 `3.95`、`8/124`、`373`。

### 5.3 替换 PDF

优先保持文件名不变：

- `docs/Shibo-Yan-Resume.pdf`
- `docs/Shibo-Yan-Undergraduate-Transcript.pdf`
- `docs/Shibo-Yan-Research-Paper.pdf`

如果必须改文件名，需要全站搜索旧文件名，至少检查首页材料入口、档案页下载按钮、简历页按钮和 iframe、英文对应页。

### 5.4 新增证明图片

1. 将图片压缩到合理大小，建议 500KB 以下。
2. 文件名用小写英文连字符，例如 `new-award-2026.jpg`。
3. 放入 `assets/images/`。
4. 在中文和英文对应页面都增加证明图。

示例：

```html
<a class="proof-item" data-lightbox data-caption="证明图说明" href="./assets/images/new-award-2026.jpg">
  <img alt="证明图说明" loading="lazy" decoding="async" src="./assets/images/new-award-2026.jpg" width="1200" height="900">
  <div class="proof-caption">
    <strong>奖项名称</strong>
    <span>年份和说明</span>
  </div>
</a>
```

英文页路径通常改成 `../assets/images/new-award-2026.jpg`。

### 5.5 新增项目

在 `projects.html` 和 `en/projects.html` 中新增项目卡片时至少写清：项目名称、时间、角色、技术栈、核心场景、仓库或材料链接、证明图片。新增卡片后检查 `.grid-2` 是否仍适合。

### 5.6 更新研究方向

研究方向主要在 `research.html`、`en/research.html` 和 `docs/design/glossary.md`。如果新增术语，应在术语表中补充定义。

### 5.7 更新访问统计说明

统计逻辑在 `assets/js/stats.js`。如果只是公开计数失败，不需要改内容，页面已经会降级。如果换统计服务，需要同步更新统计页面 DOM、`docs/design/architecture.md` 中的外部集成章节和 `docs/design/ops.md` 中的故障排查章节。

## 6. AI 助手维护规则

- 不要只改中文页。
- 不要为了局部修补新增内联样式。
- 不要把站点改成需要构建工具才能运行。
- 不要删除或改名 PDF、图片，除非同步所有引用。
- 不要改动与当前任务无关的已存在代码。
- 修改后必须运行可执行验证，不只描述方案。

## 7. 最低验证命令

```powershell
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

如果改了页面、样式或资源，再用本地服务器打开关键页面做人工检查。


## 8. 项目贡献指南 (Contributing Guidelines)

欢迎贡献力量来完善闫士博的个人主页！本指南旨在帮助您快速熟悉本地开发环境，并规范代码编写与提交流程。

---

### 1. 本地开发环境搭建

由于本项目是一个纯静态的 HTML/CSS/JS 站点，您不需要配置复杂的编译环境，可以直接运行。

#### 推荐开发环境：
* **编辑器**: VSCode，推荐安装 **Live Server** 扩展，以便在保存文件时浏览器自动热刷新。
* **本地服务器**: 
  如果你安装了 Node.js，可以在项目根目录直接运行以下指令：
  ```bash
  # 全局安装 http-server (如未安装)
  npm install -g http-server
  # 启动服务器
  http-server -p 8080
  ```
  或者如果您有 Python 环境，也可以运行：
  ```bash
  python -m http.server 8080
  ```
  然后访问 `http://localhost:8080` 即可。

---

### 2. 代码编写规范

为了保持网站代码的可读性与一致性，请遵守以下标准：

#### 2.1 HTML 规范
* **语义化标签**: 优先使用 HTML5 语义化元素（如 `<header>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`）。
* **无障碍访问 (A11y)**:
  * 所有的交互图标和仅图标按钮必须带有 `aria-label` 或 `title` 属性。
  * 所有的图片必须包含有意义的 `alt` 属性，辅助屏幕阅读器。
* **唯一 ID**: 主页交互元素与统计脚本对接时，确保 ID（例如 `#site-pv`, `#stats-status`）全局唯一。

#### 2.2 CSS 规范
* **拒绝行内样式**: 所有样式修改必须写在 [assets/css/site.css](file:///c:/Users/YanShibo/Documents/GitHub/Yan-ShiBo.github.io/assets/css/site.css) 中，禁止在 HTML 元素上使用 `style="..."`。
* **样式复用**: 优先使用 site.css 中已有的布局组件（如 `.grid-3`, `.panel`, `.tag`），避免为了小调整新建临时类。
* **变量使用**: 所有的颜色、间距、字体设置都应引用定义好的 CSS 变量（如 `var(--primary)`, `var(--section-space)`）。

#### 2.3 JS 规范
* **纯原生 JS (Vanilla JS)**: 避免引入复杂的框架或体积庞大的依赖包（如 jQuery）。
* **非阻塞加载**: 所有第三方脚本或数据统计脚本（如不蒜子）均在 HTML 头部使用 `defer` 属性引入。

---

### 3. 双语平行同步规范

本站是**中英双语平行架构**的网站，根目录存放中文页面，`/en/` 目录存放对应的英文页面：
* 当您修改中文页面（如 `index.html`）中的某个 HTML 节点结构或新增了某个卡片时，**必须同时修改** `en/` 目录下对应的英文页面（如 `en/index.html`）。
* 确保两套 HTML 的 Class 命名、元素层级和节点完全一致，仅文字内容有所差异。

---

### 4. Git 提交与分支规范

#### 4.1 Commit 信息规范
我们遵循简化的 Angular 提交信息规范。格式为：`<type>(<scope>): <subject>`。
* `feat`: 新增功能（如添加新项目卡片，增加新证书）。
* `fix`: 修复 Bug（如修复对齐问题，修复暗色模式闪烁）。
* `docs`: 文档更新（如编写架构说明书）。
* `style`: 格式调整（不影响代码逻辑的样式微调）。

**示例**:
```bash
feat(projects): add a new software verification project card
fix(style): resolve hero section alignment on wide screens
```

#### 4.2 提交流程
1. 在本地开发并进行全面测试（验证浅色/深色主题，验证移动端自适应）。
2. 在提交修改前，运行 sitemap 生成脚本更新站点地图（如有新增页面）：
   ```bash
   node scripts/generate-sitemap.js
   ```
3. 提交修改并推送至 `main` 分支。GitHub Pages 将会自动拉取最新代码并完成构建上线。
