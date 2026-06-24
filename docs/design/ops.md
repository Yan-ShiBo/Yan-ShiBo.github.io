# 部署与运维手册

本文是 `Yan-ShiBo.github.io` 个人主页的部署、验证、发布、回滚和故障排查手册。  
本站通过 GitHub Pages 托管，根目录即发布目录，无后端服务、无数据库、无登录系统、无正式构建流水线。运维重点不是服务器维护，而是 **静态资源路径、双语页面一致性、SEO 元数据、sitemap、图片体积、第三方统计降级、移动端交互和 Git 工作区安全**。

任何维护者或 AI Agent 在执行部署、批量修改、回滚、资源替换前，必须先阅读：

1. `docs/design/issues_and_fixes.md`
2. `docs/onboarding.md`
3. `docs/design/architecture.md`
4. `docs/design/design.md`
5. `docs/design/testing.md`
6. 本文

不得在未检查仓库状态的情况下执行 `git restore`、`git reset`、`git clean` 或覆盖式批量脚本。

---

## 1. 部署架构

| 项 | 当前值 |
| --- | --- |
| 托管平台 | GitHub Pages |
| 线上地址 | `https://yan-shibo.github.io` |
| 仓库 | `Yan-ShiBo/Yan-ShiBo.github.io` |
| 生产分支 | `main` |
| 发布目录 | 仓库根目录 |
| 后端服务 | 无 |
| 数据库 | 无 |
| 登录 / 表单 | 无 |
| 构建步骤 | 无正式构建，仅运行 sitemap 生成脚本 |
| 主要样式 | `assets/css/site.css` |
| 主要交互 | `assets/js/site.js`、`assets/js/stats.js` |
| sitemap | `sitemap.xml`，由 `scripts/generate-sitemap.js` 生成 |
| HTTPS | GitHub Pages 自动提供 |
| 访问统计 | Busuanzi / Vercount，第三方失败时降级 |

本站部署模型很简单：提交静态文件到 `main` 后，由 GitHub Pages 自动发布。  
因此真正需要控制的是 **提交前检查质量**，而不是服务器端配置。

---

## 2. 运维边界

### 2.1 本站没有的东西

本站没有：

- 后端 API。
- 数据库。
- 用户登录。
- 评论系统。
- 表单提交。
- 服务端日志。
- 自有统计服务。
- npm 构建依赖。
- React / Vue / Tailwind / Vite / Webpack。

因此不要引入下列运维复杂度：

- 不新增 `.env`。
- 不新增服务器部署脚本。
- 不新增数据库迁移文档。
- 不新增 API 网关或反向代理说明。
- 不把纯静态站点改成必须构建后才能部署。

### 2.2 本站真正需要维护的对象

| 类型 | 关键文件 |
| --- | --- |
| 页面 | `*.html`、`en/*.html` |
| 样式 | `assets/css/site.css` |
| 交互 | `assets/js/site.js` |
| 统计 | `assets/js/stats.js` |
| 图标 | `assets/icons/`、`manifest.webmanifest` |
| 图片 | `assets/images/`、`assets/images/proofs/`、`assets/profile/` |
| PDF | `docs/*.pdf` |
| sitemap | `scripts/generate-sitemap.js`、`sitemap.xml` |
| 文档 | `docs/onboarding.md`、`docs/design/*.md` |
| 行尾规范 | `.gitattributes` |

---

## 3. Agent / 维护者操作前检查

### 3.1 本地工作区操作前

在任何本地修改前，先运行：

```bash
git status --short
git diff --stat
git diff --check
```

如果看到未提交或未跟踪文件：

- 不得执行 `git restore`。
- 不得执行 `git reset --hard`。
- 不得执行 `git clean -fd`。
- 不得运行全站覆盖脚本。
- 必须先确认这些文件是否是用户刚刚新增的成果。

### 3.2 GitHub Connector 操作前

如果通过 GitHub 工具直接更新仓库文件：

1. 先 `fetch_file` 获取目标文件最新内容和 SHA。
2. 只更新用户明确要求的文件。
3. 不得用本地旧版本覆盖线上新版本。
4. 不得同时并行更新同一个文件。
5. 大规模改动优先创建分支和 PR，不直接写入 `main`。

### 3.3 禁止的高危操作

```bash
git reset --hard
git clean -fd
git restore .
```

