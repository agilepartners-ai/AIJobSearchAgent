import type { NextApiRequest, NextApiResponse } from 'next';
import { HttpError, route } from '../../../server/api';
import { getApplication, updateApplication } from '../../../server/db/applicationsRepo';
import { DescriptionError, fetchJobDescription } from '../../../server/jobs/description';
import { forwardIfWorkers } from '../../../server/proxy';

export const config = { api: { bodyParser: { sizeLimit: '10kb' } } };

const run = route('applications-describe', {
  POST: async ({ req, userId }) => {
    const id = typeof req.body?.id === 'string' ? req.body.id : '';
    if (!id || id.length > 64) throw new HttpError(400, 'Missing application id.');
    const app = await getApplication(userId, id);
    if (!app) throw new HttpError(404, 'Application not found.');
    if (app.job_description && app.job_description.length >= 200) return { description: app.job_description, via: 'saved' };
    if (!app.job_posting_url) throw new HttpError(422, 'This application has no job link to read.');
    try {
      const { text, via } = await fetchJobDescription(app.job_posting_url);
      await updateApplication(userId, id, { job_description: text });
      return { description: text, via };
    } catch (e) {
      if (e instanceof DescriptionError) throw new HttpError(422, e.message);
      throw e;
    }
  },
});

/**
 * POST /api/applications/describe {id}: reads the job posting behind an application's link and saves the text as its description.
 * The request goes out from the VM (a steady address), so on Workers it is forwarded there like generation.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (await forwardIfWorkers(req, res)) return;
  return run(req, res);
}
