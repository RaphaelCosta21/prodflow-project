// Single source of truth for route paths (HashRouter). Dedicated page per FID at /fid/:fid.
export const ROUTES = {
  dashboard: "/",
  notifications: "/notifications",
  budgetingBoard: "/budgeting/board",
  requests: "/budgeting/requests",
  subItems: "/budgeting/sub-items",
  quotations: "/budgeting/quotations",
  budgetReports: "/budgeting/reports",
  approvals: "/budgeting/approvals",
  fidDetail: "/fid/:fid",
  productionBoard: "/production/board",
  workOrders: "/production/work-orders",
  procurement: "/production/procurement",
  workshop: "/production/workshop",
  quality: "/production/quality",
  warehouse: "/production/warehouse",
  serviceExcellence: "/production/service-excellence",
  planner: "/planning/planner",
  timeline: "/planning/timeline",
  smartLabels: "/tools/smart-labels",
  mobileScan: "/tools/mobile-scan",
  configuration: "/admin/configuration",
  members: "/admin/members",
} as const;

export type RouteKey = keyof typeof ROUTES;

export function fidDetailPath(fid: string): string {
  return `/fid/${fid}`;
}
