import { bodyObject, HttpError, idParam, route } from '../../../server/api';
import { deleteApplication, getApplication, updateApplication } from '../../../server/db/applicationsRepo';

const notFound = () => new HttpError(404, 'Application not found.');

/** Ids are UUIDs; anything else cannot exist, so it never reaches the database. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (req: Parameters<typeof idParam>[0]) => {
  const id = idParam(req);
  if (!UUID.test(id)) throw notFound();
  return id;
};

/** GET · PATCH (partial update) · DELETE on one of the caller's applications. */
export default route('applications/[id]', {
  GET: async ({ req, userId }) => (await getApplication(userId, idOf(req))) ?? Promise.reject(notFound()),
  PATCH: async ({ req, userId }) => (await updateApplication(userId, idOf(req), bodyObject(req))) ?? Promise.reject(notFound()),
  DELETE: async ({ req, userId }) => {
    if (!(await deleteApplication(userId, idOf(req)))) throw notFound();
    return undefined;
  },
});
