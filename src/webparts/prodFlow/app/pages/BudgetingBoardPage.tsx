import * as React from "react";
import { RequestStatus } from "../models";
import { useFidsFull } from "../api/fids";
import KanbanBoard from "../components/board/KanbanBoard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import GlassCard from "../components/common/GlassCard";
import styles from "./BoardPage.module.scss";

// Union of both workflows: each card only ever lands on its own release column.
const PHASE1_COLUMNS: RequestStatus[] = [
  "InDelineation",
  "Submitted",
  "Approved",
  "Rejected",
  "ReleasedForFabrication",
  "ReleasedForProcurement",
];

export const BudgetingBoardPage: React.FC = () => {
  const { data, isLoading, isError } = useFidsFull();
  const requests = (data ?? []).filter(
    (r) => PHASE1_COLUMNS.indexOf(r.status) >= 0,
  );

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Budgeting Board</h1>
        <span className={styles.phase}>Fase 1</span>
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
            title="Nenhum FID na Fase 1"
            description="Crie um FID em Budgeting › Requests."
          />
        </GlassCard>
      ) : (
        <KanbanBoard requests={requests} columns={PHASE1_COLUMNS} />
      )}
    </div>
  );
};

export default BudgetingBoardPage;
