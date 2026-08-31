import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@fluentui/react-components";
import { Add24Regular } from "@fluentui/react-icons";
import { IFabricationRequestHeader } from "../models";
import { useFids } from "../api/fids";
import GlassCard from "../components/common/GlassCard";
import DataTable, { IDataTableColumn } from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import PhaseBadge from "../components/common/PhaseBadge";
import EmptyState from "../components/common/EmptyState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import CreateFidDialog from "../components/budgeting/CreateFidDialog";
import { fidDetailPath } from "../config/routes";
import styles from "./RequestsPage.module.scss";

export const RequestsPage: React.FC = () => {
  const { data, isLoading, isError, error } = useFids();
  const [createOpen, setCreateOpen] = React.useState(false);
  const navigate = useNavigate();

  const columns: IDataTableColumn<IFabricationRequestHeader>[] = [
    {
      key: "fid",
      header: "FID",
      render: (r) => <span className={styles.fid}>{r.fid}</span>,
    },
    { key: "os", header: "OS", render: (r) => r.osNumber },
    {
      key: "phase",
      header: "Fase",
      render: (r) => <PhaseBadge phase={r.phase} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge kind="request" status={r.status} />,
    },
    { key: "year", header: "Ano", render: (r) => r.year, align: "right" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Requests (FIDs)</h1>
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => setCreateOpen(true)}
        >
          Novo FID
        </Button>
      </div>
      <GlassCard noBodyPadding>
        {isLoading ? (
          <SkeletonLoader rows={6} />
        ) : isError ? (
          <EmptyState
            title="Erro ao carregar FIDs"
            description={String(error)}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={data ?? []}
            rowKey={(r) => r.fid}
            onRowClick={(r) => navigate(fidDetailPath(r.fid))}
            emptyLabel="Nenhum FID ainda. Crie o primeiro a partir de uma OS."
          />
        )}
      </GlassCard>
      <CreateFidDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default RequestsPage;