以上命令只有在用户明确确认、且已经备份未提交文件后才能执行。

---

## 4. 本地预览

推荐使用 Python 静态服务器，避免直接双击 HTML 时出现相对路径、PDF、iframe、模块脚本或浏览器安全策略差异。

```bash
python -m http.server 8000 --bind 127.0.0.1
```

常用访问地址：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/en/
http://127.0.0.1:8000/profile.html
http://127.0.0.1:8000/research.html
http://127.0.0.1:8000/projects.html
http://127.0.0.1:8000/resume.html
http://127.0.0.1:8000/analytics.html
http://127.0.0.1:8000/404.html
```

HTTP 200 只表示文件能打开，不代表布局、交互、SEO、主题、lightbox 或统计都正常。

---

## 5. 发布前验证

### 5.1 最低命令

每次发布前至少运行：

```bash
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

含义：

| 命令 | 目的 |
| --- | --- |
| `node --check assets/js/site.js` | 检查主题、抽屉、lightbox 等主交互脚本语法 |
| `node --check assets/js/stats.js` | 检查统计脚本语法 |
| `node --check scripts/generate-sitemap.js` | 检查 sitemap 生成脚本语法 |
| `node scripts/generate-sitemap.js` | 更新 `sitemap.xml` |
| `git diff --check` | 检查 trailing whitespace、CRLF/LF 混乱等问题 |

### 5.2 页面探活

本地启动服务后，至少访问：

```text
/
en/
profile.html
en/profile.html
research.html
en/research.html
projects.html
en/projects.html
resume.html
en/resume.html
analytics.html
en/analytics.html
404.html
en/404.html
sitemap.xml
```

### 5.3 人工检查最低矩阵

| 检查项 | 必查页面 |
| --- | --- |
| 首页 Hero 和入口 | `/`、`/en/` |
| 档案页时间线和证明图 | `profile.html`、`en/profile.html` |
| 研究方法链 | `research.html`、`en/research.html` |
| 项目卡片和证明图 | `projects.html`、`en/projects.html` |
| PDF 预览和下载 | `resume.html`、`en/resume.html` |
| 统计加载和降级 | `analytics.html`、`en/analytics.html` |
| 404 noindex 和跳转 | `404.html`、`en/404.html` |
| 移动端抽屉 | 任意中文页和英文页 |
| 深色主题 | 首页、档案页、统计页 |
| Lightbox | 档案页、项目页、简历页 |

### 5.4 视口检查

至少检查：

```text
390px   常见手机
834px   导航切换临界点
1366px  常见笔记本
1920px  宽屏
```

重点确认：

- 没有全局横向滚动条。
- 移动抽屉能打开和关闭。
- 证明图 caption 不溢出。
- 英文长标题不撑破卡片。
- Hero 和 section 轨道在宽屏下对齐。
- 深色主题下状态提示可读。

---

## 6. sitemap 维护

### 6.1 何时重新生成

以下情况必须运行：

```bash
node scripts/generate-sitemap.js
```

触发条件：

- 新增页面。
- 删除页面。
- 重命名页面。
- 修改 `scripts/generate-sitemap.js` 中的 `pagePairs`。
- 修改页面内容后希望更新搜索引擎看到的 `lastmod`。
- 批量更新中英文页面后准备发布。

### 6.2 验证点

检查 `sitemap.xml`：

- 不应有重复 `<loc>`。
- 每个中文 URL 应有 `zh-CN`、`en`、`x-default` alternate。
- 每个英文 URL 应有对应 alternate。
- `<lastmod>` 应来自页面自身 HTML 的修改时间，不应全部相同。
- 不要把 404 当成普通内容页推广。

### 6.3 新增页面流程

新增 `new-page.html` 时：

1. 新增中文页面 `new-page.html`。
2. 新增英文页面 `en/new-page.html`。
3. 更新所有导航或相关入口。
4. 更新语言切换链接。
5. 更新 canonical 和 hreflang。
6. 更新 `scripts/generate-sitemap.js`。
7. 运行 `node scripts/generate-sitemap.js`。
8. 更新 `docs/design/testing.md` 页面矩阵。
9. 更新 `docs/onboarding.md` 项目地图。

---

## 7. 静态资源运维

### 7.1 图片

#### 普通图片

新增普通图片时：

