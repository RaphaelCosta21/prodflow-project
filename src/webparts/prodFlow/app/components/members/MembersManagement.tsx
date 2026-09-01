import * as React from "react";
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@fluentui/react-components";
import {
  People24Regular,
  Edit16Regular,
  Pause16Regular,
  Play16Regular,
  Delete16Regular,
  Dismiss16Regular,
} from "@fluentui/react-icons";
import { AccessLevel, ITeamMember } from "../../models";
import { TEAMS, TEAM_KEYS, TeamKey } from "../../config/teams";
import { useMembers, useSaveMember } from "../../api/config";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useUIStore } from "../../stores/useUIStore";
import EmptyState from "../common/EmptyState";
import SkeletonLoader from "../common/SkeletonLoader";
import PeoplePicker, {
  IPeopleResult,
  getAvatarColor,
  getInitials,
} from "./PeoplePicker";
import styles from "./MembersManagement.module.scss";

const ACCESS_LEVELS: { key: AccessLevel; label: string }[] = [
  { key: "member", label: "Member" },
  { key: "lead", label: "Lead" },
  { key: "manager", label: "Manager" },
  { key: "admin", label: "Admin" },
];

interface IPanelForm {
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  team: TeamKey;
  additionalTeams: TeamKey[];
  accessLevel: AccessLevel;
  photoUrl: string;
}

const EMPTY_FORM: IPanelForm = {
  name: "",
  email: "",
  jobTitle: "",
  department: "",
  team: "planning",
  additionalTeams: [],
  accessLevel: "member",
  photoUrl: "",
};

