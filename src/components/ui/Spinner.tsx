export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 32 }}>
      <div className="animate-spin" style={{ width: size, height: size, border: "3px solid #e9ecef", borderTopColor: "#EC1C24", borderRadius: "50%" }} />
    </div>
  );
}
export function InlineSpinner() {
  return <span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%" }} />;
}