- 使用小写英文。
- 使用连字符。
- 不使用中文、空格和特殊符号。
- 控制体积。
- 写明 `alt`、`width`、`height`。

#### 证明图片

证明图片优先使用双文件策略：

```text
assets/images/proofs/xxx-thumb.webp
assets/images/proofs/xxx-full.webp
```

HTML：

```html
<a class="proof-item" data-lightbox data-caption="说明" href="./assets/images/proofs/xxx-full.webp">
  <img alt="说明" loading="lazy" decoding="async" src="./assets/images/proofs/xxx-thumb.webp" width="720" height="480">
</a>
```

英文页路径通常为：

```text
../assets/images/proofs/xxx-full.webp
../assets/images/proofs/xxx-thumb.webp
```

不要把 20MB、40MB 级别的原图直接作为页面 `<img src>`。

### 7.2 PDF

PDF 路径：

```text
docs/Shibo-Yan-Resume.pdf
docs/Shibo-Yan-Undergraduate-Transcript.pdf
docs/Shibo-Yan-Research-Paper.pdf
```

替换 PDF 时优先保持文件名不变。  
如果必须改名，全站搜索旧文件名，并同步修改：

- 首页材料入口。
- 简历页按钮。
- iframe 预览。
- 英文对应页。
- JSON-LD 或社交预览说明。
- 文档中的路径说明。

### 7.3 图标与 favicon

当前图标策略：

| 文件 | 用途 |
| --- | --- |
| `assets/icons/site.ico` | 浏览器 favicon |
| `assets/icons/brand-mark.png` | 顶部导航品牌标识 |
| `manifest.webmanifest` | PWA / 添加到主屏幕的图标声明 |

维护要求：

- favicon 应保持小尺寸可读。
- brand-mark 不要回退到 Font Awesome terminal 字符。
- 替换 `site.ico` 后用无痕窗口或强制刷新测试。
- 如果新增 SVG、192、512、apple-touch-icon，需要同步更新 HTML head 和 manifest。

### 7.4 字体

当前字体策略：

- Inter 字体文件放在 `assets/fonts/inter/`。
- `@font-face` 写在 `assets/css/site.css` 顶部。
- 不再单独引用 `fonts.css`。
- 不引入 Google Fonts。
- 使用 `font-display: swap`。

故障排查时，如果出现字体异常，先检查：

- `assets/css/site.css` 是否仍包含 `@font-face`。
- `assets/fonts/inter/*.woff2` 是否存在。
- HTML 是否误加了不存在的 `fonts.css`。
- 是否误引入远程字体 CSS。

### 7.5 Font Awesome

Font Awesome 是本地图标字体。

根目录页面应引用：

```html
<link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>
```

英文页面应引用：

```html
<link href="../assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>
```

不要用 emoji 或新图标库临时替代 Font Awesome。

---

## 8. 第三方统计运维

### 8.1 当前设计

统计相关页面：

```text
index.html
en/index.html
analytics.html
en/analytics.html
```

统计脚本：

```text
assets/js/stats.js
```

统计服务：

- Busuanzi 候选脚本。
- Vercount。
- 当前浏览器本地 `localStorage` 记录。

### 8.2 运维原则

- 统计不是核心功能。
- 统计失败时页面仍应正常阅读。
- 不在 HTML 中同步写入外部统计脚本。
- 第三方统计脚本应由 `stats.js` 在 `window.load` 后懒加载。
- 非统计页不应加载 `stats.js`。
- 非统计页不应保留无意义统计域名 preconnect。

### 8.3 统计故障判断

如果页面显示 `--`：

可能原因：

- 广告拦截。
- 第三方服务波动。
- 网络策略拦截。
- DOM id 缺失。
- `stats.js` 未加载。

只要页面主体可读、导航正常、PDF 可打开，统计失败不是 P0 故障。

---

## 9. 发布步骤

### 9.1 推荐提交拆分

不要把所有修改混到一个提交。建议拆分：

```text
docs: update operations guide
fix(profile): sync English graduate proof cards
perf(images): add compressed proof webp assets
fix(seo): normalize page head metadata
style(profile): extract project card styles
chore(sitemap): regenerate sitemap
```

### 9.2 发布流程

