import * as React from "react";
import { Phase, RequestStatus, SubItemStatus } from "../models";
import { REQUEST_STATUS_MAP, SUB_ITEM_STATUS_MAP } from "../config/statuses";
import { PHASES } from "../config/phases";

export interface IColorLabel {
  label: string;
  color: string;
}

export interface IStatusColors {
  requestStatus: (status: RequestStatus) => IColorLabel;
  subItemStatus: (status: SubItemStatus) => IColorLabel;
  phase: (phase: Phase) => IColorLabel;
}

const FALLBACK = "#64748b";

// Config-driven status/phase colors + labels. Components must read colors from here (not inline hex).
export function useStatusColors(): IStatusColors {
  return React.useMemo<IStatusColors>(() => {
    const phaseMap = new Map<Phase, IColorLabel>();
    for (const p of PHASES) {
      phaseMap.set(p.phase, { label: p.label, color: p.color });
    }
    return {
      requestStatus: (status: RequestStatus): IColorLabel => {
        const def = REQUEST_STATUS_MAP[status];
        return def
          ? { label: def.label, color: def.color }
          : { label: status, color: FALLBACK };
      },
      subItemStatus: (status: SubItemStatus): IColorLabel => {
        const def = SUB_ITEM_STATUS_MAP[status];
        return def
          ? { label: def.label, color: def.color }
          : { label: status, color: FALLBACK };
      },
      phase: (phase: Phase): IColorLabel =>
        phaseMap.get(phase) ?? { label: `Fase ${phase}`, color: FALLBACK },
    };
  }, []);
}