export const MembersManagement: React.FC = () => {
  const { data, isLoading } = useMembers();
  const saveMember = useSaveMember();
  const access = useAccessLevel();
  const addToast = useUIStore((s) => s.addToast);

  const [search, setSearch] = React.useState("");
  const [teamFilter, setTeamFilter] = React.useState<string>("all");
  const [showPanel, setShowPanel] = React.useState(false);
  const [editing, setEditing] = React.useState<ITeamMember | undefined>();
  const [form, setForm] = React.useState<IPanelForm>(EMPTY_FORM);
  const [pickerQuery, setPickerQuery] = React.useState("");
  const [confirmRemove, setConfirmRemove] = React.useState<
    ITeamMember | undefined
  >();

  const members = React.useMemo(() => data?.members ?? [], [data]);
  const canEdit = access.canAdmin;

  const filtered = React.useMemo(() => {
    let list = members;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().indexOf(q) >= 0 ||
          m.email.toLowerCase().indexOf(q) >= 0 ||
          (m.jobTitle || "").toLowerCase().indexOf(q) >= 0 ||
          TEAMS[m.team].label.toLowerCase().indexOf(q) >= 0,
      );
    }
    if (teamFilter !== "all") {
      list = list.filter(
        (m) =>
          m.team === teamFilter ||
          (m.additionalTeams ?? []).indexOf(teamFilter as TeamKey) >= 0,
      );
    }
    return list;
  }, [members, search, teamFilter]);

  const countByTeam = React.useMemo(() => {
    const counts: { [k: string]: number } = {};
    for (const key of TEAM_KEYS) {
      counts[key] = members.filter((m) => m.team === key).length;
    }
    return counts;
  }, [members]);

  const openAdd = (): void => {
    setEditing(undefined);
    setForm(EMPTY_FORM);
    setPickerQuery("");
    setShowPanel(true);
  };

  const openEdit = (m: ITeamMember): void => {
    setEditing(m);
    setForm({
      name: m.name,
      email: m.email,
      jobTitle: m.jobTitle,
      department: m.department,
      team: m.team,
      additionalTeams: m.additionalTeams ?? [],
      accessLevel: m.accessLevel,
      photoUrl: m.photoUrl ?? "",
    });
    setPickerQuery(m.name);
    setShowPanel(true);
  };

  const onPick = (p: IPeopleResult): void => {
    setForm((f) => ({
      ...f,
      name: p.displayName,
      email: p.email,
      jobTitle: p.jobTitle,
      department: p.department,
      photoUrl: p.photoUrl,
    }));
    setPickerQuery(p.displayName);
  };

  const save = (): void => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast("Selecione uma pessoa antes de salvar.", "warning");
      return;
    }
    const payload: ITeamMember = editing
      ? { ...editing, ...form }
      : {
          ...form,
          id: `mem-${Date.now()}`,
          isActive: true,
          joinedDate: new Date().toISOString(),
        };
    saveMember.mutate(
      { kind: editing ? "update" : "add", member: payload },
      {
        onSuccess: () => {
          addToast(
            editing ? `${form.name} atualizado.` : `${form.name} adicionado.`,
            "success",
          );
          setShowPanel(false);
        },
        onError: (e) =>
          addToast((e as Error).message || "Falha ao salvar.", "error"),
      },
    );
  };

  const toggleActive = (m: ITeamMember): void =>
    saveMember.mutate({
      kind: "update",
      member: { ...m, isActive: !m.isActive },
    });

  const remove = (m: ITeamMember): void =>
    saveMember.mutate(
      { kind: "remove", memberId: m.id },
      {
        onSuccess: () => addToast(`${m.name} removido.`, "success"),
      },
    );

  if (isLoading) {
    return <SkeletonLoader rows={8} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <People24Regular />
        </span>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Members Management</h2>
          <p className={styles.subtitle}>
            {members.length} membros ·{" "}
            {members.filter((m) => m.isActive).length} ativos
          </p>
        </div>
      </div>

      <div className={styles.statRow}>
        {TEAM_KEYS.filter((k) => countByTeam[k] > 0).map((key) => {
          const team = TEAMS[key];
          return (
            <div key={key} className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: team.color }}
              >
                {team.label.charAt(0)}
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{countByTeam[key]}</span>
                <span className={styles.statLabel}>{team.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Buscar por nome, e-mail, cargo ou time..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <button
          type="button"
          className={`${styles.filterBtn} ${teamFilter === "all" ? styles.active : ""}`}
          onClick={() => setTeamFilter("all")}
        >
          All
        </button>
        {TEAM_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.filterBtn} ${teamFilter === key ? styles.active : ""}`}
            style={
              teamFilter === key
                ? {
                    background: TEAMS[key].color,
                    borderColor: TEAMS[key].color,
                  }
                : undefined
            }
            onClick={() => setTeamFilter(key)}
          >
            {TEAMS[key].label}
          </button>
        ))}
        {canEdit && (
          <Button appearance="primary" onClick={openAdd}>
            + Add Member
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={members.length === 0 ? "Nenhum membro" : "Nada encontrado"}
          description={
            members.length === 0
              ? "Clique em '+ Add Member' para cadastrar o primeiro."
              : "Ajuste a busca ou os filtros."
          }
        />
      ) : (
        TEAM_KEYS.filter((key) => filtered.some((m) => m.team === key)).map(
          (key) => {
            const team = TEAMS[key];
            const group = filtered.filter((m) => m.team === key);
            return (
              <div key={key} className={styles.teamSection}>
                <div className={styles.teamSectionHeader}>
                  <span
                    className={styles.teamBadge}
                    style={{ background: team.color }}
                  >
                    {team.label}
                  </span>
                  <span className={styles.teamCount}>
                    {group.length} membros
                  </span>
                </div>
                <div className={styles.membersGrid}>
                  {group.map((m) => (
                    <div
                      key={m.id}
                      className={styles.memberCard}
                      style={{ opacity: m.isActive ? 1 : 0.5 }}
                    >
                      {m.photoUrl ? (
                        <img
                          className={styles.avatar}
                          src={m.photoUrl}
                          alt={m.name}
                        />
                      ) : (
                        <div
                          className={styles.avatar}
                          style={{ background: getAvatarColor(m.name) }}
                        >
                          {getInitials(m.name)}
                        </div>
                      )}
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{m.name}</span>
                        <span className={styles.memberEmail}>{m.email}</span>
                        <div className={styles.memberMeta}>
                          {(m.additionalTeams ?? []).map((t) => (
                            <span
                              key={t}
                              className={styles.tag}
                              style={{
                                color: TEAMS[t].color,
                                borderColor: TEAMS[t].color,
                              }}
                            >
                              {TEAMS[t].label}
                            </span>
                          ))}
                          <span className={styles.roleTag}>
                            {m.accessLevel}
                          </span>
                          {m.jobTitle && (
                            <span className={styles.jobTitle}>
                              {m.jobTitle}
                            </span>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className={styles.memberActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`Editar ${m.name}`}
                            title="Editar"
                            onClick={() => openEdit(m)}
                          >
                            <Edit16Regular />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`${m.isActive ? "Desativar" : "Ativar"} ${m.name}`}
                            title={m.isActive ? "Desativar" : "Ativar"}
                            onClick={() => toggleActive(m)}
                          >
                            {m.isActive ? (
                              <Pause16Regular />
                            ) : (
                              <Play16Regular />
                            )}
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.danger}`}
                            aria-label={`Remover ${m.name}`}
                            title="Remover"
                            onClick={() => setConfirmRemove(m)}
                          >
                            <Delete16Regular />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          },
        )
      )}

      {showPanel && (
        <>
          <div
            className={styles.panelBackdrop}
            aria-hidden="true"
            onClick={() => setShowPanel(false)}
          />
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Editar membro" : "Adicionar membro"}
          >
            <div className={styles.panelHeader}>
              <h3>{editing ? "Edit Member" : "Add Member"}</h3>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Fechar"
                onClick={() => setShowPanel(false)}
              >
                <Dismiss16Regular />
              </button>
            </div>
            <div className={styles.panelBody}>
              {!editing && (
                <div className={styles.fieldGroup}>
                  <label>Buscar pessoa</label>
                  <PeoplePicker
                    value={pickerQuery}
                    onQueryChange={setPickerQuery}
                    onSelect={onPick}
                  />
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label>Nome</label>
                <input value={form.name} readOnly className={styles.readOnly} />
              </div>
              <div className={styles.fieldGroup}>
                <label>E-mail</label>
                <input
                  value={form.email}
                  readOnly
                  className={styles.readOnly}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Cargo</label>
                <input
                  value={form.jobTitle}
                  readOnly
                  className={styles.readOnly}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Time principal</label>
                <select
                  value={form.team}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      team: e.currentTarget.value as TeamKey,
                    })
                  }
                >
                  {TEAM_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {TEAMS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label>Times adicionais</label>
                <div className={styles.badgeSection}>
                  {form.additionalTeams.length > 0 && (
                    <div className={styles.assignedArea}>
                      <span className={styles.sectionLabel}>Atribuídos</span>
                      <div className={styles.badgesRow}>
                        {form.additionalTeams.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={styles.badgeClickable}
                            style={{ background: TEAMS[t].color }}
                            title="Clique para remover"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                additionalTeams: f.additionalTeams.filter(
                                  (x) => x !== t,
                                ),
                              }))
                            }
                          >
                            {TEAMS[t].label} ✕
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={styles.availableArea}>
                    <span className={styles.sectionLabel}>Disponíveis</span>
                    <div className={styles.badgesRow}>
                      {TEAM_KEYS.filter(
                        (t) =>
                          t !== form.team &&
                          form.additionalTeams.indexOf(t) < 0,
                      ).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={`${styles.badgeClickable} ${styles.badgeFaded}`}
                          style={{ background: TEAMS[t].color }}
                          title="Clique para atribuir"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              additionalTeams: f.additionalTeams.concat([t]),
                            }))
                          }
                        >
                          + {TEAMS[t].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label>Nível de acesso</label>
                <select
                  value={form.accessLevel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accessLevel: e.currentTarget.value as AccessLevel,
                    })
                  }
                >
                  {ACCESS_LEVELS.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.panelFooter}>
              <Button onClick={() => setShowPanel(false)}>Cancelar</Button>
              <Button
                appearance="primary"
                onClick={save}
                disabled={saveMember.isLoading}
              >
                {editing ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={!!confirmRemove}
        onOpenChange={(_, d) => {
          if (!d.open) setConfirmRemove(undefined);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Remover membro</DialogTitle>
            <DialogContent>
              Remover <b>{confirmRemove?.name}</b> do time?
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmRemove(undefined)}>
                Cancelar
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  if (confirmRemove) remove(confirmRemove);
                  setConfirmRemove(undefined);
                }}
              >
                Remover
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default MembersManagement;
