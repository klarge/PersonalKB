import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useState, useEffect } from "react";
import { mobileAuth, isMobile } from "@/lib/mobile-auth";

export function useAuth() {
  const [mobileUser, setMobileUser] = useState<any>(null);
  const [mobileLoading, setMobileLoading] = useState(true);
  const [mobileConfigured, setMobileConfigured] = useState(false);

  // Web authentication
  const { data: webUser, isLoading: webLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !isMobile(), // Only run web auth queries when not on mobile
  });

  // Mobile authentication check
  useEffect(() => {
    if (isMobile()) {
      const checkMobileAuth = async () => {
        try {
          const isConfigured = await mobileAuth.isConfigured();
          setMobileConfigured(isConfigured);
          
          if (isConfigured) {
            const userData = await mobileAuth.getUserData();
            setMobileUser(userData);
          }
        } catch (error) {
          console.error('Mobile auth check failed:', error);
        } finally {
          setMobileLoading(false);
        }
      };
      
      checkMobileAuth();
    } else {
      setMobileLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      if (isMobile()) {
        await mobileAuth.clearAuth();
        setMobileUser(null);
        setMobileConfigured(false);
      } else {
        await fetch("/auth/logout", { method: "POST", credentials: "include" });
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Return appropriate values based on platform
  if (isMobile()) {
    return {
      user: mobileUser,
      isLoading: mobileLoading,
      isAuthenticated: !!mobileUser,
      isMobileConfigured: mobileConfigured,
      isMobile: true,
      logout,
      error: null,
    };
  }

  return {
    user: webUser,
    isLoading: webLoading,
    isAuthenticated: !!webUser,
    isMobileConfigured: true, // Web is always "configured"
    isMobile: false,
    logout,
    error,
  };
}