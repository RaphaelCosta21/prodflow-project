import * as React from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Field,
  Input,
  Radio,
  RadioGroup,
  Spinner,
  Textarea,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowSync16Filled,
  Attach16Regular,
  CheckmarkCircle20Regular,
  Delete16Regular,
  Edit16Regular,
  Open16Regular,
} from "@fluentui/react-icons";
import {
  IAttachmentRef,
  IFabricationRequest,
  IQuotationLine,
  IQuotationPackage,
  ISubItem,
} from "../../models";
import { ACCEPTED_ATTACHMENT_ACCEPT } from "../../config/attachments";
import { isQuotedRoute } from "../../config/workflows";
import { AttachmentService } from "../../services/AttachmentService";
import {
  useDeleteQuotationPackage,
  useSelectQuotation,
  useUpsertQuotationPackage,
} from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import {
  REQUIRED_QUOTATIONS,
  cheapestPackageId,
  leadTimeOf,
  lineFor,
  packageTotal,
  packagesForSubItem,
  quotationCountFor,
} from "../../utils/quotationHelpers";
import { formatCurrencyBRL, formatDate } from "../../utils/formatters";
import { revisionOfSubItem, stageIsLocked } from "../../utils/budgetApproval";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import FidDrawingCard from "../common/FidDrawingCard";
import StageCompletionCard from "./StageCompletionCard";
import SubItemDrawings from "./SubItemDrawings";
import styles from "./QuotationsTab.module.scss";

export interface IQuotationsTabProps {
  fid: string;
  data: IFabricationRequest;
}

const num = (v: string): number =>
  v === "" ? 0 : Math.max(0, Number(v.replace(",", ".")) || 0);

const prazoLabel = (pkg?: IQuotationPackage, line?: IQuotationLine): string =>
  leadTimeOf(pkg, line) || "—";

// Só entram na fila do SCM os itens que o Planejamento já roteou (Buy ou Make · SUBCON).
function quotableItems(data: IFabricationRequest): ISubItem[] {
  return data.subItems.filter((s) => !!s.startedAt && isQuotedRoute(s));
}

function emptyPackage(): IQuotationPackage {
  return {
    id: `q-${Date.now()}`,
    supplier: "",
    moeda: "BRL",
    attachments: [],
    coveredSubItemIds: [],
    lines: [],
  };
}

