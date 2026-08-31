import { BuyType, MakeSite, Strategy } from "../models";

// The locked make/buy dropdown — 4 combined options mapping to strategy + buyType/makeSite.
export type StrategyKey =
  | "buyRaw"
  | "buyCommercial"
  | "makeInHouse"
  | "makeSubcon";

export interface IStrategyOption {
  key: StrategyKey;
  label: string;
  strategy: Strategy;
  buyType?: BuyType;
  makeSite?: MakeSite;
}

export const STRATEGY_OPTIONS: IStrategyOption[] = [
  {
    key: "buyRaw",
    label: "Buy · Matéria-prima",
    strategy: "Buy",
    buyType: "RawMaterial",
  },
  {
    key: "buyCommercial",
    label: "Buy · Item comercial",
    strategy: "Buy",
    buyType: "CommercialItem",
  },
  {
    key: "makeInHouse",
    label: "Make · In-House",
    strategy: "Make",
    makeSite: "InHouse",
  },
  {
    key: "makeSubcon",
    label: "Make · SUBCON",
    strategy: "Make",
    makeSite: "Subcon",
  },
];

export function strategyKeyOf(
  strategy?: Strategy,
  buyType?: BuyType,
  makeSite?: MakeSite,
): StrategyKey | "" {
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
