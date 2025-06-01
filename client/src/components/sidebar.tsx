import { BookOpen, PenTool, Network, Search, Hash, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Sidebar() {
  const { user } = useAuth();
  
  // Debug: Log user data to console
  console.log("User data in sidebar:", user);

  const handleCreateTodayEntry = () => {
    window.location.href = "/entry/today";
  };

  const navigation = [
    { name: "Journal", href: "/", icon: PenTool, current: window.location.pathname === "/" },
    { name: "Mindmap", href: "/mindmap", icon: Network, current: window.location.pathname === "/mindmap" },
    { name: "Search", href: "/search", icon: Search, current: window.location.pathname === "/search" },
    { name: "Tags", href: "/tags", icon: Hash, current: false },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden lg:flex">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-dark">Notebook</h1>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark truncate">
                {user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email}
              </p>
              <p className="text-xs text-secondary truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4">
        <Button
          onClick={handleCreateTodayEntry}
          className="w-full bg-primary text-white hover:bg-blue-700 flex items-center justify-center space-x-2"
        >
          <PenTool className="h-4 w-4" />
          <span>Today's Entry</span>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <a
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                  item.current
                    ? "bg-blue-50 text-primary"
                    : "text-secondary hover:bg-gray-50 hover:text-dark"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        {user?.isAdmin && (
          <a
            href="/admin"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-50 hover:text-dark transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>Administration</span>
          </a>
        )}
        <a
          href="#"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-50 hover:text-dark transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </a>
        <a
          href="/api/logout"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-50 hover:text-dark transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </a>
      </div>
    </aside>
  );
}
