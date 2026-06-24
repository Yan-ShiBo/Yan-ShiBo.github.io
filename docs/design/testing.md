# 测试与质量保障指南

本文是 `Yan-ShiBo.github.io` 个人主页的测试与质量保障标准。本站虽然是零构建静态站点，但测试不能只停留在“页面能打开”。测试目标是保证：

1. 14 个中英文页面都能访问。
2. 视觉布局在关键断点下稳定。
3. 主题、抽屉、lightbox、anchor、返回顶部、统计等交互不回归。
4. SEO、结构化数据、sitemap、404、PDF、图片、favicon、brand-mark 等静态资源完整。
5. Agent 或脚本修改不会破坏 HTML 结构、双语同步和用户未提交成果。
6. 最小单元能被快速验证，整站发布前能被系统性验收。

本文应与以下文档配套使用：

- `docs/design/issues_and_fixes.md`：历史问题、事故复盘、防退化规则。
- `docs/design/architecture.md`：站点架构、路由、DOM 契约、数据模型。
- `docs/design/design.md`：设计合同、组件规则、视觉不变量。
- `docs/design/style_guide.md`：CSS 书写规范。
- `docs/design/ops.md`：部署、发布、回滚、故障排查。
- `docs/onboarding.md`：维护者和 AI 助手上手流程。

---

## 0. 测试总原则

### 0.1 分层测试思想

本站没有传统后端和构建流水线，因此测试应按“从小到大”的顺序组织：

```text
文件级静态检查
  ↓
资源级检查
  ↓
组件级检查
  ↓
页面级检查
  ↓
跨页面集成检查
  ↓
中英文一致性检查
  ↓
响应式与主题检查
  ↓
历史回归检查
  ↓
发布前验收
  ↓
发布后线上冒烟测试
```

每一层都应尽量在最小范围内发现问题。不要等到全站人工浏览时才发现一个路径、标签或 CSS 变量错误。

### 0.2 最小单元定义

在本项目中，“最小测试单元”不是传统函数单元，而是下列可独立验证的对象：

| 单元类型 | 示例 | 最小验证目标 |
| --- | --- | --- |
| 文件单元 | `site.js`、`stats.js`、`generate-sitemap.js` | 语法正确 |
| CSS 规则单元 | `.brand-mark`、`.profile-project-card`、`.status-note` | 浅色/深色/移动端不破坏 |
| HTML 结构单元 | 一个 `info-card`、一个 `proof-item`、一个 `<head>` | 标签闭合、属性完整、路径正确 |
| 资源单元 | 图片、PDF、favicon、字体 | 文件存在、体积合理、路径正确 |
| 交互单元 | 主题按钮、抽屉、lightbox、返回顶部 | 键盘、鼠标、触控均可用 |
| 页面单元 | `profile.html` | 页面可打开、核心内容可读 |
| 页面镜像单元 | `profile.html` + `en/profile.html` | 结构对应、路径正确、内容不缺失 |
| 发布单元 | 本次 Git diff | 变更范围可解释、无行尾污染、无误删 |

### 0.3 测试优先级

| 等级 | 失败影响 | 示例 |
| --- | --- | --- |
| P0 | 不能发布 | 首页白屏、CSS 404、JS 语法错误、页面大量 404、Git diff 异常巨大 |
| P1 | 发布前必须修 | 中英文严重不同步、sitemap 错误、404 无 noindex、PDF 链接失效、证明图路径失效 |
| P2 | 建议本轮修 | 移动端轻微溢出、统计显示异常但页面可读、部分图片未压缩 |
| P3 | 可记录后续优化 | 文案微调、个别 hover 效果、非关键图标微调 |

---

## 1. 测试范围

### 1.1 页面范围

当前公开页面共 14 个：

| 编号 | 页面 | 路径 |
| --- | --- | --- |
| P1 | 中文首页 | `/` / `index.html` |
| P2 | 中文档案 | `profile.html` |
| P3 | 中文研究 | `research.html` |
| P4 | 中文项目 | `projects.html` |
| P5 | 中文简历 | `resume.html` |
| P6 | 中文统计 | `analytics.html` |
| P7 | 中文 404 | `404.html` |
| P8 | 英文首页 | `/en/` / `en/index.html` |
| P9 | 英文档案 | `en/profile.html` |
| P10 | 英文研究 | `en/research.html` |
| P11 | 英文项目 | `en/projects.html` |
| P12 | 英文简历 | `en/resume.html` |
| P13 | 英文统计 | `en/analytics.html` |
| P14 | 英文 404 | `en/404.html` |

