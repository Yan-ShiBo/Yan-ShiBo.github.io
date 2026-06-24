# 问题汇总、解决方案与防退化手册

本文是 `Yan-ShiBo.github.io` 个人主页项目的 **问题库、事故复盘、修复记录与 Agent 操作前置约束**。  
任何维护者、AI 助手、Codex、脚本化 Agent 或 GitHub Connector 在修改站点前，必须先完整阅读本文，再开始操作。

本文的目标不是记录普通开发流水账，而是防止下列问题再次发生：

1. 改一处坏一片。
2. 中文页改了，英文页漏改。
3. 局部需求被误扩展为全站重构。
4. 正则错误解析嵌套 HTML，导致结构崩溃。
5. 未检查 Git 状态就回滚，覆盖用户未提交成果。
6. 文档说法与真实代码状态长期不一致。
7. 性能、SEO、无障碍、响应式、证明材料链路出现回归。

---

## 0. Agent 操作前强制阅读规则

### 0.1 强制原则

每次 Agent 准备修改本仓库前，必须先阅读：

1. `docs/design/issues_and_fixes.md`：本文件，最高优先级。
2. `docs/onboarding.md`：维护流程入口。
3. `docs/design/architecture.md`：页面职责、资源架构、DOM 契约。
4. `docs/design/design.md`：视觉合同、组件规则。
5. `docs/design/testing.md`：验证矩阵和回归清单。
6. 当前要修改的目标文件。

不得只凭聊天上下文、记忆或之前生成的片段直接修改仓库。

### 0.2 操作前必须完成的检查

如果在本地工作区操作，先执行：

```bash
git status --short
git diff --stat
git diff --check
```

如果发现未提交或未跟踪文件：

- 不得执行 `git restore`、`git reset`、`git clean`。
- 不得运行覆盖式批处理脚本。
- 必须先向用户说明当前工作区状态。
- 只能进行精确的局部修改，或等待用户确认。

如果通过 GitHub Connector 操作：

- 必须先 `fetch_file` 获取当前文件和 SHA。
- 一次只更新目标文件。
- 不得在不了解最新仓库状态时批量覆盖多个文件。
- 不得把本地旧文件内容直接覆盖线上新文件。

### 0.3 修改方式分级

| 风险等级 | 操作类型 | 允许条件 |
| --- | --- | --- |
| L1 低风险 | 单句文案、单个列表项、单个链接修正 | 精确字符串替换即可 |
| L2 中风险 | 一个卡片、一个证明图、一个页面模块 | 必须同步中英文页，并检查 DOM 层级 |
| L3 高风险 | `<head>`、导航、sitemap、CSS 变量、JS 交互 | 必须执行完整验证命令和人工检查 |
| L4 禁止直接执行 | 全站正则重构、批量 HTML 解析替换、`git restore/reset/clean` | 必须经用户明确确认，并先备份 |

### 0.4 绝对禁止项

- 禁止用正则表达式解析包含嵌套子节点的 HTML 结构。
- 禁止在不检查 `git status` 的情况下执行回滚或清理命令。
- 禁止只修改中文页而不检查英文页。
- 禁止新增 HTML 内联样式。
- 禁止恢复旧目录结构，如 `resource/`、`Homepage_files/`、`img/`。
- 禁止引入远程字体 CSS。
- 禁止把第三方统计脚本同步写入 HTML 阻塞首屏。
- 禁止将几十 MB 原图直接作为页面 `<img src>`。
- 禁止把未发生的论文录用、投稿结果写成事实。
- 禁止用“全站重构”解决局部排版问题。

---

## 1. 当前站点设计不变量

后续任何修改都不能破坏以下约束：

