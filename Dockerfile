# Multi-stage Dockerfile for MnemonicShards
# Stage 1: Build stage
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /app

# Create non-root user for build
RUN addgroup -g 1001 -S nodegroup && \
    adduser -S nodeuser -u 1001

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies using npm
RUN npm install

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R nodeuser:nodegroup /app

# Switch to non-root user for build
USER nodeuser

# Build the application
RUN npx vite build

# Stage 2: Runtime stage
FROM node:22-alpine AS runtime

# Set the working directory
WORKDIR /app

# Create non-root user for runtime
RUN addgroup -g 1001 -S nodegroup && \
    adduser -S nodeuser -u 1001 && \
    mkdir -p /app/dist && \
    chown -R nodeuser:nodegroup /app

# Install http-server and wget for health check
RUN npm install -g http-server && \
    apk add --no-cache wget

# Copy only the built application from builder stage
COPY --from=builder --chown=nodeuser:nodegroup /app/dist ./dist

# Switch to non-root user
USER nodeuser

# Expose the application port
EXPOSE 8848

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8848

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8848/ || exit 1

# Run the http-server to serve static files
CMD ["http-server", "dist", "-p", "8848", "-a", "0.0.0.0", "--cors"]