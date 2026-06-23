# 部署与运维手册

本站通过 GitHub Pages 托管，根目录即发布目录，无后端服务、无构建流水线。推送到生产分支后 GitHub Pages 自动重新部署静态文件。绝大多数运维问题来自静态资源路径、CSS 断点、第三方统计或浏览器本地状态。

---

## 1. 部署架构

| 项 | 当前值 |
| --- | --- |
| 托管 | GitHub Pages |
| 线上地址 | `https://yan-shibo.github.io` |
| 发布内容 | 仓库根目录静态文件 |
| 后端服务 | 无 |
| 构建步骤 | 无正式构建，仅 sitemap 生成脚本 |
| HTTPS | GitHub Pages 自动提供 |

---

## 2. 发布前验证

在仓库根目录运行以下静态检查：

```powershell
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

如果改动涉及 HTML、CSS、JS、图片或 PDF，还需启动本地服务器：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

至少访问以下页面，确认无明显异常：

- `http://127.0.0.1:8000/` — 中文首页
- `http://127.0.0.1:8000/en/` — 英文首页
- `http://127.0.0.1:8000/profile.html` — 个人档案
- `http://127.0.0.1:8000/resume.html` — 简历
- `http://127.0.0.1:8000/analytics.html` — 统计页

---

## 3. sitemap 维护

### 何时重新生成

- 新增、删除或重命名页面。
- 修改页面内容后希望搜索引擎看到新的 `lastmod`。
- 修改 `scripts/generate-sitemap.js` 中的 `pagePairs` 配置。

### 生成命令

```powershell
node scripts/generate-sitemap.js
```

### 验证

- 检查 `sitemap.xml` 中是否有重复 URL。
- 确认新页面对应的 URL 和 `lastmod` 值正确。

---

## 4. 发布步骤

1. 完成上述本地验证。
2. 运行 `git status --short`，确认没有无关文件被提交。
3. 提交改动。
4. 推送到 GitHub。
5. 到仓库的 GitHub Pages 部署记录或 Actions 页面确认部署成功。

---

## 5. 发布后验证

发布完成后用**无痕窗口**访问以下线上地址：

- `https://yan-shibo.github.io/`
- `https://yan-shibo.github.io/en/`
- `https://yan-shibo.github.io/profile.html`
- `https://yan-shibo.github.io/resume.html`
- `https://yan-shibo.github.io/analytics.html`
- `https://yan-shibo.github.io/sitemap.xml`

检查项：

- CSS 和 Font Awesome 没有 404。
- PDF 能正常打开。
- 中英文切换正确。
- 主题切换后刷新仍保持。
- 移动端菜单能打开和关闭。
- 统计失败时页面仍可正常阅读。

---

## 6. 回滚

如果上线后发现严重问题：

1. 优先 `git revert` 引入问题的提交。
2. 推送回滚提交。
3. 等待 GitHub Pages 重新部署完成。
4. 用无痕窗口验证关键页面恢复正常。

> **注意**：不要直接删除大量资源来"临时修复"，除非已确认所有引用也同步移除。

---

## 7. 故障排查

以下按症状列出排查路径，覆盖全部已知常见问题。

### 7.1 统计显示 `--`

**可能原因**：

- 第三方统计脚本被广告拦截器屏蔽。
- Busuanzi 或 Vercount 服务不可用。
- 页面缺少隐藏计数 span 或可见统计 id。

**排查**：

1. 打开浏览器开发者工具 Network 面板。
2. 检查 `events.vercount.one`、`busuanzi`、`cdn.jsdelivr.net` 请求是否被拦截。
3. 确认页面存在 `#site-pv`、`#site-uv`、`#page-pv`、`#stats-status` 元素。
4. 查看控制台是否有 JS 报错。

**处理**：

- 第三方被拦截属于可接受降级，无需修复。
- DOM 元素缺失则按 `docs/design/architecture.md` 的外部集成与 DOM 契约补齐。

### 7.2 深色主题刷新闪烁或不保存

