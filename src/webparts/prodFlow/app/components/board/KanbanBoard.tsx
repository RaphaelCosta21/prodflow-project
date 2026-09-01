import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { IFabricationRequest, RequestStatus } from "../../models";
import { REQUEST_STATUS_MAP } from "../../config/statuses";
import { canTransition } from "../../utils/statusHelpers";
import { useMoveFidStatus } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import { fidDetailPath } from "../../config/routes";
import { formatCurrencyBRL } from "../../utils/formatters";
import styles from "./KanbanBoard.module.scss";

export interface IKanbanBoardProps {
  requests: IFabricationRequest[];
  columns: RequestStatus[];
}

interface ICardProps {
  request: IFabricationRequest;
  onOpen: (fid: string) => void;
}

const Card: React.FC<ICardProps> = ({ request, onOpen }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: request.fid,
    data: { status: request.status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.card} ${isDragging ? styles.dragging : ""}`}
      style={{ borderLeftColor: REQUEST_STATUS_MAP[request.status].color }}
      {...listeners}
      {...attributes}
    >
      <button
        type="button"
        className={styles.cardFid}
        onClick={() => onOpen(request.fid)}
      >
        {request.fid}
      </button>
      <div className={styles.cardDesc}>{request.descricao}</div>
      <div className={styles.cardMeta}>
        <span>OS {request.osNumber}</span>
        <span>
          {formatCurrencyBRL(request.financials.orcamentoOceaneering)}
        </span>
      </div>
    </div>
  );
};

const Column: React.FC<{
  status: RequestStatus;
  requests: IFabricationRequest[];
  activeStatus?: RequestStatus;
  onOpen: (fid: string) => void;
}> = ({ status, requests, activeStatus, onOpen }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const def = REQUEST_STATUS_MAP[status];
  const allowed =
    activeStatus === undefined ||
    activeStatus === status ||
    canTransition(activeStatus, status);

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.column,
        isOver && allowed ? styles.over : "",
        activeStatus && !allowed ? styles.blocked : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.columnHead}>
        <span className={styles.dot} style={{ background: def.color }} />
        <span className={styles.columnTitle}>{def.label}</span>
        <span className={styles.count}>{requests.length}</span>
      </div>
      <div className={styles.cards}>
        {requests.map((r) => (
          <Card key={r.fid} request={r} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<IKanbanBoardProps> = ({
  requests,
  columns,
}) => {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const move = useMoveFidStatus();
  const [activeFid, setActiveFid] = React.useState<string | undefined>();
  // A small distance keeps the card's "open" click working alongside dragging.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const active = requests.filter((r) => r.fid === activeFid)[0];

  const onDragStart = (e: DragStartEvent): void =>
    setActiveFid(String(e.active.id));

  const onDragEnd = (e: DragEndEvent): void => {
    setActiveFid(undefined);
    if (!e.over) return;
    const fid = String(e.active.id);
    const to = String(e.over.id) as RequestStatus;
    const current = requests.filter((r) => r.fid === fid)[0];
    if (!current || current.status === to) return;
    if (!canTransition(current.status, to)) {
      addToast(
        `Transição inválida: ${REQUEST_STATUS_MAP[current.status].label} → ${REQUEST_STATUS_MAP[to].label}.`,
        "warning",
      );
      return;
    }
    move.mutate(
      { fid, to, by: user.displayName },
      {
        onSuccess: () =>
          addToast(`${fid} → ${REQUEST_STATUS_MAP[to].label}.`, "success"),
        onError: (err) =>
          addToast((err as Error).message || "Falha ao mover.", "error"),
      },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveFid(undefined)}
    >
      <div className={styles.board}>
        {columns.map((status) => (
          <Column
            key={status}
            status={status}
            activeStatus={active?.status}
            requests={requests.filter((r) => r.status === status)}
            onOpen={(fid) => navigate(fidDetailPath(fid))}
          />
        ))}
      </div>
      <DragOverlay>
        {active && (
          <div className={`${styles.card} ${styles.overlay}`}>
            <span className={styles.cardFid}>{active.fid}</span>
            <div className={styles.cardDesc}>{active.descricao}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
