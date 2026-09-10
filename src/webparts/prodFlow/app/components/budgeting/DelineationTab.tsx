import * as React from "react";
import {
  Button,
  Dropdown,
  Field,
  Input,
  Option,
  Switch,
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
  IDelineation,
  IDelineationMaterial,
  IFabricationRequest,
  ISubItem,
} from "../../models";
import { ACCEPTED_ATTACHMENT_ACCEPT } from "../../config/attachments";
import { isInternalMake } from "../../config/workflows";
import {
  CONTRACT_MATERIAL_OPTIONS,
  materialByKey,
} from "../../config/contractWeights";
import { useUpdateDelineation, useSaveNotes } from "../../api/fids";
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
  withDerivedHh,
} from "../../utils/requestFactory";
import { formatDate } from "../../utils/formatters";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import styles from "./DelineationTab.module.scss";

export interface IDelineationTabProps {
  fid: string;
  data: IFabricationRequest;
}

const num = (v: string): number =>
  v === "" ? 0 : Math.max(0, Number(v.replace(",", ".")) || 0);

// Chave em `request.notes` — as notas gerais do delineamento valem para o FID inteiro.
const NOTES_SECTION = "delineation";
const NOTES_LABEL = "Notas do delineamento";

const DelineationForm: React.FC<{
  fid: string;
  subItem: ISubItem;
  canEdit: boolean;
}> = ({ fid, subItem, canEdit }) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const save = useUpdateDelineation(fid);

  const [form, setForm] = React.useState<IDelineation>(
    () => subItem.delineation ?? createEmptyDelineation(),
  );
  const [dirty, setDirty] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
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
  const canConclude = total > 0 || hasMaterial;

  return (
    <GlassCard
      title={`${subItem.pn} — ${subItem.descricao}`}
      subtitle={`Complexidade ${subItem.complexity} · Revisão ${form.revision} · ${total} HH`}
      actions={
        <div className={styles.cardActions}>
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
      {!expanded ? (
        <button
          type="button"
          className={styles.collapsedSummary}
          onClick={() => setExpanded(true)}
        >
          {total > 0 || hasMaterial
            ? `${total} HH · ${form.materials.length} linha(s) de matéria-prima`
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
            <Field label="Total (HH)">
              <Input value={String(total)} disabled />
            </Field>
          </div>

          <div className={styles.inspection}>
            <Switch
              checked={form.inspecaoDimensional}
              disabled={!editable}
              label="Inspeção dimensional"
              onChange={(_, d) => edit({ inspecaoDimensional: d.checked })}
            />
            <Field label="Horas de inspeção">
              <Input
                type="number"
                min={0}
                disabled={!editable || !form.inspecaoDimensional}
                value={String(form.horasInspecao || "")}
                onChange={(_, d) => edit({ horasInspecao: num(d.value) })}
              />
            </Field>
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
            </p>
            {form.materials.length === 0 ? (
              <p className={styles.empty}>Nenhuma matéria-prima informada.</p>
            ) : (
              form.materials.map((m, i) => (
                <div
                  key={`${m.materialKey}-${i}`}
                  className={styles.materialRow}
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
                  <Input
                    size="small"
                    type="number"
                    min={0}
                    contentAfter={<span className={styles.unit}>kg</span>}
                    disabled={!editable}
                    value={String(m.kg || "")}
                    onChange={(_, d) => editMaterial(i, { kg: num(d.value) })}
                  />
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Delete16Regular />}
                    disabled={!editable}
                    onClick={() => removeMaterial(i)}
                    aria-label="Remover material"
                  />
                </div>
              ))
            )}
          </div>

          <Field label="Notas">
            <Textarea
              disabled={!editable}
              resize="vertical"
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

// Documento único do FID (não é por sub-item): o PDF do delineamento de fabricação.
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

  // Só adota a nota do servidor quando ela muda de verdade, para um refetch não apagar o rascunho.
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
    for (let i = 0; i < files.length; i++) {
      items.push({ file: files[i], category: "DEL" });
    }
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

export const DelineationTab: React.FC<IDelineationTabProps> = ({
  fid,
  data,
}) => {
  const { teams, isAdmin } = useAccessLevel();
  const canEdit = isAdmin || teams.indexOf("industrialEngineering") >= 0;

  const items = data.subItems.filter((s) => isInternalMake(s) && s.startedAt);

  return (
    <div className={styles.tab}>
      {!canEdit && (
        <Tooltip
          content="Somente a Engenharia Industrial pode editar."
          relationship="label"
        >
          <p className={styles.readonly}>
            Modo leitura — o preenchimento é da Engenharia Industrial.
          </p>
        </Tooltip>
      )}
      <DelineationDocuments fid={fid} data={data} canEdit={canEdit} />
      {items.length === 0 ? (
        <EmptyState
          title="Nada para delinear"
          description="O Planejamento precisa definir itens como Make · In-House e iniciá-los na página Sub-itens & Estratégia. Make · SUBCON é fabricação externa e vai para Cotações."
        />
      ) : (
        items.map((s) => (
          <DelineationForm key={s.id} fid={fid} subItem={s} canEdit={canEdit} />
        ))
      )}
    </div>
  );
};

export default DelineationTab;
