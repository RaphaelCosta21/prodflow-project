import * as React from "react";
import { AccessLevel, ITeamMember } from "../models";
import { TeamKey } from "../config/teams";
import { useMembers, useAppConfig } from "../api/config";
import { BUILT_IN_SUPER_ADMINS } from "../config/appConfigDefaults";
import { AccessArea, AccessPermission } from "../stores/useConfigStore";
import { useCurrentUser } from "./useCurrentUser";

export interface IAccessLevel {
  member?: ITeamMember;
  isLoading: boolean;
  accessLevel: AccessLevel;
  teams: TeamKey[];
  isAdmin: boolean;
  isManager: boolean;
  /** Full edit rights over configuration/members. */
  canAdmin: boolean;
  can: (area: AccessArea, required?: AccessPermission) => boolean;
  isInTeam: (team: TeamKey) => boolean;
}

const RANK: Record<AccessPermission, number> = { none: 0, view: 1, edit: 2 };

// Resolves the signed-in user against the members list → teams + permissions.
// Until any member exists the app stays usable (first-run bootstrap grants admin).
export function useAccessLevel(): IAccessLevel {
  const user = useCurrentUser();
  const { data: membersData, isLoading: loadingMembers } = useMembers();
  const { data: config, isLoading: loadingConfig } = useAppConfig();

  return React.useMemo<IAccessLevel>(() => {
    const members = membersData?.members ?? [];
    const email = user.email.toLowerCase();
    const member = members.filter((m) => m.email.toLowerCase() === email)[0];
    const superAdmins = BUILT_IN_SUPER_ADMINS.concat(
      config?.superAdminEmails ?? [],
    ).map((e) => e.toLowerCase());

    // Until an actual admin exists, don't lock everyone out of the admin screens —
    // registering the first non-admin member must not strand the site without one.
    const bootstrap =
      superAdmins.length === 0 &&
      members.filter((m) => m.accessLevel === "admin" && m.isActive).length ===
        0;
    const accessLevel: AccessLevel = member?.accessLevel ?? "member";
    const isAdmin =
      accessLevel === "admin" || superAdmins.indexOf(email) >= 0 || bootstrap;
    const isManager = isAdmin || accessLevel === "manager";

    const teams: TeamKey[] = member
      ? [member.team].concat(member.additionalTeams ?? [])
      : [];

    const can = (
      area: AccessArea,
      required: AccessPermission = "edit",
    ): boolean => {
      if (isAdmin) return true;
      const matrix = config?.accessLevels?.[accessLevel];
      const granted: AccessPermission = matrix?.[area] ?? "view";
      return RANK[granted] >= RANK[required];
    };

    return {
      member,
      isLoading: loadingMembers || loadingConfig,
      accessLevel,
      teams,
      isAdmin,
      isManager,
      canAdmin: isAdmin,
      can,
      isInTeam: (team: TeamKey) => teams.indexOf(team) >= 0,
    };
  }, [membersData, config, user.email, loadingMembers, loadingConfig]);
}

export default useAccessLevel;
