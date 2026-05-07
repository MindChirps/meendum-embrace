
# Meendum — Stroke Recovery PWA

A calm, two-sided app: the **Recipient** (stroke survivor) sees one giant task at a time; the **Guardian** (caregiver) configures sessions and can lock the Recipient's screen into Rest Mode in real time.

## Core decisions (from your answers)
- **Pairing**: Guardian signs up (email + password), creates the Recipient profile, and gets a pairing code. The Recipient device opens a link / enters that code once — no password, device stays signed in.
- **PWA**: Installable only — `manifest.json` + icons so it can be added to home screen. No service worker (avoids preview breakage).
- **Languages**: English and Tamil, both fully translated, independent toggles per role.

## Roles & onboarding
- **Guardian sign-up**: email + password, sets their name, the Recipient's name, and the Recipient's affected side (left/right).
- **Pairing code**: 6-character code shown to Guardian. Recipient device opens `/pair`, enters code → device is bound to that Recipient profile and stored locally so the Recipient never sees a login screen again.
- **Language**: each role's preferred language stored on their profile and editable; toggle in a small corner button.

## Recipient experience — "The One Thing"
Full-screen, single-task interface. Zero navigation. Massive tap targets.

1. **Auto session detection** by system clock:
   - Morning 6:00–12:00, Afternoon 12:00–17:00, Evening 17:00–22:00
   - Outside those windows: a calm "Rest time" screen — no overdue tasks ever shown.
2. **Visual anchor**: SVG of a forward-facing person above each task. The affected side is highlighted in `#EA580C`; the rest is grey.
3. **Posture badge** (always visible top): "நிமிர்ந்து உட்காரவும் / Sit straight".
4. **Invisible timer flow**:
   - Tap **Start** (`தொடங்கு`) → records start time, button morphs into **Done** (`முடிந்தது`), a slow pulsing circle paces breathing.
   - Tap **Done** → logs duration, plays a synthesized chime (Web Audio API), advances to next task.
5. **Safety valve — Skip** (`தவிர்க்க`): reveals two huge emoji buttons — **Pain 🤕** and **Fatigue 🥱**. Logs the reason and moves on.
6. **End of session**: synthesized applause, motivational quote, **Weekly Consistency** strip of 7 circles. Critical: days where tasks were *skipped due to pain/fatigue* still color green — rest counts as rehab.
7. **Rest Mode**: when the Guardian flips the SOS toggle, the Recipient screen instantly locks to a calm passive screen ("உங்கள் பராமரிப்பாளர் ஓய்வில் / Your caregiver is resting") until released.

## Guardian experience — Configuration & Relief
Standard responsive dashboard.

1. **Task manager** per session block (Morning / Afternoon / Evening):
   - Add / edit / delete / toggle active.
   - Name max 20 characters, target reps numeric, max **4 active tasks per session**.
2. **Today's progress**: live checklist showing completed / skipped tasks with the skip reason visible.
3. **SOS / Rest toggle**: large persistent button "நான் ஓய்வு எடுக்கிறேன் / I am resting". Toggling broadcasts a realtime event that locks the Recipient screen instantly.
4. **History**: simple weekly view of completion vs skip reasons.
5. **Pairing**: shows the pairing code; can regenerate.

## Data model (Supabase)
- `profiles` — `id`, `role` (recipient|guardian), `custom_name`, `preferred_language` (en|ta), `affected_side` (left|right), `guardian_id` (for recipient rows), `pairing_code`.
- `tasks` — `id`, `guardian_id`, `recipient_id`, `name` (≤20), `session_type` (morning|afternoon|evening), `target_reps`, `is_active`, `sort_order`.
- `activity_logs` — `id`, `task_id`, `recipient_id`, `status` (completed|skipped), `skip_reason` (pain|fatigue|null), `duration_seconds`, `created_at`.
- `rest_mode` — `recipient_id` (PK), `is_resting` (bool), `updated_at` — broadcast via Supabase Realtime.
- RLS: Guardian can read/write their own recipient's rows; Recipient device reads its bound recipient_id only.

## Visual & accessibility
- Background `#FFFBEB`, success `#059669`, accent `#EA580C`, text near-black for AAA contrast.
- Tap targets ≥ 50% of viewport width on Recipient screens.
- All Recipient text in large, simple sentences; icons + words together.
- Independent EN/TA toggle per role; no mid-sentence mixing.

## Technical notes
- Tech: TanStack Start + React + Tailwind + Lovable Cloud (Supabase).
- PWA: `public/manifest.json` + icon set + `<link rel="manifest">`. **No service worker.**
- Audio: synthesized via `AudioContext` (chime = two short sine tones; applause = filtered noise burst). No mp3 imports.
- Realtime: Supabase channel on `rest_mode` row keyed by `recipient_id`; Recipient subscribes on mount.
- i18n: simple `{ en, ta }` dictionary + `useLang(role)` hook reading from profile.
- Routes: `/` (role chooser), `/guardian/signup`, `/guardian` (dashboard), `/pair`, `/recipient` (the One Thing screen).

## Build order
1. Schema + RLS + types, auth, profiles, pairing code flow.
2. Recipient One Thing screen (timer, skip, session detection, SVG body, audio).
3. Guardian dashboard (task CRUD with limits, today's progress).
4. Realtime Rest Mode (toggle + Recipient lock screen).
5. Weekly consistency view + end-of-session celebration.
6. PWA manifest + icons + install prompt polish.
