import * as React from "react";
import {
  Button,
  Checkbox,
  Dropdown,
  Field,
  Input,
  Option,
  Textarea,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add16Regular,
  Attach16Regular,
  CheckmarkCircle20Regular,
  ChevronDown20Regular,
  ChevronUp20Regular,
  Delete16Regular,
  Edit20Regular,
  Open16Regular,
  Save20Regular,
} from "@fluentui/react-icons";
import {
  IBudgetReportRevision,
  IDelineation,
  IDelineationMaterial,
  IFabricationRequest,
  ISubItem,
} from "../../models";
import { ACCEPTED_ATTACHMENT_ACCEPT } from "../../config/attachments";
import { isInternalMake } from "../../config/workflows";
import {
  CONTRACT_MATERIAL_OPTIONS,
  CONTRACT_SERVICES,
  materialByKey,
} from "../../config/contractWeights";
import {
  useConcludeFabAnalysis,
  useReopenFabAnalysis,
  useSaveNotes,
  useSetMakeDecision,
  useUpdateDelineation,
} from "../../api/fids";
import {
  IPendingAttachment,
  useRemoveAttachment,
  useUploadAttachments,
} from "../../api/attachments";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import {
  createEmptyDelineation,
  delineationServices,
  withDerivedHh,
} from "../../utils/requestFactory";
import { formatDate } from "../../utils/formatters";
import { revisionOfSubItem, stageIsLocked } from "../../utils/budgetApproval";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import FidDrawingCard from "../common/FidDrawingCard";
import ReportRevisionNote from "./ReportRevisionNote";
import StageCompletionCard from "./StageCompletionCard";
import SubItemDrawings from "./SubItemDrawings";
import styles from "./DelineationTab.module.scss";

export interface IDelineationTabProps {
  fid: string;
  data: IFabricationRequest;
}

const num = (v: string): number =>
  v === "" ? 0 : Math.max(0, Number(v.replace(",", ".")) || 0);

const pesoFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 6,
  maximumFractionDigits: 6,
});

const MATERIAL_DIMENSIONS: {
  key: "largura" | "comprimento" | "altura";
  label: string;
}[] = [
  { key: "largura", label: "Largura" },
  { key: "comprimento", label: "Comprimento" },
  { key: "altura", label: "Altura" },
];

const NOTES_SECTION = "delineation";
const NOTES_LABEL = "Notas do delineamento";

