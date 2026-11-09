# P0-13 — Confirm CRM lead deletion before claiming success

**Status:** isolated draft fix. No real lead was deleted and no production code or database policy was changed.

## Why

The original `deleteLead` server action did:

```ts
await supabase.from("leads").delete().eq("id", id).eq("user_id", user.id)
```

Then it returned `{ success: true }` whenever Supabase returned no error. With RLS ON but no DELETE policy, the database may affect **zero rows without returning an error**. The UI could misleadingly toast "Lead deleted" even though it was still present. An accidental single click also immediately called the destructive action.

## Draft fix

- Validate the lead UUID before any database operation.
- Continue authenticating with `supabase.auth.getUser()` and filtering by `user_id` for defense in depth under the currently deployed ownership pattern.
- Add `.select("id")` to the DELETE so the server must observe **exactly one** row with the requested ID before it returns success.
- An empty result, mismatch, multiple result rows, network error or RLS denial returns a generic non-confirmation message. It does not reveal whether a different business owns the record.
- Require an explicit browser-native confirmation dialog, disable repeated delete clicks while one is in progress, and improve the button's accessible name.
- Add pure synthetic tests for zero-row/no-error results and UUID validation, plus full TypeScript/build CI.

## What this does NOT fix

- The current live `public.leads` table has no DELETE policy, and this draft does not add one. An authorized owner delete may still fail after this patch until the staged RLS migration is reviewed and applied.
- The old `user_id` filter blocks deletion of legitimate `client_slug`-owned public leads with NULL `user_id`. That needs a **separate, explicitly reviewed ownership transition**, not a shortcut that bypasses RLS.
- No database-level soft-delete/undo/audit log is implemented. Consider soft delete instead of irreversible deletion before launch, subject to retention policy.
- This PR and CRM table controls PR #44 both edit `src/components/leads-table.tsx`; merge/rebase them carefully when approved. Neither PR is live.
- No actual authenticated browser or production API test was run.

## Staging checks before a merge

1. Activate reviewed tenant-safe RLS policy in nonproduction and create two synthetic users/businesses.
2. Delete an own lead after confirming; verify exactly one ID returned and displayed.
3. Attempt to delete an unknown ID and another business's lead; verify no success toast, no data loss and no tenant existence leak.
4. Disable DELETE RLS temporarily **in staging only**; verify zero-row deletion no longer reports success.
5. Test canceling the confirmation dialog, rapid double clicking, mobile width and keyboard access.

References:
- Supabase RLS DELETE/SELECT: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JavaScript delete with returned rows: https://supabase.com/docs/reference/javascript/delete
