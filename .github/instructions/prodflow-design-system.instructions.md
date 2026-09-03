---
description: "ProdFlow design system — tokens, components, charts and UX conventions to keep every new feature visually consistent (Oceaneering identity: navy/blue + neutrals, minimal, glassmorphism). Pairs with the ui-ux-pro-max skill (design inspiration) but ProdFlow tokens are always the source of truth."
applyTo: "src/webparts/prodFlow/app/**/*.tsx,src/webparts/prodFlow/app/**/*.scss"
---

# ProdFlow — Design System Guide

Follow these rules whenever you build or restyle UI in the ProdFlow app. They keep new features
on-brand and prevent visual drift. This file is the **source of truth for the look & feel**; the
`ui-ux-pro-max` skill is only for _inspiration_ (layout ideas, chart-type selection, UX heuristics) —
never let it override the tokens, stack, or conventions below.

**Identity:** Oceaneering — **navy/blue + neutrals**, minimalist, **little color** (color reserved for
status semantics), with **glassmorphism & liquid glass** surfaces. Professional, clean, WCAG AA.

## Golden Rules

1. **Never hardcode a color.** Use the CSS custom properties (`var(--...)`) defined in
   `styles/themes/light.module.scss` / `dark.module.scss`. For charts, use the `useChartTheme()` hook.
2. **Status / phase / team / priority colors are config-driven.** Read them from `useStatusColors()`
   / `useConfigStore` (the SharePoint config can change them at runtime). Never inline hex for a status/phase.
3. **Every component/page is a pair**: `Name.tsx` + `Name.module.scss`. SPFx 1.23 uses css-loader —
   import styles directly and reference classes via the `styles` object; the typing is ambient (Heft
   rig), so there is **no hand-written `.module.scss.ts` shim**. Class names are hashed at build.
4. **This is SPFx 1.23 + React 17 + TypeScript 5.8 + SCSS Modules + Fluent UI React v9 (Fluent 2).**
   There is **no Tailwind and no shadcn** here. When the ui-ux-pro-max skill suggests Tailwind/shadcn
   utilities, translate the intent into SCSS + CSS variables + Fluent v9 primitives instead.
   Wrap the app tree in a single `FluentProvider` with the ProdFlow theme.
5. **Scope styles** under the component root class so SharePoint's global CSS can't leak in.
6. **Light mode is the default** and must always be tested; dark mode must stay legible. The
   sidebar/header keep a dark (navy) background in both themes — use the `--sidebar-*` / `--header-*`
   tokens, not the global text tokens.

## Design Tokens (CSS custom properties)

Applied via `.prodflowLight` / `.prodflowDark` on the root. Use the variable, not the hex.

> **Official brand palette** (see `brand-reference/prodflow-brand-board.jpg`):
> Ocean Navy `#00263E` (primary chrome) · Deep Blue `#003B5C` (secondary navy) ·
> Engineering Blue `#0072CE` · Technology Cyan `#00B4E6` · Orange `#FF8A00` ·
> Neutral Gray `#A7B3C2` · White `#FFFFFF`.
> Semantic status colors are deliberately **not** brand colors — they stay independent.

### Surfaces & Chrome

| Token                | Light (default)         | Dark                    | Use                               |
| -------------------- | ----------------------- | ----------------------- | --------------------------------- |
| `--main-bg`          | `#f4f8fb`               | `#001a29`               | Page background                   |
| `--card-bg`          | `#ffffff`               | `#00263e`               | Card / panel background           |
| `--card-bg-elevated` | `#edf4f9`               | `#003b5c`               | Raised surfaces, inputs-in-cards  |
| `--sidebar-bg`       | `#00263e`               | `#00263e`               | Sidebar (Ocean Navy, both themes) |
| `--header-bg`        | `#00263e`               | `#00263e`               | Top header (Ocean Navy)           |
| `--footer-bg`        | `#00263e`               | `#00263e`               | Bottom status bar (Ocean Navy)    |
| `--input-bg`         | `#edf4f9`               | `#003b5c`               | Form inputs                       |
| `--hover-bg`         | `rgba(0,59,92,.04)`     | `rgba(255,255,255,.05)` | Row/item hover                    |
| `--glass-bg`         | `rgba(255,255,255,.75)` | `rgba(0,38,62,.7)`      | Glassmorphism fill (blur ~18px)   |
| `--glass-border`     | `rgba(0,59,92,.08)`     | `rgba(255,255,255,.08)` | Glass border                      |

