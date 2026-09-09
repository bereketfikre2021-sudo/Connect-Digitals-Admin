import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAdminAuthStore } from "@/store/auth.store";
import { SendIcon, ExternalLinkIcon } from "@/components/ui/Icon";
import { useState } from "react";

interface OrderDetail {
  id: string;
  orderNumber: string;
  targetUrl: string;
  targetType: string;
  quantity: number;
  unitPriceETB: number;
  totalAmountETB: number;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string | null;
    telegramIdentity: { telegramUserId: string } | null;
  };
  service: {
    id: string;
    name: string;
    slug: string;
    targetLabel: string;
    platform: { name: string; slug: string };
  };
  package: {
    id: string;
    name: string;
    quantity: number;
    priceETB: number;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
  };
  payments: Array<{
    id: string;
    status: string;
    amountETB: number;
    reference: string;
    createdAt: string;
    reviewedAt: string | null;
    rejectionReason: string | null;
    paymentMethod: { name: string };
  }>;
  fulfillmentTask: {
    id: string;
    status: string;
    fulfillmentType: string;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    assignee: { firstName: string; lastName: string } | null;
  } | null;
  campaign: {
    id: string;
    internalStatus: string;
    provider: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  reports: Array<{ id: string; title: string; publishedAt: string | null }>;
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: "1px solid var(--cd-gray-100)",
    }}>
      <span style={{ fontSize: 12, color: "var(--cd-gray-600)", flexShrink: 0, paddingRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", wordBreak: "break-all", fontFamily: mono ? "monospace" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
      <h3 style={{
        fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 700,
        color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.6,
        marginBottom: 12,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundFeedback, setRefundFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () =>
      api.get<{ success: boolean; data: OrderDetail }>(`/admin/orders/${id}`)
        .then(r => r.data.data),
    enabled: !!id,
    retry: (failureCount, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  const refundMutation = useMutation({
    mutationFn: () => api.post(`/admin/orders/${id}/refund`, { reason: refundReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setShowRefundModal(false);
      setRefundReason("");
      setRefundFeedback({ type: "success", message: "Refund issued successfully. Customer wallet has been credited." });
    },
    onError: (err: unknown) => {
      setShowRefundModal(false);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Refund failed. Please try again.";
      setRefundFeedback({ type: "error", message: msg });
    },
  });

  if (isLoading) return <div style={{ padding: 28 }}><Spinner /></div>;
  if (isError) return (
    <div style={{ padding: 28 }}>
      <div style={{ background: "#fef2f2", borderRadius: 12, padding: 24, maxWidth: 480, color: "#991b1b" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Order not found</div>
        <div style={{ fontSize: 13 }}>This order may have been deleted, or you may not have permission to view it.</div>
        <button type="button" onClick={() => navigate("/orders")} style={{ marginTop: 14, fontSize: 13, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>← Back to Orders</button>
      </div>
    </div>
  );
  if (!order) return <div style={{ padding: 28 }}><Spinner /></div>;

  const latestPayment = order.payments[0] ?? null;
  const canRefund = isSuperAdmin
    && ["COMPLETED", "CANCELLED"].includes(order.orderStatus)
    && order.paymentStatus === "APPROVED";

  return (
    <div style={{ padding: 28, maxWidth: 960, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`${order.service.platform.name} — ${order.service.name}`}
        actions={
          <button
            type="button"
            onClick={() => navigate("/orders")}
            style={{ fontSize: 13, color: "var(--cd-gray-600)", cursor: "pointer" }}
          >
            ← Back
          </button>
        }
      />

      {refundFeedback && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-sm)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: refundFeedback.type === "success" ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${refundFeedback.type === "success" ? "#86efac" : "#fca5a5"}`,
          fontSize: 13, color: refundFeedback.type === "success" ? "#166534" : "#991b1b",
        }}>
          <span>{refundFeedback.message}</span>
          <button type="button" onClick={() => setRefundFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", color: "inherit", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Status strip */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 20px",
        boxShadow: "var(--shadow-sm)", marginBottom: 16,
        display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Order</div>
          <StatusBadge status={order.orderStatus} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Payment</div>
          <StatusBadge status={order.paymentStatus} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Fulfillment</div>
          <StatusBadge status={order.fulfillmentStatus} />
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Total</div>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, color: "var(--cd-red)" }}>
            {etbDisplay(order.totalAmountETB)} ETB
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Customer */}
          <Card title="Customer">
            <InfoRow label="Name" value={`${order.user.firstName} ${order.user.lastName}`} />
            <InfoRow
              label="Username"
              value={
                order.user.username
                  ? (
                    <a
                      href={`https://t.me/${order.user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                      aria-label={`Open Telegram chat with @${order.user.username}`}
                    >
                      @{order.user.username}
                      <SendIcon size={11} color="var(--cd-red)" />
                    </a>
                  )
                  : "—"
              }
            />
            <InfoRow label="Telegram ID" value={order.user.telegramIdentity?.telegramUserId ?? "—"} />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => navigate(`/customers/${order.user.id}`)}
                style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
              >
                View customer profile →
              </button>
              <span style={{ color: "var(--cd-gray-300)" }}>·</span>
              <button
                type="button"
                onClick={() => navigate(`/wallets/${order.user.id}`)}
                style={{ fontSize: 12, color: "var(--cd-gray-600)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Wallet →
              </button>
            </div>
          </Card>

          {/* Service & Package */}
          <Card title="Service & Package">
            <InfoRow label="Platform" value={order.service.platform.name} />
            <InfoRow label="Service" value={order.service.name} />
            <InfoRow label="Package" value={order.package.name} />
            <InfoRow label="Quantity" value={order.package.quantity.toLocaleString()} />
            <InfoRow label="Delivery" value={`${order.package.deliveryDaysMin}–${order.package.deliveryDaysMax} days`} />
          </Card>

          {/* Target */}
          <Card title={order.service.targetLabel || "Target"}>
            <div style={{ fontSize: 12, color: "var(--cd-gray-600)", marginBottom: 6 }}>Target type: {order.targetType}</div>
            <a
              href={order.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--cd-red)", fontSize: 13, wordBreak: "break-all", display: "inline-flex", alignItems: "flex-start", gap: 4 }}
            >
              {order.targetUrl}
              <ExternalLinkIcon size={12} color="var(--cd-red)" style={{ marginTop: 2, flexShrink: 0 }} />
            </a>
            {order.notes && (
              <div style={{ marginTop: 12, padding: "8px 10px", background: "var(--cd-gray-50)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--cd-gray-700)" }}>
                <strong style={{ display: "block", marginBottom: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Notes</strong>
                {order.notes}
              </div>
            )}
          </Card>

          {/* Dates */}
          <Card title="Dates">
            <InfoRow label="Created" value={formatDateTime(order.createdAt)} />
            <InfoRow label="Updated" value={formatDateTime(order.updatedAt)} />
            <InfoRow label="Completed" value={order.completedAt ? formatDateTime(order.completedAt) : "—"} />
          </Card>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Payment history */}
          <Card title={`Payments (${order.payments.length})`}>
            {order.payments.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", textAlign: "center", padding: "16px 0" }}>No payments</p>
            ) : order.payments.map((p, i) => (
              <div
                key={p.id}
                style={{
                  padding: "10px 0",
                  borderBottom: i < order.payments.length - 1 ? "1px solid var(--cd-gray-100)" : undefined,
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/payments/${p.id}`)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <StatusBadge status={p.status} />
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "var(--cd-red)" }}>
                    {etbDisplay(p.amountETB)} ETB
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>
                  {p.paymentMethod.name} · <span style={{ fontFamily: "monospace" }}>{p.reference}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 2 }}>
                  {formatDateTime(p.createdAt)}
                  {p.rejectionReason && (
                    <span style={{ color: "#dc2626", marginLeft: 8 }}>Rejected: {p.rejectionReason}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--cd-red)", marginTop: 2, fontWeight: 600 }}>View payment →</div>
              </div>
            ))}
            {latestPayment && (
              <button
                type="button"
                onClick={() => navigate(`/payments/${latestPayment.id}`)}
                style={{ marginTop: 10, fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
              >
                Open in Payments →
              </button>
            )}
          </Card>

          {/* Fulfillment task */}
          <Card title="Fulfillment">
            {!order.fulfillmentTask ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", textAlign: "center", padding: "16px 0" }}>
                No fulfillment task yet
              </p>
            ) : (
              <>
                <InfoRow label="Status" value={<StatusBadge status={order.fulfillmentTask.status} />} />
                <InfoRow label="Type" value={order.fulfillmentTask.fulfillmentType} />
                <InfoRow label="Created" value={formatDateTime(order.fulfillmentTask.createdAt)} />
                <InfoRow
                  label="Started"
                  value={order.fulfillmentTask.startedAt ? formatDateTime(order.fulfillmentTask.startedAt) : "—"}
                />
                <InfoRow
                  label="Completed"
                  value={order.fulfillmentTask.completedAt ? formatDateTime(order.fulfillmentTask.completedAt) : "—"}
                />
                <InfoRow
                  label="Assigned"
                  value={
                    order.fulfillmentTask.assignee
                      ? `${order.fulfillmentTask.assignee.firstName} ${order.fulfillmentTask.assignee.lastName}`
                      : "Unassigned"
                  }
                />
                <button
                  type="button"
                  onClick={() => navigate(`/fulfillment/${order.fulfillmentTask!.id}`)}
                  style={{ marginTop: 10, fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                >
                  Open in Fulfillment →
                </button>
              </>
            )}
          </Card>

          {/* Campaign — only shown if one exists for this order */}
          {order.campaign && (
            <Card title="Campaign">
              <InfoRow label="Status" value={<StatusBadge status={order.campaign.internalStatus} />} />
              <InfoRow label="Provider" value={order.campaign.provider} />
              <InfoRow
                label="Start"
                value={order.campaign.startDate ? formatDateTime(order.campaign.startDate) : "—"}
              />
              <InfoRow
                label="End"
                value={order.campaign.endDate ? formatDateTime(order.campaign.endDate) : "—"}
              />
              <button
                type="button"
                onClick={() => navigate(`/campaigns/${order.campaign!.id}`)}
                style={{ marginTop: 10, fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
              >
                Open Campaign →
              </button>
            </Card>
          )}

          {/* Reports */}
          {order.reports.length > 0 && (
            <Card title="Reports">
              {order.reports.map(r => (
                <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                  {r.publishedAt && (
                    <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 2 }}>
                      Published {formatDateTime(r.publishedAt)}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* Refund — SUPER_ADMIN only, eligible orders only */}
          {canRefund && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)", border: "1px solid #fde68a" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
                Issue Refund
              </h3>
              <p style={{ fontSize: 12, color: "var(--cd-gray-600)", marginBottom: 14, lineHeight: 1.5 }}>
                Refund {etbDisplay(latestPayment?.amountETB ?? order.totalAmountETB)} ETB to the customer's wallet.
                This action cannot be undone.
              </p>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="refund-reason" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Reason <span style={{ color: "var(--cd-red)" }}>*</span>
                </label>
                <textarea
                  id="refund-reason"
                  rows={2}
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="Explain why the refund is being issued…"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, resize: "vertical", fontFamily: "var(--font-body)" }}
                />
              </div>
              <Button
                type="button"
                variant="danger"
                size="md"
                fullWidth
                disabled={refundReason.trim().length < 5}
                onClick={() => setShowRefundModal(true)}
              >
                Issue Refund
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Refund confirmation modal */}
      <ConfirmModal
        open={showRefundModal}
        title="Issue Refund"
        body="The customer's wallet will be credited immediately. This action cannot be undone."
        confirmLabel="Confirm Refund"
        confirmVariant="danger"
        loading={refundMutation.isPending}
        details={[
          { label: "Order", value: order.orderNumber },
          { label: "Amount", value: `${etbDisplay(latestPayment?.amountETB ?? order.totalAmountETB)} ETB` },
          { label: "Customer", value: `${order.user.firstName} ${order.user.lastName}` },
          { label: "Reason", value: refundReason || "—" },
        ]}
        onConfirm={() => refundMutation.mutate()}
        onCancel={() => setShowRefundModal(false)}
      />
    </div>
  );
}
