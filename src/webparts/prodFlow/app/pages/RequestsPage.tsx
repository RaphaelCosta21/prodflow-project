import * as React from "react";
import { useNavigate } from "react-router-dom";
import { IFabricationRequest } from "../models";
import { useFidsFull } from "../api/fids";
import GlassCard from "../components/common/GlassCard";
import DataTable, { IDataTableColumn } from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import PhaseBadge from "../components/common/PhaseBadge";
import { workflowOf } from "../config/workflows";
import EmptyState from "../components/common/EmptyState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import { useStatusColors } from "../hooks/useStatusColors";
import { fidDetailPath } from "../config/routes";
import styles from "./RequestsPage.module.scss";

const DASH = "—";

function text(value?: string): string {
  return value && value.trim().length ? value : DASH;
}

// The FID JSON has no `year` column — the demand intake date is the closest equivalent.
function yearOf(request: IFabricationRequest): number | undefined {
  const iso = request.dates.recebimentoDemanda;
  if (!iso) return undefined;
  const parsed = new Date(iso);
  return isNaN(parsed.getTime()) ? undefined : parsed.getFullYear();
}

export const RequestsPage: React.FC = () => {
  const { data, isLoading, isError, error } = useFidsFull();
  const navigate = useNavigate();
  const colors = useStatusColors();
  const [visibleCount, setVisibleCount] = React.useState(0);
  const rows = React.useMemo(() => data ?? [], [data]);

  const columns: IDataTableColumn<IFabricationRequest>[] = [
    {
      key: "fid",
      header: "FID",
      render: (r) => <span className={styles.fid}>{r.fid}</span>,
      filterValue: (r) => r.fid,
    },
    {
      key: "os",
      header: "OS",
      render: (r) => text(r.osNumber),
      filterValue: (r) => r.osNumber,
    },
    {
      key: "drawing",
      header: "Desenho",
      render: (r) => (
        <span className={styles.drawing}>
          <span>{text(r.drawing?.code)}</span>
          {r.drawing?.revision && (
            <span className={styles.rev}>Rev {r.drawing.revision}</span>
          )}
        </span>
      ),
    },
    {
      key: "pnOii",
      header: "Part Number OII",
      render: (r) => (
        <span className={styles.mono}>{text(r.partNumberOii)}</span>
      ),
      filterValue: (r) => r.partNumberOii,
    },
    {
      key: "budgetType",
      header: "Tipo de Orçamento",
      render: (r) => text(r.tipoOrcamento),
      filterValue: (r) => r.tipoOrcamento,
    },
    {
      key: "phase",
      header: "Fase",
      render: (r) => (
        <PhaseBadge phase={r.phase} flow={workflowOf(r.tipoOrcamento)} />
      ),
      filterValue: (r) =>
        colors.phase(r.phase, workflowOf(r.tipoOrcamento)).label,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge kind="request" status={r.status} />,
      filterValue: (r) => colors.requestStatus(r.status).label,
    },
    {
      key: "complexity",
      header: "Complexidade Geral",
      render: (r) => text(r.complexidadeGeral),
      filterValue: (r) => r.complexidadeGeral,
    },
    {
      key: "attendance",
      header: "Atendimento",
      render: (r) => text(r.atendimento),
      filterValue: (r) => r.atendimento,
    },
    {
      key: "year",
      header: "Ano",
      render: (r) => yearOf(r) ?? DASH,
      align: "right",
      filterValue: (r) => yearOf(r),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Solicitações (FIDs)</h1>
        {!isLoading && !isError && (
          <span className={styles.count}>
            {visibleCount === rows.length
              ? `${rows.length} solicitações`
              : `${visibleCount} de ${rows.length} solicitações`}
          </span>
        )}
      </div>
      <GlassCard noBodyPadding>
        {isLoading ? (
          <SkeletonLoader rows={6} />
        ) : isError ? (
          <EmptyState
            title="Erro ao carregar FIDs"
            description={String(error)}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.fid}
            onRowClick={(r) => navigate(fidDetailPath(r.fid))}
            onVisibleCountChange={setVisibleCount}
            emptyLabel="Nenhum FID ainda. Crie o primeiro a partir de uma OS."
          />
        )}
      </GlassCard>
    </div>
  );
};

export default RequestsPage;
