import * as React from "react";
import { INotification } from "../models/notification";
import { useNotifications } from "../api/notifications";
import { NOTIFICATION_EVENTS } from "../config/appConfigDefaults";
import { formatDateTime } from "../utils/formatters";
import GlassCard from "../components/common/GlassCard";
import EmptyState from "../components/common/EmptyState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import FilterPanel from "../components/common/FilterPanel";
import styles from "./NotificationsPage.module.scss";

const eventLabel = (type: string): string =>
  NOTIFICATION_EVENTS.filter((e) => e.key === type)[0]?.label ?? type;

const STATUS_CLASS: { [k: string]: string } = {
  Pending: styles.pending,
  Sent: styles.sent,
  Failed: styles.failed,
};

export const NotificationsPage: React.FC = () => {
  const { data, isLoading, isError } = useNotifications();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const rows = React.useMemo(() => {
    let list: INotification[] = data ?? [];
    if (status !== "all") list = list.filter((n) => n.status === status);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          eventLabel(n.type).toLowerCase().indexOf(q) >= 0 ||
          (n.payload.fid ?? "").toLowerCase().indexOf(q) >= 0 ||
          (n.payload.message ?? "").toLowerCase().indexOf(q) >= 0,
      );
    }
    return list;
  }, [data, search, status]);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Notifications</h1>
        <span className={styles.count}>{rows.length} eventos</span>
      </div>

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por evento, FID ou mensagem..."
        groups={[
          {
            key: "status",
            allLabel: "Todos",
            selected: status,
            onSelect: setStatus,
            options: [
              { key: "Pending", label: "Pendentes" },
              { key: "Sent", label: "Enviados" },
              { key: "Failed", label: "Falhas" },
            ],
          },
        ]}
      />

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : isError ? (
        <GlassCard>
          <EmptyState
            title="Falha ao carregar"
            description="Provisione as listas em Admin › Configuration."
          />
        </GlassCard>
      ) : rows.length === 0 ? (
        <GlassCard>
          <EmptyState
            title="Nenhuma notificação"
            description="A fila é alimentada pelas transições de status e consumida pelo Power Automate."
          />
        </GlassCard>
      ) : (
        <GlassCard noBodyPadding>
          <div className={styles.table}>
            <div className={styles.headerRow}>
              <span>Evento</span>
              <span>FID</span>
              <span>Mensagem</span>
              <span>Destinatários</span>
              <span>Status</span>
              <span>Criado</span>
            </div>
            {rows.map((n) => (
              <div key={n.id} className={styles.row}>
                <span className={styles.event}>{eventLabel(n.type)}</span>
                <span>{n.payload.fid ?? "—"}</span>
                <span className={styles.message}>{n.payload.message}</span>
                <span className={styles.recipients}>
                  {n.recipients.length} destinatário
                  {n.recipients.length === 1 ? "" : "s"}
                </span>
                <span
                  className={`${styles.status} ${STATUS_CLASS[n.status] ?? ""}`}
                >
                  {n.status}
                </span>
                <span>{formatDateTime(n.created)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default NotificationsPage;
