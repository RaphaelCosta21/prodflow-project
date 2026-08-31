import * as React from "react";
import styles from "./GlassCard.module.scss";

export interface IGlassCardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  accentColor?: string;
  interactive?: boolean;
  noBodyPadding?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const GlassCard: React.FC<IGlassCardProps> = ({
  title,
  subtitle,
  actions,
  accentColor,
  interactive,
  noBodyPadding,
  className,
  children,
}) => {
  const rootClass = [
    styles.glassCard,
    interactive ? styles.interactive : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  const styleVar = accentColor
    ? ({ "--card-accent": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <div className={rootClass} style={styleVar}>
      {(title || actions) && (
        <div className={styles.header}>
          <div className={styles.titles}>
            {title && <div className={styles.title}>{title}</div>}
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={noBodyPadding ? styles.bodyFlush : styles.body}>
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
