import * as React from "react";
import { Button } from "@fluentui/react-components";
import { ArrowUpload24Regular } from "@fluentui/react-icons";
import { Attendance } from "../../models";
import { BomImportService } from "../../services/BomImportService";
import { useImportBom } from "../../api/fids";
import { useUIStore } from "../../stores/useUIStore";
import styles from "./BomImport.module.scss";

export interface IBomImportProps {
  fid: string;
  attendance: Attendance;
}

// Uploads a Windchill CSV, parses it locally, then persists the sub-items as one section update.
export const BomImport: React.FC<IBomImportProps> = ({ fid, attendance }) => {
  const importBom = useImportBom(fid);
  const addToast = useUIStore((s) => s.addToast);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (): void => {
      try {
        const subItems = BomImportService.fromCsv(
          String(reader.result ?? ""),
          attendance,
        );
        importBom.mutate(subItems, {
          onSuccess: () =>
            addToast(`${subItems.length} linhas da BOM importadas.`, "success"),
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
        disabled={importBom.isLoading}
      >
        Importar BOM (CSV)
      </Button>
    </div>
  );
};

export default BomImport;
