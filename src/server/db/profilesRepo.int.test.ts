/**
 * Live test against the real database (opt-in):
 *   RUN_DB_TESTS=1 pnpm exec vitest run src/server/db
 * Uses a random user id and deletes its row afterwards.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { closePool, query } from './pool';
import { getOrCreateProfile, updateProfile } from './profilesRepo';

const live = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const uid = randomUUID();

describe.skipIf(!live)('profilesRepo (live database)', () => {
  afterAll(async () => {
    await query('DELETE FROM app.profiles WHERE user_id = $1', [uid]);
    await closePool();
  });

  it('creates the row on first call and never overwrites it afterwards', async () => {
    const first = await getOrCreateProfile(uid, 'Probe@Example.com', 'Probe User');
    expect(first).toMatchObject({ id: uid, email: 'Probe@Example.com', full_name: 'Probe User' });

    await updateProfile(uid, { full_name: 'Edited Name' });
    const again = await getOrCreateProfile(uid, 'other@example.com', 'Ignored');
    expect(again.full_name).toBe('Edited Name');
    expect(again.email).toBe('Probe@Example.com');
  });

  it('stores free-form fields in extras and merges them across updates', async () => {
    await updateProfile(uid, { location: 'Pune', skills: ['React', 'SQL'], phone: '+91 99999 00000' });
    const merged = await updateProfile(uid, { bio: 'Builder' });
    expect(merged).toMatchObject({ location: 'Pune', skills: ['React', 'SQL'], bio: 'Builder', phone: '+91 99999 00000' });
  });

  it('cannot change its id or created_at through an update', async () => {
    const before = await getOrCreateProfile(uid, null, '');
    const after = await updateProfile(uid, { id: 'someone-else', created_at: '2000-01-01' });
    expect(after.id).toBe(uid);
    expect(after.created_at).toBe(before.created_at);
  });

  it('matches email case-insensitively (citext)', async () => {
    const { rows } = await query('SELECT 1 FROM app.profiles WHERE email = $1', ['PROBE@example.COM']);
    expect(rows).toHaveLength(1);
  });
});
