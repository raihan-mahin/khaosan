import { TABLE_STATUS } from "@/components/brand";
import { cn } from "@/lib/utils";

export type FloorItem = {
  id: string;
  label: string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  shape: string;
  status: keyof typeof TABLE_STATUS;
  highlight?: boolean;
  dim?: boolean;
  badge?: string | null;
  alert?: boolean;
};

export function FloorPlan({ items, onSelect, selectedId }: { items: FloorItem[]; onSelect: (id: string) => void; selectedId?: string | null }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-secondary/60 sm:aspect-[16/9]">
      <div className="absolute inset-x-0 top-0 flex justify-between px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Window</span><span>Main hall</span><span>Family</span>
      </div>
      {items.map((t) => {
        const s = TABLE_STATUS[t.status];
        const Icon = s.icon;
        const w = t.shape === "rect" ? "w-[17%]" : "w-[13%]";
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            aria-label={`Table ${t.label}, seats ${t.capacity}, ${s.label}${t.badge ? `, ${t.badge}` : ""}`}
            style={{ left: `${t.pos_x}%`, top: `${t.pos_y + 6}%` }}
            className={cn(
              "absolute flex aspect-square min-h-11 flex-col items-center justify-center border-2 text-center transition-all",
              t.shape === "round" ? "rounded-full" : "rounded-xl",
              t.shape === "rect" && "aspect-[4/3]",
              w,
              s.cls,
              t.highlight && "ring-2 ring-primary ring-offset-2 ring-offset-secondary",
              t.dim && "opacity-55",
              selectedId === t.id && "scale-105 shadow-lift",
              t.alert && "border-destructive",
            )}
          >
            <span className="text-xs font-bold leading-none sm:text-sm">{t.label}</span>
            <span className="mt-0.5 flex items-center gap-0.5 text-[10px] leading-none sm:text-xs">
              <Icon className="h-3 w-3" aria-hidden />
              {t.capacity}
            </span>
            {t.badge && (
              <span className="absolute -bottom-2 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-card sm:block">
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legend">
      {Object.entries(TABLE_STATUS).map(([k, v]) => {
        const Icon = v.icon;
        return (
          <li key={k} className="flex items-center gap-1">
            <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-md border", v.cls)}>
              <Icon className="h-3 w-3" aria-hidden />
            </span>
            {v.label}
          </li>
        );
      })}
    </ul>
  );
}