1. 中文根目录页面与 `en/` 英文页面一一对应。
2. 公共页面限定为：`index.html`、`profile.html`、`research.html`、`projects.html`、`resume.html`、`analytics.html`、`404.html`，英文镜像在 `en/`。
3. 共享样式集中在 `assets/css/site.css`。
4. 交互集中在 `assets/js/site.js` 和 `assets/js/stats.js`。
5. 主题状态使用 `<html data-theme="">` 和 `localStorage.ysb-theme`。
6. 移动抽屉关闭时必须 `aria-hidden="true"` 且 `inert`。
7. 证明图必须有 `alt`、`width`、`height`、`loading="lazy"`、`decoding="async"`。
8. 新增或改名页面必须更新 `scripts/generate-sitemap.js` 并重新生成 `sitemap.xml`。
9. 统计脚本失败不得影响页面主体阅读。
10. favicon 和 brand-mark 使用专属几何符号，不回退到旧的 Font Awesome terminal 品牌符号。
11. 字体使用本地 Inter 文件和系统字体栈，不引入 Google Fonts。
12. 提交前必须通过 `git diff --check`。

---

# A. Agent 操作安全类问题

## A-1. 局部排版需求引发级联崩溃与数据丢失

**原编号**：24  
**严重级别**：P0  
**状态**：已复盘，必须永久防退化。

### 现象

用户只提出局部排版微调，例如“右边的个人总结放到左边大面积空白处是不是更好”。Agent 却执行了过度推断，尝试重构整个页面布局，导致 CSS 网格和 HTML 结构崩溃。随后又在未检查状态的情况下执行 `git restore`，使用户未提交的证明图片和 HTML 标签丢失。

### 根因

1. **过度执行**：把局部移动请求误解为全站重构。
2. **错误解析 HTML**：使用正则匹配嵌套 `.info-card`，遇到第一个 `</div>` 就提前截断。
3. **无 Git 状态感知**：没有执行 `git status`，盲目使用 `git restore`。
4. **无备份策略**：未先保存用户新增的 untracked 文件。

### 修复方式

- 恢复页面结构。
- 重新补回丢失内容。
- 将此次事故写入本文件，作为所有 Agent 的最高优先级防退化规则。

### 防退化检查

- 修改 HTML 前先确定修改范围。
- 只做目标元素的精确字符串替换。
- 需要结构化修改时使用真正的 HTML 解析器，例如 BeautifulSoup。
- 不得用正则提取嵌套 HTML。
- 风险操作前必须执行 `git status --short`。
- 如果存在 untracked / modified 文件，不得执行回滚命令。

---

## A-2. 用正则解析嵌套 HTML 造成结构截断

**严重级别**：P0  
**状态**：禁止复现。

### 现象

类似下面的写法会错误截断 HTML：

```python
re.search(r'<div class="info-card">.*?</div>', html, re.S)
```

当 `.info-card` 内部还有多个子 `div` 时，非贪婪匹配会在第一个子 `</div>` 停止，导致后续标签大量丢失。

### 根因

HTML 是树结构，正则不理解嵌套层级。

### 正确方式

允许：

- 精确字符串替换完整已知片段。
- BeautifulSoup / lxml 等解析器。
- 手动定位明确唯一的文本块。
- 小范围插入，不跨越未知嵌套结构。

禁止：

- 用 `.*?` 提取任意嵌套 HTML。
- 用全局正则替换 `div`、`section`、`article`。
- 用脚本“自动重组”整个页面结构。

### 防退化检查

任何 Agent 在脚本中出现以下模式，应停止操作：

```text
<div ...>.*?</div>
<section ...>.*?</section>
<article ...>.*?</article>
```

---

## A-3. 未检查 Git 状态就回滚导致用户成果丢失

**严重级别**：P0  
**状态**：禁止复现。

### 现象

Agent 修改失败后直接执行：

```bash
git restore profile.html
git reset --hard
git clean -fd
```

导致用户未提交、未跟踪的图片和 HTML 变更丢失。

### 根因

没有区分“仓库中已跟踪旧内容”和“用户本地新增成果”。

### 正确流程

执行任何回滚前，必须先运行：

```bash
git status --short
git diff --stat
```

如果存在未提交内容：

1. 停止。
2. 向用户说明风险。
3. 建议先备份或提交。
4. 只针对明确文件做局部恢复。
5. 不得执行 `git clean -fd`。

### 防退化检查

- 不允许 Agent 自主执行破坏性 Git 命令。
- 不允许把“恢复到仓库状态”作为默认修复策略。
- 如果必须回滚，先复制目标文件到备份路径，例如 `profile.html.bak`。

---

## A-4. 跨平台行尾污染造成巨大无意义 diff

