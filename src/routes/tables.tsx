import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, CalendarClock, Hourglass, CheckCircle2 } from "lucide-react";
import { SiteHeader, ViewTabs, LiveBadge, TableStatusChip, Badge2, DemoNotice } from "@/components/brand";
import { FloorPlan, StatusLegend } from "@/components/floor-plan";
import { PartyStepper } from "@/components/booking-panel";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useLive } from "@/hooks/use-live";
import { fetchPublicTables, fmtTime, type PublicTable } from "@/lib/booking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tables")({
  head: () => ({
    meta: [
      { title: "Tables available now — Khaosan Dhaka" },
      { name: "description", content: "See which tables at Khaosan are empty right now and which can be booked for your party." },
      { property: "og:title", content: "Tables available now — Khaosan Dhaka" },
      { property: "og:description", content: "Live table availability at Khaosan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TablesPage,
});

function TablesPage() {
  const qc = useQueryClient();
  const [party, setParty] = useState(2);
  const [view, setView] = useState<"plan" | "list">("plan");
  const [sel, setSel] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>();
  const q = useQuery({
    queryKey: ["public-tables", party],
    queryFn: async () => {
      const r = await fetchPublicTables(null, party);
      setUpdatedAt(Date.now());
      return r;
    },
  });
  const live = useLive(() => qc.invalidateQueries({ queryKey: ["public-tables"] }), ["dining_tables", "availability_pulse"]);
  const tables = q.data ?? [];
  const empty = tables.filter((t) => t.status === "empty").length;
  const bookable = tables.filter((t) => t.free_for_visit).length;
  const selected = tables.find((t) => t.id === sel);

  const items = useMemo(
    () =>
      tables.map((t) => ({
        ...t,
        highlight: t.free_for_visit,
        dim: !t.fits,
        badge: t.held ? "Held" : t.next_reserved_at ? `Res. ${fmtTime(t.next_reserved_at)}` : null,
      })),
    [tables],
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="thai-pattern h-2" aria-hidden />
      <main className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-6">
        <div>
          <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">Tables available now</h1>
          <p className="mt-1 text-muted-foreground">Live view of the dining room. No guest details are shown.</p>
        </div>
        <ViewTabs active="tables" />

        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Physically empty now" value={empty} of={tables.length} />
            <Stat label={`Bookable now for ${party}`} value={bookable} of={tables.filter((t) => t.fits).length} accent />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Your party</span>
            <PartyStepper value={party} onChange={setParty} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <LiveBadge state={live} updatedAt={updatedAt} />
          <div className="flex rounded-xl bg-secondary p-1" role="group" aria-label="View">
            {(["plan", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn("flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium", view === v ? "bg-card shadow-card" : "text-muted-foreground")}
              >
                {v === "plan" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                {v === "plan" ? "Floor plan" : "List"}
              </button>
            ))}
          </div>
        </div>

        {q.isLoading && <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted sm:aspect-[16/9]" />}
        {q.isError && <p className="rounded-xl bg-danger-soft p-4 text-sm text-destructive">Couldn't load tables. <button className="underline" onClick={() => q.refetch()}>Retry</button></p>}

        {q.data && view === "plan" && (
          <div className="space-y-3">
            <FloorPlan items={items} onSelect={setSel} selectedId={sel} />
            <StatusLegend />
            <p className="text-xs text-muted-foreground">Outlined tables can be booked right now for {party}. Faded tables are the wrong size for your party.</p>
          </div>
        )}
        {q.data && view === "list" && (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((t) => (
              <li key={t.id}>
                <button onClick={() => setSel(t.id)} className={cn("surface flex w-full items-center justify-between gap-3 p-4 text-left", !t.fits && "opacity-60")}>
                  <div>
                    <p className="font-semibold">Table {t.label} <span className="font-normal text-muted-foreground">· seats {t.capacity}</span></p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <TableStatusChip status={t.status} />
                      <ResBadges t={t} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <DemoNotice>Demonstration floor plan — the restaurant will confirm its real table layout.</DemoNotice>
      </main>

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSel(null)}>
        <DrawerContent>
          {selected && (
            <>
              <DrawerHeader>
                <DrawerTitle>Table {selected.label}</DrawerTitle>
                <DrawerDescription>{selected.area} · seats {selected.min_party}–{selected.capacity}</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-3 px-4 pb-8">
                <div className="flex flex-wrap gap-2">
                  <TableStatusChip status={selected.status} />
                  <ResBadges t={selected} />
                </div>
                <p className="text-sm">
                  {!selected.fits
                    ? `This table isn't sized for a party of ${party}.`
                    : selected.free_for_visit
                      ? `Empty and free for a full visit starting now for ${party} guests.`
                      : selected.status === "empty" && selected.next_reserved_at
                        ? `Empty now, but reserved at ${fmtTime(selected.next_reserved_at)} — not enough time for a full visit.`
                        : "Not available for a visit right now."}
                </p>
                <p className="text-xs text-muted-foreground">Status updated {fmtTime(selected.status_changed_at)}</p>
                <Button asChild variant="hero" size="lg" className="w-full">
                  <Link to="/">Reserve a table</Link>
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function ResBadges({ t }: { t: PublicTable }) {
  return (
    <>
      {t.free_for_visit && <Badge2 tone="success" icon={CheckCircle2}>Available for your visit</Badge2>}
      {t.held && <Badge2 tone="orange" icon={Hourglass}>Temporarily held</Badge2>}
      {t.next_reserved_at && <Badge2 icon={CalendarClock}>Reserved at {fmtTime(t.next_reserved_at)}</Badge2>}
    </>
  );
}

function Stat({ label, value, of, accent }: { label: string; value: number; of: number; accent?: boolean }) {
  return (
    <div className={cn("surface p-4", accent && "border-primary/40")}>
      <p className={cn("tabular text-3xl font-extrabold", accent ? "text-primary" : "text-foreground")}>
        {value}<span className="text-base font-medium text-muted-foreground"> / {of}</span>
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