新增页面时，必须同步更新：

- 本表。
- `scripts/generate-sitemap.js`。
- `sitemap.xml`。
- 导航。
- 语言切换。
- `docs/onboarding.md` 项目地图。
- 本文响应式矩阵。

### 1.2 断点范围

| 编号 | 视口 | 用途 |
| --- | --- | --- |
| V1 | 320px | 极窄手机边界 |
| V2 | 360px | 窄手机 |
| V3 | 390px | 常见手机 |
| V4 | 640px | 手机布局临界点 |
| V5 | 834px | 移动抽屉 / 桌面导航临界点 |
| V6 | 1366px | 常见笔记本 |
| V7 | 1920px / 2560px | 宽屏和超宽屏 |

最小发布检查可覆盖 `390px`、`834px`、`1366px`、`1920px`。  
大改版、导航改动、proof-grid 改动、Hero 改动、CSS 断点改动时必须覆盖全部 7 个断点。

---

## 2. 操作前安全测试

### 2.1 Git 状态检查

任何 Agent、本地脚本或维护者开始修改前，先执行：

```bash
git status --short
git diff --stat
git diff --check
```

判断：

- 是否存在用户未提交文件。
- 是否已有大范围 diff。
- 是否已有行尾污染。
- 是否存在 untracked 图片、PDF 或 HTML。

如果存在未提交或未跟踪文件：

- 禁止执行 `git restore`。
- 禁止执行 `git reset --hard`。
- 禁止执行 `git clean -fd`。
- 禁止运行全站覆盖脚本。
- 应先备份或让用户确认。

### 2.2 修改范围测试

修改前必须明确：

| 问题 | 必须回答 |
| --- | --- |
| 改哪个页面？ | 中文页、英文页还是两者 |
| 改哪个组件？ | header、hero、info-card、proof-grid、footer 等 |
| 是否影响资源？ | 图片、PDF、字体、图标 |
| 是否影响 SEO？ | title、description、canonical、hreflang、JSON-LD |
| 是否影响 sitemap？ | 页面新增、删除、改名、lastmod |
| 是否影响测试文档？ | 新页面、新组件、新交互、新事故 |

### 2.3 嵌套 HTML 安全测试

对复杂 HTML 结构做修改时，禁止使用正则解析嵌套标签。

高危写法：

```python
re.search(r'<div class="info-card">.*?</div>', html, re.S)
```

允许方式：

- 精确字符串替换完整已知片段。
- 使用 BeautifulSoup / lxml 等真正解析器。
- 手动修改小范围目标。
- 分块修改后用浏览器预览。

修改后必须检查：

```bash
git diff --stat
git diff --check
```

并人工查看 diff，确认没有误删大量闭合标签。

---

## 3. 自动化静态检查

### 3.1 最低命令

在仓库根目录运行：

```bash
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

检查点：

- JS 语法无错误。
- sitemap 生成脚本可运行。
- `sitemap.xml` 没有重复 URL。
- Git 补丁没有行尾空白。
- 没有 CRLF / LF 混乱造成的巨大 diff。

### 3.2 PowerShell 版本

```powershell
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

### 3.3 Git diff 审查

每次提交前看：

```bash
git diff --stat
```

正常文档更新示例：

```text
docs/design/testing.md | 400 +++++++++++++++++++++++----
```

异常示例：

```text
14 files changed, 6000 insertions(+), 6000 deletions(-)
```

这通常意味着：

- 行尾被改成 CRLF。
- 格式化工具重写了整页。
- 脚本全局改动超出预期。
- 可能误删或重排了大量 HTML。

异常 diff 不能直接提交。

---

## 4. 本地 HTTP 检查

### 4.1 启动服务

```bash
python -m http.server 8000 --bind 127.0.0.1
```

