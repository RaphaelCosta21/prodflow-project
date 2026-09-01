import * as React from "react";
import { Dismiss16Regular } from "@fluentui/react-icons";
import { IToast, useUIStore } from "../../stores/useUIStore";
import styles from "./ToastContainer.module.scss";

const AUTO_DISMISS_MS = 4500;

const ToastItem: React.FC<{ toast: IToast }> = ({ toast }) => {
  const removeToast = useUIStore((s) => s.removeToast);

  React.useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <div className={`${styles.toast} ${styles[toast.intent]}`}>
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        className={styles.close}
        aria-label="Fechar"
        onClick={() => removeToast(toast.id)}
      >
        <Dismiss16Regular />
      </button>
    </div>
  );
};

// Renders the useUIStore toast queue — without this every addToast() call is silent.
export const ToastContainer: React.FC = () => {
  const toasts = useUIStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
};

export default ToastContainer;
