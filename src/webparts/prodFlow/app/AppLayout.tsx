import * as React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import CommandPalette from "./components/common/CommandPalette";
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
import PatchNotesPage from "./pages/PatchNotesPage";
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
import CreateFidWizard from "./components/budgeting/CreateFidWizard";
import { useUIStore } from "./stores/useUIStore";
import { ROUTES } from "./config/routes";
import styles from "./AppLayout.module.scss";

export const AppLayout: React.FC = () => {
  const createFidOpen = useUIStore((s) => s.createFidOpen);
  const setCreateFidOpen = useUIStore((s) => s.setCreateFidOpen);

  return (
    <HashRouter>
      <div className={styles.appRoot}>
        <Sidebar />
        <div className={styles.content}>
          <Header />
          <main className={styles.main}>
            <div className={styles.mainInner}>
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
                <Route
                  path={ROUTES.procurement}
                  element={<ProcurementPage />}
                />
                <Route path={ROUTES.workshop} element={<WorkshopPage />} />
                <Route path={ROUTES.quality} element={<QualityPage />} />
                <Route path={ROUTES.warehouse} element={<WarehousePage />} />
                <Route
                  path={ROUTES.serviceExcellence}
                  element={<ServiceExcellencePage />}
                />
                <Route path={ROUTES.planner} element={<PlannerPage />} />
                <Route path={ROUTES.timeline} element={<TimelinePage />} />
                <Route
                  path={ROUTES.smartLabels}
                  element={<SmartLabelsPage />}
                />
                <Route path={ROUTES.mobileScan} element={<MobileScanPage />} />
                <Route
                  path={ROUTES.configuration}
                  element={<ConfigurationPage />}
                />
                <Route path={ROUTES.members} element={<MembersPage />} />
                <Route path={ROUTES.patchNotes} element={<PatchNotesPage />} />
                <Route
                  path="*"
                  element={<PlaceholderPage title="Página não encontrada" />}
                />
              </Routes>
            </div>
          </main>
          <Footer />
        </div>
      </div>
      <CommandPalette />
      {/* Global so "Novo FID" works from the sidebar/header on any route. */}
      <CreateFidWizard open={createFidOpen} onOpenChange={setCreateFidOpen} />
    </HashRouter>
  );
};

export default AppLayout;
