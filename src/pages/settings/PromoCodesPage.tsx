import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { PlusIcon } from "@/components/ui/Icon";
import { useAdminAuthStore } from "@/store/auth.store";

interface PromoCode { id: string; code: string; discountPercent: number; maxUses: number | null; usedCount: number; minOrderETB: number; expiresAt: string | null; isActive: boolean; createdAt: string }

const EMPTY = { code: "", discountPercent: "10", maxUses: "", minOrderETB: "0", expiresAt: "" };

export function PromoCodesPage() {
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();
  const canEdit = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["promo-codes"],
    queryFn: () => api.get<{ success: boolean; data: PromoCode[] }>("/admin/promo-codes").then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post("/admin/promo-codes", {
      code:            form.code.trim().toUpperCase(),
      discountPercent: parseInt(form.discountPercent) || 10,
      maxUses:         form.maxUses ? parseInt(form.maxUses) : null,
      minOrderETB:     Math.round((parseFloat(form.minOrderETB) || 0) * 100),
      expiresAt:       form.expiresAt || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["promo-codes"] }); setShowForm(false); setForm(EMPTY); setFeedback({ type: "success", msg: "Promo code created." }); },
    onError: (e: unknown) => setFeedback({ type: "error", msg: (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to create code" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/admin/promo-codes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promo-codes"] }),
  });

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Promo Codes" subtitle="Discount codes for customers"
        actions={canEdit ? <Button type="button" variant="primary" size="md" onClick={() => setShowForm(v => !v)}><PlusIcon size={14} color="#fff" /> {showForm ? "Cancel" : "New Code"}</Button> : undefined}
      />

      {feedback && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: feedback.type === "success" ? "#dcfce7" : "#fee2e2", border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fca5a5"}`, fontSize: 13, color: feedback.type === "success" ? "#166534" : "#991b1b", display: "flex", justifyContent: "space-between" }}>
          {feedback.msg}
          <button type="button" onClick={() => setFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      {showForm && canEdit && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-sm)", marginBottom: 20, border: "1.5px solid var(--cd-red)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>New Promo Code</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { key: "code",            label: "Code (e.g. LAUNCH20)", placeholder: "LAUNCH20" },
              { key: "discountPercent", label: "Discount %",   placeholder: "10" },
              { key: "maxUses",         label: "Max Uses (blank = unlimited)", placeholder: "100" },
              { key: "minOrderETB",     label: "Min Order (ETB)", placeholder: "0" },
              { key: "expiresAt",       label: "Expires At (optional)", type: "date" },
            ].map(f => (
              <div key={f.key} style={f.key === "expiresAt" ? { gridColumn: "1 / -1" } : {}}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.label}</label>
                <input
                  type={f.type ?? "text"}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: 8, fontSize: 13 }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Button type="button" variant="primary" size="md" loading={createMutation.isPending} disabled={!form.code.trim()} onClick={() => createMutation.mutate()}>Create Code</Button>
            <Button type="button" variant="ghost" size="md" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? <Spinner /> : (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                {["Code", "Discount", "Uses", "Min Order", "Expires", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--cd-gray-100)" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{c.code}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--cd-red)" }}>{c.discountPercent}%</td>
                  <td style={{ padding: "12px 16px", fontSize: 12 }}>{c.usedCount}{c.maxUses !== null ? ` / ${c.maxUses}` : " / ∞"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12 }}>{c.minOrderETB > 0 ? `${(c.minOrderETB / 100).toFixed(0)} ETB` : "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--cd-gray-600)" }}>{c.expiresAt ? formatDateTime(c.expiresAt) : "Never"}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={c.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    {canEdit && (
                      <Button type="button" variant={c.isActive ? "danger" : "success"} size="sm" loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}>
                        {c.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--cd-gray-500)", fontSize: 13 }}>No promo codes yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
