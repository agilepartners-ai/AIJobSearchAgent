import { bodyObject, route } from '../../server/api';
import { deletePreferences, getPreferences, savePreferences } from '../../server/db/preferencesRepo';

/** GET /api/preferences → saved job preferences or null · PUT → replace them · DELETE → clear them. */
export default route('preferences', {
  GET: async ({ userId }) => ({ preferences: await getPreferences(userId) }),
  PUT: async ({ req, userId }) => ({ preferences: await savePreferences(userId, bodyObject(req)) }),
  DELETE: async ({ userId }) => {
    await deletePreferences(userId);
    return undefined;
  },
});
