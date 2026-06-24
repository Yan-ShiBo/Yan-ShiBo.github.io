# 测试与质量保障指南

本站是零构建静态站点，但测试不能只停留在“能打开页面”。本指南覆盖 14 个页面、7 个响应式断点、主题、交互、统计降级、SEO、性能和历史回归问题。

## 1. 测试范围

### 1.1 页面范围

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

### 1.2 断点范围

| 编号 | 视口 | 用途 |
| --- | --- | --- |
| V1 | 320px | 极窄手机边界 |
| V2 | 360px | 窄手机 |
| V3 | 390px | 常见手机 |
| V4 | 640px | 手机布局临界点 |
| V5 | 834px | 移动抽屉/桌面导航临界点 |
| V6 | 1366px | 常见笔记本 |
| V7 | 1920px / 2560px | 宽屏和超宽屏 |

## 2. 自动化静态检查

在仓库根目录运行：

```powershell
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
git diff --check
```

如果新增、删除、改名页面，或需要更新 `lastmod`，再运行：

```powershell
node scripts/generate-sitemap.js
```

检查点：

- JS 语法无错误。
- `sitemap.xml` 没有重复 `<loc>`。
- 每个 sitemap 条目有 `zh-CN`、`en`、`x-default` alternate。
- Git 补丁没有行尾空白。

## 3. 本地 HTTP 检查

启动本地服务：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

快速探活：

```powershell
Invoke-WebRequest http://127.0.0.1:8000/
Invoke-WebRequest http://127.0.0.1:8000/en/
Invoke-WebRequest http://127.0.0.1:8000/profile.html
Invoke-WebRequest http://127.0.0.1:8000/en/profile.html
Invoke-WebRequest http://127.0.0.1:8000/resume.html
Invoke-WebRequest http://127.0.0.1:8000/analytics.html
Invoke-WebRequest http://127.0.0.1:8000/404.html
```

HTTP 200 只说明文件可访问，后续视觉和交互检查仍必须执行。

## 4. 逐页可访问性与功能测试

### 4.1 全站通用

每个页面都检查：

- `<html lang>` 正确：中文为 `zh-CN`，英文为 `en`。
- skip link 可通过键盘聚焦并跳到 `#main-content`。
- 顶部导航当前页有 `aria-current="page"`。
- 语言切换链接指向对应中英文页面。
- 主题按钮有可访问名称并能切换。
- Font Awesome 图标正常显示，brand-mark 是 terminal 图标。
- favicon 使用 `assets/icons/site.ico`。
- 页脚邮箱、GitHub、简历、返回顶部可用。

### 4.2 首页 P1 / P8

- Hero 左侧身份、研究方向、行动按钮可见。
- Hero 右侧 profile、quote、keywords、site counters 可见。
- 梁启超 quote 在 Hero 和 quote band 两处存在，并且中英文结构对应。
- 宽屏下 Hero 外侧边缘与下方 `section-block` 对齐。
- 手机下 Hero 侧栏横向卡片中心吸附。
- 统计失败时内容仍可阅读。

### 4.3 档案页 P2 / P9

- Anchor bar 项目完整，点击后标题不被 sticky header 遮挡。
- 研究生、本科、高中、初中、小学阶段都可到达。
- 每个证明图 `proof-item` 可打开 lightbox。
- 本科证明区手机下不产生全局横向溢出。
- 中文证明图片和英文证明图片数量、顺序、路径语义一致。

### 4.4 研究页 P3 / P10

- 方法链顺序清楚：规格、SAC、PAC、多项式近似、SBC/SOS/SDP、迭代。
- 深色区文字、按钮、标签对比度足够。
- 页内 anchor `#method-chain` 跳转后不被导航遮挡。

### 4.5 项目页 P4 / P11

- PersevereStudy 和 MicFamily 仓库链接正确。
- 两个项目卡片的角色、时间、技术栈、证据图完整。
- 项目证明图可打开 lightbox。
- 手机下 `.grid-2` 正常堆叠，不出现按钮文字溢出。

### 4.6 简历页 P5 / P12

- PDF 简历按钮可打开。
- 成绩单 PDF 按钮可打开。
- PDF iframe 预览加载失败时 fallback 文案和链接存在。
- 头像、联系方式、关键词、快速信息结构完整。
- 成绩单图片版可打开 lightbox。

### 4.7 统计页 P6 / P13

