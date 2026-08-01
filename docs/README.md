# 项目文档

本目录面向网站维护者，按任务路由到唯一事实源。前端是由 GitHub Pages 直接发布、没有构建步骤的双语静态站点；访问统计使用单独部署的 Cloudflare Worker + D1。

## 1. 从哪里开始

| 你要做什么 | 先读 |
| --- | --- |
| 理解项目、启动预览 | 根目录 [`README.md`](../README.md) |
| 修改页面、路由、统计、SEO 或隐私边界 | [`architecture.md`](architecture.md) |
| 修改 CSS、组件、主题、响应式或文案样式 | [`design.md`](design.md) |
| 运行自动与浏览器验收 | [`testing.md`](testing.md) |
| 生成 sitemap、发布、回滚或排查线上问题 | [`operations.md`](operations.md) |
| 查看当前偏差和历史回归原因 | [`maintenance.md`](maintenance.md) |
| 使用自动化代理修改仓库 | 根目录 [`AGENTS.md`](../AGENTS.md) |

只读取与任务相关的文档。遇到冲突时，当前 HTML/CSS/JavaScript/配置优先于说明文字；发现漂移后同步修正文档。

## 2. 文档职责

```text
README.md              项目定位、最短启动、结构与文档入口
AGENTS.md              修改边界、个人内容、Git 和验证硬规则
docs/README.md         维护者任务路由
docs/architecture.md   系统边界、页面库存、运行时、SEO、隐私、ADR
docs/design.md         令牌、组件、响应式、内容与术语
docs/testing.md        自动验证、人工矩阵、验收证据
docs/operations.md     预览、sitemap、发布、缓存、回滚、故障处理
docs/maintenance.md    当前偏差、修复队列、事故根因与防回归
```

每项规则只在一个文件展开。其他文档只能摘要并链接，不复制整段命令、矩阵或合同。

## 3. 当前项目地图

```text
中文：index / profile / research / projects / resume / analytics / 404
英文：en/ 下对应七页
共享样式：assets/css/site.css
共享交互：assets/js/site.js
统计脚本：assets/js/stats.js（仅中英文统计页）
统计后端：worker/src/index.mjs + worker/wrangler.toml
D1 迁移：worker/migrations/
生成器：scripts/generate-sitemap.js
验证器：scripts/validate-site.js
分片运行器：scripts/run-validator-tests.js + scripts/run-validator-tests.test.js
验证器测试：scripts/validate-site.test.js（聚合入口）+ scripts/validate-site-tests/（领域模块）
其他测试：scripts/stats-client.test.js + worker/src/index.test.mjs
CI：.github/workflows/tests.yml
```

页面总数为 14；其中 12 个普通页面可索引，2 个 404 不进入 sitemap。

## 4. 标准变更流程

1. 确认任务范围和需要用户选择的内容。
2. 阅读上表对应的唯一事实源。
3. 检查当前工作树，保护已有改动。
4. 用小范围、可审查的方式修改。
5. 同步受影响的中英文页面、脚本和文档。
6. 按 [`testing.md`](testing.md)运行自动与人工检查。
7. 如实记录未运行项和 [`maintenance.md`](maintenance.md)中的已知偏差。
8. 只有得到授权后才提交、推送或发布。

## 5. 文档变更规则

- 文档必须描述当前代码，而不是未来愿望。
- 过期过程和无复用价值的流水账直接删除；Git 历史承担版本追踪。
- 当前偏差写入维护记录，不得伪装成已实现合同。
- 文档改名时同步所有内部路径、README 目录树和代理规则。
- 仅修改 Markdown 时不生成 sitemap，也不顺带修改个人页面。
- 所有项目文档位于公开仓库，应避免包含未授权个人信息或未发表研究材料。

## 6. 最短预览与验证

根目录 [`README.md`](../README.md) 提供最短启动入口；完整预览与发布操作只在 [`operations.md`](operations.md)维护，测试命令、期望输出和人工矩阵只在 [`testing.md`](testing.md)维护。
