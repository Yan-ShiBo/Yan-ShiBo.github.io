# 结构化数据图重构设计

- **状态**：已批准，等待实施计划
- **日期**：2026-07-15
- **维护项**：M-008 JSON-LD 语言字段覆盖不一致
- **范围**：12 个可索引页面的 `<head>` JSON-LD、站点验证器、测试、sitemap 与对应项目文档

## 1. 背景

当前 12 个可索引页面都包含 JSON-LD，但只有中英文档案页以 `ProfilePage` 描述页面并声明 `inLanguage`；其余十页直接把顶层实体写成 `Person`。这让页面语言、页面身份与人物身份混在一起，也使验证器只能检查“字段存在时值是否正确”，不能证明页面类型、节点关系或跨语言身份一致。

Schema.org 的 `inLanguage` 描述内容语言，适用于 `CreativeWork` 及其页面子类型，不应直接用来描述 `Person`。本次重构将“页面”“网站”“人物”和页面专属条目拆成独立节点，并通过稳定 `@id` 关联。

## 2. 已批准的目标

1. 每个可索引页面只保留一个位于 `<head>` 的 JSON-LD 块。
2. 根对象统一为 Schema.org `@graph`。
3. 所有页面使用稳定的 `/#person` 与 `/#website`，页面自身使用 canonical URL 加 `#webpage`。
4. 所有页面节点声明与页面语言一致的 `inLanguage`。
5. 根据页面真实内容选择 `ProfilePage`、`WebPage` 或 `CollectionPage`，不使用一套类型覆盖所有页面。
6. 项目页和研究页进行详细建模，但只复用当前页面已经公开、可见的内容。
7. 验证器严格检查图结构、引用、页面类型、双语关系和页面专属条目。
8. 使用变异测试证明旧验证器的漏报，再实施最小而完整的修复。
9. 修改范围只涉及项目文件；不加入未发表论文、未公开研究结果或新的个人事实。

## 3. 非目标与内容边界

- 不修改任何页面正文、经历、图片或可见文案。
- 中英文档案页只修改 `<head>` 内的 JSON-LD。
- 不调整 canonical、hreflang、Open Graph、Twitter Card、路由或导航。
- 不把成绩单、奖项、证明图片、测试账号或材料明细复制进 JSON-LD。
- 不写入论文信息、实验结果、概率数值或其他未发表研究内容。
- 不把公开访问计数、本地记录、访问时间或访客数据写入 JSON-LD。
- 不把统计页描述为 `Dataset`，也不创建 `InteractionCounter`。
- 不承诺普通 `WebPage`、`CollectionPage` 或 `inLanguage` 会带来富结果或排名提升；本任务解决的是语义正确性、双语一致性和可验证性。

## 4. 统一图模型

每个可索引页面包含一个结构如下的根对象：

```json
{
  "@context": "https://schema.org",
  "@graph": []
}
```

图节点使用绝对 ID：

| 节点 | ID 合同 |
| --- | --- |
| 当前页面 | 当前 canonical URL 加 `#webpage` |
| 网站 | `https://yan-shibo.github.io/#website` |
| 人物 | `https://yan-shibo.github.io/#person` |
| 项目列表 | 当前项目页 canonical URL 加 `#project-list` |
| 研究方向列表 | 当前研究页 canonical URL 加 `#research-directions` |
| PersevereStudy | `https://yan-shibo.github.io/#project-persevere-study` |
| MicFamily | `https://yan-shibo.github.io/#project-mic-family` |
| 控制器更新 | `https://yan-shibo.github.io/#research-controller-updates` |
| PAC 近似 | `https://yan-shibo.github.io/#research-pac-approximation` |
| 证书模板 | `https://yan-shibo.github.io/#research-certificate-templates` |
| 更复杂系统 | `https://yan-shibo.github.io/#research-complex-systems` |

数组顺序只用于生成稳定、可审查的差异；验证器按 `@id` 查找节点，不把 JSON 数组位置当成语义。

### 4.1 页面节点

所有页面节点必须包含：

- 与页面清单一致的 `@type`；
- canonical 加 `#webpage` 的 `@id`；
- 与 canonical 完全相同的 `url`；
- 与 `<title>` 在 HTML 实体解码和空白规范化后完全一致的 `name`；
- 与 meta description 在 HTML 实体解码和空白规范化后完全一致的 `description`；
- 中文页为 `zh-CN`、英文页为 `en` 的 `inLanguage`；
- 指向 `/#website` 的 `isPartOf`；
- 与页面类别一致的 `mainEntity` 或 `about`。

### 4.2 网站节点

每页都包含同一个稳定网站实体：

- `@type: WebSite`；
- `@id: https://yan-shibo.github.io/#website`；
- `url: https://yan-shibo.github.io/`；
- 当前语言下的网站名称；
- `inLanguage: ["zh-CN", "en"]`；
- `creator` 指向 `/#person`。

