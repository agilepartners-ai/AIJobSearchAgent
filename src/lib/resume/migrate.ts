/**
 * Schema migrations.
 *
 * Stored documents are upgraded on read. Each step takes a document at
 * version N and returns version N+1. Only version 1 exists today; the
 * scaffold is here so the first breaking change is a one-function addition
 * rather than a data-loss incident.
 */
import { RESUME_SCHEMA_VERSION, ResumeDocumentSchema, type ResumeDocument } from './schema';

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] upgrades a version-n document to version n+1. */
const MIGRATIONS: Record<number, Migration> = {};

export class ResumeMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeMigrationError';
  }
}

export function migrateResume(raw: unknown): ResumeDocument {
  if (typeof raw !== 'object' || raw === null) {
    throw new ResumeMigrationError('Resume data is not an object.');
  }
  let doc = raw as Record<string, unknown>;
  let version = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 1;

  if (version > RESUME_SCHEMA_VERSION) {
    throw new ResumeMigrationError(
      `Resume was saved by a newer version of the app (schema ${version}). Refresh to update.`,
    );
  }

  while (version < RESUME_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new ResumeMigrationError(`No migration from schema ${version}.`);
    doc = step(doc);
    version += 1;
  }

  const parsed = ResumeDocumentSchema.safeParse({ ...doc, schemaVersion: RESUME_SCHEMA_VERSION });
  if (!parsed.success) {
    throw new ResumeMigrationError(`Resume data is invalid: ${parsed.error.issues[0]?.message ?? 'unknown'}`);
  }
  return parsed.data;
}
