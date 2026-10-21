import { CalendarDays, Clock, MapPin, Users, Armchair } from "lucide-react";
import { useSettings } from "@/components/brand";
import { fmtDateLong, fmtTime, type Booking } from "@/lib/booking";

export function VisitSummary({ b, showPolicies = true }: { b: Booking; showPolicies?: boolean }) {
  const { data: s } = useSettings();
  const row = (Icon: typeof Clock, text: React.ReactNode) => (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{text}</span>
    </li>
  );
  return (
    <div className="space-y-4">
      <ul className="space-y-2.5 text-[15px]">
        {row(MapPin, <><strong>{s?.name ?? "Khaosan"}</strong> · {s?.location_name}</>)}
        {row(CalendarDays, fmtDateLong(b.starts_at))}
        {row(Clock, <>Arrive {fmtTime(b.starts_at)} · table until about {fmtTime(b.ends_at)}</>)}
        {row(Users, `${b.party_size} ${b.party_size === 1 ? "guest" : "guests"}`)}
        {b.tables.length > 0 && row(Armchair, `Table ${b.tables.join(" + ")}`)}
      </ul>
      {showPolicies && s && (
        <div className="space-y-1.5 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
          <p><strong>Arrival:</strong> {s.arrival_policy}</p>
          <p><strong>Cancellation:</strong> {s.cancellation_policy}</p>
        </div>
      )}
    </div>
  );
}
