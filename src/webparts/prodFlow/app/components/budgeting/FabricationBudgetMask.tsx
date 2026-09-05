import * as React from "react";
import { Input, Button, Field, Textarea } from "@fluentui/react-components";
import {
  Save20Regular,
  ArrowDownload20Regular,
  CheckmarkCircle20Regular,
} from "@fluentui/react-icons";
import { IBudget, IFabricationRequest } from "../../models";
import { BudgetService } from "../../services/BudgetService";
import { useUpdateBudget, useUpdateStatus } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ensureBudgetSeeded } from "../../utils/requestFactory";
import { exportBudgetExcel } from "../../utils/exportBudgetExcel";
import { formatCurrencyBRL, formatNumber } from "../../utils/formatters";
import { useUIStore } from "../../stores/useUIStore";
import GlassCard from "../common/GlassCard";
import BudgetLinesTable from "./BudgetLinesTable";
import BudgetCotsTable from "./BudgetCotsTable";
import styles from "./BudgetMask.module.scss";

export interface IBudgetMaskProps {
  fid: string;
  data: IFabricationRequest;
}

const peso = (v: number): string => (v ? formatNumber(v, 6) : "—");

export const BudgetMask: React.FC<IBudgetMaskProps> = ({ fid, data }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const updateBudget = useUpdateBudget(fid);
  const updateStatus = useUpdateStatus(fid);

  const [budget, setBudget] = React.useState<IBudget>(() =>
    BudgetService.recalcBudget(ensureBudgetSeeded(data.budget)),
  );
  const [dirty, setDirty] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const savedRef = React.useRef(data.budget);

  React.useEffect(() => {
    if (savedRef.current !== data.budget && !dirty) {
      setBudget(BudgetService.recalcBudget(ensureBudgetSeeded(data.budget)));
      savedRef.current = data.budget;
    }
  }, [data.budget, dirty]);

  const editTables = (patch: Partial<IBudget>): void => {
    setBudget((b) => BudgetService.recalcBudget({ ...b, ...patch }));
    setDirty(true);
  };
  const editHeader = (patch: Partial<IBudget>): void => {
    setBudget((b) => ({ ...b, ...patch }));
    setDirty(true);
  };

  const onSave = (): void =>
    updateBudget.mutate(
      { budget, by: user.displayName },
      {
        onSuccess: () => {
          setDirty(false);
          savedRef.current = data.budget;
          addToast("Orçamento salvo.", "success");
        },
        onError: () => addToast("Falha ao salvar o orçamento.", "error"),
      },
    );

  const onExport = async (): Promise<void> => {
    setExporting(true);
    try {
      await exportBudgetExcel({
        ...data,
        budget: BudgetService.recalcBudget(budget),
      });
    } catch {
      addToast("Falha ao gerar o Excel.", "error");
    } finally {
      setExporting(false);
    }
  };

  const canConsolidate =
    data.status === "Budgeting" && !dirty && budget.totalValor > 0;
  const onConsolidate = (): void =>
    updateStatus.mutate(
      {
        to: "BudgetReview",
        by: user.displayName,
        message: "Orçamento consolidado para revisão.",
      },
      {
        onSuccess: () => addToast("Enviado para revisão.", "success"),
      },
    );

  const pesoT2 = BudgetService.pesoTotalTable2(budget);
  const pesoT1 = BudgetService.pesoTotalTable1(budget);
  const drawing = `${data.drawing.code} ${data.drawing.revision}`.trim();

  return (
    <div className={styles.mask}>
      <div className={styles.toolbar}>
        <div className={styles.total}>
          <span className={styles.totalLabel}>Valor Final</span>
          <span className={styles.totalValue}>
            {formatCurrencyBRL(budget.totalValor)}
          </span>
        </div>
        <div className={styles.actions}>
          <Button
            icon={<ArrowDownload20Regular />}
            onClick={onExport}
            disabled={exporting}
          >
            Baixar Excel
          </Button>
          {data.status === "Budgeting" && (
            <Button
              icon={<CheckmarkCircle20Regular />}
              onClick={onConsolidate}
              disabled={!canConsolidate}
            >
              Consolidar
            </Button>
          )}
          <Button
            appearance="primary"
            icon={<Save20Regular />}
            onClick={onSave}
            disabled={!dirty || updateBudget.isLoading}
          >
            Salvar
          </Button>
        </div>
      </div>

      <GlassCard title="Cabeçalho do Orçamento">
        <div className={styles.headerGrid}>
          <Field label="Cliente">
            <Input value="Petrobras" disabled />
          </Field>
          <Field label="Contrato">
            <Input
              value={budget.contrato}
              onChange={(_, d) => editHeader({ contrato: d.value })}
            />
          </Field>
          <Field label="OS">
            <Input value={data.osNumber} disabled />
          </Field>
          <Field label="Projeto">
            <Input value={data.projeto} disabled />
          </Field>
          <Field label="Desenho">
            <Input value={drawing} disabled />
          </Field>
          <Field label="N° do orçamento">
            <Input
              value={budget.numeroOrcamento}
              onChange={(_, d) => editHeader({ numeroOrcamento: d.value })}
            />
          </Field>
          <Field label="Data de envio">
            <Input
              type="date"
              value={budget.dataEnvio ? budget.dataEnvio.slice(0, 10) : ""}
              onChange={(_, d) =>
                editHeader({
                  dataEnvio: d.value
                    ? new Date(d.value).toISOString()
                    : undefined,
                })
              }
            />
          </Field>
          <Field label="Entrega (dias corridos)">
            <Input
              type="number"
              min={0}
              value={
                budget.entregaDiasCorridos
                  ? String(budget.entregaDiasCorridos)
                  : ""
              }
              onChange={(_, d) =>
                editHeader({
                  entregaDiasCorridos:
                    d.value === "" ? undefined : Math.max(0, Number(d.value)),
                })
              }
            />
          </Field>
        </div>
      </GlassCard>

      <GlassCard title="Matéria-prima — Tabela 2" noBodyPadding>
        <BudgetLinesTable
          mode="materials"
          lines={budget.tabela2Materiais}
          onChange={(l) => editTables({ tabela2Materiais: l })}
        />
      </GlassCard>

      <GlassCard
        title="Usinagem / Caldeiraria / Engenharia — Tabela 2"
        noBodyPadding
      >
        <BudgetLinesTable
          mode="labor"
          lines={budget.tabela2Labor}
          onChange={(l) => editTables({ tabela2Labor: l })}
        />
      </GlassCard>

      <GlassCard title="Serviços adicionais — Tabela 1" noBodyPadding>
        <BudgetLinesTable
          mode="services"
          lines={budget.tabela1}
          onChange={(l) => editTables({ tabela1: l })}
        />
      </GlassCard>

      <GlassCard
        title="Aquisição de partes e peças (COTS) — Tabela 3"
        noBodyPadding
      >
        <BudgetCotsTable
          lines={budget.tabela3}
          onChange={(l) => editTables({ tabela3: l })}
        />
      </GlassCard>

      <GlassCard title="Valor Final">
        <div className={styles.finalTable}>
          <div className={styles.finalHead}>
            <span />
            <span>Peso Total</span>
            <span>Valor</span>
          </div>
          <div className={styles.finalRow}>
            <span>Tabela 2 (matéria-prima + usinagem)</span>
            <span>{peso(pesoT2)}</span>
            <span>{formatCurrencyBRL(BudgetService.valorTable2(budget))}</span>
          </div>
          <div className={styles.finalRow}>
            <span>Tabela 1 (serviços adicionais)</span>
            <span>{peso(pesoT1)}</span>
            <span>{formatCurrencyBRL(BudgetService.valorTable1(budget))}</span>
          </div>
          <div className={styles.finalRow}>
            <span>Tabela 3 (COTS)</span>
            <span>—</span>
            <span>{formatCurrencyBRL(BudgetService.valorTable3(budget))}</span>
          </div>
          <div className={styles.finalTotal}>
            <span>Total</span>
            <span />
            <span>{formatCurrencyBRL(budget.totalValor)}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard title="Observações">
        <Textarea
          className={styles.obs}
          value={budget.observacoes ?? ""}
          resize="vertical"
          onChange={(_, d) => editHeader({ observacoes: d.value })}
        />
      </GlassCard>
    </div>
  );
};

export default BudgetMask;
