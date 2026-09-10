import * as React from "react";
import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverSurface,
  PopoverTrigger,
} from "@fluentui/react-components";
import {
  Dismiss16Regular,
  Filter16Filled,
  Filter16Regular,
  Search16Regular,
} from "@fluentui/react-icons";
import styles from "./DataTable.module.scss";

export interface IDataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  /** Enables the in-header filter popover; returns the row value used as filter option. */
  filterValue?: (row: T) => string | number | undefined;
}

export interface IDataTableProps<T> {
  columns: IDataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  /** Notified whenever the column filters change the number of rendered rows. */
  onVisibleCountChange?: (count: number) => void;
}

/** Label used for rows without a value in a filterable column. */
const BLANK_OPTION = "—";

/** Free text (live "contains") + checked options. Both are optional and combine per column. */
interface IColumnFilterState {
  query: string;
  selected: string[];
}

const EMPTY_FILTER: IColumnFilterState = { query: "", selected: [] };

function optionOf(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value).trim();
  return text.length ? text : BLANK_OPTION;
}

interface IColumnFilterProps {
  header: string;
  options: string[];
  filter: IColumnFilterState;
  onChange: (next: IColumnFilterState) => void;
}

const ColumnFilter: React.FC<IColumnFilterProps> = ({
  header,
  options,
  filter,
  onChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const needle = filter.query.trim().toLowerCase();
  const visible = needle
    ? options.filter((o) => o.toLowerCase().indexOf(needle) >= 0)
    : options;
  const active = filter.selected.length > 0 || needle.length > 0;

  const toggle = (option: string): void =>
    onChange({
      ...filter,
      selected:
        filter.selected.indexOf(option) >= 0
          ? filter.selected.filter((s) => s !== option)
          : filter.selected.concat(option),
    });

  return (
    <Popover
      open={open}
      onOpenChange={(_, d) => setOpen(d.open)}
      positioning="below-start"
      trapFocus
    >
      <PopoverTrigger disableButtonEnhancement>
        <button
          type="button"
          className={`${styles.filterBtn} ${active ? styles.filterBtnActive : ""}`}
          title={`Filtrar por ${header}`}
          aria-label={`Filtrar por ${header}`}
        >
          {active ? <Filter16Filled /> : <Filter16Regular />}
        </button>
      </PopoverTrigger>
      <PopoverSurface className={styles.filterSurface}>
        <div className={styles.filterHead}>
          <span className={styles.filterTitle}>Filtrar: {header}</span>
          <button
            type="button"
            className={styles.filterClose}
            onClick={() => setOpen(false)}
            aria-label="Fechar"
          >
            <Dismiss16Regular />
          </button>
        </div>
        <Input
          size="small"
          value={filter.query}
          placeholder="Digite para filtrar..."
          contentBefore={<Search16Regular />}
          onChange={(_, d) => onChange({ ...filter, query: d.value })}
        />
        <div className={styles.filterList}>
          {visible.length === 0 ? (
            <span className={styles.filterEmpty}>Nenhuma opção.</span>
          ) : (
            visible.map((option) => (
              <Checkbox
                key={option}
                label={option}
                checked={filter.selected.indexOf(option) >= 0}
                onChange={() => toggle(option)}
              />
            ))
          )}
        </div>
        <div className={styles.filterFoot}>
          <span className={styles.filterCount}>
            {filter.selected.length > 0
              ? `${filter.selected.length} selecionado(s)`
              : needle
                ? `Contendo “${filter.query.trim()}”`
                : "Sem filtro"}
          </span>
          <Button
            size="small"
            appearance="subtle"
            disabled={!active}
            onClick={() => onChange(EMPTY_FILTER)}
          >
            Limpar
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
};

// Generic table primitive. Virtualize later if a grid grows large.
export function DataTable<T>(props: IDataTableProps<T>): React.ReactElement {
  const {
    columns,
    rows,
    rowKey,
    onRowClick,
    emptyLabel,
    onVisibleCountChange,
  } = props;
  const [filters, setFilters] = React.useState<
    Record<string, IColumnFilterState>
  >({});

  // Options come from the whole data set so a column keeps its full list once filtered.
  const optionsByColumn = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    columns.forEach((c) => {
      const read = c.filterValue;
      if (!read) return;
      const unique: Record<string, true> = {};
      rows.forEach((r) => {
        unique[optionOf(read(r))] = true;
      });
      map[c.key] = Object.keys(unique).sort((a, b) =>
        a.localeCompare(b, "pt-BR", { numeric: true }),
      );
    });
    return map;
  }, [columns, rows]);

  const visibleRows = React.useMemo(
    () =>
      rows.filter((r) =>
        columns.every((c) => {
          const read = c.filterValue;
          const filter = filters[c.key];
          if (!read || !filter) return true;
          const value = optionOf(read(r));
          if (filter.selected.length > 0)
            return filter.selected.indexOf(value) >= 0;
          const needle = filter.query.trim().toLowerCase();
          return !needle || value.toLowerCase().indexOf(needle) >= 0;
        }),
      ),
    [rows, columns, filters],
  );

  React.useEffect(() => {
    if (onVisibleCountChange) onVisibleCountChange(visibleRows.length);
  }, [visibleRows.length, onVisibleCountChange]);

  const setColumnFilter = (key: string, next: IColumnFilterState): void =>
    setFilters((prev) => ({ ...prev, [key]: next }));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width, textAlign: c.align ?? "left" }}
              >
                <span
                  className={`${styles.headCell} ${
                    c.align === "right" ? styles.headCellRight : ""
                  }`}
                >
                  <span>{c.header}</span>
                  {c.filterValue && (
                    <ColumnFilter
                      header={c.header}
                      options={optionsByColumn[c.key] ?? []}
                      filter={filters[c.key] ?? EMPTY_FILTER}
                      onChange={(next) => setColumnFilter(c.key, next)}
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 ? (
            <tr>
              <td className={styles.emptyCell} colSpan={columns.length}>
                {rows.length === 0
                  ? (emptyLabel ?? "Nenhum registro.")
                  : "Nenhum registro para os filtros aplicados."}
              </td>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? styles.clickable : undefined}
                onClick={onRowClick ? (): void => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? "left" }}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
