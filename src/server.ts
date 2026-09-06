import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RingClient } from './client';
import { registerResources } from './resources/index';
import { registerDeviceTools } from './tools/devices';
import { registerStreamTools } from './tools/stream';
import { registerEventTools } from './tools/events';
import { registerExtendedTools } from './tools/extended';

export interface RingMcpServerOptions {
  client?: RingClient;
  eventStore?: unknown[];
  extendedTools?: boolean;
}

export function createRingMcpServer(options?: RingMcpServerOptions): McpServer {
  const client = options?.client || new RingClient();
  const eventStore = options?.eventStore;
  const enableExtended = options?.extendedTools ?? (process.env.RING_EXTENDED_TOOLS === 'true');

  const server = new McpServer({
    name: 'ring-vision-mcp',
    version: '1.0.0',
  });

  registerResources(server, client, eventStore);
  registerDeviceTools(server, client);
  registerStreamTools(server, client);
  registerEventTools(server, client);

  if (enableExtended) {
    registerExtendedTools(server, client);
  }

  return server;
}
