import {
  IAttachmentRef,
  IFabricationRequest,
  IQuotationLine,
  IQuotationPackage,
  ISubItem,
} from "../models";

/** Quotations recommended per Buy sub-item — a soft target, never a blocker. */
export const RECOMMENDED_QUOTATIONS = 3;

export function packagesForSubItem(
  request: IFabricationRequest,
  subItemId: string,
): IQuotationPackage[] {
  return (request.quotationPackages ?? []).filter(
    (p) => p.coveredSubItemIds.indexOf(subItemId) >= 0,
  );
}

export function lineFor(
  pkg: IQuotationPackage,
  subItemId: string,
): IQuotationLine | undefined {
  return pkg.lines.filter((l) => l.subItemId === subItemId)[0];
}

/** Prazo da linha (texto livre do fornecedor); cai para o lead time do pacote. */
export function leadTimeOf(
  pkg?: IQuotationPackage,
  line?: IQuotationLine,
): string {
  if (line?.prazoEntrega?.trim()) return line.prazoEntrega.trim();
  const days = line?.leadTimeDays ?? pkg?.leadTimeDays;
  return days ? `${days} dias` : "";
}

export function selectedPackageFor(
  request: IFabricationRequest,
  subItem: ISubItem,
): IQuotationPackage | undefined {
  const covering = packagesForSubItem(request, subItem.id);
  if (subItem.selectedQuotationId) {
    const chosen = covering.filter((p) => p.id === subItem.selectedQuotationId);
    if (chosen.length > 0) return chosen[0];
  }
  // Falls back to the cheapest quote so a report never shows a blank price.
  return covering
    .filter((p) => lineFor(p, subItem.id))
    .sort(
      (a, b) =>
        (lineFor(a, subItem.id)?.valorUnit ?? 0) -
        (lineFor(b, subItem.id)?.valorUnit ?? 0),
    )[0];
}

export function selectedLineFor(
  request: IFabricationRequest,
  subItem: ISubItem,
): IQuotationLine | undefined {
  const pkg = selectedPackageFor(request, subItem);
  return pkg ? lineFor(pkg, subItem.id) : undefined;
}

export function cheapestPackageId(
  packages: IQuotationPackage[],
  subItemId: string,
): string | undefined {
  const priced = packages
    .map((p) => ({ p, line: lineFor(p, subItemId) }))
    .filter((x) => x.line && x.line.valorUnit > 0);
  if (priced.length === 0) return undefined;
  return priced.sort(
    (a, b) => (a.line?.valorUnit ?? 0) - (b.line?.valorUnit ?? 0),
  )[0].p.id;
}

/**
 * Quotes of the winning supplier of every Buy sub-item, in the order the items appear in the
 * report — the losing bids never reach the customer-facing document.
 */
export function winningAttachments(
  request: IFabricationRequest,
): IAttachmentRef[] {
  const winners: IQuotationPackage[] = [];
  const seenPackage: { [id: string]: true } = {};
  for (const subItem of request.subItems.filter((s) => s.strategy === "Buy")) {
    const pkg = selectedPackageFor(request, subItem);
    if (pkg && !seenPackage[pkg.id]) {
      seenPackage[pkg.id] = true;
      winners.push(pkg);
    }
  }
  return distinctAttachments(winners);
}

/** One PDF may cover many sub-items — the report must attach it only once. */
export function distinctAttachments(
  packages: IQuotationPackage[],
): IAttachmentRef[] {
  const seen: { [url: string]: true } = {};
  const out: IAttachmentRef[] = [];
  for (const pkg of packages) {
    for (const a of pkg.attachments ?? []) {
      if (!seen[a.url]) {
        seen[a.url] = true;
        out.push(a);
      }
    }
  }
  return out;
}

export function packageTotal(pkg: IQuotationPackage): number {
  return pkg.lines.reduce((sum, l) => sum + (l.valorTotal || 0), 0);
}
