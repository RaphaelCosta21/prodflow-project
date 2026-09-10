// Every measurement below was extracted from the controlled docx
// "Relatório de Orçamento de Partes e Peças - OS.docx" (twips ÷ 20 = points, EMU ÷ 12700 = points).
// The report is a controlled document: change these only against a new revision of that file.

export const PARTS_REPORT_ROWS_PER_PAGE = 12;

export const PARTS_REPORT_COLORS = {
  navy: "003B5C",
  amber: "FFC000",
  white: "FFFFFF",
  black: "000000",
} as const;

/** Letter portrait, as in the controlled docx sectPr. */
export const PARTS_REPORT_PAGE = { width: 612, height: 792 } as const;

/** Distance from the top of the page down to each block (docx flows top-down). */
export const PARTS_REPORT_LAYOUT = {
  /** Both logos are anchored to the first paragraph and share the same top edge. */
  logosTop: 13.3,
  oceaneeringLogo: { x: 41, width: 119.6, height: 37.1 },
  petrobrasLogo: { x: 512.9, width: 69.8, height: 43.7 },

  headerTable: {
    x: 21.3,
    top: 58.5,
    /** Contrato | valor | Nº ORÇ | valor | Rev. | valor */
    cols: [76.6, 196.2, 63.5, 63.55, 63.5, 110.8],
    titleHeight: 33.45,
    rowHeights: [22.65, 27.55, 21.65],
  },

  itemsTable: {
    x: 21.55,
    /** Gap between the header table and the items table. */
    gap: 24,
    cols: [
      24.15, // Item
      93.45, // Descrição
      43.5, // PN
      23, // Qtd.
      24.5, // Und.
      50.3, // Valor Unitário
      51.45, // PIS/COFINS 9,25%
      43.4, // ISS 2%
      55.55, // Total de impostos Unid
      50.3, // Custo Total Unid
      54.9, // Total
      58.55, // Prazo de Entrega
    ],
    /** The docx merges two rows (405 + 900 twips) into a single header band. */
    headerHeight: 65.25,
    rowHeight: 25,
    /** Rows grow for long descriptions, but the whole table has to clear the notes block. */
    maxHeight: 430,
    /** Columns painted amber instead of navy in the header band. */
    amberColumns: [6, 7, 8] as number[],
  },

  notes: { gap: 10, fontSize: 8, lineHeight: 9.6 },
  observacoes: { gap: 12, minHeight: 45, fontSize: 10, padding: 3 },
  signature: {
    top: 729,
    /** Pushed down by a tall items table, but never past the footer. */
    maxTop: 745,
    gap: 20,
    lineWidth: 200,
    gapBetween: 96,
    fontSize: 10,
  },
  footer: { bottom: 18.8, fontSize: 8 },

  borderWidth: 1,
  cellPadding: 2,
} as const;

export const PARTS_REPORT_TITLE = "Relatório Orçamento Tabela 3 - Cideq Lote A";

export const PARTS_REPORT_COLUMN_LABELS = [
  "Item",
  "Descrição",
  "PN",
  "Qtd.",
  "Und.",
  "Valor Unitário",
  "PIS/COFINS 9,25%",
  "ISS 2 %",
  "Total de impostos Unid",
  "Custo Total Unid",
  "Total",
  "Prazo de Entrega",
];

/** Reproduced verbatim from the controlled docx, typo in "PIS/CONFINS" included. */
export const PARTS_REPORT_NOTES = [
  "PIS/CONFINS: Incluso",
  "ISS: Incluso",
  "Os prazos de entrega informados estão de acordo com estoque e condições de entrega dos fornecedores. Neste caso, ficam sujeitos a confirmação no fechamento do pedido.",
];

export const PARTS_REPORT_SIGNATURES = [
  "Assinatura da Contratada",
  "Assinatura da Contratante",
];

export const PARTS_REPORT_FOOTER_DOC = "DOC-FOR-330-NUM[A] – Custo Operacional";
