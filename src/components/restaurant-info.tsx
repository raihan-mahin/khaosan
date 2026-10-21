import { Clock, MapPin, Phone } from "lucide-react";
import { useSettings } from "@/components/brand";

export function hoursText(open?: string, close?: string) {
  if (!open || !close) return "";
  const f = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(Date.UTC(2000, 0, 1, h, m));
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(d);
  };
  return `${f(open)} – ${f(close)}`;
}

export function RestaurantInfo() {
  const { data: s } = useSettings();
  if (!s) return null;
  return (
    <section className="surface space-y-3 p-5" aria-labelledby="info-h">
      <h2 id="info-h" className="text-lg font-bold">{s.location_name}</h2>
      <p className="flex items-start gap-2 text-sm">
        <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Daily {hoursText(s.open_time, s.close_time)}{s.is_demo && <span className="text-muted-foreground"> (demonstration hours)</span>}</span>
      </p>
      {s.address ? (
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
          {s.map_url ? <a className="underline" href={s.map_url} target="_blank" rel="noreferrer">{s.address}</a> : s.address}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Address and directions will appear here once the restaurant confirms them.</p>
      )}
      {s.phone && (
        <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm font-medium text-primary">
          <Phone className="h-4 w-4" aria-hidden /> {s.phone}
        </a>
      )}
    </section>
  );
}
