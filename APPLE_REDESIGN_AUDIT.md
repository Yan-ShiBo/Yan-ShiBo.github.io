# Apple 风格改版与同步审查报告

## 设计基准

本次改版以 `DESIGN.md` 的 Apple 设计系统为唯一视觉基准：黑色 44px 全局导航、白色 / parchment / near-black 的全宽 tile 节奏、SF Pro 字体栈、17px 正文字号、56px hero display、唯一交互蓝 `#0066cc`、按钮全 pill、卡片 18px 圆角、卡片和按钮不使用阴影、内容图片仅保留一套 Apple 式 soft product shadow。

没有删除原站点内容；HTML 主体结构和页面信息保持原有语义，仅对明确 bug、英文表达和跳转页 fallback 做了最小修正。

## 全局实现

- `resource/css/site.css` 已重写为 Apple token 化样式：颜色、字号、间距、圆角、按钮、导航、卡片、统计卡、证据图片、PDF 预览、lightbox、移动端 drawer 全部统一。
- 去掉原来的蓝紫渐变、网格背景、装饰光斑和 UI 阴影；`.gradient-text` 类保留以避免改动 HTML，但视觉上不再产生渐变。
- 顶部导航改为 true black 的 44px Apple global nav；移动端在 833px 以下切换为抽屉菜单。
- 页面主体改为全宽 tile：hero / page hero / section block 在白色、parchment 和 near-black 间交替，内容最大宽度锁定为 980px 或 1440px。
- `button.primary` 使用 Action Blue `#0066cc`，focus 使用 `#0071e3`，dark tile 内链接使用 `#2997ff`。
- 所有 HTML 的 `theme-color` 同步为 `#f5f5f7`；manifest 同步为 Apple 风格背景和黑色浏览器主题色。
- `site.js` 增加 `reveal-ready` 机制：无 JS 时内容不会被 `[data-reveal]` 隐藏。
- `stats.js` 增加 `localStorage` 安全访问，隐私模式或 storage 被禁用时不会中断公开统计逻辑。

## 每个网页的构思与小审查

| 页面 | 修改前构思 | 修改后小审查 |
|---|---|---|
| `index.html` | 首页作为 Apple product landing：左侧主 tile 讲研究主线，右侧 parchment tile 展示照片、关键词和访问统计；长中文 hero 用 56px clamp + 1.07 line-height，避免窄屏挤压。 | 内容未删；hero、统计、材料入口均保留。按钮统一 pill，主页访问统计仍接入 `stats.js`。 |
| `home.html` | 0 秒跳转页也应该有 Apple fallback：白色卡片置于 parchment 背景，只有一句说明和一个 primary CTA。 | 增加 viewport、theme-color、favicon、CSS；无自动跳转时可点击进入首页。 |
| `introduction.html` | 档案页信息密度最高，采用 museum gallery 思路：顶部简洁 hero，后续阶段卡片用白 / parchment / dark tile 分段，证明图片作为内容 artifact。 | 原有研究生、本科、高中、初中、小学内容和证明入口保留；锚点滚动和 lightbox 不变。 |
| `research.html` | 研究页以 editorial Apple 风格呈现：问题定义为清晰卡片，方法流程 `flow-stacked` 改为纵向，避免五步文字在卡片中挤成多列。 | 方法链、概率保证、后续计划全部保留；新增 `.flow-stacked` 样式防止长英文/中文换行过密。 |
| `projects.html` | 项目页作为双项目 gallery：两个项目并列卡，技术栈为 pill chip，GitHub 和成果照片为主要 CTA。 | 两个项目、仓库、技术栈、奖项照片均保留；证据图片使用统一 artifact 样式。 |
| `resume.html` | 简历页采用 store configurator 式左右布局：左侧个人摘要和关键词，右侧教育、研究、项目、证明材料，PDF 预览保留。 | 简历正文、PDF、成绩单、证明材料全部保留；移动端会单列堆叠。 |
| `resume_online.html` | 在线简历保持轻量阅读，把每段当作 Apple 信息 tile；预览图作为内容 artifact，不加 UI 阴影。 | 原有在线简历信息保留；按钮和 footer 统一。 |
| `stats.html` | 统计页改成 Apple dashboard：公开计数为 3 张 stat card，本地记录为 utility grid，说明文字保留在低密度 section。 | 公开统计、本地统计、说明和隐藏 counter 均保留；`stats.js` 增强 storage 容错。 |
| `404.html` | 404 作为单屏 recovery tile：一句明确标题、返回主页/研究/简历的 pill CTA，不增加复杂装饰。 | 原导航、语言切换、邮箱复制和返回按钮保留；视觉已统一。 |
| `en/index.html` | 英文首页与中文首页同结构，控制英文 hero 宽度并保留 research workflow。 | 英文内容保留；theme 和 Apple 样式同步。 |
| `en/home.html` | 英文跳转页采用同样 fallback，避免无样式的 `Redirecting…`。 | 增加 CSS、favicon、theme-color 和可点击 fallback。 |
| `en/introduction.html` | 英文档案页保持内容完整，阶段式 gallery 和 proof grid 与中文页一致。 | 内容保留；未强行重译，避免破坏已有信息。 |
| `en/research.html` | 英文研究页以较短行宽承载长术语，方法链纵向展示，避免 polynomial / certification 等词造成横向拥挤。 | 内容保留；`.flow-stacked` 修正长流程卡可读性。 |
| `en/projects.html` | 项目页英文 hero 原句过长且有 second-person 口吻，改为更中性的 Apple 风格短标题；导航应留在英文站内。 | 修复英文导航误跳中文页的问题；h1/lead 更自然，项目内容、仓库、图片未删。 |
| `en/resume.html` | 英文简历与中文简历同布局，重点保证长课程名和奖项文本有足够行宽。 | 内容保留；CSS 统一后移动端单列。 |
| `en/resume_online.html` | 英文在线简历保持轻量、分块、低密度；按钮和 footer 与全站一致。 | 内容保留；theme 和 Apple 样式同步。 |
| `en/stats.html` | 英文统计页应与中文统计页同 dashboard 逻辑，修复错误资源路径和中文 Twitter metadata。 | 修复 CSS/JS 路径、英文 metadata、H1 表达；底部 `stats.js` 正确加载。 |
| `en/404.html` | 英文 404 与中文 404 同样作为 recovery tile，保留导航和返回入口。 | 内容保留；theme 和 Apple 样式同步。 |

