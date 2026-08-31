import { z } from "zod";
import { IFabricationRequest } from "../models";

// Zod validation at the FID boundaries (read/write + BOM import). Mirrors PRODFLOW-PROJECT-PLAN.md §11.

export const complexitySchema = z.enum([
  "Baixa",
  "Média",
  "Alta",
  "N/A",
  "A definir",
]);
export const attendanceSchema = z.enum(["Interna", "Externa"]);
export const strategySchema = z.enum(["Make", "Buy"]);
export const buyTypeSchema = z.enum(["RawMaterial", "CommercialItem"]);
export const makeSiteSchema = z.enum(["InHouse", "Subcon"]);

export const requestStatusSchema = z.enum([
  "Draft",
  "Budgeting",
  "BudgetReview",
  "Submitted",
  "Approved",
  "Rejected",
  "ReleasedForProduction",
  "InProduction",
  "FinalInspection",
  "Delivered",
  "Completed",
  "Closed",
  "OnHold",
  "Cancelled",
]);

export const subItemStatusSchema = z.enum([
  "NotStarted",
  "Strategy",
  "WaitingDelineation",
  "WaitingQuotation",
  "Costed",
  "WaitingRelease",
  "InProcurement",
  "WaitingMaterial",
  "InFabrication",
  "Subcontracted",
  "InInspection",
  "ReadyInStock",
  "InAssembly",
  "Completed",
  "OnHold",
  "Cancelled",
]);

export const drawingSchema = z.object({
  code: z.string(),
  revision: z.string(),
});

export const checklistStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
  date: z.string().optional(),
  by: z.string().optional(),
});

export const delineationSchema = z.object({
  hh: z.number(),
  eps: z.string().optional(),
  inspections: z.array(z.string()).optional(),
  consumables: z.string().optional(),
  rawMaterial: z.string().optional(),
  notes: z.string().optional(),
  revision: z.string(),
  revisionHistory: z
    .array(
      z.object({
        rev: z.string(),
        by: z.string(),
        date: z.string(),
        note: z.string().optional(),
      }),
    )
    .optional(),
  printableUrl: z.string().optional(),
  checklist: z.array(checklistStepSchema),
});

export const quotationSchema = z.object({
  supplier: z.string(),
  value: z.number(),
  leadTimeDays: z.number(),
  obs: z.string().optional(),
});

export const materialCertSchema = z.object({
  heatLot: z.string(),
  spec: z.string(),
  certUrl: z.string().optional(),
});

// Recursive (children derived from level/parentId) — z.ZodTypeAny avoids TS recursion friction.
export const subItemSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string(),
    level: z.number(),
    parentId: z.string().optional(),
    children: z.array(subItemSchema).optional(),
    findNumber: z.string().optional(),
    pn: z.string(),
    pnBr: z.string().optional(),
    qtd: z.number(),
    unit: z.string().optional(),
    descricao: z.string(),
    drawing: drawingSchema,
    qualityCode: z.string().optional(),
    strategy: strategySchema.optional(),
    buyType: buyTypeSchema.optional(),
    makeSite: makeSiteSchema.optional(),
    attendance: attendanceSchema,
    complexity: complexitySchema,
    status: subItemStatusSchema,
    delineation: delineationSchema.optional(),
    quotation: quotationSchema.optional(),
    rcOrSr: z.string().optional(),
    poOrWo: z.string().optional(),
    prazoFabricacaoDias: z.number().optional(),
    dataInicioFab: z.string().optional(),
    dataFimFab: z.string().optional(),
    dataTerminoReal: z.string().optional(),
    fabChecklist: z.array(checklistStepSchema),
    serialNumber: z.string().optional(),
    certificates: z.array(materialCertSchema).optional(),
    docRso: z.string().optional(),
    servico: z.string().optional(),
    simultaneidade: z
      .object({ flag: z.boolean(), withLines: z.array(z.string()).optional() })
      .optional(),
    orcamentoUsinando: z.number().optional(),
    partesEPecas: z.number().optional(),
    servicos: z.number().optional(),
    custoTotal: z.number().optional(),
    orcamentoOceaneering: z.number().optional(),
    receita: z.number().optional(),
  }),
);

export const budgetLineSchema = z.object({
  categoria: z.string().optional(),
  descricao: z.string(),
  criterio: z.enum(["HH", "UN", "M2", "KG"]).optional(),
  complexidade: complexitySchema.optional(),
  qtd: z.number(),
  peso: z.number(),
  pesoTotal: z.number(),
});

export const budgetSchema = z.object({
  contrato: z.string(),
  numeroOrcamento: z.string(),
  dataEnvio: z.string().optional(),
  tabela1: z.array(budgetLineSchema),
  tabela2Materiais: z.array(budgetLineSchema),
  tabela2Labor: z.array(budgetLineSchema),
  tabela3: z.array(
    z.object({
      categoria: z.string(),
      valor: z.number(),
      obs: z.string().optional(),
    }),
  ),
  entregaDiasCorridos: z.number().optional(),
  observacoes: z.string().optional(),
  totalValor: z.number(),
});

export const financialsSchema = z.object({
  custoTotal: z.number(),
  orcamentoOceaneering: z.number(),
  receita: z.number(),
  multaExposicao30: z.number(),
});

export const historyEventSchema = z.object({
  ts: z.string(),
  by: z.string(),
  type: z.string(),
  message: z.string(),
});

export const fabricationRequestSchema = z.object({
  fid: z.string(),
  osNumber: z.string(),
  osType: z.enum(["OS", "OM"]).optional(),
  projeto: z.string(),
  lote: z.string().optional(),
  drawing: drawingSchema,
  descricao: z.string(),
  comentarios: z.string().optional(),
  tipoOrcamento: z.string(),
  complexidadeUsinagem: complexitySchema,
  complexidadeCaldeiraria: complexitySchema,
  complexidadeGeral: complexitySchema,
  atendimento: attendanceSchema,
  phase: z.union([z.literal(1), z.literal(2)]),
  status: requestStatusSchema,
  dates: z.object({
    recebimentoDemanda: z.string().optional(),
    solicitacaoOrcamento: z.string().optional(),
    prazoEnvioPetrobras: z.string().optional(),
    retornoOrcamento: z.string().optional(),
    dataEnvioPetrobras: z.string().optional(),
    dataAprovacaoPetrobras: z.string().optional(),
    prazoDiasUteis: z.number().optional(),
    prazoDiasCorridos: z.number().optional(),
  }),
  budget: budgetSchema,
  financials: financialsSchema,
  subItems: z.array(subItemSchema),
  approval: z
    .object({
      by: z.string(),
      date: z.string(),
      signatureRef: z.string().optional(),
    })
    .optional(),
  medicao: z
    .object({
      milestone: z.string(),
      status: z.string(),
      date: z.string().optional(),
    })
    .optional(),
  semanaTermino: z.string().optional(),
  mesPrevisto: z.string().optional(),
  history: z.array(historyEventSchema),
  attachments: z.array(
    z.object({ name: z.string(), url: z.string(), kind: z.string() }),
  ),
});

// Strict parse (throws on invalid) — use at read/write boundaries.
export function parseFabricationRequest(data: unknown): IFabricationRequest {
  return fabricationRequestSchema.parse(data) as unknown as IFabricationRequest;
}

export function safeParseFabricationRequest(
  data: unknown,
): z.SafeParseReturnType<unknown, IFabricationRequest> {
  return fabricationRequestSchema.safeParse(data) as z.SafeParseReturnType<
    unknown,
    IFabricationRequest
  >;
}
