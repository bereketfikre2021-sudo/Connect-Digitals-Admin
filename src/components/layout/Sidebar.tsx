import { NavLink } from "react-router-dom";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAdminAuthStore } from "@/store/auth.store";
import {
  BarChartIcon, CreditCardIcon, PackageIcon,
  ClipboardIcon, UsersIcon, WalletIcon, LogOutIcon,
  FileTextIcon, TrendUpIcon, GridIcon, BellIcon, SendIcon,
} from "@/components/ui/Icon";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV = [
  { to: "/",              Icon: BarChartIcon,   label: "Dashboard" },
  { to: "/payments",      Icon: CreditCardIcon, label: "Payments" },
  { to: "/orders",        Icon: ClipboardIcon,  label: "Orders" },
  { to: "/fulfillment",   Icon: PackageIcon,    label: "Fulfillment" },
  { to: "/customers",     Icon: UsersIcon,      label: "Customers" },
  { to: "/wallets",       Icon: WalletIcon,     label: "Wallets" },
  { to: "/broadcast",     Icon: SendIcon,       label: "Broadcast" },
  { to: "/reports",       Icon: FileTextIcon,   label: "Reports" },
  { to: "/analytics",     Icon: TrendUpIcon,    label: "Analytics" },
  { to: "/notifications", Icon: BellIcon,       label: "Notifications", bell: true },
] as const;

const SETTINGS_NAV = [
  { to: "/settings/services",        Icon: GridIcon,       label: "Services" },
  { to: "/settings/payment-methods", Icon: CreditCardIcon, label: "Methods" },
] as const;

const ALL_NAV = [...NAV, ...SETTINGS_NAV];

type IconComp = (p: { size?: number; color?: string }) => JSX.Element;

// ── Role colours ──────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  SUPER_ADMIN: { bg: "rgba(236,28,36,0.25)", text: "#fca5a5", label: "Super Admin" },
  ADMIN:       { bg: "rgba(59,130,246,0.25)", text: "#93c5fd", label: "Admin"       },
  OPERATOR:    { bg: "rgba(100,116,139,0.25)", text: "#cbd5e1", label: "Operator"   },
};

// ── Brand logo with upload ─────────────────────────────────────────────────────

function BrandLogo({ size = 34 }: { size?: number }) {
  const { logoUrl, uploadLogo, clearLogo } = useAdminAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > 2 * 1024 * 1024) { setUploadError("Image must be under 2 MB"); e.target.value = ""; return; }
    setUploading(true);
    try { await uploadLogo(file); }
    catch (err: unknown) {
      setUploadError(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Upload failed."
      );
    } finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => { setUploadError(null); fileRef.current?.click(); }}
          title="Click to upload logo"
          aria-label="Upload brand logo"
          disabled={uploading}
          style={{
            width: size, height: size, borderRadius: 10, overflow: "hidden",
            background: logoUrl ? "transparent" : "linear-gradient(135deg,#EC1C24,#c81019)",
            border: logoUrl ? "1.5px solid rgba(255,255,255,0.15)" : "none",
            cursor: uploading ? "wait" : "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", opacity: uploading ? 0.6 : 1,
            boxShadow: logoUrl ? "none" : "0 2px 8px rgba(236,28,36,0.4)",
          }}
        >
          {logoUrl
            ? <img src={logoUrl} alt="Brand" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : uploading
              ? <div className="animate-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
              : <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "#fff", fontSize: Math.round(size * 0.38) }}>CD</span>
          }
          {!uploading && (
            <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 700, letterSpacing: 0.5, opacity: 0, transition: "opacity 0.15s" }} className="logo-upload-hint">
              CHANGE
            </span>
          )}
        </button>
        {logoUrl && !uploading && (
          <button type="button" onClick={e => { e.stopPropagation(); clearLogo(); }} aria-label="Remove logo"
            style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#1e293b", fontWeight: 700, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        )}
      </div>
      {uploadError && (
        <div role="alert" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "6px 10px", fontSize: 10, color: "#991b1b", lineHeight: 1.4, zIndex: 20 }}>
          {uploadError}
          <button type="button" onClick={() => setUploadError(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: 700, fontSize: 12, padding: 0 }}>×</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} style={{ display: "none" }} />
    </>
  );
}

// ── Desktop nav item ───────────────────────────────────────────────────────────

