import { route } from '../../../server/api';
import { findByGenerationId, listResumes } from '../../../server/db/resumesRepo';

/** GET /api/resumes → all of the caller's résumés, newest first; ?generationId=… → the one a generation produced (or null). */
export default route('resumes', {
  GET: async ({ req, userId }) => {
    const generationId = req.query.generationId;
    if (typeof generationId === 'string') return { resume: await findByGenerationId(userId, generationId) };
    return { resumes: await listResumes(userId) };
  },
});
