#!/usr/bin/env node
// CLI local: extrai conteudo completo de planilhas (com formulas) e documentos Word.
// Uso: node tools/office-reader/read-office.mjs <arquivo> [opcoes]  (--help para detalhes)

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const HELP = `
read-office — leitor completo de .xlsx / .xlsm / .csv / .docx

  node tools/office-reader/read-office.mjs <arquivo> [opcoes]

Opcoes gerais
  --format md|json|txt   Formato de saida (padrao: md)
  --out <arquivo>        Grava a saida em arquivo em vez do stdout
  --parts                Lista as partes internas do pacote OOXML (zip)
  --part <nome>          Imprime uma parte XML crua (ex.: xl/worksheets/sheet1.xml)
  --help                 Mostra esta ajuda

Planilhas (.xlsx / .xlsm / .csv)
  --sheet <nome|indice>  Processa apenas uma planilha
  --max-rows <n>         Limite de linhas por planilha (padrao: 500, 0 = sem limite)
  --max-cols <n>         Limite de colunas por planilha (padrao: 60, 0 = sem limite)
  --no-grid              Omite a grade de valores (mantem a lista de formulas)
  --no-formulas          Omite a lista de formulas
  --values-only          Mostra apenas resultados em cache, ignora formulas

Documentos (.docx)
  --no-extras            Omite metadados, cabecalhos/rodapes, notas e comentarios
`;

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const opts = {
    file: undefined,
    format: "md",
    out: undefined,
    parts: false,
    part: undefined,
    sheet: undefined,
    maxRows: 500,
    maxCols: 60,
    grid: true,
    formulas: true,
    valuesOnly: false,
    extras: true,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--help":
      case "-h":
        opts.help = true;
        break;
      case "--format":
        opts.format = argv[++i];
        break;
      case "--out":
        opts.out = argv[++i];
        break;
      case "--parts":
        opts.parts = true;
        break;
      case "--part":
        opts.part = argv[++i];
        break;
      case "--sheet":
        opts.sheet = argv[++i];
        break;
      case "--max-rows":
        opts.maxRows = Number(argv[++i]);
        break;
      case "--max-cols":
        opts.maxCols = Number(argv[++i]);
        break;
      case "--no-grid":
        opts.grid = false;
        break;
      case "--no-formulas":
        opts.formulas = false;
        break;
      case "--values-only":
        opts.valuesOnly = true;
        break;
      case "--no-extras":
        opts.extras = false;
        break;
      default:
        if (a.startsWith("--")) throw new Error(`Opcao desconhecida: ${a}`);
        if (opts.file === undefined) opts.file = a;
        else throw new Error(`Argumento inesperado: ${a}`);
    }
  }
  return opts;
}

// Resolve dependencias tanto no node_modules local quanto no da raiz do repo.
async function load(name) {
  try {
    return (await import(name)).default ?? (await import(name));
  } catch {
    throw new Error(
      `Dependencia "${name}" nao encontrada. Rode: npm install --prefix tools/office-reader`,
    );
  }
}

// ---------------------------------------------------------------- helpers

