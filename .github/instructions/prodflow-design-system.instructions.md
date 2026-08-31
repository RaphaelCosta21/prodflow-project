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

> **Oceaneering blue is a PLACEHOLDER** pending the official brand hex (plan open item #6). When the
> brand guideline value is confirmed, update `--primary-accent` in both theme files only — nothing else.

### Surfaces & Chrome

| Token                | Light (default)         | Dark                    | Use                              |
| -------------------- | ----------------------- | ----------------------- | -------------------------------- |
| `--main-bg`          | `#f5f8fc`               | `#0a1929`               | Page background                  |
| `--card-bg`          | `#ffffff`               | `#0f2338`               | Card / panel background          |
| `--card-bg-elevated` | `#eef4fb`               | `#16324c`               | Raised surfaces, inputs-in-cards |
| `--sidebar-bg`       | `#0a1929`               | `#081422`               | Sidebar (navy in both themes)    |
| `--header-bg`        | `#ffffff`               | `#0f2338`               | Top header                       |
| `--input-bg`         | `#eef4fb`               | `#16324c`               | Form inputs                      |
| `--hover-bg`         | `rgba(10,41,89,.04)`    | `rgba(255,255,255,.04)` | Row/item hover                   |
| `--glass-bg`         | `rgba(255,255,255,.75)` | `rgba(15,35,56,.7)`     | Glassmorphism fill (blur ~18px)  |
| `--glass-border`     | `rgba(10,41,89,.08)`    | `rgba(255,255,255,.08)` | Glass border                     |

### Brand & Accents

| Token                | Light     | Dark      | Meaning                                      |
| -------------------- | --------- | --------- | -------------------------------------------- |
| `--primary-accent`   | `#0a58ca` | `#2f81f7` | Oceaneering blue — primary actions/focus/nav |
| `--secondary-accent` | `#0284c7` | `#38bdf8` | Cyan — secondary emphasis                    |
| `--tertiary-accent`  | `#475569` | `#64748b` | Slate — tertiary/neutral highlight           |

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
| `--text-primary`   | `#0f2338` | `#e8eef6` |
| `--text-secondary` | `#475569` | `#94a8c0` |
| `--text-muted`     | `#94a3b8` | `#64748b` |
| `--border`         | `#dbe6f2` | `#1c3a5a` |
| `--border-subtle`  | `#eef4fb` | `#12283f` |

### Gradients, Shadows & Overlays

- `--gradient-primary`, `--gradient-accent`, `--gradient-header` — hero headers / CTAs.
- `--shadow-card`, `--shadow-card-hover`, `--shadow-glow` — never invent new shadows.
- `--overlay-bg` — modal/scrim (40–60% opacity). `--scrollbar-thumb` / `--scrollbar-track` for scrollbars.

> When you add a new token, add it to **both** `light.module.scss` and `dark.module.scss`.

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
