import { HttpError } from '../api';
import { GmailConfigError } from './crypto';
import { GoogleAuthError, gmailEnabled } from './oauth';
import { NotConnectedError, ReconnectNeededError, TooSoonError } from './sync';

/** Turns the Gmail errors into the HTTP answers the browser can show to a person. */
export async function gmailGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof NotConnectedError) throw new HttpError(409, e.message);
    if (e instanceof ReconnectNeededError) throw new HttpError(409, e.message);
    if (e instanceof TooSoonError) throw new HttpError(429, e.message);
    if (e instanceof GmailConfigError) {
      console.error('[gmail] misconfigured:', e.message);
      throw new HttpError(503, 'Gmail sync is not available right now.');
    }
    if (e instanceof GoogleAuthError) throw new HttpError(502, 'Google did not accept the request. Try connecting again.');
    throw e;
  }
}

export function requireEnabled(): void {
  if (!gmailEnabled()) throw new HttpError(503, 'Gmail sync is not turned on for this site yet.');
}
