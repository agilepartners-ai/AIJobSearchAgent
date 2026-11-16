import { route } from '../../../server/api';
import { createLinkCode, linkInfo, revokeLinkCode } from '../../../server/db/jobwingRepo';

/**
 * The signed-in user manages the code that links the JobWing plugin to their account.
 * GET    → whether a plugin is linked
 * POST   → a new code (shown once; the old one stops working)
 * DELETE → unlink
 */
export default route('jobwing-link', {
  GET: async ({ userId }) => linkInfo(userId),
  POST: async ({ userId }) => ({ code: await createLinkCode(userId) }),
  DELETE: async ({ userId }) => {
    await revokeLinkCode(userId);
    return { linked: false };
  },
});
