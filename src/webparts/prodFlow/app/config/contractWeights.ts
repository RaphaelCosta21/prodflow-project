import { BudgetCriterio, Complexity } from "../models";

// Contract weight coefficients are FIXED IN CODE (not a SharePoint list), transcribed at full
// precision from the official template "Relatório de Orçamento de Fabricação - OS.xlsx".
// pesoTotal = qtd * peso; the budget Valor applies a per-table unit price (baked into the template
// formulas). Only QTD/HH is user-editable; every other column (Categoria/Descrição/UN/Peso) is fixed.

// Per-table unit prices (template formulas: Tabela 2 = peso×19093, Tabela 1 = peso×46071).
export const CONTRACT_UNIT_PRICE_TABLE2_BRL = 19093; // matéria-prima + usinagem/caldeiraria
export const CONTRACT_UNIT_PRICE_TABLE1_BRL = 46071; // serviços adicionais

export interface IContractMaterialRow {
  key: string;
  categoria: string;
  descricao: string;
  un: BudgetCriterio; // KG for every raw-material row
  peso: number;
  row: number; // template sheet row — QTD input cell = T{row}
}

export interface IContractLaborRow {
  key: string;
  servico: string;
  complexidade?: Complexity;
  peso: number;
  row: number; // template sheet row — HH input cell = Q{row}
}

export interface IContractServiceRow {
  key: string;
  label: string;
  criterio: BudgetCriterio;
  peso: number;
  row: number; // template sheet row — QTD input cell = U{row}
}

