import * as React from "react";
import { useAccessLevel } from "./useAccessLevel";
import { RequestStatus } from "../models";
import { canTeamTransition, nextRequestStatuses } from "../utils/statusHelpers";
import { ownersOf } from "../config/statusOwners";
import { TEAMS } from "../config/teams";

export interface IStatusPermissions {
  allowed: RequestStatus[];
  canMoveTo: (to: RequestStatus) => boolean;
  ownerLabel: (to: RequestStatus) => string;
  isAdmin: boolean;
}

/** Combines the state machine (§12.1) with the team that owns each transition. */
export function useStatusPermissions(from: RequestStatus): IStatusPermissions {
  const { teams, isAdmin } = useAccessLevel();

  return React.useMemo(() => {
    const allowed = nextRequestStatuses(from);
    return {
      allowed,
      isAdmin,
      canMoveTo: (to: RequestStatus) => canTeamTransition(to, teams, isAdmin),
      ownerLabel: (to: RequestStatus) =>
        ownersOf(to)
          .map((t) => TEAMS[t].label)
          .join(" / "),
    };
  }, [from, teams, isAdmin]);
}

export default useStatusPermissions;
