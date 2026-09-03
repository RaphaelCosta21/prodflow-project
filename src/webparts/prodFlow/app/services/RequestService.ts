import { SPService } from "./SPService";
import { IList } from "@pnp/sp/lists";
import { SP_CONFIG } from "../config/sharepoint.config";
import {
  IFabricationRequest,
  IFabricationRequestHeader,
  Phase,
  RequestStatus,
} from "../models";
import { parseFabricationRequest } from "../schemas/fabricationRequest.schema";
import { parseSpJson } from "../utils/spText";

const MAX_RETRIES = 5;

function formatFid(n: number): string {
  let s = String(n);
  while (s.length < 7) s = `0${s}`;
  return `FID${s}`;
}

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

export class RequestService {
  private static get list(): IList {
    return SPService.sp.web.lists.getByTitle(SP_CONFIG.lists.requests);
  }

  // Reads the OData eTag from a fetched item (falls back to "*" = no concurrency check).
  private static readEtag(item: Record<string, unknown>): string {
    const raw = item["odata.etag"];
    return typeof raw === "string" ? raw : "*";
  }

  // Header list from the promoted/indexed columns only — no JSON parse (fast board/list views).
  public static async getAllHeaders(): Promise<IFabricationRequestHeader[]> {
    const f = SP_CONFIG.fields;
    const items = await RequestService.list.items
      .select(f.fid, f.os, f.phase, f.status, f.year)
      .top(5000)();
    return items.map((it: Record<string, unknown>) => ({
      fid: String(it[f.fid] ?? ""),
      osNumber: String(it[f.os] ?? ""),
      phase: (Number(it[f.phase]) as Phase) || 1,
      status: String(it[f.status] ?? "Draft") as RequestStatus,
      year: Number(it[f.year]) || new Date().getFullYear(),
    }));
  }

  public static async getByFid(
    fid: string,
  ): Promise<IFabricationRequest | undefined> {
    const found = await RequestService.findItem(fid);
    return found?.data;
  }

  // Full FID documents (parses every JSON blob) — for dashboards/boards that need financials,
  // dates and sub-items. Heavier than getAllHeaders(); prefer headers for plain list views.
  public static async getAllFull(): Promise<IFabricationRequest[]> {
    const f = SP_CONFIG.fields;
    const items = await RequestService.list.items
      .select(f.jsonData)
      .top(5000)();
    const parsed: IFabricationRequest[] = [];
    for (const it of items as Record<string, unknown>[]) {
      try {
        parsed.push(
          parseFabricationRequest(parseSpJson(String(it[f.jsonData] ?? "{}"))),
        );
      } catch {
        // Skip malformed rows so one bad item cannot break the whole dashboard.
      }
    }
    return parsed;
  }

  private static async findItem(
    fid: string,
  ): Promise<
    { id: number; etag: string; data: IFabricationRequest } | undefined
  > {
    const f = SP_CONFIG.fields;
    const items = await RequestService.list.items
      .filter(`${f.fid} eq '${escapeOData(fid)}'`)
      .select("Id", f.jsonData)
      .top(1)();
    if (!items.length) return undefined;
    const it = items[0] as Record<string, unknown>;
    const data = parseFabricationRequest(
      parseSpJson(String(it[f.jsonData] ?? "{}")),
    );
    return { id: Number(it.Id), etag: RequestService.readEtag(it), data };
  }

  // Concurrency-safe update: re-read FRESH, apply mutator to ONLY the target section/sub-item,
  // write back with the eTag. Retries on 412 conflict. Never overwrites the whole JSON blindly.
  public static async updateSection(
    fid: string,
    mutate: (draft: IFabricationRequest) => void,
  ): Promise<IFabricationRequest> {
    const f = SP_CONFIG.fields;
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const found = await RequestService.findItem(fid);
      if (!found) throw new Error(`FID ${fid} not found.`);
      mutate(found.data);
      try {
        await RequestService.list.items.getById(found.id).update(
          {
            [f.status]: found.data.status,
            [f.phase]: String(found.data.phase),
            [f.jsonData]: JSON.stringify(found.data),
          },
          found.etag,
        );
        return found.data;
      } catch (e) {
        lastError = e; // likely precondition failed (412) → retry with a fresh read + re-merge
      }
    }
    throw lastError ?? new Error(`updateSection failed for FID ${fid}.`);
  }

  // Allocates an atomic FID (counter with eTag + retry), then creates the request item.
  public static async create(
    request: Omit<IFabricationRequest, "fid">,
  ): Promise<IFabricationRequest> {
    const fid = await RequestService.nextFid();
    const full: IFabricationRequest = { ...request, fid };
    const f = SP_CONFIG.fields;
    await RequestService.list.items.add({
      Title: fid,
      [f.fid]: fid,
      [f.os]: full.osNumber,
      [f.phase]: String(full.phase),
      [f.status]: full.status,
      [f.year]: new Date().getFullYear(),
      [f.jsonData]: JSON.stringify(full),
    });
    return full;
  }

  // Atomic FID counter in prodflow-config (ETag guard + retry) — prevents two FIDs colliding.
  private static async nextFid(): Promise<string> {
    const cfg = SP_CONFIG.config;
    const configList = SPService.sp.web.lists.getByTitle(
      SP_CONFIG.lists.config,
    );
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const items = await configList.items
        .filter(`${cfg.keyField} eq '${escapeOData(cfg.fidCounterKey)}'`)
        .select("Id", cfg.valueField)
        .top(1)();
      if (!items.length)
        throw new Error(
          "FID counter (key 'fidCounter') not found in prodflow-config.",
        );
      const it = items[0] as Record<string, unknown>;
      const next = (Number(it[cfg.valueField]) || 0) + 1;
      try {
        await configList.items
          .getById(Number(it.Id))
          .update(
            { [cfg.valueField]: String(next) },
            RequestService.readEtag(it),
          );
        return formatFid(next);
      } catch (e) {
        lastError = e; // another writer took this number → re-read and try the next
      }
    }
    throw lastError ?? new Error("Failed to allocate next FID after retries.");
  }
}