**原编号**：31  
**严重级别**：P1  
**状态**：已修复，需持续检查。

### 现象

Windows 环境或脚本重写文件后，HTML 从 LF 变成 CRLF，导致：

```text
18 files changed, 5254 insertions(+), 5254 deletions(-)
git diff --check 大量 trailing whitespace
```

### 根因

Git `core.autocrlf`、编辑器和脚本写入行为不一致。

### 修复方式

在根目录添加 `.gitattributes`：

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

执行：

```bash
git add .gitattributes
git add --renormalize .
git diff --check
```

### 防退化检查

- 提交前必须运行 `git diff --check`。
- 文档和 HTML 统一 LF。
- 图片、字体、PDF 必须声明为 binary。
- 不把行尾归一和内容修改混在一个提交里。

---

## A-5. 全局脚本重组 `<head>` 导致孤立页面资源遗漏

**原编号**：30、33  
**严重级别**：P1  
**状态**：已修复，需防退化。

### 现象

全局 SEO 脚本重组 14 个页面的 `<head>` 后，`resume.html` 和 `en/resume.html` 遗漏 Font Awesome CSS，导致导航栏图标变成方框。

### 根因

批量模板化 `<head>` 时没有保留页面原有特殊依赖。

### 修复方式

为中文和英文简历页补回：

```html
<link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>
```

英文页使用：

```html
<link href="../assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>
```

### 防退化检查

- 批量改 `<head>` 后检查所有页面图标。
- 每个页面都要保留 Font Awesome。
- 检查 `meta charset`、`viewport`、`title`、description、canonical、hreflang、OG、Twitter、JSON-LD。
- 404 页例外：应 noindex，不应有普通 canonical 策略。

---

# B. 信息架构、双语与路由类问题

## B-1. 站点结构和资源目录混乱

**原编号**：1  
**严重级别**：P1  
**状态**：已收敛，需防回归。

### 现象

早期页面、资源目录和路由命名分散，维护者不清楚哪些文件仍在使用。

### 根因

静态站点没有构建系统自动统一入口，旧目录长期残留会干扰判断。

### 修复方式

- 公共页面限定为 7 个中文页和 7 个英文页。
- 资源集中到 `assets/`。
- sitemap 只由 `scripts/generate-sitemap.js` 的 `pagePairs` 生成。

### 防退化检查

- 不恢复 `resource/`、`Homepage_files/`、`img/`。
- 新增页面必须同时新增英文镜像。
- 修改路由必须同步导航、语言切换、canonical、hreflang、sitemap。

---

## B-2. 中英文内容不完全平行

**原编号**：2、27  
**严重级别**：P1  
**状态**：部分已修复，需持续检查。

### 现象

中文页面更新后，英文页面没有同步。例如中文 `profile.html` 增加“学术科研”和“项目与实践”，英文 `en/profile.html` 最初仍只有 Education、Competitions、Honors。

### 根因

中英文是独立 HTML 文件，没有模板系统自动同步。

### 修复方式

- 英文档案页补齐 Academic Research 和 Projects / Practice。
- 保持类名、DOM 层级和属性对应。
- 中文证明图增加时，英文页同步数量、顺序和路径语义。

### 防退化检查

修改以下内容时必须查英文页：

- 导航。
- 页脚。
- 证明图。
- 项目卡片。
- 论文进展。
- PDF 链接。
- JSON-LD。
- sitemap。
- anchor bar。

---

## B-3. sitemap 重复、缺失或 lastmod 错误

**原编号**：8、21  
**严重级别**：P1  
**状态**：已修复，需持续检查。

### 现象

`sitemap.xml` 曾出现重复路由，或所有页面 `<lastmod>` 都是同一天。

### 根因

`pagePairs` 手工维护；旧脚本曾用共享 `site.css` 的修改时间替代页面自身修改时间。

### 修复方式

- `pagePairs` 中每个中文路由只出现一次。
- 使用 `fs.statSync` 读取每个 HTML 文件自身 `mtime`。
- 运行 `node scripts/generate-sitemap.js` 生成 sitemap。

### 防退化检查

```bash
node scripts/generate-sitemap.js
```

检查：

