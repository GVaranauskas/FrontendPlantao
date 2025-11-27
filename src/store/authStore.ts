import { create } from 'zustand';
import { storage } from '@services/storage/localStorage';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!storage.getAuthToken(),

  login: (user: User, token: string) => {
    storage.setAuthToken(token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    storage.clearAuth();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },
}));
