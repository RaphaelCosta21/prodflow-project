import { IFabricationRequest, ISubItem } from "../models";
import { StrategyKey, strategyKeyOf } from "../config/strategyOptions";
import { leavesOf } from "./kpis";

// One BOM leaf paired with the FID that owns it — the row shape every team view renders.
export interface ICrossFidRow {
  id: string;
  fid: string;
  request: IFabricationRequest;
  subItem: ISubItem;
  strategyKey: StrategyKey | "";
}

export function flattenLeaves(requests: IFabricationRequest[]): ICrossFidRow[] {
  const rows: ICrossFidRow[] = [];
  for (const request of requests) {
    for (const subItem of leavesOf(request.subItems)) {
      rows.push({
        id: `${request.fid}::${subItem.id}`,
        fid: request.fid,
        request,
        subItem,
        strategyKey: strategyKeyOf(
          subItem.strategy,
          subItem.buyType,
          subItem.makeSite,
        ),
      });
    }
  }
  return rows;
}

export function matchesSearch(row: ICrossFidRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const s = row.subItem;
  return (
    row.fid.toLowerCase().indexOf(q) >= 0 ||
    s.pn.toLowerCase().indexOf(q) >= 0 ||
    (s.descricao || "").toLowerCase().indexOf(q) >= 0 ||
    (s.rcOrSr || "").toLowerCase().indexOf(q) >= 0 ||
    (s.poOrWo || "").toLowerCase().indexOf(q) >= 0 ||
    (s.serialNumber || "").toLowerCase().indexOf(q) >= 0 ||
    (row.request.osNumber || "").toLowerCase().indexOf(q) >= 0
  );
}
