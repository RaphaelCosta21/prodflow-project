import * as React from "react";
import { Button, Field, Input, Textarea } from "@fluentui/react-components";
import {
  ArrowDownload20Regular,
  DocumentTable20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest, ISubItem } from "../../models";
import { useUpdatePartsBudget } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import { BudgetService } from "../../services/BudgetService";
import { delineationToBudget } from "../../utils/delineationToBudget";
import { derivePartsBudget, makeItems } from "../../utils/partsBudgetBuilder";
import { exportPartsBudgetDoc } from "../../utils/exportPartsBudgetDoc";
import { formatCurrencyBRL } from "../../utils/formatters";
import { isSubItemCosted } from "../../config/workflows";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import FabricationBudgetMask from "./FabricationBudgetMask";
import styles from "./BudgetReportsTab.module.scss";

export interface IBudgetReportsTabProps {
  fid: string;
  data: IFabricationRequest;
}

function fabricationTotal(
  data: IFabricationRequest,
  subItem: ISubItem,
): number {
  const budget =
    subItem.fabricationBudget ?? delineationToBudget(data, subItem);
  return BudgetService.recalcFabricationBudget(budget).totalValor;
}

export const BudgetReportsTab: React.FC<IBudgetReportsTabProps> = ({
  fid,
  data,
}) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const updateParts = useUpdatePartsBudget(fid);
  const [openMask, setOpenMask] = React.useState<string | undefined>();

  const makes = makeItems(data);
  const parts = React.useMemo(() => derivePartsBudget(data), [data]);
  const hasParts = parts.lines.length > 0;

  const fabricationSum = makes.reduce(
    (sum, s) => sum + fabricationTotal(data, s),
    0,
  );
  const grandTotal = fabricationSum + (hasParts ? parts.total : 0);

  const reportCount = makes.length + (hasParts ? 1 : 0);

  if (reportCount === 0) {
    return (
      <EmptyState
        title="Nenhum relatório a gerar"
        description="Defina a estratégia dos sub-itens: cada item Make gera um Relatório de Fabricação e os itens Buy geram um Relatório de Partes e Peças."
      />
    );
  }

  const saveParts = (patch: Partial<typeof parts>): void =>
    updateParts.mutate({
      partsBudget: { ...parts, ...patch },
      by: user.displayName,
    });

  return (
    <div className={styles.tab}>
      <GlassCard
        title="Relatórios deste FID"
        subtitle={`${reportCount} relatório(s) · ${makes.length} de fabricação${hasParts ? " + 1 de partes e peças" : ""}`}
      >
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Fabricação</span>
            <span className={styles.summaryValue}>
              {formatCurrencyBRL(fabricationSum)}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Partes e peças</span>
            <span className={styles.summaryValue}>
              {formatCurrencyBRL(hasParts ? parts.total : 0)}
            </span>
          </div>
          <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
            <span className={styles.summaryLabel}>Total consolidado</span>
            <span className={styles.summaryValue}>
              {formatCurrencyBRL(grandTotal)}
            </span>
          </div>
        </div>
      </GlassCard>

      {makes.map((item) => {
        const ready =
          item.makeSite === "InHouse"
            ? !!item.delineation?.concluido
            : isSubItemCosted(item.status);
        const total = fabricationTotal(data, item);
        const isOpen = openMask === item.id;
        return (
          <GlassCard
            key={item.id}
            title={`Orçamento de Fabricação — ${item.pn}`}
            subtitle={`${item.descricao} · Make · ${item.makeSite === "InHouse" ? "In-House" : "SUBCON"}`}
            actions={
              <div className={styles.actions}>
                {!ready && (
                  <span className={styles.pending}>
                    <Warning20Regular />
                    {item.makeSite === "InHouse"
                      ? "Delineamento pendente"
                      : "Cotação pendente"}
                  </span>
                )}
                <span className={styles.total}>{formatCurrencyBRL(total)}</span>
                <Button
                  size="small"
                  icon={<DocumentTable20Regular />}
                  onClick={() => setOpenMask(isOpen ? undefined : item.id)}
                >
                  {isOpen ? "Fechar máscara" : "Abrir máscara"}
                </Button>
              </div>
            }
          >
            {isOpen && (
              <FabricationBudgetMask fid={fid} data={data} subItem={item} />
            )}
          </GlassCard>
        );
      })}

      {hasParts && (
        <GlassCard
          title="Orçamento de Partes e Peças"
          subtitle={`${parts.lines.length} item(ns) Buy · derivado das cotações do SCM`}
          actions={
            <div className={styles.actions}>
              <span className={styles.total}>
                {formatCurrencyBRL(parts.total)}
              </span>
              <Button
                size="small"
                appearance="primary"
                icon={<ArrowDownload20Regular />}
                onClick={() => {
                  exportPartsBudgetDoc(data, parts);
                  addToast("Relatório gerado.", "success");
                }}
              >
                Gerar Word
              </Button>
            </div>
          }
        >
          <div className={styles.partsHeader}>
            <Field label="Nº do orçamento">
              <Input
                value={parts.numeroOrcamento}
                onChange={(_, d) => saveParts({ numeroOrcamento: d.value })}
              />
            </Field>
            <Field label="Revisão">
              <Input
                value={parts.revisao ?? ""}
                onChange={(_, d) => saveParts({ revisao: d.value })}
              />
            </Field>
            <Field label="Validade (dias corridos)">
              <Input
                type="number"
                min={0}
                value={String(parts.validadeDias ?? 5)}
                onChange={(_, d) =>
                  saveParts({ validadeDias: Number(d.value) || 0 })
                }
              />
            </Field>
          </div>

          <div className={styles.partsTable}>
            <div className={styles.partsHead}>
              <span>Item</span>
              <span>PN</span>
              <span>Qtd.</span>
              <span>Fornecedor</span>
              <span>Valor unit.</span>
              <span>Impostos</span>
              <span>Custo unit.</span>
              <span>Total</span>
            </div>
            {parts.lines.map((l) => (
              <div key={l.subItemId} className={styles.partsRow}>
                <div className={styles.identity}>
                  <span className={styles.item}>{l.item}</span>
                  <span className={styles.desc}>{l.descricao}</span>
                </div>
                <span className={styles.mono}>{l.pn ?? "—"}</span>
                <span className={styles.numCell}>
                  {l.qtd} {l.unidade}
                </span>
                <span className={styles.supplier}>{l.fornecedor ?? "—"}</span>
                <span className={styles.numCell}>
                  {formatCurrencyBRL(l.valorUnit)}
                </span>
                <span className={styles.numCell}>
                  {formatCurrencyBRL(l.impostosUnit)}
                </span>
                <span className={styles.numCell}>
                  {formatCurrencyBRL(l.custoTotalUnit)}
                </span>
                <span className={`${styles.numCell} ${styles.strong}`}>
                  {formatCurrencyBRL(l.total)}
                </span>
              </div>
            ))}
            <div className={styles.partsTotal}>
              <span>TOTAL</span>
              <span>{formatCurrencyBRL(parts.total)}</span>
            </div>
          </div>

          <Field label="Observações" className={styles.obs}>
            <Textarea
              resize="vertical"
              value={parts.observacoes ?? ""}
              onChange={(_, d) => saveParts({ observacoes: d.value })}
            />
          </Field>
        </GlassCard>
      )}
    </div>
  );
};

export default BudgetReportsTab;
