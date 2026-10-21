import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, LogOut, Phone, Plus, UserPlus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, LiveBadge, TableStatusChip } from "@/components/brand";
import { FloorPlan, StatusLegend } from "@/components/floor-plan";
import { DatePickerRow } from "@/components/booking-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { fmtTime, localDate } from "@/lib/booking";
import { useNow } from "@/hooks/use-live";
import { cn } from "@/lib/utils";
import { parseRange, RES_STATUS_LABEL, staffAction, useRole, useStaffData, type Alloc, type Res, type Tbl } from "@/components/staff/use-staff";
import { ReservationDialog, WalkInDialog, TableSelect } from "@/components/staff/res-dialogs";
import { Setup } from "@/components/staff/setup";
import { supabase as sb } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Host dashboard — Khaosan" },
      { name: "description", content: "Manage reservations, walk-ins and tables at Khaosan." },
      { property: "og:title", content: "Host dashboard — Khaosan" },
      { property: "og:description", content: "Khaosan staff dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

const ACTIVE = ["held", "confirmed", "arrived", "seated"];

function StaffPage() {
  const role = useRole();
  const [date, setDate] = useState(localDate());
  const enabled = !!role.data?.isStaff;
  const { data, live, updatedAt, isLoading } = useStaffData(date, enabled);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [walkOpen, setWalkOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ name?: string; phone?: string; party?: number } | undefined>();
  const now = useNow(30000);

  const tables = data?.tables ?? [];
  const reservations = data?.reservations ?? [];
  const allocs = data?.allocs ?? [];
  const byRes = useMemo(() => {
    const m = new Map<string, Alloc[]>();
    allocs.forEach((a) => m.set(a.reservation_id, [...(m.get(a.reservation_id) ?? []), a]));
    return m;
  }, [allocs]);
  const tLabel = (id: string) => tables.find((t) => t.id === id)?.label ?? "?";

  // Overrun alerts: seated past estimated end, with an upcoming booking on the same table.
  const alerts = useMemo(() => {
    const out: { res: Res; next: Res; table: string }[] = [];
    reservations.filter((r) => r.status === "seated" && new Date(r.ends_at).getTime() < now).forEach((r) => {
      (byRes.get(r.id) ?? []).forEach((a) => {
        const next = reservations.find((n) => ["confirmed", "arrived"].includes(n.status) && (byRes.get(n.id) ?? []).some((x) => x.table_id === a.table_id && x.active) && new Date(n.starts_at).getTime() > now - 15 * 60000 && new Date(n.starts_at).getTime() < now + 60 * 60000);
        if (next) out.push({ res: r, next, table: tLabel(a.table_id) });
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, byRes, now, tables]);

  if (role.isLoading) return <Shell><div className="h-40 animate-pulse rounded-2xl bg-muted" /></Shell>;
  if (!role.data?.isStaff)
    return (
      <Shell>
        <div className="surface space-y-3 p-6">
          <h1 className="text-xl font-bold">No staff access yet</h1>
          <p className="text-sm text-muted-foreground">You're signed in as {role.data?.email}. Ask the manager to grant you access in Setup → Staff access.</p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut /> Sign out</Button>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Host dashboard</h1>
          <LiveBadge state={live} updatedAt={updatedAt} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="hero" onClick={() => setWalkOpen(true)}><UserPlus /> Walk-in</Button>
          <Button variant="soft" onClick={() => { setPrefill(undefined); setPhoneOpen(true); }}><Phone /> Phone booking</Button>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => supabase.auth.signOut()}><LogOut /></Button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1 rounded-2xl border border-destructive/40 bg-danger-soft p-4 text-sm text-destructive" role="alert">
          {alerts.map((a) => (
            <p key={a.res.id + a.table} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Table {a.table}: {a.res.guest_name} still seated (est. end {fmtTime(a.res.ends_at)}). {a.next.guest_name} is booked at {fmtTime(a.next.starts_at)} — consider moving them.
            </p>
          ))}
        </div>
      )}

      <Tabs defaultValue="floor" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-secondary p-1">
          {[["floor", "Floor"], ["today", "Reservations"], ["timeline", "Timeline"], ["waitlist", `Waitlist (${data?.waitlist.filter((w) => w.status === "waiting").length ?? 0})`], ["setup", "Setup"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="min-h-10 rounded-xl px-4 data-[state=active]:shadow-card">{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="floor">
          <FloorTab tables={tables} reservations={reservations} byRes={byRes} now={now} />
        </TabsContent>
        <TabsContent value="today" className="space-y-4">
          <DatePickerRow date={date} onChange={setDate} />
          {isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : <ResList reservations={reservations} byRes={byRes} tables={tables} tLabel={tLabel} date={date} />}
        </TabsContent>
        <TabsContent value="timeline" className="space-y-4">
          <DatePickerRow date={date} onChange={setDate} />
          <Timeline tables={tables} reservations={reservations} byRes={byRes} date={date} now={now} />
        </TabsContent>
        <TabsContent value="waitlist">
          <WaitlistTab items={data?.waitlist ?? []} onBook={(w) => { setPrefill({ name: w.guest_name, phone: w.phone, party: w.party_size }); setPhoneOpen(true); }} />
        </TabsContent>
        <TabsContent value="setup">
          <Setup tables={tables} isAdmin={!!role.data?.isAdmin} />
        </TabsContent>
      </Tabs>

      {phoneOpen && <ReservationDialog open={phoneOpen} onOpenChange={setPhoneOpen} tables={tables} defaultDate={date} prefill={prefill} />}
      {walkOpen && <WalkInDialog open={walkOpen} onOpenChange={setWalkOpen} tables={tables} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-4 px-4 pb-16 pt-5">{children}</main>
    </div>
  );
}

function minsLeft(iso: string, now: number) {
  const m = Math.round((new Date(iso).getTime() - now) / 60000);
  return m >= 0 ? `${m} min left` : `${-m} min over`;
}

function FloorTab({ tables, reservations, byRes, now }: { tables: Tbl[]; reservations: Res[]; byRes: Map<string, Alloc[]>; now: number }) {
  const [sel, setSel] = useState<string | null>(null);
  const [walkTable, setWalkTable] = useState<string | null>(null);
  const resFor = (tid: string) => reservations.filter((r) => (byRes.get(r.id) ?? []).some((a) => a.table_id === tid && a.active));
  const current = (tid: string) => resFor(tid).find((r) => r.status === "seated");
  const next = (tid: string) => resFor(tid).filter((r) => ["confirmed", "arrived"].includes(r.status) && new Date(r.starts_at).getTime() > now - 30 * 60000).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const items = tables.filter((t) => t.active).map((t) => {
    const c = current(t.id);
    const n = next(t.id);
    return { ...t, badge: c ? minsLeft(c.ends_at, now) : n ? `Next ${fmtTime(n.starts_at)}` : null, alert: !!c && new Date(c.ends_at).getTime() < now };
  });
  const t = tables.find((x) => x.id === sel);
  const c = t && current(t.id);
  const n = t && next(t.id);
  const counts = { empty: 0, occupied: 0, cleaning: 0, unavailable: 0 } as Record<string, number>;
  tables.filter((x) => x.active).forEach((x) => counts[x.status]++);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["empty", "occupied", "cleaning", "unavailable"] as const).map((s) => (
          <div key={s} className="surface flex items-center justify-between p-3"><TableStatusChip status={s} /><span className="tabular text-xl font-bold">{counts[s]}</span></div>
        ))}
      </div>
      <FloorPlan items={items} onSelect={setSel} selectedId={sel} />
      <StatusLegend />
      <Drawer open={!!t} onOpenChange={(o) => !o && setSel(null)}>
        <DrawerContent>
          {t && (
            <>
              <DrawerHeader>
                <DrawerTitle>Table {t.label}</DrawerTitle>
                <DrawerDescription>{t.area} · seats {t.min_party}–{t.capacity}</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-3 px-4 pb-8">
                <TableStatusChip status={t.status} />
                {c && (
                  <div className="rounded-xl bg-info-soft p-3 text-sm">
                    <p className="font-semibold">{c.guest_name} · {c.party_size} guests</p>
                    <p>Seated {c.seated_at ? fmtTime(c.seated_at) : ""} · est. end {fmtTime(c.ends_at)} ({minsLeft(c.ends_at, now)})</p>
                  </div>
                )}
                {n && <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> Next: {n.guest_name} at {fmtTime(n.starts_at)} ({n.party_size})</p>}
                <div className="grid grid-cols-2 gap-2">
                  {c && <Button variant="hero" onClick={() => staffAction("staff_update_reservation", { _id: c.id, _action: "depart" }, "Marked departed — table being cleaned")}>Party departed</Button>}
                  {t.status === "cleaning" && <Button variant="hero" onClick={() => staffAction("staff_set_table_status", { _table: t.id, _status: "empty" }, "Table ready")}>Cleaning done — ready</Button>}
                  {t.status === "empty" && <Button variant="soft" onClick={() => setWalkTable(t.id)}><Plus /> Seat walk-in</Button>}
                  {t.status === "empty" && <Button variant="outline" onClick={() => staffAction("staff_set_table_status", { _table: t.id, _status: "cleaning" }, "Marked as being cleaned")}>Mark cleaning</Button>}
                  {t.status !== "unavailable" && !c && <Button variant="outline" onClick={() => staffAction("staff_set_table_status", { _table: t.id, _status: "unavailable" }, "Table blocked")}>Block table</Button>}
                  {t.status === "unavailable" && <Button variant="soft" onClick={() => staffAction("staff_set_table_status", { _table: t.id, _status: "empty" }, "Table unblocked")}>Unblock</Button>}
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
      {walkTable && <WalkInDialog open onOpenChange={(o) => !o && setWalkTable(null)} tables={tables} presetTable={walkTable} />}
    </div>
  );
}

function ResList({ reservations, byRes, tables, tLabel, date }: { reservations: Res[]; byRes: Map<string, Alloc[]>; tables: Tbl[]; tLabel: (id: string) => string; date: string }) {
  const [move, setMove] = useState<Res | null>(null);
  const [seatFor, setSeatFor] = useState<Res | null>(null);
  const [seatTable, setSeatTable] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");
  const list = reservations.filter((r) => (filter === "all" ? r.status !== "expired" : ACTIVE.includes(r.status) && r.status !== "held"));
  const act = (r: Res, action: string, msg: string) => staffAction("staff_update_reservation", { _id: r.id, _action: action }, msg);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["active", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "active" ? "Upcoming & seated" : "All incl. finished"}</Button>
        ))}
      </div>
      {list.length === 0 && <p className="surface p-6 text-center text-sm text-muted-foreground">No reservations for this day yet.</p>}
      <ul className="space-y-2">
        {list.map((r) => {
          const tl = (byRes.get(r.id) ?? []).map((a) => tLabel(a.table_id)).join(" + ");
          return (
            <li key={r.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  <span className="tabular">{fmtTime(r.starts_at)}</span> · {r.guest_name ?? "—"} · {r.party_size} guests
                  {tl && <span className="text-muted-foreground"> · Table {tl}</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className={cn("mr-2 rounded-full px-2 py-0.5 text-xs font-medium", r.status === "seated" ? "bg-info-soft text-primary" : r.status === "arrived" ? "bg-success-soft text-success" : r.status === "confirmed" ? "bg-orange-soft text-accent-foreground" : "bg-muted")}>{RES_STATUS_LABEL[r.status]}</span>
                  {r.ref} · {r.source}{r.phone && <> · <a className="underline" href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a></>}
                </p>
                {r.notes && <p className="text-sm">“{r.notes}”</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status === "confirmed" && <Button size="sm" variant="soft" onClick={() => act(r, "arrive", "Marked arrived")}>Arrived</Button>}
                {["confirmed", "arrived"].includes(r.status) && <Button size="sm" variant="hero" onClick={() => { setSeatFor(r); setSeatTable(""); }}>Seat</Button>}
                {r.status === "seated" && <Button size="sm" variant="hero" onClick={() => act(r, "depart", "Departed — table being cleaned")}>Departed</Button>}
                {["confirmed", "arrived"].includes(r.status) && <Button size="sm" variant="outline" onClick={() => setMove(r)}>Adjust</Button>}
                {["confirmed", "arrived"].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => act(r, "no_show", "Marked no-show")}>No-show</Button>}
                {["confirmed", "arrived"].includes(r.status) && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => act(r, "cancel", "Cancelled")}>Cancel</Button>}
              </div>
            </li>
          );
        })}
      </ul>
      {move && <ReservationDialog open onOpenChange={(o) => !o && setMove(null)} tables={tables} res={move} defaultDate={date} />}
      <Drawer open={!!seatFor} onOpenChange={(o) => !o && setSeatFor(null)}>
        <DrawerContent>
          {seatFor && (
            <div className="space-y-3 px-4 pb-8">
              <DrawerHeader className="px-0">
                <DrawerTitle>Seat {seatFor.guest_name}</DrawerTitle>
                <DrawerDescription>Keep the assigned table or pick another compatible one.</DrawerDescription>
              </DrawerHeader>
              <TableSelect tables={tables} value={seatTable} onChange={setSeatTable} party={seatFor.party_size} />
              <Button variant="hero" size="lg" className="w-full" onClick={async () => {
                if (await staffAction("staff_update_reservation", { _id: seatFor.id, _action: "seat", _table: seatTable || null }, "Party seated")) setSeatFor(null);
              }}>{seatTable ? "Seat at selected table" : "Seat at assigned table"}</Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Timeline({ tables, reservations, byRes, date, now }: { tables: Tbl[]; reservations: Res[]; byRes: Map<string, Alloc[]>; date: string; now: number }) {
  const start = new Date(`${date}T11:00:00+06:00`).getTime();
  const end = start + 14 * 3600000;
  const pct = (t: number) => ((Math.min(Math.max(t, start), end) - start) / (end - start)) * 100;
  const hours = Array.from({ length: 15 }, (_, i) => start + i * 3600000);
  return (
    <div className="surface overflow-x-auto p-4">
      <div className="min-w-[760px]">
        <div className="relative ml-14 h-6 text-[11px] text-muted-foreground">
          {hours.map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h)}%` }}>{fmtTime(new Date(h).toISOString()).replace(":00", "")}</span>)}
        </div>
        {tables.filter((t) => t.active).map((t) => (
          <div key={t.id} className="flex items-center border-t border-border py-1.5">
            <span className="w-14 text-sm font-semibold">{t.label}<span className="block text-[10px] font-normal text-muted-foreground">{t.capacity} seats</span></span>
            <div className="relative h-9 flex-1 rounded-md bg-secondary/60">
              {now > start && now < end && <div className="absolute inset-y-0 w-0.5 bg-destructive" style={{ left: `${pct(now)}%` }} aria-label="Now" />}
              {reservations.filter((r) => ACTIVE.includes(r.status) || r.status === "completed").flatMap((r) =>
                (byRes.get(r.id) ?? []).filter((a) => a.table_id === t.id).map((a) => {
                  const [s, e] = parseRange(a.block);
                  const realEnd = r.status === "seated" ? Math.max(e, now) : e;
                  return (
                    <div key={r.id + a.table_id}
                      title={`${r.guest_name} · ${r.party_size} · ${fmtTime(r.starts_at)}`}
                      className={cn("absolute inset-y-1 overflow-hidden rounded-md px-1.5 text-[11px] leading-7",
                        r.status === "seated" ? "bg-primary text-primary-foreground" : r.status === "held" ? "bg-orange-soft text-accent-foreground" : r.status === "completed" ? "bg-muted text-muted-foreground" : "bg-orange text-foreground")}
                      style={{ left: `${pct(s)}%`, width: `${Math.max(pct(realEnd) - pct(s), 1)}%` }}>
                      {r.guest_name ?? "Hold"} ({r.party_size})
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        ))}
        <p className="mt-3 text-xs text-muted-foreground">Bars include the cleanup buffer. Seated parties extend past their estimate until marked departed.</p>
      </div>
    </div>
  );
}

function WaitlistTab({ items, onBook }: { items: { id: string; guest_name: string; phone: string; party_size: number; desired_date: string; earliest: string; latest: string; status: string; email: string | null }[]; onBook: (w: (typeof items)[number]) => void }) {
  const set = async (id: string, status: string) => {
    const { error } = await sb.from("waitlist").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };
  const active = items.filter((w) => ["waiting", "offered"].includes(w.status));
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Guests on the waitlist have no confirmed table. Call them when a compatible opening appears, then book it for them.</p>
      {active.length === 0 && <p className="surface p-6 text-center text-sm text-muted-foreground">Nobody is waiting.</p>}
      {active.map((w) => (
        <div key={w.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">{w.guest_name} · {w.party_size} guests</p>
            <p className="text-sm text-muted-foreground">{w.desired_date} · {w.earliest.slice(0, 5)}–{w.latest.slice(0, 5)} · <a className="underline" href={`tel:${w.phone.replace(/\s/g, "")}`}>{w.phone}</a> · {w.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {w.status === "waiting" && <Button size="sm" variant="soft" onClick={() => set(w.id, "offered")}>Mark offered</Button>}
            <Button size="sm" variant="hero" onClick={() => { onBook(w); set(w.id, "booked"); }}>Book table</Button>
            <Button size="sm" variant="ghost" onClick={() => set(w.id, "removed")}>Remove</Button>
          </div>
        </div>
      ))}
      <Link to="/" className="text-sm text-primary underline">Open customer booking page</Link>
    </div>
  );
}
