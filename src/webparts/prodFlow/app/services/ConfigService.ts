import { SPService } from "./SPService";
import { SP_CONFIG } from "../config/sharepoint.config";

export interface IConfigEntry {
  type: string;
  key: string;
  value: string;
  region?: string;
}

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
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
    const found = await ConfigService.findItem(key);
    return found?.value;
  }

  private static async findItem(
    key: string,
  ): Promise<{ id: number; value: string } | undefined> {
    const c = SP_CONFIG.config;
    const items = await SPService.sp.web.lists
      .getByTitle(SP_CONFIG.lists.config)
      .items.filter(`${c.keyField} eq '${escapeOData(key)}'`)
      .select("Id", c.valueField)
      .top(1)();
    if (!items.length) return undefined;
    const it = items[0] as Record<string, unknown>;
    return { id: Number(it.Id), value: String(it[c.valueField] ?? "") };
  }

  // Upsert: updates the row when the key exists, otherwise creates it.
  public static async setValue(
    key: string,
    value: string,
    type = "setting",
  ): Promise<void> {
    const c = SP_CONFIG.config;
    const list = SPService.sp.web.lists.getByTitle(SP_CONFIG.lists.config);
    const found = await ConfigService.findItem(key);
    if (found) {
      await list.items.getById(found.id).update({ [c.valueField]: value });
      return;
    }
    await list.items.add({
      Title: key,
      [c.typeField]: type,
      [c.keyField]: key,
      [c.valueField]: value,
    });
  }

  public static async getJson<T>(key: string): Promise<T | undefined> {
    const raw = await ConfigService.getValue(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  public static async setJson<T>(
    key: string,
    value: T,
    type = "setting",
  ): Promise<void> {
    await ConfigService.setValue(key, JSON.stringify(value), type);
  }
}
