import { route } from '../../../server/api';
import { deleteConnection, deleteImportedApplications, getConnection } from '../../../server/db/gmailRepo';
import { decryptToken } from '../../../server/gmail/crypto';
import { revokeToken } from '../../../server/gmail/oauth';

/** POST /api/gmail/disconnect {deleteImported?: boolean}: revokes the token at Google and forgets the connection. */
export default route('gmail-disconnect', {
  POST: async ({ req, userId }) => {
    const conn = await getConnection(userId);
    if (conn) {
      try {
        await revokeToken(await decryptToken(conn.refresh_token_enc));
      } catch {
        // The token may already be dead or the key rotated; the connection is removed regardless.
      }
      await deleteConnection(userId);
    }
    const removed = req.body?.deleteImported === true ? await deleteImportedApplications(userId) : 0;
    return { ok: true, removedApplications: removed };
  },
});
