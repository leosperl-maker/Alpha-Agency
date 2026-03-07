#!/bin/bash
set -e

# Railway injects $PORT at runtime — fallback to 8080
export PORT=${PORT:-8080}

echo "🚀 alphagency.fr starting on port $PORT..."

# Generate the final nginx.conf from the template
# envsubst '$PORT' replaces only $PORT, leaving nginx variables ($host, $uri…) untouched
envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "✅ nginx config generated (PORT=$PORT)"

# Start uvicorn in the background — Railway env vars will be available
# uvicorn may crash if MONGO_URL / DB_NAME are missing, but nginx still serves /health
echo "🐍 Starting uvicorn on 127.0.0.1:8000..."
cd /app/backend
python -m uvicorn server:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 1 \
    --log-level info &

echo "✅ uvicorn started (PID $!)"

# Give uvicorn a moment to boot before nginx starts accepting traffic
sleep 2

# Start nginx in the foreground — this is PID 1, Railway watches it
echo "🌐 Starting nginx on port $PORT..."
exec nginx -g "daemon off;"
