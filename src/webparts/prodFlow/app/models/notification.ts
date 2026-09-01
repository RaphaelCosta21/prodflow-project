// Queue consumed by Power Automate (list prodflow-notifications).
export type NotificationType =
  | "BudgetSubmitted"
  | "BudgetApproved"
  | "BudgetRejected"
  | "SlaOverdue"
  | "ReleasedForProduction"
  | "SubItemCompleted"
  | "FidCompleted";

export type NotificationStatus = "Pending" | "Sent" | "Failed";

export interface INotification {
  id?: number;
  type: NotificationType;
  recipients: string[]; // e-mails
  payload: {
    fid?: string;
    subItemId?: string;
    message: string;
    [key: string]: unknown;
  };
  status: NotificationStatus;
  created?: string;
}
