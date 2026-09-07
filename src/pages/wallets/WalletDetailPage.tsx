import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
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

interface WalletDetail {
  id: string; balanceETB: number; updatedAt: string;
  user: { firstName: string; lastName: string; username: string | null };
  transactions: WalletTransaction[];
}

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

function TxTypeLabel({ type }: { type: string }) {
  const MAP: Record<string, { label: string; color: string }> = {
    DEPOSIT:       { label: "Deposit",       color: "#166534" },
    ORDER_PAYMENT: { label: "Order Payment", color: "#991b1b" },
    REFUND:        { label: "Refund",        color: "#166534" },
    ADJUSTMENT:    { label: "Adjustment",    color: "#1e40af" },
    REWARD:        { label: "Reward",        color: "#5b21b6" },
  };
  const cfg = MAP[type] ?? { label: type, color: "var(--cd-gray-600)" };
  return <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>;
}

export function WalletDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [creditRef, setCreditRef] = useState(() => crypto.randomUUID());
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["admin-wallet", userId],
    queryFn: () =>
      api.get<{ success: boolean; data: WalletDetail }>(`/admin/wallets/${userId}`)
        .then(r => r.data.data),
    enabled: !!userId,
  });

  const creditMutation = useMutation({
    mutationFn: () =>
      api.post(`/admin/wallets/${userId}/credit`, {
        amountETB: Math.round(parseFloat(creditAmount) * 100),
        description: creditDesc,
        referenceId: creditRef,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallet", userId] });
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
      setShowConfirm(false);
      setShowCreditForm(false);
      setCreditAmount("");
      setCreditDesc("");
      setCreditRef(crypto.randomUUID());
      setFeedback({ type: "success", message: "Wallet credited successfully." });
    },
    onError: (err: unknown) => {
      setShowConfirm(false);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Credit failed. Please try again.";
      setFeedback({ type: "error", message: msg });
    },
  });

  if (isLoading) return <div style={{ padding: 28 }}><Spinner /></div>;
  if (!wallet) return <div style={{ padding: 28 }}>Wallet not found.</div>;

  const amountETB = parseFloat(creditAmount);
  const amountValid = !isNaN(amountETB) && amountETB > 0;
  const descValid = creditDesc.trim().length >= 3;
  const canSubmitCredit = amountValid && descValid;

  return (
    <div style={{ padding: 28, maxWidth: 860, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title={`Wallet — ${wallet.user.firstName} ${wallet.user.lastName}`}
        subtitle="Transaction history and balance management"
        actions={
          <button type="button" onClick={() => navigate("/wallets")} style={{ fontSize: 13, color: "var(--cd-gray-600)", cursor: "pointer" }}>
            ← Back
          </button>
        }
      />

      {feedback && (
        <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>

        {/* Left — balance + customer info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Balance card */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-sm)", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Current Balance
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 32, color: "var(--cd-red)", marginBottom: 4 }}>
              {etbDisplay(wallet.balanceETB)} ETB
            </div>
            <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>
              Updated {formatDateTime(wallet.updatedAt)}
            </div>
          </div>

          {/* Customer card */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Customer
            </h3>
            {[
              { label: "Name", value: `${wallet.user.firstName} ${wallet.user.lastName}` },
              {
                label: "Username",
                value: wallet.user.username
                  ? (
                    <a
                      href={`https://t.me/${wallet.user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--cd-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                      aria-label={`Open Telegram chat with @${wallet.user.username}`}
                    >
                      @{wallet.user.username}
                      <SendIcon size={11} color="var(--cd-red)" />
                    </a>
                  )
                  : "—",
              },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--cd-gray-100)" }}>
                <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}

            {/* Cross-link to orders */}
            <button
              type="button"
              onClick={() => navigate(`/orders?search=${encodeURIComponent(wallet.user.firstName + " " + wallet.user.lastName)}`)}
              style={{ marginTop: 14, fontSize: 12, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
            >
              View customer orders →
            </button>
          </div>

          {/* Manual credit — SUPER_ADMIN only */}
          {isSuperAdmin && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Manual Credit
              </h3>

              {!showCreditForm ? (
                <Button type="button" variant="primary" size="md" fullWidth onClick={() => setShowCreditForm(true)}>
                  + Add Credit
                </Button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label htmlFor="credit-amount" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      Amount (ETB)
                    </label>
                    <input
                      id="credit-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={creditAmount}
                      onChange={e => setCreditAmount(e.target.value)}
                      placeholder="0.00"
                      style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="credit-desc" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      Description
                    </label>
                    <input
                      id="credit-desc"
                      type="text"
                      value={creditDesc}
                      onChange={e => setCreditDesc(e.target.value)}
                      placeholder="Reason for credit…"
                      style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      disabled={!canSubmitCredit}
                      onClick={() => setShowConfirm(true)}
                    >
                      Apply Credit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => { setShowCreditForm(false); setCreditAmount(""); setCreditDesc(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — transaction history */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Transaction History (last 20)
          </h3>

          {wallet.transactions.length === 0 ? (
            <p style={{ textAlign: "center", padding: "32px 0", color: "var(--cd-gray-500)", fontSize: 13 }}>
              No transactions yet
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 420 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--cd-gray-100)" }}>
                    {["Type", "Amount", "Balance After", "Description", "Date"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, textAlign: h === "Amount" || h === "Balance After" ? "right" : "left", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions.map(tx => {
                    const isCredit = ["DEPOSIT", "REFUND", "ADJUSTMENT", "REWARD"].includes(tx.type);
                    return (
                      <tr key={tx.id} style={{ borderBottom: "1px solid var(--cd-gray-100)" }}>
                        <td style={{ padding: "8px 10px" }}><TxTypeLabel type={tx.type} /></td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, fontSize: 13, color: isCredit ? "#166534" : "#991b1b" }}>
                          {isCredit ? "+" : "−"}{etbDisplay(Math.abs(tx.amountETB))}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "var(--font-heading)", fontWeight: 600, color: "var(--cd-navy)" }}>
                          {etbDisplay(tx.balanceAfter)}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--cd-gray-600)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.description ?? "—"}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--cd-gray-500)", whiteSpace: "nowrap" }}>
                          {formatDateTime(tx.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Transaction type legend */}
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--cd-gray-500)" }}>
            <span style={{ color: "#166534", fontWeight: 600 }}>● Deposit / Refund / Reward = credit</span>
            <span style={{ color: "#991b1b", fontWeight: 600 }}>● Order Payment = debit</span>
            <span style={{ color: "#1e40af", fontWeight: 600 }}>● Adjustment = admin credit</span>
          </div>
        </div>
      </div>

      {/* Credit confirmation modal */}
      <ConfirmModal
        open={showConfirm}
        title="Apply Manual Credit"
        body="This will credit the customer's wallet. Verify the amount before confirming."
        confirmLabel="Apply Credit"
        confirmVariant="primary"
        loading={creditMutation.isPending}
        details={[
          { label: "Customer", value: `${wallet.user.firstName} ${wallet.user.lastName}` },
          { label: "Amount", value: `${parseFloat(creditAmount || "0").toFixed(2)} ETB` },
          { label: "Description", value: creditDesc || "—" },
          { label: "Current Balance", value: `${etbDisplay(wallet.balanceETB)} ETB` },
        ]}
        onConfirm={() => creditMutation.mutate()}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
