import { SPService } from "./SPService";
import { SP_CONFIG } from "../config/sharepoint.config";

export interface IConfigEntry {
  type: string;
  key: string;
  value: string;
  region?: string;
}

export class ConfigService {
  public static async getAll(): Promise<IConfigEntry[]> {
    const c = SP_CONFIG.config;
    const items = await SPService.sp.web.lists
      .getByTitle(SP_CONFIG.lists.config)
      .items.select(c.typeField, c.keyField, c.valueField, c.regionField)
      .top(5000)();
    return items.map((it: Record<string, unknown>) => ({
      type: String(it[c.typeField] ?? ""),
      key: String(it[c.keyField] ?? ""),
      value: String(it[c.valueField] ?? ""),
      region: it[c.regionField] ? String(it[c.regionField]) : undefined,
    }));
  }

  public static async getValue(key: string): Promise<string | undefined> {
    const c = SP_CONFIG.config;
    const items = await SPService.sp.web.lists
      .getByTitle(SP_CONFIG.lists.config)
      .items.filter(`${c.keyField} eq '${key.replace(/'/g, "''")}'`)
      .select(c.valueField)
      .top(1)();
    return items.length ? String(items[0][c.valueField] ?? "") : undefined;
  }
}
