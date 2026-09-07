import { NavLink } from "react-router-dom";
import { useRef } from "react";
import { useAdminAuthStore } from "@/store/auth.store";
import {
  BarChartIcon, CreditCardIcon, PackageIcon,
  ClipboardIcon, UsersIcon, WalletIcon, LogOutIcon,
  ZapIcon, FileTextIcon, TrendUpIcon, GridIcon,
} from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const NAV = [
  { to: "/",            Icon: BarChartIcon,   label: "Dashboard" },
  { to: "/payments",    Icon: CreditCardIcon, label: "Payments" },
  { to: "/fulfillment", Icon: PackageIcon,    label: "Fulfillment" },
  { to: "/orders",      Icon: ClipboardIcon,  label: "Orders" },
  { to: "/customers",   Icon: UsersIcon,      label: "Customers" },
  { to: "/wallets",     Icon: WalletIcon,     label: "Wallets" },
  { to: "/campaigns",   Icon: ZapIcon,        label: "Campaigns" },
  { to: "/reports",     Icon: FileTextIcon,   label: "Reports" },
  { to: "/analytics",   Icon: TrendUpIcon,    label: "Analytics" },
];

const SETTINGS_NAV = [
  { to: "/settings/services",         Icon: GridIcon,       label: "Services" },
  { to: "/settings/payment-methods",  Icon: CreditCardIcon, label: "Methods" },
];

// All nav items flattened for mobile bottom bar
const ALL_NAV = [...NAV, ...SETTINGS_NAV];

type IconComp = (p: { size?: number; color?: string }) => JSX.Element;

function DesktopNavItem({ to, Icon, label }: { to: string; Icon: IconComp; label: string }) {
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
          <Icon size={16} color={isActive ? "#fff" : "rgba(255,255,255,0.65)"} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function BrandLogo({ size = 32 }: { size?: number }) {
  const { logoUrl, setLogo } = useAdminAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) setLogo(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Click to upload logo"
        aria-label="Upload brand logo"
        style={{
          width: size, height: size,
          borderRadius: 8, flexShrink: 0, overflow: "hidden",
          background: logoUrl ? "transparent" : "var(--cd-red)",
          border: logoUrl ? "1.5px solid rgba(255,255,255,0.2)" : "none",
          cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="Brand logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "#fff", fontSize: Math.round(size * 0.4) }}>CD</span>
        )}
        {/* hover overlay hint */}
        <span style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 0.3,
          opacity: 0, transition: "opacity 0.15s",
        }}
          className="logo-upload-hint"
        >
          CHANGE
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} style={{ display: "none" }} />
    </>
  );
}

function DesktopSidebar() {
  const { admin, logout } = useAdminAuthStore();

  return (
    <aside style={{
      width: "var(--sidebar-width)", flexShrink: 0,
      background: "var(--cd-navy)", color: "#fff",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        {NAV.map(item => <DesktopNavItem key={item.to} {...item} />)}

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

  // Show first 5 main nav items + a "More" style approach:
  // We show up to 4 main items + a logout button to keep it clean
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
      {visibleItems.map(({ to, Icon, label }) => (
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
              <Icon size={20} color={isActive ? "var(--cd-red)" : "rgba(255,255,255,0.5)"} />
              {label}
            </>
          )}
        </NavLink>
      ))}

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
