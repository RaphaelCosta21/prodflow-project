import * as React from "react";
import { ISubItem } from "../../models";
import { useFidsFull, usePatchSubItem } from "../../api/fids";
import {
  ICrossFidRow,
  flattenLeaves,
  matchesSearch,
} from "../../utils/crossFid";
import GlassCard from "./GlassCard";
import EmptyState from "./EmptyState";
import SkeletonLoader from "./SkeletonLoader";
import FilterPanel, { IFilterGroup } from "./FilterPanel";
import styles from "./CrossFidView.module.scss";

export type PatchFn = (changes: Partial<ISubItem>) => void;

export interface ICrossFidColumn {
  key: string;
  header: string;
  /** CSS grid track (e.g. "120px" or "minmax(200px,1fr)"). */
  width: string;
  align?: "left" | "center" | "right";
  render: (row: ICrossFidRow, patch: PatchFn) => React.ReactNode;
}

export interface ICrossFidViewProps {
  title: string;
  subtitle?: string;
  phaseLabel?: string;
  /** Which leaves belong to this team view. */
  filter: (row: ICrossFidRow) => boolean;
  columns: ICrossFidColumn[];
  filterGroups?: (rows: ICrossFidRow[]) => IFilterGroup[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: React.ReactNode;
}

// Generic cross-FID table: every team view is this engine + a filter/column config.
export const CrossFidView: React.FC<ICrossFidViewProps> = ({
  title,
  subtitle,
  phaseLabel,
  filter,
  columns,
  filterGroups,
  searchPlaceholder = "Buscar por FID, PN, descrição, RC/PO...",
  emptyTitle = "Nada por aqui",
  emptyDescription = "Nenhum sub-item corresponde a esta visão.",
  actions,
}) => {
  const { data, isLoading, isError } = useFidsFull();
  const patchSubItem = usePatchSubItem();
  const [search, setSearch] = React.useState("");

  const scoped = React.useMemo(
    () => flattenLeaves(data ?? []).filter(filter),
    [data, filter],
  );

  const groups = React.useMemo(
    () => (filterGroups ? filterGroups(scoped) : []),
    [filterGroups, scoped],
  );

  const rows = React.useMemo(
    () => scoped.filter((r) => matchesSearch(r, search)),
    [scoped, search],
  );

  const template = columns.map((c) => c.width).join(" ");

  const makePatch =
    (row: ICrossFidRow): PatchFn =>
    (changes) =>
      patchSubItem.mutate({
        fid: row.fid,
        subItemId: row.subItem.id,
        changes,
      });

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        {phaseLabel && <span className={styles.phase}>{phaseLabel}</span>}
        <span className={styles.count}>{rows.length} itens</span>
      </div>

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder={searchPlaceholder}
        groups={groups}
        actions={actions}
      />

      {isLoading ? (
        <SkeletonLoader rows={8} />
      ) : isError ? (
        <GlassCard>
          <EmptyState
            title="Falha ao carregar"
            description="Provisione as listas em Admin › Configuration."
          />
        </GlassCard>
      ) : rows.length === 0 ? (
        <GlassCard>
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </GlassCard>
      ) : (
        <GlassCard title={subtitle} noBodyPadding>
          <div className={styles.table}>
            <div
              className={styles.headerRow}
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((c) => (
                <span key={c.key} className={styles[c.align ?? "left"]}>
                  {c.header}
                </span>
              ))}
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                className={styles.row}
                style={{ gridTemplateColumns: template }}
              >
                {columns.map((c) => (
                  <span key={c.key} className={styles[c.align ?? "left"]}>
                    {c.render(row, makePatch(row))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default CrossFidView;
