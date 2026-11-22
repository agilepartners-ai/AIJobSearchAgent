/** Sign-in is our own (accounts in the VM database, served by /api/auth/*). There is nothing to configure in the browser. */
export interface AuthConfig {
  provider: 'custom';
}

export const getAuthConfig = (): AuthConfig => ({ provider: 'custom' });
