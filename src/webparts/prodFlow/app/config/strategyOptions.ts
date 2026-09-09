import { BuyType, MakeSite, Strategy, WorkflowKind } from "../models";

// The locked make/buy dropdown — 4 combined options mapping to strategy + buyType/makeSite,
// plus "na" for parent lines whose children carry the delineation.
export type StrategyKey =
  | "buyRaw"
  | "buyCommercial"
  | "makeInHouse"
  | "makeSubcon"
  | "na";

export interface IStrategyOption {
  key: StrategyKey;
  label: string;
  /** Compact label for clickable chips. */
  short: string;
  strategy: Strategy;
  buyType?: BuyType;
  makeSite?: MakeSite;
  /** Only selectable on BOM lines that have children. */
  parentOnly?: boolean;
}

export const STRATEGY_OPTIONS: IStrategyOption[] = [
  {
    key: "buyRaw",
    label: "Buy · Matéria-prima",
    short: "Buy · MP",
    strategy: "Buy",
    buyType: "RawMaterial",
  },
  {
    key: "buyCommercial",
    label: "Buy · Item comercial",
    short: "Buy · Com.",
    strategy: "Buy",
    buyType: "CommercialItem",
  },
  {
    key: "makeInHouse",
    label: "Make · In-House",
    short: "Make · IH",
    strategy: "Make",
    makeSite: "InHouse",
  },
  {
    key: "makeSubcon",
    label: "Make · SUBCON",
    short: "Make · SUB",
    strategy: "Make",
    makeSite: "Subcon",
  },
  {
    key: "na",
    label: "N/A · Delineado pelos sub-itens",
    short: "N/A",
    strategy: "NA",
    parentOnly: true,
  },
];

export function strategyOptionsFor(
  hasChildren: boolean,
  flow: WorkflowKind = "fabrication",
): IStrategyOption[] {
  return STRATEGY_OPTIONS.filter(
    (o) =>
      (!o.parentOnly || hasChildren) &&
      (flow !== "parts" || o.strategy !== "Make"),
  );
}

export function strategyKeyOf(
  strategy?: Strategy,
  buyType?: BuyType,
  makeSite?: MakeSite,
): StrategyKey | "" {
  if (strategy === "NA") return "na";
  if (strategy === "Buy") {
    if (buyType === "CommercialItem") return "buyCommercial";
    if (buyType === "RawMaterial") return "buyRaw";
  }
  if (strategy === "Make") {
    if (makeSite === "Subcon") return "makeSubcon";
    if (makeSite === "InHouse") return "makeInHouse";
  }
  return "";
}

export function optionByKey(key: string): IStrategyOption | undefined {
  return STRATEGY_OPTIONS.filter((o) => o.key === key)[0];
}