const PackageForm: React.FC<{
  fid: string;
  data: IFabricationRequest;
  initial: IQuotationPackage;
  onClose: () => void;
}> = ({ fid, data, initial, onClose }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const upsert = useUpsertQuotationPackage(fid);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pkg, setPkg] = React.useState<IQuotationPackage>(initial);
  const [busy, setBusy] = React.useState(false);

  const items = quotableItems(data);
  // Contagem já considerando este pacote (ainda não salvo) para liberar a conclusão na hora.
  const countOf = React.useCallback(
    (subItemId: string): number => quotationCountFor(data, subItemId, pkg),
    [data, pkg],
  );
  // Itens que ainda não atingem o mínimo obrigatório — destacados para não passarem batido.
  const belowMinimum = React.useMemo(
    () =>
      items.filter((i) => countOf(i.id) < REQUIRED_QUOTATIONS).map((i) => i.id),
    [countOf, items],
  );

  const edit = (patch: Partial<IQuotationPackage>): void =>
    setPkg((p) => ({ ...p, ...patch }));

  const toggleItem = (item: ISubItem, checked: boolean): void => {
    if (checked) {
      const line: IQuotationLine = lineFor(pkg, item.id) ?? {
        subItemId: item.id,
        qtd: item.qtd,
        valorUnit: 0,
        valorTotal: 0,
      };
      edit({
        coveredSubItemIds: pkg.coveredSubItemIds.concat(item.id),
        lines: pkg.lines.filter((l) => l.subItemId !== item.id).concat(line),
      });
    } else {
      edit({
        coveredSubItemIds: pkg.coveredSubItemIds.filter((i) => i !== item.id),
        lines: pkg.lines.filter((l) => l.subItemId !== item.id),
      });
    }
  };

  const editLine = (subItemId: string, patch: Partial<IQuotationLine>): void =>
    edit({
      lines: pkg.lines.map((l) => {
        if (l.subItemId !== subItemId) return l;
        const merged = { ...l, ...patch };
        merged.valorTotal = merged.valorUnit * merged.qtd;
        return merged;
      }),
    });

  const selectAllBuy = (): void => {
    const lines = items.map(
      (i) =>
        lineFor(pkg, i.id) ?? {
          subItemId: i.id,
          qtd: i.qtd,
          valorUnit: 0,
          valorTotal: 0,
        },
    );
    edit({ coveredSubItemIds: items.map((i) => i.id), lines });
  };

  const onPick = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const uploaded: IAttachmentRef[] = [];
      for (let i = 0; i < files.length; i++) {
        const ref = await AttachmentService.upload(fid, files[i], {
          refCode: pkg.supplier || pkg.id,
        });
        uploaded.push({
          ...ref,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.displayName,
        });
      }
      edit({ attachments: pkg.attachments.concat(uploaded) });
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const persist = (concluir: boolean): void =>
    upsert.mutate(
      { quotation: pkg, by: user.displayName, concluir },
      {
        onSuccess: () => {
          addToast(
            concluir
              ? `${pkg.coveredSubItemIds.length} item(ns) custeado(s).`
              : "Cotação salva.",
            "success",
          );
          onClose();
        },
        onError: () => addToast("Falha ao salvar a cotação.", "error"),
      },
    );

  const total = pkg.lines.reduce((s, l) => s + l.valorTotal, 0);
  // Marcar o item cobre-o nesta cotação — sem valor unitário a linha não custeia nada.
  const missingPrice = pkg.coveredSubItemIds.filter(
    (id) => (lineFor(pkg, id)?.valorUnit ?? 0) <= 0,
  );
  const canSave = !!pkg.supplier.trim() && missingPrice.length === 0;
  // Só dá para custear um item quando ele tem as cotações obrigatórias registradas.
  const coveredBelowMinimum = pkg.coveredSubItemIds.filter(
    (id) => countOf(id) < REQUIRED_QUOTATIONS,
  );
  const canConclude =
    canSave &&
    pkg.coveredSubItemIds.length > 0 &&
    coveredBelowMinimum.length === 0;

  return (
    <Dialog open onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface className={styles.dialog}>
        <DialogBody>
          <DialogTitle>Cotação do fornecedor</DialogTitle>
          <DialogContent>
            <div className={styles.formGrid}>
              <Field label="Fornecedor" required>
                <Input
                  value={pkg.supplier}
                  onChange={(_, d) => edit({ supplier: d.value })}
                />
              </Field>
              <Field label="Referência da proposta">
                <Input
                  value={pkg.reference ?? ""}
                  onChange={(_, d) => edit({ reference: d.value })}
                />
              </Field>
              <Field label="Moeda">
                <Input
                  value={pkg.moeda}
                  onChange={(_, d) => edit({ moeda: d.value })}
                />
              </Field>
              <Field label="Lead time (dias)">
                <Input
                  type="number"
                  min={0}
                  value={String(pkg.leadTimeDays ?? "")}
                  onChange={(_, d) => edit({ leadTimeDays: num(d.value) })}
                />
              </Field>
              <Field label="Data">
                <Input
                  type="date"
                  value={pkg.date ? pkg.date.slice(0, 10) : ""}
                  onChange={(_, d) => edit({ date: d.value })}
                />
              </Field>
              <Field label="Validade">
                <Input
                  type="date"
                  value={pkg.validade ? pkg.validade.slice(0, 10) : ""}
                  onChange={(_, d) => edit({ validade: d.value })}
                />
              </Field>
            </div>

            <div className={styles.attachRow}>
              <Button
                size="small"
                icon={<Attach16Regular />}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                Anexar PDF da cotação
              </Button>
              {busy && <Spinner size="tiny" />}
              {pkg.attachments.map((a) => (
                <a
                  key={a.url}
                  className={styles.attachChip}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.name}
                  <Open16Regular />
                </a>
              ))}
              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                accept={ACCEPTED_ATTACHMENT_ACCEPT}
                onChange={(e) => {
                  onPick(e.target.files).catch(() => undefined);
                }}
              />
            </div>

            <div className={styles.itemsHead}>
              <span>Itens cobertos por esta cotação</span>
              {belowMinimum.length > 0 && (
                <span className={styles.itemsLegend}>
                  {belowMinimum.length} sem as {REQUIRED_QUOTATIONS} cotações
                  obrigatórias
                </span>
              )}
              <Button size="small" appearance="subtle" onClick={selectAllBuy}>
                Selecionar todos
              </Button>
            </div>
            {missingPrice.length > 0 && (
              <div className={styles.itemsWarning}>
                {missingPrice.length} item(ns) marcado(s) sem valor unitário,
                informe o valor ou desmarque o item.
              </div>
            )}
            {coveredBelowMinimum.length > 0 && (
              <div className={styles.itemsWarning}>
                {coveredBelowMinimum.length} item(ns) marcado(s) ainda sem{" "}
                {REQUIRED_QUOTATIONS} cotações registradas — só é possível
                salvar; a conclusão exige o mínimo de {REQUIRED_QUOTATIONS}{" "}
                cotações por item.
              </div>
            )}

            <div className={styles.itemsTable}>
              {items.map((item) => {
                const covered = pkg.coveredSubItemIds.indexOf(item.id) >= 0;
                const line = lineFor(pkg, item.id);
                const priceMissing = covered && (line?.valorUnit ?? 0) <= 0;
                const count = countOf(item.id);
                const missingQuotes = count < REQUIRED_QUOTATIONS;
                return (
                  <div
                    key={item.id}
                    className={
                      missingQuotes
                        ? `${styles.itemRow} ${styles.itemRowPending}`
                        : styles.itemRow
                    }
                    title={`${count}/${REQUIRED_QUOTATIONS} cotações registradas`}
                  >
                    <Checkbox
                      checked={covered}
                      onChange={(_, d) => toggleItem(item, !!d.checked)}
                      aria-label={`Cobrir ${item.pn}`}
                    />
                    <div className={styles.itemIdentity}>
                      <span className={styles.pn}>{item.pn}</span>
                      <span className={styles.desc}>{item.descricao}</span>
                    </div>
                    <span
                      className={missingQuotes ? styles.countWarn : styles.qtd}
                    >
                      {count}/{REQUIRED_QUOTATIONS}
                    </span>
                    <span className={styles.qtd}>
                      {line?.qtd ?? item.qtd} {item.unit ?? "Und."}
                    </span>
                    <Input
                      size="small"
                      type="number"
                      min={0}
                      placeholder={covered ? "Valor unit. *" : "Valor unit."}
                      disabled={!covered}
                      aria-invalid={priceMissing}
                      className={priceMissing ? styles.inputInvalid : undefined}
                      value={String(line?.valorUnit || "")}
                      onChange={(_, d) =>
                        editLine(item.id, { valorUnit: num(d.value) })
                      }
                    />
                    <Input
                      size="small"
                      placeholder="Prazo"
                      disabled={!covered}
                      value={line?.prazoEntrega ?? ""}
                      onChange={(_, d) =>
                        editLine(item.id, { prazoEntrega: d.value })
                      }
                    />
                    <span className={styles.lineTotal}>
                      {formatCurrencyBRL(line?.valorTotal ?? 0)}
                    </span>
                  </div>
                );
              })}
            </div>

            <Field label="Observações">
              <Textarea
                resize="vertical"
                value={pkg.obs ?? ""}
                onChange={(_, d) => edit({ obs: d.value })}
              />
            </Field>

            <div className={styles.dialogTotal}>
              Total da cotação: <strong>{formatCurrencyBRL(total)}</strong>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => persist(false)}
              disabled={!canSave || upsert.isLoading}
            >
              Salvar
            </Button>
            <Button
              appearance="primary"
              icon={<CheckmarkCircle20Regular />}
              disabled={!canConclude || upsert.isLoading}
              title={
                coveredBelowMinimum.length > 0
                  ? `Cada item precisa de ${REQUIRED_QUOTATIONS} cotações registradas para ser concluído.`
                  : undefined
              }
              onClick={() => persist(true)}
            >
              Salvar e concluir
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export const QuotationsTab: React.FC<IQuotationsTabProps> = ({ fid, data }) => {
  const { teams, isAdmin } = useAccessLevel();
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const removePackage = useDeleteQuotationPackage(fid);
  const selectQuotation = useSelectQuotation(fid);
  const [editing, setEditing] = React.useState<IQuotationPackage | undefined>();
  const [drawingsFor, setDrawingsFor] = React.useState<ISubItem | undefined>();
  const [selected, setSelected] = React.useState<{ [id: string]: boolean }>({});

  const canEdit =
    (isAdmin ||
      teams.indexOf("scm") >= 0 ||
      teams.indexOf("purchasing") >= 0) &&
    !stageIsLocked(data, "quotations");
  const packages = data.quotationPackages ?? [];
  const items = quotableItems(data);
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  // Só faz sentido oferecer em massa o fornecedor que cobre TODOS os itens marcados.
  const bulkPackages = packages.filter((p) =>
    selectedIds.every((id) => p.coveredSubItemIds.indexOf(id) >= 0),
  );

  const applyBulk = (quotationId: string): void =>
    selectQuotation.mutate(
      { subItemIds: selectedIds, quotationId, by: user.displayName },
      {
        onSuccess: () => {
          addToast(
            `Fornecedor aplicado a ${selectedIds.length} item(ns).`,
            "success",
          );
          setSelected({});
        },
        onError: () => addToast("Falha ao aplicar o fornecedor.", "error"),
      },
    );

  if (items.length === 0) {
    return (
      <div className={styles.tab}>
        <StageCompletionCard fid={fid} data={data} stage="quotations" />
        <FidDrawingCard data={data} compact canEdit={canEdit} />
        <EmptyState
          title="Nada para cotar"
          description="O Planejamento precisa definir itens como Buy ou Make · SUBCON e iniciá-los."
        />
      </div>
    );
  }

  return (
    <div className={styles.tab}>
      <StageCompletionCard fid={fid} data={data} stage="quotations" />
      <FidDrawingCard data={data} compact canEdit={canEdit} />

      <GlassCard
        title="Pacotes de cotação"
        subtitle="Um fornecedor pode cotar vários itens de uma vez. Um PDF cobre todos eles."
        actions={
          <Button
            appearance="primary"
            icon={<Add20Regular />}
            disabled={!canEdit}
            onClick={() => setEditing(emptyPackage())}
          >
            Nova cotação
          </Button>
        }
      >
        {packages.length === 0 ? (
          <EmptyState
            title="Nenhuma cotação registrada"
            description="Registre a proposta do fornecedor e marque quais itens ela cobre."
          />
        ) : (
          <div className={styles.packages}>
            {packages.map((pkg) => (
              <div key={pkg.id} className={styles.packageCard}>
                <div className={styles.packageHead}>
                  <span className={styles.supplier}>{pkg.supplier}</span>
                  {pkg.reference && (
                    <span className={styles.ref}>#{pkg.reference}</span>
                  )}
                  <span className={styles.packageTotal}>
                    {formatCurrencyBRL(packageTotal(pkg))}
                  </span>
                </div>
                <div className={styles.packageMeta}>
                  <span>{pkg.coveredSubItemIds.length} item(ns)</span>
                  {pkg.date && <span>· {formatDate(pkg.date)}</span>}
                  {pkg.validade && (
                    <span>· validade {formatDate(pkg.validade)}</span>
                  )}
                  {pkg.leadTimeDays ? (
                    <span>· {pkg.leadTimeDays} dias</span>
                  ) : null}
                </div>
                <div className={styles.packageFiles}>
                  {pkg.attachments.map((a) => (
                    <a
                      key={a.url}
                      className={styles.attachChip}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.name}
                      <Open16Regular />
                    </a>
                  ))}
                </div>
                {canEdit && (
                  <div className={styles.packageActions}>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Edit16Regular />}
                      onClick={() => setEditing(pkg)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Delete16Regular />}
                      onClick={() =>
                        removePackage.mutate(
                          { quotationId: pkg.id, by: user.displayName },
                          {
                            onSuccess: () =>
                              addToast("Cotação removida.", "success"),
                          },
                        )
                      }
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard
        title="Comparativo por item"
        subtitle={`Cada item precisa de ${REQUIRED_QUOTATIONS} cotações registradas para ser concluído.`}
        noBodyPadding
      >
        {canEdit && selectedIds.length > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>
              {selectedIds.length} item(ns) selecionado(s)
            </span>
            {bulkPackages.length === 0 ? (
              <span className={styles.bulkEmpty}>
                Nenhum fornecedor cobre todos os itens selecionados.
              </span>
            ) : (
              <div className={styles.bulkOptions}>
                <span className={styles.bulkLabel}>Aplicar fornecedor:</span>
                {bulkPackages.map((pkg) => (
                  <Button
                    key={pkg.id}
                    size="small"
                    disabled={selectQuotation.isLoading}
                    onClick={() => applyBulk(pkg.id)}
                  >
                    {pkg.supplier}
                  </Button>
                ))}
              </div>
            )}
            <Button
              size="small"
              appearance="subtle"
              onClick={() => setSelected({})}
            >
              Limpar
            </Button>
          </div>
        )}
        <div className={styles.matrix}>
          <div className={styles.matrixHead}>
            <Checkbox
              checked={
                selectedIds.length === items.length
                  ? true
                  : selectedIds.length > 0
                    ? "mixed"
                    : false
              }
              disabled={!canEdit}
              aria-label="Selecionar todos os itens"
              onChange={(_, d) =>
                setSelected(
                  d.checked === true
                    ? items.reduce(
                        (acc, i) => ({ ...acc, [i.id]: true }),
                        {} as { [id: string]: boolean },
                      )
                    : {},
                )
              }
            />
            <span>Item</span>
            <span>Desenho</span>
            <span>Status</span>
            <span>Cotações</span>
            <span>Prazo</span>
            <span>Fornecedor vencedor</span>
          </div>
          {items.map((item) => {
            const covering = packagesForSubItem(data, item.id);
            const best = cheapestPackageId(covering, item.id);
            const chosen = item.selectedQuotationId ?? best;
            const chosenPkg = covering.filter((p) => p.id === chosen)[0];
            const revisao = revisionOfSubItem(data, item.id);
            return (
              <div key={item.id} className={styles.matrixRow}>
                <Checkbox
                  checked={!!selected[item.id]}
                  disabled={!canEdit}
                  aria-label={`Selecionar ${item.pn}`}
                  onChange={(_, d) =>
                    setSelected((s) => ({ ...s, [item.id]: !!d.checked }))
                  }
                />
                <div className={styles.itemIdentity}>
                  <span className={styles.pn}>
                    {item.pn}
                    {revisao && (
                      <Tooltip
                        content={`Revisão de ${revisao.solicitadoPor}: ${revisao.motivo}`}
                        relationship="label"
                      >
                        <span className={styles.revisionChip}>
                          <ArrowSync16Filled />
                          Em revisão
                        </span>
                      </Tooltip>
                    )}
                  </span>
                  <span className={styles.desc}>{item.descricao}</span>
                  {revisao && (
                    <span className={styles.revisionMotivo}>
                      {revisao.motivo}
                    </span>
                  )}
                </div>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Attach16Regular />}
                  onClick={() => setDrawingsFor(item)}
                >
                  {item.drawings?.length ? `${item.drawings.length}` : "Anexar"}
                </Button>
                <div>
                  <StatusBadge kind="subitem" status={item.status} />
                </div>
                <span
                  className={
                    covering.length >= REQUIRED_QUOTATIONS
                      ? styles.countOk
                      : styles.countWarn
                  }
                  title={
                    covering.length >= REQUIRED_QUOTATIONS
                      ? undefined
                      : `Faltam ${REQUIRED_QUOTATIONS - covering.length} cotação(ões) obrigatória(s).`
                  }
                >
                  {covering.length}/{REQUIRED_QUOTATIONS}
                </span>
                <span className={styles.prazo}>
                  {prazoLabel(
                    chosenPkg,
                    chosenPkg ? lineFor(chosenPkg, item.id) : undefined,
                  )}
                </span>
                <div className={styles.options}>
                  {covering.length === 0 ? (
                    <span className={styles.noQuote}>Sem cotação</span>
                  ) : (
                    <RadioGroup
                      layout="horizontal"
                      value={chosen ?? ""}
                      onChange={(_, d) =>
                        selectQuotation.mutate({
                          subItemIds: [item.id],
                          quotationId: d.value,
                          by: user.displayName,
                        })
                      }
                    >
                      {covering.map((pkg) => {
                        const line = lineFor(pkg, item.id);
                        const isBest = pkg.id === best;
                        return (
                          <Tooltip
                            key={pkg.id}
                            content={
                              isBest ? "Menor valor cotado" : pkg.supplier
                            }
                            relationship="label"
                          >
                            <Radio
                              disabled={!canEdit}
                              value={pkg.id}
                              label={
                                <span
                                  className={isBest ? styles.bestOption : ""}
                                >
                                  {pkg.supplier} ·{" "}
                                  {formatCurrencyBRL(line?.valorUnit ?? 0)} ·{" "}
                                  {prazoLabel(pkg, line)}
                                </span>
                              }
                            />
                          </Tooltip>
                        );
                      })}
                    </RadioGroup>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {editing && (
        <PackageForm
          fid={fid}
          data={data}
          initial={editing}
          onClose={() => setEditing(undefined)}
        />
      )}

      <SubItemDrawings
        fid={fid}
        subItem={drawingsFor}
        canEdit={canEdit}
        onClose={() => setDrawingsFor(undefined)}
      />
    </div>
  );
};

export default QuotationsTab;
