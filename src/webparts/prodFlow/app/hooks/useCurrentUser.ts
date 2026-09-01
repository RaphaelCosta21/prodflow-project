import { useSpfxContext } from "../config/SpfxContext";

export interface ICurrentUser {
  displayName: string;
  email: string;
  loginName: string;
}

// Current SharePoint user from the SPFx page context — used for history/approval authorship.
export function useCurrentUser(): ICurrentUser {
  const ctx = useSpfxContext();
  const u = ctx.pageContext.user;
  return { displayName: u.displayName, email: u.email, loginName: u.loginName };
}
