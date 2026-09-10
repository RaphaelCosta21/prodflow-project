import * as React from "react";
import { Dropdown, Field, Option, Tooltip } from "@fluentui/react-components";
import { Attendance, Complexity, IFabricationRequest } from "../../models";
import {
  ATTENDANCE_OPTIONS,
  COMPLEXITY_OPTIONS,
} from "../../config/classificationOptions";
import {
  ClassificationField,
  isAttendanceLocked,
  pendingDefinitionLabels,
} from "../../utils/classification";
import {
  IClassificationChanges,
  useUpdateClassification,
} from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import GlassCard from "../common/GlassCard";
import NoticeBar from "../common/NoticeBar";
import { formatDate } from "../../utils/formatters";
import styles from "./ClassificationCard.module.scss";

const NO_PERMISSION = "Somente Admin, Projects e Planejamento podem alterar.";
const HYBRID_LOCK =
  "Definido automaticamente: a BOM tem sub-itens Make·IH e Make·SUB.";

export interface IClassificationCardProps {
  fid: string;
  data: IFabricationRequest;
  /** Renders only the "Atendimento" field, without the card chrome. */
  compact?: boolean;
}

/** Complexidade/atendimento continuam editáveis depois da criação (Visão Geral e Sub-Itens). */
export const ClassificationCard: React.FC<IClassificationCardProps> = ({
  fid,
  data,
  compact,
}) => {
  const user = useCurrentUser();
  const { isAdmin, teams } = useAccessLevel();
  const addToast = useUIStore((s) => s.addToast);
  const update = useUpdateClassification(fid);

  const canEdit =
    isAdmin || teams.indexOf("projects") >= 0 || teams.indexOf("planning") >= 0;
  const hybridLocked = isAttendanceLocked(data.subItems);
  const pending = pendingDefinitionLabels(data);

  const save = (changes: IClassificationChanges): void =>
    update.mutate(
      { changes, by: user.displayName },
      {
        onSuccess: () => addToast("Classificação atualizada.", "success"),
        onError: () => addToast("Falha ao atualizar a classificação.", "error"),
      },
    );

  const field = (
    label: string,
    key: ClassificationField,
    options: readonly string[],
    lockReason?: string,
  ): React.ReactElement => {
    const disabled = !canEdit || !!lockReason || update.isLoading;
    const reason = !canEdit ? NO_PERMISSION : lockReason;
    const dropdown = (
      <Dropdown
        value={data[key]}
        selectedOptions={[data[key]]}
        disabled={disabled}
        onOptionSelect={(_, d) => {
          if (d.optionValue && d.optionValue !== data[key])
            save({ [key]: d.optionValue } as IClassificationChanges);
        }}
      >
        {options.map((o) => (
          <Option key={o} value={o}>
            {o}
          </Option>
        ))}
      </Dropdown>
    );
    return (
      <Field key={key} label={label} className={styles.field}>
        {reason ? (
          <Tooltip content={reason} relationship="label">
            <span className={styles.lockWrap}>{dropdown}</span>
          </Tooltip>
        ) : (
          dropdown
        )}
      </Field>
    );
  };

  const attendanceField = field(
    "Atendimento",
    "atendimento",
    ATTENDANCE_OPTIONS as readonly Attendance[],
    hybridLocked ? HYBRID_LOCK : undefined,
  );

  if (compact) {
    return <div className={styles.compact}>{attendanceField}</div>;
  }

  return (
    <GlassCard title="Complexidade & Prazo">
      <div className={styles.fields}>
        {field(
          "Usinagem",
          "complexidadeUsinagem",
          COMPLEXITY_OPTIONS as readonly Complexity[],
        )}
        {field(
          "Caldeiraria/Soldagem",
          "complexidadeCaldeiraria",
          COMPLEXITY_OPTIONS as readonly Complexity[],
        )}
        {attendanceField}
      </div>

      {pending.length > 0 && (
        <NoticeBar
          tone="warning"
          title="Classificação pendente"
          className={styles.notice}
        >
          {pending.join(" · ")} — defina para que o prazo de envio do orçamento
          seja calculado.
        </NoticeBar>
      )}

      <div className={styles.readOnly}>
        <div className={styles.row}>
          <span className={styles.label}>Geral</span>
          <span className={styles.value}>{data.complexidadeGeral}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Prazo (dias úteis)</span>
          <span className={styles.value}>
            {data.dates.prazoDiasUteis
              ? String(data.dates.prazoDiasUteis)
              : "—"}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Prazo p/ envio do Orçamento</span>
          <span className={styles.value}>
            {formatDate(data.dates.prazoEnvioPetrobras)}
          </span>
        </div>
      </div>
    </GlassCard>
  );
};

export default ClassificationCard;
