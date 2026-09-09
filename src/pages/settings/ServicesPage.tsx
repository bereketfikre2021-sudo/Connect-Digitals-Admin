import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, etbDisplay } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAdminAuthStore } from "@/store/auth.store";
import { PlusIcon, SettingsIcon, ChevronRightIcon } from "@/components/ui/Icon";

interface Package {
  id: string; name: string; description: string | null;
  quantity: number; priceETB: number;
  deliveryDaysMin: number; deliveryDaysMax: number;
  isActive: boolean; sortOrder: number; createdAt: string;
  _count?: { orders: number };
}

interface Service {
  id: string; name: string; slug: string;
  description: string | null; shortDescription: string | null;
  targetType: string; targetLabel: string; targetPlaceholder: string;
  targetHelpText: string | null; requiresTargetUrl: boolean;
  fulfillmentType: string; isActive: boolean; sortOrder: number;
  platform: { id: string; name: string; slug: string };
  packages: Package[];
  _count?: { orders: number };
}

function FeedbackBanner({ type, message, onDismiss }: { type: "success" | "error"; message: string; onDismiss: () => void }) {
  return (
    <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", background: type === "success" ? "#dcfce7" : "#fee2e2", border: `1px solid ${type === "success" ? "#86efac" : "#fca5a5"}`, fontSize: 13, color: type === "success" ? "#166534" : "#991b1b" }}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", color: "inherit", fontSize: 16 }}>×</button>
    </div>
  );
}

// ─── Package Form ─────────────────────────────────────────────────────────────
const EMPTY_PKG = { name: "", description: "", quantity: 1000, priceETB: 0, deliveryDaysMin: 1, deliveryDaysMax: 7, isActive: true, sortOrder: 0 };

