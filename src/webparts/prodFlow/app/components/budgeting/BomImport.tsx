import * as React from "react";
import { Button } from "@fluentui/react-components";
import {
  ArrowUpload24Regular,
  AddCircle24Regular,
} from "@fluentui/react-icons";
import { SubItemAttendance } from "../../models";
import { BomImportService } from "../../services/BomImportService";
import { useImportBom } from "../../api/fids";
import { useUIStore } from "../../stores/useUIStore";
import styles from "./BomImport.module.scss";

export interface IBomImportProps {
  fid: string;
  attendance: SubItemAttendance;
  canEdit?: boolean;
  /** Adds a blank root BOM line inline (dynamic building). */
  onAddItem?: () => void;
}

// Uploads a BOM CSV, or lets the user start building the BOM by hand (via onAddItem).
export const BomImport: React.FC<IBomImportProps> = ({
  fid,
  attendance,
  canEdit = true,
  onAddItem,
}) => {
  const importBom = useImportBom(fid);
  const addToast = useUIStore((s) => s.addToast);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (): void => {
      try {
        const parsed = BomImportService.fromCsv(
          String(reader.result ?? ""),
          attendance,
        );
        importBom.mutate(parsed, {
          onSuccess: () =>
            addToast(`${parsed.length} linhas da BOM importadas.`, "success"),
          onError: (e) =>
            addToast(`Erro ao importar BOM: ${String(e)}`, "error"),
        });
      } catch (e) {
        addToast(`CSV inválido: ${String(e)}`, "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={styles.import}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        className={styles.hidden}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <Button
        appearance="primary"
        icon={<ArrowUpload24Regular />}
        onClick={() => inputRef.current?.click()}
        disabled={!canEdit || importBom.isLoading}
      >
        Importar BOM (CSV)
      </Button>
      {onAddItem && (
        <Button
          appearance="secondary"
          icon={<AddCircle24Regular />}
          disabled={!canEdit}
          onClick={onAddItem}
        >
          Adicionar item
        </Button>
      )}
    </div>
  );
};

export default BomImport;
