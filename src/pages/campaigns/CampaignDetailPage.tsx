import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAdminAuthStore } from "@/store/auth.store";
import { SendIcon } from "@/components/ui/Icon";

interface Metric {
  id: string; date: string; source: string;
  impressions: number | null; reach: number | null; clicks: number | null;
  videoViews: number | null; likes: number | null; comments: number | null;
  shares: number | null; engagement: number | null; conversions: number | null;
  spendETB: number | null; createdAt: string; updatedAt: string;
}

interface CampaignDetail {
  id: string; internalStatus: string; provider: string;
  objective: string | null; targetUrl: string;
  budgetETB: number | null; dailyBudgetETB: number | null;
  durationDays: number | null; startDate: string | null; endDate: string | null;
  createdAt: string; updatedAt: string;
  order: {
    id: string; orderNumber: string; targetUrl: string; totalAmountETB: number;
    orderStatus: string; fulfillmentStatus: string;
    service: { name: string; targetLabel: string; platform: { name: string } };
    package: { name: string; quantity: number; deliveryDaysMin: number; deliveryDaysMax: number };
    user: { id: string; firstName: string; lastName: string; username: string | null; telegramIdentity: { telegramUserId: string } | null };
  };
  fulfillmentTask: { id: string; status: string; fulfillmentType: string; startedAt: string | null; completedAt: string | null } | null;
  metrics: Metric[];
  reports: Array<{ id: string; title: string; status: string; publishedAt: string | null; createdAt: string }>;
}

const STATUS_TRANSITIONS: Record<string, Array<{ label: string; next: string; variant: "primary" | "success" | "danger" | "secondary" }>> = {
  DRAFT:      [{ label: "Mark Pending",  next: "PENDING",   variant: "primary"   }],
  PENDING:    [{ label: "Activate",      next: "ACTIVE",    variant: "success"   }, { label: "Cancel",     next: "CANCELLED", variant: "danger" }],
  ACTIVE:     [{ label: "Pause",         next: "PAUSED",    variant: "secondary" }, { label: "Complete",   next: "COMPLETED", variant: "success"  }, { label: "Mark Failed", next: "FAILED",    variant: "danger" }],
  PAUSED:     [{ label: "Resume",        next: "ACTIVE",    variant: "success"   }, { label: "Cancel",     next: "CANCELLED", variant: "danger" }],
  FAILED:     [{ label: "Re-activate",   next: "ACTIVE",    variant: "primary"   }, { label: "Cancel",     next: "CANCELLED", variant: "danger" }],
};

