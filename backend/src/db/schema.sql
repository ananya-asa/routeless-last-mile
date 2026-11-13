-- ============================================================
-- schema.sql — ROUTELESS database schema
-- All tables created fresh on first startup
-- ============================================================

CREATE TABLE IF NOT EXISTS villages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  corridor_id TEXT NOT NULL
);

-- Pseudonymous students. No names, phones, or precise locations.
CREATE TABLE IF NOT EXISTS students (
  id                      TEXT PRIMARY KEY,
  village_id              TEXT NOT NULL,
  institution_id          TEXT NOT NULL DEFAULT 'demo-district',
  class_start_min         INTEGER NOT NULL DEFAULT 540,
  is_exam_day             INTEGER NOT NULL DEFAULT 0,
  previous_unserved_days  INTEGER NOT NULL DEFAULT 0,
  needs_accessible_vehicle INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (village_id) REFERENCES villages(id)
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

-- Hot paths for the coordinator board and recovery planner.
CREATE INDEX IF NOT EXISTS idx_requests_incident   ON help_requests(incident_id);
CREATE INDEX IF NOT EXISTS idx_requests_student    ON help_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status  ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_incidents_status    ON incidents(status);

