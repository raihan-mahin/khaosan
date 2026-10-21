import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Minus, Plus, Loader2, Clock, Ban, Hourglass, Lock, ArrowRight, Users, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import {
  addDays, errText, fetchPublicTables, fetchSlots, fmtDateLong, fmtTime, isoLocalDate, localDate, newKey, rpc,
  SLOT_LABEL, type Slot, type RpcResult,
} from "@/lib/booking";
import { useLive } from "@/hooks/use-live";
import { LiveBadge, useSettings } from "@/components/brand";
import { WaitlistDialog } from "@/components/waitlist-dialog";
import { cn } from "@/lib/utils";

const VISIT_KEY = "ks-visit";

export function SlotCard({ slot, selected, onSelect }: { slot: Slot; selected: boolean; onSelect: () => void }) {
  const ok = slot.status === "available";
  const Icon = ok ? Clock : slot.status === "held" ? Hourglass : slot.status === "full" ? Ban : Lock;
  const label = ok ? (slot.free_count === 1 ? "1 table left" : "Available") : SLOT_LABEL[slot.status];
  return (
    <button
      type="button"
      disabled={!ok}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${fmtTime(slot.slot_start)} — ${label}`}
      className={cn(
        "flex min-h-16 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-all",
        ok && !selected && "border-border bg-card hover:border-primary/50 hover:shadow-card",
        selected && "border-primary bg-primary text-primary-foreground shadow-lift",
        !ok && "cursor-not-allowed border-dashed border-border bg-muted/60 text-muted-foreground",
      )}
    >
      <span className={cn("tabular text-base font-semibold", !ok && "line-through decoration-1")}>{fmtTime(slot.slot_start)}</span>
      <span className={cn("flex items-center gap-1 text-xs", selected ? "text-primary-foreground/85" : ok && slot.free_count === 1 ? "text-accent-foreground font-medium" : "")}>
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </span>
    </button>
  );
}

export function PartyStepper({ value, onChange, max = 20 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-1">
      <Button type="button" variant="ghost" size="icon" aria-label="Fewer guests" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus />
      </Button>
      <span className="flex items-center gap-2 text-base font-semibold" aria-live="polite">
        <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
        {value} {value === 1 ? "guest" : "guests"}
      </span>
      <Button type="button" variant="ghost" size="icon" aria-label="More guests" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus />
      </Button>
    </div>
  );
}

export function DatePickerRow({ date, onChange, advanceDays = 30 }: { date: string; onChange: (d: string) => void; advanceDays?: number }) {
  const [open, setOpen] = useState(false);
  const today = localDate();
  const tomorrow = addDays(today, 1);
  const chip = (d: string, label: string) => (
    <button
      type="button"
      onClick={() => onChange(d)}
      aria-pressed={date === d}
      className={cn(
        "min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold",
        date === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50",
      )}
    >
      {label}
    </button>
  );
  const isOther = date !== today && date !== tomorrow;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {chip(today, "Today")}
        {chip(tomorrow, "Tomorrow")}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-pressed={isOther}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold",
            isOther ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50",
          )}
        >
          <CalendarDays className="h-4 w-4" aria-hidden /> Pick date
        </button>
      </div>
      <p className="text-sm text-muted-foreground">{fmtDateLong(date)}</p>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Choose a date</DrawerTitle>
            <DrawerDescription>Bookings open up to {advanceDays} days ahead.</DrawerDescription>
          </DrawerHeader>
          <div className="flex justify-center pb-8">
            <Calendar
              mode="single"
              selected={new Date(date + "T12:00:00")}
              disabled={(d) => {
                const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                return s < today || s > addDays(today, advanceDays);
              }}
              onSelect={(d) => {
                if (!d) return;
                onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                setOpen(false);
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function useSlots(date: string, party: number) {
  const qc = useQueryClient();
  const [updatedAt, setUpdatedAt] = useState<number>();
  const q = useQuery({
    queryKey: ["slots", date, party],
    queryFn: async () => {
      const r = await fetchSlots(date, party);
      setUpdatedAt(Date.now());
      return r;
    },
    staleTime: 5000,
  });
  const live = useLive(() => qc.invalidateQueries({ queryKey: ["slots"] }));
  return { ...q, live, updatedAt };
}

export function BookingPanel() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [party, setParty] = useState(2);
  const [date, setDate] = useState(() => localDate());
  const [slot, setSlot] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tableSheet, setTableSheet] = useState(false);
  const [waitOpen, setWaitOpen] = useState(false);
  const [alts, setAlts] = useState<string[]>([]);
  const restored = useRef(false);
  const slotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(VISIT_KEY) || "null");
      if (v && v.date >= localDate()) {
        setParty(v.party ?? 2);
        setDate(v.date);
        setSlot(v.slot ?? null);
        setSearched(!!v.searched);
      }
    } catch {
      /* ignore */
    }
    restored.current = true;
  }, []);
  useEffect(() => {
    if (restored.current) sessionStorage.setItem(VISIT_KEY, JSON.stringify({ party, date, slot, searched }));
  }, [party, date, slot, searched]);

  const { data: slots, isLoading, isError, refetch, live, updatedAt } = useSlots(date, party);

  // Default to the next valid service time; drop selection if it becomes unavailable.
  const firstAvail = slots?.find((s) => s.status === "available")?.slot_start ?? null;
  useEffect(() => {
    if (!slots) return;
    const cur = slots.find((s) => s.slot_start === slot);
    if (!slot || !cur) setSlot(firstAvail);
  }, [slots, slot, firstAvail]);

  const selected = slots?.find((s) => s.slot_start === slot);
  const selectedGone = !!selected && selected.status !== "available";
  const nearest = useMemo(() => {
    if (!slots || !slot) return [];
    const t = new Date(slot).getTime();
    return slots
      .filter((s) => s.status === "available")
      .sort((a, b) => Math.abs(new Date(a.slot_start).getTime() - t) - Math.abs(new Date(b.slot_start).getTime() - t))
      .slice(0, 3);
  }, [slots, slot]);

  const counts = useMemo(() => {
    const c = { available: 0, total: slots?.length ?? 0 };
    slots?.forEach((s) => s.status === "available" && c.available++);
    return c;
  }, [slots]);
  const dayStatus = slots?.[0]?.status === "closed" ? "closed" : slots?.[0]?.status === "beyond_window" ? "beyond" : null;

  const tables = useQuery({
    queryKey: ["visit-tables", slot, party],
    queryFn: () => fetchPublicTables(slot, party),
    enabled: tableSheet && !!slot,
  });

  async function hold(tableId: string | null, start = slot) {
    if (!start) return;
    if (live === "offline") {
      toast.error("You're offline. Reconnect to check live availability.");
      return;
    }
    setBusy(true);
    setAlts([]);
    try {
      const r = await rpc<RpcResult>("create_hold", { _start: start, _party: party, _table: tableId, _idem: newKey() });
      if (r.ok) {
        navigate({ to: "/book", search: { token: r.token } });
      } else {
        toast.error(errText(r.error));
        setAlts(r.alternatives ?? []);
        setTableSheet(false);
        refetch();
      }
    } catch {
      toast.error("We couldn't reach the restaurant. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function onContinue() {
    if (settings?.allow_table_choice) setTableSheet(true);
    else hold(null);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold">Guests</label>
          <PartyStepper value={party} onChange={(n) => { setParty(n); setAlts([]); }} />
        </div>
        <div>
          <span className="mb-2 block text-sm font-semibold">Date</span>
          <DatePickerRow date={date} onChange={(d) => { setDate(d); setSlot(null); setAlts([]); }} advanceDays={settings?.advance_days ?? 30} />
        </div>
        {!searched && (
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={() => {
              setSearched(true);
              setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }}
          >
            Find a table <ArrowRight />
          </Button>
        )}
      </div>

      {searched && (
        <div ref={slotsRef} className="scroll-mt-20 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Available times</h2>
              {slots && !dayStatus && (
                <p className="text-sm text-muted-foreground">
                  {counts.available} of {counts.total} times open for {party} {party === 1 ? "guest" : "guests"}
                </p>
              )}
            </div>
            <LiveBadge state={live} updatedAt={updatedAt} />
          </div>

          {isLoading && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}
          {isError && (
            <div className="rounded-xl bg-danger-soft p-4 text-sm text-destructive">
              We couldn't load availability. <button className="font-semibold underline" onClick={() => refetch()}>Try again</button>
            </div>
          )}
          {dayStatus === "closed" && (
            <EmptyState title="Closed on this day" body="The restaurant isn't taking reservations for this date. Please pick another day." />
          )}
          {dayStatus === "beyond" && (
            <EmptyState title="Not open for booking yet" body={`Reservations open ${settings?.advance_days ?? 30} days in advance.`} />
          )}
          {slots && !dayStatus && slots.length === 0 && <EmptyState title="No service times" body="No service hours are configured for this date." />}

          {slots && !dayStatus && slots.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <SlotCard key={s.slot_start} slot={s} selected={s.slot_start === slot} onSelect={() => { setSlot(s.slot_start); setAlts([]); }} />
                ))}
              </div>
              {counts.available === 0 && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="font-semibold">Fully booked for {party} on {fmtDateLong(date)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="soft" onClick={() => { setDate(addDays(date, 1)); setSlot(null); }}>See next available time</Button>
                    <Button variant="outline" onClick={() => setWaitOpen(true)}>Join waitlist</Button>
                  </div>
                </div>
              )}
              {counts.available > 0 && (
                <button className="text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => setWaitOpen(true)}>
                  Can't find a good time? Join the waitlist
                </button>
              )}
            </>
          )}

          {(selectedGone || alts.length > 0) && (
            <div className="rounded-2xl border border-orange/50 bg-orange-soft p-4" role="alert">
              <p className="flex items-center gap-2 font-semibold text-accent-foreground">
                <CircleAlert className="h-4 w-4" aria-hidden /> That time is no longer available. Nearest options:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(alts.length ? alts : nearest.map((n) => n.slot_start)).map((a) => (
                  <Button key={a} variant="outline" size="sm" onClick={() => {
                    if (isoLocalDate(a) !== date) setDate(isoLocalDate(a));
                    setSlot(a); setAlts([]);
                  }}>
                    {isoLocalDate(a) !== date ? `${fmtDateLong(a).split(",")[0]} ` : ""}{fmtTime(a)}
                  </Button>
                ))}
                {alts.length === 0 && nearest.length === 0 && <span className="text-sm">No other times today.</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {searched && slot && selected?.status === "available" && (
        <div className="sticky bottom-3 z-20 lg:static">
          <Button variant="hero" size="xl" className="w-full" disabled={busy} onClick={onContinue}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Reserve {fmtTime(slot)} · {party} {party === 1 ? "guest" : "guests"}
            <ArrowRight />
          </Button>
        </div>
      )}

      <Drawer open={tableSheet} onOpenChange={setTableSheet}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Choose a table (optional)</DrawerTitle>
            <DrawerDescription>
              {slot && `${fmtDateLong(date)} at ${fmtTime(slot)} · ${party} guests`}
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto px-4">
            <Button variant="hero" size="lg" className="w-full" disabled={busy} onClick={() => hold(null)}>
              {busy && <Loader2 className="animate-spin" />} Assign the best table for me
            </Button>
            {tables.isLoading && <p className="py-4 text-center text-sm text-muted-foreground">Checking tables…</p>}
            <div className="grid grid-cols-2 gap-2 pb-6 pt-2">
              {tables.data?.filter((t) => t.fits).map((t) => (
                <button
                  key={t.id}
                  disabled={!t.free_for_visit || busy}
                  onClick={() => hold(t.id)}
                  className={cn(
                    "min-h-16 rounded-xl border p-3 text-left",
                    t.free_for_visit ? "border-border bg-card hover:border-primary" : "cursor-not-allowed border-dashed bg-muted text-muted-foreground",
                  )}
                >
                  <span className="block font-semibold">Table {t.label}</span>
                  <span className="block text-xs">{t.area} · seats {t.capacity}</span>
                  <span className="block text-xs">{t.free_for_visit ? "Available for your visit" : t.held ? "Temporarily held" : "Not available"}</span>
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <WaitlistDialog open={waitOpen} onOpenChange={setWaitOpen} party={party} date={date} />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
