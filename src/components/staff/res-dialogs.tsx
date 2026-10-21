import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerRow, PartyStepper, SlotCard, useSlots } from "@/components/booking-panel";
import { fmtTime, isoLocalDate } from "@/lib/booking";
import { staffAction, type Res, type Tbl } from "./use-staff";

export function TableSelect({ tables, value, onChange, party }: { tables: Tbl[]; value: string; onChange: (v: string) => void; party: number }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-input bg-card px-3 text-base"
      aria-label="Table"
    >
      <option value="">Assign automatically</option>
      {tables.filter((t) => t.active && t.capacity >= party && t.min_party <= party).map((t) => (
        <option key={t.id} value={t.id}>Table {t.label} · seats {t.capacity} · {t.status}</option>
      ))}
    </select>
  );
}

/** Phone booking (no `res`) or move/adjust (with `res`). */
export function ReservationDialog({ open, onOpenChange, tables, res, defaultDate, prefill }: {
  open: boolean; onOpenChange: (o: boolean) => void; tables: Tbl[]; res?: Res | null; defaultDate: string;
  prefill?: { name?: string; phone?: string; party?: number; notes?: string };
}) {
  const [party, setParty] = useState(res?.party_size ?? prefill?.party ?? 2);
  const [date, setDate] = useState(res ? isoLocalDate(res.starts_at) : defaultDate);
  const [slot, setSlot] = useState<string | null>(res?.starts_at ?? null);
  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "+880 ");
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const [table, setTable] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: slots } = useSlots(date, party);

  async function submit() {
    if (!slot) return;
    setBusy(true);
    const ok = res
      ? await staffAction("staff_move_reservation", { _id: res.id, _start: slot, _party: party, _table: table || null }, "Reservation updated")
      : await staffAction("staff_create_reservation", { _start: slot, _party: party, _name: name, _phone: phone, _notes: notes || null, _table: table || null, _source: "phone" }, "Reservation added");
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{res ? `Adjust ${res.guest_name ?? "booking"}` : "Add phone reservation"}</DialogTitle>
          <DialogDescription>{res ? "The original booking is kept unless the new time and table are free." : "Availability is checked live when you save."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!res && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="r-name">Guest name</Label><Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" /></div>
              <div className="space-y-1"><Label htmlFor="r-phone">Phone</Label><Input id="r-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 text-base" /></div>
            </div>
          )}
          <PartyStepper value={party} onChange={setParty} />
          <DatePickerRow date={date} onChange={(d) => { setDate(d); setSlot(null); }} />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots?.map((s) => (
              <SlotCard key={s.slot_start} slot={s.slot_start === res?.starts_at ? { ...s, status: "available", free_count: Math.max(1, s.free_count) } : s} selected={slot === s.slot_start} onSelect={() => setSlot(s.slot_start)} />
            ))}
          </div>
          <div className="space-y-1"><Label>Table</Label><TableSelect tables={tables} value={table} onChange={setTable} party={party} /></div>
          {!res && <div className="space-y-1"><Label htmlFor="r-notes">Notes</Label><Input id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11 text-base" /></div>}
          <Button variant="hero" size="lg" className="w-full" disabled={!slot || busy || (!res && !name.trim())} onClick={submit}>
            {busy && <Loader2 className="animate-spin" />} {slot ? `Save for ${fmtTime(slot)}` : "Pick a time"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WalkInDialog({ open, onOpenChange, tables, presetTable }: { open: boolean; onOpenChange: (o: boolean) => void; tables: Tbl[]; presetTable?: string }) {
  const [party, setParty] = useState(2);
  const [name, setName] = useState("");
  const [table, setTable] = useState(presetTable ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seat a walk-in</DialogTitle>
          <DialogDescription>Seats the party now and blocks the table for the full dining time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <PartyStepper value={party} onChange={setParty} />
          <div className="space-y-1"><Label htmlFor="w-name">Name (optional)</Label><Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" /></div>
          <div className="space-y-1"><Label>Table</Label><TableSelect tables={tables.filter((t) => t.status === "empty")} value={table} onChange={setTable} party={party} /></div>
          <Button variant="hero" size="lg" className="w-full" disabled={busy} onClick={async () => {
            setBusy(true);
            const ok = await staffAction("staff_walk_in", { _party: party, _name: name || null, _table: table || null }, "Walk-in seated");
            setBusy(false);
            if (ok) onOpenChange(false);
          }}>
            {busy && <Loader2 className="animate-spin" />} Seat now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
