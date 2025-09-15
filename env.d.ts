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
