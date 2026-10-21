<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All booking/availability rules live in Postgres security-definer RPCs (create_hold, confirm_booking, reschedule_booking, staff_*); the browser calls them via supabase.rpc. Why: one transactional place for conflict checks, locks and the gist exclusion constraint on reservation_tables.
- Guest data (reservations, waitlist) is staff-only by RLS; public screens use get_slots/get_public_tables which return anonymous fields only. Why: public must never see guest details.
- Public live updates subscribe to `availability_pulse` (bumped by triggers) plus periodic reconciliation in useLive. Why: anon cannot subscribe to private reservation rows.
- Staff roles live in user_roles; the first auth user becomes admin via trigger. Why: bootstraps a manager without hardcoded credentials.
- tsconfig strict extras (exactOptionalPropertyTypes etc.) are off to keep UI code readable.
