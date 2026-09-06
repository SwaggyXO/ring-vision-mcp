import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RingClient } from '../client';
import { QueryEventHistorySchema } from '../schemas/events';

interface QueryEventHistoryArgs {
  deviceId?: string;
  limit?: number;
}

export function registerEventTools(server: McpServer, client: RingClient): void {
  server.tool(
    'ring_query_event_history',
    'Retrieve recorded historical events (motion alerts, doorbell presses, live views). Can target a specific device ID or name, or aggregate recent events across all account devices.',
    QueryEventHistorySchema.shape,
    async (args: QueryEventHistoryArgs) => {
      const { deviceId, limit } = args;
      try {
        const history = await client.getEventHistory(deviceId, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      } catch (error) {
        const target = deviceId ? ` for device ${deviceId}` : '';
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : `Failed to query event history${target}.`,
            },
          ],
        };
      }
    }
  );
}
