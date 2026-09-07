import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAdminAuthStore } from "@/store/auth.store";
import { PlusIcon, SettingsIcon, UploadIcon } from "@/components/ui/Icon";

interface PaymentMethod {
  id: string; name: string; description: string | null;
  accountName: string; accountNumber: string; bankName: string | null;
  instructions: string; isActive: boolean; sortOrder: number;
  createdAt: string; updatedAt: string;
  _count: { payments: number };
}

const EMPTY_FORM = {
  name: "", description: "", accountName: "", accountNumber: "",
  bankName: "", instructions: "", sortOrder: 0, isActive: true,
  logoUrl: "",
};

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

// ─── Logo upload helper ───────────────────────────────────────────────────────
function LogoUpload({
  logoUrl, onUploaded,
}: {
  logoUrl: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Max 2MB"); return; }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file); // admin logo upload endpoint
      const res = await api.post<{ success: boolean; data: { key: string; signedUrl: string } }>(
        "/admin/payment-methods/upload-logo", formData, { headers: { "Content-Type": "multipart/form-data" } }
      );
      onUploaded(res.data.data.signedUrl);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        Logo / Icon <span style={{ color: "var(--cd-gray-500)", fontWeight: 400 }}>(optional — shown to customers)</span>
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Preview */}
        <div style={{
          width: 64, height: 64, borderRadius: 10,
          background: "var(--cd-gray-100)", border: "1px solid var(--cd-gray-300)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <UploadIcon size={22} color="var(--cd-gray-500)" />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* URL input (paste a link) */}
          <input
            type="url"
            value={logoUrl}
            onChange={e => onUploaded(e.target.value)}
            placeholder="https://… or upload below"
            style={{ width: "100%", padding: "7px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 12, outline: "none", marginBottom: 6 }}
          />

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "5px 12px", background: "var(--cd-gray-100)", border: "1px solid var(--cd-gray-300)",
              borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            {uploading
              ? <span className="animate-spin" style={{ width: 12, height: 12, border: "2px solid var(--cd-gray-400)", borderTopColor: "var(--cd-red)", borderRadius: "50%" }} />
              : <UploadIcon size={12} color="var(--cd-gray-600)" />
            }
            {uploading ? "Uploading…" : "Upload file"}
          </button>
          {error && <p style={{ fontSize: 11, color: "var(--cd-error)", marginTop: 4 }}>{error}</p>}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}

// ─── Method form ──────────────────────────────────────────────────────────────
function MethodForm({
  initial, onSave, onCancel, loading,
}: {
  initial: typeof EMPTY_FORM & { id?: string };
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.accountName.trim() && form.accountNumber.trim() && form.instructions.trim();

  const fields: Array<{ key: keyof typeof EMPTY_FORM; label: string; required?: boolean; type?: string; multiline?: boolean }> = [
    { key: "name",          label: "Method Name",      required: true },
    { key: "accountName",   label: "Account Name",     required: true },
    { key: "accountNumber", label: "Account Number",   required: true },
    { key: "bankName",      label: "Bank / Service Name" },
    { key: "description",   label: "Short Description (shown to customers)" },
    { key: "instructions",  label: "Step-by-step Instructions", required: true, multiline: true },
    { key: "sortOrder",     label: "Sort Order (lower = first)", type: "number" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Logo upload — top of form */}
      <LogoUpload
        logoUrl={form.logoUrl}
        onUploaded={url => set("logoUrl", url)}
      />

      <hr style={{ border: "none", borderTop: "1px solid var(--cd-gray-200)" }} />

      {fields.map(f => (
        <div key={f.key}>
          <label htmlFor={`pm-${f.key}`} style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
            {f.label}{f.required && <span style={{ color: "var(--cd-red)", marginLeft: 4 }}>*</span>}
          </label>
          {f.multiline ? (
            <textarea
              id={`pm-${f.key}`}
              rows={3}
              value={form[f.key] as string}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.key === "instructions" ? "1. Open your bank app\n2. Transfer the amount\n3. Upload a screenshot" : undefined}
              style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, resize: "vertical", fontFamily: "var(--font-body)", outline: "none" }}
            />
          ) : (
            <input
              id={`pm-${f.key}`}
              type={f.type ?? "text"}
              value={form[f.key] as string | number}
              onChange={e => set(f.key, f.type === "number" ? parseInt(e.target.value) || 0 : e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }}
            />
          )}
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" id="pm-active" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
        <label htmlFor="pm-active" style={{ fontSize: 13, fontWeight: 500 }}>Active (visible to customers)</label>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <Button type="button" variant="primary" size="md" loading={loading} disabled={!valid} onClick={() => onSave(form)}>
          Save Method
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function PaymentMethodsPage() {
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();
  const canEdit  = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";
  const canDelete = admin?.role === "SUPER_ADMIN";

  const [showForm,     setShowForm]     = useState<"new" | string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [feedback,     setFeedback]     = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: methods, isLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: () => api.get<{ success: boolean; data: PaymentMethod[] }>("/admin/payment-methods").then(r => r.data.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
  const errMsg = (e: unknown) => (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;

  // logoUrl is stored in description as JSON: {"logoUrl":"...","text":"..."}
  // For backward compat with plain description strings we handle both
  const getLogoUrl = (m: PaymentMethod) => {
    try {
      const parsed = JSON.parse(m.description ?? "{}");
      return (parsed.logoUrl as string) ?? "";
    } catch { return ""; }
  };
  const getDescText = (m: PaymentMethod) => {
    try {
      const parsed = JSON.parse(m.description ?? "{}");
      return (parsed.text as string) ?? (m.description ?? "");
    } catch { return m.description ?? ""; }
  };

  const buildDescription = (logoUrl: string, text: string) =>
    logoUrl || text ? JSON.stringify({ logoUrl, text }) : "";

  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { logoUrl, ...rest } = data;
      return api.post("/admin/payment-methods", {
        ...rest,
        description: buildDescription(logoUrl, data.description),
      });
    },
    onSuccess: () => { invalidate(); setShowForm(null); setFeedback({ type: "success", message: "Payment method created." }); },
    onError: e => setFeedback({ type: "error", message: errMsg(e) ?? "Create failed." }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_FORM }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { logoUrl, ...rest } = data;
      return api.patch(`/admin/payment-methods/${id}`, {
        ...rest,
        description: buildDescription(logoUrl, data.description),
      });
    },
    onSuccess: () => { invalidate(); setShowForm(null); setFeedback({ type: "success", message: "Payment method updated." }); },
    onError: e => setFeedback({ type: "error", message: errMsg(e) ?? "Update failed." }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/payment-methods/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); setFeedback({ type: "success", message: "Payment method deactivated." }); },
    onError: e => { setDeleteTarget(null); setFeedback({ type: "error", message: errMsg(e) ?? "Deactivate failed." }); },
  });

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title="Payment Methods"
        subtitle="Manage bank accounts and mobile money methods shown to customers"
        actions={
          canEdit ? (
            <Button type="button" variant="primary" size="md" onClick={() => setShowForm("new")}>
              <PlusIcon size={14} color="#fff" /> Add Method
            </Button>
          ) : undefined
        }
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* New method form */}
      {showForm === "new" && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-sm)", marginBottom: 20, border: "1.5px solid var(--cd-red)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 700, marginBottom: 18 }}>New Payment Method</h3>
          <MethodForm
            initial={{ ...EMPTY_FORM }}
            onSave={data => createMutation.mutate(data)}
            onCancel={() => setShowForm(null)}
            loading={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {methods?.map(m => {
            const logoUrl  = getLogoUrl(m);
            const descText = getDescText(m);
            const isEditing = showForm === m.id;

            return (
              <div key={m.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden", border: `1px solid ${m.isActive ? "var(--cd-gray-200)" : "#fca5a5"}` }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--cd-gray-100)", background: m.isActive ? "#fff" : "#fef2f2", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    {/* Logo thumbnail */}
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--cd-gray-100)", border: "1px solid var(--cd-gray-200)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {logoUrl
                        ? <img src={logoUrl} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "var(--cd-navy)" }}>
                            {m.name.slice(0, 2).toUpperCase()}
                          </span>
                      }
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "var(--cd-navy)" }}>{m.name}</span>
                        <StatusBadge status={m.isActive ? "ACTIVE" : "CANCELLED"} />
                        <span style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>{m._count.payments} payments</span>
                      </div>
                      {descText && <p style={{ fontSize: 12, color: "var(--cd-gray-600)", marginTop: 2 }}>{descText}</p>}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {canEdit && !isEditing && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(m.id)}>
                        <SettingsIcon size={13} color="var(--cd-red)" /> Edit
                      </Button>
                    )}
                    {canDelete && m.isActive && (
                      <Button type="button" variant="danger" size="sm" onClick={() => setDeleteTarget(m)}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Body */}
                {!isEditing ? (
                  <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px 24px" }}>
                    {[
                      { label: "Account Name",   value: m.accountName },
                      { label: "Account Number", value: m.accountNumber },
                      { label: "Bank / Service", value: m.bankName ?? "—" },
                      { label: "Sort Order",     value: String(m.sortOrder) },
                      { label: "Last Updated",   value: formatDateTime(m.updatedAt) },
                    ].map(row => (
                      <div key={row.label}>
                        <p style={{ fontSize: 11, color: "var(--cd-gray-500)", marginBottom: 2 }}>{row.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--cd-navy)" }}>{row.value}</p>
                      </div>
                    ))}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p style={{ fontSize: 11, color: "var(--cd-gray-500)", marginBottom: 2 }}>Instructions</p>
                      <p style={{ fontSize: 13, color: "var(--cd-gray-700)", lineHeight: 1.55, whiteSpace: "pre-line" }}>{m.instructions}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "16px 20px" }}>
                    <MethodForm
                      initial={{
                        name: m.name, description: descText,
                        accountName: m.accountName, accountNumber: m.accountNumber,
                        bankName: m.bankName ?? "", instructions: m.instructions,
                        sortOrder: m.sortOrder, isActive: m.isActive,
                        logoUrl, id: m.id,
                      }}
                      onSave={data => updateMutation.mutate({ id: m.id, data })}
                      onCancel={() => setShowForm(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {methods?.length === 0 && (
            <p style={{ textAlign: "center", padding: "32px 0", color: "var(--cd-gray-500)", fontSize: 13 }}>
              No payment methods yet. Add one above.
            </p>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate Payment Method"
        body="This method will no longer appear to customers. Existing payments are unaffected."
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        details={deleteTarget ? [{ label: "Method", value: deleteTarget.name }, { label: "Payments", value: `${deleteTarget._count.payments} total` }] : []}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