> Deep Blue `#003B5C` is the **secondary** navy: the top stop of `--gradient-header` and the raised
> surfaces in dark mode. The chrome itself is always Ocean Navy `#00263E`.

> The header is navy in both themes, so anything painted on `--header-bg` / `--gradient-header` must
> use the chrome text tokens `--header-text`, `--header-text-secondary`, `--header-text-muted` (plus
> `--header-border`, `--header-input-bg`, `--header-hover`) — never the global `--text-*` tokens.

### Brand & Accents

| Token                | Light     | Dark      | Meaning                                      |
| -------------------- | --------- | --------- | -------------------------------------------- |
| `--primary-accent`   | `#0072ce` | `#2b9fe2` | Engineering Blue — primary actions/focus/nav |
| `--secondary-accent` | `#00b4e6` | `#00b4e6` | Technology Cyan — secondary emphasis         |
| `--tertiary-accent`  | `#ff8a00` | `#ff8a00` | Brand Orange — sparing "flow" highlight      |

> `--sidebar-active` is Technology Cyan `#00b4e6` in both themes. Cyan and orange fail AA as text
> backgrounds — keep them for bars, borders, focus rings and chart series, never behind white text.
> `--gradient-primary` is blue-only for that reason (white button labels sit on it).

> The active sidebar item is a **square 3px left bar** (`border-left`, no radius) plus label and icon
> in `--sidebar-active`. Nav rows are full-bleed — horizontal padding lives on the row, not on `.nav`,
> so the bar reaches the sidebar edge.

### Semantic (status — same in both themes)

| Token       | Hex       | Meaning                      |
| ----------- | --------- | ---------------------------- |
| `--success` | `#10b981` | Completion / OK              |
| `--warning` | `#f59e0b` | Caution / pending            |
| `--danger`  | `#ef4444` | Risk / overdue / destructive |
| `--info`    | `#0ea5e9` | Neutral metrics / info       |

### Text & Borders

| Token              | Light     | Dark      |
| ------------------ | --------- | --------- |
| `--text-primary`   | `#00263e` | `#eaf2f8` |
| `--text-secondary` | `#4a5c6b` | `#a7b3c2` |
| `--text-muted`     | `#8b9aa8` | `#74879a` |
| `--border`         | `#d5e3ee` | `#00517d` |
| `--border-subtle`  | `#edf4f9` | `#003b5c` |

### Gradients, Shadows & Overlays

- `--gradient-primary`, `--gradient-accent`, `--gradient-header` — hero headers / CTAs.
- `--shadow-card`, `--shadow-card-hover`, `--shadow-glow` — never invent new shadows.
- `--overlay-bg` — modal/scrim (40–60% opacity). `--scrollbar-thumb` / `--scrollbar-track` for scrollbars.

> When you add a new token, add it to **both** `light.module.scss` and `dark.module.scss`.

## Brand Assets

Bundled, importable via ESM (`import symbol from "../../../assets/brand/prodflow-symbol.svg"`):

| Asset                                    | Use                                                              |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `assets/brand/prodflow-lockup.png`       | **Full colour lockup**, transparent — sidebar brand, footer      |
| `assets/brand/prodflow-symbol.svg`       | **Default mark** — collapsed sidebar, dialog headers, watermarks |
| `assets/brand/prodflow-symbol.png`       | 1024px raster; only when a vector cannot be used                 |
| `assets/brand/prodflow-lockup-white.png` | Mono lockup for dark/photo backgrounds                           |
| `assets/brand/prodflow-lockup-black.png` | Mono lockup for print, PDF/Excel export headers and QR labels    |
| `assets/brand/prodflow-icon-64.png`      | Source of the manifest `iconImageUrl` data URI                   |
| `assets/OII-*`                           | Oceaneering corporate logo — sidebar credits only                |

- The symbol is full-color and reads on both light surfaces and the navy chrome — do not recolor it.
- `prodflow-lockup.png` is chroma-keyed from the flat-background export by
  `scripts/build-lockup-png.ps1`. Its white wordmark disappears on light surfaces — use it **only on
  the navy chrome**; elsewhere use the symbol or a mono lockup.
- Raster icons (`teams/*_color.png`, `_outline.png`, `prodflow-icon-64.png`) are generated by
  `scripts/generate-brand-icons.ps1`; regenerate rather than editing them by hand.
- `brand-reference/` holds the brand board and flat-background JPGs. It is **outside the bundle** —
  never import from it.

## Spacing, Radius & Motion

