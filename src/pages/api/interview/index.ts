import { bodyObject, HttpError, route } from '../../../server/api';
import { reserveInterview, refundInterview } from '../../../server/db/usage';
import { createConversation, TavusConfigError, TavusError } from '../../../server/interview/tavus';

/** POST /api/interview { context } → starts a mock-interview conversation (5 per account per day). */
export default route('interview', {
  POST: async ({ req, userId, admin }) => {
    const { context } = bodyObject(req);
    if (typeof context !== 'string' && context !== undefined) throw new HttpError(400, 'Invalid interview context.');

    const quota = admin ? { ok: true, limit: 0 } : await reserveInterview(userId);
    if (!quota.ok) throw new HttpError(429, `You have used your ${quota.limit} practice interviews for today. Try again tomorrow.`);

    try {
      return await createConversation((context as string | undefined) ?? '');
    } catch (error) {
      if (!admin) await refundInterview(userId);
      if (error instanceof TavusConfigError) {
        console.error('[interview] misconfigured:', error.message);
        throw new HttpError(503, 'AI interviews are not available right now.');
      }
      if (error instanceof TavusError) {
        console.error('[interview] Tavus failed:', error.message);
        throw new HttpError(502, 'The interview service is unavailable right now. Please try again.');
      }
      throw error;
    }
  },
});
