# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 : Build React frontend (CRA + CRACO)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

# Build tools needed by some npm packages (node-gyp, etc.)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Install yarn globally (matching packageManager field)
RUN npm install -g yarn@1.22.22 --quiet

# Copy package.json only (no yarn.lock present in repo)
COPY frontend/package.json ./

# Install dependencies — no lockfile since none exists in repo
RUN yarn install --no-lockfile --non-interactive

# Copy all frontend source
COPY frontend/ .

# Build production bundle
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV CI=false
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN yarn build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 : FastAPI backend + Nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System dependencies
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

CMD ["/start.sh"]
