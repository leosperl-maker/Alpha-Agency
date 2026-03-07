#!/bin/bash
set -e

# Railway injects $PORT at runtime — fallback to 8080
export PORT=${PORT:-8080}

echo "🚀 alphagency.fr starting on port $PORT..."

# Generate the final nginx.conf from the template
# envsubst '$PORT' replaces only $PORT and leaves nginx variables ($host, $uri…) untouched
envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "✅ nginx config generated (PORT=$PORT)"
echo "✅ uvicorn will start on 127.0.0.1:8000"

# Start supervisord — manages both nginx and uvicorn
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
