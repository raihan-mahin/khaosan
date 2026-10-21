import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DemoNotice } from "@/components/brand";
import { errText, rpc } from "@/lib/booking";
import type { Tbl } from "./use-staff";

export function Setup({ tables, isAdmin }: { tables: Tbl[]; isAdmin: boolean }) {
  if (!isAdmin) return <p className="surface p-5 text-sm text-muted-foreground">Only the manager can change restaurant setup.</p>;
  return (
    <div className="space-y-6">
      <DemoNotice />
      <SettingsForm />
      <Closures />
      <TablesEditor tables={tables} />
      <StaffAccess />
      <AuditLog />
    </div>
  );
}

type S = Record<string, string | number | boolean | null>;

function SettingsForm() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("restaurant_settings").select("*").eq("id", 1).single()).data });
  const [s, setS] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !s) setS(data as unknown as S); }, [data, s]);
  if (!s) return null;
  const txt = (k: string, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`s-${k}`}>{label}</Label>
      <Input id={`s-${k}`} type={type} value={(s[k] ?? "") as string} onChange={(e) => setS({ ...s, [k]: type === "number" ? Number(e.target.value) : e.target.value })} className="h-11 text-base" />
    </div>
  );
  async function save() {
    if (!s) return;
    setBusy(true);
    const { id: _id, updated_at: _u, ...rest } = s;
    const clean = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]));
    const { error } = await supabase.from("restaurant_settings").update({ ...clean, updated_at: new Date().toISOString() } as never).eq("id", 1);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] }); }
  }
  return (
    <section className="surface space-y-4 p-5">
      <h2 className="text-lg font-bold">Restaurant & booking rules</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {txt("name", "Restaurant name")}
        {txt("location_name", "Location name")}
        {txt("logo_url", "Logo image URL (blank = bundled logo)")}
        {txt("address", "Address")}
        {txt("phone", "Phone")}
        {txt("email", "Email")}
        {txt("map_url", "Directions link (map URL)")}
        {txt("default_country_code", "Default phone country code")}
        {txt("open_time", "Opens at", "time")}
        {txt("close_time", "Closes at (earlier = after midnight)", "time")}
        {txt("slot_interval_min", "Booking interval (min)", "number")}
        {txt("dining_min", "Dining duration (min)", "number")}
        {txt("buffer_min", "Cleanup buffer (min)", "number")}
        {txt("hold_min", "Checkout hold (min)", "number")}
        {txt("advance_days", "Advance booking window (days)", "number")}
        {txt("grace_min", "Arrival grace period (min)", "number")}
      </div>
      <div className="space-y-1"><Label htmlFor="s-ap">Arrival policy</Label><Textarea id="s-ap" value={(s.arrival_policy ?? "") as string} onChange={(e) => setS({ ...s, arrival_policy: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor="s-cp">Cancellation policy</Label><Textarea id="s-cp" value={(s.cancellation_policy ?? "") as string} onChange={(e) => setS({ ...s, cancellation_policy: e.target.value })} /></div>
      <label className="flex items-center gap-3"><Switch checked={!!s.allow_table_choice} onCheckedChange={(v) => setS({ ...s, allow_table_choice: v })} /> Let guests choose an exact table</label>
      <label className="flex items-center gap-3"><Switch checked={!!s.is_demo} onCheckedChange={(v) => setS({ ...s, is_demo: v })} /> Show “demonstration settings” labels</label>
      <p className="text-xs text-muted-foreground">Notifications: no email or SMS provider is connected yet. Guests receive a private manage link on screen.</p>
      <Button variant="hero" onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save settings</Button>
    </section>
  );
}

function Closures() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["closures"], queryFn: async () => (await supabase.from("closures").select("*").order("closed_on")).data ?? [] });
  const [d, setD] = useState("");
  const [reason, setReason] = useState("");
  return (
    <section className="surface space-y-3 p-5">
      <h2 className="text-lg font-bold">Special closures</h2>
      <div className="flex flex-wrap gap-2">
        <Input type="date" value={d} onChange={(e) => setD(e.target.value)} className="h-11 w-44 text-base" aria-label="Closure date" />
        <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 flex-1 text-base" />
        <Button variant="soft" disabled={!d} onClick={async () => {
          const { error } = await supabase.from("closures").insert({ closed_on: d, reason: reason || null });
          if (error) toast.error(error.message); else { setD(""); setReason(""); qc.invalidateQueries({ queryKey: ["closures"] }); }
        }}>Add</Button>
      </div>
      <ul className="divide-y divide-border text-sm">
        {data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2">
            <span>{c.closed_on} {c.reason && <span className="text-muted-foreground">— {c.reason}</span>}</span>
            <Button variant="ghost" size="icon" aria-label="Remove closure" onClick={async () => { await supabase.from("closures").delete().eq("id", c.id); qc.invalidateQueries({ queryKey: ["closures"] }); }}><Trash2 /></Button>
          </li>
        ))}
        {data?.length === 0 && <li className="py-2 text-muted-foreground">No closures scheduled.</li>}
      </ul>
    </section>
  );
}

