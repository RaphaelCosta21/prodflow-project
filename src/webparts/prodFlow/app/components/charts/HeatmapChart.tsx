import * as React from "react";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { useChartTheme } from "../../hooks/useChartTheme";
import ChartFrame from "./ChartFrame";

export interface IHeatmapRow {
  id: string;
  data: { x: string; y: number }[];
}

export interface IHeatmapChartProps {
  data: IHeatmapRow[];
  height?: number;
  axisTopLegend?: string;
}

// Density view (capacity × week) — colors interpolate over the brand accent.
export const HeatmapChart: React.FC<IHeatmapChartProps> = ({
  data,
  height = 300,
  axisTopLegend,
}) => {
  const chart = useChartTheme();

  return (
    <ChartFrame height={height} isEmpty={data.length === 0}>
      <ResponsiveHeatMap
        data={data}
        theme={chart.theme}
        margin={{ top: 48, right: 24, bottom: 24, left: 120 }}
        valueFormat=">-.0f"
        axisTop={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -35,
          legend: axisTopLegend,
          legendPosition: "middle",
          legendOffset: -40,
        }}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        colors={{
          type: "sequential",
          colors: [chart.gridColor, chart.accents[0]],
        }}
        emptyColor={chart.gridColor}
        borderRadius={4}
        borderWidth={2}
        borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
        labelTextColor={{ from: "color", modifiers: [["darker", 3]] }}
        hoverTarget="cell"
      />
    </ChartFrame>
  );
};

export default HeatmapChart;
