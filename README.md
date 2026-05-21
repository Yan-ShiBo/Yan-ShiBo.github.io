# Yan-ShiBo.github.io

这是闫士博个人主页的重构版本，面向 GitHub Pages 部署。站点以中英文双语页面展示教育经历、研究方向、项目、简历材料、证明图片和访问统计。

## 站点结构

- `index.html`：主页，突出研究身份、方法链和核心材料入口。
- `introduction.html`：个人档案，按研究生、本科、高中、初中、小学阶段整理经历与证明材料。
- `research.html`：研究方向，说明随机控制系统、reach-avoid 控制与安全验证主线。
- `projects.html`：项目展示，保留仓库、技术栈、角色和成果证明。
- `resume.html`：简历与 PDF 材料入口。
- `resume_online.html`：网页简历摘要页。
- `stats.html`：公开访问统计与本地访问记录。
- `en/`：英文独立页面，与中文页面一一对应。
- `docs/`：论文、简历、本科成绩单 PDF。
- `img/`：证明材料、项目获奖照片、论文和成绩单预览图。
- `Homepage_files/`：头像、favicon、简历预览等遗留静态资源。
- `resource/css/site.css`：全站共享样式。
- `resource/js/site.js`：主题、导航、移动抽屉、返回顶部、图片灯箱和可访问性逻辑。
- `resource/js/stats.js`：公开统计与本地统计逻辑。
- `scripts/generate-sitemap.js`：根据页面与共享资源修改时间生成 `sitemap.xml`。

## 维护说明

- 设计系统集中在 `DESIGN.md` 和 `resource/css/site.css`，页面内应尽量避免新增一次性内联样式。
- 移动抽屉和图片灯箱已加入焦点陷阱、关闭后焦点恢复，并在打开时对背景内容设置 `inert`。
- `sitemap.xml` 不手动维护，发布前运行生成脚本。
- 仓库只保留 `README.md` 和 `DESIGN.md` 两个 Markdown 文档；改版审查与实现记录已归并到这两个文件。
- 未引用的 Bootstrap、jQuery、ACE 资源已移除，简历 PDF 保留 `docs/Shibo-Yan-Resume.pdf` 作为唯一版本。

## 常用命令

```bash
node scripts/generate-sitemap.js
node --check resource/js/site.js
node --check resource/js/stats.js
```

## 主页地址

https://yan-shibo.github.io/
