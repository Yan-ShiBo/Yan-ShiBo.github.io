# 项目贡献指南 (Contributing Guidelines)

欢迎贡献力量来完善闫士博的个人主页！本指南旨在帮助您快速熟悉本地开发环境，并规范代码编写与提交流程。

---

## 1. 本地开发环境搭建

由于本项目是一个纯静态的 HTML/CSS/JS 站点，您不需要配置复杂的编译环境，可以直接运行。

### 推荐开发环境：
* **编辑器**: VSCode，推荐安装 **Live Server** 扩展，以便在保存文件时浏览器自动热刷新。
* **本地服务器**: 
  如果你安装了 Node.js，可以在项目根目录直接运行以下指令：
  ```bash
  # 全局安装 http-server (如未安装)
  npm install -g http-server
  # 启动服务器
  http-server -p 8080
  ```
  或者如果您有 Python 环境，也可以运行：
  ```bash
  python -m http.server 8080
  ```
  然后访问 `http://localhost:8080` 即可。

---

## 2. 代码编写规范

为了保持网站代码的可读性与一致性，请遵守以下标准：

### 2.1 HTML 规范
* **语义化标签**: 优先使用 HTML5 语义化元素（如 `<header>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`）。
* **无障碍访问 (A11y)**:
  * 所有的交互图标和仅图标按钮必须带有 `aria-label` 或 `title` 属性。
  * 所有的图片必须包含有意义的 `alt` 属性，辅助屏幕阅读器。
* **唯一 ID**: 主页交互元素与统计脚本对接时，确保 ID（例如 `#site-pv`, `#stats-status`）全局唯一。

### 2.2 CSS 规范
* **拒绝行内样式**: 所有样式修改必须写在 [assets/css/site.css](file:///c:/Users/YanShibo/Documents/GitHub/Yan-ShiBo.github.io/assets/css/site.css) 中，禁止在 HTML 元素上使用 `style="..."`。
* **样式复用**: 优先使用 site.css 中已有的布局组件（如 `.grid-3`, `.panel`, `.tag`），避免为了小调整新建临时类。
* **变量使用**: 所有的颜色、间距、字体设置都应引用定义好的 CSS 变量（如 `var(--primary)`, `var(--section-space)`）。

### 2.3 JS 规范
* **纯原生 JS (Vanilla JS)**: 避免引入复杂的框架或体积庞大的依赖包（如 jQuery）。
* **非阻塞加载**: 所有第三方脚本或数据统计脚本（如不蒜子）均在 HTML 头部使用 `defer` 属性引入。

---

## 3. 双语平行同步规范

本站是**中英双语平行架构**的网站，根目录存放中文页面，`/en/` 目录存放对应的英文页面：
* 当您修改中文页面（如 `index.html`）中的某个 HTML 节点结构或新增了某个卡片时，**必须同时修改** `en/` 目录下对应的英文页面（如 `en/index.html`）。
* 确保两套 HTML 的 Class 命名、元素层级和节点完全一致，仅文字内容有所差异。

---

## 4. Git 提交与分支规范

### 4.1 Commit 信息规范
我们遵循简化的 Angular 提交信息规范。格式为：`<type>(<scope>): <subject>`。
* `feat`: 新增功能（如添加新项目卡片，增加新证书）。
* `fix`: 修复 Bug（如修复对齐问题，修复暗色模式闪烁）。
* `docs`: 文档更新（如编写架构说明书）。
* `style`: 格式调整（不影响代码逻辑的样式微调）。

**示例**:
```bash
feat(projects): add a new software verification project card
fix(style): resolve hero section alignment on wide screens
```

### 4.2 提交流程
1. 在本地开发并进行全面测试（验证浅色/深色主题，验证移动端自适应）。
2. 在提交修改前，运行 sitemap 生成脚本更新站点地图（如有新增页面）：
   ```bash
   node scripts/generate-sitemap.js
   ```
3. 提交修改并推送至 `main` 分支。GitHub Pages 将会自动拉取最新代码并完成构建上线。