const DelineationForm: React.FC<{
  fid: string;
  subItem: ISubItem;
  canEdit: boolean;
  revisao?: IBudgetReportRevision;
  onOpenDrawings: (subItem: ISubItem) => void;
}> = ({ fid, subItem, canEdit, revisao, onOpenDrawings }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const save = useUpdateDelineation(fid);

  const [form, setForm] = React.useState<IDelineation>(
    () => subItem.delineation ?? createEmptyDelineation(),
  );
  const [dirty, setDirty] = React.useState(false);
  const [expanded, setExpanded] = React.useState(!!revisao);
  const [editing, setEditing] = React.useState(false);
  const editable = canEdit && editing;

  React.useEffect(() => {
    setForm(subItem.delineation ?? createEmptyDelineation());
    setDirty(false);
    setEditing(false);
  }, [subItem.id, subItem.delineation]);

  const edit = (patch: Partial<IDelineation>): void => {
    setForm((f) => withDerivedHh({ ...f, ...patch }));
    setDirty(true);
  };

  const editMaterial = (
    index: number,
    patch: Partial<IDelineationMaterial>,
  ): void =>
    edit({
      materials: form.materials.map((m, i) =>
        i === index ? { ...m, ...patch } : m,
      ),
    });

  const addMaterial = (): void =>
    edit({
      materials: form.materials.concat({
        materialKey: "",
        categoria: "",
        descricao: "",
        kg: 0,
      }),
    });

  const removeMaterial = (index: number): void =>
    edit({ materials: form.materials.filter((_, i) => i !== index) });

  const services = delineationServices(form);
  const serviceQtd = (key: string): number | undefined =>
    services.filter((s) => s.serviceKey === key)[0]?.qtd;

  const toggleService = (key: string, checked: boolean): void =>
    edit({
      services: checked
        ? services.concat({ serviceKey: key, qtd: 0 })
        : services.filter((s) => s.serviceKey !== key),
    });

  const setServiceQtd = (key: string, qtd: number): void =>
    edit({
      services: services.map((s) => (s.serviceKey === key ? { ...s, qtd } : s)),
    });

  const persist = (concluir: boolean): void =>
    save.mutate(
      {
        subItemId: subItem.id,
        delineation: form,
        by: user.displayName,
        concluir,
      },
      {
        onSuccess: () => {
          setDirty(false);
          setEditing(false);
          addToast(
            concluir ? "Delineamento concluído." : "Delineamento salvo.",
            "success",
          );
        },
        onError: () => addToast("Falha ao salvar o delineamento.", "error"),
      },
    );

  const startEditing = (): void => {
    setExpanded(true);
    setEditing(true);
  };

  const cancelEditing = (): void => {
    setForm(subItem.delineation ?? createEmptyDelineation());
    setDirty(false);
    setEditing(false);
  };

  const total = withDerivedHh(form).hh;
  const hasMaterial = form.materials.some((m) => m.materialKey && m.kg > 0);

  const hhError =
    total > 0 ? undefined : "Informe ao menos uma hora de fabricação.";
  const serviceErrors: Record<string, string> = {};
  for (const s of services) {
    if (!(s.qtd > 0)) {
      const criterio = CONTRACT_SERVICES.filter(
        (c) => c.key === s.serviceKey,
      )[0]?.criterio;
      serviceErrors[s.serviceKey] =
        `Informe a quantidade${criterio ? ` (${criterio})` : ""}.`;
    }
  }
  const materialsError =
    form.materials.length === 0
      ? "Adicione ao menos uma matéria-prima."
      : undefined;
  const materialErrors = form.materials.map((m) => ({
    materialKey: m.materialKey ? undefined : "Selecione o material.",
    kg: m.kg > 0 ? undefined : "Informe o peso em kg.",
  }));

  const canConclude =
    !hhError &&
    !materialsError &&
    Object.keys(serviceErrors).length === 0 &&
    materialErrors.every((e) => !e.materialKey && !e.kg);

  return (
    <GlassCard
      title={`${subItem.pn} — ${subItem.descricao}`}
      subtitle={`Complexidade ${subItem.complexity} · Revisão ${form.revision} · ${total} HH`}
      actions={
        <div className={styles.cardActions}>
          <Button
            size="small"
            appearance="subtle"
            icon={<Attach16Regular />}
            onClick={() => onOpenDrawings(subItem)}
          >
            {subItem.drawings?.length
              ? `${subItem.drawings.length} desenho(s)`
              : "Anexar desenho"}
          </Button>
          <StatusBadge kind="subitem" status={subItem.status} />
          {editing ? (
            <>
              <Button
                size="small"
                appearance="subtle"
                onClick={cancelEditing}
                disabled={save.isLoading}
              >
                Cancelar
              </Button>
              <Button
                size="small"
                appearance="primary"
                icon={<Save20Regular />}
                disabled={!dirty || save.isLoading}
                onClick={() => persist(false)}
              >
                Salvar
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                icon={<Edit20Regular />}
                disabled={!canEdit || save.isLoading}
                onClick={startEditing}
              >
                Editar
              </Button>
              {!form.concluido && (
                <Button
                  size="small"
                  appearance="primary"
                  icon={<CheckmarkCircle20Regular />}
                  disabled={!canEdit || save.isLoading || !canConclude}
                  onClick={() => persist(true)}
                >
                  Concluir
                </Button>
              )}
            </>
          )}
          <Button
            size="small"
            appearance="subtle"
            icon={expanded ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
            aria-label={expanded ? "Recolher" : "Expandir"}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          />
        </div>
      }
    >
      {revisao && (
        <ReportRevisionNote revisao={revisao} className={styles.revisionNote} />
      )}
      {!expanded ? (
        <button
          type="button"
          className={styles.collapsedSummary}
          onClick={() => setExpanded(true)}
        >
          {total > 0 || hasMaterial
            ? `${total} HH · ${form.materials.length} linha(s) de matéria-prima · ${services.length} serviço(s) adicional(is)`
            : "Sem horas ou matéria-prima informadas"}
          {form.concluido ? " · concluído" : ""}
        </button>
      ) : (
        <>
          <div className={styles.hoursGrid}>
            <Field label="Horas de usinagem">
              <Input
                type="number"
                min={0}
                disabled={!editable}
                value={String(form.horasUsinagem || "")}
                onChange={(_, d) => edit({ horasUsinagem: num(d.value) })}
              />
            </Field>
            <Field label="Horas de acabamento">
              <Input
                type="number"
                min={0}
                disabled={!editable}
                value={String(form.horasAcabamento || "")}
                onChange={(_, d) => edit({ horasAcabamento: num(d.value) })}
              />
            </Field>
            <Field label="Horas de montagem">
              <Input
                type="number"
                min={0}
                disabled={!editable}
                value={String(form.horasMontagem || "")}
                onChange={(_, d) => edit({ horasMontagem: num(d.value) })}
              />
            </Field>
            <Field
              label="Total (HH)"
              required
              validationState={hhError ? "error" : "none"}
              validationMessage={hhError}
            >
              <Input value={String(total)} disabled />
            </Field>
          </div>

          <div className={styles.services}>
            <div className={styles.materialsHead}>
              <span>Serviços adicionais — Tabela 1</span>
            </div>
            <p className={styles.hint}>
              Marque os serviços aplicáveis e informe a quantidade no critério
              do contrato.
            </p>
            <div className={styles.servicesHead}>
              <span>Serviço</span>
              <span>Critério</span>
              <span>QTD</span>
              <span>Peso</span>
              <span>Peso Total</span>
            </div>
            {CONTRACT_SERVICES.map((s) => {
              const qtd = serviceQtd(s.key);
              const checked = qtd !== undefined;
              const pesoTotal = (qtd || 0) * s.peso;
              return (
                <div key={s.key} className={styles.serviceRow}>
                  <Checkbox
                    label={s.label}
                    checked={checked}
                    disabled={!editable}
                    onChange={(_, d) => toggleService(s.key, !!d.checked)}
                  />
                  <span className={styles.criterio}>{s.criterio}</span>
                  <Field
                    validationState={serviceErrors[s.key] ? "error" : "none"}
                    validationMessage={serviceErrors[s.key]}
                  >
                    <Input
                      size="small"
                      type="number"
                      min={0}
                      appearance="filled-darker"
                      aria-label={`Quantidade — ${s.label}`}
                      disabled={!editable || !checked}
                      value={qtd ? String(qtd) : ""}
                      onChange={(_, d) => setServiceQtd(s.key, num(d.value))}
                    />
                  </Field>
                  <span className={styles.peso}>{pesoFmt.format(s.peso)}</span>
                  <span className={styles.peso}>
                    {pesoTotal ? pesoFmt.format(pesoTotal) : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.materials}>
            <div className={styles.materialsHead}>
              <span>Matéria-prima (catálogo do contrato)</span>
              <Button
                size="small"
                appearance="subtle"
                icon={<Add16Regular />}
                disabled={!editable}
                onClick={addMaterial}
              >
                Adicionar
              </Button>
            </div>
            <p className={styles.hint}>
              Chapas, barras e tubos do catálogo de preços do contrato, em kg.
              Pelo menos uma linha é obrigatória.
            </p>
            {form.materials.length === 0 ? (
              <p className={styles.empty}>{materialsError}</p>
            ) : (
              form.materials.map((m, i) => (
                <div key={`${m.materialKey}-${i}`} className={styles.material}>
                  <div className={styles.materialRow}>
                    <Field
                      validationState={
                        materialErrors[i].materialKey ? "error" : "none"
                      }
                      validationMessage={materialErrors[i].materialKey}
                    >
                      <Dropdown
                        size="small"
                        placeholder="Selecionar material…"
                        disabled={!editable}
                        value={
                          CONTRACT_MATERIAL_OPTIONS.filter(
                            (o) => o.key === m.materialKey,
                          )[0]?.label ?? ""
                        }
                        selectedOptions={m.materialKey ? [m.materialKey] : []}
                        onOptionSelect={(_, d) => {
                          const row = materialByKey(String(d.optionValue));
                          if (row)
                            editMaterial(i, {
                              materialKey: row.key,
                              categoria: row.categoria,
                              descricao: row.descricao,
                            });
                        }}
                      >
                        {CONTRACT_MATERIAL_OPTIONS.map((o) => (
                          <Option key={o.key} value={o.key} text={o.label}>
                            {o.label}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                    <Field
                      validationState={materialErrors[i].kg ? "error" : "none"}
                      validationMessage={materialErrors[i].kg}
                    >
                      <Input
                        size="small"
                        type="number"
                        min={0}
                        aria-label="Peso em kg"
                        contentAfter={<span className={styles.unit}>kg</span>}
                        disabled={!editable}
                        value={String(m.kg || "")}
                        onChange={(_, d) =>
                          editMaterial(i, { kg: num(d.value) })
                        }
                      />
                    </Field>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Delete16Regular />}
                      disabled={!editable}
                      onClick={() => removeMaterial(i)}
                      aria-label="Remover material"
                    />
                  </div>
                  <div className={styles.materialDims}>
                    <span className={styles.dimsLabel}>
                      Dimensões (opcional)
                    </span>
                    {MATERIAL_DIMENSIONS.map((dim) => (
                      <Input
                        key={dim.key}
                        size="small"
                        type="number"
                        min={0}
                        placeholder={dim.label}
                        aria-label={`${dim.label} — mm`}
                        contentAfter={<span className={styles.unit}>mm</span>}
                        disabled={!editable}
                        value={String(m[dim.key] || "")}
                        onChange={(_, d) =>
                          editMaterial(i, { [dim.key]: num(d.value) })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <Field label="Notas">
            <Textarea
              disabled={!editable}
              resize="vertical"
              placeholder="Premissas, tolerâncias e, se preferir, as dimensões da matéria-prima (largura × comprimento × altura)."
              value={form.notes ?? ""}
              onChange={(_, d) => edit({ notes: d.value })}
            />
          </Field>

          {form.concluido && (
            <p className={styles.done}>
              Concluído por {form.concluidoPor} em{" "}
              {formatDate(form.concluidoEm)}.
            </p>
          )}
        </>
      )}
    </GlassCard>
  );
};

const DelineationDocuments: React.FC<{
  fid: string;
  data: IFabricationRequest;
  canEdit: boolean;
}> = ({ fid, data, canEdit }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const upload = useUploadAttachments();
  const remove = useRemoveAttachment();
  const saveNotes = useSaveNotes(fid);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const savedNotes = data.notes?.[NOTES_SECTION] ?? "";
  const [notes, setNotes] = React.useState(savedNotes);
  const savedRef = React.useRef(savedNotes);

  React.useEffect(() => {
    if (savedRef.current !== savedNotes) {
      savedRef.current = savedNotes;
      setNotes(savedNotes);
    }
  }, [savedNotes]);

  const docs = data.attachments.filter((a) => a.category === "DEL");
  const busy = upload.isLoading || remove.isLoading;

  const persistNotes = (): void =>
    saveNotes.mutate(
      {
        section: NOTES_SECTION,
        sectionLabel: NOTES_LABEL,
        text: notes,
        by: user.displayName,
      },
      {
        onSuccess: () => addToast("Notas salvas.", "success"),
        onError: () => addToast("Falha ao salvar as notas.", "error"),
      },
    );

  const onPick = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    const items: IPendingAttachment[] = [];
    for (let i = 0; i < files.length; i++)
      items.push({ file: files[i], category: "DEL" });
    upload.mutate(
      { fid, items, by: user.displayName },
      {
        onSuccess: (result) => {
          if (result.uploaded.length > 0)
            addToast(
              `${result.uploaded.length} documento(s) anexado(s).`,
              "success",
            );
          if (result.failed.length > 0)
            addToast(`Falha ao enviar: ${result.failed.join(", ")}`, "error");
        },
        onError: () => addToast("Falha ao anexar o documento.", "error"),
        onSettled: () => {
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
  };

  return (
    <GlassCard
      title="Documento de Delineamento (FID)"
      subtitle="PDF geral do delineamento de fabricação."
      actions={
        <Button
          size="small"
          icon={<Attach16Regular />}
          disabled={!canEdit || busy}
          onClick={() => inputRef.current?.click()}
        >
          Anexar
        </Button>
      }
    >
      {docs.length === 0 ? (
        <p className={styles.empty}>Nenhum documento anexado.</p>
      ) : (
        <div className={styles.docList}>
          {docs.map((doc) => (
            <div key={doc.url} className={styles.docRow}>
              <a
                className={styles.docLink}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
              >
                {doc.name}
                <Open16Regular />
              </a>
              <span className={styles.docMeta}>
                {[doc.uploadedBy, doc.uploadedAt && formatDate(doc.uploadedAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <Button
                size="small"
                appearance="subtle"
                icon={<Delete16Regular />}
                disabled={!canEdit || busy}
                aria-label={`Remover ${doc.name}`}
                onClick={() =>
                  remove.mutate({
                    fid,
                    attachment: doc,
                    by: user.displayName,
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ACCEPTED_ATTACHMENT_ACCEPT}
        onChange={(e) => onPick(e.target.files)}
      />

      <div className={styles.generalNotes}>
        <Field
          label={NOTES_LABEL}
          hint="Premissas, restrições, especificações, tolerâncias que valem para todo o delineamento do FID."
        >
          <Textarea
            resize="vertical"
            disabled={!canEdit || saveNotes.isLoading}
            value={notes}
            onChange={(_, d) => setNotes(d.value)}
          />
        </Field>
        <div className={styles.notesActions}>
          {data.notesMeta?.[NOTES_SECTION] && (
            <span className={styles.docMeta}>
              {data.notesMeta[NOTES_SECTION].by} ·{" "}
              {formatDate(data.notesMeta[NOTES_SECTION].at)}
            </span>
          )}
          <Button
            size="small"
            icon={<Save20Regular />}
            disabled={!canEdit || notes === savedNotes || saveNotes.isLoading}
            onClick={persistNotes}
          >
            Salvar notas
          </Button>
        </div>
      </div>
    </GlassCard>
  );
};

const AnalysisSection: React.FC<{
  fid: string;
  data: IFabricationRequest;
  canEdit: boolean;
  onOpenDrawings: (subItem: ISubItem) => void;
}> = ({ fid, data, canEdit, onOpenDrawings }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const setDecision = useSetMakeDecision(fid);
  const conclude = useConcludeFabAnalysis(fid);
  const reopen = useReopenFabAnalysis(fid);
  const [semMakeInterno, setSemMakeInterno] = React.useState(
    data.fabAnalysis?.semMakeInterno ?? false,
  );

  React.useEffect(() => {
    setSemMakeInterno(data.fabAnalysis?.semMakeInterno ?? false);
  }, [data.fabAnalysis?.semMakeInterno]);

  const pending = data.subItems.filter(
    (s) => !!s.engAnalysis?.requestedAt && !s.engAnalysis?.decidedAt,
  );
  const decided = data.subItems.filter(
    (s) => !!s.engAnalysis?.requestedAt && !!s.engAnalysis?.decidedAt,
  );
  const requestedAny = pending.length > 0 || decided.length > 0;

  const applyDecision = (
    item: ISubItem,
    makeSite: "InHouse" | "Subcon",
    reset = false,
  ): void => {
    setDecision.mutate(
      { subItemIds: [item.id], makeSite, by: user.displayName, reset },
      {
        onSuccess: () =>
          addToast(
            `${item.pn}: Make · ${makeSite === "InHouse" ? "In-House" : "SUBCON"}.`,
            "success",
          ),
        onError: (err) => addToast(String(err), "error"),
      },
    );
  };

  const onChangeDecision = (
    item: ISubItem,
    next: "InHouse" | "Subcon",
  ): void => {
    if (item.makeSite === next) return;
    if (
      !window.confirm(
        `Alterar ${item.pn} para Make · ${next === "InHouse" ? "In-House" : "SUBCON"} e resetar trabalho existente?`,
      )
    )
      return;
    applyDecision(item, next, true);
  };

  const onConclude = (): void => {
    conclude.mutate(
      { by: user.displayName, semMakeInterno },
      {
        onSuccess: () =>
          addToast("Análise de fabricação concluída.", "success"),
        onError: (err) => addToast(String(err), "error"),
      },
    );
  };

  const concluded = !!data.fabAnalysis?.concluidoEm;

  const decisionChips = (
    item: ISubItem,
    isDecided: boolean,
  ): React.ReactNode => {
    const options: { site: "InHouse" | "Subcon"; label: string }[] = [
      { site: "InHouse", label: "Make · IH" },
      { site: "Subcon", label: "Make · SUB" },
    ];
    return options.map((o) => {
      const active = isDecided && item.makeSite === o.site;
      return (
        <Tooltip
          key={o.site}
          content={
            active
              ? `Definido como ${o.label}`
              : `Definir ${item.pn} como ${o.label}`
          }
          relationship="label"
        >
          <button
            type="button"
            className={`${styles.chip} ${styles.chipMake} ${
              active ? styles.chipActive : ""
            }`}
            aria-pressed={active}
            disabled={!canEdit || concluded || setDecision.isLoading || active}
            onClick={() =>
              isDecided
                ? onChangeDecision(item, o.site)
                : applyDecision(item, o.site)
            }
          >
            {o.label}
          </button>
        </Tooltip>
      );
    });
  };

  return (
    <GlassCard
      title="Análise de fabricação"
      subtitle="A Engenharia Industrial define Make · In-House ou Make · SUBCON para as linhas solicitadas."
      actions={
        <div className={styles.analysisActions}>
          {concluded ? (
            <Button
              size="small"
              appearance="secondary"
              disabled={!canEdit || reopen.isLoading}
              onClick={() =>
                reopen.mutate(
                  { by: user.displayName },
                  {
                    onSuccess: () => addToast("Análise reaberta.", "success"),
                    onError: (err) => addToast(String(err), "error"),
                  },
                )
              }
            >
              Reabrir análise
            </Button>
          ) : (
            <Button
              size="small"
              appearance="primary"
              icon={<CheckmarkCircle20Regular />}
              disabled={!canEdit || conclude.isLoading || pending.length > 0}
              onClick={onConclude}
            >
              Concluir análise
            </Button>
          )}
        </div>
      }
    >
      {concluded && (
        <p className={styles.done}>
          Concluído por {data.fabAnalysis?.concluidoPor} em{" "}
          {formatDate(data.fabAnalysis?.concluidoEm)}.
        </p>
      )}

      {!requestedAny && (
        <div className={styles.analysisFlag}>
          <Checkbox
            checked={semMakeInterno}
            disabled={!canEdit || concluded}
            label="Não há itens de fabricação interna neste FID"
            onChange={(_, d) => setSemMakeInterno(!!d.checked)}
          />
        </div>
      )}

      {!requestedAny ? (
        <p className={styles.empty}>
          Nenhuma linha aguardando análise. O Planejamento deve solicitar na aba
          Sub-itens & Estratégia.
        </p>
      ) : (
        <div className={styles.analysisList}>
          {pending.length > 0 && (
            <>
              <h4 className={styles.analysisTitle}>Pendentes</h4>
              {pending.map((item) => (
                <div key={item.id} className={styles.analysisRow}>
                  <div className={styles.analysisItem}>
                    <strong>{item.pn}</strong>
                    <span>{item.descricao}</span>
                    <span className={styles.docMeta}>
                      {item.engAnalysis?.requestedBy} ·{" "}
                      {formatDate(item.engAnalysis?.requestedAt)}
                    </span>
                  </div>
                  <div className={styles.analysisButtons}>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Attach16Regular />}
                      onClick={() => onOpenDrawings(item)}
                    >
                      {item.drawings?.length
                        ? `${item.drawings.length}`
                        : "Anexar"}
                    </Button>
                    {decisionChips(item, false)}
                  </div>
                </div>
              ))}
            </>
          )}

          {decided.length > 0 && (
            <>
              <h4 className={styles.analysisTitle}>Decididas</h4>
              {decided.map((item) => (
                <div key={item.id} className={styles.analysisRow}>
                  <div className={styles.analysisItem}>
                    <strong>{item.pn}</strong>
                    <span>{item.descricao}</span>
                    <span className={styles.docMeta}>
                      {item.engAnalysis?.decidedBy} ·{" "}
                      {formatDate(item.engAnalysis?.decidedAt)}
                    </span>
                  </div>
                  <div className={styles.analysisButtons}>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<Attach16Regular />}
                      onClick={() => onOpenDrawings(item)}
                    >
                      {item.drawings?.length
                        ? `${item.drawings.length}`
                        : "Anexar"}
                    </Button>
                    {decisionChips(item, true)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
};

export const DelineationTab: React.FC<IDelineationTabProps> = ({
  fid,
  data,
}) => {
  const { teams, isAdmin } = useAccessLevel();
  const locked = stageIsLocked(data, "delineation");
  const isOwner = isAdmin || teams.indexOf("industrialEngineering") >= 0;
  const canEdit = isOwner && !locked;
  const [drawingsFor, setDrawingsFor] = React.useState<ISubItem | undefined>();
  const analysisConcluded = !!data.fabAnalysis?.concluidoEm;
  const hideForms = analysisConcluded && data.fabAnalysis?.semMakeInterno;
  const items = data.subItems.filter((s) => isInternalMake(s) && s.startedAt);

  return (
    <div className={styles.tab}>
      <StageCompletionCard fid={fid} data={data} stage="delineation" />
      {!isOwner && (
        <Tooltip
          content="Somente a Engenharia Industrial pode editar."
          relationship="label"
        >
          <p className={styles.readonly}>
            Modo leitura — a análise e o delineamento são da Engenharia
            Industrial.
          </p>
        </Tooltip>
      )}
      <FidDrawingCard data={data} compact canEdit={canEdit} />
      <AnalysisSection
        fid={fid}
        data={data}
        canEdit={canEdit}
        onOpenDrawings={setDrawingsFor}
      />
      <DelineationDocuments fid={fid} data={data} canEdit={canEdit} />
      {hideForms ? (
        <EmptyState
          title="Sem delineamento interno"
          description="A análise foi concluída sem itens Make · In-House. O fluxo segue com Planejamento e Cotações para itens SUBCON."
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nada para delinear"
          description="Após a análise, os itens marcados como Make · In-House aparecem aqui para preenchimento do delineamento."
        />
      ) : (
        items.map((s) => (
          <DelineationForm
            key={s.id}
            fid={fid}
            subItem={s}
            canEdit={canEdit}
            revisao={revisionOfSubItem(data, s.id)}
            onOpenDrawings={setDrawingsFor}
          />
        ))
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

export default DelineationTab;
