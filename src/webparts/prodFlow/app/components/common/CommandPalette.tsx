import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Add24Regular,
  Search24Regular,
  Navigation24Regular,
} from "@fluentui/react-icons";
import { useFids } from "../../api/fids";
import { NAV_GROUPS } from "../../config/navigation";
import { fidDetailPath } from "../../config/routes";
import { useUIStore } from "../../stores/useUIStore";
import styles from "./CommandPalette.module.scss";

interface IResult {
  key: string;
  group: string;
  label: string;
  hint?: string;
  route?: string;
  run?: () => void;
  icon: React.ReactNode;
}

const MAX_PER_GROUP = 8;

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setCreateFidOpen = useUIStore((s) => s.setCreateFidOpen);
  const { data: fids } = useFids();

  const [term, setTerm] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTerm("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const results = React.useMemo<IResult[]>(() => {
    const q = term.trim().toLowerCase();

    const actions: IResult[] =
      !q || "novo fid criar".indexOf(q) >= 0
        ? [
            {
              key: "action-create-fid",
              group: "Ações",
              label: "Novo FID",
              hint: "Criar a partir de uma OS",
              run: () => setCreateFidOpen(true),
              icon: <Add24Regular />,
            },
          ]
        : [];

    const pages: IResult[] = [];
    NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        const Icon = item.icon;
        if (
          !q ||
          `${group.label} ${item.label}`.toLowerCase().indexOf(q) >= 0
        ) {
          pages.push({
            key: `nav-${item.key}`,
            group: "Páginas",
            label: item.label,
            hint: group.label,
            route: item.route,
            icon: <Icon />,
          });
        }
      });
    });

    const requests: IResult[] = (fids ?? [])
      .filter(
        (r) =>
          !q ||
          r.fid.toLowerCase().indexOf(q) >= 0 ||
          (r.osNumber ?? "").toLowerCase().indexOf(q) >= 0,
      )
      .map((r) => ({
        key: `fid-${r.fid}`,
        group: "FIDs",
        label: r.fid,
        hint: r.osNumber ? `OS ${r.osNumber}` : undefined,
        route: fidDetailPath(r.fid),
        icon: <Navigation24Regular />,
      }));

    return [
      ...actions,
      ...requests.slice(0, MAX_PER_GROUP),
      ...pages.slice(0, MAX_PER_GROUP),
    ];
  }, [term, fids, setCreateFidOpen]);

  const run = React.useCallback(
    (result: IResult) => {
      setOpen(false);
      if (result.run) result.run();
      else if (result.route) navigate(result.route);
    },
    [navigate, setOpen],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
      return;
    }
    if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      run(results[activeIndex]);
    }
  };

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida"
        onKeyDown={onKeyDown}
      >
        <div className={styles.searchRow}>
          <Search24Regular />
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Buscar FIDs, OS, páginas..."
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setActiveIndex(0);
            }}
          />
          <span className={styles.esc}>Esc</span>
        </div>

        <div className={styles.results}>
          {results.length === 0 && (
            <div className={styles.empty}>Nenhum resultado.</div>
          )}
          {results.map((r, i) => {
            const showGroup = r.group !== lastGroup;
            lastGroup = r.group;
            return (
              <React.Fragment key={r.key}>
                {showGroup && (
                  <div className={styles.groupLabel}>{r.group}</div>
                )}
                <button
                  type="button"
                  className={`${styles.result} ${i === activeIndex ? styles.active : ""}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => run(r)}
                >
                  <span className={styles.resultIcon}>{r.icon}</span>
                  <span className={styles.resultText}>{r.label}</span>
                  {r.hint && (
                    <span className={styles.resultHint}>{r.hint}</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
