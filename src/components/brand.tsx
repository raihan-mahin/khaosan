import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Loader2, Wifi, WifiOff, Sparkles, Ban, Users, CircleCheck, Clock } from "lucide-react";
import logoAsset from "@/assets/khaosan-logo.jpg.asset.json";
import { fetchSettings } from "@/lib/booking";
import type { LiveState } from "@/hooks/use-live";
import { cn } from "@/lib/utils";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: fetchSettings, staleTime: 60000 });
}

export function Logo({ className }: { className?: string }) {
  const { data } = useSettings();
  return (
    <img
      src={data?.logo_url || logoAsset.url}
      alt={`${data?.name ?? "Khaosan"} logo`}
      className={cn("aspect-square rounded-xl object-cover", className)}
      width={48}
      height={48}
    />
  );
}

export function SiteHeader() {
  const { data } = useSettings();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="font-display text-lg font-bold text-primary">{data?.name ?? "Khaosan"}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/staff" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
            Staff
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function ViewTabs({ active }: { active: "reserve" | "tables" }) {
  const base = "flex-1 rounded-xl px-4 py-3 text-center text-[15px] font-semibold transition-colors min-h-11";
  return (
    <div className="flex gap-1 rounded-2xl bg-secondary p-1" role="tablist">
      <Link
        to="/"
        role="tab"
        aria-selected={active === "reserve"}
        className={cn(base, active === "reserve" ? "bg-card text-primary shadow-card" : "text-muted-foreground")}
      >
        Reserve a table
      </Link>
      <Link
        to="/tables"
        role="tab"
        aria-selected={active === "tables"}
        className={cn(base, active === "tables" ? "bg-card text-primary shadow-card" : "text-muted-foreground")}
      >
        Tables available now
      </Link>
    </div>
  );
}

export function LiveBadge({ state, updatedAt }: { state: LiveState; updatedAt?: number }) {
  const time = updatedAt
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(updatedAt)
    : "—";
  const map = {
    live: { icon: Wifi, text: "Live", cls: "bg-success-soft text-success" },
    connecting: { icon: Loader2, text: "Connecting", cls: "bg-muted text-muted-foreground" },
    reconnecting: { icon: Loader2, text: "Reconnecting…", cls: "bg-warning-soft text-warning" },
    offline: { icon: WifiOff, text: "Offline — data may be out of date", cls: "bg-danger-soft text-destructive" },
  }[state];
  const Icon = map.icon;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium", map.cls)}>
        <Icon className={cn("h-3.5 w-3.5", state !== "live" && state !== "offline" && "animate-spin")} aria-hidden />
        {map.text}
      </span>
      <span>Updated {time}</span>
    </div>
  );
}

export const TABLE_STATUS = {
  empty: { label: "Empty", icon: CircleCheck, cls: "bg-success-soft text-success border-success/30" },
  occupied: { label: "Occupied", icon: Users, cls: "bg-info-soft text-primary border-primary/30" },
  cleaning: { label: "Being cleaned", icon: Sparkles, cls: "bg-warning-soft text-warning border-warning/40" },
  unavailable: { label: "Temporarily unavailable", icon: Ban, cls: "bg-muted text-muted-foreground border-border" },
} as const;

export function TableStatusChip({ status, className }: { status: keyof typeof TABLE_STATUS; className?: string }) {
  const s = TABLE_STATUS[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", s.cls, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {s.label}
    </span>
  );
}

export function Badge2({ children, tone = "muted", icon: Icon }: { children: React.ReactNode; tone?: "muted" | "orange" | "success" | "danger"; icon?: typeof Clock }) {
  const cls = {
    muted: "bg-muted text-muted-foreground",
    orange: "bg-orange-soft text-accent-foreground",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-destructive",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cls)}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-orange-soft px-3 py-2 text-xs text-accent-foreground">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children ?? "Demonstration settings and floor plan — the restaurant must confirm hours, tables and policies before launch."}</span>
    </p>
  );
}
