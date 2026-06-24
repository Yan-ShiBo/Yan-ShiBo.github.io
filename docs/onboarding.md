# 开发者与 AI 助手上手指南

本文面向站点维护者和 AI 编码助手。目标是在改动前快速理解当前站点，明确修改边界、同步规则、验证流程和禁止操作，避免破坏双语结构、响应式布局、证明材料链路、SEO 元数据和性能约束。

本项目是 **GitHub Pages 托管的双语研究型静态站点**。它不是需要构建工具的前端应用，也不是通用模板站点。所有修改都应服从一个原则：先保证信息可信、结构稳定、资源可访问，再考虑视觉细节。

---

## 1. 当前站点事实

| 项目 | 当前约定 |
| --- | --- |
| 站点类型 | 双语研究型个人主页 |
| 技术栈 | HTML5 + CSS3 + Vanilla JavaScript |
| 部署方式 | GitHub Pages 直接托管根目录静态文件 |
| 构建工具 | 无构建流程；不需要 npm install |
| 中文页面 | 根目录 HTML |
| 英文页面 | `en/` 目录下对应 HTML |
| 核心样式 | `assets/css/site.css` |
| 核心交互 | `assets/js/site.js` |
| 统计逻辑 | `assets/js/stats.js` |
| 字体策略 | 字体文件本地存放在 `assets/fonts/`，`@font-face` 规则写在 `site.css` 顶部 |
| 第三方统计 | 不直接写入 HTML；由 `stats.js` 在页面 load 后延迟加载 |
| 证明图片 | 优先使用 `thumb.webp` + `full.webp` 双文件策略 |
| Sitemap | 由 `scripts/generate-sitemap.js` 生成 |

禁止把项目改成依赖构建工具、模板引擎、数据库或后端服务的形式。当前站点的优势是静态、可审查、可直接部署。

---

## 2. 建议阅读顺序

修改前按下面顺序阅读，尤其是由 AI 助手执行修改时，不要直接跳到目标 HTML 文件。

1. `docs/design/architecture.md`：理解站点目标、页面职责、系统结构、外部集成和维护约束。
2. `docs/design/issues_and_fixes.md`：查看历史问题和防退化规则，避免重复犯错。
3. `docs/design/design.md`：理解视觉方向、组件语义和页面节奏。
4. `docs/design/style_guide.md`：修改 CSS 前阅读。
5. `docs/design/testing.md`：确认测试范围、响应式断点和页面级检查项。
6. `docs/design/ops.md`：了解部署、缓存、统计服务和故障排查。
7. `docs/design/glossary.md`：统一研究术语、页面术语和中英文表述。
8. 当前要修改的 HTML、CSS、JS、图片或文档文件。

如果文档和代码发生冲突，以当前线上真实代码为准，同时更新文档，不能只改代码不改说明。

---

## 3. 项目地图

| 路径 | 说明 | 修改时的同步对象 |
| --- | --- | --- |
| `index.html` | 中文首页：身份、研究主线、材料入口 | `en/index.html` |
| `en/index.html` | 英文首页 | `index.html` |
| `profile.html` | 中文档案页：阶段经历、科研、项目、证明图 | `en/profile.html` |
| `en/profile.html` | 英文档案页 | `profile.html` |
| `research.html` | 中文研究方向页：方法链与研究叙述 | `en/research.html` |
| `en/research.html` | 英文研究方向页 | `research.html` |
| `projects.html` | 中文项目展示页 | `en/projects.html` |
| `en/projects.html` | 英文项目展示页 | `projects.html` |
| `resume.html` | 中文简历与材料页 | `en/resume.html` |
| `en/resume.html` | 英文简历与材料页 | `resume.html` |
| `analytics.html` | 中文访问统计页 | `en/analytics.html` |
| `en/analytics.html` | 英文访问统计页 | `analytics.html` |
| `404.html` | 中文 404 页 | `en/404.html` |
| `en/404.html` | 英文 404 页 | `404.html` |
| `assets/css/site.css` | 全站唯一核心 CSS，包含本地字体声明和组件样式 | 所有 HTML |
| `assets/js/site.js` | 主题、抽屉、lightbox、anchor、返回顶部、滚动显现 | 所有 HTML |
| `assets/js/stats.js` | 公开统计和本地访问记录 | `index.html`、`analytics.html` 及英文对应页 |
| `assets/images/` | 通用图片、证明材料、项目材料 | 所有引用页面 |
| `assets/images/proofs/` | 证明图片推荐目录，适合存放 thumb/full 版本 | 档案页、简历页、项目页 |
| `assets/profile/` | 头像等个人资料资源 | 首页、档案页、简历页 |
| `assets/icons/` | favicon、manifest 图标 | 所有页面 head、manifest |
| `assets/fonts/` | 本地字体文件 | `site.css` |
| `docs/` | PDF 简历、成绩单、论文等下载材料 | 首页、简历页、档案页 |
| `scripts/generate-sitemap.js` | sitemap 生成脚本 | `sitemap.xml` |
| `docs/design/` | 架构、设计、测试、运维和问题文档 | 维护流程 |

