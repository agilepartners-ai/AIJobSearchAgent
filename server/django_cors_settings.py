"""
Django CORS settings configuration
This file contains settings that should be added to your Django settings.py file.
"""

# Install django-cors-headers first:
# pip install django-cors-headers

# Add 'corsheaders' to your INSTALLED_APPS
INSTALLED_APPS = [
    # ... other apps
    'corsheaders',
    # ... other apps
]

# Add the middleware (should be placed as high as possible, especially before any middleware that can generate responses)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

# CORS settings
# For development, you can allow all origins
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # For production, specify allowed origins
    CORS_ALLOWED_ORIGINS = [
        "https://your-production-domain.com",
        "https://www.your-production-domain.com",
        # Add any other domains that need access
    ]

# Allow credentials (cookies, HTTP authentication)
# Only enable if you need to send credentials with the request
# CORS_ALLOW_CREDENTIALS = True

# Specify which HTTP headers are to be exposed to the browser
CORS_EXPOSE_HEADERS = [
    'Content-Type',
    'X-CSRFToken',
]

# Allow specific HTTP methods
CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'OPTIONS',
]

# Allow specific HTTP headers
CORS_ALLOW_HEADERS = [
    'Authorization',
    'Content-Type',
    'X-Requested-With',
]

# Cache preflight requests for 24 hours (86400 seconds)
CORS_PREFLIGHT_MAX_AGE = 86400