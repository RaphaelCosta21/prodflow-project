import * as React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import DashboardPage from "./pages/DashboardPage";
import RequestsPage from "./pages/RequestsPage";
import FidDetailPage from "./pages/FidDetailPage";
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
              element={
                <PlaceholderPage title="Notifications" phase="Overview" />
              }
            />
            <Route
              path={ROUTES.budgetingBoard}
              element={
                <PlaceholderPage title="Budgeting Board" phase="Fase 1" />
              }
            />
            <Route path={ROUTES.requests} element={<RequestsPage />} />
            <Route
              path={ROUTES.subItems}
              element={
                <PlaceholderPage
                  title="Sub-items & Delineamento"
                  phase="Fase 1"
                />
              }
            />
            <Route
              path={ROUTES.quotations}
              element={
                <PlaceholderPage title="Cotações (SCM)" phase="Fase 1" />
              }
            />
            <Route
              path={ROUTES.budgetReports}
              element={
                <PlaceholderPage
                  title="Relatórios de Orçamento"
                  phase="Fase 1"
                />
              }
            />
            <Route
              path={ROUTES.approvals}
              element={
                <PlaceholderPage
                  title="Aprovações (Petrobras)"
                  phase="Fase 1"
                />
              }
            />
            <Route path={ROUTES.fidDetail} element={<FidDetailPage />} />
            <Route
              path={ROUTES.productionBoard}
              element={
                <PlaceholderPage title="Production Board" phase="Fase 2" />
              }
            />
            <Route
              path={ROUTES.workOrders}
              element={<PlaceholderPage title="Work Orders" phase="Fase 2" />}
            />
            <Route
              path={ROUTES.procurement}
              element={
                <PlaceholderPage title="Procurement (RC/PO)" phase="Fase 2" />
              }
            />
            <Route
              path={ROUTES.workshop}
              element={
                <PlaceholderPage title="Workshop / Fabricação" phase="Fase 2" />
              }
            />
            <Route
              path={ROUTES.quality}
              element={
                <PlaceholderPage title="Qualidade & Databook" phase="Fase 2" />
              }
            />
            <Route
              path={ROUTES.warehouse}
              element={<PlaceholderPage title="Almoxarifado" phase="Fase 2" />}
            />
            <Route
              path={ROUTES.serviceExcellence}
              element={
                <PlaceholderPage title="Service Excellence" phase="Fase 2" />
              }
            />
            <Route
              path={ROUTES.planner}
              element={
                <PlaceholderPage
                  title="Planner (carga × capacidade)"
                  phase="Planning"
                />
              }
            />
            <Route
              path={ROUTES.timeline}
              element={
                <PlaceholderPage title="Timeline (Gantt)" phase="Planning" />
              }
            />
            <Route
              path={ROUTES.smartLabels}
              element={
                <PlaceholderPage title="Smart Labels (QR)" phase="Tools" />
              }
            />
            <Route
              path={ROUTES.mobileScan}
              element={<PlaceholderPage title="Mobile Scan" phase="Tools" />}
            />
            <Route
              path={ROUTES.configuration}
              element={<PlaceholderPage title="Configuration" phase="Admin" />}
            />
            <Route
              path={ROUTES.members}
              element={
                <PlaceholderPage title="Members Management" phase="Admin" />
              }
            />
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
