# Use Node.js LTS (Long Term Support) version
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Create a non-root user
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source and static files
COPY src ./src
COPY public ./public

# Set correct permissions
RUN chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Expose the port the app runs on
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/_health || exit 1

# Start the application
CMD [ "node", "src/server.js" ] 