不要只用双击 HTML 文件测试。双击文件时，PDF、相对路径、iframe、localStorage、第三方脚本、浏览器安全策略可能表现不同。

### 4.2 快速探活

PowerShell：

```powershell
Invoke-WebRequest http://127.0.0.1:8000/
Invoke-WebRequest http://127.0.0.1:8000/en/
Invoke-WebRequest http://127.0.0.1:8000/profile.html
Invoke-WebRequest http://127.0.0.1:8000/en/profile.html
Invoke-WebRequest http://127.0.0.1:8000/research.html
Invoke-WebRequest http://127.0.0.1:8000/projects.html
Invoke-WebRequest http://127.0.0.1:8000/resume.html
Invoke-WebRequest http://127.0.0.1:8000/en/resume.html
Invoke-WebRequest http://127.0.0.1:8000/analytics.html
Invoke-WebRequest http://127.0.0.1:8000/en/analytics.html
Invoke-WebRequest http://127.0.0.1:8000/404.html
Invoke-WebRequest http://127.0.0.1:8000/en/404.html
Invoke-WebRequest http://127.0.0.1:8000/sitemap.xml
```

HTTP 200 只表示文件可访问，不代表页面质量通过。

---

## 5. 最小单元测试清单

### 5.1 `<head>` 单元

每个普通页面检查：

- `charset`
- `viewport`
- `title`
- `description`
- favicon
- manifest
- Font Awesome CSS
- `site.css`
- `site.js`
- canonical
- `hreflang="zh-CN"`
- `hreflang="en"`
- `hreflang="x-default"`
- OG title / description / url / image
- Twitter card
- JSON-LD

404 页面例外：

- 必须有 `noindex`。
- 不按普通内容页推广。
- 中英文跳转目标不同。

### 5.2 header / drawer 单元

每个页面的 header 应包含：

- brand 链接。
- `brand-mark` 图片正常显示。
- 桌面导航。
- 当前页 `aria-current="page"`。
- 语言切换。
- 主题按钮。
- 移动端菜单按钮。
- drawer。
- drawer backdrop。
- drawer close 按钮。

最小验证：

- 1366px 桌面导航可用。
- 390px 移动抽屉可用。
- Escape 能关闭。
- Tab 不跳到背景页面。

### 5.3 footer 单元

检查：

- 邮箱链接。
- GitHub 链接。
- 简历链接。
- 返回顶部按钮。
- 年份自动更新。
- 中英文页文案对应。

### 5.4 proof-item 单元

每个证明图必须满足：

```html
<a class="proof-item" data-lightbox data-caption="..." href="...">
  <img alt="..." src="..." width="..." height="..." loading="lazy" decoding="async">
</a>
```

检查：

- `href` 指向可打开大图。
- `src` 指向缩略图或合理体积图片。
- `alt` 有意义。
- `data-caption` 与图片内容一致。
- `width` / `height` 存在。
- 非首屏图片使用懒加载。
- 英文页路径使用 `../`。
- 点击能打开 lightbox。

### 5.5 PDF 单元

检查固定 PDF：

```text
docs/Shibo-Yan-Resume.pdf
docs/Shibo-Yan-Undergraduate-Transcript.pdf
docs/Shibo-Yan-Research-Paper.pdf
```

页面检查：

- 按钮能打开。
- iframe 预览存在。
- iframe 失败时有 fallback 链接。
- 英文页路径使用 `../docs/...`。

### 5.6 favicon / brand-mark 单元

检查：

- `assets/icons/site.ico` 存在。
- `assets/icons/brand-mark.png` 存在。
- HTML favicon link 指向正确。
- `manifest.webmanifest` 图标路径正确。
- `.brand-mark` CSS 背景图路径正确。
- 浏览器标签页能显示 favicon。
- 导航左侧 brand-mark 不显示为方框或空白。

### 5.7 字体单元

检查：

- 不存在 Google Fonts 远程 CSS。
- 不存在无效 `fonts.css` 引用，除非文件真实存在且被重新设计采用。
- `assets/css/site.css` 顶部包含本地 `@font-face`。
- `assets/fonts/inter/*.woff2` 存在。
- Font Awesome CSS 和字体文件存在。

### 5.8 统计 DOM 单元

统计页和首页检查：

