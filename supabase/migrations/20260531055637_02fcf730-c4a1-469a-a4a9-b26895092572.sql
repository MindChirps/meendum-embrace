
WITH ranked AS (
  SELECT id, guardian_id,
         ROW_NUMBER() OVER (PARTITION BY guardian_id ORDER BY created_at ASC) AS rn
  FROM public.profiles
  WHERE role = 'recipient' AND guardian_id IS NOT NULL
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.activity_logs WHERE recipient_id IN (SELECT id FROM dupes);

WITH ranked AS (
  SELECT id, guardian_id,
         ROW_NUMBER() OVER (PARTITION BY guardian_id ORDER BY created_at ASC) AS rn
  FROM public.profiles
  WHERE role = 'recipient' AND guardian_id IS NOT NULL
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.tasks WHERE recipient_id IN (SELECT id FROM dupes);

WITH ranked AS (
  SELECT id, guardian_id,
         ROW_NUMBER() OVER (PARTITION BY guardian_id ORDER BY created_at ASC) AS rn
  FROM public.profiles
  WHERE role = 'recipient' AND guardian_id IS NOT NULL
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.rest_mode WHERE recipient_id IN (SELECT id FROM dupes);

WITH ranked AS (
  SELECT id, guardian_id,
         ROW_NUMBER() OVER (PARTITION BY guardian_id ORDER BY created_at ASC) AS rn
  FROM public.profiles
  WHERE role = 'recipient' AND guardian_id IS NOT NULL
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.profiles WHERE id IN (SELECT id FROM dupes);
