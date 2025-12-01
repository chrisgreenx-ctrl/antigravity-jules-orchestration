# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "src/index.js"]