隐藏节点：

```html
#busuanzi_value_site_pv
#busuanzi_value_site_uv
#busuanzi_value_page_pv
#vercount_value_site_pv
#vercount_value_site_uv
#vercount_value_page_pv
```

可见节点：

```html
#site-pv
#site-uv
#page-pv
#stats-status
```

统计页额外：

```html
#local-total
#local-page
#local-days
#local-first
#local-last
```

非统计页面原则上不应加载 `stats.js`。

---

## 6. 页面级功能测试

### 6.1 全站通用

每个页面都检查：

- `<html lang>` 正确：中文 `zh-CN`，英文 `en`。
- skip link 可通过键盘聚焦并跳到 `#main-content`。
- 顶部导航当前页有 `aria-current="page"`。
- 语言切换链接指向对应页面。
- 主题按钮有可访问名称并能切换。
- Font Awesome 图标正常。
- brand-mark 显示为 `assets/icons/brand-mark.png`。
- favicon 使用 `assets/icons/site.ico`。
- 页脚邮箱、GitHub、简历、返回顶部可用。
- 页面无明显横向溢出。
- Console 无 JS 错误。

### 6.2 首页 P1 / P8

- Hero 左侧身份、研究方向、行动按钮可见。
- Hero 右侧 profile、quote、keywords、site counters 可见。
- 梁启超 quote 在 Hero 和 quote band 两处存在，中英文结构对应。
- 宽屏下 Hero 外侧边缘与下方 `section-block` 对齐。
- 手机下 Hero 侧栏横向卡片中心吸附。
- 统计失败时内容仍可阅读。
- 首屏不依赖第三方统计脚本渲染。
- 头像路径正确，加载不造成布局位移。

### 6.3 档案页 P2 / P9

- Anchor bar 项目完整，点击后标题不被 sticky header 遮挡。
- 研究生、本科、高中、初中、小学阶段都可到达。
- 研究生阶段包含教育、学术科研、项目与实践、比赛、荣誉和证明材料。
- 每个证明图 `proof-item` 可打开 lightbox。
- 中文证明图片和英文证明图片数量、顺序、路径语义一致。
- `profile-project-*` 组件无内联样式。
- 手机下 proof-grid 不造成全局横向溢出。

### 6.4 研究页 P3 / P10

- 方法链顺序清楚：问题设定、Reach-Avoid、学习控制器、PAC / 多项式近似、SBC / SOS / SDP、迭代。
- 深色区文字、按钮、标签对比度足够。
- 页内 anchor 跳转后不被导航遮挡。
- 公式或技术词不会造成移动端横向溢出。
- 中英文术语对应准确。

### 6.5 项目页 P4 / P11

- 项目卡片的名称、时间、角色、技术栈、核心场景、仓库链接完整。
- PersevereStudy 和 MicFamily 仓库链接正确。
- 项目证明图可打开 lightbox。
- 手机下 `.grid-2` 正常堆叠。
- 英文长按钮和技术栈标签不溢出。
- 外链有 `rel="noopener noreferrer"`。

### 6.6 简历页 P5 / P12

- PDF 简历按钮可打开。
- 成绩单 PDF 按钮可打开。
- PDF iframe 预览加载失败时 fallback 文案和链接存在。
- 头像、联系方式、关键词、快速信息结构完整。
- 成绩单图片版可打开 lightbox。
- Font Awesome 图标正常。
- 手机端 iframe 不破坏布局。

### 6.7 统计页 P6 / P13

- `#stats-status` 初始为加载状态。
- 公开计数成功、部分成功、失败三种状态文案可读。
- 本地记录 `#local-total`、`#local-page`、`#local-days`、`#local-first`、`#local-last` 能显示。
- 清理 localStorage 后重新访问不会报错。
- 首页统计卡和统计页公开统计口径一致。
- 第三方统计失败不影响页面阅读。

### 6.8 404 页面 P7 / P14

- `<meta name="robots" content="noindex">` 存在。
- 中文 404 的按钮指向中文首页。
- 英文 404 的按钮指向英文首页。
- 中文 404 5 秒后跳 `/`。
- 英文 404 5 秒后跳 `/en/`。
- 倒计时数字正常递减。
- 不应出现普通内容页 SEO 推广策略。

