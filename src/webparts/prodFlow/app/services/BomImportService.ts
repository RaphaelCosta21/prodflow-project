import { Attendance, ISubItem } from "../models";
import { parseBomCsv, IParsedBomLine } from "../utils/bomParser";

// Converts a Windchill BOM CSV into ISubItem[] (flat level/parentId). Strategy is left blank —
// the locked make/buy dropdown is filled by Planning (PCP). Sensible defaults for the rest.
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
