import { SPService } from "./SPService";
import { IList } from "@pnp/sp/lists";
import { SP_CONFIG } from "../config/sharepoint.config";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import "@pnp/sp/items";

export interface IProvisionResult {
  created: string[];
  existing: string[];
}

// Idempotently ensures the ProdFlow lists + columns + FID counter. Run once against the site (admin).
export class ProvisioningService {
  public static async ensureAll(): Promise<IProvisionResult> {
    const created: string[] = [];
    const existing: string[] = [];
    await ProvisioningService.ensureRequests(created, existing);
    await ProvisioningService.ensureConfig(created, existing);
    await ProvisioningService.ensureNotifications(created, existing);
    return { created, existing };
  }

  private static async ensureRequests(
    created: string[],
    existing: string[],
  ): Promise<void> {
    const f = SP_CONFIG.fields;
    const ensure = await SPService.sp.web.lists.ensure(
      SP_CONFIG.lists.requests,
      "ProdFlow — 1 item por FID (JSON completo + colunas indexadas)",
      100,
    );
    (ensure.created ? created : existing).push(SP_CONFIG.lists.requests);
    const list = ensure.list;
    await ProvisioningService.ensureText(list, f.fid);
    await ProvisioningService.ensureText(list, f.os);
    await ProvisioningService.ensureText(list, f.phase);
    await ProvisioningService.ensureText(list, f.status);
    await ProvisioningService.ensureNumber(list, f.year);
    await ProvisioningService.ensureNote(list, f.jsonData);
  }

  private static async ensureConfig(
    created: string[],
    existing: string[],
  ): Promise<void> {
    const c = SP_CONFIG.config;
    const ensure = await SPService.sp.web.lists.ensure(
      SP_CONFIG.lists.config,
      "ProdFlow — configuração, SLA, feriados, membros, contador do FID",
      100,
    );
    (ensure.created ? created : existing).push(SP_CONFIG.lists.config);
    const list = ensure.list;
    await ProvisioningService.ensureText(list, c.typeField);
    await ProvisioningService.ensureText(list, c.keyField);
    await ProvisioningService.ensureNote(list, c.valueField);
    await ProvisioningService.ensureText(list, c.regionField);

    // Seed the atomic FID counter row if missing.
    const counter = await list.items
      .filter(`${c.keyField} eq '${c.fidCounterKey}'`)
      .top(1)();
    if (!counter.length) {
      await list.items.add({
        Title: c.fidCounterKey,
        [c.typeField]: "counter",
        [c.keyField]: c.fidCounterKey,
        [c.valueField]: "0",
      });
    }
  }

  private static async ensureNotifications(
    created: string[],
    existing: string[],
  ): Promise<void> {
    const ensure = await SPService.sp.web.lists.ensure(
      SP_CONFIG.lists.notifications,
      "ProdFlow — fila de gatilho para Power Automate",
      100,
    );
    (ensure.created ? created : existing).push(SP_CONFIG.lists.notifications);
    const list = ensure.list;
    await ProvisioningService.ensureText(list, "Type");
    await ProvisioningService.ensureNote(list, "Recipients");
    await ProvisioningService.ensureNote(list, "Payload");
    await ProvisioningService.ensureText(list, "Status");
  }

  private static async ensureText(list: IList, name: string): Promise<void> {
    try {
      await list.fields.getByInternalNameOrTitle(name)();
    } catch {
      await list.fields.addText(name);
    }
  }

  private static async ensureNumber(list: IList, name: string): Promise<void> {
    try {
      await list.fields.getByInternalNameOrTitle(name)();
    } catch {
      await list.fields.addNumber(name);
    }
  }

  private static async ensureNote(list: IList, name: string): Promise<void> {
    try {
      await list.fields.getByInternalNameOrTitle(name)();
    } catch {
      await list.fields.addMultilineText(name);
    }
  }
}
