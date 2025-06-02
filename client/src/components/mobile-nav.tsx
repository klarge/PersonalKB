import { PenTool, Network, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileNav() {
  const currentPath = window.location.pathname;

  const navItems = [
    {
      icon: PenTool,
      label: "Journal",
      href: "/",
      active: currentPath === "/",
    },
    {
      icon: Network,
      label: "Mindmap",
      href: "/mindmap",
      active: currentPath === "/mindmap",
    },
    {
      icon: Search,
      label: "Search",
      href: "/search",
      active: currentPath === "/search",
    },
    {
      icon: Plus,
      label: "New",
      href: "/entry/today",
      active: false,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 safe-area-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 p-2 ${
              item.active ? "text-primary" : "text-secondary"
            }`}
            onClick={() => window.location.href = item.href}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
