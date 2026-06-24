# ShiBo Yan's Academic Portfolio / 闫士博个人主页

[![GitHub Pages](https://img.shields.io/badge/hosting-GitHub%20Pages-222222?logo=github)](https://pages.github.com/)
![Static Site](https://img.shields.io/badge/site-static%20HTML%2FCSS%2FJS-0f766e)
![Bilingual](https://img.shields.io/badge/language-ZH%20%2F%20EN-0066cc)
![No Build](https://img.shields.io/badge/build-no%20build-lightgrey)

[中文主页](https://yan-shibo.github.io/) · [English Version](https://yan-shibo.github.io/en/) · [个人档案](https://yan-shibo.github.io/profile.html) · [研究方向](https://yan-shibo.github.io/research.html) · [项目展示](https://yan-shibo.github.io/projects.html) · [在线简历](https://yan-shibo.github.io/resume.html)

这是闫士博（ShiBo Yan）的双语研究型个人主页。网站用于展示研究身份、教育经历、学术科研、项目实践、竞赛荣誉、证明材料、PDF 简历和联系方式。站点采用纯静态架构，由 GitHub Pages 直接托管，核心技术为 HTML5、CSS3 和 Vanilla JavaScript，不依赖 React、Vue、Tailwind、Vite、Webpack 或其他构建工具。

本项目的设计目标不是制作营销式落地页，而是建立一条清晰、可核查的个人学术材料链：访问者应能快速确认“我是谁、研究方向是什么、有哪些真实材料支撑、简历和联系方式在哪里”。

---

## 1. 项目定位

本站定位为 academic portfolio / research profile site，主要面向以下访问者：

- 导师、老师、评审专家和潜在合作方。
- 研究方向相关的同学、开发者和访问者。
- 需要查看简历、成绩单、项目材料或证明图片的人。
- 站点维护者和 AI 编码助手。

核心信息架构是：

```text
研究身份
  ↓
研究方向与方法链
  ↓
教育经历、科研项目、论文进展和项目实践
  ↓
竞赛、荣誉、证书、成绩单、PDF 材料
  ↓
联系方式和 GitHub 项目入口
```

---

## 2. 站点入口

| 页面 | 中文路径 | 英文路径 | 作用 |
| --- | --- | --- | --- |
| 首页 | `/` / `index.html` | `/en/` / `en/index.html` | 研究身份、核心入口、关键材料 |
| 个人档案 | `profile.html` | `en/profile.html` | 教育、科研、项目、竞赛、荣誉、证明图 |
| 研究方向 | `research.html` | `en/research.html` | 随机系统、Reach-Avoid 控制、形式化验证方法链 |
| 项目展示 | `projects.html` | `en/projects.html` | 项目卡片、仓库链接、技术栈和项目证明 |
| 在线简历 | `resume.html` | `en/resume.html` | PDF 简历、成绩单、材料预览和联系方式 |
| 访问统计 | `analytics.html` | `en/analytics.html` | 公开访问计数和当前浏览器本地访问记录 |
| 404 | `404.html` | `en/404.html` | GitHub Pages 错误页和语言对应跳转 |

---

## 3. 核心特性

### 双语平行页面

中文页面位于仓库根目录，英文页面位于 `en/` 目录。两套页面保持结构对称：导航、页脚、核心模块、证明图、PDF 链接、canonical、hreflang、JSON-LD 和 sitemap 都需要同步维护。

### 研究型信息架构

首页只负责建立第一印象和引导访问；档案页负责完整证明链；研究页负责解释方法链；项目页负责展示工程实践；简历页负责快速投递和材料下载。

### 零构建静态部署

项目不需要安装依赖，不需要构建命令。推送到 GitHub Pages 使用的生产分支后，根目录静态文件即为发布内容。唯一需要主动运行的维护脚本是 sitemap 生成脚本。

### 本地字体与静态资源

站点使用本地 Inter 字体文件和系统中文字体栈。`@font-face` 规则集中写在 `assets/css/site.css` 顶部，不依赖 Google Fonts，也不再单独引用 `fonts.css`。

### 深色 / 浅色主题

主题由 `assets/js/site.js` 控制，使用 `<html data-theme="">` 和 `localStorage.ysb-theme` 保存状态。没有手动设置时跟随系统偏好。

### 证明图与 Lightbox

档案页、项目页和简历页中的证明材料支持点击放大。研究生阶段证明图采用 `thumb.webp / full.webp` 双文件策略，页面加载缩略图，Lightbox 打开高清图，避免直接加载几十 MB 原图。

### 访问统计降级

首页和统计页使用 `assets/js/stats.js` 展示 Busuanzi / Vercount 的公开计数，同时使用 `localStorage` 保存当前浏览器本地访问记录。第三方统计失败不影响页面主体阅读。

### SEO 与无障碍

页面维护 canonical、hreflang、Open Graph、Twitter Card、JSON-LD、sitemap、skip link、aria-current、focus trap、图片 alt、键盘导航等基础能力。404 页面使用 `noindex`，避免被搜索引擎当作内容页收录。

---

## 4. 目录结构

```text
.
├── 404.html                         # 中文 404 页面
├── analytics.html                   # 中文访问统计页
├── index.html                       # 中文首页
├── profile.html                     # 中文个人档案页
├── projects.html                    # 中文项目展示页
├── research.html                    # 中文研究方向页
├── resume.html                      # 中文在线简历页
├── en/                              # 英文镜像页面
│   ├── 404.html
│   ├── analytics.html
│   ├── index.html
│   ├── profile.html
│   ├── projects.html
│   ├── research.html
│   └── resume.html
├── assets/
│   ├── css/
│   │   └── site.css                 # 全站共享样式、字体声明、主题和响应式规则
│   ├── fonts/
│   │   └── inter/                   # 本地 Inter 字体文件
│   ├── icons/
│   │   ├── site.ico                 # favicon
│   │   └── brand-mark.png           # 顶部导航品牌标识
│   ├── images/
│   │   ├── proofs/                  # 压缩后的证明图缩略图和大图
│   │   └── ...                      # 证书、项目图、材料图
│   ├── js/
│   │   ├── site.js                  # 主题、抽屉、Lightbox、anchor、返回顶部等交互
│   │   └── stats.js                 # 访问统计和本地浏览记录
│   ├── profile/
│   │   └── photo.jpg                # 个人头像
│   └── vendor/
│       └── font-awesome-4.7.0/      # 本地图标字体
├── docs/
│   ├── Shibo-Yan-Resume.pdf
│   ├── Shibo-Yan-Research-Paper.pdf
│   ├── Shibo-Yan-Undergraduate-Transcript.pdf
│   ├── onboarding.md                # 维护者和 AI 助手上手指南
│   └── design/
│       ├── architecture.md          # 架构与设计演进
│       ├── design.md                # 设计合同
│       ├── glossary.md              # 术语表
│       ├── issues_and_fixes.md      # 问题、修复与防退化手册
│       ├── ops.md                   # 部署与运维手册
│       ├── style_guide.md           # 样式规范
│       └── testing.md               # 测试与质量保障指南
├── manifest.webmanifest             # Web App Manifest
├── scripts/
│   └── generate-sitemap.js          # sitemap 生成脚本
└── sitemap.xml                      # 搜索引擎 sitemap
```

---

## 5. 技术栈

| 类别 | 当前实现 |
| --- | --- |
| 页面 | HTML5 semantic markup |
| 样式 | CSS3、CSS Variables、Grid、Flexbox、Media Queries |
| 交互 | Vanilla JavaScript |
| 字体 | 本地 Inter 字体文件 + 系统中文字体栈 |
| 图标 | 本地 Font Awesome 4.7 + 自定义 favicon / brand-mark |
| 统计 | Busuanzi、Vercount、localStorage |
| 托管 | GitHub Pages |
| 构建 | 无正式构建，仅 sitemap 生成 |
| 文档 | Markdown，集中在 `docs/onboarding.md` 与 `docs/design/` |

不使用：

```text
React / Vue / Angular
Tailwind / Sass
Vite / Webpack / Rollup
后端 API
数据库
登录系统
表单提交系统
```

---

## 6. 本地预览

无需安装依赖。推荐使用 Python 启动本地静态服务器：

```bash
python -m http.server 8000 --bind 127.0.0.1
```

访问：

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/en/
http://127.0.0.1:8000/profile.html
http://127.0.0.1:8000/research.html
http://127.0.0.1:8000/projects.html
http://127.0.0.1:8000/resume.html
http://127.0.0.1:8000/analytics.html
```

也可以使用 Node 的轻量服务器：

```bash
npx http-server . -p 8000
```

不要只用双击 HTML 文件作为最终验证方式。直接打开文件时，相对路径、PDF iframe、localStorage、第三方统计和浏览器安全策略可能与线上表现不同。

---

## 7. 发布前检查

每次发布前至少运行：

```bash
node --check assets/js/site.js
node --check assets/js/stats.js
node --check scripts/generate-sitemap.js
node scripts/generate-sitemap.js
git diff --check
```

检查重点：

- JS 语法无错误。
- sitemap 可重新生成。
- Git diff 没有行尾空白和 CRLF/LF 污染。
- 没有因为自动格式化产生大范围无意义 diff。
- `sitemap.xml` 没有重复 URL。
- 每个页面有正确的中英文 alternate。

如果修改了页面、样式、图片、PDF 或脚本，还应启动本地服务器进行人工检查。至少打开：

```text
/
en/
profile.html
en/profile.html
resume.html
en/resume.html
analytics.html
404.html
sitemap.xml
```

---

## 8. sitemap 维护

`sitemap.xml` 由 `scripts/generate-sitemap.js` 生成。以下情况必须重新生成：

- 新增页面。
- 删除页面。
- 重命名页面。
- 修改 `scripts/generate-sitemap.js` 中的 `pagePairs`。
- 修改页面内容后希望更新搜索引擎看到的 `lastmod`。

运行：

```bash
node scripts/generate-sitemap.js
```

检查：

- 不包含重复 `<loc>`。
- 不把 404 页面作为普通内容页推广。
- 每个中文 URL 都有对应英文 alternate。
- 每个条目包含 `zh-CN`、`en`、`x-default`。
- `<lastmod>` 反映页面自身 HTML 的修改时间。

---

## 9. 维护规范

### 9.1 双语同步

修改中文页面时，必须检查对应英文页面。尤其是：

- 导航。
- 页脚。
- 语言切换。
- 主要 section。
- 学术科研和项目模块。
- 证明图数量、顺序和路径语义。
- PDF 链接。
- JSON-LD。
- canonical / hreflang。

英文不是中文逐字翻译，但不能遗漏核心结构和证据链。

### 9.2 样式修改

所有共享样式写入 `assets/css/site.css`。禁止为了局部微调在 HTML 中写 `style=""`。

修改 CSS 时至少检查：

- 390px 手机。
- 834px 导航切换点。
- 1366px 桌面。
- 1920px 宽屏。
- 浅色主题。
- 深色主题。

### 9.3 图片和证明材料

新增图片应使用小写英文连字符命名，不使用中文、空格和特殊符号。

证明图建议使用：

```text
xxx-thumb.webp
xxx-full.webp
```

页面缩略图使用 thumb，Lightbox 使用 full。不要把几十 MB 的原始扫描件直接作为 `<img src>`。

### 9.4 PDF

当前固定 PDF 路径：

```text
docs/Shibo-Yan-Resume.pdf
docs/Shibo-Yan-Undergraduate-Transcript.pdf
docs/Shibo-Yan-Research-Paper.pdf
```

替换 PDF 时优先保持文件名不变。如果必须改名，需要全站搜索旧路径并同步修改中英文页面、按钮、iframe、文档和相关元数据。

### 9.5 图标

当前图标策略：

- `assets/icons/site.ico`：浏览器 favicon。
- `assets/icons/brand-mark.png`：顶部导航品牌标识。
- `assets/vendor/font-awesome-4.7.0/`：功能图标字体。

不要把 brand-mark 回退成旧的 Font Awesome terminal 字符。替换 favicon 或 brand-mark 后，应强制刷新或使用无痕窗口确认效果。

### 9.6 统计

统计只应作为增强功能，不是核心依赖。统计失败时页面仍应正常阅读。

维护原则：

- 非统计页不加载 `stats.js`。
- 不在 HTML 中同步写入第三方统计脚本。
- 第三方统计脚本由 `stats.js` 在 `window.load` 后懒加载。
- localStorage 只保存当前浏览器本地访问记录，不代表真实全站访客数据。

---

## 10. AI Agent 维护要求

本仓库可以由 AI 助手辅助维护，但必须遵守更严格的安全边界。

操作前必须阅读：

```text
docs/design/issues_and_fixes.md
docs/onboarding.md
docs/design/architecture.md
docs/design/design.md
docs/design/testing.md
docs/design/ops.md
```

操作前必须检查：

```bash
git status --short
git diff --stat
git diff --check
```

禁止：

- 不读文档直接修改。
- 只改中文页，不检查英文页。
- 使用正则解析嵌套 HTML。
- 执行未确认的 `git restore`、`git reset --hard`、`git clean -fd`。
- 全局重写 HTML 解决局部问题。
- 新增内联样式。
- 引入远程字体 CSS。
- 把第三方统计脚本放进首屏关键路径。
- 覆盖用户未提交或未跟踪的图片、PDF、HTML 片段。

修改后必须说明：

1. 改了哪些文件。
2. 为什么这样改。
3. 是否同步中英文。
4. 执行了哪些测试。
5. 哪些测试没有执行。
6. 是否需要用户本地视觉确认。

---

## 11. 文档体系

维护项目前建议按以下顺序阅读：

1. `docs/onboarding.md`  
   维护者和 AI 助手上手指南。

2. `docs/design/issues_and_fixes.md`  
   历史问题、事故复盘、修复策略和防退化要求。每次 Agent 操作前必须读。

3. `docs/design/architecture.md`  
   站点架构、页面职责、资源结构、DOM 契约、数据模型和 ADR。

4. `docs/design/design.md`  
   视觉原则、组件合同、响应式规则和设计不变量。

5. `docs/design/style_guide.md`  
   CSS 变量、组件样式、命名和主题规则。

6. `docs/design/testing.md`  
   自动检查、最小测试单元、响应式矩阵、发布前验收。

7. `docs/design/ops.md`  
   部署、发布、回滚、GitHub Pages 故障和资源运维。

8. `docs/design/glossary.md`  
   研究术语、站点术语和维护术语。

---

## 12. 常见维护任务

### 更新个人信息

检查：

- `index.html` / `en/index.html`
- `profile.html` / `en/profile.html`
- `resume.html` / `en/resume.html`
- JSON-LD
- PDF 简历

不要只改正文，结构化数据和 PDF 也可能需要同步。

### 更新学术科研

检查：

- 基金项目名称、编号和周期。
- 论文状态：准备中、在投、已录用、已发表。
- 作者身份：一作、二作、导师一作等。
- CCF 分类是否可靠。
- 英文页是否自然表达。
- PDF 简历是否同步。

### 新增项目

档案页只放摘要；完整项目建议放在 `projects.html` 和 `en/projects.html`。

至少写清：

- 项目名称。
- 时间。
- 角色。
- 技术栈。
- 核心场景。
- 仓库或材料链接。
- 证明图片。

### 新增证明图

流程：

1. 压缩图片。
2. 生成 `thumb.webp` 和 `full.webp`。
3. 放入 `assets/images/proofs/`。
4. 中文页增加 `proof-item`。
5. 英文页增加对应 `proof-item`。
6. 检查 lightbox。
7. 检查移动端。
8. 检查图片体积和路径。

### 修改导航

导航存在于所有 14 个 HTML 页面。修改导航时必须同步：

- 桌面导航。
- 移动抽屉。
- 当前页 `aria-current`。
- 语言切换。
- sitemap。
- 测试文档。

---

## 13. 发布后验证

发布后用无痕窗口访问：

```text
https://yan-shibo.github.io/
https://yan-shibo.github.io/en/
https://yan-shibo.github.io/profile.html
https://yan-shibo.github.io/en/profile.html
https://yan-shibo.github.io/resume.html
https://yan-shibo.github.io/en/resume.html
https://yan-shibo.github.io/analytics.html
https://yan-shibo.github.io/404.html
https://yan-shibo.github.io/sitemap.xml
```

检查：

- CSS 正常。
- Font Awesome 正常。
- brand-mark 正常。
- favicon 正常。
- PDF 能打开。
- 中英文切换正确。
- 主题切换后刷新保持。
- 移动端菜单可用。
- Lightbox 可用。
- 统计失败时页面仍可读。
- 404 跳转正确。

---

## 14. 隐私与内容边界

本项目公开展示个人履历和证明材料。维护时应注意：

- 邮箱和 GitHub 可以公开。
- 手机号、微信、二维码、证书编号、身份证号、详细住址应谨慎公开。
- 证书和成绩单上传前应检查是否需要打码。
- PDF 中的信息同样可能被下载和传播。
- 不应把未发生的论文录用、投稿结果或项目成果写成事实。

---

## 15. 许可证与使用边界

本仓库包含两类内容：

1. **站点前端结构与维护方式**  
   HTML / CSS / JS 的组织方式、静态站点结构、文档体系和维护流程可以作为个人主页项目的参考。

2. **个人履历与证明材料**  
   包括但不限于简历、照片、证书、成绩单、论文材料、个人联系方式、项目经历文案等，未经许可不得复制、搬运、冒用或用于其他个人主页。

如需正式开源许可，应单独补充 `LICENSE` 文件，并明确区分“代码许可”和“个人内容许可”。
