import type { Workbook } from "exceljs";
import { IBudgetLine, IFabricationRequest } from "../models";
import {
  CONTRACT_LABOR,
  CONTRACT_MATERIALS,
  CONTRACT_SERVICES,
} from "../config/contractWeights";
import { BUDGET_TEMPLATE } from "../config/budgetTemplateMap";
import { formatDate } from "./formatters";

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function qtdByKey(lines: IBudgetLine[]): { [key: string]: number } {
  const map: { [key: string]: number } = {};
  for (const l of lines) if (l.key) map[l.key] = l.qtd || 0;
  return map;
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Fills ONLY the per-FID header + QTD/HH inputs + COTS rows into the immutable template, then lets
// Excel recompute every formula on open (fullCalcOnLoad). exceljs does not evaluate formulas itself.
export async function exportBudgetExcel(
  request: IFabricationRequest,
): Promise<void> {
  const [{ Workbook }, { BUDGET_TEMPLATE_BASE64 }] = await Promise.all([
    import(/* webpackChunkName: 'exceljs' */ "exceljs"),
    import(
      /* webpackChunkName: 'budget-template' */ "../assets/budgetTemplateBase64"
    ),
  ]);

  const workbook: Workbook = new Workbook();
  await workbook.xlsx.load(base64ToBytes(BUDGET_TEMPLATE_BASE64).buffer);
  const ws = workbook.worksheets[0];
  const { budget } = request;

  // Header (per-FID values).
  ws.getCell(BUDGET_TEMPLATE.header.os).value = request.osNumber;
  ws.getCell(BUDGET_TEMPLATE.header.projeto).value = request.projeto;
  ws.getCell(BUDGET_TEMPLATE.header.desenho).value =
    `${request.drawing.code} ${request.drawing.revision}`.trim();
  ws.getCell(BUDGET_TEMPLATE.header.numeroOrcamento).value =
    budget.numeroOrcamento;
  if (budget.dataEnvio)
    ws.getCell(BUDGET_TEMPLATE.header.dataEnvio).value = formatDate(
      budget.dataEnvio,
    );

  // QTD/HH inputs (write only non-zero; leave blank rows as the template has them).
  const materiais = qtdByKey(budget.tabela2Materiais);
  for (const m of CONTRACT_MATERIALS) {
    const qtd = materiais[m.key];
    if (qtd)
      ws.getCell(`${BUDGET_TEMPLATE.materiais.qtdCol}${m.row}`).value = qtd;
  }
  const labor = qtdByKey(budget.tabela2Labor);
  for (const l of CONTRACT_LABOR) {
    const qtd = labor[l.key];
    if (qtd) ws.getCell(`${BUDGET_TEMPLATE.labor.qtdCol}${l.row}`).value = qtd;
  }
  const servicos = qtdByKey(budget.tabela1);
  for (const s of CONTRACT_SERVICES) {
    const qtd = servicos[s.key];
    if (qtd)
      ws.getCell(`${BUDGET_TEMPLATE.servicos.qtdCol}${s.row}`).value = qtd;
  }

  // Tabela 3 (COTS) — free-form rows.
  const cots = BUDGET_TEMPLATE.cots;
  budget.tabela3
    .slice(0, cots.endRow - cots.startRow + 1)
    .forEach((line, i) => {
      const row = cots.startRow + i;
      ws.getCell(`${cots.categoriaCol}${row}`).value = line.categoria;
      if (line.valor) ws.getCell(`${cots.valorCol}${row}`).value = line.valor;
      if (line.obs) ws.getCell(`${cots.obsCol}${row}`).value = line.obs;
    });

  // Force Excel to recompute peso totals / totals / valores on open.
  workbook.calcProperties.fullCalcOnLoad = true;

  const out = await workbook.xlsx.writeBuffer();
  triggerDownload(
    out as ArrayBuffer,
    `Relatório de Orçamento ${request.fid}.xlsx`,
  );
}
