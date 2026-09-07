import { create } from "zustand";
import { api } from "@/lib/api";

interface AdminUser { id: string; email: string; firstName: string; lastName: string; role: string }

const LOGO_KEY = "cd_admin_logo";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  logoUrl: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setLogo: (dataUrl: string) => void;
}

const ACCESS_KEY = "cd_admin_token";
const REFRESH_KEY = "cd_admin_refresh";

export const useAdminAuthStore = create<AuthState>((set, get) => ({
  accessToken:     localStorage.getItem(ACCESS_KEY),
  refreshToken:    localStorage.getItem(REFRESH_KEY),
  logoUrl:         localStorage.getItem(LOGO_KEY),
  admin:           null,
  isAuthenticated: false,
  isLoading:       true,
  error:           null,

  setLogo: (dataUrl: string) => {
    localStorage.setItem(LOGO_KEY, dataUrl);
    set({ logoUrl: dataUrl });
  },

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
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        admin: data.data.admin,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: "Invalid email or password" });
    }
  },

  logout: async () => {
    try {
      await api.post("/admin/auth/logout");
    } catch { /* best-effort */ }
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, admin: null, isAuthenticated: false });
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
      set({ admin: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      // Try refreshing once before giving up
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (refresh) {
        try {
          await get().refreshSession();
          const { data } = await api.get<{ success: boolean; data: AdminUser }>("/admin/auth/me");
          set({ admin: data.data, isAuthenticated: true, isLoading: false });
          return;
        } catch { /* fall through */ }
      }
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      set({ accessToken: null, refreshToken: null, admin: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
