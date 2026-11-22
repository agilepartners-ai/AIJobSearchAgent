import { HttpError, bodyObject, route } from '../../../../server/api';
import { getConsent, setConsent } from '../../../../server/db/jwRepo';

/**
 * GET → the activity-log choice. PUT { activityLog: boolean } → record it.
 * Saying no also deletes what was collected so far (consent withdrawn means the data goes).
 */
export default route('jobwing-consent', {
  GET: async ({ userId }) => getConsent(userId),
  PUT: async ({ req, userId }) => {
    const on = bodyObject(req).activityLog;
    if (typeof on !== 'boolean') throw new HttpError(400, 'activityLog must be true or false.');
    await setConsent(userId, on);
    return getConsent(userId);
  },
});