// Tabela 2 — Matéria prima (template rows 9–44). Peso per row (template column X).
export const CONTRACT_MATERIALS: IContractMaterialRow[] = [
  // Aço Carbono
  {
    key: "m9",
    categoria: "Aço Carbono",
    descricao: "BARRA QUADRADA - SAE 1045",
    un: "KG",
    peso: 0.000927,
    row: 9,
  },
  {
    key: "m10",
    categoria: "Aço Carbono",
    descricao: "BARRA REDONDA - ASTM A48",
    un: "KG",
    peso: 0.002317,
    row: 10,
  },
  {
    key: "m11",
    categoria: "Aço Carbono",
    descricao: "BARRA REDONDA - ASTM A536",
    un: "KG",
    peso: 0.002317,
    row: 11,
  },
  {
    key: "m12",
    categoria: "Aço Carbono",
    descricao: "BARRA REDONDA - SAE 1020",
    un: "KG",
    peso: 0.00139,
    row: 12,
  },
  {
    key: "m13",
    categoria: "Aço Carbono",
    descricao: "BARRA REDONDA - SAE 1045",
    un: "KG",
    peso: 0.00139,
    row: 13,
  },
  {
    key: "m14",
    categoria: "Aço Carbono",
    descricao: "BARRA REDONDA - SAE 4140",
    un: "KG",
    peso: 0.001854,
    row: 14,
  },
  {
    key: "m15",
    categoria: "Aço Carbono",
    descricao: "BARRA REDONDA - SAE 4340",
    un: "KG",
    peso: 0.001854,
    row: 15,
  },
  {
    key: "m16",
    categoria: "Aço Carbono",
    descricao: "BARRA SEXTAVADA - SAE 1045",
    un: "KG",
    peso: 0.000978,
    row: 16,
  },
  {
    key: "m17",
    categoria: "Aço Carbono",
    descricao: "CHAPA AÇO CARBONO - ASTM A36",
    un: "KG",
    peso: 0.001955,
    row: 17,
  },
  {
    key: "m18",
    categoria: "Aço Carbono",
    descricao: "CHAPA AÇO CARBONO - SAE 516",
    un: "KG",
    peso: 0.001251,
    row: 18,
  },
  {
    key: "m19",
    categoria: "Aço Carbono",
    descricao: "CHAPA AÇO CARBONO - A283",
    un: "KG",
    peso: 0.001031,
    row: 19,
  },
  {
    key: "m20",
    categoria: "Aço Carbono",
    descricao: "TUBO DE AÇO API 5L Gr B",
    un: "KG",
    peso: 0.007347,
    row: 20,
  },
  {
    key: "m21",
    categoria: "Aço Carbono",
    descricao: "PERFIL - AÇO CARBONO A36",
    un: "KG",
    peso: 0.00152,
    row: 21,
  },
  // Aço Inox
  {
    key: "m22",
    categoria: "Aço Inox",
    descricao: "BARRA REDONDA - INOX AISI 304",
    un: "KG",
    peso: 0.008084,
    row: 22,
  },
  {
    key: "m23",
    categoria: "Aço Inox",
    descricao: "BARRA REDONDA - INOX AISI 316",
    un: "KG",
    peso: 0.003476,
    row: 23,
  },
  {
    key: "m24",
    categoria: "Aço Inox",
    descricao: "BARRA REDONDA - INOX AISI 316 L",
    un: "KG",
    peso: 0.003552,
    row: 24,
  },
  {
    key: "m25",
    categoria: "Aço Inox",
    descricao: "BARRA REDONDA - INOX AISI 410",
    un: "KG",
    peso: 0.002086,
    row: 25,
  },
  {
    key: "m26",
    categoria: "Aço Inox",
    descricao: "BARRA SEXTAVADA - INOX AISI 316",
    un: "KG",
    peso: 0.002933,
    row: 26,
  },
  {
    key: "m27",
    categoria: "Aço Inox",
    descricao: "CHAPA AÇO INOX - AISI 316",
    un: "KG",
    peso: 0.003258,
    row: 27,
  },
  {
    key: "m28",
    categoria: "Aço Inox",
    descricao: "CHAPA AÇO INOX - AISI 316 L",
    un: "KG",
    peso: 0.006563,
    row: 28,
  },
  {
    key: "m29",
    categoria: "Aço Inox",
    descricao: "CHAPA AÇO INOX - AISI 304",
    un: "KG",
    peso: 0.003831,
    row: 29,
  },
  {
    key: "m30",
    categoria: "Aço Inox",
    descricao: "PERFIL - AÇO INOX AISI 316",
    un: "KG",
    peso: 0.002172,
    row: 30,
  },
  // Cobre
  {
    key: "m31",
    categoria: "Cobre",
    descricao: "BARRA REDONDA - BRONZE TM 23",
    un: "KG",
    peso: 0.005975,
    row: 31,
  },
  {
    key: "m32",
    categoria: "Cobre",
    descricao: "BARRA REDONDA - LATÃO C-360",
    un: "KG",
    peso: 0.004671,
    row: 32,
  },
  // Alumínio
  {
    key: "m33",
    categoria: "Alumínio",
    descricao: "BARRA REDONDA - ALUMINIO 6351",
    un: "KG",
    peso: 0.002607,
    row: 33,
  },
  {
    key: "m34",
    categoria: "Alumínio",
    descricao: "CHAPA ALUMÍNIO - 6351",
    un: "KG",
    peso: 0.007436,
    row: 34,
  },
  {
    key: "m35",
    categoria: "Alumínio",
    descricao: "CHAPA ALUMÍNIO - 6061 T6",
    un: "KG",
    peso: 0.006435,
    row: 35,
  },
  {
    key: "m36",
    categoria: "Alumínio",
    descricao: "CHAPA ALUMINIO - 5052",
    un: "KG",
    peso: 0.00152,
    row: 36,
  },
  {
    key: "m37",
    categoria: "Alumínio",
    descricao: "PERFIL - ALUMINIO 6063",
    un: "KG",
    peso: 0.00152,
    row: 37,
  },
  {
    key: "m38",
    categoria: "Alumínio",
    descricao: "PERFIL - ALUMINIO 6351",
    un: "KG",
    peso: 0.001592,
    row: 38,
  },
  {
    key: "m39",
    categoria: "Alumínio",
    descricao: "PERFIL - ALUMÍNIO 6061 T6",
    un: "KG",
    peso: 0.002069,
    row: 39,
  },
  // Polímeros
  {
    key: "m40",
    categoria: "Polímeros",
    descricao: "BARRA REDONDA - ACRÍLICO",
    un: "KG",
    peso: 0.005793,
    row: 40,
  },
  {
    key: "m41",
    categoria: "Polímeros",
    descricao: "BARRA REDONDA - POLIURETANO",
    un: "KG",
    peso: 0.006517,
    row: 41,
  },
  {
    key: "m42",
    categoria: "Polímeros",
    descricao: "BARRA REDONDA - BORRACHA SBR 70",
    un: "KG",
    peso: 0.015207,
    row: 42,
  },
  {
    key: "m43",
    categoria: "Polímeros",
    descricao: "BARRA REDONDA - TEFLON PTFE",
    un: "KG",
    peso: 0.006517,
    row: 43,
  },
  {
    key: "m44",
    categoria: "Polímeros",
    descricao: "BARRA REDONDA - NYLON",
    un: "KG",
    peso: 0.003258,
    row: 44,
  },
];

