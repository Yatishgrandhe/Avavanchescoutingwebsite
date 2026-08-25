-- Private metadata for lossless, compressed audit exports. This schema is not
-- exposed through PostgREST and the archive objects themselves remain private.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.audit_archives (
  object_path text PRIMARY KEY,
  source_table text NOT NULL,
  row_count bigint NOT NULL CHECK (row_count >= 0),
  compressed_bytes bigint NOT NULL CHECK (compressed_bytes > 0),
  sha256 text NOT NULL,
  source_min_changed_at timestamptz,
  source_max_changed_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON TABLE private.audit_archives FROM PUBLIC;