---

## 4. 本地预览

不要直接双击 HTML 文件。直接打开文件时，PDF、相对路径、统计脚本、移动端交互和部分浏览器安全策略可能表现不同。

推荐在仓库根目录启动 HTTP 服务：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

常用入口：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/en/
http://127.0.0.1:8000/profile.html
http://127.0.0.1:8000/en/profile.html
http://127.0.0.1:8000/resume.html
http://127.0.0.1:8000/en/resume.html
http://127.0.0.1:8000/analytics.html
http://127.0.0.1:8000/404.html
```

可选工具：

```bash
# Node 环境下的轻量静态服务器
npx http-server . -p 8000
```

不要为了本地预览引入 Vite、Webpack、React、Vue 或其他构建体系。

---

## 5. 修改前检查

每次修改前先执行：

```bash
git status --short
```

如果存在未提交修改，先判断这些修改是否属于当前任务。不要在不了解工作区状态的情况下执行 `git restore`、`git reset`、批量格式化或全局替换。

建议再执行：

```bash
git diff --stat
git diff --check
```

检查点：

1. 是否存在大面积无意义 diff。
2. 是否存在 CRLF 与 LF 混杂导致的整文件变更。
3. 是否存在 trailing whitespace。
4. 是否有未跟踪的大图片、PDF 或临时文件。
5. 当前任务是否会覆盖用户手动修改。

如果需要统一行尾，先确保 `.gitattributes` 存在：

```gitattributes
* text=auto eol=lf

*.png binary
*.jpg binary
*.jpeg binary
*.webp binary
*.ico binary
*.pdf binary
*.woff binary
*.woff2 binary
*.ttf binary
*.otf binary
*.eot binary
```

然后单独执行规范化提交，不要把行尾修复和内容改动混在一起：

```bash
git add .gitattributes
git add --renormalize .
git diff --check
```

---

## 6. 修改流程

### 6.1 通用流程

1. 明确任务类型：内容、样式、交互、统计、资源、文档、SEO、性能或部署。
2. 找到中文页面和英文对应页面。
3. 检查当前页面的 `<head>`、正文结构、图片路径、按钮链接和 JSON-LD。
4. 修改中文页面。
5. 同步修改英文页面。
6. 如果新增或删除页面，更新 `scripts/generate-sitemap.js` 并重新生成 `sitemap.xml`。
7. 如果新增图片，压缩并检查路径。
8. 如果新增样式，写入 `assets/css/site.css`。
9. 如果新增交互，写入 `assets/js/site.js` 或 `assets/js/stats.js`，不要写内联脚本。
10. 执行最低验证命令。
11. 本地 HTTP 预览关键页面。
12. 检查浅色、深色、移动端和宽屏显示。

### 6.2 AI 助手修改流程

AI 助手必须遵守更严格流程：

1. 先读相关文档和目标文件，不得直接生成大范围补丁。
2. 修改 HTML 时严禁用正则解析嵌套结构。
3. 只做精确局部替换，或使用真正的 HTML 解析器。
4. 不得为局部样式增加 `style="..."`。
5. 不得只改中文页。
6. 不得删除、重命名或移动资源文件，除非同步所有引用。
7. 不得把无关页面一起格式化。
8. 修改后必须给出实际验证结果，而不是只描述“应该可以”。

---

## 7. HTML 维护规则

### 7.1 页面基本结构

每个页面应保持以下结构：

```html
<!DOCTYPE html>
<html dir="ltr" lang="zh-CN">
<head>
  ...
