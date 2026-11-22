import { HttpError, route } from '../../../server/api';
import { adminSummary } from '../../../server/db/jwRepo';

/** Owner only: numbers across everyone who allowed the activity log. No names, no emails, no content. */
export default route('admin-jobwing', {
  GET: async ({ admin }) => {
    if (!admin) throw new HttpError(403, 'Owner only.');
    return adminSummary();
  },
});
