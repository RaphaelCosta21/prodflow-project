import {
  DataArea20Regular,
  Timeline20Regular,
  Flowchart20Regular,
  BranchFork20Regular,
  Ruler20Regular,
  Cart20Regular,
  DocumentTable20Regular,
  CheckmarkCircle20Regular,
  Wrench20Regular,
  Beaker20Regular,
  DocumentMultiple20Regular,
  Comment20Regular,
  History20Regular,
  type FluentIcon,
} from "@fluentui/react-icons";
import { TeamKey } from "./teams";

export type FidTabKey =
  | "overview"
  | "timeline"
  | "phases"
  | "subitems"
  | "delineation"
  | "quotations"
  | "reports"
  | "approval"
  | "production"
  | "quality"
  | "documents"
  | "notes"
  | "activity";

export interface IFidNavItem {
  key: FidTabKey;
  label: string;
  icon: FluentIcon;
  /** Team that owns the page — shown as a hint, never hides the page. */
  ownerTeam?: TeamKey;
  /** Only reachable once the FID entered Phase 2. */
  phase2Only?: boolean;
}

export interface IFidNavGroup {
  key: string;
  label: string;
  items: IFidNavItem[];
}

export const FID_NAV_GROUPS: IFidNavGroup[] = [
  {
    key: "general",
    label: "Geral",
    items: [
      { key: "overview", label: "Visão Geral", icon: DataArea20Regular },
      { key: "timeline", label: "Cronograma", icon: Timeline20Regular },
      { key: "phases", label: "Fases & Status", icon: Flowchart20Regular },
    ],
  },
  {
    key: "budgeting",
    label: "Orçamentação",
    items: [
      {
        key: "subitems",
        label: "Sub-itens & Estratégia",
        icon: BranchFork20Regular,
        ownerTeam: "planning",
      },
      {
        key: "delineation",
        label: "Delineamento",
        icon: Ruler20Regular,
        ownerTeam: "industrialEngineering",
      },
      {
        key: "quotations",
        label: "Cotações",
        icon: Cart20Regular,
        ownerTeam: "scm",
      },
      {
        key: "reports",
        label: "Relatórios de Orçamento",
        icon: DocumentTable20Regular,
        ownerTeam: "planning",
      },
      {
        key: "approval",
        label: "Aprovação",
        icon: CheckmarkCircle20Regular,
        ownerTeam: "projects",
      },
    ],
  },
  {
    key: "production",
    label: "Produção",
    items: [
      {
        key: "production",
        label: "Produção",
        icon: Wrench20Regular,
        ownerTeam: "workshop",
        phase2Only: true,
      },
      {
        key: "quality",
        label: "Qualidade",
        icon: Beaker20Regular,
        ownerTeam: "quality",
        phase2Only: true,
      },
    ],
  },
  {
    key: "collaboration",
    label: "Colaboração",
    items: [
      {
        key: "documents",
        label: "Documentos",
        icon: DocumentMultiple20Regular,
      },
      { key: "notes", label: "Notas & Comentários", icon: Comment20Regular },
      { key: "activity", label: "Log de Atividades", icon: History20Regular },
    ],
  },
];
