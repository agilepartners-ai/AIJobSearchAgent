import { PAGES } from './seo/site';

/** The sign-in flow: reachable while signed out, but not indexed. */
export const AUTH_FLOW_PATHS = ['/login', '/register', '/verify-phone', '/verify-email', '/reset-password', '/forgot-password'];

/** The public marketing and legal pages: exactly the ones in the SEO registry. */
export const PUBLIC_PAGE_PATHS = new Set(PAGES.map((p) => p.path));

/** Server-rendered and indexable (no persisted client state needed). */
export const isPublicPage = (pathname: string) => PUBLIC_PAGE_PATHS.has(pathname);

/** May a signed-out visitor stay on this page, or must they be sent to sign in? */
export const isOpenToSignedOut = (pathname: string) => isPublicPage(pathname) || AUTH_FLOW_PATHS.includes(pathname);
