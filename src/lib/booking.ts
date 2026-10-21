import { supabase } from "@/integrations/supabase/client";

export const TZ = "Asia/Dhaka";

export type SlotStatus =
  | "available"
  | "full"
  | "held"
  | "past"
  | "closed"
  | "beyond_window"
  | "too_large";

export type Slot = { slot_start: string; status: SlotStatus; free_count: number };

export type Booking = {
  ok: true;
  id: string;
  ref: string;
  token: string;
  status: string;
  guest_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  party_size: number;
  starts_at: string;
  ends_at: string;
  hold_expires_at: string | null;
  server_now: string;
  tables: string[];
};
export type RpcFail = { ok: false; error: string; alternatives?: string[] };
export type RpcResult = Booking | RpcFail;

export type PublicTable = {
  id: string;
  label: string;
  capacity: number;
  min_party: number;
  area: string;
  pos_x: number;
  pos_y: number;
  shape: string;
  status: "empty" | "occupied" | "cleaning" | "unavailable";
  status_changed_at: string;
  next_reserved_at: string | null;
  held: boolean;
  fits: boolean;
  free_for_visit: boolean;
};

/** Today's date (yyyy-mm-dd) in the restaurant's timezone, optionally offset by days. */
export function localDate(offsetDays = 0, tz = TZ): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function fmtTime(iso: string, tz = TZ) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
export function fmtDateLong(dateOrIso: string, tz = TZ) {
  const d = dateOrIso.length === 10 ? new Date(dateOrIso + "T12:00:00Z") : new Date(dateOrIso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: dateOrIso.length === 10 ? "UTC" : tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
export function fmtDateShort(dateOrIso: string, tz = TZ) {
  const d = dateOrIso.length === 10 ? new Date(dateOrIso + "T12:00:00Z") : new Date(dateOrIso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: dateOrIso.length === 10 ? "UTC" : tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}
export function isoLocalDate(iso: string, tz = TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export const SLOT_LABEL: Record<SlotStatus, string> = {
  available: "Available",
  full: "Fully booked",
  held: "Held by another guest",
  past: "Time has passed",
  closed: "Closed",
  beyond_window: "Not yet open for booking",
  too_large: "Party too large to book online",
};

export const ERROR_TEXT: Record<string, string> = {
  unavailable: "That time was just taken for your party size.",
  hold_expired_unavailable: "Your hold expired and the table is no longer free.",
  past: "That time has already passed.",
  closed: "The restaurant is closed that day.",
  outside_hours: "That time is outside service hours.",
  beyond_window: "That date is beyond our booking window.",
  invalid_party: "Please choose a valid number of guests.",
  invalid_name: "Please enter your name.",
  invalid_phone: "Please enter a valid mobile number.",
  invalid_email: "Please enter a valid email or leave it blank.",
  not_found: "We couldn't find that reservation.",
  not_cancellable: "This reservation can no longer be cancelled online.",
  not_changeable: "This reservation can no longer be changed online.",
  table_not_empty: "That table isn't empty right now.",
  table_conflict: "That table has a conflicting booking.",
  party_seated: "A party is seated here. Mark them departed first.",
  invalid_transition: "That action isn't possible for this booking's current status.",
  no_account: "No account with that email. Ask them to sign up first.",
};
export const errText = (e?: string) => (e && ERROR_TEXT[e]) || "Something went wrong. Please try again.";

export async function rpc<T = RpcResult>(fn: string, args: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function fetchSlots(date: string, party: number): Promise<Slot[]> {
  const { data, error } = await supabase.rpc("get_slots", { _date: date, _party: party });
  if (error) throw new Error(error.message);
  return (data ?? []) as Slot[];
}

export async function fetchPublicTables(start: string | null, party: number): Promise<PublicTable[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_public_tables", { _start: start, _party: party });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicTable[];
}

export async function fetchSettings() {
  const { data, error } = await supabase.from("restaurant_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
}

export function newKey() {
  return crypto.randomUUID();
}

export function googleCalendarUrl(b: Booking, name: string, location?: string | null) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `Table at ${name} (${b.party_size} guests)`,
    dates: `${f(b.starts_at)}/${f(b.ends_at)}`,
    details: `Booking reference ${b.ref}`,
    location: location ?? name,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function icsDataUrl(b: Booking, name: string, location?: string | null) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Khaosan//Reservations//EN", "BEGIN:VEVENT",
    `UID:${b.id}@khaosan`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(b.starts_at)}`, `DTEND:${f(b.ends_at)}`,
    `SUMMARY:Table at ${name} (${b.party_size} guests)`, `DESCRIPTION:Booking reference ${b.ref}`,
    `LOCATION:${location ?? name}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}
