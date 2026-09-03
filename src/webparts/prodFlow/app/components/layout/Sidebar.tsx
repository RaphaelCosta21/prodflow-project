import * as React from "react";
import { NavLink } from "react-router-dom";
import { Tooltip } from "@fluentui/react-components";
import {
  Add24Regular,
  ChevronDown24Regular,
  ChevronRight24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
} from "@fluentui/react-icons";
import { NAV_GROUPS, INavGroup } from "../../config/navigation";
import { ROUTES } from "../../config/routes";
import { useUIStore } from "../../stores/useUIStore";
import prodflowSymbol from "../../../assets/brand/prodflow-symbol.svg";
import prodflowLockup from "../../../assets/brand/prodflow-lockup.png";
import oiiWhiteLogo from "../../../assets/OII-white-transparent-vetorizado.svg";
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
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setCreateFidOpen = useUIStore((s) => s.setCreateFidOpen);

  const isDark = theme === "dark";
  const themeLabel = isDark ? "Tema escuro" : "Tema claro";

  // Collapsed rail has no visible labels, so only then does a tooltip add information.
  const withRailTooltip = (
    label: string,
    trigger: React.ReactElement,
  ): React.ReactElement =>
    collapsed ? (
      <Tooltip content={label} relationship="label" positioning="after">
        {trigger}
      </Tooltip>
    ) : (
      trigger
    );

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.brand}>
        {collapsed ? (
          <img
            className={styles.brandSymbol}
            src={prodflowSymbol}
            alt="ProdFlow"
          />
        ) : (
          <img
            className={styles.brandLockup}
            src={prodflowLockup}
            alt="ProdFlow"
          />
        )}
      </div>

      <div className={styles.createRow}>
        {withRailTooltip(
          "Novo FID",
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => setCreateFidOpen(true)}
          >
            <Add24Regular />
            {!collapsed && <span>Novo FID</span>}
          </button>,
        )}
      </div>

      <nav className={styles.scrollArea}>
        <div className={styles.nav}>
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.key} group={group} collapsed={collapsed} />
          ))}
        </div>

        <div className={styles.footer}>
          {withRailTooltip(
            themeLabel,
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
            >
              {isDark ? <WeatherMoon24Regular /> : <WeatherSunny24Regular />}
              {!collapsed && <span>{themeLabel}</span>}
            </button>,
          )}

          {!collapsed && (
            <div className={styles.credits}>
              <img
                className={styles.oiiLogo}
                src={oiiWhiteLogo}
                alt="Oceaneering"
              />
              <span className={styles.createdBy}>Created by Eng. Team</span>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
