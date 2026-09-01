import * as React from "react";
import styles from "./KPICard.module.scss";

export interface IKPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  progress?: number; // 0..1
  trend?: { value: string; positive: boolean };
  children?: React.ReactNode; // sparkline slot
}

export const KPICard: React.FC<IKPICardProps> = ({
  label,
  value,
  subtitle,
  accentColor,
  progress,
  trend,
  children,
}) => {
  const styleVar = accentColor
    ? ({ "--kpi-accent": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div className={styles.card} style={styleVar}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {trend && (
        <div className={trend.positive ? styles.trendUp : styles.trendDown}>
          {trend.value}
        </div>
      )}
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {progress !== undefined && (
        <div className={styles.bar}>
          <span
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}
      {children && <div className={styles.spark}>{children}</div>}
    </div>
  );
};

export default KPICard;
