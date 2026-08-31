import * as React from "react";
import { WebPartContext } from "@microsoft/sp-webpart-base";

const SpfxContext = React.createContext<WebPartContext | undefined>(undefined);

export const SpfxContextProvider = SpfxContext.Provider;

export function useSpfxContext(): WebPartContext {
  const ctx = React.useContext(SpfxContext);
  if (!ctx) {
    throw new Error(
      "useSpfxContext must be used within a SpfxContextProvider.",
    );
  }
  return ctx;
}
