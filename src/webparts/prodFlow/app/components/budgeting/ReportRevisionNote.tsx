import * as React from "react";
import { ArrowSync16Filled } from "@fluentui/react-icons";
import { IBudgetReportRevision } from "../../models";
import { BUDGET_STAGE_LABEL } from "../../utils/budgetApproval";
import { formatDate } from "../../utils/formatters";
import styles from "./ReportRevisionNote.module.scss";

export interface IReportRevisionNoteProps {
  revisao: IBudgetReportRevision;
  className?: string;
}

export const ReportRevisionNote: React.FC<IReportRevisionNoteProps> = ({
  revisao,
  className,
}) => (
  <div className={[styles.note, className || ""].filter(Boolean).join(" ")}>
    <span className={styles.title}>
      <ArrowSync16Filled />
      Revisão solicitada pelo time de Projects →{" "}
      {BUDGET_STAGE_LABEL[revisao.stage]}
    </span>
    <span className={styles.motivo}>{revisao.motivo}</span>
    <span className={styles.meta}>
      {revisao.solicitadoPor} · {formatDate(revisao.solicitadoEm)}
    </span>
  </div>
);

export default ReportRevisionNote;