function FeedbackBanner({ type, message, onDismiss }: { type: "success" | "error"; message: string; onDismiss: () => void }) {
  return (
    <div style={{
      marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-sm)",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: type === "success" ? "#dcfce7" : "#fee2e2",
      border: `1px solid ${type === "success" ? "#86efac" : "#fca5a5"}`,
      fontSize: 13, color: type === "success" ? "#166534" : "#991b1b",
    }}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", color: "inherit", fontSize: 16 }}>×</button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
      <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.6 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

const EMPTY_METRICS = { date: "", source: "MANUAL", impressions: "", reach: "", clicks: "", videoViews: "", likes: "", comments: "", shares: "", engagement: "", conversions: "", spendETB: "" };

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";

  const [pendingStatus, setPendingStatus] = useState<{ label: string; next: string; variant: "primary" | "success" | "danger" | "secondary" } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showMetricsForm, setShowMetricsForm] = useState(false);
  const [metricsForm, setMetricsForm] = useState(EMPTY_METRICS);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["admin-campaign", id],
    queryFn: () => api.get<{ success: boolean; data: CampaignDetail }>(`/admin/campaigns/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/admin/campaigns/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaign", id] });
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setPendingStatus(null);
      setFeedback({ type: "success", message: "Campaign status updated." });
    },
    onError: (err: unknown) => {
      setPendingStatus(null);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Status update failed.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const metricsMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post(`/admin/campaigns/${id}/metrics`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaign", id] });
      setShowMetricsForm(false);
      setMetricsForm(EMPTY_METRICS);
      setFeedback({ type: "success", message: "Metrics saved successfully." });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to save metrics.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const handleMetricsSubmit = () => {
    const toInt = (v: string) => v === "" ? undefined : Math.round(parseFloat(v));
    metricsMutation.mutate({
      date:        metricsForm.date,
      source:      metricsForm.source,
      impressions: toInt(metricsForm.impressions),
      reach:       toInt(metricsForm.reach),
      clicks:      toInt(metricsForm.clicks),
      videoViews:  toInt(metricsForm.videoViews),
      likes:       toInt(metricsForm.likes),
      comments:    toInt(metricsForm.comments),
      shares:      toInt(metricsForm.shares),
      engagement:  toInt(metricsForm.engagement),
      conversions: toInt(metricsForm.conversions),
      spendETB:    metricsForm.spendETB === "" ? undefined : Math.round(parseFloat(metricsForm.spendETB) * 100),
    });
  };

  if (isLoading) return <div style={{ padding: 28 }}><Spinner /></div>;
  if (!campaign) return <div style={{ padding: 28 }}>Campaign not found.</div>;

  const actions = STATUS_TRANSITIONS[campaign.internalStatus] ?? [];

  return (
    <div style={{ padding: 28, maxWidth: 1000, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title={`Campaign — ${campaign.order.orderNumber}`}
        subtitle={`${campaign.order.service.platform.name} · ${campaign.order.service.name}`}
        actions={
          <button type="button" onClick={() => navigate("/campaigns")} style={{ fontSize: 13, color: "var(--cd-gray-600)", cursor: "pointer" }}>← Back</button>
        }
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Status strip */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "var(--shadow-sm)", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div><div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Campaign</div><StatusBadge status={campaign.internalStatus} /></div>
        <div><div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Order</div><StatusBadge status={campaign.order.orderStatus} /></div>
        <div><div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Fulfillment</div><StatusBadge status={campaign.order.fulfillmentStatus} /></div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--cd-gray-500)", marginBottom: 4 }}>Provider</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{campaign.provider}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* ── Left ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Campaign info */}
          <Card title="Campaign Details">
            {campaign.objective && <InfoRow label="Objective" value={campaign.objective} />}
            <InfoRow label="Target URL" value={<a href={campaign.targetUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cd-red)", wordBreak: "break-all" }}>{campaign.targetUrl}</a>} />
            <InfoRow label="Start" value={campaign.startDate ? formatDateTime(campaign.startDate) : "—"} />
            <InfoRow label="End" value={campaign.endDate ? formatDateTime(campaign.endDate) : "—"} />
            {campaign.durationDays && <InfoRow label="Duration" value={`${campaign.durationDays} days`} />}
            {campaign.budgetETB && <InfoRow label="Budget" value={`${etbDisplay(campaign.budgetETB)} ETB`} />}
            {campaign.dailyBudgetETB && <InfoRow label="Daily Budget" value={`${etbDisplay(campaign.dailyBudgetETB)} ETB`} />}
          </Card>

          {/* Customer */}
          <Card title="Customer">
            <InfoRow label="Name" value={`${campaign.order.user.firstName} ${campaign.order.user.lastName}`} />
            <InfoRow label="Username" value={
              campaign.order.user.username
                ? <a href={`https://t.me/${campaign.order.user.username}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    @{campaign.order.user.username}<SendIcon size={11} color="var(--cd-red)" />
                  </a>
                : "—"
            } />
            <InfoRow label="Telegram ID" value={campaign.order.user.telegramIdentity?.telegramUserId ?? "—"} />
            <button type="button" onClick={() => navigate(`/customers/${campaign.order.user.id}`)} style={{ marginTop: 10, fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
              View customer →
            </button>
          </Card>

          {/* Order */}
          <Card title="Order" action={
            <button type="button" onClick={() => navigate(`/orders/${campaign.order.id}`)} style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View order →</button>
          }>
            <InfoRow label="Order #" value={campaign.order.orderNumber} />
            <InfoRow label="Service" value={campaign.order.service.name} />
            <InfoRow label="Package" value={campaign.order.package.name} />
            <InfoRow label="Quantity" value={campaign.order.package.quantity.toLocaleString()} />
            <InfoRow label="Amount" value={`${etbDisplay(campaign.order.totalAmountETB)} ETB`} />
          </Card>

          {/* Status actions */}
          {canManage && actions.length > 0 && (
            <Card title="Actions">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actions.map(a => (
                  <Button key={a.next} type="button" variant={a.variant} size="md" fullWidth onClick={() => setPendingStatus(a)}>
                    {a.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Reports */}
          {campaign.reports.length > 0 && (
            <Card title="Reports" action={
              <button type="button" onClick={() => navigate("/reports")} style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>All reports →</button>
            }>
              {campaign.reports.map(r => (
                <div key={r.id} onClick={() => navigate(`/reports/${r.id}`)} style={{ padding: "8px 0", borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 2 }}>{formatDateTime(r.createdAt)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* ── Right: Metrics ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <Card title={`Metrics (${campaign.metrics.length} snapshots)`} action={
            canManage
              ? <button type="button" onClick={() => setShowMetricsForm(v => !v)} style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {showMetricsForm ? "Cancel" : "+ Add / Update"}
                </button>
              : undefined
          }>
            {/* Metrics entry form */}
            {showMetricsForm && canManage && (
              <div style={{ marginBottom: 16, padding: 14, background: "var(--cd-gray-50)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {/* Date */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="m-date" style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 3 }}>Date (YYYY-MM-DD) *</label>
                    <input id="m-date" type="date" value={metricsForm.date} onChange={e => setMetricsForm(f => ({ ...f, date: e.target.value }))} style={{ width: "100%", padding: "6px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                  </div>
                  {/* Source */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="m-source" style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 3 }}>Source</label>
                    <select id="m-source" value={metricsForm.source} onChange={e => setMetricsForm(f => ({ ...f, source: e.target.value }))} style={{ width: "100%", padding: "6px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                      <option value="MANUAL">Manual (Verified)</option>
                      <option value="PROVIDER_API">Provider API</option>
                    </select>
                  </div>
                  {[
                    ["impressions", "Impressions"], ["reach", "Reach"], ["clicks", "Clicks"],
                    ["videoViews", "Video Views"], ["likes", "Likes"], ["comments", "Comments"],
                    ["shares", "Shares"], ["engagement", "Engagement"], ["conversions", "Conversions"],
                    ["spendETB", "Spend (ETB)"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label htmlFor={`m-${key}`} style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 3 }}>{label}</label>
                      <input
                        id={`m-${key}`}
                        type="number"
                        min="0"
                        step={key === "spendETB" ? "0.01" : "1"}
                        value={(metricsForm as Record<string, string>)[key]}
                        onChange={e => setMetricsForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder="—"
                        style={{ width: "100%", padding: "6px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={metricsMutation.isPending}
                  disabled={!metricsForm.date}
                  onClick={handleMetricsSubmit}
                >
                  Save Metrics
                </Button>
                <p style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>
                  Leave fields blank to omit them. Existing entries for the same date+source will be overwritten.
                </p>
              </div>
            )}

            {/* Metrics table */}
            {campaign.metrics.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", textAlign: "center", padding: "24px 0" }}>No metrics recorded yet</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 360 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--cd-gray-100)" }}>
                      {["Date", "Source", "Likes", "Views", "Engagement", "Reach", "Impressions"].map(h => (
                        <th key={h} style={{ padding: "5px 8px", fontSize: 10, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap", textAlign: "right" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.metrics.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid var(--cd-gray-100)" }}>
                        <td style={{ padding: "7px 8px", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(m.date).toLocaleDateString()}</td>
                        <td style={{ padding: "7px 8px" }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: m.source === "MANUAL" ? "#854d0e" : "#1e40af", background: m.source === "MANUAL" ? "#fef9c3" : "#dbeafe", padding: "1px 5px", borderRadius: 999 }}>
                            {m.source === "MANUAL" ? "Manual" : "API"}
                          </span>
                        </td>
                        {[m.likes, m.videoViews, m.engagement, m.reach, m.impressions].map((v, i) => (
                          <td key={i} style={{ padding: "7px 8px", fontSize: 12, textAlign: "right", fontWeight: v != null ? 600 : 400, color: v != null ? "var(--cd-navy)" : "var(--cd-gray-300)" }}>
                            {v != null ? v.toLocaleString() : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Status confirm modal */}
      {pendingStatus && (
        <ConfirmModal
          open
          title={pendingStatus.label}
          body={`Change campaign status to ${pendingStatus.next}?`}
          confirmLabel={pendingStatus.label}
          confirmVariant={pendingStatus.variant === "secondary" ? "primary" : pendingStatus.variant as "primary" | "success" | "danger"}
          loading={statusMutation.isPending}
          details={[
            { label: "Order", value: campaign.order.orderNumber },
            { label: "Current Status", value: campaign.internalStatus },
            { label: "New Status", value: pendingStatus.next },
          ]}
          onConfirm={() => statusMutation.mutate(pendingStatus.next)}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </div>
  );
}
