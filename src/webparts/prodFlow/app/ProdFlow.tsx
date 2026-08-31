import * as React from "react";
import { FluentProvider } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { SpfxContextProvider } from "./config/SpfxContext";
import { oceaneeringLightTheme, oceaneeringDarkTheme } from "./config/theme";
import { useUIStore } from "./stores/useUIStore";
import AppLayout from "./AppLayout";
import lightThemeStyles from "./styles/themes/light.module.scss";
import darkThemeStyles from "./styles/themes/dark.module.scss";
import styles from "./ProdFlow.module.scss";

export interface IProdFlowAppProps {
  context: WebPartContext;
  queryClient: QueryClient;
}

const ProdFlowApp: React.FC<IProdFlowAppProps> = ({ context, queryClient }) => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === "dark";
  const fluentTheme = isDark ? oceaneeringDarkTheme : oceaneeringLightTheme;
  const themeClass = isDark
    ? darkThemeStyles.prodflowDark
    : lightThemeStyles.prodflowLight;

  return (
    <SpfxContextProvider value={context}>
      <QueryClientProvider client={queryClient}>
        <FluentProvider
          theme={fluentTheme}
          className={`${themeClass} ${styles.providerRoot}`}
        >
          <AppLayout />
        </FluentProvider>
      </QueryClientProvider>
    </SpfxContextProvider>
  );
};

export default ProdFlowApp;
