import * as React from "react";
import GlassCard from "../components/common/GlassCard";
import styles from "./PlaceholderPage.module.scss";

export interface IPlaceholderPageProps {
  title: string;
  description?: string;
  phase?: string;
}

export const PlaceholderPage: React.FC<IPlaceholderPageProps> = ({
  title,
  description,
  phase,
}) => (
  <div className={styles.page}>
    <div className={styles.head}>
      <h1 className={styles.title}>{title}</h1>
      {phase && <span className={styles.phase}>{phase}</span>}
    </div>
    <GlassCard>
      <div className={styles.placeholder}>
        <span className={styles.badge}>Em construção</span>
        <p className={styles.text}>
          {description ||
            "Esta área será implementada nas próximas fases do ProdFlow."}
        </p>
      </div>
    </GlassCard>
  </div>
);

export default PlaceholderPage;
