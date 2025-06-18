# [![Purinton Dev](https://purinton.us/logos/brand.png)](https://discord.gg/QSBxQnX7PF)

## @purinton/puppeteer [![npm version](https://img.shields.io/npm/v/@purinton/puppeteer.svg)](https://www.npmjs.com/package/@purinton/puppeteer)[![license](https://img.shields.io/github/license/purinton/puppeteer.svg)](LICENSE)[![build status](https://github.com/purinton/puppeteer/actions/workflows/nodejs.yml/badge.svg)](https://github.com/purinton/puppeteer/actions)

> A Model Context Protocol (MCP) server providing advanced web scraping and extraction tools powered by Puppeteer. Easily extendable with your own tools.

---

## Table of Contents

- [Overview](#overview)
- [Available Tools](#available-tools)
- [Usage](#usage)
- [Extending & Customizing](#extending--customizing)
- [Support](#support)
- [License](#license)
- [Links](#links)

## Overview

This project is an MCP server built on [`@purinton/mcp-server`](https://www.npmjs.com/package/@purinton/mcp-server) [![npm version](https://img.shields.io/npm/v/@purinton/mcp-server.svg)](https://www.npmjs.com/package/@purinton/mcp-server). It exposes a set of Puppeteer-powered tools via the Model Context Protocol, making them accessible to AI agents and automation clients.

**Key Features:**

- Dynamic tool loading from the `tools/` directory
- Advanced web scraping and extraction using Puppeteer
- Simple to add or modify tools
- HTTP API with authentication
- Built for easy extension

## Available Tools

Below is a list of tools provided by this MCP server. Each tool can be called via the MCP protocol or HTTP API.

### web-browse

**Name:** `web-browse`  
**Description:** Extract text or JSON from a web page with advanced options (uses Puppeteer under the hood).

**Input Schema:**

```json
{
  "url": "string",
  "method": "string (optional, default: GET)",
  "headers": "object (optional)",
  "body": "string (optional)"
}
```

**Example Request:**

```json
{
  "tool": "web-browse",
  "args": {
    "url": "https://example.com"
  }
}
```

**Example Response:**

```json
{
  "url": "https://example.com",
  "text": "Example Domain"
}
```

<!--
Repeat the above block for each tool you add.
Document: tool name, description, input schema, example request/response.
-->

## Usage

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - `MCP_PORT`: (optional) Port to run the server (default: 1234)
   - `MCP_TOKEN`: (required) Bearer token for authentication

3. **Start the server:**

   ```bash
   node puppeteer.mjs
   ```

4. **Call tools via HTTP or MCP client.**  
   See the [@purinton/mcp-server documentation](https://www.npmjs.com/package/@purinton/mcp-server) for protocol/API details.

## Extending & Customizing

To add a new tool:

1. **Create a new file in the `tools/` directory** (e.g., `tools/mytool.mjs`):

  ```js
  import { z, buildResponse } from '@purinton/mcp-server';
  export default async function ({ mcpServer, toolName, log }) {
    mcpServer.tool(
      toolName,
      "Write a brief description of your tool here",
      { echoText: z.string() },
      async (_args,_extra) => {
        log.debug(`${toolName} Request`, { _args });
        const response = 'Hello World!';
        log.debug(`${toolName} Response`, { response });
        return buildResponse(response);
      }
    );
  }
  ```

1. **Document your tool** in the [Available Tools](#available-tools) section above.
2. **Restart the server** to load new tools.

You can add as many tools as you like. Each tool is a self-contained module.

## Running as a systemd Service

You can run this server as a background service on Linux using the provided `puppeteer.service` file.

### 1. Copy the service file

Copy `puppeteer.service` to your systemd directory (usually `/etc/systemd/system/`):

```bash
sudo cp puppeteer.service /usr/lib/systemd/system/
```

### 2. Adjust paths and environment

- Make sure the `WorkingDirectory` and `ExecStart` paths in the service file match where your project is installed (default: `/opt/puppeteer`).
- Ensure your environment file exists at `/opt/puppeteer/.env` if you use one.

### 3. Reload systemd and enable the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable puppeteer
sudo systemctl start puppeteer
```

### 4. Check service status

```bash
sudo systemctl status puppeteer
```

The server will now run in the background and restart automatically on failure or reboot.

## Running with Docker

You can run this MCP server in a Docker container using the provided `Dockerfile`.

### 1. Build the Docker image

```bash
docker build -t puppeteer .
```

### 2. Run the container

Set your environment variables (such as `MCP_TOKEN`) and map the port as needed:

```bash
docker run -d \
  -e MCP_TOKEN=your_secret_token \
  -e MCP_PORT=1234 \
  -p 1234:1234 \
  --name puppeteer \
  puppeteer
```

- Replace `your_secret_token` with your desired token.
- You can override the port by changing `-e MCP_PORT` and `-p` values.

### 3. Updating the image

If you make changes to the code, rebuild the image and restart the container:

```bash
docker build -t puppeteer .
docker stop puppeteer && docker rm puppeteer
# Then run the container again as above
```

---

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://purinton.us/logos/discord_96.png)](https://discord.gg/QSBxQnX7PF)[![Purinton Dev](https://purinton.us/logos/purinton_96.png)](https://discord.gg/QSBxQnX7PF)

**[Purinton Dev on Discord](https://discord.gg/QSBxQnX7PF)**

## License

[MIT © 2025 Russell Purinton](LICENSE)

## Links

- [@purinton/mcp-server on npm](https://www.npmjs.com/package/@purinton/mcp-server)
- [GitHub](https://github.com/purinton/mcp-server)
- [Discord](https://discord.gg/QSBxQnX7PF)
