import * as React from "react";
import { RequestStatus, SubItemStatus } from "../../models";
import { useStatusColors } from "../../hooks/useStatusColors";
import Badge from "./Badge";

type StatusBadgeProps =
  | { kind: "request"; status: RequestStatus }
  | { kind: "subitem"; status: SubItemStatus };

export const StatusBadge: React.FC<StatusBadgeProps> = (props) => {
  const colors = useStatusColors();
  const def =
    props.kind === "request"
      ? colors.requestStatus(props.status)
      : colors.subItemStatus(props.status);
  return <Badge label={def.label} color={def.color} />;
};

export default StatusBadge;