// Tabela 2 — Usinagem/Caldeiraria/Engenharia de Fabricação (template rows 48–54, HH).
export const CONTRACT_LABOR: IContractLaborRow[] = [
  {
    key: "l48",
    servico: "Usinagem",
    complexidade: "Baixa",
    peso: 0.010915,
    row: 48,
  },
  {
    key: "l49",
    servico: "Usinagem",
    complexidade: "Média",
    peso: 0.02183,
    row: 49,
  },
  {
    key: "l50",
    servico: "Usinagem",
    complexidade: "Alta",
    peso: 0.032746,
    row: 50,
  },
  {
    key: "l51",
    servico: "Caldeiraria",
    complexidade: "Baixa",
    peso: 0.010818,
    row: 51,
  },
  {
    key: "l52",
    servico: "Caldeiraria",
    complexidade: "Média",
    peso: 0.016227,
    row: 52,
  },
  {
    key: "l53",
    servico: "Caldeiraria",
    complexidade: "Alta",
    peso: 0.021635,
    row: 53,
  },
  { key: "l54", servico: "Engenharia de Fabricação", peso: 0.034615, row: 54 },
];

// Tabela 1 — Serviços adicionais (template rows 58–62).
export const CONTRACT_SERVICES: IContractServiceRow[] = [
  {
    key: "s58",
    label: "SERVIÇOS DE INSPEÇÃO LP/PM E CERTIFICAÇÕES",
    criterio: "HH",
    peso: 0.002709,
    row: 58,
  },
  {
    key: "s59",
    label: "SERVIÇOS DE APLICAÇÃO DE REVESTIMENTOS METÁLICOS",
    criterio: "UN",
    peso: 12.60304,
    row: 59,
  },
  {
    key: "s60",
    label: "SERVIÇOS DE APLICAÇÃO DE REVESTIMENTOS NÃO-METÁLICOS",
    criterio: "UN",
    peso: 6.30152,
    row: 60,
  },
  {
    key: "s61",
    label: "SERVIÇOS DE PINTURA",
    criterio: "M2",
    peso: 0.002303,
    row: 61,
  },
  {
    key: "s62",
    label: "SERVIÇOS DE MAGNETIZAÇÃO DE PEÇAS",
    criterio: "UN",
    peso: 2.52054,
    row: 62,
  },
];

export const CONTRACT_WEIGHTS = {
  unitPriceTable2BRL: CONTRACT_UNIT_PRICE_TABLE2_BRL,
  unitPriceTable1BRL: CONTRACT_UNIT_PRICE_TABLE1_BRL,
  materials: CONTRACT_MATERIALS,
  labor: CONTRACT_LABOR,
  services: CONTRACT_SERVICES,
} as const;

export function materialByKey(key: string): IContractMaterialRow | undefined {
  return CONTRACT_MATERIALS.filter((m) => m.key === key)[0];
}

export function laborRow(
  servico: string,
  complexidade?: Complexity,
): IContractLaborRow | undefined {
  return CONTRACT_LABOR.filter(
    (l) =>
      l.servico === servico &&
      (complexidade === undefined || l.complexidade === complexidade),
  )[0];
}

export interface IMaterialOption {
  key: string;
  label: string;
  categoria: string;
  descricao: string;
}

// Dropdown source for the Eng. Industrial delineation (raw material always in KG).
export const CONTRACT_MATERIAL_OPTIONS: IMaterialOption[] =
  CONTRACT_MATERIALS.map((m) => ({
    key: m.key,
    label: `${m.categoria} · ${m.descricao}`,
    categoria: m.categoria,
    descricao: m.descricao,
  }));
