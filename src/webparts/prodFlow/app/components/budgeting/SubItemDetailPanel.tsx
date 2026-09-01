import * as React from "react";
import {
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Field,
  Input,
  Textarea,
  Divider,
} from "@fluentui/react-components";
import { Dismiss24Regular, Save20Regular } from "@fluentui/react-icons";
import {
  IDelineation,
  IQuotation,
  ISubItem,
  SubItemStatus,
} from "../../models";
import { strategyKeyOf } from "../../config/strategyOptions";
import { useUpdateSubItem } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import {
  computeSubItemCusto,
  quotationCostPatch,
} from "../../utils/costCalculations";
import { formatCurrencyBRL, formatDate } from "../../utils/formatters";
import StatusBadge from "../common/StatusBadge";
import SubItemPathway from "./SubItemPathway";
import styles from "./SubItemDetailPanel.module.scss";

export interface ISubItemDetailPanelProps {
  fid: string;
  subItem?: ISubItem;
  open: boolean;
  onClose: () => void;
}

const num = (v: string): number =>
  v === "" ? 0 : Math.max(0, Number(v.replace(",", ".")) || 0);

// Advances the sub-item to Costed once its cost source (delineation/quotation) is filled.
function costedStatus(current: SubItemStatus): SubItemStatus {
  const phase1: SubItemStatus[] = [
    "NotStarted",
    "Strategy",
    "WaitingDelineation",
    "WaitingQuotation",
  ];
  return phase1.indexOf(current) >= 0 ? "Costed" : current;
}