同一 `@id` 允许在中英文页面提供本地化名称；URL、语言集合和关系必须跨页一致。验证语言集合时按集合比较，不把数组顺序当成语义。

### 4.3 人物节点

每页都包含同一个稳定人物实体：

- `@type: Person`；
- `@id: https://yan-shibo.github.io/#person`；
- 中文页以中文姓名为 `name`、英文姓名为 `alternateName`；英文页顺序相反；
- 保留当前已经公开的 `url`、`image`、`email`、`alumniOf` 和 `homeLocation`，不新增字段或事实；
- 不在 `Person` 上声明 `inLanguage`。

验证器将姓名与别名视为同一双语集合，并在规范化语言字段后比较其余人物事实，防止 12 页之间发生漂移，而不在测试或文档中再次硬编码个人材料正文。

## 5. 页面类型与关系

| 页面组 | 页面 `@type` | 关系合同 |
| --- | --- | --- |
| `/`、`/en/` | `ProfilePage` | `mainEntity` 指向 `/#person` |
| 中英文档案 | `ProfilePage` | `mainEntity` 指向 `/#person` |
| 中英文研究 | `WebPage` | `mainEntity` 指向本页 `#research-directions`，`about` 指向 `/#person` |
| 中英文项目 | `CollectionPage` | `mainEntity` 指向本页 `#project-list`，`about` 指向 `/#person` |
| 中英文简历 | `ProfilePage` | `mainEntity` 指向 `/#person` |
| 中英文统计 | `WebPage` | `about` 指向 `/#website`，不声明人物或数据集为主实体 |

不使用 `AboutPage`：档案、首页和简历有更具体的 `ProfilePage`；研究页描述研究主题和方法，不是介绍网站本身；统计页描述网站访问统计功能。

## 6. 项目页详细模型

项目页图中增加一个 `ItemList` 和两个 `SoftwareSourceCode` 节点。

### 6.1 项目列表

- `@id` 为当前 canonical 加 `#project-list`；
- `numberOfItems` 固定为 `2`；
- `itemListElement` 包含两个按页面顺序排列的 `ListItem`；
- `position` 分别为 `1` 和 `2`；
- `item` 分别引用两个稳定项目 ID。

### 6.2 项目节点

两个项目节点只使用页面已有内容：

- 本地化项目名称；
- 页面可见的简短介绍；
- 对应 GitHub URL 的 `codeRepository`；
- 从可见技术标签得到的 `keywords`；
- `contributor` 指向 `/#person`。

不使用 `creator` 声称独占作者身份，不把时间区间误写为 `dateCreated`，也不写入奖项等级、证明图片或仓库测试账号。

## 7. 研究页详细模型

研究页图中增加一个 `ItemList` 和四个研究方向节点。

### 7.1 研究方向列表

- `@id` 为当前 canonical 加 `#research-directions`；
- `numberOfItems` 固定为 `4`；
- `itemListElement` 按页面“接下来推进的方向”顺序排列；
- 每个 `ListItem` 使用 `position` 并引用稳定研究方向 ID。

### 7.2 研究方向节点

四个方向节点使用通用 `Thing`，避免把尚未形成独立公开项目的研究方向误写为 `ResearchProject` 或已发表成果。节点只包含：

- 稳定跨语言 ID；
- 页面当前语言下的名称；
- 当前可见的简短说明。

四个方向为控制器更新、PAC 近似、证书模板和更复杂系统。研究页页面节点可保留当前公开研究关键词，但不得增加论文、实验结果、概率下界或未发表材料。

## 8. 统计页隐私边界

统计页图只包含页面、网站和人物公共节点。页面 `about` 指向网站，不设置 `mainEntity: Person`，也不创建额外统计实体。

验证器必须拒绝统计页中的以下内容：

- `Dataset`；
- `InteractionCounter`；
- 当前公开计数值；
- localStorage 计数、首次/最近访问时间；
- 可识别访问者或浏览器的信息。

## 9. 验证器设计

### 9.1 提取与解析

对 12 个可索引页面：

1. 提取 `<head>` 与正文范围；
2. 要求 `<head>` 中恰有一个 `application/ld+json` 脚本；
3. 拒绝正文中的额外 JSON-LD；
4. 安全解析 JSON，失败时记录文件级问题并继续验证其他页面；
5. 要求根 `@context` 为 `https://schema.org` 且 `@graph` 为数组；
6. 建立按 `@id` 索引的节点映射；
7. 拒绝缺失、重复或非绝对内部 ID；
8. 递归收集内部 `@id` 引用并拒绝悬空引用。

验证器不执行 JSON-LD、不访问网络、不修改仓库。

### 9.2 页面合同

验证器使用页面清单驱动的合同表，检查：

