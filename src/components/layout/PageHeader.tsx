interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  actions?:  React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      marginBottom: 24, paddingBottom: 20,
      borderBottom: "1px solid var(--cd-gray-200)",
    }}>
      <div>
        <h1 style={{
          fontSize: 21, fontWeight: 700, color: "var(--cd-navy)",
          fontFamily: "var(--font-heading)", lineHeight: 1.2, letterSpacing: -0.3,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 13, color: "var(--cd-gray-500)",
            marginTop: 4, lineHeight: 1.5,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
