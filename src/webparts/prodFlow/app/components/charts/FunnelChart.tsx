import * as React from "react";
import { ResponsiveFunnel } from "@nivo/funnel";
import { useChartTheme } from "../../hooks/useChartTheme";
import ChartFrame from "./ChartFrame";

// Nivo's FunnelDatum requires an index signature.
export interface IFunnelDatum {
  [key: string]: string | number;
  id: string;
  label: string;
  value: number;
}

export interface IFunnelChartProps {
  data: IFunnelDatum[];
  height?: number;
}

// Pipeline view (FIDs progressing through the Phase-1 statuses).
export const FunnelChart: React.FC<IFunnelChartProps> = ({
  data,
  height = 300,
}) => {
  const chart = useChartTheme();
  const isEmpty = data.every((d) => d.value === 0);

  return (
    <ChartFrame height={height} isEmpty={isEmpty}>
      <ResponsiveFunnel
        data={data}
        theme={chart.theme}
        margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
        direction="horizontal"
        shapeBlending={0.6}
        valueFormat=">-.0f"
        colors={chart.categorical}
        borderWidth={0}
        labelColor={chart.textColor}
        enableBeforeSeparators={false}
        enableAfterSeparators={false}
        currentPartSizeExtension={8}
      />
    </ChartFrame>
  );
};

export default FunnelChart;
