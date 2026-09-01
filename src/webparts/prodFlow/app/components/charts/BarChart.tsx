import * as React from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useChartTheme } from "../../hooks/useChartTheme";
import ChartFrame from "./ChartFrame";

export interface IBarChartProps {
  data: Record<string, string | number>[];
  keys: string[];
  indexBy: string;
  height?: number;
  layout?: "vertical" | "horizontal";
  axisBottomLegend?: string;
  axisLeftLegend?: string;
  colors?: string[];
  valueFormat?: (value: number) => string;
}

export const BarChart: React.FC<IBarChartProps> = ({
  data,
  keys,
  indexBy,
  height = 280,
  layout = "vertical",
  axisBottomLegend,
  axisLeftLegend,
  colors,
  valueFormat,
}) => {
  const chart = useChartTheme();
  const palette = colors ?? chart.categorical;

  return (
    <ChartFrame height={height} isEmpty={data.length === 0}>
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        theme={chart.theme}
        layout={layout}
        groupMode="grouped"
        margin={{ top: 16, right: 16, bottom: 56, left: 72 }}
        padding={0.3}
        colors={palette}
        borderRadius={4}
        enableLabel={false}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: layout === "vertical" ? -30 : 0,
          legend: axisBottomLegend,
          legendPosition: "middle",
          legendOffset: 46,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: axisLeftLegend,
          legendPosition: "middle",
          legendOffset: -62,
        }}
        tooltip={(p) => (
          <div style={{ fontSize: 12 }}>
            <b>{String(p.indexValue)}</b> · {String(p.id)}:{" "}
            {valueFormat ? valueFormat(Number(p.value)) : String(p.value)}
          </div>
        )}
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom",
            direction: "row",
            translateY: 52,
            itemWidth: 120,
            itemHeight: 16,
            symbolSize: 10,
            symbolShape: "circle",
            itemTextColor: chart.textColor,
          },
        ]}
      />
    </ChartFrame>
  );
};

export default BarChart;
