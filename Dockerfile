FROM node:22-slim

# Install system dependencies required by @smithery/cli (keytar)
RUN apt-get update && apt-get install -y \
    libsecret-1-0 \
    pkg-config \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Start the application
CMD ["npm", "start"]
