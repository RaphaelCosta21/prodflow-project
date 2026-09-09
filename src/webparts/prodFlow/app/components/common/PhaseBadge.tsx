import * as React from "react";
import { Phase, WorkflowKind } from "../../models";
import { useStatusColors } from "../../hooks/useStatusColors";
import Badge from "./Badge";

export const PhaseBadge: React.FC<{ phase: Phase; flow?: WorkflowKind }> = ({
  phase,
  flow,
}) => {
  const colors = useStatusColors();
  const def = colors.phase(phase, flow);
  return <Badge label={def.label} color={def.color} variant="solid" />;
};

export default PhaseBadge;
