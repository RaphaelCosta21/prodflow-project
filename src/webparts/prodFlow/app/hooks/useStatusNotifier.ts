import * as React from "react";
import { RequestStatus } from "../models";
import { NotificationType } from "../models/notification";
import { NotificationService } from "../services/NotificationService";
import { useMembers, useAppConfig } from "../api/config";

const STATUS_EVENT: { [k: string]: NotificationType } = {
  Submitted: "BudgetSubmitted",
  Approved: "BudgetApproved",
  Rejected: "BudgetRejected",
  ReleasedForProduction: "ReleasedForProduction",
  Completed: "FidCompleted",
};

export interface IStatusNotifier {
  notifyStatus: (
    fid: string,
    to: RequestStatus,
    message: string,
  ) => Promise<void>;
}

// Enqueues a Power Automate notification for the transitions that matter (§F).
export function useStatusNotifier(): IStatusNotifier {
  const { data: membersData } = useMembers();
  const { data: config } = useAppConfig();

  return React.useMemo<IStatusNotifier>(
    () => ({
      notifyStatus: async (fid, to, message) => {
        const type = STATUS_EVENT[to];
        if (!type) return;
        const recipients = NotificationService.resolveRecipients(
          type,
          membersData?.members ?? [],
          config,
        );
        if (recipients.length === 0) return;
        await NotificationService.enqueue({
          type,
          recipients,
          payload: { fid, message },
        });
      },
    }),
    [membersData, config],
  );
}

export default useStatusNotifier;
