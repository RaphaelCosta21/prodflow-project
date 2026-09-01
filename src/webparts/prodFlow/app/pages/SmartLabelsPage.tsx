import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button, Dropdown, Option } from "@fluentui/react-components";
import { Print24Regular } from "@fluentui/react-icons";
import { useFidsFull } from "../api/fids";
import { leavesOf } from "../utils/kpis";
import { fidDetailPath } from "../config/routes";
import GlassCard from "../components/common/GlassCard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import styles from "./SmartLabelsPage.module.scss";

interface ILabel {
  id: string;
  pn: string;
  descricao: string;
  fid: string;
  serial?: string;
  url: string;
}

export const SmartLabelsPage: React.FC = () => {
  const { data, isLoading } = useFidsFull();
  const requests = React.useMemo(() => data ?? [], [data]);
  const [fid, setFid] = React.useState<string>("");

  // The QR points at the FID page so a phone scan lands on the live record.
  const baseUrl = `${window.location.origin}${window.location.pathname}#`;

  const labels: ILabel[] = React.useMemo(() => {
    const selected = fid ? requests.filter((r) => r.fid === fid) : requests;
    const out: ILabel[] = [];
    for (const r of selected) {
      for (const s of leavesOf(r.subItems)) {
        out.push({
          id: `${r.fid}-${s.id}`,
          pn: s.pn,
          descricao: s.descricao,
          fid: r.fid,
          serial: s.serialNumber,
          url: `${baseUrl}${fidDetailPath(r.fid)}`,
        });
      }
    }
    return out;
  }, [requests, fid, baseUrl]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Smart Labels</h1>
        <span className={styles.phase}>QR</span>
      </div>

      <GlassCard
        title="Etiquetas por sub-item"
        subtitle="SN = nº da WO · o QR abre a página do FID"
        actions={
          <div className={styles.toolbar}>
            <Dropdown
              size="small"
              placeholder="Todos os FIDs"
              value={fid || "Todos os FIDs"}
              selectedOptions={fid ? [fid] : []}
              onOptionSelect={(_, d) => setFid(d.optionValue ?? "")}
            >
              <Option value="">Todos os FIDs</Option>
              {requests.map((r) => (
                <Option key={r.fid} value={r.fid}>
                  {r.fid}
                </Option>
              ))}
            </Dropdown>
            <Button
              size="small"
              icon={<Print24Regular />}
              onClick={() => window.print()}
              disabled={labels.length === 0}
            >
              Imprimir
            </Button>
          </div>
        }
      >
        {labels.length === 0 ? (
          <EmptyState
            title="Sem etiquetas"
            description="Importe a BOM de um FID para gerar as etiquetas."
          />
        ) : (
          <div className={styles.sheet}>
            {labels.map((l) => (
              <div key={l.id} className={styles.label}>
                <QRCodeCanvas value={l.url} size={92} level="M" />
                <div className={styles.info}>
                  <div className={styles.pn}>{l.pn}</div>
                  <div className={styles.desc}>{l.descricao}</div>
                  <div className={styles.meta}>
                    <span>{l.fid}</span>
                    {l.serial && <span>SN {l.serial}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default SmartLabelsPage;
