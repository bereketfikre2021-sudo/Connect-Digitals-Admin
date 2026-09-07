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

interface WalletTransaction {
  id: string; type: string; amountETB: number;
  balanceBefore: number; balanceAfter: number;
  description: string | null; createdAt: string;
}

interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalSpendETB: number;
  telegramIdentity: {
    telegramUserId: string;
    username: string | null;
    isPremium: boolean;
    lastSeenAt: string;
    createdAt: string;
  } | null;
  wallet: {
    id: string;
    balanceETB: number;
    updatedAt: string;
    transactions: WalletTransaction[];
  } | null;
  orders: Array<{
    id: string; orderNumber: string; totalAmountETB: number;
    orderStatus: string; paymentStatus: string; fulfillmentStatus: string;
    createdAt: string; completedAt: string | null;
    service: { name: string; platform: { name: string } };
    package: { name: string; quantity: number };
  }>;
  payments: Array<{
    id: string; amountETB: number; reference: string; status: string;
    createdAt: string; reviewedAt: string | null; rejectionReason: string | null;
    paymentMethod: { name: string };
    order: { orderNumber: string } | null;
  }>;
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{
          fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 700,
          color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.6,
        }}>
          {title}
        </h3>
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
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const TX_CREDIT_TYPES = new Set(["DEPOSIT", "REFUND", "ADJUSTMENT", "REWARD"]);

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();

  const canChangeStatus = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";

  const [pendingStatus, setPendingStatus] = useState<"ACTIVE" | "SUSPENDED" | "BANNED" | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusFeedback, setStatusFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () =>
      api.get<{ success: boolean; data: CustomerDetail }>(`/admin/customers/${id}`)
        .then(r => r.data.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/admin/customers/${id}/status`, { status, reason: statusReason }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      setPendingStatus(null);
      setStatusReason("");
      setStatusFeedback({ type: "success", message: `Customer status changed to ${status}.` });
    },
    onError: (err: unknown) => {
      setPendingStatus(null);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Status change failed.";
      setStatusFeedback({ type: "error", message: msg });
    },
  });

  if (isLoading) return <div style={{ padding: 28 }}><Spinner /></div>;
  if (!customer) return <div style={{ padding: 28 }}>Customer not found.</div>;

  return (
    <div style={{ padding: 28, maxWidth: 1000, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        subtitle={customer.username ? `@${customer.username}` : "Customer profile"}
        actions={
          <button
            type="button"
            onClick={() => navigate("/customers")}
            style={{ fontSize: 13, color: "var(--cd-gray-600)", cursor: "pointer" }}
          >
            ← Back
          </button>
        }
      />

      {statusFeedback && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-sm)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: statusFeedback.type === "success" ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${statusFeedback.type === "success" ? "#86efac" : "#fca5a5"}`,
          fontSize: 13, color: statusFeedback.type === "success" ? "#166534" : "#991b1b",
        }}>
          <span>{statusFeedback.message}</span>
          <button type="button" onClick={() => setStatusFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", color: "inherit", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Summary strip */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 20px",
        boxShadow: "var(--shadow-sm)", marginBottom: 16,
        display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center",
      }}>
        {[
          { label: "Status", value: <StatusBadge status={customer.status} /> },
          { label: "Orders", value: <strong>{customer.orders.length}+</strong> },
          { label: "Wallet Balance", value: <strong style={{ color: "var(--cd-navy)" }}>{customer.wallet ? `${etbDisplay(customer.wallet.balanceETB)} ETB` : "—"}</strong> },
          { label: "Total Spend", value: <strong style={{ color: "var(--cd-red)" }}>{etbDisplay(customer.totalSpendETB)} ETB</strong> },
          { label: "Joined", value: formatDateTime(customer.createdAt) },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 13 }}>{item.value}</div>
          </div>
        ))}
        {customer.username && (
          <a
            href={`https://t.me/${customer.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: "auto", color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}
            aria-label={`Open Telegram chat with @${customer.username}`}
          >
            Message on Telegram <SendIcon size={13} color="var(--cd-red)" />
          </a>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* ── Left ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Identity */}
          <Card title="Customer Info">
            <InfoRow label="Full Name" value={`${customer.firstName} ${customer.lastName}`} />
            <InfoRow
              label="Telegram Username"
              value={
                customer.username
                  ? (
                    <a
                      href={`https://t.me/${customer.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      @{customer.username}
                      <SendIcon size={11} color="var(--cd-red)" />
                    </a>
                  )
                  : "—"
              }
            />
            <InfoRow
              label="Telegram ID"
              value={customer.telegramIdentity?.telegramUserId ?? "—"}
            />
            <InfoRow
              label="Telegram Premium"
              value={customer.telegramIdentity?.isPremium ? "Yes" : "No"}
            />
            <InfoRow
              label="Last Seen"
              value={customer.telegramIdentity?.lastSeenAt ? formatDateTime(customer.telegramIdentity.lastSeenAt) : "—"}
            />
            <InfoRow label="Account Status" value={<StatusBadge status={customer.status} />} />
            <InfoRow label="Joined" value={formatDateTime(customer.createdAt)} />
          </Card>

          {/* Status management — ADMIN+ only */}
          {canChangeStatus && customer.status !== "BANNED" && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)", border: "1px solid var(--cd-gray-200)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14 }}>
                Account Actions
              </h3>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="status-reason" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Reason <span style={{ color: "var(--cd-red)" }}>*</span>
                </label>
                <input
                  id="status-reason"
                  type="text"
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder="Reason for status change…"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {customer.status !== "ACTIVE" && (
                  <Button type="button" variant="success" size="md" fullWidth
                    disabled={statusReason.trim().length < 5}
                    onClick={() => setPendingStatus("ACTIVE")}
                  >
                    Restore Account
                  </Button>
                )}
                {customer.status === "ACTIVE" && (
                  <Button type="button" variant="secondary" size="md" fullWidth
                    disabled={statusReason.trim().length < 5}
                    onClick={() => setPendingStatus("SUSPENDED")}
                  >
                    Suspend Account
                  </Button>
                )}
                {admin?.role === "SUPER_ADMIN" && customer.status !== "BANNED" && (
                  <Button type="button" variant="danger" size="md" fullWidth
                    disabled={statusReason.trim().length < 5}
                    onClick={() => setPendingStatus("BANNED")}
                  >
                    Ban Account
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Wallet */}
          <Card
            title="Wallet"
            action={
              customer.wallet
                ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/wallets/${customer.id}`)}
                    style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    Manage →
                  </button>
                )
                : undefined
            }
          >
            {!customer.wallet ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", padding: "12px 0" }}>No wallet</p>
            ) : (
              <>
                <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
                  <div style={{ fontSize: 10, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Balance</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 28, color: "var(--cd-red)" }}>
                    {etbDisplay(customer.wallet.balanceETB)} ETB
                  </div>
                  <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 4 }}>
                    Updated {formatDateTime(customer.wallet.updatedAt)}
                  </div>
                </div>
                {/* Recent transactions */}
                {customer.wallet.transactions.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--cd-gray-100)", paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                      Recent Transactions
                    </div>
                    {customer.wallet.transactions.map(tx => {
                      const isCredit = TX_CREDIT_TYPES.has(tx.type);
                      return (
                        <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isCredit ? "#166534" : "#991b1b" }}>
                              {isCredit ? "+" : "−"}{etbDisplay(Math.abs(tx.amountETB))} ETB
                            </div>
                            <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>
                              {tx.type.replace("_", " ")} · {tx.description ?? ""}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--cd-gray-500)", whiteSpace: "nowrap", marginLeft: 8 }}>
                            {formatDateTime(tx.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* ── Right ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Recent orders */}
          <Card
            title={`Recent Orders (${customer.orders.length}+)`}
            action={
              <button
                type="button"
                onClick={() => navigate(`/orders?search=${encodeURIComponent(customer.firstName + " " + customer.lastName)}`)}
                style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                All orders →
              </button>
            }
          >
            {customer.orders.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", padding: "12px 0" }}>No orders yet</p>
            ) : customer.orders.map((o, i) => (
              <div
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                style={{
                  padding: "9px 0",
                  borderBottom: i < customer.orders.length - 1 ? "1px solid var(--cd-gray-100)" : undefined,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{o.orderNumber}</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "var(--cd-red)" }}>
                    {etbDisplay(o.totalAmountETB)} ETB
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--cd-gray-600)", marginBottom: 4 }}>
                  {o.service.platform.name} · {o.service.name} · {o.package.quantity.toLocaleString()}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <StatusBadge status={o.orderStatus} />
                  <StatusBadge status={o.paymentStatus} />
                  <StatusBadge status={o.fulfillmentStatus} />
                </div>
                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 4 }}>
                  {formatDateTime(o.createdAt)}
                </div>
              </div>
            ))}
          </Card>

          {/* Payment history */}
          <Card
            title={`Payment History (${customer.payments.length}+)`}
            action={
              <button
                type="button"
                onClick={() => navigate(`/payments?search=${encodeURIComponent(customer.firstName + " " + customer.lastName)}`)}
                style={{ fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                All payments →
              </button>
            }
          >
            {customer.payments.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--cd-gray-500)", padding: "12px 0" }}>No payments yet</p>
            ) : customer.payments.map((p, i) => (
              <div
                key={p.id}
                onClick={() => navigate(`/payments/${p.id}`)}
                style={{
                  padding: "9px 0",
                  borderBottom: i < customer.payments.length - 1 ? "1px solid var(--cd-gray-100)" : undefined,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <StatusBadge status={p.status} />
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "var(--cd-red)" }}>
                    {etbDisplay(p.amountETB)} ETB
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>
                  {p.paymentMethod.name}
                  {p.order && <span> · {p.order.orderNumber}</span>}
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--cd-gray-500)", marginTop: 2 }}>
                  {p.reference}
                </div>
                {p.rejectionReason && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>
                    Rejected: {p.rejectionReason}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 2 }}>
                  {formatDateTime(p.createdAt)}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Status change confirmation modal */}
      {pendingStatus && (
        <ConfirmModal
          open
          title={
            pendingStatus === "ACTIVE" ? "Restore Account" :
            pendingStatus === "SUSPENDED" ? "Suspend Account" : "Ban Account"
          }
          body={
            pendingStatus === "ACTIVE"
              ? "The customer will regain access to the platform."
              : pendingStatus === "SUSPENDED"
              ? "The customer will not be able to place new orders or log in."
              : "The customer will be permanently banned. This is a severe action."
          }
          confirmLabel={pendingStatus === "ACTIVE" ? "Restore" : pendingStatus === "SUSPENDED" ? "Suspend" : "Ban"}
          confirmVariant={pendingStatus === "ACTIVE" ? "success" : "danger"}
          loading={statusMutation.isPending}
          details={[
            { label: "Customer", value: `${customer.firstName} ${customer.lastName}` },
            { label: "New Status", value: pendingStatus },
            { label: "Reason", value: statusReason },
          ]}
          onConfirm={() => statusMutation.mutate(pendingStatus)}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </div>
  );
}
