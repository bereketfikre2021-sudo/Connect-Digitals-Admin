import { useQuery } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useNavigate } from "react-router-dom";
import {
  CreditCardIcon, PackageIcon, ClipboardIcon,
  CheckIcon, CoinsIcon, AlertIcon,
} from "@/components/ui/Icon";

interface StatsData {
  kpis: {
    paymentsUnderReview: number;
    pendingFulfillment: number;
    failedFulfillment: number;
    ordersToday: number;
    approvedPaymentsToday: number;
    completedOrdersToday: number;
    etbCollectedToday: number;
  };
  needsAttention: {
    awaitingReview: Array<{
      id: string; amountETB: number; createdAt: string;
      user: { firstName: string; lastName: string; username: string | null };
      order: { orderNumber: string; service: { name: string } } | null;
    }>;
    awaitingFulfillment: Array<{
      id: string; createdAt: string;
      order: { orderNumber: string; service: { name: string }; user: { firstName: string; lastName: string } };
    }>;
    failedTasks: Array<{
      id: string; errorMessage: string | null; updatedAt: string;
      order: { orderNumber: string; service: { name: string }; user: { firstName: string; lastName: string } };
    }>;
  };
}

function KpiCard({
  label, value, Icon, color, textColor, to,
}: {
  label: string; value: number | string;
  Icon: (p: { size?: number; color?: string }) => JSX.Element;
  color: string; textColor: string; to: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{
        background: color, border: "none", borderRadius: 12, padding: "18px 20px",
        textAlign: "left", cursor: "pointer", transition: "opacity 0.15s",
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "rgba(255,255,255,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} color={textColor} />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, color: "var(--cd-navy)" }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--cd-gray-700)", marginTop: 2 }}>{label}</div>
      </div>
    </button>
  );
}

function SectionHeader({ title, linkLabel, to }: { title: string; linkLabel?: string; to?: string }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 700, color: "var(--cd-navy)" }}>{title}</h3>
      {linkLabel && to && (
        <button type="button" onClick={() => navigate(to)} style={{ fontSize: 12, color: "var(--cd-red)", cursor: "pointer", background: "none", border: "none", fontWeight: 600 }}>
          {linkLabel} →
        </button>
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      api.get<{ success: boolean; data: StatsData }>("/admin/stats").then(r => r.data.data),
    refetchInterval: 30_000,
  });

  const k = stats?.kpis;
  const na = stats?.needsAttention;

  const kpiCards = [
    { label: "Payments Under Review", value: k?.paymentsUnderReview ?? "—", Icon: CreditCardIcon, color: "#dbeafe", textColor: "#1e40af", to: "/payments?status=UNDER_REVIEW" },
    { label: "Pending Fulfillment",   value: k?.pendingFulfillment ?? "—",   Icon: PackageIcon,    color: "#fef9c3", textColor: "#854d0e", to: "/fulfillment?status=QUEUED" },
    { label: "Orders Today",          value: k?.ordersToday ?? "—",          Icon: ClipboardIcon,  color: "#ede9fe", textColor: "#5b21b6", to: "/orders" },
    { label: "Approved Today",        value: k?.approvedPaymentsToday ?? "—",Icon: CheckIcon,      color: "#dcfce7", textColor: "#166534", to: "/payments?status=APPROVED" },
    { label: "Completed Today",       value: k?.completedOrdersToday ?? "—", Icon: CheckIcon,      color: "#dcfce7", textColor: "#166534", to: "/orders?status=COMPLETED" },
    { label: "ETB Collected Today",   value: k ? `${etbDisplay(k.etbCollectedToday)}` : "—", Icon: CoinsIcon, color: "#fef3c7", textColor: "#92400e", to: "/payments?status=APPROVED" },
  ];

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Operational overview" />

      {isLoading ? <Spinner /> : (
        <>
          {/* ── KPI grid ─────────────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}>
            {kpiCards.map(c => (
              <KpiCard key={c.label} {...c} />
            ))}
          </div>

          {/* ── Needs Attention ──────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <AlertIcon size={16} color="var(--cd-red)" />
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--cd-navy)" }}>
                Needs Attention
              </h2>
            </div>

            {/* Failed fulfillment — shown first if any */}
            {(na?.failedTasks?.length ?? 0) > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)", marginBottom: 16, border: "1px solid #fca5a5" }}>
                <SectionHeader title={`Failed Fulfillment (${k?.failedFulfillment})`} linkLabel="View all" to="/fulfillment?status=FAILED" />
                {na!.failedTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/fulfillment/${t.id}`)}
                    style={{ padding: "9px 0", borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.order.orderNumber}</div>
                      <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>
                        {t.order.user.firstName} {t.order.user.lastName} · {t.order.service.name}
                      </div>
                      {t.errorMessage && (
                        <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>{t.errorMessage}</div>
                      )}
                    </div>
                    <StatusBadge status="FAILED" />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Payments awaiting review */}
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
                <SectionHeader title={`Payments Under Review (${k?.paymentsUnderReview ?? 0})`} linkLabel="View all" to="/payments" />
                {(na?.awaitingReview?.length ?? 0) === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--cd-gray-500)", textAlign: "center", padding: "16px 0" }}>All clear</p>
                ) : na!.awaitingReview.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/payments/${p.id}`)}
                    style={{ padding: "9px 0", borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.order?.orderNumber ?? "Deposit"}</div>
                      <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{p.user.firstName} {p.user.lastName}</div>
                      <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>{formatDateTime(p.createdAt)}</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "var(--cd-red)", whiteSpace: "nowrap" }}>
                      {etbDisplay(p.amountETB)} ETB
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment awaiting */}
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
                <SectionHeader title={`Pending Fulfillment (${k?.pendingFulfillment ?? 0})`} linkLabel="View all" to="/fulfillment" />
                {(na?.awaitingFulfillment?.length ?? 0) === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--cd-gray-500)", textAlign: "center", padding: "16px 0" }}>All clear</p>
                ) : na!.awaitingFulfillment.map(t => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/fulfillment/${t.id}`)}
                    style={{ padding: "9px 0", borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.order.orderNumber}</div>
                      <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>
                        {t.order.user.firstName} {t.order.user.lastName} · {t.order.service.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--cd-gray-500)", whiteSpace: "nowrap" }}>
                      {formatDateTime(t.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
