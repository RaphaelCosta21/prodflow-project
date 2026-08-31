// Parses a Windchill BOM CSV (exported from the PLM) into a FLAT list with level + parentId.
// The tree is derived in memory (stack-by-level). See PRODFLOW-PROJECT-PLAN.md §7.5.

export interface IParsedBomLine {
  id: string;
  level: number; // 1 = TOP LEVEL (FID); 2..n = components
  parentId?: string; // last item of (level-1) in BOM order (undefined = root)
  findNumber?: string;
  pn: string; // BOM "Name" (Part Number)
  qtd: number; // BOM "Qty"
  unit?: string; // Unit Of Measure (first token, e.g. EA/FT)
  descricao: string; // BOM "Description"
  revision?: string; // BOM "Revision"
}

export interface IBomParseResult {
  lines: IParsedBomLine[];
  headerColumns: string[];
  skipped: number;
}

const HEADER_ALIASES: Record<string, string[]> = {
  level: ["level"],
  name: ["name"],
  qty: ["qty", "quantity"],
  description: ["description"],
  revision: ["revision", "rev"],
  findNumber: ["f/n", "fn", "find number"],
  unit: ["unit of measure", "uom", "unit"],
};

// RFC-4180-ish CSV parser — handles quoted fields with embedded commas and escaped quotes ("").
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Strips the Windchill `="..."` Excel wrapper (which prevents Excel auto-formatting part numbers).
function cleanCell(value: string): string {
  let s = (value ?? "").trim();
  if (s.charAt(0) === "=") s = s.slice(1);
  if (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') s = s.slice(1, -1);
  return s.trim();
}

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => cleanCell(c).toLowerCase());
    if (cells.indexOf("level") !== -1 && cells.indexOf("name") !== -1) {
      return i;
    }
  }
  return -1;
}

function mapColumns(headerCells: string[]): Record<string, number> {
  const cleaned = headerCells.map((c) => cleanCell(c).toLowerCase());
  const map: Record<string, number> = {};
  for (const key of Object.keys(HEADER_ALIASES)) {
    for (const alias of HEADER_ALIASES[key]) {
      const idx = cleaned.indexOf(alias);
      if (idx !== -1) {
        map[key] = idx;
        break;
      }
    }
  }
  return map;
}

export function parseBomCsv(text: string): IBomParseResult {
  const rows = parseCsv(text);
  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) {
    throw new Error(
      "BOM CSV: header row with 'Level' and 'Name' columns not found.",
    );
  }
  const cols = mapColumns(rows[headerIndex]);
  const headerColumns = rows[headerIndex].map((c) => cleanCell(c));

  const lines: IParsedBomLine[] = [];
  const stack: { level: number; id: string }[] = [];
  let skipped = 0;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const level = parseInt(cleanCell(row[cols.level] ?? ""), 10);
    const pn = cleanCell(row[cols.name] ?? "");
    if (!Number.isFinite(level) || pn === "") {
      skipped++;
      continue;
    }

    // Pop deeper/sibling levels so the parent is the nearest shallower ancestor.
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parentId = stack.length > 0 ? stack[stack.length - 1].id : undefined;
    const id = `bom-${i}`;

    const qtd = parseFloat(
      cols.qty !== undefined ? cleanCell(row[cols.qty] ?? "") : "",
    );
    const unitRaw =
      cols.unit !== undefined ? cleanCell(row[cols.unit] ?? "") : "";
    const fn =
      cols.findNumber !== undefined
        ? cleanCell(row[cols.findNumber] ?? "")
        : "";
    const rev =
      cols.revision !== undefined ? cleanCell(row[cols.revision] ?? "") : "";

    lines.push({
      id,
      level,
      parentId,
      findNumber: fn || undefined,
      pn,
      qtd: Number.isFinite(qtd) ? qtd : 1,
      unit: unitRaw ? unitRaw.split(" ")[0] : undefined,
      descricao:
        cols.description !== undefined
          ? cleanCell(row[cols.description] ?? "")
          : "",
      revision: rev || undefined,
    });

    stack.push({ level, id });
  }

  return { lines, headerColumns, skipped };
}

export interface IBomTreeNode extends IParsedBomLine {
  children: IBomTreeNode[];
}

// Derives the tree from the flat level/parentId list for indented render.
export function buildBomTree(lines: IParsedBomLine[]): IBomTreeNode[] {
  const byId = new Map<string, IBomTreeNode>();
  const roots: IBomTreeNode[] = [];
  for (const line of lines) {
    byId.set(line.id, { ...line, children: [] });
  }
  for (const line of lines) {
    const node = byId.get(line.id) as IBomTreeNode;
    const parent = line.parentId ? byId.get(line.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
