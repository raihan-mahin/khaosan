import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, rpc, errText, type RpcResult } from "@/lib/booking";
import { useLive } from "@/hooks/use-live";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type Res = Database["public"]["Tables"]["reservations"]["Row"];
export type Tbl = Database["public"]["Tables"]["dining_tables"]["Row"];
export type Alloc = { reservation_id: string; table_id: string; block: string; active: boolean };
export type Wait = Database["public"]["Tables"]["waitlist"]["Row"];

// Asia/Dhaka has a fixed +06:00 offset (no DST). A service day runs into the early hours of the next.
export const dayRange = (date: string) => ({ from: `${date}T00:00:00+06:00`, to: `${addDays(date, 1)}T06:00:00+06:00` });

export function parseRange(r: string): [number, number] {
  const m = r.match(/[[(]"?([^",]+)"?,"?([^")]+)"?[)\]]/);
  if (!m) return [0, 0];
  return [new Date(m[1].replace(" ", "T")).getTime(), new Date(m[2].replace(" ", "T")).getTime()];
}

export function useRole() {
  return useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user?.id ?? "");
      const roles = (data ?? []).map((r) => r.role);
      return { email: u.user?.email, isAdmin: roles.includes("admin"), isStaff: roles.length > 0 };
    },
  });
}

export function useStaffData(date: string, enabled: boolean) {
  const qc = useQueryClient();
  const [updatedAt, setUpdatedAt] = useState<number>();
  const q = useQuery({
    queryKey: ["staff", date],
    enabled,
    queryFn: async () => {
      const { from, to } = dayRange(date);
      const [t, r, w] = await Promise.all([
        supabase.from("dining_tables").select("*").order("sort"),
        supabase.from("reservations").select("*").gte("starts_at", from).lt("starts_at", to).order("starts_at"),
        supabase.from("waitlist").select("*").gte("desired_date", date).order("created_at"),
      ]);
      // Also include currently-seated parties that started on a previous day (crossing midnight).
      const seated = await supabase.from("reservations").select("*").eq("status", "seated");
      if (t.error || r.error || w.error) throw new Error(t.error?.message || r.error?.message || w.error?.message);
      const resMap = new Map<string, Res>();
      [...(r.data ?? []), ...(seated.data ?? [])].forEach((x) => resMap.set(x.id, x));
      const ids = [...resMap.keys()];
      const a = ids.length ? await supabase.from("reservation_tables").select("*").in("reservation_id", ids) : { data: [] as Alloc[] };
      setUpdatedAt(Date.now());
      return {
        tables: t.data ?? [],
        reservations: [...resMap.values()].sort((x, y) => x.starts_at.localeCompare(y.starts_at)),
        allocs: (a.data ?? []) as Alloc[],
        waitlist: w.data ?? [],
      };
    },
  });
  const live = useLive(
    () => qc.invalidateQueries({ queryKey: ["staff"] }),
    ["reservations", "dining_tables", "waitlist", "availability_pulse"],
    20000,
  );
  return { ...q, live, updatedAt };
}

export async function staffAction(fn: string, args: Record<string, unknown>, ok?: string) {
  try {
    const r = await rpc<RpcResult | { ok: boolean; error?: string }>(fn, args);
    if (r.ok) {
      if (ok) toast.success(ok);
      return true;
    }
    toast.error(errText((r as { error?: string }).error));
  } catch (e) {
    toast.error((e as Error).message);
  }
  return false;
}

export const RES_STATUS_LABEL: Record<string, string> = {
  held: "Held (checkout)",
  confirmed: "Confirmed",
  arrived: "Arrived",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  expired: "Expired hold",
};
