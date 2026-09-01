import * as React from "react";
import { ResponsivePie } from "@nivo/pie";
import { useChartTheme } from "../../hooks/useChartTheme";
import ChartFrame from "./ChartFrame";

export interface IDonutDatum {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface IDonutChartProps {
  data: IDonutDatum[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}

// Donut with a center total (part-to-whole: make/buy mix, status mix, cost × revenue).
export const DonutChart: React.FC<IDonutChartProps> = ({
  data,
  height = 260,
  centerLabel,
  centerValue,
}) => {
  const chart = useChartTheme();
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <ChartFrame height={height} isEmpty={total === 0}>
      <ResponsivePie
        data={data}
        theme={chart.theme}
        margin={{ top: 16, right: 16, bottom: 40, left: 16 }}
        innerRadius={0.66}
        padAngle={1.2}
        cornerRadius={4}
        activeOuterRadiusOffset={6}
        colors={(d) => d.data.color ?? chart.categorical[0]}
        borderWidth={0}
        enableArcLinkLabels={false}
        arcLabelsSkipAngle={18}
        arcLabelsTextColor={chart.textColor}
        legends={[
          {
            anchor: "bottom",
            direction: "row",
            translateY: 34,
            itemWidth: 96,
            itemHeight: 16,
            symbolSize: 10,
            symbolShape: "circle",
            itemTextColor: chart.textColor,
          },
        ]}
        layers={[
          "arcs",
          "arcLabels",
          "legends",
          ({ centerX, centerY }) => (
            <g>
              <text
                x={centerX}
                y={centerY - 6}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  fill: chart.textColor,
                }}
              >
                {centerValue ?? String(total)}
              </text>
              {centerLabel && (
                <text
                  x={centerX}
                  y={centerY + 16}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontSize: 11, fill: chart.gridColor }}
                >
                  {centerLabel}
                </text>
              )}
            </g>
          ),
        ]}
      />
    </ChartFrame>
  );
};

export default DonutChart;
