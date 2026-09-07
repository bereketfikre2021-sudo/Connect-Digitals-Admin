import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { api, etbDisplay } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";

// ── Types ────────────────────────────────────────────────────────────────────
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
    deposits:      { totalETB: number; count: number };
    orderPayments: { totalETB: number; count: number };
    currentBalances: { totalETB: number; averageETB: number; walletCount: number };
  };
  fulfillment: { byStatus: Record<string, number> };
  campaigns:   { byStatus: Record<string, number>; metricsAggregate: Record<string, number> | null };
  services: Array<{ serviceId: string; serviceName: string; platform: string; orderCount: number; revenueETB: number }>;
}

// ── Colours ───────────────────────────────────────────────────────────────────
const CD_RED    = "#EC1C24";
const CD_NAVY   = "#000F33";
const CD_GOLD   = "#D4AF37";
const COLORS    = [CD_RED, CD_NAVY, CD_GOLD, "#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#ec4899"];

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={{ fontSize: 11, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, color: CD_NAVY, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 20px 16px", boxShadow: "var(--shadow-sm)" }}>
      <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: CD_NAVY, marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Last 7 days",  from: daysAgo(6),  to: today() },
  { label: "Last 30 days", from: daysAgo(29), to: today() },
  { label: "Last 90 days", from: daysAgo(89), to: today() },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const [preset, setPreset] = useState(1); // default 30 days
  const [from, setFrom]     = useState(PRESETS[1]!.from);
  const [to, setTo]         = useState(PRESETS[1]!.to);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", from, to],
    queryFn: () =>
      api.get<{ success: boolean; data: AnalyticsData }>(`/admin/analytics?from=${from}&to=${to}`)
        .then(r => r.data.data),
    staleTime: 60_000,
  });

  function applyPreset(idx: number) {
    setPreset(idx);
    setFrom(PRESETS[idx]!.from);
    setTo(PRESETS[idx]!.to);
  }

  // ── Derived chart data ────────────────────────────────────────────────────
  const orderStatusData = data
    ? Object.entries(data.orders.byStatus).map(([status, count]) => ({ name: status.replace(/_/g, " "), value: count }))
    : [];

  const fulfillmentData = data
    ? Object.entries(data.fulfillment.byStatus).map(([status, count]) => ({ name: status, value: count }))
    : [];

  const paymentStatusData = data
    ? Object.entries(data.payments.byStatus).map(([status, d]) => ({
        name: status.replace(/_/g, " "),
        count: d.count,
        revenueETB: +(d.totalETB / 100).toFixed(2),
      }))
    : [];

  const topServicesData = data?.services.slice(0, 8).map(s => ({
    name: s.serviceName.length > 20 ? s.serviceName.slice(0, 18) + "…" : s.serviceName,
    orders:   s.orderCount,
    revenue:  +(s.revenueETB / 100).toFixed(2),
  })) ?? [];

  const walletFlowData = data ? [
    { name: "Deposits",      ETB: +(data.wallet.deposits.totalETB / 100).toFixed(2) },
    { name: "Order Payments",ETB: +(data.wallet.orderPayments.totalETB / 100).toFixed(2) },
    { name: "Total Balances",ETB: +(data.wallet.currentBalances.totalETB / 100).toFixed(2) },
  ] : [];

  const campaignMetrics = data?.campaigns.metricsAggregate;
  const metricsBarData = campaignMetrics ? [
    { name: "Impressions", value: campaignMetrics["impressions"] ?? 0 },
    { name: "Reach",       value: campaignMetrics["reach"]       ?? 0 },
    { name: "Clicks",      value: campaignMetrics["clicks"]      ?? 0 },
    { name: "Likes",       value: campaignMetrics["likes"]       ?? 0 },
    { name: "Comments",    value: campaignMetrics["comments"]    ?? 0 },
    { name: "Shares",      value: campaignMetrics["shares"]      ?? 0 },
    { name: "Engagement",  value: campaignMetrics["engagement"]  ?? 0 },
  ] : [];

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Analytics" subtitle="Platform performance overview" />

      {/* Date range controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(i)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: preset === i ? CD_RED : "#fff",
              color:      preset === i ? "#fff" : "var(--cd-gray-600)",
              border:     `1.5px solid ${preset === i ? CD_RED : "var(--cd-gray-300)"}`,
            }}
          >
            {p.label}
          </button>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <input type="date" value={from} max={to} onChange={e => { setFrom(e.target.value); setPreset(-1); }}
            style={{ padding: "5px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: 6, fontSize: 12 }} />
          <span style={{ fontSize: 12, color: "var(--cd-gray-500)" }}>→</span>
          <input type="date" value={to} min={from} max={today()} onChange={e => { setTo(e.target.value); setPreset(-1); }}
            style={{ padding: "5px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: 6, fontSize: 12 }} />
        </div>
      </div>

      {isLoading ? <Spinner /> : !data ? null : (
        <>
          {/* ── KPI strip ──────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <KpiCard label="Total Customers"  value={data.customers.total.toLocaleString()} sub={`+${data.customers.newInRange} new`} />
            <KpiCard label="Orders in Period" value={data.orders.total.toLocaleString()} sub={`${data.orders.completedInRange} completed`} />
            <KpiCard label="Revenue (ETB)"    value={etbDisplay(data.payments.approvedRevenue.totalETB)} sub={`${data.payments.approvedRevenue.count} payments`} />
            <KpiCard label="Under Review"     value={data.payments.underReview.count.toLocaleString()} sub={`${etbDisplay(data.payments.underReview.totalETB)} ETB pending`} />
            <KpiCard label="Completion Rate"  value={data.orders.completionRatePct !== null ? `${data.orders.completionRatePct}%` : "—"} />
            <KpiCard label="Wallet Deposits"  value={etbDisplay(data.wallet.deposits.totalETB)} sub={`${data.wallet.deposits.count} deposits`} />
            <KpiCard label="Avg Wallet Bal"   value={etbDisplay(data.wallet.currentBalances.averageETB)} sub={`${data.wallet.currentBalances.walletCount} wallets`} />
          </div>

          {/* ── Charts row 1 ───────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            <ChartCard title="Order Status Breakdown">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {orderStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Payment Status (count + ETB)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={paymentStatusData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count"      fill={CD_RED}  name="Payments" />
                  <Bar dataKey="revenueETB" fill={CD_NAVY} name="ETB" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Charts row 2 ───────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            <ChartCard title="Top Services (orders + revenue)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topServicesData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="orders"  fill={CD_RED}  name="Orders" />
                  <Bar dataKey="revenue" fill={CD_GOLD} name="Revenue (ETB)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Wallet Flow (ETB)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={walletFlowData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="ETB" fill={CD_NAVY} name="ETB" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Charts row 3 ───────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

            <ChartCard title="Fulfillment Status">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={fulfillmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {fulfillmentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {metricsBarData.length > 0 && (
              <ChartCard title="Campaign Metrics Aggregate">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metricsBarData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill={CD_RED} name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
