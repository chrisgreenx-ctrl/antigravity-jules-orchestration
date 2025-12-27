FROM node:22-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .
# Build with esbuild (NOT @smithery/cli - avoids libsecret requirement)
RUN npm run build

# Expose port
EXPOSE 8081

# Start the server
CMD ["node", "dist/index.cjs"]
