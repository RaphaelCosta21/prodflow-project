import * as React from "react";
import prodflowSymbol from "../../../assets/brand/prodflow-symbol.svg";
import styles from "./EmptyState.module.scss";

export interface IEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<IEmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => (
  <div className={styles.empty}>
    {icon ? (
      <div className={styles.icon}>{icon}</div>
    ) : (
      <img className={styles.watermark} src={prodflowSymbol} alt="" />
    )}
    <div className={styles.title}>{title}</div>
    {description && <div className={styles.description}>{description}</div>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);

export default EmptyState;
