import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Timer, CircleAlert } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "@/components/brand";
import { VisitSummary } from "@/components/visit-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errText, fmtTime, newKey, rpc, type Booking, type RpcResult } from "@/lib/booking";
import { useNow } from "@/hooks/use-live";
import { useSettings } from "@/components/brand";

export const Route = createFileRoute("/book")({
  validateSearch: z.object({ token: z.string().min(10) }),
  head: () => ({
    meta: [
      { title: "Your details — Khaosan reservation" },
      { name: "description", content: "Enter your details to confirm your table at Khaosan." },
      { property: "og:title", content: "Your details — Khaosan reservation" },
      { property: "og:description", content: "Confirm your table at Khaosan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookPage,
});

const DETAILS_KEY = "ks-details";

function BookPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const q = useQuery({ queryKey: ["booking", token], queryFn: () => rpc<RpcResult>("get_booking", { _token: token }) });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<{ msg: string; alts: string[] } | null>(null);
  const now = useNow(1000);

  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(DETAILS_KEY) || "null");
      if (d) {
        setName(d.name ?? ""); setPhone(d.phone ?? ""); setEmail(d.email ?? ""); setNotes(d.notes ?? "");
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (!phone && settings) setPhone(settings.default_country_code + " ");
  }, [settings, phone]);
  useEffect(() => {
    if (name || phone || email || notes) sessionStorage.setItem(DETAILS_KEY, JSON.stringify({ name, phone, email, notes }));
  }, [name, phone, email, notes]);

  const b = q.data && q.data.ok ? (q.data as Booking) : null;
  const skew = useMemo(() => (b ? new Date(b.server_now).getTime() - Date.now() : 0), [b]);
  const remaining = b?.hold_expires_at ? Math.max(0, new Date(b.hold_expires_at).getTime() - (now + skew)) : 0;
  const expired = !!b && b.status === "held" && remaining <= 0;

  useEffect(() => {
    if (b && b.status !== "held" && b.status !== "expired") navigate({ to: "/reservation/$token", params: { token: b.token }, replace: true });
  }, [b, navigate]);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Please enter your name.";
    if (!/^\+?[0-9][0-9 \-]{6,19}$/.test(phone.trim())) e.phone = "Enter a valid mobile number, e.g. +880 1712 345678.";
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Check the email address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!b || !validate()) return;
    setBusy(true);
    setFail(null);
    try {
      const r = await rpc<RpcResult>("confirm_booking", { _token: b.token, _name: name, _phone: phone, _email: email || null, _notes: notes || null });
      if (r.ok) {
        sessionStorage.removeItem("ks-visit");
        navigate({ to: "/reservation/$token", params: { token: r.token }, search: { new: true } });
      } else {
        setFail({ msg: errText(r.error), alts: r.alternatives ?? [] });
      }
    } catch {
      setFail({ msg: "We couldn't reach the restaurant. Your details are saved — please try again.", alts: [] });
    } finally {
      setBusy(false);
    }
  }

  async function switchTo(start: string) {
    if (!b) return;
    setBusy(true);
    try {
      const r = await rpc<RpcResult>("create_hold", { _start: start, _party: b.party_size, _table: null, _idem: newKey() });
      if (r.ok) {
        setFail(null);
        navigate({ to: "/book", search: { token: r.token }, replace: true });
      } else setFail({ msg: errText(r.error), alts: r.alternatives ?? [] });
    } finally {
      setBusy(false);
    }
  }

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4">
        <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" /> Change visit
        </Link>
        <ol className="mb-4 mt-1 flex gap-2 text-xs font-medium text-muted-foreground" aria-label="Steps">
          <li>1. Visit</li><li aria-current="step" className="text-primary">2. Details</li><li>3. Confirmed</li>
        </ol>

        {q.isLoading && <div className="h-64 animate-pulse rounded-2xl bg-muted" />}
        {q.data && !q.data.ok && (
          <div className="surface p-6 text-center">
            <p className="font-semibold">{errText(q.data.error)}</p>
            <Button asChild variant="hero" className="mt-4"><Link to="/">Start again</Link></Button>
          </div>
        )}

        {b && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <form onSubmit={confirm} noValidate className="surface order-2 space-y-4 p-5 lg:order-1">
              <h1 className="text-2xl font-bold">Your details</h1>
              <Field id="name" label="Name" error={errors.name}>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-12 text-base" aria-invalid={!!errors.name} />
              </Field>
              <Field id="phone" label="Mobile number" error={errors.phone}>
                <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="h-12 text-base" aria-invalid={!!errors.phone} />
              </Field>
              <Field id="email" label="Email (optional)" error={errors.email}>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-12 text-base" />
              </Field>
              <Field id="notes" label="Special request (optional)">
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="text-base" placeholder="Birthday, high chair, allergies…" />
              </Field>

              {fail && (
                <div className="rounded-xl border border-orange/50 bg-orange-soft p-4" role="alert">
                  <p className="flex items-center gap-2 font-semibold text-accent-foreground"><CircleAlert className="h-4 w-4" /> {fail.msg}</p>
                  {fail.alts.length > 0 && (
                    <>
                      <p className="mt-1 text-sm">Your details are kept. Pick a nearby time:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {fail.alts.map((a) => (
                          <Button key={a} type="button" variant="outline" size="sm" disabled={busy} onClick={() => switchTo(a)}>{fmtTime(a)}</Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Confirm reservation
              </Button>
              <p className="text-center text-xs text-muted-foreground">No account or password needed.</p>
            </form>

            <aside className="order-1 space-y-3 lg:order-2">
              <div className="surface space-y-4 p-5 lg:sticky lg:top-20">
                <div className={expired ? "rounded-xl bg-danger-soft p-3 text-sm text-destructive" : "rounded-xl bg-orange-soft p-3 text-sm text-accent-foreground"} aria-live="polite">
                  <p className="flex items-center gap-2 font-semibold">
                    <Timer className="h-4 w-4" aria-hidden />
                    {expired ? "Hold expired" : <>Table held for <span className="tabular">{mm}:{ss}</span></>}
                  </p>
                  <p className="mt-0.5 text-xs">
                    {expired ? "You can still confirm — we'll recheck if the table is free." : "Complete your details before the timer runs out."}
                  </p>
                </div>
                <VisitSummary b={b} />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive" id={`${id}-err`}>{error}</p>}
    </div>
  );
}
