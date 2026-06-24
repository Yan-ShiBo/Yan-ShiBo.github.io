# 问题汇总、解决方案与防退化手册

本文汇总已经要求修改或容易回归的问题，说明根因、解决方式和后续检查点。后续改站点前先看本文件，避免"改一处坏一处"。

## 1. 站点结构和资源目录混乱

**现象**：早期页面、资源目录和路由命名容易分散，维护时不清楚哪些文件仍在使用。

**根因**：静态站点没有构建系统帮忙统一入口，旧资源目录和旧路由如果不删除，会长期干扰判断。

**解决方式**：

- 当前公共页面限定为 `index.html`、`profile.html`、`research.html`、`projects.html`、`resume.html`、`analytics.html` 和 `404.html`，英文镜像在 `en/`。
- 资源集中到 `assets/`，包括 `css`、`js`、`images`、`profile`、`icons`、`vendor/font-awesome-4.7.0`。
- sitemap 只由 `scripts/generate-sitemap.js` 的 `pagePairs` 生成。

**防退化检查**：

- 新增页面时同时新增中英文页面。
- 修改路由时同步改导航、语言切换、canonical、`hreflang`、sitemap 脚本。
- 不恢复旧的 `resource/`、`Homepage_files/`、`img/` 目录。

## 2. 中英文内容不完全平行

**现象**：中文更新后英文页缺少对应内容，或梁启超诗句等内容只在一个位置更新。

**根因**：中英文是独立 HTML 文件，没有模板系统自动同步。

**解决方式**：

- 所有页面都采用中文根目录、英文 `en/` 镜像结构。
- 首页的梁启超诗句在 Hero 侧栏和页面底部 quote band 各出现一次，双语都要同步。
- 导航、页脚、证明图、PDF 链接和结构 class 保持对应。

**防退化检查**：

- 修改 `index.html` 后检查 `en/index.html`。
- 修改任何证明图、项目卡片、材料入口后检查英文对应页。
- 不只翻译导航，要同步内容位置和结构。

## 3. 深色主题下状态提示不可读

**现象**：例如 "Public counters loaded successfully" 在深色背景上颜色不清晰。

**根因**：浅色主题的 `status-note[data-state]` 样式泄漏到深色主题，背景和文字对比不足。

**解决方式**：

- 使用 `:root[data-theme="dark"] .status-note[data-state="ok"]` 和 `warn` 覆盖。
- 状态样式必须同时考虑浅色页面、深色主题和 `tile-dark` 区域。

**防退化检查**：

- 改 `status-note` 时同时查看浅色和深色主题。
- 统计页和首页 Hero 都要检查，因为两处都使用 `#stats-status`。

## 4. 桌面端 Hero 与下方板块歪斜

**现象**：宽屏下 Hero 左右内容边缘和下方 `section-block` 内容边缘不在同一条垂直线上。

**根因**：`section-block` 使用 1440px 轨道动态 padding，而 Hero 内部曾使用固定 `max-width` 加 `auto margin`，导致外侧边缘随视口变化。

**解决方式**：

```css
@media (min-width:1069px){
  .hero .hero-copy{
    max-width:none;
    margin-left:0;
    padding-left:max(24px, calc((100vw - var(--max-width)) / 2));
    padding-right:64px;
  }
  .hero .hero-side{
    max-width:none;
    margin-right:0;
    padding-right:max(24px, calc((100vw - var(--max-width)) / 2));
    padding-left:64px;
  }
}
```

**防退化检查**：

- 1920px 宽度下，Hero 左侧 eyebrow 和下方 section 标题左边缘应对齐。
- Hero 右侧最宽卡片右边缘应与下方材料卡片轨道对齐。
- 不要用额外 HTML 包裹 Hero 来修对齐，应该修 CSS padding 轨道。

## 5. 移动端 Hero 卡片中心线不对齐

**现象**：手机上 Hero 侧栏卡片横向滑动时，卡片更像左边缘吸附，没有居中在屏幕中。

**根因**：移动横向 rail 缺少对称 gutter 和 `scroll-snap-align:center`。

**解决方式**：

- 用 `--hero-rail-card` 和 `--hero-rail-gutter` 计算卡片宽度与左右留白。
- rail 设置 `scroll-padding-inline:var(--hero-rail-gutter)`。
- 第一张和最后一张分别加左右 gutter。
- 子项设置 `scroll-snap-align:center`。

**防退化检查**：

- 375px、390px、430px 视口下，卡片中心线应落在屏幕中心。
- 不要把 Hero 侧栏拆成无结构的单列堆叠，除非重新定义移动信息架构。

## 6. 证明图片横向滑动只覆盖一处

