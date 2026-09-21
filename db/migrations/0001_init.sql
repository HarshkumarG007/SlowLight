-- Slow Light schema v1 (PostgreSQL 16+). Run as the migration owner role.
CREATE SCHEMA IF NOT EXISTS app;
SET search_path = app, public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sl_app') THEN CREATE ROLE sl_app NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sl_worker') THEN CREATE ROLE sl_worker NOLOGIN; END IF;
END $$;
-- In RDS: CREATE USER sl_api LOGIN; GRANT rds_iam TO sl_api; GRANT sl_app TO sl_api; (same for sl_worker)

CREATE FUNCTION app.actor_role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('app.role', true) $$;
CREATE FUNCTION app.actor_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

-- ===== Identity =====
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('author','recipient')),
  display_name_sealed text NOT NULL,
  email_sealed text,                       -- author only, for alerts
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);
CREATE UNIQUE INDEX users_one_recipient ON users (role) WHERE role = 'recipient';  -- A-01
CREATE UNIQUE INDEX users_one_author ON users (role) WHERE role = 'author';

CREATE TABLE enrollment_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,        -- SHA-256 of 256-bit token
  phrase_hash text NOT NULL,               -- argon2id of out-of-band phrase
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credentials (                 -- "Device": one row per passkey
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id bytea NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  aaguid uuid,
  backed_up boolean NOT NULL DEFAULT false,
  label text NOT NULL DEFAULT 'Passkey' CHECK (char_length(label) <= 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text
);
CREATE INDEX credentials_user_idx ON credentials (user_id) WHERE revoked_at IS NULL;

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id uuid REFERENCES credentials(id) ON DELETE SET NULL,
  token_hash bytea NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'standard' CHECK (kind IN ('standard','ephemeral')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  elevated_until timestamptz,
  knock_state text NOT NULL DEFAULT 'none' CHECK (knock_state IN ('none','pending','passed')),
  ua_summary text,                         -- e.g. "Safari 18 / iOS"
  ip_prefix text,                          -- /24 or /48 only, never a full address
  country char(2),
  revoked_at timestamptz,
  revoked_reason text
);
CREATE INDEX sessions_user_active_idx ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE knock_codes (
  session_id uuid PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  code_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5)
);
CREATE TABLE auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('login','enroll','add_credential','step_up')),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  challenge bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_challenges_expiry_idx ON auth_challenges (expires_at);
CREATE TABLE recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz
);
CREATE TABLE rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
CREATE TABLE idempotency_keys (
  key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_hash bytea NOT NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE key_registry (
  kid text PRIMARY KEY,
  purpose text NOT NULL DEFAULT 'sealed',
  wrapped_dek bytea NOT NULL,              -- KMS ciphertext blob
  kms_key_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz
);
CREATE UNIQUE INDEX key_registry_one_active ON key_registry (purpose) WHERE status = 'active';
CREATE TABLE site_texts (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9_.]+$'),
  value_sealed text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_state (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_world_at timestamptz
);

-- ===== Content =====
CREATE TABLE chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,60}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  subtitle text CHECK (char_length(subtitle) <= 200),
  intro_sealed text,
  ambience_key text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_sealed text NOT NULL,
  coords_sealed text,                      -- JSON {lat,lng} rounded per precision, sealed
  precision text NOT NULL DEFAULT 'city' CHECK (precision IN ('exact','area','city','country','hidden')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,40}$'),
  label text NOT NULL CHECK (char_length(label) <= 60)
);
CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES chapters(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  subtitle text CHECK (char_length(subtitle) <= 240),
  story_sealed text,
  kind text NOT NULL DEFAULT 'moment' CHECK (kind IN ('moment','milestone','trip','conversation','ritual','gift')),
  significance smallint NOT NULL DEFAULT 2 CHECK (significance BETWEEN 1 AND 5),
  emotion text CHECK (emotion IN ('tender','joyful','quiet','bittersweet','awe','playful')),
  occurred_on date NOT NULL,
  date_precision text NOT NULL DEFAULT 'day' CHECK (date_precision IN ('day','month','year','approx')),
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','yearly')),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  layout_hint jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  publish_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (status <> 'scheduled' OR publish_at IS NOT NULL)
);
CREATE INDEX memories_timeline_idx ON memories (occurred_on, id) WHERE deleted_at IS NULL;
CREATE INDEX memories_chapter_idx ON memories (chapter_id) WHERE deleted_at IS NULL;
CREATE INDEX memories_visible_idx ON memories (status, publish_at) WHERE deleted_at IS NULL;
CREATE TABLE memory_tags (
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (memory_id, tag_id)
);
CREATE INDEX memory_tags_tag_idx ON memory_tags (tag_id);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('image','video','audio')),
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','processing','ready','failed','quarantined')),
  mime_detected text,
  bytes bigint CHECK (bytes >= 0),
  checksum_sha256 bytea,
  width integer, height integer, duration_ms integer,
  lqip text CHECK (char_length(lqip) <= 2048),   -- tiny inline placeholder
  alt_sealed text,
  variants jsonb NOT NULL DEFAULT '[]',          -- [{label,key,mime,bytes,width,height}]
  vault_key text,                                -- original in the vault bucket (never served)
  captured_at timestamptz,                       -- from source metadata; admin-only, never sent to recipient
  error_code text,
  uploader_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX media_assets_status_idx ON media_assets (status) WHERE deleted_at IS NULL;
