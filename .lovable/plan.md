## Add History & Trends section to guardian dashboard

Read-only analytics over existing `activity_logs`. No DB/RLS/server changes.

### Files

1. **`src/lib/i18n.ts`** — Append 7 new keys (en/ta): `history`, `last7Days`, `last30Days`, `consistency`, `painVsFatigue`, `perTaskAdherence`, `noActivityPeriod`.

2. **`src/routes/guardian.dashboard.tsx`** — Add a new `<HistorySection recipientId={recipient.id} tasks={tasks} lang={lang} />` rendered directly under the "Today's progress" card, before the SESSIONS map. All other code untouched.

### `HistorySection` component (inside same file)

State: `range: 7 | 30` (default 7), `logs: Log[]`, `loading: boolean`, `open: boolean` (collapsible, default open).

Fetch: on mount and whenever `range` or `recipientId` changes, query
```
supabase.from("activity_logs")
  .select("*")
  .eq("recipient_id", recipientId)
  .gte("created_at", since.toISOString())
  .order("created_at", { ascending: true })
```
where `since` = local midnight `range` days ago.

### Three sub-panels

**A. Date range toggle** — Two pill buttons ("Last 7 days" / "Last 30 days") using existing `bg-muted` / `bg-primary text-primary-foreground` token pattern.

**B. Consistency bar chart** (recharts `BarChart`)
- Bucket logs by local YYYY-MM-DD; one bar per day in range (fill zero-days with 0).
- Bar value = completed + skipped count that day.
- Per-bar fill: `hsl(var(--accent))` if any skip that day, else `hsl(var(--primary))` (use Cell).
- X-axis: short date label (`MM/DD` or `DD/MM` — use `toLocaleDateString(lang === "ta" ? "ta-IN" : "en-GB", {day:"2-digit", month:"2-digit"})`).
- Wrap in `ResponsiveContainer` at fixed height (e.g. 160px on 7d, 200px on 30d).

**C. Pain vs Fatigue panel**
- Summary row: two large counts — `pain: N` and `fatigue: M` (over range), using `t("pain")` and `t("fatigue")`.
- Grouped bar chart below: per day, two bars (pain count, fatigue count) — uses `--destructive` for pain, `--accent` for fatigue. Same x-axis as consistency.
- Skip days with zero of both? No — keep the same day axis as consistency for visual alignment.

**D. Per-task adherence list**
- For each task in `tasks` where `is_active`, compute `completed = logs.filter(l => l.task_id === task.id && l.status==="completed").length` and `skipped = ... === "skipped"`.
- Render a `<ul>` of rows: task name + small badges `✓ X` (primary) and `✗ Y` (accent), matching existing list row styling (`bg-background rounded-lg p-2`).

### Loading & empty states

- While `loading`: render a single muted line "…" placeholder block at chart height (no skeleton dep needed).
- If `logs.length === 0` after load: render only the range toggle + a centered muted `<p>` with `t("noActivityPeriod")`. Hide the three panels.

### Styling

Uses existing tokens only (`bg-card`, `border-border`, `rounded-2xl`, `bg-muted`, `text-primary`, `text-accent`, `text-destructive`). Section wrapper mirrors the existing "Today's progress" card. Collapsible header: tap to toggle, chevron rotation; default open.

### Out of scope (explicit)

- No schema/migration/RLS/server-function changes.
- No changes to recipient screen, pairing, SOS/rest, today's progress, or session blocks.
- No new npm packages (recharts already installed).
