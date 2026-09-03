import { TeamKey } from "../config/teams";

// Access sub-role layered on top of the member's team (§4).
export type AccessLevel = "member" | "lead" | "manager" | "admin";

export interface ITeamMember {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  team: TeamKey; // primary team — groups the member cards
  additionalTeams: TeamKey[]; // acts in these too
  accessLevel: AccessLevel;
  themePreference?: "light" | "dark";
  joinedDate?: string;
  isActive: boolean;
}

export interface IMembersData {
  members: ITeamMember[];
}