- 每个 URL 有 `zh-CN`、`en`、`x-default`。
- `<loc>` 不重复。
- `<lastmod>` 反映对应 HTML 的真实修改时间。
- 新增页面后更新测试文档和 onboarding。

---

## B-4. 404 页面缺少 noindex

**原编号**：32  
**严重级别**：P1  
**状态**：已修复，需防回归。

### 现象

`404.html` 和 `en/404.html` 缺少：

```html
<meta name="robots" content="noindex">
```

### 根因

测试文档有要求，但编码时遗漏。

### 修复方式

在两个 404 页 `<head>` 中补充 noindex。

### 防退化检查

- 404 页不要被 sitemap 当作普通内容页推广。
- 404 页不应设置普通 canonical 到自身作为内容页。
- 中英文 404 都要检查自动跳转与 noindex。

---

## B-5. 全局 SEO 与元信息覆盖不全

**原编号**：19、30  
**严重级别**：P1  
**状态**：已修复，需防回归。

### 现象

部分页面缺少 `meta charset`、`viewport`、`title`、description、canonical、hreflang、OG、Twitter 或 JSON-LD。

### 根因

页面从不同模板复制，缺少统一 `<head>` 检查。

### 修复方式

为 14 个页面统一补齐标准元数据。

### 防退化检查

新增页面必须包含：

- `charset`
- `viewport`
- `title`
- `description`
- favicon
- manifest
- canonical
- hreflang
- OG
- Twitter
- JSON-LD
- `site.css`
- `site.js`
- Font Awesome CSS

---

# C. 视觉、布局与交互类问题

## C-1. 桌面端 Hero 与下方板块左右不对齐

**原编号**：4  
**严重级别**：P2  
**状态**：已修复。

### 现象

宽屏下 Hero 左右内容边缘与下方 `section-block` 轨道不在同一垂直线。

### 根因

Hero 内部使用固定 `max-width` 加 `auto margin`，而 `section-block` 使用 1440px 动态轨道。

### 修复方式

在 `min-width:1069px` 下使用：

```css
padding-left:max(24px, calc((100vw - var(--max-width)) / 2));
padding-right:max(24px, calc((100vw - var(--max-width)) / 2));
```

### 防退化检查

- 1366px、1920px、2560px 都要检查。
- 不用额外 HTML 包裹 Hero 来修对齐。
- 修改 `--max-width` 后检查首页所有分区。

---

## C-2. 移动端 Hero 卡片中心线不对齐

**原编号**：5  
**严重级别**：P2  
**状态**：已修复。

### 现象

手机横向滑动 Hero 侧栏时，卡片像左边缘吸附，不在屏幕中心。

### 根因

横向 rail 缺少对称 gutter 和 `scroll-snap-align:center`。

### 修复方式

- 使用 `--hero-rail-card` 和 `--hero-rail-gutter`。
- 设置 `scroll-padding-inline`。
- 第一张和最后一张补 gutter。
- 子项 `scroll-snap-align:center`。

### 防退化检查

- 375px、390px、430px 测试。
- 横滑到首尾时卡片中心线应落在屏幕中心。
- 不随意拆掉 Hero 横向 rail。

---

## C-3. 证明图横向滑动覆盖不完整

**原编号**：6  
**严重级别**：P2  
**状态**：需持续检查。

### 现象

只给某一个 `proof-grid` 加横向滑动，其他证明图区域仍可能溢出或布局不一致。

### 根因

选择器写死具体页面或具体 id，遗漏 `proof-grid-wide`、`proof-grid-compact`、`proof-grid-project` 等变体。

### 修复方式

按组件变体设计 proof-grid，而不是补单点选择器。

### 防退化检查

检查：

- `profile.html` 本科、高中、初中、小学证明区。
- `projects.html` 项目证明区。
- `resume.html` 成绩单图片区。
- 中英文同类区域。

---

## C-4. 移动抽屉点击、焦点或背景穿透异常

**原编号**：7、16  
**严重级别**：P1  
**状态**：已修复，需防回归。

### 现象

移动菜单打开后背景仍可聚焦，或背景滚动穿透，链接点击有延迟感。

### 根因

`pointer-events`、`touch-action`、`inert`、焦点恢复逻辑互相影响。

### 修复方式

