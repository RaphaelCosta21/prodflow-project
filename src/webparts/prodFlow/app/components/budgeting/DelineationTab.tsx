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
  CheckmarkCircle20Regular,
  Delete16Regular,
  Save20Regular,
} from "@fluentui/react-icons";
import {
  IDelineation,
  IDelineationMaterial,
  IFabricationRequest,
  ISubItem,
} from "../../models";
import {
  CONTRACT_MATERIAL_OPTIONS,
  materialByKey,
} from "../../config/contractWeights";
import { useUpdateDelineation } from "../../api/fids";
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

  React.useEffect(() => {
    setForm(subItem.delineation ?? createEmptyDelineation());
    setDirty(false);
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
          addToast(
            concluir ? "Delineamento concluído." : "Delineamento salvo.",
            "success",
          );
        },
        onError: () => addToast("Falha ao salvar o delineamento.", "error"),
      },
    );

  const total = withDerivedHh(form).hh;
  const hasMaterial = form.materials.some((m) => m.materialKey && m.kg > 0);
  const canConclude = total > 0 || hasMaterial;

  return (
    <GlassCard
      title={`${subItem.pn} — ${subItem.descricao}`}
      subtitle={`Complexidade ${subItem.complexity} · Revisão ${form.revision}`}
      actions={
        <div className={styles.cardActions}>
          <StatusBadge kind="subitem" status={subItem.status} />
          <Button
            size="small"
            icon={<Save20Regular />}
            disabled={!canEdit || !dirty || save.isLoading}
            onClick={() => persist(false)}
          >
            Salvar
          </Button>
          <Button
            size="small"
            appearance="primary"
            icon={<CheckmarkCircle20Regular />}
            disabled={!canEdit || save.isLoading || !canConclude}
            onClick={() => persist(true)}
          >
            Concluir
          </Button>
        </div>
      }
    >
      <div className={styles.hoursGrid}>
        <Field label="Horas de usinagem">
          <Input
            type="number"
            min={0}
            disabled={!canEdit}
            value={String(form.horasUsinagem || "")}
            onChange={(_, d) => edit({ horasUsinagem: num(d.value) })}
          />
        </Field>
        <Field label="Horas de acabamento">
          <Input
            type="number"
            min={0}
            disabled={!canEdit}
            value={String(form.horasAcabamento || "")}
            onChange={(_, d) => edit({ horasAcabamento: num(d.value) })}
          />
        </Field>
        <Field label="Horas de montagem">
          <Input
            type="number"
            min={0}
            disabled={!canEdit}
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
          disabled={!canEdit}
          label="Inspeção dimensional"
          onChange={(_, d) => edit({ inspecaoDimensional: d.checked })}
        />
        <Field label="Horas de inspeção">
          <Input
            type="number"
            min={0}
            disabled={!canEdit || !form.inspecaoDimensional}
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
            disabled={!canEdit}
            onClick={addMaterial}
          >
            Adicionar
          </Button>
        </div>
        {form.materials.length === 0 ? (
          <p className={styles.empty}>Nenhuma matéria-prima informada.</p>
        ) : (
          form.materials.map((m, i) => (
            <div key={`${m.materialKey}-${i}`} className={styles.materialRow}>
              <Dropdown
                size="small"
                placeholder="Selecionar material…"
                disabled={!canEdit}
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
                disabled={!canEdit}
                value={String(m.kg || "")}
                onChange={(_, d) => editMaterial(i, { kg: num(d.value) })}
              />
              <Button
                size="small"
                appearance="subtle"
                icon={<Delete16Regular />}
                disabled={!canEdit}
                onClick={() => removeMaterial(i)}
                aria-label="Remover material"
              />
            </div>
          ))
        )}
      </div>

      <div className={styles.extras}>
        <Field label="EPS">
          <Input
            disabled={!canEdit}
            value={form.eps ?? ""}
            onChange={(_, d) => edit({ eps: d.value })}
          />
        </Field>
        <Field label="Consumíveis">
          <Input
            disabled={!canEdit}
            value={form.consumables ?? ""}
            onChange={(_, d) => edit({ consumables: d.value })}
          />
        </Field>
      </div>

      <Field label="Notas">
        <Textarea
          disabled={!canEdit}
          resize="vertical"
          value={form.notes ?? ""}
          onChange={(_, d) => edit({ notes: d.value })}
        />
      </Field>

      {form.concluido && (
        <p className={styles.done}>
          Concluído por {form.concluidoPor} em {formatDate(form.concluidoEm)}.
        </p>
      )}
    </GlassCard>
  );
};

export const DelineationTab: React.FC<IDelineationTabProps> = ({
  fid,
  data,
}) => {
  const { teams, isAdmin } = useAccessLevel();
  const canEdit = isAdmin || teams.indexOf("industrialEngineering") >= 0;

  const items = data.subItems.filter(
    (s) => s.strategy === "Make" && s.makeSite === "InHouse" && s.startedAt,
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nada para delinear"
        description="O Planejamento precisa definir itens como Make · In-House e iniciá-los na página Sub-itens & Estratégia."
      />
    );
  }

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
      {items.map((s) => (
        <DelineationForm key={s.id} fid={fid} subItem={s} canEdit={canEdit} />
      ))}
    </div>
  );
};

export default DelineationTab;
