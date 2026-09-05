import type { Workbook } from "exceljs";
import { IBudgetLine, IFabricationRequest, ISubItem } from "../models";
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

// Fills ONLY the per-FID header + QTD/HH inputs into the immutable template, then lets Excel
// recompute every formula on open (fullCalcOnLoad). exceljs does not evaluate formulas itself.
// One report per Make sub-item: pass the sub-item to stamp its PN in the header.
export async function exportBudgetExcel(
  request: IFabricationRequest,
  subItem?: ISubItem,
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
  const budget = subItem?.fabricationBudget ?? request.budget;

  // Header (per-FID values).
  ws.getCell(BUDGET_TEMPLATE.header.os).value = request.osNumber;
  ws.getCell(BUDGET_TEMPLATE.header.projeto).value = subItem
    ? `${request.projeto} — ${subItem.pn} ${subItem.descricao}`.trim()
    : request.projeto;
  ws.getCell(BUDGET_TEMPLATE.header.desenho).value = subItem
    ? `${subItem.drawing.code} ${subItem.drawing.revision}`.trim() ||
      `${request.drawing.code} ${request.drawing.revision}`.trim()
    : `${request.drawing.code} ${request.drawing.revision}`.trim();
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

  // Tabela 3 migrou para o Relatório de Partes e Peças.
  for (const row of BUDGET_TEMPLATE.hiddenRows) ws.getRow(row).hidden = true;

  // Force Excel to recompute peso totals / totals / valores on open.
  workbook.calcProperties.fullCalcOnLoad = true;

  const out = await workbook.xlsx.writeBuffer();
  const suffix = subItem ? ` - ${subItem.pn}` : "";
  triggerDownload(
    out as ArrayBuffer,
    `Relatório de Orçamento de Fabricação ${request.fid}${suffix}.xlsx`,
  );
}
