import { HttpError, route, bodyObject } from '../../../../server/api';
import { ingest, IngestError, parseIngest } from '../../../../server/db/jwRepo';

export const config = { api: { bodyParser: { sizeLimit: '512kb' } } };

/**
 * The JobWing desktop app sends its filtered activity here, signed in as the user (the same access token as the website).
 * Only the fields in parseIngest's allow-list are accepted; anything else is refused, never stored.
 * The server keeps it only if the user has said yes to the activity log (answer says `consent: false` otherwise).
 */
export default route('jobwing-ingest', {
  POST: async ({ req, userId }) => {
    try {
      return await ingest(userId, parseIngest(bodyObject(req)));
    } catch (e) {
      if (e instanceof IngestError) throw new HttpError(400, e.message);
      throw e;
    }
  },
});
