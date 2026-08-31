import * as React from "react";
import { Button, Tooltip } from "@fluentui/react-components";
import {
  PanelLeftContract24Regular,
  PanelLeftExpand24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
} from "@fluentui/react-icons";
import { useUIStore } from "../../stores/useUIStore";
import styles from "./Header.module.scss";

export const Header: React.FC = () => {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <header className={styles.header}>
      <Tooltip
        content={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
        relationship="label"
      >
        <Button
          appearance="subtle"
          icon={
            sidebarCollapsed ? (
              <PanelLeftExpand24Regular />
            ) : (
              <PanelLeftContract24Regular />
            )
          }
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        />
      </Tooltip>
      <div className={styles.spacer} />
      <Tooltip
        content={isDark ? "Switch to light mode" : "Switch to dark mode"}
        relationship="label"
      >
        <Button
          appearance="subtle"
          icon={isDark ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        />
      </Tooltip>
    </header>
  );
};

export default Header;
