import * as React from "react";
import { Button, Input, Spinner } from "@fluentui/react-components";
import {
  Database24Regular,
  Add16Regular,
  Delete16Regular,
} from "@fluentui/react-icons";
import { Attendance } from "../models";
import { TEAMS, TEAM_KEYS } from "../config/teams";
import { REQUEST_STATUSES, SUB_ITEM_STATUSES } from "../config/statuses";
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
import SkeletonLoader from "../components/common/SkeletonLoader";
import styles from "./ConfigurationPage.module.scss";

type TabKey =
  | "contract"
  | "sla"
  | "holidays"
  | "budgetTypes"
  | "statuses"
  | "teams"
  | "access"
  | "notifications"
  | "system";

const NAV: { group: string; items: { key: TabKey; label: string }[] }[] = [
  {
    group: "Contrato",
    items: [
      { key: "contract", label: "Contrato & Pesos" },
      { key: "sla", label: "SLA × Complexidade" },
      { key: "holidays", label: "Feriados BR" },
      { key: "budgetTypes", label: "Tipos de Orçamento" },
    ],
  },
  {
    group: "Aparência",
    items: [
      { key: "statuses", label: "Status & Fases" },
      { key: "teams", label: "Times" },
    ],
  },
  {
    group: "Sistema",
    items: [
      { key: "access", label: "Níveis de Acesso" },
      { key: "notifications", label: "Notificações" },
      { key: "system", label: "Sistema" },
    ],
  },
];

const PERM_CYCLE: AccessPermission[] = ["none", "view", "edit"];
const COMPLEXITIES: ("Baixa" | "Média" | "Alta")[] = ["Baixa", "Média", "Alta"];
const ATTENDANCES: Attendance[] = ["Interna", "Externa"];

export const ConfigurationPage: React.FC = () => {
  const { data, isLoading } = useAppConfig();
  const saveConfig = useSaveAppConfig();
  const access = useAccessLevel();
  const addToast = useUIStore((s) => s.addToast);
  const setStoreConfig = useConfigStore((s) => s.setConfig);

  const [tab, setTab] = React.useState<TabKey>("contract");
  const [draft, setDraft] = React.useState<IAppConfig>(DEFAULT_APP_CONFIG);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
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
          Somente leitura — a fonte é o template oficial do Relatório de
          Orçamento. Alterar exige atualizar o .xlsx e o código.
        </p>
      </div>
      <div className={styles.readonlyGrid}>
        <div>
          <span>Preço unitário — Tabela 2</span>
          <b>{formatCurrencyBRL(CONTRACT_WEIGHTS.unitPriceTable2BRL)}</b>
        </div>
        <div>
          <span>Preço unitário — Tabela 1</span>
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
        <h3>SLA × Complexidade</h3>
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

  const renderStatuses = (): React.ReactElement => (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>Status &amp; Fases</h3>
        <p>Cores usadas em badges, boards e gráficos.</p>
      </div>
      {[
        { label: "Status do FID", list: REQUEST_STATUSES },
        { label: "Status do sub-item", list: SUB_ITEM_STATUSES },
      ].map((block) => (
        <div key={block.label} className={styles.groupBlock}>
          <div className={styles.groupLabel}>{block.label}</div>
          <div className={styles.optionsList}>
            {block.list.map((s) => {
              const color = draft.statusColors[s.key] ?? s.color;
              return (
                <div key={s.key} className={styles.optionCard}>
                  <input
                    type="color"
                    value={color}
                    disabled={!canEdit}
                    onChange={(e) =>
                      patch({
                        statusColors: {
                          ...draft.statusColors,
                          [s.key]: e.currentTarget.value,
                        },
                      })
                    }
                  />
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
          Acesso somente leitura — apenas administradores podem alterar a
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
    </div>
  );
};

export default ConfigurationPage;
