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
} from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import { BomImportService } from "../../services/BomImportService";
import { subItemAttendanceOf } from "../../utils/classification";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import BomImport from "./BomImport";
import ClassificationCard from "./ClassificationCard";
import SubItemDrawings from "./SubItemDrawings";
import styles from "./SubItemStrategyTab.module.scss";

// Flattens the ids of a node's children (directOnly) or every descendant below it.
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

// Signals delineation/quotation work already exists — changing strategy would discard it.
function hasStartedWork(node: ISubItem): boolean {
  return (
    !!node.startedAt ||
    !!node.delineation ||
    !!node.quotation ||
    (!!node.status && node.status !== "NotStarted")
  );
}

function chipClassFor(strategy: string): string {
  if (strategy === "Buy") return styles.chipBuy;
  if (strategy === "Make") return styles.chipMake;
  return styles.chipNa;
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
  canEdit: boolean;
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
}

const Row: React.FC<IRowProps> = ({
  node,
  code,
  depth,
  fid,
  flow,
  actor,
  canEdit,
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
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const update = useUpdateSubItem(fid);
  const replicate = useReplicateStrategy(fid);
  const addToast = useUIStore((s) => s.addToast);
  const hasChildren = node.children.length > 0;
  const strategyKey = strategyKeyOf(node.strategy, node.buyType, node.makeSite);
  const options = strategyOptionsFor(hasChildren, flow);
  const currentOption = strategyKey ? optionByKey(strategyKey) : undefined;
  const isNa = node.strategy === "NA";
  const startable = !!node.strategy && !isNa && !isSubItemCosted(node.status);
  const drawings = node.drawings?.length ?? 0;
  const workStarted = hasStartedWork(node);
  const canReplicate =
    canEdit &&
    !!currentOption &&
    !isNa &&
    !replicate.isLoading &&
    (hasChildren || followingSiblingIds.length > 0);

  const [pendingKey, setPendingKey] = React.useState<string | undefined>();
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

  const onChipClick = (key: string): void => {
    if (key === strategyKey) return;
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

  return (
    <React.Fragment>
      <div className={`${styles.row} ${isNa ? styles.rowNa : ""}`}>
        <div className={styles.select}>
          <Checkbox
            checked={!!selected[node.id]}
            disabled={!canEdit || !startable}
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
          {options.map((o) => {
            const active = strategyKey === o.key;
            return (
              <Tooltip key={o.key} content={o.label} relationship="label">
                <button
                  type="button"
                  className={`${styles.chip} ${chipClassFor(o.strategy)} ${
                    active ? styles.chipActive : ""
                  }`}
                  disabled={!canEdit}
                  aria-pressed={active}
                  onClick={() => onChipClick(o.key)}
                >
                  {o.short}
                </button>
              </Tooltip>
            );
          })}
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
          {canEdit && (
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
            canEdit={canEdit}
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
  const addSubItem = useAddSubItem(fid);
  const deleteSubItem = useDeleteSubItem(fid);
  const [selected, setSelected] = React.useState<{ [id: string]: boolean }>({});
  const [editingIds, setEditingIds] = React.useState<{ [id: string]: boolean }>(
    {},
  );
  const [drawingsFor, setDrawingsFor] = React.useState<ISubItem | undefined>();

  const canEdit = isAdmin || teams.indexOf("planning") >= 0;
  const flow = workflowOf(data.tipoOrcamento);
  const tree = React.useMemo(
    () => buildSubItemTree(data.subItems),
    [data.subItems],
  );

  const toggleEditing = (id: string): void =>
    setEditingIds((s) => ({ ...s, [id]: !s[id] }));

  // Next sequential F/N within a parent group (drives the hierarchical 1.1, 1.2… numbering).
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

  // Já roteados (startedAt) saem da fila para o botão não reenviá-los ao time.
  const startable = data.subItems.filter(
    (s) => s.strategy && s.strategy !== "NA" && !s.startedAt,
  );
  const undefinedCount = data.subItems.filter((s) => !s.strategy).length;
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

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

  const startButton = (
    <Button
      appearance="primary"
      icon={<Play20Regular />}
      disabled={!canEdit || startSubItems.isLoading || startable.length === 0}
      onClick={() =>
        start(selectedIds.length > 0 ? selectedIds : startable.map((s) => s.id))
      }
    >
      {selectedIds.length > 0
        ? `Iniciar ${selectedIds.length} selecionado(s)`
        : "Iniciar todos definidos"}
    </Button>
  );

  return (
    <div className={styles.tab}>
      <GlassCard
        title="BOM do TOP LEVEL"
        subtitle="Importe o CSV/XLSX da engenharia ou monte a BOM manualmente, item a item. Cada linha recebe uma estratégia obrigatória."
      >
        <BomImport
          fid={fid}
          attendance={subItemAttendanceOf(data.atendimento)}
          canEdit={canEdit}
          onAddItem={addRoot}
        />
      </GlassCard>

      <GlassCard
        title="Estratégia por sub-item"
        subtitle={
          undefinedCount > 0
            ? `${undefinedCount} linha(s) ainda sem estratégia definida.`
            : "Todas as linhas têm estratégia definida."
        }
        actions={
          <div className={styles.strategyActions}>
            <ClassificationCard fid={fid} data={data} compact />
            {canEdit ? (
              startButton
            ) : (
              <Tooltip content="Ação do time Planejamento" relationship="label">
                <span>{startButton}</span>
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
                canEdit={canEdit}
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
              />
            ))}
          </div>
        )}
      </GlassCard>

      <SubItemDrawings
        fid={fid}
        subItem={drawingsFor}
        canEdit={canEdit}
        onClose={() => setDrawingsFor(undefined)}
      />
    </div>
  );
};

export default SubItemStrategyTab;
