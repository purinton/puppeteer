# Use the latest lightweight Ubuntu as the base image
FROM ubuntu:latest

# Install Node.js 22 and other dependencies
RUN apt-get update && \
    apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install || true

# Copy the rest of the project
COPY . .

# Expose the default MCP port (can be overridden by env)
EXPOSE 1234

# Set environment variables (can be overridden at runtime)
ENV MCP_PORT=1234

# Start the MCP server
CMD ["node", "puppeteer.mjs"]
