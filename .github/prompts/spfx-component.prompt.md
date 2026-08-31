---
description: "Scaffold a new SPFx component with the triplet pattern (.tsx + .module.scss + .module.scss.ts)"
mode: agent
---

# Scaffold SPFx Component

You are creating a new component for the **ProdFlow** SPFx project (Fluent UI v9 + SCSS Modules).

## Input

The user will provide:

- **Component name** (PascalCase, e.g., `SubItemPathway`)
- **Target folder** under `src/webparts/prodFlow/app/` (e.g., `components/budgeting/`, `pages/`)

## Rules

1. **Always create the pair** — two files per component (SPFx 1.23 css-loader):
   - `{Name}.tsx` — React component
   - `{Name}.module.scss` — Scoped SCSS styles

2. **No hand-written `.module.scss.ts` shim.** SPFx 1.23 uses **css-loader**: import styles directly
   (`import styles from './{Name}.module.scss';`) and reference classes as `styles.className`. Class
   names are hashed at build and the `styles` typing is ambient (provided by the Heft rig). The
   committed shim was the SPFx ≤ 1.21 pattern and is no longer used.

3. **TSX file conventions:**
   - Import styles: `import styles from './{Name}.module.scss';`
   - Import types from `models/` (never declare inline interfaces that exist there)
   - Import Fluent v9 primitives from `@fluentui/react-components`
   - Import derived hooks from `hooks/` (`useStatusColors`, `useAccessLevel`, `useCurrentUser`, `useChartTheme`…)
   - Import remote data via `api/` query hooks (`useFids`, `useFid`…) — never call SharePoint directly
   - Import UI state from `stores/` (`useUIStore`, `useConfigStore`, `useFidStore`)
   - Import utils from `utils/` (`formatters`, `businessDays`, `bomParser`, `statusHelpers`…)
   - Import config from `config/` (`ROUTES`, `NAV_GROUPS`, `SP_CONFIG`, `PHASES`, `STATUSES`)
   - **NEVER** use mock/hardcoded data
   - Use `React.FC<Props>` or plain function components; export as default

4. **SCSS file conventions:**
   - Use CSS custom properties for ALL colors: `var(--card-bg)`, `var(--text-primary)`, `var(--primary-accent)`…
   - Never hardcode hex — use theme variables from `themes/light.module.scss` / `themes/dark.module.scss`
   - Scope everything under a root class matching the component name
   - Reuse spacing/radius/motion conventions from the design-system guide

5. **Before creating**, check `models/index.ts` for existing interfaces, `config/` for existing
   constants, `hooks/`/`utils/` for existing helpers, and `components/common/` for reusable UI
   (`GlassCard`, `KPICard`, `DataTable`, badges). Do not duplicate.

## Output

Create both files with appropriate boilerplate and explain what was created.
