import { bodyObject, HttpError, idParam, route } from '../../../server/api';
import { deleteResume, getResume, saveResume } from '../../../server/db/resumesRepo';

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } };

/** GET · PUT (create or replace; the id in the URL wins) · DELETE one résumé of the caller's. */
export default route('resumes/[id]', {
  GET: async ({ req, userId }) => {
    const doc = await getResume(userId, idParam(req));
    if (!doc) throw new HttpError(404, 'Résumé not found.');
    return doc;
  },
  PUT: async ({ req, userId }) => {
    await saveResume(userId, idParam(req), bodyObject(req));
    return undefined;
  },
  DELETE: async ({ req, userId }) => {
    await deleteResume(userId, idParam(req));
    return undefined;
  },
});