1. 阅读 `issues_and_fixes.md`。
2. 检查 `git status --short`。
3. 完成目标修改。
4. 同步中文和英文页面。
5. 更新相关文档。
6. 运行最低验证命令。
7. 本地服务人工检查。
8. 确认 `git diff --stat` 没有大量无意义行尾 diff。
9. 提交。
10. 推送到 GitHub。
11. 等待 GitHub Pages 部署。
12. 线上无痕窗口验收。

### 9.3 推送前检查

```bash
git status --short
git diff --stat
git diff --check
```

重点确认：

- 没有误提交临时文件。
- 没有 `*.bak`、截图草稿、系统缓存。
- 没有行尾污染。
- 没有超大原图。
- sitemap 是预期变化。
- 中英文页面成对变化。

---

## 10. 发布后验证

发布完成后，用无痕窗口访问：

```text
https://yan-shibo.github.io/
https://yan-shibo.github.io/en/
https://yan-shibo.github.io/profile.html
https://yan-shibo.github.io/en/profile.html
https://yan-shibo.github.io/research.html
https://yan-shibo.github.io/projects.html
https://yan-shibo.github.io/resume.html
https://yan-shibo.github.io/en/resume.html
https://yan-shibo.github.io/analytics.html
https://yan-shibo.github.io/404.html
https://yan-shibo.github.io/sitemap.xml
```

检查：

- 页面不是旧缓存。
- CSS 正常。
- Font Awesome 图标正常。
- brand-mark 正常。
- favicon 可见。
- PDF 能打开。
- 中英文切换正确。
- 主题切换后刷新仍保持。
- 移动端菜单能打开和关闭。
- Lightbox 可打开和关闭。
- 统计失败时页面仍可正常阅读。
- 404 页面 5 秒后跳转正确。

### 10.1 缓存处理

如果看不到更新：

1. 用无痕窗口打开。
2. `Ctrl + F5` 强制刷新。
3. 检查 GitHub Pages 部署是否完成。
4. 检查文件路径大小写是否正确。
5. 对 favicon，浏览器缓存更顽固，必要时换浏览器或临时访问 icon 文件确认。

---

## 11. 回滚策略

### 11.1 原则

优先使用：

```bash
git revert <commit>
```

不优先使用：

```bash
git reset --hard
git push --force
```

原因：

- `revert` 保留历史，可审计。
- `reset --hard` 容易丢本地工作。
- `force push` 会破坏协作者历史。

### 11.2 线上严重故障回滚

如果上线后出现 P0 问题，例如首页白屏、导航完全不可用、CSS 404、大量页面 404：

1. 确认问题 commit。
2. 新建 revert 提交。
3. 推送 `main`。
4. 等待 GitHub Pages 重新部署。
5. 无痕窗口验证。
6. 把事故写入 `docs/design/issues_and_fixes.md`。

### 11.3 局部故障修复

如果只是单页文案错、图片错、PDF 链接错，优先做前向修复提交，不必回滚整个版本。

### 11.4 回滚前安全检查

```bash
git status --short
```

如果有未提交文件，先停止并备份。不得直接回滚。

---

## 12. 故障排查

### 12.1 首页白屏或加载很久

可能原因：

- 外部字体 CSS 被重新引入。
- 第三方统计脚本同步加载。
- CSS 文件路径错误。
- 超大首屏图片阻塞。
- JS 语法错误提前中断。

排查：

1. 打开 DevTools Network。
2. 看是否请求 `fonts.googleapis.com`。
3. 看是否有外部统计脚本在 load 前阻塞。
4. 看 `assets/css/site.css` 是否 200。
5. 看 Console 是否有 JS 语法错误。

处理：

- 移除远程字体。
- 统计脚本改回 `window.load` 后懒加载。
- 修复资源路径。
- 恢复本地 Inter 字体策略。

---

### 12.2 CSS 没加载或页面裸奔

可能原因：

- `assets/css/site.css` 路径错误。
- 英文页忘记使用 `../assets/css/site.css`。
- GitHub Pages 区分大小写，文件名大小写不一致。
- 文件未提交。

处理：

- 根目录页使用 `./assets/css/site.css`。
- 英文页使用 `../assets/css/site.css`。
- 确认文件名大小写。
- 检查 Network 404。

---

### 12.3 Font Awesome 图标显示方框

可能原因：

