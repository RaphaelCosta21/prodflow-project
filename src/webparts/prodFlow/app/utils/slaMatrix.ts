import { Attendance, SlaAttendance } from "../models";

// Híbrido = pior caso entre os dois lados; "A definir" ainda não tem prazo contratual.
export function slaFromRow(
  row: Record<SlaAttendance, number>,
  attendance: Attendance,
): number {
  if (attendance === "A definir") return 0;
  if (attendance === "Híbrido") return Math.max(row.Interna, row.Externa);
  return row[attendance];
}
