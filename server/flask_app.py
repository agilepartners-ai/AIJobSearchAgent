"""
Example Flask application with CORS configuration
This is a minimal example showing how to configure CORS in a Flask application.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json

# Import our custom CORS middleware (optional, as we're using flask-cors)
from cors_middleware import cors_enabled

app = Flask(__name__)

# Configure CORS for the entire application
# For development, you can use origins='*' to allow all origins
CORS(app, resources={
    # Apply CORS to all routes under /optimizer/api/
    r"/optimizer/api/*": {
        "origins": [
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # Alternative dev server
            "https://your-production-domain.com",  # Replace with your production domain
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "max_age": 86400,  # Cache preflight requests for 24 hours
    }
})

# Alternatively, you can use our custom middleware
# from cors_middleware import setup_cors
# setup_cors(app)

@app.route('/optimizer/api/optimize-resume/', methods=['POST', 'OPTIONS'])
@cors_enabled  # Apply our custom decorator (optional if using flask-cors)
def optimize_resume():
    """
    Resume optimization endpoint
    """
    if request.method == 'OPTIONS':
        # Handle preflight request
        return jsonify({'status': 'ok'})
    
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Process the request (your actual business logic)
        # ...
        
        # Return a response
        return jsonify({
            'success': True,
            'message': 'Resume optimization successful',
            'data': {
                # Your response data here
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)