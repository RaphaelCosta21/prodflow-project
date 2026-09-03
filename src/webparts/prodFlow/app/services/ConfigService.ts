import { SPService } from "./SPService";
import { SP_CONFIG } from "../config/sharepoint.config";
import { decodeSpRichText, parseSpJson } from "../utils/spText";

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
      value: decodeSpRichText(String(it[c.valueField] ?? "")),
      region: it[c.regionField] ? String(it[c.regionField]) : undefined,
    }));
  }

  public static async getValue(key: string): Promise<string | undefined> {
    const id = await ConfigService.findItemId(key);
    if (id === undefined) return undefined;
    return ConfigService.readValue(id);
  }

  // The config list holds a handful of rows, so we read them all and match in memory:
  // an OData $filter on `Key` silently returns nothing on this list.
  private static async findItemId(key: string): Promise<number | undefined> {
    const c = SP_CONFIG.config;
    const items = await SPService.sp.web.lists
      .getByTitle(SP_CONFIG.lists.config)
      .items.select("Id", "Title", c.keyField)
      .top(5000)();
    const target = key.trim().toLowerCase();
    const match = (items as Record<string, unknown>[]).filter((it) => {
      const itemKey = String(it[c.keyField] ?? "")
        .trim()
        .toLowerCase();
      const title = String(it.Title ?? "")
        .trim()
        .toLowerCase();
      return itemKey === target || (!itemKey && title === target);
    })[0];
    return match ? Number(match.Id) : undefined;
  }

  // `Value` is a multi-line (Note) column — read it off the single item, where
  // SharePoint always returns it, instead of off the collection projection.
  private static async readValue(id: number): Promise<string> {
    const c = SP_CONFIG.config;
    const item = (await SPService.sp.web.lists
      .getByTitle(SP_CONFIG.lists.config)
      .items.getById(id)
      .select(c.valueField)()) as Record<string, unknown>;
    return String(item[c.valueField] ?? "");
  }

  // Upsert: updates the row when the key exists, otherwise creates it.
  public static async setValue(
    key: string,
    value: string,
    type = "setting",
  ): Promise<void> {
    const c = SP_CONFIG.config;
    const list = SPService.sp.web.lists.getByTitle(SP_CONFIG.lists.config);
    const id = await ConfigService.findItemId(key);
    if (id !== undefined) {
      // Backfill Key/ConfigType so rows seeded with only a Title stay addressable.
      await list.items.getById(id).update({
        [c.typeField]: type,
        [c.keyField]: key,
        [c.valueField]: value,
      });
    } else {
      await list.items.add({
        Title: key,
        [c.typeField]: type,
        [c.keyField]: key,
        [c.valueField]: value,
      });
    }

    const saved = await ConfigService.getValue(key);
    if (saved !== value && decodeSpRichText(saved ?? "") !== value) {
      throw new Error(
        `A lista "${SP_CONFIG.lists.config}" nao persistiu a chave "${key}" por completo. ` +
          `Verifique se a coluna "${c.valueField}" e do tipo "Varias linhas de texto" com "Texto sem formatacao".`,
      );
    }
  }

  public static async getJson<T>(key: string): Promise<T | undefined> {
    const raw = await ConfigService.getValue(key);
    if (!raw) return undefined;
    try {
      return parseSpJson<T>(raw);
    } catch {
      throw new Error(
        `O valor da chave "${key}" na lista "${SP_CONFIG.lists.config}" nao e um JSON valido. ` +
          `Confirme que a coluna "${SP_CONFIG.config.valueField}" e "Texto sem formatacao" e que o conteudo nao foi truncado.`,
      );
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
