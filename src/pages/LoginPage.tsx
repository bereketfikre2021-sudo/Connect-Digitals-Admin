import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { EyeIcon, EyeOffIcon } from "@/components/ui/Icon";

// ── Schemas ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type LoginForm  = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

// ── Shared input style helper ─────────────────────────────────────────────────

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "10px 12px",
    border: `1.5px solid ${hasError ? "#ef4444" : "#dee2e6"}`,
    borderRadius: 8, fontSize: 14, outline: "none",
    fontFamily: "inherit",
  };
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function LogoBlock() {
  const { logoUrl, uploadLogo } = useAdminAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [, setUploading] = useState(false);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2 MB"); return; }
    setUploading(true);
    try { await uploadLogo(file); }
    catch { /* silent — login page may not have auth yet, setLogo fallback handles it */ }
    finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Click to upload logo"
        aria-label="Upload brand logo"
        style={{ width: 72, height: 72, borderRadius: 16, overflow: "hidden", background: logoUrl ? "transparent" : "var(--cd-red)", border: logoUrl ? "2px solid #dee2e6" : "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" }}
      >
        {logoUrl
          ? <img src={logoUrl} alt="Brand logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "#fff", fontSize: 28 }}>CD</span>
        }
        <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, letterSpacing: 0.4, opacity: 0, transition: "opacity 0.15s" }} className="logo-upload-hint">
          UPLOAD
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoFile} style={{ display: "none" }} />
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--cd-navy)" }}>
        Admin Dashboard
      </h1>
      <p style={{ fontSize: 13, color: "var(--cd-gray-600)", marginTop: 4 }}>Connect Digitals Promotion Platform</p>
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const { login, isLoading, error } = useAdminAuthStore();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <>
      {error && (
        <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(d => login(d.email, d.password))} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="login-email" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)" }}>
            Email
          </label>
          <input id="login-email" {...register("email")} type="email" autoComplete="email" placeholder="admin@connectdigitals.com" aria-invalid={!!errors.email} style={inputStyle(!!errors.email)} />
          {errors.email && <p role="alert" style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="login-password" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              {...register("password")}
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              aria-invalid={!!errors.password}
              style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex", alignItems: "center" }}
            >
              {showPw ? <EyeOffIcon size={16} color="#94a3b8" /> : <EyeIcon size={16} color="#94a3b8" />}
            </button>
          </div>
          {errors.password && <p role="alert" style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{errors.password.message}</p>}
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
          Sign In
        </Button>

        {/* Forgot password — bottom of form */}
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <button
            type="button"
            onClick={onForgot}
            style={{ fontSize: 13, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </>
  );
}

// ── Forgot password form ──────────────────────────────────────────────────────

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setSending(true);
    setApiError(null);
    try {
      await api.post("/admin/auth/forgot-password", { email: data.email });
      setSent(true);
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
          <span style={{ fontSize: 24 }}>✓</span>
        </div>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "var(--cd-navy)", marginBottom: 8 }}>Check your email</h2>
          <p style={{ fontSize: 13, color: "var(--cd-gray-600)", lineHeight: 1.6 }}>
            If that email belongs to an admin account, we've sent a password reset link. Check your inbox.
          </p>
        </div>
        <button type="button" onClick={onBack} style={{ fontSize: 13, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--cd-navy)", marginBottom: 6 }}>
          Reset your password
        </h2>
        <p style={{ fontSize: 13, color: "var(--cd-gray-600)", lineHeight: 1.5 }}>
          Enter your admin email and we'll send you a reset link.
        </p>
      </div>

      {apiError && (
        <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="forgot-email" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)" }}>
            Email
          </label>
          <input id="forgot-email" {...register("email")} type="email" autoComplete="email" placeholder="admin@connectdigitals.com" aria-invalid={!!errors.email} style={inputStyle(!!errors.email)} />
          {errors.email && <p role="alert" style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{errors.email.message}</p>}
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={sending}>
          Send Reset Link
        </Button>

        <button type="button" onClick={onBack} style={{ fontSize: 13, color: "var(--cd-gray-500)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
          ← Back to sign in
        </button>
      </form>
    </>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const [view, setView] = useState<"login" | "forgot">("login");

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cd-navy)" }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 16, padding: 36, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <LogoBlock />
        {view === "login"
          ? <LoginForm   onForgot={() => setView("forgot")} />
          : <ForgotPasswordForm onBack={() => setView("login")} />
        }
      </div>
    </div>
  );
}
