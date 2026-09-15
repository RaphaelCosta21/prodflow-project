import * as React from "react";
import {
  Button,
  Checkbox,
  Tooltip,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
} from "@fluentui/react-components";
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
  Attach16Regular,
  Play20Regular,
  MoreHorizontal20Regular,
  Add16Regular,
  Edit16Regular,
  Delete16Regular,
  BranchFork16Regular,
  LockClosed16Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest, ISubItem, WorkflowKind } from "../../models";
import { buildSubItemTree, ISubItemNode } from "../../utils/subItemTree";
import {
  strategyOptionsFor,
  strategyKeyOf,
  optionByKey,
} from "../../config/strategyOptions";
import { isSubItemCosted, workflowOf } from "../../config/workflows";
import { TEAMS } from "../../config/teams";
import {
  useStartSubItems,
  useUpdateSubItem,
  useReplicateStrategy,
  useAddSubItem,
  useDeleteSubItem,
  useRequestFabAnalysis,
} from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import { BomImportService } from "../../services/BomImportService";
import { subItemAttendanceOf } from "../../utils/classification";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import FidDrawingCard from "../common/FidDrawingCard";
import BomImport from "./BomImport";
import ClassificationCard from "./ClassificationCard";
import SubItemDrawings from "./SubItemDrawings";
import styles from "./SubItemStrategyTab.module.scss";

function collectDescendantIds(
  node: ISubItemNode,
  directOnly: boolean,
): string[] {
  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(child.id);
    if (!directOnly) ids.push(...collectDescendantIds(child, false));
  }
  return ids;
}

function hasStartedWork(node: ISubItem): boolean {
  return (
    !!node.startedAt ||
    !!node.delineation ||
    !!node.quotation ||
    !!node.selectedQuotationId ||
    (!!node.status && node.status !== "NotStarted")
  );
}

function canRequestAnalysis(node: ISubItem): boolean {
  return (
    !node.strategy &&
    !node.startedAt &&
    !node.engAnalysis?.requestedAt &&
    !hasStartedWork(node)
  );
}

function chipClassFor(strategy: string): string {
  if (strategy === "Buy") return styles.chipBuy;
  if (strategy === "Make") return styles.chipMake;
  return styles.chipNa;
}

function makeLabel(node: Pick<ISubItem, "makeSite">): string {
  return node.makeSite === "Subcon" ? "Make · SUB" : "Make · IH";
}

export interface ISubItemStrategyTabProps {
  fid: string;
  data: IFabricationRequest;
}

interface IRowProps {
  node: ISubItemNode;
  code: string;
  depth: number;
  fid: string;
  flow: WorkflowKind;
  actor: string;
  canManage: boolean;
  canOverrideMake: boolean;
  isRequesting: boolean;
  editing: boolean;
  followingSiblingIds: string[];
  selected: { [id: string]: boolean };
  editingIds: { [id: string]: boolean };
  onToggleSelect: (id: string, checked: boolean) => void;
  onOpenDrawings: (subItem: ISubItem) => void;
  onToggleEdit: (id: string) => void;
  onAddChild: (node: ISubItemNode) => void;
  onAddSibling: (node: ISubItemNode) => void;
  onDelete: (node: ISubItemNode) => void;
  onRequestAnalysis: (id: string) => void;
}

