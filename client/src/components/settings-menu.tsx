import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Download, Moon, Sun, Monitor, BarChart3, Network, Key, HardDrive } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SettingsMenu() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const handleExport = () => {
    const link = document.createElement('a');
    link.href = '/api/export/markdown';
    link.download = `knowledge-export-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const backupMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/backup', {}),
    onSuccess: (data: any) => {
      toast({
        title: "Backup Created",
        description: `Server backup created successfully with ${data.entryCount} entries`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create server backup",
        variant: "destructive",
      });
    }
  });

  const handleBackup = () => {
    backupMutation.mutate();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "light":
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="px-2">
          <Settings className="h-4 w-4" />
          <span className="ml-2 hidden md:inline">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Application Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <Link href="/stats">
          <DropdownMenuItem>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Stats
          </DropdownMenuItem>
        </Link>
        
        <Link href="/mindmap-view">
          <DropdownMenuItem>
            <Network className="h-4 w-4 mr-2" />
            Knowledge Mindmap
          </DropdownMenuItem>
        </Link>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export All Entries
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleBackup} disabled={backupMutation.isPending}>
          <HardDrive className="h-4 w-4 mr-2" />
          {backupMutation.isPending ? "Creating Backup..." : "Create Server Backup"}
        </DropdownMenuItem>
        
        <Link href="/api-tokens">
          <DropdownMenuItem>
            <Key className="h-4 w-4 mr-2" />
            API Tokens
          </DropdownMenuItem>
        </Link>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center">
          {getThemeIcon()}
          <span className="ml-2">Theme</span>
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" />
          Light
          {theme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
          {theme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4 mr-2" />
          System
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}