import * as React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import DashboardPage from "./pages/DashboardPage";
import RequestsPage from "./pages/RequestsPage";
import FidDetailPage from "./pages/FidDetailPage";
import ConfigurationPage from "./pages/ConfigurationPage";
import BudgetingBoardPage from "./pages/BudgetingBoardPage";
import ProductionBoardPage from "./pages/ProductionBoardPage";
import PlannerPage from "./pages/PlannerPage";
import TimelinePage from "./pages/TimelinePage";
import SmartLabelsPage from "./pages/SmartLabelsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import BudgetReportsPage from "./pages/BudgetReportsPage";
import MembersPage from "./pages/MembersPage";
import NotificationsPage from "./pages/NotificationsPage";
import MobileScanPage from "./pages/MobileScanPage";
import {
  SubItemsPage,
  QuotationsPage,
  ProcurementPage,
  WorkOrdersPage,
  WorkshopPage,
  QualityPage,
  WarehousePage,
  ServiceExcellencePage,
} from "./pages/TeamViewPages";
import PlaceholderPage from "./pages/PlaceholderPage";
import { ROUTES } from "./config/routes";
import styles from "./AppLayout.module.scss";

export const AppLayout: React.FC = () => (
  <HashRouter>
    <div className={styles.appRoot}>
      <Sidebar />
      <div className={styles.content}>
        <Header />
        <main className={styles.main}>
          <Routes>
            <Route path={ROUTES.dashboard} element={<DashboardPage />} />
            <Route
              path={ROUTES.notifications}
              element={<NotificationsPage />}
            />
            <Route
              path={ROUTES.budgetingBoard}
              element={<BudgetingBoardPage />}
            />
            <Route path={ROUTES.requests} element={<RequestsPage />} />
            <Route path={ROUTES.subItems} element={<SubItemsPage />} />
            <Route path={ROUTES.quotations} element={<QuotationsPage />} />
            <Route
              path={ROUTES.budgetReports}
              element={<BudgetReportsPage />}
            />
            <Route path={ROUTES.approvals} element={<ApprovalsPage />} />
            <Route path={ROUTES.fidDetail} element={<FidDetailPage />} />
            <Route
              path={ROUTES.productionBoard}
              element={<ProductionBoardPage />}
            />
            <Route path={ROUTES.workOrders} element={<WorkOrdersPage />} />
            <Route path={ROUTES.procurement} element={<ProcurementPage />} />
            <Route path={ROUTES.workshop} element={<WorkshopPage />} />
            <Route path={ROUTES.quality} element={<QualityPage />} />
            <Route path={ROUTES.warehouse} element={<WarehousePage />} />
            <Route
              path={ROUTES.serviceExcellence}
              element={<ServiceExcellencePage />}
            />
            <Route path={ROUTES.planner} element={<PlannerPage />} />
            <Route path={ROUTES.timeline} element={<TimelinePage />} />
            <Route path={ROUTES.smartLabels} element={<SmartLabelsPage />} />
            <Route path={ROUTES.mobileScan} element={<MobileScanPage />} />
            <Route
              path={ROUTES.configuration}
              element={<ConfigurationPage />}
            />
            <Route path={ROUTES.members} element={<MembersPage />} />
            <Route
              path="*"
              element={<PlaceholderPage title="Página não encontrada" />}
            />
          </Routes>
        </main>
      </div>
    </div>
  </HashRouter>
);

export default AppLayout;
