import { bodyObject, route } from '../../../server/api';
import { createApplication, listApplications } from '../../../server/db/applicationsRepo';

/** GET /api/applications → the caller's applications · POST → create one (201-style: returns it). */
export default route('applications', {
  GET: ({ userId }) => listApplications(userId),
  POST: ({ req, userId }) => createApplication(userId, bodyObject(req)),
});
