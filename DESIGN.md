---
version: beta
name: research-portfolio-2026
description: A bilingual research portfolio system for ShiBo Yan. The visual language combines a quiet academic archive, evidence-rich project materials, and Apple-inspired restraint without copying product-marketing patterns. The live site uses research blue for actions, teal for research structure, warm amber for quote/evidence accents, neutral paper surfaces, 8px cards, pill actions, zero letter spacing, and stable responsive breakpoints.

colors:
  primary: "#0066cc"
  primary-focus: "#0071e3"
  primary-on-dark: "#2997ff"
  accent: "#0f766e"
  accent-soft: "#e6f4f1"
  warm: "#9a6a13"
  warm-soft: "#fff6e3"
  ink: "#1d1d1f"
  body: "#1d1d1f"
  body-on-dark: "#ffffff"
  body-muted: "#cccccc"
  ink-muted-80: "#424245"
  ink-muted-48: "#6e6e73"
  divider-soft: "#e8e8ed"
  hairline: "#d2d2d7"
  canvas: "#ffffff"
  canvas-parchment: "#ececee"
  surface-pearl: "#f5f5f7"
  surface-tile-1: "#272729"
  surface-tile-2: "#2a2a2c"
  surface-tile-3: "#252527"
  surface-black: "#000000"
  icon-surface: "rgba(15, 118, 110, .10)"
  icon-border: "rgba(15, 118, 110, .22)"
  on-primary: "#ffffff"
  on-dark: "#ffffff"

typography:
  hero-display:
    fontFamily: "SF Pro Display, Inter, system-ui, PingFang SC, Microsoft YaHei UI, sans-serif"
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.07
    letterSpacing: 0
  display-lg:
    fontFamily: "SF Pro Display, Inter, system-ui, PingFang SC, Microsoft YaHei UI, sans-serif"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
  display-md:
    fontFamily: "SF Pro Display, Inter, system-ui, PingFang SC, Microsoft YaHei UI, sans-serif"
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: 0
  lead:
    fontFamily: "SF Pro Display, Inter, system-ui, PingFang SC, Microsoft YaHei UI, sans-serif"
    fontSize: 21px
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: 0
  body:
    fontFamily: "SF Pro Text, Inter, system-ui, PingFang SC, Microsoft YaHei UI, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: 0
  caption:
    fontFamily: "SF Pro Text, Inter, system-ui, PingFang SC, Microsoft YaHei UI, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  nav-link:
    fontFamily: "SF Pro Text, Inter, system-ui, PingFang SC, Microsoft YaHei UI, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: 0

rounded:
  none: 0px
  xs: 5px
  sm: 8px
  md: 8px
  lg: 8px
  pill: 9999px

spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

components:
  global-nav:
    height: 44px
    backgroundColor: "rgba(0, 0, 0, .92)"
    activeIndicator: "2px bottom rule in primary-on-dark"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    minHeight: 44px
    padding: 11px 22px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.pill}"
  content-card:
    backgroundColor: "{colors.canvas}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 24px
    hover: "translateY(-2px), primary border, soft shadow"
  evidence-image:
    backgroundColor: "{colors.canvas-parchment}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    shadow: "product-shadow only on real image media"
  quote-card:
    backgroundColor: "{colors.warm-soft}"
    border: "1px solid rgba(154, 106, 19, .22)"
    rounded: "{rounded.lg}"
  anchor-bar:
    height: 52px
    backgroundColor: "rgba(236, 236, 238, .82)"
    behavior: "sticky under global nav"
  nav-icon:
    source: "Font Awesome 4.7"
    size: 12px
    opacity: .78
    mapping: "home/profile/research/projects/resume/analytics by href"
  metric-icon:
    source: "Font Awesome 4.7"
    size: 15px
    frame: "36px square, 8px radius, icon-surface fill"
  field-icon:
    source: "Font Awesome 4.7"
    size: 12px
    frame: "24px square, 8px radius, icon-surface fill"
---

# Design System

## Direction

This site is a research portfolio, not a marketing landing page. The first screen should immediately communicate name, research domain, evidence, and next action. The visual tone is calm, academic, and proof-oriented: enough polish to feel intentional, enough density to let admissions reviewers or collaborators scan quickly.

The live direction is "research archive with product-quality restraint":

- Use real evidence images, transcript previews, certificates, and project proof as the visual assets.
- Keep chrome quiet: thin hairlines, measured whitespace, no decorative blobs or atmospheric filler.
- Use surface alternation to create rhythm: white, paper, dark research bands, and a restrained quote/evidence accent.
- Keep all text letter spacing at `0`; do not use viewport-based type scaling.
- Use 8px card corners, pill action buttons, and stable grid tracks.

