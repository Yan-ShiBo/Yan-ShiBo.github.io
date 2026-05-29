# ShiBo Yan's Portfolio / 闫士博个人主页

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-GitHub_Pages-lightgrey.svg)

[**🌐 中文主页**](https://yan-shibo.github.io/) | [**🌐 English Version**](https://yan-shibo.github.io/en/)

这是闫士博（ShiBo Yan）的个人学术与履历主页。网站采用纯原生前端技术栈（HTML5 + CSS3 + Vanilla JS）构建，无需复杂的构建工具，具有极速加载、极致轻量、SEO 友好和完全响应式的特点。主要用于展示教育经历、研究方向、项目经验以及支持材料。

---

## ✨ 核心特性 (Features)

*   **🌍 双语支持 (Bilingual)**：提供完整的中英文独立页面，无缝切换，适配全球访问者。
*   **🎨 现代设计 (Modern Design)**：
    *   **深色/浅色模式 (Dark/Light Mode)**：完美支持系统级深色模式跟随，提供手动切换能力并支持持久化保存。
    *   **毛玻璃特效 (Glassmorphism)**：使用高级的前端 CSS 过滤器，提供类似 iOS 的模糊背景与细腻的卡片阴影。
    *   **高级排版 (Premium Typography)**：集成 `Inter` 与 `Outfit` 字体家族，结合系统原生的中文字体栈，实现完美的文本呈现。
*   **🚀 极致性能 (High Performance)**：
    *   零大型框架依赖，极简的 DOM 结构与高度压缩优化的 CSS。
    *   `requestAnimationFrame` 驱动的极低开销动画。
*   **🔍 SEO & 无障碍访问 (SEO & A11y)**：
    *   实现全面的无障碍访问标准，支持键盘导航、焦点陷阱 (Focus Trap) 与 `aria` 标签。
    *   支持完善的 Open Graph (OG)、Twitter Cards 元数据与 `LD+JSON` 结构化数据，保障社交媒体分享渲染。
    *   动态化 Sitemap 生成脚本，提供给搜索引擎最佳的爬取路径。

---

## 📂 站点结构 (Project Structure)

```text
.
├── 404.html                # 中文 404 错误页
├── analytics.html          # 中文统计与本地浏览记录
├── index.html              # 中文主页：核心研究身份与入口
├── profile.html            # 中文个人档案：各阶段详细履历
├── projects.html           # 中文项目展示：仓库、技术栈与证明
├── research.html           # 中文研究方向：随机控制系统与可验证控制
├── resume.html             # 中文简历入口：PDF 预览与成绩单
├── en/                     # 英文版页面 (与根目录中文页面一一对应)
│   ├── index.html          
│   ├── profile.html        
│   └── ...                 
├── docs/                   # PDF 文件目录 (简历、本科成绩单、论文等)
├── scripts/                # 构建脚本目录
│   └── generate-sitemap.js # Sitemap 自动生成脚本
└── assets/                 # 全局静态资源目录
    ├── css/                
    │   └── site.css        # 全站共享压缩样式
    ├── js/                 
    │   ├── site.js         # 主题、导航、图片灯箱与 A11y 核心逻辑
    │   └── stats.js        # 访问统计逻辑
    ├── images/             # 证明材料、奖项照片
    ├── profile/            # 个人头像资源
    ├── icons/              # 站点图标与 Manifest
    └── vendor/             # 第三方依赖 (Font Awesome)
```

---

## 🛠️ 技术栈 (Tech Stack)

*   **核心 (Core)**: HTML5 (Semantic), Vanilla JavaScript (ES6+), CSS3 (Variables, Flexbox, Grid)
*   **字体 (Fonts)**: Google Fonts (`Inter`, `Outfit`), Font Awesome (Icons)
*   **统计服务 (Analytics)**: [Busuanzi (不蒜子)](http://busuanzi.ibruce.info/) 用于页面 PV/UV 统计，结合 `localStorage` 实现本地浏览追踪。
*   **托管 (Hosting)**: GitHub Pages (自动化部署)

---

## 💻 本地开发与维护 (Development & Maintenance)

本站点无需 `npm install` 即可运行。

**1. 本地预览**
你可以使用任何轻量级的 HTTP Server 启动项目：
```bash
# 使用 Python 3
python -m http.server 8000

# 使用 Node.js (需全局安装 http-server)
npx http-server . -p 8000
```
然后在浏览器中访问 `http://localhost:8000` 即可预览。

**2. 样式规范**
*   新增 HTML 页面时，请务必复用 `site.css` 中定义的 CSS 变量（如 `--bg`, `--surface`, `--primary` 等）。
*   尽量避免使用一次性的内联样式（Inline CSS），确保站点的暗色模式渲染不会遭到破坏。

**3. 更新 Sitemap**
当您新增页面或修改了页面内容时，在提交前请运行 Sitemap 生成脚本，这有助于搜索引擎及时收录：
```bash
node scripts/generate-sitemap.js
```

**4. 资源命名规范**
新增的图片和文档必须统一使用全小写的 `kebab-case`（如 `persevere-study-award.jpg`），请勿使用中文或空格命名，以确保跨平台 URL 的安全解析。

---

## 📜 许可证 (License)

本项目内容属于个人履历展示，未经许可，请勿随意搬运、拷贝和直接挪用本人的简历、照片与证明材料。
站点的前端框架设计与源码结构允许参考与学习。
