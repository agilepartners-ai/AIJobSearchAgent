declare namespace NodeJS {
  interface ProcessEnv {
    // App Configuration
    NEXT_PUBLIC_APP_URL: string;
    
    // Database Configuration
    DATABASE_TYPE: 'firebase' | 'postgresql' | 'mongodb' | 'mysql';
    DATABASE_HOST: string;
    DATABASE_PORT: string;
    DATABASE_NAME: string;
    DATABASE_USER: string;
    DATABASE_PASSWORD: string;
    DATABASE_SSL: string;
    
    // Firebase Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    NEXT_PUBLIC_FIREBASE_APP_ID: string;
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: string;
    
    // External APIs
    NEXT_PUBLIC_JSEARCH_API_KEY: string;
    NEXT_PUBLIC_JSEARCH_API_HOST: string;
    NEXT_PUBLIC_TAVUS_API_KEY: string;
    NEXT_PUBLIC_OPENAI_API_KEY: string;
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