- 打开抽屉时背景 inert。
- 关闭时恢复背景并设置抽屉 `aria-hidden="true"` 与 `inert`。
- 抽屉内捕获 Tab。
- `.drawer-backdrop` 使用 `touch-action:none`。
- `.drawer` 使用 `touch-action:pan-y`。
- `.drawer-nav a` 使用 `touch-action:manipulation`。

### 防退化检查

- 手机宽度下打开/关闭。
- Escape 关闭。
- Tab 不跳到背后页面。
- 背景不穿透滚动。
- 抽屉关闭后普通链接可点击。

---

## C-5. 横向滑动体验生硬

**原编号**：16  
**严重级别**：P2  
**状态**：已优化，需防回归。

### 现象

横向卡片列表滚动不跟手，滑动结束不自动吸附。

### 根因

`scroll-snap-type` 缺失或使用 `proximity`，未限制 `overscroll-behavior`。

### 修复方式

- 使用 `scroll-snap-type:x mandatory`。
- 子卡片设置 `scroll-snap-stop:always`。
- 使用 `overscroll-behavior-inline:contain`。
- 保持合理横向 gutter。

### 防退化检查

- 横滑列表不能触发 iOS 边缘返回。
- 增减子卡片时不移除 snap 属性。
- 640px 以下必须实际手机测试。

---

## C-6. 浅色模式 Kicker 彩色突兀

**原编号**：17  
**严重级别**：P3  
**状态**：已修复。

### 现象

浅色模式下 `.kicker` 使用蓝色过于突兀，破坏黑白灰纸质风格。

### 根因

用高饱和蓝色承担层级区分，而不是靠字号、字重、大小写和间距。

### 修复方式

- 浅色模式下使用低调灰色。
- 深色模式下使用略亮 `body-muted`。
- 用全大写、字重和字距建立层级。

### 防退化检查

新增 kicker 不要使用艳丽色彩。

---

## C-7. 首页右侧边栏信息密度过低且过长

**原编号**：18  
**严重级别**：P2  
**状态**：已修复，需观察。

### 现象

姓名折行，邮箱和位置各占一行，访问统计单列堆叠，导致右侧边栏过长。

### 根因

Profile 卡片内边距、字号、统计模块布局没有针对 Hero 侧栏紧凑化。

### 修复方式

- Hero 侧栏姓名缩小到可单行显示。
- 位置和邮箱标签紧凑化。
- `hero-stats` 改为三列。
- 数值和卡片内边距减小。

### 防退化检查

- 新增侧栏标签后检查是否折行。
- 小于 640px 检查三列统计是否过挤。
- 英文页更容易溢出，要单独检查。

---

## C-8. 相邻区块边距合并导致卡片粘连

**原编号**：23  
**严重级别**：P3  
**状态**：已修复。

### 现象

`profile.html` 中“研究生期间”的时间线白色卡片贴着上方概览区底边，没有呼吸空间。

### 根因

`.section-block` 紧接 `.timeline-stage` 时缺少相邻间距。

### 修复方式

增加：

```css
.section-block + .timeline-stage {
  margin-top: 40px;
}
```

### 防退化检查

组合 `.section-block`、`.timeline-stage`、`.hero` 时检查区块间距。

---

# D. 性能、资源与加载类问题

## D-1. 外部字体导致首页长时白屏

**原编号**：25、26  
**严重级别**：P0  
**状态**：已修复，需防回归。

### 现象

打开页面时白屏几十秒，尤其在国内网络环境下更明显。

### 根因

使用 Google Fonts 同步 CSS 请求，浏览器等待外部字体 CSS，阻塞首屏渲染。

### 修复方式

- 下载 Inter woff2 到 `assets/fonts/inter/`。
- 使用 `@font-face` 和 `font-display:swap`。
- 移除所有远程 Google Fonts 链接。
- 清理无效 `fonts.css` 引用。
- 当前实现：本地字体规则写在 `assets/css/site.css` 顶部。

### 防退化检查

- 不引入 `fonts.googleapis.com`。
- 不新增远程字体 CSS。
- 不保留不存在的 `fonts.css` 引用。
- 若未来拆回 `fonts.css`，必须保证文件真实存在并同步所有 HTML。