- **Border radius**: `16px` cards · `12px` panels · `8px` buttons/inputs · `6px` bars/badges.
- **Gaps**: `24px` (section / chart↔content) · `16px` (major) · `12px` (moderate) · `8px` (minor).
- **Grid**: responsive card grids use `repeat(auto-fit, minmax(200px, 1fr))` with a `16px` gap.
- **Transitions**: `250ms ease` for hover transforms; `300–600ms` for interactive fills/progress.
- **Hover**: cards lift `translateY(-2px)` + upgrade to `--shadow-card-hover` + brighten border.
- Prefer shared keyframes in `styles/animations.module.scss` over ad-hoc `@keyframes`.
- Respect `prefers-reduced-motion` for non-essential motion.

## Core Components — reuse before building

| Need              | Component                                                 | Notes                                                                                              |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Container / panel | `common/GlassCard`                                        | Props: `title`, `subtitle`, `actions`, `accentColor`, `interactive`, `noBodyPadding`. Blur ~18px.  |
| Metric tile       | `common/KPICard`                                          | Props: `label`, `value`, `accentColor`, `trend`, `subtitle`, `progress`; glass + `sparkline` slot. |
| Empty state       | `common/EmptyState`                                       | Supports a glass variant.                                                                          |
| Loading           | `common/SkeletonLoader`                                   | Use skeletons, not spinners, for content areas.                                                    |
| Tables            | `common/DataTable`                                        | Generic `<T extends object>`; virtualize when large.                                               |
| Filters           | `common/FilterPanel`                                      | Reuse; don't rebuild filter bars.                                                                  |
| Badges            | `StatusBadge`, `PhaseBadge`, `TeamBadge`, `PriorityBadge` | All config-color aware — do not restyle with inline hex.                                           |
| Toasts            | `useUIStore.addToast` + `ToastContainer`                  | Don't build one-off notifications.                                                                 |

## Charts (Nivo)

- **Library is Nivo** (`@nivo/bar`, `@nivo/line`, `@nivo/pie`, `@nivo/heatmap`, `@nivo/funnel`…).
  **Import per package** to keep the bundle lean. Nivo is D3/SVG — highly themeable.
- **Theme the chart chrome with `useChartTheme()`** — it returns a Nivo `theme` object (grid, axis,
  ticks, text, tooltip) derived from the design tokens, plus accents, semantic colors, and a
  categorical palette. Never hardcode axis/grid colors.
- **Series colors:**
  - Status / phase / team series → `useStatusColors()` (config-driven).
  - Generic non-semantic series → the categorical palette from `useChartTheme()`.
- Wrap every chart in a `GlassCard`, use a responsive wrapper (`ResponsiveBar`/`ResponsiveLine`…),
  show empty/loading states, and label axes.
- **Chart-type selection** (lean on `ui-ux-pro-max` charts data for ideas, then implement in Nivo):
  - Trend over time → line/area (SLA, deadlines).
  - Part-to-whole → pie **donut with a center total** (make/buy mix, cost×revenue).
  - Category comparison → bar (horizontal for long labels).
  - Density → heatmap (capacity × week).
  - Pipeline → funnel. KPI micro-trend → sparkline inside a glass `KPICard`.

## Working with the `ui-ux-pro-max` skill

That skill (in `.github/prompts/ui-ux-pro-max/`) ships a large design database (styles, palettes, font
pairings, UX guidelines, chart types). Python is optional — read the CSVs directly for reference, e.g.
`.github/prompts/ui-ux-pro-max/data/charts.csv`, `.../ux-guidelines.csv`, `.../typography.csv`. On
Windows use `python`, not `python3`; **never install Python or packages on the user's machine**.

When you use it:

- Take **layout patterns, UX heuristics, chart-type ideas, and motion cues** from it.
- **Discard** its Tailwind/shadcn/token output — re-express everything with ProdFlow's CSS variables,
  SCSS modules, Fluent UI v9, and the components above.
- ProdFlow's Oceaneering tokens (navy/blue + semantic) win over any palette it proposes.

## Pre-merge checklist

- [ ] No hardcoded hex — tokens (`var(--...)`) or `useChartTheme()` / `useStatusColors()` only.
- [ ] Looks correct in **both** light (default) and dark mode.
- [ ] SCSS classes referenced via the imported `styles` object (css-loader; no hand-written shim).
- [ ] Reused existing components (GlassCard/KPICard/DataTable/badges) instead of re-building.
- [ ] Responsive down to ~900px; empty + loading states handled; touch targets ≥ 44px.
- [ ] `npm run build` (Heft) passes clean — it catches SPFx/TS errors the editor hides.
