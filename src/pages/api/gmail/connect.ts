import { route } from '../../../server/api';
import { gmailGuard, requireEnabled } from '../../../server/gmail/http';
import { signState } from '../../../server/gmail/crypto';
import { buildAuthUrl } from '../../../server/gmail/oauth';

/** POST /api/gmail/connect: returns { url }, the Google consent screen to send the browser to. */
export default route('gmail-connect', {
  POST: ({ userId, email }) =>
    gmailGuard(async () => {
      requireEnabled();
      return { url: buildAuthUrl(await signState(userId), email ?? undefined) };
    }),
});
