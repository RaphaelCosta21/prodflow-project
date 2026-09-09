import * as React from "react";
import { Input, Dropdown, Option, Checkbox } from "@fluentui/react-components";
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
} from "@fluentui/react-icons";
import { IChecklistStep, IFabricationRequest, ISubItem } from "../../models";
import { SUB_ITEM_STATUS_MAP } from "../../config/statuses";
import { allowedSubItemStatuses } from "../../config/workflows";
import {
  FABRICATION_CHECKLIST,
  buildChecklist,
  checklistProgress,
} from "../../config/checklists";
import { useUpdateSubItem } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { formatPercentage } from "../../utils/formatters";
import EmptyState from "../common/EmptyState";
import GlassCard from "../common/GlassCard";
import styles from "./ProductionTab.module.scss";

interface IRowProps {
  fid: string;
  subItem: ISubItem;
}

const ProductionRow: React.FC<IRowProps> = ({ fid, subItem }) => {
  const user = useCurrentUser();
  const update = useUpdateSubItem(fid);
  const [expanded, setExpanded] = React.useState(false);
  const statusOptions = allowedSubItemStatuses(
    subItem.strategy,
    subItem.makeSite,
    2,
  );
  const [draft, setDraft] = React.useState({
    rcOrSr: subItem.rcOrSr ?? "",
    poOrWo: subItem.poOrWo ?? "",
    dataInicioFab: subItem.dataInicioFab?.slice(0, 10) ?? "",
    dataFimFab: subItem.dataFimFab?.slice(0, 10) ?? "",
    dataTerminoReal: subItem.dataTerminoReal?.slice(0, 10) ?? "",
  });

  const checklist = buildChecklist(FABRICATION_CHECKLIST, subItem.fabChecklist);
  const progress = checklistProgress(checklist);

  const commit = (changes: Partial<ISubItem>): void =>
    update.mutate({ subItemId: subItem.id, changes, by: user.displayName });

  const commitDate = (field: keyof ISubItem, value: string): void =>
    commit({
      [field]: value ? new Date(value).toISOString() : undefined,
    } as Partial<ISubItem>);

  const toggleStep = (step: IChecklistStep, done: boolean): void => {
    const next: IChecklistStep[] = checklist.map((s) =>
      s.key === step.key
        ? {
            ...s,
            done,
            date: done ? new Date().toISOString() : undefined,
            by: done ? user.displayName : undefined,
          }
        : s,
    );
    commit({ fabChecklist: next });
  };

  return (
    <>
      <div className={styles.row}>
        <div className={styles.main}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
          </button>
          <span className={styles.pn}>{subItem.pn}</span>
          <span className={styles.desc}>{subItem.descricao}</span>
        </div>
        <Input
          size="small"
          placeholder="RC/SR"
          value={draft.rcOrSr}
          onChange={(_, d) => setDraft((s) => ({ ...s, rcOrSr: d.value }))}
          onBlur={() => commit({ rcOrSr: draft.rcOrSr || undefined })}
        />
        <Input
          size="small"
          placeholder="PO/WO"
          value={draft.poOrWo}
          onChange={(_, d) => setDraft((s) => ({ ...s, poOrWo: d.value }))}
          onBlur={() => commit({ poOrWo: draft.poOrWo || undefined })}
        />
        <Input
          size="small"
          type="date"
          value={draft.dataInicioFab}
          onChange={(_, d) => {
            setDraft((s) => ({ ...s, dataInicioFab: d.value }));
            commitDate("dataInicioFab", d.value);
          }}
        />
        <Input
          size="small"
          type="date"
          value={draft.dataFimFab}
          onChange={(_, d) => {
            setDraft((s) => ({ ...s, dataFimFab: d.value }));
            commitDate("dataFimFab", d.value);
          }}
        />
        <div className={styles.progress}>
          <div className={styles.bar}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <span className={styles.progressText}>
            {formatPercentage(progress)}
          </span>
        </div>
        <Dropdown
          size="small"
          value={SUB_ITEM_STATUS_MAP[subItem.status].label}
          selectedOptions={[subItem.status]}
          onOptionSelect={(_, d) => {
            if (d.optionValue)
              commit({ status: d.optionValue as ISubItem["status"] });
          }}
        >
          {statusOptions.map((s) => (
            <Option key={s} value={s}>
              {SUB_ITEM_STATUS_MAP[s].label}
            </Option>
          ))}
        </Dropdown>
      </div>
      {expanded && (
        <div className={styles.detail}>
          <div className={styles.detailGrid}>
            <label className={styles.field}>
              <span>Serial Number (= nº da WO)</span>
              <Input
                size="small"
                value={subItem.serialNumber ?? ""}
                onChange={(_, d) =>
                  commit({ serialNumber: d.value || undefined })
                }
              />
            </label>
            <label className={styles.field}>
              <span>Data término real</span>
              <Input
                size="small"
                type="date"
                value={draft.dataTerminoReal}
                onChange={(_, d) => {
                  setDraft((s) => ({ ...s, dataTerminoReal: d.value }));
                  commitDate("dataTerminoReal", d.value);
                }}
              />
            </label>
            <label className={styles.field}>
              <span>Prazo de fabricação (dias)</span>
              <Input
                size="small"
                type="number"
                min={0}
                value={
                  subItem.prazoFabricacaoDias
                    ? String(subItem.prazoFabricacaoDias)
                    : ""
                }
                onChange={(_, d) =>
                  commit({
                    prazoFabricacaoDias:
                      d.value === "" ? undefined : Number(d.value),
                  })
                }
              />
            </label>
          </div>
          <div className={styles.checklist}>
            {checklist.map((step) => (
              <Checkbox
                key={step.key}
                label={step.label}
                checked={step.done}
                onChange={(_, d) => toggleStep(step, !!d.checked)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export interface IProductionTabProps {
  fid: string;
  data: IFabricationRequest;
}

export const ProductionTab: React.FC<IProductionTabProps> = ({ fid, data }) => {
  // Only leaves are fabricated/purchased; parent nodes are rollups.
  const leaves = React.useMemo(() => {
    const parents: { [id: string]: true } = {};
    for (const s of data.subItems) if (s.parentId) parents[s.parentId] = true;
    return data.subItems.filter((s) => !parents[s.id]);
  }, [data.subItems]);

  if (data.phase === 1 && data.status !== "Approved") {
    return (
      <GlassCard>
        <EmptyState
          title="Fase 2 ainda não liberada"
          description="A produção é liberada após a aprovação da Petrobras (Go Live)."
        />
      </GlassCard>
    );
  }

  if (leaves.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          title="Sem sub-itens"
          description="Importe a BOM para acompanhar a produção."
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard title="Produção & Montagem" noBodyPadding>
      <div className={styles.table}>
        <div className={styles.headerRow}>
          <span>Sub-item</span>
          <span>RC / SR</span>
          <span>PO / WO</span>
          <span>Início</span>
          <span>Fim</span>
          <span>Checklist</span>
          <span>Status</span>
        </div>
        {leaves.map((s) => (
          <ProductionRow key={s.id} fid={fid} subItem={s} />
        ))}
      </div>
    </GlassCard>
  );
};

export default ProductionTab;