</head>
<body>
  <a class="skip-link" href="#main-content">跳到正文</a>
  <header class="site-header">...</header>
  <div class="drawer-backdrop" data-drawer-backdrop></div>
  <aside class="drawer" data-drawer id="site-drawer">...</aside>
  <main class="main-shell" id="main-content">...</main>
  <footer class="footer-shell">...</footer>
  <button class="icon-btn back-to-top" data-back-to-top ...>...</button>
</body>
</html>
```

英文页面 `lang="en"`，路径相对层级通常从 `./` 改成 `../`。

### 7.2 `<head>` 必备项

除非是特殊片段页面，每个公开 HTML 页面都应包含：

```html
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>...</title>
<meta name="description" content="..."/>
<meta name="theme-color" content="#ececee"/>
<meta name="color-scheme" content="light dark"/>
<link rel="icon" href="./assets/icons/site.ico" type="image/x-icon"/>
<link rel="manifest" href="./manifest.webmanifest"/>
<link rel="canonical" href="https://yan-shibo.github.io/..."/>
<link rel="alternate" hreflang="zh-CN" href="..."/>
<link rel="alternate" hreflang="en" href="..."/>
<link rel="alternate" hreflang="x-default" href="..."/>
<meta property="og:type" content="..."/>
<meta property="og:title" content="..."/>
<meta property="og:description" content="..."/>
<meta property="og:url" content="..."/>
<meta property="og:site_name" content="ShiBo Yan"/>
<meta property="og:locale" content="zh_CN"/>
<meta property="og:image" content="..."/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="..."/>
<meta name="twitter:description" content="..."/>
<meta name="twitter:image" content="..."/>
<link rel="stylesheet" href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css"/>
<link rel="stylesheet" href="./assets/css/site.css"/>
<script type="application/ld+json">...</script>
<script defer src="./assets/js/site.js"></script>
```

英文页面路径使用 `../assets/...`，canonical 和 alternate 使用线上绝对 URL。

404 页面必须额外包含：

```html
<meta name="robots" content="noindex"/>
```

### 7.3 语义和可访问性

1. 每页只能有一个主要 `<main id="main-content">`。
2. 当前导航链接必须有 `aria-current="page"`。
3. 纯图标按钮必须有 `aria-label`。
4. 仅装饰图标使用 `aria-hidden="true"`。
5. 图片必须有明确 `alt`。
6. Lightbox 图片的 `data-caption` 应与可见说明一致。
7. 不要制造重复 id。
8. 不要用空链接或 `javascript:void(0)` 作为按钮替代。

---

## 8. CSS 维护规则

### 8.1 核心原则

1. 所有全站样式写在 `assets/css/site.css`。
2. 禁止在 HTML 元素上新增 `style="..."`。
3. 优先复用已有组件类，例如 `.surface`、`.panel`、`.info-card`、`.tag`、`.button`、`.proof-grid`。
4. 新组件命名应体现用途，不要写临时类名。
5. 颜色、阴影、圆角、宽度和间距优先使用 CSS 变量。
6. 同时检查浅色主题和深色主题。
7. 不要只为了一个页面创建过度专用的全局选择器。

### 8.2 字体策略

当前策略：

```text
字体文件：assets/fonts/
字体声明：assets/css/site.css 顶部 @font-face
HTML 引用：只引用 site.css，不再单独引用 fonts.css
外部字体服务：禁止使用 Google Fonts 等外部 CSS
```

不要新增：

```html
<link href="https://fonts.googleapis.com/..." rel="stylesheet">
```

不要恢复：

```html
<link href="./assets/css/fonts.css" rel="stylesheet">
```

除非你重新创建并维护 `fonts.css`，并同步修改所有文档。当前默认实现是把 `@font-face` 放在 `site.css`。

### 8.3 响应式断点

主要断点：

```text
1068px：桌面与中等屏幕布局切换
833px：桌面导航与移动抽屉切换
640px：手机布局临界
419px：极窄手机修正
```

修改布局时至少检查：

```text
320px
360px
390px
640px
834px
1366px
1920px
```

---

## 9. JavaScript 维护规则

### 9.1 `site.js`

`assets/js/site.js` 负责：

1. `data-theme` 主题切换。
2. `localStorage.ysb-theme` 持久化。
3. 移动端抽屉打开、关闭和焦点陷阱。
4. 背景区域 `inert` 控制。
5. 返回顶部按钮。
6. 页内 anchor 高亮。
7. 滚动进入动画。
8. 图片 lightbox。
9. 页脚年份自动更新。

修改交互时，必须确认对应 DOM 的 id、class、`data-*` 属性没有变化。

### 9.2 `stats.js`

`assets/js/stats.js` 负责：

1. 公开访问计数。
2. 当前浏览器本地访问记录。
3. 第三方统计服务失败时的降级显示。
4. 在页面 load 之后延迟加载第三方统计脚本。

不要在 HTML 中直接写入第三方统计脚本：

```html
<script src="https://..."></script>
```

即使加了 `async` 或 `defer`，也不要这样做。非核心第三方统计应由 `stats.js` 延迟加载。

### 9.3 JS 验证

每次修改 JS 后运行：

```bash
node --check assets/js/site.js
node --check assets/js/stats.js
```

如果修改 sitemap 生成脚本，再运行：

```bash
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
```

---

## 10. 双语同步规则

本站是中英双语平行架构。根目录是中文页面，`en/` 是英文页面。修改任何公开内容时，都应检查英文对应页。

### 10.1 必须同步的内容

| 中文页 | 英文页 | 同步内容 |
| --- | --- | --- |
| `index.html` | `en/index.html` | 首页身份、研究主线、按钮、材料入口、引用文字、统计卡 |
| `profile.html` | `en/profile.html` | 阶段经历、学术科研、项目与实践、证明图、锚点 |
| `research.html` | `en/research.html` | 方法链、研究叙述、术语、按钮 |
| `projects.html` | `en/projects.html` | 项目卡、技术栈、仓库链接、证明图 |
| `resume.html` | `en/resume.html` | 简历入口、PDF 链接、材料预览、结构化数据 |
| `analytics.html` | `en/analytics.html` | 统计说明、DOM id、状态文案 |
| `404.html` | `en/404.html` | noindex、跳转目标、按钮 |

### 10.2 允许不同的内容

1. 文案语言。
2. 日期表述格式。
3. 中文和英文引文翻译。
4. 相对路径层级。
5. `lang`、`og:locale`、canonical、hreflang。

### 10.3 不允许不同的内容

1. 页面结构层级。
2. 证明图片数量和顺序，除非有明确理由。
3. 关键材料链接。
4. 样式 class。
5. 统计 DOM id。
6. 主题、抽屉、lightbox 所需的 `data-*` 属性。

---

## 11. 资源维护规则

### 11.1 图片命名

使用小写英文、数字和连字符：

```text
academic-innovation-2025-thumb.webp
academic-innovation-2025-full.webp
huawei-cup-2025-thumb.webp
```

不要使用：

```text
中文文件名.png
空 格.jpg
IMG_20250101.PNG
```

### 11.2 证明图片

新增证明图片时优先使用双文件策略：

```text
assets/images/proofs/example-award-2026-thumb.webp
assets/images/proofs/example-award-2026-full.webp
```

建议大小：

```text
thumb：480–720px 宽，WebP，约 40–150KB
full：最长边 1600–2000px，WebP 或 JPEG，约 150–900KB
```

HTML 示例：

```html
<a class="proof-item"
   data-lightbox
   data-caption="证明图说明"
   href="./assets/images/proofs/example-award-2026-full.webp">
  <img alt="证明图说明"
       loading="lazy"
       decoding="async"
       src="./assets/images/proofs/example-award-2026-thumb.webp"
       width="720"
       height="480">
  <div class="proof-caption">
    <strong>奖项名称</strong>
    <span>年份和说明</span>
  </div>
