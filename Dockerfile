FROM node:22-slim

# Install system dependencies required by @smithery/cli (keytar needs libsecret)
RUN apt-get update && apt-get install -y \
    libsecret-1-0 \
    libsecret-1-dev \
    pkg-config \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build with Smithery CLI
RUN npx -y @smithery/cli build -o .smithery/index.cjs

# Expose port
EXPOSE 8081

# Start the server
CMD ["node", ".smithery/index.cjs"]
