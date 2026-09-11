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
    pendingFulfillment:  number;
    failedFulfillment:   number;
    ordersToday:         number;
    approvedPaymentsToday: number;
    completedOrdersToday:  number;
    etbCollectedToday:     number;
  };
  needsAttention: {
    awaitingReview: Array<{
      id: string; amountETB: number; createdAt: string;
      user:  { firstName: string; lastName: string; username: string | null };
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

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiConfig {
  label:     string;
  value:     number | string;
  Icon:      (p: { size?: number; color?: string }) => JSX.Element;
  accent:    string;
  bg:        string;
  to:        string;
  highlight?: boolean;
}

function KpiCard({ label, value, Icon, accent, bg, to, highlight }: KpiConfig) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{
        background: "#fff",
        border: highlight ? `1.5px solid ${accent}` : "1.5px solid var(--cd-gray-200)",
        borderRadius: 14,
        padding: "18px 20px",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.18s",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "var(--shadow-sm)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Subtle background accent blob */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: bg, opacity: 0.6, pointerEvents: "none",
      }} />

      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: bg, display: "flex",
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} color={accent} />
      </div>

      <div>
        <div style={{
          fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26,
          color: "var(--cd-navy)", lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--cd-gray-500)", marginTop: 4, fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, count, linkLabel, to }: { title: string; count?: number; linkLabel?: string; to?: string }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 700, color: "var(--cd-navy)" }}>
          {title}
        </h3>
        {count !== undefined && (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 20, height: 20, borderRadius: 10, padding: "0 6px",
            background: count > 0 ? "var(--cd-red)" : "var(--cd-gray-200)",
            color: count > 0 ? "#fff" : "var(--cd-gray-500)",
            fontSize: 10, fontWeight: 700,
          }}>
            {count}
          </span>
        )}
      </div>
      {linkLabel && to && (
        <button type="button" onClick={() => navigate(to)}
          style={{ fontSize: 12, color: "var(--cd-red)", cursor: "pointer", background: "none", border: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          {linkLabel} →
        </button>
      )}
    </div>
  );
}

// ── Attention row ─────────────────────────────────────────────────────────────

function AttentionRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 0", borderBottom: "1px solid var(--cd-gray-100)",
        cursor: "pointer", transition: "background 0.12s",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        borderRadius: 4,
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = "var(--cd-gray-50)")}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = "")}
    >
      {children}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 20,
      boxShadow: "var(--shadow-sm)", border: "1px solid var(--cd-gray-200)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      api.get<{ success: boolean; data: StatsData }>("/admin/stats").then(r => r.data.data),
    refetchInterval: 30_000,
  });

  const k  = stats?.kpis;
  const na = stats?.needsAttention;

  const kpiCards: KpiConfig[] = [
    {
      label: "Payments Under Review",
      value: k?.paymentsUnderReview ?? "—",
      Icon: CreditCardIcon, accent: "#2563eb", bg: "#eff6ff",
      to: "/payments?status=UNDER_REVIEW",
      highlight: (k?.paymentsUnderReview ?? 0) > 0,
    },
    {
      label: "Pending Fulfillment",
      value: k?.pendingFulfillment ?? "—",
      Icon: PackageIcon, accent: "#d97706", bg: "#fffbeb",
      to: "/fulfillment?status=QUEUED",
      highlight: (k?.pendingFulfillment ?? 0) > 0,
    },
    {
      label: "Orders Today",
      value: k?.ordersToday ?? "—",
      Icon: ClipboardIcon, accent: "#7c3aed", bg: "#ede9fe",
      to: "/orders",
    },
    {
      label: "Payments Approved Today",
      value: k?.approvedPaymentsToday ?? "—",
      Icon: CheckIcon, accent: "#16a34a", bg: "#dcfce7",
      to: "/payments?status=APPROVED",
    },
    {
      label: "Orders Completed Today",
      value: k?.completedOrdersToday ?? "—",
      Icon: CheckIcon, accent: "#0891b2", bg: "#e0f2fe",
      to: "/orders?status=COMPLETED",
    },
    {
      label: "ETB Collected Today",
      value: k ? `${etbDisplay(k.etbCollectedToday)}` : "—",
      Icon: CoinsIcon, accent: "#b45309", bg: "#fef3c7",
      to: "/payments?status=APPROVED",
    },
  ];

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Live operational overview" />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
          <Spinner />
        </div>
      ) : (
        <>
          {/* ── KPI grid ─────────────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
            gap: 14, marginBottom: 30,
          }}>
            {kpiCards.map(c => <KpiCard key={c.label} {...c} />)}
          </div>

          {/* ── Failed fulfilment banner ──────────────────────────── */}
          {(na?.failedTasks?.length ?? 0) > 0 && (
            <Panel style={{ marginBottom: 20, border: "1.5px solid #fca5a5", background: "#fff5f5" }}>
              <SectionHeader
                title="Failed Fulfillment"
                count={k?.failedFulfillment}
                linkLabel="View all"
                to="/fulfillment?status=FAILED"
              />
              {na!.failedTasks.map(t => (
                <AttentionRow key={t.id} onClick={() => navigate(`/fulfillment/${t.id}`)}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cd-navy)" }}>{t.order.orderNumber}</span>
                      <StatusBadge status="FAILED" />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>
                      {t.order.user.firstName} {t.order.user.lastName} · {t.order.service.name}
                    </div>
                    {t.errorMessage && (
                      <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.errorMessage}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--cd-gray-400)", whiteSpace: "nowrap", marginLeft: 8 }}>
                    {formatDateTime(t.updatedAt)}
                  </span>
                </AttentionRow>
              ))}
            </Panel>
          )}

          {/* ── Needs Attention label ─────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <AlertIcon size={15} color="var(--cd-red)" />
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--cd-navy)" }}>
              Needs Attention
            </h2>
          </div>

          {/* ── Two-column attention panels ───────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Payments under review */}
            <Panel>
              <SectionHeader
                title="Payments Under Review"
                count={k?.paymentsUnderReview ?? 0}
                linkLabel="View all"
                to="/payments"
              />
              {(na?.awaitingReview?.length ?? 0) === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--cd-gray-400)" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>All clear</div>
                </div>
              ) : na!.awaitingReview.map(p => (
                <AttentionRow key={p.id} onClick={() => navigate(`/payments/${p.id}`)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cd-navy)", marginBottom: 2 }}>
                      {p.order?.orderNumber ?? "Deposit"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>
                      {p.user.firstName} {p.user.lastName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--cd-gray-400)", marginTop: 1 }}>
                      {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "var(--cd-red)", whiteSpace: "nowrap", marginLeft: 8 }}>
                    {etbDisplay(p.amountETB)} ETB
                  </div>
                </AttentionRow>
              ))}
            </Panel>

            {/* Pending fulfilment */}
            <Panel>
              <SectionHeader
                title="Pending Fulfillment"
                count={k?.pendingFulfillment ?? 0}
                linkLabel="View all"
                to="/fulfillment"
              />
              {(na?.awaitingFulfillment?.length ?? 0) === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--cd-gray-400)" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>All clear</div>
                </div>
              ) : na!.awaitingFulfillment.map(t => (
                <AttentionRow key={t.id} onClick={() => navigate(`/fulfillment/${t.id}`)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cd-navy)", marginBottom: 2 }}>
                      {t.order.orderNumber}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>
                      {t.order.user.firstName} {t.order.user.lastName} · {t.order.service.name}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--cd-gray-400)", whiteSpace: "nowrap", marginLeft: 8 }}>
                    {formatDateTime(t.createdAt)}
                  </div>
                </AttentionRow>
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
