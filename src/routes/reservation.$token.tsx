import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { CalendarPlus, CheckCircle2, Copy, Loader2, MapPin, Phone, XCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, useSettings } from "@/components/brand";
import { VisitSummary } from "@/components/visit-summary";
import { DatePickerRow, PartyStepper, SlotCard, useSlots } from "@/components/booking-panel";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { errText, fmtTime, googleCalendarUrl, icsDataUrl, isoLocalDate, rpc, type Booking, type RpcResult } from "@/lib/booking";

export const Route = createFileRoute("/reservation/$token")({
  validateSearch: z.object({ new: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Your reservation — Khaosan" },
      { name: "description", content: "View, change or cancel your Khaosan reservation." },
      { property: "og:title", content: "Your reservation — Khaosan" },
      { property: "og:description", content: "Manage your Khaosan table reservation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReservationPage,
});

const STATUS_TEXT: Record<string, string> = {
  confirmed: "Your table is reserved.",
  arrived: "Welcome — you've checked in.",
  seated: "Enjoy your meal!",
  completed: "Thanks for dining with us.",
  cancelled: "This reservation was cancelled.",
  no_show: "This reservation was marked as a no-show.",
  held: "This reservation isn't confirmed yet.",
  expired: "This hold expired before it was confirmed.",
};

function ReservationPage() {
  const { token } = Route.useParams();
  const { new: isNew } = Route.useSearch();
  const qc = useQueryClient();
  const { data: s } = useSettings();
  const q = useQuery({ queryKey: ["booking", token], queryFn: () => rpc<RpcResult>("get_booking", { _token: token }) });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const b = q.data && q.data.ok ? (q.data as Booking) : null;

  async function cancel() {
    setBusy(true);
    try {
      const r = await rpc<RpcResult>("cancel_booking", { _token: token });
      if (r.ok) { toast.success("Reservation cancelled"); qc.setQueryData(["booking", token], r); }
      else toast.error(errText(r.error));
    } finally { setBusy(false); setCancelOpen(false); }
  }

  const good = b && ["confirmed", "arrived", "seated", "completed"].includes(b.status);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-4 px-4 pb-16 pt-6">
        {q.isLoading && <div className="h-72 animate-pulse rounded-2xl bg-muted" />}
        {q.data && !q.data.ok && (
          <div className="surface p-6 text-center">
            <p className="font-semibold">{errText(q.data.error)}</p>
            <Button asChild variant="hero" className="mt-4"><Link to="/">Book a table</Link></Button>
          </div>
        )}
        {b && (
          <>
            {isNew && <ol className="flex gap-2 text-xs font-medium text-muted-foreground"><li>1. Visit</li><li>2. Details</li><li aria-current="step" className="text-primary">3. Confirmed</li></ol>}
            <section className="surface overflow-hidden">
              <div className={good ? "thai-pattern p-1" : "bg-muted p-1"} aria-hidden />
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  {good ? <CheckCircle2 className="h-8 w-8 shrink-0 text-success" aria-hidden /> : <XCircle className="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden />}
                  <div>
                    <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">{STATUS_TEXT[b.status] ?? b.status}</h1>
                    <p className="mt-1 flex items-center gap-2 text-sm">
                      Booking reference <strong className="tabular rounded-md bg-secondary px-2 py-0.5 text-base tracking-wider">{b.ref}</strong>
                    </p>
                    {b.guest_name && <p className="text-sm text-muted-foreground">for {b.guest_name}</p>}
                  </div>
                </div>
                <VisitSummary b={b} />
                {b.notes && <p className="text-sm"><strong>Your request:</strong> {b.notes}</p>}

                {b.status === "confirmed" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild variant="soft" size="lg">
                      <a href={googleCalendarUrl(b, s?.name ?? "Khaosan", s?.address)} target="_blank" rel="noreferrer"><CalendarPlus /> Add to calendar</a>
                    </Button>
                    <Button asChild variant="soft" size="lg">
                      <a href={icsDataUrl(b, s?.name ?? "Khaosan", s?.address)} download={`khaosan-${b.ref}.ics`}><CalendarPlus /> Download .ics</a>
                    </Button>
                    {s?.map_url && <Button asChild variant="outline" size="lg"><a href={s.map_url} target="_blank" rel="noreferrer"><MapPin /> Directions</a></Button>}
                    {s?.phone && <Button asChild variant="outline" size="lg"><a href={`tel:${s.phone.replace(/\s/g, "")}`}><Phone /> Call restaurant</a></Button>}
                  </div>
                )}
              </div>
            </section>

            {b.status === "confirmed" && (
              <section className="surface space-y-3 p-5" aria-labelledby="manage-h">
                <h2 id="manage-h" className="text-lg font-bold">Manage reservation</h2>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Save this page — its private link lets you change or cancel. No email or SMS confirmation service is connected yet, so no message was sent.
                </p>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href.split("?")[0]); toast.success("Link copied"); }}>
                  <Copy /> Copy private link
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="soft" size="lg" onClick={() => setChangeOpen(true)}>Change time or guests</Button>
                  <Button variant="outline" size="lg" className="text-destructive" onClick={() => setCancelOpen(true)}>Cancel</Button>
                </div>
              </section>
            )}
            {!good && <Button asChild variant="hero" size="lg" className="w-full"><Link to="/">Book another table</Link></Button>}
          </>
        )}
      </main>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reservation?</AlertDialogTitle>
            <AlertDialogDescription>Your table will be released for other guests. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reservation</AlertDialogCancel>
            <AlertDialogAction onClick={cancel} disabled={busy}>Yes, cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {b && <ChangeSheet open={changeOpen} onOpenChange={setChangeOpen} b={b} onDone={(nb) => qc.setQueryData(["booking", token], nb)} />}
    </div>
  );
}

function ChangeSheet({ open, onOpenChange, b, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; b: Booking; onDone: (b: Booking) => void }) {
  const [party, setParty] = useState(b.party_size);
  const [date, setDate] = useState(isoLocalDate(b.starts_at));
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data: slots, isLoading } = useSlots(date, party);

  async function submit() {
    if (!slot) return;
    setBusy(true); setErr(null);
    try {
      const r = await rpc<RpcResult>("reschedule_booking", { _token: b.token, _start: slot, _party: party });
      if (r.ok) { onDone(r); toast.success(`Moved to ${fmtTime(slot)}`); onOpenChange(false); }
      else setErr(`${errText(r.error)} Your original reservation is unchanged.`);
    } catch {
      setErr("We couldn't reach the restaurant. Your original reservation is unchanged.");
    } finally { setBusy(false); }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Change your reservation</DrawerTitle>
          <DrawerDescription>Your current table stays reserved until the new time is secured.</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-4 pb-8">
          <PartyStepper value={party} onChange={(n) => { setParty(n); setSlot(null); }} />
          <DatePickerRow date={date} onChange={(d) => { setDate(d); setSlot(null); }} />
          {isLoading && <p className="text-sm text-muted-foreground">Loading times…</p>}
          <div className="grid grid-cols-3 gap-2">
            {slots?.map((s) => <SlotCard key={s.slot_start} slot={s} selected={slot === s.slot_start} onSelect={() => setSlot(s.slot_start)} />)}
          </div>
          {err && <p className="rounded-xl bg-danger-soft p-3 text-sm text-destructive" role="alert">{err}</p>}
          <Button variant="hero" size="lg" className="w-full" disabled={!slot || busy} onClick={submit}>
            {busy && <Loader2 className="animate-spin" />} {slot ? `Move to ${fmtTime(slot)} · ${party} guests` : "Choose a new time"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
