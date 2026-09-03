import * as React from "react";
import GlassCard from "../components/common/GlassCard";
import { APP_CONFIG } from "../config/appConfig";
import { PATCH_NOTES } from "../config/patchNotes";
import { formatDate } from "../utils/formatters";
import styles from "./PatchNotesPage.module.scss";

export const PatchNotesPage: React.FC = () => (
  <div className={styles.page}>
    <div className={styles.head}>
      <h1 className={styles.title}>Patch Notes</h1>
      <span className={styles.phase}>v{APP_CONFIG.appVersion}</span>
    </div>

    {PATCH_NOTES.map((note) => (
      <GlassCard
        key={note.version}
        title={`Versão ${note.version}`}
        subtitle={formatDate(note.date)}
      >
        <ul className={styles.list}>
          {note.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </GlassCard>
    ))}
  </div>
);

export default PatchNotesPage;
