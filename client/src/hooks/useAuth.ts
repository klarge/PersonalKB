import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = async () => {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    error,
  };
}