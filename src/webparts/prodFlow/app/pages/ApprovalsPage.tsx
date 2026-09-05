import * as React from "react";
import { Button } from "@fluentui/react-components";
import {
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  Send20Regular,
  ArrowUndo20Regular,
} from "@fluentui/react-icons";
import { IFabricationRequest, RequestStatus } from "../models";
import { useFidsFull, useMoveFidStatus } from "../api/fids";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useStatusNotifier } from "../hooks/useStatusNotifier";
import { useAccessLevel } from "../hooks/useAccessLevel";
import { useUIStore } from "../stores/useUIStore";
import { REQUEST_STATUS_MAP } from "../config/statuses";
import { canTransition } from "../utils/statusHelpers";
import { formatCurrencyBRL, formatDate } from "../utils/formatters";
import { isBudgetOverdue } from "../utils/kpis";
import GlassCard from "../components/common/GlassCard";
import EmptyState from "../components/common/EmptyState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import StatusBadge from "../components/common/StatusBadge";
import FidLink from "../components/common/FidLink";
import styles from "./ApprovalsPage.module.scss";

const PENDING: RequestStatus[] = ["BudgetReview", "Submitted", "Rejected"];

export const ApprovalsPage: React.FC = () => {
  const { data, isLoading, isError } = useFidsFull();
  const move = useMoveFidStatus();
  const user = useCurrentUser();
  const access = useAccessLevel();
  const addToast = useUIStore((s) => s.addToast);
  const { notifyStatus } = useStatusNotifier();

  const rows = React.useMemo(
    () => (data ?? []).filter((r) => PENDING.indexOf(r.status) >= 0),
    [data],
  );

  const go = (r: IFabricationRequest, to: RequestStatus): void =>
    move.mutate(
      { fid: r.fid, to, by: user.displayName },
      {
        onSuccess: () => {
          addToast(`${r.fid} → ${REQUEST_STATUS_MAP[to].label}.`, "success");
          notifyStatus(
            r.fid,
            to,
            `${r.fid}: ${REQUEST_STATUS_MAP[to].label}`,
          ).catch(() => undefined);
        },
        onError: (e) =>
          addToast((e as Error).message || "Falha na transição.", "error"),
      },
    );

  const canAct = access.can("budgeting");

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Aprovações (Petrobras)</h1>
        <span className={styles.phase}>Fase 1</span>
        <span className={styles.count}>{rows.length} pendentes</span>
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
      ) : rows.length === 0 ? (
        <GlassCard>
          <EmptyState
            title="Nada pendente"
            description="Nenhum FID aguardando envio ou decisão da Petrobras."
          />
        </GlassCard>
      ) : (
        <GlassCard noBodyPadding>
          <div className={styles.table}>
            <div className={styles.headerRow}>
              <span>FID</span>
              <span>OS</span>
              <span>Descrição</span>
              <span className={styles.right}>Orçamento</span>
              <span>Prazo de envio</span>
              <span>Status</span>
              <span>Ações</span>
            </div>
            {rows.map((r) => {
              const overdue = isBudgetOverdue(r);
              return (
                <div key={r.fid} className={styles.row}>
                  <FidLink fid={r.fid} />
                  <span>{r.osNumber}</span>
                  <span className={styles.desc}>{r.descricao}</span>
                  <span className={styles.right}>
                    {formatCurrencyBRL(r.financials.orcamentoOceaneering)}
                  </span>
                  <span className={overdue ? styles.overdue : undefined}>
                    {formatDate(r.dates.prazoEnvioPetrobras)}
                    {overdue ? " · atrasado" : ""}
                  </span>
                  <StatusBadge kind="request" status={r.status} />
                  <div className={styles.actions}>
                    {canTransition(r.status, "Submitted") && (
                      <Button
                        size="small"
                        appearance="primary"
                        icon={<Send20Regular />}
                        disabled={!canAct}
                        onClick={() => go(r, "Submitted")}
                      >
                        Enviar
                      </Button>
                    )}
                    {r.status === "Submitted" && (
                      <>
                        <Button
                          size="small"
                          appearance="primary"
                          icon={<CheckmarkCircle20Regular />}
                          disabled={!canAct}
                          onClick={() => go(r, "Approved")}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="small"
                          icon={<DismissCircle20Regular />}
                          disabled={!canAct}
                          onClick={() => go(r, "Rejected")}
                        >
                          Reprovar
                        </Button>
                      </>
                    )}
                    {r.status === "Rejected" && (
                      <Button
                        size="small"
                        icon={<ArrowUndo20Regular />}
                        disabled={!canAct}
                        onClick={() => go(r, "Budgeting")}
                      >
                        Revisar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default ApprovalsPage;