- 页面节点类型、ID、URL、语言和关系；
- 页面 `name` 与 `<title>`、`description` 与 meta description 一致；
- 每类页面的图节点 ID 和类型集合完全符合合同，拒绝未登记的内部节点；
- 网站和人物稳定 ID 及跨页事实一致；
- 项目列表数量、顺序、项目 ID、仓库 URL 和贡献者关系；
- 研究列表数量、顺序、稳定 ID 和本地化内容；
- 项目及研究节点使用的名称、描述、关键词和仓库 URL 均能在当前可见页面中找到对应内容；
- 统计页只使用允许节点和关系；
- 两个 404 页面不包含 JSON-LD。

### 9.3 故障行为

任一页面的 JSON-LD 失败都只追加可定位的问题，不应让 `validateRepository()` 抛出。后续独立检查继续运行，使一次验证能报告全部结构问题。

## 10. 测试设计

实施采用测试先行：先添加会在旧验证器上失败的变异用例，再实现新合同。

变异测试至少覆盖：

- 缺失、重复或正文内 JSON-LD；
- 错误 `@context`、非数组 `@graph` 与畸形 JSON；
- 错误页面类型、语言、canonical 页面 ID 或 URL；
- 缺失/重复节点 ID、悬空引用；
- 人物或网站稳定 ID 漂移；
- 人物事实在中英文或页面间漂移；
- 项目列表缺项、顺序错误、仓库 URL 错误或贡献者关系错误；
- 研究方向缺项、顺序错误或本地化文本不在可见页面中；
- 统计页误用 `Dataset`、`InteractionCounter`、人物主实体或计数值；
- 404 意外包含 JSON-LD；
- 验证器从非仓库 cwd 执行、仓库只读和 CLI 失败退出。

测试数量以实施后的实际 `node:test` 输出为准，并同步更新 `docs/testing.md`，不在设计阶段预填数字。

## 11. 浏览器与发布验证

自动验证通过后，使用本地 HTTP 服务和 Chrome 检查全部 12 个可索引页面：

- 每页恰有一个 JSON-LD 块；
- 浏览器内 `JSON.parse` 成功；
- 页面节点类型、ID 与语言符合清单；
- 页面正文、可见布局和交互不因 `<head>` 修改而变化；
- 控制台没有站点脚本错误。

除浏览器检查外，提交前还要把 12 页当前工作树与实现前提交逐页比较，确认所有 HTML 差异都位于 `<head>` 的 JSON-LD 块；对中英文档案页单独比较 `<body>` 字节，必须完全一致。

本任务会修改 12 个 HTML 文件，因此按现有运维流程重新运行 sitemap 生成器，并验证 12 个 URL、hreflang alternate 和 `lastmod` 格式。不会修改路由集合。

## 12. 文档同步

实施完成时同步：

- `docs/architecture.md`：结构化数据图、页面类型和实体关系的唯一事实源；
- `docs/testing.md`：自动合同、变异用例、Chrome 矩阵与最终测试数量；
- `docs/operations.md`：结构化数据排查、sitemap 生成和发布验证；
- `docs/maintenance.md`：把 M-008 移入已解决记录，保留根因和防复发规则；
- `sitemap.xml`：由生成器根据修改后的 HTML mtime 更新。

本规格是实施前审批材料。实施完成后，其长期合同合并进上述权威文档；为避免与项目文档治理规则形成重复事实源，本规格文件在最终实现提交前删除，设计历史由本次本地提交保留。

## 13. 预期文件范围

设计提交只新增本规格。实施阶段预期修改：

- 12 个可索引 HTML 页面；
- `scripts/validate-site.js`；
- `scripts/validate-site.test.js`；
- `docs/architecture.md`；
- `docs/testing.md`；
- `docs/operations.md`；
- `docs/maintenance.md`；
- `sitemap.xml`；
- 删除本规格文件。

不修改 CSS、共享运行时 JavaScript、manifest、404 正文、PDF、图片或其他个人材料。

## 14. 官方依据

- [Schema.org WebPage](https://schema.org/WebPage)
- [Schema.org ProfilePage](https://schema.org/ProfilePage)
- [Schema.org CollectionPage](https://schema.org/CollectionPage)
- [Schema.org inLanguage](https://schema.org/inLanguage)
- [Schema.org mainEntity](https://schema.org/mainEntity)
- [Schema.org about](https://schema.org/about)
- [Google ProfilePage structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)

## 15. 完成标准

本维护项只有在以下证据全部成立后才完成：

1. 12 页使用批准的页面类型和统一 `@graph`；
2. `inLanguage`、stable ID、引用和页面专属条目全部通过验证器；
3. 新增变异测试在旧实现上失败、在新实现上通过；
4. 全量 `node:test`、站点验证器、语法检查和 `git diff --check` 通过；
5. Chrome 完成 12 页运行检查；
6. sitemap 与四份权威文档同步；
7. 档案页正文及所有其他页面可见内容未改变；
8. 没有论文、实时统计、访客信息或新个人事实进入 JSON-LD；
9. M-008 以独立实现提交推送到 `main`，并完成最终维护队列审计。