**现象**：只让某一个 `proof-grid` 变成横向滑动，其他证明区仍过长或布局不一致。

**根因**：选择器只写到具体页面或具体 id，遗漏 `proof-grid-wide`、`proof-grid-compact`、`proof-grid-project` 等变体。

**当前状态**：代码中对本科阶段证明区有专门移动端横向 rail。未来如果要推广到更多证明区，必须按组件变体设计，不要只补一个局部 id。

**防退化检查**：

- 看 `profile.html` 的本科、高中、初中、小学证明区。
- 看 `projects.html` 的项目证明区。
- 看 `resume.html` 的成绩单图片区。

## 7. 移动抽屉点击或焦点异常

**现象**：移动端菜单打开后背景仍可聚焦，或关闭后链接点击区域异常。

**根因**：遮罩、抽屉、背景元素的 `pointer-events`、`touch-action`、`inert` 和焦点恢复逻辑互相影响。

**解决方式**：

- `site.js` 中打开抽屉时对背景调用 `setBackgroundInert(true, [drawer, backdrop])`。
- 关闭抽屉时恢复背景、设置抽屉 `aria-hidden="true"` 和 `inert`。
- 抽屉内使用 `trapFocus` 捕获 Tab。

**防退化检查**：

- 手机宽度下打开和关闭菜单。
- 按 Escape 能关闭。
- Tab 不应跳到背后页面。
- 抽屉关闭后普通链接可以正常点击。

## 8. sitemap 出现重复或缺失路由

**现象**：`sitemap.xml` 里出现重复 resume 路由，或新增页面没有被收录。

**根因**：`scripts/generate-sitemap.js` 的 `pagePairs` 是手工维护列表。

**解决方式**：

- `pagePairs` 中每个中文路由只出现一次，对应一个英文路由。
- 运行 `node scripts/generate-sitemap.js` 重新生成 `sitemap.xml`。

**防退化检查**：

- 搜索 `sitemap.xml` 中同一 `<loc>` 不应重复。
- 检查每个中文 URL 都有 `zh-CN`、`en` 和 `x-default` alternate。

## 9. 文档模板化、与当前站点无关

**现象**：`docs/design/large_project_docs.md` 是泛化的大型项目文档模板，里面讨论数据库、微服务、PR 审批等，与当前静态站点不匹配。

**根因**：文档没有围绕真实代码和真实运维路径收敛。

**解决方式**：

- 删除泛化模板文档。
- 保留并重写站点实际需要的架构、设计、样式、接口、数据、运维、测试、用户维护和合规文档。

**防退化检查**：

- 新文档必须能指向真实文件、真实页面或真实维护动作。
- 不写"如果是大型项目应当……"这类与本站无关的模板段落。

## 10. 文档与真实代码状态不一致

**现象**：旧文档写 `localStorage.theme` 或 `.dark`，但真实代码使用 `ysb-theme` 和 `:root[data-theme="dark"]`。

**根因**：文档没有随代码演进更新。

**解决方式**：

- 主题文档统一写 `data-theme` 与 `ysb-theme`。
- 统计文档统一写 `ysb-visit-*` 和 `ysb-page:<pathname>`。
- 外部统计统一写 Busuanzi 候选脚本和 Vercount。

**防退化检查**：

- 改 JS 键名、DOM id 或 CSS 状态属性时，必须同步改 `docs/design/architecture.md`、`docs/design/ops.md` 和 `docs/design/testing.md`。

## 11. 改动前后总检查

每次修改完成后至少执行：

```powershell
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
git diff --check
```

如果改了页面路由、页面内容或需要更新搜索引擎 `lastmod`，再运行：

```powershell
node scripts/generate-sitemap.js
```

如果改了页面或样式，再启动本地服务：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

检查 `/`、`/profile.html`、`/en/`、`/en/profile.html`、`/analytics.html` 和移动端菜单。

如果改了文档结构或路径：

- 检查 `docs/design/` 下的文档路径引用是否仍然正确
- 检查 `onboarding.md` 中的阅读顺序是否指向正确文件
- 检查 `docs/` 根目录是否仍只包含 3 个 PDF、`onboarding.md` 和 `design/`

## 12. Favicon 更换为自定义专属几何符号

**现象**：最初的 favicon 细节过多，在 16×16 尺寸下像毫无意义的噪点；且未与个人身份建立直接联系。

**根因**：之前选用的形式化验证相关图形过于复杂，违背了 Favicon 在小尺寸下“清楚优先于含义丰富”的原则。

