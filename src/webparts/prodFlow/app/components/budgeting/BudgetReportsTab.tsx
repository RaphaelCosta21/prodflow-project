import * as React from "react";
import { Button, Field, Input, Textarea } from "@fluentui/react-components";
import {
  ArrowDownload20Regular,
  CheckmarkCircle20Regular,
  DocumentTable20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import {
  IDelineation,
  IDelineationMaterial,
  IFabricationRequest,
  ISubItem,
} from "../../models";
import { useApproveBudgetReports, useUpdatePartsBudget } from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import { BudgetService } from "../../services/BudgetService";
import { delineationToBudget } from "../../utils/delineationToBudget";
import { derivePartsBudget, makeItems } from "../../utils/partsBudgetBuilder";
import { exportPartsBudgetPdf } from "../../utils/exportPartsBudgetPdf";
import { formatCurrencyBRL } from "../../utils/formatters";
import {
  PARTS_REPORT_KEY,
  canApproveReports,
  listBudgetReports,
  reportEditability,
  reviewFor,
  stageState,
} from "../../utils/budgetApproval";
import { isSubItemCosted } from "../../config/workflows";
import { serviceByKey } from "../../config/contractWeights";
import { delineationServices } from "../../utils/requestFactory";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import NoticeBar from "../common/NoticeBar";
import FabricationBudgetMask from "./FabricationBudgetMask";
import ReportReviewBar from "./ReportReviewBar";
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

function dimensionsOf(material: IDelineationMaterial): string | undefined {
  const dims = [material.largura, material.comprimento, material.altura];
  if (dims.every((d) => !d)) return undefined;
  return `${dims.map((d) => d || "—").join(" × ")} mm`;
}

const DelineationSummary: React.FC<{ delineation: IDelineation }> = ({
  delineation: d,
}) => {
  const services = delineationServices(d);
  return (
    <div className={styles.delineation}>
      <div className={styles.delineationGroup}>
        <span className={styles.delineationTitle}>Mão de obra</span>
        <ul className={styles.delineationList}>
          <li>Usinagem: {d.horasUsinagem || 0} HH</li>
          <li>Acabamento: {d.horasAcabamento || 0} HH</li>
          <li>Montagem: {d.horasMontagem || 0} HH</li>
          <li className={styles.delineationStrong}>Total: {d.hh || 0} HH</li>
        </ul>
      </div>
      <div className={styles.delineationGroup}>
        <span className={styles.delineationTitle}>Serviços adicionais</span>
        {services.length === 0 ? (
          <p className={styles.delineationEmpty}>Nenhum serviço marcado.</p>
        ) : (
          <ul className={styles.delineationList}>
            {services.map((s) => {
              const row = serviceByKey(s.serviceKey);
              return (
                <li key={s.serviceKey}>
                  {row?.label ?? s.serviceKey}: {s.qtd} {row?.criterio ?? ""}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className={styles.delineationGroup}>
        <span className={styles.delineationTitle}>Matéria-prima</span>
        {d.materials.length === 0 ? (
          <p className={styles.delineationEmpty}>Nenhuma linha informada.</p>
        ) : (
          <ul className={styles.delineationList}>
            {d.materials.map((m, i) => {
              const dims = dimensionsOf(m);
              return (
                <li key={`${m.materialKey}-${i}`}>
                  {m.categoria} · {m.descricao}: {m.kg} kg
                  {dims ? ` · ${dims}` : ""}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export const BudgetReportsTab: React.FC<IBudgetReportsTabProps> = ({
  fid,
  data,
}) => {
  const user = useCurrentUser();
  const { teams, isAdmin } = useAccessLevel();
  const addToast = useUIStore((s) => s.addToast);
  const updateParts = useUpdatePartsBudget(fid);
  const approveAll = useApproveBudgetReports(fid);
  const [openMask, setOpenMask] = React.useState<string | undefined>();
  const [generating, setGenerating] = React.useState(false);

  const actor = { teams, isAdmin };
  const makes = makeItems(data);
  const parts = React.useMemo(() => derivePartsBudget(data), [data]);
  const hasParts = parts.lines.length > 0;
  const reports = React.useMemo(() => listBudgetReports(data), [data]);
  const reportByKey = React.useMemo(() => {
    const map: { [key: string]: (typeof reports)[0] } = {};
    for (const r of reports) map[r.key] = r;
    return map;
  }, [reports]);

  const tally = reports.reduce(
    (acc, ref) => {
      acc[reviewFor(data, ref).status] += 1;
      return acc;
    },
    { approved: 0, pending: 0, revision: 0 },
  );
  // Só entra no lote o relatório cuja etapa de origem já foi concluída.
  const pendingKeys = reports
    .filter(
      (ref) =>
        reviewFor(data, ref).status === "pending" &&
        stageState(data, ref.stage).concluido,
    )
    .map((ref) => ref.key);

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

  const partsReport = reportByKey[PARTS_REPORT_KEY];
  const partsEdit = partsReport
    ? reportEditability(data, partsReport, actor)
    : undefined;
  const partsLocked = !partsEdit?.headerEditable;

  const saveParts = (patch: Partial<typeof parts>): void =>
    updateParts.mutate({
      partsBudget: { ...parts, ...patch },
      by: user.displayName,
    });

  const onApproveAll = (): void =>
    approveAll.mutate(
      { keys: pendingKeys, by: user.displayName },
      {
        onSuccess: () =>
          addToast(
            `${pendingKeys.length} relatório(s) aprovado(s).`,
            "success",
          ),
        onError: (e) => addToast(String((e as Error).message ?? e), "error"),
      },
    );

  return (
    <div className={styles.tab}>
      <GlassCard
        title="Relatórios deste FID"
        subtitle={`${reportCount} relatório(s) · ${makes.length} de fabricação${hasParts ? " + 1 de partes e peças" : ""}`}
        actions={
          canApproveReports(actor) && pendingKeys.length > 0 ? (
            <Button
              appearance="primary"
              icon={<CheckmarkCircle20Regular />}
              disabled={approveAll.isLoading}
              onClick={onApproveAll}
            >
              Aprovar todos ({pendingKeys.length})
            </Button>
          ) : undefined
        }
      >
        <div className={styles.review}>
          <span className={`${styles.tally} ${styles.tallyApproved}`}>
            {tally.approved} aprovado(s)
          </span>
          <span className={styles.tally}>{tally.pending} pendente(s)</span>
          <span className={`${styles.tally} ${styles.tallyRevision}`}>
            {tally.revision} em revisão
          </span>
        </div>
        {tally.revision > 0 && (
          <NoticeBar tone="warning" title="Revisões em andamento">
            Os times responsáveis precisam corrigir e concluir a etapa de novo
            antes de uma nova aprovação.
          </NoticeBar>
        )}
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
        const ref = reportByKey[`fab:${item.id}`];
        const edit = reportEditability(data, ref, actor);
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
            <ReportReviewBar fid={fid} data={data} report={ref} />
            {item.delineation && (
              <DelineationSummary delineation={item.delineation} />
            )}
            {isOpen && (
              <>
                {edit.reason && (
                  <NoticeBar tone="info" className={styles.maskNotice}>
                    {edit.reason}
                  </NoticeBar>
                )}
                <FabricationBudgetMask
                  fid={fid}
                  data={data}
                  subItem={item}
                  headerReadOnly={!edit.headerEditable}
                  tablesReadOnly={!edit.tablesEditable}
                />
              </>
            )}
          </GlassCard>
        );
      })}

      {hasParts && partsReport && (
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
                disabled={generating}
                icon={<ArrowDownload20Regular />}
                onClick={() => {
                  setGenerating(true);
                  exportPartsBudgetPdf(data, parts)
                    .then((r) => {
                      setGenerating(false);
                      addToast(
                        r.skipped.length > 0
                          ? `Relatório gerado. Cotações não anexadas: ${r.skipped.join(", ")}.`
                          : `Relatório gerado com ${r.attached} cotação(ões) anexada(s).`,
                        r.skipped.length > 0 ? "warning" : "success",
                      );
                    })
                    .catch(() => {
                      setGenerating(false);
                      addToast("Falha ao gerar o relatório.", "error");
                    });
                }}
              >
                {generating ? "Gerando…" : "Gerar PDF"}
              </Button>
            </div>
          }
        >
          <ReportReviewBar fid={fid} data={data} report={partsReport} />
          <Field
            className={styles.partsProject}
            label="Projeto"
            hint="Sai no cabeçalho do relatório; vem da Descrição da Visão Geral."
          >
            <Input
              value={parts.projeto}
              disabled={partsLocked}
              onChange={(_, d) => saveParts({ projeto: d.value })}
            />
          </Field>

          <div className={styles.partsHeader}>
            <Field label="Nº do orçamento">
              <Input
                value={parts.numeroOrcamento}
                disabled={partsLocked}
                onChange={(_, d) => saveParts({ numeroOrcamento: d.value })}
              />
            </Field>
            <Field label="Revisão">
              <Input
                value={parts.revisao ?? ""}
                disabled={partsLocked}
                onChange={(_, d) => saveParts({ revisao: d.value })}
              />
            </Field>
            <Field label="Validade (dias corridos)">
              <Input
                type="number"
                min={0}
                disabled={partsLocked}
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
              disabled={partsLocked}
              onChange={(_, d) => saveParts({ observacoes: d.value })}
            />
          </Field>
        </GlassCard>
      )}
    </div>
  );
};

export default BudgetReportsTab;
