import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAdminAuthStore } from "@/store/auth.store";
import { PlusIcon } from "@/components/ui/Icon";

interface AdminUser { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; createdAt: string }

const EMPTY = { email: "", password: "", firstName: "", lastName: "", role: "OPERATOR" };

export function AdminUsersPage() {
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<{ success: boolean; data: AdminUser[] }>("/admin/admin-users").then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post("/admin/admin-users", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setShowForm(false); setForm(EMPTY); setFeedback("Admin user created."); },
    onError: (e: unknown) => setFeedback((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to create user"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/admin-users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setDeactivateTarget(null); setFeedback("Admin deactivated."); },
    onError: () => { setDeactivateTarget(null); setFeedback("Failed to deactivate."); },
  });

  if (!isSuperAdmin) return (
    <div style={{ padding: 28 }}>
      <PageHeader title="Admin Users" subtitle="Manage admin accounts" />
      <p style={{ color: "var(--cd-gray-500)", fontSize: 13 }}>Super Admin access required.</p>
    </div>
  );

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title="Admin Users"
        subtitle="Manage admin accounts — Super Admin only"
        actions={<Button type="button" variant="primary" size="md" onClick={() => setShowForm(v => !v)}><PlusIcon size={14} color="#fff" /> {showForm ? "Cancel" : "Add Admin"}</Button>}
      />

      {feedback && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#dcfce7", border: "1px solid #86efac", fontSize: 13, color: "#166534", display: "flex", justifyContent: "space-between" }}>
          {feedback}
          <button type="button" onClick={() => setFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-sm)", marginBottom: 20, border: "1.5px solid var(--cd-red)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>New Admin User</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { key: "firstName", label: "First Name" },
              { key: "lastName",  label: "Last Name" },
              { key: "email",     label: "Email", type: "email" },
              { key: "password",  label: "Password", type: "password" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type ?? "text"} value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: 8, fontSize: 13 }} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--cd-gray-300)", borderRadius: 8, fontSize: 13 }}>
                <option value="OPERATOR">Operator</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <Button type="button" variant="primary" size="md" loading={createMutation.isPending}
              disabled={!form.email || !form.password || !form.firstName} onClick={() => createMutation.mutate()}>
              Create Admin
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? <Spinner /> : (
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                {["Name", "Email", "Role", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--cd-gray-100)" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--cd-gray-600)" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={u.role} /></td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={u.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    {u.isActive && u.id !== admin?.id && (
                      <Button type="button" variant="danger" size="sm" onClick={() => setDeactivateTarget(u)}>Deactivate</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deactivateTarget}
        title="Deactivate Admin"
        body="This admin will lose access to the dashboard immediately."
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={deactivateMutation.isPending}
        details={deactivateTarget ? [{ label: "Name", value: `${deactivateTarget.firstName} ${deactivateTarget.lastName}` }, { label: "Role", value: deactivateTarget.role }] : []}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
