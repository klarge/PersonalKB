# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies after building, but keep vite and nanoid for runtime
RUN npm prune --production
RUN npm install vite nanoid

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user and backup directory
RUN addgroup -g 1001 -S nodejs
RUN adduser -S personal-kb -u 1001
RUN mkdir -p /app/backups

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/start.js ./start.js

# Change ownership to non-root user
RUN chown -R personal-kb:nodejs /app
USER personal-kb

# Environment variables
ENV BACKUP_DIR=/app/backups

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "start.js"]