- Font Awesome CSS 路径错误。
- 字体文件缺失。
- `<head>` 批量重组时漏掉 CSS。
- 英文页相对路径错误。

处理：

根目录页面：

```html
<link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>
```

英文页面：

```html
<link href="../assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>
```

---

### 12.4 brand-mark 不显示

可能原因：

- `assets/icons/brand-mark.png` 不存在。
- CSS 中 `.brand-mark` 背景图路径错误。
- 文件名大小写错误。
- 被内联样式覆盖。
- 图片透明度或对比度不合适。

处理：

- 检查 Network 中 `brand-mark.png`。
- 检查 CSS 是否仍有 `background-image:url('../icons/brand-mark.png')`。
- 不要恢复旧 Font Awesome terminal 注入。

---

### 12.5 favicon 不更新

可能原因：

- 浏览器 favicon 缓存。
- `assets/icons/site.ico` 没有被替换。
- HTML head favicon 路径错误。
- manifest 仍引用旧路径。
- GitHub Pages 尚未部署完成。

处理：

1. 访问 `https://yan-shibo.github.io/assets/icons/site.ico`。
2. 用无痕窗口测试。
3. `Ctrl + F5` 强制刷新。
4. 换浏览器测试。
5. 确认 `manifest.webmanifest` 图标路径。

---

### 12.6 统计显示 `--`

可能原因：

- 第三方统计脚本被广告拦截器屏蔽。
- Busuanzi 或 Vercount 服务不可用。
- 页面缺少隐藏计数 span。
- 页面缺少可见统计 id。
- `stats.js` 没有加载。

排查：

1. 打开 Network。
2. 检查 `events.vercount.one`、`busuanzi`、`cdn.jsdelivr.net` 请求状态。
3. 检查页面是否有：
   - `#site-pv`
   - `#site-uv`
   - `#page-pv`
   - `#stats-status`
4. 检查隐藏计数节点。
5. 查看 Console。

处理：

- 第三方被拦截属于可接受降级。
- DOM 缺失则按 `architecture.md` 的 DOM 契约补齐。
- 不要因统计失败阻塞发布。

---

### 12.7 深色主题刷新闪烁或不保存

可能原因：

- `ysb-theme` 键名写错。
- CSS 使用旧 `.dark`。
- `site.js` 未加载。
- `<html>` 没有更新 `data-theme`。

排查：

- LocalStorage 中应有 `ysb-theme`。
- `<html>` 应有 `data-theme="dark"` 或 `data-theme="light"`。
- CSS 应使用 `:root[data-theme="dark"]`。

处理：

- 不恢复 `localStorage.theme` 或 `.dark` 方案。
- 修复 `site.js` 路径。
- 检查 CSP 或脚本错误。

---

### 12.8 移动端菜单打不开或关不上

可能原因：

- `data-menu-toggle` 缺失。
- `data-drawer` 缺失。
- `data-drawer-backdrop` 缺失。
- `data-menu-close` 缺失。
- 抽屉关闭状态缺少 `inert`。
- CSS 覆盖了 `pointer-events`。

排查：

1. 390px 视口打开页面。
2. 点击菜单按钮。
3. 检查 `<body>` 是否有 `menu-open`。
4. Escape 是否关闭。
5. Tab 是否被限制在抽屉内。

处理：

- 参考正常页面复制完整 header/drawer 结构。
- 不在单页新写另一套菜单脚本。
- 不删除 inert / focus trap 逻辑。

---

### 12.9 移动端出现横向溢出

可能原因：

- 英文长词未换行。
- 按钮文字太长。
- 图片、iframe、表格固定宽度。
- 新卡片没有响应式规则。
- proof-grid 变体未覆盖。

排查：

- 390px 检查首页、档案页、项目页、简历页。
- DevTools 搜索导致横向滚动的元素。
- 检查是否有固定 `width`、`min-width`。

处理：

- 优先修组件响应式规则。
- 不用全站缩小字体掩盖问题。
- 英文长词可用 `overflow-wrap` 或合理换行。

---

### 12.10 证明图片点击没有 Lightbox

可能原因：

- 链接缺少 `data-lightbox`。
- 页面未加载 `site.js`。
- `href` 路径错误。
- 图片被普通 `<img>` 包裹，没有外层 `<a>`。

正确结构：

