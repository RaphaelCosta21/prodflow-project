import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  RGB,
  StandardFonts,
} from "pdf-lib";
import {
  PARTS_REPORT_COLORS,
  PARTS_REPORT_COLUMN_LABELS,
  PARTS_REPORT_FOOTER_DOC,
  PARTS_REPORT_LAYOUT,
  PARTS_REPORT_NOTES,
  PARTS_REPORT_PAGE,
  PARTS_REPORT_ROWS_PER_PAGE,
  PARTS_REPORT_SIGNATURES,
  PARTS_REPORT_TITLE,
} from "../config/partsReportPdfLayout";
import {
  OCEANEERING_LOGO_JPEG_BASE64,
  PETROBRAS_LOGO_PNG_BASE64,
} from "../assets/reportLogosBase64";
import { IFabricationRequest, IPartsBudget, IPartsBudgetLine } from "../models";
import {
  columnOffset,
  columnSpanWidth,
  drawCell,
  drawText,
  hexColor,
  IBox,
  LINE_SPACING,
  sanitizeText,
  wrapText,
} from "./partsReportPdfDraw";
import { formatCurrencyBRL, formatNumber } from "./formatters";

const L = PARTS_REPORT_LAYOUT;

// Only Descrição, PN and Prazo de Entrega wrap; the rest shrink to stay on a single line.
const ITEM_CELL_MAX_LINES = [1, 4, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2];

