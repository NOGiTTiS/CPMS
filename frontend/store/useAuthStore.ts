import { create } from "zustand";
import { User, LoginResponse } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setAuth: (response: LoginResponse) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => {
    set({ user });
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("cpms_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("cpms_user");
      }
    }
  },

  setAuth: (response) => {
    const token = response.token || response.access_token || response.data?.access_token || response.data?.token || "";
    const refreshToken = response.refresh_token || response.data?.refresh_token || "";
    const user = response.user || response.data?.user || null;

    set({
      user,
      token: token || null,
      refreshToken: refreshToken || null,
      isLoading: false,
    });
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("cpms_token", token);
      if (refreshToken) localStorage.setItem("cpms_refresh_token", refreshToken);
      if (user) localStorage.setItem("cpms_user", JSON.stringify(user));
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem("cpms_token");
      localStorage.removeItem("cpms_refresh_token");
      localStorage.removeItem("cpms_user");
      window.location.href = "/login";
    }
  },

  initAuth: async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("cpms_token");
    const userJson = localStorage.getItem("cpms_user");

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        set({ token, user, isLoading: false, isInitialized: true });
        // Background refresh profile from server
        get().refreshProfile().catch(() => {});
        return;
      } catch {
        localStorage.removeItem("cpms_token");
        localStorage.removeItem("cpms_user");
      }
    }
    set({ user: null, token: null, isLoading: false, isInitialized: true });
  },

  refreshProfile: async () => {
    try {
      const res = await api.get<{ user: User }>("/auth/me");
      if (res && res.user) {
        set({ user: res.user });
        localStorage.setItem("cpms_user", JSON.stringify(res.user));
      }
    } catch {
      // Ignore background refresh errors
    }
  },
}));