---

## D-2. 第三方统计脚本阻塞 load 或造成长时间转圈

**原编号**：25  
**严重级别**：P0  
**状态**：已修复，需防回归。

### 现象

内容显示后浏览器标签页仍长时间转圈。

### 根因

第三方统计脚本在 HTML 解析阶段注入，即使 `async` 也可能阻塞 `window.onload`。

### 修复方式

- 统计脚本由 `stats.js` 在 `window.load` 后懒加载。
- 核心页面先完成加载，再后台拉取第三方计数。
- 统计失败时显示降级状态。

### 防退化检查

- 不在 HTML 中直接写外部统计 `<script src="https://...">`。
- 不让统计脚本成为首屏关键路径。
- stats.js 只应在需要统计卡片的页面加载。
- 非统计页不保留无意义 preconnect。

---

## D-3. 超大证明图片直接加载导致带宽浪费

**原编号**：28  
**严重级别**：P0  
**状态**：已修复，需防回归。

### 现象

证明图原始 PNG 单张 25MB–42MB，被直接作为 `<img src>`，导致加载卡顿和带宽浪费。

### 根因

原图未经压缩，缺少预览图和查看大图分离策略。

### 修复方式

实施双文件策略：

```text
xxx-thumb.webp  页面缩略图
xxx-full.webp   lightbox 大图
```

HTML 使用：

```html
<a class="proof-item" data-lightbox href="./assets/images/proofs/xxx-full.webp">
  <img src="./assets/images/proofs/xxx-thumb.webp" loading="lazy" decoding="async" ...>
</a>
```

清理不再直接加载的巨型原图。

### 防退化检查

- 新增证明图先压缩。
- 缩略图建议 40–120KB。
- full 图建议 100–900KB。
- 不把几十 MB 原图放入页面加载路径。
- 中英文证明图路径同步检查。

---

## D-4. JS 高频事件未节流导致卡顿

**原编号**：20  
**严重级别**：P2  
**状态**：已修复，需防回归。

### 现象

Spotlight 鼠标跟随等 `pointermove` 事件造成滑动卡顿。

### 根因

高频事件没有通过 `requestAnimationFrame` 或 throttle 降频。

### 修复方式

在 `site.js` 中使用 `requestAnimationFrame` 节流。

### 防退化检查

新增以下监听器必须节流：

- `scroll`
- `resize`
- `pointermove`
- `mousemove`
- `touchmove`

---

## D-5. localStorage 访问历史无限增长

**原编号**：20  
**严重级别**：P2  
**状态**：已修复，需防回归。

### 现象

`visitDays` 长期增长，可能造成 localStorage 膨胀。

### 根因

本地访问历史数组没有容量上限。

### 修复方式

保留最近 365 天：

```js
history.slice(-365)
```

### 防退化检查

所有写入 localStorage 的数组、日志、历史记录都必须设置上限。

---

# E. 品牌、图标与视觉识别类问题

## E-1. 旧 favicon 细节过多，小尺寸不可读

**原编号**：12  
**严重级别**：P2  
**状态**：已修复。

### 现象

旧 favicon 在 16×16 下细节太多，像噪点，且无法和个人身份建立联系。

### 根因

把形式化验证的复杂含义放进 favicon，违背小尺寸图标原则。

### 修复方式

改为以字母 `Y` 为核心的自定义几何符号：

- 深蓝底 `#020617`。
- 灰蓝内边框 `#334155`。
- 白色几何 `Y`。
- 右上角青色方块 `#06B6D4`。

生成多尺寸 `site.ico` 覆盖 `assets/icons/site.ico`。

### 防退化检查

- 16×16 必须可读。
- 不加渐变、阴影、虚线、细线。
- 不放小文字。
- 更换后强制刷新测试。

---

## E-2. brand-mark 与 favicon 不统一

**原编号**：13  
**严重级别**：P2  
**状态**：已修复。

### 现象

顶部品牌图标曾使用 Font Awesome terminal，favicon 使用新几何符号，两者不统一。

### 根因

品牌识别系统没有统一。

### 修复方式

- 新增 `assets/icons/brand-mark.png`。
- `.brand-mark` 使用 `background-image` 加载图片。
- 移除旧 `::before` terminal 注入逻辑。

