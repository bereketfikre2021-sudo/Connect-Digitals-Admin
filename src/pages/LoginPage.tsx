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
  const { login, isLoading, error } = useAdminAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, background: "var(--cd-red)", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
            fontFamily: "var(--font-heading)", fontWeight: 700, color: "#fff", fontSize: 18,
          }}>
            CD
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--cd-navy)" }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--cd-gray-600)", marginTop: 4 }}>
            Connect Digitals Promotion Platform
          </p>
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
