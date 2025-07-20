export interface ConfigValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export const validateConfig = (): ConfigValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check OpenAI API key
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        errors.push('OpenAI API key (VITE_OPENAI_API_KEY) is not configured in environment variables.');
    } else if (apiKey.length < 10) {
        errors.push('OpenAI API key appears to be invalid (too short).');
    }

    // Check if we're in development mode
    if (import.meta.env.DEV) {
        warnings.push('Running in development mode.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

export const getConfig = () => {
    return {
        openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
        isDevelopment: import.meta.env.DEV,
        mode: import.meta.env.MODE
    };
};