- `#stats-status` 初始为加载状态。
- 公开计数成功、部分成功、失败三种状态文案可读。
- 本地记录 `#local-total`、`#local-page`、`#local-days`、`#local-first`、`#local-last` 能显示。
- 清理 localStorage 后重新访问不会报错。
- 首页统计卡和统计页公开统计口径一致。

### 4.8 404 页面 P7 / P14

- `meta name="robots" content="noindex"` 存在。
- 中文 404 的按钮指向中文页面。
- 英文 404 的按钮指向英文页面。
- 中文 404 5 秒后跳 `/`。
- 英文 404 5 秒后跳 `/en/`。
- 倒计时数字正常递减。

## 5. 响应式测试矩阵

每个页面都要在 7 个断点至少做一次人工检查。表格中的 `Y` 表示必须检查。

| 页面 | 320 | 360 | 390 | 640 | 834 | 1366 | 1920/2560 | 重点 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 首页 | Y | Y | Y | Y | Y | Y | Y | Hero rail、统计卡、quote |
| P2 档案 | Y | Y | Y | Y | Y | Y | Y | anchor、proof-grid、时间线 |
| P3 研究 | Y | Y | Y | Y | Y | Y | Y | method-chain、深色区 |
| P4 项目 | Y | Y | Y | Y | Y | Y | Y | 项目卡、仓库按钮 |
| P5 简历 | Y | Y | Y | Y | Y | Y | Y | PDF iframe、成绩单图 |
| P6 统计 | Y | Y | Y | Y | Y | Y | Y | 大数字、状态条 |
| P7 404 | Y | Y | Y | Y | Y | Y | Y | 按钮和倒计时 |
| P8 EN 首页 | Y | Y | Y | Y | Y | Y | Y | 英文长词不溢出 |
| P9 EN 档案 | Y | Y | Y | Y | Y | Y | Y | 英文证明说明 |
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

## 6. 主题测试

### 6.1 手动切换

1. 在浅色模式点击主题按钮，页面切到深色。
2. 再次点击，页面切回浅色。
3. 检查 `<html>` 的 `data-theme` 是否变化。
4. 检查 `localStorage.ysb-theme` 是否保存。

### 6.2 刷新保持

1. 切到深色后刷新。
2. 页面应直接以深色状态显示。
3. 切到浅色后刷新同样保持。

### 6.3 系统偏好

清除 `ysb-theme` 后，页面应跟随 `prefers-color-scheme`。如果浏览器不易切换系统主题，至少确认 `site.js` 中监听逻辑无报错。

### 6.4 对比度组件

深浅主题都检查：

- `status-note[data-state="ok"]` 和 `warn`。
- `tile-dark` 内的 panel、button、tag。
- drawer 背景与文字。
- quote-card 和 quote-band。
- visited links。

## 7. 交互测试

### 7.1 移动抽屉

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

### 7.2 Lightbox

在档案、项目、简历页测试：

- 点击 `proof-item` 打开 lightbox。
- 图片 alt 和 caption 正确。
- Escape 关闭。
- 点击背景关闭。
- 点击关闭按钮关闭。
- Tab 不跳到背景页面。
- 关闭后焦点回到触发图片。

### 7.3 返回顶部

- 页面滚动超过阈值后浮动返回顶部出现。
- 移动抽屉打开时返回顶部隐藏且不可聚焦。
- 点击后回到页面顶部。
- `prefers-reduced-motion` 下应使用非平滑滚动。

### 7.4 Anchor bar

- 档案页 anchor 点击后目标段落不被 header 遮挡。
- 滚动时对应 anchor-chip 更新 `aria-current`。
- 手机下 anchor bar 可横向滚动。

## 8. 统计系统测试

### 8.1 Vercount 正常

- Network 中 `events.vercount.one/js` 返回成功。
- `#vercount_value_site_pv` 等隐藏节点被写入。
- 可见卡片显示数字。

### 8.2 Busuanzi 正常

- 至少一个 Busuanzi 候选脚本加载成功。
- `#busuanzi_value_site_pv` 等隐藏节点被写入。
- Vercount 不可用时仍可显示 Busuanzi 的有效值。

### 8.3 两者都失败

模拟方式：断网、浏览器拦截或临时在 DevTools 阻止相关域名。

预期：

- 24 秒内最终进入 unavailable/warn 状态。
- 可见公开统计显示 `--`。
- 页面无 JS 报错。
- 本地记录仍更新。

