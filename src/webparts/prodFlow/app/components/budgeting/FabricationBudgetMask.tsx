import * as React from "react";
import { Input, Button, Field, Textarea } from "@fluentui/react-components";
import {
  Save20Regular,
  ArrowDownload20Regular,
  ArrowSync20Regular,
} from "@fluentui/react-icons";
import {
  IFabricationBudget,
  IFabricationRequest,
  ISubItem,
} from "../../models";
import { BudgetService } from "../../services/BudgetService";
import { useUpdateFabricationBudget } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { delineationToBudget } from "../../utils/delineationToBudget";
import { exportBudgetExcel } from "../../utils/exportBudgetExcel";
import { formatCurrencyBRL, formatNumber } from "../../utils/formatters";
import { useUIStore } from "../../stores/useUIStore";
import GlassCard from "../common/GlassCard";
import BudgetLinesTable from "./BudgetLinesTable";
import styles from "./FabricationBudgetMask.module.scss";

export interface IFabricationBudgetMaskProps {
  fid: string;
  data: IFabricationRequest;
  subItem: ISubItem;
  readOnly?: boolean;
}

const peso = (v: number): string => (v ? formatNumber(v, 6) : "—");

export const FabricationBudgetMask: React.FC<IFabricationBudgetMaskProps> = ({
  fid,
  data,
  subItem,
  readOnly,
}) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const updateBudget = useUpdateFabricationBudget(fid);

  const [budget, setBudget] = React.useState<IFabricationBudget>(() =>
    BudgetService.recalcFabricationBudget(
      subItem.fabricationBudget ?? delineationToBudget(data, subItem),
    ),
  );
  const [dirty, setDirty] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const savedRef = React.useRef(subItem.fabricationBudget);

  React.useEffect(() => {
    if (savedRef.current !== subItem.fabricationBudget && !dirty) {
      setBudget(
        BudgetService.recalcFabricationBudget(
          subItem.fabricationBudget ?? delineationToBudget(data, subItem),
        ),
      );
      savedRef.current = subItem.fabricationBudget;
    }
  }, [subItem.fabricationBudget, data, subItem, dirty]);

  const editTables = (patch: Partial<IFabricationBudget>): void => {
    setBudget((b) => BudgetService.recalcFabricationBudget({ ...b, ...patch }));
    setDirty(true);
  };
  const editHeader = (patch: Partial<IFabricationBudget>): void => {
    setBudget((b) => ({ ...b, ...patch }));
    setDirty(true);
  };

  const onSave = (): void =>
    updateBudget.mutate(
      { subItemId: subItem.id, budget, by: user.displayName },
      {
        onSuccess: () => {
          setDirty(false);
          addToast("Orçamento salvo.", "success");
        },
        onError: () => addToast("Falha ao salvar o orçamento.", "error"),
      },
    );

  const onRefill = (): void => {
    const refreshed = delineationToBudget(data, subItem);
    setBudget(
      BudgetService.recalcFabricationBudget({
        ...refreshed,
        numeroOrcamento: budget.numeroOrcamento,
        contrato: budget.contrato,
        dataEnvio: budget.dataEnvio,
        entregaDiasCorridos: budget.entregaDiasCorridos,
        observacoes: budget.observacoes,
      }),
    );
    setDirty(true);
    addToast("Recarregado a partir do delineamento.", "info");
  };

  const onExport = async (): Promise<void> => {
    setExporting(true);
    try {
      await exportBudgetExcel(data, {
        ...subItem,
        fabricationBudget: BudgetService.recalcFabricationBudget(budget),
      });
    } catch {
      addToast("Falha ao gerar o Excel.", "error");
    } finally {
      setExporting(false);
    }
  };

  const pesoT2 = BudgetService.pesoTotalTable2(budget);
  const pesoT1 = BudgetService.pesoTotalTable1(budget);
  const drawing =
    `${subItem.drawing.code} ${subItem.drawing.revision}`.trim() ||
    `${data.drawing.code} ${data.drawing.revision}`.trim();

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
          {!readOnly && (
            <Button icon={<ArrowSync20Regular />} onClick={onRefill}>
              Recarregar do delineamento
            </Button>
          )}
          <Button
            appearance="primary"
            icon={<Save20Regular />}
            onClick={onSave}
            disabled={readOnly || !dirty || updateBudget.isLoading}
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
          <Field label="Item">
            <Input value={`${subItem.pn} — ${subItem.descricao}`} disabled />
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

export default FabricationBudgetMask;
