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

// Collapsible sidebar structure (Visão Geral · Orçamentação · Produção · Planejamento · Ferramentas · Admin).
export const NAV_GROUPS: INavGroup[] = [
  {
    key: "overview",
    label: "Visão Geral",
    icon: Home24Regular,
    items: [
      {
        key: "dashboard",
        label: "Painel",
        route: ROUTES.dashboard,
        icon: DataArea24Regular,
      },
      {
        key: "notifications",
        label: "Notificações",
        route: ROUTES.notifications,
        icon: Alert24Regular,
      },
    ],
  },
  {
    key: "budgeting",
    label: "Orçamentação",
    icon: Money24Regular,
    items: [
      {
        key: "budgetingBoard",
        label: "Quadro de Orçamentação",
        route: ROUTES.budgetingBoard,
        icon: Board24Regular,
      },
      {
        key: "requests",
        label: "Solicitações (FIDs)",
        route: ROUTES.requests,
        icon: Document24Regular,
      },
      {
        key: "subItems",
        label: "Sub-itens & Delineação",
        route: ROUTES.subItems,
        icon: ClipboardTask24Regular,
      },
      {
        key: "quotations",
        label: "Cotações (SCM)",
        route: ROUTES.quotations,
        icon: Cart24Regular,
      },
      {
        key: "budgetReports",
        label: "Relatórios de Orçamento",
        route: ROUTES.budgetReports,
        icon: Money24Regular,
      },
      {
        key: "approvals",
        label: "Aprovações",
        route: ROUTES.approvals,
        icon: CheckmarkCircle24Regular,
      },
    ],
  },
  {
    key: "production",
    label: "Produção",
    icon: Wrench24Regular,
    items: [
      {
        key: "productionBoard",
        label: "Quadro de Produção",
        route: ROUTES.productionBoard,
        icon: Board24Regular,
      },
      {
        key: "workOrders",
        label: "Ordens de Fabricação",
        route: ROUTES.workOrders,
        icon: ClipboardTask24Regular,
      },
      {
        key: "procurement",
        label: "Suprimentos (RC/PO)",
        route: ROUTES.procurement,
        icon: Cart24Regular,
      },
      {
        key: "workshop",
        label: "Oficina",
        route: ROUTES.workshop,
        icon: Wrench24Regular,
      },
      {
        key: "quality",
        label: "Qualidade & Databook",
        route: ROUTES.quality,
        icon: Beaker24Regular,
      },
      {
        key: "warehouse",
        label: "Almoxarifado",
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
    label: "Planejamento",
    icon: CalendarLtr24Regular,
    items: [
      {
        key: "planner",
        label: "Planejador",
        route: ROUTES.planner,
        icon: DataArea24Regular,
      },
      {
        key: "timeline",
        label: "Cronograma (Gantt)",
        route: ROUTES.timeline,
        icon: CalendarLtr24Regular,
      },
    ],
  },
  {
    key: "tools",
    label: "Ferramentas",
    icon: Toolbox24Regular,
    items: [
      {
        key: "smartLabels",
        label: "Etiquetas Smart (QR)",
        route: ROUTES.smartLabels,
        icon: Tag24Regular,
      },
      {
        key: "mobileScan",
        label: "Leitura Mobile",
        route: ROUTES.mobileScan,
        icon: Phone24Regular,
      },
    ],
  },
  {
    key: "admin",
    label: "Administração",
    icon: Settings24Regular,
    items: [
      {
        key: "configuration",
        label: "Configuração",
        route: ROUTES.configuration,
        icon: Settings24Regular,
      },
      {
        key: "members",
        label: "Gestão de Membros",
        route: ROUTES.members,
        icon: People24Regular,
      },
    ],
  },
];
