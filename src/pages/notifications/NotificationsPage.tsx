import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import {
  BellIcon, CreditCardIcon, CheckIcon, XIcon, ZapIcon,
  BarChartIcon, ClipboardIcon, CoinsIcon, WalletIcon,
} from "@/components/ui/Icon";

// ── Types ──────────────────────────────────────────────────────────────────────

interface NotifUser {
  id: string; firstName: string; lastName: string; username: string | null;
  telegramIdentity: { telegramUserId: string } | null;
}

interface Notification {
  id: string; event: string; title: string; message: string;
  sentAt: string | null; failedAt: string | null; readAt: string | null;
  createdAt: string; user: NotifUser;
}

interface NotifData {
  notifications: Notification[]; total: number; unreadCount: number;
  page: number; pageSize: number; totalPages: number;
}

// ── Event config ───────────────────────────────────────────────────────────────

type IconComp = (p: { size?: number; color?: string }) => JSX.Element;

const EVENT_ICONS: Record<string, IconComp> = {
  ORDER_CREATED:       ClipboardIcon,
  PAYMENT_SUBMITTED:   CreditCardIcon,
  PAYMENT_APPROVED:    CheckIcon,
  PAYMENT_REJECTED:    XIcon,
  ORDER_PROCESSING:    ZapIcon,
  FULFILLMENT_STARTED: ZapIcon,
  ORDER_COMPLETED:     CheckIcon,
  ORDER_CANCELLED:     XIcon,
  REFUND_ISSUED:       CoinsIcon,
  REPORT_AVAILABLE:    BarChartIcon,
  WALLET_CREDITED:     WalletIcon,
};

const EVENT_COLORS: Record<string, string> = {
  PAYMENT_APPROVED:    "#16a34a",
  ORDER_COMPLETED:     "#16a34a",
  WALLET_CREDITED:     "#16a34a",
  PAYMENT_REJECTED:    "#dc2626",
  ORDER_CANCELLED:     "#dc2626",
  REPORT_AVAILABLE:    "#2563eb",
  REFUND_ISSUED:       "#d97706",
  PAYMENT_SUBMITTED:   "#0066CC",
  ORDER_CREATED:       "#6b21a8",
  ORDER_PROCESSING:    "#0066CC",
  FULFILLMENT_STARTED: "#0066CC",
};

const PAGE_SIZE = 30;

// ── Page ───────────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-notifications", page, filter],
    queryFn: () =>
      api.get<{ success: boolean; data: NotifData }>(
        `/admin/notifications?page=${page}&pageSize=${PAGE_SIZE}${filter === "unread" ? "&unread=true" : ""}`
      ).then(r => r.data.data),
    refetchInterval: 20_000,
  });

  const markAll = useMutation({
    mutationFn: () => api.patch("/admin/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-notif-unread"] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-notif-unread"] });
    },
  });

  const unread = data?.unreadCount ?? 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "All caught up"}
        actions={
          unread > 0 ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              style={{ fontSize: 13, fontWeight: 700, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "unread"] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setPage(1); }}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: filter === f ? "var(--cd-red)" : "var(--cd-gray-100)",
              color:      filter === f ? "#fff" : "var(--cd-gray-600)",
              border:     "none",
            }}
          >
            {f === "all" ? "All" : `Unread${unread > 0 ? ` (${unread})` : ""}`}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}

      {error && (
        <div style={{ padding: 20, background: "#fef2f2", borderRadius: 12, color: "#dc2626", fontSize: 14 }}>
          Failed to load notifications.{" "}
          <button type="button" onClick={() => refetch()} style={{ color: "#dc2626", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {data?.notifications.length === 0 && !isLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 20px", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--cd-gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BellIcon size={26} color="var(--cd-gray-400)" />
          </div>
          <p style={{ fontSize: 15, color: "var(--cd-gray-500)", fontWeight: 600 }}>No notifications yet</p>
          <p style={{ fontSize: 13, color: "var(--cd-gray-400)" }}>Notifications will appear here as users place orders and make payments.</p>
        </div>
      )}

      {data && data.notifications.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.notifications.map(n => {
              const Icon  = EVENT_ICONS[n.event] ?? BellIcon;
              const color = EVENT_COLORS[n.event] ?? "#64748b";
              const unread = n.readAt === null;
              const userName = `${n.user.firstName} ${n.user.lastName}`.trim();

              return (
                <div
                  key={n.id}
                  style={{
                    background:   unread ? "#fff7f7" : "#fff",
                    border:       `1px solid ${unread ? "rgba(236,28,36,0.18)" : "#e5e7eb"}`,
                    borderRadius: 12,
                    padding:      "14px 16px",
                    display:      "flex",
                    alignItems:   "flex-start",
                    gap:          12,
                    cursor:       unread ? "pointer" : "default",
                    transition:   "background 0.15s",
                  }}
                  onClick={() => { if (unread) markOne.mutate(n.id); }}
                  role={unread ? "button" : undefined}
                  tabIndex={unread ? 0 : undefined}
                  aria-label={unread ? `Mark "${n.title}" as read` : undefined}
                  onKeyDown={e => { if (unread && (e.key === "Enter" || e.key === " ")) markOne.mutate(n.id); }}
                >
                  {/* Icon */}
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} color={color} />
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 2 }}>
                      <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "#000F33" }}>{n.title}</p>
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, marginTop: 1 }}>
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    {/* Customer info */}
                    <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      👤 {userName}
                      {n.user.username && <span style={{ color: "#94a3b8" }}> @{n.user.username}</span>}
                      {n.user.telegramIdentity && <span style={{ color: "#94a3b8" }}> · TG {n.user.telegramIdentity.telegramUserId}</span>}
                    </p>
                    <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as never }}>
                      {n.message}
                    </p>
                    {/* Delivery status */}
                    <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                      {n.sentAt ? (
                        <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ Delivered via Telegram</span>
                      ) : n.failedAt ? (
                        <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>✗ Telegram delivery failed</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>⏳ Pending delivery</span>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {unread && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EC1C24", flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, fontSize: 13, fontWeight: 600 }}>
                ← Prev
              </button>
              <span style={{ padding: "6px 12px", fontSize: 13, color: "#64748b" }}>{page} / {data.totalPages}</span>
              <button type="button" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: page >= data.totalPages ? "not-allowed" : "pointer", opacity: page >= data.totalPages ? 0.5 : 1, fontSize: 13, fontWeight: 600 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
