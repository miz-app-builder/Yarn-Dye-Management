import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { LayoutDashboard, Package, Factory, BarChart3, Users, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: Package },
    { href: "/factories", label: "Factories", icon: Factory },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ];

  if (user?.role === "admin") {
    links.push({ href: "/users", label: "Users", icon: Users });
  }

  return (
    <div className="w-60 bg-indigo-900 text-white flex flex-col h-full shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">YDMS</h1>
        <p className="text-indigo-300 text-xs mt-1">Yarn Dyeing Management</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <span
                data-testid={`nav-${link.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  isActive ? "bg-indigo-800 text-white font-medium" : "text-indigo-200 hover:bg-indigo-800/50 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-indigo-800">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-indigo-700 bg-indigo-800">
              <AvatarFallback className="text-indigo-900 font-medium">
                {user.firstName?.charAt(0) || user.username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName || user.username}</p>
              <p className="text-xs text-indigo-300 truncate">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-md transition-colors"
              title="Sign Out"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}