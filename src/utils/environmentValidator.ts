/**
 * Environment variables validation utility
 * Ensures all required environment variables are properly configured
 */

export interface EnvironmentConfig {
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
      jsearch: {
        apiKey: import.meta.env.VITE_JSEARCH_API_KEY,
        apiHost: import.meta.env.VITE_JSEARCH_API_HOST,
      },
      tavus: {
        apiKey: import.meta.env.VITE_TAVUS_API_KEY,
      }
    };

    // Check JSearch configuration
    const missingJSearchVars = Object.entries(config.jsearch)
      .filter(([, value]) => !value)
      .map(([key]) => `VITE_JSEARCH_${key.toUpperCase()}`);

    // Check Tavus configuration (optional)
    const missingTavusVars = Object.entries(config.tavus)
      .filter(([, value]) => !value)
      .map(([key]) => `VITE_TAVUS_${key.toUpperCase()}`);

    const missingVars = [...missingJSearchVars, ...missingTavusVars];

    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars.join(', '));
      return false;
    }

    return true;
  }

  static getConfig() {
    return this.requiredVariables;
  }
}
