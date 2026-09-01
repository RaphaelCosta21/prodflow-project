import * as React from "react";
import { FluentProvider, IdPrefixProvider } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { SpfxContextProvider } from "./config/SpfxContext";
import { oceaneeringLightTheme, oceaneeringDarkTheme } from "./config/theme";
import { useUIStore } from "./stores/useUIStore";
import AppLayout from "./AppLayout";
import ToastContainer from "./components/common/ToastContainer";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { TelemetryService } from "./services/TelemetryService";
import lightThemeStyles from "./styles/themes/light.module.scss";
import darkThemeStyles from "./styles/themes/dark.module.scss";
import styles from "./ProdFlow.module.scss";
// Side-effect import: strips the SharePoint chrome so the web part owns a full-bleed page.
import "./styles/sharepoint-overrides.module.scss";

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

  // Namespaces all Fluent-generated ids so they don't collide with the SharePoint host's own
  // Fluent v9 (the "conflicting ids in your DOM" warning) — that collision causes the style
  // re-injection loop behind the dropdown/dialog/tooltip flicker in the workbench.
  const idPrefix = React.useMemo(
    () =>
      `prodflow-${(context.instanceId || "app").replace(/[^a-zA-Z0-9]/g, "")}-`,
    [context.instanceId],
  );

  React.useEffect(() => {
    TelemetryService.init().catch(() => undefined);
  }, []);

  return (
    <SpfxContextProvider value={context}>
      <QueryClientProvider client={queryClient}>
        <IdPrefixProvider value={idPrefix}>
          {/* Only the token class belongs here: applyStylesToPortals copies this className onto
              every portal, so layout/background would paint a full-viewport overlay over the app. */}
          <FluentProvider
            id={`${idPrefix}root`}
            theme={fluentTheme}
            className={themeClass}
          >
            <div className={styles.providerRoot}>
              <ErrorBoundary>
                <AppLayout />
              </ErrorBoundary>
              <ToastContainer />
            </div>
          </FluentProvider>
        </IdPrefixProvider>
      </QueryClientProvider>
    </SpfxContextProvider>
  );
};

export default ProdFlowApp;