### 防退化检查

- 不在 HTML 用内联样式覆盖 brand-mark。
- 更新符号时同时考虑 favicon、brand-mark、manifest。
- 保持 16px 可读。

---

# F. 文档、测试与维护流程类问题

## F-1. 文档模板化，与真实静态站点无关

**原编号**：9、14  
**严重级别**：P1  
**状态**：已修复，需防回归。

### 现象

文档目录包含 API、DB、微服务、合规模板等大型项目骨架，与纯静态 GitHub Pages 不匹配。

### 根因

早期按大型项目模板生成文档，没有围绕真实代码和运维路径收敛。

### 修复方式

- 文档统一收敛到 `docs/design/`。
- API、数据模型、合规、ADR 合并入 `architecture.md`。
- deployment 和 runbook 合并为 `ops.md`。
- testing 移入 `docs/design/testing.md`。
- user guide 合并入 `docs/onboarding.md`。
- 删除旧空目录。

### 防退化检查

- 新增文档先判断是否能并入现有文档。
- 不重建 `api/`、`db/`、`compliance/` 等无关目录。
- 文档必须指向真实文件、真实页面、真实维护动作。

---

## F-2. 文档与真实代码状态不一致

**原编号**：10、25、26  
**严重级别**：P1  
**状态**：仍需持续检查。

### 现象

旧文档写 `fonts.css`、Google Fonts、Font Awesome terminal brand-mark、`localStorage.theme`、`.dark`，但真实代码已变化。

### 根因

代码演进后文档没有同步。

### 修复方式

统一当前事实：

- 主题：`data-theme` + `ysb-theme`。
- 字体：本地 Inter，`@font-face` 在 `site.css` 顶部。
- brand-mark：`assets/icons/brand-mark.png`。
- 统计：`stats.js` 在 `window.load` 后懒加载第三方脚本。
- 图片：研究生阶段证明图采用 thumb/full 策略。

### 防退化检查

改以下内容必须同步文档：

- JS localStorage 键。
- DOM id。
- CSS 状态属性。
- 字体路径。
- 图标路径。
- 统计服务。
- 证明图目录。
- 页面路由。

---

## F-3. 测试文档过薄，无法防回归

**原编号**：15  
**严重级别**：P1  
**状态**：已修复，需持续更新。

### 现象

旧测试文档只列简单清单，覆盖不到 404、统计降级、lightbox、跨浏览器、极端视口、中英文一致性。

### 根因

没有映射到当前 14 个页面、7 个断点和历史问题。

### 修复方式

重写 `docs/design/testing.md`，覆盖：

- 自动检查。
- 14 页逐页检查。
- 7 断点矩阵。
- 主题。
- 交互。
- 统计。
- 跨浏览器。
- SEO。
- 性能。
- 历史回归。
- 双语一致性。

### 防退化检查

新增页面、交互、资源策略后必须更新测试文档。

---

## F-4. README、architecture、design、testing 与本文件语义不一致

**严重级别**：P2  
**状态**：需持续检查。

### 现象

不同文档可能对字体、图标、统计、目录结构、证明图策略写法不同。

### 根因

文档分多次由人工和 AI 更新，缺少统一事实源。

### 修复方式

以真实代码为准：

- CSS token 看 `assets/css/site.css`。
- JS 行为看 `assets/js/site.js` 和 `assets/js/stats.js`。
- 路由看 `scripts/generate-sitemap.js`。
- 页面结构看对应 HTML。
- 维护原则看 `docs/design/issues_and_fixes.md`。

### 防退化检查

每次更新文档后，搜索以下关键词：

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

如果出现，判断是否已经过时。

---

# G. 内容、隐私与安全类问题

## G-1. 个人联系方式公开边界偏开放

**严重级别**：P2  
**状态**：需要用户决策。

### 现象

HTML 页面中公开邮箱、手机号、微信、照片、证书、成绩单和材料。

### 根因

研究型主页为了可信度展示真实材料，但部分联系方式长期明文公开会增加爬虫采集和骚扰风险。

### 建议