**解决方式**：
- 重新设计为以字母 `Y`（Yan / 闫士博的首字母）为核心的自定义几何符号，占用 70%–80% 画布。
- 采用深蓝底色（`#020617`）及 1px 灰蓝内边框（`#334155`），在浅色、深色或系统主题色标签栏中均保持轮廓稳定。
- 增加右上角青色小方块（`#06B6D4`），辅助识别并统一主页冷色调。
- 使用 Python PIL 将包含上述设计的图片转换为多尺寸 `.ico` 格式，覆盖 `assets/icons/site.ico`。

**防退化检查**：
- 不要为 Favicon 加入渐变、阴影、细描边或其他小元素，必须保持高对比、少细节的特性。
- 更换 favicon 后用 `Ctrl+F5` 强制刷新确认浏览器不使用缓存。
- 保持 `manifest.webmanifest` 图标路径不变，维持 ICO 格式以最大化兼容性。

## 13. Brand-mark 图标统一为专属几何符号

**现象**：左上角品牌图标 (brand-mark) 之前使用的是终端图标 (\f120)，为了与全新的 Favicon 保持视觉统一，现将其更换为专属的字母 Y 几何符号。

**根因**：个人主页的视觉识别系统需要保持一致，Favicon 和导航栏 Brand-mark 使用相同的专属符号有助于建立强烈的个人品牌印象。

**解决方式**：
- 在 `assets/icons/` 下生成了小尺寸的专属 `brand-mark.png` 图像。
- 在 `assets/css/site.css` 中，将 `.brand-mark` 的实现从 Font Awesome 图标更改为使用 `background-image` 加载该 PNG 图片。
- 移除了原有的 `::before` 和 Font Awesome 字体定义，直接让 `.brand-mark` 以正方形图片的形式展示。

**防退化检查**：
- 确认 `brand-mark` 显示清晰，且不被拉伸变形。
- 以后若要更新符号，应直接替换 `assets/icons/brand-mark.png` 图片，并在设计上依然保持大面积几何体和深蓝色背景。
- 不要在 HTML 中用内联样式覆盖 brand-mark 的背景图。

## 14. 文档体系从模板化清理为项目实际内容

**现象**：`docs/` 目录包含 8 个子目录（api/、db/、compliance/、user/、adr/、ops/、testing/、design/），其中多个目录的内容对纯静态个人主页来说是过度设计（如 API 文档、数据库模型文档）。

**根因**：早期按大型项目模板一次性生成了完整文档骨架，但本站是纯静态 GitHub Pages 站点，没有后端 API、数据库或微服务。

**解决方式**：
- 将有价值的内容合并到 `docs/design/` 下的统一文档中。
- api.md、datamodel.md、compliance.md、ADR 合并进 `architecture.md`。
- deployment.md + runbook.md 合并为 `ops.md`。
- testing.md 移入 `design/` 并大幅扩充。
- glossary.md 移入 `design/`。
- user_guide.md 合并进 `onboarding.md`。
- 删除空的旧子目录。
- 最终 `docs/` 下只保留 3 个 PDF + 1 个 `onboarding.md` + 1 个 `design/` 子目录。

**防退化检查**：
- 新增文档时先考虑是否属于 `docs/design/` 下某个已有文档的自然扩展。
- 不要重新创建 api/、db/、compliance/ 等与静态站点无关的目录。
- 文档内容必须指向真实文件和真实页面，不写泛化模板段落。

## 15. 测试文档过薄，无法防回归

**现象**：旧测试文档只有简单清单，覆盖不到 404、统计降级、lightbox 键盘、跨浏览器、极端视口、中英文一致性等关键场景。

**根因**：测试文档按普通静态页粗略列项，没有映射到当前 14 个页面、7 个断点和历史回归问题。

**解决方式**：

- 将测试文档移入 `docs/design/testing.md`。
- 按自动检查、14 页逐页检查、7 断点矩阵、主题、交互、统计、跨浏览器、SEO、性能、历史回归和双语一致性全面重写。
- 把历史问题中的防退化检查汇总成发布前回归列表。

**防退化检查**：

- 新增页面后必须把它加入测试矩阵。
- 新增交互后必须补充键盘和移动触控测试。
- 修改统计、主题、抽屉、lightbox、PDF 或 sitemap 后必须补充对应测试项。

## 16. 移动端滑动体验与交互手感生硬

**现象**：
移动端侧边菜单（Drawer）打开时可能发生背景穿透滚动，侧栏内的点击有延迟感；另外首页和证明材料区的横向卡片列表（Carousel）滚动不跟手，滑动结束时卡片不会自动居中或对齐屏幕边缘，缺失类似原生应用（Native App）的顺滑体验。