CREATE TABLE memory_assets (
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  caption_sealed text,
  is_cover boolean NOT NULL DEFAULT false,
  PRIMARY KEY (memory_id, asset_id),
  UNIQUE (memory_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX memory_assets_one_cover ON memory_assets (memory_id) WHERE is_cover;
CREATE INDEX memory_assets_asset_idx ON memory_assets (asset_id);

CREATE TABLE letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  unlock_mode text NOT NULL DEFAULT 'open' CHECK (unlock_mode IN ('open','timed','held')),
  unlock_at timestamptz,
  released_at timestamptz,
  seal_ceremony boolean NOT NULL DEFAULT false,
  opened_at timestamptz,                         -- visible to recipient only (policy-level)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sort_order integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (unlock_mode <> 'timed' OR unlock_at IS NOT NULL)
);
CREATE TABLE letter_bodies (                     -- split so RLS enforces the time lock on the text itself
  letter_id uuid PRIMARY KEY REFERENCES letters(id) ON DELETE CASCADE,
  body_sealed text NOT NULL
);
CREATE TABLE letter_assets (
  letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  PRIMARY KEY (letter_id, asset_id)
);
CREATE TABLE future_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('promise','place','plan','dream','blank')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  note_sealed text,
  target_date date,
  target_precision text NOT NULL DEFAULT 'year' CHECK (target_precision IN ('day','month','year','approx')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','unlit','arrived','archived')),
  arrived_memory_id uuid REFERENCES memories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_id uuid REFERENCES memories(id) ON DELETE CASCADE,
  letter_id uuid REFERENCES letters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(memory_id, letter_id) = 1)
);
CREATE UNIQUE INDEX favorites_memory_uq ON favorites (user_id, memory_id) WHERE memory_id IS NOT NULL;
CREATE UNIQUE INDEX favorites_letter_uq ON favorites (user_id, letter_id) WHERE letter_id IS NOT NULL;

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_role text,
  session_id uuid,
  category text NOT NULL CHECK (category IN ('auth','admin','security','system','content')),
  action text NOT NULL,
  subject_type text,
  subject_id text,
  outcome text NOT NULL CHECK (outcome IN ('success','denied','error')),
  request_id text,
  ip_prefix text,
  ua_family text,
  details jsonb NOT NULL DEFAULT '{}',           -- allow-listed keys only; never content
  prev_hash bytea,
  hash bytea
);
CREATE INDEX audit_events_at_idx ON audit_events (at DESC);
CREATE INDEX audit_events_action_idx ON audit_events (category, action, at DESC);

-- ===== Privileges =====
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO sl_app, sl_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO sl_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM sl_app;   -- append-only
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO sl_app;
GRANT SELECT, UPDATE ON media_assets TO sl_worker;
GRANT SELECT ON memory_assets, letter_assets TO sl_worker;
GRANT INSERT ON audit_events TO sl_worker;
GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq TO sl_worker;
GRANT EXECUTE ON FUNCTION app.actor_role(), app.actor_id() TO sl_app, sl_worker;

-- ===== Row-Level Security (FORCE: applies even to table owner) =====
-- API sets per transaction: SET LOCAL app.role = 'author'|'recipient'|'system'; SET LOCAL app.user_id = '<uuid>';
-- 'system' is set ONLY by the auth module and the scheduler.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','enrollment_invites','credentials','sessions','knock_codes','auth_challenges',
    'recovery_codes','rate_limits','idempotency_keys','key_registry','site_texts','user_state','chapters','locations',
    'tags','memories','memory_tags','media_assets','memory_assets','letters','letter_bodies','letter_assets',
    'future_entries','favorites','audit_events'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON app.%I FOR ALL TO sl_app USING (app.actor_role() = ''system'') WITH CHECK (app.actor_role() = ''system'')', t || '_system', t);
  END LOOP;
  -- Author: full access to content tables and identity management
  FOREACH t IN ARRAY ARRAY['users','enrollment_invites','credentials','sessions','recovery_codes','site_texts',
    'chapters','locations','tags','memories','memory_tags','media_assets','memory_assets','letters','letter_bodies',
    'letter_assets','future_entries'] LOOP
    EXECUTE format('CREATE POLICY %I ON app.%I FOR ALL TO sl_app USING (app.actor_role() = ''author'') WITH CHECK (app.actor_role() = ''author'')', t || '_author', t);
  END LOOP;
END $$;

