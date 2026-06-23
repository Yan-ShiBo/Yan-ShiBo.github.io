# 术语表

本文统一本站内容、代码和文档中的术语，避免后续维护时同一概念被写成多种说法。

## 1. 研究术语

### 随机系统 (Stochastic Systems)

状态演化受随机扰动影响的系统。本站研究语境中通常指离散时间随机动力系统。

### Reach-Avoid 控制

一种控制规格：系统需要在规定条件下到达目标区域，同时避开危险区域。本站保持英文写法 `reach-avoid` 或中文"到达-避障"含义，不随意改成其他译名。

### SAC (Soft Actor-Critic)

一种最大熵强化学习算法。在本站研究线中用于学习候选控制器。

### PAC 近似 (Probably Approximately Correct)

用概率近似正确框架描述学习或近似结果的误差与置信度。本站用于说明候选控制器到多项式控制器的近似约束。

### SBC (Stochastic Barrier-like Certificate)

随机障碍类证书，用于给出安全性或 reach-avoid 概率下界。文案中可写作 SBC，但首次出现应展开。

### SOS / SDP

SOS 是 Sum of Squares，SDP 是 Semidefinite Programming。本站中用于描述求解证书约束的优化方法。

## 2. 页面术语

### Research portfolio

本站定位。中文可写"研究型个人主页"。不要写成普通博客、营销站或产品官网。

### Evidence / Proof materials

指真实证明材料，包括证书、成绩单、项目成果照片、PDF、仓库等。中文文案中统一写"证明材料"或"证据材料"。

### Profile

个人档案页，强调时间线和材料核对，不等同于简历页。

### Resume

简历页，强调可下载、可投递、可快速浏览。

### Analytics / Stats

访问统计页。公开统计来自第三方，本地统计只代表当前浏览器。

## 3. 代码和样式术语

### `section-block`

主内容通栏分段。背景可以全宽，内部内容通过 1440px 轨道对齐。

### `page-hero`

内页首屏区，负责说明当前页面任务。

### `home-hero`

首页双栏 Hero。宽屏是左右分割，移动端侧栏变成横向滑动 rail。

### `proof-grid`

证明图片网格。变体包括 `proof-grid-wide`、`proof-grid-compact`、`proof-grid-project`。

### `drawer`

移动端右侧导航抽屉。关闭时必须 `inert`，打开时必须捕获焦点。

### `status-note`

统计状态提示组件，使用 `data-state="warn"` 或 `data-state="ok"`。

### `data-theme`

当前主题状态写在 `<html>` 上，例如 `data-theme="dark"`。不要写旧的 `.dark` 方案。

### `ysb-theme`

主题持久化的 `localStorage` 键名。

### `brand-mark`

导航栏左上角圆形品牌图标。使用 Font Awesome 4.7 的 `\f120`（terminal 终端图标），通过 `.brand-mark::before` 在 `site.css` 中定义。
