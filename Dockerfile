# Multi-stage production Dockerfile for NexaInventory ERP

# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy source files
COPY . .

# Build Vite frontend bundle and CJS server bundle
RUN npm run build

# Prune devDependencies for runtime
RUN npm prune --production

# ===== Stage 2: Production Runtime =====
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Copy node_modules and built artifacts from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
USER appuser

EXPOSE 3000

# Expose healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

CMD ["node", "dist/server.cjs"]
