import * as React from "react";
import { Button } from "@fluentui/react-components";
import { ArrowDownload20Regular } from "@fluentui/react-icons";
import { IFabricationRequest } from "../models";
import { useFidsFull } from "../api/fids";
import { useUIStore } from "../stores/useUIStore";
import { exportBudgetExcel } from "../utils/exportBudgetExcel";
import { formatCurrencyBRL, formatDate } from "../utils/formatters";
import GlassCard from "../components/common/GlassCard";
import EmptyState from "../components/common/EmptyState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import StatusBadge from "../components/common/StatusBadge";
import FidLink from "../components/common/FidLink";
import FilterPanel from "../components/common/FilterPanel";
import styles from "./BudgetReportsPage.module.scss";

export const BudgetReportsPage: React.FC = () => {
  const { data, isLoading, isError } = useFidsFull();
  const addToast = useUIStore((s) => s.addToast);
  const [search, setSearch] = React.useState("");
  const [busyFid, setBusyFid] = React.useState<string | undefined>();

  const rows = React.useMemo(() => {
    const withBudget = (data ?? []).filter((r) => r.budget.totalValor > 0);
    const q = search.trim().toLowerCase();
    if (!q) return withBudget;
    return withBudget.filter(
      (r) =>
        r.fid.toLowerCase().indexOf(q) >= 0 ||
        r.osNumber.toLowerCase().indexOf(q) >= 0 ||
        (r.budget.numeroOrcamento || "").toLowerCase().indexOf(q) >= 0 ||
        r.descricao.toLowerCase().indexOf(q) >= 0,
    );
  }, [data, search]);

  const download = async (r: IFabricationRequest): Promise<void> => {
    setBusyFid(r.fid);
    try {
      await exportBudgetExcel(r);
    } catch {
      addToast("Falha ao gerar o Excel.", "error");
    } finally {
      setBusyFid(undefined);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Relatórios de Orçamento</h1>
        <span className={styles.phase}>Fase 1</span>
        <span className={styles.count}>{rows.length} orçamentos</span>
      </div>

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por FID, OS, nº do orçamento..."
      />

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : isError ? (
        <GlassCard>
          <EmptyState
            title="Falha ao carregar"
            description="Provisione as listas em Admin › Configuration."
          />
        </GlassCard>
      ) : rows.length === 0 ? (
        <GlassCard>
          <EmptyState
            title="Nenhum orçamento"
            description="Preencha a máscara de orçamento na aba Orçamento de um FID."
          />
        </GlassCard>
      ) : (
        <GlassCard
          subtitle="O Excel sai no template oficial da Petrobras"
          noBodyPadding
        >
          <div className={styles.table}>
            <div className={styles.headerRow}>
              <span>FID</span>
              <span>OS</span>
              <span>Nº orçamento</span>
              <span>Data de envio</span>
              <span className={styles.right}>Entrega</span>
              <span className={styles.right}>Total</span>
              <span>Status</span>
              <span />
            </div>
            {rows.map((r) => (
              <div key={r.fid} className={styles.row}>
                <FidLink fid={r.fid} />
                <span>{r.osNumber}</span>
                <span>{r.budget.numeroOrcamento || "—"}</span>
                <span>{formatDate(r.budget.dataEnvio)}</span>
                <span className={styles.right}>
                  {r.budget.entregaDiasCorridos
                    ? `${r.budget.entregaDiasCorridos} dias`
                    : "—"}
                </span>
                <span className={`${styles.right} ${styles.total}`}>
                  {formatCurrencyBRL(r.budget.totalValor)}
                </span>
                <StatusBadge kind="request" status={r.status} />
                <Button
                  size="small"
                  icon={<ArrowDownload20Regular />}
                  disabled={busyFid === r.fid}
                  onClick={() => download(r)}
                >
                  Excel
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default BudgetReportsPage;
