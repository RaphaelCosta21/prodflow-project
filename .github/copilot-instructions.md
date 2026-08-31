# ProdFlow — Copilot Instructions

**ProdFlow** (_CIDEQ Production Management System_) is an SPFx 1.23 web part (React 17 · TypeScript 5.8 ·
Fluent UI v9 · Zustand + TanStack Query v4 · PnPjs v3 · Nivo) for Oceaneering Brazil's make-to-order
fabrication lifecycle. One traceable **FID (Fabrication ID)** per product.

- **Agent overview, build commands, folder structure, conventions & critical rules:** see [AGENTS.md](../AGENTS.md).
- **Look & feel (design tokens, components, charts):** auto-applied via
  [prodflow-design-system.instructions.md](instructions/prodflow-design-system.instructions.md) when
  editing app `.tsx` / `.scss` — the source of truth for UI.
- **Design inspiration only:** the `ui-ux-pro-max` skill in [ui-ux-pro-max.prompt.md](prompts/ui-ux-pro-max.prompt.md)
  — ProdFlow tokens & Fluent v9 always win.
- **Full product spec:** [PRODFLOW-PROJECT-PLAN.md](../PRODFLOW-PROJECT-PLAN.md).

## graphify

For any question about this repo's architecture, structure, components, or how to add/modify/find
code, your first action should be `graphify query "<question>"` when `graphify-out/graph.json`
exists. Use `graphify path "<A>" "<B>"` for relationship questions and `graphify explain "<concept>"`
for focused-concept questions. These return a scoped subgraph, usually much smaller than the full
report or raw grep output.

Triggers: "how do I…", "where is…", "what does … do", "add/modify a <component>",
"explain the architecture", or anything that depends on how files or classes relate.

If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md`
only for broad architecture review or when query/path/explain do not surface enough context. Only read
source files when (a) modifying/debugging specific code, (b) the graph lacks the needed detail, or
(c) the graph is missing or stale.

Type `/graphify` in Copilot Chat to build or update the graph.
