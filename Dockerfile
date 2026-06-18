# ──────────────────────────────────────────────
# Stage 1 – Build
# ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json? ./
COPY back-end/package.json ./back-end/
COPY front-end/package.json ./front-end/

RUN npm ci

# Copy source code
COPY back-end/ ./back-end/
COPY front-end/ ./front-end/

# Build both workspaces (front-end first, then back-end)
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2 – Runtime
# ──────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy root package.json so workspace structure is recognised
COPY package.json ./

# Copy built back-end + front-end dist
COPY --from=build /app/back-end/package.json ./back-end/
COPY --from=build /app/back-end/dist/ ./back-end/dist/
COPY --from=build /app/front-end/dist/ ./front-end/dist/

# Install production dependencies only (back-end runtime deps)
RUN npm ci --omit=dev --workspace=back-end

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "back-end"]
