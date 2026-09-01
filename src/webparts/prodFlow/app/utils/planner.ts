import { IFabricationRequest, ISubItem } from "../models";
import { leavesOf } from "./kpis";

const DAY = 86400000;

export interface IGanttRow {
  id: string;
  label: string;
  sub: string;
  start: number;
  end: number;
  progress: number; // 0..1
  color: string;
}

const time = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  return isNaN(t) ? undefined : t;
};

// Monday of the week containing `t` (UTC), used as the bucket key for capacity load.
export function weekStart(t: number): number {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

// padStart is unavailable under the rig's lib target.
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function weekLabel(t: number): string {
  const d = new Date(t);
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}`;
}

export function weekRange(from: number, to: number): number[] {
  const weeks: number[] = [];
  for (let w = weekStart(from); w <= weekStart(to); w += 7 * DAY) weeks.push(w);
  return weeks;
}

function laneOf(s: ISubItem): string {
  if (s.makeSite === "Subcon") return "SUBCON";
  if (s.makeSite === "InHouse") return "Workshop (In-House)";
  if (s.attendance === "Externa") return "Externa";
  return "Interna";
}

// Capacity load: how many sub-items are in fabrication in each week, per execution lane.
export function buildWeeklyLoad(
  requests: IFabricationRequest[],
  maxWeeks = 16,
): { id: string; data: { x: string; y: number }[] }[] {
  interface IRun {
    lane: string;
    start: number;
    end: number;
  }
  const runs: IRun[] = [];
  for (const r of requests) {
    for (const s of leavesOf(r.subItems)) {
      const start = time(s.dataInicioFab);
      const end =
        time(s.dataFimFab) ?? (start !== undefined ? start : undefined);
      if (start === undefined || end === undefined) continue;
      runs.push({ lane: laneOf(s), start, end: Math.max(start, end) });
    }
  }
  if (runs.length === 0) return [];

  const min = Math.min.apply(
    null,
    runs.map((r) => r.start),
  );
  const max = Math.max.apply(
    null,
    runs.map((r) => r.end),
  );
  const weeks = weekRange(min, max).slice(0, maxWeeks);
  const lanes: string[] = [];
  for (const r of runs) if (lanes.indexOf(r.lane) < 0) lanes.push(r.lane);

  return lanes.map((lane) => ({
    id: lane,
    data: weeks.map((w) => ({
      x: weekLabel(w),
      y: runs.filter(
        (r) => r.lane === lane && r.start <= w + 7 * DAY - 1 && r.end >= w,
      ).length,
    })),
  }));
}

// Gantt rows from sub-items that have a planned fabrication window.
export function buildGanttRows(
  requests: IFabricationRequest[],
  statusColor: (s: ISubItem) => string,
): IGanttRow[] {
  const rows: IGanttRow[] = [];
  for (const r of requests) {
    for (const s of leavesOf(r.subItems)) {
      const start = time(s.dataInicioFab);
      const end = time(s.dataFimFab);
      if (start === undefined || end === undefined) continue;
      const done = (s.fabChecklist ?? []).filter((c) => c.done).length;
      const total = (s.fabChecklist ?? []).length;
      rows.push({
        id: `${r.fid}-${s.id}`,
        label: s.pn,
        sub: `${r.fid} · ${s.descricao}`,
        start,
        end: Math.max(start + DAY, end),
        progress: total ? done / total : 0,
        color: statusColor(s),
      });
    }
  }
  return rows.sort((a, b) => a.start - b.start);
}