interface IRenderContext {
  regular: PDFFont;
  bold: PDFFont;
  oceaneering: PDFImage;
  petrobras: PDFImage;
  navy: RGB;
  amber: RGB;
  white: RGB;
  black: RGB;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Converts a "distance from the top of the page" measurement into a PDF y coordinate. */
function fromTop(distance: number, height = 0): number {
  return PARTS_REPORT_PAGE.height - distance - height;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out.length > 0 ? out : [[]];
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

// Read straight off the ISO string: a date-only value must not shift with the browser timezone.
function reportDate(iso?: string): string {
  const source = iso ?? new Date().toISOString();
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(source);
  if (parts) return `${parts[3]}/${parts[2]}/${parts[1]}`;
  const date = new Date(source);
  return isNaN(date.getTime())
    ? ""
    : `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function drawLogos(page: PDFPage, ctx: IRenderContext): void {
  const oii = L.oceaneeringLogo;
  page.drawImage(ctx.oceaneering, {
    x: oii.x,
    y: fromTop(L.logosTop, oii.height),
    width: oii.width,
    height: oii.height,
  });
  const petro = L.petrobrasLogo;
  page.drawImage(ctx.petrobras, {
    x: petro.x,
    y: fromTop(L.logosTop, petro.height),
    width: petro.width,
    height: petro.height,
  });
}

/** Contrato / Nº ORÇ / Rev. — Ordem de Serviço / Projeto — Desenho / Data. */
function drawHeaderTable(
  page: PDFPage,
  ctx: IRenderContext,
  request: IFabricationRequest,
  budget: IPartsBudget,
): number {
  const t = L.headerTable;
  const width = columnSpanWidth(t.cols, 0, t.cols.length);
  let top = t.top;

  const titleBox: IBox = {
    x: t.x,
    y: fromTop(top, t.titleHeight),
    width,
    height: t.titleHeight,
  };
  drawCell(page, titleBox, {
    fill: ctx.navy,
    border: ctx.black,
    borderWidth: L.borderWidth,
  });
  drawText(page, titleBox, PARTS_REPORT_TITLE, {
    font: ctx.bold,
    size: 16,
    color: ctx.white,
    align: "center",
  });
  top += t.titleHeight;

  const drawing =
    `${request.drawing?.code ?? ""} ${request.drawing?.revision ?? ""}`.trim();
  const dateLabel = reportDate(budget.data);

  const rows: { index: number; span: number; text: string; bold: boolean }[][] =
    [
      [
        { index: 0, span: 1, text: "Contrato:", bold: true },
        { index: 1, span: 1, text: budget.contrato, bold: true },
        { index: 2, span: 1, text: "Nº ORÇ:", bold: true },
        { index: 3, span: 1, text: budget.numeroOrcamento, bold: true },
        { index: 4, span: 1, text: "Rev.", bold: true },
        { index: 5, span: 1, text: budget.revisao ?? "", bold: true },
      ],
      [
        { index: 0, span: 1, text: "Ordem de Serviço:", bold: true },
        { index: 1, span: 1, text: request.osNumber, bold: true },
        { index: 2, span: 1, text: "Projeto:", bold: true },
        { index: 3, span: 3, text: budget.projeto, bold: true },
      ],
      [
        { index: 0, span: 1, text: "Desenho:", bold: true },
        { index: 1, span: 3, text: drawing, bold: true },
        { index: 4, span: 1, text: "Data:", bold: true },
        { index: 5, span: 1, text: dateLabel, bold: true },
      ],
    ];

  rows.forEach((cells, rowIndex) => {
    const height = t.rowHeights[rowIndex];
    const y = fromTop(top, height);
    for (const cell of cells) {
      const box: IBox = {
        x: t.x + columnOffset(t.cols, cell.index),
        y,
        width: columnSpanWidth(t.cols, cell.index, cell.span),
        height,
      };
      drawCell(page, box, { border: ctx.black, borderWidth: L.borderWidth });
      drawText(page, box, cell.text, {
        font: cell.bold ? ctx.bold : ctx.regular,
        size: 11,
        color: ctx.black,
        align: "center",
        maxLines: 2,
        minSize: 7,
      });
    }
    top += height;
  });

  return top;
}

// The mask rows are "at least" 25pt in Word, so a long description grows its row instead of
// being clipped. Font only shrinks when the twelve rows no longer fit the page.
const DESCRIPTION_SIZES = [9, 8.5, 8, 7.5, 7, 6.5, 6];
const DESCRIPTION_MAX_LINES = 4;

function planRowHeights(
  ctx: IRenderContext,
  lines: IPartsBudgetLine[],
  available: number,
): { heights: number[]; size: number } {
  const t = L.itemsTable;
  const textWidth = t.cols[1] - L.cellPadding * 2;
  let heights: number[] = [];
  let size = DESCRIPTION_SIZES[DESCRIPTION_SIZES.length - 1];

  for (const candidate of DESCRIPTION_SIZES) {
    heights = [];
    for (let row = 0; row < PARTS_REPORT_ROWS_PER_PAGE; row++) {
      const line = lines[row];
      if (!line) {
        heights.push(t.rowHeight);
        continue;
      }
      const wrapped = wrapText(
        sanitizeText(line.descricao),
        ctx.regular,
        candidate,
        textWidth,
      ).length;
      const needed =
        Math.min(wrapped, DESCRIPTION_MAX_LINES) * candidate * LINE_SPACING +
        L.cellPadding * 2;
      heights.push(Math.max(t.rowHeight, Math.ceil(needed)));
    }
    size = candidate;
    if (heights.reduce((sum, h) => sum + h, 0) <= available) break;
  }
  return { heights, size };
}

function drawItemsTable(
  page: PDFPage,
  ctx: IRenderContext,
  top: number,
  lines: IPartsBudgetLine[],
  total?: number,
): number {
  const t = L.itemsTable;
  let y = top;
  const available = t.maxHeight - t.headerHeight - t.rowHeight;
  const plan = planRowHeights(ctx, lines, available);

  // Header band.
  const headerY = fromTop(y, t.headerHeight);
  t.cols.forEach((width, index) => {
    const box: IBox = {
      x: t.x + columnOffset(t.cols, index),
      y: headerY,
      width,
      height: t.headerHeight,
    };
    const isAmber = t.amberColumns.indexOf(index) >= 0;
    drawCell(page, box, {
      fill: isAmber ? ctx.amber : ctx.navy,
      border: ctx.black,
      borderWidth: L.borderWidth,
    });
    drawText(page, box, PARTS_REPORT_COLUMN_LABELS[index], {
      font: ctx.bold,
      size: 9,
      color: ctx.white,
      align: "center",
      maxLines: 3,
      minSize: 6,
    });
  });
  y += t.headerHeight;

  // Always 12 rows, blank ones included, exactly like the controlled mask.
  for (let row = 0; row < PARTS_REPORT_ROWS_PER_PAGE; row++) {
    const line = lines[row];
    const rowHeight = plan.heights[row];
    const rowY = fromTop(y, rowHeight);
    const values = line
      ? [
          `${line.item}`,
          line.descricao,
          line.pn ?? "",
          formatNumber(line.qtd),
          line.unidade,
          formatCurrencyBRL(line.valorUnit),
          formatCurrencyBRL(line.pisCofinsUnit),
          formatCurrencyBRL(line.issUnit),
          formatCurrencyBRL(line.impostosUnit),
          formatCurrencyBRL(line.custoTotalUnit),
          formatCurrencyBRL(line.total),
          line.prazoEntrega ?? "",
        ]
      : undefined;

    t.cols.forEach((width, index) => {
      const box: IBox = {
        x: t.x + columnOffset(t.cols, index),
        y: rowY,
        width,
        height: rowHeight,
      };
      drawCell(page, box, { border: ctx.black, borderWidth: L.borderWidth });
      if (values) {
        const isDescription = index === 1;
        drawText(page, box, values[index], {
          font: ctx.regular,
          size: isDescription ? plan.size : 9,
          color: ctx.black,
          align: "center",
          maxLines: isDescription
            ? DESCRIPTION_MAX_LINES
            : ITEM_CELL_MAX_LINES[index],
          minSize: 5.5,
          padding: L.cellPadding,
        });
      }
    });
    y += rowHeight;
  }

  // TOTAL row: label merged across the first ten columns, amount across the last two.
  const totalY = fromTop(y, t.rowHeight);
  const labelBox: IBox = {
    x: t.x,
    y: totalY,
    width: columnSpanWidth(t.cols, 0, 10),
    height: t.rowHeight,
  };
  drawCell(page, labelBox, { border: ctx.black, borderWidth: L.borderWidth });
  drawText(page, labelBox, "TOTAL", {
    font: ctx.regular,
    size: 9,
    color: ctx.black,
    align: "center",
  });

  const amountBox: IBox = {
    x: t.x + columnOffset(t.cols, 10),
    y: totalY,
    width: columnSpanWidth(t.cols, 10, 2),
    height: t.rowHeight,
  };
  drawCell(page, amountBox, { border: ctx.black, borderWidth: L.borderWidth });
  if (total !== undefined) {
    drawText(page, amountBox, "R$", {
      font: ctx.regular,
      size: 9,
      color: ctx.black,
      align: "left",
      padding: 6,
    });
    drawText(page, amountBox, formatNumber(total, 2), {
      font: ctx.regular,
      size: 9,
      color: ctx.black,
      align: "right",
      padding: 6,
    });
  }

  return y + t.rowHeight;
}

function drawNotes(
  page: PDFPage,
  ctx: IRenderContext,
  top: number,
  budget: IPartsBudget,
): number {
  const width = columnSpanWidth(L.itemsTable.cols, 0, L.itemsTable.cols.length);
  const notes = PARTS_REPORT_NOTES.concat([
    `Validade: ${pad2(budget.validadeDias ?? 5)} dias corridos`,
  ]);
  const size = L.notes.fontSize;
  let y = top + L.notes.gap;
  for (const note of notes) {
    for (const line of wrapText(sanitizeText(note), ctx.regular, size, width)) {
      page.drawText(line, {
        x: L.itemsTable.x,
        y: fromTop(y + size * 0.85),
        size,
        font: ctx.regular,
        color: ctx.black,
      });
      y += L.notes.lineHeight;
    }
  }
  return y;
}

function drawObservacoes(
  page: PDFPage,
  ctx: IRenderContext,
  top: number,
  budget: IPartsBudget,
): number {
  const width = columnSpanWidth(
    L.headerTable.cols,
    0,
    L.headerTable.cols.length,
  );
  const text = budget.observacoes
    ? `Observações:\n${budget.observacoes}`
    : "Observações:";
  const y = top + L.observacoes.gap;
  const box: IBox = {
    x: L.headerTable.x,
    y: fromTop(y, L.observacoes.minHeight),
    width,
    height: L.observacoes.minHeight,
  };
  drawCell(page, box, { border: ctx.black, borderWidth: L.borderWidth });
  drawText(page, box, text, {
    font: ctx.regular,
    size: L.observacoes.fontSize,
    color: ctx.black,
    align: "left",
    maxLines: 4,
    minSize: 7,
    padding: L.observacoes.padding,
  });
  return y + L.observacoes.minHeight;
}

function drawSignatures(
  page: PDFPage,
  ctx: IRenderContext,
  afterObservacoes: number,
): void {
  const top = Math.min(
    L.signature.maxTop,
    Math.max(L.signature.top, afterObservacoes + L.signature.gap),
  );
  const y = fromTop(top);
  const positions = [66, 366];
  positions.forEach((x, index) => {
    page.drawLine({
      start: { x, y },
      end: { x: x + L.signature.lineWidth, y },
      thickness: 0.75,
      color: ctx.black,
    });
    drawText(
      page,
      { x, y: y - 16, width: L.signature.lineWidth, height: 12 },
      PARTS_REPORT_SIGNATURES[index],
      {
        font: ctx.regular,
        size: L.signature.fontSize,
        color: ctx.black,
        align: "center",
      },
    );
  });
}

function drawFooters(doc: PDFDocument, ctx: IRenderContext): void {
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const { width } = page.getSize();
    drawText(
      page,
      { x: 0, y: L.footer.bottom, width, height: L.footer.fontSize * 1.4 },
      `Page ${index + 1} of ${pages.length}`,
      {
        font: ctx.regular,
        size: L.footer.fontSize,
        color: ctx.black,
        align: "right",
        padding: 22,
      },
    );
    drawText(
      page,
      { x: 0, y: L.footer.bottom - 11, width, height: L.footer.fontSize * 1.4 },
      PARTS_REPORT_FOOTER_DOC,
      {
        font: ctx.regular,
        size: L.footer.fontSize,
        color: ctx.black,
        align: "left",
        padding: 22,
      },
    );
  });
}

export interface IQuotationSource {
  name: string;
  bytes: ArrayBuffer;
}

export interface IPartsReportPdf {
  bytes: Uint8Array;
  attached: number;
  skipped: string[];
}

/**
 * Page 1..N reproduce the controlled "Relatório Orçamento Tabela 3" mask (12 lines each);
 * the winning suppliers' quotes are then appended as-is, page for page.
 */
export async function buildPartsBudgetPdf(
  request: IFabricationRequest,
  budget: IPartsBudget,
  quotations: IQuotationSource[],
): Promise<IPartsReportPdf> {
  const doc = await PDFDocument.create();
  const ctx: IRenderContext = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    oceaneering: await doc.embedJpg(
      base64ToBytes(OCEANEERING_LOGO_JPEG_BASE64),
    ),
    petrobras: await doc.embedPng(base64ToBytes(PETROBRAS_LOGO_PNG_BASE64)),
    navy: hexColor(PARTS_REPORT_COLORS.navy),
    amber: hexColor(PARTS_REPORT_COLORS.amber),
    white: hexColor(PARTS_REPORT_COLORS.white),
    black: hexColor(PARTS_REPORT_COLORS.black),
  };

  const pages = chunk(budget.lines, PARTS_REPORT_ROWS_PER_PAGE);
  pages.forEach((lines, index) => {
    const page = doc.addPage([
      PARTS_REPORT_PAGE.width,
      PARTS_REPORT_PAGE.height,
    ]);
    drawLogos(page, ctx);
    let top = drawHeaderTable(page, ctx, request, budget);
    top = drawItemsTable(
      page,
      ctx,
      top + L.itemsTable.gap,
      lines,
      index === pages.length - 1 ? budget.total : undefined,
    );
    top = drawNotes(page, ctx, top, budget);
    const afterObservacoes = drawObservacoes(page, ctx, top, budget);
    drawSignatures(page, ctx, afterObservacoes);
  });

  const skipped: string[] = [];
  let attached = 0;
  for (const quote of quotations) {
    try {
      const source = await PDFDocument.load(quote.bytes, {
        ignoreEncryption: true,
      });
      const copied = await doc.copyPages(source, source.getPageIndices());
      for (const page of copied) doc.addPage(page);
      attached++;
    } catch {
      skipped.push(quote.name);
    }
  }

  drawFooters(doc, ctx);
  return { bytes: await doc.save(), attached, skipped };
}
