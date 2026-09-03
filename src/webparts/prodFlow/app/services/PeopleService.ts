import { PrincipalSource, PrincipalType } from "@pnp/sp";
import "@pnp/sp/profiles";
import { SPService } from "./SPService";

export interface IPersonResult {
  loginName: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
}

// Directory search through SharePoint's own people picker endpoint — runs on the
// user's SP context, so it needs no Microsoft Graph admin consent.
export class PeopleService {
  public static async search(
    query: string,
    maxResults = 8,
  ): Promise<IPersonResult[]> {
    const term = query.trim();
    if (term.length < 2) return [];

    const entities = await SPService.sp.profiles.clientPeoplePickerSearchUser({
      AllowEmailAddresses: true,
      AllowMultipleEntities: false,
      AllUrlZones: false,
      MaximumEntitySuggestions: maxResults,
      PrincipalSource: PrincipalSource.All,
      PrincipalType: PrincipalType.User,
      QueryString: term,
    });

    const seen: { [email: string]: true } = {};
    const results: IPersonResult[] = [];
    for (const e of entities) {
      const data = e.EntityData ?? {};
      const email = (data.Email ?? "").trim();
      if (!email) continue;
      const key = email.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      results.push({
        loginName: e.Key,
        displayName: e.DisplayText || email,
        email,
        jobTitle: data.Title ?? "",
        department: data.Department ?? "",
      });
    }
    return results;
  }
}
