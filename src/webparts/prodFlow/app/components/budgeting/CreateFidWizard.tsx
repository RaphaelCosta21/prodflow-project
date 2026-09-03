import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogSurface,
  Dropdown,
  Field,
  Input,
  Option,
  ProgressBar,
  Spinner,
  Textarea,
} from "@fluentui/react-components";
import {
  ArrowLeft24Regular,
  ArrowRight24Regular,
  Checkmark24Regular,
  Dismiss24Regular,
} from "@fluentui/react-icons";
import { Attendance, Complexity } from "../../models";
import { useSpfxContext } from "../../config/SpfxContext";
import { useUIStore } from "../../stores/useUIStore";
import { useCreateFid } from "../../api/fids";
import { SlaService } from "../../services/SlaService";
import { validateNewRequest } from "../../schemas/fabricationRequest.schema";
import { buildNewRequest, INewRequestInput } from "../../utils/requestFactory";
import { fidDetailPath } from "../../config/routes";
import prodflowSymbol from "../../../assets/brand/prodflow-symbol.svg";
import styles from "./CreateFidWizard.module.scss";

const COMPLEXITIES: Complexity[] = [
  "Baixa",
  "Média",
  "Alta",
  "N/A",
  "A definir",
];
const ATTENDANCES: Attendance[] = ["Interna", "Externa"];
const OS_TYPES: Array<"OS" | "OM"> = ["OS", "OM"];

interface IStep {
  title: string;
  hint: string;
  fields: Array<keyof INewRequestInput>;
}

const STEPS: IStep[] = [
  {
    title: "Identificação",
    hint: "Ordem de serviço e desenho de referência",
    fields: [
      "osNumber",
      "osType",
      "projeto",
      "lote",
      "drawingCode",
      "drawingRevision",
    ],
  },
  {
    title: "Escopo & Complexidade",
    hint: "O que será fabricado e o esforço envolvido",
    fields: [
      "descricao",
      "tipoOrcamento",
      "complexidadeUsinagem",
      "complexidadeCaldeiraria",
      "atendimento",
    ],
  },
  {
    title: "Prazos & Observações",
    hint: "Datas de referência e notas para o time",
    fields: ["solicitacaoOrcamento", "prazoDiasCorridos", "comentarios"],
  },
  {
    title: "Revisão",
    hint: "Confira os dados antes de criar o FID",
    fields: [],
  },
];

const LAST_STEP = STEPS.length - 1;

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

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : date.toLocaleDateString("pt-BR");
}

const ReviewCell: React.FC<{
  label: string;
  value?: string;
  wide?: boolean;
}> = ({ label, value, wide }) => (
  <div className={wide ? styles.reviewCellWide : styles.reviewCell}>
    <span className={styles.reviewLabel}>{label}</span>
    <span className={styles.reviewValue}>{value?.trim() ? value : "—"}</span>
  </div>
);