```html
<a class="proof-item" data-lightbox data-caption="证明说明" href="./assets/images/proofs/example-full.webp">
  <img alt="证明说明" src="./assets/images/proofs/example-thumb.webp" width="720" height="480" loading="lazy" decoding="async">
</a>
```

英文页路径通常使用 `../assets/images/...`。

---

### 12.11 PDF 无法打开

可能原因：

- 文件名改动。
- 相对路径错误。
- PDF 未提交。
- 大小写不一致。
- iframe 被浏览器限制。

排查：

```text
docs/Shibo-Yan-Resume.pdf
docs/Shibo-Yan-Undergraduate-Transcript.pdf
docs/Shibo-Yan-Research-Paper.pdf
```

处理：

- 替换 PDF 优先保持文件名不变。
- 必须改名时全站搜索旧文件名。
- iframe 失败时页面必须保留下载链接。

---

### 12.12 sitemap 不更新

可能原因：

- 忘记运行生成脚本。
- 新页面未加入 `pagePairs`。
- 输出文件未提交。
- 文件修改时间未变化。

处理：

```bash
node scripts/generate-sitemap.js
```

然后检查 `sitemap.xml`。

---

### 12.13 404 页面跳转错误

当前行为：

- 中文 `404.html` 5 秒后跳 `/`。
- 英文 `en/404.html` 5 秒后跳 `/en/`。

修改 404 时必须保留：

- noindex。
- 正确语言跳转。
- 返回首页按钮。
- 倒计时逻辑。
- 不加入普通内容页 canonical 策略。

---

### 12.14 线上显示旧版本

可能原因：

- GitHub Pages 尚未部署完成。
- 浏览器缓存。
- Service Worker 不存在，但 favicon / CSS 仍可能被浏览器缓存。
- 访问了错误路径。
- DNS 或 CDN 边缘缓存短暂延迟。

处理：

1. 等待 GitHub Pages 部署完成。
2. 无痕窗口打开。
3. `Ctrl + F5`。
4. 访问具体资源文件确认。
5. 查看 GitHub Pages 部署记录。

---

## 13. GitHub Pages 部署故障

### 13.1 部署没有触发

可能原因：

- 没有推送到 Pages 使用的分支。
- 仓库 Pages 设置变更。
- 提交只在本地未 push。
- GitHub Pages 暂时延迟。

处理：

- 检查仓库 Settings → Pages。
- 检查分支是否为 `main`。
- 检查最新 commit 是否在线上仓库存在。
- 查看 Pages build and deployment 记录。

### 13.2 部署成功但页面 404

可能原因：

- 文件名大小写错误。
- 链接路径错误。
- GitHub Pages 对根路径和子路径解析不同。
- 英文页面相对路径写错。

处理：

- 确认目标 HTML 文件存在。
- 根目录使用 `./`，英文目录使用 `../`。
- 对 public URL 逐个打开验证。

### 13.3 资源 404

可能原因：

- 文件未提交。
- 路径大小写不一致。
- 英文页面路径少了 `../`。
- 资源被移动但页面未同步。

处理：

- DevTools Network 找到 404 文件。
- 在仓库中确认文件存在。
- 全站搜索旧路径。
- 修复中英文对应页。

---

## 14. 文档运维

### 14.1 文档位置

当前文档体系应保持：

```text
docs/onboarding.md
docs/design/architecture.md
docs/design/design.md
docs/design/style_guide.md
docs/design/testing.md
docs/design/ops.md
docs/design/issues_and_fixes.md
docs/design/glossary.md
```

不建议恢复：

```text
docs/api/
docs/db/
docs/compliance/
docs/user/
```

除非项目从静态站点变成有后端的数据系统。

### 14.2 文档更新原则

修改代码后，如果涉及以下内容，必须同步更新文档：

| 代码变化 | 需要更新 |
| --- | --- |
| 新页面 / 路由 | architecture、testing、onboarding、sitemap |
| 新组件 | design、style_guide、testing |
| 新交互 | architecture、testing、issues_and_fixes |
| 新统计服务 | architecture、ops、testing、privacy 描述 |
| 新资源策略 | architecture、design、ops |
| 重大事故 | issues_and_fixes |
| 发布流程变化 | ops、onboarding |
| 术语变化 | glossary |

### 14.3 文档一致性搜索

更新文档后搜索：

