import { useAuthStore } from '@store/authStore';

/**
 * Custom hook for authentication
 */
export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    login,
    logout,
  };
};
