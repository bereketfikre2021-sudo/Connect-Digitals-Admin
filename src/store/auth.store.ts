import { create } from "zustand";
import { api } from "@/lib/api";

interface AdminUser {
  id: string; email: string; firstName: string; lastName: string; role: string;
  brandLogoUrl: string | null;
}

interface AuthState {
  accessToken:     string | null;
  refreshToken:    string | null;
  admin:           AdminUser | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  error:           string | null;
  // logoUrl is derived from admin.brandLogoUrl — kept as a separate field
  // so components that only read the logo don't need to read the full admin object
  logoUrl:         string | null;
  login:           (email: string, password: string) => Promise<void>;
  logout:          () => Promise<void>;
  checkAuth:       () => Promise<void>;
  refreshSession:  () => Promise<void>;
  uploadLogo:      (file: File) => Promise<void>;
  clearLogo:       () => Promise<void>;
  // Legacy setter kept for backward compat with LoginPage / Sidebar while we migrate
  setLogo:         (dataUrl: string) => void;
}

const ACCESS_KEY  = "cd_admin_token";
const REFRESH_KEY = "cd_admin_refresh";

export const useAdminAuthStore = create<AuthState>((set, get) => ({
  accessToken:     localStorage.getItem(ACCESS_KEY),
  refreshToken:    localStorage.getItem(REFRESH_KEY),
  admin:           null,
  isAuthenticated: false,
  isLoading:       true,
  error:           null,
  logoUrl:         null,

  // ── Auth ────────────────────────────────────────────────────────────────────

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; expiresIn: number; admin: AdminUser };
      }>("/admin/auth/login", { email, password });

      localStorage.setItem(ACCESS_KEY, data.data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.data.refreshToken);
      set({
        accessToken:     data.data.accessToken,
        refreshToken:    data.data.refreshToken,
        admin:           data.data.admin,
        logoUrl:         data.data.admin.brandLogoUrl ?? null,
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch {
      set({ isLoading: false, error: "Invalid email or password" });
    }
  },

  logout: async () => {
    try { await api.post("/admin/auth/logout"); } catch { /* best-effort */ }
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, admin: null, isAuthenticated: false, logoUrl: null });
  },

  refreshSession: async () => {
    const currentRefresh = localStorage.getItem(REFRESH_KEY);
    if (!currentRefresh) { set({ isLoading: false }); return; }
    try {
      const { data } = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string };
      }>("/admin/auth/refresh", { refreshToken: currentRefresh });

      localStorage.setItem(ACCESS_KEY, data.data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.data.refreshToken);
      set({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
    } catch {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      set({ accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) { set({ isLoading: false }); return; }
    try {
      const { data } = await api.get<{ success: boolean; data: AdminUser }>("/admin/auth/me");
      set({
        admin:           data.data,
        logoUrl:         data.data.brandLogoUrl ?? null,
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch {
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (refresh) {
        try {
          await get().refreshSession();
          const { data } = await api.get<{ success: boolean; data: AdminUser }>("/admin/auth/me");
          set({
            admin:           data.data,
            logoUrl:         data.data.brandLogoUrl ?? null,
            isAuthenticated: true,
            isLoading:       false,
          });
          return;
        } catch { /* fall through */ }
      }
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      set({ accessToken: null, refreshToken: null, admin: null, isAuthenticated: false, isLoading: false });
    }
  },

  // ── Logo management ─────────────────────────────────────────────────────────

  /**
   * Upload a new brand logo to the server.
   * The URL is stored in Supabase Storage + persisted on AdminUser.brandLogoUrl.
   * All admin sessions will see the new logo on next page load.
   */
  uploadLogo: async (file: File) => {
    const form = new FormData();
    form.append("logo", file);
    const { data } = await api.post<{ success: boolean; data: { logoUrl: string } }>(
      "/admin/settings/logo", form, { headers: { "Content-Type": "multipart/form-data" } }
    );
    set(state => ({
      logoUrl: data.data.logoUrl,
      admin:   state.admin ? { ...state.admin, brandLogoUrl: data.data.logoUrl } : state.admin,
    }));
  },

  clearLogo: async () => {
    await api.delete("/admin/settings/logo");
    set(state => ({
      logoUrl: null,
      admin:   state.admin ? { ...state.admin, brandLogoUrl: null } : state.admin,
    }));
  },

  /**
   * Legacy setter — used by BrandLogo and LogoBlock components.
   * Now triggers a real upload to the server instead of writing to localStorage.
   * Kept as setLogo(dataUrl) for backward compat, but internally converts
   * the base64 data URL to a File and calls uploadLogo().
   */
  setLogo: (dataUrl: string) => {
    // Convert base64 data URL → Blob → File → upload
    try {
      const [header, base64] = dataUrl.split(",");
      const mime = header?.match(/:(.*?);/)?.[1] ?? "image/png";
      const binary = atob(base64 ?? "");
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const ext  = mime.split("/")[1] ?? "png";
      const file = new File([blob], `brand-logo.${ext}`, { type: mime });
      // Fire upload — UI will update when promise resolves
      get().uploadLogo(file).catch(() => {
        // Silently fall back to local preview if upload fails
        set({ logoUrl: dataUrl });
      });
      // Show preview immediately while upload is in progress
      set({ logoUrl: dataUrl });
    } catch {
      set({ logoUrl: dataUrl });
    }
  },
}));
