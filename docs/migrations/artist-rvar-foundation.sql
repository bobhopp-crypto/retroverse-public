-- Canonical Artist identity foundation. Assignments never derive from artists.id.
BEGIN;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS rvar varchar(10);
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS n FROM artists WHERE rvar IS NULL
)
UPDATE artists SET rvar = 'RVAR' || lpad(numbered.n::text, 6, '0')
FROM numbered WHERE artists.id = numbered.id;
ALTER TABLE artists ALTER COLUMN rvar SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS artists_rvar_unique_idx ON artists (rvar);
CREATE OR REPLACE FUNCTION prevent_artist_rvar_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.rvar IS DISTINCT FROM NEW.rvar THEN RAISE EXCEPTION 'artists.rvar is immutable once assigned'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS artists_rvar_immutable ON artists;
CREATE TRIGGER artists_rvar_immutable BEFORE UPDATE OF rvar ON artists
FOR EACH ROW EXECUTE FUNCTION prevent_artist_rvar_change();
COMMIT;
