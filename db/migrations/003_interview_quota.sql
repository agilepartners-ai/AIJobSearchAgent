-- Per-account daily cap on AI mock-interview sessions (each one spends paid third-party credits).
SET search_path = app, public;

ALTER TABLE usage_daily ADD COLUMN interviews integer NOT NULL DEFAULT 0;
