-- ============================================================
-- schema.sql — ROUTELESS database schema
-- All tables created fresh on first startup
-- ============================================================

CREATE TABLE IF NOT EXISTS villages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  corridor_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transport_options (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK(kind IN ('government_bus','institution_vehicle')),
  status         TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','delayed','cancelled')),
  verified       INTEGER NOT NULL DEFAULT 1,   -- 1 = verified, 0 = unverified
  capacity       INTEGER NOT NULL,
  occupied_seats INTEGER NOT NULL DEFAULT 0,
  departure_min  INTEGER NOT NULL,             -- minutes from midnight (e.g. 450 = 07:30)
  arrival_min    INTEGER NOT NULL,             -- demo estimated arrival at college
  accessible     INTEGER NOT NULL DEFAULT 0,
  driver_name    TEXT,
  contact        TEXT
);

-- Which villages does this transport option serve?
CREATE TABLE IF NOT EXISTS transport_villages (
  transport_id TEXT NOT NULL,
  village_id   TEXT NOT NULL,
  PRIMARY KEY (transport_id, village_id)
);

-- Blocked corridor IDs for a transport option (e.g. during road-block scenario)
CREATE TABLE IF NOT EXISTS transport_blocked_corridors (
  transport_id TEXT NOT NULL,
  corridor_id  TEXT NOT NULL,
  PRIMARY KEY (transport_id, corridor_id)
);

-- Config-driven junction relay routes for blocked corridors
CREATE TABLE IF NOT EXISTS relay_routes (
  id                      TEXT PRIMARY KEY,
  source_village_id       TEXT NOT NULL,
  junction_village_id     TEXT NOT NULL,
  connecting_transport_id TEXT NOT NULL,
  walk_distance_km        REAL NOT NULL,
  corridor_id             TEXT NOT NULL,
  FOREIGN KEY (source_village_id) REFERENCES villages(id),
  FOREIGN KEY (junction_village_id) REFERENCES villages(id),
  FOREIGN KEY (connecting_transport_id) REFERENCES transport_options(id)
);

CREATE TABLE IF NOT EXISTS incidents (
  id                  TEXT PRIMARY KEY,
  transport_option_id TEXT NOT NULL,
  type                TEXT NOT NULL CHECK(type IN ('no_show','full','breakdown','delay','road_block')),
  status              TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported','confirmed','dismissed')),
  reported_by         TEXT NOT NULL CHECK(reported_by IN ('student','coordinator')),
  details             TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transport_option_id) REFERENCES transport_options(id)
);

-- Affected villages for each incident
CREATE TABLE IF NOT EXISTS incident_villages (
  incident_id TEXT NOT NULL,
  village_id  TEXT NOT NULL,
  PRIMARY KEY (incident_id, village_id)
);

CREATE TABLE IF NOT EXISTS help_requests (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL,
  incident_id TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK(status IN ('pending','proposed','confirmed','unserved','escalated')),
  is_exam_day INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, incident_id),             -- prevents duplicate requests
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id                  TEXT PRIMARY KEY,
  request_id          TEXT NOT NULL UNIQUE,    -- one assignment per request max
  transport_option_id TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'proposed'
                      CHECK(status IN ('proposed','confirmed','cancelled')),
  explanation         TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id)          REFERENCES help_requests(id),
  FOREIGN KEY (transport_option_id) REFERENCES transport_options(id)
);

-- Scenario metadata (for simulator)
CREATE TABLE IF NOT EXISTS scenarios (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT
);
