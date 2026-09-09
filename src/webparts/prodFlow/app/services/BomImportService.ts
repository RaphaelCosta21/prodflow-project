import { Attendance, ISubItem } from "../models";
import { parseBomCsv, IParsedBomLine } from "../utils/bomParser";

// Converts a BOM CSV (exported from the engineering TOP LEVEL) into ISubItem[] (flat
// level/parentId). Strategy is left blank — the locked make/buy dropdown is filled by
// Planning. Sensible defaults for the rest.
export class BomImportService {
  public static fromCsv(
    csvText: string,
    defaultAttendance: Attendance,
  ): ISubItem[] {
    const { lines } = parseBomCsv(csvText);
    return lines.map((line) =>
      BomImportService.toSubItem(line, defaultAttendance),
    );
  }

  // Builds a single sub-item from manual entry (build/insert BOM without a CSV).
  public static manual(input: {
    pn: string;
    descricao: string;
    qtd: number;
    unit?: string;
    revision?: string;
    parentId?: string;
    level: number;
    findNumber?: string;
    attendance: Attendance;
  }): ISubItem {
    const rand = Math.floor(Math.random() * 1e6).toString(36);
    return {
      id: `man-${Date.now().toString(36)}-${rand}`,
      level: input.level,
      parentId: input.parentId,
      findNumber: input.findNumber,
      pn: input.pn,
      qtd: Number.isFinite(input.qtd) && input.qtd > 0 ? input.qtd : 1,
      unit: input.unit || undefined,
      descricao: input.descricao,
      drawing: { code: input.pn, revision: input.revision ?? "" },
      attendance: input.attendance,
      complexity: "A definir",
      status: "NotStarted",
      fabChecklist: [],
    };
  }

  private static toSubItem(
    line: IParsedBomLine,
    attendance: Attendance,
  ): ISubItem {
    return {
      id: line.id,
      level: line.level,
      parentId: line.parentId,
      findNumber: line.findNumber,
      pn: line.pn,
      qtd: line.qtd,
      unit: line.unit,
      descricao: line.descricao,
      drawing: { code: line.pn, revision: line.revision ?? "" },
      attendance,
      complexity: "A definir",
      status: "NotStarted",
      fabChecklist: [],
    };
  }
}