export interface ICreateFidWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateFidWizard: React.FC<ICreateFidWizardProps> = ({
  open,
  onOpenChange,
}) => {
  const context = useSpfxContext();
  const user = context.pageContext.user.displayName;
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const createFid = useCreateFid();

  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<INewRequestInput>(() =>
    initialForm(user),
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setForm(initialForm(user));
    setStep(0);
    setErrors({});
  }, [open, user]);

  const set = <K extends keyof INewRequestInput>(
    key: K,
    value: INewRequestInput[K],
  ): void => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const complexidadeGeral = SlaService.complexidadeGeral(
    form.complexidadeUsinagem,
    form.complexidadeCaldeiraria,
  );
  const prazoDiasUteis = SlaService.prazoDiasUteis(
    complexidadeGeral,
    form.atendimento,
  );
  const prazoEnvio = form.solicitacaoOrcamento
    ? SlaService.prazoEnvio(
        new Date(form.solicitacaoOrcamento),
        complexidadeGeral,
        form.atendimento,
      ).toISOString()
    : undefined;

  const validateStep = (index: number): boolean => {
    const stepErrors = validateNewRequest(
      form,
      STEPS[index].fields as string[],
    );
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const goNext = (): void => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, LAST_STEP));
  };

  const jumpTo = (target: number): void => {
    if (target <= step) {
      setStep(target);
      return;
    }
    // Forward jumps must clear every step in between.
    for (let i = step; i < target; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
    setErrors({});
    setStep(target);
  };

  const onSubmit = (): void => {
    const allErrors = validateNewRequest(form);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstBroken = STEPS.findIndex((s) =>
        s.fields.some((f) => allErrors[f as string]),
      );
      if (firstBroken >= 0) setStep(firstBroken);
      return;
    }
    createFid.mutate(buildNewRequest(form), {
      onSuccess: (created) => {
        addToast(`FID ${created.fid} criado.`, "success");
        onOpenChange(false);
        navigate(fidDetailPath(created.fid));
      },
      onError: (e) => addToast(`Erro ao criar FID: ${String(e)}`, "error"),
    });
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (step < LAST_STEP) goNext();
  };

  const errorOf = (key: keyof INewRequestInput): string | undefined =>
    errors[key as string];

  const fieldProps = (
    key: keyof INewRequestInput,
  ): { validationState?: "error"; validationMessage?: string } =>
    errorOf(key)
      ? { validationState: "error", validationMessage: errorOf(key) }
      : {};

  return (
    <Dialog
      open={open}
      modalType="alert"
      onOpenChange={(_, data) => onOpenChange(data.open)}
    >
      <DialogSurface className={styles.surface}>
        <div className={styles.wizard} onKeyDown={onKeyDown}>
          <header className={styles.header}>
            <img className={styles.headerMark} src={prodflowSymbol} alt="" />
            <div className={styles.headerText}>
              <h2 className={styles.title}>Novo FID</h2>
              <p className={styles.subtitle}>{STEPS[step].hint}</p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => onOpenChange(false)}
              disabled={createFid.isLoading}
              aria-label="Fechar"
            >
              <Dismiss24Regular />
            </button>
          </header>

          <div className={styles.steps}>
            <ol className={styles.stepRow}>
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className={`${styles.stepItem} ${i === step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}
                >
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => jumpTo(i)}
                    aria-current={i === step ? "step" : undefined}
                  >
                    <span className={styles.stepNumber}>
                      {i < step ? <Checkmark24Regular /> : i + 1}
                    </span>
                    <span className={styles.stepTitle}>{s.title}</span>
                  </button>
                  {i < LAST_STEP && <span className={styles.stepConnector} />}
                </li>
              ))}
            </ol>
            <ProgressBar
              value={step / LAST_STEP}
              thickness="medium"
              className={styles.progress}
            />
          </div>

          <div className={styles.body}>
            {step === 0 && (
              <div className={styles.grid}>
                <Field label="OS / OM" required {...fieldProps("osNumber")}>
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
                <Field label="Projeto" required {...fieldProps("projeto")}>
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
                <Field
                  label="Desenho (CRD)"
                  required
                  className={styles.span2}
                  {...fieldProps("drawingCode")}
                >
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
                    placeholder="D01"
                  />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className={styles.grid}>
                <Field
                  label="Descrição Resumida"
                  required
                  className={styles.span2}
                  {...fieldProps("descricao")}
                >
                  <Textarea
                    value={form.descricao}
                    onChange={(_, d) => set("descricao", d.value)}
                    placeholder="Escopo resumido do que será fabricado..."
                    resize="vertical"
                  />
                </Field>
                <Field
                  label="Tipo de Orçamento"
                  required
                  {...fieldProps("tipoOrcamento")}
                >
                  <Input
                    value={form.tipoOrcamento}
                    onChange={(_, d) => set("tipoOrcamento", d.value)}
                  />
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
                <Field label="Complexidade — Usinagem">
                  <Dropdown
                    value={form.complexidadeUsinagem}
                    selectedOptions={[form.complexidadeUsinagem]}
                    onOptionSelect={(_, d) => {
                      if (d.optionValue)
                        set(
                          "complexidadeUsinagem",
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
                <Field label="Complexidade — Caldeiraria/Soldagem">
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

                <div className={`${styles.callout} ${styles.span2}`}>
                  <span className={styles.calloutItem}>
                    <span className={styles.calloutLabel}>
                      Complexidade geral
                    </span>
                    <strong className={styles.calloutValue}>
                      {complexidadeGeral}
                    </strong>
                  </span>
                  <span className={styles.calloutDivider} />
                  <span className={styles.calloutItem}>
                    <span className={styles.calloutLabel}>Prazo SLA</span>
                    <strong className={styles.calloutValue}>
                      {prazoDiasUteis} dias úteis
                    </strong>
                  </span>
                  <span className={styles.calloutNote}>
                    Derivado da maior complexidade entre usinagem e caldeiraria.
                  </span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.grid}>
                <Field label="Solicitação de Orçamento">
                  <Input
                    type="date"
                    value={form.solicitacaoOrcamento ?? ""}
                    onChange={(_, d) => set("solicitacaoOrcamento", d.value)}
                  />
                </Field>
                <Field
                  label="Prazo de Entrega (dias corridos)"
                  hint="Opcional — prazo negociado de fabricação."
                  {...fieldProps("prazoDiasCorridos")}
                >
                  <Input
                    type="number"
                    min={0}
                    value={
                      form.prazoDiasCorridos === undefined
                        ? ""
                        : String(form.prazoDiasCorridos)
                    }
                    onChange={(_, d) =>
                      set(
                        "prazoDiasCorridos",
                        d.value === "" ? undefined : Number(d.value),
                      )
                    }
                  />
                </Field>

                <div className={`${styles.callout} ${styles.span2}`}>
                  <span className={styles.calloutItem}>
                    <span className={styles.calloutLabel}>
                      Prazo de envio à Petrobras
                    </span>
                    <strong className={styles.calloutValue}>
                      {formatDate(prazoEnvio)}
                    </strong>
                  </span>
                  <span className={styles.calloutNote}>
                    {prazoDiasUteis} dias úteis após a solicitação, já
                    descontando feriados nacionais.
                  </span>
                </div>

                <Field label="Comentários" className={styles.span2}>
                  <Textarea
                    value={form.comentarios ?? ""}
                    onChange={(_, d) => set("comentarios", d.value)}
                    placeholder="Notas para orçamentação, planejamento ou compras..."
                    resize="vertical"
                  />
                </Field>
              </div>
            )}

            {step === LAST_STEP && (
              <div className={styles.review}>
                <span className={styles.reviewGroup}>Identificação</span>
                <div className={styles.reviewGrid}>
                  <ReviewCell
                    label={form.osType ?? "OS"}
                    value={form.osNumber}
                  />
                  <ReviewCell label="Projeto" value={form.projeto} />
                  <ReviewCell label="Lote" value={form.lote} />
                  <ReviewCell
                    label="Revisão do desenho"
                    value={form.drawingRevision}
                  />
                  <ReviewCell
                    label="Desenho (CRD)"
                    value={form.drawingCode}
                    wide
                  />
                </div>

                <span className={styles.reviewGroup}>
                  Escopo &amp; Complexidade
                </span>
                <div className={styles.reviewGrid}>
                  <ReviewCell label="Descrição" value={form.descricao} wide />
                  <ReviewCell
                    label="Tipo de orçamento"
                    value={form.tipoOrcamento}
                  />
                  <ReviewCell label="Atendimento" value={form.atendimento} />
                  <ReviewCell
                    label="Usinagem"
                    value={form.complexidadeUsinagem}
                  />
                  <ReviewCell
                    label="Caldeiraria/Soldagem"
                    value={form.complexidadeCaldeiraria}
                  />
                  <ReviewCell
                    label="Complexidade geral"
                    value={complexidadeGeral}
                  />
                  <ReviewCell
                    label="Prazo SLA"
                    value={`${prazoDiasUteis} dias úteis`}
                  />
                </div>

                <span className={styles.reviewGroup}>
                  Prazos &amp; Observações
                </span>
                <div className={styles.reviewGrid}>
                  <ReviewCell
                    label="Solicitação de orçamento"
                    value={formatDate(form.solicitacaoOrcamento)}
                  />
                  <ReviewCell
                    label="Prazo de envio à Petrobras"
                    value={formatDate(prazoEnvio)}
                  />
                  <ReviewCell
                    label="Prazo de entrega"
                    value={
                      form.prazoDiasCorridos === undefined
                        ? undefined
                        : `${form.prazoDiasCorridos} dias corridos`
                    }
                  />
                  <ReviewCell label="Criado por" value={form.createdBy} />
                  <ReviewCell
                    label="Comentários"
                    value={form.comentarios}
                    wide
                  />
                </div>

                <p className={styles.reviewNote}>
                  O FID será criado na fase de Orçamentação com status Rascunho.
                  A BOM e os anexos são importados na página do FID.
                </p>
              </div>
            )}
          </div>

          <footer className={styles.footer}>
            <span className={styles.footerCount}>
              Etapa {step + 1} de {STEPS.length}
            </span>
            <div className={styles.footerActions}>
              <Button
                appearance="secondary"
                onClick={() =>
                  step === 0 ? onOpenChange(false) : setStep((s) => s - 1)
                }
                disabled={createFid.isLoading}
                icon={step === 0 ? undefined : <ArrowLeft24Regular />}
              >
                {step === 0 ? "Cancelar" : "Voltar"}
              </Button>
              {step < LAST_STEP ? (
                <Button
                  appearance="primary"
                  onClick={goNext}
                  icon={<ArrowRight24Regular />}
                  iconPosition="after"
                >
                  Avançar
                </Button>
              ) : (
                <Button
                  appearance="primary"
                  onClick={onSubmit}
                  disabled={createFid.isLoading}
                  icon={
                    createFid.isLoading ? (
                      <Spinner size="tiny" />
                    ) : (
                      <Checkmark24Regular />
                    )
                  }
                >
                  Criar FID
                </Button>
              )}
            </div>
          </footer>
        </div>
      </DialogSurface>
    </Dialog>
  );
};

export default CreateFidWizard;