export const SubItemDetailPanel: React.FC<ISubItemDetailPanelProps> = ({
  fid,
  subItem,
  open,
  onClose,
}) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const update = useUpdateSubItem(fid);

  const [delineation, setDelineation] = React.useState<IDelineation>({
    hh: 0,
    revision: "A",
    checklist: [],
  });
  const [quotation, setQuotation] = React.useState<IQuotation>({
    supplier: "",
    value: 0,
    leadTimeDays: 0,
  });
  const [costs, setCosts] = React.useState({
    orcamentoUsinando: 0,
    partesEPecas: 0,
    servicos: 0,
    orcamentoOceaneering: 0,
  });
  const [revisionNote, setRevisionNote] = React.useState("");

  React.useEffect(() => {
    if (!subItem) return;
    setDelineation(
      subItem.delineation ?? { hh: 0, revision: "A", checklist: [] },
    );
    setQuotation(
      subItem.quotation ?? { supplier: "", value: 0, leadTimeDays: 0 },
    );
    setCosts({
      orcamentoUsinando: subItem.orcamentoUsinando ?? 0,
      partesEPecas: subItem.partesEPecas ?? 0,
      servicos: subItem.servicos ?? 0,
      orcamentoOceaneering: subItem.orcamentoOceaneering ?? 0,
    });
    setRevisionNote("");
  }, [subItem]);

  if (!subItem) return null;

  const strategyKey = strategyKeyOf(
    subItem.strategy,
    subItem.buyType,
    subItem.makeSite,
  );
  const isInHouse = strategyKey === "makeInHouse";
  const needsQuotation =
    strategyKey === "buyRaw" ||
    strategyKey === "buyCommercial" ||
    strategyKey === "makeSubcon";

  const save = (changes: Partial<ISubItem>, message: string): void =>
    update.mutate(
      { subItemId: subItem.id, changes },
      {
        onSuccess: () => addToast(message, "success"),
        onError: () => addToast("Falha ao salvar o sub-item.", "error"),
      },
    );

  const saveDelineation = (): void =>
    save(
      {
        delineation,
        status: costedStatus(subItem.status),
      },
      "Delineamento salvo.",
    );

  // A new revision letter freezes the current one into the history trail.
  const bumpRevision = (): void => {
    const nextRev = String.fromCharCode(
      (delineation.revision || "A").charCodeAt(0) + 1,
    );
    const history = [
      ...(delineation.revisionHistory ?? []),
      {
        rev: delineation.revision,
        by: user.displayName,
        date: new Date().toISOString(),
        note: revisionNote || undefined,
      },
    ];
    const next: IDelineation = {
      ...delineation,
      revision: nextRev,
      revisionHistory: history,
    };
    setDelineation(next);
    setRevisionNote("");
    save({ delineation: next }, `Delineamento revisado para Rev ${nextRev}.`);
  };

  const saveQuotation = (): void => {
    const patch = quotationCostPatch(strategyKey, quotation);
    setCosts((c) => ({ ...c, ...patch }));
    save(
      { quotation, ...patch, status: costedStatus(subItem.status) },
      "Cotação salva.",
    );
  };

  const saveCosts = (): void => save({ ...costs }, "Custos salvos.");

  const custoTotal = computeSubItemCusto(costs);

  return (
    <OverlayDrawer
      open={open}
      position="end"
      size="medium"
      onOpenChange={(_, d) => {
        if (!d.open) onClose();
      }}
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              aria-label="Fechar"
              onClick={onClose}
            />
          }
        >
          {subItem.pn}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div className={styles.body}>
          <div className={styles.summary}>
            <div className={styles.desc}>{subItem.descricao}</div>
            <div className={styles.meta}>
              <StatusBadge kind="subitem" status={subItem.status} />
              <span>
                Nível {subItem.level} · Qtd {subItem.qtd}
                {subItem.unit ? ` ${subItem.unit}` : ""}
              </span>
            </div>
            {strategyKey && <SubItemPathway strategyKey={strategyKey} />}
          </div>

          {!strategyKey && (
            <div className={styles.hint}>
              Defina a estratégia make/buy na árvore para habilitar o
              delineamento ou a cotação.
            </div>
          )}

          {isInHouse && (
            <>
              <Divider />
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}>
                    Delineamento (Eng. Industrial)
                  </h3>
                  <span className={styles.rev}>Rev {delineation.revision}</span>
                </div>
                <div className={styles.grid}>
                  <Field label="HH">
                    <Input
                      type="number"
                      min={0}
                      value={delineation.hh ? String(delineation.hh) : ""}
                      onChange={(_, d) =>
                        setDelineation((s) => ({ ...s, hh: num(d.value) }))
                      }
                    />
                  </Field>
                  <Field label="EPS">
                    <Input
                      value={delineation.eps ?? ""}
                      onChange={(_, d) =>
                        setDelineation((s) => ({ ...s, eps: d.value }))
                      }
                    />
                  </Field>
                  <Field label="Matéria-prima">
                    <Input
                      value={delineation.rawMaterial ?? ""}
                      onChange={(_, d) =>
                        setDelineation((s) => ({ ...s, rawMaterial: d.value }))
                      }
                    />
                  </Field>
                  <Field label="Consumíveis">
                    <Input
                      value={delineation.consumables ?? ""}
                      onChange={(_, d) =>
                        setDelineation((s) => ({ ...s, consumables: d.value }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Inspeções (separadas por vírgula)">
                  <Input
                    value={(delineation.inspections ?? []).join(", ")}
                    onChange={(_, d) =>
                      setDelineation((s) => ({
                        ...s,
                        inspections: d.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                </Field>
                <Field label="Notas">
                  <Textarea
                    value={delineation.notes ?? ""}
                    onChange={(_, d) =>
                      setDelineation((s) => ({ ...s, notes: d.value }))
                    }
                  />
                </Field>
                <div className={styles.actions}>
                  <Button
                    appearance="primary"
                    icon={<Save20Regular />}
                    onClick={saveDelineation}
                  >
                    Salvar delineamento
                  </Button>
                </div>

                <Field label="Nota da nova revisão">
                  <Input
                    value={revisionNote}
                    placeholder="Motivo da revisão"
                    onChange={(_, d) => setRevisionNote(d.value)}
                  />
                </Field>
                <div className={styles.actions}>
                  <Button onClick={bumpRevision}>Nova revisão</Button>
                </div>

                {(delineation.revisionHistory ?? []).length > 0 && (
                  <ul className={styles.revList}>
                    {(delineation.revisionHistory ?? []).map((r, i) => (
                      <li key={`${r.rev}-${i}`}>
                        <b>Rev {r.rev}</b> · {r.by} · {formatDate(r.date)}
                        {r.note ? ` — ${r.note}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {needsQuotation && (
            <>
              <Divider />
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Cotação (SCM/Compras)</h3>
                <div className={styles.grid}>
                  <Field label="Fornecedor">
                    <Input
                      value={quotation.supplier}
                      onChange={(_, d) =>
                        setQuotation((s) => ({ ...s, supplier: d.value }))
                      }
                    />
                  </Field>
                  <Field label="Valor (R$)">
                    <Input
                      type="number"
                      min={0}
                      value={quotation.value ? String(quotation.value) : ""}
                      onChange={(_, d) =>
                        setQuotation((s) => ({ ...s, value: num(d.value) }))
                      }
                    />
                  </Field>
                  <Field label="Lead time (dias)">
                    <Input
                      type="number"
                      min={0}
                      value={
                        quotation.leadTimeDays
                          ? String(quotation.leadTimeDays)
                          : ""
                      }
                      onChange={(_, d) =>
                        setQuotation((s) => ({
                          ...s,
                          leadTimeDays: num(d.value),
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Observações">
                  <Input
                    value={quotation.obs ?? ""}
                    onChange={(_, d) =>
                      setQuotation((s) => ({ ...s, obs: d.value }))
                    }
                  />
                </Field>
                <div className={styles.actions}>
                  <Button
                    appearance="primary"
                    icon={<Save20Regular />}
                    onClick={saveQuotation}
                  >
                    Salvar cotação
                  </Button>
                </div>
              </section>
            </>
          )}

          <Divider />
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Custos do sub-item</h3>
            <div className={styles.grid}>
              <Field label="Orçamento Usinando (R$)">
                <Input
                  type="number"
                  min={0}
                  value={
                    costs.orcamentoUsinando
                      ? String(costs.orcamentoUsinando)
                      : ""
                  }
                  onChange={(_, d) =>
                    setCosts((c) => ({
                      ...c,
                      orcamentoUsinando: num(d.value),
                    }))
                  }
                />
              </Field>
              <Field label="Partes e Peças (R$)">
                <Input
                  type="number"
                  min={0}
                  value={costs.partesEPecas ? String(costs.partesEPecas) : ""}
                  onChange={(_, d) =>
                    setCosts((c) => ({ ...c, partesEPecas: num(d.value) }))
                  }
                />
              </Field>
              <Field label="Serviços (R$)">
                <Input
                  type="number"
                  min={0}
                  value={costs.servicos ? String(costs.servicos) : ""}
                  onChange={(_, d) =>
                    setCosts((c) => ({ ...c, servicos: num(d.value) }))
                  }
                />
              </Field>
              <Field label="Orçamento Oceaneering (R$)">
                <Input
                  type="number"
                  min={0}
                  value={
                    costs.orcamentoOceaneering
                      ? String(costs.orcamentoOceaneering)
                      : ""
                  }
                  onChange={(_, d) =>
                    setCosts((c) => ({
                      ...c,
                      orcamentoOceaneering: num(d.value),
                    }))
                  }
                />
              </Field>
            </div>
            <div className={styles.totals}>
              <span>Custo total</span>
              <b>{formatCurrencyBRL(custoTotal)}</b>
            </div>
            <div className={styles.totals}>
              <span>Receita</span>
              <b>
                {formatCurrencyBRL(costs.orcamentoOceaneering - custoTotal)}
              </b>
            </div>
            <div className={styles.actions}>
              <Button
                appearance="primary"
                icon={<Save20Regular />}
                onClick={saveCosts}
              >
                Salvar custos
              </Button>
            </div>
          </section>
        </div>
      </DrawerBody>
    </OverlayDrawer>
  );
};

export default SubItemDetailPanel;
