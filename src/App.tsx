import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAdminAuthStore } from "@/store/auth.store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Spinner } from "@/components/ui/Spinner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PaymentsPage } from "@/pages/payments/PaymentsPage";
import { PaymentDetailPage } from "@/pages/payments/PaymentDetailPage";
import { FulfillmentPage } from "@/pages/fulfillment/FulfillmentPage";
import { FulfillmentDetailPage } from "@/pages/fulfillment/FulfillmentDetailPage";
import { OrdersPage } from "@/pages/orders/OrdersPage";
import { OrderDetailPage } from "@/pages/orders/OrderDetailPage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { WalletsPage } from "@/pages/wallets/WalletsPage";
import { WalletDetailPage } from "@/pages/wallets/WalletDetailPage";
import { CampaignsPage } from "@/pages/campaigns/CampaignsPage";
import { CampaignDetailPage } from "@/pages/campaigns/CampaignDetailPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { ReportDetailPage } from "@/pages/reports/ReportDetailPage";
import { AnalyticsPage } from "@/pages/analytics/AnalyticsPage";
import { PaymentMethodsPage } from "@/pages/settings/PaymentMethodsPage";
import { ServicesManagementPage } from "@/pages/settings/ServicesPage";
import { AdminUsersPage } from "@/pages/settings/AdminUsersPage";
import { AuditLogPage } from "@/pages/settings/AuditLogPage";
import { PromoCodesPage } from "@/pages/settings/PromoCodesPage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { BroadcastPage } from "@/pages/broadcast/BroadcastPage";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      minHeight: "100vh",
      width: "100%",
    }}>
      {/* On desktop: sidebar is rendered inside the flex row.
          On mobile: MobileBottomNav is position:fixed so it doesn't affect flow. */}
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: "auto",
        background: "var(--cd-gray-50)",
        minWidth: 0,
        // Push content above the fixed bottom nav on mobile
        paddingBottom: isMobile ? "calc(60px + env(safe-area-inset-bottom, 0px))" : 0,
      }}>
        {children}
      </main>
    </div>
  );
}

export function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAdminAuthStore();

  useEffect(() => { checkAuth(); }, [checkAuth]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cd-navy)" }}>
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <AdminLayout>
      <Routes>
        <Route path="/"                      element={<DashboardPage />} />
        <Route path="/payments"              element={<PaymentsPage />} />
        <Route path="/payments/:id"          element={<PaymentDetailPage />} />
        <Route path="/fulfillment"           element={<FulfillmentPage />} />
        <Route path="/fulfillment/:id"       element={<FulfillmentDetailPage />} />
        <Route path="/orders"                element={<OrdersPage />} />
        <Route path="/orders/:id"            element={<OrderDetailPage />} />
        <Route path="/customers"             element={<CustomersPage />} />
        <Route path="/customers/:id"         element={<CustomerDetailPage />} />
        <Route path="/wallets"               element={<WalletsPage />} />
        <Route path="/wallets/:userId"       element={<WalletDetailPage />} />
        <Route path="/campaigns"             element={<CampaignsPage />} />
        <Route path="/campaigns/:id"         element={<CampaignDetailPage />} />
        <Route path="/reports"               element={<ReportsPage />} />
        <Route path="/reports/:id"           element={<ReportDetailPage />} />
        <Route path="/analytics"             element={<AnalyticsPage />} />
        <Route path="/settings/payment-methods" element={<PaymentMethodsPage />} />
        <Route path="/settings/services"        element={<ServicesManagementPage />} />
        <Route path="/settings/admin-users"     element={<AdminUsersPage />} />
        <Route path="/settings/audit-log"       element={<AuditLogPage />} />
        <Route path="/settings/promo-codes"     element={<PromoCodesPage />} />
        <Route path="/notifications"             element={<NotificationsPage />} />
        <Route path="/broadcast"                 element={<BroadcastPage />} />
        <Route path="*"                      element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
  );
}
