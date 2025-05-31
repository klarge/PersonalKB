import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const token = localStorage.getItem('auth_token');
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!token, // Only run query if token exists
  });

  const logout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/auth';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!token && !!user,
    logout,
  };
}
