# Use Node.js LTS (Long Term Support)
FROM node:20-slim

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci --legacy-peer-deps

# Bundle app source
COPY . .

# Build TypeScript
RUN npm run build

# Check for index.js location and start
CMD ["node", "dist/index.js"]
