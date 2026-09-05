import {
  IBudgetLine,
  IFabricationBudget,
  IFabricationRequest,
  ISubItem,
} from "../models";
import {
  CONTRACT_LABOR,
  CONTRACT_MATERIALS,
  CONTRACT_SERVICES,
  materialByKey,
} from "../config/contractWeights";

const INSPECTION_SERVICE_KEY = "s58"; // SERVIÇOS DE INSPEÇÃO LP/PM E CERTIFICAÇÕES

function emptyLine(
  key: string,
  descricao: string,
  peso: number,
  extra: Partial<IBudgetLine> = {},
): IBudgetLine {
  return { key, descricao, peso, qtd: 0, pesoTotal: 0, ...extra };
}

function seedTables(): {
  tabela1: IBudgetLine[];
  tabela2Materiais: IBudgetLine[];
  tabela2Labor: IBudgetLine[];
} {
  return {
    tabela1: CONTRACT_SERVICES.map((s) =>
      emptyLine(s.key, s.label, s.peso, { criterio: s.criterio }),
    ),
    tabela2Materiais: CONTRACT_MATERIALS.map((m) =>
      emptyLine(m.key, m.descricao, m.peso, {
        categoria: m.categoria,
        criterio: m.un,
      }),
    ),
    tabela2Labor: CONTRACT_LABOR.map((l) =>
      emptyLine(l.key, l.servico, l.peso, {
        criterio: "HH",
        complexidade: l.complexidade,
      }),
    ),
  };
}

function setQtd(lines: IBudgetLine[], key: string, qtd: number): void {
  const line = lines.filter((l) => l.key === key)[0];
  if (line && qtd > 0) {
    line.qtd = qtd;
    line.pesoTotal = qtd * (line.peso || 0);
  }
}

/**
 * Builds the fabrication budget mask from the Eng. Industrial delineation:
 * machining/finishing/assembly hours → CONTRACT_LABOR by complexity,
 * inspection hours → Tabela 1, raw materials (kg) → CONTRACT_MATERIALS.
 * SUBCON items have no delineation — their cost comes from the supplier quote.
 */
export function delineationToBudget(
  request: IFabricationRequest,
  subItem: ISubItem,
): IFabricationBudget {
  const tables = seedTables();
  const d = subItem.delineation;
  const complexidade =
    subItem.complexity === "N/A" || subItem.complexity === "A definir"
      ? "Média"
      : subItem.complexity;

  if (d) {
    const usinagem = CONTRACT_LABOR.filter(
      (l) => l.servico === "Usinagem" && l.complexidade === complexidade,
    )[0];
    const caldeiraria = CONTRACT_LABOR.filter(
      (l) => l.servico === "Caldeiraria" && l.complexidade === complexidade,
    )[0];
    const engenharia = CONTRACT_LABOR.filter(
      (l) => l.servico === "Engenharia de Fabricação",
    )[0];

    if (usinagem) setQtd(tables.tabela2Labor, usinagem.key, d.horasUsinagem);
    // Acabamento e montagem são executados pela caldeiraria no contrato.
    if (caldeiraria) {
      setQtd(
        tables.tabela2Labor,
        caldeiraria.key,
        (d.horasAcabamento || 0) + (d.horasMontagem || 0),
      );
    }
    if (engenharia && d.inspecaoDimensional) {
      setQtd(tables.tabela1, INSPECTION_SERVICE_KEY, d.horasInspecao);
    }

    for (const m of d.materials ?? []) {
      const row = materialByKey(m.materialKey);
      if (row) setQtd(tables.tabela2Materiais, row.key, m.kg);
    }
  }

  const previous = subItem.fabricationBudget;
  return {
    subItemId: subItem.id,
    contrato: previous?.contrato ?? request.budget?.contrato ?? "4600684130",
    numeroOrcamento: previous?.numeroOrcamento ?? "",
    dataEnvio: previous?.dataEnvio,
    entregaDiasCorridos: previous?.entregaDiasCorridos,
    observacoes: previous?.observacoes,
    totalValor: 0,
    ...tables,
  };
}

/** Re-applies the delineation over a saved mask, keeping header fields the user typed. */
export function refreshBudgetFromDelineation(
  request: IFabricationRequest,
  subItem: ISubItem,
): IFabricationBudget {
  return delineationToBudget(request, subItem);
}
