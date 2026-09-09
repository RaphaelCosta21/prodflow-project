import * as React from "react";
import { Input, Button, Checkbox } from "@fluentui/react-components";
import { Add16Regular, Delete16Regular } from "@fluentui/react-icons";
import { IFabricationRequest, IMaterialCert, ISubItem } from "../../models";
import { useUpdateSubItem } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import EmptyState from "../common/EmptyState";
import GlassCard from "../common/GlassCard";
import StatusBadge from "../common/StatusBadge";
import styles from "./QualityTab.module.scss";

interface IRowProps {
  fid: string;
  subItem: ISubItem;
}

const QualityRow: React.FC<IRowProps> = ({ fid, subItem }) => {
  const user = useCurrentUser();
  const update = useUpdateSubItem(fid);
  const certificates = subItem.certificates ?? [];

  const commit = (changes: Partial<ISubItem>): void =>
    update.mutate({ subItemId: subItem.id, changes, by: user.displayName });

  const setCerts = (next: IMaterialCert[]): void =>
    commit({ certificates: next });

  const inspection = (subItem.fabChecklist ?? []).filter(
    (s) => s.key === "inspecao",
  )[0];

  const toggleInspection = (done: boolean): void => {
    const next = (subItem.fabChecklist ?? []).map((s) =>
      s.key === "inspecao"
        ? {
            ...s,
            done,
            date: done ? new Date().toISOString() : undefined,
            by: done ? user.displayName : undefined,
          }
        : s,
    );
    commit({ fabChecklist: next });
  };

  return (
    <div className={styles.item}>
      <div className={styles.itemHead}>
        <div className={styles.identity}>
          <span className={styles.pn}>{subItem.pn}</span>
          <span className={styles.desc}>{subItem.descricao}</span>
        </div>
        <StatusBadge kind="subitem" status={subItem.status} />
      </div>

      <div className={styles.metaGrid}>
        <label className={styles.field}>
          <span>Código de qualidade</span>
          <Input
            size="small"
            value={subItem.qualityCode ?? ""}
            onChange={(_, d) => commit({ qualityCode: d.value || undefined })}
          />
        </label>
        <label className={styles.field}>
          <span>Serial Number (= nº da WO)</span>
          <Input
            size="small"
            value={subItem.serialNumber ?? ""}
            onChange={(_, d) => commit({ serialNumber: d.value || undefined })}
          />
        </label>
        <label className={styles.field}>
          <span>DOC / RSO</span>
          <Input
            size="small"
            value={subItem.docRso ?? ""}
            onChange={(_, d) => commit({ docRso: d.value || undefined })}
          />
        </label>
        <div className={styles.field}>
          <span>Inspeção</span>
          <Checkbox
            label={inspection?.done ? "Inspecionado" : "Pendente"}
            checked={!!inspection?.done}
            disabled={!inspection}
            onChange={(_, d) => toggleInspection(!!d.checked)}
          />
        </div>
      </div>

      <div className={styles.certs}>
        <div className={styles.certsHead}>
          <span>Certificados de material (rastreabilidade)</span>
          <Button
            size="small"
            appearance="subtle"
            icon={<Add16Regular />}
            onClick={() =>
              setCerts([...certificates, { heatLot: "", spec: "" }])
            }
          >
            Adicionar
          </Button>
        </div>
        {certificates.length === 0 ? (
          <div className={styles.noCerts}>Nenhum certificado registrado.</div>
        ) : (
          certificates.map((c, i) => (
            <div key={i} className={styles.certRow}>
              <Input
                size="small"
                placeholder="Heat / Lote"
                value={c.heatLot}
                onChange={(_, d) =>
                  setCerts(
                    certificates.map((x, idx) =>
                      idx === i ? { ...x, heatLot: d.value } : x,
                    ),
                  )
                }
              />
              <Input
                size="small"
                placeholder="Especificação"
                value={c.spec}
                onChange={(_, d) =>
                  setCerts(
                    certificates.map((x, idx) =>
                      idx === i ? { ...x, spec: d.value } : x,
                    ),
                  )
                }
              />
              <Input
                size="small"
                placeholder="URL do certificado"
                value={c.certUrl ?? ""}
                onChange={(_, d) =>
                  setCerts(
                    certificates.map((x, idx) =>
                      idx === i ? { ...x, certUrl: d.value || undefined } : x,
                    ),
                  )
                }
              />
              <Button
                size="small"
                appearance="subtle"
                icon={<Delete16Regular />}
                aria-label="Remover"
                onClick={() =>
                  setCerts(certificates.filter((_, idx) => idx !== i))
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export interface IQualityTabProps {
  fid: string;
  data: IFabricationRequest;
}

export const QualityTab: React.FC<IQualityTabProps> = ({ fid, data }) => {
  const leaves = React.useMemo(() => {
    const parents: { [id: string]: true } = {};
    for (const s of data.subItems) if (s.parentId) parents[s.parentId] = true;
    return data.subItems.filter((s) => !parents[s.id]);
  }, [data.subItems]);

  if (leaves.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          title="Sem sub-itens"
          description="Importe a BOM para registrar inspeções e certificados."
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard title="Qualidade & Databook">
      <div className={styles.list}>
        {leaves.map((s) => (
          <QualityRow key={s.id} fid={fid} subItem={s} />
        ))}
      </div>
    </GlassCard>
  );
};

export default QualityTab;
