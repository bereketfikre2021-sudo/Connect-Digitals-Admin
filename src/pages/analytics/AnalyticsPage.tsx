/**
 * Admin Analytics Page — Phase 5
 *
 * Displays operational metrics for a chosen date range.
 * All data is server-side aggregated; no client-side chart libraries added.
 * Simple stat cards, tables, and inline horizontal bar indicators.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, etbDisplay } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  range: { from: string; to: string };
  customers: { total: number; newInRange: number };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    completionRatePct: number | null;
    completedInRange: number;
  };
  payments: {
    byStatus: Record<string, { count: number; totalETB: number }>;
    approvedRevenue: { totalETB: number; count: number };
    underReview: { totalETB: number; count: number };
  };
  wallet: {
    deposits: { totalETB: number; count: number };
    orderPayments: { totalETB: number; count: number };
    currentBalances: { totalETB: number; averageETB: number; walletCount: number };
  };
  fulfillment: { byStatus: Record<string, number> };
  campaigns: {
    byStatus: Record<string, number>;
    metricsAggregate: {
      snapshotCount: number; impressions: number; reach: number; clicks: number;
      videoViews: number; likes: number; comments: number; shares: number;
      engagement: number; conversions: number; spendETB: number;
    } | null;
  };
  services: Array<{ serviceId: string; serviceName: string; platform: string; orderCount: number; revenueETB: number }>;
}

// ─── Helper components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 700, color: "var(--cd-navy)", marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid var(--cd-gray-100)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color = "#fff", valueColor = "var(--cd-navy)" }: {
  label: string; value: string | number; sub?: string;
  color?: string; valueColor?: string;
}) {
  return (
    <div style={{ background: color, borderRadius: 12, padding: "18px 20px", boxShadow: "var(--shadow-sm)", border: "1px solid var(--cd-gray-200)" }}>
      <div style={{ fontSize: 11, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: valueColor, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{count.toLocaleString()} <span style={{ color: "var(--cd-gray-500)", fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--cd-gray-100)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string | number | null }) {
  if (value == null || value === 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
      <span style={{ fontSize: 13, color: "var(--cd-gray-600)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cd-navy)" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// ─── Date range presets ───────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function preset(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

const PRESETS = [
  { label: "Today",    days: 1 },
  { label: "7 days",   days: 7 },
  { label: "30 days",  days: 30 },
  { label: "90 days",  days: 90 },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [from, setFrom] = useState(() => isoDate((() => { const d = new Date(); d.setDate(d.getDate() - 29); return d; })()));
  const [to, setTo]     = useState(() => isoDate(new Date()));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-analytics", from, to],
    queryFn: () =>
      api.get<{ success: boolean; data: AnalyticsData }>(`/admin/analytics?from=${from}&to=${to}`)
        .then(r => r.data.data),
    placeholderData: prev => prev,
  });

  const d = data;

  // Order total for % bars
  const orderTotal = d?.orders.total ?? 0;
  const fulfillmentTotal = Object.values(d?.fulfillment.byStatus ?? {}).reduce((a, b) => a + b, 0);
  const campaignTotal = Object.values(d?.campaigns.byStatus ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Analytics" subtitle="Operational metrics for the selected date range" />

      {/* ── Date range controls ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)", marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => { const r = preset(p.days); setFrom(r.from); setTo(r.to); }}
              style={{
                padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: "1.5px solid var(--cd-gray-300)", background: "#fff",
                color: "var(--cd-gray-600)", cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label htmlFor="a-from" style={{ fontSize: 12, fontWeight: 600, color: "var(--cd-gray-600)" }}>From</label>
            <input
              id="a-from"
              type="date"
              value={from}
              max={to}
              onChange={e => setFrom(e.target.value)}
              style={{ padding: "5px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label htmlFor="a-to" style={{ fontSize: 12, fontWeight: 600, color: "var(--cd-gray-600)" }}>To</label>
            <input
              id="a-to"
              type="date"
              value={to}
              min={from}
              max={isoDate(new Date())}
              onChange={e => setTo(e.target.value)}
              style={{ padding: "5px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
            />
          </div>
        </div>

        {isLoading && <span style={{ fontSize: 12, color: "var(--cd-gray-500)" }}>Loading…</span>}
        {isError && (
          <button type="button" onClick={() => refetch()} style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            Failed — retry
          </button>
        )}
      </div>

      {isLoading && !d ? <Spinner /> : !d ? null : (
        <>
          {/* ── Customers ── */}
          <Section title="Customers">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              <StatCard label="Total Customers" value={d.customers.total.toLocaleString()} />
              <StatCard label="New in Period" value={d.customers.newInRange.toLocaleString()} valueColor="var(--cd-red)" />
            </div>
          </Section>

          {/* ── Orders ── */}
          <Section title="Orders">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Orders" value={d.orders.total.toLocaleString()} />
              <StatCard label="Completed" value={d.orders.completedInRange.toLocaleString()} valueColor="#166534" />
              <StatCard
                label="Completion Rate"
                value={d.orders.completionRatePct != null ? `${d.orders.completionRatePct}%` : "—"}
                sub="of orders past payment stage"
                valueColor={d.orders.completionRatePct != null && d.orders.completionRatePct >= 80 ? "#166534" : "#854d0e"}
              />
            </div>

            {orderTotal > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                  Orders by Status
                </h3>
                {[
                  { key: "COMPLETED",         label: "Completed",         color: "#22c55e" },
                  { key: "IN_PROGRESS",        label: "In Progress",       color: "#a78bfa" },
                  { key: "PROCESSING",         label: "Processing",        color: "#818cf8" },
                  { key: "PAYMENT_APPROVED",   label: "Payment Approved",  color: "#34d399" },
                  { key: "PAYMENT_SUBMITTED",  label: "Payment Submitted", color: "#60a5fa" },
                  { key: "PENDING_PAYMENT",    label: "Pending Payment",   color: "#fbbf24" },
                  { key: "PAYMENT_REJECTED",   label: "Payment Rejected",  color: "#f87171" },
                  { key: "CANCELLED",          label: "Cancelled",         color: "#94a3b8" },
                  { key: "REFUNDED",           label: "Refunded",          color: "#cbd5e1" },
                ].map(({ key, label, color }) => {
                  const count = d.orders.byStatus[key] ?? 0;
                  if (count === 0) return null;
                  return <StatusRow key={key} label={label} count={count} total={orderTotal} color={color} />;
                })}
              </div>
            )}
          </Section>

          {/* ── Payments & Revenue ── */}
          <Section title="Payments & Revenue">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <StatCard
                label="Approved Revenue"
                value={`${etbDisplay(d.payments.approvedRevenue.totalETB)} ETB`}
                sub={`${d.payments.approvedRevenue.count} payments`}
                valueColor="var(--cd-red)"
              />
              <StatCard
                label="Pending Review"
                value={`${etbDisplay(d.payments.underReview.totalETB)} ETB`}
                sub={`${d.payments.underReview.count} payments`}
                valueColor="#854d0e"
              />
              <StatCard
                label="Wallet Deposits"
                value={`${etbDisplay(d.wallet.deposits.totalETB)} ETB`}
                sub={`${d.wallet.deposits.count} transactions`}
              />
              <StatCard
                label="Wallet Usage"
                value={`${etbDisplay(d.wallet.orderPayments.totalETB)} ETB`}
                sub={`${d.wallet.orderPayments.count} order payments`}
              />
            </div>

            {/* Payment status breakdown */}
            {Object.keys(d.payments.byStatus).length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)", marginBottom: 12 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                  Payments by Status
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ minWidth: 360 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--cd-gray-100)" }}>
                        {["Status", "Count", "Total (ETB)"].map(h => (
                          <th key={h} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, textAlign: h === "Status" ? "left" : "right" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(d.payments.byStatus).map(([status, { count, totalETB }]) => (
                        <tr key={status} style={{ borderBottom: "1px solid var(--cd-gray-100)" }}>
                          <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 500 }}>{status.replace(/_/g, " ")}</td>
                          <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right", fontWeight: 600 }}>{count.toLocaleString()}</td>
                          <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right", fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--cd-red)" }}>{etbDisplay(totalETB)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Wallet balances */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                Wallet Balances (all time)
              </h3>
              <MetricLine label="Total outstanding balance" value={`${etbDisplay(d.wallet.currentBalances.totalETB)} ETB`} />
              <MetricLine label="Average balance per wallet" value={`${etbDisplay(d.wallet.currentBalances.averageETB)} ETB`} />
              <MetricLine label="Active wallets" value={d.wallet.currentBalances.walletCount.toLocaleString()} />
            </div>
          </Section>

          {/* ── Fulfillment ── */}
          <Section title="Fulfillment">
            {fulfillmentTotal > 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
                {[
                  { key: "COMPLETED",         label: "Completed",         color: "#22c55e" },
                  { key: "PROCESSING",         label: "Processing",        color: "#818cf8" },
                  { key: "QUEUED",             label: "Queued",            color: "#fbbf24" },
                  { key: "AWAITING_APPROVAL",  label: "Awaiting Approval", color: "#60a5fa" },
                  { key: "PENDING",            label: "Pending",           color: "#e2e8f0" },
                  { key: "FAILED",             label: "Failed",            color: "#f87171" },
                  { key: "CANCELLED",          label: "Cancelled",         color: "#94a3b8" },
                ].map(({ key, label, color }) => {
                  const count = d.fulfillment.byStatus[key] ?? 0;
                  if (count === 0) return null;
                  return <StatusRow key={key} label={label} count={count} total={fulfillmentTotal} color={color} />;
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)" }}>No fulfillment tasks in this period.</p>
            )}
          </Section>

          {/* ── Services ── */}
          <Section title="Orders by Service (top 10)">
            {d.services.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)" }}>No orders in this period.</p>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflowX: "auto" }}>
                <table style={{ minWidth: 500 }}>
                  <thead>
                    <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                      {["Platform", "Service", "Orders", "Revenue (ETB)"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "var(--cd-gray-600)", textTransform: "uppercase", letterSpacing: 0.5, textAlign: h.includes("Revenue") || h === "Orders" ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.services.map((s, i) => (
                      <tr key={s.serviceId} style={{ borderBottom: "1px solid var(--cd-gray-100)", background: i % 2 === 0 ? "#fff" : "var(--cd-gray-50)" }}>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--cd-gray-600)" }}>{s.platform}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{s.serviceName}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{s.orderCount.toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "var(--cd-red)", fontFamily: "var(--font-heading)" }}>
                          {etbDisplay(s.revenueETB)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ── Campaigns ── */}
          <Section title="Campaigns">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Status breakdown */}
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                  By Status
                </h3>
                {campaignTotal === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--cd-gray-500)" }}>No campaigns in this period.</p>
                ) : [
                  { key: "ACTIVE",     label: "Active",     color: "#22c55e" },
                  { key: "COMPLETED",  label: "Completed",  color: "#34d399" },
                  { key: "PENDING",    label: "Pending",    color: "#fbbf24" },
                  { key: "PAUSED",     label: "Paused",     color: "#f59e0b" },
                  { key: "DRAFT",      label: "Draft",      color: "#94a3b8" },
                  { key: "FAILED",     label: "Failed",     color: "#f87171" },
                  { key: "CANCELLED",  label: "Cancelled",  color: "#cbd5e1" },
                ].map(({ key, label, color }) => {
                  const count = d.campaigns.byStatus[key] ?? 0;
                  if (count === 0) return null;
                  return <StatusRow key={key} label={label} count={count} total={campaignTotal} color={color} />;
                })}
              </div>

              {/* Aggregated metrics */}
              <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                  Campaign Metrics Totals
                </h3>
                {!d.campaigns.metricsAggregate ? (
                  <p style={{ fontSize: 13, color: "var(--cd-gray-500)" }}>No metrics recorded in this period.</p>
                ) : (
                  <>
                    <MetricLine label="Metric snapshots" value={d.campaigns.metricsAggregate.snapshotCount} />
                    <MetricLine label="Total impressions" value={d.campaigns.metricsAggregate.impressions} />
                    <MetricLine label="Total reach" value={d.campaigns.metricsAggregate.reach} />
                    <MetricLine label="Total clicks" value={d.campaigns.metricsAggregate.clicks} />
                    <MetricLine label="Total video views" value={d.campaigns.metricsAggregate.videoViews} />
                    <MetricLine label="Total likes" value={d.campaigns.metricsAggregate.likes} />
                    <MetricLine label="Total comments" value={d.campaigns.metricsAggregate.comments} />
                    <MetricLine label="Total shares" value={d.campaigns.metricsAggregate.shares} />
                    <MetricLine label="Total engagement" value={d.campaigns.metricsAggregate.engagement} />
                    <MetricLine label="Total conversions" value={d.campaigns.metricsAggregate.conversions} />
                    {d.campaigns.metricsAggregate.spendETB > 0 && (
                      <MetricLine label="Total spend" value={`${etbDisplay(d.campaigns.metricsAggregate.spendETB)} ETB`} />
                    )}
                  </>
                )}
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
