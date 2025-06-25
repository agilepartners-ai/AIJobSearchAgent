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
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    jsearch: {
      apiKey: import.meta.env.VITE_JSEARCH_API_KEY,
      apiHost: import.meta.env.VITE_JSEARCH_API_HOST,
    },
    tavus: {
      apiKey: import.meta.env.VITE_TAVUS_API_KEY,
    }
  };

  static validateEnvironment(): boolean {
    const config = {
      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      jsearch: {
        apiKey: import.meta.env.VITE_JSEARCH_API_KEY,
        apiHost: import.meta.env.VITE_JSEARCH_API_HOST,
      },
      tavus: {
        apiKey: import.meta.env.VITE_TAVUS_API_KEY,
      }
    };

    // Check Supabase configuration
    const missingSupabaseVars = Object.entries(config.supabase)
      .filter(([, value]) => !value)
      .map(([key]) => `VITE_SUPABASE_${key.toUpperCase()}`);

    // Check JSearch configuration
    const missingJSearchVars = Object.entries(config.jsearch)
      .filter(([, value]) => !value)
      .map(([key]) => `VITE_JSEARCH_${key.toUpperCase()}`);

    // Check Tavus configuration (optional)
    const missingTavusVars = Object.entries(config.tavus)
      .filter(([, value]) => !value)
      .map(([key]) => `VITE_TAVUS_${key.toUpperCase()}`);

    const missingVars = [...missingSupabaseVars, ...missingJSearchVars];

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => {
        console.error(`  - ${varName}`);
      });
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      return false;
    }

    // Log success with current configuration
    console.log('✅ Environment validation passed!');
    console.log('\n📋 Current configuration:');
    
    if (config.supabase.url && config.supabase.anonKey) {
      console.log('  🗄️ Supabase: Configured');
      console.log(`    - URL: ${config.supabase.url}`);
      console.log(`    - Anon Key: ${config.supabase.anonKey.substring(0, 20)}...`);
    }
    
    if (config.jsearch.apiKey && config.jsearch.apiHost) {
      console.log('  🔍 JSearch API: Configured');
      console.log(`    - Host: ${config.jsearch.apiHost}`);
      console.log(`    - API Key: ${config.jsearch.apiKey.substring(0, 10)}...`);
    }
    
    if (config.tavus.apiKey) {
      console.log('  🎥 Tavus AI: Configured');
      console.log(`    - API Key: ${config.tavus.apiKey.substring(0, 10)}...`);
    } else {
      console.log('  🎥 Tavus AI: Not configured (optional)');
    }

    console.log('\n🚀 Ready to start the application!');
    return true;
  }

  static getConfig() {
    return this.requiredVariables;
  }
}