</a>
```

英文页路径通常为：

```html
href="../assets/images/proofs/example-award-2026-full.webp"
src="../assets/images/proofs/example-award-2026-thumb.webp"
```

### 11.3 PDF

优先保持现有文件名：

```text
docs/Shibo-Yan-Resume.pdf
docs/Shibo-Yan-Undergraduate-Transcript.pdf
docs/Shibo-Yan-Research-Paper.pdf
```

如果必须改文件名，全站搜索旧文件名，并检查：

1. 首页材料入口。
2. 档案页下载按钮。
3. 简历页按钮。
4. PDF iframe。
5. 英文对应页。
6. sitemap 和结构化数据是否需要更新。

### 11.4 favicon 与 manifest

当前 favicon 至少应保证：

```text
assets/icons/site.ico
manifest.webmanifest
```

推荐后续补充：

```text
assets/icons/favicon.svg
assets/icons/apple-touch-icon.png
assets/icons/icon-192.png
assets/icons/icon-512.png
```

如果新增图标文件，需要同步更新所有 HTML head 和 `manifest.webmanifest`。

---

## 12. 常见维护任务

### 12.1 修改基本信息

常见信息：

```text
姓名
学校
研究方向
邮箱
GitHub
城市
电话
微信
```

需要检查：

1. `index.html` / `en/index.html`
2. `profile.html` / `en/profile.html`
3. `resume.html` / `en/resume.html`
4. JSON-LD 结构化数据
5. PDF 简历
6. OG / Twitter metadata

建议公开 HTML 中只保留邮箱、GitHub、城市和研究身份。手机号和微信更适合放在 PDF 简历中，不建议长期明文放在网页源码里。

### 12.2 更新 GPA、排名或考研信息

全站搜索旧数字：

```text
3.95
8/124
373
89
169
```

检查首页、档案页、简历页、英文页面、PDF 简历和 JSON-LD。

### 12.3 更新学术科研

研究生阶段学术科研通常在：

```text
profile.html
en/profile.html
resume.html
en/resume.html
research.html
en/research.html
```

建议统一表述：

```text
国家自然科学基金项目参与
一作论文在投
二作论文在投
论文准备中
学术训练
```

未正式投稿的论文不建议公开写具体目标会议。可以写“拟投稿”或“准备中”。

### 12.4 新增研究生项目或实践经历

如果只是档案页中的项目摘要，放在：

```text
profile.html
en/profile.html
```

如果是完整项目展示，放在：

```text
projects.html
en/projects.html
```

新增项目时至少写清：

```text
项目名称
时间
角色
技术栈
核心问题
主要工作
成果或验证状态
材料链接或证明图
```

不要夸大完成度。还在开发中的项目使用“进行中”“面向验证”“闭环验证”等表述，不要写成已经完全成熟交付。

### 12.5 新增证明图片

流程：

1. 压缩图片。
2. 生成 thumb/full 两个版本。
3. 使用英文 kebab-case 命名。
4. 放入 `assets/images/proofs/`。
5. 中文页添加 `proof-item`。
6. 英文页添加对应 `proof-item`。
7. 检查 lightbox。
8. 检查移动端。
9. 检查图片 alt。
10. 检查文件大小。

### 12.6 更新研究方向

主要文件：

```text
research.html
en/research.html
index.html
en/index.html
docs/design/glossary.md
```

新增术语时，应同步补充术语表。

### 12.7 更新访问统计说明

主要文件：

```text
analytics.html
en/analytics.html
assets/js/stats.js
docs/design/architecture.md
docs/design/ops.md
```

如果只是统计服务暂时失败，不需要改页面。页面应显示降级状态，不应阻塞正文阅读。

### 12.8 新增页面

新增页面必须同时新增中文和英文版本：

```text
new-page.html
en/new-page.html
```

同步更新：

1. 所有导航。
2. 移动抽屉导航。
3. 页脚入口，如需要。
4. canonical。
5. hreflang。
6. OG / Twitter 元数据。
7. JSON-LD，如需要。
8. `scripts/generate-sitemap.js`。
9. `sitemap.xml`。
10. `docs/design/architecture.md` 的路由表。
11. `docs/design/testing.md` 的页面测试范围。

---

## 13. SEO 与结构化数据检查

每个公开页面至少检查：

1. `title` 不为空。
2. `description` 不为空。
3. canonical 指向线上绝对 URL。
4. `hreflang` 有 `zh-CN`、`en`、`x-default`。
5. OG 标题、描述、URL、图片存在。
6. Twitter card 存在。
7. JSON-LD 合法。
8. 404 页面有 `noindex`。
9. 语言切换指向对应页面。
10. sitemap 中有对应 URL。

可以用以下方式快速检查 HTML 中的关键字段：

```bash
grep -R "rel=\"canonical\"" -n *.html en/*.html
grep -R "hreflang=\"x-default\"" -n *.html en/*.html
grep -R "application/ld+json" -n *.html en/*.html
grep -R "name=\"robots\" content=\"noindex\"" -n 404.html en/404.html
```

---

## 14. 性能检查

### 14.1 禁止项

1. 禁止外部字体 CSS。
2. 禁止在 HTML 中直接写第三方统计脚本。
3. 禁止上传几十 MB 的证明图片作为页面直接引用资源。
4. 禁止恢复旧目录中的冗余资源。
5. 禁止引入大型前端框架。
6. 禁止在每个页面重复写大段内联 JS 或 CSS。

### 14.2 建议项

1. 图片使用 `loading="lazy"`。
2. 图片使用 `decoding="async"`。
3. 证明图片使用 thumb/full。
4. PDF 不要作为首页首屏直接加载。
5. 第三方统计在 `window.load` 后延迟加载。
6. 不影响正文的功能应允许失败降级。

### 14.3 本地资源检查

可用脚本检查常见本地引用是否缺失：

```bash
python - <<'PY'
from pathlib import Path
import re

root = Path('.')
html_files = list(root.glob('*.html')) + list((root / 'en').glob('*.html'))
patterns = [
    r'href="([^"]+)"',
    r'src="([^"]+)"'
]

missing = []
for file in html_files:
    text = file.read_text(encoding='utf-8', errors='ignore')
    for pat in patterns:
        for m in re.findall(pat, text):
            if m.startswith(('http://', 'https://', 'mailto:', '#', 'javascript:')):
                continue
            if m.startswith('/'):
                target = root / m.lstrip('/')
            else:
                target = (file.parent / m).resolve()
            try:
                target.relative_to(root.resolve())
            except ValueError:
                continue
            if not target.exists():
                missing.append((str(file), m))

for f, m in missing:
    print(f'{f}: missing {m}')

if missing:
    raise SystemExit(1)
PY
```

---

## 15. 最低验证命令

每次提交前至少运行：

```bash
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

如果修改了页面、样式或资源，再启动本地服务器人工检查：

```bash
python -m http.server 8000 --bind 127.0.0.1
```

至少访问：

```text
/
en/
profile.html
en/profile.html
resume.html
en/resume.html
analytics.html
404.html
en/404.html
```

---

## 16. 人工检查清单

### 16.1 全站通用

1. 页面可打开。
2. 没有全局横向滚动条。
3. 顶部导航当前页正确。
4. 移动端抽屉可打开和关闭。
5. Esc 可关闭抽屉。
6. Tab 焦点不会跳到抽屉背后的页面。
7. 主题切换正常。
8. 刷新后主题状态保持。
9. 返回顶部按钮可用。
10. 页脚链接可用。
11. favicon 显示正常。

### 16.2 档案页

1. Anchor bar 跳转后标题不被 sticky header 遮挡。
2. 研究生、本科、高中、初中、小学阶段都可到达。
3. 学术科研内容中英文同步。
4. 项目与实践内容中英文同步。
5. 证明图数量和顺序中英文同步。
6. 每个证明图可打开 lightbox。
7. thumb 图片和 full 图片路径正确。
8. 手机下证明图不造成横向溢出。

### 16.3 研究页

1. 方法链顺序清楚。
2. 研究术语中英文一致。
3. 深色区对比度足够。
4. anchor 跳转位置正确。

### 16.4 项目页

1. 项目卡片完整。
2. 仓库链接可打开。
3. 技术栈标签不溢出。
4. 证明图可打开。
5. 手机下按钮不挤压。

### 16.5 简历页

1. PDF 简历可打开。
2. 成绩单 PDF 可打开。
3. PDF iframe 失败时有 fallback 链接。
4. 材料预览图片可打开。
5. 英文页 head 元数据完整。

### 16.6 统计页

1. 公开统计成功时显示数字。
2. 公开统计失败时显示可读降级文案。
3. 本地访问记录正常。
4. 清理 localStorage 后页面不报错。

### 16.7 404 页

1. 有 noindex。
2. 中文页按钮指向中文入口。
3. 英文页按钮指向英文入口。
4. 倒计时正常。
5. 自动跳转目标正确。

---

## 17. Git 提交规范

### 17.1 提交粒度

推荐拆分：

```text
docs: update onboarding and maintenance rules
fix(html): complete English profile evidence section
fix(seo): add noindex to 404 pages
style(profile): move project card styles into site.css
perf(images): add compressed proof images
chore(line-endings): normalize text files to LF
```

不要把以下内容混在一个提交里：

```text
行尾规范化
图片压缩
页面文案修改
CSS 重构
SEO 修复
文档更新
```

### 17.2 Commit 信息格式

使用简化格式：

```text
<type>(<scope>): <subject>
```

常见类型：

| type | 含义 |
| --- | --- |
| `feat` | 新增页面、模块、项目、证书 |
| `fix` | 修复页面、链接、SEO、交互、响应式问题 |
| `docs` | 文档更新 |
| `style` | CSS 或格式调整 |
| `perf` | 图片压缩、加载优化 |
| `chore` | 维护性改动 |
| `refactor` | 不改变行为的结构整理 |

示例：

```bash
git commit -m "fix(profile): sync graduate evidence in English page"
git commit -m "perf(images): add compressed proof thumbnails"
git commit -m "docs(onboarding): align maintenance guide with current site"
```

---

## 18. 禁止操作

以下操作除非经过明确确认，否则不要执行：

1. 不要只改中文页。
2. 不要只改英文页。
3. 不要新增内联样式。
4. 不要用正则解析嵌套 HTML。
5. 不要删除或重命名 PDF、图片、字体、图标，除非同步所有引用。
6. 不要引入构建工具。
7. 不要引入大型框架。
8. 不要直接在 HTML 中写第三方统计脚本。
9. 不要恢复 `resource/`、`Homepage_files/`、`img/` 等旧目录结构。
10. 不要上传未压缩的大图作为页面直接引用资源。
11. 不要在不知道工作区状态时执行 `git restore`、`git reset`。
12. 不要把手机号、微信等强个人信息扩散到更多页面。
13. 不要把未发生的投稿计划写得过满。
14. 不要让文档和代码长期不一致。
15. 不要提交 `git diff --check` 未通过的补丁。

---

## 19. 快速任务模板

### 19.1 新增一条学术科研经历

检查文件：

```text
profile.html
en/profile.html
resume.html
en/resume.html
```

步骤：

1. 写中文条目。
2. 写英文条目。
3. 检查是否需要更新首页概览。
4. 检查是否需要更新 PDF 简历。
5. 本地预览档案页和简历页。
6. 运行最低验证命令。

### 19.2 新增一个证明材料

步骤：

1. 准备 `thumb.webp` 和 `full.webp`。
2. 放入 `assets/images/proofs/`。
3. 在中文页加入 `proof-item`。
4. 在英文页加入对应 `proof-item`。
5. 检查 lightbox。
6. 检查移动端。
7. 检查文件大小。
8. 运行本地资源缺失检查。

### 19.3 修改 favicon

检查文件：

```text
assets/icons/
manifest.webmanifest
*.html
en/*.html
```

要求：

1. favicon 在 16×16 下可读。
2. `site.ico` 包含 16、32、48 等尺寸。
3. 如新增 SVG 或 PNG 图标，manifest 和 HTML 同步。
4. 浅色和深色标签栏都可见。

### 19.4 更新统计逻辑

检查文件：

```text
assets/js/stats.js
analytics.html
en/analytics.html
index.html
en/index.html
docs/design/architecture.md
docs/design/ops.md
```

要求：

1. 不阻塞首屏。
2. 第三方失败时可降级。
3. 本地记录不依赖第三方。
4. DOM id 中英文一致。

---

## 20. 最终验收标准

一次修改可以认为合格，需要同时满足：

1. `git diff --check` 通过。
2. JS 语法检查通过。
3. `sitemap.xml` 已按需更新。
4. 本地服务器能打开关键页面。
5. 中文和英文对应页同步。
6. 没有缺失本地资源。
7. 没有新增内联样式。
8. 没有新增外部字体 CSS。
9. 没有新增 HTML 直连第三方统计脚本。
10. 证明图可打开，移动端不溢出。
11. 404 页面有 noindex。
12. 文档与当前实现一致。
