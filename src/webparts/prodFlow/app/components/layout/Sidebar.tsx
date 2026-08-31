import * as React from "react";
import { NavLink } from "react-router-dom";
import { Tooltip } from "@fluentui/react-components";
import {
  ChevronDown24Regular,
  ChevronRight24Regular,
} from "@fluentui/react-icons";
import { NAV_GROUPS, INavGroup } from "../../config/navigation";
import { ROUTES } from "../../config/routes";
import { useUIStore } from "../../stores/useUIStore";
import styles from "./Sidebar.module.scss";

const SidebarGroup: React.FC<{ group: INavGroup; collapsed: boolean }> = ({
  group,
  collapsed,
}) => {
  const [open, setOpen] = React.useState(true);
  const GroupIcon = group.icon;

  if (collapsed) {
    return (
      <div className={styles.group}>
        {group.items.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Tooltip
              key={item.key}
              content={item.label}
              relationship="label"
              positioning="after"
            >
              <NavLink
                to={item.route}
                end={item.route === ROUTES.dashboard}
                className={({ isActive }) =>
                  `${styles.iconLink} ${isActive ? styles.active : ""}`
                }
              >
                <ItemIcon />
              </NavLink>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.groupHeader}
        onClick={() => setOpen((o) => !o)}
      >
        <GroupIcon className={styles.groupIcon} />
        <span className={styles.groupLabel}>{group.label}</span>
        {open ? (
          <ChevronDown24Regular className={styles.chevron} />
        ) : (
          <ChevronRight24Regular className={styles.chevron} />
        )}
      </button>
      {open && (
        <div className={styles.items}>
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.route}
                end={item.route === ROUTES.dashboard}
                className={({ isActive }) =>
                  `${styles.item} ${isActive ? styles.active : ""}`
                }
              >
                <ItemIcon className={styles.itemIcon} />
                <span className={styles.itemLabel}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>PF</span>
        {!collapsed && (
          <span className={styles.brandText}>
            <span className={styles.brandName}>ProdFlow</span>
            <span className={styles.brandSub}>CIDEQ Production</span>
          </span>
        )}
      </div>
      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.key} group={group} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
