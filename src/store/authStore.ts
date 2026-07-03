import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, userApi, setAccessToken, getAccessToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  city: string | null;
  profileImageUrl: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR';
  emailVerifiedAt: string | null;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    country: string;
    city?: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
  }) => Promise<{ success: boolean; error?: string; issues?: Array<{ field: string; message: string }> }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });

        try {
          // Try to restore session by calling /me
          const { data, error } = await authApi.getMe();

          if (data?.user) {
            set({
              user: data.user as AuthUser,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        const { data, error, code, issues } = await authApi.login({ email, password });

        if (data?.user && data?.accessToken) {
          setAccessToken(data.accessToken);
          set({
            user: data.user as AuthUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true };
        }

        set({ isLoading: false, error: error || 'Login failed' });
        return { success: false, error: error || 'Login failed' };
      },

      register: async (regData) => {
        set({ isLoading: true, error: null });

        const { data, error, code, issues } = await authApi.register(regData);

        if (data?.user && data?.accessToken) {
          setAccessToken(data.accessToken);
          set({
            user: data.user as AuthUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true };
        }

        set({ isLoading: false, error: error || 'Registration failed' });
        return { success: false, error: error || 'Registration failed', issues };
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore errors during logout
        }

        setAccessToken(null);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      refreshUser: async () => {
        const { data } = await authApi.getMe();
        if (data?.user) {
          set({ user: data.user as AuthUser, isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'hsello-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
    }
  )
);