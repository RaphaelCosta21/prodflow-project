import * as React from "react";
import { useSpfxContext } from "../../config/SpfxContext";
import styles from "./PeoplePicker.module.scss";

export interface IPeopleResult {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
  photoUrl: string;
}

export interface IPeoplePickerProps {
  value: string;
  onQueryChange: (value: string) => void;
  onSelect: (person: IPeopleResult) => void;
  placeholder?: string;
}

interface IGraphUser {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
}

// Single quotes must be doubled or they break out of the OData string literal.
function escapeODataLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "#0a58ca",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const PeoplePicker: React.FC<IPeoplePickerProps> = ({
  value,
  onQueryChange,
  onSelect,
  placeholder = "Digite um nome ou e-mail...",
}) => {
  const spfxContext = useSpfxContext();
  const [results, setResults] = React.useState<IPeopleResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const search = React.useCallback(
    async (query: string): Promise<void> => {
      const term = query.trim().slice(0, 80);
      if (term.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setSearching(true);
      try {
        const client = await spfxContext.msGraphClientFactory.getClient("3");
        const safe = escapeODataLiteral(term);
        const response = await client
          .api("/users")
          .filter(
            `startswith(displayName,'${safe}') or startswith(mail,'${safe}')`,
          )
          .select("id,displayName,mail,userPrincipalName,jobTitle,department")
          .top(8)
          .get();

        const list: IPeopleResult[] = (
          (response.value ?? []) as IGraphUser[]
        ).map((u) => ({
          id: u.id,
          displayName: u.displayName ?? "",
          email: u.mail ?? u.userPrincipalName ?? "",
          jobTitle: u.jobTitle ?? "",
          department: u.department ?? "",
          photoUrl: "",
        }));
        setResults(list);
        setOpen(list.length > 0);

        // Photos are best-effort and load after the names are already on screen.
        list.forEach((person, idx) => {
          client
            .api(`/users/${person.id}/photo/$value`)
            .get()
            .then((blob: Blob) => blobToDataUrl(blob))
            .then((url: string) =>
              setResults((prev) =>
                prev.map((p, i) =>
                  i === idx && p.id === person.id ? { ...p, photoUrl: url } : p,
                ),
              ),
            )
            .catch(() => undefined);
        });
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setSearching(false);
      }
    },
    [spfxContext],
  );

  const handleChange = (next: string): void => {
    onQueryChange(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      search(next).catch(() => undefined);
    }, 300);
  };

  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent): void => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <input
        className={styles.input}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => handleChange(e.currentTarget.value)}
      />
      {searching && <span className={styles.spinner}>Buscando...</span>}
      {open && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.item}
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setResults([]);
              }}
            >
              {p.photoUrl ? (
                <img
                  className={styles.itemAvatar}
                  src={p.photoUrl}
                  alt={p.displayName}
                />
              ) : (
                <div
                  className={styles.itemAvatar}
                  style={{ background: getAvatarColor(p.displayName) }}
                >
                  {getInitials(p.displayName)}
                </div>
              )}
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{p.displayName}</span>
                <span className={styles.itemDetail}>{p.email}</span>
                {p.jobTitle && (
                  <span className={styles.itemDetail}>
                    {p.jobTitle}
                    {p.department ? ` · ${p.department}` : ""}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PeoplePicker;
