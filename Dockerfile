# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------------
# Stage 1 — build the React front-end into static assets (front-end/dist)
# ----------------------------------------------------------------------------
FROM node:20-slim AS frontend
WORKDIR /app/front-end

# Install dependencies first so this layer is cached unless package.json changes.
COPY front-end/package.json front-end/package-lock.json* ./
RUN npm install

COPY front-end/ ./
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 2 — build the Rust API binary
# ----------------------------------------------------------------------------
FROM rust:1-slim-bookworm AS backend
WORKDIR /app

# SQLx queries are verified at compile time. There is no database during the
# image build, so rely on the offline cache in .sqlx.
ENV SQLX_OFFLINE=true

# Pre-build dependencies against a dummy main so they are cached independently
# of the application sources.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src \
    && echo 'fn main() {}' > src/main.rs \
    && cargo build --release \
    && rm -rf src

# Build the real application. Touch the sources so their mtimes are newer than
# the cached dummy build (Docker COPY preserves mtimes), forcing a rebuild of the
# crate while keeping the dependency layer cached.
COPY src ./src
COPY migrations ./migrations
COPY .sqlx ./.sqlx
RUN find src -type f -name '*.rs' -exec touch {} + \
    && cargo build --release

# ----------------------------------------------------------------------------
# Stage 3 — minimal runtime image
# ----------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The compiled API server (migrations are embedded at build time and run on boot).
COPY --from=backend /app/target/release/duilio /app/duilio

# The built front-end, served by the API as static files / SPA fallback.
COPY --from=frontend /app/front-end/dist /app/static

ENV STATIC_DIR=/app/static
ENV PORT=3000

EXPOSE 3000
CMD ["/app/duilio"]
