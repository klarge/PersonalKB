import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { ServerConfig } from "./server-config";
import { mobileAuth, isMobile } from "./mobile-auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // For mobile, use mobile auth API request
  if (isMobile()) {
    return await mobileAuth.apiRequest(method, url, data);
  }
  
  // For web, use session-based auth
  const fullUrl = url.startsWith('/') ? ServerConfig.buildApiUrl(url) : url;
  console.log(`API Request: ${method} ${fullUrl}`);
  
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API Response: ${res.status} ${res.statusText}`);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const params = queryKey[1] as Record<string, any> | undefined;
    
    // For mobile, use mobile auth API request
    if (isMobile()) {
      try {
        let requestUrl = url;
        if (params) {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              searchParams.append(key, String(value));
            }
          });
          if (searchParams.toString()) {
            requestUrl += '?' + searchParams.toString();
          }
        }
        
        const res = await mobileAuth.apiRequest('GET', requestUrl);
        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }
        await throwIfResNotOk(res);
        return await res.json();
      } catch (error: any) {
        if (unauthorizedBehavior === "returnNull" && error.message.includes('401')) {
          return null;
        }
        throw error;
      }
    }
    
    // For web, use session-based auth
    let fullUrl = url.startsWith('/') ? ServerConfig.buildApiUrl(url) : url;
    
    // Add query parameters if they exist
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        fullUrl += '?' + searchParams.toString();
      }
    }
    
    console.log(`Query request: ${fullUrl}`);
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    console.log(`Query response: ${res.status} ${res.statusText}`);
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
