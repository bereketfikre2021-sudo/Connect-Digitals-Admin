import { NavLink } from "react-router-dom";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAdminAuthStore } from "@/store/auth.store";
import {
  BarChartIcon, CreditCardIcon, PackageIcon,
  ClipboardIcon, UsersIcon, WalletIcon, LogOutIcon,
  FileTextIcon, TrendUpIcon, GridIcon, BellIcon,
} from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Campaigns removed from top-level nav — a Campaign belongs to an Order and
// is accessible via the Order detail page ("Open Campaign →"). Keeping the
// /campaigns and /campaigns/:id routes alive for direct links.
const NAV = [
  { to: "/",              Icon: BarChartIcon,   label: "Dashboard" },
  { to: "/payments",      Icon: CreditCardIcon, label: "Payments" },
  { to: "/orders",        Icon: ClipboardIcon,  label: "Orders" },
  { to: "/fulfillment",   Icon: PackageIcon,    label: "Fulfillment" },
  { to: "/customers",     Icon: UsersIcon,      label: "Customers" },
  { to: "/wallets",       Icon: WalletIcon,     label: "Wallets" },
  { to: "/reports",       Icon: FileTextIcon,   label: "Reports" },
  { to: "/analytics",     Icon: TrendUpIcon,    label: "Analytics" },
  { to: "/notifications", Icon: BellIcon,       label: "Notifications", bell: true },
];

const SETTINGS_NAV = [
  { to: "/settings/services",         Icon: GridIcon,       label: "Services" },
  { to: "/settings/payment-methods",  Icon: CreditCardIcon, label: "Methods" },
];

// All nav items flattened for mobile bottom bar
const ALL_NAV = [...NAV, ...SETTINGS_NAV];

type IconComp = (p: { size?: number; color?: string }) => JSX.Element;

function DesktopNavItem({ to, Icon, label, badge }: { to: string; Icon: IconComp; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 10px", borderRadius: "var(--radius-sm)", marginBottom: 2,
        fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "background 0.15s",
        background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
      })}
    >
      {({ isActive }) => (
        <>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Icon size={16} color={isActive ? "#fff" : "rgba(255,255,255,0.65)"} />
            {badge != null && badge > 0 && (
              <div style={{ position: "absolute", top: -5, right: -7, minWidth: 15, height: 15, borderRadius: 8, background: "#EC1C24", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {badge > 99 ? "99+" : badge}
              </div>
            )}
          </div>
          {label}
        </>
      )}
    </NavLink>
  );
}

function BrandLogo({ size = 32 }: { size?: number }) {
  const { logoUrl, uploadLogo, clearLogo } = useAdminAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image must be under 2 MB");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      await uploadLogo(file);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Upload failed. Please try again.";
      setUploadError(msg);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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
            width: size, height: size,
            borderRadius: 8, overflow: "hidden",
            background: logoUrl ? "transparent" : "var(--cd-red)",
            border: logoUrl ? "1.5px solid rgba(255,255,255,0.2)" : "none",
            cursor: uploading ? "wait" : "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", opacity: uploading ? 0.6 : 1,
          }}
        >
          {logoUrl
            ? <img src={logoUrl} alt="Brand logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : uploading
              ? <div className="animate-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
              : <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "#fff", fontSize: Math.round(size * 0.4) }}>CD</span>
          }
          {!uploading && (
            <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 0.3, opacity: 0, transition: "opacity 0.15s" }} className="logo-upload-hint">
              CHANGE
            </span>
          )}
        </button>
        {/* Remove logo × button */}
        {logoUrl && !uploading && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); clearLogo(); }}
            aria-label="Remove brand logo"
            title="Remove logo"
            style={{ position: "absolute", top: -5, right: -5, width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#1e293b", fontWeight: 700, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        )}
      </div>
      {/* Inline upload error — shown below the logo in the sidebar header */}
      {uploadError && (
        <div
          role="alert"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6,
            padding: "6px 8px", fontSize: 10, color: "#991b1b", lineHeight: 1.4,
            zIndex: 10, whiteSpace: "normal",
          }}
        >
          {uploadError}
          <button
            type="button"
            onClick={() => setUploadError(null)}
            aria-label="Dismiss error"
            style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: 700, fontSize: 12, padding: 0, lineHeight: 1 }}
          >×</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} style={{ display: "none" }} />
    </>
  );
}

