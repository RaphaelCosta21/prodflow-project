import * as React from "react";
import { Button } from "@fluentui/react-components";
import { ArrowDownload20Regular } from "@fluentui/react-icons";
import { IFabricationRequest, ISubItem } from "../models";
import { useFidsFull } from "../api/fids";
import { useUIStore } from "../stores/useUIStore";
import { BudgetService } from "../services/BudgetService";
import { exportBudgetExcel } from "../utils/exportBudgetExcel";
import { exportPartsBudgetPdf } from "../utils/exportPartsBudgetPdf";
import { delineationToBudget } from "../utils/delineationToBudget";
import { derivePartsBudget, makeItems } from "../utils/partsBudgetBuilder";
import { formatCurrencyBRL, formatDate } from "../utils/formatters";
import GlassCard from "../components/common/GlassCard";
import EmptyState from "../components/common/EmptyState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import StatusBadge from "../components/common/StatusBadge";
import FidLink from "../components/common/FidLink";
import FilterPanel from "../components/common/FilterPanel";
import styles from "./BudgetReportsPage.module.scss";

interface IReportRow {
  key: string;
  request: IFabricationRequest;
  kind: "fabrication" | "parts";
  subItem?: ISubItem;
  label: string;
  numeroOrcamento: string;
  total: number;
}

// Every Make sub-item yields one fabrication report; all Buy lines share one parts report.
function reportsOf(request: IFabricationRequest): IReportRow[] {
  const rows: IReportRow[] = makeItems(request).map((s) => {
    const budget = s.fabricationBudget ?? delineationToBudget(request, s);
    return {
      key: `${request.fid}-${s.id}`,
      request,
      kind: "fabrication" as const,
      subItem: s,
      label: `Fabricação · ${s.pn}`,
      numeroOrcamento: budget.numeroOrcamento || "—",
      total: BudgetService.recalcFabricationBudget(budget).totalValor,
    };
  });
  const parts = derivePartsBudget(request);
  if (parts.lines.length > 0) {
    rows.push({
      key: `${request.fid}-parts`,
      request,
      kind: "parts",
      label: `Partes e peças · ${parts.lines.length} item(ns)`,
      numeroOrcamento: parts.numeroOrcamento || "—",
      total: parts.total,
    });
  }
  return rows;
}

export const BudgetReportsPage: React.FC = () => {
  const { data, isLoading, isError } = useFidsFull();
  const addToast = useUIStore((s) => s.addToast);
  const [search, setSearch] = React.useState("");
  const [busyKey, setBusyKey] = React.useState<string | undefined>();

  const rows = React.useMemo(() => {
    const all = (data ?? []).reduce<IReportRow[]>(
      (acc, r) => acc.concat(reportsOf(r)),
      [],
    );
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (row) =>
        row.request.fid.toLowerCase().indexOf(q) >= 0 ||
        row.request.osNumber.toLowerCase().indexOf(q) >= 0 ||
        row.numeroOrcamento.toLowerCase().indexOf(q) >= 0 ||
        row.label.toLowerCase().indexOf(q) >= 0,
    );
  }, [data, search]);

  const download = async (row: IReportRow): Promise<void> => {
    setBusyKey(row.key);
    try {
      if (row.kind === "parts") {
        const result = await exportPartsBudgetPdf(
          row.request,
          derivePartsBudget(row.request),
        );
        if (result.skipped.length > 0) {
          addToast(
            `Cotações não anexadas: ${result.skipped.join(", ")}.`,
            "warning",
          );
        }
      } else {
        await exportBudgetExcel(row.request, row.subItem);
      }
    } catch {
      addToast("Falha ao gerar o relatório.", "error");
    } finally {
      setBusyKey(undefined);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Relatórios de Orçamento</h1>
        <span className={styles.phase}>Fase 1</span>
        <span className={styles.count}>{rows.length} relatórios</span>
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
            title="Nenhum relatório"
            description="Defina a estratégia dos sub-itens: cada item Make gera um relatório de fabricação e os itens Buy geram o de partes e peças."
          />
        </GlassCard>
      ) : (
        <GlassCard
          subtitle="Fabricação sai no template oficial da Petrobras; partes e peças, em PDF com as cotações anexadas"
          noBodyPadding
        >
          <div className={styles.table}>
            <div className={styles.headerRow}>
              <span>FID</span>
              <span>OS</span>
              <span>Relatório</span>
              <span>Nº orçamento</span>
              <span className={styles.right}>Prazo p/ envio</span>
              <span className={styles.right}>Total</span>
              <span>Status</span>
              <span />
            </div>
            {rows.map((row) => (
              <div key={row.key} className={styles.row}>
                <FidLink fid={row.request.fid} />
                <span>{row.request.osNumber}</span>
                <span>{row.label}</span>
                <span>{row.numeroOrcamento}</span>
                <span className={styles.right}>
                  {formatDate(row.request.dates.prazoEnvioPetrobras)}
                </span>
                <span className={`${styles.right} ${styles.total}`}>
                  {formatCurrencyBRL(row.total)}
                </span>
                <StatusBadge kind="request" status={row.request.status} />
                <Button
                  size="small"
                  icon={<ArrowDownload20Regular />}
                  disabled={busyKey === row.key}
                  onClick={() => {
                    download(row).catch(() => undefined);
                  }}
                >
                  {row.kind === "parts" ? "PDF" : "Excel"}
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
