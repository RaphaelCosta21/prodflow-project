import * as React from "react";
import { formatLiveElapsed } from "../utils/durationHelpers";

/** Ticking elapsed label; `frozenAt` (epoch ms) stops the timer at a fixed instant. */
export function useLiveElapsed(startIso?: string, frozenAt?: number): string {
  const [elapsed, setElapsed] = React.useState("");

  React.useEffect(() => {
    if (!startIso) {
      setElapsed("");
      return;
    }
    const from = new Date(startIso).getTime();
    if (frozenAt !== undefined) {
      setElapsed(formatLiveElapsed(frozenAt - from));
      return;
    }
    const tick = (): void => setElapsed(formatLiveElapsed(Date.now() - from));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso, frozenAt]);

  return elapsed;
}

export default useLiveElapsed;
