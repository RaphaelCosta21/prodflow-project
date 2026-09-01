import * as React from "react";
import { useUIStore } from "../stores/useUIStore";

export interface IChartTheme {
  theme: Record<string, unknown>; // Nivo theme object
  accents: string[];
  categorical: string[];
  success: string;
  warning: string;
  danger: string;
  info: string;
  gridColor: string;
  textColor: string;
}

// Nivo chart chrome derived from the ProdFlow design tokens — never hardcode axis/grid colors.
export function useChartTheme(): IChartTheme {
  const mode = useUIStore((s) => s.theme);

  return React.useMemo(() => {
    const dark = mode === "dark";
    const textColor = dark ? "#e8eef6" : "#0f2338";
    const mutedText = dark ? "#94a8c0" : "#475569";
    const gridColor = dark ? "#1c3a5a" : "#dbe6f2";
    const tooltipBg = dark ? "#0f2338" : "#ffffff";
    const accents = dark
      ? ["#2f81f7", "#38bdf8", "#64748b"]
      : ["#0a58ca", "#0284c7", "#475569"];

    return {
      accents,
      categorical: accents.concat(["#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"]),
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
      info: "#0ea5e9",
      gridColor,
      textColor,
      theme: {
        background: "transparent",
        text: { fontSize: 12, fill: mutedText },
        axis: {
          domain: { line: { stroke: gridColor, strokeWidth: 1 } },
          legend: { text: { fontSize: 12, fill: textColor, fontWeight: 600 } },
          ticks: {
            line: { stroke: gridColor, strokeWidth: 1 },
            text: { fontSize: 11, fill: mutedText },
          },
        },
        grid: { line: { stroke: gridColor, strokeWidth: 1 } },
        legends: { text: { fontSize: 11, fill: mutedText } },
        labels: { text: { fontSize: 11, fill: textColor } },
        tooltip: {
          container: {
            background: tooltipBg,
            color: textColor,
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${gridColor}`,
            boxShadow: "0 8px 24px rgba(0,0,0,.16)",
          },
        },
      },
    };
  }, [mode]);
}

export default useChartTheme;
