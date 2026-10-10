import { route } from '../../../server/api';
import { gmailEnabled } from '../../../server/gmail/oauth';
import { getConnection, gmailStats } from '../../../server/db/gmailRepo';

/** GET /api/gmail/status: whether the feature is on, whether this user connected, and the last sync. No secrets. */
export default route('gmail-status', {
  GET: async ({ userId }) => {
    if (!gmailEnabled()) return { enabled: false };
    const conn = await getConnection(userId);
    if (!conn) return { enabled: true, connected: false };
    const stats = await gmailStats(userId);
    return {
      enabled: true,
      connected: conn.status === 'active',
      status: conn.status,
      googleEmail: conn.google_email,
      connectedAt: conn.connected_at,
      lastSyncAt: conn.last_sync_at,
      lastSummary: conn.last_sync_summary,
      lastError: conn.last_error,
      imported: stats.imported,
      needsReview: stats.needsReview,
    };
  },
});
