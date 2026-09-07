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

interface ReportDetail {
  id: string; title: string; status: string;
  periodStart: string | null; periodEnd: string | null;
  summary: Record<string, unknown> | null;
  fileUrl: string | null; publishedAt: string | null; createdAt: string;
  order: {
    id: string; orderNumber: string; targetUrl: string; totalAmountETB: number;
    orderStatus: string;
    service: { name: string; targetLabel: string; platform: { name: string } };
    package: { name: string; quantity: number };
    user: { id: string; firstName: string; lastName: string; username: string | null; telegramIdentity: { telegramUserId: string } | null };
  };
  campaign: {
    id: string; internalStatus: string; startDate: string | null; endDate: string | null;
    metrics: Array<{
      id: string; date: string; source: string;
      impressions: number | null; reach: number | null; clicks: number | null;
      videoViews: number | null; likes: number | null; comments: number | null;
      shares: number | null; engagement: number | null; conversions: number | null; spendETB: number | null;
    }>;
  } | null;
}

function FeedbackBanner({ type, message, onDismiss }: { type: "success" | "error"; message: string; onDismiss: () => void }) {
  return (
    <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", background: type === "success" ? "#dcfce7" : "#fee2e2", border: `1px solid ${type === "success" ? "#86efac" : "#fca5a5"}`, fontSize: 13, color: type === "success" ? "#166534" : "#991b1b" }}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", color: "inherit", fontSize: 16 }}>×</button>
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
      <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();

  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPeriodStart, setEditPeriodStart] = useState("");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: report, isLoading } = useQuery({
    queryKey: ["admin-report", id],
    queryFn: () => api.get<{ success: boolean; data: ReportDetail }>(`/admin/reports/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-report", id] });
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const startEdit = () => {
    if (!report) return;
    setEditTitle(report.title);
    setEditPeriodStart(report.periodStart ? report.periodStart.slice(0, 10) : "");
    setEditPeriodEnd(report.periodEnd ? report.periodEnd.slice(0, 10) : "");
    setEditNotes((report.summary?.["notes"] as string) ?? "");
    setEditMode(true);
  };

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/admin/reports/${id}`, {
      title:       editTitle,
      periodStart: editPeriodStart ? new Date(editPeriodStart).toISOString() : null,
      periodEnd:   editPeriodEnd   ? new Date(editPeriodEnd).toISOString()   : null,
      summary:     editNotes ? { notes: editNotes } : undefined,
    }),
    onSuccess: () => { invalidate(); setEditMode(false); setFeedback({ type: "success", message: "Report updated." }); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Update failed.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/admin/reports/${id}/publish`),
    onSuccess: () => { invalidate(); setShowPublishConfirm(false); setFeedback({ type: "success", message: "Report published. Customer has been notified." }); },
    onError: (err: unknown) => {
      setShowPublishConfirm(false);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Publish failed.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.post(`/admin/reports/${id}/archive`),
    onSuccess: () => { invalidate(); setShowArchiveConfirm(false); setFeedback({ type: "success", message: "Report archived." }); },
    onError: (err: unknown) => {
      setShowArchiveConfirm(false);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Archive failed.";
      setFeedback({ type: "error", message: msg });
    },
  });

  if (isLoading) return <div style={{ padding: 28 }}><Spinner /></div>;
  if (!report) return <div style={{ padding: 28 }}>Report not found.</div>;

  const latestMetrics = report.campaign?.metrics[0];
  const summaryNotes = (report.summary?.["notes"] as string | undefined) ?? "";
  const isDraft = report.status === "DRAFT";
  const isPublished = report.status === "PUBLISHED";

  return (
    <div style={{ padding: 28, maxWidth: 900, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title={report.title}
        subtitle={`${report.order.service.platform.name} · ${report.order.service.name}`}
        actions={<button type="button" onClick={() => navigate("/reports")} style={{ fontSize: 13, color: "var(--cd-gray-600)", cursor: "pointer" }}>← Back</button>}
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Status strip */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "var(--shadow-sm)", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div><div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Report</div><StatusBadge status={report.status} /></div>
        <div><div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Order</div><StatusBadge status={report.order.orderStatus} /></div>
        {report.campaign && <div><div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Campaign</div><StatusBadge status={report.campaign.internalStatus} /></div>}
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--cd-gray-500)", marginBottom: 4 }}>Order Amount</div>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--cd-red)" }}>{etbDisplay(report.order.totalAmountETB)} ETB</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* ── Left ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Report content edit / view */}
          <Card title="Report Content" action={
            canManage && !editMode && report.status !== "ARCHIVED"
              ? <button type="button" onClick={startEdit} style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Edit</button>
              : undefined
          }>
            {editMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label htmlFor="r-title" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Title *</label>
                  <input id="r-title" type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label htmlFor="r-start" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Period Start</label>
                    <input id="r-start" type="date" value={editPeriodStart} onChange={e => setEditPeriodStart(e.target.value)} style={{ width: "100%", padding: "7px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                  </div>
                  <div>
                    <label htmlFor="r-end" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Period End</label>
                    <input id="r-end" type="date" value={editPeriodEnd} onChange={e => setEditPeriodEnd(e.target.value)} style={{ width: "100%", padding: "7px 8px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <label htmlFor="r-notes" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Notes (visible to customer)</label>
                  <textarea id="r-notes" rows={4} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Add notes about the campaign results…" style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, resize: "vertical", fontFamily: "var(--font-body)" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="button" variant="primary" size="md" loading={updateMutation.isPending} disabled={!editTitle.trim()} onClick={() => updateMutation.mutate()}>Save</Button>
                  <Button type="button" variant="ghost" size="md" onClick={() => setEditMode(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Title" value={report.title} />
                <InfoRow label="Period" value={
                  report.periodStart
                    ? `${new Date(report.periodStart).toLocaleDateString()} – ${report.periodEnd ? new Date(report.periodEnd).toLocaleDateString() : "?"}`
                    : "—"
                } />
                <InfoRow label="Created" value={formatDateTime(report.createdAt)} />
                {report.publishedAt && <InfoRow label="Published" value={formatDateTime(report.publishedAt)} />}
                {summaryNotes && (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--cd-gray-50)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
                    <p style={{ fontSize: 13, color: "var(--cd-gray-700)", lineHeight: 1.55 }}>{summaryNotes}</p>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Order + Customer */}
          <Card title="Order & Customer">
            <InfoRow label="Order #" value={
              <button type="button" onClick={() => navigate(`/orders/${report.order.id}`)} style={{ color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>{report.order.orderNumber} →</button>
            } />
            <InfoRow label="Service" value={report.order.service.name} />
            <InfoRow label="Package" value={report.order.package.name} />
            <InfoRow label="Quantity" value={report.order.package.quantity.toLocaleString()} />
            <InfoRow label="Customer" value={`${report.order.user.firstName} ${report.order.user.lastName}`} />
            <InfoRow label="Username" value={
              report.order.user.username
                ? <a href={`https://t.me/${report.order.user.username}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    @{report.order.user.username}<SendIcon size={11} color="var(--cd-red)" />
                  </a>
                : "—"
            } />
            {report.campaign && (
              <button type="button" onClick={() => navigate(`/campaigns/${report.campaign!.id}`)} style={{ marginTop: 10, fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                View campaign →
              </button>
            )}
          </Card>

          {/* Publish/archive actions */}
          {canManage && (
            <Card title="Actions">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isDraft && (
                  <Button type="button" variant="success" size="md" fullWidth onClick={() => setShowPublishConfirm(true)}>
                    Publish Report
                  </Button>
                )}
                {!isDraft && !isPublished && (
                  <Button type="button" variant="primary" size="md" fullWidth onClick={() => setShowPublishConfirm(true)}>
                    Re-publish Report
                  </Button>
                )}
                {report.status !== "ARCHIVED" && (
                  <Button type="button" variant="ghost" size="md" fullWidth onClick={() => setShowArchiveConfirm(true)}>
                    Archive
                  </Button>
                )}
                {isDraft && (
                  <p style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 4 }}>
                    Publishing will notify the customer via Telegram and make the report visible in the Mini App.
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: Campaign Metrics ── */}
        <div>
          <Card title={`Campaign Metrics${report.campaign ? ` (${report.campaign.metrics.length} snapshots)` : ""}`} action={
            report.campaign
              ? <button type="button" onClick={() => navigate(`/campaigns/${report.campaign!.id}`)} style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Add metrics →</button>
              : undefined
          }>
            {!report.campaign ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", textAlign: "center", padding: "24px 0" }}>No campaign linked to this order.</p>
            ) : !latestMetrics ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", textAlign: "center", padding: "24px 0" }}>No metrics recorded yet. Go to the campaign to add metrics.</p>
            ) : (
              <>
                {/* Latest snapshot highlight */}
                <div style={{ background: "var(--cd-gray-50)", borderRadius: "var(--radius-sm)", padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                    Latest: {new Date(latestMetrics.date).toLocaleDateString()}
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: latestMetrics.source === "MANUAL" ? "#854d0e" : "#1e40af", background: latestMetrics.source === "MANUAL" ? "#fef9c3" : "#dbeafe", padding: "1px 6px", borderRadius: 999 }}>
                      {latestMetrics.source === "MANUAL" ? "Manually Verified" : "Provider API"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Likes", value: latestMetrics.likes },
                      { label: "Video Views", value: latestMetrics.videoViews },
                      { label: "Engagement", value: latestMetrics.engagement },
                      { label: "Reach", value: latestMetrics.reach },
                      { label: "Impressions", value: latestMetrics.impressions },
                      { label: "Clicks", value: latestMetrics.clicks },
                    ].map(({ label, value }) => value != null ? (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--cd-navy)" }}>{value.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 }}>{label}</div>
                      </div>
                    ) : null)}
                  </div>
                  {latestMetrics.spendETB != null && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--cd-gray-600)", borderTop: "1px solid var(--cd-gray-200)", paddingTop: 8 }}>
                      Spend: <strong>{etbDisplay(latestMetrics.spendETB)} ETB</strong>
                    </div>
                  )}
                </div>

                {/* All snapshots compact */}
                {report.campaign.metrics.length > 1 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ minWidth: 300, fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--cd-gray-200)" }}>
                          {["Date", "Likes", "Views", "Engagement", "Reach"].map(h => (
                            <th key={h} style={{ padding: "4px 8px", fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.4, textAlign: "right" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.campaign.metrics.map(m => (
                          <tr key={m.id} style={{ borderBottom: "1px solid var(--cd-gray-100)" }}>
                            <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>{new Date(m.date).toLocaleDateString()}</td>
                            {[m.likes, m.videoViews, m.engagement, m.reach].map((v, i) => (
                              <td key={i} style={{ padding: "5px 8px", textAlign: "right", color: v != null ? "var(--cd-navy)" : "var(--cd-gray-300)", fontWeight: v != null ? 600 : 400 }}>
                                {v != null ? v.toLocaleString() : "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Publish confirm */}
      <ConfirmModal
        open={showPublishConfirm}
        title="Publish Report"
        body="This will make the report visible to the customer in the Mini App and send them a Telegram notification."
        confirmLabel="Publish"
        confirmVariant="success"
        loading={publishMutation.isPending}
        details={[
          { label: "Report", value: report.title },
          { label: "Customer", value: `${report.order.user.firstName} ${report.order.user.lastName}` },
          { label: "Order", value: report.order.orderNumber },
        ]}
        onConfirm={() => publishMutation.mutate()}
        onCancel={() => setShowPublishConfirm(false)}
      />

      {/* Archive confirm */}
      <ConfirmModal
        open={showArchiveConfirm}
        title="Archive Report"
        body="The report will be archived and can no longer be edited or published."
        confirmLabel="Archive"
        confirmVariant="danger"
        loading={archiveMutation.isPending}
        details={[{ label: "Report", value: report.title }]}
        onConfirm={() => archiveMutation.mutate()}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </div>
  );
}
