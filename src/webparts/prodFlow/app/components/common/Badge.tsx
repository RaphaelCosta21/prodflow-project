import * as React from "react";
import styles from "./Badge.module.scss";

export interface IBadgeProps {
  label: string;
  color: string;
  variant?: "soft" | "solid";
}

// Derives soft background/border from a hex so we avoid color-mix (older engine safety).
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const Badge: React.FC<IBadgeProps> = ({
  label,
  color,
  variant = "soft",
}) => {
  const style = {
    "--badge-color": color,
    "--badge-bg": variant === "solid" ? color : hexToRgba(color, 0.14),
    "--badge-border": hexToRgba(color, 0.3),
  } as React.CSSProperties;
  return (
    <span
      className={`${styles.badge} ${variant === "solid" ? styles.solid : styles.soft}`}
      style={style}
    >
      {label}
    </span>
  );
};

export default Badge;