### 8.4 部分成功

如果只有 site PV 有效，UV 或 page PV 无效：

- 状态为 partial/ok。
- 有效值显示数字。
- 无效值显示 `--`。

### 8.5 localStorage

检查键：

- `ysb-visit-total`
- `ysb-visit-first`
- `ysb-visit-last`
- `ysb-visit-days`
- `ysb-page:/...`

刷新当前页面后，本机累计访问和当前页本机访问应增加。

## 9. 跨浏览器兼容性

桌面：

- Chrome 最新版。
- Edge 最新版。
- Firefox 最新版。
- Safari 最新版（如果有 macOS）。

移动：

- iOS Safari。
- Android Chrome。

重点检查：

- `inert` 支持或降级表现。
- `backdrop-filter` 不支持时页面仍可读。
- PDF iframe 支持差异。
- `localStorage` 隐私限制。
- Font Awesome 字体加载。

## 10. SEO 和结构化数据测试

每个公开页面检查：

- `<title>` 唯一且描述页面。
- `meta name="description"` 存在。
- canonical 指向正确线上 URL。
- `hreflang="zh-CN"`、`en`、`x-default` 存在。
- OG title/description/url/image 存在。
- Twitter card 信息存在。
- JSON-LD 合法；ProfilePage/Person 字段和页面语言一致。
- 404 页面 `noindex`。

sitemap 检查：

- 只包含 6 对主页面，不包含 404。
- URL 不重复。
- `/` 和 `/en/` 配对正确。
- 每个条目包含三个 alternate。

## 11. 性能测试

建议使用 Chrome DevTools 或 Lighthouse。

检查：

- 首屏不依赖第三方统计才能渲染。
- 首屏头像使用 `fetchpriority="high"` 和 `loading="eager"`。
- 非首屏图片使用 `loading="lazy"`。
- 大图没有导致布局位移，因为 HTML 写了 width/height。
- Font Awesome 本地字体没有 404。
- Google Fonts 加载失败时系统字体 fallback 正常。
- JS 报错数为 0。

目标：

- Performance 95+。
- Accessibility 95+，目标 100。
- Best Practices 100。
- SEO 100。

## 12. 中英文一致性测试

检查每组页面：

- header、drawer、footer 结构一致。
- 导航项数量一致。
- 语言切换互相指向。
- 主要 section 数量一致。
- `proof-item` 数量、顺序、图片路径对应。
- PDF 链接对应，中文使用 `./docs/...`，英文使用 `../docs/...`。
- JSON-LD 的 `name`、`alternateName`、`inLanguage` 不互相写反。
- 首页两处 quote 都对应。

## 13. 边界与历史回归测试

每次发布前至少抽查：

- Hero 宽屏对齐没有回退。
- 手机 Hero rail 仍中心吸附。
- 深色主题 `status-note` 可读。
- 移动抽屉关闭后背景链接可点击。
- sitemap 没有重复 resume 或遗漏页面。
- brand-mark 仍是 terminal 图标 `\f120`。
- favicon 仍是 `assets/icons/site.ico`。
- `docs/` 目录仍只保留 3 个 PDF、`onboarding.md` 和 `design/`。

## 14. 发布前最小通过标准

一次文档或内容发布至少满足：

1. 自动化静态检查通过。
2. `docs/` 目录结构符合预期。
3. 中文首页、英文首页、中文档案、中文简历、中文统计、中文 404 打开正常。
4. 移动抽屉、主题切换、lightbox 至少各抽查一次。
5. 如果修改页面路由，sitemap 已重新生成并检查。

## 15. 结构化修改的心智自测 (防退化)

每次对复杂的嵌套 HTML（如 `.info-grid` 或 `.timeline-stage`）进行修改、重排或提取后，必须执行以下心智自测与验证：

1. **闭合验证**：手动校验修改的区块，其 `<div>`、`<ul>`、`<article>` 等核心结构标签是否成对出现。
2. **影响范围测试**：利用 `git diff` 比对变更，确保仅仅影响了目标文本和目标标签，绝不能出现预期外的大量删减。
3. **本地状态测试**：如果有回滚或批量覆盖的操作，先看 `git status` 确认没有危及用户的 `untracked` 图片资源和代码。
4. **预览确认**：修改 Masonry 布局（瀑布流）顺序后，提醒用户在本地浏览器刷新预览，确认 CSS 没有异常堆叠。
