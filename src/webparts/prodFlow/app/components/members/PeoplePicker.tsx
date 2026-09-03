import * as React from "react";
import { PeopleService, IPersonResult } from "../../services/PeopleService";
import UserAvatar from "../common/UserAvatar";
import styles from "./PeoplePicker.module.scss";

export type IPeopleResult = IPersonResult;

export interface IPeoplePickerProps {
  value: string;
  onQueryChange: (value: string) => void;
  onSelect: (person: IPeopleResult) => void;
  placeholder?: string;
}

export const PeoplePicker: React.FC<IPeoplePickerProps> = ({
  value,
  onQueryChange,
  onSelect,
  placeholder = "Digite um nome ou e-mail...",
}) => {
  const [results, setResults] = React.useState<IPeopleResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const requestRef = React.useRef(0);

  const search = React.useCallback(async (query: string): Promise<void> => {
    const term = query.trim().slice(0, 80);
    const requestId = ++requestRef.current;
    setError("");
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    try {
      const list = await PeopleService.search(term);
      if (requestRef.current !== requestId) return;
      setResults(list);
      setOpen(true);
    } catch (e) {
      if (requestRef.current !== requestId) return;
      setResults([]);
      setOpen(true);
      setError(
        (e as Error)?.message
          ? `Falha na busca: ${(e as Error).message}`
          : "Falha ao buscar pessoas no diretório.",
      );
    } finally {
      if (requestRef.current === requestId) setSearching(false);
    }
  }, []);

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
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <input
        className={styles.input}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          if (results.length > 0 || error) setOpen(true);
        }}
        onChange={(e) => handleChange(e.currentTarget.value)}
      />
      {searching && <span className={styles.spinner}>Buscando...</span>}
      {open && (
        <div className={styles.dropdown}>
          {error && <div className={styles.message}>{error}</div>}
          {!error && !searching && results.length === 0 && (
            <div className={styles.message}>Nenhuma pessoa encontrada.</div>
          )}
          {results.map((p) => (
            <button
              key={p.loginName || p.email}
              type="button"
              className={styles.item}
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setResults([]);
              }}
            >
              <UserAvatar
                name={p.displayName}
                email={p.email}
                size={32}
                photoSize="S"
                className={styles.itemAvatar}
              />
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
