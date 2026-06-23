# 更新日志 (Changelog)

本项目的版本变更遵循 [语义化版本 2.0.0 (SemVer)](https://semver.org/lang/zh-CN/) 规范，并且格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

---

## [1.2.0] - 2026-06-23

### Added
* 新增 `/docs/design/` 目录，归纳设计、架构和维护文档。
* 新增 `CONTRIBUTING.md` (贡献指南)、`SECURITY.md` (安全漏洞策略) 及全套架构、开发、集成文档。

### Fixed
* 修复了桌面端（屏幕宽度 > 1068px）主页 Hero 区域与下方内容板块在左右边界上没有对齐的歪斜问题。通过移除 `max-width` 限制并采用动态 `padding-left/right: max(24px, calc((100vw - var(--max-width)) / 2))`，确保头部内容左右两侧完美贴合 1440px 居中对齐线。

---

## [1.1.0] - 2026-06-07

### Added
* 将原本位于根目录下的设计文档 `DESIGN.md` 进行了内容细化，明确了全站 CSS 设计代币与响应式栅格布局逻辑。
* 丰富了主要经历证明、毕业设计成果以及竞赛证书的预览图片与大图展示。

### Fixed
* 修复了部分页面中英文切换时链接相对路径错误导致的 404 故障。
* 优化了 `site.css` 的媒体查询合并，大幅缩减冗余 CSS 代码。

---

## [1.0.0] - 2026-05-30

### Added
* 完成闫士博双语学术主页的首次上线。
* 实现了全局深色模式（Dark Mode）一键切换，并增加了基于 `localStorage` 的拦截脚本，完美解决网页刷新白屏闪烁问题。
* 集成了不蒜子 (Busuanzi) 和 Vercount 访问统计 API，并在 `stats.js` 中实现了流量统计服务的超时优雅降级处理。
* 引入本地 Font Awesome 4.7.0 字体图标包，保障所有学术指标、证书及技术标签附带矢量图标。
* 实现了移动端侧滑抽屉式菜单（Drawer），并引入焦点捕获（Focus Trapping）无障碍访问控制。
