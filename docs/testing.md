# 测试规范

本文是项目验证命令、测试范围和验收标准的唯一事实源。系统合同见[架构文档](architecture.md)，发布操作见[运维指南](operations.md)，当前未修偏差见[维护记录](maintenance.md)。

## 1. 基线

当前基线：

- 14 个 HTML：7 个中文、7 个英文；
- 12 个可索引页面：六组中英文内容页；
- 2 个 404 页面：`noindex` 且不进入 sitemap；
- 12 个 sitemap URL；
- `scripts/validate-site.test.js` 包含 144 个零依赖 `node:test` 用例，其中结构化数据专项为 79 个；
- `scripts/validate-site.js` 是只读验证器，不应修改仓库。

任何测试数量或页面库存发生变化时，本节、脚本和对应测试必须一起更新。

## 2. 最小验证入口

在仓库根目录依次运行：

```powershell
node --test scripts/validate-site.test.js
node scripts/validate-site.js
git diff --check
```

仅定位结构化数据回归时可以运行以下名称子集；它不能替代上面的全量入口：

```powershell
node --test --test-name-pattern="structured data" scripts/validate-site.test.js
```

当前成功输出应包含：

```text
tests 144
pass 144
fail 0
Site validation passed: 14 HTML files, 12 indexable pages, 12 sitemap URLs.
```

结构化数据名称子集的验收记录应汇总为 `79 passed / 0 failed`，不要把这行写成 Node 原始输出。不同 Node 版本或执行方式仍可能把名称过滤掉的用例计入 TAP 总数，显示 `144 tests`、`79 pass`、`65 skipped`。

`git diff --check` 成功时通常不输出内容。测试报告必须记录实际输出；不得用“应该通过”代替执行证据。

## 3. 自动验证范围

### 3.1 仓库与页面库存

验证器检查：

- 预期的 14 个 HTML 全部存在；
- 六组中英文普通页面与一组 404 完整；
- 不存在未登记的额外 HTML，包括嵌套目录；
- 12 个可索引页面与 2 个 404 使用不同合同。

页面清单同时存在于 sitemap 生成器和验证器中。新增、删除或改名页面时，两处都要更新。

### 3.2 本地引用与 manifest

验证器检查：

- HTML 本地链接和 fragment 目标；
- 引用路径与磁盘大小写一致；
- CSS `url(...)` 指向存在的本地资源；
- 带查询参数或 fragment 的本地资源仍能解析；
- 每页 `<head>` 恰有一个 manifest 链接，中文 7 页和英文 7 页分别指向对应文件；
- 两份 manifest 的 `start_url`、`scope` 和 `lang` 符合语言合同；
- 两份 manifest 中列出的 icon `src` 存在；
- ICO 的目录结构可解析，且两份 manifest 的 `sizes` 与内含图层尺寸集合一致。

它不会验证外部网站、第三方 CDN 或统计服务在线可用性。

### 3.3 HTML 基础与可访问性

验证器检查：

- 页面 `lang` 与语言目录一致；
- 不存在重复 `id`；
- 存在唯一主内容区域和可用 skip link；
- 图片具有 `alt`、`width` 和 `height`；
- `target="_blank"` 外链包含安全 `rel`。

它不会模拟键盘操作，也不会证明视觉对比度、焦点顺序或屏幕阅读器体验正确。

### 3.4 统计范围

验证器检查：

- `stats.js` 只加载在中英文首页与中英文统计页；
- 四页包含需要的公开计数、provider 和本地计数 DOM；
- 其他页面不误加载统计脚本；
- Busuanzi、jsDelivr 与 Vercount 的统计专用 preconnect 只出现在这四页。

它不会访问第三方计数服务，因此不能证明线上值真实或递增；验证器会在隔离沙箱中执行实际 `stats.js`，核对非负 ASCII 十进制整数格式、`0` 与前导零、全角数字等异常主来源回退、超长数字不丢失、全部异常降级，以及本地日期文本不受计数校验影响。

### 3.5 SEO 与结构化数据

对 12 个可索引页面，验证器检查：

