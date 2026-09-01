import * as React from "react";
import { Input } from "@fluentui/react-components";
import { Search16Regular } from "@fluentui/react-icons";
import styles from "./FilterPanel.module.scss";

export interface IFilterOption {
  key: string;
  label: string;
  color?: string;
}

export interface IFilterGroup {
  key: string;
  allLabel?: string;
  options: IFilterOption[];
  selected: string;
  onSelect: (key: string) => void;
}

export interface IFilterPanelProps {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  groups?: IFilterGroup[];
  actions?: React.ReactNode;
}

export const FilterPanel: React.FC<IFilterPanelProps> = ({
  search,
  onSearch,
  placeholder = "Buscar...",
  groups = [],
  actions,
}) => (
  <div className={styles.toolbar}>
    <Input
      className={styles.search}
      value={search}
      placeholder={placeholder}
      contentBefore={<Search16Regular />}
      onChange={(_, d) => onSearch(d.value)}
    />
    {groups.map((group, gi) => (
      <React.Fragment key={group.key}>
        {gi > 0 && <span className={styles.separator} />}
        <button
          type="button"
          className={`${styles.chip} ${group.selected === "all" ? styles.active : ""}`}
          onClick={() => group.onSelect("all")}
        >
          {group.allLabel ?? "Todos"}
        </button>
        {group.options.map((opt) => {
          const isActive = group.selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              className={`${styles.chip} ${isActive ? styles.active : ""}`}
              style={
                isActive && opt.color
                  ? { background: opt.color, borderColor: opt.color }
                  : undefined
              }
              onClick={() => group.onSelect(opt.key)}
            >
              {opt.label}
            </button>
          );
        })}
      </React.Fragment>
    ))}
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);

export default FilterPanel;