- HTML 页面保留邮箱、GitHub、学校、城市。
- 手机号可只放 PDF 简历，不放网页明文。
- 微信根据个人偏好决定是否保留。
- 如果面向海外访问者，英文页可弱化微信。

### 防退化检查

新增材料前判断：

- 是否含手机号、身份证号、完整住址、二维码、证书编号等敏感信息。
- 是否需要打码。
- 是否必须公开在 HTML，而不是只放 PDF。

---

## G-2. 安全策略和问题手册混杂

**严重级别**：P3  
**状态**：建议拆分。

### 现象

旧 `issues_and_fixes.md` 末尾混入 Security Policy 和 Changelog，导致问题手册职责变散。

### 根因

文档体系清理过程中，把多个模板内容合并到同一个文件。

### 建议

- `docs/design/issues_and_fixes.md` 只保留问题、修复、防退化。
- 安全漏洞上报放到 `SECURITY.md`。
- 版本更新记录放到 `CHANGELOG.md`。
- onboarding 中链接这三个文件。

### 防退化检查

本文件只回答：

```text
发生了什么问题？
为什么发生？
怎么修？
以后怎么避免？
```

---

# H. 最低验证流程

## H-1. 每次修改后的最低命令

```bash
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

如果改了页面、样式或资源，再启动本地服务：

```bash
python -m http.server 8000 --bind 127.0.0.1
```

至少打开：

```text
/
profile.html
research.html
projects.html
resume.html
analytics.html
en/
en/profile.html
en/resume.html
404.html
en/404.html
```

## H-2. 人工检查矩阵

至少检查：

| 检查项 | 要求 |
| --- | --- |
| 1366px 桌面 | 页面结构正常 |
| 390px 手机 | 无横向溢出，抽屉可用 |
| 浅色主题 | 文字和状态可读 |
| 深色主题 | 卡片、状态、按钮可读 |
| 中文页 | 内容完整 |
| 英文页 | 结构对应 |
| lightbox | 可打开、可关闭、焦点恢复 |
| sitemap | 无重复 URL，lastmod 合理 |
| 外链 | `noopener noreferrer` |
| 404 | noindex，自动跳转正常 |

## H-3. 发布前回归重点

如果本次改动涉及以下模块，必须额外检查：

| 改动范围 | 额外检查 |
| --- | --- |
| `site.css` | 首页、档案页、深色主题、移动端 |
| `site.js` | 主题、抽屉、lightbox、返回顶部、anchor |
| `stats.js` | 首页统计、统计页、第三方失败降级 |
| `<head>` | Font Awesome、favicon、OG、Twitter、JSON-LD |
| 证明图 | thumb/full、lightbox、中英文同步 |
| 路由 | sitemap、导航、语言切换、canonical、hreflang |
| 文档 | 搜索过时术语，与真实代码一致 |

---

# I. 新问题记录模板

以后遇到新问题，按以下模板追加，不要写成散乱日志。

```markdown
## X-N. 问题标题

**来源**：用户反馈 / 本地测试 / 线上观察 / Agent 事故  
**严重级别**：P0 / P1 / P2 / P3  
**状态**：待修复 / 已修复 / 需观察 / 禁止复现  
**涉及文件**：`path/to/file`

### 现象

描述用户看到的具体问题。

### 根因

说明导致问题的真实技术原因。不要只写“代码有问题”。

### 修复方式

写清具体修改了什么文件、什么策略、什么命令。

### 防退化检查

写清以后如何验证它不会再发生。
```

---

# J. 版本记录建议

本文件不建议继续承载完整 `CHANGELOG` 和 `SECURITY` 内容。建议拆分为：

```text
SECURITY.md       安全漏洞上报策略
CHANGELOG.md      版本更新记录
docs/design/issues_and_fixes.md   问题、修复、防退化
```

如暂时不拆分，也应将 Security 和 Changelog 放在附录，避免干扰 Agent 操作前阅读重点。

---

## 附录：Agent 操作前口令

任何 Agent 修改项目前，先默念并执行：

```text
我将先阅读 issues_and_fixes。
我将检查 git status。
我只修改目标范围。
我不会用正则解析嵌套 HTML。
我不会只改中文页。
我不会执行破坏性 Git 命令。
我会运行最低验证命令。
我会说明未验证的部分。
```
