declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    NEXT_PUBLIC_FIREBASE_APP_ID: string;
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: string;
    NEXT_PUBLIC_JSEARCH_API_KEY: string;
    NEXT_PUBLIC_JSEARCH_API_HOST: string;
    NEXT_PUBLIC_TAVUS_API_KEY: string;
    NEXT_PUBLIC_RESUME_API_BASE_URL: string;
    NEXT_PUBLIC_RESUME_API_MODEL_TYPE: string;
    NEXT_PUBLIC_RESUME_API_MODEL: string;
    NEXT_PUBLIC_OPENAI_API_KEY: string;
    // Vertex AI Configuration (Industry Standard)
    NEXT_PUBLIC_VERTEX_AI_PROJECT: string;
    NEXT_PUBLIC_VERTEX_AI_LOCATION: string;
    VERTEX_AI_CLIENT_EMAIL: string;
    VERTEX_AI_PRIVATE_KEY: string;
    // Legacy Gemini API Key (fallback for browser)
    NEXT_PUBLIC_GEMINI_API_KEY: string;
    GEMINI_API_KEY: string;
  }
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare module "*.mp4" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const value: any;
  export default value;
}
