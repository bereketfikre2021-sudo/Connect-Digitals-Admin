import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { EyeIcon, EyeOffIcon } from "@/components/ui/Icon";

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type LoginForm  = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

// ── Shared input ──────────────────────────────────────────────────────────────

function Field({
  id, label, error, children,
}: {
  id: string; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.4, textTransform: "uppercase" }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" style={{ fontSize: 11.5, color: "#f87171", marginTop: 0 }}>{error}</p>
      )}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)",
  borderRadius: 10, fontSize: 14, outline: "none",
  fontFamily: "var(--font-body)",
  color: "#fff",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

// ── Brand logo ────────────────────────────────────────────────────────────────

function BrandLogo() {
  const { logoUrl, uploadLogo } = useAdminAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await uploadLogo(file); } catch { /* silent on login page — auth may not be ready */ }
    finally { e.target.value = ""; }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 32 }}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Click to upload logo"
        aria-label="Upload brand logo"
        style={{
          width: 76, height: 76, borderRadius: 20, overflow: "hidden",
          background: logoUrl ? "transparent" : "linear-gradient(135deg,#EC1C24,#c81019)",
          border: logoUrl ? "2px solid rgba(255,255,255,0.15)" : "none",
          cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: logoUrl ? "none" : "0 4px 20px rgba(236,28,36,0.5)",
          position: "relative",
        }}
      >
        {logoUrl
          ? <img src={logoUrl} alt="Brand" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "#fff", fontSize: 26 }}>CD</span>
        }
        <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 0.5, opacity: 0, transition: "opacity 0.15s", borderRadius: 20 }} className="logo-upload-hint">
          UPLOAD
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoFile} style={{ display: "none" }} />
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          Connect Digitals
        </h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", letterSpacing: 0.3 }}>
          Admin Dashboard
        </p>
      </div>
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
        <div role="alert" style={{
          padding: "11px 14px", marginBottom: 16,
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 8, fontSize: 13, color: "#f87171",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit(d => login(d.email, d.password))} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field id="login-email" label="Email" error={errors.email?.message}>
          <input
            id="login-email"
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="admin@connectdigitals.com"
            style={inputBase}
            onFocus={e => { e.target.style.borderColor = "rgba(236,28,36,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(236,28,36,0.12)"; }}
            onBlur={e => { e.target.style.borderColor = errors.email ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
          />
        </Field>

        <Field id="login-password" label="Password" error={errors.password?.message}>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              {...register("password")}
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••"
              style={{ ...inputBase, paddingRight: 44 }}
              onFocus={e => { e.target.style.borderColor = "rgba(236,28,36,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(236,28,36,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = errors.password ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4, display: "flex", alignItems: "center" }}
            >
              {showPw ? <EyeOffIcon size={16} color="rgba(255,255,255,0.4)" /> : <EyeIcon size={16} color="rgba(255,255,255,0.4)" />}
            </button>
          </div>
        </Field>

        <div style={{ textAlign: "right", marginTop: -8 }}>
          <button
            type="button"
            onClick={onForgot}
            style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%", padding: "13px 20px",
            background: isLoading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#EC1C24,#c81019)",
            border: "none", borderRadius: 10,
            color: "#fff", fontSize: 14, fontWeight: 700,
            fontFamily: "var(--font-heading)",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.18s",
            boxShadow: isLoading ? "none" : "0 4px 16px rgba(236,28,36,0.4)",
            letterSpacing: 0.3,
          }}
        >
          {isLoading ? (
            <>
              <div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
              Signing in…
            </>
          ) : "Sign In →"}
        </button>
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
    setSending(true); setApiError(null);
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
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 26 }}>✓</span>
        </div>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 8 }}>
            Check your email
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            If that email belongs to an admin account, we've sent a reset link. Check your inbox.
          </p>
        </div>
        <button type="button" onClick={onBack}
          style={{ fontSize: 13, color: "#EC1C24", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "#fff", marginBottom: 6 }}>
          Reset your password
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
          Enter your admin email and we'll send a reset link.
        </p>
      </div>

      {apiError && (
        <div role="alert" style={{ padding: "10px 14px", marginBottom: 16, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field id="forgot-email" label="Email" error={errors.email?.message}>
          <input
            id="forgot-email"
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="admin@connectdigitals.com"
            style={inputBase}
            onFocus={e => { e.target.style.borderColor = "rgba(236,28,36,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(236,28,36,0.12)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
          />
        </Field>

        <button
          type="submit"
          disabled={sending}
          style={{
            width: "100%", padding: "13px 20px",
            background: sending ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#EC1C24,#c81019)",
            border: "none", borderRadius: 10,
            color: "#fff", fontSize: 14, fontWeight: 700,
            fontFamily: "var(--font-heading)",
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: sending ? "none" : "0 4px 16px rgba(236,28,36,0.4)",
          }}
        >
          {sending ? (
            <>
              <div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
              Sending…
            </>
          ) : "Send Reset Link"}
        </button>

        <button type="button" onClick={onBack}
          style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, textAlign: "center" }}>
          ← Back to sign in
        </button>
      </form>
    </>
  );
}

// ── Decorative background pattern ────────────────────────────────────────────

function BgPattern() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const [view, setView] = useState<"login" | "forgot">("login");

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #000F33 0%, #030d28 50%, #0a0520 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <BgPattern />

      {/* Glow orbs */}
      <div style={{ position: "absolute", top: "-10%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,28,36,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Card */}
      <div
        className="animate-fade-in"
        style={{
          width: 400, position: "relative", zIndex: 1,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
        }}
      >
        <BrandLogo />

        {view === "login"
          ? <LoginForm   onForgot={() => setView("forgot")} />
          : <ForgotPasswordForm onBack={() => setView("login")} />
        }

        {/* Footer */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 28 }}>
          Connect Digitals Promotion Platform · Admin
        </p>
      </div>
    </div>
  );
}
