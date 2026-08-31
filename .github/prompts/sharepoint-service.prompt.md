---
description: "Generate a new SharePoint service class following the ProdFlow static-singleton pattern"
mode: agent
---

# Generate SharePoint Service

You are creating a new service class for the **ProdFlow** SPFx project (PnPjs v3).

## Input

The user will provide:

- **Service name** (e.g., `QuotationService`, `NotificationService`)
- **SharePoint list/library name** (or ask them to check `config/SP_CONFIG`)
- **Model interface** (e.g., `IQuotation`) — check `models/index.ts` first

## Rules

1. **Static singleton pattern** — no instantiation, all methods `public static`:

   ```typescript
   import { SPService } from "./SPService";
   import { SP_CONFIG } from "../config/sharepoint.config";
   import { IXxx } from "../models";

   export class XxxService {
     public static async getAll(): Promise<IXxx[]> {
       const items = await SPService.sp.web.lists
         .getByTitle(SP_CONFIG.lists.xxxList)
         .items();
       return items.map((item: any) => XxxService.mapFromSP(item));
     }

     public static async getById(id: number): Promise<IXxx | null> {
       const item = await SPService.sp.web.lists
         .getByTitle(SP_CONFIG.lists.xxxList)
         .items.getById(id)();
       return item ? XxxService.mapFromSP(item) : null;
     }

     public static async create(data: Partial<IXxx>): Promise<number> {
       const result = await SPService.sp.web.lists
         .getByTitle(SP_CONFIG.lists.xxxList)
         .items.add(XxxService.mapToSP(data));
       return result.Id;
     }

     private static mapFromSP(item: any): IXxx {
       // Map SharePoint fields → model interface
       // JSON blobs: JSON.parse(item.jsondata || "{}")
     }

     private static mapToSP(data: Partial<IXxx>): Record<string, any> {
       // Map model → SharePoint fields
       // JSON blobs: JSON.stringify(data.complexField)
     }
   }
   ```

2. **List names** come from `SP_CONFIG` in `config/sharepoint.config.ts` — add the list name there if missing.

3. **Model interfaces** come from `models/` — create a new `I{Name}.ts` and export from `models/index.ts` if needed.

4. **Data stored as JSON blobs**: the FID lives as one JSON string in the `jsondata` column of
   `prodflow-requests`. Parse on read, stringify on write.

5. **Concurrency — never overwrite the whole FID JSON.** For `prodflow-requests` writes, read the
   current item with its **ETag**, merge **only the changed section/sub-item**, and write back with the
   ETag (retry on 412 conflict). The FID counter increment is atomic (ETag + retry).

6. **Validate with Zod** (`schemas/`) before persisting and after reading complex JSON.

7. **Error handling**: let errors propagate — the `api/` query hooks (TanStack Query) handle retry/rollback.

8. **No mock data** — services always talk to SharePoint via `SPService.sp`.

## Output

Create the service in `src/webparts/prodFlow/app/services/`, update `config/sharepoint.config.ts` if
needed, create/update the model interface, and add/adjust the matching `api/` query hook.
