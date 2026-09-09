import * as React from "react";
import { useAccessLevel } from "./useAccessLevel";
import { RequestStatus, WorkflowKind } from "../models";
import { canTeamTransition, nextRequestStatuses } from "../utils/statusHelpers";
import { ownersOf } from "../config/statusOwners";
import { TEAMS } from "../config/teams";

export interface IStatusPermissions {
  allowed: RequestStatus[];
  canMoveTo: (to: RequestStatus) => boolean;
  ownerLabel: (to: RequestStatus) => string;
  isAdmin: boolean;
}

/** Combines the workflow state machine with the team that owns each transition. */
export function useStatusPermissions(
  from: RequestStatus,
  flow: WorkflowKind,
  resumeStatus?: RequestStatus,
): IStatusPermissions {
  const { teams, isAdmin } = useAccessLevel();

  return React.useMemo(() => {
    const allowed = nextRequestStatuses(from, flow, resumeStatus);
    return {
      allowed,
      isAdmin,
      canMoveTo: (to: RequestStatus) => canTeamTransition(to, teams, isAdmin),
      ownerLabel: (to: RequestStatus) =>
        ownersOf(to)
          .map((t) => TEAMS[t].label)
          .join(" / "),
    };
  }, [from, flow, resumeStatus, teams, isAdmin]);
}

export default useStatusPermissions;
