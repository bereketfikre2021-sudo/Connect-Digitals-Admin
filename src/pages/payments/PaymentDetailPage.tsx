import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckIcon, XIcon, SendIcon } from "@/components/ui/Icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAdminAuthStore } from "@/store/auth.store";

interface PaymentDetail {
  id: string; amountETB: number; reference: string; status: string;
  createdAt: string; reviewedAt: string | null; rejectionReason: string | null;
  proofSignedUrl: string | null;
  user: {
    id: string; firstName: string; lastName: string; username: string | null;
    telegramIdentity: { telegramUserId: string } | null;
  };
  order: {
    id: string; orderNumber: string; targetUrl: string; targetType: string;
    totalAmountETB: number; orderStatus: string;
    service: { name: string; platform: { name: string } };
    package: { name: string; quantity: number };
  } | null;
  paymentMethod: { id: string; name: string };
  reviewer: { firstName: string; lastName: string } | null;
}

type ModalState =
  | { type: "approve" }
  | { type: "reject" }
  | null;

/** Inline success/error banner shown after a mutation completes */
function FeedbackBanner({ type, message, onDismiss }: {
  type: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div style={{
      marginBottom: 16,
      padding: "10px 14px",
      borderRadius: "var(--radius-sm)",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: type === "success" ? "#dcfce7" : "#fee2e2",
      border: `1px solid ${type === "success" ? "#86efac" : "#fca5a5"}`,
      fontSize: 13,
      color: type === "success" ? "#166534" : "#991b1b",
    }}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", color: "inherit", fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Only SUPER_ADMIN and ADMIN may approve/reject
  const canReview = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";

  const { data: payment, isLoading } = useQuery({
    queryKey: ["admin-payment", id],
    queryFn: () =>
      api.get<{ success: boolean; data: PaymentDetail }>(`/admin/payments/${id}`)
        .then(r => r.data.data),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-payment", id] });
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/admin/payments/${id}/approve`),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setFeedback({ type: "success", message: "Payment approved. Order has been advanced to fulfillment." });
    },
    onError: (err: unknown) => {
      setModal(null);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Approval failed. Please try again.";
      setFeedback({ type: "error", message: msg });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/admin/payments/${id}/reject`, { rejectionReason }),
    onSuccess: () => {
      invalidate();
      setModal(null);
      setShowRejectForm(false);
      setRejectionReason("");
      setFeedback({ type: "success", message: "Payment rejected. The customer has been notified." });
    },
    onError: (err: unknown) => {
      setModal(null);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Rejection failed. Please try again.";
      setFeedback({ type: "error", message: msg });
    },
  });

  if (isLoading) return <div style={{ padding: 28 }}><Spinner /></div>;
  if (!payment) return <div style={{ padding: 28 }}>Payment not found.</div>;

  const paymentIsReviewable = payment.status === "UNDER_REVIEW";

  return (
    <div style={{ padding: 28, maxWidth: 900, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title={`Payment — ${payment.order?.orderNumber ?? "Deposit"}`}
        subtitle="Review payment submission"
        actions={
          <button
            type="button"
            onClick={() => navigate("/payments")}
            style={{ fontSize: 13, color: "var(--cd-gray-600)", cursor: "pointer" }}
          >
            ← Back
          </button>
        }
      />

      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* ── Left column ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Status + Amount */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Status</div>
                <StatusBadge status={payment.status} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginBottom: 4 }}>Amount</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: "var(--cd-red)" }}>
                  {etbDisplay(payment.amountETB)} ETB
                </div>
              </div>
            </div>
            {payment.rejectionReason && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
                Rejection reason: {payment.rejectionReason}
              </div>
            )}
            {payment.reviewer && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--cd-gray-500)" }}>
                Reviewed by {payment.reviewer.firstName} {payment.reviewer.lastName}
                {payment.reviewedAt && ` on ${formatDateTime(payment.reviewedAt)}`}
              </div>
            )}
          </div>

          {/* Payment details */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Payment Details
            </h3>
            {[
              { label: "Method", value: payment.paymentMethod.name },
              { label: "Reference", value: payment.reference, mono: true },
              { label: "Submitted", value: formatDateTime(payment.createdAt) },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, fontFamily: row.mono ? "monospace" : undefined }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Customer */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Customer
            </h3>
            {[
              { label: "Name", value: `${payment.user.firstName} ${payment.user.lastName}` },
              {
                label: "Username",
                value: payment.user.username
                  ? (
                    <a
                      href={`https://t.me/${payment.user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                      aria-label={`Open Telegram chat with @${payment.user.username}`}
                    >
                      @{payment.user.username}
                      <SendIcon size={11} color="var(--cd-red)" />
                    </a>
                  )
                  : "—",
              },
              { label: "Telegram ID", value: payment.user.telegramIdentity?.telegramUserId ?? "—" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Order */}
          {payment.order && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Order
              </h3>
              {[
                { label: "Order #", value: payment.order.orderNumber },
                { label: "Service", value: payment.order.service.name },
                { label: "Package", value: payment.order.package.name },
                { label: "Quantity", value: payment.order.package.quantity.toLocaleString() },
                { label: "Target URL", value: payment.order.targetUrl },
                { label: "Order Status", value: <StatusBadge status={payment.order.orderStatus} /> },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                  <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, textAlign: "right", wordBreak: "break-all", maxWidth: 220 }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Screenshot */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Payment Screenshot
            </h3>
            {payment.proofSignedUrl ? (
              <a href={payment.proofSignedUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={payment.proofSignedUrl}
                  alt="Payment proof screenshot"
                  style={{ width: "100%", borderRadius: 8, border: "1px solid var(--cd-gray-200)", cursor: "zoom-in" }}
                />
                <p style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 6, textAlign: "center" }}>
                  Click to open full size
                </p>
              </a>
            ) : (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--cd-gray-500)", fontSize: 13 }}>
                No screenshot uploaded
              </div>
            )}
          </div>

          {/* Review actions — only shown to ADMIN / SUPER_ADMIN on reviewable payments */}
          {paymentIsReviewable && canReview && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Review Actions
              </h3>

              <p style={{ fontSize: 12, color: "var(--cd-gray-600)", marginBottom: 12 }}>
                Verify the reference number matches the screenshot and the amount is correct before approving.
              </p>

              {/* Approve */}
              <div style={{ marginBottom: 12 }}>
                <Button
                  type="button"
                  variant="success"
                  size="lg"
                  fullWidth
                  onClick={() => setModal({ type: "approve" })}
                >
                  <CheckIcon size={14} color="#fff" /> Approve Payment
                </Button>
              </div>

              {/* Reject */}
              {!showRejectForm ? (
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  fullWidth
                  onClick={() => setShowRejectForm(true)}
                >
                  <XIcon size={14} color="#fff" /> Reject Payment
                </Button>
              ) : (
                <div>
                  <label
                    htmlFor="rejection-reason"
                    style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)" }}
                  >
                    Rejection Reason <span style={{ color: "var(--cd-red)" }}>*</span>
                  </label>
                  <textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Explain why the payment is being rejected..."
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 12px",
                      border: "1.5px solid var(--cd-gray-300)", borderRadius: 8,
                      fontSize: 13, resize: "vertical", outline: "none",
                      fontFamily: "var(--font-body)", marginBottom: 10,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      type="button"
                      variant="danger"
                      size="md"
                      disabled={rejectionReason.trim().length < 5}
                      onClick={() => setModal({ type: "reject" })}
                    >
                      Confirm Rejection
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role notice for OPERATORs */}
          {paymentIsReviewable && !canReview && (
            <div style={{
              background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)",
              border: "1px solid var(--cd-gray-200)",
            }}>
              <p style={{ fontSize: 13, color: "var(--cd-gray-600)" }}>
                Payment review requires Admin or Super Admin privileges.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Approve confirmation modal ── */}
      <ConfirmModal
        open={modal?.type === "approve"}
        title="Approve Payment"
        body="This will credit the customer's order and create a fulfillment task. This action cannot be undone."
        confirmLabel="Approve"
        confirmVariant="success"
        loading={approveMutation.isPending}
        details={[
          { label: "Order", value: payment.order?.orderNumber ?? "Deposit" },
          { label: "Amount", value: `${etbDisplay(payment.amountETB)} ETB` },
          { label: "Customer", value: `${payment.user.firstName} ${payment.user.lastName}` },
          { label: "Reference", value: payment.reference },
        ]}
        onConfirm={() => approveMutation.mutate()}
        onCancel={() => setModal(null)}
      />

      {/* ── Reject confirmation modal ── */}
      <ConfirmModal
        open={modal?.type === "reject"}
        title="Reject Payment"
        body="The customer will be notified with the rejection reason you provided."
        confirmLabel="Reject"
        confirmVariant="danger"
        loading={rejectMutation.isPending}
        details={[
          { label: "Order", value: payment.order?.orderNumber ?? "Deposit" },
          { label: "Amount", value: `${etbDisplay(payment.amountETB)} ETB` },
          { label: "Reason", value: rejectionReason || "—" },
        ]}
        onConfirm={() => rejectMutation.mutate()}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}
