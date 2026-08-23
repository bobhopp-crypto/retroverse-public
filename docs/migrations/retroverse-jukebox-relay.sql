BEGIN;

CREATE TABLE IF NOT EXISTS retroverse_jukebox_relay_sessions (
  session_token uuid PRIMARY KEY,
  is_current boolean NOT NULL DEFAULT false,
  requests_enabled boolean NOT NULL DEFAULT false,
  request_limit integer CHECK (request_limit IS NULL OR request_limit BETWEEN 1 AND 99),
  catalog_count integer NOT NULL DEFAULT 0 CHECK (catalog_count >= 0),
  next_guest_number bigint NOT NULL DEFAULT 1 CHECK (next_guest_number >= 1),
  expires_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS retroverse_jukebox_relay_one_current
  ON retroverse_jukebox_relay_sessions (is_current)
  WHERE is_current = true;

CREATE TABLE IF NOT EXISTS retroverse_jukebox_relay_catalog (
  session_token uuid NOT NULL REFERENCES retroverse_jukebox_relay_sessions(session_token) ON DELETE CASCADE,
  track_key varchar(64) NOT NULL,
  artist varchar(240) NOT NULL,
  title varchar(240) NOT NULL,
  year integer,
  rvtr varchar(10),
  hero_url varchar(320),
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY (session_token, track_key)
);

CREATE INDEX IF NOT EXISTS retroverse_jukebox_relay_catalog_search
  ON retroverse_jukebox_relay_catalog (session_token, position);

CREATE TABLE IF NOT EXISTS retroverse_jukebox_relay_guests (
  session_token uuid NOT NULL REFERENCES retroverse_jukebox_relay_sessions(session_token) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  guest_number bigint NOT NULL,
  nickname varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_token, guest_id),
  UNIQUE (session_token, guest_number)
);

CREATE TABLE IF NOT EXISTS retroverse_jukebox_relay_requests (
  public_request_id uuid PRIMARY KEY,
  session_token uuid NOT NULL REFERENCES retroverse_jukebox_relay_sessions(session_token) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  track_key varchar(64) NOT NULL,
  artist varchar(240) NOT NULL,
  title varchar(240) NOT NULL,
  year integer,
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'rejected')),
  local_request_id bigint,
  result_detail varchar(240),
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  FOREIGN KEY (session_token, guest_id)
    REFERENCES retroverse_jukebox_relay_guests(session_token, guest_id) ON DELETE CASCADE,
  FOREIGN KEY (session_token, track_key)
    REFERENCES retroverse_jukebox_relay_catalog(session_token, track_key) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS retroverse_jukebox_relay_pending
  ON retroverse_jukebox_relay_requests (session_token, requested_at, public_request_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS retroverse_jukebox_relay_guest_requests
  ON retroverse_jukebox_relay_requests (session_token, guest_id, requested_at);

COMMIT;
