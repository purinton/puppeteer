#!/usr/bin/env node

import 'dotenv/config';
import { mcpServer } from '@purinton/mcp-server';
import { fs, log, path, registerHandlers, registerSignals } from '@purinton/common';

registerHandlers({ log });
registerSignals({ log });

const packagePath = path(import.meta, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const name = packageJson.name || 'puppeteer';
const version = packageJson.version || '1.0.0';

const port = parseInt(process.env.MCP_PORT || '1234', 10);
const token = process.env.MCP_TOKEN;
if (!token) {
    log.error('MCP_TOKEN environment variable is required.');
    process.exit(1);
}

const toolsDir = path(import.meta, 'tools');
if (!fs.existsSync(toolsDir)) {
    log.error(`Tools directory not found: ${toolsDir}`);
    process.exit(1);
}

const authCallback = (bearerToken) => {
    return true;
};

try {
    const { httpInstance, transport } = await mcpServer({
        name, version, port, token, toolsDir, log, authCallback
    });
    registerSignals({ shutdownHook: () => httpInstance.close() });
    registerSignals({ shutdownHook: () => transport.close() });
    log.info('Ready', { name, version, port });
} catch (err) {
    log.error('Failed to start MCP server', { error: err });
    process.exit(1);
}