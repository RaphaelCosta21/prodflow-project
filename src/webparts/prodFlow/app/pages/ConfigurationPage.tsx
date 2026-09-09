import * as React from "react";
import { Button, Input, Spinner } from "@fluentui/react-components";
import {
  Database24Regular,
  Add16Regular,
  Delete16Regular,
  Alert24Regular,
  CalendarLtr24Regular,
  Clock24Regular,
  DocumentBulletList24Regular,
  Flowchart24Regular,
  Money24Regular,
  People24Regular,
  ShieldKeyhole24Regular,
  Target24Regular,
  Dismiss20Regular,
  ArrowReset20Regular,
} from "@fluentui/react-icons";
import { Attendance, Phase, RequestStatus, WorkflowKind } from "../models";
import { TEAMS, TEAM_KEYS } from "../config/teams";
import {
  ISubItemStatusDef,
  IStatusDef,
  REQUEST_STATUSES,
  SUB_ITEM_STATUSES,
} from "../config/statuses";
import { PHASES_BY_WORKFLOW } from "../config/phases";
import { KPI_DEFINITIONS } from "../config/kpiDefinitions";
import {
  phaseColorKey,
  requestColorKey,
  subItemColorKey,
} from "../hooks/useStatusColors";
import {
  CONTRACT_LABOR,
  CONTRACT_SERVICES,
  CONTRACT_WEIGHTS,
} from "../config/contractWeights";
import {
  ACCESS_AREAS,
  ACCESS_ROLES,
  DEFAULT_APP_CONFIG,
  FIXED_BUDGET_TYPES,
  NOTIFICATION_EVENTS,
  budgetTypeOptions,
} from "../config/appConfigDefaults";
import { useAppConfig, useSaveAppConfig } from "../api/config";
import { useAccessLevel } from "../hooks/useAccessLevel";
import { useUIStore } from "../stores/useUIStore";
import {
  AccessPermission,
  IAppConfig,
  useConfigStore,
} from "../stores/useConfigStore";
import {
  ProvisioningService,
  IProvisionResult,
} from "../services/ProvisioningService";
import { formatCurrencyBRL } from "../utils/formatters";
import GlassCard from "../components/common/GlassCard";
import Badge from "../components/common/Badge";
import SkeletonLoader from "../components/common/SkeletonLoader";
import styles from "./ConfigurationPage.module.scss";

type TabKey =
  | "kpi"
  | "contract"
  | "sla"
  | "holidays"
  | "budgetTypes"
  | "statuses"
  | "teams"
  | "access"
  | "notifications"
  | "system";

interface INavItem {
  key: TabKey;
  label: string;
  icon: React.ReactElement;
  /** Accent token for the icon chip; the only colour in an otherwise neutral nav. */
  accent: string;
}

const NAV: { group: string; items: INavItem[] }[] = [
  {
    group: "Desempenho",
    items: [
      {
        key: "kpi",
        label: "Metas de KPI",
        icon: <Target24Regular />,
        accent: "var(--tertiary-accent)",
      },
    ],
  },
  {
    group: "Contrato",
    items: [
      {
        key: "contract",
        label: "Contrato & Pesos",
        icon: <DocumentBulletList24Regular />,
        accent: "var(--primary-accent)",
      },
      {
        key: "sla",
        label: "Prazo × Complexidade",
        icon: <Clock24Regular />,
        accent: "var(--warning)",
      },
      {
        key: "holidays",
        label: "Feriados BR",
        icon: <CalendarLtr24Regular />,
        accent: "var(--info)",
      },
      {
        key: "budgetTypes",
        label: "Tipos de Orçamento",
        icon: <Money24Regular />,
        accent: "var(--success)",
      },
    ],
  },
  {
    group: "Fluxo",
    items: [
      {
        key: "statuses",
        label: "Fases & Status",
        icon: <Flowchart24Regular />,
        accent: "var(--secondary-accent)",
      },
      {
        key: "teams",
        label: "Times",
        icon: <People24Regular />,
        accent: "var(--primary-accent)",
      },
    ],
  },
  {
    group: "Sistema",
    items: [
      {
        key: "access",
        label: "Níveis de Acesso",
        icon: <ShieldKeyhole24Regular />,
        accent: "var(--danger)",
      },
      {
        key: "notifications",
        label: "Notificações",
        icon: <Alert24Regular />,
        accent: "var(--warning)",
      },
      {
        key: "system",
        label: "Sistema",
        icon: <Database24Regular />,
        accent: "var(--text-secondary)",
      },
    ],
  },
];

