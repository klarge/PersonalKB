import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useAndroidBack } from "@/hooks/use-android-back";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/home";
import Entry from "@/pages/entry";
import Search from "@/pages/search";
import Mindmap from "@/pages/mindmap";
import Stats from "@/pages/stats";
import MindmapView from "@/pages/mindmap-view";
import ApiTokens from "@/pages/api-tokens";
import Admin from "@/pages/admin";
import ServerConfig from "@/pages/server-config";
import MobileSetup from "@/pages/mobile-setup";
import NotFound from "@/pages/not-found";
import { ServerConfig as ServerConfigUtil } from "@/lib/server-config";
import { Capacitor } from "@capacitor/core";

function Router() {
  const { isAuthenticated, isLoading, isMobileConfigured, isMobile } = useAuth();
  
  // Enable Android back button handling
  useAndroidBack();

  // Check if running on mobile and not configured
  if (isMobile && !isMobileConfigured) {
    return <MobileSetup onSetupComplete={() => window.location.reload()} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/entry/:id" component={Entry} />
          <Route path="/search" component={Search} />
          <Route path="/mindmap" component={Mindmap} />
          <Route path="/stats" component={Stats} />
          <Route path="/mindmap-view" component={MindmapView} />
          <Route path="/api-tokens" component={ApiTokens} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="knowledge-ui-theme">
        <TooltipProvider>
          <div className="safe-area-top">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