**根因**：
- 侧边栏及遮罩层缺少 `touch-action` 限制，导致系统默认缩放/手势起效。
- 侧边栏导航链接因未指定 `touch-action: manipulation;`，在部分移动端浏览器上存在约 300ms 的双击缩放判定点击延迟。
- 横向滑动列表使用的是宽松的 `scroll-snap-type: x proximity;`（或完全缺失），没有强制对齐点，且未限制横向越界滚动 (`overscroll-behavior`)。

**解决方式**：
- **Drawer 交互升级**：为 `.drawer-backdrop` 增加 `touch-action: none;` 防止穿透；为 `.drawer` 增加 `touch-action: pan-y;` 防止水平越界手势；为 `.drawer-nav a` 增加 `touch-action: manipulation;` 消除点击判定延迟。
- **Scroll Snapping 优化**：将 `.hero .quick-stats`、`.proof-grid` 等横向列表改为 `scroll-snap-type: x mandatory;`，内部卡片设置 `scroll-snap-stop: always;`，实现干脆利落的吸附停靠效果。
- **防止滚动越界穿透**：为横向滑动容器设置 `overscroll-behavior-inline: contain;`，以阻断水平滑到尽头时触发系统级的“滑动返回”切换页面手势。
- **完善滑动边距**：利用 CSS 变量（`--hero-rail-card`, `--hero-rail-gutter`）为移动端 Hero 侧栏进行动态宽度和间距计算，从而保持滑动到首尾卡片时的完美边距和屏幕居中感。

**防退化检查**：
- 修改或新增带有 `.drawer-backdrop` 的全局弹层时，必须在手机上测试其防穿透效果。
- 在任何横向滚动的组件中增减子卡片时，切勿移除 `scroll-snap-align: center;` 或 `start;` 等吸附属性。
- 确保站内的水平横向列表在疯狂左右滑动时，不会错误触发 iOS 自带的页面边缘返回上一页手势。

## 17. 浅色模式下 Kicker（强调色小字）与主体风格不搭

**现象**：浅色模式下蓝色的 `.kicker` 显得突兀，破坏了类似苹果官网的极简/工程师美术风格。
**根因**：使用了纯蓝色作为高亮色，而网站整体背景是黑白灰和纸质色调。
**解决方式**：
- 取消纯蓝高亮，浅色模式下使用低调的灰色（`var(--ink-muted)`），深色模式下使用略亮的 `var(--body-muted)`。
- 通过结构、大小和粗细（如全大写、`font-weight: 600`、加宽字间距）来区分视觉层级，而非依赖彩色。

**防退化检查**：
- 添加新的修饰性副标题（kicker）时，不要强行使用艳丽的彩色。
- 确保其在深色和浅色背景下均能保持低对比度的优雅感，并依赖字偶间距和全大写形成辨识度。

## 18. 主页右侧边栏（Profile Sidebar）信息密度过低且过长

**现象**：姓名被迫折行，邮箱和位置各占一行，访问量统计卡片单列堆叠，导致右侧边栏过长，占据了不必要的垂直空间。
**根因**：Profile 卡片内边距过大，字体和间距没有针对 Hero 侧栏进行专属的紧凑化调整；统计模块默认是 1fr 的单列网格。
**解决方式**：
- 在 `site.css` 中增加针对 `.hero-side` 的专属覆盖：姓名缩小为 24px 以便单行显示，位置和邮箱标签的高度和间距减小并单行排列。
- 英雄区统计（`hero-stats`）改为三列并排（`grid-template-columns: repeat(3, 1fr)`），数值缩小，卡片内边距减小。

**防退化检查**：
- 后续如果给侧栏添加新标签或新卡片，必须检查是否撑破了一行。
- 小于 640px 屏幕时确认三列统计是否会因为过挤而需要换行，或者保留当前的响应式覆盖策略。

## 19. HTML 元数据与结构规范遗漏

**现象**：`<script>` 被放在 `</body>` 之前导致统计阻塞；某些页面的 `rel="noopener"` 缺少 `noreferrer`；`404.html` 包含了无用的 canonical 和预连接；一些页面缺少 OGP/Twitter 社交预览图。
**根因**：从不同阶段或模板复制页面时，未对 HTML 头部的元数据进行全盘规范化梳理。
**解决方式**：
- 将 `<script src="/assets/js/stats.js"></script>` 移入 `<head>` 并加 `defer` 以尽早加载而不阻塞渲染。
- `404.html` 删除 `canonical`，并添加 `<meta name="robots" content="noindex" />`。
- 全站统一外部链接的安全性标签为 `rel="noopener noreferrer"`。
- 在所有内容页（如 profile, research, projects, resume）的 `<head>` 中补齐结构化数据（JSON-LD）和社交预览图（`og:image` 和 `twitter:image`）。

