import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SendIcon } from "@/components/ui/Icon";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAdminAuthStore } from "@/store/auth.store";

interface FulfillmentDetail {
  id: string; status: string; fulfillmentType: string;
  providerReference: string | null; errorMessage: string | null;
  startedAt: string | null; completedAt: string | null; createdAt: string;
  assignee: { id: string; firstName: string; lastName: string } | null;
  order: {
    id: string; orderNumber: string; targetUrl: string; targetType: string;
    totalAmountETB: number; paymentStatus: string; orderStatus: string;
    service: { name: string; targetLabel: string; platform: { name: string } };
    package: { name: string; quantity: number; deliveryDaysMin: number; deliveryDaysMax: number };
    user: { firstName: string; lastName: string; username: string | null; telegramIdentity: { telegramUserId: string } | null };
    payments: Array<{ status: string; amountETB: number; reference: string }>;
  };
}

interface ActionDef {
  label: string;
  status: string;
  variant: "primary" | "success" | "danger" | "secondary";
  confirmTitle: string;
  confirmBody: string;
  confirmVariant: "primary" | "success" | "danger";
  confirmLabel: string;
}

const NEXT_ACTIONS: Record<string, ActionDef[]> = {
  PENDING: [
    {
      label: "Queue Task",
      status: "QUEUED",
      variant: "primary",
      confirmTitle: "Queue Fulfillment Task",
      confirmBody: "Place this task in the fulfillment queue for processing.",
      confirmVariant: "primary",
      confirmLabel: "Queue",
    },
    {
      label: "Cancel Task",
      status: "CANCELLED",
      variant: "danger",
      confirmTitle: "Cancel Fulfillment Task",
      confirmBody: "This will permanently cancel the fulfillment task.",
      confirmVariant: "danger",
      confirmLabel: "Cancel Task",
    },
  ],
  QUEUED: [
    {
      label: "Start Processing",
      status: "PROCESSING",
      variant: "success",
      confirmTitle: "Start Fulfillment",
      confirmBody: "Mark this task as processing. The customer will not be notified yet.",
      confirmVariant: "success",
      confirmLabel: "Start",
    },
    {
      label: "Cancel Task",
      status: "CANCELLED",
      variant: "danger",
      confirmTitle: "Cancel Fulfillment Task",
      confirmBody: "This will cancel the fulfillment task. This action cannot be undone.",
      confirmVariant: "danger",
      confirmLabel: "Cancel Task",
    },
  ],
  PROCESSING: [
    {
      label: "Mark Completed",
      status: "COMPLETED",
      variant: "success",
      confirmTitle: "Mark Order Completed",
      confirmBody: "The order will be marked as completed and the customer will be notified via Telegram.",
      confirmVariant: "success",
      confirmLabel: "Mark Completed",
    },
    {
      label: "Mark Failed",
      status: "FAILED",
      variant: "danger",
      confirmTitle: "Mark Task Failed",
      confirmBody: "The task will be flagged as failed. You can re-queue it afterwards.",
      confirmVariant: "danger",
      confirmLabel: "Mark Failed",
    },
  ],
  FAILED: [
    {
      label: "Re-queue",
      status: "QUEUED",
      variant: "primary",
      confirmTitle: "Re-queue Task",
      confirmBody: "This task will be placed back in the queue for processing.",
      confirmVariant: "primary",
      confirmLabel: "Re-queue",
    },
    {
      label: "Cancel Task",
      status: "CANCELLED",
      variant: "danger",
      confirmTitle: "Cancel Fulfillment Task",
      confirmBody: "This will permanently cancel the fulfillment task.",
      confirmVariant: "danger",
      confirmLabel: "Cancel Task",
    },
  ],
  AWAITING_APPROVAL: [
    {
      label: "Approve & Queue",
      status: "QUEUED",
      variant: "success",
      confirmTitle: "Approve & Queue",
      confirmBody: "Approve this task and place it in the processing queue.",
      confirmVariant: "success",
      confirmLabel: "Approve & Queue",
    },
    {
      label: "Cancel Task",
      status: "CANCELLED",
      variant: "danger",
      confirmTitle: "Cancel Fulfillment Task",
      confirmBody: "This will permanently cancel the fulfillment task.",
      confirmVariant: "danger",
      confirmLabel: "Cancel Task",
    },
  ],
};

/** Inline success/error banner */
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