const PERM_CYCLE: AccessPermission[] = ["none", "view", "edit"];
const COMPLEXITIES: ("Baixa" | "Média" | "Alta")[] = ["Baixa", "Média", "Alta"];
const ATTENDANCES: Attendance[] = ["Interna", "Externa"];

const WORKFLOWS: { key: WorkflowKind; label: string }[] = [
  { key: "fabrication", label: "Fabricação" },
  { key: "parts", label: "Partes e Peças" },
];

// Anything the admin may recolour, addressed by its namespaced config key.
interface IColorTarget {
  colorKey: string;
  seed: string;
  label: string;
  hint?: string;
}

export const ConfigurationPage: React.FC = () => {
  const { data, isLoading } = useAppConfig();
  const saveConfig = useSaveAppConfig();
  const access = useAccessLevel();
  const addToast = useUIStore((s) => s.addToast);
  const setStoreConfig = useConfigStore((s) => s.setConfig);

  const [tab, setTab] = React.useState<TabKey>("kpi");
  const [draft, setDraft] = React.useState<IAppConfig>(DEFAULT_APP_CONFIG);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [panel, setPanel] = React.useState<IColorTarget | undefined>();
  const [panelColor, setPanelColor] = React.useState("#0072ce");
  const [provision, setProvision] = React.useState<
    IProvisionResult | undefined
  >();
  const [newHoliday, setNewHoliday] = React.useState("");
  const [newBudgetType, setNewBudgetType] = React.useState("");

  React.useEffect(() => {
    if (data && !dirty) {
      const merged = { ...DEFAULT_APP_CONFIG, ...data };
      setDraft(merged);
      setStoreConfig(merged);
    }
  }, [data, dirty, setStoreConfig]);

  const canEdit = access.canAdmin;

  const patch = (p: Partial<IAppConfig>): void => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const save = (): void =>
    saveConfig.mutate(draft, {
      onSuccess: () => {
        setStoreConfig(draft);
        setDirty(false);
        addToast("Configuração salva.", "success");
      },
      onError: () => addToast("Falha ao salvar a configuração.", "error"),
    });

  const runProvision = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = await ProvisioningService.ensureAll();
      setProvision(r);
      addToast("Provisionamento concluído.", "success");
    } catch (e) {
      addToast((e as Error).message || "Falha no provisionamento.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  const renderContract = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Contrato &amp; Pesos</h3>
        <p>
          Somente leitura. A fonte é o template oficial do Relatório de
          Orçamento. Alterar exige atualizar o .xlsx e o código.
        </p>
      </div>
      <div className={styles.readonlyGrid}>
        <div>
          <span>Preço unitário (Tabela 2)</span>
          <b>{formatCurrencyBRL(CONTRACT_WEIGHTS.unitPriceTable2BRL)}</b>
        </div>
        <div>
          <span>Preço unitário (Tabela 1)</span>
          <b>{formatCurrencyBRL(CONTRACT_WEIGHTS.unitPriceTable1BRL)}</b>
        </div>
        <div>
          <span>Linhas de matéria-prima</span>
          <b>{CONTRACT_WEIGHTS.materials.length}</b>
        </div>
        <div>
          <span>Linhas de mão de obra</span>
          <b>{CONTRACT_LABOR.length}</b>
        </div>
        <div>
          <span>Serviços adicionais</span>
          <b>{CONTRACT_SERVICES.length}</b>
        </div>
      </div>
    </div>
  );

  const renderSla = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Prazo × Complexidade</h3>
        <p>Prazo de resposta do orçamento, em dias úteis (§10.1).</p>
      </div>
      <div className={styles.matrix}>
        <div className={styles.matrixHeader}>
          <span>Complexidade</span>
          {ATTENDANCES.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
        {COMPLEXITIES.map((c) => (
          <div key={c} className={styles.matrixRow}>
            <span>{c}</span>
            {ATTENDANCES.map((a) => (
              <span key={a}>
                <Input
                  size="small"
                  type="number"
                  min={0}
                  disabled={!canEdit}
                  value={String(draft.slaMatrix[c][a])}
                  onChange={(_, d) =>
                    patch({
                      slaMatrix: {
                        ...draft.slaMatrix,
                        [c]: {
                          ...draft.slaMatrix[c],
                          [a]: Math.max(0, Number(d.value) || 0),
                        },
                      },
                    })
                  }
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderHolidays = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Feriados BR</h3>
        <p>
          Datas extras consideradas no cálculo de dias úteis, além dos feriados
          nacionais já embutidos.
        </p>
      </div>
      {canEdit && (
        <div className={styles.inlineForm}>
          <Input
            type="date"
            value={newHoliday}
            onChange={(_, d) => setNewHoliday(d.value)}
          />
          <Button
            icon={<Add16Regular />}
            disabled={!newHoliday}
            onClick={() => {
              if (draft.holidays.indexOf(newHoliday) < 0) {
                patch({ holidays: draft.holidays.concat([newHoliday]).sort() });
              }
              setNewHoliday("");
            }}
          >
            Adicionar
          </Button>
        </div>
      )}
      <div className={styles.chipList}>
        {draft.holidays.length === 0 && (
          <span className={styles.muted}>Nenhum feriado adicional.</span>
        )}
        {draft.holidays.map((h) => (
          <span key={h} className={styles.chip}>
            {h}
            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  patch({ holidays: draft.holidays.filter((x) => x !== h) })
                }
              >
                <Delete16Regular />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );

  const renderBudgetTypes = (): React.ReactElement => {
    const options = budgetTypeOptions(draft.budgetTypes);
    return (
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h3>Tipos de Orçamento</h3>
          <p>
            Opções do campo “Tipo de Orçamento” na criação do FID.
            {" “"}
            {FIXED_BUDGET_TYPES.join("” e “")}
            {"” "}
            são fixas e não podem ser removidas.
          </p>
        </div>
        {canEdit && (
          <div className={styles.inlineForm}>
            <Input
              value={newBudgetType}
              placeholder="Novo tipo de orçamento"
              onChange={(_, d) => setNewBudgetType(d.value)}
            />
            <Button
              icon={<Add16Regular />}
              disabled={!newBudgetType.trim()}
              onClick={() => {
                const value = newBudgetType.trim();
                if (value && options.indexOf(value) < 0) {
                  patch({ budgetTypes: options.concat([value]) });
                }
                setNewBudgetType("");
              }}
            >
              Adicionar
            </Button>
          </div>
        )}
        <div className={styles.chipList}>
          {options.map((t) => {
            const fixed = FIXED_BUDGET_TYPES.indexOf(t) >= 0;
            return (
              <span key={t} className={styles.chip}>
                {t}
                {canEdit && !fixed && (
                  <button
                    type="button"
                    onClick={() =>
                      patch({ budgetTypes: options.filter((x) => x !== t) })
                    }
                  >
                    <Delete16Regular />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const openColorPanel = (target: IColorTarget): void => {
    setPanel(target);
    setPanelColor(draft.statusColors[target.colorKey] ?? target.seed);
  };

  const applyPanelColor = (): void => {
    if (!panel) return;
    patch({
      statusColors: { ...draft.statusColors, [panel.colorKey]: panelColor },
    });
    setPanel(undefined);
  };

  const resetPanelColor = (): void => {
    if (!panel) return;
    const next = { ...draft.statusColors };
    delete next[panel.colorKey];
    patch({ statusColors: next });
    setPanel(undefined);
  };

  const colorOf = (key: string, seed: string): string =>
    draft.statusColors[key] ?? seed;

  const renderOptionCard = (target: IColorTarget): React.ReactElement => (
    <div key={target.colorKey} className={styles.optionCard}>
      <span
        className={styles.optionColor}
        style={{ background: colorOf(target.colorKey, target.seed) }}
      />
      <div className={styles.optionInfo}>
        <span className={styles.optionLabel}>{target.label}</span>
        {target.hint && (
          <span className={styles.optionHint}>{target.hint}</span>
        )}
      </div>
      {canEdit && (
        <Button
          size="small"
          appearance="subtle"
          className={styles.editColorBtn}
          onClick={() => openColorPanel(target)}
        >
          Editar cor
        </Button>
      )}
    </div>
  );

  const renderPhaseCard = (target: IColorTarget): React.ReactElement => (
    <div key={target.colorKey} className={styles.phaseCard}>
      <div className={styles.phaseHead}>
        <span
          className={styles.optionColor}
          style={{ background: colorOf(target.colorKey, target.seed) }}
        />
        <span className={styles.optionLabel}>{target.label}</span>
        {canEdit && (
          <Button
            size="small"
            appearance="subtle"
            className={styles.editColorBtn}
            onClick={() => openColorPanel(target)}
          >
            Editar cor
          </Button>
        )}
      </div>
      {target.hint && <p className={styles.phaseHint}>{target.hint}</p>}
    </div>
  );

  const statusGroup = (
    label: string,
    list: IStatusDef<RequestStatus>[],
  ): React.ReactElement => (
    <div key={label} className={styles.groupBlock}>
      <div className={styles.groupLabel}>{label}</div>
      <div className={styles.optionsList}>
        {list.map((s) =>
          renderOptionCard({
            colorKey: requestColorKey(s.key),
            seed: s.color,
            label: s.label,
          }),
        )}
      </div>
    </div>
  );

  const renderStatuses = (): React.ReactElement => {
    const byPhase = (phase: Phase): IStatusDef<RequestStatus>[] =>
      REQUEST_STATUSES.filter((s) => s.phase === phase);
    const transversal = REQUEST_STATUSES.filter((s) => s.phase === undefined);
    const subByPhase = (phase: Phase): ISubItemStatusDef[] =>
      SUB_ITEM_STATUSES.filter((s) => s.phase === phase);

    return (
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h3>Fases &amp; Status</h3>
          <p>
            O mapeamento é fixo no código. Aqui o administrador ajusta apenas as
            cores usadas em badges, boards e gráficos.
          </p>
        </div>

        <div className={styles.groupBlock}>
          <div className={styles.groupLabel}>Fases</div>
          <div className={styles.phasesList}>
            {WORKFLOWS.map((f) =>
              PHASES_BY_WORKFLOW[f.key].map((p) =>
                p.phase === 1 && f.key === "parts"
                  ? null
                  : renderPhaseCard({
                      colorKey: phaseColorKey(f.key, p.phase),
                      seed: p.color,
                      label: `Fase ${p.phase} · ${p.label}`,
                      hint: p.description,
                    }),
              ),
            )}
          </div>
        </div>

        {statusGroup("Status do FID · Fase 1 (Orçamentação)", byPhase(1))}
        {statusGroup("Status do FID · Fase 2 (Execução)", byPhase(2))}
        {statusGroup("Status do FID · Transversais", transversal)}

        {[
          { label: "Status do Sub-item · Fase 1", list: subByPhase(1) },
          { label: "Status do Sub-item · Fase 2", list: subByPhase(2) },
        ].map((block) => (
          <div key={block.label} className={styles.groupBlock}>
            <div className={styles.groupLabel}>{block.label}</div>
            <div className={styles.optionsList}>
              {block.list.map((s) =>
                renderOptionCard({
                  colorKey: subItemColorKey(s.key),
                  seed: s.color,
                  label: s.label,
                }),
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderKpiTargets = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Metas de KPI</h3>
        <p>
          Limiares exibidos nos cartões do Dashboard. Cada indicador compara o
          valor apurado com a sua meta.
        </p>
      </div>
      <div className={styles.kpiGrid}>
        {KPI_DEFINITIONS.map((k) => (
          <div key={k.key} className={styles.kpiCard}>
            <span className={styles.kpiLabel}>{k.label}</span>
            <span className={styles.kpiDescription}>{k.description}</span>
            <div className={styles.kpiInputRow}>
              <Input
                type="number"
                size="small"
                disabled={!canEdit}
                value={String(draft.kpiTargets[k.key] ?? k.defaultTarget)}
                onChange={(_, d) =>
                  patch({
                    kpiTargets: {
                      ...draft.kpiTargets,
                      [k.key]: Number(d.value) || 0,
                    },
                  })
                }
              />
              <span className={styles.kpiUnit}>{k.unit}</span>
            </div>
            <span className={styles.kpiDirection}>
              {k.lowerIsBetter ? "Menor é melhor" : "Maior é melhor"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeams = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Times</h3>
        <p>Cores da legenda usada no roteiro (pathway) de cada sub-item.</p>
      </div>
      <div className={styles.optionsList}>
        {TEAM_KEYS.map((k) => {
          const color = draft.teamColors[k] ?? TEAMS[k].color;
          return (
            <div key={k} className={styles.optionCard}>
              <input
                type="color"
                value={color}
                disabled={!canEdit}
                onChange={(e) =>
                  patch({
                    teamColors: {
                      ...draft.teamColors,
                      [k]: e.currentTarget.value,
                    },
                  })
                }
              />
              <span>{TEAMS[k].label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAccess = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Níveis de Acesso</h3>
        <p>
          {canEdit
            ? "Clique no badge para alternar None → View → Edit."
            : "Somente leitura."}
        </p>
      </div>
      <div className={styles.accessGrid}>
        <div className={styles.accessHeader}>
          <div>Área</div>
          {ACCESS_ROLES.map((r) => (
            <div key={r}>{r}</div>
          ))}
        </div>
        {ACCESS_AREAS.map((area) => (
          <div key={area.key} className={styles.accessRow}>
            <div>{area.label}</div>
            {ACCESS_ROLES.map((role) => {
              const perm: AccessPermission =
                draft.accessLevels[role]?.[
                  area.key as keyof (typeof draft.accessLevels)[string]
                ] ?? "none";
              return (
                <div key={role}>
                  <button
                    type="button"
                    className={`${styles.permBadge} ${styles[perm]}`}
                    disabled={!canEdit}
                    onClick={() => {
                      const next =
                        PERM_CYCLE[
                          (PERM_CYCLE.indexOf(perm) + 1) % PERM_CYCLE.length
                        ];
                      patch({
                        accessLevels: {
                          ...draft.accessLevels,
                          [role]: {
                            ...draft.accessLevels[role],
                            [area.key]: next,
                          },
                        },
                      });
                    }}
                  >
                    {perm}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotifications = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Notificações</h3>
        <p>Quais níveis de acesso recebem cada evento.</p>
      </div>
      <div className={styles.accessGrid}>
        <div className={styles.accessHeader}>
          <div>Evento</div>
          {ACCESS_ROLES.map((r) => (
            <div key={r}>{r}</div>
          ))}
        </div>
        {NOTIFICATION_EVENTS.map((ev) => (
          <div key={ev.key} className={styles.accessRow}>
            <div>{ev.label}</div>
            {ACCESS_ROLES.map((role) => {
              const on = (draft.notifications[ev.key] ?? []).indexOf(role) >= 0;
              return (
                <div key={role}>
                  <button
                    type="button"
                    className={`${styles.toggle} ${on ? styles.on : styles.off}`}
                    disabled={!canEdit}
                    aria-label={`${ev.label} · ${role}`}
                    onClick={() => {
                      const current = draft.notifications[ev.key] ?? [];
                      patch({
                        notifications: {
                          ...draft.notifications,
                          [ev.key]: on
                            ? current.filter((r) => r !== role)
                            : current.concat([role]),
                        },
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSystem = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Sistema</h3>
        <p>Provisionamento das listas e preferências globais.</p>
      </div>

      <div className={styles.fieldRow}>
        <label>Tema padrão</label>
        <select
          value={draft.defaultTheme}
          disabled={!canEdit}
          onChange={(e) =>
            patch({
              defaultTheme: e.currentTarget.value as "light" | "dark",
            })
          }
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className={styles.fieldRow}>
        <label>Super admins (e-mails separados por ;)</label>
        <Input
          disabled={!canEdit}
          value={draft.superAdminEmails.join(";")}
          onChange={(_, d) =>
            patch({
              superAdminEmails: d.value
                .split(";")
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className={styles.groupBlock}>
        <div className={styles.groupLabel}>Provisionamento do SharePoint</div>
        <Button
          appearance="primary"
          icon={busy ? <Spinner size="tiny" /> : <Database24Regular />}
          disabled={busy || !canEdit}
          onClick={runProvision}
        >
          {busy ? "Provisionando…" : "Provisionar listas"}
        </Button>
        {provision && (
          <div className={styles.result}>
            <div>
              <b>Criadas:</b>{" "}
              {provision.created.length ? provision.created.join(", ") : "—"}
            </div>
            <div>
              <b>Já existentes:</b>{" "}
              {provision.existing.length ? provision.existing.join(", ") : "—"}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTab = (): React.ReactElement => {
    if (tab === "kpi") return renderKpiTargets();
    if (tab === "contract") return renderContract();
    if (tab === "sla") return renderSla();
    if (tab === "holidays") return renderHolidays();
    if (tab === "budgetTypes") return renderBudgetTypes();
    if (tab === "statuses") return renderStatuses();
    if (tab === "teams") return renderTeams();
    if (tab === "access") return renderAccess();
    if (tab === "notifications") return renderNotifications();
    return renderSystem();
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Configuration</h1>
        <span className={styles.phase}>Admin</span>
      </div>

      {!canEdit && (
        <div className={styles.readOnlyBanner}>
          Acesso somente leitura. Apenas administradores podem alterar a
          configuração.
        </div>
      )}

      <div className={styles.body}>
        <nav className={styles.sidebar}>
          {NAV.map((group) => (
            <div key={group.group} className={styles.navGroup}>
              <div className={styles.navGroupLabel}>{group.group}</div>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.navItem} ${tab === item.key ? styles.navActive : ""}`}
                  onClick={() => setTab(item.key)}
                >
                  <span
                    className={styles.navIcon}
                    style={
                      { "--nav-accent": item.accent } as React.CSSProperties
                    }
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.content}>
          <GlassCard>{renderTab()}</GlassCard>
          {dirty && canEdit && (
            <div className={styles.saveBar}>
              <Button
                onClick={() => {
                  setDraft({ ...DEFAULT_APP_CONFIG, ...(data ?? {}) });
                  setDirty(false);
                }}
              >
                Descartar
              </Button>
              <Button
                appearance="primary"
                onClick={save}
                disabled={saveConfig.isLoading}
              >
                Salvar alterações
              </Button>
            </div>
          )}
        </div>
      </div>

      {panel && (
        <>
          <div
            className={styles.panelBackdrop}
            onClick={() => setPanel(undefined)}
          />
          <aside className={styles.panelOverlay}>
            <div className={styles.panelHeader}>
              <h3>Cor do rótulo</h3>
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular />}
                onClick={() => setPanel(undefined)}
                aria-label="Fechar"
              />
            </div>
            <div className={styles.panelBody}>
              <div className={styles.panelField}>
                <label>Item</label>
                <strong>{panel.label}</strong>
                {panel.hint && <p>{panel.hint}</p>}
              </div>
              <div className={styles.panelField}>
                <label htmlFor="panel-color">Cor</label>
                <input
                  id="panel-color"
                  type="color"
                  className={styles.panelColorInput}
                  value={panelColor}
                  onChange={(e) => setPanelColor(e.currentTarget.value)}
                />
              </div>
              <div className={styles.panelField}>
                <label>Prévia</label>
                <Badge label={panel.label} color={panelColor} />
              </div>
            </div>
            <div className={styles.panelFooter}>
              <Button
                icon={<ArrowReset20Regular />}
                onClick={resetPanelColor}
                disabled={draft.statusColors[panel.colorKey] === undefined}
              >
                Restaurar padrão
              </Button>
              <Button appearance="primary" onClick={applyPanelColor}>
                Aplicar
              </Button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default ConfigurationPage;