**防退化检查**：
- 新增页面时必须带上包含 OGP/Twitter/JSON-LD 的完整头部。
- `404` 页面绝不能被搜索引擎索引。
- 外链必须包含 `noreferrer`。

## 20. JS 执行性能与本地存储无限制增长

**现象**：由于 Spotlight 鼠标跟随特效挂载在 `pointermove` 上且未节流，导致滑动卡顿；`stats.js` 每天记录的访问历史（visitDays）会导致 localStorage 体积无限增长。
**根因**：高频事件未通过 `requestAnimationFrame` 优化；本地缓存缺少容量控制。
**解决方式**：
- `site.js` 中使用 `requestAnimationFrame` 对 `pointermove` 事件进行节流。
- `stats.js` 中对 `history` 数组进行截断（`.slice(-365)`），最多只保留一年的访问轨迹。

**防退化检查**：
- 新增任何 `scroll` 或 `pointermove` 监听器时必须使用 `requestAnimationFrame` 或 Throttle。
- 向 `localStorage` 写入数组或日志时，必须设定上限并实施 LRU/FIFO 截断。

## 21. Sitemap.xml 的 Lastmod 生成机制错误

**现象**：所有页面的 `<lastmod>` 都是同一天，因为脚本中读取的是共享的 `assets/css/site.css` 的修改时间。
**根因**：为了省事用同一个样式文件的修改时间代替了实际 HTML 内容的修改时间。
**解决方式**：
- `scripts/generate-sitemap.js` 中使用 `fs.statSync` 动态获取每个中/英文 HTML 文件自身的真实 `mtime`。

**防退化检查**：
- 在发布前运行 `node scripts/generate-sitemap.js`，检查生成的 XML 中各个页面的 `<lastmod>` 是否反映了其真正的最后修改日期。

## 22. CSS 标准与前缀遗漏

**现象**：苹果设备上 `text-size-adjust` 不生效；Safari 上毛玻璃特效（`backdrop-filter`）失效；CSS 原生 `text-wrap: nowrap` 在部分老浏览器不支持。
**根因**：缺少 webkit 前缀，并且对现代 CSS 属性的支持度预估过高。
**解决方式**：
- 补充 `-webkit-text-size-adjust: 100%;` 和 `-webkit-backdrop-filter`。
- 将禁止换行的属性组合使用：`white-space: nowrap; text-wrap: nowrap;`。

**防退化检查**：
- 使用比较新的 CSS 规范（如 mask, backdrop-filter）时，必须顺手加上 `-webkit-` 前缀，因为很多 iOS 设备更新并不频繁。

## 23. 相邻区块边距合并导致卡片“粘连”

**现象**：`profile.html` 中“研究生期间”的时间线白色卡片直接贴在了上面带灰色背景的概览区（Overview）底边上，没有留白。
**根因**：带有内边距的 `.section-block` 紧跟着 `.timeline-stage` 时，缺少 `.section-block + .timeline-stage { margin-top: 40px; }`。
**解决方式**：
- 在 `site.css` 中增加相邻兄弟选择器，为紧跟在 `.section-block` 下方的第一个 `.timeline-stage` 增加 40px 顶部外边距，拉开呼吸空间。

**防退化检查**：
- 组合不同的区块（`.section-block`, `.timeline-stage`, `.hero`）时，留意首尾元素的边距表现，避免因父容器无 Padding 或相邻无 Margin 导致的背景粘连。

## 24. 局部排版需求引发的级联崩溃与数据丢失 (2026-06-24)

**现象**：
当用户提出“右边的个人总结放到左边大面积空白处是不是更好”这样一个局部排版微调时，AI 执行了错误的 Python 脚本，导致整个网页 CSS 布局网格（Masonry 瀑布流）彻底崩溃。随后 AI 在没有提前检查状态的情况下执行了 `git restore`，导致用户未提交（untracked）的证明图片和 HTML 标签全部丢失。

**根本原因分析**：
1. **过度执行 (Over-execution)**：面对一个单纯的移动请求，AI 为了“全局排版统一”，过度推断并试图重新应用整个对话上下文中的所有排版变更，而不是采取“只修改目标区块”的外科手术式更新。
2. **错误的技术选型 (Fragile HTML Parsing)**：AI 使用了带有正则表达式（`re.search(r'<div class="info-card">.*?</div\>')`）的 Python 脚本来解析 HTML。因为 HTML 存在大量的嵌套标签（如 `.info-card` 内部嵌套了新加的 `.project-list`），非贪婪正则匹配到了第一个遇到的 `</div>` 就提前终止，直接切断了 HTML 元素。这导致闭合标签大量丢失，结构被破坏。
3. **缺乏本地状态感知与盲目回滚 (Blind Rollback)**：AI 在执行具有破坏性的全局脚本前，没有检查 `git status`。弄坏页面后，AI 理所当然地使用了 `git restore profile.html`。然而它忽略了用户近期在本地手动放入的图片和新写的 HTML 标签都处于“未提交 (uncommitted/untracked)”状态，这直接抹除了用户的工作成果。

