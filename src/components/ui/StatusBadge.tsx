interface BadgeConfig { label: string; bg: string; color: string; dot: string }

const CONFIG: Record<string, BadgeConfig> = {
  // ── Payments ──
  PENDING:            { label: "Pending",           bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  UNDER_REVIEW:       { label: "Under Review",      bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  APPROVED:           { label: "Approved",          bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  REJECTED:           { label: "Rejected",          bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  REFUNDED:           { label: "Refunded",          bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  // ── Orders ──
  PENDING_PAYMENT:    { label: "Pending Payment",   bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  PAYMENT_SUBMITTED:  { label: "Payment Submitted", bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  PAYMENT_APPROVED:   { label: "Payment Approved",  bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  PAYMENT_REJECTED:   { label: "Payment Rejected",  bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  PROCESSING:         { label: "Processing",        bg: "#ede9fe", color: "#5b21b6", dot: "#8b5cf6" },
  IN_PROGRESS:        { label: "In Progress",       bg: "#ddd6fe", color: "#4c1d95", dot: "#7c3aed" },
  COMPLETED:          { label: "Completed",         bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  CANCELLED:          { label: "Cancelled",         bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  // ── Fulfillment ──
  QUEUED:             { label: "Queued",            bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9" },
  AWAITING_APPROVAL:  { label: "Awaiting Approval", bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  FAILED:             { label: "Failed",            bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  // ── Campaigns ──
  DRAFT:              { label: "Draft",             bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  ACTIVE:             { label: "Active",            bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  PAUSED:             { label: "Paused",            bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  // ── Broadcasts ──
  SENDING:            { label: "Sending",           bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  // ── Reports ──
  PUBLISHED:          { label: "Published",         bg: "#e0f2fe", color: "#0369a1", dot: "#0ea5e9" },
  ARCHIVED:           { label: "Archived",          bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  // ── Roles ──
  SUPER_ADMIN:        { label: "Super Admin",       bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  ADMIN:              { label: "Admin",             bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
  OPERATOR:           { label: "Operator",          bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  // ── Users ──
  SUSPENDED:          { label: "Suspended",         bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  BANNED:             { label: "Banned",            bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg: BadgeConfig = CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    bg: "#f1f5f9", color: "#475569", dot: "#94a3b8",
  };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px",
      borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
      whiteSpace: "nowrap",
      letterSpacing: 0.2,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: cfg.dot, flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  );
}
