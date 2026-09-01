import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { ConfigService } from "./ConfigService";

const CONFIG_KEY = "appInsightsConnectionString";

// Module-scoped so the post-await assignment can't be flagged as a stale-state race.
let client: ApplicationInsights | undefined;
let started = false;

// Telemetry is OPT-IN: it only starts when an admin stores a connection string in
// prodflow-config. Nothing is hardcoded, so no key ever lives in the repo.
export class TelemetryService {
  public static async init(): Promise<void> {
    if (started) return;
    started = true;
    try {
      const connectionString = await ConfigService.getValue(CONFIG_KEY);
      if (!connectionString) return;
      const instance = new ApplicationInsights({
        config: {
          connectionString,
          enableAutoRouteTracking: true,
          disableCookiesUsage: true,
        },
      });
      instance.loadAppInsights();
      instance.trackPageView();
      client = instance;
    } catch {
      // Telemetry must never break the app.
    }
  }

  public static trackEvent(
    name: string,
    properties?: { [key: string]: unknown },
  ): void {
    client?.trackEvent({ name }, properties);
  }

  public static trackError(
    error: Error,
    properties?: { [key: string]: unknown },
  ): void {
    client?.trackException({ exception: error }, properties);
  }
}
