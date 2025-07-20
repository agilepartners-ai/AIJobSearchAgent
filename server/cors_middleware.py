"""
CORS middleware for Python backend (Flask/Django)
This file should be placed in your server directory and imported in your main application file.
"""

from flask import Flask, request, jsonify
from functools import wraps

def setup_cors(app: Flask):
    """
    Configure CORS for a Flask application
    
    Args:
        app: Flask application instance
    """
    @app.after_request
    def add_cors_headers(response):
        # Allow requests from specific origins in production
        # In development, you might want to use '*' instead
        allowed_origins = [
            'http://localhost:5173',  # Vite dev server
            'http://localhost:3000',  # Alternative dev server
            'https://your-production-domain.com',  # Replace with your production domain
        ]
        
        origin = request.headers.get('Origin')
        
        # Check if the request origin is in our allowed origins
        if origin in allowed_origins or '*' in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
        else:
            # For development, you can use '*' to allow all origins
            # response.headers.add('Access-Control-Allow-Origin', '*')
            pass
            
        # Allow specific methods
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        
        # Allow specific headers
        response.headers.add('Access-Control-Allow-Headers', 
                            'Content-Type, Authorization, X-Requested-With')
        
        # Allow credentials (cookies, authorization headers)
        # Only enable if you need to send credentials with the request
        # response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        # Cache preflight requests for 24 hours (86400 seconds)
        response.headers.add('Access-Control-Max-Age', '86400')
        
        return response
    
    @app.route('/optimizer/api/optimize-resume/', methods=['OPTIONS'])
    def handle_preflight():
        """Handle preflight requests for the resume optimization endpoint"""
        response = jsonify({'status': 'ok'})
        return response

def cors_enabled(f):
    """
    Decorator to enable CORS for specific routes
    
    Usage:
        @app.route('/api/endpoint')
        @cors_enabled
        def my_endpoint():
            return jsonify({"data": "value"})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'ok'})
            
            # Set CORS headers for preflight requests
            response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            response.headers.add('Access-Control-Allow-Headers', 
                                'Content-Type, Authorization, X-Requested-With')
            response.headers.add('Access-Control-Max-Age', '86400')
            
            return response
        
        # Call the original function
        return f(*args, **kwargs)
    
    return decorated_function