---

## 7. 组件级交互测试

### 7.1 主题切换

在首页、档案页、统计页测试：

1. 浅色模式点击主题按钮，切到深色。
2. 再次点击，切回浅色。
3. 检查 `<html data-theme>`。
4. 检查 `localStorage.ysb-theme`。
5. 刷新后主题保持。
6. 清除 `ysb-theme` 后跟随系统偏好。
7. 深色下 `status-note`、`tile-dark`、button、tag、quote、proof caption 可读。

### 7.2 移动抽屉

在 390px 或 640px 宽度下测试：

- 点击 hamburger 打开抽屉。
- `body` 出现 `menu-open`。
- 抽屉 `aria-hidden=false` 且没有 `inert`。
- 背景不可滚动、不可 Tab 聚焦。
- Tab 在抽屉内循环。
- Shift+Tab 反向循环。
- Escape 关闭。
- 点击遮罩关闭。
- 点击关闭按钮关闭。
- 点击抽屉内导航链接关闭。
- 关闭后焦点回到 hamburger 按钮。
- 背景链接恢复可点击。

### 7.3 Lightbox

在档案页、项目页、简历页测试：

- 点击 `proof-item` 打开 lightbox。
- 图片显示正确。
- caption 正确。
- Escape 关闭。
- 点击背景关闭。
- 点击关闭按钮关闭。
- Tab 不跳到背景页面。
- 关闭后焦点回到触发图片。
- 连续打开多个 proof-item 不报错。

### 7.4 返回顶部

- 页面滚动超过阈值后浮动返回顶部出现。
- 移动抽屉打开时返回顶部隐藏且不可聚焦。
- 点击后回到页面顶部。
- `prefers-reduced-motion` 下不强制平滑动画。
- 键盘可聚焦和触发。

### 7.5 Anchor bar

- 档案页 anchor 点击后目标段落不被 sticky header 遮挡。
- 滚动时对应 anchor-chip 更新 `aria-current`。
- 手机下 anchor bar 可横向滚动。
- 英文页 anchor 数量和结构对应。

---

## 8. 响应式测试矩阵

每个页面都要在关键断点下检查。大改版必须覆盖所有断点。

| 页面 | 320 | 360 | 390 | 640 | 834 | 1366 | 1920/2560 | 重点 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 首页 | Y | Y | Y | Y | Y | Y | Y | Hero rail、统计卡、quote、头像 |
| P2 档案 | Y | Y | Y | Y | Y | Y | Y | anchor、proof-grid、时间线、项目 mini-card |
| P3 研究 | Y | Y | Y | Y | Y | Y | Y | method-chain、深色区、技术词 |
| P4 项目 | Y | Y | Y | Y | Y | Y | Y | 项目卡、仓库按钮、证明图 |
| P5 简历 | Y | Y | Y | Y | Y | Y | Y | PDF iframe、成绩单图、联系信息 |
| P6 统计 | Y | Y | Y | Y | Y | Y | Y | 大数字、状态条、本地记录 |
| P7 404 | Y | Y | Y | Y | Y | Y | Y | 按钮、倒计时、跳转 |
| P8 EN 首页 | Y | Y | Y | Y | Y | Y | Y | 英文长词不溢出 |
| P9 EN 档案 | Y | Y | Y | Y | Y | Y | Y | 英文证明说明、长标题 |
| P10 EN 研究 | Y | Y | Y | Y | Y | Y | Y | 英文方法链 |
| P11 EN 项目 | Y | Y | Y | Y | Y | Y | Y | 英文按钮和技术栈 |
| P12 EN 简历 | Y | Y | Y | Y | Y | Y | Y | 英文 PDF 区 |
| P13 EN 统计 | Y | Y | Y | Y | Y | Y | Y | 英文状态文案 |
| P14 EN 404 | Y | Y | Y | Y | Y | Y | Y | 英文跳转 |

断点检查项：

- 320/360px：无全局横向滚动条，最长按钮文字不溢出。
- 390px：Hero、证明图、统计卡触控体验正常。
- 640px：手机布局临界规则未互相覆盖。
- 834px：桌面导航隐藏，移动抽屉启用。
- 1366px：笔记本布局不拥挤。
- 1920/2560px：Hero 和 section 轨道对齐，内容不无限拉宽。

