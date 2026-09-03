import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tooltip,
} from "@fluentui/react-components";
import {
  Alert24Regular,
  ChevronDown24Regular,
  PanelLeftContract24Regular,
  PanelLeftExpand24Regular,
  Search24Regular,
  Settings24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
} from "@fluentui/react-icons";
import { useSpfxContext } from "../../config/SpfxContext";
import { ROUTES } from "../../config/routes";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNotifications } from "../../api/notifications";
import { useMembers } from "../../api/config";
import { useUIStore, ThemePreference } from "../../stores/useUIStore";
import animations from "../../styles/animations.module.scss";
import styles from "./Header.module.scss";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const spfxContext = useSpfxContext();
  const user = useCurrentUser();

  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  const { data: notifications } = useNotifications();
  const { data: membersData } = useMembers();

  const [photoFailed, setPhotoFailed] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const pendingCount = (notifications ?? []).filter(
    (n) => n.status === "Pending",
  ).length;

  const member = React.useMemo(
    () =>
      (membersData?.members ?? []).find(
        (m) => m.email.toLowerCase() === user.email.toLowerCase(),
      ),
    [membersData, user.email],
  );

  // Photo comes straight from SharePoint on each load — nothing is cached as base64.
  const photoUrl = React.useMemo(
    () =>
      user.email
        ? `${spfxContext.pageContext.web.absoluteUrl}/_layouts/15/userphoto.aspx?size=M&username=${encodeURIComponent(user.email)}`
        : "",
    [spfxContext, user.email],
  );

  React.useEffect(() => setPhotoFailed(false), [photoUrl]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  const changeTheme = (next: ThemePreference): void => {
    setTheme(next);
    setMenuOpen(false);
  };

  const initials = initialsOf(user.displayName);
  const avatarContent =
    photoUrl && !photoFailed ? (
      <img
        src={photoUrl}
        alt={user.displayName}
        onError={() => setPhotoFailed(true)}
      />
    ) : (
      initials
    );

  return (
    <header className={styles.header}>
      <Tooltip
        content={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        relationship="label"
      >
        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeftExpand24Regular />
          ) : (
            <PanelLeftContract24Regular />
          )}
        </button>
      </Tooltip>

      <button
        type="button"
        className={styles.search}
        onClick={() => setCommandPaletteOpen(true)}
      >
        <Search24Regular />
        <span className={styles.searchLabel}>Buscar FIDs, OS, páginas...</span>
        <span className={styles.shortcut}>Ctrl+K</span>
      </button>

      <div className={styles.actions}>
        <Tooltip content="Notificações" relationship="label">
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => navigate(ROUTES.notifications)}
          >
            <Alert24Regular />
            {pendingCount > 0 && (
              <span className={`${styles.badge} ${animations.pulse}`}>
                {pendingCount}
              </span>
            )}
          </button>
        </Tooltip>

        <Tooltip content="Configurações" relationship="label">
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => navigate(ROUTES.configuration)}
          >
            <Settings24Regular />
          </button>
        </Tooltip>

        <Menu
          open={menuOpen}
          onOpenChange={(_, data) => setMenuOpen(data.open)}
          positioning="below-end"
        >
          <MenuTrigger disableButtonEnhancement>
            <button type="button" className={styles.userArea}>
              <span className={styles.avatar}>{avatarContent}</span>
              <span className={styles.userInfo}>
                <span className={styles.userName}>{user.displayName}</span>
                <span className={styles.userRole}>
                  {member?.jobTitle || user.email}
                </span>
              </span>
              <ChevronDown24Regular className={styles.userChevron} />
            </button>
          </MenuTrigger>

          {/* Layout lives on an inner div so it never competes with Griffel's popover styles. */}
          <MenuPopover>
            <div className={styles.menu}>
              <div className={styles.menuHeader}>
                <span className={styles.menuAvatar}>{avatarContent}</span>
                <span className={styles.menuText}>
                  <span className={styles.menuName}>{user.displayName}</span>
                  <span className={styles.menuEmail}>{user.email}</span>
                </span>
              </div>

              <div className={styles.divider} />

              <span className={styles.menuLabel}>Preferência de tema</span>
              <div className={styles.themeOptions}>
                <button
                  type="button"
                  className={`${styles.themeOption} ${theme === "light" ? styles.themeActive : ""}`}
                  aria-pressed={theme === "light"}
                  onClick={() => changeTheme("light")}
                >
                  <WeatherSunny24Regular />
                  Claro
                </button>
                <button
                  type="button"
                  className={`${styles.themeOption} ${theme === "dark" ? styles.themeActive : ""}`}
                  aria-pressed={theme === "dark"}
                  onClick={() => changeTheme("dark")}
                >
                  <WeatherMoon24Regular />
                  Escuro
                </button>
              </div>
            </div>

            <MenuDivider />

            <MenuList>
              <MenuItem
                icon={<Settings24Regular />}
                onClick={() => navigate(ROUTES.configuration)}
              >
                Configurações
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </header>
  );
};

export default Header;
