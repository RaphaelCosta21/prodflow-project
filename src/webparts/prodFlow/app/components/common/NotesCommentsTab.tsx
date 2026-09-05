import * as React from "react";
import { Button, Textarea } from "@fluentui/react-components";
import { Save20Regular, Send20Regular } from "@fluentui/react-icons";
import { IFabricationRequest } from "../../models";
import { useAddComment, useSaveNotes } from "../../api/fids";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useUIStore } from "../../stores/useUIStore";
import { formatDateTime } from "../../utils/formatters";
import GlassCard from "./GlassCard";
import EmptyState from "./EmptyState";
import UserAvatar from "./UserAvatar";
import styles from "./NotesCommentsTab.module.scss";

export interface INotesCommentsTabProps {
  fid: string;
  data: IFabricationRequest;
}

const SECTIONS = [
  { key: "general", label: "Premissas gerais" },
  { key: "budgeting", label: "Notas de orçamentação" },
  { key: "production", label: "Notas de produção" },
];

export const NotesCommentsTab: React.FC<INotesCommentsTabProps> = ({
  fid,
  data,
}) => {
  const user = useCurrentUser();
  const addToast = useUIStore((s) => s.addToast);
  const saveNotes = useSaveNotes(fid);
  const addComment = useAddComment(fid);

  const [drafts, setDrafts] = React.useState<Record<string, string>>(
    () => data.notes ?? {},
  );
  const [comment, setComment] = React.useState("");
  const savedRef = React.useRef(data.notes);

  // Only adopt server notes when they actually changed, so a refetch can't wipe unsaved edits.
  React.useEffect(() => {
    if (savedRef.current !== data.notes) {
      savedRef.current = data.notes;
      setDrafts(data.notes ?? {});
    }
  }, [data.notes]);

  const comments = React.useMemo(
    () => [...(data.comments ?? [])].sort((a, b) => b.ts.localeCompare(a.ts)),
    [data.comments],
  );

  const persist = (section: string): void =>
    saveNotes.mutate(
      { section, text: drafts[section] ?? "" },
      { onSuccess: () => addToast("Notas salvas.", "success") },
    );

  const send = (): void => {
    if (!comment.trim()) return;
    addComment.mutate(
      {
        text: comment.trim(),
        author: { name: user.displayName, email: user.email },
      },
      { onSuccess: () => setComment("") },
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.notesGrid}>
        {SECTIONS.map((s) => (
          <GlassCard
            key={s.key}
            title={s.label}
            actions={
              <Button
                size="small"
                icon={<Save20Regular />}
                disabled={
                  (drafts[s.key] ?? "") === ((data.notes ?? {})[s.key] ?? "") ||
                  saveNotes.isLoading
                }
                onClick={() => persist(s.key)}
              >
                Salvar
              </Button>
            }
          >
            <Textarea
              className={styles.notesArea}
              resize="vertical"
              placeholder="Escreva aqui…"
              value={drafts[s.key] ?? ""}
              onChange={(_, d) =>
                setDrafts((n) => ({ ...n, [s.key]: d.value }))
              }
            />
          </GlassCard>
        ))}
      </div>

      <GlassCard
        title="Comentários"
        subtitle={`${comments.length} comentário(s)`}
      >
        <div className={styles.composer}>
          <Textarea
            className={styles.composerArea}
            resize="vertical"
            placeholder="Comente algo sobre este FID…"
            value={comment}
            onChange={(_, d) => setComment(d.value)}
          />
          <Button
            appearance="primary"
            icon={<Send20Regular />}
            disabled={!comment.trim() || addComment.isLoading}
            onClick={send}
          >
            Enviar
          </Button>
        </div>

        {comments.length === 0 ? (
          <EmptyState
            title="Nenhum comentário"
            description="Use os comentários para alinhar decisões entre os times."
          />
        ) : (
          <ul className={styles.thread}>
            {comments.map((c) => (
              <li key={c.id} className={styles.comment}>
                <UserAvatar name={c.author.name} email={c.author.email} />
                <div className={styles.commentBody}>
                  <div className={styles.commentHead}>
                    <span className={styles.author}>{c.author.name}</span>
                    <span className={styles.ts}>{formatDateTime(c.ts)}</span>
                  </div>
                  <p className={styles.text}>{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
};

export default NotesCommentsTab;