---

## 9. 统计系统测试

### 9.1 Vercount 正常

- Network 中 `events.vercount.one/js` 返回成功。
- `#vercount_value_site_pv` 等隐藏节点被写入。
- 可见卡片显示数字。
- 状态文案进入 ok 或 partial。

### 9.2 Busuanzi 正常

- 至少一个 Busuanzi 候选脚本加载成功。
- `#busuanzi_value_site_pv` 等隐藏节点被写入。
- Vercount 不可用时仍可显示 Busuanzi 的有效值。

### 9.3 两者都失败

模拟方式：

- 断网。
- DevTools 阻止相关域名。
- 广告拦截器拦截。

预期：

- 最终进入 unavailable / warn 状态。
- 可见公开统计显示 `--`。
- 页面无 JS 报错。
- 本地记录仍更新。

### 9.4 部分成功

如果只有 site PV 有效，UV 或 page PV 无效：

- 状态为 partial。
- 有效值显示数字。
- 无效值显示 `--`。
- 页面文案不误导用户。

### 9.5 localStorage

检查键：

```text
ysb-visit-total
ysb-visit-first
ysb-visit-last
ysb-visit-days
ysb-page:/...
```

刷新当前页面后，本机累计访问和当前页本机访问应增加。  
`ysb-visit-days` 最多保留 365 天，不应无限增长。

---

## 10. SEO 和结构化数据测试

### 10.1 每页检查

每个公开页面检查：

- `<title>` 唯一且描述页面。
- `meta name="description"` 存在。
- canonical 指向正确线上 URL。
- `hreflang="zh-CN"`、`en`、`x-default` 存在。
- OG title / description / url / image 存在。
- Twitter card 信息存在。
- JSON-LD 合法。
- JSON-LD `inLanguage` 与页面语言一致。
- Person / ProfilePage 字段与页面内容一致。
- 404 页面有 `noindex`。

### 10.2 sitemap 检查

运行：

```bash
node scripts/generate-sitemap.js
```

检查：

- URL 不重复。
- 不包含无关旧页面。
- `/` 和 `/en/` 配对正确。
- 每个条目包含 `zh-CN`、`en`、`x-default`。
- `<lastmod>` 反映页面自身修改时间。
- 404 不作为普通内容页推广。

---

## 11. 中英文一致性测试

每组页面检查：

- header 结构一致。
- drawer 结构一致。
- footer 结构一致。
- 导航项数量一致。
- 语言切换互相指向。
- 主要 section 数量一致。
- 主要卡片结构对应。
- `proof-item` 数量、顺序、图片路径语义对应。
- PDF 链接对应，中文使用 `./docs/...`，英文使用 `../docs/...`。
- JSON-LD 的 `name`、`alternateName`、`inLanguage` 不互相写反。
- 首页两处 quote 都对应。
- 档案页学术科研和项目与实践结构对应。
- 英文不是中文逐字硬译，但不遗漏核心内容。

---

## 12. 性能测试

### 12.1 基本检查

建议使用 Chrome DevTools 或 Lighthouse。

检查：

- 首屏不依赖第三方统计才能渲染。
- 首屏头像合理设置加载优先级。
- 非首屏图片使用 `loading="lazy"`。
- 大图写了 `width` / `height`，不造成布局位移。
- Font Awesome 本地字体没有 404。
- 不请求 Google Fonts。
- 不请求不存在的 `fonts.css`。
- 第三方统计脚本不阻塞 `window.load`。
- JS 报错数为 0。
- 图片体积合理。

### 12.2 目标

| 指标 | 目标 |
| --- | --- |
| Performance | 95+ |
| Accessibility | 95+，目标 100 |
| Best Practices | 100 |
| SEO | 100 |

Lighthouse 分数不是唯一标准。对于个人学术主页，真实可读、资源正确、移动端稳定和证明材料可访问优先级更高。

### 12.3 图片体积检查

建议：

