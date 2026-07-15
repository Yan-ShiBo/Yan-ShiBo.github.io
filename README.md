# Yan-ShiBo.github.io

闫士博的双语静态个人网站，由原生 HTML、CSS 和 JavaScript 构建，并通过 GitHub Pages 发布。

- 在线站点：<https://yan-shibo.github.io/>
- 英文入口：<https://yan-shibo.github.io/en/>
- 部署分支：`main`
- 构建步骤：无

## 项目概览

网站由 7 个中文页面和 7 个英文页面组成：

| 页面 | 中文 | 英文 |
| --- | --- | --- |
| 首页 | `index.html` | `en/index.html` |
| 档案 | `profile.html` | `en/profile.html` |
| 研究 | `research.html` | `en/research.html` |
| 项目 | `projects.html` | `en/projects.html` |
| 简历 | `resume.html` | `en/resume.html` |
| 统计 | `analytics.html` | `en/analytics.html` |
| 404 | `404.html` | `en/404.html` |

六组普通页面共 12 个可索引 URL；两张 404 页面使用 `noindex`，不进入 sitemap。

## 技术结构

- 原生 HTML5；
- 单一全站样式 `assets/css/site.css`；
- 全站交互 `assets/js/site.js`；
- 四个统计页面使用 `assets/js/stats.js`；
- 本地字体、Font Awesome、品牌图和 favicon；
- GitHub Pages 静态部署；
- 零依赖 Node.js sitemap 生成器、站点验证器和单元测试。

网站支持浅色/深色主题、移动导航、键盘焦点管理、证明图 Lightbox、双语 SEO 和第三方统计失败降级。

## 本地预览

在仓库根目录运行：

```powershell
python -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/en/
```

## 验证

验证命令、当前基线、自动范围、浏览器矩阵与验收证据统一维护在 [`docs/testing.md`](docs/testing.md)。

## 目录

```text
.
├── AGENTS.md
├── README.md
├── index.html
├── profile.html
├── research.html
├── projects.html
├── resume.html
├── analytics.html
├── 404.html
├── en/                         # 七个英文对应页面
├── assets/
│   ├── css/site.css            # 全站视觉与响应式
│   ├── js/site.js              # 主题、抽屉、Lightbox
│   ├── js/stats.js             # 四页访问统计
│   ├── fonts/                  # 本地 Inter 字体
│   ├── icons/                  # 品牌图与 favicon
│   ├── images/                 # 项目与证明图
│   ├── profile/                # 头像
│   └── vendor/                 # 本地 Font Awesome
├── docs/
│   ├── README.md               # 维护者任务路由
│   ├── architecture.md         # 系统架构与不变量
│   ├── design.md               # 设计、组件与内容规范
│   ├── testing.md              # 自动与人工测试
│   ├── operations.md           # 发布、缓存与回滚
│   ├── maintenance.md          # 当前偏差与回归历史
│   ├── Shibo-Yan-Resume.pdf
│   └── Shibo-Yan-Undergraduate-Transcript.pdf
├── scripts/
│   ├── generate-sitemap.js
│   ├── validate-site.js
│   └── validate-site.test.js
├── manifest.webmanifest
├── robots.txt
└── sitemap.xml
```

## 文档

| 文档 | 职责 |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | 自动化修改边界、个人内容、Git 和验证硬规则 |
| [`docs/README.md`](docs/README.md) | 按维护任务选择事实源 |
| [`docs/architecture.md`](docs/architecture.md) | 页面库存、运行时、统计、SEO、隐私和 ADR |
| [`docs/design.md`](docs/design.md) | 视觉令牌、组件、响应式、内容和术语 |
| [`docs/testing.md`](docs/testing.md) | 验证器、测试矩阵和交付证据 |
| [`docs/operations.md`](docs/operations.md) | 预览、sitemap、发布、缓存、回滚和故障处理 |
| [`docs/maintenance.md`](docs/maintenance.md) | 已知偏差、修复队列和历史根因 |

## 维护约束

- 14 个 HTML 的共享导航和语言映射需要整体考虑。
- `stats.js` 只加载于中英文首页和统计页。
- 品牌标识使用 `assets/icons/brand-mark.png`，不是字体 terminal。
- 移动导航适用于 `<=833px`，桌面导航从 `834px` 开始。
- 页面库存变化时同步 sitemap 生成器、验证器、测试和架构文档。
- Markdown 文档变化本身不需要重新生成 sitemap。
- 修改个人页面、证明材料或公开下载文件前必须获得明确授权。
- 未发表研究材料、私有源数据和未授权文件不得进入仓库。

详细规则以 [`AGENTS.md`](AGENTS.md) 和 `docs/` 下的唯一事实源为准。

## 许可与内容边界

仓库尚未提供统一的开源 `LICENSE`。HTML/CSS/JavaScript 的组织方式可供学习参考，但这不构成对个人文字、照片、证明材料、联系方式或下载文件的复制授权。

如需正式开放代码许可，应新增独立 `LICENSE`，并明确区分代码许可与个人内容授权。
