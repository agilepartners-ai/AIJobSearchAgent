import { route } from '../../../server/api';
import { inboundStatus, rotateAddress } from '../../../server/db/inboundRepo';
import { inboundUiEnabled } from '../../../server/gmail/oauth';
import { addressFor } from '../../../server/gmail/tokens';

/** The Gmail search the user pastes into a filter, so only application mail is forwarded. */
export const FILTER_QUERY = 'category:updates {application applied interview assessment "next steps" offer candidate recruiter unfortunately}';

async function view(userId: string, token?: string) {
  const domain = process.env.INBOUND_DOMAIN as string;
  const s = await inboundStatus(userId);
  const t = token ?? s.token;
  return {
    enabled: true,
    address: addressFor(t, domain),
    filterQuery: FILTER_QUERY,
    lastReceivedAt: s.lastReceivedAt,
    receivedTotal: s.receivedTotal,
    confirmation: s.confirmation,
  };
}

/**
 * GET  /api/inbound/address                 the user's forwarding address, the filter to use, and the Gmail confirmation code once it arrives
 * POST /api/inbound/address {rotate: true}  a new address; the old one stops working
 */
export default route('inbound-address', {
  GET: async ({ userId }) => (inboundUiEnabled() ? view(userId) : { enabled: false }),
  POST: async ({ req, userId }) => {
    if (!inboundUiEnabled()) return { enabled: false };
    if (req.body?.rotate === true) {
      const token = await rotateAddress(userId);
      return view(userId, token);
    }
    return view(userId);
  },
});
