import * as React from "react";
import { Input } from "@fluentui/react-components";
import { IBudgetLine } from "../../models";
import { BudgetService } from "../../services/BudgetService";
import styles from "./BudgetLinesTable.module.scss";

export type BudgetTableMode = "materials" | "labor" | "services";

export interface IBudgetLinesTableProps {
  mode: BudgetTableMode;
  lines: IBudgetLine[];
  onChange: (lines: IBudgetLine[]) => void;
  disabled?: boolean;
}

const pesoFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 6,
  maximumFractionDigits: 6,
});

const HEADERS: Record<BudgetTableMode, string[]> = {
  materials: ["Descrição", "UN", "QTD.", "Peso", "Peso Total"],
  labor: ["Serviço", "Complexidade", "Qtd. (HH)", "Peso", "Peso Total"],
  services: ["Serviço", "Critério", "QTD", "Peso", "Peso Total"],
};

export const BudgetLinesTable: React.FC<IBudgetLinesTableProps> = ({
  mode,
  lines,
  onChange,
  disabled,
}) => {
  const setQtd = (index: number, raw: string): void => {
    const value = raw === "" ? 0 : Math.max(0, Number(raw.replace(",", ".")));
    if (Number.isNaN(value)) return;
    const next = lines.map((line, i) =>
      i === index
        ? { ...line, qtd: value, pesoTotal: value * (line.peso || 0) }
        : line,
    );
    onChange(next);
  };

  const gridClass = styles[mode];

  return (
    <div className={styles.table}>
      <div className={`${styles.headerRow} ${gridClass}`}>
        {HEADERS[mode].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {lines.map((line, i) => {
        const isNewCategory =
          mode === "materials" &&
          (i === 0 || line.categoria !== lines[i - 1].categoria);
        const pesoTotal = BudgetService.computePesoTotal(line);
        return (
          <React.Fragment key={line.key ?? `${line.descricao}-${i}`}>
            {isNewCategory && (
              <div className={styles.categoryRow}>{line.categoria}</div>
            )}
            <div className={`${styles.row} ${gridClass}`}>
              <span className={styles.desc} title={line.descricao}>
                {mode === "labor" ? line.categoria : line.descricao}
              </span>
              <span className={styles.mid}>
                {mode === "materials"
                  ? line.criterio
                  : mode === "labor"
                    ? (line.complexidade ?? "—")
                    : line.criterio}
              </span>
              <span className={styles.input}>
                <Input
                  size="small"
                  type="number"
                  min={0}
                  appearance="filled-darker"
                  disabled={disabled}
                  value={line.qtd ? String(line.qtd) : ""}
                  onChange={(_, d) => setQtd(i, d.value)}
                />
              </span>
              <span className={styles.peso}>
                {pesoFmt.format(line.peso || 0)}
              </span>
              <span className={styles.pesoTotal}>
                {pesoTotal ? pesoFmt.format(pesoTotal) : "—"}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default BudgetLinesTable;