function NavItem({ to, Icon, label, badge }: { to: string; Icon: IconComp; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 10px", borderRadius: 8, marginBottom: 1,
        fontSize: 13, fontWeight: isActive ? 600 : 400,
        textDecoration: "none",
        transition: "all 0.15s",
        background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
        color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
        borderLeft: isActive ? "3px solid #EC1C24" : "3px solid transparent",
        paddingLeft: isActive ? 8 : 10,
      })}
    >
      {({ isActive }) => (
        <>
          <div style={{ position: "relative", flexShrink: 0, width: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} color={isActive ? "#fff" : "rgba(255,255,255,0.55)"} />
            {badge != null && badge > 0 && (
              <div style={{ position: "absolute", top: -5, right: -8, minWidth: 14, height: 14, borderRadius: 7, background: "#EC1C24", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {badge > 99 ? "99+" : badge}
              </div>
            )}
          </div>
          <span style={{ fontSize: 12.5 }}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────

function DesktopSidebar() {
  const { admin, logout } = useAdminAuthStore();

  const { data: unreadData } = useQuery({
    queryKey: ["admin-notif-unread"],
    queryFn: () => api.get<{ success: boolean; data: { unreadCount: number } }>("/admin/notifications/unread").then(r => r.data.data),
    refetchInterval: 20_000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;
  const role = admin?.role ?? "OPERATOR";
  const roleStyle = ROLE_STYLE[role] ?? ROLE_STYLE["OPERATOR"]!;
  const initials = `${admin?.firstName?.[0] ?? ""}${admin?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <aside style={{
      width: "var(--sidebar-width)", flexShrink: 0,
      background: "linear-gradient(180deg, #030d28 0%, #000F33 60%, #010a20 100%)",
      color: "#fff", display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      borderRight: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "4px 0 20px rgba(0,0,0,0.25)",
    }}>

      {/* ── Header ── */}
      <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <BrandLogo size={34} />
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13.5, color: "#fff", lineHeight: 1.2 }}>
              Connect Digitals
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Admin Dashboard</div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }} aria-label="Main navigation">
        {NAV.map(item => (
          <NavItem
            key={item.to}
            to={item.to}
            Icon={item.Icon}
            label={item.label}
            badge={"bell" in item && item.bell ? unreadCount : undefined}
          />
        ))}

        <div style={{ margin: "14px 0 6px", paddingLeft: 10 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
            Settings
          </span>
        </div>
        {SETTINGS_NAV.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      {/* ── User profile card ── */}
      <div style={{ padding: "12px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Avatar + name row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#EC1C24,#c81019)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff",
            boxShadow: "0 2px 6px rgba(236,28,36,0.4)",
          }}>
            {initials || "A"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {admin?.firstName} {admin?.lastName}
            </div>
            <span style={{ display: "inline-block", marginTop: 2, padding: "1px 7px", borderRadius: 99, background: roleStyle.bg, color: roleStyle.text, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4 }}>
              {roleStyle.label}
            </span>
          </div>
        </div>

        {/* Sign out button */}
        <button
          type="button"
          onClick={() => logout()}
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 7,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
        >
          <LogOutIcon size={13} color="currentColor" /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────

function MobileBottomNav() {
  const { logout } = useAdminAuthStore();
  const { data: unreadData } = useQuery({
    queryKey: ["admin-notif-unread"],
    queryFn: () => api.get<{ success: boolean; data: { unreadCount: number } }>("/admin/notifications/unread").then(r => r.data.data),
    refetchInterval: 20_000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;
  const visibleItems = ALL_NAV.slice(0, 5);

  return (
    <nav aria-label="Mobile navigation" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: "linear-gradient(180deg,#030d28,#000F33)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "stretch", height: 60,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {visibleItems.map(({ to, Icon, label }) => {
        const isBell = "bell" in (ALL_NAV.find(n => n.to === to) ?? {});
        const badge = isBell && unreadCount > 0 ? unreadCount : 0;
        return (
          <NavLink key={to} to={to} end={to === "/"}
            style={({ isActive }) => ({
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              textDecoration: "none", fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
              color: isActive ? "#EC1C24" : "rgba(255,255,255,0.45)",
              borderTop: isActive ? "2px solid #EC1C24" : "2px solid transparent",
              transition: "color 0.15s, border-color 0.15s", paddingTop: 2,
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{ position: "relative" }}>
                  <Icon size={20} color={isActive ? "#EC1C24" : "rgba(255,255,255,0.45)"} />
                  {badge > 0 && (
                    <div style={{ position: "absolute", top: -4, right: -6, minWidth: 14, height: 14, borderRadius: 7, background: "#EC1C24", color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>
                      {badge > 99 ? "99+" : badge}
                    </div>
                  )}
                </div>
                {label}
              </>
            )}
          </NavLink>
        );
      })}
      <button type="button" onClick={() => logout()}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", borderTop: "2px solid transparent", cursor: "pointer", fontSize: 9, fontWeight: 600, letterSpacing: 0.3, color: "rgba(255,255,255,0.45)", paddingTop: 2 }}>
        <LogOutIcon size={20} color="rgba(255,255,255,0.45)" />
        Sign Out
      </button>
    </nav>
  );
}

export function Sidebar() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile ? <MobileBottomNav /> : <DesktopSidebar />;
}
