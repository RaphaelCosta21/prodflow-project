import * as React from "react";
import CrossFidView from "../components/common/CrossFidView";
import {
  SUB_ITEMS_VIEW,
  QUOTATIONS_VIEW,
  PROCUREMENT_VIEW,
  WORK_ORDERS_VIEW,
  WORKSHOP_VIEW,
  QUALITY_VIEW,
  WAREHOUSE_VIEW,
  SERVICE_EXCELLENCE_VIEW,
} from "../config/crossFidViews";

// Each team page is the CrossFidView engine + its declarative config.
export const SubItemsPage: React.FC = () => (
  <CrossFidView {...SUB_ITEMS_VIEW} />
);
export const QuotationsPage: React.FC = () => (
  <CrossFidView {...QUOTATIONS_VIEW} />
);
export const ProcurementPage: React.FC = () => (
  <CrossFidView {...PROCUREMENT_VIEW} />
);
export const WorkOrdersPage: React.FC = () => (
  <CrossFidView {...WORK_ORDERS_VIEW} />
);
export const WorkshopPage: React.FC = () => <CrossFidView {...WORKSHOP_VIEW} />;
export const QualityPage: React.FC = () => <CrossFidView {...QUALITY_VIEW} />;
export const WarehousePage: React.FC = () => (
  <CrossFidView {...WAREHOUSE_VIEW} />
);
export const ServiceExcellencePage: React.FC = () => (
  <CrossFidView {...SERVICE_EXCELLENCE_VIEW} />
);
