import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { WebPartContext } from "@microsoft/sp-webpart-base";

// Single PnPjs entry point for the whole app. Init once in ProdFlowWebPart.onInit().
export class SPService {
  private static _sp: SPFI | undefined;

  public static init(context: WebPartContext): void {
    SPService._sp = spfi().using(SPFx(context));
  }

  public static get sp(): SPFI {
    if (!SPService._sp) {
      throw new Error(
        "SPService.init(context) must run in ProdFlowWebPart.onInit() before any service use.",
      );
    }
    return SPService._sp;
  }
}
