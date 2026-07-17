"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  permissions?: string[];
  directionId?: number;
  directionNom?: string;
  ministereId?: number;
  ministereNom?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { nom?: string; prenom?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
}

function mapUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    nom: raw.nom,
    prenom: raw.prenom,
    role: raw.role,
    permissions: raw.permissions,
    directionId: raw.directionId,
    directionNom: raw.directionNom,
    ministereId: raw.ministereId,
    ministereNom: raw.ministereNom,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const data: any = await api.login(email, password);
          set({
            user: mapUser(data.user),
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshProfile: async () => {
        const token = get().accessToken;
        if (!token) return;
        try {
          const profile: any = await api.getProfile(token);
          set({ user: mapUser(profile) });
        } catch {
          get().logout();
        }
      },

      updateProfile: async (data: { nom?: string; prenom?: string }) => {
        const token = get().accessToken;
        if (!token) throw new Error("Non authentifié");
        const profile: any = await api.updateProfile(token, data);
        set({ user: mapUser(profile) });
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        const token = get().accessToken;
        if (!token) throw new Error("Non authentifié");
        await api.changePassword(token, { currentPassword, newPassword });
      },

      setTokens: (access: string, refresh: string) => {
        set({ accessToken: access, refreshToken: refresh });
      },
    }),
    {
      name: "fluxmin-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
