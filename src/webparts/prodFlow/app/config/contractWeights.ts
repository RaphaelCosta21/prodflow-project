import { BudgetCriterio, Complexity } from "../models";

// Contract weight coefficients are FIXED IN CODE (not a SharePoint list). Exact values must be
// transcribed from the contract price table — plan open item #1. All `peso` values below are 0
// PLACEHOLDERS; the budget mask computes pesoTotal = qtd * peso and Valor = Σ pesoTotal * unit price.
export const CONTRACT_UNIT_PRICE_BRL = 0; // R$ per "Peso Total" unit — TODO transcribe.

export interface IContractServiceWeight {
  key: string;
  label: string;
  criterio: BudgetCriterio;
  peso: number;
}

export interface IContractLaborWeight {
  key: string;
  label: string;
  pesoByComplexity: Partial<Record<Complexity, number>>;
}

export interface IContractMaterialCategory {
  key: string;
  label: string;
  specs: string[];
  peso: number;
}

// Tabela 1 — Serviços adicionais.
export const CONTRACT_SERVICES: IContractServiceWeight[] = [
  {
    key: "inspLpPm",
    label: "Inspeção LP/PM & certificações",
    criterio: "HH",
    peso: 0,
  },
  {
    key: "revestMetal",
    label: "Revestimentos metálicos",
    criterio: "UN",
    peso: 0,
  },
  {
    key: "revestNaoMetal",
    label: "Revestimentos não-metálicos",
    criterio: "UN",
    peso: 0,
  },
  { key: "pintura", label: "Pintura", criterio: "M2", peso: 0 },
  {
    key: "magnetizacao",
    label: "Magnetização de peças",
    criterio: "UN",
    peso: 0,
  },
];

// Tabela 2 — Usinagem/Caldeiraria/Engenharia de Fabricação (HH por complexidade).
export const CONTRACT_LABOR: IContractLaborWeight[] = [
  {
    key: "usinagem",
    label: "Usinagem",
    pesoByComplexity: { Baixa: 0, Média: 0, Alta: 0 },
  },
  {
    key: "caldeiraria",
    label: "Caldeiraria/Soldagem",
    pesoByComplexity: { Baixa: 0, Média: 0, Alta: 0 },
  },
  {
    key: "engFabricacao",
    label: "Engenharia de Fabricação",
    pesoByComplexity: { Baixa: 0, Média: 0, Alta: 0 },
  },
];

// Tabela 2 — Matéria prima (Apêndice A). Specs listed; peso per category TODO.
export const CONTRACT_MATERIALS: IContractMaterialCategory[] = [
  {
    key: "acoCarbono",
    label: "Aço Carbono",
    specs: [
      "Barra quadrada SAE 1045",
      "Barra redonda ASTM A48 / A536 / SAE 1020 / 1045 / 4140 / 4340",
      "Barra sextavada SAE 1045",
      "Chapa ASTM A36 / SAE 516 / A283",
      "Tubo API 5L Gr B",
      "Perfil A36",
    ],
    peso: 0,
  },
  {
    key: "acoInox",
    label: "Aço Inox",
    specs: [
      "Barra redonda AISI 304 / 316 / 316L / 410",
      "Barra sextavada 316",
      "Chapa 316 / 316L / 304",
      "Perfil 316",
    ],
    peso: 0,
  },
  {
    key: "cobre",
    label: "Cobre",
    specs: ["Bronze TM 23", "Latão C-360"],
    peso: 0,
  },
  {
    key: "aluminio",
    label: "Alumínio",
    specs: ["Chapas/perfis/barras 6351 / 6061 T6 / 6063 / 5052"],
    peso: 0,
  },
  {
    key: "polimeros",
    label: "Polímeros",
    specs: [
      "Acrílico",
      "Poliuretano",
      "Borracha SBR 70",
      "Teflon PTFE",
      "Nylon",
    ],
    peso: 0,
  },
];

export const CONTRACT_WEIGHTS = {
  unitPriceBRL: CONTRACT_UNIT_PRICE_BRL,
  services: CONTRACT_SERVICES,
  labor: CONTRACT_LABOR,
  materials: CONTRACT_MATERIALS,
} as const;
