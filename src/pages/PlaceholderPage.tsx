import { ClipboardIcon, UsersIcon, WalletIcon } from "@/components/ui/Icon";

export function PlaceholderPage({ title }: { title: string; icon?: string }) {
  const ICON_MAP: Record<string, typeof ClipboardIcon> = { orders: ClipboardIcon, customers: UsersIcon, wallets: WalletIcon };
  const Icon = ICON_MAP[title.toLowerCase()] ?? ClipboardIcon;
  return (
    <div style={{ padding: 28, flex: 1 }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700, color: "var(--cd-navy)", marginBottom: 24 }}>{title}</div>
      <div style={{ background: "#fff", borderRadius: 12, padding: 48, textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--cd-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Icon size={24} color="var(--cd-gray-500)" />
        </div>
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 16, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: "var(--cd-gray-500)" }}>This section will be built in a future phase.</p>
      </div>
    </div>
  );
}
