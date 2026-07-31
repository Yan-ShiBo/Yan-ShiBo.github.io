# 测试规范

本文是项目验证命令、测试范围和验收标准的唯一事实源。系统合同见[架构文档](architecture.md)，发布操作见[运维指南](operations.md)，当前未修偏差见[维护记录](maintenance.md)。

## 1. 基线

当前基线：

- 14 个 HTML：7 个中文、7 个英文；
- 12 个可索引页面：六组中英文内容页；
- 2 个 404 页面：`noindex` 且不进入 sitemap；
- 12 个 sitemap URL；
- `scripts/validate-site.test.js` 按稳定顺序聚合四个领域模块，共包含 280 个零依赖 `node:test` 用例，其中结构化数据专项为 79 个；
- `scripts/run-validator-tests.test.js` 包含 22 个分片运行器、超时、信号、摘要与注册守卫用例；
- `scripts/stats-client.test.js` 包含 6 个浏览器客户端合同用例；
- `worker/src/index.test.mjs` 包含 26 个 Worker、D1 迁移和隐私合同用例；
- `scripts/validate-site.js` 是只读验证器，不应修改仓库。

任何测试数量或页面库存发生变化时，本节、脚本和对应测试必须一起更新。

## 2. 最小验证入口

本地验证要求 Node.js 24 或更高版本：Worker 测试使用内置 `node:sqlite`，测试入口使用 `--test-isolation=none`。在仓库根目录依次运行：

```powershell
node --test --test-isolation=none scripts/run-validator-tests.test.js
node scripts/run-validator-tests.js
node --test --test-isolation=none scripts/stats-client.test.js
node --test --test-isolation=none worker/src/index.test.mjs
node scripts/validate-site.js
git diff --check
```

`run-validator-tests.js` 在四个独立 Node 进程中运行互斥分片，是 280 个验证器用例的本地全量入口。每片默认限时 5 分钟；超时先发送 `SIGTERM`，5 秒后仍未退出则发送 `SIGKILL`，强杀后 1 秒仍没有 `close`/`error` 时销毁管道、解除进程引用并以失败结算。运行器会把父进程的 `SIGINT`/`SIGTERM` 转发给存活分片，分片忽略首个信号时自动使用同一强杀链，不要求用户再次中断；最终分别以 130/143 退出，并在所有路径移除信号监听器。成功时只输出每片和全量摘要；失败时保留对应 TAP 与 stderr 供定位。

每个分片必须同时满足库存标记、精确 `tests`/`pass` 数以及 `fail`、`cancelled`、`skipped`、`todo` 全为零，不能只依赖子进程退出码。资源受限或排查分片差异时，可以使用等价的串行回退：

```powershell
node --test --test-isolation=none scripts/validate-site.test.js
```

### 2.1 CI 四分片

[GitHub Actions 测试工作流](../.github/workflows/tests.yml)在拉取请求、`main` 推送和手动触发时使用 Node.js 24。验证器的 280 个用例按注册序号稳定分为四个互斥分片，每片包含 70 个用例；四个矩阵任务均通过同一运行器验证摘要，四片并集必须恰好覆盖全量测试。独立合同任务运行分片基础设施回归、统计客户端、Worker/D1 与站点验证入口。

分片同时用于 CI、本地并行入口和故障定位。测试文件会核对发现的用例总数与当前分片数量，非法、错误总数或非四分片配置直接失败。可在 PowerShell 中复现任一分片：

```powershell
$env:VALIDATOR_TEST_SHARD = '1/4'
node scripts/run-validator-tests.js
$env:VALIDATOR_TEST_SHARD = $null
```

未设置 `VALIDATOR_TEST_SHARD` 时，运行器并行运行全部四片；直接运行聚合测试文件时仍一次串行运行全部 280 个用例。新增、删除或调整用例数量时，必须同步更新 `scripts/validator-test-shard.js` 中的总数合同、本节基线和四个分片的预期数量。

### 2.2 验证器测试模块

`scripts/validate-site.test.js` 只负责按固定顺序加载 `foundation.js`、`stats.js`、`assets.js` 和 `structured-data.js`。四个领域模块位于 `scripts/validate-site-tests/`，共享断言、仓库副本夹具和分片注册器位于同目录的 `support.js`。注册器在分片选择前拒绝重复测试名，以及任何显式 `skip`、`todo` 或 `only` 选项（包括 `false`）；运行器摘要继续兜底检测测试体内动态产生的 skip/todo。

模块加载顺序属于分片合同：调整顺序会改变用例所属分片。移动或新增用例后，必须重新核对 280 个总数、四片各 70 个用例的库存以及并行入口的全量并集。

包含多次完整仓库验证的表驱动变异应拆为多个顶层测试组，使现有取模分片可以分散长尾，并通过断言消息保留具体变异名称；不要把全部昂贵场景重新合并成一个顶层测试。

共享夹具在每个测试进程中只读取一次公开运行时文件和验证器语法入口，随后为每个用例独立落盘；不得跨用例共享可变目录，也不得使用会回写源文件的硬链接。验证器只检查存在性和路径大小写的字体、普通图片与 PDF 使用空占位文件，四个解析内容的图标、HTML、CSS、JS、manifest、robots 和 sitemap 保留真实字节。测试源码、普通文档、CI 配置、`.baoyu-skills/` 与 Wrangler 本地状态不进入夹具；真实仓库基线和显式未登记 HTML 用例继续覆盖全仓库存边界。

