interface PageHeaderProps {
  title: string; subtitle?: string; actions?: React.ReactNode;
}
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--cd-navy)", fontFamily: "var(--font-heading)" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: "var(--cd-gray-600)", marginTop: 2 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}
