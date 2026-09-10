import { PDFFont, PDFPage, RGB, rgb } from "pdf-lib";

export interface IBox {
  x: number;
  /** Bottom edge, PDF coordinates (origin at the bottom-left of the page). */
  y: number;
  width: number;
  height: number;
}

export type TextAlign = "left" | "center" | "right";

export interface ITextStyle {
  font: PDFFont;
  size: number;
  color: RGB;
  align?: TextAlign;
  maxLines?: number;
  minSize?: number;
  padding?: number;
}

export function hexColor(hex: string): RGB {
  const n = parseInt(hex, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// StandardFonts are WinAnsi-encoded; anything outside that repertoire makes pdf-lib throw.
const WINANSI_ABOVE_FF =
  "\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152" +
  "\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A" +
  "\u0153\u017E\u0178";

export function sanitizeText(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value.charAt(i);
    const code = value.charCodeAt(i);
    if (code === 0x2007 || code === 0x202f) out += " ";
    else if (code <= 0xff || WINANSI_ABOVE_FF.indexOf(ch) >= 0) out += ch;
    else out += "?";
  }
  return out;
}

function widthOf(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

function longestWordWidth(text: string, font: PDFFont, size: number): number {
  return text
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, widthOf(word, font, size)), 0);
}

export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (widthOf(candidate, font, size) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
      // A single token longer than the cell still has to be broken somewhere.
      while (widthOf(current, font, size) > maxWidth && current.length > 1) {
        let cut = current.length - 1;
        while (cut > 1 && widthOf(current.slice(0, cut), font, size) > maxWidth)
          cut--;
        lines.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    }
    lines.push(current);
  }
  return lines;
}

export const LINE_SPACING = 1.15;

/** Shrinks the font until the text fits both `maxLines` and the box, then clips the overflow. */
function fitLines(
  text: string,
  style: ITextStyle,
  maxWidth: number,
  maxHeight: number,
): { lines: string[]; size: number } {
  const minSize = style.minSize ?? Math.max(5, style.size - 3);
  let size = style.size;
  // Shrink first so wrapping never has to break inside a word (PNs and money values are one token).
  while (
    size > minSize &&
    longestWordWidth(text, style.font, size) > maxWidth
  ) {
    size = Math.round((size - 0.25) * 100) / 100;
  }
  const fits = (lines: string[], at: number): boolean => {
    const allowed = Math.min(
      style.maxLines ?? 1,
      Math.max(1, Math.floor(maxHeight / (at * LINE_SPACING))),
    );
    return lines.length <= allowed;
  };
  let lines = wrapText(text, style.font, size, maxWidth);
  while (!fits(lines, size) && size > minSize) {
    size = Math.round((size - 0.25) * 100) / 100;
    lines = wrapText(text, style.font, size, maxWidth);
  }
  const allowed = Math.min(
    style.maxLines ?? 1,
    Math.max(1, Math.floor(maxHeight / (size * LINE_SPACING))),
  );
  if (lines.length > allowed) lines = lines.slice(0, allowed);
  return { lines, size };
}

export function drawText(
  page: PDFPage,
  box: IBox,
  value: string,
  style: ITextStyle,
): void {
  const text = sanitizeText(value);
  if (!text.trim()) return;
  const padding = style.padding ?? 2;
  const maxWidth = box.width - padding * 2;
  if (maxWidth <= 0) return;

  const { lines, size } = fitLines(
    text,
    style,
    maxWidth,
    box.height - padding * 2,
  );
  const lineHeight = size * LINE_SPACING;
  const blockHeight = lines.length * lineHeight;
  let baseline =
    box.y + box.height / 2 + blockHeight / 2 - lineHeight + size * 0.25;

  for (const line of lines) {
    const w = widthOf(line, style.font, size);
    let x = box.x + padding;
    if (style.align === "center") x = box.x + (box.width - w) / 2;
    else if (style.align === "right") x = box.x + box.width - padding - w;
    page.drawText(line, {
      x,
      y: baseline,
      size,
      font: style.font,
      color: style.color,
    });
    baseline -= lineHeight;
  }
}

export function drawCell(
  page: PDFPage,
  box: IBox,
  options: { fill?: RGB; border?: RGB; borderWidth?: number },
): void {
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    color: options.fill,
    borderColor: options.border,
    borderWidth: options.border ? (options.borderWidth ?? 1) : undefined,
  });
}

/** Left edge of column `index` given a column-width array. */
export function columnOffset(cols: readonly number[], index: number): number {
  let offset = 0;
  for (let i = 0; i < index; i++) offset += cols[i];
  return offset;
}

export function columnSpanWidth(
  cols: readonly number[],
  index: number,
  span: number,
): number {
  let width = 0;
  for (let i = index; i < index + span; i++) width += cols[i];
  return width;
}
