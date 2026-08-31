---
description: "Implement a new FID-related feature following the ProdFlow data-flow pattern"
mode: agent
---

# Implement FID Feature

You are implementing a new feature in the **ProdFlow** SPFx project (SPFx 1.23 / React 17 /
TypeScript 5.8 / Fluent UI v9 / Zustand + TanStack Query v4 / PnPjs v3 / Nivo).

## Data Flow

All features MUST follow this pipeline:

```
SharePoint List → Service (static class) → TanStack Query hook (api/) → Zustand store (UI state) → Page/Component
```

### Layer Responsibilities

| Layer          | Location      | Pattern                                                                                                                                      |
| -------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Service**    | `services/`   | Static class using `SPService.sp`. Maps SP fields ↔ TypeScript models. Merge-per-section on write.                                           |
| **Query hook** | `api/`        | TanStack Query v4 `useQuery`/`useMutation` over a service. Optimistic update + rollback + `invalidateQueries`. **Only** door to remote data. |
| **Store**      | `stores/`     | Zustand `create<State>((set, get) => ({...}))`. **Client/UI state only — no fetching.**                                                      |
| **Hook**       | `hooks/`      | Derived/computed data, combines query hooks + stores (`useAccessLevel`, `useStatusColors`…).                                                 |
| **Page**       | `pages/`      | Consumes hooks/stores, passes data to components. Triplet: `.tsx` + `.module.scss` + `.module.scss.ts`.                                      |
| **Component**  | `components/` | Presentational. Receives props, renders UI. Triplet pattern.                                                                                 |

## Before Writing Code — Check Existing Modules

| Need           | Directory               | Key Exports                                                                                                                                        |
| -------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types          | `models/`               | `IFabricationRequest`, `ISubItem`, `IBudget`, `IBudgetLine`, `IFinancials`, `IDelineation`, `IQuotation`, `IHistoryEvent`                          |
| Constants      | `config/`               | `ROUTES`, `NAV_GROUPS`, `PHASES`, `STATUSES`, `KPI_DEFINITIONS`, `SP_CONFIG`, `CONTRACT_WEIGHTS`, `BR_HOLIDAYS`                                    |
| Services       | `services/`             | `RequestService`, `BudgetService`, `BomImportService`, `SlaService`, `ConfigService`, `MembersService`, `AttachmentService`, `NotificationService` |
| Query hooks    | `api/`                  | `useFids`, `useFid`, `useUpdateSubItem`, `useCreateFid`, `queryKeys`                                                                               |
| Stores         | `stores/`               | `useUIStore`, `useConfigStore`, `useAuthStore`, `useFidStore`                                                                                      |
| Derived hooks  | `hooks/`                | `useAccessLevel`, `useCurrentUser`, `useStatusColors`, `useChartTheme`, `useEditControl`                                                           |
| Formatting     | `utils/formatters`      | `formatDate`, `formatDateTime`, `formatCurrency` (BRL), `formatDaysLeft`, `formatPercentage`                                                       |
| Validation     | `schemas/` (Zod)        | Validate FID JSON + BOM import at boundaries                                                                                                       |
| Business days  | `utils/businessDays`    | Working-day math **including Brazilian holidays** (`BR_HOLIDAYS`)                                                                                  |
| BOM parsing    | `utils/bomParser`       | Windchill CSV/XLSX → flat list with `level` + `parentId` (tree derived in memory)                                                                  |
| Cost / SLA     | `services/SlaService`   | Business-day SLA, delay flag, `multa` exposure, financial rollups                                                                                  |
| Colors/theming | `hooks/useStatusColors` | `getPhaseColor`, `getStatusColor`, `getTeamColor` — config-aware lookups                                                                           |

## Critical Rules

1. **NO mock data** — all data from SP services through the `api/` query hooks.
2. **NO inline interfaces** that duplicate `models/` — import from `models/index.ts`.
3. **NO hardcoded colors** — CSS variables (`var(--primary-accent)`…) or `useStatusColors()`.
4. **NO whole-JSON overwrite** — `RequestService` merges **per section/sub-item** with ETag/retry.
5. **NO inline date/SLA math** — use `utils/formatters`, `utils/businessDays`, `SlaService`.
6. **Budget mask**: only `QTD` / `HH` editable; `Peso` fixed from `CONTRACT_WEIGHTS`; totals computed.
7. **Use `useAccessLevel()`** for permission checks (team/role × status × phase), not inline comparisons.
8. **SCSS module triplet** — every new component/page needs `.tsx` + `.module.scss` + `.module.scss.ts`.
9. **Validate with Zod** (`schemas/`) on read/write and BOM import.