## Bug / 翻译 / 设计缺陷修复

| 类型 | 发现的问题 | 已做修改 |
|---|---|---|
| 资源路径 bug | `en/stats.html` 引用 `./resource/...`，在 `en/` 目录下会 404。 | 改为 `../resource/...`。 |
| 英文 metadata 错误 | `en/stats.html` 的 Twitter title/description 仍是中文。 | 改为英文。 |
| 语言导航 bug | `en/projects.html` 的英文站内导航跳到中文根目录。 | 改为英文目录内相对路径。 |
| 英文表达问题 | `en/projects.html` hero 使用 “your technical profile” 这类第二人称营销句，且标题过长。 | 改为 “Projects with repositories and verified outcomes”，lead 改为中性描述。 |
| 设计缺陷 | 原 CSS 有蓝紫渐变、光斑、网格、卡片阴影，与 Apple 设计要求冲突。 | 删除装饰背景和 UI 阴影，统一为 flat tile + hairline。 |
| 可访问性 bug | 原 `[data-reveal]` 在 JS 失败时可能让内容保持隐藏。 | 只有 `site.js` 添加 `reveal-ready` 后才启用 reveal 隐藏。 |
| 隐私模式 bug | `stats.js` 直接访问 `localStorage`，可能在隐私/禁用 storage 时抛错。 | 增加 `getStorage()` 和 try/catch，公开统计不受本地记录失败影响。 |
| 跳转页体验 | `home.html` / `en/home.html` 原来几乎无样式。 | 增加 Apple fallback 页面。 |
| PWA 颜色不一致 | manifest 仍保留旧蓝色主题。 | 改为 parchment background + black theme。 |

## 审查结果

- HTML 页面总数：18 个，均已修改或通过统一 CSS/metadata 覆盖。
- 本地资源引用检查：0 个缺失引用。
- 英文站内主导航检查：0 个误跳中文站内路径。
- CSS 解析：`tinycss2` 解析错误 0。
- JS 语法：`node --check resource/js/site.js`、`node --check resource/js/stats.js` 通过。
- Git whitespace：`git diff --check` 通过。
- 设计 token 检查：旧的 `#f4f7ff`、`#2563eb`、紫色 / 青色 accent、装饰性 `linear-gradient` / `radial-gradient` 已移除。

## 建议的后续优化

- 当前图片仍是原始 JPG/PNG/PDF 资源；后续可生成 WebP/AVIF 和 `srcset`，进一步贴近 DESIGN 中的响应式图片规范。
- 英文页仍有少量直译式表达，但没有发现会误导含义的关键错误；若后续要做英文品牌化，可单独做 copyediting。
- 可本地打开 `index.html`、`introduction.html`、`research.html`、`projects.html`、`resume.html`、`stats.html` 和对应英文页，在真实浏览器中复查最终视觉节奏与图片裁切。
