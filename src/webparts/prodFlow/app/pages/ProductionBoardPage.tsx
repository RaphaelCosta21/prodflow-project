import * as React from "react";
import { Tab, TabList } from "@fluentui/react-components";
import { RequestStatus, WorkflowKind } from "../models";
import { useFidsFull } from "../api/fids";
import { workflowOf } from "../config/workflows";
import { phaseDef } from "../config/phases";
import KanbanBoard from "../components/board/KanbanBoard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import GlassCard from "../components/common/GlassCard";
import styles from "./BoardPage.module.scss";

// The two phase-2 tracks are disjoint, so the board shows one workflow at a time.
const COLUMNS_BY_FLOW: Record<WorkflowKind, RequestStatus[]> = {
  fabrication: [
    "ReleasedForFabrication",
    "InFabrication",
    "ExternalService",
    "Delivered",
  ],
  parts: [
    "ReleasedForProcurement",
    "InProcurement",
    "ExternalService",
    "Delivered",
  ],
};

export const ProductionBoardPage: React.FC = () => {
  const { data, isLoading, isError } = useFidsFull();
  const [flow, setFlow] = React.useState<WorkflowKind>("fabrication");
  const columns = COLUMNS_BY_FLOW[flow];
  const requests = (data ?? []).filter(
    (r) =>
      workflowOf(r.tipoOrcamento) === flow && columns.indexOf(r.status) >= 0,
  );

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Production Board</h1>
        <span className={styles.phase}>{phaseDef(flow, 2).label}</span>
      </div>
      <TabList
        selectedValue={flow}
        onTabSelect={(_, d) => setFlow(d.value as WorkflowKind)}
      >
        <Tab value="fabrication">Fabricação</Tab>
        <Tab value="parts">Partes e Peças</Tab>
      </TabList>
      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : isError ? (
        <GlassCard>
          <EmptyState
            title="Falha ao carregar"
            description="Provisione as listas em Admin › Configuration."
          />
        </GlassCard>
      ) : requests.length === 0 ? (
        <GlassCard>
          <EmptyState
            title="Nenhum FID liberado"
            description="Os FIDs aparecem aqui após a aprovação da Petrobras."
          />
        </GlassCard>
      ) : (
        <KanbanBoard requests={requests} columns={columns} />
      )}
    </div>
  );
};

export default ProductionBoardPage;