仅定位结构化数据回归时可以运行以下名称子集；它不能替代上面的全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="structured data" scripts/validate-site.test.js
```

仅定位 manifest、安装 PNG 或 favicon 回归时可以运行图标名称子集；它同样不能替代全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="manifest|install icon|PNG|favicon|ICO" scripts/validate-site.test.js
```

仅定位历史 localStorage 键迁移时可以运行以下名称子集；它同样不能替代全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="legacy localStorage" scripts/validate-site.test.js
```

仅定位规范本地访问历史归一化时可以运行以下名称子集；它同样不能替代全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="canonical local visit history" scripts/validate-site.test.js
```

仅定位首页重复引文漂移时可以运行以下名称子集；它同样不能替代全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="home quotation" scripts/validate-site.test.js
```

仅定位英文术语回归时可以运行以下名称子集；它同样不能替代全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="English terminology" scripts/validate-site.test.js
```

仅定位档案联系方式与证明滑轨回归时可以运行以下名称子集；它同样不能替代全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="profile|proof" scripts/validate-site.test.js
```

仅定位首页移动卡片回归时可以运行以下名称子集；它同样不能替代全量入口：

```powershell
node --test --test-isolation=none --test-name-pattern="mobile home hero" scripts/validate-site.test.js
```

当前成功输出应包含：

```text
Validator test shard 1/4 passed: 70 tests.
Validator test shard 2/4 passed: 70 tests.
Validator test shard 3/4 passed: 70 tests.
Validator test shard 4/4 passed: 70 tests.
Validator test shards passed: 280 tests across 4 shards.
stats client: 6 passed / 0 failed
Worker and D1: 26 passed / 0 failed
Site validation passed: 14 HTML files, 12 indexable pages, 12 sitemap URLs.
```

分片基础设施测试的 Node 原始摘要应包含 `tests 22`、`pass 22` 和 `fail 0`；串行回退应包含 `tests 280`、`pass 280` 和 `fail 0`。并行入口只有在四个子进程的 TAP 摘要均为 `tests 70`、`pass 70` 且四类例外计数全零后，才输出上面的紧凑成功摘要。

结构化数据名称子集的验收记录应汇总为 `79 passed / 0 failed`，图标名称子集汇总为 `47 passed / 0 failed`，历史 localStorage 子集汇总为 `8 passed / 0 failed`，档案与证明滑轨子集汇总为 `13 passed / 0 failed`，首页移动卡片子集汇总为 `10 passed / 0 failed`，规范本地访问历史子集、首页引文子集与英文术语子集分别汇总为 `2 passed / 0 failed`，不要把这些行写成 Node 原始输出。不同 Node 版本或执行方式仍可能把名称过滤掉的用例计入 TAP 总数；结构化数据子集此时会显示 `280 tests`、`79 pass`、`201 skipped`。

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
- 两份 manifest 的 icon 数组按 `src` 无序比较，且精确包含 192×192 与 512×512 两张 `image/png`、`purpose: any` 安装图标；缺失、重复、额外条目或任一字段漂移都会失败；
- 导航品牌 PNG 必须是 64×64、结构边界有效且不超过 16 KiB，防止 16×16 显示重新加载未经缩放的设计母版；
- 两张安装 PNG 的签名、首块 IHDR、固定 13 字节 IHDR 长度、非零宽高、各块文件边界与声明尺寸一致；
- `assets/icons/site.ico` 作为独立 favicon 固定资产，不从 manifest 推导：目录必须精确包含且不重复 16×16、32×32、48×48、256×256，所有 entry 偏移和长度均在边界内且互不重叠；每个 entry 的嵌入 PNG 都检查签名、IHDR、块边界，并要求 ICO 目录尺寸与 IHDR 一致。

它不会验证外部网站、第三方 CDN 或统计服务在线可用性。

### 3.3 HTML 基础与可访问性

验证器检查：

- 页面 `lang` 与语言目录一致；
- 不存在重复 `id`；
- 存在唯一主内容区域和可用 skip link；
- 图片具有 `alt`、`width` 和 `height`；
- `target="_blank"` 外链包含安全 `rel`。
- 中英文档案概览各自只包含两组已批准的 `mailto:` 标签，其可见文本与目标地址一致，并排除旧电话号码、微信号及对应图标；
- 档案邮箱和阶段摘要标签具备窄屏收缩与换行保护，不得以最小内容宽度扩大页面；
- 中英文首页各自只保留一份 `.quote-text` 引文，不再在 Hero 侧栏复制 `.poem-note`，避免同页重复内容与单边漂移。
- 七个英文页面的活动 HTML 不含[设计规范](design.md#63-双语)列出的高置信度陈旧术语；HTML 注释不参与该检查。

它不会模拟键盘操作，也不会证明视觉对比度、焦点顺序或屏幕阅读器体验正确。

### 3.4 统计范围

验证器检查：

- `stats.js` 只加载在中英文首页与中英文统计页；
- 四页包含站点访问、本月独立设备估算、当前页面访问与本地计数 DOM；
- 四页的 `#stats-status` 初始为 `loading`，并提供 `role="status"`、礼貌实时播报与原子更新；
- 四页各自恰有一个批准的 Worker endpoint meta 和对应源 preconnect；
- 其他页面不误加载统计脚本；
- HTML 与统计脚本不含旧公开计数运行时、隐藏计数节点或动态脚本注入。

