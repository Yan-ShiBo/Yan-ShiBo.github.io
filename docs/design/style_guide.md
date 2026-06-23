# 视觉与 CSS 样式指南

本文说明如何在当前代码中写样式。设计方向见 `docs/design/design.md`，架构见 `docs/design/architecture.md`。

## 1. 文件所有权

- 全站共享样式只写在 `assets/css/site.css`。
- HTML 中不新增 `style="..."`。
- 不为单个临时文案创建过宽的全局选择器。
- 不新增第二套图标库，继续使用 `assets/vendor/font-awesome-4.7.0`。
- `brand-mark` 图标由 `.brand-mark::before{content:"\f120"}` 注入，表示 terminal；不要在 HTML 中替换成内联图标。

## 2. 选择器规则

优先级从高到低：

1. 复用现有组件类：`.section-block`、`.grid-2`、`.grid-3`、`.panel`、`.doc-card`、`.proof-item`、`.button`、`.tag`。
2. 如果现有组件缺少状态，用组件语义扩展，例如 `.status-note[data-state="ok"]`。
3. 页面级差异尽量挂在已有页面结构上，例如 `.hero-side .compact-stat`。
4. 避免用 `!important`，除非是在已有移动端轨道中覆盖旧 padding 这类已知冲突。

## 3. 颜色

使用 CSS 变量，不直接散落新颜色：

- 行动色：`var(--primary)`、`var(--primary-focus)`、`var(--primary-on-dark)`。
- 结构色：`var(--accent)`、`var(--accent-soft)`。
- 中性表面：`var(--canvas)`、`var(--canvas-parchment)`、`var(--surface-pearl)`。
- 深色区：`var(--surface-tile-1)`、`var(--surface-tile-2)`、`var(--surface-tile-3)`。
- 分割线：`var(--hairline)`。

深色主题只通过 `:root[data-theme="dark"]` 覆盖。不要恢复 `.dark` 选择器。

## 4. 排版

- 正文继承 `body`，不要在页面局部重复声明字体栈。
- 标题使用 `var(--font-display)`。
- 所有文字 `letter-spacing:0`。
- 不使用 `vw` 做字体缩放。
- 卡片内标题不要使用 Hero 级字号。

## 5. 布局

### 通栏 section

`section-block` 是主要内容分段。它通过左右动态 padding 对齐 1440px 轨道：

```css
padding:var(--section-space) max(24px, calc((100vw - var(--max-width)) / 2));
```

不要把通栏 section 包进一个无背景的居中容器，否则会截断背景。

### 网格

- `.grid-2`、`.grid-3`、`.grid-4` 是基础网格。
- 档案和项目证明使用 `.proof-grid` 及其变体。
- 卡片数量变动后要检查桌面、平板、手机三种视口。

### Hero

宽屏 Hero 不是普通 `section-block`，但左右边缘必须和 `section-block` 对齐。不要恢复固定 `max-width` 加 `auto margin` 的旧写法。

## 6. 组件

### Button

- `.button.primary` 用于主要动作。
- `.button` 或 `.button.subtle` 用于次要动作。
- 最小高度 44px。
- 图标使用 `<i class="fa ...">` 并加 `aria-hidden="true"`。

### Card

以下组件都遵循 8px 圆角、1px hairline、轻微 hover：

- `.panel`
- `.doc-card`
- `.info-card`
- `.project-card`
- `.stat-card`
- `.proof-item`

不要卡片套卡片。如果需要分组，用 section、grid 或列表结构。

### Proof item

证明图要求：

- `<a class="proof-item" data-lightbox href="...">`
- 内部图片写 `alt`、`width`、`height`、`loading="lazy"`、`decoding="async"`。
- 说明文字放在 `.proof-caption`。

### Drawer

抽屉关闭时必须：

```html
<aside class="drawer" aria-hidden="true" inert>
```

打开/关闭逻辑由 `assets/js/site.js` 管理，不要在页面内写单独脚本。

### Status note

`status-note` 依赖 `data-state`：

- `warn`：加载或不可用。
- `ok`：成功或部分成功。

浅色和深色主题都必须有足够对比度。

## 7. 断点维护

媒体查询按从大到小维护：

- `max-width:1068px`
- `max-width:833px`
- `max-width:640px`
- `max-width:419px`
- `min-width:1069px`
- `min-width:1069px and max-width:1320px`

新增规则前先搜索是否已有同一组件的断点规则，避免在文件尾部重复覆盖。

## 8. 图片和媒体

- 优先压缩到 500KB 以下。
- 文件名使用小写连字符。
- 真实证据图优先，不使用抽象插图占位。
- PDF 预览 iframe 要保留下载 fallback。

## 9. 修改检查

样式改动后至少检查：

- 主页 Hero 桌面对齐。
- 手机宽度下 Hero 横向卡片中心吸附。
- 移动抽屉打开、关闭、Tab 和 Escape。
- 深色主题下统计状态、卡片文字和 quote band。
- 证明图片 lightbox。
