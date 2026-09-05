import * as React from "react";
import { Tooltip } from "@fluentui/react-components";
import {
  ChevronLeft16Regular,
  ChevronRight16Regular,
} from "@fluentui/react-icons";
import { IFidNavGroup, FidTabKey } from "../../config/fidDetailNav";
import styles from "./DetailSideNav.module.scss";

export interface IDetailSideNavProps {
  groups: IFidNavGroup[];
  active: FidTabKey;
  collapsed: boolean;
  onSelect: (key: FidTabKey) => void;
  onToggleCollapsed: () => void;
  /** Small counter/indicator rendered at the right of an item (e.g. pending sub-items). */
  badges?: Partial<Record<FidTabKey, string>>;
}

export const DetailSideNav: React.FC<IDetailSideNavProps> = ({
  groups,
  active,
  collapsed,
  onSelect,
  onToggleCollapsed,
  badges,
}) => (
  <nav
    className={`${styles.sideNav} ${collapsed ? styles.collapsed : ""}`}
    aria-label="Seções do FID"
  >
    <button
      type="button"
      className={styles.collapseBtn}
      onClick={onToggleCollapsed}
      aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
    >
      {collapsed ? <ChevronRight16Regular /> : <ChevronLeft16Regular />}
    </button>

    {groups.map((group) => (
      <div key={group.key} className={styles.group}>
        {!collapsed && <div className={styles.groupLabel}>{group.label}</div>}
        {group.items.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;
          const badge = badges?.[item.key];
          const button = (
            <button
              key={item.key}
              type="button"
              className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={styles.icon}>
                <Icon />
              </span>
              {!collapsed && (
                <>
                  <span className={styles.label}>{item.label}</span>
                  {badge && <span className={styles.badge}>{badge}</span>}
                </>
              )}
            </button>
          );
          return collapsed ? (
            <Tooltip
              key={item.key}
              content={badge ? `${item.label} · ${badge}` : item.label}
              relationship="label"
              positioning="after"
            >
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </div>
    ))}
  </nav>
);

export default DetailSideNav;
