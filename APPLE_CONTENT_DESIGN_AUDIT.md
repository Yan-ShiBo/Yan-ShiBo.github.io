# Apple 内容与设计协同审查报告

## 协作方式

- 资料员：以站内 PDF 简历、个人档案、项目证明、成绩单入口和 DESIGN.md 为依据，提取研究方向、教育经历、项目经历、奖项与材料入口。
- 审查员：检查是否存在占位话术、开发者注释、AI 式说明、second-person 英文、旧版说明和路径说明。
- 裁剪员：决定哪些内容留在首屏，哪些内容下沉到研究页、项目页、简历页或个人档案页，避免 hero 变成论文摘要。
- 校对员：逐页核对中英文含义、英文自然度、按钮语义、标题换行和奖项名称。
- 负责人：按照 DESIGN.md 的 Apple 设计规范统一修改代码，并组织多轮静态检查与截图审查。

## 多轮处理记录

### 第一轮：资料抽取与定位

- 首页聚焦“学习控制器 / 证明安全”的研究定位，突出软件工程硕士、reach-avoid 控制、概率下界和核心材料入口。
- 研究页保留完整技术链路：问题规格、候选控制器、PAC 多项式近似、stochastic barrier-like certificates、SOS / SDP 和迭代方向。
- 项目页保留两个真实项目：基于人脸识别技术的多端考勤系统、前后端分离的 KTV 管理系统。
- 简历页保留教育、研究、项目、奖项、PDF 简历和成绩单入口。
- 个人档案页不删奖项，不改奖项名称，仅优化首屏速览与按钮顺序。

### 第二轮：内容裁剪与表达优化

- 删除“这里保留什么内容”“What is preserved here”“Image path note”“old page”“Next enhancement”等不适合公开展示的表达。
- 首页标题改为短句式：中文为“学习控制器。证明安全。”，英文为“Learning controllers. Certifying safety.”，避免移动端把“验证”拆开换行。
- 首页第一屏只保留研究定位、两个主入口、三项简历信号和个人信息；详细经历下沉到研究、个人档案、项目与简历页面。
- 研究页 hero 从长段技术解释调整为短标题 + 一段导语 + 两个 CTA。
- 项目页将“后续适合补充的材料”改为“材料如何对应 / How the materials connect”，避免像内部待办。
- 访问统计页改为“公开计数 + 本地记录”的清晰说明，不再出现改版痕迹。

### 第三轮：中英文校对

- 中英文主页内容对应：研究定位、简历重点、材料入口和访问统计保持一致。
- 英文避免 second-person 和生硬直译，例如使用 “reviewable probability lower bound”“iterative guarantee”“certifiable control pipeline”等更自然的表达。
- 项目页英文使用 “delivery contexts”“system design”“stack choices”“delivery roles”等更符合项目作品集语境的词。
- 简历页英文使用 “quick review, download, and verification”，替代 “kept below / first screen”等设计过程话术。

### 第四轮：设计审查

- 颜色：继续使用 DESIGN.md 指定的单一 Action Blue `#0066cc`；暗色表面链接使用深色专用蓝。
- 排版：hero 使用 SF Pro 栈、600 权重、Apple 式紧凑字距；正文保持 17px 的阅读节奏。
- 布局：首页为左侧研究定位 + 右侧资料卡，内容页为居中 page hero + 卡片模块。
- 形状：主要 CTA 与 chips 使用 pill，资料卡保持 18px radius。
- 阴影：未向卡片、按钮、文字添加阴影；遵守“UI chrome 不用阴影”的约束。
- 节奏：取消原来不可控的“每三段自动变暗”规则，只在需要强调的区块显式使用暗色 tile。
- 移动端：重点检查中文首页标题，不再出现“验 / 证”断行；按钮在窄屏下保持可点击且不拥挤。

## 逐页结果

- `index.html` / `en/index.html`：重写首页表达，突出研究方向、核心成绩、材料入口和访问统计；移动端标题已优化。
- `introduction.html` / `en/introduction.html`：优化首屏速览；研究生、本科、高中、初中、小学阶段内容保留；奖项名称和数量未删减。
- `research.html` / `en/research.html`：短 hero、清晰问题设定、方法主线和后续研究方向。
- `projects.html` / `en/projects.html`：移除内部待办语气，保留仓库、技术栈、角色、成果照片和材料映射。
- `resume.html` / `en/resume.html`：整理为在线简历、PDF、成绩单、证明材料的一页入口；补充主要奖项文字列表。
- `resume_online.html` / `en/resume_online.html`：保留快速阅读版简历结构，适合移动端和快速分享。
- `stats.html` / `en/stats.html`：公开计数与本地记录说明清晰；无旧版痕迹。
- `404.html` / `en/404.html`、`home.html` / `en/home.html`：随全局样式统一为 Apple 风格 fallback。

## 静态检查结果

- HTML 本地资源引用缺失：0。
- `node --check resource/js/site.js`：通过。
- `node --check resource/js/stats.js`：通过。
- `resource/css/site.css` PostCSS 解析：通过。
- 占位 / AI 式 / 内部说明文本扫描：未发现。
- 个人档案关键奖项核对：通过。
  - 2024 年 “华为杯”第二十一届中国研究生数学建模竞赛二等奖保留。
  - 2025 年 “华为杯”第二十二届中国研究生数学建模竞赛三等奖保留。
  - 2024-2025 学年学术科技创新先进个人保留。
  - 本科奖学金、三好学生、精神文明奖、小美赛 Honourable Mention、全国大学生数学竞赛二等奖、优秀共青团员等条目保留。

## 说明

平台不允许向用户重新分发字体文件，因此最终压缩包排除了 `resource/font-awesome-4.7.0/fonts/` 下的字体二进制文件。部署时保留原仓库中的该目录即可。
