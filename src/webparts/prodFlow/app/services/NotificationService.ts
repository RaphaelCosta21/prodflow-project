import { SPService } from "./SPService";
import { SP_CONFIG } from "../config/sharepoint.config";
import { IList } from "@pnp/sp/lists";
import { INotification, NotificationType } from "../models/notification";
import { ITeamMember } from "../models/member";
import { IAppConfig } from "../stores/useConfigStore";

const FIELDS = {
  type: "Type",
  recipients: "Recipients",
  payload: "Payload",
  status: "Status",
};

// Writes to the trigger queue; Power Automate picks Pending rows up and sends e-mail/Teams.
export class NotificationService {
  private static get list(): IList {
    return SPService.sp.web.lists.getByTitle(SP_CONFIG.lists.notifications);
  }

  public static async getAll(): Promise<INotification[]> {
    const items = await NotificationService.list.items
      .select(
        "Id",
        FIELDS.type,
        FIELDS.recipients,
        FIELDS.payload,
        FIELDS.status,
        "Created",
      )
      .top(500)();
    return (items as Record<string, unknown>[]).map((it) => {
      let payload: INotification["payload"] = { message: "" };
      try {
        payload = JSON.parse(String(it[FIELDS.payload] ?? "{}"));
      } catch {
        payload = { message: String(it[FIELDS.payload] ?? "") };
      }
      return {
        id: Number(it.Id),
        type: String(it[FIELDS.type] ?? "") as NotificationType,
        recipients: String(it[FIELDS.recipients] ?? "")
          .split(";")
          .filter(Boolean),
        payload,
        status: (String(it[FIELDS.status] ?? "Pending") ||
          "Pending") as INotification["status"],
        created: it.Created ? String(it.Created) : undefined,
      };
    });
  }

  public static async enqueue(
    notification: Omit<INotification, "id" | "status" | "created">,
  ): Promise<void> {
    await NotificationService.list.items.add({
      Title: notification.type,
      [FIELDS.type]: notification.type,
      [FIELDS.recipients]: notification.recipients.join(";"),
      [FIELDS.payload]: JSON.stringify(notification.payload),
      [FIELDS.status]: "Pending",
    });
  }

  // Recipients = members whose access level is subscribed to the event in the config matrix.
  public static resolveRecipients(
    type: NotificationType,
    members: ITeamMember[],
    config?: IAppConfig,
  ): string[] {
    const roles = config?.notifications?.[type];
    const active = members.filter((m) => m.isActive);
    if (!roles || roles.length === 0) {
      return active
        .filter((m) => m.accessLevel === "manager" || m.accessLevel === "admin")
        .map((m) => m.email);
    }
    return active
      .filter((m) => roles.indexOf(m.accessLevel) >= 0)
      .map((m) => m.email);
  }
}