const Row: React.FC<IRowProps> = ({
  node,
  code,
  depth,
  fid,
  flow,
  actor,
  canManage,
  canOverrideMake,
  isRequesting,
  editing,
  followingSiblingIds,
  selected,
  editingIds,
  onToggleSelect,
  onOpenDrawings,
  onToggleEdit,
  onAddChild,
  onAddSibling,
  onDelete,
  onRequestAnalysis,
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const update = useUpdateSubItem(fid);
  const replicate = useReplicateStrategy(fid);
  const addToast = useUIStore((s) => s.addToast);
  const hasChildren = node.children.length > 0;
  const strategyKey = strategyKeyOf(node.strategy, node.buyType, node.makeSite);
  const options = strategyOptionsFor(
    hasChildren,
    flow,
    canOverrideMake ? "admin" : "planning",
  );
  const currentOption = strategyKey ? optionByKey(strategyKey) : undefined;
  const isNa = node.strategy === "NA";
  const startable = !!node.strategy && !isNa && !isSubItemCosted(node.status);
  const analysisPending =
    !!node.engAnalysis?.requestedAt && !node.engAnalysis?.decidedAt;
  const makeLocked = node.strategy === "Make" && !canOverrideMake;
  const analysisEligible = canRequestAnalysis(node);
  const selectable = startable || analysisEligible;
  const drawings = node.drawings?.length ?? 0;
  const workStarted = hasStartedWork(node);
  const canEditChips = canManage && !analysisPending && !makeLocked;
  const canReplicate =
    canEditChips &&
    !!currentOption &&
    !isNa &&
    (!currentOption || currentOption.strategy !== "Make" || canOverrideMake) &&
    !replicate.isLoading &&
    (hasChildren || followingSiblingIds.length > 0);

  const [pendingKey, setPendingKey] = React.useState<string | undefined>();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [buf, setBuf] = React.useState({
    pn: node.pn,
    descricao: node.descricao,
    qtd: String(node.qtd),
    unit: node.unit ?? "",
  });

  React.useEffect(() => {
    if (editing) {
      setBuf({
        pn: node.pn,
        descricao: node.descricao,
        qtd: String(node.qtd),
        unit: node.unit ?? "",
      });
    }
  }, [editing, node.id, node.pn, node.descricao, node.qtd, node.unit]);

  const applyStrategy = (key: string, reset: boolean): void => {
    const opt = optionByKey(key);
    if (!opt) return;
    const changes: Partial<ISubItem> = {
      strategy: opt.strategy,
      buyType: opt.buyType,
      makeSite: opt.makeSite,
      status: "NotStarted",
    };
    if (reset) {
      changes.delineation = undefined;
      changes.quotation = undefined;
      changes.selectedQuotationId = undefined;
      changes.fabricationBudget = undefined;
      changes.startedAt = undefined;
      changes.startedBy = undefined;
      changes.ownerTeam = undefined;
      changes.resumeStatus = undefined;
    }
    update.mutate({ subItemId: node.id, by: actor, changes });
  };

  const clearStrategy = (): void => {
    update.mutate({
      subItemId: node.id,
      by: actor,
      changes: {
        strategy: undefined,
        buyType: undefined,
        makeSite: undefined,
        status: "NotStarted",
        delineation: undefined,
        quotation: undefined,
        selectedQuotationId: undefined,
        fabricationBudget: undefined,
        startedAt: undefined,
        startedBy: undefined,
        ownerTeam: undefined,
        resumeStatus: undefined,
      },
      log: {
        type: analysisPending
          ? "subitem:analysis-cancel"
          : "subitem:strategy-reset",
        message: analysisPending
          ? `Solicitação de análise cancelada — ${node.pn}`
          : `Estratégia resetada — ${node.pn}`,
      },
    });
  };

  const onChipClick = (key: string): void => {
    if (!canEditChips) return;
    if (key === strategyKey) {
      setResetOpen(true);
      return;
    }
    if (workStarted) {
      setPendingKey(key);
      return;
    }
    applyStrategy(key, false);
  };

  const replicateTo = (ids: string[]): void => {
    if (!currentOption || isNa || ids.length === 0) return;
    replicate.mutate(
      {
        targetIds: ids,
        by: actor,
        changes: {
          strategy: currentOption.strategy,
          buyType: currentOption.buyType,
          makeSite: currentOption.makeSite,
        },
      },
      {
        onSuccess: () =>
          addToast(
            `Estratégia replicada para ${ids.length} item(ns).`,
            "success",
          ),
        onError: () => addToast("Falha ao replicar estratégia.", "error"),
      },
    );
  };

  const commitEdit = (): void => {
    update.mutate({
      subItemId: node.id,
      by: actor,
      changes: {
        pn: buf.pn.trim(),
        descricao: buf.descricao.trim(),
        qtd: parseFloat(buf.qtd.replace(",", ".")) || 0,
        unit: buf.unit.trim() || undefined,
      },
    });
  };

  const finishEdit = (): void => {
    commitEdit();
    onToggleEdit(node.id);
  };

  const strategyCell = (): React.ReactNode => {
    if (analysisPending) {
      return (
        <Tooltip
          content={
            canManage
              ? "Aguardando decisão da Engenharia Industrial — clique para cancelar a solicitação e resetar."
              : "Aguardando decisão da Engenharia Industrial na aba Delineamento de Fabricação."
          }
          relationship="label"
        >
          <button
            type="button"
            className={`${styles.chip} ${styles.chipMake} ${styles.chipPending}`}
            disabled={!canManage}
            onClick={() => setResetOpen(true)}
          >
            Make · em análise
          </button>
        </Tooltip>
      );
    }

    if (makeLocked) {
      return (
        <Tooltip
          content="Definido pela Engenharia Industrial — alterável apenas em Delineamento de Fabricação."
          relationship="label"
        >
          <span
            className={`${styles.chip} ${styles.chipMake} ${styles.chipActive}`}
          >
            {makeLabel(node)}
            <LockClosed16Regular />
          </span>
        </Tooltip>
      );
    }

    return options.map((o) => {
      const active = strategyKey === o.key;
      return (
        <Tooltip
          key={o.key}
          content={
            active ? `${o.label} — clique para resetar a escolha` : o.label
          }
          relationship="label"
        >
          <button
            type="button"
            className={`${styles.chip} ${chipClassFor(o.strategy)} ${
              active ? styles.chipActive : ""
            }`}
            disabled={!canEditChips}
            aria-pressed={active}
            onClick={() => onChipClick(o.key)}
          >
            {o.short}
          </button>
        </Tooltip>
      );
    });
  };

  return (
    <React.Fragment>
      <div className={`${styles.row} ${isNa ? styles.rowNa : ""}`}>
        <div className={styles.select}>
          <Checkbox
            checked={!!selected[node.id]}
            disabled={!canManage || !selectable}
            onChange={(_, d) => onToggleSelect(node.id, !!d.checked)}
            aria-label={`Selecionar ${node.pn}`}
          />
        </div>

        <div className={styles.main} style={{ paddingLeft: `${depth * 20}px` }}>
          {hasChildren ? (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Recolher" : "Expandir"}
            >
              {expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
            </button>
          ) : (
            <span className={styles.toggleSpacer} />
          )}
          <span className={styles.level}>{code}</span>
          {editing ? (
            <div className={styles.identityEdit}>
              <Input
                size="small"
                value={buf.pn}
                placeholder="Part Number"
                onChange={(_, d) => setBuf((b) => ({ ...b, pn: d.value }))}
                onKeyDown={(e) => e.key === "Enter" && finishEdit()}
              />
              <Input
                size="small"
                value={buf.descricao}
                placeholder="Descrição"
                onChange={(_, d) =>
                  setBuf((b) => ({ ...b, descricao: d.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && finishEdit()}
              />
            </div>
          ) : (
            <div className={styles.identity}>
              <span className={styles.pn}>{node.pn || "—"}</span>
              <span className={styles.desc}>{node.descricao}</span>
            </div>
          )}
        </div>

        <div className={styles.qtd}>
          {editing ? (
            <Input
              size="small"
              type="number"
              className={styles.qtyInput}
              value={buf.qtd}
              onChange={(_, d) => setBuf((b) => ({ ...b, qtd: d.value }))}
              onKeyDown={(e) => e.key === "Enter" && finishEdit()}
            />
          ) : (
            <>
              {node.qtd} {node.unit ?? ""}
            </>
          )}
        </div>

        <div className={styles.strategy}>
          {strategyCell()}
          {canManage && (
            <Tooltip
              content={
                analysisEligible
                  ? "Solicitar análise da Engenharia Industrial para esta linha."
                  : node.strategy
                    ? "A análise só pode ser solicitada em linha sem estratégia definida."
                    : "A análise só pode ser solicitada antes de iniciar trabalho."
              }
              relationship="label"
            >
              <button
                type="button"
                className={`${styles.chip} ${styles.chipAnalysis} ${
                  analysisPending ? styles.chipActive : ""
                }`}
                disabled={!analysisEligible || isRequesting}
                onClick={() => onRequestAnalysis(node.id)}
              >
                Eng. Ind.
              </button>
            </Tooltip>
          )}
        </div>

        <div className={styles.drawings}>
          <Button
            size="small"
            appearance="subtle"
            icon={<Attach16Regular />}
            onClick={() => onOpenDrawings(node)}
          >
            {drawings > 0 ? `${drawings}` : "Anexar"}
          </Button>
        </div>

        <div className={styles.status}>
          <StatusBadge kind="subitem" status={node.status} />
          {node.ownerTeam && (
            <span
              className={styles.team}
              style={
                {
                  "--team-color": TEAMS[node.ownerTeam].color,
                } as React.CSSProperties
              }
            >
              {TEAMS[node.ownerTeam].label}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {canManage && (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<MoreHorizontal20Regular />}
                  aria-label="Ações do item"
                />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem
                    icon={<Edit16Regular />}
                    onClick={() =>
                      editing ? finishEdit() : onToggleEdit(node.id)
                    }
                  >
                    {editing ? "Concluir edição" : "Editar item"}
                  </MenuItem>
                  <MenuItem
                    icon={<Add16Regular />}
                    onClick={() => onAddChild(node)}
                  >
                    Adicionar sub-item
                  </MenuItem>
                  <MenuItem
                    icon={<Add16Regular />}
                    onClick={() => onAddSibling(node)}
                  >
                    Adicionar item irmão
                  </MenuItem>
                  {canReplicate && (
                    <>
                      <MenuDivider />
                      {hasChildren && (
                        <MenuItem
                          icon={<BranchFork16Regular />}
                          onClick={() =>
                            replicateTo(collectDescendantIds(node, true))
                          }
                        >
                          Replicar aos filhos diretos
                        </MenuItem>
                      )}
                      {hasChildren && (
                        <MenuItem
                          icon={<BranchFork16Regular />}
                          onClick={() =>
                            replicateTo(collectDescendantIds(node, false))
                          }
                        >
                          Replicar a todos abaixo
                        </MenuItem>
                      )}
                      {followingSiblingIds.length > 0 && (
                        <MenuItem
                          icon={<BranchFork16Regular />}
                          onClick={() => replicateTo(followingSiblingIds)}
                        >
                          Replicar aos itens abaixo (mesmo nível)
                        </MenuItem>
                      )}
                    </>
                  )}
                  <MenuDivider />
                  <MenuItem
                    icon={<Delete16Regular />}
                    onClick={() => onDelete(node)}
                  >
                    Excluir item
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
        </div>
      </div>

      <Dialog
        open={!!pendingKey}
        onOpenChange={(_, d) => {
          if (!d.open) setPendingKey(undefined);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Alterar estratégia?</DialogTitle>
            <DialogContent>
              O delineamento/cotação deste item já foi iniciado. Alterar a
              estratégia vai <strong>resetar todo o delineamento</strong> já
              feito e inserido para este item. Deseja continuar?
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setPendingKey(undefined)}
              >
                Cancelar
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  if (pendingKey) applyStrategy(pendingKey, true);
                  setPendingKey(undefined);
                }}
              >
                Alterar e resetar
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(_, d) => {
          if (!d.open) setResetOpen(false);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Resetar a escolha?</DialogTitle>
            <DialogContent>
              A estratégia deste item voltará a ficar{" "}
              <strong>indefinida</strong> e{" "}
              <strong>todo o trabalho já realizado</strong> (delineamento,
              cotação, orçamento e roteamento) será resetado. Deseja continuar?
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setResetOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  clearStrategy();
                  setResetOpen(false);
                }}
              >
                Resetar escolha
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {expanded &&
        node.children.map((child, i) => (
          <Row
            key={child.id}
            node={child}
            code={`${code}.${i + 1}`}
            depth={depth + 1}
            fid={fid}
            flow={flow}
            actor={actor}
            canManage={canManage}
            canOverrideMake={canOverrideMake}
            isRequesting={isRequesting}
            editing={!!editingIds[child.id]}
            followingSiblingIds={node.children.slice(i + 1).map((c) => c.id)}
            selected={selected}
            editingIds={editingIds}
            onToggleSelect={onToggleSelect}
            onOpenDrawings={onOpenDrawings}
            onToggleEdit={onToggleEdit}
            onAddChild={onAddChild}
            onAddSibling={onAddSibling}
            onDelete={onDelete}
            onRequestAnalysis={onRequestAnalysis}
          />
        ))}
    </React.Fragment>
  );
};

export const SubItemStrategyTab: React.FC<ISubItemStrategyTabProps> = ({
  fid,
  data,
}) => {
  const user = useCurrentUser();
  const { teams, isAdmin } = useAccessLevel();
  const addToast = useUIStore((s) => s.addToast);
  const startSubItems = useStartSubItems(fid);
  const requestAnalysis = useRequestFabAnalysis(fid);
  const addSubItem = useAddSubItem(fid);
  const deleteSubItem = useDeleteSubItem(fid);
  const [selected, setSelected] = React.useState<{ [id: string]: boolean }>({});
  const [editingIds, setEditingIds] = React.useState<{ [id: string]: boolean }>(
    {},
  );
  const [drawingsFor, setDrawingsFor] = React.useState<ISubItem | undefined>();

  const canManage = isAdmin || teams.indexOf("planning") >= 0;
  const canOverrideMake = isAdmin;
  const flow = workflowOf(data.tipoOrcamento);
  const tree = React.useMemo(
    () => buildSubItemTree(data.subItems),
    [data.subItems],
  );

  const selectedIds = React.useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected],
  );

  const startableSet = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of data.subItems) {
      if (s.strategy && s.strategy !== "NA" && !s.startedAt) ids.add(s.id);
    }
    return ids;
  }, [data.subItems]);

  const analysisEligibleSet = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of data.subItems) {
      if (canRequestAnalysis(s)) ids.add(s.id);
    }
    return ids;
  }, [data.subItems]);

  const pendingAnalysisCount = React.useMemo(
    () =>
      data.subItems.filter(
        (s) => !!s.engAnalysis?.requestedAt && !s.engAnalysis?.decidedAt,
      ).length,
    [data.subItems],
  );

  const undefinedCount = React.useMemo(
    () =>
      data.subItems.filter((s) => !s.strategy && !s.engAnalysis?.requestedAt)
        .length,
    [data.subItems],
  );

  const selectedStartable = selectedIds.filter((id) => startableSet.has(id));
  const selectedAnalysisEligible = selectedIds.filter((id) =>
    analysisEligibleSet.has(id),
  );

  const toggleEditing = (id: string): void =>
    setEditingIds((s) => ({ ...s, [id]: !s[id] }));

  const nextFindNumber = (parentId: string | undefined): string => {
    let max = 0;
    for (const s of data.subItems) {
      if ((s.parentId ?? "") !== (parentId ?? "")) continue;
      const v = parseInt(s.findNumber ?? "", 10);
      if (Number.isFinite(v) && v > max) max = v;
    }
    return String(max + 1);
  };

  const addItem = (parentId: string | undefined, level: number): void => {
    const item = BomImportService.manual({
      pn: "",
      descricao: "",
      qtd: 1,
      parentId,
      level,
      findNumber: nextFindNumber(parentId),
      attendance: subItemAttendanceOf(data.atendimento),
    });
    addSubItem.mutate(item, {
      onError: (e) => addToast(`Erro ao adicionar item: ${String(e)}`, "error"),
    });
    setEditingIds((s) => ({ ...s, [item.id]: true }));
  };

  const addRoot = (): void => addItem(undefined, 1);
  const addChild = (node: ISubItemNode): void =>
    addItem(node.id, node.level + 1);
  const addSibling = (node: ISubItemNode): void =>
    addItem(node.parentId, node.level);

  const onDelete = (node: ISubItemNode): void => {
    if (
      !window.confirm(
        `Excluir "${node.pn || "item"}" e todos os seus sub-itens?`,
      )
    )
      return;
    deleteSubItem.mutate(node.id, {
      onError: () => addToast("Falha ao excluir o item.", "error"),
    });
    setEditingIds((s) => {
      const next = { ...s };
      delete next[node.id];
      return next;
    });
  };

  const start = (ids: string[]): void => {
    if (ids.length === 0) return;
    startSubItems.mutate(
      { subItemIds: ids, by: user.displayName },
      {
        onSuccess: () => {
          addToast(`${ids.length} sub-item(ns) roteado(s).`, "success");
          setSelected({});
        },
        onError: () => addToast("Falha ao iniciar os sub-itens.", "error"),
      },
    );
  };

  const request = (ids: string[]): void => {
    if (ids.length === 0) return;
    requestAnalysis.mutate(
      { subItemIds: ids, by: user.displayName },
      {
        onSuccess: () => {
          addToast(
            `${ids.length} linha(s) enviada(s) para análise.`,
            "success",
          );
          setSelected({});
        },
        onError: (err) => addToast(String(err), "error"),
      },
    );
  };

  const startButton = (
    <Button
      appearance="primary"
      icon={<Play20Regular />}
      disabled={
        !canManage ||
        startSubItems.isLoading ||
        startableSet.size === 0 ||
        (selectedIds.length > 0 && selectedStartable.length === 0)
      }
      onClick={() =>
        start(
          selectedIds.length > 0 ? selectedStartable : Array.from(startableSet),
        )
      }
    >
      {selectedIds.length > 0
        ? `Iniciar ${selectedStartable.length} selecionado(s)`
        : "Iniciar todos definidos"}
    </Button>
  );

  const requestButton = (
    <Button
      appearance="secondary"
      icon={<BranchFork16Regular />}
      disabled={
        !canManage ||
        requestAnalysis.isLoading ||
        selectedAnalysisEligible.length === 0
      }
      onClick={() => request(selectedAnalysisEligible)}
    >
      Solicitar análise ({selectedAnalysisEligible.length})
    </Button>
  );

  return (
    <div className={styles.tab}>
      <GlassCard
        title="BOM do TOP LEVEL"
        subtitle="Importe o CSV/XLSX da engenharia ou monte a BOM manualmente, item a item."
      >
        <BomImport
          fid={fid}
          attendance={subItemAttendanceOf(data.atendimento)}
          canEdit={canManage}
          onAddItem={addRoot}
        />
      </GlassCard>

      <FidDrawingCard data={data} compact canEdit={canManage} />

      <GlassCard
        title="Estratégia por sub-item"
        subtitle={
          pendingAnalysisCount > 0
            ? `${pendingAnalysisCount} linha(s) em análise pela Engenharia Industrial.`
            : undefinedCount > 0
              ? `${undefinedCount} linha(s) ainda sem estratégia definida.`
              : "Todas as linhas têm estratégia definida."
        }
        actions={
          <div className={styles.strategyActions}>
            <ClassificationCard fid={fid} data={data} compact />
            {canManage ? (
              <>
                {requestButton}
                {startButton}
              </>
            ) : (
              <Tooltip
                content="Ações do time Planejamento"
                relationship="label"
              >
                <span className={styles.readonlyActions}>
                  {requestButton}
                  {startButton}
                </span>
              </Tooltip>
            )}
          </div>
        }
        noBodyPadding
      >
        {data.subItems.length === 0 ? (
          <EmptyState
            title="BOM vazia"
            description="Importe o CSV/XLSX ou clique em “Adicionar item” para montar a BOM manualmente."
          />
        ) : (
          <div className={styles.table}>
            <div className={styles.head}>
              <span />
              <span>Item</span>
              <span>Qtd.</span>
              <span>Estratégia</span>
              <span>Desenho</span>
              <span>Status</span>
              <span />
            </div>
            {tree.map((node, i) => (
              <Row
                key={node.id}
                node={node}
                code={String(i + 1)}
                depth={0}
                fid={fid}
                flow={flow}
                actor={user.displayName}
                canManage={canManage}
                canOverrideMake={canOverrideMake}
                isRequesting={requestAnalysis.isLoading}
                editing={!!editingIds[node.id]}
                followingSiblingIds={tree.slice(i + 1).map((n) => n.id)}
                selected={selected}
                editingIds={editingIds}
                onToggleSelect={(id, checked) =>
                  setSelected((s) => ({ ...s, [id]: checked }))
                }
                onOpenDrawings={setDrawingsFor}
                onToggleEdit={toggleEditing}
                onAddChild={addChild}
                onAddSibling={addSibling}
                onDelete={onDelete}
                onRequestAnalysis={(id) => request([id])}
              />
            ))}
          </div>
        )}
      </GlassCard>

      <SubItemDrawings
        fid={fid}
        subItem={drawingsFor}
        canEdit={canManage}
        onClose={() => setDrawingsFor(undefined)}
      />
    </div>
  );
};

export default SubItemStrategyTab;
