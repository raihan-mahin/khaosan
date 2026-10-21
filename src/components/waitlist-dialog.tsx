import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errText, fmtDateLong, rpc } from "@/lib/booking";

export function WaitlistDialog({ open, onOpenChange, party, date }: { open: boolean; onOpenChange: (o: boolean) => void; party: number; date: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+880 ");
  const [email, setEmail] = useState("");
  const [from, setFrom] = useState("18:00");
  const [to, setTo] = useState("21:00");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await rpc<{ ok: boolean; error?: string }>("join_waitlist", {
        _name: name, _phone: phone, _email: email || null, _party: party, _date: date, _from: from, _to: to,
      });
      if (r.ok) setDone(true);
      else setErr(errText(r.error));
    } catch {
      setErr("We couldn't reach the restaurant. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setDone(false); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Join the waitlist</DrawerTitle>
          <DrawerDescription>
            {party} guests · {fmtDateLong(date)}. Joining the waitlist does not confirm a table.
          </DrawerDescription>
        </DrawerHeader>
        {done ? (
          <div className="space-y-3 px-4 pb-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
            <p className="font-semibold">You're on the waitlist</p>
            <p className="text-sm text-muted-foreground">If a table opens, the restaurant will contact you on {phone}. This is not a confirmed reservation.</p>
            <Button variant="soft" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 px-4 pb-8">
            <div>
              <Label htmlFor="wl-name">Name</Label>
              <Input id="wl-name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="wl-phone">Mobile number</Label>
              <Input id="wl-phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 text-base" autoComplete="tel" />
            </div>
            <div>
              <Label htmlFor="wl-email">Email (optional)</Label>
              <Input id="wl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="wl-from">Earliest</Label>
                <Input id="wl-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 text-base" />
              </div>
              <div>
                <Label htmlFor="wl-to">Latest</Label>
                <Input id="wl-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 text-base" />
              </div>
            </div>
            {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Join waitlist
            </Button>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
