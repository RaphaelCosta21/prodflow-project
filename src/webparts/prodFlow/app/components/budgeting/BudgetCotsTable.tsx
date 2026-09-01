import * as React from "react";
import { Input, Button } from "@fluentui/react-components";
import { Add16Regular, Delete16Regular } from "@fluentui/react-icons";
import { IBudgetTable3Line } from "../../models";
import { BUDGET_TEMPLATE } from "../../config/budgetTemplateMap";
import styles from "./BudgetCotsTable.module.scss";

export interface IBudgetCotsTableProps {
  lines: IBudgetTable3Line[];
  onChange: (lines: IBudgetTable3Line[]) => void;
  disabled?: boolean;
}

const MAX_ROWS =
  BUDGET_TEMPLATE.cots.endRow - BUDGET_TEMPLATE.cots.startRow + 1;

export const BudgetCotsTable: React.FC<IBudgetCotsTableProps> = ({
  lines,
  onChange,
  disabled,
}) => {
  const update = (i: number, patch: Partial<IBudgetTable3Line>): void =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const add = (): void =>
    onChange([...lines, { categoria: "", valor: 0, obs: "" }]);

  const remove = (i: number): void =>
    onChange(lines.filter((_, idx) => idx !== i));

  return (
    <div className={styles.table}>
      <div className={`${styles.headerRow} ${styles.grid}`}>
        <span>Categoria</span>
        <span>Valor (R$)</span>
        <span>Obs</span>
        <span />
      </div>
      {lines.length === 0 && (
        <div className={styles.empty}>
          Nenhum item COTS. Adicione se houver.
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} className={`${styles.row} ${styles.grid}`}>
          <Input
            size="small"
            appearance="filled-darker"
            disabled={disabled}
            value={line.categoria}
            onChange={(_, d) => update(i, { categoria: d.value })}
          />
          <Input
            size="small"
            type="number"
            min={0}
            appearance="filled-darker"
            disabled={disabled}
            value={line.valor ? String(line.valor) : ""}
            onChange={(_, d) =>
              update(i, {
                valor:
                  d.value === ""
                    ? 0
                    : Math.max(0, Number(d.value.replace(",", "."))),
              })
            }
          />
          <Input
            size="small"
            appearance="filled-darker"
            disabled={disabled}
            value={line.obs ?? ""}
            onChange={(_, d) => update(i, { obs: d.value })}
          />
          <Button
            size="small"
            appearance="subtle"
            icon={<Delete16Regular />}
            disabled={disabled}
            aria-label="Remover"
            onClick={() => remove(i)}
          />
        </div>
      ))}
      <div className={styles.footer}>
        <Button
          size="small"
          appearance="subtle"
          icon={<Add16Regular />}
          disabled={disabled || lines.length >= MAX_ROWS}
          onClick={add}
        >
          Adicionar item
        </Button>
      </div>
    </div>
  );
};

export default BudgetCotsTable;
