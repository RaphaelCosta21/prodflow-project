import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Field,
  Input,
  Textarea,
  Dropdown,
  Option,
  Spinner,
} from "@fluentui/react-components";
import { Attendance, Complexity } from "../../models";
import { useSpfxContext } from "../../config/SpfxContext";
import { useUIStore } from "../../stores/useUIStore";
import { useCreateFid } from "../../api/fids";
import { SlaService } from "../../services/SlaService";
import { buildNewRequest, INewRequestInput } from "../../utils/requestFactory";
import { fidDetailPath } from "../../config/routes";
import styles from "./CreateFidDialog.module.scss";

const COMPLEXITIES: Complexity[] = [
  "Baixa",
  "Média",
  "Alta",
  "N/A",
  "A definir",
];
const ATTENDANCES: Attendance[] = ["Interna", "Externa"];
const OS_TYPES: Array<"OS" | "OM"> = ["OS", "OM"];

function initialForm(user: string): INewRequestInput {
  return {
    osNumber: "",
    osType: "OS",
    projeto: "CIDEQ",
    lote: "",
    drawingCode: "",
    drawingRevision: "",
    descricao: "",
    comentarios: "",
    tipoOrcamento: "Fabricação",
    complexidadeUsinagem: "A definir",
    complexidadeCaldeiraria: "A definir",
    atendimento: "Interna",
    solicitacaoOrcamento: new Date().toISOString().slice(0, 10),
    prazoDiasCorridos: undefined,
    createdBy: user,
  };
}

export interface ICreateFidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateFidDialog: React.FC<ICreateFidDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const context = useSpfxContext();
  const user = context.pageContext.user.displayName;
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const createFid = useCreateFid();
  const [form, setForm] = React.useState<INewRequestInput>(() =>
    initialForm(user),
  );

  React.useEffect(() => {
    if (open) setForm(initialForm(user));
  }, [open, user]);

  const set = <K extends keyof INewRequestInput>(
    key: K,
    value: INewRequestInput[K],
  ): void => setForm((f) => ({ ...f, [key]: value }));

  const complexidadeGeral = SlaService.complexidadeGeral(
    form.complexidadeUsinagem,
    form.complexidadeCaldeiraria,
  );
  const prazoDiasUteis = SlaService.prazoDiasUteis(
    complexidadeGeral,
    form.atendimento,
  );
  const isValid =
    form.osNumber.trim() !== "" &&
    form.descricao.trim() !== "" &&
    form.drawingCode.trim() !== "";

  const onSubmit = (): void => {
    createFid.mutate(buildNewRequest(form), {
      onSuccess: (created) => {
        addToast(`FID ${created.fid} criado.`, "success");
        onOpenChange(false);
        navigate(fidDetailPath(created.fid));
      },
      onError: (e) => addToast(`Erro ao criar FID: ${String(e)}`, "error"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Novo FID a partir da OS</DialogTitle>
          <DialogContent>
            <div className={styles.grid}>
              <Field label="OS / OM" required>
                <Input
                  value={form.osNumber}
                  onChange={(_, d) => set("osNumber", d.value)}
                  placeholder="6000786587"
                />
              </Field>
              <Field label="Tipo">
                <Dropdown
                  value={form.osType ?? "OS"}
                  selectedOptions={form.osType ? [form.osType] : []}
                  onOptionSelect={(_, d) => {
                    if (d.optionValue)
                      set("osType", d.optionValue as "OS" | "OM");
                  }}
                >
                  {OS_TYPES.map((t) => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Projeto">
                <Input
                  value={form.projeto}
                  onChange={(_, d) => set("projeto", d.value)}
                />
              </Field>
              <Field label="Lote">
                <Input
                  value={form.lote ?? ""}
                  onChange={(_, d) => set("lote", d.value)}
                />
              </Field>
              <Field label="Desenho (CRD)" required className={styles.span2}>
                <Input
                  value={form.drawingCode}
                  onChange={(_, d) => set("drawingCode", d.value)}
                  placeholder="DE-3000.00-1521-600-PEH-1321_D01"
                />
              </Field>
              <Field label="Revisão">
                <Input
                  value={form.drawingRevision ?? ""}
                  onChange={(_, d) => set("drawingRevision", d.value)}
                />
              </Field>
              <Field label="Tipo de Orçamento">
                <Input
                  value={form.tipoOrcamento}
                  onChange={(_, d) => set("tipoOrcamento", d.value)}
                />
              </Field>
              <Field
                label="Descrição Resumida"
                required
                className={styles.span2}
              >
                <Textarea
                  value={form.descricao}
                  onChange={(_, d) => set("descricao", d.value)}
                />
              </Field>
              <Field label="Usinagem">
                <Dropdown
                  value={form.complexidadeUsinagem}
                  selectedOptions={[form.complexidadeUsinagem]}
                  onOptionSelect={(_, d) => {
                    if (d.optionValue)
                      set("complexidadeUsinagem", d.optionValue as Complexity);
                  }}
                >
                  {COMPLEXITIES.map((c) => (
                    <Option key={c} value={c}>
                      {c}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Caldeiraria/Soldagem">
                <Dropdown
                  value={form.complexidadeCaldeiraria}
                  selectedOptions={[form.complexidadeCaldeiraria]}
                  onOptionSelect={(_, d) => {
                    if (d.optionValue)
                      set(
                        "complexidadeCaldeiraria",
                        d.optionValue as Complexity,
                      );
                  }}
                >
                  {COMPLEXITIES.map((c) => (
                    <Option key={c} value={c}>
                      {c}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Atendimento (preferência)">
                <Dropdown
                  value={form.atendimento}
                  selectedOptions={[form.atendimento]}
                  onOptionSelect={(_, d) => {
                    if (d.optionValue)
                      set("atendimento", d.optionValue as Attendance);
                  }}
                >
                  {ATTENDANCES.map((a) => (
                    <Option key={a} value={a}>
                      {a}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Solicitação de Orçamento">
                <Input
                  type="date"
                  value={form.solicitacaoOrcamento ?? ""}
                  onChange={(_, d) => set("solicitacaoOrcamento", d.value)}
                />
              </Field>
              <div className={styles.derived}>
                <span>
                  Complexidade geral: <strong>{complexidadeGeral}</strong>
                </span>
                <span>
                  Prazo SLA: <strong>{prazoDiasUteis} dias úteis</strong>
                </span>
              </div>
              <Field label="Comentários" className={styles.span2}>
                <Textarea
                  value={form.comentarios ?? ""}
                  onChange={(_, d) => set("comentarios", d.value)}
                />
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              onClick={() => onOpenChange(false)}
              disabled={createFid.isLoading}
            >
              Cancelar
            </Button>
            <Button
              appearance="primary"
              onClick={onSubmit}
              disabled={!isValid || createFid.isLoading}
              icon={createFid.isLoading ? <Spinner size="tiny" /> : undefined}
            >
              Criar FID
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default CreateFidDialog;