**防退化策略**：
- **精准局部修改 (Surgical Precision)**：处理后续排版或跟进需求时，**必须**只针对目标元素做精确的字符串替换，严禁“一刀切”式地运行全局正则替换脚本来重构整个文件。
- **严禁使用正则解析嵌套结构 (No Regex for HTML)**：在任何情况下修改 HTML，**永远不要使用正则表达式提取包含嵌套子节点的标签**。应当使用精准字符串替换工具（精确匹配），或依赖真正的解析器（如 BeautifulSoup）。
- **执行风险操作前必检 Git (Pre-flight Git Check)**：在执行大范围代码修改脚本，或在准备使用 `git restore/reset` 等可能覆盖本地文件的命令前，**必须先执行 `git status`**。如果存在 uncommitted/untracked 的变更，必须先警告并停止操作，或者使用更为精细的还原手段。

## 25. 首页长时白屏与长时间转圈卡顿

**现象**：无论本地还是线上，每次打开页面都会卡住长达几十秒处于白屏状态，或者内容显示后浏览器标签页依然长时间转圈（Loading）。
**根因**：
1. **外部字体同步请求阻塞渲染**：原先使用了 `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` 的同步形式。现代浏览器将外部 CSS 视作渲染阻塞资源。由于国内连接 Google Fonts 极易超时，导致浏览器为了等这个 CSS 完全停止了所有内容的初次绘制（引发长时白屏）。
2. **异步统计脚本阻塞 Load 事件**：虽然 `Vercount` 和 `Busuanzi` 统计脚本使用了 `<script async>`，但在现代浏览器中，解析 HTML 阶段注入的异步脚本依然会强制阻塞 `window.onload` 事件的触发。当这些域名的网络连接较慢时，标签页的加载指示器会一直旋转直到超时，造成极差的“慢速加载”错觉。

**解决方式**：
1. **字体彻底本地化**：将所需字体的 woff2 文件下载至 `assets/fonts/inter/` 目录，并在独立的 `assets/css/fonts.css` 文件中通过 `@font-face` 本地引用，配置 `font-display: swap`。全站 14 个 HTML 彻底移除外部谷歌字体请求。
2. **统计脚本懒加载**：将原本直接写在 HTML 或在 `DOMContentLoaded` 时执行的外部请求注入代码，全部转移到 `window.addEventListener('load', ...)` 之后执行。确保页面图文等核心资产完成加载后，立刻触发原生 `load` 事件（停止转圈），再于后台静默下载第三方统计数据。

**防退化检查**：
- 未来新增任何页面、组件或引入新字体资源时，**严禁引入任何外部字库服务的 CSS 连接**。所有字体必须下载至 `assets/fonts/` 并在 `fonts.css` 中引入。
- 严禁在 HTML 源码中直接写入带有外部 URL 的 `<script src="...">`（即使带有 `async` 或 `defer`）。必须在 `stats.js` 或其他初始化脚本中通过监听 `window.onload` 来懒加载此类第三方非核心功能脚本。


## 26. 字体请求状态不一致导致请求失效

**现象**：HTML 中引用了 `assets/css/fonts.css`，但文件实际不存在（GitHub 返回 404），导致产生无效请求，且多处字体引入不规范。
**根因**：之前优化字体时，直接把 `@font-face` 规则写入了 `site.css`，却没有同步清理掉 HTML 中的 `<link href="./assets/css/fonts.css">` 遗留标签。
**解决方式**：使用脚本清理了全站 14 个 HTML 页面对 `fonts.css` 的无效引用。本地字体加载合并入 `site.css`，利用 `font-display: swap` 实现零闪烁秒开。

## 27. 档案页中英版本内容与结构不对称

**现象**：中文版档案页增加了“学术科研”与“项目与实践”模块，但英文版的相应区间仍然只有教育、竞赛和荣誉，导致海外访问者丢失了核心的科研和项目信息。
**根因**：更新文档内容时仅针对中文版，违反了项目架构文档中关于“中英文页面必须保持结构对称”的硬性规定。
**解决方式**：将对应的结构模块补齐到了 `en/profile.html`，同步翻译并对齐了所有类名、DOM 树层级和属性。

