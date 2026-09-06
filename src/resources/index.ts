import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RingClient } from '../client';

export function registerResources(
  server: McpServer,
  client: RingClient,
  eventStore?: unknown[]
): void {
  server.resource(
    'ring-devices',
    'ring://devices',
    {
      description: 'Catalog of all Ring cameras and doorbells registered to the account',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const devices = await client.listDevices(true);
        return {
          contents: [
            {
              uri: 'ring://devices',
              mimeType: 'application/json',
              text: JSON.stringify(devices, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: 'ring://devices',
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: error instanceof Error ? error.message : 'Failed to fetch devices' },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  server.resource(
    'ring-device-status',
    new ResourceTemplate('ring://devices/{deviceId}/status', { list: undefined }),
    {
      description: 'Real-time telemetry and health status for a specific Ring device',
      mimeType: 'application/json',
    },
    async (uri, { deviceId }) => {
      const id = Array.isArray(deviceId) ? deviceId[0] : deviceId;
      try {
        const status = await client.getDeviceStatus(id);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: error instanceof Error ? error.message : `Failed to fetch status for ${id}` },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  server.resource(
    'ring-recent-events',
    'ring://events/recent',
    {
      description: 'Real-time buffer of incoming Ring webhook vision events (motion alerts, person detections)',
      mimeType: 'application/json',
    },
    async () => {
      const events = eventStore || [];
      return {
        contents: [
          {
            uri: 'ring://events/recent',
            mimeType: 'application/json',
            text: JSON.stringify(events, null, 2),
          },
        ],
      };
    }
  );
}
