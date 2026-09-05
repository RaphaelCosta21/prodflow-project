import * as React from "react";
import {
  Button,
  Checkbox,
  Dropdown,
  Option,
  Tooltip,
} from "@fluentui/react-components";
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
  Attach16Regular,
  Play20Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest, ISubItem } from "../../models";
import { buildSubItemTree, ISubItemNode } from "../../utils/subItemTree";
import {
  strategyOptionsFor,
  strategyKeyOf,
  optionByKey,
} from "../../config/strategyOptions";
import { TEAMS } from "../../config/teams";
import { useStartSubItems, useUpdateSubItem } from "../../api/fids";
import { useAccessLevel } from "../../hooks/useAccessLevel";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import GlassCard from "../common/GlassCard";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import BomImport from "./BomImport";
import SubItemDrawings from "./SubItemDrawings";
import styles from "./SubItemStrategyTab.module.scss";

export interface ISubItemStrategyTabProps {
  fid: string;
  data: IFabricationRequest;
}

interface IRowProps {
  node: ISubItemNode;
  depth: number;
  fid: string;
  canEdit: boolean;
  selected: { [id: string]: boolean };
  onToggleSelect: (id: string, checked: boolean) => void;
  onOpenDrawings: (subItem: ISubItem) => void;
}

const Row: React.FC<IRowProps> = ({
  node,
  depth,
  fid,
  canEdit,
  selected,
  onToggleSelect,
  onOpenDrawings,
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const update = useUpdateSubItem(fid);
  const hasChildren = node.children.length > 0;
  const strategyKey = strategyKeyOf(node.strategy, node.buyType, node.makeSite);
  const options = strategyOptionsFor(hasChildren);
  const currentOption = strategyKey ? optionByKey(strategyKey) : undefined;
  const isNa = node.strategy === "NA";
  const startable = !!node.strategy && !isNa && node.status !== "Costed";
  const drawings = node.drawings?.length ?? 0;

  const onStrategy = (key: string): void => {
    const opt = optionByKey(key);
    if (!opt) return;
    update.mutate({
      subItemId: node.id,
      changes: {
        strategy: opt.strategy,
        buyType: opt.buyType,
        makeSite: opt.makeSite,
        status: opt.strategy === "NA" ? "NotStarted" : "Strategy",
      },
    });
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
          <span className={styles.level}>
            {node.level}
            {node.findNumber ? `.${node.findNumber}` : ""}
          </span>
          <div className={styles.identity}>
            <span className={styles.pn}>{node.pn}</span>
            <span className={styles.desc}>{node.descricao}</span>
          </div>
        </div>

        <span className={styles.qtd}>
          {node.qtd} {node.unit ?? ""}
        </span>

        <div className={styles.strategy}>
          <Dropdown
            size="small"
            placeholder="Definir…"
            disabled={!canEdit}
            value={currentOption?.label ?? ""}
            selectedOptions={strategyKey ? [strategyKey] : []}
            onOptionSelect={(_, d) =>
              d.optionValue && onStrategy(d.optionValue)
            }
          >
            {options.map((o) => (
              <Option key={o.key} value={o.key} text={o.label}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
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
      </div>

      {expanded &&
        node.children.map((child) => (
          <Row
            key={child.id}
            node={child}
            depth={depth + 1}
            fid={fid}
            canEdit={canEdit}
            selected={selected}
            onToggleSelect={onToggleSelect}
            onOpenDrawings={onOpenDrawings}
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
  const [selected, setSelected] = React.useState<{ [id: string]: boolean }>({});
  const [drawingsFor, setDrawingsFor] = React.useState<ISubItem | undefined>();

  const canEdit = isAdmin || teams.indexOf("planning") >= 0;
  const tree = React.useMemo(
    () => buildSubItemTree(data.subItems),
    [data.subItems],
  );

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
        subtitle="Importada do PLM (Windchill). Cada linha recebe uma estratégia obrigatória."
      >
        <BomImport fid={fid} attendance={data.atendimento} />
      </GlassCard>

      <GlassCard
        title="Estratégia por sub-item"
        subtitle={
          undefinedCount > 0
            ? `${undefinedCount} linha(s) ainda sem estratégia definida.`
            : "Todas as linhas têm estratégia definida."
        }
        actions={
          canEdit ? (
            startButton
          ) : (
            <Tooltip
              content="Ação do time Planejamento (PCP)"
              relationship="label"
            >
              <span>{startButton}</span>
            </Tooltip>
          )
        }
        noBodyPadding
      >
        {data.subItems.length === 0 ? (
          <EmptyState
            title="BOM não importada"
            description="Importe o CSV/XLSX do PLM para explodir os sub-itens."
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
            </div>
            {tree.map((node) => (
              <Row
                key={node.id}
                node={node}
                depth={0}
                fid={fid}
                canEdit={canEdit}
                selected={selected}
                onToggleSelect={(id, checked) =>
                  setSelected((s) => ({ ...s, [id]: checked }))
                }
                onOpenDrawings={setDrawingsFor}
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
