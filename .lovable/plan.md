## Why your proposal needs adjusting

Steps 1 and 3 of your proposal are already implemented:
- `GuardianHome` (routes/guardian.tsx) already queries `profiles` filtered by `guardian_id` + `role='recipient'`, shows a blank screen while loading, and only renders `CreateRecipientForm` when the query returns zero rows.
- `guardian.dashboard.tsx` already handles duplicates — and it does so better than your proposal: it picks the recipient that has tasks, falling back to the first row. Switching to "earliest `created_at`" would regress this if a user ever added tasks to a duplicate.

So the lookup isn't failing silently. The real bug is that **duplicates are being created** in the first place. Two root causes:

1. **Double submission on mobile.** `CreateRecipientForm` only guards with `disabled={loading}`. A fast double-tap fires two submits before React re-renders.
2. **`createRecipient` server fn is not idempotent.** It always inserts a new profile with a fresh `pairing_code`, even if the guardian already has a recipient.

## Plan

### 1. Harden `CreateRecipientForm` against double submission
File: `src/routes/guardian.tsx`
- Add a `useRef(false)` "submitting" flag, set synchronously at the top of `submit()`, checked before doing anything. This blocks even a synchronous double-fire that beats the `setLoading(true)` re-render.
- Keep the existing `disabled={loading}` on the button.
- On successful `create(...)`, navigate immediately (already happens via `onCreated`); ensure the ref stays `true` until navigation so a third tap mid-flight is also ignored.

### 2. Make `createRecipient` idempotent (the real fix)
File: `src/lib/pairing.functions.ts`
- At the top of the handler, after auth, query `profiles` for an existing row with `guardian_id = userId` AND `role = 'recipient'`.
- If one already exists, return it (its existing `pairing_code` and `id`) instead of inserting a new row. No new pairing code is ever generated for a guardian who already has a recipient.
- Only when none exists, run the current insert logic.

This guarantees: even if a race or a future bug calls `createRecipient` twice, the second call returns the existing recipient instead of creating a duplicate. This is the durable fix.

### 3. Keep dashboard selection logic as-is
File: `src/routes/guardian.dashboard.tsx`
- No change. Current "prefer recipient with tasks, else first" is correct.

### 4. One-time cleanup migration
Per your answer: always keep the oldest recipient per guardian, delete the rest.
- For each `guardian_id` that has more than one `role='recipient'` profile, keep the row with the smallest `created_at` and delete the others.
- Cascade: also delete from `tasks`, `activity_logs`, `rest_mode` where `recipient_id` is in the to-be-deleted set, to avoid orphan rows.
- Will run via `supabase--migration` (DELETE requires migration, not the insert tool).

### Out of scope (intentional)
- Not changing `GuardianHome` lookup — already correct.
- Not changing dashboard selection — already correct and safer than the proposed alternative.
- Not touching recipient-side `/pair` flow or pairing code format.

## Technical notes

- The idempotency check in step 2 uses the same `supabaseAdmin` client already used by `createRecipient` (since the server fn runs with service role per the existing pattern in `pairing.functions.ts`). RLS isn't a concern.
- The `useRef` guard in step 1 is necessary in addition to `loading` state because React state updates are batched/async; a touch event firing twice within ~16ms can both pass `if (loading) return` before either re-render lands.
- Cleanup migration is destructive — once approved and run, deleted duplicate recipients (and any tasks on them) are gone. Per your answer this is acceptable.