```text
fonts.css
Google Fonts
terminal
localStorage.theme
.dark
Homepage_files
resource/
img/
```

出现这些词时，判断是否是历史问题记录，还是过时的当前事实描述。

---

## 15. 安全与隐私运维

### 15.1 公开信息边界

当前站点公开展示个人信息和证明材料。维护时应注意：

- 手机号、微信、二维码、证书编号、身份证号、详细住址等属于敏感信息。
- HTML 明文信息容易被爬虫收集。
- PDF 中的信息同样可被索引或下载。
- 证书图片上传前应检查是否需要打码。

### 15.2 建议策略

| 信息 | 建议 |
| --- | --- |
| 邮箱 | 可公开 |
| GitHub | 可公开 |
| 学校和研究方向 | 可公开 |
| 手机号 | 建议只放 PDF，或不放公开 HTML |
| 微信 | 视个人需要，英文页可弱化 |
| 身份证号 / 住址 | 不公开 |
| 证书编号 | 可按需要打码 |
| 二维码 | 谨慎公开 |

### 15.3 安全漏洞

安全策略建议单独放在：

```text
SECURITY.md
```

本文只记录运维处理流程，不承载完整安全政策正文。

---

## 16. 常见维护任务

### 16.1 更新学术科研模块

涉及页面：

```text
profile.html
en/profile.html
resume.html
en/resume.html
```

检查：

- 论文状态是否准确。
- 中文和英文是否同步。
- 未投稿计划是否写得过满。
- CCF 分类是否可靠。
- JSON-LD 是否需要更新。
- PDF 简历是否同步。

### 16.2 更新项目与实践模块

涉及：

```text
profile.html
en/profile.html
projects.html
en/projects.html
assets/css/site.css
```

检查：

- 档案页是否只保留摘要。
- 正式项目是否应迁移到项目页。
- 技术栈标签是否过多。
- 中英文结构是否对称。
- 不使用内联样式。

### 16.3 新增证明图片

流程：

1. 压缩图片。
2. 生成 thumb/full。
3. 放入 `assets/images/proofs/`。
4. 中文页增加 proof item。
5. 英文页增加对应 proof item。
6. 检查 lightbox。
7. 检查移动端。
8. 检查图片大小。
9. 更新文档或测试清单。

### 16.4 替换头像

优先覆盖：

```text
assets/profile/photo.jpg
```

然后检查：

- 首页。
- 档案页。
- 简历页。
- OG image。
- JSON-LD image。
- 图片尺寸和体积。

### 16.5 替换 favicon / brand-mark

检查：

```text
assets/icons/site.ico
assets/icons/brand-mark.png
manifest.webmanifest
所有 HTML head favicon link
```

发布后用无痕窗口和强制刷新验证。

### 16.6 修改导航

涉及所有 14 个 HTML 页面。

必须同步：

- 桌面导航。
- 移动抽屉。
- 当前页 `aria-current`。
- 语言切换。
- sitemap。
- testing 文档。

### 16.7 修改主题或颜色

涉及：

```text
assets/css/site.css
assets/js/site.js
docs/design/design.md
docs/design/style_guide.md
docs/design/testing.md
```

检查：

- 浅色主题。
- 深色主题。
- `status-note`。
- `tile-dark`。
- 按钮。
- 标签。
- proof caption。
- visited links。

---

## 17. 运维事故记录模板

线上出现新问题时，先止血，再记录到 `issues_and_fixes.md`。

```markdown
## X-N. 问题标题

**来源**：线上观察 / 用户反馈 / 本地测试 / Agent 事故  
**严重级别**：P0 / P1 / P2 / P3  
**状态**：待修复 / 已修复 / 需观察 / 禁止复现  
**涉及文件**：`path/to/file`

### 现象

用户或维护者看到的具体问题。

### 根因

真实技术原因。

### 修复方式

具体修改了什么。

### 防退化检查

以后如何验证不会复现。
```

---

## 18. 最终发布口令

发布前确认：

```text
我已经阅读 issues_and_fixes。
我已经检查 git status。
我没有覆盖用户未提交成果。
我没有用正则解析嵌套 HTML。
我已经同步中文和英文页面。
我已经运行 node --check。
我已经重新生成 sitemap。
我已经运行 git diff --check。
我已经本地打开关键页面。
我知道哪些内容尚未验证。
```
