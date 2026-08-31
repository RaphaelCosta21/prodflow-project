import * as React from "react";
import { Dropdown, Option } from "@fluentui/react-components";
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
} from "@fluentui/react-icons";
import { ISubItem } from "../../models";
import { buildSubItemTree, ISubItemNode } from "../../utils/subItemTree";
import {
  STRATEGY_OPTIONS,
  strategyKeyOf,
  optionByKey,
} from "../../config/strategyOptions";
import { useUpdateSubItem } from "../../api/fids";
import StatusBadge from "../common/StatusBadge";
import SubItemPathway from "./SubItemPathway";
import styles from "./SubItemTree.module.scss";

interface ISubItemRowProps {
  node: ISubItemNode;
  depth: number;
  fid: string;
}

const SubItemRow: React.FC<ISubItemRowProps> = ({ node, depth, fid }) => {
  const [expanded, setExpanded] = React.useState(true);
  const update = useUpdateSubItem(fid);
  const hasChildren = node.children.length > 0;
  const strategyKey = strategyKeyOf(node.strategy, node.buyType, node.makeSite);
  const currentOption = strategyKey ? optionByKey(strategyKey) : undefined;

  const onStrategy = (key: string): void => {
    const opt = optionByKey(key);
    if (!opt) return;
    update.mutate({
      subItemId: node.id,
      changes: {
        strategy: opt.strategy,
        buyType: opt.buyType,
        makeSite: opt.makeSite,
      },
    });
  };

  return (
    <React.Fragment>
      <div className={styles.row}>
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
          <span className={styles.pn}>{node.pn}</span>
          <span className={styles.desc}>{node.descricao}</span>
        </div>
        <span className={styles.qtd}>
          {node.qtd}
          {node.unit ? ` ${node.unit}` : ""}
        </span>
        <div className={styles.strategy}>
          <Dropdown
            size="small"
            placeholder="Make/Buy"
            value={currentOption?.label ?? ""}
            selectedOptions={strategyKey ? [strategyKey] : []}
            onOptionSelect={(_, d) => {
              if (d.optionValue) onStrategy(d.optionValue);
            }}
          >
            {STRATEGY_OPTIONS.map((o) => (
              <Option key={o.key} value={o.key}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </div>
        <div className={styles.status}>
          <StatusBadge kind="subitem" status={node.status} />
        </div>
      </div>
      {!hasChildren && strategyKey && (
        <div
          className={styles.pathwayRow}
          style={{ paddingLeft: `${depth * 20 + 28}px` }}
        >
          <SubItemPathway strategyKey={strategyKey} />
        </div>
      )}
      {hasChildren &&
        expanded &&
        node.children.map((child) => (
          <SubItemRow key={child.id} node={child} depth={depth + 1} fid={fid} />
        ))}
    </React.Fragment>
  );
};

export interface ISubItemTreeProps {
  subItems: ISubItem[];
  fid: string;
}

export const SubItemTree: React.FC<ISubItemTreeProps> = ({ subItems, fid }) => {
  const tree = React.useMemo(() => buildSubItemTree(subItems), [subItems]);
  return (
    <div className={styles.tree}>
      <div className={styles.headerRow}>
        <span className={styles.hMain}>Sub-item (nível · PN · descrição)</span>
        <span className={styles.hQtd}>Qtd</span>
        <span className={styles.hStrategy}>Estratégia (make/buy)</span>
        <span className={styles.hStatus}>Status</span>
      </div>
      {tree.map((node) => (
        <SubItemRow key={node.id} node={node} depth={0} fid={fid} />
      ))}
    </div>
  );
};

export default SubItemTree;
