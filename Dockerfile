FROM node:18-slim

WORKDIR /usr/src/app


# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app files
COPY src ./src
COPY public ./public

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/_health || exit 1

CMD ["node", "src/server.js"]
