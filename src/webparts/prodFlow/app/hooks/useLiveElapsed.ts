import * as React from "react";
import { formatLiveElapsed } from "../utils/durationHelpers";

/** Ticking elapsed label; pass `undefined` to stop (terminal status freezes the timer). */
export function useLiveElapsed(startIso?: string): string {
  const [elapsed, setElapsed] = React.useState("");

  React.useEffect(() => {
    if (!startIso) {
      setElapsed("");
      return;
    }
    const tick = (): void =>
      setElapsed(formatLiveElapsed(Date.now() - new Date(startIso).getTime()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);

  return elapsed;
}

export default useLiveElapsed;