| 类型 | 建议体积 |
| --- | --- |
| 缩略图 | 40–120KB |
| lightbox 大图 | 100–900KB |
| 普通证书图 | 尽量小于 500KB |
| 首屏头像 | 保持清晰且不过大 |
| PDF | 在可读前提下控制体积 |

禁止：

- 将 20MB / 40MB 原图直接作为 `<img src>`。
- 将未经压缩的扫描件放在首屏。
- 为一个小图标引入大图片。

---

## 13. 可访问性测试

### 13.1 键盘测试

检查：

- Tab 能进入 skip link。
- skip link 能跳到 `#main-content`。
- 导航项顺序合理。
- 主题按钮可键盘触发。
- 移动抽屉打开后焦点不跑到背景。
- lightbox 打开后焦点不跑到背景。
- Escape 关闭弹层。
- 返回顶部可键盘触发。
- 隐藏状态组件不可聚焦。

### 13.2 语义测试

检查：

- `<main id="main-content">` 存在。
- 页面有合理标题层级。
- 图片 alt 有意义，不写无意义“图片”。
- 图标按钮有可访问名称。
- 当前导航使用 `aria-current="page"`。
- 不能只靠颜色表达状态。

### 13.3 减少动画

在系统开启 reduced motion 时：

- 平滑滚动不应强制执行。
- 动画不应影响阅读。
- hover / entrance animation 不应成为理解内容的必要条件。

---

## 14. 跨浏览器兼容性

桌面：

- Chrome 最新版。
- Edge 最新版。
- Firefox 最新版。
- Safari 最新版，如果有 macOS。

移动：

- iOS Safari。
- Android Chrome。

重点检查：

- `inert` 支持或降级表现。
- `backdrop-filter` 和 `-webkit-backdrop-filter`。
- `text-size-adjust` 和 `-webkit-text-size-adjust`。
- PDF iframe 支持差异。
- `localStorage` 隐私限制。
- Font Awesome 字体加载。
- 横向滑动是否误触发系统返回手势。

---

## 15. 历史回归测试

每次发布前至少抽查：

- Agent 没有使用正则解析嵌套 HTML。
- 没有执行未确认的 `git restore/reset/clean`。
- Hero 宽屏对齐没有回退。
- 手机 Hero rail 仍中心吸附。
- 深色主题 `status-note` 可读。
- 移动抽屉关闭后背景链接可点击。
- sitemap 没有重复 resume 或遗漏页面。
- brand-mark 仍是 `assets/icons/brand-mark.png`。
- favicon 仍是 `assets/icons/site.ico`。
- 没有远程 Google Fonts。
- 没有不存在的 `fonts.css`。
- 证明图不再直接加载几十 MB 原图。
- `docs/` 目录仍只保留 PDF、`onboarding.md` 和 `design/` 文档体系。
- 404 页面有 noindex。
- 简历页 Font Awesome 图标正常。

---

## 16. 针对修改类型的测试策略

### 16.1 只改文案

最低测试：

- 检查中文页和英文页是否都需要改。
- 检查文案是否会导致移动端溢出。
- 检查是否影响 JSON-LD、OG、PDF 简历。

命令：

```bash
git diff --check
```

### 16.2 新增或替换证明图

最低测试：

- 图片体积。
- thumb/full 路径。
- `alt`、`width`、`height`。
- lightbox。
- 中英文同步。
- 移动端无溢出。

### 16.3 修改 CSS

最低测试：

- 390px、834px、1366px、1920px。
- 浅色和深色。
- 首页、档案页、受影响页面。
- `git diff --check`。

如果改断点、布局网格、proof-grid、Hero，必须覆盖全部 14 页抽查。

### 16.4 修改 JS

最低测试：

```bash
node --check assets/js/site.js
node --check assets/js/stats.js
```

然后按改动模块测试：

| 改动 | 重点 |
| --- | --- |
| 主题 | data-theme、ysb-theme、刷新保持 |
| 抽屉 | focus trap、inert、Escape、背景穿透 |
| lightbox | 打开关闭、caption、焦点恢复 |
| stats | 成功、失败、部分成功、localStorage |
| anchor | 跳转不遮挡、aria-current |
| 返回顶部 | 出现/隐藏、键盘、reduced motion |

### 16.5 修改 `<head>` 或 SEO

最低测试：

