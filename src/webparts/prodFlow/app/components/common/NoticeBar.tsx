import * as React from "react";
import {
  ErrorCircle16Filled,
  Info16Regular,
  Warning16Filled,
} from "@fluentui/react-icons";
import styles from "./NoticeBar.module.scss";

export type NoticeTone = "info" | "warning" | "error";

export interface INoticeBarProps {
  tone?: NoticeTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const TONE_CLASS: Record<NoticeTone, string> = {
  info: styles.info,
  warning: styles.warning,
  error: styles.error,
};

const TONE_ICON: Record<NoticeTone, React.ReactElement> = {
  info: <Info16Regular />,
  warning: <Warning16Filled />,
  error: <ErrorCircle16Filled />,
};

export const NoticeBar: React.FC<INoticeBarProps> = ({
  tone = "info",
  title,
  children,
  className,
}) => (
  <div
    className={[styles.notice, TONE_CLASS[tone], className || ""]
      .filter(Boolean)
      .join(" ")}
    role={tone === "info" ? undefined : "alert"}
  >
    <span className={styles.icon} aria-hidden="true">
      {TONE_ICON[tone]}
    </span>
    <div className={styles.body}>
      {title && <div className={styles.title}>{title}</div>}
      {children && <div className={styles.text}>{children}</div>}
    </div>
  </div>
);

export default NoticeBar;
