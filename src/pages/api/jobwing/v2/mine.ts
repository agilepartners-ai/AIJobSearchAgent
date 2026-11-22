import { deleteAll, getConsent, holds } from '../../../../server/db/jwRepo';
import { route } from '../../../../server/api';

/**
 * GET    → what the server holds about the signed-in user from the JobWing app, and their activity-log choice
 * DELETE → removes all of it (the choice too); the user's website data is not touched
 */
export default route('jobwing-mine', {
  GET: async ({ userId }) => ({ consent: await getConsent(userId), holds: await holds(userId) }),
  DELETE: async ({ userId }) => {
    await deleteAll(userId);
    return { deleted: true };
  },
});
