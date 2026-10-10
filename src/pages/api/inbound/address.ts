import { route } from '../../../server/api';
import { inboundStatus, rotateAddress } from '../../../server/db/inboundRepo';
import { inboundUiEnabled } from '../../../server/gmail/oauth';
import { addressFor } from '../../../server/gmail/tokens';

/**
 * The Gmail search the user pastes into a filter, so only job mail is forwarded: recommendations from job boards, and application mail
 * from boards and applicant tracking systems. It searches every tab (Updates, Promotions, Social), never forwards the whole inbox,
 * and does not match personal mail.
 */
export const FILTER_QUERY =
  '{(from:(linkedin.com OR indeed.com OR glassdoor.com OR naukri.com OR wellfound.com OR ziprecruiter.com OR foundit.in OR instahyre.com OR cutshort.io OR hirist.tech OR monster.com) subject:(job OR jobs OR hiring OR application OR applied OR vacancy OR opening OR interview OR role)) from:(greenhouse.io OR greenhouse-mail.io OR lever.co OR myworkday.com OR myworkdayjobs.com OR ashbyhq.com OR smartrecruiters.com OR icims.com OR jobvite.com OR workable.com OR bamboohr.com OR recruitee.com OR teamtailor.com OR taleo.net OR successfactors.com OR oraclecloud.com OR applytojob.com OR pinpointhq.com OR breezy.hr) subject:("your application" OR "thank you for applying" OR "application received" OR "next steps" OR interview OR assessment OR "coding challenge" OR "online test" OR "offer letter" OR shortlisted OR "moving forward" OR "we received")}';

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
