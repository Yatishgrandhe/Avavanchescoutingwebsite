-- Additive migration only: no deletes, no drops.
ALTER TABLE public.scouting_data
  ADD COLUMN IF NOT EXISTS scouted_score_rounded integer,
  ADD COLUMN IF NOT EXISTS statbotics_expected_score_rounded integer,
  ADD COLUMN IF NOT EXISTS score_delta integer,
  ADD COLUMN IF NOT EXISTS alliance_scouted_count integer,
  ADD COLUMN IF NOT EXISTS alliance_finalized boolean;

-- Backfill rounded scouted score from existing final_score.
UPDATE public.scouting_data
SET scouted_score_rounded = ROUND(final_score)::integer
WHERE final_score IS NOT NULL
  AND scouted_score_rounded IS NULL;

-- Alliance count/finalized backfill from existing records (same match/alliance).
WITH alliance_counts AS (
  SELECT
    organization_id,
    match_id,
    alliance_color,
    COUNT(DISTINCT alliance_position) FILTER (WHERE alliance_position IN (1,2,3))::integer AS alliance_scouted_count
  FROM public.scouting_data
  GROUP BY organization_id, match_id, alliance_color
)
UPDATE public.scouting_data sd
SET
  alliance_scouted_count = ac.alliance_scouted_count,
  alliance_finalized = (ac.alliance_scouted_count >= 3)
FROM alliance_counts ac
WHERE sd.organization_id = ac.organization_id
  AND sd.match_id = ac.match_id
  AND COALESCE(sd.alliance_color, '') = COALESCE(ac.alliance_color, '');
