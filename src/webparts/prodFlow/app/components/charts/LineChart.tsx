import * as React from "react";
import { ResponsiveLine } from "@nivo/line";
import { useChartTheme } from "../../hooks/useChartTheme";
import ChartFrame from "./ChartFrame";

export interface ILineSeries {
  id: string;
  color?: string;
  data: { x: string; y: number }[];
}

export interface ILineChartProps {
  series: ILineSeries[];
  height?: number;
  axisBottomLegend?: string;
  axisLeftLegend?: string;
  enableArea?: boolean;
}

export const LineChart: React.FC<ILineChartProps> = ({
  series,
  height = 280,
  axisBottomLegend,
  axisLeftLegend,
  enableArea,
}) => {
  const chart = useChartTheme();
  const isEmpty = series.every((s) => s.data.length === 0);

  return (
    <ChartFrame height={height} isEmpty={isEmpty}>
      <ResponsiveLine
        data={series}
        theme={chart.theme}
        margin={{ top: 16, right: 24, bottom: 56, left: 60 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
        curve="monotoneX"
        colors={series.map((s, i) => s.color ?? chart.categorical[i])}
        lineWidth={2}
        pointSize={7}
        pointBorderWidth={2}
        pointColor={{ from: "color" }}
        pointBorderColor={{ from: "color" }}
        enableArea={enableArea}
        areaOpacity={0.12}
        useMesh
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: -30,
          legend: axisBottomLegend,
          legendPosition: "middle",
          legendOffset: 46,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: axisLeftLegend,
          legendPosition: "middle",
          legendOffset: -50,
        }}
        legends={[
          {
            anchor: "bottom",
            direction: "row",
            translateY: 52,
            itemWidth: 130,
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

export default LineChart;
