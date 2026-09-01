// Cell map for the immutable Excel template "Relatório de Orçamento de Fabricação - OS.xlsx".
// The export fills ONLY these cells (header + QTD/HH inputs + COTS rows) and sets fullCalcOnLoad so
// the template's own formulas recompute Peso Total, table totals and Valor (unit prices are baked in).
// Input cells are derived from each catalog row's `row` field:
//   materiais → T{row} · usinagem/caldeiraria → Q{row} · serviços (T1) → U{row}.
export const BUDGET_TEMPLATE = {
  // Per-FID header value cells (blank in the template).
  header: {
    os: "AO2",
    projeto: "K3",
    desenho: "K4",
    dataEnvio: "K5",
    numeroOrcamento: "AG4",
  },
  materiais: { qtdCol: "T" },
  labor: { qtdCol: "Q" },
  servicos: { qtdCol: "U" },
  // Tabela 3 (COTS) — free-form rows 67–71.
  cots: {
    startRow: 67,
    endRow: 71,
    categoriaCol: "A",
    valorCol: "Q",
    obsCol: "AN",
  },
  entregaCell: "A79",
} as const;
