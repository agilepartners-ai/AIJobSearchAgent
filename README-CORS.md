# CORS Configuration Guide

This guide explains how to properly configure Cross-Origin Resource Sharing (CORS) for the resume optimization application.

## What is CORS?

Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the original page. This is a security measure to prevent malicious websites from making unauthorized requests to other websites on behalf of the user.

## Solution Overview

Our application implements a comprehensive CORS solution with multiple layers:

1. **Client-side handling** - Improved error detection and user feedback
2. **Development proxy** - Local proxy in Vite for development
3. **Production proxy** - Supabase Edge Function for production
4. **Server-side configuration** - Python backend CORS settings

## Client-Side Implementation

### Enhanced Error Detection
The application includes improved error detection for CORS issues with user-friendly error handling and helpful information for troubleshooting.

### Development Setup
For development, we use Vite's built-in proxy configuration to handle CORS issues locally.

### Production Deployment
In production, we use Supabase Edge Functions to handle API requests while maintaining proper CORS configuration.

## Server-Side Configuration

The Python backend (Flask) is configured with proper CORS settings to allow requests from:
- Local development servers (localhost:5173, localhost:3000)
- Production domains
=======
### 1. Enhanced Error Detection

The `apiErrorUtils.ts` file includes improved error detection for CORS issues:

```typescript
// Check for CORS errors
if (response.status === 0 || response.type === 'opaqueredirect') {
  throw createApiError(
    'CORS error: The request was blocked due to cross-origin restrictions.',
    endpoint,
    params,
    0,
    { type: 'CORS_ERROR' }
  );
}
```

### 2. User-Friendly Error Handling

The `ApiErrorHandler` component now includes a special section for CORS errors with helpful information:

```jsx
{showCorsHelp && (
  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
    <h3 className="text-md font-medium text-blue-800 dark:text-blue-300 mb-2">
      CORS Issue Detected
    </h3>
    <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">
      This appears to be a Cross-Origin Resource Sharing (CORS) issue.
    </p>
    {/* Additional help content */}
  </div>
)}
```

### 3. Development Proxy

In development, we use Vite's built-in proxy to avoid CORS issues:

```javascript
// vite.config.ts
server: {
  proxy: {
    '/api/proxy/resume-optimization': {
      target: 'https://resumebuilder-arfb.onrender.com',
      changeOrigin: true,
      rewrite: (path) => '/optimizer/api/optimize-resume/',
    }
  }
}
```

### 4. Production Proxy

For production, we use a Supabase Edge Function to proxy requests:

```typescript
// Supabase Edge Function
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }
  
  // Forward the request to the actual API
  // ...
});
```

## Server-Side Implementation

### Flask Configuration

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

CORS(app, resources={
    r"/optimizer/api/*": {
        "origins": [
            "http://localhost:5173",
            "https://your-production-domain.com",
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }
})
```

### Django Configuration

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware
]

# For development
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # For production
    CORS_ALLOWED_ORIGINS = [
        "https://your-production-domain.com",
    ]
```

### NGINX Configuration

For production deployments using NGINX:

```nginx
location /optimizer/api/ {
    # CORS headers
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://your-frontend-domain.com';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        add_header 'Access-Control-Max-Age' 86400;
        return 204;
    }
    
    add_header 'Access-Control-Allow-Origin' 'https://your-frontend-domain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    
    # Proxy to your backend
    proxy_pass http://localhost:5000;
    # ... other proxy settings
}
```

## Security Considerations

1. **Restrict Allowed Origins**: In production, specify exact domains instead of using `*`
2. **Limit HTTP Methods**: Only allow necessary methods (GET, POST, OPTIONS)
3. **Limit Headers**: Only allow necessary headers
4. **Use HTTPS**: Ensure all communication uses HTTPS
5. **Validate Origin**: Server-side validation of the Origin header

## Testing CORS Configuration

1. **Development**: Use the browser console to check for CORS errors
2. **Production**: Test with actual frontend domain
3. **Preflight Requests**: Test OPTIONS requests separately
>>>>>>> origin/main

## Troubleshooting

If you encounter CORS issues:

1. Check that your API endpoints are properly configured
2. Verify that your domain is included in the allowed origins
3. Ensure preflight requests are handled correctly
4. Check browser developer tools for specific CORS error messages
5. Check browser console for specific error messages
6. Verify server response headers using browser Network tab
7. Test with a tool like Postman to isolate client vs. server issues
8. Ensure proxy configurations are correct
9. Check for typos in allowed origins