function TablesEditor({ tables }: { tables: Tbl[] }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Tbl[]>(tables);
  useEffect(() => setRows(tables), [tables]);
  const upd = (i: number, k: keyof Tbl, v: string | number | boolean) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  async function save(t: Tbl) {
    const { error } = await supabase.from("dining_tables").update({ label: t.label, capacity: t.capacity, min_party: t.min_party, area: t.area, pos_x: t.pos_x, pos_y: t.pos_y, shape: t.shape, active: t.active }).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success(`Table ${t.label} saved`); qc.invalidateQueries({ queryKey: ["staff"] }); }
  }
  async function add() {
    const { error } = await supabase.from("dining_tables").insert({ label: `T${tables.length + 1}`, capacity: 4, min_party: 1, pos_x: 40, pos_y: 40, sort: tables.length + 1 });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["staff"] });
  }
  return (
    <section className="surface space-y-3 p-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Tables & floor plan</h2><Button variant="soft" size="sm" onClick={add}>Add table</Button></div>
      <p className="text-xs text-muted-foreground">Position X/Y are percentages across the floor plan. Shape: round, square or rect. Table combinations are configured separately.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th>Label</th><th>Seats</th><th>Min</th><th>Area</th><th>X</th><th>Y</th><th>Shape</th><th>Active</th><th /></tr></thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id}>
                <td><Input value={t.label} onChange={(e) => upd(i, "label", e.target.value)} className="h-9 w-16" /></td>
                <td><Input type="number" value={t.capacity} onChange={(e) => upd(i, "capacity", Number(e.target.value))} className="h-9 w-16" /></td>
                <td><Input type="number" value={t.min_party} onChange={(e) => upd(i, "min_party", Number(e.target.value))} className="h-9 w-16" /></td>
                <td><Input value={t.area} onChange={(e) => upd(i, "area", e.target.value)} className="h-9 w-28" /></td>
                <td><Input type="number" value={t.pos_x} onChange={(e) => upd(i, "pos_x", Number(e.target.value))} className="h-9 w-16" /></td>
                <td><Input type="number" value={t.pos_y} onChange={(e) => upd(i, "pos_y", Number(e.target.value))} className="h-9 w-16" /></td>
                <td><Input value={t.shape} onChange={(e) => upd(i, "shape", e.target.value)} className="h-9 w-20" /></td>
                <td><Switch checked={t.active} onCheckedChange={(v) => upd(i, "active", v)} /></td>
                <td><Button size="sm" variant="outline" onClick={() => save(t)}>Save</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StaffAccess() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["roles"], queryFn: async () => (await supabase.from("user_roles").select("*").order("created_at")).data ?? [] });
  const [email, setEmail] = useState("");
  return (
    <section className="surface space-y-3 p-5">
      <h2 className="text-lg font-bold">Staff access</h2>
      <p className="text-sm text-muted-foreground">The person must create an account on the staff sign-in page first.</p>
      <div className="flex gap-2">
        <Input type="email" placeholder="staff@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" />
        <Button variant="soft" onClick={async () => {
          const r = await rpc<{ ok: boolean; error?: string }>("admin_grant_staff", { _email: email, _role: "staff" });
          if (r.ok) { toast.success("Access granted"); setEmail(""); qc.invalidateQueries({ queryKey: ["roles"] }); } else toast.error(errText(r.error));
        }}>Grant</Button>
      </div>
      <ul className="divide-y divide-border text-sm">
        {data?.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2">
            <span>{r.email ?? r.user_id} <span className="text-muted-foreground">· {r.role === "admin" ? "Manager" : "Staff"}</span></span>
            {r.role !== "admin" && <Button variant="ghost" size="sm" onClick={async () => { await rpc("admin_revoke_staff", { _role_id: r.id }); qc.invalidateQueries({ queryKey: ["roles"] }); }}>Remove</Button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AuditLog() {
  const { data } = useQuery({ queryKey: ["audit"], queryFn: async () => (await supabase.from("audit_events").select("*").order("at", { ascending: false }).limit(50)).data ?? [] });
  return (
    <section className="surface space-y-3 p-5">
      <h2 className="text-lg font-bold">Recent changes</h2>
      <ul className="divide-y divide-border text-sm">
        {data?.map((e) => (
          <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span className="font-medium">{e.action.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground">{e.actor_email ?? "Guest (online)"} · {new Date(e.at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</span>
          </li>
        ))}
        {data?.length === 0 && <li className="py-2 text-muted-foreground">No changes yet.</li>}
      </ul>
    </section>
  );
}
