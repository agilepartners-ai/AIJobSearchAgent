import { authedFetch } from '../lib/api/authedFetch';
import { IConversation } from '../types';

/**
 * Mock-interview conversations. The Tavus API key is held by the server; the browser only talks to
 * /api/interview with the signed-in user's session.
 */
export const createConversation = (context?: string): Promise<IConversation> =>
  authedFetch<IConversation>('/api/interview', { method: 'POST', body: JSON.stringify({ context: context ?? '' }) });

export const endConversation = async (conversationId: string): Promise<void> => {
  await authedFetch(`/api/interview/${encodeURIComponent(conversationId)}`, { method: 'DELETE' });
};
