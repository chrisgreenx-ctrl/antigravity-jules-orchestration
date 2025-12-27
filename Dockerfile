# Use Node.js LTS (Long Term Support)
FROM node:20-slim

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Check for index.js location and start
CMD ["node", "index.js"]