function PackageForm({ initial, onSave, onCancel, loading }: {
  initial: typeof EMPTY_PKG & { id?: string };
  onSave: (d: typeof EMPTY_PKG) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [f, setF] = useState(initial);
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }));
  const valid = f.name.trim() && f.quantity > 0 && f.priceETB > 0 && f.deliveryDaysMin > 0 && f.deliveryDaysMax >= f.deliveryDaysMin;

  return (
    <div style={{ background: "var(--cd-gray-50)", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Package Name *</label>
          <input value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. 1,000 Followers" style={{ width: "100%", padding: "7px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Quantity *</label>
          <input type="number" min="1" value={f.quantity} onChange={e => set("quantity", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Price (ETB cents) *</label>
          <input type="number" min="1" value={f.priceETB} onChange={e => set("priceETB", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
          {f.priceETB > 0 && <p style={{ fontSize: 10, color: "var(--cd-gray-500)", marginTop: 3 }}>{etbDisplay(f.priceETB)} ETB</p>}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Min Delivery (days) *</label>
          <input type="number" min="1" value={f.deliveryDaysMin} onChange={e => set("deliveryDaysMin", parseInt(e.target.value) || 1)} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Max Delivery (days) *</label>
          <input type="number" min="1" value={f.deliveryDaysMax} onChange={e => set("deliveryDaysMax", parseInt(e.target.value) || 1)} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Sort Order</label>
          <input type="number" min="0" value={f.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
          <input value={f.description ?? ""} onChange={e => set("description", e.target.value)} placeholder="Optional short description" style={{ width: "100%", padding: "7px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" id="pkg-active" checked={f.isActive} onChange={e => set("isActive", e.target.checked)} />
        <label htmlFor="pkg-active" style={{ fontSize: 13 }}>Active</label>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="button" variant="primary" size="sm" loading={loading} disabled={!valid} onClick={() => onSave(f)}>Save Package</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Service Form ─────────────────────────────────────────────────────────────
const EMPTY_SVC = {
  platformId: "", name: "", slug: "", description: "", shortDescription: "",
  targetType: "PROFILE" as string, targetLabel: "", targetPlaceholder: "",
  targetHelpText: "", requiresTargetUrl: true,
  fulfillmentType: "MANUAL" as string, isActive: true, sortOrder: 0,
};

function ServiceForm({ initial, platforms, onSave, onCancel, loading }: {
  initial: typeof EMPTY_SVC & { id?: string };
  platforms: Array<{ id: string; name: string; slug: string }>;
  onSave: (d: typeof EMPTY_SVC) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [f, setF] = useState(initial);
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }));
  const isEdit = !!initial.id;
  const valid = f.platformId && f.name.trim() && (isEdit || f.slug.trim()) && f.targetLabel.trim() && f.targetPlaceholder.trim();

  const TARGET_TYPES = ["PAGE","PROFILE","POST","VIDEO","CHANNEL","WEBSITE","CUSTOM"];
  const FULFILLMENT_TYPES = ["MANUAL","META_ADS","GOOGLE_ADS","TIKTOK_ADS","CUSTOM"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Platform *</label>
          <select value={f.platformId} onChange={e => set("platformId", e.target.value)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }}>
            <option value="">Select platform…</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Service Name *</label>
          <input value={f.name} onChange={e => set("name", e.target.value)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        {!isEdit && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Slug * (lowercase-hyphens)</label>
            <input value={f.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="tiktok-followers" style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none", fontFamily: "monospace" }} />
          </div>
        )}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Target Type *</label>
          <select value={f.targetType} onChange={e => set("targetType", e.target.value)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }}>
            {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Target Label * (e.g. "Profile URL")</label>
          <input value={f.targetLabel} onChange={e => set("targetLabel", e.target.value)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Placeholder *</label>
          <input value={f.targetPlaceholder} onChange={e => set("targetPlaceholder", e.target.value)} placeholder="https://www.tiktok.com/@username" style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Fulfillment Type</label>
          <select value={f.fulfillmentType} onChange={e => set("fulfillmentType", e.target.value)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }}>
            {FULFILLMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Sort Order</label>
          <input type="number" min="0" value={f.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Short Description</label>
          <input value={f.shortDescription} onChange={e => set("shortDescription", e.target.value)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Help Text (shown below URL input)</label>
          <input value={f.targetHelpText} onChange={e => set("targetHelpText", e.target.value)} style={{ width: "100%", padding: "8px 9px", border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)", fontSize: 13, outline: "none" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={f.requiresTargetUrl} onChange={e => set("requiresTargetUrl", e.target.checked)} /> Requires target URL
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={f.isActive} onChange={e => set("isActive", e.target.checked)} /> Active
        </label>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="button" variant="primary" size="md" loading={loading} disabled={!valid} onClick={() => onSave(f)}>
          {initial.id ? "Update Service" : "Create Service"}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ServicesManagementPage() {
  const qc = useQueryClient();
  const { admin } = useAdminAuthStore();
  const canEdit = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";
  const canDelete = admin?.role === "SUPER_ADMIN";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [showNewService, setShowNewService] = useState(false);
  const [editPkgId, setEditPkgId] = useState<string | null>(null);
  const [showNewPkgFor, setShowNewPkgFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "service" | "package"; id: string; serviceId?: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get<{ success: boolean; data: Service[] }>("/admin/services").then(r => r.data.data),
  });

  // Collect unique platforms from services for the form
  const platforms = services
    ? [...new Map(services.map(s => [s.platform.id, s.platform])).values()]
    : [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-services"] });
  const errMsg = (e: unknown) => (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Operation failed.";

  const createSvc = useMutation({
    mutationFn: (data: typeof EMPTY_SVC) => api.post("/admin/services", data),
    onSuccess: () => { invalidate(); setShowNewService(false); setFeedback({ type: "success", message: "Service created." }); },
    onError: e => setFeedback({ type: "error", message: errMsg(e) }),
  });

  const updateSvc = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_SVC }) => api.patch(`/admin/services/${id}`, data),
    onSuccess: () => { invalidate(); setEditServiceId(null); setFeedback({ type: "success", message: "Service updated." }); },
    onError: e => setFeedback({ type: "error", message: errMsg(e) }),
  });

  const deactivateSvc = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/services/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); setFeedback({ type: "success", message: "Service deactivated." }); },
    onError: e => { setDeleteTarget(null); setFeedback({ type: "error", message: errMsg(e) }); },
  });

  const createPkg = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: typeof EMPTY_PKG }) => api.post(`/admin/services/${serviceId}/packages`, data),
    onSuccess: () => { invalidate(); setShowNewPkgFor(null); setFeedback({ type: "success", message: "Package created." }); },
    onError: e => setFeedback({ type: "error", message: errMsg(e) }),
  });

  const updatePkg = useMutation({
    mutationFn: ({ serviceId, id, data }: { serviceId: string; id: string; data: typeof EMPTY_PKG }) =>
      api.patch(`/admin/services/${serviceId}/packages/${id}`, data),
    onSuccess: () => { invalidate(); setEditPkgId(null); setFeedback({ type: "success", message: "Package updated." }); },
    onError: e => setFeedback({ type: "error", message: errMsg(e) }),
  });

  const deactivatePkg = useMutation({
    mutationFn: ({ serviceId, id }: { serviceId: string; id: string }) =>
      api.delete(`/admin/services/${serviceId}/packages/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); setFeedback({ type: "success", message: "Package deactivated." }); },
    onError: e => { setDeleteTarget(null); setFeedback({ type: "error", message: errMsg(e) }); },
  });

  const isDeleteLoading = deactivateSvc.isPending || deactivatePkg.isPending;

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title="Services & Packages"
        subtitle="Manage promotion services and their pricing packages"
        actions={
          canEdit ? (
            <Button type="button" variant="primary" size="md" onClick={() => setShowNewService(true)}>
              <PlusIcon size={14} color="#fff" /> New Service
            </Button>
          ) : undefined
        }
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* New service form */}
      {showNewService && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-sm)", marginBottom: 20, border: "1.5px solid var(--cd-red)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 700, marginBottom: 18 }}>New Service</h3>
          <ServiceForm
            initial={{ ...EMPTY_SVC }}
            platforms={platforms}
            onSave={data => createSvc.mutate(data)}
            onCancel={() => setShowNewService(false)}
            loading={createSvc.isPending}
          />
        </div>
      )}

      {isLoading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {services?.map(svc => {
            const isExpanded = expandedId === svc.id;
            const isEditingSvc = editServiceId === svc.id;

            return (
              <div key={svc.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "var(--shadow-sm)", overflow: "hidden", border: `1px solid ${svc.isActive ? "var(--cd-gray-200)" : "#fca5a5"}` }}>
                {/* Service header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", borderBottom: isExpanded ? "1px solid var(--cd-gray-100)" : "none", background: svc.isActive ? "#fff" : "#fef2f2" }}
                  onClick={() => { setExpandedId(isExpanded ? null : svc.id); setEditServiceId(null); }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "var(--cd-navy)" }}>{svc.name}</span>
                      <StatusBadge status={svc.isActive ? "ACTIVE" : "CANCELLED"} />
                      <span style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>{svc.platform.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--cd-gray-500)" }}>
                      <span>{svc._count?.orders ?? 0} orders</span>
                      <span>{svc.packages.filter(p => p.isActive).length}/{svc.packages.length} active packages</span>
                      <span style={{ fontFamily: "monospace" }}>{svc.slug}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    {canEdit && !isEditingSvc && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEditServiceId(svc.id); setExpandedId(svc.id); }}>
                        <SettingsIcon size={12} color="var(--cd-red)" /> Edit
                      </Button>
                    )}
                    {canDelete && svc.isActive && (
                      <Button type="button" variant="danger" size="sm" onClick={() => setDeleteTarget({ type: "service", id: svc.id, name: svc.name })}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                  <ChevronRightIcon size={16} color="var(--cd-gray-500)" style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: "16px 20px" }}>
                    {/* Service edit form */}
                    {isEditingSvc ? (
                      <>
                        <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Edit Service</h4>
                        <ServiceForm
                          initial={{ platformId: svc.platform.id, name: svc.name, slug: svc.slug, description: svc.description ?? "", shortDescription: svc.shortDescription ?? "", targetType: svc.targetType, targetLabel: svc.targetLabel, targetPlaceholder: svc.targetPlaceholder, targetHelpText: svc.targetHelpText ?? "", requiresTargetUrl: svc.requiresTargetUrl, fulfillmentType: svc.fulfillmentType, isActive: svc.isActive, sortOrder: svc.sortOrder, id: svc.id }}
                          platforms={platforms}
                          onSave={data => updateSvc.mutate({ id: svc.id, data })}
                          onCancel={() => setEditServiceId(null)}
                          loading={updateSvc.isPending}
                        />
                        <div style={{ height: 1, background: "var(--cd-gray-200)", margin: "20px 0" }} />
                      </>
                    ) : null}

                    {/* Packages section */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Packages ({svc.packages.length})
                      </h4>
                      {canEdit && (
                        <Button type="button" variant="primary" size="sm" onClick={() => setShowNewPkgFor(svc.id)}>
                          <PlusIcon size={12} color="#fff" /> Add Package
                        </Button>
                      )}
                    </div>

                    {/* New package form */}
                    {showNewPkgFor === svc.id && (
                      <div style={{ marginBottom: 12 }}>
                        <PackageForm
                          initial={{ ...EMPTY_PKG }}
                          onSave={data => createPkg.mutate({ serviceId: svc.id, data })}
                          onCancel={() => setShowNewPkgFor(null)}
                          loading={createPkg.isPending}
                        />
                      </div>
                    )}

                    {/* Package list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {svc.packages.map(pkg => (
                        <div key={pkg.id}>
                          {editPkgId === pkg.id ? (
                            <PackageForm
                              initial={{ name: pkg.name, description: pkg.description ?? "", quantity: pkg.quantity, priceETB: pkg.priceETB, deliveryDaysMin: pkg.deliveryDaysMin, deliveryDaysMax: pkg.deliveryDaysMax, isActive: pkg.isActive, sortOrder: pkg.sortOrder, id: pkg.id }}
                              onSave={data => updatePkg.mutate({ serviceId: svc.id, id: pkg.id, data })}
                              onCancel={() => setEditPkgId(null)}
                              loading={updatePkg.isPending}
                            />
                          ) : (
                            <div style={{ background: "var(--cd-gray-50)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${pkg.isActive ? "var(--cd-gray-200)" : "#fca5a5"}` }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13, color: "var(--cd-navy)" }}>{pkg.name}</span>
                                  <StatusBadge status={pkg.isActive ? "ACTIVE" : "CANCELLED"} />
                                </div>
                                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--cd-gray-500)" }}>
                                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--cd-red)" }}>{etbDisplay(pkg.priceETB)} ETB</span>
                                  <span>{pkg.quantity.toLocaleString()} units</span>
                                  <span>{pkg.deliveryDaysMin}–{pkg.deliveryDaysMax} days</span>
                                  <span>{pkg._count?.orders ?? 0} orders</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                {canEdit && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditPkgId(pkg.id)}>
                                    <SettingsIcon size={11} color="var(--cd-red)" /> Edit
                                  </Button>
                                )}
                                {canDelete && pkg.isActive && (
                                  <Button type="button" variant="danger" size="sm" onClick={() => setDeleteTarget({ type: "package", id: pkg.id, serviceId: svc.id, name: pkg.name })}>
                                    Off
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {svc.packages.length === 0 && (
                        <p style={{ fontSize: 12, color: "var(--cd-gray-500)", textAlign: "center", padding: "12px 0" }}>No packages yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {services?.length === 0 && (
            <p style={{ textAlign: "center", padding: "32px 0", color: "var(--cd-gray-500)", fontSize: 13 }}>No services yet.</p>
          )}
        </div>
      )}

      {/* Deactivate confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title={deleteTarget?.type === "service" ? "Deactivate Service" : "Deactivate Package"}
        body={deleteTarget?.type === "service"
          ? "The service and all its packages will be hidden from customers. Existing orders are unaffected."
          : "This package will be hidden from customers. Existing orders are unaffected."}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={isDeleteLoading}
        details={deleteTarget ? [{ label: deleteTarget.type === "service" ? "Service" : "Package", value: deleteTarget.name }] : []}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === "service") deactivateSvc.mutate(deleteTarget.id);
          else deactivatePkg.mutate({ serviceId: deleteTarget.serviceId!, id: deleteTarget.id });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
