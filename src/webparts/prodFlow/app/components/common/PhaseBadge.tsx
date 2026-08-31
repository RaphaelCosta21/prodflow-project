import * as React from "react";
import { Phase } from "../../models";
import { useStatusColors } from "../../hooks/useStatusColors";
import Badge from "./Badge";

export const PhaseBadge: React.FC<{ phase: Phase }> = ({ phase }) => {
  const colors = useStatusColors();
  const def = colors.phase(phase);
  return <Badge label={def.label} color={def.color} variant="solid" />;
};

export default PhaseBadge;
