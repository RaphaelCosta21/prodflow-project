// Cell map for the immutable Excel template "Relatório de Orçamento de Fabricação - OS.xlsx".
// The export fills ONLY these cells (header + QTD/HH inputs) and sets fullCalcOnLoad so the
// template's own formulas recompute Peso Total, table totals and Valor (unit prices are baked in).
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
  // Tabela 3 saiu do relatório de fabricação (virou o Relatório de Partes e Peças).
  // As linhas são ocultadas em vez de removidas para não deslocar as fórmulas do template.
  hiddenRows: [65, 66, 67, 68, 69, 70, 71, 72, 76],
  entregaCell: "A79",
} as const;
