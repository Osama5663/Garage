import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const user = useAuthStore(state => state.currentUser);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  return {
    user,
    isAuthenticated
  };
};
