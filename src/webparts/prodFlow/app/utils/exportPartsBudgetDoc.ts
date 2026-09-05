import { IFabricationRequest, IPartsBudget } from "../models";
import { distinctAttachments } from "./quotationHelpers";
import { formatCurrencyBRL, formatDate } from "./formatters";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NOTE =
  "PIS/COFINS: Incluso · ISS: Incluso. Os prazos de entrega informados estão de acordo com " +
  "estoque e condições de entrega dos fornecedores. Neste caso, ficam sujeitos a confirmação " +
  "no fechamento do pedido.";

/**
 * Word (.doc via HTML) do "Relatório Orçamento Tabela 3": cabeçalho + tabela dos itens Buy +
 * as cotações anexadas ao final. Um PDF que cobre vários itens entra uma única vez.
 */
export function buildPartsBudgetHtml(
  request: IFabricationRequest,
  budget: IPartsBudget,
): string {
  const attachments = distinctAttachments(request.quotationPackages ?? []);
  const money = (v: number): string => formatCurrencyBRL(v);

  const rows = budget.lines
    .map(
      (l) => `<tr>
      <td class="c">${l.item}</td>
      <td>${escapeHtml(l.descricao)}</td>
      <td class="c">${escapeHtml(l.pn ?? "")}</td>
      <td class="c">${l.qtd}</td>
      <td class="c">${escapeHtml(l.unidade)}</td>
      <td class="r">${money(l.valorUnit)}</td>
      <td class="r">${money(l.pisCofinsUnit)}</td>
      <td class="r">${money(l.issUnit)}</td>
      <td class="r">${money(l.impostosUnit)}</td>
      <td class="r">${money(l.custoTotalUnit)}</td>
      <td class="r b">${money(l.total)}</td>
      <td class="c">${escapeHtml(l.prazoEntrega ?? "")}</td>
    </tr>`,
    )
    .join("");

  const quotes = attachments
    .map(
      (a) =>
        `<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.name)}</a></li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Relatório Orçamento Tabela 3</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #00263E; }
  h1 { font-size: 14pt; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
  th, td { border: 1px solid #A7B3C2; padding: 4px 6px; font-size: 9pt; }
  th { background: #EDF4F9; font-weight: bold; }
  .c { text-align: center; }
  .r { text-align: right; }
  .b { font-weight: bold; }
  .total td { background: #EDF4F9; font-weight: bold; }
  .note { font-size: 8.5pt; }
  .sign { margin-top: 36px; font-size: 9pt; }
</style></head>
<body>
  <h1>Relatório Orçamento Tabela 3 — Cideq Lote A</h1>

  <table>
    <tr>
      <th>Contrato</th><td>${escapeHtml(budget.contrato)}</td>
      <th>Nº ORÇ</th><td>${escapeHtml(budget.numeroOrcamento)}</td>
      <th>Rev.</th><td>${escapeHtml(budget.revisao ?? "0")}</td>
    </tr>
    <tr>
      <th>Ordem de Serviço</th><td>${escapeHtml(request.osNumber)}</td>
      <th>Projeto</th><td colspan="3">${escapeHtml(request.projeto)}</td>
    </tr>
    <tr>
      <th>Desenho</th>
      <td>${escapeHtml(`${request.drawing.code} ${request.drawing.revision}`.trim())}</td>
      <th>Data</th><td colspan="3">${formatDate(budget.data ?? new Date().toISOString())}</td>
    </tr>
  </table>

  <table>
    <thead><tr>
      <th>Item</th><th>Descrição</th><th>PN</th><th>Qtd.</th><th>Und.</th>
      <th>Valor Unitário</th><th>PIS/COFINS 9,25%</th><th>ISS 2%</th>
      <th>Total de impostos Unid</th><th>Custo Total Unid</th><th>Total</th>
      <th>Prazo de Entrega</th>
    </tr></thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td colspan="10">TOTAL</td>
        <td class="r">${money(budget.total)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <p class="note">${NOTE}<br/>Validade: ${budget.validadeDias ?? 5} dias corridos.</p>
  ${budget.observacoes ? `<p class="note"><b>Observações:</b> ${escapeHtml(budget.observacoes)}</p>` : ""}

  <p class="sign">_______________________________ &nbsp;&nbsp;&nbsp; _______________________________<br/>
  Assinatura da Contratada &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Assinatura da Contratante</p>

  ${quotes ? `<h1 style="page-break-before:always">Cotações anexadas</h1><ul>${quotes}</ul>` : ""}
</body></html>`;
}

export function exportPartsBudgetDoc(
  request: IFabricationRequest,
  budget: IPartsBudget,
): void {
  const html = buildPartsBudgetHtml(request, budget);
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Relatório de Orçamento de Partes e Peças ${request.fid}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
