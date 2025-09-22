export interface AuthConfig {
  provider: 'firebase' | 'auth0' | 'supabase' | 'custom';
  // Firebase config (already in environment)
  // Auth0 config
  auth0Domain?: string;
  auth0ClientId?: string;
  // Supabase config
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  // Custom config
  customApiUrl?: string;
}

export const getAuthConfig = (): AuthConfig => {
  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthConfig['provider']) || 'firebase';
  
  return {
    provider,
    // Auth0
    auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    auth0ClientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    // Supabase
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Custom
    customApiUrl: process.env.NEXT_PUBLIC_CUSTOM_AUTH_API_URL,
  };
};