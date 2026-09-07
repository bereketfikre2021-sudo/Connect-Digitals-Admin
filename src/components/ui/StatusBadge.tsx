const CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:           { label: "Pending",          bg: "#fef9c3", color: "#854d0e" },
  UNDER_REVIEW:      { label: "Under Review",     bg: "#dbeafe", color: "#1e40af" },
  APPROVED:          { label: "Approved",         bg: "#dcfce7", color: "#166534" },
  REJECTED:          { label: "Rejected",         bg: "#fee2e2", color: "#991b1b" },
  REFUNDED:          { label: "Refunded",         bg: "#f1f5f9", color: "#475569" },
  PENDING_PAYMENT:   { label: "Pending Payment",  bg: "#fef9c3", color: "#854d0e" },
  PAYMENT_SUBMITTED: { label: "Payment Submitted",bg: "#dbeafe", color: "#1e40af" },
  PAYMENT_APPROVED:  { label: "Payment Approved", bg: "#dcfce7", color: "#166534" },
  PAYMENT_REJECTED:  { label: "Payment Rejected", bg: "#fee2e2", color: "#991b1b" },
  PROCESSING:        { label: "Processing",       bg: "#ede9fe", color: "#5b21b6" },
  IN_PROGRESS:       { label: "In Progress",      bg: "#ddd6fe", color: "#4c1d95" },
  COMPLETED:         { label: "Completed",        bg: "#dcfce7", color: "#166534" },
  CANCELLED:         { label: "Cancelled",        bg: "#f1f5f9", color: "#475569" },
  QUEUED:            { label: "Queued",           bg: "#fef9c3", color: "#854d0e" },
  AWAITING_APPROVAL: { label: "Awaiting Approval",bg: "#dbeafe", color: "#1e40af" },
  FAILED:            { label: "Failed",           bg: "#fee2e2", color: "#991b1b" },
  // Campaign statuses
  DRAFT:             { label: "Draft",            bg: "#f1f5f9", color: "#475569" },
  ACTIVE:            { label: "Active",           bg: "#dcfce7", color: "#166534" },
  PAUSED:            { label: "Paused",           bg: "#fef9c3", color: "#854d0e" },
  // Report statuses
  PUBLISHED:         { label: "Published",        bg: "#dcfce7", color: "#166534" },
  ARCHIVED:          { label: "Archived",         bg: "#f1f5f9", color: "#475569" },
  // Role labels
  SUPER_ADMIN:       { label: "Super Admin",      bg: "#fef3c7", color: "#92400e" },
  ADMIN:             { label: "Admin",            bg: "#dbeafe", color: "#1e40af" },
  OPERATOR:          { label: "Operator",         bg: "#dcfce7", color: "#166534" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { label: status, bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}
