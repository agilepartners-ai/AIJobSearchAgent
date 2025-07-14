#!/bin/sh
# Health check script for Cloud Run

# Check if Nginx is running
if ! pgrep nginx > /dev/null; then
    echo "Nginx is not running"
    exit 1
fi

# Check if the health endpoint responds
if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "Health endpoint is not responding"
    exit 1
fi

echo "Health check passed"
exit 0