/**
 * Environment variables validation utility
 * Ensures all required environment variables are properly configured
 */

export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  jsearch: {
    apiKey: string;
    apiHost: string;
  };
  tavus: {
    apiKey: string;
  };
}

export class EnvironmentValidator {
  private static requiredVariables = {
    supabase: {
      url: process.env.NEXT_SUPABASE_URL,
      anonKey: process.env.NEXT_SUPABASE_ANON_KEY,
    },
    jsearch: {
      apiKey: process.env.NEXT_JSEARCH_API_KEY,
      apiHost: process.env.NEXT_JSEARCH_API_HOST,
    },
    tavus: {
      apiKey: process.env.NEXT_TAVUS_API_KEY,
    }
  };

  static validateEnvironment(): boolean {
    const config = {
      supabase: {
        url: process.env.NEXT_SUPABASE_URL,
        anonKey: process.env.NEXT_SUPABASE_ANON_KEY,
      },
      jsearch: {
        apiKey: process.env.NEXT_JSEARCH_API_KEY,
        apiHost: process.env.NEXT_JSEARCH_API_HOST,
      },
      tavus: {
        apiKey: process.env.NEXT_TAVUS_API_KEY,
      }
    };

    // Check Supabase configuration
    const missingSupabaseVars = Object.entries(config.supabase)
      .filter(([, value]) => !value)
      .map(([key]) => `NEXT_SUPABASE_${key.toUpperCase()}`);

    // Check JSearch configuration
    const missingJSearchVars = Object.entries(config.jsearch)
      .filter(([, value]) => !value)
      .map(([key]) => `NEXT_JSEARCH_${key.toUpperCase()}`);

    // Check Tavus configuration (optional)
    const missingTavusVars = Object.entries(config.tavus)
      .filter(([, value]) => !value)
      .map(([key]) => `NEXT_TAVUS_${key.toUpperCase()}`);

    const missingVars = [...missingSupabaseVars, ...missingJSearchVars];

    if (missingVars.length > 0) {
      return false;
    }

    return true;
  }

  static getConfig() {
    return this.requiredVariables;
  }
}