# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 : Build React frontend (CRA + CRACO)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY frontend/package.json ./

# Install dependencies (--legacy-peer-deps for React 19 compatibility)
RUN npm install --legacy-peer-deps

# Copy all frontend source
COPY frontend/ .

# Build production bundle
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV CI=false

RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 : FastAPI backend + Nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System dependencies: gcc for compiled packages, nginx + supervisor for serving
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    libssl-dev \
    nginx \
    supervisor \
    gettext-base \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --timeout 120 -r requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy the built React app
COPY --from=frontend-build /app/build /app/frontend/build

# Copy configuration files
COPY nginx.conf        /etc/nginx/nginx.conf.template
COPY supervisord.conf  /etc/supervisor/conf.d/supervisord.conf
COPY start.sh          /start.sh

RUN chmod +x /start.sh

# Railway will inject $PORT at runtime — default 8080
EXPOSE 8080

CMD ["/start.sh"]
