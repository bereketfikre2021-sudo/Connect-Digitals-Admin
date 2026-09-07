import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, isLoading, error, logoUrl, setLogo } = useAdminAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setLogo(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--cd-navy)",
    }}>
      <div style={{
        width: 380, background: "#fff", borderRadius: 16,
        padding: 36, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Logo — clickable to upload */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Click to upload logo"
            aria-label="Upload brand logo"
            style={{
              width: 72, height: 72,
              borderRadius: 16,
              overflow: "hidden",
              background: logoUrl ? "transparent" : "var(--cd-red)",
              border: logoUrl ? "2px solid #dee2e6" : "none",
              cursor: "pointer", padding: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
              position: "relative",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Brand logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "#fff", fontSize: 28 }}>CD</span>
            )}
            <span style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "#fff", fontWeight: 700, letterSpacing: 0.4,
              opacity: 0, transition: "opacity 0.15s",
            }} className="logo-upload-hint">
              UPLOAD
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoFile} style={{ display: "none" }} />
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--cd-navy)" }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--cd-gray-600)", marginTop: 4 }}>
            Connect Digitals Promotion Platform
          </p>
          {!logoUrl && (
            <p style={{ fontSize: 11, color: "var(--cd-gray-400)", marginTop: 4 }}>
              Click the logo to upload your brand image
            </p>
          )}
        </div>

        {error && (
          <div role="alert" style={{
            background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            fontSize: 13, color: "#dc2626",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(d => login(d.email, d.password))} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              htmlFor="login-email"
              style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)" }}
            >
              Email
            </label>
            <input
              id="login-email"
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="admin@connectdigitals.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              style={{
                width: "100%", padding: "10px 12px",
                border: `1.5px solid ${errors.email ? "#ef4444" : "#dee2e6"}`,
                borderRadius: 8, fontSize: 14, outline: "none",
              }}
            />
            {errors.email && (
              <p id="login-email-error" role="alert" style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)" }}
            >
              Password
            </label>
            <input
              id="login-password"
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              style={{
                width: "100%", padding: "10px 12px",
                border: `1.5px solid ${errors.password ? "#ef4444" : "#dee2e6"}`,
                borderRadius: 8, fontSize: 14, outline: "none",
              }}
            />
            {errors.password && (
              <p id="login-password-error" role="alert" style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