CREATE FUNCTION app.memory_visible(m app.memories) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT m.deleted_at IS NULL AND m.status IN ('published','scheduled') AND COALESCE(m.publish_at, '-infinity') <= now() $$;
CREATE FUNCTION app.letter_visible(l app.letters) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT l.deleted_at IS NULL AND l.status = 'published' $$;
CREATE FUNCTION app.letter_unlocked(l app.letters) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT l.deleted_at IS NULL AND l.status = 'published' AND (
    l.unlock_mode = 'open'
    OR (l.unlock_mode = 'timed' AND l.unlock_at <= now())
    OR (l.unlock_mode = 'held' AND l.released_at IS NOT NULL AND l.released_at <= now())) $$;

-- Recipient (read paths)
CREATE POLICY chapters_recipient ON chapters FOR SELECT TO sl_app USING (app.actor_role() = 'recipient' AND status = 'published');
CREATE POLICY tags_recipient ON tags FOR SELECT TO sl_app USING (app.actor_role() = 'recipient');
CREATE POLICY memories_recipient ON memories FOR SELECT TO sl_app USING (app.actor_role() = 'recipient' AND app.memory_visible(memories));
CREATE POLICY memory_tags_recipient ON memory_tags FOR SELECT TO sl_app USING (app.actor_role() = 'recipient'
  AND EXISTS (SELECT 1 FROM memories m WHERE m.id = memory_id));
CREATE POLICY memory_assets_recipient ON memory_assets FOR SELECT TO sl_app USING (app.actor_role() = 'recipient'
  AND EXISTS (SELECT 1 FROM memories m WHERE m.id = memory_id));
CREATE POLICY locations_recipient ON locations FOR SELECT TO sl_app USING (app.actor_role() = 'recipient'
  AND EXISTS (SELECT 1 FROM memories m WHERE m.location_id = locations.id));
CREATE POLICY letters_recipient ON letters FOR SELECT TO sl_app USING (app.actor_role() = 'recipient' AND app.letter_visible(letters));
CREATE POLICY letters_recipient_open ON letters FOR UPDATE TO sl_app
  USING (app.actor_role() = 'recipient' AND app.letter_unlocked(letters)) WITH CHECK (app.actor_role() = 'recipient');
CREATE POLICY letter_bodies_recipient ON letter_bodies FOR SELECT TO sl_app USING (app.actor_role() = 'recipient'
  AND EXISTS (SELECT 1 FROM letters l WHERE l.id = letter_id AND app.letter_unlocked(l)));
CREATE POLICY letter_assets_recipient ON letter_assets FOR SELECT TO sl_app USING (app.actor_role() = 'recipient'
  AND EXISTS (SELECT 1 FROM letters l WHERE l.id = letter_id AND app.letter_unlocked(l)));
CREATE POLICY media_recipient ON media_assets FOR SELECT TO sl_app USING (app.actor_role() = 'recipient' AND status = 'ready' AND deleted_at IS NULL
  AND (EXISTS (SELECT 1 FROM memory_assets ma WHERE ma.asset_id = media_assets.id)
    OR EXISTS (SELECT 1 FROM letter_assets la WHERE la.asset_id = media_assets.id)));
CREATE POLICY future_recipient ON future_entries FOR SELECT TO sl_app USING (app.actor_role() = 'recipient' AND status IN ('unlit','arrived'));
CREATE POLICY site_texts_recipient ON site_texts FOR SELECT TO sl_app USING (app.actor_role() = 'recipient');
-- Own rows
CREATE POLICY favorites_own ON favorites FOR ALL TO sl_app USING (user_id = app.actor_id() AND app.actor_role() IN ('recipient','author'))
  WITH CHECK (user_id = app.actor_id());
CREATE POLICY user_state_own ON user_state FOR ALL TO sl_app USING (user_id = app.actor_id()) WITH CHECK (user_id = app.actor_id());
CREATE POLICY credentials_own ON credentials FOR SELECT TO sl_app USING (user_id = app.actor_id());
CREATE POLICY sessions_own ON sessions FOR ALL TO sl_app USING (user_id = app.actor_id()) WITH CHECK (user_id = app.actor_id());
CREATE POLICY users_self ON users FOR SELECT TO sl_app USING (id = app.actor_id());
-- Audit: anyone authenticated may append; only the author may read
CREATE POLICY audit_insert ON audit_events FOR INSERT TO sl_app WITH CHECK (app.actor_role() IN ('recipient','author','system'));
CREATE POLICY audit_author_read ON audit_events FOR SELECT TO sl_app USING (app.actor_role() = 'author'
  AND category IN ('auth','admin','security','system'));   -- 'content' access rows are never readable via the app
-- Worker role: media rows only (grants above) plus audit insert
CREATE POLICY media_worker ON media_assets FOR ALL TO sl_worker USING (true) WITH CHECK (true);
CREATE POLICY audit_worker ON audit_events FOR INSERT TO sl_worker WITH CHECK (true);