- canonical 和 hreflang 集合；
- `og:url`；
- URL 与中英文映射一致；
- `<head>` 中恰有一个活动 JSON-LD 块，正文和 `<head>` 外为零；启用脚本的 HTML 语义下，`noscript` 作为 raw/inert 内容处理，其中的 `script` 不计为活动块；
- JSON-LD 可解析，根对象的 `@context` 和 `@graph` 符合合同；
- 节点 ID 绝对且唯一，内部引用只含 `@id`、全部可解析且没有未登记节点；
- 页面节点类型、ID、URL、语言与关系正确，`name`/`description` 分别等于 HTML 标题和 meta description；
- 每类页面使用[架构文档](architecture.md#82-稳定-id-与节点字段)规定的精确节点与字段集合；
- 12 页的 `Person` 与 `WebSite` 稳定身份和事实一致，语言数组等集合不受顺序影响；
- 项目和研究列表的数量、位置、引用及本地化字段正确；项目 `name`、`description`、`keywords` 与研究 `name`、`description` 能在经 HTML 结构/属性过滤后的 `<body>` 文本中找到，该文本排除 `template`、启用脚本语义下的 `noscript`、`hidden`、`inert` 与 `aria-hidden="true"` 内容；`codeRepository` 匹配验证器内批准的仓库 URL 映射；自动化不计算 CSS computed visibility 或真实浏览器渲染；
- 统计页没有额外主实体、数据集、交互计数、计数值、本地访问数据或访客/浏览器标识。

对 2 个 404，验证器检查：

- 存在 `noindex`；
- 不存在 canonical 或 hreflang；
- 不存在活动 JSON-LD；
- 不进入 sitemap。

验证器只使用 Node.js 内置模块，保持仓库只读，不访问网络，也不执行 JSON-LD。畸形 JSON 或超深嵌套输入会形成可定位问题，不使 `validateRepository()` 抛出；其他页面与后续独立检查继续运行。它仍不验证 Open Graph/Twitter 文案质量、404 的倒计时和最终跳转，也不证明搜索引擎的实际收录、展示或排名。

### 3.6 Sitemap 与 robots

验证器检查：

- sitemap XML 外壳和命名空间；
- 12 个预期 URL 及 alternate 链接；
- 没有额外的 XML 文档元素；
- `lastmod` 使用 `YYYY-MM-DD` 格式；
- robots 的通配 user-agent 规则没有全站禁止，并声明 sitemap。

它不会比较 `lastmod` 与 HTML mtime；生成器当前以本地 HTML mtime 为来源，多个页面同日是合法结果。

### 3.7 JavaScript 语法

验证器调用 Node.js 语法检查覆盖：

- `assets/js/site.js`；
- `assets/js/stats.js`；
- `scripts/generate-sitemap.js`；
- `scripts/validate-site.js`。

语法通过不等于浏览器行为通过；抽屉、Lightbox、主题、真实第三方统计接入和浏览器呈现仍需人工检查。

### 3.8 共享交互结构合同

验证器继续静态检查 `site.js` 是否将 `(min-width: 834px)` 查询绑定到移动菜单断点处理器、是否使用 `event.matches` 限定进入桌面断点的路径，以及该处理器是否调用不返回隐藏菜单按钮焦点的关闭逻辑并保留可见桌面导航焦点回退。

Lightbox 的 `inert` 合同同时检查调用链接线与隔离行为：`openLightbox` 必须把 `[overlay]` 作为允许元素调用 `setBackgroundInert(true, ...)`，`closeLightbox` 必须调用 `setBackgroundInert(false)`；`setElementInert` 必须只有一个可执行同名函数语法，且其后不得在任意语句位置由裸赋值或 `var setElementInert = ...` 覆盖。点属性与字符串计算属性赋值只修改对象属性，不计作本地绑定覆盖。声明检测不依赖行首；为避免引入通用 JavaScript 解析器，任何经 `codeMask` 确认为可执行的 `function setElementInert(...)` 同名语法均保守计作竞争声明。注释和字符串中的同形文本不计为接线、声明或重赋值。

行为检查只提取自包含的 `setElementInert` 函数体和两个普通参数，在新的 `node:vm` 上下文内创建闭包属性存储与假元素，然后执行首次/重复激活、清理、重复清理和第二轮开关。单元素场景覆盖无 `aria-hidden`、显式 `aria-hidden="false"`、关闭抽屉式的 `aria-hidden="true"` 与 `inert`、仅属性和仅属性值；另以两个相反初始 `inert` 状态的元素交错激活和清理，检查状态不会串扰。所有场景均检查模态标记，并在微任务排空后再次复核最终状态。

假元素及其方法不从宿主注入；上下文不提供 `require`、`process`、`fs`，禁止字符串与 WebAssembly 代码生成，每段执行限制为 100ms。函数体的语法错误、运行时异常、超时、重复声明或任一状态不符均报告同一合同问题。这里的 `node:vm` 只用于缩小测试能力面和限制常规失控执行，不是针对恶意代码的安全边界。仅编译函数体也是有意的自包含合同：若正确实现改为调用同文件其他 helper，验证器会拒绝，届时必须同步扩展合同，而不是执行整份 `site.js`。该检查不模拟真实 DOM、媒体查询事件或焦点；833/834px 与 Lightbox 关闭后的状态和焦点仍须使用浏览器验证。

## 4. 验证器单元测试

`scripts/validate-site.test.js` 使用临时目录构造有效或损坏的仓库副本，当前覆盖：

- 查询参数、fragment 与路径解析；
- 从非仓库 cwd 执行；
- 缺失文件和缺失统计 DOM；
- Font Awesome CSS 中的本地 URL；
- 重复或错误 hreflang；
- JSON-LD 活动块的位置与数量，以及正文、注释、模板、启用脚本语义下的 `noscript`、raw-text 和 RCDATA 边界；
- 畸形 JSON、超深嵌套输入、错误 `@context` / `@graph`，以及错误页面类型、语言、URL、标题和描述；
- 节点 ID 的绝对性、缺失、重复与漂移，悬空引用、非 ID-only 关系、额外字段和错误图库存；
- `Person` / `WebSite` 跨页身份与事实漂移，以及图节点和语言集合按集合而非数组顺序比较；
- 项目和研究列表、顺序、可见文本、仓库、贡献者与禁止声明；
- 统计页的数据类型、计数、本地访问和访客字段，以及两个 404 的活动 JSON-LD 排除；
- 正文证据排除 `template`、启用脚本语义下的 `noscript`、`hidden`、`inert`、`aria-hidden="true"`，并正确处理属性引号内的 `>`；
- sitemap alternate、XML 外壳和额外根元素；
- 分语言 manifest 基线、唯一 `<head>` 链接、正文/HTML 注释误满足、入口/范围/语言字段，以及 `null`、畸形 icon、无效 `sizes`、ICO 尺寸声明不一致、截断目录与图像数据重叠；
- 大小写错误路径；
- robots 全站禁止与 user-agent 作用域；
- 未登记的嵌套 HTML；
- 非统计页误加统计服务 preconnect；
- `stats.js` 的非负 ASCII 整数格式、`0`、前导零、全角数字等异常主来源回退、超长数字原样保留、全部异常降级，以及本地日期文本不受计数校验影响；
- 移动菜单的 834px 桌面断点清理合同，以及错误查询、遗漏 `event.matches`、缺少可见焦点回退、关闭逻辑落在无关函数或关键实现被注释掉的变异用例；
- Lightbox 打开/关闭背景接线与 `inert` 行为合同：等价实现正向夹具，以及缺少任一端接线、任意语句位置的裸赋值或 `var` 覆盖、对象属性赋值 decoy、非行首同名函数语法、遗漏属性值、显式 `aria-hidden="false"` 丢失、多元素共享快照串扰、重复/无关/注释/字符串处理器、激活分支贯穿、倒序恢复、抛错、语法错误、超时、恢复后立即或通过微任务延后再次清除等变异用例；
- JavaScript 字符串和正则字面量中的注释形文本不会干扰交互合同识别；
- 验证器只读保证；
- CLI 在无效仓库上返回非零状态。

修改验证器时，新增用例应先证明旧实现会漏报或崩溃，再实现最小修复。测试夹具不得改动真实仓库。

## 5. 自动验证明确不覆盖的事项

以下内容必须人工或使用浏览器工具验证：

- 导航 `aria-current` 是否符合页面语义；
- 移动抽屉的真实 `inert` 状态、焦点陷阱、Escape 和焦点归还；
- Lightbox 的打开、键盘操作、关闭、背景实际状态与焦点恢复；
- 视觉布局、文字遮挡、横向滚动和主题对比度；
- 内联 `style`、其他未知域名的无用途 preconnect 等未纳入合同的代码质量偏差；
- 浏览器实际展示的安装 UI，以及安装后是否按语言入口启动；
- 搜索引擎是否收录、如何展示或是否改变排名；
- 第三方统计、外链和线上缓存；
- 个人内容是否准确、获授权且适合公开。

自动验证通过时，报告应写“结构验证通过”，不能扩大为“所有页面体验和内容均正确”。

## 6. 本地预览

按[运维指南](operations.md)启动本地静态服务器，然后访问：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/en/
```

不得用直接双击 `file://` 代替最终浏览器验证，因为路径、模块、历史记录和缓存行为可能不同。

## 7. 浏览器验收矩阵

### 7.1 代表性视口

至少检查以下边界；涉及响应式修改时不能只测中间值：

| 宽度 | 目的 |
| ---: | --- |
| 375px | 常见窄屏与长英文换行 |
| 419px | 极窄屏断点上界 |
| 640px | 手机/小平板断点 |
| 833px | 移动导航最后一个像素 |
| 834px | 桌面导航第一个像素 |
| 1068px | 单列 Hero 最后一个像素 |
| 1069px | 双列 Hero 第一个像素 |
| 1320px | 宽屏 Hero 紧凑区上界 |
| 1440px | 站点最大宽度与桌面留白 |

同时检查横屏、小高度窗口和 200% 浏览器缩放。页面不得出现意外横向滚动、遮挡或无法点击的控件。

### 7.2 页面范围与结构化数据矩阵

结构化数据或其他 SEO 元数据变更不能只做页面抽样，必须检查全部 12 个可索引路由：

| 页面组 | 中文路由 | 英文路由 |
| --- | --- | --- |
| 首页 | `/` | `/en/` |
| 档案 | `/profile.html` | `/en/profile.html` |
| 研究 | `/research.html` | `/en/research.html` |
| 项目 | `/projects.html` | `/en/projects.html` |
| 简历 | `/resume.html` | `/en/resume.html` |
| 统计 | `/analytics.html` | `/en/analytics.html` |

每个路由检查：

- `<head>` 恰有一个活动 JSON-LD 块，`body` 中为零；
- 浏览器内 `JSON.parse` 成功，`@context` 正确；
- 页面类型、页面 ID、URL 和语言符合[架构合同](architecture.md#83-页面类型与关系)，全部节点 ID 绝对且唯一；
- 页面可见内容、布局和交互未因 `<head>` 变更而改变；
- 控制台没有由本次变更引入的错误。

仅做 JSON-LD/元数据 QA 时不要求打开或下载 PDF、证明图等材料；这些资源本身发生变化时仍按对应资产合同检查。其他全站发布至少抽样中英文首页、档案、研究或项目、统计和两个 404；修改某个页面时加入其双语对应页，修改共享 CSS/JS 时按 14 页全量检查。

### 7.3 主题

1. 首次访问跟随系统或默认主题。
2. 切换后根元素 `data-theme`、按钮状态和 `theme-color` 同步。
3. 刷新与跨页面导航后 `ysb-theme` 保持。
4. 浅色与深色下检查正文、链接、边界、卡片、抽屉和 Lightbox。

### 7.4 移动抽屉

在 833px 检查：

1. 桌面导航隐藏，菜单按钮可见。
2. 打开后焦点进入抽屉。
3. Tab/Shift+Tab 不逃离抽屉。
4. Escape、遮罩和导航链接均可关闭。
5. 关闭后焦点回到菜单按钮。
6. 拉宽到 834px 后，`body.menu-open`、遮罩、滚动锁和背景 `inert` 均已清理，抽屉恢复 `aria-hidden="true"` 与 `inert`；原焦点若在抽屉内，应转移到可见的当前桌面导航项；404 等没有当前项的页面应转移到首个桌面导航链接。
7. 抽屉关闭时打开并关闭证明图 Lightbox，抽屉仍保持 `aria-hidden="true"` 与 `inert`，屏外抽屉链接不能进入 Tab 顺序。

### 7.5 Lightbox

1. 鼠标、触屏和 Enter 可打开证明图。
2. 标题、图片与关闭按钮正确。
3. Escape 可关闭，焦点返回原图链接。
4. 关闭后，原本可交互的背景恢复为非 `inert`；原本已 `inert` 的关闭抽屉仍保持 `inert`。
5. 脚本禁用时原图链接仍有效。
6. 中英文资源路径和说明保持对应。

### 7.6 统计

分别验证：

- 第三方完整返回；
- 只返回部分计数；
- `0`、前导零和普通非负整数；
- 负数、小数、科学计数法、逗号分组、全角数字和普通文本；
- 主来源无效但备用来源有效；
- 所有来源无效时显示 `--` 和警告状态；
- 本地首次与最近访问日期仍正常显示；
- 第三方超时或被拦截；
- localStorage 可用、为空或被限制；
- 刷新与中英文页面切换。

无论第三方状态如何，页面主体、本地计数和明确的降级文案都不应崩溃。不要把四页本地累计写成 14 页全站累计。

### 7.7 404

中英文 404 均检查：

- 页面可读且没有普通导航当前项；
- 倒计时可见；
- 中文最终进入 `/`，英文最终进入 `/en/`；
- `<head>` 保持 `noindex` 且没有 canonical/hreflang/活动 JSON-LD；
- 不出现在 sitemap。

## 8. 变更类型与最低验收

| 变更类型 | 自动验证 | 必要人工检查 |
| --- | --- | --- |
| 项目文档 | 三条最小验证、内部路径扫描 | 文档职责、事实源、隐私与重复 |
| 单页文案 | 三条最小验证 | 双语对应、标题层级、内容授权 |
| 图片或下载材料 | 三条最小验证 | 文件内容、尺寸、alt、公开权限、按钮 |
| CSS | 三条最小验证 | 双主题、419/640/833/834/1068/1069/1440 |
| `site.js` | 三条最小验证 | 主题、抽屉、Lightbox、键盘与降级 |
| `stats.js` | 三条最小验证 | 成功、部分、失败、异常值、备用源回退、localStorage 与四页范围 |
| 页面/SEO（含 JSON-LD） | 重新生成 sitemap、运行全量测试与站点验证器 | canonical、hreflang、404、线上 URL 与 12 路由结构化数据矩阵 |
| manifest/图标 | 三条最小验证、两份 manifest 静态合同 | 各尺寸视觉质量、浏览器安装 UI 与实际启动入口 |

## 9. 回归清单

以下历史问题不得复发：

- 品牌标识被误写或改回字体 terminal；
- 404 被加入 canonical、hreflang、活动 JSON-LD 或 sitemap；
- 可索引页退回直接 `Person` 根对象或缺少页面 `inLanguage`；
- 页面、人物或网站稳定 ID 漂移，内部关系带额外字段或形成悬空引用；
- 项目/研究节点借用隐藏、非活动或 `aria-hidden` 内容充当可见证据；
- 统计页结构化数据暴露计数、本地访问、访客或浏览器信息；
- 834px 仍启用移动导航；
- 非统计页加载 `stats.js` 或统计专用依赖；
- 英文页面重新指向中文 manifest，或任一页面出现重复/正文内 manifest 链接；
- 把本地四页累计描述为 14 页全站累计；
- 异常 provider 文本被展示为计数、无效主来源遮蔽有效备用来源，或计数校验误伤本地日期文本；
- Lightbox 关闭时清除关闭抽屉原有的 `inert`，或让仅因模态打开而设置的背景 `inert` 残留；
- 把相同 `lastmod` 日期直接判为错误；
- 文档继续引用已删除路径或重复维护同一合同；
- 未授权个人材料或未发表研究材料进入公开仓库。

## 10. 测试结果记录

每次交付至少记录：

```text
自动测试：144 passed / 0 failed
结构化数据子集：79 passed / 0 failed
站点验证：14 HTML / 12 indexable / 12 sitemap URLs
diff check：通过或具体问题
人工检查：页面、主题、视口、键盘路径；涉及结构化数据时记录 12 路由矩阵
未运行项：名称与原因
已知偏差：maintenance.md 条目编号
```

如果用户要求停止测试，立即停止并如实列出未运行项，不能补写成功结论。