**可能原因**：

- 主题键名写错。
- CSS 使用了旧的 `.dark` 选择器。
- `site.js` 没有正常加载。

**排查**：

1. LocalStorage 中应有 `ysb-theme` 键。
2. `<html>` 标签应出现 `data-theme="dark"` 或 `data-theme="light"`。
3. CSS 深色覆盖应使用 `:root[data-theme="dark"]` 选择器。

**处理**：

- 不恢复 `localStorage.theme` 或 `.dark` 方案。
- 修复 `site.js` 加载路径。

### 7.3 移动端菜单打不开或关不上

**可能原因**：

- `data-menu-toggle`、`data-drawer`、`data-drawer-backdrop` 或 `data-menu-close` 属性缺失。
- 抽屉关闭状态缺少 `inert` 属性。
- CSS 中 `pointer-events` 被意外覆盖。

**排查**：

1. 在手机宽度下点击菜单按钮。
2. 检查 `<body>` 是否切换 `menu-open` 类。
3. 按 Escape 键是否能关闭菜单。
4. Tab 键焦点是否被限制在抽屉内。

**处理**：

- 对照其他页面复制完整 header/drawer 结构。
- 不在单页内另写一套菜单脚本。

### 7.4 Font Awesome 图标显示为方块

**可能原因**：

- 字体 CSS 引用路径错误。
- `assets/vendor/font-awesome-4.7.0/fonts/` 目录下缺少字体文件。

**排查**：

- 根目录页面应引用 `./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css`。
- 英文目录页面应引用 `../assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css`。

**处理**：

- 修正相对路径。
- 不用 emoji 或另一套图标库临时替换。

### 7.5 PDF 无法打开

**可能原因**：

- 文件名被改动。
- 相对路径错误。
- PDF 文件没有提交到仓库。

**排查**：

1. 确认 `docs/Shibo-Yan-Resume.pdf` 存在。
2. 确认 `docs/Shibo-Yan-Undergraduate-Transcript.pdf` 存在。
3. 根目录页面用 `./docs/...`，英文页面用 `../docs/...`。

**处理**：

- 如果只是替换新版 PDF，优先覆盖同名文件。
- 如果必须改名，全站搜索旧文件名并同步替换所有引用。

### 7.6 移动端出现横向溢出

**可能原因**：

- 长按钮或标签没有换行策略。
- 新图片或 iframe 缺少最大宽度限制。
- 某个网格子项设置了固定宽度。

**排查**：

- 在 375px 视口下打开首页、档案页、项目页、简历页。
- 检查是否出现全局横向滚动条。

**处理**：

- 优先修复组件的 responsive 规则。
- 不用缩小全站字体来掩盖溢出。

### 7.7 证明图片点击没有 Lightbox

**可能原因**：

- 链接缺少 `data-lightbox` 属性。
- 页面未加载 `assets/js/site.js`。
- 图片链接路径错误。

**处理**：

按以下结构修复：

```html
<a class="proof-item" data-lightbox data-caption="..." href="./assets/images/example.jpg">
  <img alt="..." src="./assets/images/example.jpg" width="..." height="..." loading="lazy" decoding="async">
</a>
```

英文页路径通常需要 `../assets/images/...`。

### 7.8 sitemap 不更新

**可能原因**：

- 忘记运行 `node scripts/generate-sitemap.js`。
- 新页面没有加入 `pagePairs` 配置。
- 文件修改时间未变化。

**处理**：

1. 在 `scripts/generate-sitemap.js` 的 `pagePairs` 中添加新页面。
2. 运行生成脚本。
3. 检查 `sitemap.xml` 中对应 URL 和 `lastmod` 是否正确。

### 7.9 404 页面跳转错误

**当前行为**：

- 中文 `404.html` 5 秒后跳转到 `/`。
- 英文 `en/404.html` 5 秒后跳转到 `/en/`。

**处理**：

如果修改 404 页面，必须保留各自语言的跳转目标不变。