## 28. 档案页超大体积图片直接加载导致带宽浪费与白屏

**现象**：包含社会实践、学术竞赛等证明资料的扫描图片，单张体积高达 25MB~42MB。它们被直接放入 `<img src>` 标签内，导致页面渲染时极速消耗用户流量并引发剧烈卡顿。
**根因**：原图未经压缩处理直接上传，同时未采取预览/查看分离策略，造成前端性能灾难。
**解决方式**：
1. 实施**双文件策略**：通过脚本将原图压缩，生成前端使用的轻量 WebP 缩略图（`-thumb.webp` 约 100KB）和高清放大图（`-full.webp` 约 500KB）。
2. 在 HTML 中以 `<img src="...-thumb.webp">` 占位，外层通过 `<a href="...-full.webp">` 供点击查看。
3. 从 Git 仓库中通过 `git rm` 彻底清除了数兆字节的原始原图文件，减轻仓库和静态构建的负担。
4. 同步修复了 `index.html` 被遗漏的破损预览图片链接。

## 29. HTML 内联样式全局污染与暗黑模式失效隐患

**现象**：在新增的项目模块中，大量的元素使用了如 `style="display: flex; color: var(--ink);"` 这样的行内样式。
**根因**：为了快捷调整排版，使用了临时行内样式而非全局 CSS 变量体系。这破坏了 HTML 的纯净语义，且如果在行内写入了不可随状态切换的颜色，会破坏全局明暗色模式的兼容性。
**解决方式**：利用脚本移除了 `profile.html` 对应节点的所有 `style="..."` 属性，统一抽离到 `assets/css/site.css` 中并使用 `.profile-project-` 为前缀的语义化 CSS 类名进行管理。

## 30. 全局 SEO 与元信息页面覆盖不全

**现象**：全站 SEO 元数据质量不一，首页和档案页规范，但部分页面（例如 `en/resume.html`）直接缺少 `<meta charset>`、`<title>` 等甚至严重缺失 canonical 声明。
**根因**：手动复制页面或更新时漏贴元信息模板，未能遵循自动化或标准化的 `<head>` 管理流程。
**解决方式**：通过全局 Python 脚本重新解析与组装，为所有的页面（共 14 个）严格统一样板化生成了带有 `title`, `description`, `canonical`, `hreflang`, `Open Graph`, `Twitter` 和 `JSON-LD` 结构化数据的最新 `<head>` 块。

## 31. 跨平台开发行尾换行符污染 (CRLF vs LF)

**现象**：在 Windows 系统上执行批处理或使用脚本重组文件后，HTML 文件的换行符被意外转为 CRLF。这导致在进行 `git diff --check` 测试时产生高达 5000+ 行的追踪噪声，将换行符误判为 trailing whitespace。
**根因**：Git 的 `core.autocrlf` 默认在 Windows 下自动进行 CRLF 和 LF 转换，但在 AI 脚本或部分 IDE 写入文件时绕过了这种判定，导致工作区直接引入了大量被 Git 认为非规范的行尾。
**解决方式**：在仓库根目录添加了 `.gitattributes` 文件明确要求 `* text=auto eol=lf`，并对二进制资源声明了 `binary`。随后执行 `git add --renormalize .` 从根源上消除跨平台换行符干扰。

## 32. 404 死链页面缺乏爬虫拦截

**现象**：`404.html` 与 `en/404.html` 尽管功能正常，但在它们的 `<head>` 区域缺少防止搜索引擎抓取的 `<meta name="robots" content="noindex">` 标签。
**根因**：虽然 `testing.md` 文档中有明确的验收要求，但实际编码时产生了疏漏。
**解决方式**：在两个 404 页面的 `<head>` 中补充上了 `<meta name="robots" content="noindex">`，彻底杜绝死链死角被误收入搜索引擎索引库中。

## 33. 中英双语简历页面导航栏图标丢失

**现象**：简历页面（`resume.html` 和 `en/resume.html`）顶部的导航栏中，Font Awesome 的图标均变为方框，无法正常显示。
**根因**：之前做全局 SEO 和字体拆分整理 `<head>` 时，未留意到这两页原先就遗失了对 `font-awesome.min.css` 的外部链接，自动化清洗进一步暴露了此隐患。
**解决方式**：为这两个孤立的页面重新加回了正确的相对路径 `<link href=".../font-awesome.min.css" rel="stylesheet"/>`，恢复了导航栏视觉效果。

## 安全漏洞处理策略 (Security Policy)

为了保障闫士博个人主页的运行安全以及防范潜在的网络攻击或数据泄露，我们建立了本安全漏洞上报机制。