export function FulfillmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();

  const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Only ADMIN and SUPER_ADMIN may change fulfillment status
  const canManage = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";

  const { data: task, isLoading } = useQuery({
    queryKey: ["admin-fulfillment-task", id],
    queryFn: () =>
      api.get<{ success: boolean; data: FulfillmentDetail }>(`/admin/fulfillment/${id}`)
        .then(r => r.data.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.post(`/admin/fulfillment/${id}/status`, { status }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ["admin-fulfillment-task", id] });
      qc.invalidateQueries({ queryKey: ["admin-fulfillment"] });
      setPendingAction(null);
      const label = NEXT_ACTIONS[task?.status ?? ""]?.find(a => a.status === status)?.label ?? "Action";
      setFeedback({ type: "success", message: `${label} completed successfully.` });
    },
    onError: (err: unknown) => {
      setPendingAction(null);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Action failed. Check the state machine transition is valid.";
      setFeedback({ type: "error", message: msg });
    },
  });

  if (isLoading) return <div style={{ padding: 28 }}><Spinner /></div>;
  if (!task) return <div style={{ padding: 28 }}>Task not found.</div>;

  const actions = NEXT_ACTIONS[task.status] ?? [];

  return (
    <div style={{ padding: 28, maxWidth: 900, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title={`Fulfillment — ${task.order.orderNumber}`}
        subtitle={task.order.service.name}
        actions={
          <button
            type="button"
            onClick={() => navigate("/fulfillment")}
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

        {/* ── Left ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Task status */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Task Status</div>
                <StatusBadge status={task.status} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginBottom: 4 }}>Type</div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{task.fulfillmentType}</span>
              </div>
            </div>
            {[
              { label: "Created",   value: formatDateTime(task.createdAt) },
              { label: "Started",   value: task.startedAt ? formatDateTime(task.startedAt) : "—" },
              { label: "Completed", value: task.completedAt ? formatDateTime(task.completedAt) : "—" },
              { label: "Assigned",  value: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned" },
              ...(task.providerReference ? [{ label: "Provider Ref", value: task.providerReference }] : []),
              ...(task.errorMessage ? [{ label: "Error", value: task.errorMessage }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Customer */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Customer
            </h3>
            {[
              { label: "Name", value: `${task.order.user.firstName} ${task.order.user.lastName}` },
              {
                label: "Username",
                value: task.order.user.username
                  ? (
                    <a
                      href={`https://t.me/${task.order.user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                      aria-label={`Open Telegram chat with @${task.order.user.username}`}
                    >
                      @{task.order.user.username}
                      <SendIcon size={11} color="var(--cd-red)" />
                    </a>
                  )
                  : "—",
              },
              { label: "Telegram ID", value: task.order.user.telegramIdentity?.telegramUserId ?? "—" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Order details */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Order Details
            </h3>
            {[
              { label: "Order #", value: task.order.orderNumber },
              { label: "Platform", value: task.order.service.platform.name },
              { label: "Service", value: task.order.service.name },
              { label: "Package", value: task.order.package.name },
              { label: "Quantity", value: task.order.package.quantity.toLocaleString() },
              { label: "Delivery", value: `${task.order.package.deliveryDaysMin}–${task.order.package.deliveryDaysMax} days` },
              { label: "Amount", value: `${etbDisplay(task.order.totalAmountETB)} ETB` },
              { label: "Order Status", value: <StatusBadge status={task.order.orderStatus} /> },
              { label: "Payment", value: <StatusBadge status={task.order.paymentStatus} /> },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, textAlign: "right" }}>{row.value}</span>
              </div>
            ))}

            {/* Target URL */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginBottom: 4 }}>{task.order.service.targetLabel}</div>
              <a
                href={task.order.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: "var(--cd-red)", wordBreak: "break-all", display: "block" }}
              >
                {task.order.targetUrl}
              </a>
            </div>
          </div>

          {/* Actions — only for ADMIN / SUPER_ADMIN */}
          {actions.length > 0 && canManage && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Actions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actions.map(action => (
                  <Button
                    key={action.status}
                    type="button"
                    variant={action.variant}
                    size="md"
                    fullWidth
                    onClick={() => setPendingAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Role notice for OPERATORs */}
          {actions.length > 0 && !canManage && (
            <div style={{
              background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)",
              border: "1px solid var(--cd-gray-200)",
            }}>
              <p style={{ fontSize: 13, color: "var(--cd-gray-600)" }}>
                Fulfillment actions require Admin or Super Admin privileges.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation modal ── */}
      {pendingAction && (
        <ConfirmModal
          open={true}
          title={pendingAction.confirmTitle}
          body={pendingAction.confirmBody}
          confirmLabel={pendingAction.confirmLabel}
          confirmVariant={pendingAction.confirmVariant}
          loading={statusMutation.isPending}
          details={[
            { label: "Order", value: task.order.orderNumber },
            { label: "Service", value: task.order.service.name },
            { label: "Customer", value: `${task.order.user.firstName} ${task.order.user.lastName}` },
            { label: "New Status", value: pendingAction.status },
          ]}
          onConfirm={() => statusMutation.mutate(pendingAction.status)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
