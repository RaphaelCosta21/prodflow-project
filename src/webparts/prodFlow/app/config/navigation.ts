import {
  Home24Regular,
  DataArea24Regular,
  Alert24Regular,
  Money24Regular,
  Board24Regular,
  Document24Regular,
  ClipboardTask24Regular,
  Cart24Regular,
  CheckmarkCircle24Regular,
  Wrench24Regular,
  Beaker24Regular,
  Box24Regular,
  Tag24Regular,
  CalendarLtr24Regular,
  Toolbox24Regular,
  Phone24Regular,
  Settings24Regular,
  People24Regular,
  type FluentIcon,
} from "@fluentui/react-icons";
import { ROUTES } from "./routes";

export interface INavItem {
  key: string;
  label: string;
  route: string;
  icon: FluentIcon;
}

export interface INavGroup {
  key: string;
  label: string;
  icon: FluentIcon;
  items: INavItem[];
}

// Collapsible sidebar structure (Overview · Budgeting · Production · Planning · Tools · Admin).
export const NAV_GROUPS: INavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    icon: Home24Regular,
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        route: ROUTES.dashboard,
        icon: DataArea24Regular,
      },
      {
        key: "notifications",
        label: "Notifications",
        route: ROUTES.notifications,
        icon: Alert24Regular,
      },
    ],
  },
  {
    key: "budgeting",
    label: "Budgeting",
    icon: Money24Regular,
    items: [
      {
        key: "budgetingBoard",
        label: "Budgeting Board",
        route: ROUTES.budgetingBoard,
        icon: Board24Regular,
      },
      {
        key: "requests",
        label: "Requests (FIDs)",
        route: ROUTES.requests,
        icon: Document24Regular,
      },
      {
        key: "subItems",
        label: "Sub-items & Delineation",
        route: ROUTES.subItems,
        icon: ClipboardTask24Regular,
      },
      {
        key: "quotations",
        label: "Quotations (SCM)",
        route: ROUTES.quotations,
        icon: Cart24Regular,
      },
      {
        key: "budgetReports",
        label: "Budget Reports",
        route: ROUTES.budgetReports,
        icon: Money24Regular,
      },
      {
        key: "approvals",
        label: "Approvals",
        route: ROUTES.approvals,
        icon: CheckmarkCircle24Regular,
      },
    ],
  },
  {
    key: "production",
    label: "Production",
    icon: Wrench24Regular,
    items: [
      {
        key: "productionBoard",
        label: "Production Board",
        route: ROUTES.productionBoard,
        icon: Board24Regular,
      },
      {
        key: "workOrders",
        label: "Work Orders",
        route: ROUTES.workOrders,
        icon: ClipboardTask24Regular,
      },
      {
        key: "procurement",
        label: "Procurement (RC/PO)",
        route: ROUTES.procurement,
        icon: Cart24Regular,
      },
      {
        key: "workshop",
        label: "Workshop",
        route: ROUTES.workshop,
        icon: Wrench24Regular,
      },
      {
        key: "quality",
        label: "Quality & Databook",
        route: ROUTES.quality,
        icon: Beaker24Regular,
      },
      {
        key: "warehouse",
        label: "Warehouse",
        route: ROUTES.warehouse,
        icon: Box24Regular,
      },
      {
        key: "serviceExcellence",
        label: "Service Excellence",
        route: ROUTES.serviceExcellence,
        icon: Tag24Regular,
      },
    ],
  },
  {
    key: "planning",
    label: "Planning",
    icon: CalendarLtr24Regular,
    items: [
      {
        key: "planner",
        label: "Planner",
        route: ROUTES.planner,
        icon: DataArea24Regular,
      },
      {
        key: "timeline",
        label: "Timeline (Gantt)",
        route: ROUTES.timeline,
        icon: CalendarLtr24Regular,
      },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    icon: Toolbox24Regular,
    items: [
      {
        key: "smartLabels",
        label: "Smart Labels (QR)",
        route: ROUTES.smartLabels,
        icon: Tag24Regular,
      },
      {
        key: "mobileScan",
        label: "Mobile Scan",
        route: ROUTES.mobileScan,
        icon: Phone24Regular,
      },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    icon: Settings24Regular,
    items: [
      {
        key: "configuration",
        label: "Configuration",
        route: ROUTES.configuration,
        icon: Settings24Regular,
      },
      {
        key: "members",
        label: "Members Management",
        route: ROUTES.members,
        icon: People24Regular,
      },
    ],
  },
];
