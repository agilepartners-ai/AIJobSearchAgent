import { HttpError, route } from '../../../server/api';
import { endConversation, TavusConfigError, TavusError } from '../../../server/interview/tavus';

/** DELETE /api/interview/:conversationId → ends a conversation (signed-in users only). */
export default route('interview/[id]', {
  DELETE: async ({ req }) => {
    const id = req.query.id;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(id)) throw new HttpError(400, 'Invalid conversation id.');
    try {
      await endConversation(id);
      return undefined;
    } catch (error) {
      if (error instanceof TavusConfigError || error instanceof TavusError) {
        console.error('[interview] end failed:', error.message);
        throw new HttpError(502, 'Could not end the conversation.');
      }
      throw error;
    }
  },
});