function DesktopSidebar() {
  const { admin, logout } = useAdminAuthStore();

  const { data: unreadData } = useQuery({
    queryKey: ["admin-notif-unread"],
    queryFn: () => api.get<{ success: boolean; data: { unreadCount: number } }>("/admin/notifications/unread").then(r => r.data.data),
    refetchInterval: 20_000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  return (
    <aside style={{
      width: "var(--sidebar-width)", flexShrink: 0,
      background: "var(--cd-navy)", color: "#fff",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <BrandLogo size={32} />
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
              Connect Digitals
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Admin Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }} aria-label="Main navigation">
        {NAV.map(item => (
          <DesktopNavItem
            key={item.to}
            to={item.to}
            Icon={item.Icon}
            label={item.label}
            badge={"bell" in item && item.bell ? unreadCount : undefined}
          />
        ))}

        <div style={{ marginTop: 16, marginBottom: 6, paddingLeft: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
            Settings
          </span>
        </div>
        {SETTINGS_NAV.map(item => <DesktopNavItem key={item.to} {...item} />)}
      </nav>

      {/* User info */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 2, fontWeight: 600 }}>
          {admin?.firstName} {admin?.lastName}
        </div>
        <div style={{ marginBottom: 8 }}>
          {admin?.role && <StatusBadge status={admin.role} />}
        </div>
        <button
          type="button"
          onClick={() => logout()}
          style={{
            fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer",
            background: "none", border: "none", padding: 0,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <LogOutIcon size={13} color="rgba(255,255,255,0.5)" /> Sign out
        </button>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const { logout } = useAdminAuthStore();

  const { data: unreadData } = useQuery({
    queryKey: ["admin-notif-unread"],
    queryFn: () => api.get<{ success: boolean; data: { unreadCount: number } }>("/admin/notifications/unread").then(r => r.data.data),
    refetchInterval: 20_000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  // Show first 5 main nav items + logout button
  const visibleItems = ALL_NAV.slice(0, 5);

  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "var(--cd-navy)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        display: "flex",
        alignItems: "stretch",
        height: 60,
        // Safe area for iPhone home indicator
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {visibleItems.map(({ to, Icon, label }) => {
        const isBell = "bell" in (ALL_NAV.find(n => n.to === to) ?? {});
        const badge = isBell && unreadCount > 0 ? unreadCount : 0;
        return (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            style={({ isActive }) => ({
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.3,
              color: isActive ? "var(--cd-red)" : "rgba(255,255,255,0.5)",
              borderTop: isActive ? "2px solid var(--cd-red)" : "2px solid transparent",
              transition: "color 0.15s, border-color 0.15s",
              paddingTop: 2,
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{ position: "relative" }}>
                  <Icon size={20} color={isActive ? "var(--cd-red)" : "rgba(255,255,255,0.5)"} />
                  {badge > 0 && (
                    <div style={{
                      position: "absolute", top: -4, right: -6,
                      minWidth: 14, height: 14, borderRadius: 7,
                      background: "#EC1C24", color: "#fff",
                      fontSize: 8, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", lineHeight: 1,
                    }}>
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

      {/* Logout button as last tab */}
      <button
        type="button"
        onClick={() => logout()}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          background: "none",
          border: "none",
          borderTop: "2px solid transparent",
          cursor: "pointer",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 0.3,
          color: "rgba(255,255,255,0.5)",
          paddingTop: 2,
        }}
      >
        <LogOutIcon size={20} color="rgba(255,255,255,0.5)" />
        Sign Out
      </button>
    </nav>
  );
}

export function Sidebar() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile ? <MobileBottomNav /> : <DesktopSidebar />;
}
