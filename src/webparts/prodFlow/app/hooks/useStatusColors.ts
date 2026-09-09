import * as React from "react";
import { Phase, RequestStatus, SubItemStatus, WorkflowKind } from "../models";
import { REQUEST_STATUS_MAP, SUB_ITEM_STATUS_MAP } from "../config/statuses";
import { phaseDef } from "../config/phases";
import { useConfigStore } from "../stores/useConfigStore";

export interface IColorLabel {
  label: string;
  color: string;
}

export interface IStatusColors {
  requestStatus: (status: RequestStatus) => IColorLabel;
  subItemStatus: (status: SubItemStatus) => IColorLabel;
  phase: (phase: Phase, flow?: WorkflowKind) => IColorLabel;
}

const FALLBACK = "#64748b";

// `Completed`, `OnHold`, `InFabrication` and `ExternalService` exist in both status unions,
// so overrides are namespaced to keep them independent.
export function requestColorKey(status: RequestStatus): string {
  return `request:${status}`;
}
export function subItemColorKey(status: SubItemStatus): string {
  return `subitem:${status}`;
}
export function phaseColorKey(flow: WorkflowKind, phase: Phase): string {
  return `phase:${flow}:${phase}`;
}

// Config-driven status/phase colors + labels. Components must read colors from here (not inline hex).
export function useStatusColors(): IStatusColors {
  const overrides = useConfigStore((s) => s.config?.statusColors);

  return React.useMemo<IStatusColors>(() => {
    const pick = (key: string, seed: string): string =>
      overrides?.[key] ?? seed;
    return {
      requestStatus: (status: RequestStatus): IColorLabel => {
        const def = REQUEST_STATUS_MAP[status];
        return def
          ? {
              label: def.label,
              color: pick(requestColorKey(status), def.color),
            }
          : { label: status, color: FALLBACK };
      },
      subItemStatus: (status: SubItemStatus): IColorLabel => {
        const def = SUB_ITEM_STATUS_MAP[status];
        return def
          ? {
              label: def.label,
              color: pick(subItemColorKey(status), def.color),
            }
          : { label: status, color: FALLBACK };
      },
      phase: (
        phase: Phase,
        flow: WorkflowKind = "fabrication",
      ): IColorLabel => {
        const def = phaseDef(flow, phase);
        return {
          label: def.label,
          color: pick(phaseColorKey(flow, phase), def.color),
        };
      },
    };
  }, [overrides]);
}