const colLetter = (n) => {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const decodeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

const mdEscape = (s) =>
  String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ⏎ ");

// ---------------------------------------------------------------- planilhas

function cellToPlain(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  if (Array.isArray(value.richText))
    return value.richText.map((r) => r.text).join("");
  if (value.error) return value.error;
  if (value.hyperlink !== undefined) return value.text ?? value.hyperlink ?? "";
  if (value.formula !== undefined || value.sharedFormula !== undefined)
    return cellToPlain(value.result);
  if (value.result !== undefined) return cellToPlain(value.result);
  return JSON.stringify(value);
}

function readCell(cell) {
  const v = cell.value;
  const info = { address: cell.address, value: cellToPlain(v) };
  if (v && typeof v === "object") {
    // cell.formula traduz as formulas compartilhadas para o endereco atual.
    let f;
    try {
      f = cell.formula;
    } catch {
      f = v.formula;
    }
    if (f) info.formula = `=${f}`;
    else if (v.sharedFormula)
      info.formula = `=<compartilhada de ${v.sharedFormula}>`;
    if (v.sharedFormula) info.sharedFrom = v.sharedFormula;
    if (v.error) info.error = v.error;
    if (v.hyperlink) info.hyperlink = v.hyperlink;
    if (Array.isArray(v.richText)) info.richText = true;
  }
  if (cell.numFmt) info.numFmt = cell.numFmt;
  if (cell.note)
    info.note =
      typeof cell.note === "string" ? cell.note : cellToPlain(cell.note);
  if (cell.isMerged && cell.master && cell.master.address !== cell.address)
    info.mergedInto = cell.master.address;
  return info;
}

async function readSpreadsheet(file, opts) {
  const ExcelJS = await load("exceljs");
  const wb = new ExcelJS.Workbook();
  const ext = path.extname(file).toLowerCase();
  if (ext === ".csv") await wb.csv.readFile(file);
  else await wb.xlsx.readFile(file);

  const doc = {
    kind: "spreadsheet",
    file: path.basename(file),
    properties: {
      creator: wb.creator,
      lastModifiedBy: wb.lastModifiedBy,
      created: wb.created,
      modified: wb.modified,
      calcProperties: wb.calcProperties,
    },
    definedNames: [],
    sheets: [],
  };

  try {
    const model = wb.definedNames?.model;
    if (Array.isArray(model))
      doc.definedNames = model.map((d) => ({ name: d.name, ranges: d.ranges }));
  } catch {
    /* definedNames é opcional */
  }

  wb.eachSheet((ws) => {
    if (opts.sheet !== undefined) {
      const wanted = String(opts.sheet);
      if (ws.name !== wanted && String(ws.id) !== wanted) return;
    }

    const lastRow = ws.actualRowCount ? ws.rowCount : 0;
    const lastCol = ws.actualColumnCount ? ws.columnCount : 0;
    const rowLimit =
      opts.maxRows > 0 ? Math.min(lastRow, opts.maxRows) : lastRow;
    const colLimit =
      opts.maxCols > 0 ? Math.min(lastCol, opts.maxCols) : lastCol;

    const sheet = {
      name: ws.name,
      state: ws.state,
      rowCount: lastRow,
      columnCount: lastCol,
      truncated: { rows: lastRow > rowLimit, cols: lastCol > colLimit },
      merges: Object.keys(ws.model?.merges ?? {}).length
        ? Object.values(ws.model.merges)
        : (ws.model?.merges ?? []),
      columns: [],
      hiddenRows: [],
      rows: [],
      formulas: [],
      hyperlinks: [],
      notes: [],
      dataValidations: [],
      conditionalFormatting: [],
      tables: [],
    };

    for (let c = 1; c <= colLimit; c++) {
      const col = ws.getColumn(c);
      if (col && (col.width || col.hidden))
        sheet.columns.push({
          ref: colLetter(c),
          width: col.width,
          hidden: !!col.hidden,
        });
    }

    for (let r = 1; r <= rowLimit; r++) {
      const row = ws.getRow(r);
      if (row.hidden) sheet.hiddenRows.push(r);
      const cells = [];
      for (let c = 1; c <= colLimit; c++) {
        const cell = row.getCell(c);
        if (cell.value === null || cell.value === undefined) {
          cells.push("");
          continue;
        }
        const info = readCell(cell);
        // Numa faixa mesclada o ExcelJS repete o valor do master em todas as celulas.
        if (info.mergedInto) {
          cells.push("↞");
          continue;
        }
        cells.push(
          info.formula && !opts.valuesOnly && info.value === ""
            ? info.formula
            : String(info.value),
        );
        if (info.formula && !opts.valuesOnly)
          sheet.formulas.push({
            address: info.address,
            formula: info.formula,
            result: info.value,
            numFmt: info.numFmt,
          });
        if (info.hyperlink)
          sheet.hyperlinks.push({ address: info.address, url: info.hyperlink });
        if (info.note)
          sheet.notes.push({ address: info.address, note: info.note });
      }
      if (cells.some((v) => v !== "" && v !== "↞"))
        sheet.rows.push({ n: r, cells });
    }

    try {
      const dv = ws.dataValidations?.model ?? {};
      sheet.dataValidations = Object.entries(dv).map(([address, rule]) => ({
        address,
        ...rule,
      }));
    } catch {
      /* opcional */
    }
    try {
      sheet.conditionalFormatting = (ws.conditionalFormattings ?? []).map(
        (cf) => ({
          ref: cf.ref,
          rules: (cf.rules ?? []).map((r) => ({
            type: r.type,
            operator: r.operator,
            formulae: r.formulae,
          })),
        }),
      );
    } catch {
      /* opcional */
    }
    try {
      const tables = ws.tables ?? {};
      sheet.tables = Object.values(tables).map((t) => {
        const m = t.table ?? t;
        return {
          name: m.name,
          ref: m.ref,
          columns: (m.columns ?? []).map((c) => c.name),
        };
      });
    } catch {
      /* opcional */
    }

    doc.sheets.push(sheet);
  });

  if (opts.sheet !== undefined && doc.sheets.length === 0)
    throw new Error(`Planilha "${opts.sheet}" nao encontrada.`);
  return doc;
}

function spreadsheetToMarkdown(doc, opts) {
  const out = [`# ${doc.file}`, ""];
  const p = doc.properties;
  const meta = [
    p.creator && `autor: ${p.creator}`,
    p.lastModifiedBy && `modificado por: ${p.lastModifiedBy}`,
    p.modified && `modificado em: ${new Date(p.modified).toISOString()}`,
    `planilhas: ${doc.sheets.length}`,
  ].filter(Boolean);
  out.push(meta.join(" · "), "");

  if (doc.definedNames.length) {
    out.push("## Nomes definidos", "");
    for (const d of doc.definedNames)
      out.push(`- \`${d.name}\` → ${(d.ranges ?? []).join(", ")}`);
    out.push("");
  }

  for (const s of doc.sheets) {
    out.push(`## Planilha: ${s.name}`, "");
    out.push(
      `Dimensao: ${s.rowCount} linhas × ${s.columnCount} colunas` +
        (s.state && s.state !== "visible" ? ` · estado: ${s.state}` : "") +
        (s.truncated.rows || s.truncated.cols ? " · **saida truncada**" : ""),
      "",
    );

    if (opts.grid && s.rows.length) {
      const nCols = Math.max(...s.rows.map((r) => r.cells.length));
      out.push(
        `| # | ${Array.from({ length: nCols }, (_, i) => colLetter(i + 1)).join(" | ")} |`,
      );
      out.push(`|---|${Array.from({ length: nCols }, () => "---").join("|")}|`);
      for (const r of s.rows)
        out.push(`| ${r.n} | ${r.cells.map((c) => mdEscape(c)).join(" | ")} |`);
      out.push("");
    }

    if (opts.formulas && s.formulas.length) {
      out.push(`### Formulas (${s.formulas.length})`, "");
      for (const f of s.formulas)
        out.push(
          `- \`${f.address}\`: \`${f.formula}\` → ${JSON.stringify(f.result)}` +
            (f.numFmt ? ` _(fmt: ${f.numFmt})_` : ""),
        );
      out.push("");
    }

    const merges = Array.isArray(s.merges) ? s.merges : [];
    if (merges.length) {
      const shown = merges.slice(0, 40).join(", ");
      const rest = merges.length > 40 ? ` … (+${merges.length - 40})` : "";
      out.push(`**Mesclagens (${merges.length}):** ${shown}${rest}`, "");
    }
    if (s.columns.length)
      out.push(
        `**Colunas:** ${s.columns.map((c) => `${c.ref}${c.hidden ? " (oculta)" : ""}${c.width ? ` w=${c.width}` : ""}`).join(", ")}`,
        "",
      );
    if (s.hiddenRows.length)
      out.push(`**Linhas ocultas:** ${s.hiddenRows.join(", ")}`, "");
    if (s.tables.length) {
      out.push("**Tabelas:**", "");
      for (const t of s.tables)
        out.push(`- \`${t.name}\` (${t.ref}): ${(t.columns ?? []).join(", ")}`);
      out.push("");
    }
    if (s.dataValidations.length) {
      out.push(`**Validacoes de dados (${s.dataValidations.length}):**`, "");
      for (const v of s.dataValidations)
        out.push(
          `- \`${v.address}\`: ${v.type}${v.operator ? ` ${v.operator}` : ""} ${JSON.stringify(v.formulae ?? "")}`,
        );
      out.push("");
    }
    if (s.conditionalFormatting.length) {
      out.push(
        `**Formatacao condicional (${s.conditionalFormatting.length}):**`,
        "",
      );
      for (const cf of s.conditionalFormatting)
        out.push(
          `- ${cf.ref}: ${cf.rules.map((r) => `${r.type}${r.operator ? ` ${r.operator}` : ""} ${JSON.stringify(r.formulae ?? "")}`).join(" | ")}`,
        );
      out.push("");
    }
    if (s.hyperlinks.length) {
      out.push("**Hyperlinks:**", "");
      for (const h of s.hyperlinks) out.push(`- \`${h.address}\` → ${h.url}`);
      out.push("");
    }
    if (s.notes.length) {
      out.push("**Notas:**", "");
      for (const n of s.notes) out.push(`- \`${n.address}\`: ${n.note}`);
      out.push("");
    }
  }
  return out.join("\n");
}

function spreadsheetToText(doc) {
  const out = [];
  for (const s of doc.sheets) {
    out.push(`=== ${s.name} ===`);
    for (const r of s.rows) out.push(r.cells.join("\t"));
    out.push("");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------- docx

function htmlToMarkdown(html) {
  let s = html;
  s = s.replace(/<img[^>]*>/gi, "[imagem]");
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, body) => {
    const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
      [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
        mdEscape(inlineToMarkdown(c[1]).trim()),
      ),
    );
    if (!rows.length) return "";
    const width = Math.max(...rows.map((r) => r.length));
    const pad = (r) => [...r, ...Array(width - r.length).fill("")];
    const lines = [
      `| ${pad(rows[0]).join(" | ")} |`,
      `|${Array(width).fill("---").join("|")}|`,
    ];
    for (const r of rows.slice(1)) lines.push(`| ${pad(r).join(" | ")} |`);
    return `\n\n${lines.join("\n")}\n\n`;
  });
  s = s.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, lvl, t) =>
      `\n\n${"#".repeat(Number(lvl))} ${inlineToMarkdown(t).trim()}\n`,
  );
  s = s.replace(
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    (_, t) => `\n- ${inlineToMarkdown(t).trim()}`,
  );
  s = s.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");
  s = s.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_, t) => `\n\n${inlineToMarkdown(t).trim()}`,
  );
  s = inlineToMarkdown(s);
  // Entidades sao decodificadas so aqui, no fim, para nao virarem tags e serem removidas.
  return decodeXml(s)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Converte marcacao inline em markdown. Nao decodifica entidades (ver htmlToMarkdown).