验证器不访问线上 Worker，因此不能单独证明线上值真实或递增。它会在隔离沙箱中执行实际 `stats.js`，核对一次 JSON `POST`、当前 pathname、`no-store`、省略凭据、5 秒中止期限与定时器清理，以及 `loading`、`ok`、`warn` 的状态转换。成功响应必须同时提供三个非负 ASCII 十进制字符串、合法年月和精确起始日期；`0` 与超长十进制串有效，任一字段无效、响应非 2xx、JSON 失败、网络异常、超时或缺少 endpoint 时三项统一降级为 `--`，本地日期文本不受计数校验影响。对规范累计与页面计数，沙箱还核对彼此不同的 `0`、普通值、局部连续进位、安全整数边界两侧和任意长度连续进位能在各自存储与页面节点中精确加一，并以一边有效、一边损坏的场景阻止交叉接线；缺失、空值、负数、小数、科学计数法、前导零、正号、首尾空白、全角数字及普通文本必须在当前访问恢复为 `1`。计数 helper 的可执行代码不得引用 `Number`、`parseInt`、`parseFloat` 或 `BigInt`，不得使用十进制、十六进制、二进制、八进制或带数字分隔符的 BigInt 字面量，也不得使用模板字面量；注释和普通字符串中的同形文本不计。验证器还会把该 helper 单独放入不提供上述数值能力或同文件外部函数的 VM，逐例限时复跑相同矩阵，以证明它自包含且不通过委托绕过合同。它还执行[架构文档](architecture.md#6-访问统计)定义的历史 localStorage 兼容处理：验证历史累计值的安全整数边界、精确 ISO 时间戳与唯一真实日期数组的严格形状，有效累计、首次访问和日期旧值逐字段延续，单个历史键读取异常不阻断合法兄弟字段，现有规范键始终优先，损坏旧值不被激活，旧键从未被删除或瞬时覆盖，旧 `last` 不产生冗余迁移写入，以及页面计数不存在历史键映射或瞬时迁入。

对规范访问历史，沙箱从带非零毫秒的固定起点注入逐次前进的受控时钟并同时核对存储与渲染结果：带非零毫秒的有效首次访问保持不变，迁移后仍缺失或非精确 ISO 的值使用当前时间重建，最近访问与它共享唯一一次时间采样；只有严格缺失的规范键能接收合法历史值，已经存在的损坏规范值不会激活合法历史值。日期矩阵覆盖无效 JSON、非数组、混合类型、错误日历日期、非今日合法闰日、重复项、显式乱序、今天位于中间或重复出现，以及超过 365 项的数据；期望结果按原顺序稳定去重、让今天唯一位于末尾、截取最后 365 项，并通过写入轨迹证明即使数组已经规范也会在每次加载时持久化。

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
- 不进入 sitemap；
- 两页各有且仅有一个倒计时节点，均不含可执行内联脚本；
- 根 `404.html` 声明单一 DOM 的成对中英文文案/属性映射；英文标题、meta、资源、导航链接、ARIA、主题标签与正文文本的语义快照精确等于物理 `en/404.html` 的实际值，物理英文页不得用不会执行的本地化映射掩盖实际内容；
- 根页所有活动本地 `href` / `src` 与双语链接映射使用站点根绝对路径且目标存在；
- `site.js` 在主题初始化前执行唯一的 404 初始化器；普通页面无 404 节点时立即无副作用退出；隔离运行合同覆盖 `/en`、`/en/...`、中文默认及 `/enough/...`、`/en-US/...`、`/foo/en/...` 反例，逐次审计 `location.pathname`、`search`、`hash`、`href` 与 `window.location` 写入，确认前 4 次计时不改变完整 URL，第 5 次仅按语言写入 `/` 或 `/en/`。

验证器只使用 Node.js 内置模块，保持仓库只读，不访问网络，也不执行 JSON-LD。畸形 JSON 或超深嵌套输入会形成可定位问题，不使 `validateRepository()` 抛出；其他页面与后续独立检查继续运行。404 初始化器在无网络、无真实计时器的隔离能力面中运行，这能验证普通页面提前退出、语言边界、DOM 映射、计时、地址对象写入与跳转合同，但不能证明 GitHub Pages 的真实响应码、浏览器资源解析、渲染或真实地址栏行为；这些仍由浏览器矩阵核对。验证器也不评价全站 Open Graph/Twitter 文案质量，不证明搜索引擎的实际收录、展示或排名。

### 3.6 Sitemap 与 robots

验证器检查：

- sitemap XML 外壳和命名空间；
- 12 个预期 URL 及 alternate 链接；
- 没有额外的 XML 文档元素；
- `lastmod` 使用 `YYYY-MM-DD` 格式；
- robots 的通配 user-agent 规则没有全站禁止，并声明 sitemap。

它不会比较 `lastmod` 与 HTML mtime；生成器当前以本地 HTML mtime 为来源，多个页面同日是合法结果。

### 3.7 JavaScript 语法

验证器使用 Node.js `vm.Script` 做只读语法解析，覆盖：

- `assets/js/site.js`；
- `assets/js/stats.js`；
- `scripts/generate-sitemap.js`；
- `scripts/validate-site.js`；
- `worker/src/index.mjs`。

语法通过不等于浏览器行为通过；抽屉、Lightbox、主题、真实 Worker 接入和浏览器呈现仍需人工检查。

### 3.8 共享交互结构合同

验证器先按 `{}`、`()`、`[]` 平衡块提取 CSS 媒体块与规则，并排除注释、字符串伪实现；只接受整份样式表顶层的 `(max-width: 833px)` 媒体块，不接受由外层 `@supports` 等条件组包裹的目标媒体块。至少一个合格媒体块必须在其媒体体顶层同时包含精确直接 `.site-nav` 与 `.menu-toggle` 规则，且合并全部合格同谓词块后两者的最终有效 `display` 值分别为 `none` 和 `inline-flex`。这里只在所有块深度均为零的分号处分割顶层声明，再按 `!important` 优先级与源码顺序解析真实 `display:`，不把嵌套条件组、普通或嵌套块型自定义属性当作直接声明，也不扩展为完整的选择器优先级引擎。随后检查 `site.js` 的 `mobileMenuQuery` 是否使用同一谓词、变化监听器是否绑定到该查询，以及 `event.matches` 退出门是否与 `closeMenu(false)` 同处处理器顶层且位于清理之前；处理器还必须保留不返回隐藏菜单按钮焦点的关闭逻辑与可见桌面导航焦点回退。

Lightbox 的 `inert` 合同同时检查调用链接线与隔离行为：`openLightbox` 必须把 `[overlay]` 作为允许元素调用 `setBackgroundInert(true, ...)`，`closeLightbox` 必须调用 `setBackgroundInert(false)`；`setElementInert` 必须只有一个可执行同名函数语法，且其后不得在任意语句位置由裸赋值或 `var setElementInert = ...` 覆盖。点属性与字符串计算属性赋值只修改对象属性，不计作本地绑定覆盖。声明检测不依赖行首；为避免引入通用 JavaScript 解析器，任何经 `codeMask` 确认为可执行的 `function setElementInert(...)` 同名语法均保守计作竞争声明。注释和字符串中的同形文本不计为接线、声明或重赋值。

行为检查只提取自包含的 `setElementInert` 函数体和两个普通参数，在新的 `node:vm` 上下文内创建闭包属性存储与假元素，然后执行首次/重复激活、清理、重复清理和第二轮开关。单元素场景覆盖无 `aria-hidden`、显式 `aria-hidden="false"`、关闭抽屉式的 `aria-hidden="true"` 与 `inert`、仅属性和仅属性值；另以两个相反初始 `inert` 状态的元素交错激活和清理，检查状态不会串扰。所有场景均检查模态标记，并在微任务排空后再次复核最终状态。

假元素及其方法不从宿主注入；上下文不提供 `require`、`process`、`fs`，禁止字符串与 WebAssembly 代码生成，每段执行限制为 100ms。函数体的语法错误、运行时异常、超时、重复声明或任一状态不符均报告同一合同问题。这里的 `node:vm` 只用于缩小测试能力面和限制常规失控执行，不是针对恶意代码的安全边界。仅编译函数体也是有意的自包含合同：若正确实现改为调用同文件其他 helper，验证器会拒绝，届时必须同步扩展合同，而不是执行整份 `site.js`。该检查不模拟真实 DOM、媒体查询事件或焦点；833/834px 与 Lightbox 关闭后的状态和焦点仍须使用浏览器验证。

证明滑轨合同要求 `.proof-grid` 保留 flex 横向滚动与 snap，所有 `.proof-item` 共享同一宽高和纵向卡片布局，说明区占满剩余空间；宽版、紧凑或后续高优先级规则不得重新引入尺寸分叉。桌面增强必须提供 `grab` / `grabbing` 状态。验证器把 `initProofRails` 的实际函数体放入受限 `node:vm`，核对触摸指针不被接管、鼠标小位移仍视为点击、超过阈值后才捕获指针、滚动方向正确、结束后释放状态、仅抑制拖动产生的点击、后续普通点击恢复，以及浏览器原生图片拖动被阻止。该隔离检查不替代真实浏览器中的指针捕获、滚动位置、Lightbox 与触屏手势验收。

### 3.9 简历响应式收缩合同

验证器要求 `site.css` 在样式表顶层为精确选择器声明五组全局保护：文档卡片 `min-width: 0`，简历侧栏联系方式行 `min-width: 0`，其值同时使用 `min-width: 0` 与 `overflow-wrap: anywhere`，关键词标签同时使用 `min-width: 0`、`white-space: normal` 与 `overflow-wrap: anywhere`，简历主体长小按钮使用 `max-width: 100%` 与 `white-space: normal`。声明按源码顺序、选择器特异性和 `!important` 优先级解析，并把选择器列表及组合符周围的等价空白规范化；注释、字符串、错误选择器、错误值，以及顶层或 `@media` / `@supports` 中能够覆盖保护值的规则，均不能满足合同。较低优先级的共享基础样式、条件规则中的无关属性、最终 subject 上仅由类型/ID/类组成的单 compound `:not(...)` 明确排除目标的选择器和只作用于伪元素的规则不应被误报。验证器不尝试实现完整浏览器选择器引擎：祖先否定、属性或通配符否定，以及带组合符、嵌套函数或状态条件的复杂函数选择器，若其受保护声明足以覆盖基线，则保守拒绝。重叠候选也逐条受约束：高优先级错误声明即使随后由安全值恢复，仍视为陈旧风险并拒绝；应删除错误声明，不依赖后续补救。证明图的横向滚动仍属于 `.proof-grid` 自身，不能转移为页面级横向滚动。

### 3.10 首页移动 Hero 样式合同

验证器合并样式表顶层全部精确 `(max-width: 640px)` 媒体块，并按最终有效直接声明检查首页移动 Hero：右侧背景使用低密度 `48px` 网格；滑轨使用视口减 `32px` 的卡宽、`16px` 两端留白、中心吸附与统一 `216px` 卡高；身份卡保留双列布局并把联系方式降为可换行信息行；关键词改为无间隙的 2×3 分隔矩阵；统计改为无嵌套卡框的三栏分段面板，英文标签允许换行，计数在窄屏缩放并裁住异常超长内容。注释、字符串、错误媒体条件、旧宽度上限、尺寸分叉、恢复胶囊或嵌套卡框，以及后续有效覆盖均不能满足合同。该静态检查不模拟真实滚动条、字体度量、触摸惯性或主题颜色，仍须按浏览器矩阵验证。

## 4. 验证器单元测试

`scripts/validate-site-tests/support.js` 提供临时仓库副本和共享断言，四个领域模块通过 `scripts/validate-site.test.js` 聚合运行，当前覆盖：

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
- 英文活动 HTML 中的陈旧术语拒绝，以及 HTML 注释中的同形文本排除；
- 统计页的数据类型、计数、本地访问和访客字段，以及两个 404 的活动 JSON-LD 排除；
- 根 404 深层路径的根绝对资源、成对双语映射及其与物理英文 404 的标题/meta/资源/导航/ARIA/主题/正文精确等价，两页唯一倒计时节点和可执行内联脚本排除；共享初始化器在普通页面提前退出、调用顺序、精确 `/en/` 边界、中文反例、完整 URL 写入审计、5 秒保留与语言对应跳转；
- 正文证据排除 `template`、启用脚本语义下的 `noscript`、`hidden`、`inert`、`aria-hidden="true"`，并正确处理属性引号内的 `>`；
- sitemap alternate、XML 外壳和额外根元素；
- 分语言 manifest 基线、唯一 `<head>` 链接、正文/HTML 注释误满足、入口/范围/语言字段，无序精确安装图标清单及其缺失、重复、额外、`src` / `type` / `purpose` / `sizes` / 字段库存漂移；
- 导航品牌 PNG 的 64×64 尺寸与 16 KiB 上限；独立 PNG 的短文件、签名、IHDR 首块/长度/非零宽高、块边界与声明尺寸，以及 favicon ICO 的精确非重复尺寸、目录和 entry 边界、每个嵌入 PNG、非首 entry 损坏与目录/IHDR 尺寸漂移；
- 大小写错误路径；
- robots 全站禁止与 user-agent 作用域；
- 未登记的嵌套 HTML；
- Worker endpoint/preconnect 缺失、漂移或扩大到非统计页，以及旧公开计数运行时回归；
- `stats.js` 的单次 POST、5 秒中止期限、可访问加载/成功/失败状态、响应字段与起始日期严格校验、`0` 和超长数字、统一失败降级、本地日期文本隔离，规范累计/页面计数的严格形状、损坏值恢复、独立接线、局部与任意长度进位，并拒绝 `Number`、`parseInt`、`parseFloat`、`BigInt`、BigInt 字面量和宽松格式实现，以及历史 localStorage 逐字段安全迁移、规范键优先、旧 `last` 直接刷新、损坏值隔离、旧键保留和伪造旧页面键忽略；
- 规范本地访问历史的精确 ISO 首次/最近时间、同一当前时间快照、损坏规范值隔离，以及严格真实日期、稳定去重、今天唯一末尾、365 项上限、每次持久化和存储/页面一致性；
- 移动菜单共享 `(max-width: 833px)` 谓词的退出清理合同，以及 CSS 断点漂移、导航规则跨媒体块、外层 `@supports` 包裹目标媒体块、媒体块内部嵌套 `@supports` 条件组、注释/字符串/普通或嵌套块型自定义属性伪实现、同一规则/后续直接规则/后续同谓词媒体块覆盖 `display`、旧 `(min-width: 834px)` 间隙实现、错误查询、遗漏/反向/嵌套使用 `event.matches`、退出门晚于清理、缺少可见焦点回退、关闭逻辑落在无关函数、关键实现被注释掉或只出现在字符串中的变异用例；
- 简历文档卡片、联系方式、关键词标签和长小按钮的全局收缩合同，以及注释/字符串、等价空白、选择器列表、条件覆盖、非 `!important` 高特异性覆盖、`:nth-child(... of selector)` 特异性、较短的 `!important` 覆盖、实际 `.subtle` 动作变体、祖先/通配符否定、复杂函数选择器、嵌套状态否定、陈旧错误声明后续修复、错误值和后续覆盖变异；另有无关条件属性、最终 subject 的类型/ID/类单 compound `:not(...)`、简单与复合伪元素及 `!important` 正确优先级的正向用例，防止验证器在已建模范围内过度拒绝或误算层叠；
- 中英文档案的两组批准邮箱、旧电话与微信排除、邮箱及阶段摘要标签换行保护，以及证明卡片统一宽高、尺寸变体覆盖、拖动光标、初始化接线、滚动方向和拖动点击隔离变异；
- 首页移动 Hero 的视口卡宽、统一卡高、身份信息行、关键词组合矩阵、统计分段面板、英文标签换行、窄屏计数收缩和低密度背景网格，以及对应旧实现变异；
- Lightbox 打开/关闭背景接线与 `inert` 行为合同：等价实现正向夹具，以及缺少任一端接线、任意语句位置的裸赋值或 `var` 覆盖、对象属性赋值 decoy、非行首同名函数语法、遗漏属性值、显式 `aria-hidden="false"` 丢失、多元素共享快照串扰、重复/无关/注释/字符串处理器、激活分支贯穿、倒序恢复、抛错、语法错误、超时、恢复后立即或通过微任务延后再次清除等变异用例；
- JavaScript 字符串和正则字面量中的注释形文本不会干扰交互合同识别；
- 验证器只读保证；
- CLI 在无效仓库上返回非零状态。

修改验证器时，新增用例应先证明旧实现会漏报或崩溃，再实现最小修复。测试夹具不得改动真实仓库。

`scripts/stats-client.test.js` 独立执行浏览器客户端，覆盖成功、合法零值、无效或不可用响应、pending 请求在 5 秒中止后统一降级、缺少 endpoint，以及缺少 fetch/AbortController 能力时的无请求降级。`worker/src/index.test.mjs` 使用 Node 内置 SQLite 依次执行真实 D1 迁移，再覆盖首访、月内去重、上海时区跨月与旧月并发单调性、路径与来源白名单、拒绝来源不写库、预检允许/拒绝、配置漂移、稳定错误、D1/身份失败、健康检查，以及最终月度表只含月份和 HMAC 摘要的隐私合同。该 SQLite 适配器不等同于完整 Cloudflare 运行时；发布前仍要用 Wrangler 验证迁移、部署和线上健康端点。

## 5. 自动验证明确不覆盖的事项

以下内容必须人工或使用浏览器工具验证：

- 导航 `aria-current` 是否符合页面语义；
- 移动抽屉的真实 `inert` 状态、焦点陷阱、Escape 和焦点归还；
- Lightbox 的打开、键盘操作、关闭、背景实际状态与焦点恢复；
- 视觉布局、文字遮挡、横向滚动和主题对比度；
- 内联 `style`、其他未知域名的无用途 preconnect 等未纳入合同的代码质量偏差；
- PNG chunk CRC、像素数据完整解码与实际渲染质量；结构校验通过不等于图像可完整解码；
- 浏览器实际展示的安装 UI，以及安装后是否按语言入口启动；
- 搜索引擎是否收录、如何展示或是否改变排名；
- 线上 Worker/D1 的持续可用性、恶意请求防刷、外链和线上缓存；
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
| 320px | 极窄屏联系方式、长英文按钮与材料卡片收缩 |
| 375px | 常见窄屏与长英文换行 |
| 419px | 极窄屏断点上界 |
| 640px | 手机/小平板断点 |
| 833px | 移动导航最后一个像素 |
| `833px < W < 834px` | 页面缩放产生的小数 CSS 视口，必须已退出移动状态 |
| 834px | 桌面导航第一个像素 |
| 1068px | 单列 Hero 最后一个像素 |
| 1069px | 双列 Hero 第一个像素 |
| 1320px | 宽屏 Hero 紧凑区上界 |
| 1440px | 站点最大宽度与桌面留白 |

同时检查横屏、小高度窗口和 200% 浏览器缩放。页面不得出现意外横向滚动、遮挡或无法点击的控件。

简历页还需在中英文 `640px`、`375px` 与 `320px` 检查：`documentElement.scrollWidth === clientWidth`；`.doc-grid` 不产生自身宽度溢出；`.proof-grid` 保留 `overflow-x: auto` 的内部滑轨；联系方式值、关键词标签和长小按钮均落在各自父容器内，标签文字不得覆盖相邻标签；竖版简历缩略图完整显示且不被 `cover` 裁切；页面不再重复嵌入整页 PDF 插件视图。自动化或人工测试不得点击 PDF 链接；本机下载管理器可能接管该导航。

档案页还需在中英文桌面和 `320px` 检查：概览只显示两组邮箱且不显示电话或微信；页面本身无意外横向滚动；每个 `.proof-grid` 内的卡片宽高一致、说明文字不被裁切。另在 `640px`、`833px`、`834px`、`1068px`、`1069px` 与 `1440px` 检查高中阶段：教育卡与长荣誉卡纵向排列，宽屏荣誉列表只在自身卡片内分栏；小学单卡铺满可用宽度；本科等三项以上阶段继续保持自然多栏流。桌面用鼠标主键拖动后滑轨位置应改变且 Lightbox 不打开，随后普通点击及键盘 Enter 仍能打开对应原图；触屏保持原生横向滑动，底部滚动条继续作为回退入口。测试不得打开成绩单 PDF。

项目页还需在中英文 `640px`、`833px`、`834px`、`1068px`、`1069px` 与 `1440px` 检查：首组恰为两张带证明材料的项目卡且可见顺序与 JSON-LD 一致；两卡列宽一致，不与无媒体短卡形成跨行空洞；普通项目同一行等高、操作入口贴近卡底，不满一行的末组自然填满；证明图保留横向滚动，鼠标点击、Enter 与 Escape 的 Lightbox 行为不变。

首页还需在中英文 `320px`、`375px`、`419px` 与 `640px` 检查：四张 `.hero-side` 直属卡片等宽等高且逐张居中吸附，触屏横向滑动不会变成页面级横向滚动；身份信息、六个关键词、三项统计标签和状态说明均落在卡片内。公开统计至少用 `--`、`0` 与 8 位连续数字复核窄屏度量；浅色和深色下检查卡片、组合面板、分隔线与背景网格。

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
6. 通过页面缩放或开发者工具使 CSS 视口进入 `833px < width < 834px` 后，`matchMedia('(max-width: 833px)').matches` 为 false，移动菜单状态立即清理。
7. 继续拉宽到 834px 后，`body.menu-open`、遮罩、滚动锁和背景 `inert` 均已清理，抽屉恢复 `aria-hidden="true"` 与 `inert`；原焦点若在抽屉内，应转移到可见的当前桌面导航项；404 等没有当前项的页面应转移到首个桌面导航链接。
8. 抽屉关闭时打开并关闭证明图 Lightbox，抽屉仍保持 `aria-hidden="true"` 与 `inert`，屏外抽屉链接不能进入 Tab 顺序。

### 7.5 Lightbox

1. 鼠标、触屏和 Enter 可打开证明图。
2. 标题、图片与关闭按钮正确。
3. Escape 可关闭，焦点返回原图链接。
4. 关闭后，原本可交互的背景恢复为非 `inert`；原本已 `inert` 的关闭抽屉仍保持 `inert`。
5. 脚本禁用时原图链接仍有效。
6. 中英文资源路径和说明保持对应。

### 7.6 统计

分别验证：

- 四个统计页面各只向批准 endpoint 发出一次 JSON `POST`，请求 path 与当前页面一致，响应带 `no-store`；
- 线上 Worker 完整返回三个计数字符串、上海时区月份与精确 `2026-07-22` 起始日期；站点/页面次数递增，同一浏览器指纹在同月内不重复增加设备估算；
- 使用本地假响应分别验证 `0`、前导零、普通值和超长非负整数；
- 任一字段缺失，或计数为负数、小数、科学计数法、分组数字、全角数字、普通文本，或年月/起始日期不匹配时，三项统一显示 `--` 和警告状态；
- HTTP 4xx/5xx、无效 JSON、网络阻断和超过 5 秒的请求均进入 `warn`，不保留部分或陈旧公开值；
- 本地首次与最近访问日期仍正常显示；
- 加载、成功和失败状态由同一个礼貌实时区播报；
- 在中英文 `640px`、`833px`、`834px`、`1068px`、`1069px` 与 `1440px` 检查公开三项和本地三项数值卡可随可用宽度换行并填满末行，两项日期卡保持等宽；`<= 640px` 全部回落为单列，页面无横向溢出；
- 公开指标保留与语义一致的位置图标，当前浏览器数值和日期记录不继承这些图标；统计口径列表保持在正文阅读宽度内；
- 规范累计与页面计数在 `0`、普通值、跨越 `Number.MAX_SAFE_INTEGER` 和超长连续进位时精确加一；
- 规范计数缺失、为空、为负数、小数、科学计数法、前导零、带正号、含首尾空白、使用全角数字或文本时，本次恢复为 `1`；
- 规范首次访问为精确 ISO 时保持不变；规范键严格缺失且合法历史键存在时先迁移；迁移后仍缺失时以当前时间重建，已经存在的空值、非规范时区偏移、仅日期、不可解析值或自动修正的无效日期同样重建且不回退历史键；
- 规范最近访问始终写入与本次重建首次访问相同的当前时间快照，存储与页面格式化文本一致；
- 规范访问日期为无效 JSON、非数组、混合类型、错误日历日期、重复或乱序且超过 365 项时，按原顺序稳定去重，让今天唯一位于末尾，截取最后 365 项并在本次加载持久化；
- localStorage 可用、为空或被限制；
- 仅存在历史下划线键、历史与规范键冲突、部分历史字段损坏，以及伪造历史页面键；
- 刷新与中英文页面切换。

无论 Worker 状态如何，页面主体、本地计数和明确的降级文案都不应崩溃。不要把四页本地累计写成 14 页全站累计，也不要把月度设备估算写成真人独立访客。

### 7.7 404

使用[运维指南提供的 Pages-like 本地 handler](operations.md#2-本地预览)，把根 `404.html` 作为缺失文档正文并保留 HTTP 404；普通 `python -m http.server` 只返回自身错误页，不能证明 Pages fallback。至少检查 `/missing`、`/deep/missing?x=1#keep`、`/en/missing`、`/en/deep/missing?x=1#keep`，并加入 `/enough/missing`、`/en-US/missing`、`/foo/en/missing` 三个中文反例。中英文状态均检查：

- 缺失主文档返回 HTTP 404、没有 `Location`，倒计时结束前地址栏保留完整原 URL；
- 页面可读且没有普通导航当前项，根页任意深度下 CSS、脚本、图标、manifest 与站内链接均从正确的根绝对路径解析；
- `/en/...` 的标题、描述、head 元数据、桌面/抽屉导航、正文、操作、页脚、主题标签与 ARIA 名称等于物理 `en/404.html` 的现有英文值；边界反例保持中文；
- 倒计时可见且只有一个；真实等待 5 秒后中文进入 `/`，英文进入 `/en/`；
- 在 375、833、834、1440px 检查导航/抽屉边界、链接语言和页面级横向溢出；
- `<head>` 保持 `noindex` 且没有 canonical/hreflang/活动 JSON-LD；
- 不出现在 sitemap；
- 404 页面在跳转前不请求外网或 PDF，除主文档预期 404 外没有资源 4xx、脚本异常或新增控制台错误。到达首页后由统计页发起的 Worker 请求另行计账，不能误归因于 404。

## 8. 变更类型与最低验收

| 变更类型 | 自动验证 | 必要人工检查 |
| --- | --- | --- |
| 项目文档 | 最小验证入口、内部路径扫描 | 文档职责、事实源、隐私与重复 |
| 单页文案 | 最小验证入口 | 双语对应、标题层级、内容授权 |
| 图片或下载材料 | 最小验证入口 | 文件内容、尺寸、alt、公开权限、按钮 |
| CSS | 最小验证入口 | 双主题、419/640/833/834/1068/1069/1440 |
| `site.js` | 最小验证入口 | 主题、抽屉、Lightbox、键盘与降级 |
| `stats.js` | 最小验证入口 | Worker 成功/失败/超时、严格响应、localStorage 与四页范围 |
| `worker/` | 最小验证入口、Wrangler 本地迁移与 dry-run | API、D1、CORS、上海月界、隐私、健康端点与线上归零 |
| 页面/SEO（含 JSON-LD） | 重新生成 sitemap、运行全量测试与站点验证器 | canonical、hreflang、404、线上 URL 与 12 路由结构化数据矩阵 |
| manifest/图标 | 最小验证入口、两份 manifest 静态合同 | 各尺寸视觉质量、浏览器安装 UI 与实际启动入口 |

## 9. 回归清单

以下历史问题不得复发：

- 品牌标识被误写或改回字体 terminal；
- 404 被加入 canonical、hreflang、活动 JSON-LD 或 sitemap；
- 可索引页退回直接 `Person` 根对象或缺少页面 `inLanguage`；
- 页面、人物或网站稳定 ID 漂移，内部关系带额外字段或形成悬空引用；
- 项目/研究节点借用隐藏、非活动或 `aria-hidden` 内容充当可见证据；
- 统计页结构化数据暴露计数、本地访问、访客或浏览器信息；
- `833px < width < 834px` 的小数 CSS 视口仍残留移动导航状态，或 834px 仍启用移动导航；
- 非统计页加载 `stats.js` 或统计专用依赖；
- 四页 endpoint 漂移、旧公开计数运行时或隐藏计数节点重新出现；
- 英文页面重新指向中文 manifest，或任一页面出现重复/正文内 manifest 链接；
- manifest 重新使用 `site.ico`、缺少 192/512 安装 PNG、增加未经声明的 maskable 用途，或 favicon 尺寸/嵌入 PNG 漂移；
- 16×16 导航品牌重新引用超大 PNG，或品牌图尺寸/结构超过固定资源预算；
- 把本地四页累计描述为 14 页全站累计；
- 重命名本地统计键却没有逐字段兼容迁移，或用历史值覆盖任何已存在的规范键；
- 本地规范累计或页面计数因数值转换而丢失精度、停止递增、写成指数或 `NaN`，或继续接受损坏值和前导零；
- 本地规范首次/最近时间接受非精确 ISO 表示，或访问日期保留无效/重复值、让今天不在末尾、绕过 365 项上限、只在新增今天时才持久化；
- Worker 响应缺字段、年月或起始日期错误时仍展示部分计数，失败后保留陈旧值，或计数校验误伤本地日期文本；
- 把月度设备估算写成真人独立访客，导入部署日前计数，或在 D1 保存原始 IP、User-Agent、首次出现时间等额外身份数据；
- Lightbox 关闭时清除关闭抽屉原有的 `inert`，或让仅因模态打开而设置的背景 `inert` 残留；
- 把相同 `lastmod` 日期直接判为错误；
- 文档继续引用已删除路径或重复维护同一合同；
- 首页同一引文的卡片副本与页尾副本发生单边漂移；
- 英文页面重新引入 `graduation design`、`multi-terminal`、`Honourable Mention` 等已废弃表达；
- 首页移动 Hero 重新使用窄幅上限、不同卡高、分散胶囊/嵌套统计卡，或在 320px 让关键词、英文统计标签和高位计数溢出；
- 未授权个人材料或未发表研究材料进入公开仓库。

## 10. 测试结果记录

每次交付至少记录：

```text
分片运行器基础设施：22 passed / 0 failed
站点验证器测试：280 passed / 0 failed
统计客户端测试：6 passed / 0 failed
Worker 与 D1 测试：26 passed / 0 failed
Wrangler：本地 migration、dry-run、远程 migration/deploy 与 health 的实际结果
结构化数据子集：79 passed / 0 failed
图标名称子集：47 passed / 0 failed
历史 localStorage 子集：8 passed / 0 failed
规范本地访问历史子集：2 passed / 0 failed
首页引文子集：2 passed / 0 failed
英文术语子集：2 passed / 0 failed
首页移动卡片子集：10 passed / 0 failed
站点验证：14 HTML / 12 indexable / 12 sitemap URLs
diff check：通过或具体问题
人工检查：页面、主题、视口、键盘路径与统计 Network/Console；涉及结构化数据时记录 12 路由矩阵
未运行项：名称与原因
已知偏差：maintenance.md 条目编号
```

如果用户要求停止测试，立即停止并如实列出未运行项，不能补写成功结论。