---

### 1. 支持的版本 (Supported Versions)

我们仅对目前在线上生产环境中运行的 `main` 分支代码提供安全更新：

| 版本层级 | 支持状态 |
| :--- | :--- |
| main (生产分支) | ✅ 支持 (Active Support) |
| 其他开发分支 | ❌ 不支持 (No Support) |

---

### 2. 漏洞汇报方式 (Reporting a Vulnerability)

如果您在本站发现了任何安全隐患、XSS 注入漏洞、配置泄露或隐私合规问题，**请不要在公开的 GitHub Issues 中发起提报**。

我们提倡负责任的披露机制，请通过以下邮箱私下联系我们：
* **漏洞提报邮箱**: `y423314860@163.com`

收到邮件后，我们将在 **48 小时**内确认您反馈的问题，并在评估其危害等级后，在 **7 个工作日**内完成补丁合并并重新部署上线。非常感谢您为保障网络安全做出的贡献！


## 更新日志 (Changelog)

本项目的版本变更遵循 [语义化版本 2.0.0 (SemVer)](https://semver.org/lang/zh-CN/) 规范，并且格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

---

### [1.3.1] - 2026-06-25

#### Added
* 在根目录加入 `.gitattributes` 并配置 `* text=auto eol=lf`，彻底消除由于 Windows / Unix 跨平台修改产生的 CRLF/LF Git Diff 噪音。
* 为 `404.html` 与 `en/404.html` 增加了严格的 `<meta name="robots" content="noindex">` 拦截标签。

#### Fixed
* 修复了由于自动重构导致的 `resume.html` 与 `en/resume.html` 顶部导航栏图标因为缺失 `font-awesome` 链接而失效的问题。

---

### [1.3.0] - 2026-06-24

#### Added
* 实施了双图片渲染策略：为档案页和主页的巨型扫描件统一生成超轻量 `-thumb.webp` 与高清 `-full.webp` 替代原有的 40MB 级单张 PNG，大幅降低页面加载与仓库检出成本。

#### Changed
* 全站 14 个独立 HTML 文件的 `<head>` 元信息全面规范化。确保了每个页面不仅包含精准的 `canonical` 和 `hreflang`，还补全了 `Open Graph`、`Twitter Cards` 与结构化的 `JSON-LD` 个人关联档案。
* 同步重构 `profile.html` 中的项目与实践展示区代码，剥离一切 `style="..."` 内联样式至 `site.css` 的语义化命名空间下。
* `en/profile.html` 全面同步中文内容，增加了“学术科研”和“项目与实践”板块。

#### Fixed
* 修复了全局 `fonts.css` 文件返回 404 的失效请求问题。
* 修复了由于优化原图而意外导致的 `index.html` 证书预览图损坏问题。

---

### [1.2.0] - 2026-06-23

#### Added
* 新增 `/docs/design/` 目录，归纳设计、架构和维护文档。
* 新增 `CONTRIBUTING.md` (贡献指南)、`SECURITY.md` (安全漏洞策略) 及全套架构、开发、集成文档。

#### Fixed
* 修复了桌面端（屏幕宽度 > 1068px）主页 Hero 区域与下方内容板块在左右边界上没有对齐的歪斜问题。通过移除 `max-width` 限制并采用动态 `padding-left/right: max(24px, calc((100vw - var(--max-width)) / 2))`，确保头部内容左右两侧完美贴合 1440px 居中对齐线。

---

### [1.1.0] - 2026-06-07

#### Added
* 将原本位于根目录下的设计文档 `DESIGN.md` 进行了内容细化，明确了全站 CSS 设计代币与响应式栅格布局逻辑。
* 丰富了主要经历证明、毕业设计成果以及竞赛证书的预览图片与大图展示。

#### Fixed
* 修复了部分页面中英文切换时链接相对路径错误导致的 404 故障。
* 优化了 `site.css` 的媒体查询合并，大幅缩减冗余 CSS 代码。

---

### [1.0.0] - 2026-05-30

#### Added
* 完成闫士博双语学术主页的首次上线。
* 实现了全局深色模式（Dark Mode）一键切换，并增加了基于 `localStorage` 的拦截脚本，完美解决网页刷新白屏闪烁问题。
* 集成了不蒜子 (Busuanzi) 和 Vercount 访问统计 API，并在 `stats.js` 中实现了流量统计服务的超时优雅降级处理。
* 引入本地 Font Awesome 4.7.0 字体图标包，保障所有学术指标、证书及技术标签附带矢量图标。
* 实现了移动端侧滑抽屉式菜单（Drawer），并引入焦点捕获（Focus Trapping）无障碍访问控制。
