# Use the official Puppeteer image which includes Chrome
FROM ghcr.io/puppeteer/puppeteer:21.11.0

# Switch to root to install dependencies
USER root

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skipping Chromium download as it's in the base image)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN npm i --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Ensure permissions for the non-root user
RUN chown -R pptruser:pptruser /app

# Switch back to the non-root user provided by the image
USER pptruser

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]