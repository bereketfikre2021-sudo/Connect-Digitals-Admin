import { type ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean; fullWidth?: boolean;
}

const styles: Record<Variant, string> = {
  primary:   "bg-[#EC1C24] text-white hover:bg-[#c81019]",
  secondary: "bg-[#000F33] text-white hover:opacity-90",
  ghost:     "bg-transparent text-[#EC1C24] border border-[#EC1C24] hover:bg-[#EC1C24] hover:text-white",
  danger:    "bg-red-600 text-white hover:bg-red-700",
  success:   "bg-green-600 text-white hover:bg-green-700",
};
const sizes: Record<Size, string> = { sm: "h-7 px-3 text-xs", md: "h-9 px-4 text-sm", lg: "h-11 px-6 text-base" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ fontFamily: "var(--font-heading)", fontWeight: 600, borderRadius: "var(--radius-sm)", transition: "all 0.15s", cursor: (disabled || loading) ? "not-allowed" : "pointer", opacity: (disabled || loading) ? 0.5 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap", ...(fullWidth ? { width: "100%" } : {}) }}
      className={clsx(styles[variant], sizes[size], className)}
      {...props}
    >
      {loading && <span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} className="animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
