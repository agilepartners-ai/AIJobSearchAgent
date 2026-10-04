import { query } from './pool';

/**
 * Résumé Studio documents. The whole ResumeDocument (including the optional `ai`
 * block written by the generator) is stored as one jsonb value; the columns are
 * only what we filter and sort by. The client repairs documents on read, so
 * nothing here interprets the content.
 */
type Doc = Record<string, unknown>;

const MAX_DOC_BYTES = 2_000_000;

export class ResumeValidationError extends Error {}

export async function listResumes(userId: string): Promise<Doc[]> {
  const { rows } = await query<{ document: Doc }>(
    'SELECT document FROM app.resumes WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 500',
    [userId],
  );
  return rows.map((r) => r.document);
}

export async function getResume(userId: string, id: string): Promise<Doc | null> {
  const { rows } = await query<{ document: Doc }>('SELECT document FROM app.resumes WHERE user_id = $1 AND id = $2', [userId, id]);
  return rows[0]?.document ?? null;
}

export async function findByGenerationId(userId: string, generationId: string): Promise<Doc | null> {
  const { rows } = await query<{ document: Doc }>(
    'SELECT document FROM app.resumes WHERE user_id = $1 AND generation_id = $2 LIMIT 1',
    [userId, generationId],
  );
  return rows[0]?.document ?? null;
}

/** Create or replace. The id in the URL/path is authoritative over the one inside the body. */
export async function saveResume(userId: string, id: string, document: Doc): Promise<void> {
  if (!id || id.length > 64) throw new ResumeValidationError('Invalid résumé id.');
  const body = JSON.stringify({ ...document, id });
  if (body.length > MAX_DOC_BYTES) throw new ResumeValidationError('That résumé is too large.');
  const title = typeof document.title === 'string' ? document.title.slice(0, 200) : '';
  const template = typeof document.presetId === 'string' ? document.presetId : typeof document.template === 'string' ? document.template : '';
  const generationId = typeof document.generationId === 'string' ? document.generationId.slice(0, 64) : null;
  await query(
    `INSERT INTO app.resumes (user_id, id, title, template, document, generation_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     ON CONFLICT (user_id, id) DO UPDATE SET
       title = EXCLUDED.title, template = EXCLUDED.template, document = EXCLUDED.document,
       generation_id = COALESCE(EXCLUDED.generation_id, app.resumes.generation_id)`,
    [userId, id, title, template, body, generationId],
  );
}

export async function deleteResume(userId: string, id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM app.resumes WHERE user_id = $1 AND id = $2', [userId, id]);
  return (rowCount ?? 0) > 0;
}

/** Attach the cover-letter PDF link once it exists; the résumé is already saved by then. */
export async function attachCoverLetterPdf(userId: string, id: string, link: { url: string; path: string }): Promise<void> {
  await query(
    `UPDATE app.resumes SET document = jsonb_set(
       jsonb_set(document, '{ai}', COALESCE(document->'ai', '{}'::jsonb), true),
       '{ai,coverLetter}', COALESCE(document->'ai'->'coverLetter', '{}'::jsonb) || $3::jsonb, true)
     WHERE user_id = $1 AND id = $2`,
    [userId, id, JSON.stringify(link)],
  );
}
