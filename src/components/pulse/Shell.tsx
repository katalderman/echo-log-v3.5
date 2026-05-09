import { Link, useLocation } from "react-router-dom";
import {
  Home, Phone, Users, Building2, BarChart3, Settings, Search, HelpCircle, Bell,
  ChevronRight, X, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NavRail() {
  const { pathname } = useLocation();
  const items = [
    { icon: Home, label: "Home", to: "/home" },
    { icon: Phone, label: "Calls", to: "/" },
    { icon: History, label: "History", to: "/calls/history" },
    { icon: Users, label: "Contacts", to: "/contacts" },
    { icon: Building2, label: "Accounts", to: "/accounts" },
    { icon: BarChart3, label: "Pipeline", to: "/pipeline" },
  ];
  const isActive = (to: string) => {
    if (to === "/") return pathname === "/" || pathname.startsWith("/calls/active") || pathname.startsWith("/calls/complete") || pathname.startsWith("/calls/review");
    return pathname.startsWith(to);
  };
  return (
    <aside className="w-[60px] shrink-0 bg-nav text-nav-foreground flex flex-col items-center py-3 gap-1 sticky top-0 h-screen">
      <div className="w-8 h-8 rounded bg-primary grid place-items-center text-[11px] font-bold mb-2">P</div>
      {items.map((it) => (
        <Link
          key={it.label}
          to={it.to}
          className={cn(
            "w-[52px] py-2 rounded flex flex-col items-center gap-0.5 transition-colors",
            isActive(it.to) ? "bg-white/10" : "hover:bg-white/5"
          )}
        >
          <it.icon className="w-4 h-4" />
          <span className="text-[9px] leading-tight">{it.label}</span>
        </Link>
      ))}
      <button className="mt-auto w-[52px] py-2 rounded flex flex-col items-center gap-0.5 hover:bg-white/5">
        <Settings className="w-4 h-4" />
        <span className="text-[9px]">Settings</span>
      </button>
    </aside>
  );
}

export function TopBar() {
  return (
    <header className="h-12 bg-card border-b border-border flex items-center px-4 gap-4 sticky top-0 z-20">
      <div className="text-[13px] font-semibold text-nav">Pulse</div>
      <div className="flex-1 max-w-2xl mx-auto relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search Salesforce"
          className="w-full h-8 pl-8 pr-3 text-[13px] bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <button className="p-1.5 hover:bg-secondary rounded"><HelpCircle className="w-4 h-4" /></button>
        <button className="p-1.5 hover:bg-secondary rounded"><Settings className="w-4 h-4" /></button>
        <button className="p-1.5 hover:bg-secondary rounded relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
        </button>
        <div className="w-7 h-7 rounded-full bg-teal grid place-items-center text-[11px] font-medium text-white">JR</div>
      </div>
    </header>
  );
}

type Crumb = { label: string; to?: string };
export function BreadcrumbTabs({ crumbs, tab, tabIcon: TabIcon, onCloseTab }: {
  crumbs: Crumb[];
  tab?: { label: string; closable?: boolean };
  tabIcon?: any;
  onCloseTab?: () => void;
}) {
  return (
    <div className="bg-card border-b border-border flex items-center text-[12px]">
      <div className="flex items-center px-4 py-2 text-muted-foreground gap-1">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 mx-0.5" />}
            {c.to ? <Link to={c.to} className="hover:underline">{c.label}</Link> : <span className={i === crumbs.length - 1 && !tab ? "text-foreground" : ""}>{c.label}</span>}
          </span>
        ))}
      </div>
      {tab && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-l border-r border-border bg-accent/40 border-b-2 border-b-primary -mb-px">
          {TabIcon && <TabIcon className="w-3.5 h-3.5 text-teal" />}
          <span className="font-medium">{tab.label}</span>
          {tab.closable && (
            <button onClick={onCloseTab} className="hover:bg-secondary rounded p-0.5"><X className="w-3 h-3" /></button>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <NavRail />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        {children}
      </div>
    </div>
  );
}