function inlineToMarkdown(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "_$2_")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, "^$1")
    .replace(/<sub>([\s\S]*?)<\/sub>/gi, "~$1")
    .replace(/<[^>]+>/g, "");
}

// Extrai texto por paragrafo de qualquer parte WordprocessingML.
function wordXmlToLines(xml) {
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\s*\/>/g)]
    .map((m) =>
      [...m[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((t) => decodeXml(t[1]))
        .join("")
        .trim(),
    )
    .filter(Boolean);
}

// Compara so letras/numeros: ignora markdown, espacos e pontuacao inseridos pelo conversor.
const textKey = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

async function readDocx(file, opts) {
  const mammoth = await load("mammoth");
  const { value: html, messages } = await mammoth.convertToHtml(
    { path: file },
    { convertImage: mammoth.images.imgElement(() => ({ src: "" })) },
  );

  const doc = {
    kind: "document",
    file: path.basename(file),
    body: htmlToMarkdown(html),
    warnings: messages.map((m) => `${m.type}: ${m.message}`),
    properties: {},
    headers: [],
    footers: [],
    footnotes: [],
    endnotes: [],
    comments: [],
    unconverted: [],
  };
  if (!opts.extras) return doc;

  const JSZip = await load("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));

  const core = zip.file("docProps/core.xml");
  if (core) {
    const xml = await core.async("string");
    // [^<]* garante que so elementos-folha casem (o container cp:coreProperties e ignorado).
    for (const [, tag, val] of xml.matchAll(
      /<(?:dc|cp|dcterms):([\w]+)[^>]*>([^<]*)<\/(?:dc|cp|dcterms):\1>/g,
    ))
      doc.properties[tag] = decodeXml(val);
  }
  const app = zip.file("docProps/app.xml");
  if (app) {
    const xml = await app.async("string");
    for (const tag of ["Pages", "Words", "Company", "Application"]) {
      const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      if (m) doc.properties[tag.toLowerCase()] = decodeXml(m[1]);
    }
  }

  const buckets = [
    [/^word\/header\d*\.xml$/, "headers"],
    [/^word\/footer\d*\.xml$/, "footers"],
    [/^word\/footnotes\.xml$/, "footnotes"],
    [/^word\/endnotes\.xml$/, "endnotes"],
    [/^word\/comments\.xml$/, "comments"],
  ];
  for (const name of Object.keys(zip.files)) {
    const hit = buckets.find(([re]) => re.test(name));
    if (!hit) continue;
    const lines = wordXmlToLines(await zip.file(name).async("string"));
    if (lines.length) doc[hit[1]].push({ part: name, lines });
  }

  // Rede de seguranca: mammoth e um conversor semantico e descarta caixas de texto,
  // content controls e campos. Aqui listamos o que sobrou no XML cru.
  const body = zip.file("word/document.xml");
  if (body) {
    const bodyKey = textKey(doc.body);
    doc.unconverted = wordXmlToLines(await body.async("string")).filter((l) => {
      const k = textKey(l);
      return k && !bodyKey.includes(k);
    });
  }
  return doc;
}

function documentToMarkdown(doc) {
  const out = [`# ${doc.file}`, ""];
  const p = doc.properties;
  const meta = Object.entries(p)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (meta.length) out.push(meta.join(" · "), "");

  for (const [key, label] of [
    ["headers", "Cabecalhos"],
    ["footers", "Rodapes"],
  ]) {
    for (const b of doc[key])
      out.push(`> **${label} (${b.part})**: ${b.lines.join(" / ")}`, "");
  }

  out.push("---", "", doc.body, "");

  for (const [key, label] of [
    ["footnotes", "Notas de rodape"],
    ["endnotes", "Notas de fim"],
    ["comments", "Comentarios"],
  ]) {
    for (const b of doc[key]) {
      out.push(`## ${label} (${b.part})`, "");
      for (const l of b.lines) out.push(`- ${l}`);
      out.push("");
    }
  }
  if (doc.unconverted.length) {
    out.push(
      `## Conteudo bruto nao convertido (${doc.unconverted.length})`,
      "",
      "_Paragrafos presentes em word/document.xml mas ausentes do corpo convertido (caixas de texto, campos, content controls)._",
      "",
      ...doc.unconverted.map((l) => `- ${l}`),
      "",
    );
  }
  if (doc.warnings.length)
    out.push(
      "## Avisos do parser",
      "",
      ...doc.warnings.map((w) => `- ${w}`),
      "",
    );
  return out.join("\n");
}

// ---------------------------------------------------------------- partes OOXML

async function listParts(file) {
  const JSZip = await load("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  return Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => `${f.name}`)
    .sort()
    .join("\n");
}

async function readPart(file, part) {
  const JSZip = await load("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const entry = zip.file(part);
  if (!entry)
    throw new Error(`Parte "${part}" nao existe. Use --parts para listar.`);
  return entry.async("string");
}

// ---------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.file) {
    process.stdout.write(HELP);
    return;
  }

  const file = path.resolve(opts.file);
  if (!fs.existsSync(file)) throw new Error(`Arquivo nao encontrado: ${file}`);
  const ext = path.extname(file).toLowerCase();
  if ([".doc", ".xls", ".ppt"].includes(ext))
    throw new Error(
      `Formato binario legado (${ext}) nao suportado. Converta para ${ext}x primeiro.`,
    );

  let output;
  if (opts.part) output = await readPart(file, opts.part);
  else if (opts.parts) output = await listParts(file);
  else if (ext === ".docx") {
    const doc = await readDocx(file, opts);
    output =
      opts.format === "json"
        ? JSON.stringify(doc, null, 2)
        : opts.format === "txt"
          ? doc.body
          : documentToMarkdown(doc);
  } else if ([".xlsx", ".xlsm", ".csv"].includes(ext)) {
    const doc = await readSpreadsheet(file, opts);
    output =
      opts.format === "json"
        ? JSON.stringify(doc, null, 2)
        : opts.format === "txt"
          ? spreadsheetToText(doc)
          : spreadsheetToMarkdown(doc, opts);
  } else {
    throw new Error(`Extensao nao suportada: ${ext}`);
  }

  if (opts.out) {
    fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.out), output, "utf8");
    process.stdout.write(
      `Escrito em ${opts.out} (${output.length} caracteres)\n`,
    );
  } else {
    process.stdout.write(output + "\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Erro: ${err.message}\n`);
  process.exitCode = 1;
});