- 14 页 head 完整。
- Font Awesome 不丢。
- favicon 不丢。
- canonical / hreflang 正确。
- JSON-LD 合法。
- 404 noindex。
- sitemap 更新。

### 16.6 修改路由或新增页面

最低测试：

- 新增中英文页面。
- 更新导航。
- 更新语言切换。
- 更新 sitemap。
- 更新 testing 矩阵。
- 更新 onboarding 项目地图。
- 线上路径打开正常。

---

## 17. 发布前最小通过标准

一次普通内容发布至少满足：

1. 自动化静态检查通过。
2. `git diff --check` 通过。
3. 本地服务器能打开关键页面。
4. 中文首页、英文首页、中文档案、英文档案、中文简历、英文简历、中文统计、中文 404 打开正常。
5. 移动抽屉、主题切换、lightbox 至少各抽查一次。
6. 如果修改页面路由，sitemap 已重新生成并检查。
7. 如果修改图片，体积和路径已检查。
8. 如果修改英文或中文结构，对应语言页已同步。
9. 没有未解释的大范围 diff。

---

## 18. 发布后线上冒烟测试

发布完成后，用无痕窗口打开：

```text
https://yan-shibo.github.io/
https://yan-shibo.github.io/en/
https://yan-shibo.github.io/profile.html
https://yan-shibo.github.io/en/profile.html
https://yan-shibo.github.io/resume.html
https://yan-shibo.github.io/en/resume.html
https://yan-shibo.github.io/analytics.html
https://yan-shibo.github.io/404.html
https://yan-shibo.github.io/sitemap.xml
```

检查：

- CSS 正常。
- favicon 正常。
- brand-mark 正常。
- Font Awesome 正常。
- PDF 能打开。
- 中英文切换正确。
- 主题切换后刷新保持。
- 移动端菜单可用。
- lightbox 可用。
- 统计失败时页面仍可读。
- 404 跳转正确。

如果看不到更新：

1. 等 GitHub Pages 部署完成。
2. 无痕窗口打开。
3. `Ctrl + F5`。
4. 直接访问对应静态资源路径。
5. 检查文件名大小写。

---

## 19. 测试记录模板

每次较大改动建议记录：

```markdown
## 测试记录：YYYY-MM-DD

### 改动范围

- 修改文件：
- 修改目的：

### 自动化检查

- [ ] node --check assets/js/site.js
- [ ] node --check assets/js/stats.js
- [ ] node --check scripts/generate-sitemap.js
- [ ] node scripts/generate-sitemap.js
- [ ] git diff --check

### 人工检查

- [ ] 390px
- [ ] 834px
- [ ] 1366px
- [ ] 1920px
- [ ] 浅色主题
- [ ] 深色主题
- [ ] 中文页
- [ ] 英文页
- [ ] 移动抽屉
- [ ] lightbox
- [ ] PDF
- [ ] 统计降级

### 未覆盖风险

- 说明未测试的浏览器、设备或页面。
```

---

## 20. Agent 修改后的汇报要求

Agent 修改文件后，必须向用户说明：

1. 改了哪些文件。
2. 为什么这样改。
3. 是否同步了中英文页面。
4. 执行了哪些命令。
5. 哪些测试通过。
6. 哪些测试未执行。
7. 是否存在需要用户本地确认的视觉项。

不得只说“已完成”。

---

## 21. 结构化修改的心智自测

每次对复杂嵌套 HTML，例如 `.info-grid`、`.timeline-stage`、`.project-card`、`.proof-grid` 进行修改、重排或提取后，必须执行：

1. **闭合验证**：检查 `<div>`、`<ul>`、`<article>`、`<section>` 是否成对。
2. **影响范围测试**：用 `git diff` 确认只影响目标文本和目标标签。
3. **本地状态测试**：有回滚或批量覆盖动作前先看 `git status`。
4. **预览确认**：本地浏览器刷新目标页面。
5. **中英文确认**：对应语言页面同步检查。
6. **移动端确认**：390px 下不溢出。
7. **主题确认**：浅色、深色均可读。

---

## 22. 最终测试口令

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
我已经检查移动端、深色主题和 lightbox。
我知道哪些内容尚未验证。
```
