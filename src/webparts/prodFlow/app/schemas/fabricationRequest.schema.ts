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
export const attachmentCategorySchema = z.enum(["CRD", "OII", "BR"]);
export const strategySchema = z.enum(["Make", "Buy", "NA"]);
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

export const attachmentRefSchema = z.object({
  name: z.string(),
  url: z.string(),
  kind: z.string(),
  category: attachmentCategorySchema.optional(),
  refCode: z.string().optional(),
  uploadedAt: z.string().optional(),
  uploadedBy: z.string().optional(),
});

export const delineationSchema = z.object({
  hh: z.number(),
  horasUsinagem: z.number().default(0),
  horasAcabamento: z.number().default(0),
  horasMontagem: z.number().default(0),
  inspecaoDimensional: z.boolean().default(false),
  horasInspecao: z.number().default(0),
  materials: z
    .array(
      z.object({
        materialKey: z.string(),
        categoria: z.string(),
        descricao: z.string(),
        kg: z.number(),
      }),
    )
    .default([]),
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
  concluido: z.boolean().optional(),
  concluidoPor: z.string().optional(),
  concluidoEm: z.string().optional(),
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
    drawings: z.array(attachmentRefSchema).optional(),
    startedAt: z.string().optional(),
    startedBy: z.string().optional(),
    ownerTeam: z.string().optional(),
    naReason: z.string().optional(),
    selectedQuotationId: z.string().optional(),
    statusHistory: z.array(z.unknown()).optional(),
    fabricationBudget: z.unknown().optional(),
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
  key: z.string().optional(),
  categoria: z.string().optional(),
  descricao: z.string(),
  criterio: z.enum(["HH", "UN", "M2", "KG"]).optional(),
  complexidade: complexitySchema.optional(),
  qtd: z.number(),
  peso: z.number(),
  pesoTotal: z.number(),
});

// Tabela 3 saiu do relatório de fabricação; `.passthrough()` ignora o campo legado sem quebrar a leitura.
export const budgetSchema = z
  .object({
    contrato: z.string(),
    numeroOrcamento: z.string(),
    dataEnvio: z.string().optional(),
    tabela1: z.array(budgetLineSchema),
    tabela2Materiais: z.array(budgetLineSchema),
    tabela2Labor: z.array(budgetLineSchema),
    entregaDiasCorridos: z.number().optional(),
    observacoes: z.string().optional(),
    totalValor: z.number(),
  })
  .passthrough();

export const quotationPackageSchema = z.object({
  id: z.string(),
  supplier: z.string(),
  reference: z.string().optional(),
  date: z.string().optional(),
  validade: z.string().optional(),
  moeda: z.string(),
  leadTimeDays: z.number().optional(),
  attachments: z.array(attachmentRefSchema),
  coveredSubItemIds: z.array(z.string()),
  lines: z.array(
    z.object({
      subItemId: z.string(),
      qtd: z.number(),
      valorUnit: z.number(),
      valorTotal: z.number(),
      leadTimeDays: z.number().optional(),
      prazoEntrega: z.string().optional(),
      obs: z.string().optional(),
    }),
  ),
  obs: z.string().optional(),
  by: z.string().optional(),
  concluido: z.boolean().optional(),
});

export const partsBudgetSchema = z.object({
  contrato: z.string(),
  numeroOrcamento: z.string(),
  revisao: z.string().optional(),
  data: z.string().optional(),
  validadeDias: z.number().optional(),
  observacoes: z.string().optional(),
  lines: z.array(
    z.object({
      subItemId: z.string(),
      item: z.number(),
      descricao: z.string(),
      pn: z.string().optional(),
      material: z.string().optional(),
      qtd: z.number(),
      unidade: z.string(),
      fornecedor: z.string().optional(),
      quotationId: z.string().optional(),
      valorUnit: z.number(),
      pisCofinsUnit: z.number(),
      issUnit: z.number(),
      impostosUnit: z.number(),
      custoTotalUnit: z.number(),
      total: z.number(),
      prazoEntrega: z.string().optional(),
    }),
  ),
  total: z.number(),
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
  projeto: z.string(),
  lote: z.string().optional(),
  drawing: drawingSchema,
  partNumberOii: z.string().optional(),
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
  partsBudget: partsBudgetSchema.optional(),
  quotationPackages: z.array(quotationPackageSchema).optional(),
  phaseHistory: z.array(z.unknown()).optional(),
  statusHistory: z.array(z.unknown()).optional(),
  notes: z.record(z.string()).optional(),
  comments: z
    .array(
      z.object({
        id: z.string(),
        author: z.object({ name: z.string(), email: z.string() }),
        text: z.string(),
        ts: z.string(),
        section: z.string().optional(),
        edited: z.boolean().optional(),
        editedAt: z.string().optional(),
      }),
    )
    .optional(),
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
    z.object({
      name: z.string(),
      url: z.string(),
      kind: z.string(),
      category: attachmentCategorySchema.optional(),
      refCode: z.string().optional(),
    }),
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

// Validates the create-FID form input, before buildNewRequest() derives the full payload.
export const newRequestInputSchema = z.object({
  osNumber: z
    .string()
    .regex(/^6000\d+$/, "Informe os números da OS após o prefixo 6000."),
  drawingCode: z.string().min(1, "Informe o código do desenho (CRD)."),
  partNumberOii: z.string().optional(),
  descricao: z.string().min(1, "Informe a descrição resumida."),
  comentarios: z.string().optional(),
  tipoOrcamento: z.string().min(1, "Informe o tipo de orçamento."),
  complexidadeUsinagem: complexitySchema,
  complexidadeCaldeiraria: complexitySchema,
  atendimento: attendanceSchema,
  solicitacaoOrcamento: z.string().optional(),
  prazoDiasCorridos: z
    .number({ invalid_type_error: "Informe um número de dias válido." })
    .int("Use um número inteiro de dias.")
    .min(0, "O prazo não pode ser negativo.")
    .optional(),
  createdBy: z.string(),
});

// Maps issues to { field: message } so the wizard can drive Fluent's validationState per Field.
export function validateNewRequest(
  data: unknown,
  fields?: string[],
): Record<string, string> {
  const result = newRequestInputSchema.safeParse(data);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!key || errors[key]) continue;
    if (fields && fields.indexOf(key) === -1) continue;
    errors[key] = issue.message;
  }
  return errors;
}