## Color Use

- `primary` is the action color for buttons, links, focus, and key navigation states.
- `accent` is the research-structure color for eyebrows, feature icons, selected drawer items, and technical tags.
- `warm` is reserved for quote/evidence moments. It should not dominate the page.
- `canvas`, `canvas-parchment`, and `surface-pearl` carry most of the site. The palette should read neutral first, then blue/teal as signals.
- Dark bands use near-black surfaces and teal/blue highlights. Avoid turning dark sections into a blue/slate theme.
- Visited in-content links keep a distinct purple tone so browsing state is visible.

## Typography

- Body copy is 17px with line-height 1.47.
- Hero titles are 56px desktop, 34px tablet/mobile, 28px on very narrow screens.
- Section titles are 40px desktop and 34px or 30px on smaller screens.
- Headings use weight 600; body uses 400; captions use 14px.
- Letter spacing is always `0`, including Chinese text, English headings, buttons, nav labels, and quote text.
- Use the shared `--font-sans` and `--font-display` stacks. Do not introduce page-specific font families.

## Layout

- `--max-width` is 1440px for broad evidence grids and project layouts.
- `--text-width` is 980px for concentrated reading surfaces.
- Home hero is intentionally shorter than a full viewport so the next research band peeks into the first screen.
- Section padding defaults to 80px, then 64px and 48px at smaller breakpoints.
- Grids should collapse predictably: 3/4 columns on desktop, 2 columns on tablet, 1 column on narrow phones.
- Buttons, chips, toolbars, counters, and image previews must have stable dimensions so hover/loading states do not shift layout.

## Components

### Navigation

The global header is a 44px black/frosted bar. Current page state is shown with a subtle bottom rule, not a font-weight jump. Desktop and drawer navigation use the same Font Awesome page-type icons, mapped by destination: home, profile, research, projects, resume, and analytics. Mobile drawer links are inert while closed and receive focus trapping while open.

### Buttons

Primary buttons are filled blue pills. Secondary buttons are white or pearl pills with a hairline border. All buttons keep a minimum 44px hit target. Hover may lift by 1px and add a soft action shadow; active state scales to `.95`.

### Cards

Cards are for repeated items, panels, proof tiles, and framed tools. They use a 1px hairline border, 8px radius, 24px padding, and a restrained hover lift. Do not nest cards inside cards.

### Iconography

Icons come from the existing `assets/vendor/font-awesome-4.7.0` bundle. Do not add a second icon library unless the whole system is migrated.

- Icons are semantic, not decorative filler: navigation identifies destinations, metrics identify achievement/data, project fields identify role/process/repository, and evidence media identifies visual proof.
- Navigation icons are 12px, monochrome, and inherit the nav state.
- Framed field icons use a 24px square frame with `icon-surface`, `icon-border`, and `accent`.
- Metric icons use a 36px square frame placed in the card corner so they do not change the reading order.
- Technology tags use the code icon; research keyword chips use the lab icon.
- Icon-only controls must keep visible `aria-label`s. Pseudo-element icons are decorative and must not be the only accessible label.
- Do not mix emoji, bitmap icons, or unrelated icon styles with Font Awesome.

### Evidence Media

Evidence images and PDF previews must include width, height, `loading`, and meaningful alt text. Use real document/project images instead of abstract illustrations. The only strong shadow is on real media, not text or decorative chrome.

### Quote Surfaces

The Liang Qichao quote uses `quote-card` in the hero sidebar and `quote-band` near the page close. Keep the typography centered, letter spacing 0, and color warm but quiet.

### Anchor Bar

Long pages use a sticky anchor bar under the global nav. It scrolls horizontally on mobile and keeps chips at stable heights.

## Accessibility

- Preserve skip links and semantic landmarks.
- Keep drawer contents inert while the drawer is closed.
- Hide floating back-to-top controls from focus and screen readers while unavailable or while the mobile drawer is open.
- Maintain `aria-current` on nav and anchor chips.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone for active page state.
- Keep focus rings visible with `--primary-focus`.

## Maintenance Rules

- Shared styling belongs in `assets/css/site.css`; avoid inline styles in HTML.
- Reuse existing classes before creating a new component.
- Update `sitemap.xml` after content or page URL changes.
- Remove unused binary assets when they are no longer referenced.
- Keep bilingual pages structurally parallel unless content intentionally differs.
- Before publishing, validate local links/assets, image metadata, responsive overflow, and keyboard focus behavior.
