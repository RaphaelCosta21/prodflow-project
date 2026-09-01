import * as React from "react";
import { RequestStatus } from "../models";
import { useFidsFull } from "../api/fids";
import KanbanBoard from "../components/board/KanbanBoard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import GlassCard from "../components/common/GlassCard";
import styles from "./BoardPage.module.scss";

const PHASE2_COLUMNS: RequestStatus[] = [
  "Approved",
  "ReleasedForProduction",
  "InProduction",
  "FinalInspection",
  "Delivered",
  "Completed",
];

export const ProductionBoardPage: React.FC = () => {
  const { data, isLoading, isError } = useFidsFull();
  const requests = (data ?? []).filter(
    (r) => PHASE2_COLUMNS.indexOf(r.status) >= 0,
  );

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Production Board</h1>
        <span className={styles.phase}>Fase 2</span>
      </div>
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
        <KanbanBoard requests={requests} columns={PHASE2_COLUMNS} />
      )}
    </div>
  );
};

export default ProductionBoardPage;
